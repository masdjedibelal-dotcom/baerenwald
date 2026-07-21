"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

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
  EinstellungenGrid2,
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

/**
 * Mock Branding & White-Label inkl. Presets, Stammdaten und Live-Vorschau.
 */
export function OrganisationBrandingEditor({
  kunde,
  readOnly = false,
  onSaved,
  nested = false,
}: Props) {
  const [draft, setDraft] = useState(() => draftFromKunde(kunde));
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [heroBusy, setHeroBusy] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(draftFromKunde(kunde));
    setLogoPreview(null);
    setHeroPreview(null);
  }, [kunde]);

  const activeBrand =
    findBrandPresetByPrimary(draft.primary)?.id ?? null;

  const logoSrc = logoPreview || kunde.org_logo_url;
  const heroSrc = resolvePortalHeroSrc(heroPreview || kunde.org_hero_url);

  const persist = useCallback(
    async (next: Draft) => {
      if (readOnly) return;
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
          return;
        }
        orgPortalToast.saved();
        onSaved();
      } finally {
        setSaving(false);
      }
    },
    [onSaved, readOnly]
  );

  const scheduleSave = useCallback(
    (next: Draft) => {
      setDraft(next);
      if (readOnly) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void persist(next);
      }, 650);
    },
    [persist, readOnly]
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

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
    const next = {
      ...draft,
      primary: p.primary,
      primaryDk: p.primaryDk,
      soft: p.soft,
    };
    scheduleSave(next);
  };

  const set = (key: keyof Draft, val: string) => {
    scheduleSave({ ...draft, [key]: val });
  };

  return (
    <section
      className={
        nested
          ? "space-y-4"
          : "portal-surface space-y-4 p-4 sm:p-5"
      }
    >
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
          {EINSTELLUNGEN_BRANDING_TITLE}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
          {EINSTELLUNGEN_BRANDING_INTRO}
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-[11.5px] font-bold text-text-tertiary">
          LOGO
        </p>
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
                {draft.logo || "HV"}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] leading-relaxed text-text-secondary">
              {EINSTELLUNGEN_LOGO_HINT}{" "}
              <b className="text-text-primary">„{draft.logo || "HV"}“</b> als
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
        <p className="mb-1.5 text-[11.5px] font-bold text-text-tertiary">
          ÜBERSICHTS-BILD (HERO)
        </p>
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
        <p className="mb-1.5 text-[11.5px] font-bold text-text-tertiary">
          AKZENTFARBE
        </p>
        <div className="flex flex-wrap gap-2.5">
          {BRAND_PRESETS.map((p) => {
            const on = activeBrand === p.id;
            return (
              <button
                key={p.id}
                type="button"
                title={p.name}
                disabled={readOnly}
                onClick={() => applyPreset(p)}
                className="flex flex-col items-center gap-1.5 bg-transparent p-0 disabled:opacity-50"
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
      </div>

      <div>
        <p className="mb-2 text-[11.5px] font-bold text-text-tertiary">
          ANGABEN FÜRS PORTAL
        </p>
        <div className="flex flex-col gap-[11px]">
          <EinstellungenEdField
            label="Firmenname"
            value={draft.name}
            disabled={readOnly}
            onChange={(v) => set("name", v)}
          />
          <EinstellungenGrid2>
            <EinstellungenEdField
              label="Zusatz / Rolle"
              value={draft.sub}
              disabled={readOnly}
              onChange={(v) => set("sub", v)}
            />
            <EinstellungenEdField
              label="Namenskürzel (Logo-Fallback)"
              value={draft.logo}
              disabled={readOnly}
              onChange={(v) => set("logo", v.slice(0, 4).toUpperCase())}
            />
          </EinstellungenGrid2>
          <EinstellungenGrid2>
            <EinstellungenEdField
              label="Telefon"
              value={draft.tel}
              disabled={readOnly}
              onChange={(v) => set("tel", v)}
            />
            <EinstellungenEdField
              label="Service-E-Mail"
              value={draft.mail}
              disabled={readOnly}
              onChange={(v) => set("mail", v)}
            />
          </EinstellungenGrid2>
          <EinstellungenGrid2>
            <EinstellungenEdField
              label="Straße"
              value={draft.strasse}
              disabled={readOnly}
              onChange={(v) => set("strasse", v)}
            />
            <EinstellungenEdField
              label="PLZ / Ort"
              value={draft.ort}
              disabled={readOnly}
              onChange={(v) => set("ort", v)}
            />
          </EinstellungenGrid2>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[11.5px] font-bold text-text-tertiary">
          VORSCHAU
        </p>
        <div className="overflow-hidden rounded-xl border border-border-default">
          <div
            className="flex items-center gap-2.5 px-[15px] py-3 text-white"
            style={{ background: draft.primaryDk }}
          >
            <div
              className="grid h-8 w-8 place-items-center overflow-hidden rounded-lg border border-white/30 bg-white/15 font-[family-name:var(--font-display)] text-[13px] font-bold"
            >
              {logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoSrc} alt="" className="h-full w-full object-cover" />
              ) : (
                draft.logo || "HV"
              )}
            </div>
            <div>
              <p className="font-[family-name:var(--font-display)] text-sm font-bold">
                {draft.name || "Firmenname"}
              </p>
              <p className="text-[10.5px] uppercase tracking-wide opacity-80">
                {draft.sub || "Hausverwaltung"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-white px-[15px] py-3">
            <span
              className="rounded-lg px-3.5 py-2 text-[12.5px] font-bold text-white"
              style={{ background: draft.primary }}
            >
              Anliegen melden
            </span>
            <span
              className="rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: draft.soft, color: draft.primaryDk }}
            >
              In Bearbeitung
            </span>
          </div>
        </div>
      </div>

      <p className="text-[11.5px] leading-relaxed text-text-tertiary">
        {EINSTELLUNGEN_BRANDING_FOOTER}
        {saving ? " · Speichern…" : ""}
      </p>
    </section>
  );
}
