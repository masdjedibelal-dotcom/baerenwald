"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { EinstellungenEdField } from "@/components/shared/PortalEinstellungenUi";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";

type Props = {
  /** Nach Löschung: Portal oder Partner Sign-out Ziel */
  signOutHref?: string;
  /** Org: Konto-Löschen ausblenden / Hinweis */
  allowDelete?: boolean;
  deleteBlockedHint?: string | null;
};

/**
 * B1/B3 — Passwort ändern · Konto löschen (Modals).
 */
export function PortalKontoSicherheitPanel({
  signOutHref = "/portal/login",
  allowDelete = true,
  deleteBlockedHint = null,
}: Props) {
  const router = useRouter();

  const [pwOpen, setPwOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);
  const [openHint, setOpenHint] = useState<string | null>(null);

  function closePasswordModal() {
    if (pwBusy) return;
    setPwOpen(false);
    setPwCurrent("");
    setPwNew("");
  }

  function closeDeleteModal() {
    if (deleteBusy) return;
    setDeleteOpen(false);
    setDeletePw("");
    setForceOpen(false);
    setOpenHint(null);
  }

  async function changePassword() {
    if (pwNew.length < 8) {
      portalToastError("Neues Passwort mindestens 8 Zeichen.");
      return;
    }
    setPwBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) {
        portalToastError("Nicht angemeldet.");
        return;
      }
      const { error: reauth } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: pwCurrent,
      });
      if (reauth) {
        portalToastError("Aktuelles Passwort falsch.");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: pwNew });
      if (error) {
        portalToastError(error.message);
        return;
      }
      setPwCurrent("");
      setPwNew("");
      setPwOpen(false);
      portalToastSuccess("Passwort geändert.");
    } finally {
      setPwBusy(false);
    }
  }

  async function deleteAccount() {
    setDeleteBusy(true);
    setOpenHint(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm: true,
          password: deletePw,
          forceOpenVorgaenge: forceOpen,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409 && json.error === "open_vorgaenge") {
        setOpenHint(String(json.message || ""));
        setForceOpen(true);
        return;
      }
      if (!res.ok) {
        portalToastError(json.error || "Löschung fehlgeschlagen.");
        return;
      }
      portalToastSuccess("Konto gelöscht.");
      router.replace(signOutHref);
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <div className="space-y-3 border-t border-border-default pt-4">
        <p
          className="text-[11.5px] font-bold tracking-wide"
          style={{ color: PORTAL_VAR.faint }}
        >
          KONTO & SICHERHEIT
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            className="btn-pill-outline portal-btn-compact"
            onClick={() => setPwOpen(true)}
          >
            Passwort ändern
          </button>
          {allowDelete ? (
            <button
              type="button"
              className="rounded-[9px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700"
              onClick={() => setDeleteOpen(true)}
            >
              Konto löschen
            </button>
          ) : (
            <p className="text-[12.5px] leading-relaxed text-text-secondary">
              {deleteBlockedHint ||
                "Dieses Konto kann nicht selbst gelöscht werden. Bitte Support kontaktieren."}
            </p>
          )}
        </div>
      </div>

      <PortalModalShell
        open={pwOpen}
        title="Passwort ändern"
        subtitle="Aktuelles Passwort bestätigen, dann neues setzen."
        onClose={closePasswordModal}
        closeOnBackdrop={!pwBusy}
      >
        <div className="flex flex-col gap-3">
          <EinstellungenEdField
            label="Aktuelles Passwort"
            value={pwCurrent}
            onChange={setPwCurrent}
            type="password"
            autoComplete="current-password"
          />
          <EinstellungenEdField
            label="Neues Passwort"
            value={pwNew}
            onChange={setPwNew}
            type="password"
            autoComplete="new-password"
          />
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="btn-pill-outline portal-btn !px-4 !py-2.5"
              disabled={pwBusy}
              onClick={closePasswordModal}
            >
              Abbrechen
            </button>
            <button
              type="button"
              className="btn-pill-primary portal-btn !px-4 !py-2.5"
              disabled={pwBusy || !pwCurrent || pwNew.length < 8}
              onClick={() => void changePassword()}
            >
              {pwBusy ? "Speichern…" : "Passwort speichern"}
            </button>
          </div>
        </div>
      </PortalModalShell>

      <PortalModalShell
        open={deleteOpen}
        title="Konto wirklich löschen?"
        subtitle="Das kann nicht rückgängig gemacht werden."
        onClose={closeDeleteModal}
        closeOnBackdrop={!deleteBusy}
      >
        <div className="flex flex-col gap-3">
          <p className="text-[13px] leading-relaxed text-text-secondary">
            Login wird gelöscht, Stammdaten anonymisiert. Offene Vorgänge können
            aus gesetzlichen Gründen erhalten bleiben.
          </p>
          {openHint ? (
            <p className="rounded-[9px] border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] leading-relaxed text-amber-950">
              {openHint} Tippen Sie erneut auf „Endgültig löschen“, um trotzdem
              fortzufahren.
            </p>
          ) : null}
          <EinstellungenEdField
            label="Passwort zur Bestätigung"
            value={deletePw}
            onChange={setDeletePw}
            type="password"
            autoComplete="current-password"
          />
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="btn-pill-outline portal-btn !px-4 !py-2.5"
              disabled={deleteBusy}
              onClick={closeDeleteModal}
            >
              Abbrechen
            </button>
            <button
              type="button"
              className="rounded-[9px] bg-red-700 px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
              disabled={deleteBusy || deletePw.length < 6}
              onClick={() => void deleteAccount()}
            >
              {deleteBusy ? "Löschen…" : "Endgültig löschen"}
            </button>
          </div>
        </div>
      </PortalModalShell>
    </>
  );
}
