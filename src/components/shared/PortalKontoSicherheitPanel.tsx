"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { z } from "zod";

import { PortalInput } from "@/components/shared/PortalFormControls";
import { PortalButton } from "@/components/portal/PortalButton";
import { PortalField } from "@/components/shared/PortalField";
import { EinstellungenSectionCard } from "@/components/shared/PortalEinstellungenUi";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { TOAST } from "@/lib/portal-copy";
import { parseForm, useFieldErrors } from "@/lib/portal2/form-schema";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  portalToastError,
  portalToastSuccess,
  portalToastSystemError,
} from "@/lib/shared/portal-toast";

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

const pwSchema = z.object({
  current: z.string().min(1, "Bitte aktuelles Passwort eingeben."),
  new: z.string().min(8, TOAST.neues_passwort_mindestens_8_zeichen),
});

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
  const pwFormRef = useRef<HTMLDivElement>(null);
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } =
    useFieldErrors();

  const [pwOpen, setPwOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);
  const [openHint, setOpenHint] = useState<string | null>(null);
  const [deleteFieldError, setDeleteFieldError] = useState<string | undefined>();

  function closePasswordModal() {
    if (pwBusy) return;
    setPwOpen(false);
    setPwCurrent("");
    setPwNew("");
    clearFieldErrors();
  }

  function closeDeleteModal() {
    if (deleteBusy) return;
    setDeleteOpen(false);
    setDeletePw("");
    setForceOpen(false);
    setOpenHint(null);
    setDeleteFieldError(undefined);
  }

  /* FORM_VALIDATION: portal-konto-sicherheit-passwort */
  async function changePassword() {
    const parsed = parseForm(pwSchema, { current: pwCurrent, new: pwNew });
    if (!parsed.ok) {
      applyFieldErrors(parsed.fieldErrors, pwFormRef.current);
      return;
    }
    clearFieldErrors();
    setPwBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) {
        portalToastError(TOAST.nicht_angemeldet);
        return;
      }
      const { error: reauth } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: parsed.data.current,
      });
      if (reauth) {
        applyFieldErrors(
          { current: TOAST.aktuelles_passwort_falsch },
          pwFormRef.current
        );
        return;
      }
      const { error } = await supabase.auth.updateUser({
        password: parsed.data.new,
      });
      if (error) {
        portalToastSystemError(error, "portal-konto-passwort");
        return;
      }
      setPwCurrent("");
      setPwNew("");
      setPwOpen(false);
      portalToastSuccess(TOAST.passwort_geaendert);
    } finally {
      setPwBusy(false);
    }
  }

  async function deleteAccount() {
    if (deletePw.length < 6) {
      setDeleteFieldError("Bitte Passwort zur Bestätigung eingeben.");
      return;
    }
    setDeleteFieldError(undefined);
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
        portalToastSystemError(
          json.error || "Löschung fehlgeschlagen.",
          "portal-konto-loeschen"
        );
        return;
      }
      portalToastSuccess(TOAST.konto_geloescht);
      router.replace(signOutHref);
    } finally {
      setDeleteBusy(false);
    }
  }

  const deleteControl = allowDelete ? (
    <PortalButton
      variant="danger"
      type="button"
      className="portal-konto-action portal-konto-action--danger"
      onClick={() => setDeleteOpen(true)}
    >
      Konto löschen
    </PortalButton>
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
          <PortalButton
            variant="ghost"
            type="button"
            className="portal-konto-action"
            onClick={() => setPwOpen(true)}
          >
            Passwort ändern
          </PortalButton>
          {showSignOut ? (
            <form action={logoutAction} method="post">
              <PortalButton variant="ghost" type="submit" className="portal-konto-action">
                Logout
              </PortalButton>
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
        confirmDisabled={pwBusy}
      >
        <div ref={pwFormRef} className="portal-sheet-form-group">
          <PortalField
            label="Aktuelles Passwort"
            name="current"
            required
            error={fieldErrors.current}
          >
            <PortalInput
              className="portal-field w-full"
              type="password"
              autoComplete="current-password"
              value={pwCurrent}
              onChange={(e) => {
                setPwCurrent(e.target.value);
                clearField("current");
              }}
            />
          </PortalField>
          <PortalField
            label="Neues Passwort"
            name="new"
            required
            error={fieldErrors.new}
          >
            <PortalInput
              className="portal-field w-full"
              type="password"
              autoComplete="new-password"
              value={pwNew}
              onChange={(e) => {
                setPwNew(e.target.value);
                clearField("new");
              }}
            />
          </PortalField>
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
          <PortalButton
            variant="danger"
            block
            disabled={deleteBusy}
            onClick={() => void deleteAccount()}
          >
            {deleteBusy ? "Löschen…" : "Endgültig löschen"}
          </PortalButton>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="portal-text-meta leading-relaxed text-text-secondary">
            Login wird gelöscht, Stammdaten anonymisiert. Offene Vorgänge können
            aus gesetzlichen Gründen erhalten bleiben.
          </p>
          {openHint ? (
            <p className="portal-text-meta rounded-[9px] border border-warning-border bg-warning-bg px-3 py-2 leading-relaxed text-warning-text">
              {openHint} Tippen Sie erneut auf „Endgültig löschen“, um trotzdem
              fortzufahren.
            </p>
          ) : null}
          <PortalField
            label="Passwort zur Bestätigung"
            name="deletePw"
            required
            error={deleteFieldError}
          >
            <PortalInput
              className="portal-field w-full"
              type="password"
              autoComplete="current-password"
              value={deletePw}
              onChange={(e) => {
                setDeletePw(e.target.value);
                setDeleteFieldError(undefined);
              }}
            />
          </PortalField>
        </div>
      </PortalModalShell>
    </>
  );
}
