import { useEffect, useState } from "react";
import { loadRuns, SAMPLE_RUN, type AnalysisRun } from "./analysis";

/** Returns stored runs (client-side), falling back to the demo run. */
export function useRuns() {
  const [runs, setRuns] = useState<AnalysisRun[]>([SAMPLE_RUN]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = loadRuns();
    if (stored.length) setRuns(stored);
    setReady(true);
  }, []);

  return { runs, current: runs[0]!, isDemo: ready && runs[0] === SAMPLE_RUN, ready };
}
