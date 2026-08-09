"use client";

import { useEffect, useState } from "react";

import {
  EinstellungenEditModal,
  EinstellungenEuroSlider,
  EinstellungenPfRow,
  EinstellungenSectionHeader,
  EinstellungenToggle,
} from "@/components/shared/PortalEinstellungenUi";
import type { OrganisationKunde } from "@/lib/org/types";
import {
  EINSTELLUNGEN_AKUT_INTRO,
  EINSTELLUNGEN_AKUT_TITLE,
  EINSTELLUNGEN_SCHWELLE_SLIDER_MAX,
  EINSTELLUNGEN_SCHWELLE_SLIDER_MIN,
  EINSTELLUNGEN_SCHWELLE_SLIDER_STEP,
  EINSTELLUNGEN_SCHWELLE_TITLE,
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
 * Freigabe-Regeln: Schwelle + Akut. Kein Kleinreparatur-Pfad.
 * Beim Speichern wird kleinreparatur_aktiv immer false gesetzt.
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
  const [akutDirekt, setAkutDirekt] = useState(kunde.notfall_direkt !== false);

  const [editOpen, setEditOpen] = useState(false);
  const [editSchwelle, setEditSchwelle] = useState(schwelle);
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
    setAkutDirekt(kunde.notfall_direkt !== false);
  }, [kunde.freigabe_schwelle_eur, kunde.notfall_direkt]);

  useEffect(() => {
    if (!isAdmin || migratedModus) return;
    if (kunde.freigabe_modus !== "direkt") return;
    setMigratedModus(true);
    void (async () => {
      try {
        const res = await fetch("/api/org/einstellungen", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            freigabe_modus: "freigabe",
            kleinreparatur_aktiv: false,
          }),
        });
        if (res.ok) onSaved();
      } catch {
        /* ignore */
      }
    })();
  }, [isAdmin, kunde.freigabe_modus, migratedModus, onSaved]);

  /** Einmalig: Legacy-Flag abschalten, falls noch true. */
  useEffect(() => {
    if (!isAdmin) return;
    if (kunde.kleinreparatur_aktiv !== true) return;
    void (async () => {
      try {
        await fetch("/api/org/einstellungen", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kleinreparatur_aktiv: false }),
        });
        onSaved();
      } catch {
        /* ignore */
      }
    })();
  }, [isAdmin, kunde.kleinreparatur_aktiv, onSaved]);

  function openEdit() {
    setEditSchwelle(schwelle);
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
          kleinreparatur_aktiv: false,
          notfall_direkt: editAkut,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Nicht gespeichert", json.error);
        return;
      }
      setSchwelle(editSchwelle);
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
      <div className="flex flex-col gap-[11px]">
        <EinstellungenPfRow
          label="Freigabeschwelle"
          value={formatEinstellungenSchwelle(schwelle)}
        />
        <EinstellungenPfRow
          label={EINSTELLUNGEN_AKUT_TITLE}
          value={akutDirekt ? "Ja" : "Nein"}
        />
      </div>

      <EinstellungenEditModal
        open={editOpen}
        title="Freigabe-Regeln"
        onClose={closeEdit}
        onSave={() => void saveEdit()}
        saving={saving}
      >
        <EinstellungenEuroSlider
          value={editSchwelle}
          min={EINSTELLUNGEN_SCHWELLE_SLIDER_MIN}
          max={EINSTELLUNGEN_SCHWELLE_SLIDER_MAX}
          step={EINSTELLUNGEN_SCHWELLE_SLIDER_STEP}
          formatValue={formatEinstellungenSchwelle}
          onChange={(v) => setEditSchwelle(snapEinstellungenSchwelle(v))}
        />
        <EinstellungenToggle
          checked={editAkut}
          onChange={setEditAkut}
          title={EINSTELLUNGEN_AKUT_TITLE}
          description={
            editAkut
              ? `${EINSTELLUNGEN_AKUT_INTRO} Aktiv: Sofortmaßnahmen ohne Ihre Freigabe, nur Info.`
              : "Aus: Auch Sofortmaßnahmen laufen über Angebot und Freigabe."
          }
        />
      </EinstellungenEditModal>
    </div>
  );
}
