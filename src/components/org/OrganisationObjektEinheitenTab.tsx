"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { OrganisationObjektMieterMenu } from "@/components/org/OrganisationObjektMieterMenu";
import { PortalConfirmDialog } from "@/components/shared/PortalDetailUi";
import { PortalInboxEmpty } from "@/components/shared/PortalEmptyState";
import {
  EinstellungenEdField,
  EinstellungenEditModal,
  EinstellungenToggle,
} from "@/components/shared/PortalEinstellungenUi";
import {
  OBJ_MIETER_PORTAL_STATUS,
  resolveObjMieterPortalStatus,
} from "@/lib/portal2/objekte";
import { buildPortalEinladungMailto } from "@/lib/portal2/portal-einladungen";
import { cn } from "@/lib/utils";
import {
  orgPortalToast,
  portalToastError,
  portalToastSuccess,
} from "@/lib/shared/portal-toast";

type Einheit = {
  id: string;
  bezeichnung: string;
  etage?: string | null;
  wohnflaeche_m2: number | null;
  aktiv: boolean;
};

type PersonRolle = "mieter" | "eigentuemer";

type Bewohner = {
  id: string;
  name: string;
  email?: string | null;
  telefon?: string | null;
  rolle?: PersonRolle | null;
  sondereigentum_verwaltung?: boolean | null;
  miete_hinweis?: string | null;
  objekt_einheit_id: string;
};

type Props = {
  objektId: string;
  orgAnzeigename?: string | null;
  onGotoVorgaenge: () => void;
  onEinheitenChange?: () => void;
};

/**
 * Objekt → Einheiten → darunter Mieter/Eigentümer (pro Einheit).
 */
