"use client";

import Link from "next/link";
import { useState } from "react";

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
  /** @deprecated nicht mehr angezeigt */
  referenz?: string | null;
  objektAuswahlHref?: string | null;
};

/**
 * Bestätigung nach Meldung — Soft-WL: Status-Link statt MeinBärenwald-CTA.
 */
export function MeldenBestaetigungClient({
  brand,
  statusToken,
  statusUrl: statusUrlProp,
  objektAuswahlHref,
}: Props) {
  const t = MIETER_WL_BESTAETIGUNG;
  const [copied, setCopied] = useState(false);

  const statusUrl =
    statusUrlProp?.trim() ||
    (statusToken?.trim() ? `/melden/status/${statusToken.trim()}` : null);

  async function copyLink() {
    if (!statusUrl) return;
    try {
      const absolute =
        typeof window !== "undefined" && statusUrl.startsWith("/")
          ? `${window.location.origin}${statusUrl}`
          : statusUrl;
      await navigator.clipboard.writeText(absolute);
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
          {t.status_hint_de}
        </p>

        <div className="w-full max-w-[340px] space-y-2.5 mt-3">
          {statusUrl ? (
            <>
              <MieterWlBtn href={statusUrl}>{t.track_de}</MieterWlBtn>
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

          {objektAuswahlHref ? (
            <Link
              href={objektAuswahlHref}
              className="block text-center text-sm font-semibold mt-2"
              style={{ color: "var(--org-primary, #2E7D52)" }}
            >
              Schließen
            </Link>
          ) : null}
        </div>
      </div>
    </MieterWlFrame>
  );
}
