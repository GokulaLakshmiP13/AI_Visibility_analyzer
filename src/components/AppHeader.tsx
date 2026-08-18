import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

const nav = [
  { to: "/", label: "New Analysis" },
  { to: "/results", label: "Dashboard" },
  { to: "/competitors", label: "Competitors" },
] as const;

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-brand text-brand-foreground shadow-card">
            <Sparkles className="size-4.5" />
          </span>
          <span className="text-base font-bold tracking-tight">AI Visibility Analyzer</span>
        </Link>
        <nav className="flex items-center gap-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-brand-soft hover:text-brand"
              activeProps={{ className: "bg-brand-soft text-brand" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
