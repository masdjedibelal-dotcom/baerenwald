"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";

import type { OrganisationKunde } from "@/lib/org/types";
import { orgBrandFromKunde } from "@/lib/portal2/brand-presets";
import { EINSTELLUNGEN_LOGO_HINT } from "@/lib/portal2/einstellungen";
import {
  EinstellungenEdField,
  EinstellungenEditModal,
  EinstellungenGrid2,
  EinstellungenPfRow,
  EinstellungenSectionHeader,
} from "@/components/shared/PortalEinstellungenUi";
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
  ort: string;
};

function draftFromKunde(kunde: OrganisationKunde): Draft {
  const b = orgBrandFromKunde(kunde);
  return {
    sub: b.sub,
    logo: b.logo,
    strasse: b.strasse,
    ort: b.ort,
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
  const [logoBusy, setLogoBusy] = useState(false);
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
    if (readOnly) return;
    if (!file.type.startsWith("image/")) {
      portalToastError("Nur Bilder erlaubt");
      return;
    }
    setLogoBusy(true);
    try {
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
    } catch {
      setLogoPreview(null);
      portalToastError("Upload fehlgeschlagen");
    } finally {
      setLogoBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <EinstellungenSectionHeader title="Logo" />
        <div className="flex items-center gap-3.5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-default bg-muted">
            {logoSrc ? (
              <Image
                src={logoSrc}
                alt=""
                width={64}
                height={64}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span className="font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
                {saved.logo || "HV"}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] leading-relaxed text-text-secondary">
              {EINSTELLUNGEN_LOGO_HINT}{" "}
              <b className="text-text-primary">„{saved.logo || "HV"}“</b> als
              Platzhalter.
            </p>
            {!readOnly ? (
              <>
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
                <button
                  type="button"
                  disabled={logoBusy}
                  onClick={() => logoInputRef.current?.click()}
                  className="mt-2 rounded-lg border border-border-default bg-white px-3 py-1.5 text-[12.5px] font-semibold text-text-primary disabled:opacity-50"
                >
                  {logoBusy
                    ? "Wird hochgeladen…"
                    : logoSrc
                      ? "Logo ersetzen"
                      : "Logo hochladen"}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <EinstellungenSectionHeader title="Angaben fürs Portal" />
          {!readOnly ? (
            <button
              type="button"
              onClick={openEdit}
              aria-label="Portal-Angaben bearbeiten"
              title="Bearbeiten"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-default bg-white text-text-secondary hover:border-accent/40 hover:text-accent"
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
        <div className="flex flex-col gap-[11px]">
          <EinstellungenPfRow label="Zusatz / Rolle" value={dash(saved.sub)} />
          <EinstellungenPfRow
            label="Namenskürzel"
            value={dash(saved.logo)}
          />
          <EinstellungenGrid2>
            <EinstellungenPfRow label="Straße" value={dash(saved.strasse)} />
            <EinstellungenPfRow label="PLZ / Ort" value={dash(saved.ort)} />
          </EinstellungenGrid2>
        </div>
      </div>

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
              label="PLZ / Ort"
              value={edit.ort}
              onChange={(v) => setEdit({ ...edit, ort: v })}
            />
          </EinstellungenGrid2>
        </EinstellungenEditModal>
      ) : null}
    </div>
  );
}
