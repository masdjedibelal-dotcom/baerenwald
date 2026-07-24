"use client";

import { useMemo, useState } from "react";

import "@/app/funnel-ui.css";

import { OrganisationObjektCard } from "@/components/org/OrganisationObjektCard";
import { OrganisationObjektCardActions } from "@/components/org/OrganisationObjektCardActions";
import { OrganisationObjektDetail } from "@/components/org/OrganisationObjektDetail";
import { OrganisationObjektWizard } from "@/components/org/OrganisationObjektWizard";
import { OrganisationMeldeQrModal } from "@/components/org/OrganisationMeldeQrModal";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import {
  copyMeldeLink,
  openMeldeAushangPdf,
} from "@/lib/org/melde-aushang-ui";
import { aushangUrl } from "@/lib/portal2/aushang";
import { PortalModalEinladen } from "@/components/shared/PortalModalEinladen";
import type {
  OrganisationKunde,
  OrganisationLead,
  OrganisationObjekt,
} from "@/lib/org/types";
import {
  buildObjCardModel,
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

type Props = {
  objekte: OrganisationObjekt[];
  leads?: OrganisationLead[];
  orgKennung?: string | null;
  /** Für Aushang-Branding (A2 / E3) */
  kunde?: OrganisationKunde | null;
  onRefresh: () => void;
  /** Öffnet einen Vorgang in der Vorgänge-Liste. */
  onOpenVorgang?: (leadId: string) => void;
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
  orgKennung,
  kunde,
  onRefresh,
  onOpenVorgang,
  dokumenteByLeadId = {},
}: Props) {
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [selected, setSelected] = useState<string[]>([]);
  const [einladenObjektId, setEinladenObjektId] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<{
    objektId?: string;
    label: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const defaultHv =
    kunde?.org_anzeigename?.trim() || kunde?.name?.trim() || "";

  const offenById = useMemo(
    () => countOffeneByObjektId(leads, objekte),
    [leads, objekte]
  );

  const activeObjekt =
    mode.kind === "detail"
      ? (objekte.find((o) => o.id === mode.id) ?? null)
      : null;

  const toggleSel = (id: string) => {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  };

  const persistPayload = async (
    payload: ObjWizPayload,
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
    if (editId) orgPortalToast.objektAktualisiert();
    else orgPortalToast.objektAngelegt();
    return json.objekt?.id ?? editId ?? null;
  };

  const deleteObjekt = async (o: OrganisationObjekt) => {
    const offen = offenById[o.id] ?? 0;
    if (objektHasActiveVorgaenge(offen)) {
      portalToastError("Löschen nicht möglich", OBJ_DELETE_BLOCKED);
      return;
    }
    if (!window.confirm(objDeleteConfirm(o.titel))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/org/objekte?id=${encodeURIComponent(o.id)}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Löschen fehlgeschlagen", json.error);
        return;
      }
      orgPortalToast.objektGeloescht();
      setSelected((s) => s.filter((x) => x !== o.id));
      setMode({ kind: "list" });
      onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const copyObjekt = async (o: OrganisationObjekt) => {
    setBusy(true);
    try {
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
    } finally {
      setBusy(false);
    }
  };

  const bulkDelete = async () => {
    if (selected.length === 0) return;
    if (
      !window.confirm(
        `${selected.length} Objekt(e) wirklich löschen? Zugeordnete Vorgänge bleiben erhalten.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      let blocked = 0;
      for (const id of selected) {
        const o = objekte.find((x) => x.id === id);
        if (!o) continue;
        if (objektHasActiveVorgaenge(offenById[id] ?? 0)) {
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
    } finally {
      setBusy(false);
    }
  };

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
        size="funnel"
        maxWidth={560}
      >
        <OrganisationObjektWizard
          key={mode.editId ?? "new"}
          variant="modal"
          editMode={!!mode.editId}
          initialDraft={mode.draft}
          existingNotizen={editObj?.notizen_intern}
          defaultHv={defaultHv}
          onCancel={closeWizard}
          onDone={async (payload) => {
            const id = await persistPayload(payload, mode.editId);
            onRefresh();
            if (id) setMode({ kind: "detail", id });
            else setMode({ kind: "list" });
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
    const canAushang = !!(
      orgKennung &&
      activeObjekt.melde_slug &&
      activeObjekt.melde_aktiv &&
      kunde
    );
    return (
      <>
        <OrganisationObjektDetail
          objekt={activeObjekt}
          leads={leads}
          offenCount={offenById[activeObjekt.id] ?? 0}
          canAushang={canAushang}
          onBack={() => setMode({ kind: "list" })}
          onCopyMeldeLink={() =>
            void copyMeldeLink(
              aushangUrl(orgKennung!, {
                melde_slug: activeObjekt.melde_slug,
                titel: activeObjekt.titel,
              })
            )
          }
          onOpenAushangPdf={() => openMeldeAushangPdf(activeObjekt.id)}
          onOpenQrCode={() =>
            setQrModal({
              objektId: activeObjekt.id,
              label: activeObjekt.titel,
            })
          }
          onEdit={() =>
            setMode({
              kind: "wizard",
              editId: activeObjekt.id,
              draft: draftFromObjekt(activeObjekt, defaultHv),
            })
          }
          onCopy={() => void copyObjekt(activeObjekt)}
          onDelete={() => void deleteObjekt(activeObjekt)}
          onEinladen={() => setEinladenObjektId(activeObjekt.id)}
          onRefresh={onRefresh}
          onOpenVorgang={onOpenVorgang}
          dokumenteByLeadId={dokumenteByLeadId}
        />
        {qrModal ? (
          <OrganisationMeldeQrModal
            open
            onClose={() => setQrModal(null)}
            objektId={qrModal.objektId}
            label={qrModal.label}
          />
        ) : null}
        {einladenObjektId && orgKennung ? (
          <PortalModalEinladen
            open
            onClose={() => setEinladenObjektId(null)}
            orgKennung={orgKennung}
            objekte={objekte}
            initialObjektId={einladenObjektId}
            orgAnzeigename={kunde?.org_anzeigename ?? kunde?.name}
          />
        ) : null}
      </>
    );
  }

  const empty = objekte.length === 0;
  const allSelected =
    objekte.length > 0 && objekte.every((o) => selected.includes(o.id));

  return (
    <div className="space-y-4">
      <div className="relative flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          <h2 className="portal-text-section text-text-primary">Objekte</h2>
        </div>
        <button
          type="button"
          className="btn-pill-primary shrink-0 !px-3.5 !py-2 !text-[13px]"
          onClick={() =>
            setMode({
              kind: "wizard",
              draft: { hv: defaultHv, we: 1, schwelle: 500 },
            })
          }
        >
          ＋ Objekt
        </button>
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-accent bg-accent-light px-3.5 py-2.5">
          <span className="text-[13px] font-bold text-accent">
            {selected.length} ausgewählt
          </span>
          <button
            type="button"
            disabled={busy}
            className="portal-danger ml-auto rounded-lg border border-[var(--p2-danger-border)] bg-white px-3 py-1.5 text-[12.5px] font-semibold"
            onClick={() => void bulkDelete()}
          >
            ✕ Löschen
          </button>
          <button
            type="button"
            className="rounded-lg border border-border-default bg-white px-3 py-1.5 text-[12.5px] font-semibold text-text-secondary"
            onClick={() => setSelected([])}
          >
            Auswahl aufheben
          </button>
        </div>
      ) : null}

      {empty ? (
        <div className="px-2 py-8 text-center portal-text-body text-text-secondary">
          Noch keine Objekte. Legen Sie Ihr erstes Gebäude an — Link und Aushang
          finden Sie danach im Detail.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {objekte.map((o) => {
            const isSel = selected.includes(o.id);
            const offen = offenById[o.id] ?? 0;
            const card = buildObjCardModel(o, offen);
            const canAushang = !!(
              orgKennung &&
              o.melde_slug &&
              o.melde_aktiv &&
              kunde
            );

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
                    canAushang={canAushang}
                    onAushangPdf={() => openMeldeAushangPdf(o.id)}
                    onQrCode={() =>
                      setQrModal({ objektId: o.id, label: o.titel })
                    }
                    onBearbeiten={() =>
                      setMode({
                        kind: "wizard",
                        editId: o.id,
                        draft: draftFromObjekt(o, defaultHv),
                      })
                    }
                    onKopieren={() => void copyObjekt(o)}
                    onLoeschen={() => void deleteObjekt(o)}
                  />
                }
              />
            );
          })}
        </div>
      )}

      {objekte.length > 0 ? (
        <button
          type="button"
          className="portal-text-meta text-accent underline"
          onClick={() => {
            if (allSelected) setSelected([]);
            else setSelected(objekte.map((o) => o.id));
          }}
        >
          {allSelected ? "Auswahl aufheben" : "Alle auswählen"}
        </button>
      ) : null}

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
