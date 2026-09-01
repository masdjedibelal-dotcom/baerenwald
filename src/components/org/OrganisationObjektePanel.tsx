"use client";

import { useEffect, useMemo, useState } from "react";

import "@/app/funnel-ui.css";

import { OrganisationObjektCard } from "@/components/org/OrganisationObjektCard";
import { OrganisationObjektCardActions } from "@/components/org/OrganisationObjektCardActions";
import { OrganisationObjektDetail } from "@/components/org/OrganisationObjektDetail";
import { OrganisationObjektWizard } from "@/components/org/OrganisationObjektWizard";
import { OrganisationMeldeQrModal } from "@/components/org/OrganisationMeldeQrModal";
import { PortalConfirmDialog } from "@/components/shared/PortalDetailUi";
import {
  PortalInviteMailtoSheet,
  type PortalInviteMailtoReady,
} from "@/components/shared/PortalInviteMailtoSheet";
import { PortalInboxEmpty } from "@/components/shared/PortalEmptyState";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { MockIcon } from "@/components/shared/MockIcon";
import {
  PortalListeEyebrow,
  PortalListeTitle,
} from "@/components/shared/PortalListeChrome";
import {
  copyMeldeLink,
  openMeldeAushangPdf,
} from "@/lib/org/melde-aushang-ui";
import {
  orgMeldeLegalUrlsReady,
  ORG_MELDE_LEGAL_REQUIRED_HINT,
} from "@/lib/org/melde-legal-urls";
import { aushangUrl } from "@/lib/portal2/aushang";
import type {
  OrganisationKunde,
  OrganisationLead,
  OrganisationObjekt,
} from "@/lib/org/types";
import {
  buildObjCardModel,
  countAktiveByObjektId,
  countOffeneByObjektId,
  nextObjektKopieName,
  objDeleteConfirm,
  objektHasActiveVorgaenge,
  OBJ_DELETE_BLOCKED,
  openObjEditDraft,
  resolveObjektTyp,
  type ObjWizDraft,
  type ObjWizPayload,
} from "@/lib/portal2/objekte";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";
import { usePortalBusy } from "@/components/shared/PortalBusyContext";
import { portalEinladungHvFromKunde } from "@/lib/portal2/portal-einladungen";

