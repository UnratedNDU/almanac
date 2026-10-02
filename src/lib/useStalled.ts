import { useEffect, useState } from "react";
import { STALL_MS } from "./loading";

/** True once `active` has stayed true for `limitMs` without interruption. */
export function useStalled(active: boolean, limitMs: number = STALL_MS): boolean {
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    setStalled(false);
    if (!active) return;
    const timer = setTimeout(() => setStalled(true), limitMs);
    return () => clearTimeout(timer);
  }, [active, limitMs]);
  return stalled;
}