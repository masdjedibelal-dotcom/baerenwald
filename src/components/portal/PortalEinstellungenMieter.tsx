"use client";

import { useEffect, useState } from "react";

import {
  EinstellungenPfRow,
} from "@/components/shared/PortalEinstellungenUi";
import {
  EINSTELLUNGEN_PROFIL_EDIT,
  einstellungenPageTitle,
} from "@/lib/portal2/einstellungen";
import {
  MIETER_KONTO_ZUGANG_TITLE,
  MIETER_SPRACHE_INTRO,
  MIETER_SPRACHE_TITLE,
  PORTAL_UI_LANG_STORAGE_KEY,
  einstellungenMaxWidthClass,
  mieterKontoZugangHinweis,
  type PortalUiLang,
} from "@/lib/portal2/einstellungen-ui";
import { cn } from "@/lib/utils";

type Props = {
  name?: string | null;
  email?: string | null;
  telefon?: string | null;
  wohnung?: string | null;
  orgName?: string | null;
  orgMail?: string | null;
};

/**
 * D12 Mieter — Mock `screenSettings` Konto: Profil (pf) · Zugang · Sprache (A3).
 */
export function PortalEinstellungenMieter({
  name,
  email,
  telefon,
  wohnung,
  orgName,
  orgMail,
}: Props) {
  const [lang, setLang] = useState<PortalUiLang>("de");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PORTAL_UI_LANG_STORAGE_KEY);
      if (raw === "en" || raw === "de") setLang(raw);
    } catch {
      /* ignore */
    }
  }, []);

  const setUiLang = (next: PortalUiLang) => {
    setLang(next);
    try {
      localStorage.setItem(PORTAL_UI_LANG_STORAGE_KEY, next);
      window.dispatchEvent(
        new CustomEvent("portal2-ui-lang", { detail: next })
      );
    } catch {
      /* ignore */
    }
  };

  const mail = orgMail?.trim() || "hello@baerenwald.de";

  return (
    <div
      className={`mx-auto flex w-full flex-col gap-3.5 ${einstellungenMaxWidthClass("mieter")}`}
    >
      <div className="space-y-0.5">
        <h2 className="portal-text-section text-text-primary">
          {einstellungenPageTitle("mieter")}
        </h2>
      </div>

      <section className="card-bordered space-y-2.5 p-4 sm:p-5">
        <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
          Profil
        </h3>
        <EinstellungenPfRow label="Name" value={name?.trim() || "—"} />
        <EinstellungenPfRow label="E-Mail" value={email?.trim() || "—"} />
        <EinstellungenPfRow label="Telefon" value={telefon?.trim() || "—"} />
        <a
          href={`mailto:${mail}?subject=${encodeURIComponent("MeinBärenwald Konto")}`}
          className="mt-1 block w-full rounded-[9px] border border-border-default bg-white px-3 py-2.5 text-center text-[13px] font-semibold text-text-secondary"
        >
          {EINSTELLUNGEN_PROFIL_EDIT}
        </a>
      </section>

      <section className="card-bordered space-y-2.5 p-4 sm:p-5">
        <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
          {MIETER_KONTO_ZUGANG_TITLE}
        </h3>
        <EinstellungenPfRow
          label="Wohnung"
          value={wohnung?.trim() || "—"}
        />
        <EinstellungenPfRow
          label="Portal bereitgestellt von"
          value={orgName?.trim() || "—"}
        />
        <p className="text-[12.5px] leading-relaxed text-text-secondary">
          {mieterKontoZugangHinweis(mail)}
        </p>
      </section>

      <section className="card-bordered space-y-3 p-4 sm:p-5">
        <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
          {MIETER_SPRACHE_TITLE}
        </h3>
        <p className="text-[13px] leading-relaxed text-text-secondary">
          {MIETER_SPRACHE_INTRO}
        </p>
        <div
          className="flex gap-2"
          role="group"
          aria-label={MIETER_SPRACHE_TITLE}
        >
          {(["de", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setUiLang(l)}
              className={cn(
                "min-w-[52px] rounded-[9px] border px-3 py-2 text-[13px] font-bold uppercase",
                lang === l
                  ? "border-accent bg-accent text-white"
                  : "border-border-default bg-white text-text-secondary"
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </section>

      <form action="/portal/auth/signout" method="post">
        <button type="submit" className="btn-pill-outline w-full">
          Abmelden
        </button>
      </form>
    </div>
  );
}
