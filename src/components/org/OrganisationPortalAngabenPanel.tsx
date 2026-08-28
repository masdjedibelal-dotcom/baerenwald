"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import type { OrganisationKunde } from "@/lib/org/types";
import {
  orgAddressDraftFromKunde,
  orgBrandFromKunde,
} from "@/lib/portal2/brand-presets";
import {
  EinstellungenEdField,
  EinstellungenEditModal,
  EinstellungenGrid2,
  EinstellungenLogoRow,
  EinstellungenPfList,
  EinstellungenPfRow,
  EinstellungenSectionCard,
} from "@/components/shared/PortalEinstellungenUi";
import { usePortalUploadBusy } from "@/components/shared/usePortalUploadBusy";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";

type Props = {
  kunde: OrganisationKunde;
  readOnly?: boolean;
  onSaved: () => void;
};

type Draft = {
  sub: string;
  logo: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
};

function draftFromKunde(kunde: OrganisationKunde): Draft {
  const b = orgBrandFromKunde(kunde);
  const addr = orgAddressDraftFromKunde(kunde);
  return {
    sub: b.sub,
    logo: b.logo,
    strasse: addr.strasse,
    hausnummer: addr.hausnummer,
    plz: addr.plz,
    ort: addr.ort,
  };
}

function dash(v: string) {
  return v.trim() || "—";
}

/**
 * Logo + Portal-Angaben im HV-Profil (ohne Farben / ohne doppelte Name·E-Mail·Telefon).
 */
export function OrganisationPortalAngabenPanel({
  kunde,
  readOnly = false,
  onSaved,
}: Props) {
  const [saved, setSaved] = useState(() => draftFromKunde(kunde));
  const [edit, setEdit] = useState<Draft | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { uploadBusy: logoBusy, runUpload } = usePortalUploadBusy();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSaved(draftFromKunde(kunde));
    setLogoPreview(null);
  }, [kunde]);

  const logoSrc = logoPreview || kunde.org_logo_url;

  const persist = useCallback(
    async (next: Draft) => {
      if (readOnly) return false;
      setSaving(true);
      try {
        const res = await fetch("/api/org/branding", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            org_sub: next.sub,
            org_logo_kuerzel: next.logo,
            org_strasse: next.strasse,
            org_hausnummer: next.hausnummer,
            org_plz: next.plz,
            org_ort: next.ort,
          }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          portalToastError("Angaben nicht gespeichert", json.error);
          return false;
        }
        setSaved(next);
        orgPortalToast.saved();
        onSaved();
        return true;
      } finally {
        setSaving(false);
      }
    },
    [onSaved, readOnly]
  );

  function openEdit() {
    setEdit({ ...saved });
    setEditOpen(true);
  }

  function closeEdit() {
    if (saving) return;
    setEditOpen(false);
    setEdit(null);
  }

  async function saveEdit() {
    if (!edit) return;
    const ok = await persist(edit);
    if (ok) closeEdit();
  }

  async function uploadLogo(file: File) {
    if (readOnly || logoBusy) return;
    if (!file.type.startsWith("image/")) {
      portalToastError("Nur Bilder erlaubt");
      return;
    }
    await runUpload(async () => {
      setLogoPreview(URL.createObjectURL(file));
      const fd = new FormData();
      fd.set("kind", "logo");
      fd.set("file", file);
      const res = await fetch("/api/org/branding/media", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { error?: string; url?: string };
      if (!res.ok || !json.url) {
        setLogoPreview(null);
        portalToastError("Logo nicht gespeichert", json.error);
        return;
      }
      setLogoPreview(json.url);
      orgPortalToast.saved();
      onSaved();
    }).catch(() => {
      setLogoPreview(null);
      portalToastError("Upload fehlgeschlagen");
    });
  }

  return (
    <>
      <EinstellungenSectionCard title="Logo">
        <EinstellungenLogoRow
          fallbackLabel={saved.logo || "HV"}
          readOnly={readOnly}
          uploadBusy={logoBusy}
          hasLogo={Boolean(logoSrc)}
          onUploadClick={
            readOnly ? undefined : () => logoInputRef.current?.click()
          }
          fileInput={
            !readOnly ? (
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void uploadLogo(f);
                }}
              />
            ) : null
          }
          preview={
            logoSrc ? (
              <Image
                src={logoSrc}
                alt=""
                width={64}
                height={64}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : null
          }
        />
      </EinstellungenSectionCard>

      <EinstellungenSectionCard
        title="Angaben fürs Portal"
        onEdit={readOnly ? undefined : openEdit}
        editLabel="Portal-Angaben bearbeiten"
      >
        <EinstellungenPfList>
          <EinstellungenPfRow label="Zusatz / Rolle" value={dash(saved.sub)} />
          <EinstellungenPfRow
            label="Namenskürzel"
            value={dash(saved.logo)}
          />
          <EinstellungenPfRow label="Straße" value={dash(saved.strasse)} />
          <EinstellungenPfRow
            label="Hausnummer"
            value={dash(saved.hausnummer)}
          />
          <EinstellungenPfRow label="PLZ" value={dash(saved.plz)} />
          <EinstellungenPfRow label="Ort" value={dash(saved.ort)} />
        </EinstellungenPfList>
      </EinstellungenSectionCard>

      {edit ? (
        <EinstellungenEditModal
          open={editOpen}
          title="Portal-Angaben bearbeiten"
          subtitle="Zusatz, Kürzel und Anschrift — Speichern oder Abbrechen."
          onClose={closeEdit}
          onSave={() => void saveEdit()}
          saving={saving}
        >
          <EinstellungenEdField
            label="Zusatz / Rolle"
            value={edit.sub}
            onChange={(v) => setEdit({ ...edit, sub: v })}
          />
          <EinstellungenEdField
            label="Namenskürzel (Logo-Fallback)"
            value={edit.logo}
            onChange={(v) =>
              setEdit({ ...edit, logo: v.slice(0, 4).toUpperCase() })
            }
          />
          <EinstellungenGrid2>
            <EinstellungenEdField
              label="Straße"
              value={edit.strasse}
              onChange={(v) => setEdit({ ...edit, strasse: v })}
            />
            <EinstellungenEdField
              label="Hausnummer"
              value={edit.hausnummer}
              onChange={(v) => setEdit({ ...edit, hausnummer: v })}
            />
          </EinstellungenGrid2>
          <EinstellungenGrid2>
            <EinstellungenEdField
              label="PLZ"
              value={edit.plz}
              onChange={(v) => setEdit({ ...edit, plz: v })}
            />
            <EinstellungenEdField
              label="Ort"
              value={edit.ort}
              onChange={(v) => setEdit({ ...edit, ort: v })}
            />
          </EinstellungenGrid2>
        </EinstellungenEditModal>
      ) : null}
    </>
  );
}
