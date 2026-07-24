"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PortalKontoSicherheitPanel } from "@/components/shared/PortalKontoSicherheitPanel";
import { PortalPushPermissionRationale } from "@/components/shared/PortalPushPermissionRationale";
import { PortalTrackingConsentPanel } from "@/components/shared/PortalTrackingConsentPanel";
import { PortalEinstellungenShell } from "@/components/shared/PortalEinstellungenShell";
import {
  EinstellungenEdField,
  EinstellungenPfRow,
} from "@/components/shared/PortalEinstellungenUi";
import { SITE_CONFIG } from "@/lib/config";
import {
  MIETER_KONTO_ZUGANG_TITLE,
  MIETER_SPRACHE_INTRO,
  MIETER_SPRACHE_TITLE,
  PORTAL_UI_LANG_STORAGE_KEY,
  mieterKontoZugangHinweis,
  type PortalUiLang,
} from "@/lib/portal2/einstellungen-ui";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";
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
 * D12 Mieter — Einstellungen mit Subnav: Profil · Zugang (+ Sprache).
 */
export function PortalEinstellungenMieter({
  name,
  email,
  telefon,
  wohnung,
  orgName,
  orgMail,
}: Props) {
  const router = useRouter();
  const [lang, setLang] = useState<PortalUiLang>("de");
  const [editTel, setEditTel] = useState(telefon?.trim() || "");
  const [busy, setBusy] = useState(false);

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

  const supportMail = orgMail?.trim() || SITE_CONFIG.email;
  const zugangMail = orgMail?.trim() || supportMail;

  async function saveTelefon() {
    setBusy(true);
    try {
      const res = await fetch("/api/account/profil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefon: editTel }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        portalToastError(json.error || "Speichern fehlgeschlagen.");
        return;
      }
      portalToastSuccess("Telefon gespeichert.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PortalEinstellungenShell variant="mieter">
        {(tab) => {
          if (tab === "zugang") {
            return (
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <h3
                    className="text-sm font-bold"
                    style={{
                      color: PORTAL_VAR.ink,
                      fontFamily:
                        "var(--p2-font-head, " + PORTAL_VAR.head + ")",
                    }}
                  >
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
                    {mieterKontoZugangHinweis(zugangMail)}
                  </p>
                </div>

                <div className="space-y-3 border-t border-border-default pt-4">
                  <h3
                    className="text-sm font-bold"
                    style={{
                      color: PORTAL_VAR.ink,
                      fontFamily:
                        "var(--p2-font-head, " + PORTAL_VAR.head + ")",
                    }}
                  >
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
                </div>

                <PortalKontoSicherheitPanel signOutHref="/portal/login" />
                <PortalPushPermissionRationale role="kunde" embedded />
                <PortalTrackingConsentPanel />
              </div>
            );
          }

          return (
            <div className="space-y-2.5">
              <h3
                className="text-sm font-bold"
                style={{
                  color: PORTAL_VAR.ink,
                  fontFamily: "var(--p2-font-head, " + PORTAL_VAR.head + ")",
                }}
              >
                Profil
              </h3>
              <EinstellungenPfRow label="Name" value={name?.trim() || "—"} />
              <EinstellungenPfRow label="E-Mail" value={email?.trim() || "—"} />
              <EinstellungenEdField
                label="Telefon"
                value={editTel}
                onChange={setEditTel}
                type="tel"
                autoComplete="tel"
              />
              <button
                type="button"
                className="btn-pill-outline portal-btn-compact"
                disabled={busy}
                onClick={() => void saveTelefon()}
              >
                {busy ? "Speichern…" : "Telefon speichern"}
              </button>
              <p className="text-[12.5px] leading-relaxed text-text-secondary">
                Name oder E-Mail ändern? Schreiben Sie Ihrer Verwaltung:{" "}
                <a
                  href={`mailto:${supportMail}?subject=${encodeURIComponent("Portal Konto")}`}
                  className="font-semibold text-accent underline"
                >
                  {supportMail}
                </a>
              </p>
            </div>
          );
        }}
      </PortalEinstellungenShell>

      <div className="px-4 lg:px-6">
        <form action="/portal/auth/signout" method="post">
          <button type="submit" className="btn-pill-outline w-full">
            Abmelden
          </button>
        </form>
      </div>
    </div>
  );
}
