"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PortalKontoSicherheitPanel } from "@/components/shared/PortalKontoSicherheitPanel";
import { PortalEinstellungenShell } from "@/components/shared/PortalEinstellungenShell";
import { PortalPushSettingsPanel } from "@/components/shared/PortalPushSettingsPanel";
import {
  EinstellungenEdField,
  EinstellungenEditModal,
  EinstellungenPfList,
  EinstellungenPfRow,
  EinstellungenSectionHeader,
} from "@/components/shared/PortalEinstellungenUi";
import { SITE_CONFIG } from "@/lib/config";
import {
  MIETER_KONTO_ZUGANG_TITLE,
  MIETER_SPRACHE_TITLE,
  PORTAL_UI_LANG_STORAGE_KEY,
  mieterKontoZugangHinweis,
  type PortalUiLang,
} from "@/lib/portal2/einstellungen-ui";
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
 * D12 Mieter — Profil Anzeige; Telefon per Stift → Modal.
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
  const [savedTel, setSavedTel] = useState(telefon?.trim() || "");
  const [editOpen, setEditOpen] = useState(false);
  const [editTel, setEditTel] = useState(savedTel);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PORTAL_UI_LANG_STORAGE_KEY);
      if (raw === "en" || raw === "de") setLang(raw);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setSavedTel(telefon?.trim() || "");
  }, [telefon]);

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

  function openEdit() {
    setEditTel(savedTel);
    setEditOpen(true);
  }

  function closeEdit() {
    if (busy) return;
    setEditOpen(false);
  }

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
      setSavedTel(editTel.trim());
      setEditOpen(false);
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
          if (tab === "benachrichtigungen") {
            return <PortalPushSettingsPanel portal="portal" />;
          }

          if (tab === "zugang") {
            return (
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <EinstellungenSectionHeader title={MIETER_KONTO_ZUGANG_TITLE} />
                  <EinstellungenPfList>
                    <EinstellungenPfRow
                      label="Wohnung"
                      value={wohnung?.trim() || "—"}
                    />
                    <EinstellungenPfRow
                      label="Portal bereitgestellt von"
                      value={orgName?.trim() || "—"}
                    />
                  </EinstellungenPfList>
                  <p className="portal-text-meta leading-relaxed text-text-secondary">
                    {mieterKontoZugangHinweis(zugangMail)}
                  </p>
                </div>

                <div className="space-y-3 border-t border-border-default pt-4">
                  <EinstellungenSectionHeader title={MIETER_SPRACHE_TITLE} />
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
                          "portal-text-meta min-w-[52px] rounded-[9px] border px-3 py-2 font-bold uppercase",
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
              </div>
            );
          }

          return (
            <div className="space-y-2.5">
              <EinstellungenSectionHeader
                title="PROFIL"
                onEdit={openEdit}
                editLabel="Telefon bearbeiten"
              />
              <EinstellungenPfList>
                <EinstellungenPfRow label="Name" value={name?.trim() || "—"} />
                <EinstellungenPfRow label="E-Mail" value={email?.trim() || "—"} />
                <EinstellungenPfRow label="Telefon" value={savedTel || "—"} />
              </EinstellungenPfList>
              <p className="portal-text-meta leading-relaxed text-text-secondary">
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

      <EinstellungenEditModal
        open={editOpen}
        title="Telefon bearbeiten"
        onClose={closeEdit}
        onSave={() => void saveTelefon()}
        saving={busy}
      >
        <EinstellungenEdField
          label="Telefon"
          value={editTel}
          onChange={setEditTel}
          type="tel"
          autoComplete="tel"
        />
      </EinstellungenEditModal>

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
