import { useState } from "react";
import { api } from "../api";
import { t } from "../i18n/es";
import { useLoader } from "../lib/useLoader";
import type { Category, Settings } from "../types";

export interface Startup {
  settings: Settings;
  categories: Category[];
}

const LABELS = [t.cal.loadingSettings, t.cal.loadingCategories, t.cal.ready];

/** Loads what the calendar needs before it can draw, reporting real progress for the loading screen. */
export function useStartup() {
  const [step, setStep] = useState(0);
  const loader = useLoader<Startup>(
    async () => {
      setStep(0);
      const settings = await api.getSettings();
      setStep(1);
      const categories = await api.listCategories();
      setStep(2);
      return { settings, categories };
    },
    [],
    700,
  );
  return { ...loader, label: LABELS[step], progress: (step + 1) / LABELS.length };
}