type Props = {
  objekte: OrganisationObjekt[];
  leads?: OrganisationLead[];
  angebote?: Array<{
    id: string;
    lead_id?: string | null;
    status?: string | null;
    status_einfach?: string | null;
    gesendet_am?: string | null;
    gesendet_kunde_at?: string | null;
    created_at?: string | null;
  }>;
  auftraege?: Array<{
    id: string;
    lead_id?: string | null;
    status?: string | null;
    created_at?: string | null;
    positionen?: Array<{
      handwerker_id?: string | null;
      handwerker_status?: string | null;
    }> | null;
  }>;
  orgKennung?: string | null;
  /** Für Aushang-Branding (A2 / E3) */
  kunde?: OrganisationKunde | null;
  onRefresh: () => void;
  /** Öffnet einen Vorgang in der Vorgänge-Liste. */
  onOpenVorgang?: (leadId: string) => void;
  /** Detail/Wizard offen → Parent kann Content volle Breite nutzen. */
  onDetailOpenChange?: (open: boolean) => void;
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

type Mode =
  | { kind: "list" }
  | { kind: "wizard"; editId?: string; draft?: ObjWizDraft }
  | { kind: "detail"; id: string };

function draftFromObjekt(
  o: OrganisationObjekt,
  defaultHv: string
): ObjWizDraft {
  return openObjEditDraft(o, defaultHv);
}

export function OrganisationObjektePanel({
  objekte,
  leads = [],
  angebote = [],
  auftraege = [],
  orgKennung,
  kunde,
  onRefresh,
  onOpenVorgang,
  onDetailOpenChange,
  dokumenteByLeadId = {},
}: Props) {
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [selected, setSelected] = useState<string[]>([]);
  const [qrModal, setQrModal] = useState<{
    objektId?: string;
    label: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [wizardBusy, setWizardBusy] = useState(false);
  const { runBusy } = usePortalBusy();
  const [inviteMailtoReady, setInviteMailtoReady] =
    useState<PortalInviteMailtoReady | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    | { kind: "delete"; objekt: OrganisationObjekt }
    | { kind: "bulk" }
    | null
  >(null);
  const [pruefFaelligById, setPruefFaelligById] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/org/objekte/pruefpflichten-summary")
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { byObjektId?: Record<string, number> };
      })
      .then((json) => {
        if (!cancelled && json?.byObjektId) {
          setPruefFaelligById(json.byObjektId);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [objekte.length]);

  useEffect(() => {
    onDetailOpenChange?.(mode.kind !== "list");
  }, [mode.kind, onDetailOpenChange]);

  const defaultHv =
    kunde?.org_anzeigename?.trim() || kunde?.name?.trim() || "";

  const einladungHv = useMemo(
    () => portalEinladungHvFromKunde(kunde),
    [kunde]
  );

  const offenById = useMemo(
    () => countOffeneByObjektId(leads, objekte, { angebote, auftraege }),
    [leads, objekte, angebote, auftraege]
  );

  const aktiveById = useMemo(
    () => countAktiveByObjektId(leads, objekte),
    [leads, objekte]
  );

  const copyObjektMeldeLink = async (o: OrganisationObjekt) => {
    if (!orgKennung || !kunde || !orgMeldeLegalUrlsReady(kunde)) return;
    const ok = await copyMeldeLink(
      aushangUrl(orgKennung, {
        melde_slug: o.melde_slug,
        titel: o.titel,
      })
    );
    if (ok) orgPortalToast.linkKopiert();
    else portalToastError("Kopieren fehlgeschlagen", "Bitte den Link manuell kopieren.");
  };

  const activeObjekt =
    mode.kind === "detail"
      ? (objekte.find((o) => o.id === mode.id) ?? null)
      : null;

  const toggleSel = (id: string) => {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  };

  const [hmOptions, setHmOptions] = useState<
    Array<{ id: string; name: string; email?: string | null }>
  >([]);

  useEffect(() => {
    void fetch("/api/org/hausmeister")
      .then((r) => r.json())
      .then((j: { hausmeister?: Array<{ id: string; name: string; email?: string | null }> }) => {
        setHmOptions(j.hausmeister ?? []);
      })
      .catch(() => setHmOptions([]));
  }, [mode.kind]);

  const persistPayload = async (
    payload: ObjWizPayload & {
      hmId?: string | null;
      hmName?: string;
      hmEmail?: string;
      hmPortalZugang?: boolean;
      hmMode?: "existing" | "new";
    },
    editId?: string
  ): Promise<string | null> => {
    const body = {
      titel: payload.titel,
      strasse: payload.strasse,
      hausnummer: payload.hausnummer,
      plz: payload.plz,
      ort: payload.ort,
      typ: payload.typ,
      einheiten_hinweis: payload.einheiten_hinweis,
      freigabe_schwelle_eur: payload.freigabe_schwelle_eur,
      notizen_intern: payload.notizen_intern,
      ...(editId ? { id: editId } : {}),
    };
    const res = await fetch("/api/org/objekte", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as {
      error?: string;
      objekt?: { id?: string };
    };
    if (!res.ok) {
      portalToastError(
        editId ? "Objekt nicht gespeichert" : "Objekt nicht angelegt",
        json.error
      );
      return null;
    }
    const objektId = json.objekt?.id ?? editId ?? null;
    if (objektId) {
      const hmRes = await fetch("/api/org/hausmeister", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objektId,
          hausmeisterId:
            payload.hmMode === "existing" ? payload.hmId : undefined,
          name:
            payload.hmMode === "new" || !payload.hmId
              ? payload.hmName
              : undefined,
          email: payload.hmPortalZugang ? payload.hmEmail : null,
          portalZugang: Boolean(payload.hmPortalZugang),
          invite: Boolean(payload.hmPortalZugang),
        }),
      });
      const hmJson = (await hmRes.json()) as {
        error?: string;
        inviteMailto?: string | null;
        inviteUrl?: string | null;
      };
      if (!hmRes.ok) {
        portalToastError("Hausmeister nicht gespeichert", hmJson.error);
      } else if (hmJson.inviteMailto) {
        setInviteMailtoReady({
          mailto: hmJson.inviteMailto,
          url: hmJson.inviteUrl,
          rolle: "Hausmeister",
          toEmail: payload.hmEmail?.trim() || null,
        });
      }
    }
    if (editId) orgPortalToast.objektAktualisiert();
    else orgPortalToast.objektAngelegt();
    return objektId;
  };

  const requestDeleteObjekt = (o: OrganisationObjekt) => {
    if (objektHasActiveVorgaenge(aktiveById[o.id] ?? 0)) {
      portalToastError("Löschen nicht möglich", OBJ_DELETE_BLOCKED);
      return;
    }
    setConfirmAction({ kind: "delete", objekt: o });
  };

  const deleteObjekt = async (o: OrganisationObjekt) => {
    setBusy(true);
    try {
      await runBusy(async () => {
        const res = await fetch(
          `/api/org/objekte?id=${encodeURIComponent(o.id)}`,
          { method: "DELETE" }
        );
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          portalToastError("Löschen fehlgeschlagen", json.error);
          return;
        }
        orgPortalToast.objektGeloescht();
        setSelected((s) => s.filter((x) => x !== o.id));
        setMode({ kind: "list" });
        onRefresh();
      });
    } finally {
      setBusy(false);
      setConfirmAction(null);
    }
  };

  const copyObjekt = async (o: OrganisationObjekt) => {
    setBusy(true);
    try {
      await runBusy(async () => {
        const name = nextObjektKopieName(
          o.titel,
          objekte.map((x) => x.titel)
        );
        const res = await fetch("/api/org/objekte", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titel: name,
            strasse: o.strasse,
            hausnummer: o.hausnummer,
            plz: o.plz,
            ort: o.ort,
            typ: resolveObjektTyp(o),
            einheiten_hinweis: o.einheiten_hinweis,
            freigabe_schwelle_eur: o.freigabe_schwelle_eur ?? null,
            notizen_intern: o.notizen_intern,
          }),
        });
        const json = (await res.json()) as {
          error?: string;
          objekt?: { id?: string };
        };
        if (!res.ok) {
          portalToastError("Kopieren fehlgeschlagen", json.error);
          return;
        }
        orgPortalToast.objektAngelegt();
        onRefresh();
        if (json.objekt?.id) {
          setMode({ kind: "detail", id: json.objekt.id });
        }
      });
    } finally {
      setBusy(false);
    }
  };

  const requestBulkDelete = () => {
    if (selected.length === 0) return;
    setConfirmAction({ kind: "bulk" });
  };

  const bulkDelete = async () => {
    if (selected.length === 0) return;
    setBusy(true);
    try {
      await runBusy(async () => {
        let blocked = 0;
        for (const id of selected) {
          const o = objekte.find((x) => x.id === id);
          if (!o) continue;
          if (objektHasActiveVorgaenge(aktiveById[id] ?? 0)) {
            blocked += 1;
            continue;
          }
          const res = await fetch(
            `/api/org/objekte?id=${encodeURIComponent(id)}`,
            { method: "DELETE" }
          );
          if (!res.ok) blocked += 1;
        }
        if (blocked > 0) {
          portalToastError(
            "Teilweise nicht gelöscht",
            `${blocked} Objekt(e) hatten offene Vorgänge oder einen Fehler.`
          );
        } else {
          orgPortalToast.objektGeloescht();
        }
        setSelected([]);
        onRefresh();
      });
    } finally {
      setBusy(false);
      setConfirmAction(null);
    }
  };

  const confirmDialog = (
    <PortalConfirmDialog
      open={confirmAction != null}
      title={
        confirmAction?.kind === "bulk" ? "Objekte löschen?" : "Objekt löschen?"
      }
      description={
        confirmAction?.kind === "delete"
          ? objDeleteConfirm(confirmAction.objekt.titel)
          : `${selected.length} Objekt(e) wirklich löschen? Zugeordnete Vorgänge bleiben erhalten.`
      }
      confirmLabel="Löschen"
      confirmVariant="danger"
      loading={busy}
      onConfirm={() => {
        if (confirmAction?.kind === "delete") {
          void deleteObjekt(confirmAction.objekt);
        } else if (confirmAction?.kind === "bulk") {
          void bulkDelete();
        }
      }}
      onCancel={() => {
        if (!busy) setConfirmAction(null);
      }}
    />
  );

  if (mode.kind === "wizard") {
    const editObj = mode.editId
      ? objekte.find((o) => o.id === mode.editId)
      : null;
    const closeWizard = () =>
      setMode(
        mode.editId
          ? { kind: "detail", id: mode.editId }
          : { kind: "list" }
      );
    return (
      <PortalModalShell
        open
        title={mode.editId ? "Objekt bearbeiten" : "Objekt anlegen"}
        onClose={closeWizard}
        variant="funnel"
        maxWidth={560}
        busy={wizardBusy}
        busyTitle="Wird gespeichert…"
        busyBody="Objekt wird angelegt bzw. aktualisiert."
        closeOnBackdrop={!wizardBusy}
      >
        <OrganisationObjektWizard
          key={mode.editId ?? "new"}
          variant="modal"
          editMode={!!mode.editId}
          initialDraft={mode.draft}
          existingNotizen={editObj?.notizen_intern}
          defaultHv={defaultHv}
          hausmeisterOptions={hmOptions}
          onCancel={closeWizard}
          onDone={async (payload) => {
            setWizardBusy(true);
            try {
              await runBusy(async () => {
                const id = await persistPayload(payload, mode.editId);
                onRefresh();
                if (id) setMode({ kind: "detail", id });
                else setMode({ kind: "list" });
              });
            } finally {
              setWizardBusy(false);
            }
          }}
        />
      </PortalModalShell>
    );
  }

  if (mode.kind === "detail") {
    if (!activeObjekt) {
      return (
        <div className="space-y-3 py-8 text-center">
          <p className="portal-text-body text-text-secondary">
            Objekt wird geladen…
          </p>
          <button
            type="button"
            className="text-[13px] font-semibold text-accent"
            onClick={() => setMode({ kind: "list" })}
          >
            ‹ Zurück zur Liste
          </button>
        </div>
      );
    }
    return (
      <>
        <OrganisationObjektDetail
          objekt={activeObjekt}
          leads={leads}
          offenCount={offenById[activeObjekt.id] ?? 0}
          onBack={() => setMode({ kind: "list" })}
          onEdit={() =>
            setMode({
              kind: "wizard",
              editId: activeObjekt.id,
              draft: draftFromObjekt(activeObjekt, defaultHv),
            })
          }
          onRefresh={onRefresh}
          onOpenVorgang={onOpenVorgang}
          orgAnzeigename={defaultHv || null}
          hv={einladungHv}
          dokumenteByLeadId={dokumenteByLeadId}
        />
        {confirmDialog}
      </>
    );
  }

  const empty = objekte.length === 0;

  return (
    <div className="space-y-4">
      <PortalInviteMailtoSheet
        open={Boolean(inviteMailtoReady)}
        payload={inviteMailtoReady}
        onClose={() => setInviteMailtoReady(null)}
      />
      <div className="relative flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          <PortalListeEyebrow>Verwaltung</PortalListeEyebrow>
          <PortalListeTitle>Objekte</PortalListeTitle>
        </div>
        <button
          type="button"
          className="portal-objekt-create"
          onClick={() =>
            setMode({
              kind: "wizard",
              draft: { hv: defaultHv, we: 1, schwelle: 500 },
            })
          }
        >
          <MockIcon n="plus" ctx="nav" size={16} className="text-white" />
          Objekt
        </button>
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-accent bg-accent-light px-3.5 py-2.5">
          <span className="text-[13px] font-bold text-accent">
            {selected.length} ausgewählt
          </span>
          <button
            type="button"
            disabled={busy}
            className="btn-pill-outline portal-btn-compact portal-danger ml-auto"
            onClick={() => requestBulkDelete()}
          >
            Löschen
          </button>
          <button
            type="button"
            className="btn-pill-outline portal-btn-compact"
            onClick={() => setSelected([])}
          >
            Auswahl aufheben
          </button>
        </div>
      ) : null}

      {empty ? (
        <PortalInboxEmpty
          title="Noch keine Objekte"
          description="Legen Sie Ihr erstes Gebäude an — Link und Aushang finden Sie danach im Detail."
          compact
        />
      ) : (
        <div className="portal-objekt-grid">
          {objekte.map((o) => {
            const isSel = selected.includes(o.id);
            const offen = offenById[o.id] ?? 0;
            const card = buildObjCardModel(
              o,
              offen,
              pruefFaelligById[o.id] ?? 0
            );
            const canAushang = !!(
              orgKennung &&
              o.melde_slug &&
              o.melde_aktiv &&
              kunde
            );
            const legalReady = kunde
              ? orgMeldeLegalUrlsReady(kunde)
              : false;
            const aushangBlockedHint =
              canAushang && !legalReady
                ? ORG_MELDE_LEGAL_REQUIRED_HINT
                : null;

            return (
              <OrganisationObjektCard
                key={o.id}
                card={card}
                selected={isSel}
                onOpen={() => setMode({ kind: "detail", id: o.id })}
                onToggleSelect={() => toggleSel(o.id)}
                onCoverUploaded={() => onRefresh()}
                actions={
                  <OrganisationObjektCardActions
                    canAushang={canAushang && legalReady}
                    aushangBlockedHint={aushangBlockedHint}
                    onAushangPdf={() => openMeldeAushangPdf(o.id)}
                    onQrCode={() =>
                      setQrModal({ objektId: o.id, label: o.titel })
                    }
                    onLinkKopieren={() => void copyObjektMeldeLink(o)}
                    onBearbeiten={() =>
                      setMode({
                        kind: "wizard",
                        editId: o.id,
                        draft: draftFromObjekt(o, defaultHv),
                      })
                    }
                    onKopieren={() => void copyObjekt(o)}
                    onLoeschen={() => requestDeleteObjekt(o)}
                  />
                }
              />
            );
          })}
        </div>
      )}

      {confirmDialog}
      {qrModal ? (
        <OrganisationMeldeQrModal
          open
          onClose={() => setQrModal(null)}
          objektId={qrModal.objektId}
          label={qrModal.label}
        />
      ) : null}
    </div>
  );
}
