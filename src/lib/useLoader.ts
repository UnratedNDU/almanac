import { useCallback, useEffect, useState, type DependencyList } from "react";
import { isStalled } from "./loading";

export type LoaderState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; error: unknown };

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Runs `load` whenever `deps` change. Reports `stalled` once it has taken too long, and keeps the
 * loading state for at least `minMs` so a fast load does not flash the loading screen.
 */
export function useLoader<T>(load: () => Promise<T>, deps: DependencyList, minMs = 0) {
  const [state, setState] = useState<LoaderState<T>>({ status: "loading" });
  const [stalled, setStalled] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    const startedAt = performance.now();
    setState({ status: "loading" });
    setStalled(false);
    const watchdog = setInterval(() => setStalled(isStalled(startedAt, performance.now())), 1000);
    Promise.all([load(), wait(minMs)])
      .then(([data]) => live && setState({ status: "ready", data }))
      .catch((error) => live && setState({ status: "error", error }))
      .finally(() => clearInterval(watchdog));
    return () => {
      live = false;
      clearInterval(watchdog);
    };
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, stalled, retry };
}