export function OrganisationObjektEinheitenTab({
  objektId,
  orgAnzeigename,
  onGotoVorgaenge,
  onEinheitenChange,
}: Props) {
  const [einheiten, setEinheiten] = useState<Einheit[]>([]);
  const [bewohner, setBewohner] = useState<Bewohner[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [einheitFormOpen, setEinheitFormOpen] = useState(false);
  const [bezeichnung, setBezeichnung] = useState("");
  const [etage, setEtage] = useState("");
  const [m2, setM2] = useState("");
  const [einheitBusy, setEinheitBusy] = useState(false);

  const [personForm, setPersonForm] = useState<{
    einheitId: string;
    rolle: PersonRolle;
  } | null>(null);
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [seVerwaltung, setSeVerwaltung] = useState(false);
  const [mieteHinweis, setMieteHinweis] = useState("");
  const [personBusy, setPersonBusy] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<
    | { kind: "einheit"; id: string; label: string }
    | { kind: "person"; id: string; label: string }
    | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [eRes, bRes] = await Promise.all([
        fetch(
          `/api/org/objekte/einheiten?objektId=${encodeURIComponent(objektId)}`
        ),
        fetch(
          `/api/org/einheit-bewohner?objektId=${encodeURIComponent(objektId)}`
        ),
      ]);
      if (eRes.ok) {
        const json = (await eRes.json()) as { einheiten?: Einheit[] };
        setEinheiten(json.einheiten ?? []);
      }
      if (bRes.ok) {
        const json = (await bRes.json()) as { bewohner?: Bewohner[] };
        setBewohner(json.bewohner ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [objektId]);

  useEffect(() => {
    void load();
  }, [load]);

  const byEinheit = useMemo(() => {
    const map = new Map<string, Bewohner[]>();
    for (const b of bewohner) {
      const list = map.get(b.objekt_einheit_id) ?? [];
      list.push(b);
      map.set(b.objekt_einheit_id, list);
    }
    return map;
  }, [bewohner]);

  function openEinheitForm() {
    setBezeichnung("");
    setEtage("");
    setM2("");
    setEinheitFormOpen(true);
  }

  function closeEinheitForm() {
    if (einheitBusy) return;
    setEinheitFormOpen(false);
  }

  async function saveEinheit() {
    const label = bezeichnung.trim();
    if (!label) return;
    setEinheitBusy(true);
    try {
      const res = await fetch("/api/org/objekte/einheiten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objektId,
          bezeichnung: label,
          etage: etage.trim() || null,
          wohnflaeche_m2: m2.trim() ? Number(m2.replace(",", ".")) : null,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Einheit nicht angelegt", json.error);
        return;
      }
      setEinheitFormOpen(false);
      orgPortalToast.objektAktualisiert();
      await load();
      onEinheitenChange?.();
    } finally {
      setEinheitBusy(false);
    }
  }

  function openPersonForm(einheitId: string, rolle: PersonRolle) {
    setVorname("");
    setNachname("");
    setEmail("");
    setTelefon("");
    setSeVerwaltung(false);
    setMieteHinweis("");
    setPersonForm({ einheitId, rolle });
  }

  function closePersonForm() {
    if (personBusy) return;
    setPersonForm(null);
  }

  const canSubmitPerson =
    vorname.trim().length > 0 && nachname.trim().length > 0;

  async function savePerson() {
    if (!personForm || !canSubmitPerson) return;
    const name = [vorname, nachname].map((s) => s.trim()).filter(Boolean).join(" ");
    setPersonBusy(true);
    try {
      const res = await fetch("/api/org/einheit-bewohner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objektId,
          einheitId: personForm.einheitId,
          name,
          email: email.trim() || undefined,
          telefon: telefon.trim() || undefined,
          rolle: personForm.rolle,
          sondereigentum_verwaltung:
            personForm.rolle === "eigentuemer" ? seVerwaltung : false,
          miete_hinweis:
            personForm.rolle === "mieter"
              ? mieteHinweis.trim() || undefined
              : undefined,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Anlegen fehlgeschlagen", json.error);
        return;
      }
      setPersonForm(null);
      setExpandedId(personForm.einheitId);
      orgPortalToast.objektAktualisiert();
      await load();
    } finally {
      setPersonBusy(false);
    }
  }

  async function removeEinheit(id: string) {
    setBusyId(id);
    try {
      const people = byEinheit.get(id) ?? [];
      await Promise.all(
        people.map((p) =>
          fetch(`/api/org/einheit-bewohner?id=${encodeURIComponent(p.id)}`, {
            method: "DELETE",
          })
        )
      );
      const res = await fetch(
        `/api/org/objekte/einheiten?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Einheit nicht entfernt", json.error);
        return;
      }
      if (expandedId === id) setExpandedId(null);
      orgPortalToast.objektAktualisiert();
      await load();
      onEinheitenChange?.();
    } finally {
      setBusyId(null);
      setConfirm(null);
    }
  }

  async function removePerson(id: string) {
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
      setConfirm(null);
    }
  }

  async function einladenPerson(b: Bewohner, einheitLabel: string) {
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
        einheitRef: einheitLabel,
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
  }

  function renderPersonList(
    einheit: Einheit,
    rolle: PersonRolle,
    people: Bewohner[]
  ) {
    const title = rolle === "eigentuemer" ? "Eigentümer" : "Mieter";
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] font-bold uppercase tracking-wide text-text-tertiary">
            {title}
          </p>
          <button
            type="button"
            className="rounded-lg border border-border-default bg-white px-2.5 py-1 text-[12px] font-semibold text-text-secondary hover:border-accent/40 hover:text-accent"
            onClick={() => openPersonForm(einheit.id, rolle)}
          >
            ＋ {title}
          </button>
        </div>
        {people.length === 0 ? (
          <p className="text-[12.5px] text-text-tertiary">Noch keine {title}.</p>
        ) : (
          <ul className="space-y-1.5">
            {people.map((b) => {
              const mail = b.email?.trim() || "";
              const statusKey = resolveObjMieterPortalStatus({ email: mail });
              const status = OBJ_MIETER_PORTAL_STATUS[statusKey];
              const initial = (b.name.trim()[0] || "?").toUpperCase();
              return (
                <li
                  key={b.id}
                  className="flex items-center gap-2.5 rounded-lg border border-border-light bg-white px-3 py-2.5"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-text-primary">
                    {initial}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-text-primary">
                      {b.name}
                    </p>
                    <p className="truncate text-[11.5px] text-text-tertiary">
                      {mail || "—"}
                      {rolle === "eigentuemer"
                        ? b.sondereigentum_verwaltung
                          ? " · SE-Verwaltung"
                          : ""
                        : ` · ${status}`}
                    </p>
                  </div>
                  <OrganisationObjektMieterMenu
                    hasEmail={Boolean(mail)}
                    onEinladen={() =>
                      void einladenPerson(b, einheit.bezeichnung)
                    }
                    onVorgaenge={onGotoVorgaenge}
                    onEntfernen={() =>
                      setConfirm({
                        kind: "person",
                        id: b.id,
                        label: b.name,
                      })
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

  const personEinheitLabel =
    personForm &&
    einheiten.find((e) => e.id === personForm.einheitId)?.bezeichnung;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
          {einheiten.length === 1
            ? "1 Einheit"
            : `${einheiten.length} Einheiten`}
        </p>
        <button
          type="button"
          className="rounded-[9px] border border-border-default bg-white px-3 py-1.5 text-[12.5px] font-semibold text-text-secondary hover:border-accent/40 hover:text-accent"
          onClick={openEinheitForm}
        >
          ＋ Einheit
        </button>
      </div>

      {loading ? (
        <p className="py-6 text-center text-[13px] text-text-secondary">
          Wird geladen…
        </p>
      ) : einheiten.length === 0 ? (
        <PortalInboxEmpty
          title="Noch keine Einheiten"
          description="Legen Sie zuerst eine Einheit an — danach können Sie Mieter und Eigentümer zuordnen."
          compact
        />
      ) : (
        <ul className="space-y-2">
          {einheiten.map((u) => {
            const people = byEinheit.get(u.id) ?? [];
            const mieter = people.filter((p) => p.rolle !== "eigentuemer");
            const eigentuemer = people.filter((p) => p.rolle === "eigentuemer");
            const open = expandedId === u.id;
            const badge = people.length > 0 ? "belegt" : "leer";
            const meta = [
              u.etage?.trim() ? `Etage ${u.etage.trim()}` : null,
              u.wohnflaeche_m2 != null ? `${u.wohnflaeche_m2} m²` : null,
              eigentuemer.length
                ? `${eigentuemer.length} Eigentümer`
                : null,
              mieter.length ? `${mieter.length} Mieter` : null,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <li
                key={u.id}
                className="overflow-hidden rounded-xl border border-border-default bg-white"
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3.5 py-3 text-left"
                  onClick={() =>
                    setExpandedId((cur) => (cur === u.id ? null : u.id))
                  }
                >
                  {open ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-text-tertiary" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-text-tertiary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-text-primary">
                      {u.bezeichnung}
                    </p>
                    <p className="truncate text-[12px] text-text-secondary">
                      {meta || "Keine Personen"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      badge === "leer"
                        ? "bg-[#FBF1D6] text-[#8A5A06]"
                        : "bg-accent-light text-accent"
                    )}
                  >
                    {badge}
                  </span>
                </button>

                {open ? (
                  <div className="space-y-4 border-t border-border-light bg-[#fafaf9] px-3.5 py-3.5">
                    {renderPersonList(u, "eigentuemer", eigentuemer)}
                    {renderPersonList(u, "mieter", mieter)}
                    <button
                      type="button"
                      className="text-[12px] font-semibold text-red-600 hover:underline"
                      onClick={() =>
                        setConfirm({
                          kind: "einheit",
                          id: u.id,
                          label: u.bezeichnung,
                        })
                      }
                    >
                      Einheit entfernen
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <EinstellungenEditModal
        open={einheitFormOpen}
        title="Einheit anlegen"
        subtitle="Danach können Sie Mieter und Eigentümer dieser Einheit zuordnen."
        onClose={closeEinheitForm}
        onSave={() => void saveEinheit()}
        saving={einheitBusy}
        saveDisabled={!bezeichnung.trim()}
        saveLabel="Anlegen"
      >
        <EinstellungenEdField
          label="Bezeichnung"
          value={bezeichnung}
          onChange={setBezeichnung}
          placeholder="z. B. WE 12"
        />
        <EinstellungenEdField
          label="Etage (optional)"
          value={etage}
          onChange={setEtage}
          placeholder="z. B. 3. OG"
        />
        <EinstellungenEdField
          label="Wohnfläche m² (optional)"
          value={m2}
          onChange={setM2}
          placeholder="z. B. 68"
        />
      </EinstellungenEditModal>

      <EinstellungenEditModal
        open={Boolean(personForm)}
        title={
          personForm?.rolle === "eigentuemer"
            ? "Eigentümer hinzufügen"
            : "Mieter hinzufügen"
        }
        subtitle={
          personEinheitLabel
            ? `Einheit: ${personEinheitLabel}`
            : undefined
        }
        onClose={closePersonForm}
        onSave={() => void savePerson()}
        saving={personBusy}
        saveDisabled={!canSubmitPerson}
        saveLabel="Hinzufügen"
      >
        <div className="grid grid-cols-2 gap-2">
          <EinstellungenEdField
            label="Vorname"
            value={vorname}
            onChange={setVorname}
            autoComplete="given-name"
          />
          <EinstellungenEdField
            label="Nachname"
            value={nachname}
            onChange={setNachname}
            autoComplete="family-name"
          />
        </div>
        <EinstellungenEdField
          label="E-Mail (optional)"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <EinstellungenEdField
          label="Telefon (optional)"
          type="tel"
          value={telefon}
          onChange={setTelefon}
          autoComplete="tel"
        />
        {personForm?.rolle === "eigentuemer" ? (
          <EinstellungenToggle
            checked={seVerwaltung}
            onChange={setSeVerwaltung}
            title="Sondereigentumsverwaltung durch HV"
            description="Ja = HV führt SE-Aufträge; Freigabe über Schwelle beim Eigentümer."
          />
        ) : (
          <EinstellungenEdField
            label="Miet-Hinweis (optional)"
            value={mieteHinweis}
            onChange={setMieteHinweis}
            placeholder="z. B. seit 2022"
          />
        )}
      </EinstellungenEditModal>

      <PortalConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm?.kind === "einheit"
            ? "Einheit entfernen?"
            : "Person entfernen?"
        }
        description={
          confirm?.kind === "einheit"
            ? `„${confirm.label}“ wirklich entfernen? Zugeordnete Personen werden mitentfernt.`
            : confirm
              ? `„${confirm.label}“ wirklich entfernen? Vorgänge bleiben erhalten.`
              : ""
        }
        confirmLabel="Entfernen"
        confirmVariant="danger"
        loading={busyId != null}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.kind === "einheit") void removeEinheit(confirm.id);
          else void removePerson(confirm.id);
        }}
        onCancel={() => {
          if (busyId) return;
          setConfirm(null);
        }}
      />
    </div>
  );
}
