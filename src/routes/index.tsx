import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bot, Globe, Plus, Radar, Search, Sparkles, Trash2, TrendingUp } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  generateAnalysis,
  INDUSTRIES,
  PROVIDER_LABEL,
  saveRun,
  type LLMProvider,
} from "@/lib/analysis";

const title = "AI Visibility Analyzer — See if ChatGPT recommends your brand";
const description =
  "Measure how visible your website is inside ChatGPT, Gemini and Perplexity answers. Get AI Visibility, GEO and SEO scores plus fixes.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: LandingPage,
});

const ALL_PROVIDERS: LLMProvider[] = ["openai", "gemini", "perplexity"];

const STAGES = [
  "Crawling website...",
  "Extracting structured data...",
  "Querying ChatGPT...",
  "Querying Gemini...",
  "Querying Perplexity...",
  "Benchmarking competitors...",
  "Computing scores...",
];

function LandingPage() {
  const navigate = useNavigate();
  const [website, setWebsite] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([""]);
  const [keywords, setKeywords] = useState<string[]>([""]);
  const [industry, setIndustry] = useState(INDUSTRIES[0]!);
  const [providers, setProviders] = useState<LLMProvider[]>(ALL_PROVIDERS);
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!running) return;
    if (stage >= STAGES.length) return;
    const t = setTimeout(() => setStage((s) => s + 1), 620);
    return () => clearTimeout(t);
  }, [running, stage]);

  function updateList(
    list: string[],
    setList: (v: string[]) => void,
    index: number,
    value: string,
  ) {
    setList(list.map((v, i) => (i === index ? value : v)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!website.trim()) {
      toast.error("Website URL is required");
      return;
    }
    if (providers.length === 0) {
      toast.error("Pick at least one LLM provider");
      return;
    }
    setRunning(true);
    setStage(0);

    const run = generateAnalysis({
      website_url: website.trim(),
      competitor_urls: competitors.map((c) => c.trim()).filter(Boolean),
      target_keywords: keywords.map((k) => k.trim()).filter(Boolean),
      industry_category: industry,
      llm_providers: providers,
    });

    setTimeout(() => {
      saveRun(run);
      toast.success("Analysis complete");
      navigate({ to: "/results" });
    }, STAGES.length * 620 + 400);
  }

  const progress = Math.min(100, Math.round((stage / STAGES.length) * 100));

  return (
    <div className="min-h-screen bg-gradient-soft">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <section className="grid items-start gap-10 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
              <Sparkles className="size-3.5" /> Generative Engine Optimization
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Traditional SEO tools can't tell you if{" "}
              <span className="text-gradient-brand">ChatGPT recommends</span> your brand.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Rankings are no longer the whole story. We ask ChatGPT, Gemini and Perplexity
              real buying questions in your category and measure whether you're mentioned,
              cited, and how you're positioned against competitors.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { icon: Bot, title: "3 LLMs queried", copy: "ChatGPT, Gemini, Perplexity" },
                { icon: Radar, title: "GEO breakdown", copy: "5 answer-engine factors" },
                { icon: TrendingUp, title: "Trend tracking", copy: "Score history per site" },
              ].map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border border-border/70 bg-card p-4 shadow-card"
                >
                  <f.icon className="size-5 text-brand" />
                  <p className="mt-3 text-sm font-semibold">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.copy}</p>
                </div>
              ))}
            </div>
          </div>

          <Card className="rounded-xl border-border/70 shadow-card">
            <CardHeader>
              <CardTitle className="text-xl">Run an analysis</CardTitle>
              <CardDescription>
                Takes a few seconds — we query each engine live.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {running ? (
                <div className="py-6">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-brand text-brand-foreground">
                      <Search className="size-5 animate-pulse" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">
                        {STAGES[Math.min(stage, STAGES.length - 1)]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Step {Math.min(stage + 1, STAGES.length)} of {STAGES.length}
                      </p>
                    </div>
                  </div>
                  <Progress value={progress} className="mt-6" />
                  <ul className="mt-6 space-y-2">
                    {STAGES.map((s, i) => (
                      <li
                        key={s}
                        className={
                          i < stage
                            ? "text-xs font-medium text-success"
                            : i === stage
                              ? "text-xs font-medium text-brand"
                              : "text-xs text-muted-foreground/60"
                        }
                      >
                        {i < stage ? "✓ " : "• "}
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="website">Website URL *</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="website"
                        placeholder="https://yourcompany.com"
                        className="pl-9"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                      />
                    </div>
                  </div>

                  <DynamicList
                    label="Competitor URLs"
                    placeholder="https://competitor.com"
                    values={competitors}
                    onChange={(i, v) => updateList(competitors, setCompetitors, i, v)}
                    onAdd={() => setCompetitors([...competitors, ""])}
                    onRemove={(i) => setCompetitors(competitors.filter((_, x) => x !== i))}
                  />

                  <DynamicList
                    label="Target Keywords"
                    placeholder="product analytics platform"
                    values={keywords}
                    onChange={(i, v) => updateList(keywords, setKeywords, i, v)}
                    onAdd={() => setKeywords([...keywords, ""])}
                    onRemove={(i) => setKeywords(keywords.filter((_, x) => x !== i))}
                  />

                  <div className="space-y-2">
                    <Label>Industry Category</Label>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((i) => (
                          <SelectItem key={i} value={i}>
                            {i}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>LLM providers to check</Label>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {ALL_PROVIDERS.map((p) => {
                        const checked = providers.includes(p);
                        return (
                          <label
                            key={p}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                              checked
                                ? "border-brand/40 bg-brand-soft text-brand"
                                : "border-border bg-card text-muted-foreground"
                            }`}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) =>
                                setProviders(
                                  v ? [...providers, p] : providers.filter((x) => x !== p),
                                )
                              }
                            />
                            {PROVIDER_LABEL[p]}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full rounded-xl bg-gradient-brand text-brand-foreground shadow-card hover:opacity-90"
                  >
                    Run Analysis
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Or{" "}
                    <button
                      type="button"
                      className="font-semibold text-brand underline-offset-2 hover:underline"
                      onClick={() => navigate({ to: "/results" })}
                    >
                      view the sample dashboard
                    </button>
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

function DynamicList({
  label,
  placeholder,
  values,
  onChange,
  onAdd,
  onRemove,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (i: number, v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>
          {label}{" "}
          <span className="font-normal text-muted-foreground">({values.length}/5)</span>
        </Label>
        {values.length < 5 ? (
          <Button type="button" variant="ghost" size="sm" onClick={onAdd} className="text-brand">
            <Plus className="size-4" /> Add
          </Button>
        ) : null}
      </div>
      <div className="space-y-2">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder={placeholder}
              value={v}
              onChange={(e) => onChange(i, e.target.value)}
            />
            {values.length > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => onRemove(i)}
                aria-label={`Remove ${label} ${i + 1}`}
              >
                <Trash2 className="size-4" />
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
