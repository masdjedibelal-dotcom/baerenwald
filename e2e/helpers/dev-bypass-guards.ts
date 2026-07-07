/**
 * Gleiche Guard-Logik wie src/lib/dev-auth.ts (Portal) bzw. CRM isDevAuthSkipEnabled.
 * In Tests simulieren, damit Production+Bypass nie „grün“ wird.
 */
export function portalBypassWouldEnable(
  nodeEnv: string,
  flag: string | undefined
): boolean {
  return nodeEnv !== "production" && flag === "true";
}

export function crmDevBypassWouldEnable(
  nodeEnv: string,
  flag: string | undefined
): boolean {
  return nodeEnv !== "production" && flag === "true";
}

/** Aktuelle Prozess-Umgebung darf kein Prod+Bypass sein. */
export function assertNoProdBypassInCurrentEnv(
  flagName: "TEST_AUTH_BYPASS" | "CRM_DEV_SKIP_AUTH"
): void {
  const prodBypass =
    process.env.NODE_ENV === "production" &&
    process.env[flagName] === "true";
  if (prodBypass) {
    throw new Error(
      `${flagName}=true bei NODE_ENV=production — Build/Deploy blockiert.`
    );
  }
}
