"use client";

import { useCallback, useEffect, useState } from "react";

import {
  entferneMitarbeiter,
  listMeineMitarbeiter,
  speichereMitarbeiter,
  type MeinMitarbeiter,
} from "@/app/actions/partner-mitarbeiter";
import { PortalButton } from "@/components/portal/PortalButton";
import { PortalField } from "@/components/shared/PortalField";
import { PortalInput } from "@/components/shared/PortalFormControls";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { safeAction } from "@/lib/actions/safe-action";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";
import { EinstellungenSectionCard } from "@/components/shared/PortalEinstellungenUi";

/**
 * Inhaber pflegt seine Mitarbeiter (Name, Rolle, E-Mail, Telefon). Mit E-Mail kann sich der Mitarbeiter
 * im Partner-Portal registrieren und sieht nur Einsätze, für die er eingeteilt ist — ohne Preise.
 */
export function PartnerMitarbeiterVerwaltung() {
  const [liste, setListe] = useState<MeinMitarbeiter[] | null>(null);
  const [edit, setEdit] = useState<{ id: string | null; name: string; rolle: string; email: string; telefon: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const laden = useCallback(async () => {
    const r = await safeAction(listMeineMitarbeiter());
    setListe(r.ok ? r.liste : []);
  }, []);

  useEffect(() => {
    void laden();
  }, [laden]);

  async function speichern() {
    if (!edit) return;
    setBusy(true);
    const r = await safeAction(speichereMitarbeiter(edit));
    setBusy(false);
    if (!r.ok) return portalToastError(r.error);
    portalToastSuccess(edit.id ? "Mitarbeiter gespeichert" : "Mitarbeiter angelegt");
    setEdit(null);
    await laden();
  }

  async function entfernen(m: MeinMitarbeiter) {
    setBusy(true);
    const r = await safeAction(entferneMitarbeiter(m.id));
    setBusy(false);
    if (!r.ok) return portalToastError(r.error);
    portalToastSuccess("Mitarbeiter entfernt — sein Zugang ist beendet");
    setEdit(null);
    await laden();
  }

  return (
    <EinstellungenSectionCard
      title="Mitarbeiter"
      onAdd={() => setEdit({ id: null, name: "", rolle: "", email: "", telefon: "" })}
      addLabel="Mitarbeiter hinzufügen"
    >
      <p className="portal-text-meta text-text-tertiary">
        Mitarbeiter mit E-Mail können sich unter „Registrieren“ selbst einen Zugang anlegen. Sie sehen nur die
        Einsätze, für die Sie sie beim Annehmen einteilen — ohne Preise und Rechnungen.
      </p>
      {liste == null ? (
        <p className="portal-text-body text-text-secondary">Wird geladen …</p>
      ) : liste.length === 0 ? (
        <p className="portal-text-body text-text-secondary">Noch keine Mitarbeiter.</p>
      ) : (
        <ul className="divide-y divide-[var(--p2-line)]">
          {liste.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="portal-text-body font-semibold text-text-primary">
                  {m.name}
                  {m.hat_zugang ? <span className="portal-text-meta ml-2 text-[var(--p2-sub)]">· hat Zugang</span> : null}
                </div>
                <div className="portal-text-meta text-text-tertiary">
                  {[m.rolle, m.email, m.telefon].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              <PortalButton
                variant="ghost"
                type="button"
                onClick={() =>
                  setEdit({ id: m.id, name: m.name, rolle: m.rolle ?? "", email: m.email ?? "", telefon: m.telefon ?? "" })
                }
              >
                Bearbeiten
              </PortalButton>
            </li>
          ))}
        </ul>
      )}

      {edit ? (
        <PortalModalShell
          open
          title={edit.id ? "Mitarbeiter bearbeiten" : "Mitarbeiter hinzufügen"}
          onClose={() => setEdit(null)}
          onConfirm={speichern}
          confirmLabel="Speichern"
          confirmDisabled={busy || !edit.name.trim()}
          busy={busy}
        >
          <PortalField label="Name">
            <PortalInput value={edit.name} onChange={(ev) => setEdit({ ...edit, name: ev.target.value })} />
          </PortalField>
          <PortalField label="Rolle" hint="z. B. Polier, Monteur">
            <PortalInput value={edit.rolle} onChange={(ev) => setEdit({ ...edit, rolle: ev.target.value })} />
          </PortalField>
          <PortalField label="E-Mail" hint="Für den eigenen Zugang und die Einsatz-Infos.">
            <PortalInput type="email" value={edit.email} onChange={(ev) => setEdit({ ...edit, email: ev.target.value })} />
          </PortalField>
          <PortalField label="Handy" hint="Für Einsatz-Infos per WhatsApp.">
            <PortalInput value={edit.telefon} onChange={(ev) => setEdit({ ...edit, telefon: ev.target.value })} />
          </PortalField>
          {edit.id ? (
            <PortalButton
              variant="ghost"
              type="button"
              disabled={busy}
              onClick={() => {
                const m = liste?.find((x) => x.id === edit.id);
                if (m) void entfernen(m);
              }}
            >
              Mitarbeiter entfernen
            </PortalButton>
          ) : null}
        </PortalModalShell>
      ) : null}
    </EinstellungenSectionCard>
  );
}
