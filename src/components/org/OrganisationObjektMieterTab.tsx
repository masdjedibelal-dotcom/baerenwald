"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { OrganisationObjektMieterMenu } from "@/components/org/OrganisationObjektMieterMenu";
import { PortalConfirmDialog } from "@/components/shared/PortalDetailUi";
import { PortalInboxEmpty } from "@/components/shared/PortalEmptyState";
import { EinstellungenEditModal } from "@/components/shared/PortalEinstellungenUi";
import type { OrganisationLead } from "@/lib/org/types";
import {
  OBJ_MIETER_PORTAL_STATUS,
  resolveObjMieterPortalStatus,
} from "@/lib/portal2/objekte";
import { buildPortalEinladungMailto } from "@/lib/portal2/portal-einladungen";
import { orgPortalToast, portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";

type PersonRolle = "mieter" | "eigentuemer";

type Bewohner = {
  id: string;
  name: string;
  email?: string | null;
  telefon?: string | null;
  rolle?: PersonRolle | null;
  sondereigentum_verwaltung?: boolean | null;
  miete_hinweis?: string | null;
  notiz?: string | null;
  objekt_einheit_id: string;
  objekt_einheiten?: { bezeichnung?: string | null } | null;
};

type Props = {
  objektId: string;
  leads: OrganisationLead[];
  defaultStrasse?: string | null;
  defaultHausnummer?: string | null;
  orgAnzeigename?: string | null;
  onEinladen: () => void;
  onGotoVorgaenge: () => void;
};

/**
 * Objekt-Tab: Mieter & Eigentümer an Einheiten (anlegen + einladen).
 */
export function OrganisationObjektMieterTab({
  objektId,
  leads,
  defaultStrasse = "",
  defaultHausnummer = "",
  orgAnzeigename,
  onEinladen,
  onGotoVorgaenge,
}: Props) {
  const [bewohner, setBewohner] = useState<Bewohner[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [rolle, setRolle] = useState<PersonRolle>("mieter");
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [strasse, setStrasse] = useState(defaultStrasse?.trim() || "");
  const [hausnummer, setHausnummer] = useState(defaultHausnummer?.trim() || "");
  const [einheit, setEinheit] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [seVerwaltung, setSeVerwaltung] = useState(false);
  const [mieteHinweis, setMieteHinweis] = useState("");
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

  function openForm(nextRolle: PersonRolle = "mieter") {
    setRolle(nextRolle);
    setVorname("");
    setNachname("");
    setStrasse(defaultStrasse?.trim() || "");
    setHausnummer(defaultHausnummer?.trim() || "");
    setEinheit("");
    setEmail("");
    setTelefon("");
    setSeVerwaltung(false);
    setMieteHinweis("");
    setShowForm(true);
  }

  function closeForm() {
    if (busy) return;
    setShowForm(false);
  }

  const addPerson = async () => {
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
          rolle,
          sondereigentum_verwaltung:
            rolle === "eigentuemer" ? seVerwaltung : false,
          miete_hinweis: rolle === "mieter" ? mieteHinweis.trim() || undefined : undefined,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Anlegen fehlgeschlagen", json.error);
        return;
      }
      setShowForm(false);
      orgPortalToast.objektAktualisiert();
      await load();
    } finally {
      setBusy(false);
    }
  };

  const entfernen = async (id: string) => {
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
      setConfirmOpen(false);
      setPendingRemove(null);
    }
  };

  const einladenPerson = async (b: Bewohner) => {
    setBusyId(b.id);
    try {
      const res = await fetch("/api/org/portal-einladungen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objektId,
          einheitId: b.objekt_einheit_id,
          bewohnerId: b.id,
        }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        portalToastError("Einladung fehlgeschlagen", json.error);
        return;
      }
      const rolleLabel =
        b.rolle === "eigentuemer" ? "Eigentümer" : "Mieter";
      const hv = orgAnzeigename?.trim() || "Ihre Verwaltung";
      const mailto = buildPortalEinladungMailto({
        link: json.url,
        hvName: hv,
        objektLabel: "Objekt",
        einheitRef: b.objekt_einheiten?.bezeichnung ?? null,
      });
      if (b.email?.trim()) {
        window.location.href = mailto;
      }
      try {
        await navigator.clipboard.writeText(json.url);
        portalToastSuccess(
          "Link kopiert",
          `${rolleLabel}-Einladung in die Zwischenablage gelegt.`
        );
      } catch {
        window.prompt("Einladungs-Link:", json.url);
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
          Mieter & Eigentümer
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-[9px] border border-border-default bg-white px-3 py-1.5 text-[12.5px] font-semibold text-text-secondary"
            onClick={() => openForm("mieter")}
          >
            ＋ Mieter
          </button>
          <button
            type="button"
            className="rounded-[9px] border border-border-default bg-white px-3 py-1.5 text-[12.5px] font-semibold text-text-secondary"
            onClick={() => openForm("eigentuemer")}
          >
            ＋ Eigentümer
          </button>
          <button
            type="button"
            className="rounded-[9px] border border-accent bg-accent-light px-3 py-1.5 text-[12.5px] font-semibold text-accent"
            onClick={onEinladen}
          >
            Link / QR
          </button>
        </div>
      </div>

      <EinstellungenEditModal
        open={showForm}
        title={rolle === "eigentuemer" ? "Eigentümer anlegen" : "Mieter anlegen"}
        onClose={closeForm}
        onSave={() => void addPerson()}
        saving={busy}
        saveDisabled={!canSubmit}
        saveLabel="Anlegen"
      >
        <div className="mb-2 flex gap-2">
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${
              rolle === "mieter"
                ? "bg-accent text-white"
                : "border border-border-default bg-white text-text-secondary"
            }`}
            onClick={() => setRolle("mieter")}
          >
            Mieter
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${
              rolle === "eigentuemer"
                ? "bg-accent text-white"
                : "border border-border-default bg-white text-text-secondary"
            }`}
            onClick={() => setRolle("eigentuemer")}
          >
            Eigentümer
          </button>
        </div>
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
            placeholder="Strasse"
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
          placeholder="z. B. WE 12 / 4. Stock li"
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
        {rolle === "eigentuemer" ? (
          <label className="mt-1 flex items-start gap-2 text-[13px] text-text-secondary">
            <input
              type="checkbox"
              className="mt-1"
              checked={seVerwaltung}
              onChange={(e) => setSeVerwaltung(e.target.checked)}
            />
            <span>
              Sondereigentumsverwaltung durch HV (Ja = HV führt SE-Aufträge;
              Freigabe über Schwelle beim Eigentümer)
            </span>
          </label>
        ) : (
          <input
            className="funnel-input w-full"
            placeholder="Miet-Hinweis (optional)"
            value={mieteHinweis}
            onChange={(e) => setMieteHinweis(e.target.value)}
          />
        )}
      </EinstellungenEditModal>

      {bewohner.length === 0 ? (
        <PortalInboxEmpty title="Noch keine Personen" compact />
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
            const isEig = b.rolle === "eigentuemer";

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
                    <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-tertiary">
                      {isEig ? "Eigentümer" : "Mieter"}
                    </span>
                  </p>
                  <p className="truncate text-[12px] text-text-secondary">
                    {we}
                    {mail ? ` · ${mail}` : ""}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-text-tertiary">
                    {isEig
                      ? b.sondereigentum_verwaltung
                        ? "SE-Verwaltung: Ja"
                        : "SE-Verwaltung: Nein"
                      : status}
                    {n > 0 ? ` · ${n} Vorgänge` : ""}
                  </p>
                </div>
                <OrganisationObjektMieterMenu
                  hasEmail={Boolean(mail)}
                  onEinladen={() => void einladenPerson(b)}
                  onVorgaenge={onGotoVorgaenge}
                  onEntfernen={() => {
                    if (busyId) return;
                    setPendingRemove({ id: b.id, name: b.name });
                    setConfirmOpen(true);
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}

      <PortalConfirmDialog
        open={confirmOpen}
        title="Person entfernen?"
        description={
          pendingRemove
            ? `„${pendingRemove.name}“ wirklich entfernen? Vorgänge bleiben erhalten.`
            : "Wirklich entfernen? Vorgänge bleiben erhalten."
        }
        confirmLabel="Entfernen"
        confirmVariant="danger"
        loading={busyId != null}
        onConfirm={() => {
          if (pendingRemove) void entfernen(pendingRemove.id);
        }}
        onCancel={() => {
          if (busyId) return;
          setConfirmOpen(false);
          setPendingRemove(null);
        }}
      />
    </div>
  );
}
