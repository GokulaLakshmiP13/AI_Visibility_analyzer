import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppHeader } from "@/components/AppHeader";
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
import { hostOf, scoreColor } from "@/lib/analysis";
import { useRuns } from "@/lib/use-runs";

const title = "Competitor Comparison — AI Visibility Analyzer";
const description =
  "Side-by-side AI Visibility, GEO and SEO scores for your site and every competitor you track.";

export const Route = createFileRoute("/competitors")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: CompetitorsPage,
});

function CompetitorsPage() {
  const { current } = useRuns();

  const rows = [
    {
      url: current.website_url,
      you: true,
      ai: current.ai_visibility_score,
      geo: current.geo_score,
      seo: current.seo_score,
    },
    ...current.competitors.map((c) => ({
      url: c.url,
      you: false,
      ai: c.ai_visibility_score,
      geo: c.geo_score,
      seo: c.seo_score,
    })),
  ];

  const chartData = rows.map((r) => ({
    name: hostOf(r.url),
    "AI Visibility": r.ai,
    GEO: r.geo,
    SEO: r.seo,
  }));

  return (
    <div className="min-h-screen bg-gradient-soft">
      <AppHeader />
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Competitor Comparison</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {hostOf(current.website_url)} vs {current.competitors.length} tracked competitors
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/results">Back to dashboard</Link>
          </Button>
        </div>

        <Card className="rounded-xl border-border/70 shadow-card">
          <CardHeader>
            <CardTitle>Score table</CardTitle>
            <CardDescription>All three scores, 0-100</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead className="text-right">AI Visibility</TableHead>
                  <TableHead className="text-right">GEO</TableHead>
                  <TableHead className="text-right">SEO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.url} className={r.you ? "bg-brand-soft/60" : undefined}>
                    <TableCell className="font-medium">
                      {hostOf(r.url)}{" "}
                      {r.you ? (
                        <Badge className="ml-2 rounded-lg bg-gradient-brand text-brand-foreground">
                          You
                        </Badge>
                      ) : null}
                    </TableCell>
                    {[r.ai, r.geo, r.seo].map((v, i) => (
                      <TableCell
                        key={i}
                        className="text-right font-bold tabular-nums"
                        style={{ color: scoreColor(v) }}
                      >
                        {v}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/70 shadow-card">
          <CardHeader>
            <CardTitle>Visual comparison</CardTitle>
            <CardDescription>Grouped by score type</CardDescription>
          </CardHeader>
          <CardContent className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: 0, right: 16 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--card-foreground)",
                  }}
                />
                <Legend />
                <Bar dataKey="AI Visibility" fill="var(--brand)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="GEO" fill="var(--violet)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="SEO" fill="var(--teal)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
