"use client";

import { useEffect, useState } from "react";

import {
  EinstellungenEditModal,
  EinstellungenEuroSlider,
  EinstellungenInfoBox,
  EinstellungenPfRow,
  EinstellungenSectionHeader,
  EinstellungenToggle,
} from "@/components/shared/PortalEinstellungenUi";
import type { OrganisationKunde } from "@/lib/org/types";
import {
  EINSTELLUNGEN_AKUT_INTRO,
  EINSTELLUNGEN_AKUT_TITLE,
  EINSTELLUNGEN_KLEINREPARATUR_TITLE,
  EINSTELLUNGEN_SCHWELLE_INTRO,
  EINSTELLUNGEN_SCHWELLE_SLIDER_MAX,
  EINSTELLUNGEN_SCHWELLE_SLIDER_MIN,
  EINSTELLUNGEN_SCHWELLE_SLIDER_STEP,
  EINSTELLUNGEN_SCHWELLE_TITLE,
  einstellungenSchwelleInfo,
  formatEinstellungenSchwelle,
  snapEinstellungenSchwelle,
} from "@/lib/portal2/einstellungen";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";

type Props = {
  kunde: OrganisationKunde;
  onSaved: () => void;
  isAdmin?: boolean;
};

/**
 * Freigabe-Regeln: flach wie Partner-Firmendaten (SectionHeader + Stift → Modal).
 */
