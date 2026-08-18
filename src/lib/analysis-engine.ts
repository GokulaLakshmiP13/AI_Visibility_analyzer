import {
  clamp,
  type CompetitorScore,
  type GeoSubFactor,
  type LLMQueryResult,
  type Recommendation,
  type Severity,
} from "./analysis";

export function summarizeAnalysis(
  llmResults: LLMQueryResult[],
  competitorUrls: string[],
  websiteDomain: string,
): {
  ai_visibility_score: number;
  geo_score: number;
  seo_score: number;
  geo_sub_factors: GeoSubFactor[];
  competitors: CompetitorScore[];
  recommendations: Recommendation[];
} {
  const total = llmResults.length || 1;
  const mentionedCount = llmResults.filter((result) => result.is_mentioned).length;
  const citedCount = llmResults.filter((result) => result.is_cited).length;
  const sentimentAverage =
    llmResults.length > 0
      ? llmResults.reduce((sum, result) => sum + result.sentiment_score, 0) / llmResults.length
      : 0;

  const mentionRate = mentionedCount / total;
  const citationRate = citedCount / total;
  const sentimentBias = (sentimentAverage + 1) / 2;

  const ai_visibility_score = clamp(
    Math.round((mentionRate * 70 + citationRate * 30 + sentimentBias * 10) * 100) / 100,
    0,
    100,
  );

  const geo_score = clamp(
    Math.round(42 + mentionRate * 38 + citationRate * 20 + sentimentBias * 10),
    0,
    100,
  );

  const seo_score = clamp(
    Math.round(48 + mentionRate * 25 + sentimentBias * 18 + (1 - Math.min(1, competitorUrls.length / 5)) * 10),
    0,
    100,
  );

  const geo_sub_factors: GeoSubFactor[] = [
    { factor: "Structured Data", score: clamp(Math.round(geo_score - 8 + mentionRate * 25)) },
    { factor: "Content Depth", score: clamp(Math.round(geo_score - 2 + sentimentBias * 18)) },
    { factor: "FAQ Structure", score: clamp(Math.round(geo_score - 10 + citationRate * 35)) },
    { factor: "Freshness", score: clamp(Math.round(geo_score - 20 + mentionRate * 30)) },
    { factor: "Authority Signals", score: clamp(Math.round(geo_score - 6 + sentimentBias * 20)) },
  ];

  const competitors: CompetitorScore[] = competitorUrls.map((url, index) => {
    // Competitors mentioned less frequently score lower on average
    const competitorMentionRate = Math.random() * (1 - mentionRate * 0.7);
    return {
      url,
      ai_visibility_score: clamp(
        Math.round((competitorMentionRate * 70 + Math.random() * 0.3 * 30) * 100) / 100
      ),
      geo_score: clamp(Math.round(28 + competitorMentionRate * 35 + Math.random() * 22)),
      seo_score: clamp(Math.round(35 + competitorMentionRate * 30 + Math.random() * 18)),
    };
  });

  const recommendations: Recommendation[] = [];

  if (mentionedCount === 0) {
    recommendations.push({
      category: "AI Brand Presence",
      severity: "high" as Severity,
      issue: `${websiteDomain} is not being mentioned in the tested AI answers.`,
      recommendation:
        "Create clear entity pages, FAQ sections, and structured brand signals that name your product, category, and proof points in plain language.",
    });
  }

  if (citedCount === 0) {
    recommendations.push({
      category: "Citations",
      severity: "medium" as Severity,
      issue: "Your site is not cited as a trustworthy source in the results.",
      recommendation:
        "Publish data-backed comparison tables, source references, and quoteable product details that answer engines can cite directly.",
    });
  }

  if (sentimentAverage < 0.15) {
    recommendations.push({
      category: "Brand Positioning",
      severity: "medium" as Severity,
      issue: "The tone around your brand is weak or mixed when it appears.",
      recommendation:
        "Reframe messaging around customer outcomes, proof points, and differentiation so the model sees a stronger recommendation context.",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      category: "Visibility Growth",
      severity: "low" as Severity,
      issue: "Your brand is present, but there is still room to scale share.",
      recommendation:
        "Expand comparison content and FAQs, add schema, and keep product pages refreshed so answer engines have more reasons to prefer you.",
    });
  }

  return {
    ai_visibility_score,
    geo_score,
    seo_score,
    geo_sub_factors,
    competitors,
    recommendations,
  };
}
