import { asApiError } from "./api";
import { Splash } from "./components/Splash";
import { t } from "./i18n/es";
import { CreateAccount } from "./screens/CreateAccount";
import { RecoveryKey } from "./screens/RecoveryKey";
import { Unlock } from "./screens/Unlock";
import { useSession } from "./state/useSession";

export default function App() {
  const session = useSession();

  switch (session.phase) {
    case null:
      return (
        <Splash
          label={t.loading.openingData}
          stalled={session.boot.stalled}
          error={session.boot.state.status === "error" ? asApiError(session.boot.state.error).message : undefined}
          onRetry={session.boot.retry}
        />
      );
    case "create":
      return <CreateAccount onCreated={session.accountCreated} />;
    case "recovery":
      return <RecoveryKey recoveryKey={session.recoveryKey} onDone={session.recoverySaved} />;
    case "unlock":
      return <Unlock onUnlocked={session.unlocked} />;
    case "ready":
      // Replaced by the calendar in the next task.
      return (
        <main className="auth">
          <div className="auth__panel">
            <h1>{t.appName}</h1>
            <button type="button" className="btn" onClick={session.lock}>
              Bloquear
            </button>
          </div>
        </main>
      );
  }
}