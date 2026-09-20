"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { PortalInput } from "@/components/shared/PortalFormControls";
import { PortalKontoSicherheitPanel } from "@/components/shared/PortalKontoSicherheitPanel";
import { PortalEinstellungenShell } from "@/components/shared/PortalEinstellungenShell";
import { PortalField } from "@/components/shared/PortalField";
import { PortalPushSettingsPanel } from "@/components/shared/PortalPushSettingsPanel";
import {
  EinstellungenEdField,
  EinstellungenEditModal,
  EinstellungenPfList,
  EinstellungenPfRow,
  EinstellungenSectionCard,
} from "@/components/shared/PortalEinstellungenUi";
import type { PortalKundeTyp } from "@/lib/portal2/kunde-typ";
import { portalKundeTypRoleLabel } from "@/lib/portal2/kunde-typ";
import { useFieldErrors } from "@/lib/portal2/form-schema";
import {
  portalToastSuccess,
  portalToastSystemError,
} from "@/lib/shared/portal-toast";
import { TOAST } from "@/lib/portal-copy";

type Props = {
  name?: string | null;
  email?: string | null;
  telefon?: string | null;
  kundeTyp: Exclude<PortalKundeTyp, "hv">;
};

/**
 * D12 Privat/Gewerbe — Profil nur Anzeige; Bearbeiten per Stift → Modal.
 */
export function PortalEinstellungenPrivat({
  name,
  email,
  telefon,
  kundeTyp,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } =
    useFieldErrors();
  const [savedName, setSavedName] = useState(name?.trim() || "");
  const [savedTel, setSavedTel] = useState(telefon?.trim() || "");
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(savedName);
  const [editTel, setEditTel] = useState(savedTel);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSavedName(name?.trim() || "");
    setSavedTel(telefon?.trim() || "");
  }, [name, telefon]);

  function openEdit() {
    setEditName(savedName);
    setEditTel(savedTel);
    clearFieldErrors();
    setEditOpen(true);
  }

  function closeEdit() {
    if (busy) return;
    setEditOpen(false);
    clearFieldErrors();
  }

  /* FORM_VALIDATION: portal-einstellungen-privat */
  async function saveProfil() {
    if (editName.trim().length < 2) {
      applyFieldErrors(
        { name: "Bitte einen Namen mit mind. 2 Zeichen eingeben." },
        formRef.current
      );
      return;
    }
    clearFieldErrors();
    setBusy(true);
    try {
      const res = await fetch("/api/account/profil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, telefon: editTel }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        portalToastSystemError(
          json.error || "Speichern fehlgeschlagen.",
          "portal-einstellungen-privat",
          undefined,
          { onRetry: () => void saveProfil() }
        );
        return;
      }
      setSavedName(editName.trim());
      setSavedTel(editTel.trim());
      setEditOpen(false);
      portalToastSuccess(TOAST.profil_gespeichert);
      router.refresh();
    } catch (err) {
      portalToastSystemError(err, "portal-einstellungen-privat", undefined, {
        onRetry: () => void saveProfil(),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PortalEinstellungenShell
        variant="privat"
        eyebrow={portalKundeTypRoleLabel(kundeTyp)}
      >
        {(tab) => {
          if (tab === "benachrichtigungen") {
            return <PortalPushSettingsPanel portal="portal" />;
          }

          return (
            <>
              <EinstellungenSectionCard
                title="Persönliche Daten"
                onEdit={openEdit}
              >
                <EinstellungenPfList>
                  <EinstellungenPfRow label="Name" value={savedName || "—"} />
                  <EinstellungenPfRow
                    label="E-Mail"
                    value={email?.trim() || "—"}
                  />
                  <EinstellungenPfRow label="Telefon" value={savedTel || "—"} />
                </EinstellungenPfList>
                <p className="portal-text-label normal-case tracking-normal text-text-tertiary">
                  E-Mail-Änderung nur über Support (Verifizierung).
                </p>
              </EinstellungenSectionCard>

              <PortalKontoSicherheitPanel signOutHref="/portal/login" />
            </>
          );
        }}
      </PortalEinstellungenShell>

      <EinstellungenEditModal
        open={editOpen}
        title="Profil bearbeiten"
        onClose={closeEdit}
        onSave={() => void saveProfil()}
        saving={busy}
      >
        <div ref={formRef} className="space-y-3">
          <PortalField
            label="Name"
            name="name"
            required
            error={fieldErrors.name}
          >
            <PortalInput
              className="portal-field w-full"
              value={editName}
              autoComplete="name"
              onChange={(e) => {
                setEditName(e.target.value);
                clearField("name");
              }}
            />
          </PortalField>
          <EinstellungenPfRow label="E-Mail" value={email?.trim() || "—"} />
          <EinstellungenEdField
            label="Telefon"
            value={editTel}
            onChange={setEditTel}
            type="tel"
            autoComplete="tel"
          />
        </div>
      </EinstellungenEditModal>
    </div>
  );
}