export function OrganisationFreigabeRegelnPanel({
  kunde,
  onSaved,
  isAdmin = true,
}: Props) {
  const [schwelle, setSchwelle] = useState(() =>
    snapEinstellungenSchwelle(
      kunde.freigabe_schwelle_eur != null
        ? Number(kunde.freigabe_schwelle_eur)
        : 500
    )
  );
  const [kleinAktiv, setKleinAktiv] = useState(
    kunde.kleinreparatur_aktiv === true
  );
  const [akutDirekt, setAkutDirekt] = useState(kunde.notfall_direkt !== false);

  const [editOpen, setEditOpen] = useState(false);
  const [editSchwelle, setEditSchwelle] = useState(schwelle);
  const [editKlein, setEditKlein] = useState(kleinAktiv);
  const [editAkut, setEditAkut] = useState(akutDirekt);
  const [saving, setSaving] = useState(false);
  const [migratedModus, setMigratedModus] = useState(false);

  useEffect(() => {
    setSchwelle(
      snapEinstellungenSchwelle(
        kunde.freigabe_schwelle_eur != null
          ? Number(kunde.freigabe_schwelle_eur)
          : 500
      )
    );
    setKleinAktiv(kunde.kleinreparatur_aktiv === true);
    setAkutDirekt(kunde.notfall_direkt !== false);
  }, [
    kunde.freigabe_schwelle_eur,
    kunde.kleinreparatur_aktiv,
    kunde.notfall_direkt,
  ]);

  useEffect(() => {
    if (!isAdmin || migratedModus) return;
    if (kunde.freigabe_modus !== "direkt") return;
    setMigratedModus(true);
    void (async () => {
      try {
        const res = await fetch("/api/org/einstellungen", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ freigabe_modus: "freigabe" }),
        });
        if (res.ok) onSaved();
      } catch {
        /* ignore */
      }
    })();
  }, [isAdmin, kunde.freigabe_modus, migratedModus, onSaved]);

  function openEdit() {
    setEditSchwelle(schwelle);
    setEditKlein(kleinAktiv);
    setEditAkut(akutDirekt);
    setEditOpen(true);
  }

  function closeEdit() {
    if (saving) return;
    setEditOpen(false);
  }

  async function saveEdit() {
    if (!isAdmin) return;
    setSaving(true);
    try {
      const res = await fetch("/api/org/einstellungen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freigabe_modus: "freigabe",
          freigabe_schwelle_eur: editSchwelle,
          kleinreparatur_aktiv: editKlein,
          ...(editKlein ? { kleinreparatur_schwelle_eur: editSchwelle } : {}),
          notfall_direkt: editAkut,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Nicht gespeichert", json.error);
        return;
      }
      setSchwelle(editSchwelle);
      setKleinAktiv(editKlein);
      setAkutDirekt(editAkut);
      setEditOpen(false);
      orgPortalToast.einstellungenGespeichert();
      onSaved();
    } catch {
      portalToastError("Nicht gespeichert");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {!isAdmin ? (
        <p
          className="text-[13px] leading-[1.55]"
          style={{ color: PORTAL_VAR.sub }}
        >
          Nur Administratoren können Freigabe-Regeln und Schwellen ändern.
        </p>
      ) : null}

      <EinstellungenSectionHeader
        title={EINSTELLUNGEN_SCHWELLE_TITLE}
        onEdit={isAdmin ? openEdit : undefined}
      />
      <p className="text-[13px] leading-[1.55]" style={{ color: PORTAL_VAR.sub }}>
        {EINSTELLUNGEN_SCHWELLE_INTRO}
      </p>
      <div className="flex flex-col gap-[11px]">
        <EinstellungenPfRow
          label="Freigabeschwelle"
          value={formatEinstellungenSchwelle(schwelle)}
        />
        <EinstellungenInfoBox>
          {einstellungenSchwelleInfo(schwelle)}
        </EinstellungenInfoBox>
        <EinstellungenPfRow
          label={EINSTELLUNGEN_KLEINREPARATUR_TITLE}
          value={
            kleinAktiv
              ? `Aktiv bis ${formatEinstellungenSchwelle(schwelle)}`
              : "Deaktiviert"
          }
        />
        <EinstellungenPfRow
          label={EINSTELLUNGEN_AKUT_TITLE}
          value={
            akutDirekt
              ? "Ja — akute Schäden sofort beauftragen"
              : "Nein — auch akute Schäden brauchen Freigabe"
          }
        />
      </div>

      <EinstellungenEditModal
        open={editOpen}
        title="Freigabe-Regeln"
        subtitle="Änderungen erst nach Speichern übernehmen."
        onClose={closeEdit}
        onSave={() => void saveEdit()}
        saving={saving}
      >
        <p className="text-[13px] leading-[1.55]" style={{ color: PORTAL_VAR.sub }}>
          {EINSTELLUNGEN_SCHWELLE_INTRO}
        </p>
        <EinstellungenEuroSlider
          value={editSchwelle}
          min={EINSTELLUNGEN_SCHWELLE_SLIDER_MIN}
          max={EINSTELLUNGEN_SCHWELLE_SLIDER_MAX}
          step={EINSTELLUNGEN_SCHWELLE_SLIDER_STEP}
          formatValue={formatEinstellungenSchwelle}
          onChange={(v) => setEditSchwelle(snapEinstellungenSchwelle(v))}
        />
        <EinstellungenInfoBox>
          {einstellungenSchwelleInfo(editSchwelle)}
        </EinstellungenInfoBox>
        <EinstellungenToggle
          checked={editKlein}
          onChange={setEditKlein}
          title={EINSTELLUNGEN_KLEINREPARATUR_TITLE}
          description={
            editKlein
              ? `Aktiv bis ${formatEinstellungenSchwelle(editSchwelle)} — ohne Angebot sofort reparieren.`
              : "Deaktiviert — jede Reparatur braucht ein Angebot."
          }
        />
        <p className="text-[13px] leading-[1.55]" style={{ color: PORTAL_VAR.sub }}>
          {EINSTELLUNGEN_AKUT_INTRO}
        </p>
        <EinstellungenToggle
          checked={editAkut}
          onChange={setEditAkut}
          title={EINSTELLUNGEN_AKUT_TITLE}
          description={
            editAkut
              ? "Ja — bei akuten Schäden darf sofort beauftragt werden."
              : "Nein — auch akute Schäden brauchen Ihre Freigabe, bevor an Bärenwald weitergeleitet wird."
          }
        />
      </EinstellungenEditModal>
    </div>
  );
}
