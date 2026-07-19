/** CRM / internes Backend — Bearer für GPT-Viz-APIs. */
export function getGptVizInternalSecret(): string | undefined {
  const dedicated = process.env.GPT_VIZ_INTERNAL_API_SECRET?.trim();
  if (dedicated) return dedicated;
  return process.env.PARTNER_INTERNAL_API_SECRET?.trim() || undefined;
}

export function isGptVizInternalRequest(req: Request): boolean {
  const secret = getGptVizInternalSecret();
  if (!secret) return false;
  const auth = req.headers.get("authorization")?.trim() ?? "";
  return auth === `Bearer ${secret}`;
}
