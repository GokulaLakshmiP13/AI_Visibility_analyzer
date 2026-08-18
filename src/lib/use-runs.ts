import { useEffect, useState } from "react";
import { loadRuns, SAMPLE_RUN, type AnalysisRun } from "./analysis";
import { getAnalysisRuns } from "./analysis-routes";

/** Returns stored runs, with a demo fallback if there is no server-backed history yet. */
export function useRuns() {
  const [runs, setRuns] = useState<AnalysisRun[]>([SAMPLE_RUN]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadStoredRuns() {
      try {
        const stored = await getAnalysisRuns();
        if (active && stored.length) {
          setRuns(stored);
        }
      } catch {
        const stored = loadRuns();
        if (active && stored.length) setRuns(stored);
      } finally {
        if (active) setReady(true);
      }
    }

    loadStoredRuns();

    return () => {
      active = false;
    };
  }, []);

  return { runs, current: runs[0]!, isDemo: ready && runs[0] === SAMPLE_RUN, ready };
}
