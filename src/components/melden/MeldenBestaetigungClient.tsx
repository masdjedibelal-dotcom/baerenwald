"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  MieterWlBtn,
  MieterWlFrame,
} from "@/components/melden/MieterWlFrame";
import {
  MIETER_WL_BESTAETIGUNG,
  type MieterWlBrand,
} from "@/lib/portal2/mieter-wl";
import "./melden.css";

type Props = {
  brand: MieterWlBrand;
  statusToken?: string | null;
  /** Absolute oder relative Status-URL */
  statusUrl?: string | null;
  /** Prefill für Portal-Registrierung */
  contactName?: string | null;
  contactEmail?: string | null;
  contactTelefon?: string | null;
  /** @deprecated nicht mehr angezeigt */
  referenz?: string | null;
  objektAuswahlHref?: string | null;
};

function absoluteUrl(pathOrUrl: string): string {
  if (typeof window === "undefined") return pathOrUrl;
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  return `${window.location.origin}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/**
 * Bestätigung nach Meldung — Konto-CTA (neutral) + Status-Link darunter.
 */
export function MeldenBestaetigungClient({
  brand,
  statusToken,
  statusUrl: statusUrlProp,
  contactName,
  contactEmail,
  contactTelefon,
  objektAuswahlHref,
}: Props) {
  const t = MIETER_WL_BESTAETIGUNG;
  const [copied, setCopied] = useState(false);

  const statusUrl =
    statusUrlProp?.trim() ||
    (statusToken?.trim() ? `/melden/status/${statusToken.trim()}` : null);

  const registerHref = useMemo(() => {
    const q = new URLSearchParams({ from: "melde" });
    if (statusToken?.trim()) q.set("meldeToken", statusToken.trim());
    if (contactName?.trim()) q.set("name", contactName.trim());
    if (contactEmail?.trim()) q.set("email", contactEmail.trim());
    if (contactTelefon?.trim()) q.set("telefon", contactTelefon.trim());
    const next = statusUrl?.trim() || "/portal";
    q.set("next", next.startsWith("http") ? next : next);
    return `/portal/registrieren?${q.toString()}`;
  }, [statusToken, contactName, contactEmail, contactTelefon, statusUrl]);

  const loginHref = useMemo(() => {
    const next = statusUrl?.trim() || "/portal";
    return `/portal/login?next=${encodeURIComponent(next)}`;
  }, [statusUrl]);

  async function copyLink() {
    if (!statusUrl) return;
    try {
      await navigator.clipboard.writeText(absoluteUrl(statusUrl));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <MieterWlFrame brand={brand}>
      <div className="mieter-wl-center">
        <div className="mieter-wl-check" aria-hidden>
          ✓
        </div>
        <h1 className="mieter-wl-center-title">{t.title_de}</h1>
        <p className="mieter-wl-center-body">
          {brand.name}
          {t.body_suffix_de}
        </p>
        <p className="text-[13px] leading-relaxed text-[#4a5c54] text-center mt-2 max-w-[340px]">
          {t.register_hint_de}
        </p>

        <div className="mieter-wl-bestaetigung-actions w-full max-w-[340px] mt-4">
          <MieterWlBtn href={registerHref} className="mieter-wl-btn--lg">
            {t.register_de}
          </MieterWlBtn>

          {statusUrl ? (
            <>
              <MieterWlBtn href={statusUrl} kind="ghost">
                {t.track_de}
              </MieterWlBtn>
              <button
                type="button"
                className="mieter-wl-btn mieter-wl-btn--ghost w-full"
                onClick={() => void copyLink()}
              >
                {copied ? t.copied_de : t.copy_de}
              </button>
            </>
          ) : (
            <p className="text-[13px] leading-relaxed text-[#4a5c54] text-center">
              Bitte wenden Sie sich bei Fragen an Ihre Verwaltung.
            </p>
          )}

          <Link
            href={loginHref}
            className="block text-center text-sm font-semibold pt-1"
            style={{ color: "var(--org-primary, #2E7D52)" }}
          >
            {t.login_de}
          </Link>

          {objektAuswahlHref ? (
            <Link
              href={objektAuswahlHref}
              className="block text-center text-sm font-medium text-[#6b756f]"
            >
              Schließen
            </Link>
          ) : null}
        </div>
      </div>
    </MieterWlFrame>
  );
}
