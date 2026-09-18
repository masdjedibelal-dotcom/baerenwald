/**
 * @deprecated Nutze `PortalInviteMailtoSheet` — mailto nach async wird blockiert.
 * Bleibt als No-Op-Hinweis für alte Imports.
 */
export function openPortalInviteMailto(
  _mailto: string,
  _opts?: { rolle?: string; delayMs?: number }
) {
  console.warn(
    "[openPortalInviteMailto] Veraltet — PortalInviteMailtoSheet nutzen (User-Klick für mailto)."
  );
}
