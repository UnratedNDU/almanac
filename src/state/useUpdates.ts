import { useCallback, useEffect, useRef, useState } from "react";
import { APP_VERSION } from "../lib/appVersion";
import { readPref, writePref } from "../lib/localPrefs";
import { checkForUpdate, type UpdateCheck } from "../lib/updates";

const AUTO_KEY = "almanac.checkUpdates";
const DISMISSED_KEY = "almanac.dismissedUpdate";

export type UpdateState = UpdateCheck | { status: "idle" | "checking" };
export type Updates = ReturnType<typeof useUpdates>;

/** Looks for a newer release when the calendar opens (unless turned off) and on demand. */
export function useUpdates() {
  const [auto, setAutoState] = useState(() => readPref(AUTO_KEY) !== "off");
  const [state, setState] = useState<UpdateState>({ status: "idle" });
  const [dismissed, setDismissed] = useState(() => readPref(DISMISSED_KEY));
  const mounted = useRef(true);

  const check = useCallback(async () => {
    setState({ status: "checking" });
    const result = await checkForUpdate(APP_VERSION);
    if (mounted.current) setState(result);
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (readPref(AUTO_KEY) !== "off") void check();
    return () => {
      mounted.current = false;
    };
  }, [check]);

  const setAuto = useCallback((on: boolean) => {
    writePref(AUTO_KEY, on ? "on" : "off");
    setAutoState(on);
  }, []);

  /** Hides the banner for this version; a later release shows it again. */
  const dismiss = useCallback((version: string) => {
    writePref(DISMISSED_KEY, version);
    setDismissed(version);
  }, []);

  return { auto, setAuto, state, check, dismissed, dismiss };
}
