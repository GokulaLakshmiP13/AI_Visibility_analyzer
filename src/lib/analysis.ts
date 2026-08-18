// Data model mirrors the FastAPI backend exactly.
// Later: replace generateAnalysis() with POST /api/analyze.

export type Severity = "high" | "medium" | "low";
export type LLMProvider = "openai" | "gemini" | "perplexity";

export interface LLMQueryResult {
  target_url: string;
  llm_provider: LLMProvider;
  query: string;
  is_mentioned: boolean;
  mention_position: number; // 0-1
  is_cited: boolean;
  sentiment_score: number; // -1 to 1
  rank_among_competitors: number;
}

export interface Recommendation {
  category: string;
  severity: Severity;
  issue: string;
  recommendation: string;
}

export interface CompetitorScore {
  url: string;
  ai_visibility_score: number;
  geo_score: number;
  seo_score: number;
}

export interface GeoSubFactor {
  factor: string;
  score: number;
}

export interface AnalysisRun {
  id: string;
  website_url: string;
  industry_category: string;
  target_keywords: string[];
  competitor_urls: string[];
  llm_providers: LLMProvider[];
  created_at: string;
  ai_visibility_score: number;
  geo_score: number;
  seo_score: number;
  // derived / prototype extras
  geo_sub_factors: GeoSubFactor[];
  competitors: CompetitorScore[];
  llm_results: LLMQueryResult[];
  recommendations: Recommendation[];
}

export const PROVIDER_LABEL: Record<LLMProvider, string> = {
  openai: "ChatGPT",
  gemini: "Gemini",
  perplexity: "Perplexity",
};

export const INDUSTRIES = [
  "SaaS & Software",
  "E-commerce",
  "Fintech",
  "Healthcare",
  "Education",
  "Travel & Hospitality",
  "Marketing Agency",
  "Real Estate",
  "Other",
];

export const GEO_FACTORS = [
  "Structured Data",
  "Content Depth",
  "FAQ Structure",
  "Freshness",
  "Authority Signals",
];

/* ---------- deterministic pseudo-random helpers ---------- */

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

