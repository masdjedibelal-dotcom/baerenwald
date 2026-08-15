"use client";

import { useEffect, useMemo, useState } from "react";

import {
  addLeadBefundFreipunktAction,
  completeLeadBefundAction,
  createLeadBefundAction,
  getLeadBefundAction,
  updateLeadBefundKopfAction,
  updateLeadBefundPunktAction,
  uploadLeadBefundFotoAction,
  type LeadBefundErgebnis,
  type LeadBefundPunktRow,
  type LeadBefundPunktStatus,
  type LeadBefundRow,
} from "@/app/actions/lead-befund";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { FileUploadField } from "@/components/shared/FileUploadField";
import { usePortalBusy } from "@/components/shared/PortalBusyContext";
import { getBefundVorlage, isBefundVorlageKey } from "@/lib/org/lead-befund-vorlagen";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { orgPortalToast } from "@/lib/shared/portal-toast";
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
  readOnly?: boolean;
  onUpdated?: () => void;
};

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

export function OrgHmBefundPanel({
  leadId,
  hvMeldungStatus,
  readOnly: readOnlyProp,
  onUpdated,
}: Props) {
  const hv = (hvMeldungStatus ?? "").trim().toLowerCase();
  const editable = hv === "hm_pruefung" && !readOnlyProp;
  const visible = hv === "hm_pruefung" || hv === "hm_erledigt";

  const { runBusy } = usePortalBusy();
  const [befund, setBefund] = useState<LeadBefundRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [freiTitel, setFreiTitel] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStep, setSheetStep] = useState<SheetStep>("wahl");
  const [pendingErgebnis, setPendingErgebnis] =
    useState<LeadBefundErgebnis | null>(null);

  const hinweis = useMemo(() => {
    const key = befund?.vorlage_key;
    if (!key || !isBefundVorlageKey(key)) return null;
    return getBefundVorlage(key).hinweis ?? null;
  }, [befund?.vorlage_key]);

  async function reload() {
    setLoading(true);
    setError(null);
    const res = await getLeadBefundAction({ leadId });
    if (!res.ok) {
      setError(res.error);
      setBefund(null);
    } else {
      setBefund(res.befund);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!visible) return;
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- leadId/hv
  }, [leadId, hv]);

  useEffect(() => {
    if (!visible || !editable || loading || befund) return;
    void (async () => {
      const res = await createLeadBefundAction({ leadId });
      if (res.ok) setBefund(res.befund);
      else setError(res.error);
    })();
  }, [visible, editable, loading, befund, leadId]);

  if (!visible) return null;

  async function patchPunkt(
    punktId: string,
    patch: {
      status?: LeadBefundPunktStatus | null;
      notiz?: string;
      fotoRefs?: string[];
    }
  ) {
    await runBusy(async () => {
      const res = await updateLeadBefundPunktAction({ punktId, ...patch });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBefund((prev) =>
        prev
          ? {
              ...prev,
              punkte: prev.punkte.map((p) =>
                p.id === punktId ? res.punkt : p
              ),
            }
          : prev
      );
    });
  }

  async function onFoto(punkt: LeadBefundPunktRow, files: File[]) {
    const file = files[0];
    if (!file || !editable) return;
    await runBusy(async () => {
      const fd = new FormData();
      fd.set("foto", file);
      const res = await uploadLeadBefundFotoAction({
        punktId: punkt.id,
        formData: fd,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBefund((prev) =>
        prev
          ? {
              ...prev,
              punkte: prev.punkte.map((p) =>
                p.id === punkt.id ? res.punkt : p
              ),
            }
          : prev
      );
    });
  }

  async function addFrei() {
    if (!befund || !freiTitel.trim()) return;
    await runBusy(async () => {
      const res = await addLeadBefundFreipunktAction({
        befundId: befund.id,
        titel: freiTitel,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setFreiTitel("");
      setBefund((prev) =>
        prev ? { ...prev, punkte: [...prev.punkte, res.punkt] } : prev
      );
    });
  }

  function openSheet() {
    setPendingErgebnis(null);
    setSheetStep("wahl");
    setSheetOpen(true);
  }

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
      setBefund(res.befund);
      setSheetOpen(false);
      if (pendingErgebnis === "selbst_erledigt") {
        orgPortalToast.hmErledigt();
      } else if (pendingErgebnis === "fachfirma_akut") {
        orgPortalToast.hmFachfirmaAkut();
      } else {
        orgPortalToast.hmFachfirmaAngebot();
      }
      onUpdated?.();
    });
  }

  const stepIndex =
    sheetStep === "wahl" ? 0 : sheetStep === "fachfirma" ? 1 : 2;

  return (
    <div className="space-y-3.5">
      {loading ? (
        <p className="portal-text-body text-text-secondary">Befund wird geladen…</p>
      ) : null}
      {error ? (
        <p className="portal-text-meta font-semibold text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {befund ? (
        <>
          <div className="flex flex-wrap gap-3">
            <label className="block min-w-[12rem] flex-1">
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
            <label className="block w-[10rem]">
              <span className="portal-text-label text-text-tertiary">Datum</span>
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

          {hinweis ? (
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

          <ul className="divide-y divide-border-light">
            {befund.punkte.map((p) => (
              <li key={p.id} className="space-y-2.5 py-3.5">
                <p className="portal-text-card-title">{p.titel}</p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTS.map((o) => (
                    <StatusChip
                      key={o.id}
                      label={o.label}
                      active={p.status === o.id}
                      disabled={!editable}
                      onClick={() => void patchPunkt(p.id, { status: o.id })}
                    />
                  ))}
                </div>
                <textarea
                  className="w-full rounded-lg border px-3 py-2 text-[13px]"
                  style={{ borderColor: PORTAL_VAR.line }}
                  rows={2}
                  placeholder="Notiz"
                  value={p.notiz}
                  disabled={!editable}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBefund((prev) =>
                      prev
                        ? {
                            ...prev,
                            punkte: prev.punkte.map((x) =>
                              x.id === p.id ? { ...x, notiz: v } : x
                            ),
                          }
                        : prev
                    );
                  }}
                  onBlur={() => void patchPunkt(p.id, { notiz: p.notiz })}
                />
                {editable ? (
                  <FileUploadField
                    label="Foto"
                    accept="image/jpeg,image/png,image/webp"
                    size="compact"
                    onChange={(files) => void onFoto(p, files)}
                  />
                ) : null}
                {p.foto_refs.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {p.foto_refs.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block h-16 w-16 overflow-hidden rounded-md border"
                        style={{ borderColor: PORTAL_VAR.line }}
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
              </li>
            ))}
          </ul>

          {editable ? (
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-[12rem] flex-1">
                <span className="portal-text-label text-text-tertiary">
                  Freipunkt
                </span>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-[13px]"
                  style={{ borderColor: PORTAL_VAR.line }}
                  value={freiTitel}
                  onChange={(e) => setFreiTitel(e.target.value)}
                  placeholder="Weiteren Prüfpunkt hinzufügen"
                />
              </label>
              <button
                type="button"
                className="portal-action-btn portal-action-btn--secondary"
                disabled={!freiTitel.trim()}
                onClick={() => void addFrei()}
              >
                Hinzufügen
              </button>
            </div>
          ) : null}

          {editable ? (
            <div className="portal-action-row pt-1">
              <button
                type="button"
                className="portal-action-btn portal-action-btn--primary"
                onClick={openSheet}
              >
                Prüfung abschließen
              </button>
              <button
                type="button"
                className="portal-action-btn portal-action-btn--secondary"
                onClick={() => {
                  void (async () => {
                    const res = await fetch("/api/org/meldung-aktion", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        leadId,
                        aktion: "direkt_baerenwald",
                      }),
                    });
                    if (!res.ok) {
                      const j = (await res.json()) as { error?: string };
                      setError(j.error ?? "Aktion fehlgeschlagen.");
                      return;
                    }
                    orgPortalToast.angebotEingefordert();
                    onUpdated?.();
                  })();
                }}
              >
                Direkt Bärenwald beauftragen
              </button>
            </div>
          ) : null}

          {befund.ergebnis ? (
            <p className="portal-text-meta text-text-secondary">
              Ergebnis:{" "}
              {befund.ergebnis === "selbst_erledigt"
                ? "Selbst erledigt"
                : befund.ergebnis === "fachfirma_akut"
                  ? "Fachfirma — Akut"
                  : "Fachfirma — Angebot"}
            </p>
          ) : null}
        </>
      ) : null}

      <PortalModalShell
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Hausmeister-Prüfung abschließen"
        subtitle="Ergebnis wählen — ohne Signatur"
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
              style={{ borderColor: PORTAL_VAR.line, color: PORTAL_VAR.ink }}
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
                Vorgang endet hier — ohne Bärenwald-Koordination.
              </span>
            </button>
            <button
              type="button"
              className="w-full rounded-xl border px-4 py-3 text-left text-[13px] font-semibold"
              style={{ borderColor: PORTAL_VAR.line, color: PORTAL_VAR.ink }}
              onClick={() => {
                setPendingErgebnis(null);
                setSheetStep("fachfirma");
              }}
            >
              Fachfirma beauftragen
              <span
                className="mt-0.5 block text-[12px] font-normal"
                style={{ color: PORTAL_VAR.sub }}
              >
                Vorbefund geht an Bärenwald / Handwerker.
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
            <button
              type="button"
              className="portal-action-btn portal-action-btn--primary w-full"
              onClick={() => void confirmAbschluss()}
            >
              Bestätigen
            </button>
          </div>
        ) : null}
      </PortalModalShell>
    </div>
  );
}
