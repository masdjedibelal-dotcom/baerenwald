"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus } from "lucide-react";

import {
  EinstellungenCard,
  EinstellungenEdField,
} from "@/components/shared/PortalEinstellungenUi";
import {
  PortalListTable,
  PortalListTableCell,
  PortalListTableRow,
} from "@/components/shared/PortalListTable";
import type { OrganisationKunde } from "@/lib/org/types";
import { PORTAL_C } from "@/lib/portal2/tokens";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

type Mitglied = {
  id: string;
  email: string | null;
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
  const [rolle, setRolle] = useState("sachbearbeiter");
  const [busy, setBusy] = useState(false);

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

  async function einladen(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/org/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, rolle }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Einladung fehlgeschlagen");
      portalToastSuccess("Einladung versendet.");
      setEmail("");
      setRolle("sachbearbeiter");
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
                <p className="truncate text-[13.5px] font-semibold text-text-primary">
                  {m.email ?? "—"}
                </p>
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

  const inviteForm = isAdmin ? (
    <form onSubmit={(e) => void einladen(e)} className="flex flex-col gap-3">
      <EinstellungenEdField
        label="E-Mail"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="kollege@hausverwaltung.de"
        autoComplete="email"
      />
      <label className="flex flex-col gap-1">
        <span className="text-[11.5px] font-bold tracking-wide text-text-tertiary">
          Rolle
        </span>
        <select
          value={rolle}
          onChange={(e) => setRolle(e.target.value)}
          className="w-full rounded-[9px] border border-border-default bg-white px-3 py-2.5 text-[13.5px] text-text-primary outline-none focus:border-accent"
        >
          <option value="admin">Admin</option>
          <option value="sachbearbeiter">Sachbearbeiter</option>
          <option value="lesen">Nur Lesen</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={busy || !email.trim()}
        className="btn-pill-primary inline-flex w-full items-center justify-center gap-2 sm:w-auto"
      >
        <UserPlus className="h-4 w-4" aria-hidden />
        {busy ? "Wird eingeladen…" : "Einladen"}
      </button>
    </form>
  ) : (
    <p className="text-[13px]" style={{ color: PORTAL_C.sub }}>
      Nur Administratoren können Teammitglieder einladen oder entfernen.
    </p>
  );

  const body = (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] leading-[1.55]" style={{ color: PORTAL_C.sub }}>
        Weitere Nutzer für {kunde.org_anzeigename ?? kunde.name} einladen und
        Rollen verwalten.
      </p>
      {table}
      {isAdmin ? (
        <EinstellungenCard title="Mitglied hinzufügen">
          {inviteForm}
        </EinstellungenCard>
      ) : (
        inviteForm
      )}
    </div>
  );

  if (nested) {
    return (
      <section className="space-y-4 border-t border-border-default pt-5">
        <h2 className="font-semibold text-text-primary">Team</h2>
        {body}
      </section>
    );
  }

  return (
    <section className={cn("portal-surface space-y-4 p-4 sm:p-5")}>
      <div>
        <h2 className="font-semibold text-text-primary">Team</h2>
      </div>
      {body}
    </section>
  );
}
