"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UserPlus } from "lucide-react";

import { OrganisationObjektMieterMenu } from "@/components/org/OrganisationObjektMieterMenu";
import type { OrganisationLead } from "@/lib/org/types";
import {
  OBJ_MIETER_PORTAL_STATUS,
  resolveObjMieterPortalStatus,
} from "@/lib/portal2/objekte";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";

type Bewohner = {
  id: string;
  name: string;
  email?: string | null;
  telefon?: string | null;
  objekt_einheit_id: string;
  objekt_einheiten?: { bezeichnung?: string | null } | null;
};

type Props = {
  objektId: string;
  leads: OrganisationLead[];
  defaultStrasse?: string | null;
  defaultHausnummer?: string | null;
  onEinladen: () => void;
  onGotoVorgaenge: () => void;
};

/**
 * E2 Tab „Mieter“ — Anlegen + Liste + Menu (Einladen / Entfernen).
 */
export function OrganisationObjektMieterTab({
  objektId,
  leads,
  defaultStrasse = "",
  defaultHausnummer = "",
  onEinladen,
  onGotoVorgaenge,
}: Props) {
  const [bewohner, setBewohner] = useState<Bewohner[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [strasse, setStrasse] = useState(defaultStrasse?.trim() || "");
  const [hausnummer, setHausnummer] = useState(defaultHausnummer?.trim() || "");
  const [einheit, setEinheit] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (defaultStrasse?.trim()) setStrasse(defaultStrasse.trim());
    if (defaultHausnummer?.trim()) setHausnummer(defaultHausnummer.trim());
  }, [defaultStrasse, defaultHausnummer]);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/org/einheit-bewohner?objektId=${encodeURIComponent(objektId)}`
    );
    const json = (await res.json()) as { bewohner?: Bewohner[] };
    setBewohner(json.bewohner ?? []);
  }, [objektId]);

  useEffect(() => {
    void load();
  }, [load]);

  const vorgangCountByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of leads) {
      const mail = (l.melder_email ?? "").trim().toLowerCase();
      const name = (l.melder_name ?? "").trim().toLowerCase();
      if (mail) map.set(`mail:${mail}`, (map.get(`mail:${mail}`) ?? 0) + 1);
      if (name) map.set(`name:${name}`, (map.get(`name:${name}`) ?? 0) + 1);
    }
    return map;
  }, [leads]);

  const canSubmit =
    vorname.trim().length > 0 &&
    nachname.trim().length > 0 &&
    strasse.trim().length > 1 &&
    hausnummer.trim().length > 0;

  const addMieter = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = [vorname, nachname].map((s) => s.trim()).filter(Boolean).join(" ");
    if (!canSubmit || !name) return;
    setBusy(true);
    try {
      const res = await fetch("/api/org/einheit-bewohner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objektId,
          name,
          wohnung: einheit.trim() || undefined,
          etage: einheit.trim() || undefined,
          email: email.trim() || undefined,
          telefon: telefon.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Anlegen fehlgeschlagen", json.error);
        return;
      }
      setVorname("");
      setNachname("");
      setEinheit("");
      setEmail("");
      setTelefon("");
      setShowForm(false);
      orgPortalToast.objektAktualisiert();
      await load();
    } finally {
      setBusy(false);
    }
  };

  const entfernen = async (id: string, name: string) => {
    if (
      !window.confirm(
        `Mieter „${name}“ wirklich entfernen? Vorgänge bleiben erhalten.`
      )
    ) {
      return;
    }
    setBusyId(id);
    try {
      const res = await fetch(
        `/api/org/einheit-bewohner?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Entfernen fehlgeschlagen", json.error);
        return;
      }
      orgPortalToast.objektAktualisiert();
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
          Mieter
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-[9px] border border-border-default bg-white px-3 py-1.5 text-[12.5px] font-semibold text-text-secondary"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Abbrechen" : "＋ Mieter anlegen"}
          </button>
          <button
            type="button"
            className="rounded-[9px] border border-accent bg-accent-light px-3 py-1.5 text-[12.5px] font-semibold text-accent"
            onClick={onEinladen}
          >
            Einladen
          </button>
        </div>
      </div>

      {showForm ? (
        <form
          onSubmit={(e) => void addMieter(e)}
          className="space-y-2 rounded-xl border border-border-default bg-white p-4"
        >
          <div className="grid grid-cols-2 gap-2">
            <input
              className="funnel-input w-full"
              placeholder="Vorname"
              value={vorname}
              onChange={(e) => setVorname(e.target.value)}
              autoComplete="given-name"
            />
            <input
              className="funnel-input w-full"
              placeholder="Nachname"
              value={nachname}
              onChange={(e) => setNachname(e.target.value)}
              autoComplete="family-name"
            />
          </div>
          <div className="grid grid-cols-[1fr_88px] gap-2">
            <input
              className="funnel-input"
              placeholder="Straße"
              value={strasse}
              onChange={(e) => setStrasse(e.target.value)}
              autoComplete="address-line1"
            />
            <input
              className="funnel-input"
              placeholder="Nr."
              value={hausnummer}
              onChange={(e) => setHausnummer(e.target.value)}
            />
          </div>
          <input
            className="funnel-input w-full"
            placeholder="z. B. 4. Stock li"
            value={einheit}
            onChange={(e) => setEinheit(e.target.value)}
            aria-label="Wohnung / Etage (optional)"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              className="funnel-input w-full"
              type="email"
              placeholder="E-Mail (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <input
              className="funnel-input w-full"
              type="tel"
              placeholder="Telefon (optional)"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              autoComplete="tel"
            />
          </div>
          <button
            type="submit"
            className="btn-pill-primary inline-flex w-full items-center justify-center gap-2"
            disabled={busy || !canSubmit}
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            {busy ? "Speichern…" : "Mieter am Objekt anlegen"}
          </button>
        </form>
      ) : null}

      {bewohner.length === 0 ? (
        <p className="rounded-xl border border-border-default bg-white p-4 text-[13px] text-text-secondary">
          Noch keine Mieter erfasst. Legen Sie einen Mieter an oder teilen Sie
          den Melde-Link.
        </p>
      ) : (
        <ul className="space-y-2">
          {bewohner.map((b) => {
            const we = b.objekt_einheiten?.bezeichnung?.trim() || "Einheit";
            const mail = b.email?.trim() || "";
            const statusKey = resolveObjMieterPortalStatus({ email: mail });
            const status = OBJ_MIETER_PORTAL_STATUS[statusKey];
            const n =
              (mail
                ? vorgangCountByKey.get(`mail:${mail.toLowerCase()}`)
                : undefined) ??
              vorgangCountByKey.get(`name:${b.name.trim().toLowerCase()}`) ??
              0;
            const initial = (b.name.trim()[0] || "?").toUpperCase();

            return (
              <li
                key={b.id}
                className="flex items-center gap-3 rounded-xl border border-border-default bg-white px-3.5 py-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-text-primary">
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-text-primary">
                    {b.name}
                  </p>
                  <p className="truncate text-[12px] text-text-secondary">
                    {we}
                    {mail ? ` · ${mail}` : ""}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-text-tertiary">
                    {status}
                    {n > 0 ? ` · ${n} Vorgänge` : ""}
                  </p>
                </div>
                <OrganisationObjektMieterMenu
                  hasEmail={Boolean(mail)}
                  onEinladen={onEinladen}
                  onVorgaenge={onGotoVorgaenge}
                  onEntfernen={() => {
                    if (busyId) return;
                    void entfernen(b.id, b.name);
                  }}
                  onBearbeiten={() =>
                    portalToastError(
                      "Noch nicht verfügbar",
                      "Mieter-Stammdaten bearbeiten folgt."
                    )
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
