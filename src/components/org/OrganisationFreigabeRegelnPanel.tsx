"use client";

import { useEffect, useState } from "react";

import {
  EinstellungenEditModal,
  EinstellungenEuroSlider,
  EinstellungenInstantToggle,
  EinstellungenPfList,
  EinstellungenPfRow,
  EinstellungenSectionCard,
  EinstellungenSheetCard,
} from "@/components/shared/PortalEinstellungenUi";
import {
  SofortmassnahmeAkutTitle,
  SofortmassnahmeFaelleEditor,
} from "@/components/org/SofortmassnahmeFaelleLink";
import { normalizeAkutFallIds } from "@/lib/org/sofortmassnahme-faelle";
import type { OrganisationKunde } from "@/lib/org/types";
import {
  EINSTELLUNGEN_AKUT_INTRO,
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
import { EMPTY, TOAST } from "@/lib/portal-copy";

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
 * Freigabe-Regeln: Sofortmaßnahme (Fälle) → unter Schwelle → optional Betrag.
 * Toggles (Akut, Unter-Schwelle, HmAuto) mit Instant-Save+Confirm auf der Card;
 * EditModal: Fälle + Euro-Slider.
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
  const [akutFaelle, setAkutFaelle] = useState(() =>
    normalizeAkutFallIds(kunde.akut_fall_ids)
  );
  const [hmAuto, setHmAuto] = useState(Boolean(kunde.hm_auto_zuweisen));

  const [editOpen, setEditOpen] = useState(false);
  const [editSchwelle, setEditSchwelle] = useState(schwelle);
  const [editAkutFaelle, setEditAkutFaelle] = useState(akutFaelle);
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
    setAkutFaelle(normalizeAkutFallIds(kunde.akut_fall_ids));
    setHmAuto(Boolean(kunde.hm_auto_zuweisen));
  }, [
    kunde.freigabe_schwelle_eur,
    kunde.notfall_direkt,
    kunde.akut_fall_ids,
    kunde.hm_auto_zuweisen,
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
    setEditAkutFaelle(akutFaelle);
    setEditOpen(true);
  }

  function closeEdit() {
    if (saving) return;
    setEditOpen(false);
  }

  async function patchEinstellungen(body: Record<string, unknown>) {
    const res = await fetch("/api/org/einstellungen", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        freigabe_modus: "freigabe",
        kleinreparatur_aktiv: false,
        ...body,
      }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      portalToastError(TOAST.nichtGespeichert, json.error);
      throw new Error(json.error ?? "save failed");
    }
    orgPortalToast.einstellungenGespeichert();
    onSaved();
  }

  async function saveToggleAkut(next: boolean) {
    await patchEinstellungen({ notfall_direkt: next });
    setAkutDirekt(next);
  }

  async function saveToggleSchwelle(next: boolean) {
    const eur = next
      ? snapEinstellungenSchwelle(Math.max(schwelle || 500, 500))
      : null;
    await patchEinstellungen({ freigabe_schwelle_eur: eur });
    setSchwelleAktiv(next);
    if (next && eur != null) setSchwelle(eur);
  }

  async function saveToggleHmAuto(next: boolean) {
    await patchEinstellungen({ hm_auto_zuweisen: next });
    setHmAuto(next);
  }

  async function saveEdit() {
    if (!isAdmin) return;
    setSaving(true);
    try {
      await patchEinstellungen({
        freigabe_schwelle_eur: schwelleAktiv
          ? snapEinstellungenSchwelle(Math.max(editSchwelle, 500))
          : null,
        akut_fall_ids: editAkutFaelle,
      });
      if (schwelleAktiv) {
        setSchwelle(snapEinstellungenSchwelle(Math.max(editSchwelle, 500)));
      }
      setAkutFaelle(editAkutFaelle);
      setEditOpen(false);
    } catch {
      /* toast already */
    } finally {
      setSaving(false);
    }
  }

  const formDirty =
    JSON.stringify(editAkutFaelle) !== JSON.stringify(akutFaelle) ||
    (schwelleAktiv && editSchwelle !== schwelle);

  const faelleValue =
    akutFaelle.length === 0
      ? EMPTY.freigabeNichtsDirekt
      : akutFaelle.length === 1
        ? "1 Fall"
        : `${akutFaelle.length} Fälle`;

  return (
    <EinstellungenSectionCard
      title={EINSTELLUNGEN_SCHWELLE_TITLE}
      onEdit={isAdmin ? openEdit : undefined}
      editLabel="Freigabe-Regeln bearbeiten"
    >
      {!isAdmin ? (
        <p
          className="text-fs-meta leading-[1.55]"
          style={{ color: PORTAL_VAR.sub }}
        >
          Nur Administratoren können Freigabe-Regeln und Schwellen ändern.
        </p>
      ) : null}

      <div className="mb-3 space-y-2.5">
        <EinstellungenInstantToggle
          nested
          checked={akutDirekt}
          disabled={!isAdmin}
          title={<SofortmassnahmeAkutTitle />}
          description={
            akutDirekt
              ? `${EINSTELLUNGEN_AKUT_INTRO} Aktiv: Nur die ausgewählten Fälle ohne Ihre Freigabe, nur Info.`
              : "Aus: Auch Sofortmaßnahmen laufen über Angebot und Freigabe."
          }
          confirmTitle={
            akutDirekt
              ? "Sofortmaßnahme ausschalten?"
              : "Sofortmaßnahme einschalten?"
          }
          confirmDescription={
            akutDirekt
              ? "Auch Sofortmaßnahmen brauchen dann Ihre Freigabe."
              : "Ausgewählte Fälle laufen ohne Freigabe (nur Info)."
          }
          onSave={saveToggleAkut}
        />

        <EinstellungenPfList>
          <EinstellungenPfRow label="Sofortmaßnahme-Fälle" value={faelleValue} />
        </EinstellungenPfList>

        <EinstellungenInstantToggle
          nested
          checked={schwelleAktiv}
          disabled={!isAdmin}
          title={EINSTELLUNGEN_UNTER_SCHWELLE_TITLE}
          description={
            schwelleAktiv
              ? EINSTELLUNGEN_UNTER_SCHWELLE_INTRO
              : "Aus: Jedes Angebot braucht Ihre Freigabe, unabhängig vom Betrag."
          }
          confirmTitle={
            schwelleAktiv
              ? "Unter-Schwelle ausschalten?"
              : "Unter-Schwelle einschalten?"
          }
          confirmDescription={
            schwelleAktiv
              ? "Jedes Angebot braucht dann Ihre Freigabe."
              : `Angebote unter ${formatEinstellungenSchwelle(schwelle || 500)} ohne Freigabe.`
          }
          onSave={saveToggleSchwelle}
        />

        {schwelleAktiv ? (
          <EinstellungenPfList>
            <EinstellungenPfRow
              label={EINSTELLUNGEN_SCHWELLE_BETRAG_TITLE}
              value={formatEinstellungenSchwelle(schwelle)}
            />
          </EinstellungenPfList>
        ) : null}

        <EinstellungenInstantToggle
          nested
          checked={hmAuto}
          disabled={!isAdmin}
          title="Automatisch an Hausmeister"
          description={
            hmAuto
              ? "Aktiv: Neue Meldungen (nicht Sofortmaßnahme) gehen direkt in die Hausmeister-Prüfung."
              : "Aus: Sie starten den Hausmeister-Pfad manuell am Vorgang."
          }
          confirmTitle={
            hmAuto
              ? "Hausmeister-Auto ausschalten?"
              : "Hausmeister-Auto einschalten?"
          }
          confirmDescription={
            hmAuto
              ? "Neue Meldungen gehen nicht mehr automatisch an den Hausmeister."
              : "Neue Meldungen (nicht Sofortmaßnahme) gehen direkt in die Hausmeister-Prüfung."
          }
          onSave={saveToggleHmAuto}
        />
      </div>

      <EinstellungenEditModal
        open={editOpen}
        title={EINSTELLUNGEN_SCHWELLE_TITLE}
        onClose={closeEdit}
        onSave={() => void saveEdit()}
        saving={saving}
        dirty={formDirty}
      >
        <EinstellungenSheetCard
          title="Sofortmaßnahme-Fälle"
          description="Leer = nichts geht direkt — unabhängig vom Schalter oben."
        >
          <SofortmassnahmeFaelleEditor
            selected={editAkutFaelle}
            onChange={setEditAkutFaelle}
            disabled={saving}
          />
        </EinstellungenSheetCard>
        {schwelleAktiv ? (
          <EinstellungenSheetCard
            title={EINSTELLUNGEN_SCHWELLE_BETRAG_TITLE}
            description={EINSTELLUNGEN_UNTER_SCHWELLE_INTRO}
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
      </EinstellungenEditModal>
    </EinstellungenSectionCard>
  );
}
