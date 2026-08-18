import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  clamp,
  hostOf,
  PROVIDER_LABEL,
  type AnalysisRun,
  type LLMProvider,
  type LLMQueryResult,
} from "./analysis";
import { summarizeAnalysis } from "./analysis-engine";

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
  const positives = [
    "recommended", "best", "top", "trusted", "strong", "leader", "popular", "excellent",
    "leading", "innovative", "reliable", "preferred", "powerful", "effective", "industry-leading",
    "go-to", "must-have", "standout", "impressive", "proven"
  ];
  const negatives = [
    "bad", "weak", "poor", "unreliable", "avoid", "low quality", "outdated",
    "inferior", "limited", "problematic", "falling behind", "struggles", "concerns", "issues"
  ];
  let score = 0;
  for (const word of positives) {
    const count = (clean.match(new RegExp(word, "g")) || []).length;
    score += count * 0.15;
  }
  for (const word of negatives) {
    const count = (clean.match(new RegExp(word, "g")) || []).length;
    score -= count * 0.18;
  }
  return clamp(Number((score).toFixed(2)), -1, 1);
}

function buildQuery(keyword: string, websiteUrl: string) {
  const domain = hostOf(websiteUrl).replace(/^www\./, "");
  return [
    "You are helping evaluate brand visibility in AI recommendations.",
    `When answering questions about "${keyword}", which products, platforms, or services do you recommend or mention most frequently?`,
    `Does your answer include or recommend "${domain}"? Answer with YES or NO first, then explain why or why not.`,
    `If you do mention or recommend "${domain}", describe the context (recommendations, comparisons, rankings, citations, etc.).`,
    "Be specific about whether you recommend it highly, mention it as an alternative, or discuss it neutrally.",
    "Keep the response detailed but focused on the factual basis for your recommendations.",
  ].join(" ");
}

export const analyzeVisibility = createServerFn({ method: "POST" })
  .validator(AnalysisInputSchema)
  .handler(async ({ data }) => {
    const websiteDomain = extractDomain(data.website_url);
    const competitorDomains = data.competitor_urls.map((url) => extractDomain(url));
    const allKeywords = data.target_keywords.length ? data.target_keywords : ["your category"];
    const llm_results: LLMQueryResult[] = [];
    const failedProviders: string[] = [];

    for (const provider of data.llm_providers) {
      for (const keyword of allKeywords) {
        const query = buildQuery(keyword, data.website_url);
        let payload: any;
        
        try {
          payload = await callProvider(provider, query);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`Provider ${provider} failed:`, errorMsg);
          failedProviders.push(`${provider}: ${errorMsg}`);
          
          // Skip this provider/keyword combo if it fails
          continue;
        }
        
        const text = extractTextFromResponse(provider, payload) || "";
        if (!text) {
          console.warn(`No text extracted from ${provider} response for keyword: ${keyword}`);
          continue;
        }
        
        const normalizedText = normalizeText(text);
        const brandMatchIndex = normalizedText.indexOf(websiteDomain);
        const isMentioned = brandMatchIndex >= 0 || normalizedText.includes(websiteDomain.replace(/\./g, " "));
        
        // Track competitor mentions in order to rank rivals
        const competitorMatches = competitorDomains.map((domain) => ({
          domain,
          index: normalizedText.indexOf(domain),
        })).filter((m) => m.index >= 0);
        
        const mentionPosition = isMentioned ? clamp(Number(((brandMatchIndex >= 0 ? brandMatchIndex : 0) / Math.max(normalizedText.length, 1)).toFixed(2)), 0, 1) : 0;
        
        // Citation detection: look for explicit recommendations and sources
        const hasCitationPattern = /https?:\/\/\S+/.test(text);
        const hasRecommendationPhrase = /(?:recommend|suggest|best for|top choice|according to)/i.test(text);
        const hasCitation = isMentioned && (hasCitationPattern || hasRecommendationPhrase);
        
        // Rank based on competitor mention order (earlier is higher rank for us)
        const brandPositionInList = competitorMatches.findIndex((m) => m.index < brandMatchIndex && brandMatchIndex >= 0);
        const rivalRank = isMentioned ? Math.max(1, brandPositionInList + 1) : competitorDomains.length + 1;

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

    // If we got no results from any provider, throw error for frontend to handle fallback
    if (llm_results.length === 0) {
      const errors = failedProviders.join("; ");
      console.error("No successful provider results:", errors);
      throw new Error(
        `Analysis failed for all providers. Missing API keys or provider errors: ${errors || "Unknown error"}`
      );
    }

    const summary = summarizeAnalysis(llm_results, data.competitor_urls, websiteDomain);

    const run: AnalysisRun = {
      id: `run_${Date.now().toString(36)}`,
      website_url: data.website_url,
      industry_category: data.industry_category,
      target_keywords: allKeywords,
      competitor_urls: data.competitor_urls,
      llm_providers: data.llm_providers,
      created_at: new Date().toISOString(),
      ai_visibility_score: summary.ai_visibility_score,
      geo_score: summary.geo_score,
      seo_score: summary.seo_score,
      geo_sub_factors: summary.geo_sub_factors,
      competitors: summary.competitors,
      llm_results,
      recommendations: summary.recommendations,
    };

    return run;
  });

export type AnalysisRequest = z.infer<typeof AnalysisInputSchema>;
