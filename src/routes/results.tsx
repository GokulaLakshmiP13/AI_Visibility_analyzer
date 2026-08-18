import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppHeader } from "@/components/AppHeader";
import { ScoreRing } from "@/components/ScoreRing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  hostOf,
  PROVIDER_LABEL,
  scoreColor,
  seededHistory,
  type Recommendation,
  type Severity,
} from "@/lib/analysis";
import { useRuns } from "@/lib/use-runs";

const title = "Results Dashboard — AI Visibility Analyzer";
const description =
  "AI Visibility, GEO and SEO scores with LLM query results, competitor benchmarks and prioritized recommendations.";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ResultsPage,
});

const severityStyles: Record<Severity, string> = {
  high: "bg-danger/12 text-danger border-danger/30",
  medium: "bg-warning/15 text-warning border-warning/35",
  low: "bg-muted text-muted-foreground border-border",
};

function ResultsPage() {
  const { runs, current, isDemo } = useRuns();
  const [severity, setSeverity] = useState<Severity | "all">("all");

  const history = useMemo(() => seededHistory(current), [current]);

  const compareData = useMemo(
    () => [
      { name: hostOf(current.website_url), score: current.ai_visibility_score, you: true },
      ...current.competitors.map((c) => ({
        name: hostOf(c.url),
        score: c.ai_visibility_score,
        you: false,
      })),
    ],
    [current],
  );

  const recs = current.recommendations
    .filter((r) => severity === "all" || r.severity === severity)
    .sort((a, b) => weight(b.severity) - weight(a.severity));

  return (
    <div className="min-h-screen bg-gradient-soft">
      <AppHeader />
      <main className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              {hostOf(current.website_url)}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {current.industry_category} · {current.target_keywords.length} keywords ·{" "}
              {current.llm_providers.map((p) => PROVIDER_LABEL[p]).join(", ")} ·{" "}
              {new Date(current.created_at).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            {isDemo ? <Badge variant="secondary">Sample data</Badge> : null}
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/competitors">Competitor comparison</Link>
            </Button>
            <Button asChild className="rounded-xl bg-gradient-brand text-brand-foreground">
              <Link to="/">New analysis</Link>
            </Button>
          </div>
        </div>

        {/* Scores */}
        <section className="grid gap-6 md:grid-cols-3">
          <ScoreCard
            title="AI Visibility Score"
            score={current.ai_visibility_score}
            copy="How often you appear in AI answers for your keywords."
          />
          <ScoreCard
            title="GEO Score"
            score={current.geo_score}
            copy="How well your content is structured for answer engines."
          />
          <ScoreCard
            title="SEO Score"
            score={current.seo_score}
            copy="Classic technical and on-page search health."
          />
        </section>

        {/* Charts */}
        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-xl border-border/70 shadow-card">
            <CardHeader>
              <CardTitle>AI Visibility vs competitors</CardTitle>
              <CardDescription>Share of AI answers mentioning each brand</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareData} layout="vertical" margin={{ left: 12, right: 24 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)" }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--card-foreground)",
                    }}
                  />
                  <Bar dataKey="score" radius={[0, 8, 8, 0]} barSize={24}>
                    {compareData.map((d) => (
                      <Cell key={d.name} fill={d.you ? "var(--brand)" : "var(--chart-3)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border/70 shadow-card">
            <CardHeader>
              <CardTitle>GEO sub-factors</CardTitle>
              <CardDescription>Five signals answer engines rely on</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={current.geo_sub_factors} outerRadius={110}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="factor" fontSize={11} stroke="var(--muted-foreground)" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} tickCount={5} />
                  <Radar
                    name="Your site"
                    dataKey="score"
                    stroke="var(--violet)"
                    fill="var(--violet)"
                    fillOpacity={0.35}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--card-foreground)",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>

        <Tabs defaultValue="queries">
          <TabsList className="rounded-xl">
            <TabsTrigger value="queries">LLM Query Results</TabsTrigger>
            <TabsTrigger value="recs">Recommendations</TabsTrigger>
            <TabsTrigger value="history">Run History</TabsTrigger>
          </TabsList>

          <TabsContent value="queries" className="mt-6">
            <Card className="rounded-xl border-border/70 shadow-card">
              <CardHeader>
                <CardTitle>LLM Query Results</CardTitle>
                <CardDescription>
                  Every prompt we ran, and how your brand showed up
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead className="min-w-64">Query</TableHead>
                      <TableHead>Mentioned</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Cited</TableHead>
                      <TableHead>Sentiment</TableHead>
                      <TableHead className="text-right">Rank</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {current.llm_results.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {PROVIDER_LABEL[r.llm_provider]}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{r.query}</TableCell>
                        <TableCell>
                          <YesNo value={r.is_mentioned} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-lg capitalize">
                            {positionLabel(r.mention_position)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <YesNo value={r.is_cited} />
                        </TableCell>
                        <TableCell>
                          <SentimentBadge score={r.sentiment_score} />
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          #{r.rank_among_competitors}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recs" className="mt-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["all", "high", "medium", "low"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={severity === s ? "default" : "outline"}
                  className="rounded-lg capitalize"
                  onClick={() => setSeverity(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {recs.map((r, i) => (
                <RecommendationCard key={i} rec={r} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <Card className="rounded-xl border-border/70 shadow-card">
                <CardHeader>
                  <CardTitle>Score trend</CardTitle>
                  <CardDescription>Past analyses for this site</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history} margin={{ left: 0, right: 16 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
                      <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          background: "var(--card)",
                          color: "var(--card-foreground)",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="ai"
                        name="AI Visibility"
                        stroke="var(--brand)"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="geo"
                        name="GEO"
                        stroke="var(--violet)"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="seo"
                        name="SEO"
                        stroke="var(--teal)"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-xl border-border/70 shadow-card">
                <CardHeader>
                  <CardTitle>Past runs</CardTitle>
                  <CardDescription>{runs.length} stored</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {runs.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-xl border border-border/70 bg-card p-3 text-sm"
                    >
                      <p className="font-semibold">{hostOf(r.website_url)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </p>
                      <div className="mt-2 flex gap-2 text-xs font-semibold">
                        <span style={{ color: scoreColor(r.ai_visibility_score) }}>
                          AI {r.ai_visibility_score}
                        </span>
                        <span style={{ color: scoreColor(r.geo_score) }}>GEO {r.geo_score}</span>
                        <span style={{ color: scoreColor(r.seo_score) }}>SEO {r.seo_score}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function weight(s: Severity) {
  return s === "high" ? 3 : s === "medium" ? 2 : 1;
}

function positionLabel(p: number) {
  return p < 0.34 ? "early" : p < 0.67 ? "mid" : "late";
}

function ScoreCard({ title, score, copy }: { title: string; score: number; copy: string }) {
  return (
    <Card className="rounded-xl border-border/70 shadow-card">
      <CardContent className="flex items-center gap-5 pt-6">
        <ScoreRing score={score} label="/ 100" />
        <div>
          <p className="text-base font-bold">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function YesNo({ value }: { value: boolean }) {
  return (
    <Badge
      variant="outline"
      className={`rounded-lg ${
        value ? "border-success/35 bg-success/12 text-success" : "border-border bg-muted text-muted-foreground"
      }`}
    >
      {value ? "Yes" : "No"}
    </Badge>
  );
}

function SentimentBadge({ score }: { score: number }) {
  const label = score > 0.2 ? "positive" : score < -0.2 ? "negative" : "neutral";
  const cls =
    label === "positive"
      ? "border-success/35 bg-success/12 text-success"
      : label === "negative"
        ? "border-danger/35 bg-danger/12 text-danger"
        : "border-border bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={`rounded-lg capitalize ${cls}`}>
      {label}
    </Badge>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <Card className="rounded-xl border-border/70 shadow-card">
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={`rounded-lg uppercase ${severityStyles[rec.severity]}`}>
            {rec.severity}
          </Badge>
          <Badge variant="secondary" className="rounded-lg">
            {rec.category}
          </Badge>
        </div>
        <p className="font-semibold">{rec.issue}</p>
        <p className="text-sm text-muted-foreground">{rec.recommendation}</p>
      </CardContent>
    </Card>
  );
}
