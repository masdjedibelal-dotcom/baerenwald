/** Staging-Website (Netlify-Branch `staging`). Nur wirksam mit Staging-Supabase. */

export const STAGING_SUPABASE_REF = "soqownnkxmtfgvsbrgsl";
export const STAGING_WEBSITE_ORIGIN = "https://staging--baerenwald.netlify.app";
export const STAGING_CRM_ORIGIN =
  "https://staging--baerenwald-backend.netlify.app";
export const PROD_WEBSITE_ORIGIN = "https://baerenwaldmuenchen.de";

export const STAGING_PORTAL_PASSWORD = "StagingTest!2026";
export const STAGING_KUNDE_EMAIL = "familie.berger@example.test";
export const STAGING_PARTNER_EMAIL = "partner-elektro@example.test";

export function isStagingSupabase(): boolean {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").includes(
    STAGING_SUPABASE_REF
  );
}

export function isStagingHostName(host: string | null | undefined): boolean {
  const h = (host ?? "").trim().toLowerCase();
  return h.includes("staging--baerenwald");
}

export function isStagingDeploy(): boolean {
  if (isStagingSupabase()) return true;
  const branch = process.env.BRANCH ?? process.env.HEAD ?? "";
  if (branch === "staging") return true;
  const blob = [
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ]
    .filter(Boolean)
    .join(" ");
  return blob.includes("staging--baerenwald");
}

/** Öffentliche Site-Origin — Staging niemals auf die Live-Domain fallen lassen. */
export function publicSiteOrigin(): string {
  if (isStagingDeploy()) return STAGING_WEBSITE_ORIGIN;
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ?? "";
  if (env) return env;
  return PROD_WEBSITE_ORIGIN;
}

export function isStagingClient(): boolean {
  if (isStagingSupabase()) return true;
  if (typeof window !== "undefined") {
    return isStagingHostName(window.location.hostname);
  }
  return false;
}
