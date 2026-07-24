"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { submitPartnerAbnahmeprotokoll } from "@/app/actions/partner-abnahmeprotokoll";
import { PartnerDetailError } from "@/components/partner/PartnerDetailUi";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { SignatureCanvas } from "@/components/shared/SignatureCanvas";
import {
  HW_ABSCHLUSS_CHECKS,
  type HwAbschlussCheckId,
} from "@/lib/portal2/hw-kalkulation";
import {
  allLeistungChecksDone,
  buildLeistungAbschlussChecks,
  flattenAbschlussChecksForPersist,
  HW_ABNAHME_COPY,
  type LeistungAbschlussCheckState,
} from "@/lib/partner/hw-abnahme";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { partnerPortalToast } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "checkliste", label: "Checkliste" },
  { id: "beschreibung", label: "Beschreibung" },
  { id: "signatur", label: "Signatur" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

type LeistungInput = {
  id: string;
  leistung_name: string;
  leistung_status?: string | null;
};

type Props = {
  open: boolean;
  auftragId: string;
  /** @deprecated use leistungItems */
  leistungen?: string[];
  leistungItems?: LeistungInput[];
  defaultOrt?: string;
  onClose: () => void;
  onSuccess: (vollstaendig: boolean) => void;
};

export function PartnerAbschlussModal({
  open,
  auftragId,
  leistungen = [],
  leistungItems,
  defaultOrt = "",
  onClose,
  onSuccess,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<StepId>("checkliste");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialRows = useMemo(() => {
    if (leistungItems?.length) {
      return buildLeistungAbschlussChecks(leistungItems);
    }
    return buildLeistungAbschlussChecks(
      leistungen.map((name, i) => ({
        id: `legacy-${i}`,
        leistung_name: name,
        leistung_status: null,
      }))
    );
  }, [leistungItems, leistungen]);

  const [rows, setRows] = useState<LeistungAbschlussCheckState[]>(initialRows);
  const [protokollText, setProtokollText] = useState("");
  const [maengelText, setMaengelText] = useState("");
  const [ort, setOrt] = useState(defaultOrt);
  const [abnahmeDatum, setAbnahmeDatum] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [hwName, setHwName] = useState("");
  const [kundeName, setKundeName] = useState("");
  const [hwSig, setHwSig] = useState<string | null>(null);
  const [hwHasSig, setHwHasSig] = useState(false);
  const [kundeSig, setKundeSig] = useState<string | null>(null);
  const [kundeHasSig, setKundeHasSig] = useState(false);

  // Reset rows when modal opens with new items
  useEffect(() => {
    if (open) setRows(initialRows);
  }, [open, initialRows]);

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const allChecks = allLeistungChecksDone(rows);

  function resetAndClose() {
    setStep("checkliste");
    setError(null);
    onClose();
  }

  function setCheck(
    leistungId: string,
    checkId: HwAbschlussCheckId,
    value: boolean
  ) {
    setRows((prev) =>
      prev.map((r) =>
        r.leistungId === leistungId
          ? { ...r, checks: { ...r.checks, [checkId]: value } }
          : r
      )
    );
  }

  function goNext() {
    setError(null);
    if (step === "checkliste") {
      if (!allChecks) {
        setError("Bitte alle Abschluss-Punkte je Leistung bestätigen.");
        return;
      }
      setStep("beschreibung");
      return;
    }
    if (step === "beschreibung") {
      if (!protokollText.trim()) {
        setError("Bitte die durchgeführten Arbeiten beschreiben.");
        return;
      }
      if (!ort.trim()) {
        setError("Bitte den Ort angeben.");
        return;
      }
      setStep("signatur");
    }
  }

  function goBack() {
    setError(null);
    if (step === "beschreibung") setStep("checkliste");
    else if (step === "signatur") setStep("beschreibung");
  }

  async function onSubmit() {
    if (!hwName.trim()) {
      setError("Bitte den Namen des Ausführenden eintragen.");
      return;
    }
    if (!kundeName.trim()) {
      setError("Bitte den Namen des Kunden vor Ort eintragen.");
      return;
    }
    if (!hwHasSig || !hwSig) {
      setError("Bitte die Handwerker-Signatur zeichnen.");
      return;
    }
    if (!kundeHasSig || !kundeSig) {
      setError(HW_ABNAHME_COPY.kundeSigRequiredSoft);
      return;
    }
    setLoading(true);
    setError(null);
    const payload = flattenAbschlussChecksForPersist(rows);
    const res = await submitPartnerAbnahmeprotokoll({
      auftragId,
      protokollText,
      maengelText: maengelText.trim() || undefined,
      ort,
      abnahmeDatum,
      hwUnterschriftName: hwName,
      kundeUnterschriftName: kundeName,
      hwSignaturPng: hwSig,
      kundeSignaturPng: kundeSig,
      abschlussChecks: payload.global,
      abschlussChecksPayload: payload,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    partnerPortalToast.abschlussSigniert();
    router.refresh();
    onSuccess(res.vollstaendig);
    resetAndClose();
  }

  const primaryLabel =
    step === "signatur"
      ? loading
        ? "Wird gespeichert…"
        : "Abschluss signieren"
      : "Weiter";

  return (
    <PortalModalShell
      open={open}
      title="Abschlussdokumentation"
      subtitle={`Schritt ${stepIndex + 1} von ${STEPS.length}: ${STEPS[stepIndex].label}`}
      onClose={resetAndClose}
      size="funnel"
      maxWidth={560}
      closeOnBackdrop={false}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-4 flex items-center gap-2">
          {STEPS.map((s, i) => {
            const done = i < stepIndex;
            const act = i === stepIndex;
            return (
              <div key={s.id} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="h-1.5 w-full rounded-full"
                  style={{
                    background:
                      done || act ? PORTAL_VAR.primary : PORTAL_VAR.line,
                  }}
                />
                <span
                  className="text-[10.5px] font-semibold"
                  style={{ color: act ? PORTAL_VAR.ink : PORTAL_VAR.faint }}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
          {step === "checkliste" ? (
            <div className="space-y-4">
              <p className="text-[12.5px]" style={{ color: PORTAL_VAR.sub }}>
                Je Leistung bestätigen. Dokumentierte Leistungen sind
                vorbelegt — bitte prüfen und abhaken.
              </p>
              {rows.map((row) => (
                <div
                  key={row.leistungId}
                  className="space-y-2 rounded-xl p-3"
                  style={{ border: `1px solid ${PORTAL_VAR.line}` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className="text-[13.5px] font-semibold"
                      style={{ color: PORTAL_VAR.ink }}
                    >
                      {row.leistungName}
                    </p>
                    {row.dokumentiert ? (
                      <span
                        className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase"
                        style={{
                          background: "rgba(31,106,63,0.12)",
                          color: PORTAL_VAR.primary,
                        }}
                      >
                        dokumentiert
                      </span>
                    ) : null}
                  </div>
                  {HW_ABSCHLUSS_CHECKS.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer gap-3 rounded-lg px-2 py-2"
                      style={{ background: "rgba(0,0,0,0.02)" }}
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={row.checks[c.id]}
                        onChange={(e) =>
                          setCheck(row.leistungId, c.id, e.target.checked)
                        }
                      />
                      <span>
                        <span
                          className="block text-[13px] font-semibold"
                          style={{ color: PORTAL_VAR.ink }}
                        >
                          {c.title}
                        </span>
                        <span
                          className="mt-0.5 block text-[11.5px]"
                          style={{ color: PORTAL_VAR.sub }}
                        >
                          {c.subtitle}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          ) : null}

          {step === "beschreibung" ? (
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span
                  className="text-[12px] font-semibold"
                  style={{ color: PORTAL_VAR.sub }}
                >
                  Protokoll / durchgeführte Arbeiten *
                </span>
                <textarea
                  required
                  rows={5}
                  value={protokollText}
                  onChange={(e) => setProtokollText(e.target.value)}
                  placeholder="Kurz beschreiben, was abgenommen wurde …"
                  className="portal-input w-full min-h-[120px] resize-y"
                />
              </label>
              <label className="block space-y-1.5">
                <span
                  className="text-[12px] font-semibold"
                  style={{ color: PORTAL_VAR.sub }}
                >
                  Mängel / Vorbehalte (optional)
                </span>
                <textarea
                  rows={2}
                  value={maengelText}
                  onChange={(e) => setMaengelText(e.target.value)}
                  placeholder="Falls vor Ort Mängel vermerkt wurden …"
                  className="portal-input w-full resize-y"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: PORTAL_VAR.sub }}
                  >
                    Ort *
                  </span>
                  <input
                    required
                    type="text"
                    value={ort}
                    onChange={(e) => setOrt(e.target.value)}
                    placeholder="z. B. München, Musterstraße 1"
                    className="portal-input w-full"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: PORTAL_VAR.sub }}
                  >
                    Datum *
                  </span>
                  <input
                    required
                    type="date"
                    value={abnahmeDatum}
                    onChange={(e) => setAbnahmeDatum(e.target.value)}
                    className="portal-input w-full"
                  />
                </label>
              </div>
            </div>
          ) : null}

          {step === "signatur" ? (
            <div className="space-y-5">
              <p
                className="rounded-lg px-3 py-2 text-[12px]"
                style={{
                  background: "rgba(31,106,63,0.08)",
                  color: PORTAL_VAR.sub,
                }}
              >
                {HW_ABNAHME_COPY.mobileSigHint}
              </p>
              <label className="block space-y-1.5">
                <span
                  className="text-[12px] font-semibold"
                  style={{ color: PORTAL_VAR.sub }}
                >
                  Handwerker / Ausführender Betrieb *
                </span>
                <input
                  required
                  type="text"
                  value={hwName}
                  onChange={(e) => setHwName(e.target.value)}
                  placeholder="Vor- und Nachname"
                  className="portal-input w-full font-medium"
                  autoComplete="name"
                />
                <SignatureCanvas
                  large
                  onChange={(has, dataUrl) => {
                    setHwHasSig(has);
                    setHwSig(dataUrl);
                  }}
                />
              </label>
              <label className="block space-y-1.5">
                <span
                  className="text-[12px] font-semibold"
                  style={{ color: PORTAL_VAR.sub }}
                >
                  Kunde / Auftraggeber vor Ort *
                </span>
                <input
                  required
                  type="text"
                  value={kundeName}
                  onChange={(e) => setKundeName(e.target.value)}
                  placeholder="Vor- und Nachname des Kunden"
                  className="portal-input w-full font-medium"
                  autoComplete="name"
                />
                <p className="text-[11.5px]" style={{ color: PORTAL_VAR.faint }}>
                  {HW_ABNAHME_COPY.kundeSigHint}
                </p>
                <SignatureCanvas
                  large
                  onChange={(has, dataUrl) => {
                    setKundeHasSig(has);
                    setKundeSig(dataUrl);
                  }}
                />
              </label>
            </div>
          ) : null}

          {error ? <PartnerDetailError message={error} /> : null}
        </div>

        <div
          className="flex shrink-0 flex-wrap gap-2 border-t pt-3"
          style={{ borderColor: PORTAL_VAR.line2 }}
        >
          {stepIndex > 0 ? (
            <button
              type="button"
              disabled={loading}
              onClick={goBack}
              className="rounded-[9px] border px-4 py-2.5 text-[13px] font-semibold"
              style={{
                borderColor: PORTAL_VAR.line,
                color: PORTAL_VAR.sub,
                background: "#fff",
              }}
            >
              Zurück
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={resetAndClose}
              className="rounded-[9px] border px-4 py-2.5 text-[13px] font-semibold"
              style={{
                borderColor: PORTAL_VAR.line,
                color: PORTAL_VAR.sub,
                background: "#fff",
              }}
            >
              Abbrechen
            </button>
          )}
          <button
            type="button"
            disabled={
              loading ||
              (step === "checkliste" && !allChecks) ||
              (step === "signatur" &&
                (!hwHasSig || !kundeHasSig || !hwName.trim() || !kundeName.trim()))
            }
            onClick={() => {
              if (step === "signatur") void onSubmit();
              else goNext();
            }}
            className={cn(
              "ml-auto flex-1 rounded-[9px] px-4 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-50 sm:flex-none"
            )}
            style={{ background: PORTAL_VAR.primary }}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </PortalModalShell>
  );
}
