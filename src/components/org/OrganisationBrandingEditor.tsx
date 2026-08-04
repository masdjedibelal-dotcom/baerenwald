"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";

import type { OrganisationKunde } from "@/lib/org/types";
import {
  BRAND_PRESETS,
  findBrandPresetByPrimary,
  orgBrandFromKunde,
  type BrandPreset,
} from "@/lib/portal2/brand-presets";
import {
  EINSTELLUNGEN_BRANDING_FOOTER,
  EINSTELLUNGEN_BRANDING_INTRO,
  EINSTELLUNGEN_BRANDING_TITLE,
  EINSTELLUNGEN_HERO_HINT,
  EINSTELLUNGEN_LOGO_HINT,
} from "@/lib/portal2/einstellungen";
import { resolvePortalHeroSrc } from "@/lib/portal2/portal-media";
import {
  EinstellungenEdField,
  EinstellungenEditModal,
  EinstellungenGrid2,
  EinstellungenPfRow,
  EinstellungenSectionHeader,
} from "@/components/shared/PortalEinstellungenUi";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

type Props = {
  kunde: OrganisationKunde;
  readOnly?: boolean;
  onSaved: () => void;
  /** Ohne äußere Surface — z. B. in PortalEinstellungenShell. */
  nested?: boolean;
};

type Draft = {
  name: string;
  sub: string;
  logo: string;
  tel: string;
  mail: string;
  strasse: string;
  ort: string;
  primary: string;
  primaryDk: string;
  soft: string;
};

function draftFromKunde(kunde: OrganisationKunde): Draft {
  const b = orgBrandFromKunde(kunde);
  return {
    name: b.name,
    sub: b.sub,
    logo: b.logo,
    tel: b.tel,
    mail: b.mail,
    strasse: b.strasse,
    ort: b.ort,
    primary: b.primary,
    primaryDk: b.primaryDk,
    soft: b.soft,
  };
}

function dash(v: string) {
  return v.trim() || "—";
}

/**
 * Branding & White-Label: Anzeige + Stift → Modal.
 * Logo/Hero-Upload bleiben explizite Aktionen auf der Seite.
 */
