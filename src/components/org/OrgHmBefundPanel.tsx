"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import {
  addLeadBefundFreipunktAction,
  addLeadBefundVorlagePunktAction,
  completeLeadBefundAction,
  createLeadBefundAction,
  deleteLeadBefundPunktAction,
  getLeadBefundAction,
  rejectLeadBefundToHvAction,
  updateLeadBefundKopfAction,
  updateLeadBefundPunktAction,
  uploadLeadBefundFotoAction,
  type LeadBefundErgebnis,
  type LeadBefundPunktRow,
  type LeadBefundPunktStatus,
  type LeadBefundRow,
} from "@/app/actions/lead-befund";
import { PortalContentBusy } from "@/components/shared/PortalContentBusy";
import { PortalKiAssistField } from "@/components/shared/PortalKiAssistField";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { FileUploadField } from "@/components/shared/FileUploadField";
import { usePortalBusy } from "@/components/shared/PortalBusyContext";
import { PortalActionMenu } from "@/components/shared/PortalActionMenu";
import { PortalDetailInfoBox } from "@/components/shared/PortalDetailUi";
import {
  getBefundVorlage,
  isBefundVorlageKey,
  listVorlageKatalogOffen,
} from "@/lib/org/lead-befund-vorlagen";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { orgPortalToast, portalToastSaved } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

const STATUS_OPTS: Array<{
  id: LeadBefundPunktStatus;
  label: string;
}> = [
  { id: "unauffaellig", label: "Unauffällig" },
  { id: "auffaellig", label: "Auffällig" },
  { id: "nicht_pruefbar", label: "Nicht prüfbar" },
];

const SHEET_STEPS = [
  { id: "wahl", label: "Entscheidung" },
  { id: "fachfirma", label: "Fachfirma" },
  { id: "bestaetigen", label: "Bestätigen" },
] as const;

type SheetStep = (typeof SHEET_STEPS)[number]["id"];

type Props = {
  leadId: string;
  hvMeldungStatus: string | null | undefined;
  viewerRole?: "hv" | "hm";
  readOnly?: boolean;
  onUpdated?: () => void;
  onCompleted?: () => void;
  onBefundPresence?: (has: boolean) => void;
  onActionsReady?: (
    actions: {
      editable: boolean;
      openAbschluss: () => void;
      ablehnenAnHv: () => void;
    } | null
  ) => void;
  hideInlineActions?: boolean;
};

function statusLabel(status: LeadBefundPunktStatus | null): string | null {
  if (!status) return null;
  return STATUS_OPTS.find((o) => o.id === status)?.label ?? status;
}

function statusTone(status: LeadBefundPunktStatus | null): {
  bg: string;
  color: string;
} {
  if (status === "auffaellig") {
    return { bg: "var(--p2-danger-soft, #fce3e3)", color: "var(--p2-danger, #a1242a)" };
  }
  if (status === "unauffaellig") {
    return { bg: "var(--p2-primary-soft, #e7f1e9)", color: "var(--p2-primary, #2e7d52)" };
  }
  if (status === "nicht_pruefbar") {
    return { bg: "#ffffff", color: "var(--p2-sub, #404a45)" };
  }
  return { bg: "transparent", color: PORTAL_VAR.faint };
}

