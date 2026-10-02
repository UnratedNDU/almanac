import { api, asApiError } from "./api";
import { Splash } from "./components/Splash";
import { t } from "./i18n/es";
import { useLoader } from "./lib/useLoader";

export default function App() {
  const { state, stalled, retry } = useLoader(() => api.status(), [], 600);

  if (state.status !== "ready") {
    return (
      <Splash
        label={t.loading.openingData}
        stalled={stalled}
        error={state.status === "error" ? asApiError(state.error).message : undefined}
        onRetry={retry}
      />
    );
  }

  // Replaced by the access screens and the calendar in the next tasks.
  return (
    <main className="splash">
      <h1>{t.appName}</h1>
    </main>
  );
}