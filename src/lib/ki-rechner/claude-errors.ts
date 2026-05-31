type AnthropicLikeError = {
  status?: number;
  message?: string;
  error?: { type?: string; message?: string };
};

export function logKiClaudeError(err: unknown, context: string): void {
  const e = err as AnthropicLikeError;
  const type = e.error?.type ?? "unknown";
  const status = e.status ?? "?";
  const msg = e.error?.message ?? e.message ?? String(err);
  console.error(`[ki-rechner] ${context}`, { status, type, msg });
}

/** Nutzerfreundliche Meldung + HTTP-Status für die API-Route. */
export function mapKiClaudeErrorToResponse(err: unknown): {
  status: number;
  error: string;
  code: string;
} {
  const e = err as AnthropicLikeError;
  const status = e.status;
  const type = e.error?.type;

  if (status === 401 || status === 403 || type === "authentication_error") {
    return {
      status: 503,
      code: "claude_auth",
      error:
        "Der KI-Dienst ist gerade nicht erreichbar (Server-Konfiguration). Bitte nutze vorerst „Option für Option“ oder versuche es später erneut.",
    };
  }

  if (status === 404 || type === "not_found_error") {
    return {
      status: 503,
      code: "claude_model",
      error:
        "Der KI-Dienst ist gerade nicht erreichbar. Bitte später erneut versuchen oder „Option für Option“ nutzen.",
    };
  }

  if (status === 429 || type === "rate_limit_error") {
    return {
      status: 429,
      code: "claude_rate",
      error:
        "Der KI-Dienst ist gerade ausgelastet. Bitte in ein paar Minuten erneut versuchen.",
    };
  }

  if (status === 529 || type === "overloaded_error") {
    return {
      status: 503,
      code: "claude_overloaded",
      error:
        "Der KI-Dienst ist gerade überlastet. Bitte kurz warten und erneut versuchen.",
    };
  }

  return {
    status: 502,
    code: "claude_error",
    error: "Die KI-Antwort konnte gerade nicht geladen werden.",
  };
}
