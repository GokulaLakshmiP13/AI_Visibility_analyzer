import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { analyzeVisibility } from "./analysis-server";
import { saveAnalysisRun, listAnalysisRuns } from "./analysis-store.server";

const AnalysisRequestSchema = z.object({
  website_url: z.string().url(),
  competitor_urls: z.array(z.string().url()).default([]),
  target_keywords: z.array(z.string().min(1)).default([]),
  industry_category: z.string().min(1),
  llm_providers: z.array(z.enum(["openai", "gemini", "perplexity"]))
    .min(1)
    .default(["openai", "gemini", "perplexity"]),
});

export const createAnalysisRun = createServerFn({ method: "POST" })
  .validator(AnalysisRequestSchema)
  .handler(async ({ data }) => {
    const run = await analyzeVisibility({ data });
    await saveAnalysisRun(run);
    return run;
  });

export const getAnalysisRuns = createServerFn({ method: "GET" })
  .handler(async () => {
    return await listAnalysisRuns();
  });
