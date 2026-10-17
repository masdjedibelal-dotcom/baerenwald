"use client";

import { useCallback, useEffect, useState } from "react";

import {
  entferneOrgAnsprechpartner,
  listOrgAnsprechpartner,
  speichereOrgAnsprechpartner,
  type OrgAnsprechpartner,
} from "@/app/actions/org-ansprechpartner";
import { PortalButton } from "@/components/portal/PortalButton";
import { EinstellungenSectionCard } from "@/components/shared/PortalEinstellungenUi";
import { PortalField } from "@/components/shared/PortalField";
import { PortalCheckbox, PortalInput, PortalSelect } from "@/components/shared/PortalFormControls";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { safeAction } from "@/lib/actions/safe-action";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";

/** Gleiche Rollen wie im CRM (Kunde → Ansprechpartner). */
const ROLLEN = [
  "Objektleiter",
  "Verwaltung",
  "Buchhaltung",
  "Geschäftsführung",
  "Eigentümervertretung",
  "Technik",
  "Empfang",
  "Sonstiges",
] as const;

type Entwurf = {
  id: string | null;
  name: string;
  rolle: string;
  email: string;
  telefon: string;
  ist_primaer: boolean;
};

/**
 * Ansprechpartner der Hausverwaltung — dieselben Einträge wie im CRM beim Kunden.
 * Bärenwald nutzt sie für Angebote, Rechnungen und Nachrichten zum Vorgang.
 */
export function OrganisationAnsprechpartnerVerwaltung({ readOnly = false }: { readOnly?: boolean }) {
  const [liste, setListe] = useState<OrgAnsprechpartner[] | null>(null);
  const [edit, setEdit] = useState<Entwurf | null>(null);
  const [busy, setBusy] = useState(false);

  const laden = useCallback(async () => {
    const r = await safeAction(listOrgAnsprechpartner());
    setListe(r.ok ? r.liste : []);
  }, []);

  useEffect(() => {
    void laden();
  }, [laden]);

  async function speichern() {
    if (!edit) return;
    setBusy(true);
    const r = await safeAction(speichereOrgAnsprechpartner(edit));
    setBusy(false);
    if (!r.ok) return portalToastError(r.error);
    portalToastSuccess(edit.id ? "Ansprechpartner gespeichert" : "Ansprechpartner angelegt");
    setEdit(null);
    await laden();
  }

  async function entfernen(id: string) {
    setBusy(true);
    const r = await safeAction(entferneOrgAnsprechpartner(id));
    setBusy(false);
    if (!r.ok) return portalToastError(r.error);
    portalToastSuccess("Ansprechpartner entfernt");
    setEdit(null);
    await laden();
  }

  const rolleWert = (rolle: string) =>
    !rolle.trim() ? "" : (ROLLEN as readonly string[]).includes(rolle.trim()) ? rolle.trim() : "Sonstiges";

  return (
    <EinstellungenSectionCard
      title="Ansprechpartner"
      onAdd={
        readOnly
          ? undefined
          : () => setEdit({ id: null, name: "", rolle: "", email: "", telefon: "", ist_primaer: !liste?.length })
      }
      addLabel="Ansprechpartner hinzufügen"
    >
      <p className="portal-text-meta text-text-tertiary">
        Ihre Ansprechpartner für Bärenwald — z. B. für Angebote, Rechnungen und Rückfragen zu Vorgängen. Der
        Haupt-Ansprechpartner steht an erster Stelle.
      </p>
      {liste == null ? (
        <p className="portal-text-body text-text-secondary">Wird geladen …</p>
      ) : liste.length === 0 ? (
        <p className="portal-text-body text-text-secondary">Noch keine Ansprechpartner.</p>
      ) : (
        <ul className="divide-y divide-[var(--p2-line)]">
          {liste.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="portal-text-body font-semibold text-text-primary">
                  {a.name}
                  {a.ist_primaer ? (
                    <span className="portal-text-meta ml-2 text-[var(--p2-sub)]">· Haupt-Ansprechpartner</span>
                  ) : null}
                </div>
                <div className="portal-text-meta text-text-tertiary">
                  {[a.rolle, a.email, a.telefon].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              {readOnly ? null : (
                <PortalButton
                  variant="ghost"
                  type="button"
                  onClick={() =>
                    setEdit({
                      id: a.id,
                      name: a.name,
                      rolle: a.rolle ?? "",
                      email: a.email ?? "",
                      telefon: a.telefon ?? "",
                      ist_primaer: a.ist_primaer,
                    })
                  }
                >
                  Bearbeiten
                </PortalButton>
              )}
            </li>
          ))}
        </ul>
      )}

      {edit ? (
        <PortalModalShell
          open
          title={edit.id ? "Ansprechpartner bearbeiten" : "Ansprechpartner hinzufügen"}
          onClose={() => setEdit(null)}
          onConfirm={speichern}
          confirmLabel="Speichern"
          confirmDisabled={busy || !edit.name.trim()}
          busy={busy}
        >
          <PortalField label="Name">
            <PortalInput value={edit.name} onChange={(ev) => setEdit({ ...edit, name: ev.target.value })} />
          </PortalField>
          <PortalField label="Rolle">
            <PortalSelect value={rolleWert(edit.rolle)} onChange={(ev) => setEdit({ ...edit, rolle: ev.target.value })}>
              <option value="">Rolle wählen…</option>
              {ROLLEN.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </PortalSelect>
          </PortalField>
          <PortalField label="E-Mail">
            <PortalInput type="email" value={edit.email} onChange={(ev) => setEdit({ ...edit, email: ev.target.value })} />
          </PortalField>
          <PortalField label="Telefon">
            <PortalInput value={edit.telefon} onChange={(ev) => setEdit({ ...edit, telefon: ev.target.value })} />
          </PortalField>
          <label className="flex cursor-pointer items-center gap-3">
            <PortalCheckbox
              checked={edit.ist_primaer}
              onChange={(ev) => setEdit({ ...edit, ist_primaer: ev.target.checked })}
              className="h-4 w-4 shrink-0 accent-[var(--p2-primary)]"
            />
            <span className="portal-text-body text-text-primary">Haupt-Ansprechpartner</span>
          </label>
          {edit.id ? (
            <PortalButton variant="ghost" type="button" disabled={busy} onClick={() => edit.id && void entfernen(edit.id)}>
              Ansprechpartner entfernen
            </PortalButton>
          ) : null}
        </PortalModalShell>
      ) : null}
    </EinstellungenSectionCard>
  );
}
