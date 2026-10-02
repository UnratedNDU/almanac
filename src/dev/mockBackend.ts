// Development only: lets `npm run dev` work in a plain browser. It keeps data in memory, has no
// encryption and understands just enough recurrence to draw a believable calendar.
import type { ApiErrorCode } from "../types";

const fail = (code: ApiErrorCode, message: string) => Promise.reject({ code, message });
// `?delay=8000` in the URL slows every call, to inspect loading states.
const extra = Number(new URLSearchParams(location.search).get("delay")) || 0;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms + extra));

let password: string | null = null;
let unlocked = false;

export async function mockInvoke(command: string, args: Record<string, unknown> = {}): Promise<unknown> {
  await delay(command === "unlock" || command === "create_account" ? 900 : 350);
  switch (command) {
    case "vault_status":
      return { initialized: password !== null, unlocked };
    case "create_account":
      if (String(args.password).length < 10) return fail("weakPassword", "La contraseña es demasiado corta.");
      password = String(args.password);
      unlocked = true;
      return "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ23-4567-ABCD-EFGH-IJKL-MNOP-QRST";
    case "unlock":
      if (args.password !== password) return fail("badPassword", "Contraseña incorrecta.");
      unlocked = true;
      return undefined;
    case "unlock_with_recovery":
      unlocked = true;
      return undefined;
    case "lock":
      unlocked = false;
      return undefined;
    default:
      return fail("internal", `mock: ${command} not implemented`);
  }
}