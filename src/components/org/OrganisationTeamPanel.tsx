"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, UserPlus } from "lucide-react";

import type { OrganisationKunde } from "@/lib/org/types";
import { EinstellungenCard, EinstellungenEdField } from "@/components/shared/PortalEinstellungenUi";
import { PORTAL_C } from "@/lib/portal2/tokens";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";

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
      const data = (await res.json()) as { mitglieder?: Mitglied[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Laden fehlgeschlagen");
      setMitglieder(data.mitglieder ?? []);
    } catch (e) {
      portalToastError(e instanceof Error ? e.message : "Team konnte nicht geladen werden.");
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

  return (
    <section
      className={
        nested
          ? "space-y-4 border-t border-border-default pt-5"
          : "portal-surface space-y-4 p-4 sm:p-5"
      }
    >
      <div>
        <h2 className="font-semibold text-text-primary">Team</h2>
        <p className="portal-text-meta text-text-secondary">
          Weitere Nutzer für {kunde.org_anzeigename ?? kunde.name} einladen.
        </p>
      </div>

      {loading ? (
        <p className="portal-text-body text-text-secondary">Lade Team …</p>
      ) : (
        <ul className="divide-y divide-border-default rounded-xl border border-border-default">
          <li className="flex items-center justify-between px-3 py-2.5">
            <div>
              <p className="portal-text-body font-medium">{kunde.email ?? "Hauptkonto"}</p>
              <p className="portal-text-meta text-text-tertiary">Admin (Hauptkonto)</p>
            </div>
          </li>
          {mitglieder
            .filter((m) => m.aktiv)
            .map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                <div>
                  <p className="portal-text-body">{m.email ?? "—"}</p>
                  <p className="portal-text-meta capitalize text-text-tertiary">{m.rolle}</p>
                </div>
                {isAdmin ? (
                  <button
                    type="button"
                    className="btn-pill-outline portal-btn-compact text-red-700"
                    disabled={busy}
                    onClick={() => void entfernen(m.id)}
                  >
                    Entfernen
                  </button>
                ) : null}
              </li>
            ))}
        </ul>
      )}

      {isAdmin ? (
        <form onSubmit={(e) => void einladen(e)} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1 space-y-1">
          <span className="portal-text-meta text-text-secondary">E-Mail</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field w-full"
            placeholder="kollege@hausverwaltung.de"
          />
        </label>
        <label className="space-y-1 sm:w-40">
          <span className="portal-text-meta text-text-secondary">Rolle</span>
          <select
            value={rolle}
            onChange={(e) => setRolle(e.target.value)}
            className="input-field w-full"
          >
            <option value="admin">Admin</option>
            <option value="sachbearbeiter">Sachbearbeiter</option>
            <option value="lesen">Nur Lesen</option>
          </select>
        </label>
        <button type="submit" disabled={busy} className="btn-pill-primary inline-flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Einladen
        </button>
      </form>
      ) : (
        <p className="portal-text-meta text-text-tertiary">
          Nur Administratoren können Teammitglieder einladen oder entfernen.
        </p>
      )}
    </section>
  );
}

export function OrganisationExportPanel({ nested = false }: { nested?: boolean }) {
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");

  function download() {
    const params = new URLSearchParams();
    if (von) params.set("von", von);
    if (bis) params.set("bis", bis);
    const q = params.toString();
    window.location.href = `/api/org/export/rechnungen${q ? `?${q}` : ""}`;
  }

  const body = (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] leading-[1.55]" style={{ color: PORTAL_C.sub }}>
        Neutrale CSV (Semikolon, UTF-8) für Buchhaltung.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <EinstellungenEdField
          label="Von"
          type="date"
          value={von}
          onChange={setVon}
        />
        <EinstellungenEdField
          label="Bis"
          type="date"
          value={bis}
          onChange={setBis}
        />
        <button
          type="button"
          onClick={download}
          className="btn-pill-primary inline-flex items-center justify-center gap-2 sm:mb-0.5"
        >
          <Download className="h-4 w-4" />
          CSV herunterladen
        </button>
      </div>
    </div>
  );

  if (nested) {
    return <EinstellungenCard title="Rechnungs-Export">{body}</EinstellungenCard>;
  }

  return (
    <section className="portal-surface space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="font-semibold text-text-primary">Rechnungs-Export</h2>
        <p className="portal-text-meta text-text-secondary">
          Neutrale CSV (Semikolon, UTF-8) für Buchhaltung.
        </p>
      </div>
      {body}
    </section>
  );
}
