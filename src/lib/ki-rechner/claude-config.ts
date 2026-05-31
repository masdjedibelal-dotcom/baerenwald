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

export function getClaudeApiKey(): string | undefined {
  for (const name of API_KEY_ENV_NAMES) {
    const raw = process.env[name]?.trim();
    if (raw) {
      return raw.replace(/^["']|["']$/g, "");
    }
  }
  return undefined;
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
