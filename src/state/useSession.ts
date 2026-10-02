import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { useLoader } from "../lib/useLoader";

export type Phase = "create" | "recovery" | "unlock" | "ready";

/** Where the user is in the access flow: create account, save recovery key, unlock, or inside the calendar. */
export function useSession() {
  const boot = useLoader(() => api.status(), [], 600);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [recoveryKey, setRecoveryKey] = useState("");

  useEffect(() => {
    if (boot.state.status === "ready") {
      const { initialized, unlocked } = boot.state.data;
      setPhase(unlocked ? "ready" : initialized ? "unlock" : "create");
    }
  }, [boot.state]);

  const accountCreated = useCallback((key: string) => {
    setRecoveryKey(key);
    setPhase("recovery");
  }, []);
  const recoverySaved = useCallback(() => {
    setRecoveryKey("");
    setPhase("ready");
  }, []);
  const unlocked = useCallback(() => setPhase("ready"), []);
  const lock = useCallback(() => {
    void api.lock().finally(() => setPhase("unlock"));
  }, []);

  return { phase, boot, recoveryKey, accountCreated, recoverySaved, unlocked, lock };
}