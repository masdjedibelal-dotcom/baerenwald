import Anthropic from "@anthropic-ai/sdk";

/** Direkt zu Anthropic — nicht über Netlify AI Gateway (/.netlify/ai/…). */
export const ANTHROPIC_DIRECT_BASE_URL = "https://api.anthropic.com";

/** Bekannte Claude-Modelle (Fallback-Reihenfolge). */
export const KI_CLAUDE_MODEL_PRIMARY = "claude-sonnet-4-6";
export const KI_CLAUDE_MODEL_FALLBACKS = [
  "claude-haiku-4-5-20251001",
] as const;

/** Netlify/UI-Tippfehler: nur Kleinbuchstaben im Präfix (z. B. claude_API_KEY). */
const API_KEY_ENV_NAMES = [
  "CLAUDE_API_KEY",
  "ANTHROPIC_API_KEY",
  "claude_API_KEY",
  "Claude_API_KEY",
] as const;

/** Copy-Paste aus Netlify/UI: Anführungszeichen, Zeilenumbrüche, Leerzeichen entfernen. */
export function normalizeClaudeApiKey(raw: string): string {
  return raw
    .replace(/^["']|["']$/g, "")
    .replace(/\s/g, "");
}

export function getClaudeApiKey(): string | undefined {
  for (const name of API_KEY_ENV_NAMES) {
    const raw = process.env[name]?.trim();
    if (raw) {
      const key = normalizeClaudeApiKey(raw);
      return key.length > 0 ? key : undefined;
    }
  }
  return undefined;
}

/** Länge prüfen (ohne Key zu leaken) — abgeschnittene Keys sind häufige Netlify-Ursache für 401. */
export function getClaudeApiKeyDiagnostics(key: string | undefined): {
  keyLength: number;
  keyFormatOk: boolean;
  likelyTruncated: boolean;
} {
  if (!key) {
    return { keyLength: 0, keyFormatOk: false, likelyTruncated: false };
  }
  const keyLength = key.length;
  const keyFormatOk = isPlausibleClaudeApiKey(key);
  const likelyTruncated = key.startsWith("sk-ant-") && keyLength < 90;
  return { keyLength, keyFormatOk, likelyTruncated };
}

/** Welche Key-Variable gesetzt ist (für Diagnose, ohne Wert). */
export function getClaudeApiKeySource(): string | null {
  for (const name of API_KEY_ENV_NAMES) {
    if (process.env[name]?.trim()) {
      return name;
    }
  }
  return null;
}

export function getClaudeModel(): string {
  const custom = process.env.CLAUDE_MODEL?.trim();
  return custom || KI_CLAUDE_MODEL_PRIMARY;
}

export function isPlausibleClaudeApiKey(key: string): boolean {
  return /^sk-ant-/.test(key) && key.length > 20;
}

/** Netlify injiziert ANTHROPIC_BASE_URL → Gateway; mit eigenem Key → 401. */
export function isNetlifyAiGatewayBaseUrl(): boolean {
  const base = process.env.ANTHROPIC_BASE_URL?.trim() ?? "";
  return base.includes("/.netlify/ai") || base.includes("netlify.app/.netlify/ai");
}

/** Anthropic-Client: eigener Key + feste API-URL (ignoriert Netlify-Gateway-Env). */
export function createAnthropicClient(apiKey: string): Anthropic {
  return new Anthropic({
    apiKey,
    baseURL: ANTHROPIC_DIRECT_BASE_URL,
  });
}