export function OrganisationBrandingEditor({
  kunde,
  readOnly = false,
  onSaved,
  nested = false,
}: Props) {
  const [saved, setSaved] = useState(() => draftFromKunde(kunde));
  const [edit, setEdit] = useState<Draft | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [heroBusy, setHeroBusy] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSaved(draftFromKunde(kunde));
    setLogoPreview(null);
    setHeroPreview(null);
  }, [kunde]);

  const activeBrand = findBrandPresetByPrimary(saved.primary)?.id ?? null;
  const logoSrc = logoPreview || kunde.org_logo_url;
  const heroSrc = resolvePortalHeroSrc(heroPreview || kunde.org_hero_url);

  const persist = useCallback(
    async (next: Draft) => {
      if (readOnly) return false;
      setSaving(true);
      try {
        const res = await fetch("/api/org/branding", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            org_anzeigename: next.name,
            org_sub: next.sub,
            org_logo_kuerzel: next.logo,
            org_primary_color: next.primary,
            org_primary_color_dk: next.primaryDk,
            org_primary_color_soft: next.soft,
            org_telefon: next.tel,
            org_strasse: next.strasse,
            org_ort: next.ort,
            mieter_kontakt_email: next.mail,
            mieter_kontakt_telefon: next.tel,
          }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          portalToastError("Branding nicht gespeichert", json.error);
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

  const uploadMedia = async (kind: "logo" | "hero", file: File) => {
    if (readOnly) return;
    if (!file.type.startsWith("image/")) {
      portalToastError("Nur Bilder erlaubt");
      return;
    }
    const setBusy = kind === "logo" ? setLogoBusy : setHeroBusy;
    const setPreview = kind === "logo" ? setLogoPreview : setHeroPreview;
    setBusy(true);
    try {
      setPreview(URL.createObjectURL(file));
      const fd = new FormData();
      fd.set("kind", kind);
      fd.set("file", file);
      const res = await fetch("/api/org/branding/media", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { error?: string; url?: string };
      if (!res.ok || !json.url) {
        setPreview(null);
        portalToastError(
          kind === "logo" ? "Logo nicht gespeichert" : "Hero nicht gespeichert",
          json.error
        );
        return;
      }
      setPreview(json.url);
      orgPortalToast.saved();
      onSaved();
    } catch {
      setPreview(null);
      portalToastError("Upload fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  const applyPreset = (p: BrandPreset) => {
    if (!edit) return;
    setEdit({
      ...edit,
      primary: p.primary,
      primaryDk: p.primaryDk,
      soft: p.soft,
    });
  };

  return (
    <section className={nested ? "space-y-4" : "portal-surface space-y-4 p-4 sm:p-5"}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
            {EINSTELLUNGEN_BRANDING_TITLE}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
            {EINSTELLUNGEN_BRANDING_INTRO}
          </p>
        </div>
        {!readOnly ? (
          <button
            type="button"
            onClick={openEdit}
            aria-label="Branding bearbeiten"
            title="Bearbeiten"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-default bg-white text-text-secondary hover:border-accent/40 hover:text-accent"
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      <div>
        <EinstellungenSectionHeader title="LOGO" />
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
                    if (f) void uploadMedia("logo", f);
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

      <div>
        <EinstellungenSectionHeader title="ÜBERSICHTS-BILD (HERO)" />
        <div className="overflow-hidden rounded-xl border border-border-default">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroSrc}
            alt=""
            className="h-[88px] w-full object-cover sm:h-[110px]"
          />
        </div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-text-secondary">
          {EINSTELLUNGEN_HERO_HINT}
        </p>
        {!readOnly ? (
          <>
            <input
              ref={heroInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void uploadMedia("hero", f);
              }}
            />
            <button
              type="button"
              disabled={heroBusy}
              onClick={() => heroInputRef.current?.click()}
              className="mt-2 rounded-lg border border-border-default bg-white px-3 py-1.5 text-[12.5px] font-semibold text-text-primary disabled:opacity-50"
            >
              {heroBusy
                ? "Wird hochgeladen…"
                : kunde.org_hero_url || heroPreview
                  ? "Übersichtsbild ersetzen"
                  : "Übersichtsbild hochladen"}
            </button>
          </>
        ) : null}
      </div>

      <div>
        <EinstellungenSectionHeader title="AKZENTFARBE" />
        <div className="flex flex-wrap gap-2.5">
          {BRAND_PRESETS.map((p) => {
            const on = activeBrand === p.id;
            return (
              <div key={p.id} className="flex flex-col items-center gap-1.5">
                <span
                  className="h-[38px] w-[38px] rounded-full"
                  style={{
                    background: p.primary,
                    boxShadow: on
                      ? `0 0 0 3px #fff, 0 0 0 5px ${p.primary}`
                      : "inset 0 0 0 1px rgba(0,0,0,.08)",
                  }}
                  title={p.name}
                />
                <span
                  className={cn(
                    "text-[10.5px]",
                    on
                      ? "font-bold text-text-primary"
                      : "font-semibold text-text-tertiary"
                  )}
                >
                  {p.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <EinstellungenSectionHeader
          title="ANGABEN FÜRS PORTAL"
          onEdit={readOnly ? undefined : openEdit}
        />
        <div className="flex flex-col gap-[11px]">
          <EinstellungenPfRow label="Firmenname" value={dash(saved.name)} />
          <EinstellungenGrid2>
            <EinstellungenPfRow label="Zusatz / Rolle" value={dash(saved.sub)} />
            <EinstellungenPfRow
              label="Namenskürzel"
              value={dash(saved.logo)}
            />
          </EinstellungenGrid2>
          <EinstellungenGrid2>
            <EinstellungenPfRow label="Telefon" value={dash(saved.tel)} />
            <EinstellungenPfRow label="Service-E-Mail" value={dash(saved.mail)} />
          </EinstellungenGrid2>
          <EinstellungenGrid2>
            <EinstellungenPfRow label="Straße" value={dash(saved.strasse)} />
            <EinstellungenPfRow label="PLZ / Ort" value={dash(saved.ort)} />
          </EinstellungenGrid2>
        </div>
      </div>

      <div>
        <EinstellungenSectionHeader title="VORSCHAU" />
        <div className="overflow-hidden rounded-xl border border-border-default">
          <div
            className="flex items-center gap-2.5 px-[15px] py-3 text-white"
            style={{ background: saved.primaryDk }}
          >
            <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-lg border border-white/30 bg-white/15 font-[family-name:var(--font-display)] text-[13px] font-bold">
              {logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoSrc} alt="" className="h-full w-full object-cover" />
              ) : (
                saved.logo || "HV"
              )}
            </div>
            <div>
              <p className="font-[family-name:var(--font-display)] text-sm font-bold">
                {saved.name || "Firmenname"}
              </p>
              <p className="text-[10.5px] uppercase tracking-wide opacity-80">
                {saved.sub || "Verwaltung"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-white px-[15px] py-3">
            <span
              className="rounded-lg px-3.5 py-2 text-[12.5px] font-bold text-white"
              style={{ background: saved.primary }}
            >
              Anliegen melden
            </span>
            <span
              className="rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: saved.soft, color: saved.primaryDk }}
            >
              In Bearbeitung
            </span>
          </div>
        </div>
      </div>

      <p className="text-[11.5px] leading-relaxed text-text-tertiary">
        {EINSTELLUNGEN_BRANDING_FOOTER}
      </p>

      {edit ? (
        <EinstellungenEditModal
          open={editOpen}
          title="Branding bearbeiten"
          subtitle="Farbe und Angaben — Speichern oder Abbrechen."
          onClose={closeEdit}
          onSave={() => void saveEdit()}
          saving={saving}
          saveDisabled={edit.name.trim().length < 2}
        >
          <p className="text-[11.5px] font-bold text-text-tertiary">AKZENTFARBE</p>
          <div className="flex flex-wrap gap-2.5">
            {BRAND_PRESETS.map((p) => {
              const on =
                findBrandPresetByPrimary(edit.primary)?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  title={p.name}
                  onClick={() => applyPreset(p)}
                  className="flex flex-col items-center gap-1.5 bg-transparent p-0"
                >
                  <span
                    className="h-[38px] w-[38px] rounded-full"
                    style={{
                      background: p.primary,
                      boxShadow: on
                        ? `0 0 0 3px #fff, 0 0 0 5px ${p.primary}`
                        : "inset 0 0 0 1px rgba(0,0,0,.08)",
                    }}
                  />
                  <span
                    className={cn(
                      "text-[10.5px]",
                      on
                        ? "font-bold text-text-primary"
                        : "font-semibold text-text-tertiary"
                    )}
                  >
                    {p.name}
                  </span>
                </button>
              );
            })}
          </div>
          <EinstellungenEdField
            label="Firmenname"
            value={edit.name}
            onChange={(v) => setEdit({ ...edit, name: v })}
          />
          <EinstellungenGrid2>
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
          </EinstellungenGrid2>
          <EinstellungenGrid2>
            <EinstellungenEdField
              label="Telefon"
              value={edit.tel}
              onChange={(v) => setEdit({ ...edit, tel: v })}
            />
            <EinstellungenEdField
              label="Service-E-Mail"
              value={edit.mail}
              onChange={(v) => setEdit({ ...edit, mail: v })}
            />
          </EinstellungenGrid2>
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
    </section>
  );
}
