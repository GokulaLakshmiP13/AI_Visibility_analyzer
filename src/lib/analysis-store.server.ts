import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { AnalysisRun } from "./analysis";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "analysis-runs.json");

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2), "utf8");
  }
}

export async function listAnalysisRuns(): Promise<AnalysisRun[]> {
  try {
    await ensureStore();
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as AnalysisRun[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveAnalysisRun(run: AnalysisRun): Promise<AnalysisRun> {
  try {
    await ensureStore();
    const existing = await listAnalysisRuns();
    const next = [run, ...existing].slice(0, 25);
    await fs.writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf8");
    return run;
  } catch {
    return run;
  }
}
