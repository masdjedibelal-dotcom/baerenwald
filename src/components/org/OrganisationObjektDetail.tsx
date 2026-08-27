"use client";

import { useEffect, useMemo, useState } from "react";

import { OrganisationObjektFinanzPanel } from "@/components/org/OrganisationObjektFinanzPanel";
import { OrganisationObjektPruefpflichtenPanel } from "@/components/org/OrganisationObjektPruefpflichtenPanel";
import { OrganisationObjektAnlagenPanel } from "@/components/org/OrganisationObjektAnlagenPanel";
import { OrganisationObjektDokumentePanel } from "@/components/org/OrganisationObjektDokumentePanel";
import { OrganisationObjektEinheitenTab } from "@/components/org/OrganisationObjektEinheitenTab";
import { OrganisationObjektHistoriePanel } from "@/components/org/OrganisationObjektHistoriePanel";
import { OrganisationObjektHausmeisterMenu } from "@/components/org/OrganisationObjektHausmeisterMenu";
import { OrganisationObjektKontaktePanel } from "@/components/org/OrganisationObjektKontaktePanel";
import { PortalConfirmDialog } from "@/components/shared/PortalDetailUi";
import { PortalDetailCover } from "@/components/shared/PortalDetailCover";
import { PortalDetailHead } from "@/components/shared/PortalDetailUi";
import { PortalDetailTabs } from "@/components/shared/PortalDetailTabs";
import { PortalInboxEmpty } from "@/components/shared/PortalEmptyState";
import { usePortalBusy } from "@/components/shared/PortalBusyContext";
import {
  EinstellungenEdField,
  EinstellungenEditModal,
  EinstellungenEuroSlider,
  EinstellungenPfList,
  EinstellungenPfRow,
  EinstellungenSectionHeader,
  EinstellungenSheetCard,
  EinstellungenToggle,
} from "@/components/shared/PortalEinstellungenUi";
import { SofortmassnahmeAkutTitle } from "@/components/org/SofortmassnahmeFaelleLink";
import { PortalListCard } from "@/components/shared/PortalListCard";
import { leadBelongsToObjekt } from "@/lib/org/match-lead-objekt";
import { meldeKategorieLabel } from "@/lib/org/melde-kategorien";
import { meldeKategorieFromLead } from "@/lib/org/org-eingang-utils";
import type { ObjektAktePortalPayload } from "@/lib/org/objektakte/types";
import type { OrganisationLead, OrganisationObjekt } from "@/lib/org/types";
import type { PortalEinladungHvBlock } from "@/lib/portal2/portal-einladungen";
import {
  EINSTELLUNGEN_SCHWELLE_BETRAG_INTRO,
  EINSTELLUNGEN_SCHWELLE_BETRAG_TITLE,
  EINSTELLUNGEN_SCHWELLE_SLIDER_MAX,
  EINSTELLUNGEN_SCHWELLE_SLIDER_MIN,
  EINSTELLUNGEN_SCHWELLE_SLIDER_STEP,
  EINSTELLUNGEN_SCHWELLE_TITLE,
  EINSTELLUNGEN_UNTER_SCHWELLE_INTRO,
  EINSTELLUNGEN_UNTER_SCHWELLE_TITLE,
  formatEinstellungenSchwelle,
  snapEinstellungenSchwelle,
} from "@/lib/portal2/einstellungen";
import {
  decodeObjektMeta,
  formatObjektPlzOrt,
  formatObjektStrasse,
  formatObjektTypLine,
  OBJ_DETAIL_TABS,
  parseEinheitenCount,
  type ObjDetailTabId,
} from "@/lib/portal2/objekte";
import type { PortalDetailTab } from "@/components/shared/PortalDetailTabs";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";
import {
  HAUSMEISTER_PORTAL_STATUS_LABEL,
  resolveHausmeisterPortalStatus,
} from "@/lib/org/objekt-hausmeister";
import {
  plattformStatusLabel,
  plattformStatusPillClass,
  resolvePlattformStatus,
} from "@/lib/vorgang/plattform-status";

