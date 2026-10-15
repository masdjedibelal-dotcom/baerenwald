type KiFehlerLike = {
  status?: number;
  message?: string;
  type?: string;
  error?: { type?: string; message?: string };
};

export function logKiFehler(
  err: unknown,
  context: string,
  extra?: { keyLength?: number }
): void {
  const e = err as KiFehlerLike;
  const type = e.error?.type ?? e.type ?? "unknown";
  const status = e.status ?? "?";
  const msg = e.error?.message ?? e.message ?? String(err);
  console.error(`[ki-rechner] ${context}`, {
    status,
    type,
    msg,
    ...(extra?.keyLength != null ? { keyLength: extra.keyLength } : {}),
    ...(status === 401
      ? {
          hint: "OpenAI 401: Key auf dem Server ungültig oder widerrufen — neuen Key in Netlify OPENAI_API_KEY setzen.",
        }
      : {}),
  });
}

/** Nutzerfreundliche Meldung + HTTP-Status für die API-Route. */
export function mapKiFehlerZuAntwort(err: unknown): {
  status: number;
  error: string;
  code: string;
} {
  const e = err as KiFehlerLike;
  const status = e.status;
  const type = e.error?.type ?? e.type;

  if (status === 401 || status === 403 || type === "authentication_error") {
    return {
      status: 503,
      code: "ki_auth",
      error:
        "Der KI-Dienst ist gerade nicht erreichbar (Server-Konfiguration). Bitte nutze vorerst „Option für Option“ oder versuche es später erneut.",
    };
  }

  if (status === 404 || type === "not_found_error") {
    return {
      status: 503,
      code: "ki_model",
      error:
        "Der KI-Dienst ist gerade nicht erreichbar. Bitte später erneut versuchen oder „Option für Option“ nutzen.",
    };
  }

  if (status === 429 || type === "rate_limit_error") {
    return {
      status: 429,
      code: "ki_rate",
      error:
        "Der KI-Dienst ist gerade ausgelastet. Bitte in ein paar Minuten erneut versuchen.",
    };
  }

  if (status === 529 || type === "overloaded_error") {
    return {
      status: 503,
      code: "ki_overloaded",
      error:
        "Der KI-Dienst ist gerade überlastet. Bitte kurz warten und erneut versuchen.",
    };
  }

  return {
    status: 502,
    code: "ki_error",
    error: "Die KI-Antwort konnte gerade nicht geladen werden.",
  };
}
