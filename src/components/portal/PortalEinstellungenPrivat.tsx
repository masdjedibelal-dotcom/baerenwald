"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PortalKontoSicherheitPanel } from "@/components/shared/PortalKontoSicherheitPanel";
import { PortalEinstellungenShell } from "@/components/shared/PortalEinstellungenShell";
import {
  EinstellungenEdField,
  EinstellungenEditModal,
  EinstellungenPfRow,
  EinstellungenSectionHeader,
} from "@/components/shared/PortalEinstellungenUi";
import type { PortalKundeTyp } from "@/lib/portal2/kunde-typ";
import { portalKundeTypRoleLabel } from "@/lib/portal2/kunde-typ";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";

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
    setEditOpen(true);
  }

  function closeEdit() {
    if (busy) return;
    setEditOpen(false);
  }

  async function saveProfil() {
    setBusy(true);
    try {
      const res = await fetch("/api/account/profil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, telefon: editTel }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        portalToastError(json.error || "Speichern fehlgeschlagen.");
        return;
      }
      setSavedName(editName.trim());
      setSavedTel(editTel.trim());
      setEditOpen(false);
      portalToastSuccess("Profil gespeichert.");
      router.refresh();
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
        {() => (
          <div className="space-y-4">
            <div className="space-y-2.5">
              <EinstellungenSectionHeader
                title="PROFIL"
                onEdit={openEdit}
                editLabel="Profil bearbeiten"
              />
              <EinstellungenPfRow label="Name" value={savedName || "—"} />
              <EinstellungenPfRow label="E-Mail" value={email?.trim() || "—"} />
              <EinstellungenPfRow label="Telefon" value={savedTel || "—"} />
              <p className="text-[11.5px] text-text-tertiary">
                E-Mail-Änderung nur über Support (Verifizierung).
              </p>
            </div>

            <PortalKontoSicherheitPanel signOutHref="/portal/login" />
          </div>
        )}
      </PortalEinstellungenShell>

      <EinstellungenEditModal
        open={editOpen}
        title="Profil bearbeiten"
        subtitle="Änderungen erst nach Speichern übernehmen."
        onClose={closeEdit}
        onSave={() => void saveProfil()}
        saving={busy}
        saveDisabled={editName.trim().length < 2}
      >
        <EinstellungenEdField
          label="Name"
          value={editName}
          onChange={setEditName}
          autoComplete="name"
        />
        <EinstellungenPfRow label="E-Mail" value={email?.trim() || "—"} />
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