type Props = {
  objekt: OrganisationObjekt;
  leads: OrganisationLead[];
  offenCount: number;
  onBack: () => void;
  onEdit: () => void;
  onRefresh: () => void;
  /** Öffnet den Vorgang in der Listenansicht (Vorgänge). */
  onOpenVorgang?: (leadId: string) => void;
  orgAnzeigename?: string | null;
  hv?: PortalEinladungHvBlock | null;
  dokumenteByLeadId?: Record<
    string,
    Array<{
      id: string;
      name: string;
      subtitle?: string;
      datum?: string;
      href: string;
    }>
  >;
};

function dash(v: string) {
  return v.trim() || "—";
}

export function OrganisationObjektDetail({
  objekt,
  leads,
  offenCount,
  onBack,
  onEdit,
  onRefresh,
  onOpenVorgang,
  orgAnzeigename,
  hv,
  dokumenteByLeadId = {},
}: Props) {
  const { runBusy } = usePortalBusy();
  const [tab, setTab] = useState<ObjDetailTabId>("stamm");
  const [pruefpflichtBadge, setPruefpflichtBadge] = useState(0);
  const [schwelleAktiv, setSchwelleAktiv] = useState(
    () =>
      objekt.freigabe_schwelle_eur != null &&
      Number(objekt.freigabe_schwelle_eur) > 0
  );
  const [schwelle, setSchwelle] = useState(() =>
    snapEinstellungenSchwelle(
      objekt.freigabe_schwelle_eur != null &&
        Number(objekt.freigabe_schwelle_eur) > 0
        ? Number(objekt.freigabe_schwelle_eur)
        : 500
    )
  );
  const [akutDirekt, setAkutDirekt] = useState(
    objekt.notfall_direkt == null ? true : Boolean(objekt.notfall_direkt)
  );
  const [freigabeEditOpen, setFreigabeEditOpen] = useState(false);
  const [editSchwelle, setEditSchwelle] = useState(schwelle);
  const [editSchwelleAktiv, setEditSchwelleAktiv] = useState(schwelleAktiv);
  const [editAkut, setEditAkut] = useState(akutDirekt);
  const [freigabeSaving, setFreigabeSaving] = useState(false);

  const meta = useMemo(
    () => decodeObjektMeta(objekt.notizen_intern),
    [objekt.notizen_intern]
  );

  const detailTabs = useMemo((): readonly PortalDetailTab[] => {
    return OBJ_DETAIL_TABS.map((t) =>
      t.id === "pruefpflichten" && pruefpflichtBadge > 0
        ? { ...t, badge: pruefpflichtBadge }
        : t
    );
  }, [pruefpflichtBadge]);

  useEffect(() => {
    let cancelled = false;
    void fetch(
      `/api/org/objekte/pruefpflichten-summary`
    )
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { byObjektId?: Record<string, number> };
      })
      .then((json) => {
        if (!cancelled) {
          setPruefpflichtBadge(json?.byObjektId?.[objekt.id] ?? 0);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [objekt.id]);

  const [hmOptions, setHmOptions] = useState<
    Array<{
      id: string;
      name: string;
      email?: string | null;
      portal_zugang?: boolean;
    }>
  >([]);
  const [hmAmObjekt, setHmAmObjekt] = useState<{
    id: string;
    name: string;
    email?: string | null;
    portal_zugang?: boolean;
  } | null>(null);
  const [hmEditOpen, setHmEditOpen] = useState(false);
  const [hmMode, setHmMode] = useState<"existing" | "new">("existing");
  const [editHmId, setEditHmId] = useState("");
  const [editHmName, setEditHmName] = useState("");
  const [editHmEmail, setEditHmEmail] = useState("");
  const [editHmPortal, setEditHmPortal] = useState(false);
  const [hmSaving, setHmSaving] = useState(false);
  const [hmConfirmRemove, setHmConfirmRemove] = useState(false);

  const [versicherer, setVersicherer] = useState(objekt.versicherer ?? "");
  const [objVersNr, setObjVersNr] = useState(objekt.versicherungs_nr ?? "");
  const [selbstbehalt, setSelbstbehalt] = useState(
    objekt.selbstbehalt_eur != null ? String(objekt.selbstbehalt_eur) : ""
  );
  const [autoSchadenakte, setAutoSchadenakte] = useState(
    Boolean(objekt.automatische_schadenakte)
  );
  const [versEditOpen, setVersEditOpen] = useState(false);
  const [editVersicherer, setEditVersicherer] = useState("");
  const [editVersNr, setEditVersNr] = useState("");
  const [editSelbstbehalt, setEditSelbstbehalt] = useState("");
  const [editAutoSchadenakte, setEditAutoSchadenakte] = useState(false);
  const [versSaving, setVersSaving] = useState(false);

  const [akte, setAkte] = useState<ObjektAktePortalPayload | null>(null);
  const [akteLoading, setAkteLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch(
      `/api/org/hausmeister?objektId=${encodeURIComponent(objekt.id)}`
    )
      .then((r) => r.json())
      .then(
        (j: {
          hausmeister?: Array<{
            id: string;
            name: string;
            email?: string | null;
            portal_zugang?: boolean;
          }>;
          amObjekt?: {
            id: string;
            name: string;
            email?: string | null;
            portal_zugang?: boolean;
          } | null;
        }) => {
          if (cancelled) return;
          setHmOptions(j.hausmeister ?? []);
          setHmAmObjekt(j.amObjekt ?? null);
        }
      )
      .catch(() => {
        if (!cancelled) {
          setHmOptions([]);
          setHmAmObjekt(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [objekt.id]);

  useEffect(() => {
    let cancelled = false;
    setAkteLoading(true);
    void fetch(`/api/org/objekte/akte?objektId=${encodeURIComponent(objekt.id)}`)
      .then((r) => r.json())
      .then((j: ObjektAktePortalPayload & { error?: string }) => {
        if (cancelled) return;
        if ("error" in j && j.error) {
          setAkte({ anlagen: [], historie: [], kpis: {
            vorgaengeGesamt: 0,
            offenInArbeit: 0,
            kostenLaufendesJahr: 0,
            kostenOhneAngabeImJahr: 0,
            anlagenAnzahl: 0,
            nachGewerk: [],
          }});
          return;
        }
        setAkte({
          anlagen: j.anlagen ?? [],
          historie: j.historie ?? [],
          kpis: j.kpis ?? {
            vorgaengeGesamt: 0,
            offenInArbeit: 0,
            kostenLaufendesJahr: 0,
            kostenOhneAngabeImJahr: 0,
            anlagenAnzahl: 0,
            nachGewerk: [],
          },
        });
      })
      .catch(() => {
        if (!cancelled) {
          setAkte({
            anlagen: [],
            historie: [],
            kpis: {
              vorgaengeGesamt: 0,
              offenInArbeit: 0,
              kostenLaufendesJahr: 0,
              kostenOhneAngabeImJahr: 0,
              anlagenAnzahl: 0,
              nachGewerk: [],
            },
          });
        }
      })
      .finally(() => {
        if (!cancelled) setAkteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [objekt.id]);

  useEffect(() => {
    const aktiv =
      objekt.freigabe_schwelle_eur != null &&
      Number(objekt.freigabe_schwelle_eur) > 0;
    setSchwelleAktiv(aktiv);
    setSchwelle(
      snapEinstellungenSchwelle(
        aktiv && objekt.freigabe_schwelle_eur != null
          ? Number(objekt.freigabe_schwelle_eur)
          : 500
      )
    );
    setAkutDirekt(
      objekt.notfall_direkt == null ? true : Boolean(objekt.notfall_direkt)
    );
    setVersicherer(objekt.versicherer ?? "");
    setObjVersNr(objekt.versicherungs_nr ?? "");
    setSelbstbehalt(
      objekt.selbstbehalt_eur != null ? String(objekt.selbstbehalt_eur) : ""
    );
    setAutoSchadenakte(Boolean(objekt.automatische_schadenakte));
  }, [
    objekt.freigabe_schwelle_eur,
    objekt.notfall_direkt,
    objekt.versicherer,
    objekt.versicherungs_nr,
    objekt.selbstbehalt_eur,
    objekt.automatische_schadenakte,
    objekt.id,
  ]);

  const typLine = formatObjektTypLine(objekt);
  const plzOrt = formatObjektPlzOrt(objekt) || "—";
  const strasse = formatObjektStrasse(objekt) || "—";
  const adresseLine = [strasse, plzOrt]
    .filter((x) => x && x !== "—")
    .join(", ");
  const we =
    typeof objekt.einheitenCount === "number" && objekt.einheitenCount > 0
      ? objekt.einheitenCount
      : parseEinheitenCount(objekt.einheiten_hinweis);

  const objektLeads = useMemo(
    () => leads.filter((l) => leadBelongsToObjekt(l, objekt)),
    [leads, objekt]
  );

  function openHmEdit() {
    if (hmAmObjekt?.id) {
      setHmMode("existing");
      setEditHmId(hmAmObjekt.id);
      setEditHmName(hmAmObjekt.name);
      setEditHmEmail(hmAmObjekt.email ?? "");
      setEditHmPortal(Boolean(hmAmObjekt.portal_zugang));
    } else {
      setHmMode("new");
      setEditHmId("");
      setEditHmName("");
      setEditHmEmail("");
      setEditHmPortal(false);
    }
    setHmEditOpen(true);
  }

  function closeHmEdit() {
    if (hmSaving) return;
    setHmEditOpen(false);
  }

  async function saveHmEdit() {
    const name = editHmName.trim();
    if (!name && hmMode === "new") {
      portalToastError("Name fehlt");
      return;
    }
    if (editHmPortal && !editHmEmail.trim()) {
      portalToastError(
        "E-Mail fehlt",
        "Für Portal-Zugang bitte eine E-Mail angeben."
      );
      return;
    }
    setHmSaving(true);
    try {
      const body =
        hmMode === "existing" && editHmId
          ? {
              objektId: objekt.id,
              hausmeisterId: editHmId,
              name: name || undefined,
              email: editHmEmail.trim() || null,
              portalZugang: editHmPortal,
              invite: false,
            }
          : {
              objektId: objekt.id,
              name,
              email: editHmPortal ? editHmEmail.trim() : editHmEmail.trim() || null,
              portalZugang: editHmPortal,
              invite: editHmPortal,
            };
      const res = await fetch("/api/org/hausmeister", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        error?: string;
        inviteMailto?: string | null;
      };
      if (!res.ok) {
        portalToastError("Hausmeister nicht gespeichert", json.error);
        return;
      }
      setHmEditOpen(false);
      orgPortalToast.objektAktualisiert();
      if (json.inviteMailto) {
        window.location.href = json.inviteMailto;
      }
      onRefresh();
      const reload = await fetch(
        `/api/org/hausmeister?objektId=${encodeURIComponent(objekt.id)}`
      );
      const j = (await reload.json()) as {
        hausmeister?: typeof hmOptions;
        amObjekt?: typeof hmAmObjekt;
      };
      setHmOptions(j.hausmeister ?? []);
      setHmAmObjekt(j.amObjekt ?? null);
    } catch {
      portalToastError("Hausmeister nicht gespeichert");
    } finally {
      setHmSaving(false);
    }
  }

  async function inviteHausmeister() {
    if (!hmAmObjekt?.id) return;
    if (!hmAmObjekt.email?.trim()) {
      portalToastError(
        "Portal-Link nicht möglich",
        "Bitte zuerst eine E-Mail beim Hausmeister hinterlegen."
      );
      return;
    }
    await runBusy(async () => {
      const res = await fetch("/api/org/hausmeister", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objektId: objekt.id,
          hausmeisterId: hmAmObjekt.id,
          portalZugang: true,
          invite: true,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        inviteMailto?: string | null;
      };
      if (!res.ok) {
        portalToastError("Einladung fehlgeschlagen", json.error);
        return;
      }
      if (json.inviteMailto) {
        window.location.href = json.inviteMailto;
      } else {
        orgPortalToast.saved();
      }
      const reload = await fetch(
        `/api/org/hausmeister?objektId=${encodeURIComponent(objekt.id)}`
      );
      const j = (await reload.json()) as {
        hausmeister?: typeof hmOptions;
        amObjekt?: typeof hmAmObjekt;
      };
      setHmOptions(j.hausmeister ?? []);
      setHmAmObjekt(j.amObjekt ?? null);
    });
  }

  async function removeHausmeister() {
    setHmSaving(true);
    try {
      await runBusy(async () => {
        const res = await fetch(
          `/api/org/hausmeister?objektId=${encodeURIComponent(objekt.id)}`,
          { method: "DELETE" }
        );
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          portalToastError("Hausmeister nicht entfernt", json.error);
          return;
        }
        setHmAmObjekt(null);
        setHmConfirmRemove(false);
        orgPortalToast.objektAktualisiert();
        onRefresh();
      });
    } finally {
      setHmSaving(false);
    }
  }

  function openVersEdit() {
    setEditVersicherer(versicherer);
    setEditVersNr(objVersNr);
    setEditSelbstbehalt(selbstbehalt);
    setEditAutoSchadenakte(autoSchadenakte);
    setVersEditOpen(true);
  }

  function closeVersEdit() {
    if (versSaving) return;
    setVersEditOpen(false);
  }

  async function saveVersEdit() {
    setVersSaving(true);
    try {
      const sb = editSelbstbehalt.trim()
        ? Number(editSelbstbehalt.replace(",", "."))
        : null;
      const res = await fetch("/api/org/objekte", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: objekt.id,
          versicherer: editVersicherer.trim() || null,
          versicherungs_nr: editVersNr.trim() || null,
          selbstbehalt_eur: Number.isFinite(sb as number) ? sb : null,
          automatische_schadenakte: editAutoSchadenakte,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Versicherung nicht gespeichert", json.error);
        return;
      }
      setVersicherer(editVersicherer.trim());
      setObjVersNr(editVersNr.trim());
      setSelbstbehalt(
        Number.isFinite(sb as number) && sb != null ? String(sb) : ""
      );
      setAutoSchadenakte(editAutoSchadenakte);
      setVersEditOpen(false);
      orgPortalToast.objektAktualisiert();
      onRefresh();
    } catch {
      portalToastError("Versicherung nicht gespeichert");
    } finally {
      setVersSaving(false);
    }
  }

  function openFreigabeEdit() {
    setEditSchwelle(schwelle);
    setEditSchwelleAktiv(schwelleAktiv);
    setEditAkut(akutDirekt);
    setFreigabeEditOpen(true);
  }

  function closeFreigabeEdit() {
    if (freigabeSaving) return;
    setFreigabeEditOpen(false);
  }

  function onToggleUnterSchwelle(next: boolean) {
    setEditSchwelleAktiv(next);
    if (next && editSchwelle <= 0) {
      setEditSchwelle(500);
    }
  }

  async function saveFreigabeEdit() {
    setFreigabeSaving(true);
    try {
      const nextSchwelle = editSchwelleAktiv
        ? snapEinstellungenSchwelle(Math.max(editSchwelle, 500))
        : null;
      const res = await fetch("/api/org/objekte", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: objekt.id,
          freigabe_schwelle_eur: nextSchwelle,
          notfall_direkt: editAkut,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Freigabe-Regeln nicht gespeichert", json.error);
        return;
      }
      setSchwelleAktiv(editSchwelleAktiv);
      if (editSchwelleAktiv && nextSchwelle != null) setSchwelle(nextSchwelle);
      setAkutDirekt(editAkut);
      setFreigabeEditOpen(false);
      orgPortalToast.objektAktualisiert();
      onRefresh();
    } catch {
      portalToastError("Freigabe-Regeln nicht gespeichert");
    } finally {
      setFreigabeSaving(false);
    }
  }

  let body: React.ReactNode = null;

  if (tab === "stamm") {
    body = (
      <div className="space-y-6">
        {akteLoading ? (
          <p className="portal-text-meta text-text-tertiary px-0.5">
            Kennzahlen werden geladen …
          </p>
        ) : akte ? (
          <OrganisationObjektFinanzPanel
            objektId={objekt.id}
            dokumenteByLeadId={dokumenteByLeadId}
            onOpenVorgang={onOpenVorgang}
          />
        ) : null}

        <div className="space-y-3">
          <EinstellungenSectionHeader title="Objektdaten" onEdit={onEdit} />
          <EinstellungenPfList>
            <EinstellungenPfRow label="Bezeichnung" value={dash(objekt.titel)} />
            <EinstellungenPfRow label="Typ" value={dash(typLine)} />
            <EinstellungenPfRow
              label="Adresse"
              value={
                [strasse, plzOrt].filter((x) => x && x !== "—").join(", ") || "—"
              }
            />
            <EinstellungenPfRow
              label="Einheiten"
              value={we === 1 ? "1 Einheit" : `${we} Einheiten`}
            />
          </EinstellungenPfList>
        </div>

        <div className="space-y-3">
          <EinstellungenSectionHeader
            title="Hausmeister"
            onAdd={hmAmObjekt ? undefined : openHmEdit}
            addLabel="Hausmeister hinzufügen"
            onEdit={hmAmObjekt ? openHmEdit : undefined}
            editLabel="Hausmeister bearbeiten"
            trailing={
              hmAmObjekt ? (
                <OrganisationObjektHausmeisterMenu
                  canEinladen={Boolean(hmAmObjekt.email?.trim())}
                  onEinladen={() => void inviteHausmeister()}
                  onBearbeiten={openHmEdit}
                  onEntfernen={() => setHmConfirmRemove(true)}
                />
              ) : null
            }
          />
          <EinstellungenPfList>
            <EinstellungenPfRow
              label="Name"
              value={dash(hmAmObjekt?.name ?? "")}
            />
            <EinstellungenPfRow
              label="Portal"
              value={
                hmAmObjekt
                  ? HAUSMEISTER_PORTAL_STATUS_LABEL[
                      resolveHausmeisterPortalStatus(hmAmObjekt)
                    ]
                  : "—"
              }
            />
            <EinstellungenPfRow
              label="E-Mail"
              value={dash(hmAmObjekt?.email ?? "")}
            />
          </EinstellungenPfList>
          <EinstellungenEditModal
            open={hmEditOpen}
            title={hmAmObjekt ? "Hausmeister bearbeiten" : "Hausmeister hinzufügen"}
            onClose={closeHmEdit}
            onSave={() => void saveHmEdit()}
            saving={hmSaving}
          >
            <label className="block">
              <span className="portal-text-label mb-1.5 block text-text-secondary">
                Hausmeister
              </span>
              <select
                className="portal-field w-full"
                value={hmMode === "new" ? "__new__" : editHmId}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__new__") {
                    setHmMode("new");
                    setEditHmId("");
                    setEditHmName("");
                    setEditHmEmail("");
                    setEditHmPortal(false);
                  } else {
                    setHmMode("existing");
                    setEditHmId(v);
                    const found = hmOptions.find((h) => h.id === v);
                    if (found) {
                      setEditHmName(found.name);
                      setEditHmEmail(found.email ?? "");
                      setEditHmPortal(Boolean(found.portal_zugang));
                    }
                  }
                }}
              >
                <option value="">Bitte wählen…</option>
                {hmOptions.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
                <option value="__new__">＋ Neu anlegen</option>
              </select>
            </label>
            <EinstellungenEdField
              label="Name"
              value={editHmName}
              onChange={setEditHmName}
              placeholder="Max Mustermann"
              autoComplete="name"
            />
            <EinstellungenEdField
              label="E-Mail"
              type="email"
              value={editHmEmail}
              onChange={setEditHmEmail}
              placeholder="name@firma.de"
              autoComplete="email"
            />
            <label className="flex items-start gap-3 rounded-[10px] border border-border-light bg-white p-3">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={editHmPortal}
                onChange={(e) => setEditHmPortal(e.target.checked)}
              />
              <span className="text-[13px] text-text-secondary">
                {hmMode === "new"
                  ? "Portal einladen — Konto ist erst nach Registrierung über den Link aktiv"
                  : "Portal-Zugang — Einladung über das Menü (⋯) möglich"}
              </span>
            </label>
          </EinstellungenEditModal>
          <PortalConfirmDialog
            open={hmConfirmRemove}
            title="Hausmeister entfernen?"
            description={
              hmAmObjekt
                ? `${hmAmObjekt.name} wird von diesem Objekt entfernt. Die Person bleibt für andere Objekte erhalten.`
                : "Hausmeister von diesem Objekt entfernen?"
            }
            confirmLabel="Entfernen"
            confirmVariant="danger"
            loading={hmSaving}
            onCancel={() => setHmConfirmRemove(false)}
            onConfirm={() => void removeHausmeister()}
          />
        </div>

        <OrganisationObjektKontaktePanel objektId={objekt.id} />

        <div className="space-y-3">
          <EinstellungenSectionHeader
            title="Gebäudeversicherung"
            onEdit={openVersEdit}
          />
          <EinstellungenPfList>
            <EinstellungenPfRow label="Versicherer" value={dash(versicherer)} />
            <EinstellungenPfRow label="Policen-Nr." value={dash(objVersNr)} />
            <EinstellungenPfRow
              label="Selbstbehalt"
              value={
                selbstbehalt.trim()
                  ? `${selbstbehalt.trim().replace(".", ",")} €`
                  : "—"
              }
            />
            <EinstellungenPfRow
              label="Automatische Schadenakte"
              value={autoSchadenakte ? "Ein" : "Aus"}
            />
          </EinstellungenPfList>
          <EinstellungenEditModal
            open={versEditOpen}
            title="Gebäudeversicherung bearbeiten"
            onClose={closeVersEdit}
            onSave={() => void saveVersEdit()}
            saving={versSaving}
          >
            <EinstellungenEdField
              label="Versicherer"
              value={editVersicherer}
              onChange={setEditVersicherer}
              placeholder="z. B. Allianz"
            />
            <EinstellungenEdField
              label="Policen-Nr."
              value={editVersNr}
              onChange={setEditVersNr}
              placeholder="Police / Vertragsnummer"
            />
            <EinstellungenEdField
              label="Selbstbehalt (€)"
              value={editSelbstbehalt}
              onChange={setEditSelbstbehalt}
              placeholder="0"
            />
            <EinstellungenToggle
              checked={editAutoSchadenakte}
              onChange={setEditAutoSchadenakte}
              title="Automatische Schadenakte"
              description={
                editAutoSchadenakte
                  ? "Ein: Bei jeder Schadenmeldung an diesem Objekt wird die Akte erzeugt und unter Dokumente abgelegt. Mit Hausmeister-Prüfung erst nach Befund."
                  : "Aus: Keine automatische Schadenakte."
              }
            />
          </EinstellungenEditModal>
        </div>
      </div>
    );
  } else if (tab === "anlagen") {
    body = akteLoading ? (
      <p className="portal-text-meta text-text-tertiary px-0.5">
        Anlagen werden geladen …
      </p>
    ) : (
      <OrganisationObjektAnlagenPanel anlagen={akte?.anlagen ?? []} />
    );
  } else if (tab === "pruefpflichten") {
    body = <OrganisationObjektPruefpflichtenPanel objektId={objekt.id} />;
  } else if (tab === "historie") {
    body = akteLoading ? (
      <p className="portal-text-meta text-text-tertiary px-0.5">
        Historie wird geladen …
      </p>
    ) : (
      <OrganisationObjektHistoriePanel
        rows={akte?.historie ?? []}
        anlagen={akte?.anlagen ?? []}
        onOpenVorgang={onOpenVorgang}
      />
    );
  } else if (tab === "einheiten") {
    body = (
      <OrganisationObjektEinheitenTab
        objektId={objekt.id}
        objektLabel={objekt.titel?.trim() || "Objekt"}
        orgAnzeigename={orgAnzeigename}
        hv={hv}
        onGotoVorgaenge={() => setTab("vorgaenge")}
        onEinheitenChange={onRefresh}
      />
    );
  } else if (tab === "vorgaenge") {
    body = (
      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-2 px-0.5">
          <p className="portal-text-section">
            Vorgänge ({objektLeads.length})
          </p>
          <p className="portal-text-meta text-text-tertiary">{offenCount} offen</p>
        </div>
        {objektLeads.length === 0 ? (
          <PortalInboxEmpty title="Noch keine Daten" compact />
        ) : (
          objektLeads.map((l) => {
            const kat = meldeKategorieLabel(
              meldeKategorieFromLead(l) ?? undefined
            );
            const adresse = [l.strasse, l.hausnummer]
              .filter(Boolean)
              .join(" ");
            const weLabel = l.melder_einheit?.trim()
              ? /^(WE|Whg)/i.test(l.melder_einheit.trim())
                ? l.melder_einheit.trim()
                : `WE ${l.melder_einheit.trim()}`
              : undefined;
            const person = l.melder_name?.trim() || undefined;
            const subtitle = [
              adresse || objekt.titel || "Objekt",
              weLabel,
              person,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <PortalListCard
                key={l.id}
                variant="card"
                selected={false}
                onClick={() => onOpenVorgang?.(l.id)}
                title={kat}
                subtitle={subtitle}
                statusLabel={plattformStatusLabel(resolvePlattformStatus(l))}
                statusPillClass={plattformStatusPillClass(
                  resolvePlattformStatus(l)
                )}
                accent="anfrage"
                meta={[]}
                showChevron
              />
            );
          })
        )}
      </div>
    );
  } else if (tab === "regeln") {
    body = (
      <div className="space-y-3">
        <EinstellungenSectionHeader
          title={EINSTELLUNGEN_SCHWELLE_TITLE}
          onEdit={openFreigabeEdit}
        />
        <EinstellungenPfList>
          <EinstellungenPfRow
            label={<SofortmassnahmeAkutTitle />}
            value={akutDirekt ? "Ja" : "Nein"}
          />
          <EinstellungenPfRow
            label={EINSTELLUNGEN_UNTER_SCHWELLE_TITLE}
            value={schwelleAktiv ? "Ja" : "Nein"}
          />
          {schwelleAktiv ? (
            <EinstellungenPfRow
              label={EINSTELLUNGEN_SCHWELLE_BETRAG_TITLE}
              value={formatEinstellungenSchwelle(schwelle)}
            />
          ) : null}
        </EinstellungenPfList>

        <EinstellungenEditModal
          open={freigabeEditOpen}
          title={EINSTELLUNGEN_SCHWELLE_TITLE}
          onClose={closeFreigabeEdit}
          onSave={() => void saveFreigabeEdit()}
          saving={freigabeSaving}
        >
          <EinstellungenToggle
            checked={editAkut}
            onChange={setEditAkut}
            title={<SofortmassnahmeAkutTitle />}
            description={
              editAkut
                ? "Aktiv: Die in den Einstellungen ausgewählten Sofortmaßnahme-Fälle gehen ohne Freigabe (nur Info)."
                : "Aus: Auch Sofortmaßnahmen an diesem Objekt brauchen Freigabe."
            }
          />
          <EinstellungenToggle
            checked={editSchwelleAktiv}
            onChange={onToggleUnterSchwelle}
            title={EINSTELLUNGEN_UNTER_SCHWELLE_TITLE}
            description={
              editSchwelleAktiv
                ? EINSTELLUNGEN_UNTER_SCHWELLE_INTRO
                : "Aus: Jedes Angebot braucht Ihre Freigabe, unabhängig vom Betrag."
            }
          />
          {editSchwelleAktiv ? (
            <EinstellungenSheetCard
              title={EINSTELLUNGEN_SCHWELLE_BETRAG_TITLE}
              description={EINSTELLUNGEN_SCHWELLE_BETRAG_INTRO}
            >
              <EinstellungenEuroSlider
                value={editSchwelle}
                min={Math.max(EINSTELLUNGEN_SCHWELLE_SLIDER_MIN, 500)}
                max={EINSTELLUNGEN_SCHWELLE_SLIDER_MAX}
                step={EINSTELLUNGEN_SCHWELLE_SLIDER_STEP}
                formatValue={formatEinstellungenSchwelle}
                onChange={(v) =>
                  setEditSchwelle(snapEinstellungenSchwelle(Math.max(v, 500)))
                }
              />
            </EinstellungenSheetCard>
          ) : null}
        </EinstellungenEditModal>
      </div>
    );
  } else {
    body = (
      <OrganisationObjektDokumentePanel
        key={objekt.id}
        objekt={objekt}
        leads={objektLeads}
        dokumenteByLeadId={dokumenteByLeadId}
        onOpenVorgang={onOpenVorgang}
      />
    );
  }

  return (
    <div className="-mx-4 -mt-5 min-w-0 lg:-mx-6 lg:-mt-7">
      <PortalDetailCover
        coverUrl={objekt.cover_url}
        onBack={onBack}
        backLabel="← Objekte"
        onEdit={onEdit}
      />

      <div className="mt-4 mb-5 space-y-4 px-4 lg:px-6">
        <PortalDetailHead
          title={objekt.titel}
          metaLine={adresseLine || undefined}
        />

        <PortalDetailTabs
          tabs={detailTabs}
          activeId={tab}
          onChange={(id) => setTab(id as ObjDetailTabId)}
          navLabel="Objekt-Abschnitte"
        >
          {body}
        </PortalDetailTabs>
      </div>
    </div>
  );
}
