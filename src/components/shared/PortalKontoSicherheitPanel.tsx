"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { EinstellungenEdField } from "@/components/shared/PortalEinstellungenUi";
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
 * B1/B3/B4 — Passwort ändern · Datenexport · Konto löschen.
 */
export function PortalKontoSicherheitPanel({
  signOutHref = "/portal/login",
  allowDelete = true,
  deleteBlockedHint = null,
}: Props) {
  const router = useRouter();
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  const [exportBusy, setExportBusy] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);
  const [openHint, setOpenHint] = useState<string | null>(null);

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
      portalToastSuccess("Passwort geändert.");
    } finally {
      setPwBusy(false);
    }
  }

  async function exportData() {
    setExportBusy(true);
    try {
      const res = await fetch("/api/account/export");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        portalToastError(json.error || "Export fehlgeschlagen.");
        return;
      }
      const blob = new Blob([JSON.stringify(json, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `baerenwald-datenexport-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      portalToastSuccess("Export heruntergeladen.");
    } finally {
      setExportBusy(false);
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
    <div className="space-y-5 border-t border-border-default pt-4">
      <div className="space-y-2.5">
        <h3
          className="text-sm font-bold"
          style={{
            color: PORTAL_VAR.ink,
            fontFamily: "var(--p2-font-head, " + PORTAL_VAR.head + ")",
          }}
        >
          Passwort ändern
        </h3>
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
        <button
          type="button"
          className="btn-pill-outline portal-btn-compact"
          disabled={pwBusy || !pwCurrent || !pwNew}
          onClick={() => void changePassword()}
        >
          {pwBusy ? "Speichern…" : "Passwort speichern"}
        </button>
      </div>

      <div className="space-y-2">
        <h3
          className="text-sm font-bold"
          style={{
            color: PORTAL_VAR.ink,
            fontFamily: "var(--p2-font-head, " + PORTAL_VAR.head + ")",
          }}
        >
          Meine Daten
        </h3>
        <p className="text-[12.5px] leading-relaxed text-text-secondary">
          Export als JSON (Profil und eigene Vorgänge) — Auskunft nach Art. 15
          DSGVO.
        </p>
        <button
          type="button"
          className="btn-pill-outline portal-btn-compact"
          disabled={exportBusy}
          onClick={() => void exportData()}
        >
          {exportBusy ? "Export…" : "Meine Daten exportieren"}
        </button>
      </div>

      <div className="space-y-2">
        <h3
          className="text-sm font-bold text-red-700"
          style={{
            fontFamily: "var(--p2-font-head, " + PORTAL_VAR.head + ")",
          }}
        >
          Konto löschen
        </h3>
        {!allowDelete ? (
          <p className="text-[12.5px] leading-relaxed text-text-secondary">
            {deleteBlockedHint ||
              "Dieses Konto kann nicht selbst gelöscht werden. Bitte Support kontaktieren."}
          </p>
        ) : !deleteOpen ? (
          <>
            <p className="text-[12.5px] leading-relaxed text-text-secondary">
              Löscht Ihren Login und anonymisiert Stammdaten. Vorgänge können
              aus gesetzlichen Gründen erhalten bleiben.
            </p>
            <button
              type="button"
              className="rounded-[9px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700"
              onClick={() => setDeleteOpen(true)}
            >
              Konto löschen…
            </button>
          </>
        ) : (
          <div className="space-y-2 rounded-[11px] border border-red-200 bg-red-50/60 p-3">
            <p className="text-[12.5px] leading-relaxed text-red-900">
              Wirklich unwiderruflich löschen? Bitte Passwort eingeben.
            </p>
            {openHint ? (
              <p className="text-[12.5px] leading-relaxed text-red-800">
                {openHint} Nochmal tippen, um trotzdem zu löschen.
              </p>
            ) : null}
            <EinstellungenEdField
              label="Passwort"
              value={deletePw}
              onChange={setDeletePw}
              type="password"
              autoComplete="current-password"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-[9px] bg-red-700 px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
                disabled={deleteBusy || deletePw.length < 6}
                onClick={() => void deleteAccount()}
              >
                {deleteBusy ? "Löschen…" : "Endgültig löschen"}
              </button>
              <button
                type="button"
                className="btn-pill-outline portal-btn-compact"
                onClick={() => {
                  setDeleteOpen(false);
                  setDeletePw("");
                  setForceOpen(false);
                  setOpenHint(null);
                }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
