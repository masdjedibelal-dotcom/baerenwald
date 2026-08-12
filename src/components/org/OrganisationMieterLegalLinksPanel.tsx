"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EinstellungenEdField,
  EinstellungenSectionHeader,
} from "@/components/shared/PortalEinstellungenUi";
import {
  isAbsoluteHttpUrl,
  orgMeldeLegalUrlsReady,
  ORG_MELDE_LEGAL_REQUIRED_HINT,
} from "@/lib/org/melde-legal-urls";
import type { OrganisationKunde } from "@/lib/org/types";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";

type Props = {
  kunde: OrganisationKunde;
  readOnly?: boolean;
  onSaved: () => void;
};

type Draft = {
  impressum: string;
  datenschutz: string;
};

function draftFromKunde(kunde: OrganisationKunde): Draft {
  return {
    impressum: kunde.impressum_url?.trim() ?? "",
    datenschutz: kunde.datenschutz_url?.trim() ?? "",
  };
}

/**
 * HV-Einstellungen: Impressum-/Datenschutz-Links (Pflicht für Melde-Link, QR, Aushang).
 * Explizites Speichern — kein Autosave.
 */
export function OrganisationMieterLegalLinksPanel({
  kunde,
  readOnly = false,
  onSaved,
}: Props) {
  const [draft, setDraft] = useState(() => draftFromKunde(kunde));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(draftFromKunde(kunde));
    setError(null);
  }, [kunde]);

  const saved = useMemo(() => draftFromKunde(kunde), [kunde]);
  const dirty =
    draft.impressum.trim() !== saved.impressum ||
    draft.datenschutz.trim() !== saved.datenschutz;

  const bothValid =
    isAbsoluteHttpUrl(draft.impressum) && isAbsoluteHttpUrl(draft.datenschutz);

  const legalReady = orgMeldeLegalUrlsReady(kunde);

  const persist = useCallback(async () => {
    if (readOnly) return;
    if (!bothValid) {
      setError(
        "Beide Links sind Pflicht — bitte vollständige https://-Adressen eingeben."
      );
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const impressum = new URL(draft.impressum.trim()).toString();
      const datenschutz = new URL(draft.datenschutz.trim()).toString();
      const res = await fetch("/api/org/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          impressum_url: impressum,
          datenschutz_url: datenschutz,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Links nicht gespeichert", json.error);
        return;
      }
      orgPortalToast.saved();
      onSaved();
    } finally {
      setSaving(false);
    }
  }, [bothValid, draft.datenschutz, draft.impressum, onSaved, readOnly]);

  return (
    <div className="space-y-3">
      <EinstellungenSectionHeader title="Impressum & Datenschutz (Mieter)" />
      <div className="flex flex-col gap-3">
        <EinstellungenEdField
          label="Impressum-URL"
          value={draft.impressum}
          disabled={readOnly}
          placeholder="https://ihre-verwaltung.de/impressum"
          onChange={(v) => {
            setDraft((d) => ({ ...d, impressum: v }));
            setError(null);
          }}
        />
        <EinstellungenEdField
          label="Datenschutz-URL"
          value={draft.datenschutz}
          disabled={readOnly}
          placeholder="https://ihre-verwaltung.de/datenschutz"
          onChange={(v) => {
            setDraft((d) => ({ ...d, datenschutz: v }));
            setError(null);
          }}
        />

        {!legalReady ? (
          <p className="text-[12.5px] leading-relaxed text-text-secondary">
            {ORG_MELDE_LEGAL_REQUIRED_HINT}
          </p>
        ) : null}

        {error ? (
          <p className="text-[12.5px] font-medium text-red-700">{error}</p>
        ) : null}

        {!readOnly ? (
          <button
            type="button"
            disabled={saving || !dirty || !bothValid}
            onClick={() => void persist()}
            className="btn-pill-primary self-start !py-2 disabled:opacity-50"
          >
            {saving ? "Speichern…" : "Links speichern"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