export function hostOf(url: string) {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

export function scoreBand(score: number): "low" | "mid" | "high" {
  if (score < 40) return "low";
  if (score <= 70) return "mid";
  return "high";
}

export function scoreColor(score: number) {
  const band = scoreBand(score);
  return band === "low"
    ? "var(--danger)"
    : band === "mid"
      ? "var(--warning)"
      : "var(--success)";
}

const QUERY_TEMPLATES = [
  (k: string) => `What are the best ${k} tools in 2026?`,
  (k: string) => `Which company should I use for ${k}?`,
  (k: string) => `Top alternatives for ${k}`,
  (k: string) => `Compare the leading ${k} providers`,
];

const RECO_POOL: Omit<Recommendation, "severity">[] = [
  {
    category: "Structured Data",
    issue: "No Organization or Product JSON-LD schema detected on key pages.",
    recommendation:
      "Add Organization, Product and BreadcrumbList JSON-LD so LLM crawlers can extract entity facts reliably.",
  },
  {
    category: "FAQ Structure",
    issue: "Answers are buried in long prose without question-style headings.",
    recommendation:
      "Add an FAQPage schema plus H2 questions with 40-60 word direct answers — the format LLMs quote most.",
  },
  {
    category: "Content Depth",
    issue: "Pillar pages average 480 words vs 1,900 for cited competitors.",
    recommendation:
      "Expand the top 5 keyword pages with comparison tables, pricing specifics and use-case sections.",
  },
  {
    category: "E-E-A-T",
    issue: "No named authors, credentials or citations on published content.",
    recommendation:
      "Add author bios with credentials, publish dates and outbound citations to primary sources.",
  },
  {
    category: "Freshness",
    issue: "Most indexed pages have not been updated in over 14 months.",
    recommendation:
      "Introduce a quarterly refresh cycle and expose dateModified in your schema markup.",
  },
  {
    category: "Authority Signals",
    issue: "Brand is absent from third-party listicles that LLMs cite heavily.",
    recommendation:
      "Pursue placements on G2, industry roundups and Reddit threads that dominate AI answer citations.",
  },
  {
    category: "Crawlability",
    issue: "robots.txt blocks GPTBot and PerplexityBot.",
    recommendation:
      "Allow AI crawlers explicitly unless content is gated — blocked bots cannot cite you at all.",
  },
  {
    category: "Structured Data",
    issue: "Product pricing is rendered client-side only.",
    recommendation:
      "Server-render pricing and specs so answer engines can parse them without JS execution.",
  },
];

export interface AnalysisInput {
  website_url: string;
  competitor_urls: string[];
  target_keywords: string[];
  industry_category: string;
  llm_providers: LLMProvider[];
  /** Fixed seed makes output deterministic (used for the demo run). */
  seed?: string;
}

export function generateAnalysis(input: AnalysisInput): AnalysisRun {
  const stamp = input.seed ?? String(Date.now());
  const seed = hash(input.website_url + input.target_keywords.join(",") + stamp);
  const rand = rng(seed);

  const ai = clamp(Math.round(28 + rand() * 60));
  const geo = clamp(Math.round(30 + rand() * 58));
  const seo = clamp(Math.round(45 + rand() * 50));

  const geo_sub_factors = GEO_FACTORS.map((factor) => ({
    factor,
    score: clamp(Math.round(geo - 22 + rand() * 44)),
  }));

  const competitors: CompetitorScore[] = input.competitor_urls.map((url) => ({
    url,
    ai_visibility_score: clamp(Math.round(30 + rand() * 62)),
    geo_score: clamp(Math.round(32 + rand() * 58)),
    seo_score: clamp(Math.round(42 + rand() * 52)),
  }));

  const keywords = input.target_keywords.length ? input.target_keywords : ["your category"];
  const llm_results: LLMQueryResult[] = [];
  for (const provider of input.llm_providers) {
    keywords.forEach((kw, i) => {
      const tpl = QUERY_TEMPLATES[(i + provider.length) % QUERY_TEMPLATES.length]!;
      const mentioned = rand() > 0.35;
      llm_results.push({
        target_url: input.website_url,
        llm_provider: provider,
        query: tpl(kw),
        is_mentioned: mentioned,
        mention_position: Number(rand().toFixed(2)),
        is_cited: mentioned && rand() > 0.5,
        sentiment_score: Number((rand() * 1.6 - 0.5).toFixed(2)),
        rank_among_competitors: 1 + Math.floor(rand() * (competitors.length + 1)),
      });
    });
  }

  const recommendations: Recommendation[] = RECO_POOL.map((r, i) => ({
    ...r,
    severity: (i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low") as Severity,
  })).sort(() => rand() - 0.5);

  return {
    id: `run_${hash(stamp + input.website_url).toString(36)}`,
    website_url: input.website_url,
    industry_category: input.industry_category,
    target_keywords: keywords,
    competitor_urls: input.competitor_urls,
    llm_providers: input.llm_providers,
    created_at: input.seed ? "2026-08-14T09:30:00.000Z" : new Date().toISOString(),
    ai_visibility_score: ai,
    geo_score: geo,
    seo_score: seo,
    geo_sub_factors,
    competitors,
    llm_results,
    recommendations,
  };
}

/* ---------- local run history store ---------- */

const KEY = "aiva:runs";

export function loadRuns(): AnalysisRun[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AnalysisRun[]) : [];
  } catch {
    return [];
  }
}

export function saveRun(run: AnalysisRun) {
  if (typeof window === "undefined") return;
  const runs = [run, ...loadRuns()].slice(0, 25);
  window.localStorage.setItem(KEY, JSON.stringify(runs));
}

export function seededHistory(run: AnalysisRun) {
  const rand = rng(hash(run.website_url));
  const past = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(Date.now() - (5 - i) * 12 * 24 * 3600 * 1000);
    return {
      date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      ai: clamp(Math.round(run.ai_visibility_score - 22 + rand() * 26 + i * 3)),
      geo: clamp(Math.round(run.geo_score - 20 + rand() * 24 + i * 3)),
      seo: clamp(Math.round(run.seo_score - 14 + rand() * 18 + i * 2)),
    };
  });
  return [
    ...past,
    {
      date: "Now",
      ai: run.ai_visibility_score,
      geo: run.geo_score,
      seo: run.seo_score,
    },
  ];
}

/* Sample run so the dashboard is never empty. */
export const SAMPLE_RUN: AnalysisRun = generateAnalysis({
  website_url: "https://acme-analytics.com",
  competitor_urls: [
    "https://datafold.io",
    "https://metricstack.com",
    "https://insightly-bi.com",
  ],
  target_keywords: [
    "product analytics platform",
    "self-serve BI tool",
    "customer journey analytics",
  ],
  industry_category: "SaaS & Software",
  llm_providers: ["openai", "gemini", "perplexity"],
  seed: "demo-run-v1",
});
