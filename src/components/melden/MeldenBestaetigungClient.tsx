"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  MieterWlBtn,
  MieterWlFrame,
} from "@/components/melden/MieterWlFrame";
import type { MeldeLang } from "@/lib/melden/melde-i18n";
import {
  MIETER_WL_BESTAETIGUNG,
  type MieterWlBrand,
} from "@/lib/portal2/mieter-wl";
import "./melden.css";

type Props = {
  brand: MieterWlBrand;
  statusToken?: string | null;
  statusLink?: string | null;
  referenz?: string | null;
  /** Zurück zur Objektauswahl (Org-Kennung) */
  objektAuswahlHref?: string | null;
};

/**
 * Mock `wlBestaetigung` + Spec: Status-Link, keine Mieter-Mail.
 */
export function MeldenBestaetigungClient({
  brand,
  statusToken,
  statusLink,
  referenz,
  objektAuswahlHref,
}: Props) {
  const [lang, setLang] = useState<MeldeLang>("de");
  const [copied, setCopied] = useState(false);

  const href = useMemo(() => {
    if (statusLink?.trim()) return statusLink.trim();
    if (statusToken?.trim()) return `/melden/status/${statusToken.trim()}`;
    return null;
  }, [statusLink, statusToken]);

  const absoluteUrl = useMemo(() => {
    if (!href) return null;
    if (href.startsWith("http")) return href;
    if (typeof window !== "undefined") {
      return `${window.location.origin}${href.startsWith("/") ? href : `/${href}`}`;
    }
    return href;
  }, [href]);

  const ref =
    referenz?.trim() ||
    (statusToken ? statusToken.slice(0, 8).toUpperCase() : null);

  async function copyLink() {
    if (!absoluteUrl) return;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  const t = MIETER_WL_BESTAETIGUNG;

  return (
    <MieterWlFrame brand={brand} lang={lang} onLangChange={setLang}>
      <div className="mieter-wl-center">
        <div className="mieter-wl-check" aria-hidden>
          ✓
        </div>
        <h1 className="mieter-wl-center-title">
          {lang === "en" ? t.title_en : t.title_de}
        </h1>
        <p className="mieter-wl-center-body">
          {brand.name}
          {lang === "en" ? t.body_suffix_en : t.body_suffix_de}
        </p>
        <p className="text-[12.5px] text-[#8a9690] mb-4 max-w-[340px]">
          {lang === "en" ? t.status_hint_en : t.status_hint_de}
        </p>

        {ref ? (
          <div className="mieter-wl-ref">
            <p className="mieter-wl-ref-label">
              {lang === "en" ? t.ref_en : t.ref_de}
            </p>
            <p className="mieter-wl-ref-value">{ref}</p>
          </div>
        ) : null}

        <div className="w-full max-w-[340px] space-y-2.5">
          {href ? (
            <>
              <MieterWlBtn href={href}>
                {lang === "en" ? t.track_en : t.track_de}
              </MieterWlBtn>
              <MieterWlBtn kind="ghost" onClick={() => void copyLink()}>
                {copied
                  ? lang === "en"
                    ? t.copied_en
                    : t.copied_de
                  : lang === "en"
                    ? t.copy_en
                    : t.copy_de}
              </MieterWlBtn>
            </>
          ) : null}
          {objektAuswahlHref ? (
            <Link
              href={objektAuswahlHref}
              className="block text-center text-sm font-semibold mt-2"
              style={{ color: "var(--org-primary, #2E7D52)" }}
            >
              {lang === "en" ? "Close" : "Schließen"}
            </Link>
          ) : null}
        </div>
      </div>
    </MieterWlFrame>
  );
}
