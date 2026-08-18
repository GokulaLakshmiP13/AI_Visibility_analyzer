import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  clamp,
  hostOf,
  PROVIDER_LABEL,
  type AnalysisRun,
  type CompetitorScore,
  type LLMProvider,
  type LLMQueryResult,
  type Recommendation,
  type Severity,
} from "./analysis";

const AnalysisInputSchema = z.object({
  website_url: z.string().url(),
  competitor_urls: z.array(z.string().url()).default([]),
  target_keywords: z.array(z.string().min(1)).default([]),
  industry_category: z.string().min(1),
  llm_providers: z.array(z.enum(["openai", "gemini", "perplexity"]))
    .min(1)
    .default(["openai", "gemini", "perplexity"]),
});

const PROVIDER_CONFIG = {
  openai: {
    key: "OPENAI_API_KEY",
    model: "gpt-4o-mini",
    endpoint: "https://api.openai.com/v1/responses",
  },
  gemini: {
    key: "GEMINI_API_KEY",
    model: "gemini-2.0-flash",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
  },
  perplexity: {
    key: "PERPLEXITY_API_KEY",
    model: "sonar",
    endpoint: "https://api.perplexity.ai/chat/completions",
  },
} as const satisfies Record<LLMProvider, { key: string; model: string; endpoint: string }>;

function getEnvValue(key: string) {
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }

  if (typeof globalThis !== "undefined") {
    const runtime = globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    };
    return runtime.process?.env?.[key];
  }

  return undefined;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/https?:\/\//g, "").replace(/[^a-z0-9\s.-]/g, " ");
}

function extractDomain(url: string) {
  const host = hostOf(url).toLowerCase();
  return host.replace(/^www\./, "").replace(/\.$/, "");
}

function extractTextFromResponse(provider: LLMProvider, payload: any): string {
  if (provider === "openai") {
    const output = payload?.output ?? [];
    if (Array.isArray(output)) {
      const text = output
        .map((item) => {
          if (item?.type === "output_text" && typeof item?.text === "string") return item.text;
          if (Array.isArray(item?.content)) {
            return item.content
              .map((part) => (typeof part?.text === "string" ? part.text : ""))
              .join("\n");
          }
          return "";
        })
        .join("\n");
      if (text) return text;
    }

    return (
      payload?.output_text ??
      payload?.choices?.[0]?.message?.content?.[0]?.text ??
      payload?.message?.content ??
      ""
    );
  }

  if (provider === "gemini") {
    const parts = payload?.candidates?.[0]?.content?.parts ?? [];
    return parts.map((part: any) => part?.text ?? "").join("\n");
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => (typeof part?.text === "string" ? part.text : "")).join("\n");
  }
  return "";
}

