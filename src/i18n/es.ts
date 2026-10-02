import type { ApiError } from "../types";

/** All user-facing text. A second language would be a sibling file with the same shape. */
export const t = {
  appName: "Almanac",
  common: { show: "Mostrar", hide: "Ocultar" },
  loading: {
    openingData: "Abriendo datos…",
    slow: "Esto está tardando más de lo normal.",
    failed: "No se pudo abrir Almanac.",
    retry: "Reintentar",
  },
  auth: {
    createTitle: "Protege tu calendario",
    createIntro: "Crea una contraseña para abrir Almanac. Tus eventos se cifran en este dispositivo y solo tú puedes leerlos.",
    password: "Contraseña",
    passwordHint: "Mínimo 10 caracteres. Una frase larga es más segura y más fácil de recordar.",
    confirm: "Repite la contraseña",
    strength: ["Muy corta", "Aceptable", "Buena", "Fuerte", "Excelente"],
    create: "Crear cuenta",
    creating: "Creando cuenta…",
    preparing: "Preparando el cifrado…",
    recoveryTitle: "Guarda tu clave de recuperación",
    recoveryIntro: "Si olvidas la contraseña, esta clave es la única forma de recuperar tus datos. Almanac no puede restablecerla por ti.",
    recoveryWarning: "Guárdala fuera de este dispositivo, en papel o en un gestor de contraseñas. No se volverá a mostrar.",
    recoveryKey: "Clave de recuperación",
    copy: "Copiar clave",
    copied: "Clave copiada",
    saved: "Ya guardé mi clave de recuperación",
    continue: "Continuar",
    unlockTitle: "Desbloquear Almanac",
    unlockIntro: "Escribe tu contraseña para abrir tu calendario.",
    unlockRecoveryIntro: "Escribe la clave de recuperación que guardaste al crear la cuenta.",
    unlock: "Desbloquear",
    unlockWithKey: "Desbloquear con la clave",
    useRecovery: "Usar la clave de recuperación",
    usePassword: "Usar la contraseña",
    recoveryKeyPlaceholder: "ABCD-EFGH-IJKL…",
    errors: {
      tooShort: "Usa al menos 10 caracteres.",
      mismatch: "Las contraseñas no coinciden.",
      passwordRequired: "Escribe tu contraseña.",
      recoveryRequired: "Escribe tu clave de recuperación.",
    },
  },
  /** Messages for the error codes the vault returns. */
  errors: {
    locked: "Almanac está bloqueado. Desbloquéalo para continuar.",
    badPassword: "La contraseña no es correcta.",
    badRecoveryKey: "La clave de recuperación no es válida. Revisa que esté completa.",
    weakPassword: "Usa al menos 10 caracteres.",
    alreadyInitialized: "Ya existe una cuenta en este dispositivo.",
    notInitialized: "Todavía no hay una cuenta. Créala primero.",
    notFound: "No se encontró lo que buscabas.",
    invalidEvent: "El evento tiene una fecha o una repetición no válida.",
    corrupt: "Los datos guardados están dañados.",
    internal: "Algo salió mal. Inténtalo de nuevo.",
  },
} as const;

export function errorMessage(error: ApiError): string {
  return t.errors[error.code] ?? t.errors.internal;
}