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
  EINSTELLUNGEN_LOGO_HINT,
  EINSTELLUNGEN_LOGO_UPLOAD_OFFENER_PUNKT,
} from "@/lib/portal2/einstellungen";
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
}: Props) {
  const [draft, setDraft] = useState(() => draftFromKunde(kunde));
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(draftFromKunde(kunde));
  }, [kunde]);

  const activeBrand =
    findBrandPresetByPrimary(draft.primary)?.id ?? null;

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

  // Auto-save when draft changes after first paint from user edits only via scheduleSave

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
    <section className="card-bordered space-y-4 p-4 sm:p-5">
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
            {kunde.org_logo_url ? (
              <Image
                src={kunde.org_logo_url}
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
          <p className="text-[12.5px] leading-relaxed text-text-secondary">
            {EINSTELLUNGEN_LOGO_HINT}{" "}
            <b className="text-text-primary">„{draft.logo || "HV"}"</b> als
            Platzhalter.
            <span className="mt-1 block text-[11px] text-text-tertiary">
              {EINSTELLUNGEN_LOGO_UPLOAD_OFFENER_PUNKT}
            </span>
          </p>
        </div>
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
              className="grid h-8 w-8 place-items-center rounded-lg border border-white/30 bg-white/15 font-[family-name:var(--font-display)] text-[13px] font-bold"
            >
              {draft.logo || "HV"}
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
