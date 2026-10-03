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
import { PortalButton } from "@/components/portal/PortalButton";
import { ALL_AKUT_FALL_IDS, normalizeAkutFallIds } from "@/lib/org/sofortmassnahme-faelle";
import type { OrganisationKunde, OrganisationObjekt } from "@/lib/org/types";
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
  /** Für „Abweichungen je Objekt“ */
  objekte?: OrganisationObjekt[];
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
  objekte = [],
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
  }, [
    kunde.freigabe_schwelle_eur,
    kunde.notfall_direkt,
    kunde.akut_fall_ids,
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

  /** Notfälle (Wasser, Strom, Heizung): ein Haken statt Fall-Liste — gilt für alle Notfall-Fälle. */
  async function saveToggleAkut(next: boolean) {
    await patchEinstellungen({
      notfall_direkt: next,
      akut_fall_ids: next ? [...ALL_AKUT_FALL_IDS] : akutFaelle,
    });
    setAkutDirekt(next);
    if (next) setAkutFaelle([...ALL_AKUT_FALL_IDS]);
  }

  async function saveToggleSchwelle(next: boolean) {
    const eur = next
      ? snapEinstellungenSchwelle(Math.max(schwelle || 500, 500))
      : null;
    await patchEinstellungen({ freigabe_schwelle_eur: eur });
    setSchwelleAktiv(next);
    if (next && eur != null) setSchwelle(eur);
  }

  async function saveEdit() {
    if (!isAdmin) return;
    setSaving(true);
    try {
      const eur = snapEinstellungenSchwelle(Math.max(editSchwelle, 500));
      await patchEinstellungen({ freigabe_schwelle_eur: eur });
      setSchwelleAktiv(true);
      setSchwelle(eur);
      setEditOpen(false);
    } catch {
      /* toast already */
    } finally {
      setSaving(false);
    }
  }

  // ── Abweichungen je Objekt (leer = wie oben) ──
  const [objEdit, setObjEdit] = useState<OrganisationObjekt | null>(null);
  const [objEigenerBetrag, setObjEigenerBetrag] = useState(false);
  const [objBetrag, setObjBetrag] = useState(500);
  const [objNotfall, setObjNotfall] = useState<"standard" | "an" | "aus">("standard");

  function openObjekt(o: OrganisationObjekt) {
    const eigener = o.freigabe_schwelle_eur != null && Number(o.freigabe_schwelle_eur) > 0;
    setObjEigenerBetrag(eigener);
    setObjBetrag(eigener ? Number(o.freigabe_schwelle_eur) : schwelle || 500);
    setObjNotfall(o.notfall_direkt == null ? "standard" : o.notfall_direkt ? "an" : "aus");
    setObjEdit(o);
  }

  async function saveObjekt() {
    if (!objEdit) return;
    setSaving(true);
    try {
      const res = await fetch("/api/org/objekte", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: objEdit.id,
          freigabe_schwelle_eur: objEigenerBetrag
            ? snapEinstellungenSchwelle(Math.max(objBetrag, 500))
            : null,
          notfall_direkt: objNotfall === "standard" ? null : objNotfall === "an",
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError(TOAST.freigabe_regeln_nicht_gespeichert, json.error);
        return;
      }
      orgPortalToast.objektAktualisiert();
      setObjEdit(null);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  function objektRegelText(o: OrganisationObjekt): string {
    const teile: string[] = [];
    if (o.freigabe_schwelle_eur != null && Number(o.freigabe_schwelle_eur) > 0) {
      teile.push(`bis ${formatEinstellungenSchwelle(Number(o.freigabe_schwelle_eur))}`);
    }
    if (o.notfall_direkt != null) teile.push(o.notfall_direkt ? "Notfälle sofort" : "Notfälle mit Freigabe");
    return teile.length ? teile.join(" · ") : "Wie oben";
  }

  return (
    <>
      <EinstellungenSectionCard
        title={EINSTELLUNGEN_SCHWELLE_TITLE}
        onEdit={isAdmin && schwelleAktiv ? openEdit : undefined}
        editLabel="Betrag ändern"
      >
        <div className="mb-1 space-y-2.5">
          <EinstellungenInstantToggle
            nested
            checked={schwelleAktiv}
            disabled={!isAdmin}
            title={
              schwelleAktiv
                ? `Ohne Freigabe bis ${formatEinstellungenSchwelle(schwelle)}`
                : "Ohne Freigabe bis zu einem Betrag"
            }
            description={schwelleAktiv ? "Darüber fragen wir Sie." : "Aus: Jedes Angebot braucht Ihre Freigabe."}
            confirmTitle={schwelleAktiv ? "Betrag ausschalten?" : "Betrag einschalten?"}
            confirmDescription={
              schwelleAktiv
                ? "Jedes Angebot braucht dann Ihre Freigabe."
                : `Angebote bis ${formatEinstellungenSchwelle(schwelle || 500)} ohne Freigabe.`
            }
            onSave={saveToggleSchwelle}
          />
          <EinstellungenInstantToggle
            nested
            checked={akutDirekt}
            disabled={!isAdmin}
            title="Notfälle sofort beheben"
            description="Wasser, Strom, Heizung"
            confirmTitle={akutDirekt ? "Notfälle mit Freigabe?" : "Notfälle sofort beheben?"}
            confirmDescription={
              akutDirekt
                ? "Auch Notfälle brauchen dann Ihre Freigabe."
                : "Notfälle (Wasser, Strom, Heizung) beheben wir sofort und informieren Sie."
            }
            onSave={saveToggleAkut}
          />
        </div>
      </EinstellungenSectionCard>

      {objekte.length > 0 ? (
        <EinstellungenSectionCard title="Abweichungen je Objekt">
          <div className="flex flex-col">
            {objekte.map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={!isAdmin}
                onClick={() => openObjekt(o)}
                className="flex min-w-0 items-center justify-between gap-3 border-b border-[var(--p2-line)] py-2.5 text-left last:border-b-0"
              >
                <span className="portal-text-body min-w-0 truncate font-semibold text-text-primary">{o.titel}</span>
                <span className="portal-text-meta shrink-0 text-text-secondary">{objektRegelText(o)}</span>
              </button>
            ))}
          </div>
        </EinstellungenSectionCard>
      ) : null}

      <EinstellungenEditModal
        open={editOpen}
        title="Ohne Freigabe bis"
        onClose={closeEdit}
        onSave={() => void saveEdit()}
        saving={saving}
        dirty={editSchwelle !== schwelle}
      >
        <EinstellungenSheetCard title={EINSTELLUNGEN_SCHWELLE_BETRAG_TITLE}>
          <EinstellungenEuroSlider
            value={editSchwelle}
            min={Math.max(EINSTELLUNGEN_SCHWELLE_SLIDER_MIN, 500)}
            max={EINSTELLUNGEN_SCHWELLE_SLIDER_MAX}
            step={EINSTELLUNGEN_SCHWELLE_SLIDER_STEP}
            formatValue={formatEinstellungenSchwelle}
            onChange={(v) => setEditSchwelle(snapEinstellungenSchwelle(Math.max(v, 500)))}
          />
        </EinstellungenSheetCard>
      </EinstellungenEditModal>

      <EinstellungenEditModal
        open={Boolean(objEdit)}
        title={objEdit?.titel ?? "Objekt"}
        onClose={() => {
          if (!saving) setObjEdit(null);
        }}
        onSave={() => void saveObjekt()}
        saving={saving}
        dirty
      >
        <EinstellungenSheetCard title="Ohne Freigabe bis">
          <div className="mb-3 flex gap-2">
            <PortalButton variant={objEigenerBetrag ? "secondary" : "primary"} onClick={() => setObjEigenerBetrag(false)}>
              Wie oben
            </PortalButton>
            <PortalButton variant={objEigenerBetrag ? "primary" : "secondary"} onClick={() => setObjEigenerBetrag(true)}>
              Eigener Betrag
            </PortalButton>
          </div>
          {objEigenerBetrag ? (
            <EinstellungenEuroSlider
              value={objBetrag}
              min={Math.max(EINSTELLUNGEN_SCHWELLE_SLIDER_MIN, 500)}
              max={EINSTELLUNGEN_SCHWELLE_SLIDER_MAX}
              step={EINSTELLUNGEN_SCHWELLE_SLIDER_STEP}
              formatValue={formatEinstellungenSchwelle}
              onChange={(v) => setObjBetrag(snapEinstellungenSchwelle(Math.max(v, 500)))}
            />
          ) : null}
        </EinstellungenSheetCard>
        <EinstellungenSheetCard title="Notfälle">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["standard", "Wie oben"],
                ["an", "Sofort beheben"],
                ["aus", "Mit Freigabe"],
              ] as const
            ).map(([wert, label]) => (
              <PortalButton
                key={wert}
                variant={objNotfall === wert ? "primary" : "secondary"}
                onClick={() => setObjNotfall(wert)}
              >
                {label}
              </PortalButton>
            ))}
          </div>
        </EinstellungenSheetCard>
      </EinstellungenEditModal>
    </>
  );
}