function fmtDatum(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function ergebnisLabel(ergebnis: LeadBefundErgebnis): string {
  if (ergebnis === "selbst_erledigt") return "Selbst erledigt";
  if (ergebnis === "fachfirma_akut") return "Fachfirma — Akut";
  return "Fachfirma — Angebot";
}

function StepChrome({ stepIndex }: { stepIndex: number }) {
  return (
    <div className="mb-4 flex items-center gap-1.5" aria-hidden>
      {SHEET_STEPS.map((s, i) => {
        const done = i < stepIndex;
        const act = i === stepIndex;
        return (
          <div key={s.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div
              className="h-1 w-full rounded-full"
              style={{
                background: done || act ? PORTAL_VAR.primary : PORTAL_VAR.line,
              }}
            />
            <span
              className="hidden truncate text-[10px] font-semibold sm:block"
              style={{ color: act ? PORTAL_VAR.ink : PORTAL_VAR.faint }}
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StatusChip({
  active,
  label,
  onClick,
  disabled,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center rounded-full border px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-60"
      style={{
        borderColor: active ? PORTAL_VAR.primary : PORTAL_VAR.line,
        background: active ? PORTAL_VAR.primary : "#fff",
        color: active ? "#fff" : PORTAL_VAR.ink,
      }}
    >
      {label}
    </button>
  );
}

function BefundPunktCard({
  punkt,
  onOpen,
  onDelete,
  deletable,
}: {
  punkt: LeadBefundPunktRow;
  onOpen: () => void;
  onDelete?: () => void;
  deletable?: boolean;
}) {
  const st = statusLabel(punkt.status);
  const tone = statusTone(punkt.status);
  const datum = fmtDatum(punkt.updated_at);
  const notiz = punkt.notiz.trim();

  return (
    <article
      className="rounded-xl border border-border-light bg-white p-3 shadow-sm"
      style={{ borderColor: PORTAL_VAR.line }}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="portal-text-body font-semibold text-text-primary">
                {punkt.titel}
              </p>
              {notiz ? (
                <p className="portal-text-meta mt-0.5 line-clamp-2 text-text-secondary">
                  {notiz}
                </p>
              ) : null}
            </div>
            {st ? (
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: tone.bg, color: tone.color }}
              >
                {st}
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="portal-text-meta text-text-tertiary">
              {datum ?? (st ? datum : "Noch offen")}
            </span>
            {punkt.foto_refs.length > 0 ? (
              <div className="flex -space-x-1.5">
                {punkt.foto_refs.slice(0, 4).map((url) => (
                  <span
                    key={url}
                    className="relative h-8 w-8 overflow-hidden rounded-md border border-white bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </button>
        {deletable && onDelete ? (
          <button
            type="button"
            className="shrink-0 rounded-lg p-2 text-text-tertiary transition-colors hover:bg-[var(--p2-hover,#eef1ef)] hover:text-red-700"
            aria-label={`${punkt.titel} entfernen`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function OrgHmBefundPanel({
  leadId,
  hvMeldungStatus,
  viewerRole = "hm",
  readOnly: readOnlyProp = false,
  onUpdated,
  onCompleted,
  onBefundPresence,
  onActionsReady,
  hideInlineActions = false,
}: Props) {
  const hv = (hvMeldungStatus ?? "").trim().toLowerCase();
  const isHv = viewerRole === "hv";
  const editable = !isHv && hv === "hm_pruefung" && !readOnlyProp;
  const canAutoCreate = editable;
  const hvWartet = isHv && hv === "hm_pruefung";

  const { runBusy } = usePortalBusy();
  const [befund, setBefund] = useState<LeadBefundRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStep, setSheetStep] = useState<SheetStep>("wahl");
  const [pendingErgebnis, setPendingErgebnis] =
    useState<LeadBefundErgebnis | null>(null);

  const [editPunkt, setEditPunkt] = useState<LeadBefundPunktRow | null>(null);
  const [draftStatus, setDraftStatus] = useState<LeadBefundPunktStatus | null>(
    null
  );
  const [draftNotiz, setDraftNotiz] = useState("");
  const [draftDirty, setDraftDirty] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addTitel, setAddTitel] = useState("");
  const [addStatus, setAddStatus] = useState<LeadBefundPunktStatus | null>(
    null
  );
  const [addNotiz, setAddNotiz] = useState("");
  const [addFotos, setAddFotos] = useState<File[]>([]);
  const [addDirty, setAddDirty] = useState(false);

  function resetAddForm() {
    setAddTitel("");
    setAddStatus(null);
    setAddNotiz("");
    setAddFotos([]);
    setAddDirty(false);
  }

  function openAddForm() {
    resetAddForm();
    setAddOpen(true);
  }

  function closeAddForm() {
    setAddOpen(false);
    resetAddForm();
  }

  const hinweis = useMemo(() => {
    const key = befund?.vorlage_key;
    if (!key || !isBefundVorlageKey(key)) return null;
    return getBefundVorlage(key).hinweis ?? null;
  }, [befund?.vorlage_key]);

  const sichtbarePunkte = useMemo(() => {
    const punkte = befund?.punkte ?? [];
    if (isHv && befund?.ergebnis) {
      return punkte.filter((p) => p.status != null);
    }
    return [...punkte].sort((a, b) => a.sort_order - b.sort_order);
  }, [befund?.punkte, befund?.ergebnis, isHv]);

  const katalogOffen = useMemo(() => {
    const key = befund?.vorlage_key;
    if (!key || !isBefundVorlageKey(key) || !editable) return [];
    const active = (befund?.punkte ?? [])
      .map((p) => p.vorlage_key ?? "")
      .filter(Boolean);
    return listVorlageKatalogOffen(key, active);
  }, [befund?.vorlage_key, befund?.punkte, editable]);

  async function reload() {
    setLoading(true);
    setError(null);
    const res = await getLeadBefundAction({ leadId });
    if (!res.ok) {
      setError(res.error);
      setBefund(null);
      onBefundPresence?.(false);
    } else {
      setBefund(res.befund);
      onBefundPresence?.(Boolean(res.befund?.id));
    }
    setLoading(false);
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- leadId/hv
  }, [leadId, hv]);

  useEffect(() => {
    if (!canAutoCreate || loading || befund) return;
    void (async () => {
      const res = await createLeadBefundAction({ leadId });
      if (res.ok) {
        setBefund(res.befund);
        onBefundPresence?.(true);
      } else setError(res.error);
    })();
  }, [canAutoCreate, loading, befund, leadId, onBefundPresence]);

  function openPunkt(p: LeadBefundPunktRow) {
    setEditPunkt(p);
    setDraftStatus(p.status);
    setDraftNotiz(p.notiz);
    setDraftDirty(false);
  }

  function closePunkt() {
    setEditPunkt(null);
    setDraftDirty(false);
  }

  async function savePunkt() {
    if (!editPunkt || !editable) {
      closePunkt();
      return;
    }
    await runBusy(async () => {
      const res = await updateLeadBefundPunktAction({
        punktId: editPunkt.id,
        status: draftStatus,
        notiz: draftNotiz,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBefund((prev) =>
        prev
          ? {
              ...prev,
              punkte: prev.punkte.map((x) =>
                x.id === editPunkt.id ? res.punkt : x
              ),
            }
          : prev
      );
      portalToastSaved();
      closePunkt();
    });
  }

  async function onFoto(files: File[]) {
    const file = files[0];
    if (!file || !editPunkt || !editable) return;
    await runBusy(async () => {
      const fd = new FormData();
      fd.set("foto", file);
      const res = await uploadLeadBefundFotoAction({
        punktId: editPunkt.id,
        formData: fd,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEditPunkt(res.punkt);
      setBefund((prev) =>
        prev
          ? {
              ...prev,
              punkte: prev.punkte.map((x) =>
                x.id === editPunkt.id ? res.punkt : x
              ),
            }
          : prev
      );
    });
  }

  async function addFrei() {
    if (!befund || !addTitel.trim()) return;
    await runBusy(async () => {
      const res = await addLeadBefundFreipunktAction({
        befundId: befund.id,
        titel: addTitel.trim(),
        status: addStatus,
        notiz: addNotiz,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      let punkt = res.punkt;
      for (const file of addFotos) {
        const fd = new FormData();
        fd.set("foto", file);
        const up = await uploadLeadBefundFotoAction({
          punktId: punkt.id,
          formData: fd,
        });
        if (!up.ok) {
          setError(up.error);
          break;
        }
        punkt = up.punkt;
      }
      setBefund((prev) =>
        prev ? { ...prev, punkte: [...prev.punkte, punkt] } : prev
      );
      portalToastSaved();
      closeAddForm();
    });
  }

  async function addVorlagePunkt(punktKey: string) {
    if (!befund) return;
    await runBusy(async () => {
      const res = await addLeadBefundVorlagePunktAction({
        befundId: befund.id,
        punktKey,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBefund((prev) =>
        prev ? { ...prev, punkte: [...prev.punkte, res.punkt] } : prev
      );
      portalToastSaved();
    });
  }

  async function removePunkt(punktId: string) {
    if (!editable) return;
    await runBusy(async () => {
      const res = await deleteLeadBefundPunktAction({ punktId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBefund((prev) =>
        prev
          ? { ...prev, punkte: prev.punkte.filter((p) => p.id !== punktId) }
          : prev
      );
      portalToastSaved();
    });
  }

  function openAbschlussSheet() {
    setPendingErgebnis(null);
    setSheetStep("wahl");
    setSheetOpen(true);
  }

  async function ablehnenAnHv() {
    if (!befund) return;
    await runBusy(async () => {
      const res = await rejectLeadBefundToHvAction({ befundId: befund.id });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      orgPortalToast.hmZurueckAnHv();
      if (onCompleted) onCompleted();
      else onUpdated?.();
    });
  }

  useEffect(() => {
    if (!onActionsReady) return;
    if (!editable || !befund) {
      onActionsReady(null);
      return;
    }
    onActionsReady({
      editable: true,
      openAbschluss: openAbschlussSheet,
      ablehnenAnHv: () => {
        void ablehnenAnHv();
      },
    });
    return () => onActionsReady(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable callbacks via state
  }, [onActionsReady, editable, befund?.id]);

  async function confirmAbschluss() {
    if (!befund || !pendingErgebnis) return;
    await runBusy(async () => {
      const res = await completeLeadBefundAction({
        befundId: befund.id,
        ergebnis: pendingErgebnis,
        durchgefuehrtVon: befund.durchgefuehrt_von,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (pendingErgebnis === "selbst_erledigt") orgPortalToast.hmErledigt();
      else if (pendingErgebnis === "fachfirma_akut")
        orgPortalToast.hmFachfirmaAkut();
      else orgPortalToast.hmFachfirmaAngebot();
      setSheetOpen(false);
      setBefund(res.befund);
      if (onCompleted) onCompleted();
      else onUpdated?.();
    });
  }

  const stepIndex =
    sheetStep === "wahl" ? 0 : sheetStep === "fachfirma" ? 1 : 2;

  const addMenuItems = useMemo(() => {
    const fromKatalog = katalogOffen.map((p) => ({
      label: p.titel,
      onClick: () => void addVorlagePunkt(p.key),
    }));
    return [
      ...fromKatalog,
      {
        label: "Eigener Punkt…",
        dividerBefore: fromKatalog.length > 0,
        onClick: openAddForm,
      },
    ];
  }, [katalogOffen]);

  const hvWartetSichtbar =
    hvWartet && !loading && (!befund || !befund.ergebnis);

  if (hvWartetSichtbar) {
    return (
      <PortalDetailInfoBox>
        <p className="font-semibold text-text-primary">
          Warte auf Hausmeister-Prüfung
        </p>
        <p className="mt-1 text-[13px] text-text-secondary">
          Der Hausmeister prüft vor Ort. Sobald die Prüfung abgeschlossen ist,
          sehen Sie hier das Ergebnis und die dokumentierten Prüfpunkte.
        </p>
      </PortalDetailInfoBox>
    );
  }

  return (
    <div className="space-y-3.5">
      {loading ? (
        <PortalContentBusy
          title="Befund wird geladen…"
          body="Einen Moment — wir laden die Prüfpunkte."
        />
      ) : null}
      {error ? (
        <p className="portal-text-meta font-semibold text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && befund ? (
        <>
          {(isHv && befund.ergebnis) || !isHv ? (
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-wrap gap-3">
                <label className="block min-w-[10rem] flex-1">
                  <span className="portal-text-label text-text-tertiary">
                    Durchgeführt von
                  </span>
                  <input
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-[13px]"
                    style={{ borderColor: PORTAL_VAR.line }}
                    value={befund.durchgefuehrt_von}
                    disabled={!editable}
                    onChange={(e) =>
                      setBefund({ ...befund, durchgefuehrt_von: e.target.value })
                    }
                    onBlur={() => {
                      if (!editable) return;
                      void updateLeadBefundKopfAction({
                        befundId: befund.id,
                        durchgefuehrtVon: befund.durchgefuehrt_von,
                      });
                    }}
                  />
                </label>
                <label className="block w-[9.5rem]">
                  <span className="portal-text-label text-text-tertiary">
                    Datum
                  </span>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-[13px]"
                    style={{ borderColor: PORTAL_VAR.line }}
                    value={befund.durchgefuehrt_am.slice(0, 10)}
                    disabled={!editable}
                    onChange={(e) =>
                      setBefund({ ...befund, durchgefuehrt_am: e.target.value })
                    }
                    onBlur={() => {
                      if (!editable) return;
                      void updateLeadBefundKopfAction({
                        befundId: befund.id,
                        durchgefuehrtAm: befund.durchgefuehrt_am,
                      });
                    }}
                  />
                </label>
              </div>
              {editable ? (
                <PortalActionMenu
                  variant="popover"
                  title="Prüfpunkt hinzufügen"
                  trigger={
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-accent transition-opacity hover:opacity-90"
                      style={{
                        borderColor: "var(--p2-accent, var(--accent))",
                        background: "var(--p2-accent-soft, rgba(46,125,82,0.12))",
                      }}
                      aria-label="Prüfpunkt hinzufügen"
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                    </button>
                  }
                  items={addMenuItems}
                />
              ) : null}
            </div>
          ) : null}

          {befund.ergebnis ? (
            <p className="portal-text-meta font-semibold text-text-primary">
              Ergebnis: {ergebnisLabel(befund.ergebnis)}
            </p>
          ) : null}

          {hinweis && editable ? (
            <p
              className="rounded-lg border px-3 py-2.5 text-[13px] font-semibold"
              style={{
                borderColor: PORTAL_VAR.line,
                color: PORTAL_VAR.ink,
                background: PORTAL_VAR.panel ?? "#fff",
              }}
            >
              {hinweis}
            </p>
          ) : null}

          {sichtbarePunkte.length > 0 ? (
            <div className="space-y-2.5">
              {sichtbarePunkte.map((p) => (
                <BefundPunktCard
                  key={p.id}
                  punkt={p}
                  onOpen={() => openPunkt(p)}
                  deletable={editable}
                  onDelete={
                    editable ? () => void removePunkt(p.id) : undefined
                  }
                />
              ))}
            </div>
          ) : isHv && befund.ergebnis ? (
            <p className="portal-text-meta text-text-tertiary">
              Keine ausgefüllten Prüfpunkte dokumentiert.
            </p>
          ) : editable ? (
            <p className="portal-text-meta text-text-tertiary">
              Noch keine Prüfpunkte — über „+“ Vorschläge wählen oder einen
              eigenen Punkt anlegen.
            </p>
          ) : null}

          {editable && !hideInlineActions ? (
            <div className="portal-action-row pt-1">
              <button
                type="button"
                className="portal-action-btn portal-action-btn--secondary"
                onClick={() => void ablehnenAnHv()}
              >
                Zurück an Verwaltung
              </button>
              <button
                type="button"
                className="portal-action-btn portal-action-btn--primary"
                onClick={openAbschlussSheet}
              >
                Prüfung abschließen
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      <PortalModalShell
        open={Boolean(editPunkt)}
        onClose={closePunkt}
        variant="edit"
        title={editPunkt?.titel ?? "Prüfpunkt"}
        subtitle={editable ? "Status, Notiz und Fotos" : "Nur Ansicht"}
        dirty={draftDirty}
        headerExtra={
          editable ? (
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-text-tertiary">
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Bearbeiten
            </span>
          ) : null
        }
        onConfirm={editable ? () => void savePunkt() : undefined}
        confirmLabel="Speichern"
      >
        {editPunkt ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="portal-text-label text-text-tertiary">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTS.map((o) => (
                  <StatusChip
                    key={o.id}
                    label={o.label}
                    active={draftStatus === o.id}
                    disabled={!editable}
                    onClick={() => {
                      if (!editable) return;
                      setDraftStatus(o.id);
                      setDraftDirty(true);
                    }}
                  />
                ))}
              </div>
            </div>

            {editable ? (
              <PortalKiAssistField
                scope="hm_befund_notiz"
                label="Notiz"
                value={draftNotiz}
                onApply={(text) => {
                  setDraftNotiz(text);
                  setDraftDirty(true);
                }}
                contextHint={[
                  `Prüfpunkt: ${editPunkt.titel}`,
                  befund?.vorlage_key && isBefundVorlageKey(befund.vorlage_key)
                    ? `Vorlage: ${getBefundVorlage(befund.vorlage_key).label}`
                    : null,
                ]
                  .filter(Boolean)
                  .join("\n")}
              >
                <textarea
                  className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                  rows={4}
                  placeholder="Kurz notieren, was Sie gesehen haben…"
                  value={draftNotiz}
                  onChange={(e) => {
                    setDraftNotiz(e.target.value);
                    setDraftDirty(true);
                  }}
                />
              </PortalKiAssistField>
            ) : draftNotiz.trim() ? (
              <div className="space-y-1">
                <p className="portal-text-label text-text-tertiary">Notiz</p>
                <p className="portal-text-body whitespace-pre-wrap text-text-secondary">
                  {draftNotiz}
                </p>
              </div>
            ) : null}

            {editable ? (
              <FileUploadField
                label="Foto hinzufügen"
                accept="image/jpeg,image/png,image/webp"
                size="compact"
                onChange={(files) => void onFoto(files)}
              />
            ) : null}

            {editPunkt.foto_refs.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {editPunkt.foto_refs.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block h-16 w-16 overflow-hidden rounded-md border"
                    style={{ borderColor: PORTAL_VAR.line }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </PortalModalShell>

      <PortalModalShell
        open={addOpen}
        onClose={closeAddForm}
        variant="edit"
        title="Prüfpunkt hinzufügen"
        subtitle="Titel, Zustand, Beschreibung und Fotos"
        dirty={addDirty}
        onConfirm={() => void addFrei()}
        confirmDisabled={!addTitel.trim()}
        confirmLabel="Speichern"
      >
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="portal-text-label text-text-tertiary">Titel</span>
            <input
              className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
              value={addTitel}
              onChange={(e) => {
                setAddTitel(e.target.value);
                setAddDirty(true);
              }}
              placeholder="z. B. Kellerraum zusätzlich geprüft"
              autoFocus
            />
          </label>

          <div className="space-y-2">
            <p className="portal-text-label text-text-tertiary">Zustand</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTS.map((o) => (
                <StatusChip
                  key={o.id}
                  label={o.label}
                  active={addStatus === o.id}
                  onClick={() => {
                    setAddStatus(o.id);
                    setAddDirty(true);
                  }}
                />
              ))}
            </div>
          </div>

          <PortalKiAssistField
            scope="hm_befund_notiz"
            label="Beschreibung"
            value={addNotiz}
            onApply={(text) => {
              setAddNotiz(text);
              setAddDirty(true);
            }}
            contextHint={[
              addTitel.trim() ? `Prüfpunkt: ${addTitel.trim()}` : null,
              befund?.vorlage_key && isBefundVorlageKey(befund.vorlage_key)
                ? `Vorlage: ${getBefundVorlage(befund.vorlage_key).label}`
                : null,
            ]
              .filter(Boolean)
              .join("\n")}
          >
            <textarea
              className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
              rows={4}
              placeholder="Kurz notieren, was Sie gesehen haben…"
              value={addNotiz}
              onChange={(e) => {
                setAddNotiz(e.target.value);
                setAddDirty(true);
              }}
            />
          </PortalKiAssistField>

          <FileUploadField
            label="Fotos hinzufügen"
            accept="image/jpeg,image/png,image/webp"
            size="compact"
            multiple
            onChange={(files) => {
              if (!files.length) return;
              setAddFotos((prev) => [...prev, ...files]);
              setAddDirty(true);
            }}
          />

          {addFotos.length > 0 ? (
            <ul className="space-y-1.5">
              {addFotos.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-[13px]"
                  style={{ borderColor: PORTAL_VAR.line }}
                >
                  <span className="min-w-0 truncate text-text-secondary">
                    {f.name}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-[12px] font-semibold text-text-tertiary"
                    onClick={() => {
                      setAddFotos((prev) => prev.filter((_, idx) => idx !== i));
                      setAddDirty(true);
                    }}
                  >
                    Entfernen
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </PortalModalShell>

      <PortalModalShell
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Prüfung abschließen"
        subtitle="Selbst erledigt oder Fachfirma nötig"
      >
        <StepChrome stepIndex={stepIndex} />

        {sheetStep === "wahl" ? (
          <div className="space-y-3">
            <p className="text-[13px]" style={{ color: PORTAL_VAR.sub }}>
              Wie soll der Vorgang weiterlaufen?
            </p>
            <button
              type="button"
              className={cn(
                "w-full rounded-xl border px-4 py-3 text-left text-[13px] font-semibold"
              )}
              style={{ borderColor: PORTAL_VAR.line }}
              onClick={() => {
                setPendingErgebnis("selbst_erledigt");
                setSheetStep("bestaetigen");
              }}
            >
              Selbst erledigt
              <span
                className="mt-0.5 block text-[12px] font-normal"
                style={{ color: PORTAL_VAR.sub }}
              >
                Kein Auftrag an Bärenwald — Vorgang wird geschlossen.
              </span>
            </button>
            <button
              type="button"
              className="w-full rounded-xl border px-4 py-3 text-left text-[13px] font-semibold"
              style={{ borderColor: PORTAL_VAR.line }}
              onClick={() => setSheetStep("fachfirma")}
            >
              An Bärenwald weitergeben
              <span
                className="mt-0.5 block text-[12px] font-normal"
                style={{ color: PORTAL_VAR.sub }}
              >
                Fachfirma nötig — Bärenwald übernimmt.
              </span>
            </button>
          </div>
        ) : null}

        {sheetStep === "fachfirma" ? (
          <div className="space-y-3">
            <button
              type="button"
              className="text-[12.5px] font-semibold"
              style={{ color: PORTAL_VAR.primary }}
              onClick={() => setSheetStep("wahl")}
            >
              ← Zurück
            </button>
            <button
              type="button"
              className="w-full rounded-xl border px-4 py-3 text-left text-[13px] font-semibold"
              style={{ borderColor: PORTAL_VAR.line }}
              onClick={() => {
                setPendingErgebnis("fachfirma_angebot");
                setSheetStep("bestaetigen");
              }}
            >
              Angebot einholen
            </button>
            <button
              type="button"
              className="w-full rounded-xl border px-4 py-3 text-left text-[13px] font-semibold"
              style={{ borderColor: PORTAL_VAR.line }}
              onClick={() => {
                setPendingErgebnis("fachfirma_akut");
                setSheetStep("bestaetigen");
              }}
            >
              Akut — sofortiger Einsatz
            </button>
          </div>
        ) : null}

        {sheetStep === "bestaetigen" && pendingErgebnis ? (
          <div className="space-y-4">
            <button
              type="button"
              className="text-[12.5px] font-semibold"
              style={{ color: PORTAL_VAR.primary }}
              onClick={() =>
                setSheetStep(
                  pendingErgebnis === "selbst_erledigt" ? "wahl" : "fachfirma"
                )
              }
            >
              ← Zurück
            </button>
            <p className="text-[13px]" style={{ color: PORTAL_VAR.ink }}>
              {pendingErgebnis === "selbst_erledigt"
                ? "Vorgang als vom Hausmeister erledigt abschließen?"
                : pendingErgebnis === "fachfirma_akut"
                  ? "Als Akut an Bärenwald übergeben (Soforteinsatz)?"
                  : "An Bärenwald übergeben — Angebot wird erstellt?"}
            </p>
            <div className="portal-action-row">
              <button
                type="button"
                className="portal-action-btn portal-action-btn--primary"
                onClick={() => void confirmAbschluss()}
              >
                Bestätigen
              </button>
            </div>
          </div>
        ) : null}
      </PortalModalShell>
    </div>
  );
}
