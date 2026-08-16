"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";

import { OrganisationObjektMieterMenu } from "@/components/org/OrganisationObjektMieterMenu";
import { PortalConfirmDialog } from "@/components/shared/PortalDetailUi";
import { PortalInboxEmpty } from "@/components/shared/PortalEmptyState";
import {
  PortalActionMenu,
  type PortalActionMenuItem,
} from "@/components/shared/PortalActionMenu";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import {
  EinstellungenEdField,
  EinstellungenEditModal,
  EinstellungenPfList,
  EinstellungenPfRow,
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

function splitName(full: string): { vorname: string; nachname: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { vorname: "", nachname: "" };
  if (parts.length === 1) return { vorname: parts[0]!, nachname: "" };
  return { vorname: parts[0]!, nachname: parts.slice(1).join(" ") };
}

/**
 * Objekt → Einheiten: flache Liste → Sheet/Slide-over (Mobil + Desktop).
 */
export function OrganisationObjektEinheitenTab({
  objektId,
  orgAnzeigename,
  onGotoVorgaenge,
  onEinheitenChange,
}: Props) {
  const [einheiten, setEinheiten] = useState<Einheit[]>([]);
  const [bewohner, setBewohner] = useState<Bewohner[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [einheitForm, setEinheitForm] = useState<
    null | { mode: "create" } | { mode: "edit"; id: string }
  >(null);
  const [bezeichnung, setBezeichnung] = useState("");
  const [etage, setEtage] = useState("");
  const [m2, setM2] = useState("");
  const [einheitBusy, setEinheitBusy] = useState(false);

  const [personForm, setPersonForm] = useState<{
    einheitId: string;
    rolle: PersonRolle;
    editId?: string;
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

  const detailEinheit = detailId
    ? (einheiten.find((e) => e.id === detailId) ?? null)
    : null;

  function openEinheitCreate() {
    setBezeichnung("");
    setEtage("");
    setM2("");
    setEinheitForm({ mode: "create" });
  }

  function openEinheitEdit(u: Einheit) {
    setBezeichnung(u.bezeichnung);
    setEtage(u.etage?.trim() || "");
    setM2(u.wohnflaeche_m2 != null ? String(u.wohnflaeche_m2) : "");
    setEinheitForm({ mode: "edit", id: u.id });
  }

  function closeEinheitForm() {
    if (einheitBusy) return;
    setEinheitForm(null);
  }

  async function saveEinheit() {
    const label = bezeichnung.trim();
    if (!label || !einheitForm) return;
    setEinheitBusy(true);
    try {
      const body =
        einheitForm.mode === "create"
          ? {
              objektId,
              bezeichnung: label,
              etage: etage.trim() || null,
              wohnflaeche_m2: m2.trim()
                ? Number(m2.replace(",", "."))
                : null,
            }
          : {
              id: einheitForm.id,
              bezeichnung: label,
              etage: etage.trim() || null,
              wohnflaeche_m2: m2.trim()
                ? Number(m2.replace(",", "."))
                : null,
            };
      const res = await fetch("/api/org/objekte/einheiten", {
        method: einheitForm.mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError(
          einheitForm.mode === "create"
            ? "Einheit nicht angelegt"
            : "Einheit nicht gespeichert",
          json.error
        );
        return;
      }
      setEinheitForm(null);
      orgPortalToast.objektAktualisiert();
      await load();
      onEinheitenChange?.();
    } finally {
      setEinheitBusy(false);
    }
  }

  function openPersonCreate(einheitId: string, rolle: PersonRolle) {
    setVorname("");
    setNachname("");
    setEmail("");
    setTelefon("");
    setSeVerwaltung(false);
    setMieteHinweis("");
    setPersonForm({ einheitId, rolle });
  }

  function openPersonEdit(b: Bewohner) {
    const parts = splitName(b.name);
    setVorname(parts.vorname);
    setNachname(parts.nachname);
    setEmail(b.email?.trim() || "");
    setTelefon(b.telefon?.trim() || "");
    setSeVerwaltung(Boolean(b.sondereigentum_verwaltung));
    setMieteHinweis(b.miete_hinweis?.trim() || "");
    setPersonForm({
      einheitId: b.objekt_einheit_id,
      rolle: b.rolle === "eigentuemer" ? "eigentuemer" : "mieter",
      editId: b.id,
    });
  }

  function closePersonForm() {
    if (personBusy) return;
    setPersonForm(null);
  }

  const canSubmitPerson =
    vorname.trim().length > 0 && nachname.trim().length > 0;

  async function savePerson() {
    if (!personForm || !canSubmitPerson) return;
    const name = [vorname, nachname]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");
    setPersonBusy(true);
    try {
      const isEdit = Boolean(personForm.editId);
      const res = await fetch("/api/org/einheit-bewohner", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? {
                id: personForm.editId,
                name,
                email: email.trim() || "",
                telefon: telefon.trim() || "",
                rolle: personForm.rolle,
                sondereigentum_verwaltung:
                  personForm.rolle === "eigentuemer" ? seVerwaltung : false,
                miete_hinweis:
                  personForm.rolle === "mieter"
                    ? mieteHinweis.trim() || null
                    : null,
              }
            : {
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
              }
        ),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError(
          isEdit ? "Speichern fehlgeschlagen" : "Anlegen fehlgeschlagen",
          json.error
        );
        return;
      }
      setPersonForm(null);
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
      if (detailId === id) setDetailId(null);
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

  function einheitMenuItems(u: Einheit): PortalActionMenuItem[] {
    return [
      {
        label: "Bearbeiten",
        onClick: () => openEinheitEdit(u),
      },
      {
        label: "Einheit entfernen",
        danger: true,
        dividerBefore: true,
        onClick: () =>
          setConfirm({
            kind: "einheit",
            id: u.id,
            label: u.bezeichnung,
          }),
      },
    ];
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
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-text-secondary">
            {title}
          </p>
          <button
            type="button"
            className="rounded-lg border border-border-default bg-white px-2.5 py-1 text-[12px] font-semibold text-text-secondary hover:border-accent/40 hover:text-accent"
            onClick={() => openPersonCreate(einheit.id, rolle)}
          >
            ＋ {title}
          </button>
        </div>
        {people.length === 0 ? (
          <p className="text-[13px] text-text-secondary">Noch keine {title}.</p>
        ) : (
          <ul className="divide-y divide-border-light rounded-xl border border-border-light bg-white">
            {people.map((b) => {
              const mail = b.email?.trim() || "";
              const tel = b.telefon?.trim() || "";
              const statusKey = resolveObjMieterPortalStatus({ email: mail });
              const status = OBJ_MIETER_PORTAL_STATUS[statusKey];
              const initial = (b.name.trim()[0] || "?").toUpperCase();
              const metaBits = [
                mail || null,
                tel || null,
                rolle === "eigentuemer"
                  ? b.sondereigentum_verwaltung
                    ? "SE-Verwaltung"
                    : null
                  : status,
                rolle === "mieter" && b.miete_hinweis?.trim()
                  ? b.miete_hinweis.trim()
                  : null,
              ].filter(Boolean);

              return (
                <li
                  key={b.id}
                  className="flex items-center gap-2.5 px-3 py-2.5"
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    onClick={() => openPersonEdit(b)}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-text-primary">
                      {initial}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-text-primary">
                        {b.name}
                      </p>
                      <p className="truncate text-[12.5px] text-text-secondary">
                        {metaBits.join(" · ") || "Keine Kontaktdaten"}
                      </p>
                    </div>
                  </button>
                  <OrganisationObjektMieterMenu
                    hasEmail={Boolean(mail)}
                    onEinladen={() =>
                      void einladenPerson(b, einheit.bezeichnung)
                    }
                    onVorgaenge={onGotoVorgaenge}
                    onBearbeiten={() => openPersonEdit(b)}
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

  const personEditing = Boolean(personForm?.editId);

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
          onClick={openEinheitCreate}
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
          description="Anzahl im Objekt-Stamm erhöhen — oder hier eine Einheit manuell anlegen."
          compact
        />
      ) : (
        <ul className="divide-y divide-border-light overflow-hidden rounded-xl border border-border-default bg-white">
          {einheiten.map((u) => {
            const people = byEinheit.get(u.id) ?? [];
            const mieter = people.filter((p) => p.rolle !== "eigentuemer");
            const eigentuemer = people.filter((p) => p.rolle === "eigentuemer");
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
              <li key={u.id} className="flex items-stretch">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 px-3.5 py-3 text-left hover:bg-muted/40"
                  onClick={() => setDetailId(u.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-semibold text-text-primary">
                      {u.bezeichnung}
                    </p>
                    <p className="truncate text-[13px] text-text-secondary">
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
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-text-tertiary"
                    aria-hidden
                  />
                </button>
                <div className="flex items-center border-l border-border-light px-1.5">
                  <PortalActionMenu
                    title={u.bezeichnung}
                    items={einheitMenuItems(u)}
                    variant="popover"
                    triggerLabel="Einheit-Menü"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <PortalModalShell
        open={Boolean(detailEinheit)}
        title={detailEinheit?.bezeichnung ?? "Einheit"}
        subtitle={
          detailEinheit
            ? [
                detailEinheit.etage?.trim()
                  ? `Etage ${detailEinheit.etage.trim()}`
                  : null,
                detailEinheit.wohnflaeche_m2 != null
                  ? `${detailEinheit.wohnflaeche_m2} m²`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ") || null
            : null
        }
        onClose={() => setDetailId(null)}
        variant="edit"
        headerExtra={
          detailEinheit ? (
            <PortalActionMenu
              title={detailEinheit.bezeichnung}
              items={einheitMenuItems(detailEinheit)}
              variant="popover"
              triggerLabel="Einheit-Menü"
            />
          ) : null
        }
      >
        {detailEinheit ? (
          <div className="space-y-5">
            <EinstellungenPfList>
              <EinstellungenPfRow
                label="Bezeichnung"
                value={detailEinheit.bezeichnung}
              />
              <EinstellungenPfRow
                label="Etage"
                value={detailEinheit.etage?.trim() || "—"}
              />
              <EinstellungenPfRow
                label="Wohnfläche"
                value={
                  detailEinheit.wohnflaeche_m2 != null
                    ? `${detailEinheit.wohnflaeche_m2} m²`
                    : "—"
                }
              />
            </EinstellungenPfList>

            {renderPersonList(
              detailEinheit,
              "eigentuemer",
              (byEinheit.get(detailEinheit.id) ?? []).filter(
                (p) => p.rolle === "eigentuemer"
              )
            )}
            {renderPersonList(
              detailEinheit,
              "mieter",
              (byEinheit.get(detailEinheit.id) ?? []).filter(
                (p) => p.rolle !== "eigentuemer"
              )
            )}
          </div>
        ) : null}
      </PortalModalShell>

      <EinstellungenEditModal
        open={Boolean(einheitForm)}
        title={
          einheitForm?.mode === "edit"
            ? "Einheit bearbeiten"
            : "Einheit anlegen"
        }
        subtitle={
          einheitForm?.mode === "edit"
            ? "Bezeichnung, Etage und Fläche."
            : "Danach Mieter und Eigentümer zuordnen."
        }
        onClose={closeEinheitForm}
        onSave={() => void saveEinheit()}
        saving={einheitBusy}
        saveDisabled={!bezeichnung.trim()}
        saveLabel={einheitForm?.mode === "edit" ? "Speichern" : "Anlegen"}
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
            ? personEditing
              ? "Eigentümer bearbeiten"
              : "Eigentümer hinzufügen"
            : personEditing
              ? "Mieter bearbeiten"
              : "Mieter hinzufügen"
        }
        subtitle={
          personEinheitLabel ? `Einheit: ${personEinheitLabel}` : undefined
        }
        onClose={closePersonForm}
        onSave={() => void savePerson()}
        saving={personBusy}
        saveDisabled={!canSubmitPerson}
        saveLabel={personEditing ? "Speichern" : "Hinzufügen"}
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
