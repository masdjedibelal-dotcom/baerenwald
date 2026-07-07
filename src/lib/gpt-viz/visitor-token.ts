import { GPT_VIZ_VISITOR_TOKEN_KEY } from "@/lib/gpt-viz/constants";

/** Anonymer Browser-Token — Session-Quota ohne IP-Sperre. */
export function getOrCreateGptVisitorToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem(GPT_VIZ_VISITOR_TOKEN_KEY)?.trim();
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(GPT_VIZ_VISITOR_TOKEN_KEY, token);
  }
  return token;
}
