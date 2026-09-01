"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { OrganisationObjektMieterMenu } from "@/components/org/OrganisationObjektMieterMenu";
import { PortalConfirmDialog } from "@/components/shared/PortalDetailUi";
import {
  PortalInviteMailtoSheet,
  type PortalInviteMailtoReady,
} from "@/components/shared/PortalInviteMailtoSheet";
import { PortalInboxEmpty } from "@/components/shared/PortalEmptyState";
import {
  PortalActionMenu,
  type PortalActionMenuItem,
} from "@/components/shared/PortalActionMenu";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import {
  EinstellungenEdField,
  EinstellungenEditModal,
  EinstellungenSectionHeader,
  EinstellungenToggle,
} from "@/components/shared/PortalEinstellungenUi";
import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { PortalEntityCard } from "@/components/shared/PortalEntityCard";
import {
  OBJ_MIETER_PORTAL_STATUS,
  resolveObjMieterPortalStatus,
} from "@/lib/portal2/objekte";
import { buildPortalEinladungMailto } from "@/lib/portal2/portal-einladungen";
import type { PortalEinladungHvBlock } from "@/lib/portal2/portal-einladungen";
import { cn } from "@/lib/utils";
import {
  orgPortalToast,
  portalToastError,
} from "@/lib/shared/portal-toast";
import { usePortalBusy } from "@/components/shared/PortalBusyContext";
import { PortalInlineLoading } from "@/components/shared/PortalInlineLoading";

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
  objektLabel: string;
  orgAnzeigename?: string | null;
  hv?: PortalEinladungHvBlock | null;
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
  objektLabel,
  orgAnzeigename,
  hv,
  onGotoVorgaenge,
  onEinheitenChange,
}: Props) {
  const [einheiten, setEinheiten] = useState<Einheit[]>([]);
  const [bewohner, setBewohner] = useState<Bewohner[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [einheitForm, setEinheitForm] = useState<null | { mode: "create" }>(
    null
  );
  const [bezeichnung, setBezeichnung] = useState("");
  const [etage, setEtage] = useState("");
  const [m2, setM2] = useState("");
  const [einheitBusy, setEinheitBusy] = useState(false);

  const [personForm, setPersonForm] = useState<{
    einheitId: string;
    rolle: PersonRolle;
    editId?: string;
  } | null>(null);
  const [eigentuemerMode, setEigentuemerMode] = useState<"existing" | "new">(
    "new"
  );
  const [existingEigentuemerId, setExistingEigentuemerId] = useState("");
  const [orgEigentuemer, setOrgEigentuemer] = useState<
    Array<{
      key: string;
      name: string;
      email: string | null;
      telefon: string | null;
      sourceBewohnerId: string;
      sondereigentum_verwaltung: boolean;
      objektLabels: string[];
    }>
  >([]);
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [seVerwaltung, setSeVerwaltung] = useState(false);
  const [mieteHinweis, setMieteHinweis] = useState("");
  const [personBusy, setPersonBusy] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);
  const { runBusy } = usePortalBusy();
  const [inviteMailtoReady, setInviteMailtoReady] =
    useState<PortalInviteMailtoReady | null>(null);
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

  function closeEinheitForm() {
    if (einheitBusy) return;
    setEinheitForm(null);
  }

  /** Drafts für Detail-Sheet bei Wechsel der Einheit laden. */
  useEffect(() => {
    if (!detailId) return;
    const u = einheiten.find((e) => e.id === detailId);
    if (!u) return;
    setBezeichnung(u.bezeichnung);
    setEtage(u.etage?.trim() || "");
    setM2(u.wohnflaeche_m2 != null ? String(u.wohnflaeche_m2) : "");
    // Nur bei Einheiten-Wechsel syncen — nicht nach jedem Speichern/Reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- absichtlich nur detailId
  }, [detailId]);

  const detailDirty = Boolean(
    detailEinheit &&
      (bezeichnung.trim() !== detailEinheit.bezeichnung ||
        (etage.trim() || "") !== (detailEinheit.etage?.trim() || "") ||
        (m2.trim()
          ? Number(m2.replace(",", "."))
          : null) !== (detailEinheit.wohnflaeche_m2 ?? null))
  );

  async function saveEinheitCreate() {
    const label = bezeichnung.trim();
    if (!label || einheitForm?.mode !== "create") return;
    setEinheitBusy(true);
    try {
      await runBusy(async () => {
        const res = await fetch("/api/org/objekte/einheiten", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            objektId,
            bezeichnung: label,
            etage: etage.trim() || null,
            wohnflaeche_m2: m2.trim()
              ? Number(m2.replace(",", "."))
              : null,
          }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          portalToastError("Einheit nicht angelegt", json.error);
          return;
        }
        setEinheitForm(null);
        orgPortalToast.objektAktualisiert();
        await load();
        onEinheitenChange?.();
      });
    } finally {
      setEinheitBusy(false);
    }
  }

  async function saveDetailEinheit() {
    const label = bezeichnung.trim();
    if (!label || !detailEinheit) return;
    setEinheitBusy(true);
    try {
      await runBusy(async () => {
        const res = await fetch("/api/org/objekte/einheiten", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: detailEinheit.id,
            bezeichnung: label,
            etage: etage.trim() || null,
            wohnflaeche_m2: m2.trim()
              ? Number(m2.replace(",", "."))
              : null,
          }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          portalToastError("Einheit nicht gespeichert", json.error);
          return;
        }
        orgPortalToast.objektAktualisiert();
        await load();
        onEinheitenChange?.();
      });
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
    setExistingEigentuemerId("");
    setEigentuemerMode(rolle === "eigentuemer" ? "existing" : "new");
    setPersonForm({ einheitId, rolle });
    if (rolle === "eigentuemer") {
      void fetch(
        "/api/org/einheit-bewohner?scope=org&rolle=eigentuemer"
      )
        .then((r) => r.json())
        .then(
          (j: {
            eigentuemer?: Array<{
              key: string;
              name: string;
              email: string | null;
              telefon: string | null;
              sourceBewohnerId: string;
              sondereigentum_verwaltung: boolean;
              objektLabels: string[];
            }>;
          }) => {
            const list = j.eigentuemer ?? [];
            setOrgEigentuemer(list);
            setEigentuemerMode(list.length > 0 ? "existing" : "new");
          }
        )
        .catch(() => {
          setOrgEigentuemer([]);
          setEigentuemerMode("new");
        });
    } else {
      setOrgEigentuemer([]);
    }
  }

  function openPersonEdit(b: Bewohner) {
    const parts = splitName(b.name);
    setVorname(parts.vorname);
    setNachname(parts.nachname);
    setEmail(b.email?.trim() || "");
    setTelefon(b.telefon?.trim() || "");
    setSeVerwaltung(Boolean(b.sondereigentum_verwaltung));
    setMieteHinweis(b.miete_hinweis?.trim() || "");
    setEigentuemerMode("new");
    setExistingEigentuemerId("");
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

  const personEditing = Boolean(personForm?.editId);
  const assigningExistingEigentuemer =
    Boolean(personForm) &&
    !personEditing &&
    personForm?.rolle === "eigentuemer" &&
    eigentuemerMode === "existing";

  const canSubmitPerson = assigningExistingEigentuemer
    ? Boolean(existingEigentuemerId.trim())
    : vorname.trim().length > 0 && nachname.trim().length > 0;

  async function savePerson() {
    if (!personForm || !canSubmitPerson) return;
    setPersonBusy(true);
    try {
      await runBusy(async () => {
        const isEdit = Boolean(personForm.editId);

        if (assigningExistingEigentuemer) {
          const res = await fetch("/api/org/einheit-bewohner", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              einheitId: personForm.einheitId,
              existingBewohnerId: existingEigentuemerId,
              sondereigentum_verwaltung: seVerwaltung,
            }),
          });
          const json = (await res.json()) as { error?: string };
          if (!res.ok) {
            portalToastError("Zuordnung fehlgeschlagen", json.error);
            return;
          }
          setPersonForm(null);
          orgPortalToast.objektAktualisiert();
          await load();
          return;
        }

        const name = [vorname, nachname]
          .map((s) => s.trim())
          .filter(Boolean)
          .join(" ");
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
      });
    } finally {
      setPersonBusy(false);
    }
  }

  async function removeEinheit(id: string) {
    setBusyId(id);
    try {
      await runBusy(async () => {
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
      });
    } finally {
      setBusyId(null);
      setConfirm(null);
    }
  }

  async function removePerson(id: string) {
    setBusyId(id);
    try {
      await runBusy(async () => {
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
      });
    } finally {
      setBusyId(null);
      setConfirm(null);
    }
  }

  async function einladenPerson(b: Bewohner, einheitLabel: string) {
    setBusyId(b.id);
    try {
      await runBusy(async () => {
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
        const rolle =
          b.rolle === "eigentuemer" ? "eigentuemer" : "mieter";
        const rolleLabel =
          rolle === "eigentuemer" ? "Eigentümer" : "Mieter";
        const hvName =
          orgAnzeigename?.trim() || hv?.name?.trim() || "Ihre Verwaltung";
        const toEmail = b.email?.trim() || "";
        const mailto = buildPortalEinladungMailto({
          link: json.url,
          hvName,
          objektLabel: objektLabel.trim() || "Objekt",
          einheitRef: einheitLabel,
          toEmail: toEmail || null,
          rolle,
          hv: {
            name: hvName,
            strasse: hv?.strasse,
            hausnummer: hv?.hausnummer,
            plz: hv?.plz,
            ort: hv?.ort,
            telefon: hv?.telefon,
            email: hv?.email,
          },
        });
        try {
          await navigator.clipboard.writeText(json.url);
        } catch {
          /* Sheet bietet Kopieren */
        }
        setInviteMailtoReady({
          mailto,
          url: json.url,
          rolle: rolleLabel,
          toEmail: toEmail || null,
        });
      }, 500);
    } finally {
      setBusyId(null);
    }
  }

  function einheitMenuItems(u: Einheit): PortalActionMenuItem[] {
    return [
      {
        label: "Bearbeiten",
        onClick: () => setDetailId(u.id),
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
        <EinstellungenSectionHeader
          title={title}
          onAdd={() => openPersonCreate(einheit.id, rolle)}
          addLabel={`${title} hinzufügen`}
        />
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

  return (
    <div className="space-y-3">
      <PortalInviteMailtoSheet
        open={Boolean(inviteMailtoReady)}
        payload={inviteMailtoReady}
        onClose={() => setInviteMailtoReady(null)}
      />
      <PortalDetailCard
        title={
          einheiten.length === 1
            ? "1 Einheit"
            : `${einheiten.length} Einheiten`
        }
        onAdd={openEinheitCreate}
        addLabel="Einheit hinzufügen"
      >
      {loading ? (
        <PortalInlineLoading label="Einheiten werden geladen" />
      ) : einheiten.length === 0 ? (
        <PortalInboxEmpty title="Noch keine Einheiten" compact />
      ) : (
        <ul className="space-y-2">
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
              <li key={u.id}>
                <PortalEntityCard
                  title={u.bezeichnung}
                  badge={
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
                  }
                  meta={
                    <p className="truncate text-[13px] text-text-secondary">
                      {meta || "Keine Personen"}
                    </p>
                  }
                  onClick={() => setDetailId(u.id)}
                  menu={
                    <PortalActionMenu
                      title={u.bezeichnung}
                      items={einheitMenuItems(u)}
                      variant="popover"
                      triggerLabel="Einheit-Menü"
                    />
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
      </PortalDetailCard>

      <PortalModalShell
        open={Boolean(detailEinheit)}
        title={bezeichnung.trim() || detailEinheit?.bezeichnung || "Einheit"}
        subtitle="Bezeichnung, Etage und Fläche — Speichern unten."
        onClose={() => {
          if (einheitBusy) return;
          setDetailId(null);
        }}
        variant="edit"
        dirty={detailDirty && !einheitBusy}
        busy={einheitBusy}
        onConfirm={() => void saveDetailEinheit()}
        confirmLabel={einheitBusy ? "Speichern…" : "Speichern"}
        confirmDisabled={!bezeichnung.trim() || !detailDirty || einheitBusy}
      >
        {detailEinheit ? (
          <div className="space-y-5">
            <div className="space-y-3">
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
            </div>

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

        {/* Nested: Schließen nur eine Ebene → zurück zur Einheit-Card */}
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
          saveLabel={
            personEditing
              ? "Speichern"
              : assigningExistingEigentuemer
                ? "Zuordnen"
                : "Hinzufügen"
          }
        >
          {!personEditing && personForm?.rolle === "eigentuemer" ? (
            <>
              <p className="rounded-[10px] bg-muted px-3.5 py-2.5 text-[12.5px] leading-relaxed text-text-secondary">
                Bestehenden Eigentümer einer weiteren Einheit zuordnen oder
                neu anlegen.
              </p>
              {orgEigentuemer.length > 0 ? (
                <label className="block">
                  <span className="portal-text-label mb-1.5 block text-text-secondary">
                    Eigentümer
                  </span>
                  <select
                    className="portal-field w-full"
                    value={
                      eigentuemerMode === "new"
                        ? "__new__"
                        : existingEigentuemerId
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "__new__") {
                        setEigentuemerMode("new");
                        setExistingEigentuemerId("");
                        setVorname("");
                        setNachname("");
                        setEmail("");
                        setTelefon("");
                        setSeVerwaltung(false);
                        return;
                      }
                      setEigentuemerMode("existing");
                      setExistingEigentuemerId(v);
                      const found = orgEigentuemer.find(
                        (x) => x.sourceBewohnerId === v
                      );
                      if (found) {
                        const parts = splitName(found.name);
                        setVorname(parts.vorname);
                        setNachname(parts.nachname);
                        setEmail(found.email ?? "");
                        setTelefon(found.telefon ?? "");
                        setSeVerwaltung(found.sondereigentum_verwaltung);
                      }
                    }}
                  >
                    <option value="">Bitte wählen…</option>
                    {orgEigentuemer.map((p) => (
                      <option key={p.key} value={p.sourceBewohnerId}>
                        {p.name}
                        {p.objektLabels.length
                          ? ` (${p.objektLabels.slice(0, 2).join(", ")}${
                              p.objektLabels.length > 2 ? "…" : ""
                            })`
                          : ""}
                      </option>
                    ))}
                    <option value="__new__">＋ Neu anlegen</option>
                  </select>
                </label>
              ) : null}
            </>
          ) : null}

          {!assigningExistingEigentuemer ? (
            <>
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
            </>
          ) : (
            <div className="rounded-[10px] border border-border-light bg-white px-3.5 py-3 text-[13px] text-text-secondary">
              {(() => {
                const sel = orgEigentuemer.find(
                  (x) => x.sourceBewohnerId === existingEigentuemerId
                );
                if (!sel) {
                  return "Bitte einen bestehenden Eigentümer wählen.";
                }
                return (
                  <>
                    <p className="font-semibold text-text-primary">{sel.name}</p>
                    {sel.email ? (
                      <p className="mt-0.5">{sel.email}</p>
                    ) : null}
                    {sel.objektLabels.length ? (
                      <p className="mt-1 text-[12px]">
                        Bereits: {sel.objektLabels.join(" · ")}
                      </p>
                    ) : null}
                  </>
                );
              })()}
            </div>
          )}

          {personForm?.rolle === "eigentuemer" ? (
            <EinstellungenToggle
              checked={seVerwaltung}
              onChange={setSeVerwaltung}
              title="Sondereigentumsverwaltung durch HV"
              description="Ja = HV führt SE-Aufträge; Freigabe über Schwelle beim Eigentümer."
            />
          ) : !assigningExistingEigentuemer ? (
            <EinstellungenEdField
              label="Miet-Hinweis (optional)"
              value={mieteHinweis}
              onChange={setMieteHinweis}
              placeholder="z. B. seit 2022"
            />
          ) : null}
        </EinstellungenEditModal>
      </PortalModalShell>

      <EinstellungenEditModal
        open={einheitForm?.mode === "create"}
        title="Einheit anlegen"
        subtitle="Danach Mieter und Eigentümer zuordnen."
        onClose={closeEinheitForm}
        onSave={() => void saveEinheitCreate()}
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
