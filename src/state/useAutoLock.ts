import { useEffect } from "react";
import { shouldLock } from "../lib/autoLock";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
const CHECK_MS = 10_000;

/** Calls `onLock` after `minutes` without input. Uses the wall clock, so it also fires after the computer sleeps. */
export function useAutoLock(minutes: number, onLock: () => void): void {
  useEffect(() => {
    if (minutes <= 0) return;
    let lastActivity = Date.now();
    const markActive = () => {
      lastActivity = Date.now();
    };
    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, markActive, { passive: true });
    const timer = setInterval(() => {
      if (shouldLock(lastActivity, Date.now(), minutes)) onLock();
    }, CHECK_MS);
    return () => {
      clearInterval(timer);
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, markActive);
    };
  }, [minutes, onLock]);
}