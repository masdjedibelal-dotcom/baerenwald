"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EinstellungenEdField,
  EinstellungenEditModal,
  EinstellungenPfList,
  EinstellungenPfRow,
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

function dash(v: string) {
  return v.trim() || "—";
}

/**
 * HV-Einstellungen: Impressum-/Datenschutz-Links (Pflicht für Melde-Link, QR, Aushang).
 * Anzeige + Stift → Sheet/Slide-over.
 */
export function OrganisationMieterLegalLinksPanel({
  kunde,
  readOnly = false,
  onSaved,
}: Props) {
  const saved = useMemo(() => draftFromKunde(kunde), [kunde]);
  const [edit, setEdit] = useState<Draft | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEdit(null);
    setEditOpen(false);
    setError(null);
  }, [kunde]);

  const legalReady = orgMeldeLegalUrlsReady(kunde);

  const openEdit = useCallback(() => {
    if (readOnly) return;
    setEdit(draftFromKunde(kunde));
    setError(null);
    setEditOpen(true);
  }, [kunde, readOnly]);

  const closeEdit = useCallback(() => {
    if (saving) return;
    setEditOpen(false);
    setEdit(null);
    setError(null);
  }, [saving]);

  const persist = useCallback(async () => {
    if (readOnly || !edit) return;
    if (
      !isAbsoluteHttpUrl(edit.impressum) ||
      !isAbsoluteHttpUrl(edit.datenschutz)
    ) {
      setError(
        "Beide Links sind Pflicht — bitte vollständige https://-Adressen eingeben."
      );
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const impressum = new URL(edit.impressum.trim()).toString();
      const datenschutz = new URL(edit.datenschutz.trim()).toString();
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
      setEditOpen(false);
      setEdit(null);
      onSaved();
    } finally {
      setSaving(false);
    }
  }, [edit, onSaved, readOnly]);

  return (
    <div className="space-y-3">
      <EinstellungenSectionHeader
        title="Impressum & Datenschutz (Mieter)"
        onEdit={readOnly ? undefined : openEdit}
      />
      <EinstellungenPfList>
        <EinstellungenPfRow label="Impressum" value={dash(saved.impressum)} />
        <EinstellungenPfRow
          label="Datenschutz"
          value={dash(saved.datenschutz)}
        />
      </EinstellungenPfList>

      {!legalReady ? (
        <p className="text-[12.5px] leading-relaxed text-text-secondary">
          {ORG_MELDE_LEGAL_REQUIRED_HINT}
        </p>
      ) : null}

      {edit && editOpen ? (
        <EinstellungenEditModal
          open={editOpen}
          title="Impressum & Datenschutz bearbeiten"
          subtitle="Beide Links sind Pflicht für Melde-Link, QR und Aushang."
          onClose={closeEdit}
          onSave={() => void persist()}
          saving={saving}
        >
          <EinstellungenEdField
            label="Impressum-URL"
            value={edit.impressum}
            placeholder="https://ihre-verwaltung.de/impressum"
            onChange={(v) => {
              setEdit({ ...edit, impressum: v });
              setError(null);
            }}
          />
          <EinstellungenEdField
            label="Datenschutz-URL"
            value={edit.datenschutz}
            placeholder="https://ihre-verwaltung.de/datenschutz"
            onChange={(v) => {
              setEdit({ ...edit, datenschutz: v });
              setError(null);
            }}
          />
          {error ? (
            <p className="text-[12.5px] font-medium text-red-700">{error}</p>
          ) : null}
        </EinstellungenEditModal>
      ) : null}
    </div>
  );
}
