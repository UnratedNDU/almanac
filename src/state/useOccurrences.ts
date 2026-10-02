import { useEffect, useState } from "react";
import { api, asApiError } from "../api";
import { errorMessage } from "../i18n/es";
import type { ApiErrorCode, OccurrenceView } from "../types";

/** Occurrences in `[from, to)`. Keeps the previous data while a new range loads, so views never flash empty. */
export function useOccurrences(from: string, to: string, version: number) {
  const [data, setData] = useState<OccurrenceView[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: ApiErrorCode; message: string }>();

  useEffect(() => {
    let live = true;
    setLoading(true);
    api
      .listOccurrences(from, to)
      .then((occurrences) => {
        if (!live) return;
        setData(occurrences);
        setError(undefined);
      })
      .catch((caught) => {
        if (!live) return;
        const apiError = asApiError(caught);
        setError({ code: apiError.code, message: errorMessage(apiError) });
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [from, to, version]);

  return { data, loading, error };
}