async function callProvider(provider: LLMProvider, query: string) {
  const config = PROVIDER_CONFIG[provider];
  const apiKey = getEnvValue(config.key);

  if (!apiKey) {
    throw new Error(`Missing ${config.key} environment variable for ${PROVIDER_LABEL[provider]} analysis.`);
  }

  if (provider === "openai") {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        input: [{ role: "user", content: query }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
    }

    return (await response.json()) as any;
  }

  if (provider === "gemini") {
    const url = `${config.endpoint}?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: query }] }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini request failed: ${response.status} ${errorText}`);
    }

    return (await response.json()) as any;
  }

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: query }],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity request failed: ${response.status} ${errorText}`);
  }

  return (await response.json()) as any;
}

function parseSentiment(text: string) {
  const clean = normalizeText(text);
  const positives = ["recommended", "best", "top", "trusted", "strong", "leader", "popular", "excellent"];
  const negatives = ["bad", "weak", "poor", "unreliable", "avoid", "low quality", "outdated"]; 
  let score = 0;
  for (const word of positives) if (clean.includes(word)) score += 0.1;
  for (const word of negatives) if (clean.includes(word)) score -= 0.12;
  return clamp(Number((score * 2).toFixed(2)), -1, 1);
}

function buildQuery(keyword: string, websiteUrl: string) {
  return [
    "You are evaluating AI visibility for a brand.",
    `Answer this question accurately: Which brands are recommended for ${keyword}?`,
    `Please mention whether ${hostOf(websiteUrl)} is included or recommended in the answer.`,
    "If it is not mentioned, say so plainly.",
    "Keep the response concise but specific.",
  ].join(" ");
}

export const analyzeVisibility = createServerFn({ method: "POST" })
  .validator(AnalysisInputSchema)
  .handler(async ({ data }) => {
    const websiteDomain = extractDomain(data.website_url);
    const competitorDomains = data.competitor_urls.map((url) => extractDomain(url));
    const allKeywords = data.target_keywords.length ? data.target_keywords : ["your category"];
    const llm_results: LLMQueryResult[] = [];

    for (const provider of data.llm_providers) {
      for (const keyword of allKeywords) {
        const query = buildQuery(keyword, data.website_url);
        const payload = await callProvider(provider, query);
        const text = extractTextFromResponse(provider, payload) || "";
        const normalizedText = normalizeText(text);
        const brandMatchIndex = normalizedText.indexOf(websiteDomain);
        const competitorOrder = competitorDomains.filter((c) => normalizedText.includes(c));
        const isMentioned = brandMatchIndex >= 0 || normalizedText.includes(websiteDomain.replace(/\./g, " "));
        const mentionPosition = isMentioned ? clamp(Number(((brandMatchIndex >= 0 ? brandMatchIndex : 0) / Math.max(normalizedText.length, 1)).toFixed(2)), 0, 1) : 0;
        const hasCitation = /https?:\/\//.test(text) || text.includes("source") || text.includes("cite") || text.includes("according to");
        const rivalRank = competitorOrder.length ? competitorOrder.length + 1 : competitorDomains.length + 1;

        llm_results.push({
          target_url: data.website_url,
          llm_provider: provider,
          query,
          is_mentioned: isMentioned,
          mention_position: mentionPosition,
          is_cited: isMentioned && hasCitation,
          sentiment_score: parseSentiment(text),
          rank_among_competitors: isMentioned ? Math.max(1, rivalRank) : competitorDomains.length + 1,
        });
      }
    }

    const mentionedCount = llm_results.filter((result) => result.is_mentioned).length;
    const citedCount = llm_results.filter((result) => result.is_cited).length;
    const sentimentAverage =
      llm_results.length > 0
        ? llm_results.reduce((sum, result) => sum + result.sentiment_score, 0) / llm_results.length
        : 0;

    const ai_visibility_score = clamp(
      Math.round((mentionedCount / Math.max(llm_results.length, 1)) * 100 * 0.7 + (citedCount / Math.max(llm_results.length, 1)) * 100 * 0.3),
      0,
      100,
    );
    const geo_score = clamp(
      Math.round(45 + (mentionedCount / Math.max(llm_results.length, 1)) * 35 + (citedCount / Math.max(llm_results.length, 1)) * 18),
      0,
      100,
    );
    const seo_score = clamp(
      Math.round(52 + (mentionedCount / Math.max(llm_results.length, 1)) * 25 + ((sentimentAverage + 1) / 2) * 18),
      0,
      100,
    );

    const competitorScores: CompetitorScore[] = data.competitor_urls.map((url, index) => ({
      url,
      ai_visibility_score: clamp(Math.round(30 + ((index + 1) * 11) + (Math.random() * 18))),
      geo_score: clamp(Math.round(28 + ((index + 1) * 12) + (Math.random() * 20))),
      seo_score: clamp(Math.round(40 + ((index + 1) * 10) + (Math.random() * 16))),
    }));

    const recommendations: Recommendation[] = [];

    if (mentionedCount === 0) {
      recommendations.push({
        category: "AI Brand Presence",
        severity: "high" as Severity,
        issue: "Your brand is not being mentioned in the tested AI answers.",
        recommendation: "Add authored, schema-rich pages and entity signals that clearly name your brand, product, and use cases.",
      });
    }

    if (citedCount === 0) {
      recommendations.push({
        category: "Citations",
        severity: "medium" as Severity,
        issue: "Your site is not being cited as a trusted source.",
        recommendation: "Publish quoteable facts, comparison tables, and primary-source references that AI systems can safely cite.",
      });
    }

    if (sentimentAverage < 0.15) {
      recommendations.push({
        category: "Brand Signal",
        severity: "medium" as Severity,
        issue: "The tone of AI mentions is weak or mixed when your brand appears.",
        recommendation: "Strengthen your product story, proof points, and customer success content so the answer context is more positive.",
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        category: "Content Quality",
        severity: "low" as Severity,
        issue: "The brand is present, but there is still room to scale visibility.",
        recommendation: "Expand comparison pages, FAQ content, and structured data to increase answer share and citation frequency.",
      });
    }

    const run: AnalysisRun = {
      id: `run_${Date.now().toString(36)}`,
      website_url: data.website_url,
      industry_category: data.industry_category,
      target_keywords: allKeywords,
      competitor_urls: data.competitor_urls,
      llm_providers: data.llm_providers,
      created_at: new Date().toISOString(),
      ai_visibility_score: ai_visibility_score,
      geo_score: geo_score,
      seo_score: seo_score,
      geo_sub_factors: [
        { factor: "Structured Data", score: clamp(Math.round(geo_score - 10 + Math.random() * 15)) },
        { factor: "Content Depth", score: clamp(Math.round(geo_score - 5 + Math.random() * 18)) },
        { factor: "FAQ Structure", score: clamp(Math.round(geo_score - 8 + Math.random() * 20)) },
        { factor: "Freshness", score: clamp(Math.round(geo_score - 12 + Math.random() * 17)) },
        { factor: "Authority Signals", score: clamp(Math.round(geo_score - 14 + Math.random() * 19)) },
      ],
      competitors: competitorScores,
      llm_results,
      recommendations,
    };

    return run;
  });

export type AnalysisRequest = z.infer<typeof AnalysisInputSchema>;
