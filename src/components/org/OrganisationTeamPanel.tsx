"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, UserPlus } from "lucide-react";

import {
  EinstellungenCard,
  EinstellungenEdField,
} from "@/components/shared/PortalEinstellungenUi";
import {
  PortalListTable,
  PortalListTableCell,
  PortalListTableRow,
} from "@/components/shared/PortalListTable";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import type { OrganisationKunde } from "@/lib/org/types";
import { PORTAL_C } from "@/lib/portal2/tokens";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

type Mitglied = {
  id: string;
  email: string | null;
  name?: string | null;
  rolle: string;
  aktiv: boolean;
};

type Props = {
  kunde: OrganisationKunde;
  isAdmin?: boolean;
  nested?: boolean;
};

const ROLLE_LABEL: Record<string, string> = {
  admin: "Admin",
  sachbearbeiter: "Sachbearbeiter",
  lesen: "Nur Lesen",
};

const TEAM_COLUMNS = [
  { key: "email", label: "E-Mail" },
  { key: "rolle", label: "Rolle" },
  { key: "aktion", label: "" },
];

function rolleLabel(rolle: string): string {
  return ROLLE_LABEL[rolle] ?? rolle;
}

export function OrganisationTeamPanel({
  kunde,
  isAdmin = true,
  nested = false,
}: Props) {
  const [mitglieder, setMitglieder] = useState<Mitglied[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/org/team");
      const data = (await res.json()) as {
        mitglieder?: Mitglied[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Laden fehlgeschlagen");
      setMitglieder(data.mitglieder ?? []);
    } catch (e) {
      portalToastError(
        e instanceof Error ? e.message : "Team konnte nicht geladen werden."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setEmail("");
    setName("");
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  async function einladen(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/org/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name.trim() || undefined,
          rolle: "sachbearbeiter",
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Einladung fehlgeschlagen");
      portalToastSuccess("Einladung versendet.");
      resetForm();
      setModalOpen(false);
      await load();
    } catch (err) {
      portalToastError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function entfernen(id: string) {
    if (!window.confirm("Mitglied wirklich entfernen?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/org/team?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Entfernen fehlgeschlagen");
      portalToastSuccess("Mitglied entfernt.");
      await load();
    } catch (err) {
      portalToastError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  const aktive = mitglieder.filter((m) => m.aktiv);

  const inviteFields = (
    <>
      <EinstellungenEdField
        label="Name"
        type="text"
        value={name}
        onChange={setName}
        placeholder="Max Mustermann"
        autoComplete="name"
      />
      <EinstellungenEdField
        label="E-Mail"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="kollege@hausverwaltung.de"
        autoComplete="email"
      />
    </>
  );

  const table = (
    <PortalListTable
      columns={TEAM_COLUMNS}
      empty={
        !loading && aktive.length === 0 && !kunde.email ? (
          <p
            className="px-3.5 py-4 text-[13px]"
            style={{ color: PORTAL_C.sub }}
          >
            Noch keine Teammitglieder.
          </p>
        ) : null
      }
    >
      {loading ? (
        <p
          className="px-3.5 py-4 text-[13px]"
          style={{ color: PORTAL_C.sub }}
        >
          Lade Team …
        </p>
      ) : (
        <>
          <PortalListTableRow columns={3}>
            <PortalListTableCell label="E-Mail">
              <p className="truncate text-[13.5px] font-semibold text-text-primary">
                {kunde.email?.trim() || "Hauptkonto"}
              </p>
            </PortalListTableCell>
            <PortalListTableCell label="Rolle">
              <span className="inline-flex rounded-full bg-accent/10 px-2.5 py-0.5 text-[12px] font-semibold text-accent">
                Admin
              </span>
            </PortalListTableCell>
            <PortalListTableCell className="sm:justify-self-end">
              <span className="text-[12px] font-medium text-text-tertiary">
                Hauptkonto
              </span>
            </PortalListTableCell>
          </PortalListTableRow>

          {aktive.map((m) => (
            <PortalListTableRow key={m.id} columns={3}>
              <PortalListTableCell label="E-Mail">
                <div className="min-w-0">
                  {m.name?.trim() ? (
                    <p className="truncate text-[13.5px] font-semibold text-text-primary">
                      {m.name.trim()}
                    </p>
                  ) : null}
                  <p
                    className={cn(
                      "truncate text-[13.5px]",
                      m.name?.trim()
                        ? "text-text-secondary"
                        : "font-semibold text-text-primary"
                    )}
                  >
                    {m.email ?? "—"}
                  </p>
                </div>
              </PortalListTableCell>
              <PortalListTableCell label="Rolle">
                <span className="text-[13px] font-medium text-text-secondary">
                  {rolleLabel(m.rolle)}
                </span>
              </PortalListTableCell>
              <PortalListTableCell className="sm:justify-self-end">
                {isAdmin ? (
                  <button
                    type="button"
                    className="rounded-[9px] border border-red-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    disabled={busy}
                    onClick={() => void entfernen(m.id)}
                  >
                    Entfernen
                  </button>
                ) : (
                  <span className="text-[12px] text-text-tertiary">—</span>
                )}
              </PortalListTableCell>
            </PortalListTableRow>
          ))}
        </>
      )}
    </PortalListTable>
  );

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-semibold text-text-primary">Team</h2>
        <p
          className="mt-1 text-[13px] leading-[1.55]"
          style={{ color: PORTAL_C.sub }}
        >
          Weitere Nutzer für {kunde.org_anzeigename ?? kunde.name} einladen und
          Rollen verwalten.
        </p>
      </div>
      {isAdmin ? (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-default bg-white text-text-primary shadow-sm transition hover:border-accent/40 hover:text-accent md:inline-flex"
          aria-label="Mitglied hinzufügen"
          title="Mitglied hinzufügen"
        >
          <Plus className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </button>
      ) : null}
    </div>
  );

  const mobileInvite = isAdmin ? (
    <div className="md:hidden">
      <EinstellungenCard title="Mitglied hinzufügen">
        <form
          onSubmit={(e) => void einladen(e)}
          className="flex flex-col gap-3"
        >
          {inviteFields}
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="btn-pill-primary inline-flex w-full items-center justify-center gap-2"
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            {busy ? "Wird eingeladen…" : "Einladen"}
          </button>
        </form>
      </EinstellungenCard>
    </div>
  ) : (
    <p className="text-[13px]" style={{ color: PORTAL_C.sub }}>
      Nur Administratoren können Teammitglieder einladen oder entfernen.
    </p>
  );

  const modal = isAdmin ? (
    <PortalModalShell
      open={modalOpen}
      title="Mitglied hinzufügen"
      subtitle="Name und E-Mail eingeben — die Person erhält eine Einladung."
      onClose={closeModal}
    >
      <form onSubmit={(e) => void einladen(e)} className="flex flex-col gap-3">
        {inviteFields}
        <button
          type="submit"
          disabled={busy || !email.trim() || !name.trim()}
          className="btn-pill-primary mt-1 inline-flex w-full items-center justify-center gap-2"
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          {busy ? "Wird eingeladen…" : "Einladen"}
        </button>
      </form>
    </PortalModalShell>
  ) : null;

  const body = (
    <div className="flex flex-col gap-3">
      {table}
      {mobileInvite}
      {modal}
    </div>
  );

  if (nested) {
    return (
      <section className="space-y-4 border-t border-border-default pt-5">
        {header}
        {body}
      </section>
    );
  }

  return (
    <section className={cn("portal-surface space-y-4 p-4 sm:p-5")}>
      {header}
      {body}
    </section>
  );
}
