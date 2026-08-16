"use client";

import { useEffect, useState } from "react";

import {
  EinstellungenEditModal,
  EinstellungenEuroSlider,
  EinstellungenPfList,
  EinstellungenPfRow,
  EinstellungenSectionHeader,
  EinstellungenSheetCard,
  EinstellungenToggle,
} from "@/components/shared/PortalEinstellungenUi";
import { SofortmassnahmeAkutTitleWithFaelle } from "@/components/org/SofortmassnahmeFaelleLink";
import type { OrganisationKunde } from "@/lib/org/types";
import {
  EINSTELLUNGEN_AKUT_INTRO,
  EINSTELLUNGEN_SCHWELLE_BETRAG_INTRO,
  EINSTELLUNGEN_SCHWELLE_BETRAG_TITLE,
  EINSTELLUNGEN_SCHWELLE_SLIDER_MAX,
  EINSTELLUNGEN_SCHWELLE_SLIDER_MIN,
  EINSTELLUNGEN_SCHWELLE_SLIDER_STEP,
  EINSTELLUNGEN_SCHWELLE_TITLE,
  EINSTELLUNGEN_UNTER_SCHWELLE_INTRO,
  EINSTELLUNGEN_UNTER_SCHWELLE_TITLE,
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

function schwelleAktivFromKunde(
  schwelleEur: number | null | undefined
): boolean {
  return schwelleEur != null && Number(schwelleEur) > 0;
}

/**
 * Freigabe-Regeln: Sofortmaßnahme → unter Schwelle → optional Betrag.
 */
export function OrganisationFreigabeRegelnPanel({
  kunde,
  onSaved,
  isAdmin = true,
}: Props) {
  const [schwelle, setSchwelle] = useState(() =>
    snapEinstellungenSchwelle(
      kunde.freigabe_schwelle_eur != null &&
        Number(kunde.freigabe_schwelle_eur) > 0
        ? Number(kunde.freigabe_schwelle_eur)
        : 500
    )
  );
  const [schwelleAktiv, setSchwelleAktiv] = useState(() =>
    schwelleAktivFromKunde(kunde.freigabe_schwelle_eur)
  );
  const [akutDirekt, setAkutDirekt] = useState(kunde.notfall_direkt !== false);
  const [hmAuto, setHmAuto] = useState(Boolean(kunde.hm_auto_zuweisen));

  const [editOpen, setEditOpen] = useState(false);
  const [editSchwelle, setEditSchwelle] = useState(schwelle);
  const [editSchwelleAktiv, setEditSchwelleAktiv] = useState(schwelleAktiv);
  const [editAkut, setEditAkut] = useState(akutDirekt);
  const [editHmAuto, setEditHmAuto] = useState(hmAuto);
  const [saving, setSaving] = useState(false);
  const [migratedModus, setMigratedModus] = useState(false);

  useEffect(() => {
    const aktiv = schwelleAktivFromKunde(kunde.freigabe_schwelle_eur);
    setSchwelleAktiv(aktiv);
    setSchwelle(
      snapEinstellungenSchwelle(
        aktiv && kunde.freigabe_schwelle_eur != null
          ? Number(kunde.freigabe_schwelle_eur)
          : 500
      )
    );
    setAkutDirekt(kunde.notfall_direkt !== false);
    setHmAuto(Boolean(kunde.hm_auto_zuweisen));
  }, [kunde.freigabe_schwelle_eur, kunde.notfall_direkt, kunde.hm_auto_zuweisen]);

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
    setEditSchwelleAktiv(schwelleAktiv);
    setEditAkut(akutDirekt);
    setEditHmAuto(hmAuto);
    setEditOpen(true);
  }

  function closeEdit() {
    if (saving) return;
    setEditOpen(false);
  }

  function onToggleUnterSchwelle(next: boolean) {
    setEditSchwelleAktiv(next);
    if (next && editSchwelle <= 0) {
      setEditSchwelle(500);
    }
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
          freigabe_schwelle_eur: editSchwelleAktiv
            ? snapEinstellungenSchwelle(Math.max(editSchwelle, 500))
            : null,
          kleinreparatur_aktiv: false,
          notfall_direkt: editAkut,
          hm_auto_zuweisen: editHmAuto,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Nicht gespeichert", json.error);
        return;
      }
      const nextSchwelle = editSchwelleAktiv
        ? snapEinstellungenSchwelle(Math.max(editSchwelle, 500))
        : schwelle;
      setSchwelle(nextSchwelle);
      setSchwelleAktiv(editSchwelleAktiv);
      setAkutDirekt(editAkut);
      setHmAuto(editHmAuto);
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
      <EinstellungenPfList>
        <EinstellungenPfRow
          label={<SofortmassnahmeAkutTitleWithFaelle />}
          value={akutDirekt ? "Ja" : "Nein"}
        />
        <EinstellungenPfRow
          label={EINSTELLUNGEN_UNTER_SCHWELLE_TITLE}
          value={schwelleAktiv ? "Ja" : "Nein"}
        />
        {schwelleAktiv ? (
          <EinstellungenPfRow
            label={EINSTELLUNGEN_SCHWELLE_BETRAG_TITLE}
            value={formatEinstellungenSchwelle(schwelle)}
          />
        ) : null}
        <EinstellungenPfRow
          label="Automatisch an Hausmeister"
          value={hmAuto ? "Ja" : "Nein"}
        />
      </EinstellungenPfList>

      <EinstellungenEditModal
        open={editOpen}
        title={EINSTELLUNGEN_SCHWELLE_TITLE}
        onClose={closeEdit}
        onSave={() => void saveEdit()}
        saving={saving}
      >
        <EinstellungenToggle
          checked={editAkut}
          onChange={setEditAkut}
          title={<SofortmassnahmeAkutTitleWithFaelle />}
          description={
            editAkut
              ? `${EINSTELLUNGEN_AKUT_INTRO} Aktiv: Sofortmaßnahmen ohne Ihre Freigabe, nur Info.`
              : "Aus: Auch Sofortmaßnahmen laufen über Angebot und Freigabe."
          }
        />
        <EinstellungenToggle
          checked={editSchwelleAktiv}
          onChange={onToggleUnterSchwelle}
          title={EINSTELLUNGEN_UNTER_SCHWELLE_TITLE}
          description={
            editSchwelleAktiv
              ? EINSTELLUNGEN_UNTER_SCHWELLE_INTRO
              : "Aus: Jedes Angebot braucht Ihre Freigabe, unabhängig vom Betrag."
          }
        />
        {editSchwelleAktiv ? (
          <EinstellungenSheetCard
            title={EINSTELLUNGEN_SCHWELLE_BETRAG_TITLE}
            description={EINSTELLUNGEN_SCHWELLE_BETRAG_INTRO}
          >
            <EinstellungenEuroSlider
              value={editSchwelle}
              min={Math.max(EINSTELLUNGEN_SCHWELLE_SLIDER_MIN, 500)}
              max={EINSTELLUNGEN_SCHWELLE_SLIDER_MAX}
              step={EINSTELLUNGEN_SCHWELLE_SLIDER_STEP}
              formatValue={formatEinstellungenSchwelle}
              onChange={(v) =>
                setEditSchwelle(snapEinstellungenSchwelle(Math.max(v, 500)))
              }
            />
          </EinstellungenSheetCard>
        ) : null}
        <EinstellungenToggle
          checked={editHmAuto}
          onChange={setEditHmAuto}
          title="Automatisch an Hausmeister"
          description={
            editHmAuto
              ? "Aktiv: Neue Meldungen (nicht Sofortmaßnahme) gehen direkt in die Hausmeister-Prüfung."
              : "Aus: Sie starten den Hausmeister-Pfad manuell am Vorgang."
          }
        />
      </EinstellungenEditModal>
    </div>
  );
}
