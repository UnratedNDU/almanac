import { useEffect, useRef } from "react";

const TYPING = /^(INPUT|TEXTAREA|SELECT)$/;

/** Single-key shortcuts (keys are lowercase `KeyboardEvent.key` values). Ignored while typing or with a modifier held. */
export function useShortcuts(handlers: Record<string, () => void>, enabled: boolean): void {
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || TYPING.test(target.tagName))) return;
      const action = latest.current[event.key.toLowerCase()];
      if (action) {
        event.preventDefault();
        action();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}