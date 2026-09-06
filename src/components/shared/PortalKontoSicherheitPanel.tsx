"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { EinstellungenEdField, EinstellungenSectionCard } from "@/components/shared/PortalEinstellungenUi";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";

type Props = {
  /** Nach Löschung: Portal oder Partner Sign-out Ziel */
  signOutHref?: string;
  /** Org: Konto-Löschen ausblenden / Hinweis */
  allowDelete?: boolean;
  deleteBlockedHint?: string | null;
  /**
   * Wenn `allowDelete` false: „Konto löschen“ als mailto-Button
   * (z. B. Organisationskonten über Support).
   */
  deleteMailto?: string | null;
  /** Abmelden-Form-Action (Default aus signOutHref abgeleitet). */
  signOutAction?: string;
  /** Logout-Button in der Card (Default an). */
  showSignOut?: boolean;
};

function resolveSignOutAction(signOutHref: string, override?: string): string {
  if (override) return override;
  return signOutHref.includes("/partner")
    ? "/partner/auth/signout"
    : "/portal/auth/signout";
}

/**
 * B1/B3 — Passwort, Logout und Konto löschen in einer Section-Card (flach).
 */
export function PortalKontoSicherheitPanel({
  signOutHref = "/portal/login",
  allowDelete = true,
  deleteBlockedHint = null,
  deleteMailto = null,
  signOutAction,
  showSignOut = true,
}: Props) {
  const router = useRouter();
  const logoutAction = resolveSignOutAction(signOutHref, signOutAction);

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

  const deleteControl = allowDelete ? (
    <button
      type="button"
      className="portal-konto-action portal-konto-action--danger"
      onClick={() => setDeleteOpen(true)}
    >
      Konto löschen
    </button>
  ) : deleteMailto ? (
    <a
      href={`mailto:${deleteMailto}?subject=${encodeURIComponent("Konto löschen")}`}
      className="portal-konto-action portal-konto-action--danger"
    >
      Konto löschen
    </a>
  ) : deleteBlockedHint ? (
    <p className="portal-text-meta leading-relaxed text-text-secondary">
      {deleteBlockedHint}
    </p>
  ) : null;

  return (
    <>
      <EinstellungenSectionCard title="Konto & Sicherheit">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className="portal-konto-action"
            onClick={() => setPwOpen(true)}
          >
            Passwort ändern
          </button>
          {showSignOut ? (
            <form action={logoutAction} method="post">
              <button type="submit" className="portal-konto-action">
                Logout
              </button>
            </form>
          ) : null}
          {deleteControl}
        </div>
      </EinstellungenSectionCard>

      <PortalModalShell
        open={pwOpen}
        title="Passwort ändern"
        subtitle="Aktuelles Passwort bestätigen, dann neues setzen."
        variant="edit"
        onClose={closePasswordModal}
        closeOnBackdrop={!pwBusy}
        busy={pwBusy}
        dirty={Boolean(pwCurrent || pwNew)}
        onConfirm={() => void changePassword()}
        confirmLabel={pwBusy ? "Speichern…" : "Passwort speichern"}
        confirmDisabled={pwBusy || !pwCurrent || pwNew.length < 8}
      >
        <div className="portal-sheet-form-group">
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
        </div>
      </PortalModalShell>

      <PortalModalShell
        open={deleteOpen}
        title="Konto wirklich löschen?"
        subtitle="Das kann nicht rückgängig gemacht werden."
        variant="edit"
        onClose={closeDeleteModal}
        closeOnBackdrop={!deleteBusy}
        busy={deleteBusy}
        footer={
          <button
            type="button"
            className="portal-action-btn portal-action-btn--danger portal-action-btn--block"
            disabled={deleteBusy || deletePw.length < 6}
            onClick={() => void deleteAccount()}
          >
            {deleteBusy ? "Löschen…" : "Endgültig löschen"}
          </button>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="portal-text-meta leading-relaxed text-text-secondary">
            Login wird gelöscht, Stammdaten anonymisiert. Offene Vorgänge können
            aus gesetzlichen Gründen erhalten bleiben.
          </p>
          {openHint ? (
            <p className="portal-text-meta rounded-[9px] border border-amber-200 bg-amber-50 px-3 py-2 leading-relaxed text-amber-950">
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
        </div>
      </PortalModalShell>
    </>
  );
}
