import { getReplicateTokenDiagnostics } from "@/lib/gpt-viz/replicate-client";
import { getClaudeApiKey } from "@/lib/ki-rechner/claude-config";

export const runtime = "nodejs";

/** Diagnose ohne Key-Leak — nach Deploy prüfen ob Replicate/Claude erreichbar konfiguriert sind. */
export async function GET() {
  const replicate = getReplicateTokenDiagnostics();
  const claude = Boolean(getClaudeApiKey());

  return Response.json({
    replicate: {
      configured: replicate.configured,
      keyFormatOk: replicate.keyFormatOk,
      keyLength: replicate.keyLength,
      hint: !replicate.configured
        ? "REPLICATE_API_TOKEN fehlt — in Netlify setzen, All scopes, dann Redeploy."
        : !replicate.keyFormatOk
          ? `Token-Format wirkt falsch (${replicate.keyLength} Zeichen, erwartet r8_…). Neu aus replicate.com/account/api-tokens kopieren.`
          : "Token ist gesetzt. Bei Render-Fehler 401: Token in Replicate neu erzeugen und in Netlify ersetzen.",
    },
    claude: { configured: claude },
  });
}
