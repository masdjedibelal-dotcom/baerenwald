"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { submitPartnerAbnahmeprotokoll } from "@/app/actions/partner-abnahmeprotokoll";
import { PartnerDetailError } from "@/components/partner/PartnerDetailUi";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { SignatureCanvas } from "@/components/shared/SignatureCanvas";
import {
  HW_ABSCHLUSS_CHECKS,
  type HwAbschlussCheckId,
} from "@/lib/portal2/hw-kalkulation";
import { PORTAL_C } from "@/lib/portal2/tokens";
import { partnerPortalToast } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "checkliste", label: "Checkliste" },
  { id: "beschreibung", label: "Beschreibung" },
  { id: "signatur", label: "Signatur" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

type Props = {
  open: boolean;
  auftragId: string;
  leistungen: string[];
  defaultOrt?: string;
  onClose: () => void;
  onSuccess: (vollstaendig: boolean) => void;
};

export function PartnerAbschlussModal({
  open,
  auftragId,
  leistungen,
  defaultOrt = "",
  onClose,
  onSuccess,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<StepId>("checkliste");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [checks, setChecks] = useState<Record<HwAbschlussCheckId, boolean>>({
    leistung: false,
    funktion: false,
    sauber: false,
    material: false,
  });
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

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const allChecks = useMemo(
    () => HW_ABSCHLUSS_CHECKS.every((c) => checks[c.id]),
    [checks]
  );

  function resetAndClose() {
    setStep("checkliste");
    setError(null);
    onClose();
  }

  function goNext() {
    setError(null);
    if (step === "checkliste") {
      if (!allChecks) {
        setError("Bitte alle Abschluss-Punkte bestätigen.");
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
    setLoading(true);
    setError(null);
    const res = await submitPartnerAbnahmeprotokoll({
      auftragId,
      protokollText,
      maengelText: maengelText.trim() || undefined,
      ort,
      abnahmeDatum,
      hwUnterschriftName: hwName,
      kundeUnterschriftName: kundeName,
      hwSignaturPng: hwSig,
      kundeSignaturPng: kundeHasSig ? kundeSig ?? undefined : undefined,
      abschlussChecks: checks,
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
        {/* Step dots */}
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
                      done || act ? PORTAL_C.primary : "rgba(0,0,0,0.08)",
                  }}
                />
                <span
                  className="text-[10.5px] font-semibold"
                  style={{ color: act ? PORTAL_C.ink : PORTAL_C.faint }}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
          {leistungen.length > 0 && step === "checkliste" ? (
            <div
              className="rounded-xl p-3"
              style={{
                border: `1px solid ${PORTAL_C.line}`,
                background: "rgba(0,0,0,0.02)",
              }}
            >
              <p
                className="mb-1 text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: PORTAL_C.faint }}
              >
                Leistungen in diesem Abschluss
              </p>
              <ul
                className="list-disc space-y-0.5 pl-5 text-[13px]"
                style={{ color: PORTAL_C.sub }}
              >
                {leistungen.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {step === "checkliste" ? (
            <div className="space-y-2">
              {HW_ABSCHLUSS_CHECKS.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer gap-3 rounded-xl px-3 py-3"
                  style={{ border: `1px solid ${PORTAL_C.line}` }}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checks[c.id]}
                    onChange={(e) =>
                      setChecks((prev) => ({
                        ...prev,
                        [c.id]: e.target.checked,
                      }))
                    }
                  />
                  <span>
                    <span
                      className="block text-[13.5px] font-semibold"
                      style={{ color: PORTAL_C.ink }}
                    >
                      {c.title}
                    </span>
                    <span
                      className="mt-0.5 block text-[12px]"
                      style={{ color: PORTAL_C.sub }}
                    >
                      {c.subtitle}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          ) : null}

          {step === "beschreibung" ? (
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span
                  className="text-[12px] font-semibold"
                  style={{ color: PORTAL_C.sub }}
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
                  style={{ color: PORTAL_C.sub }}
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
                    style={{ color: PORTAL_C.sub }}
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
                    style={{ color: PORTAL_C.sub }}
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
              <label className="block space-y-1.5">
                <span
                  className="text-[12px] font-semibold"
                  style={{ color: PORTAL_C.sub }}
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
                  onChange={(has, dataUrl) => {
                    setHwHasSig(has);
                    setHwSig(dataUrl);
                  }}
                />
              </label>
              <label className="block space-y-1.5">
                <span
                  className="text-[12px] font-semibold"
                  style={{ color: PORTAL_C.sub }}
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
                <p className="text-[11.5px]" style={{ color: PORTAL_C.faint }}>
                  Optional: Gegenzeichnung vor Ort (HV-Gegenzeichnung bleibt im
                  Kunden-/HV-Portal).
                </p>
                <SignatureCanvas
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
          style={{ borderColor: PORTAL_C.line2 }}
        >
          {stepIndex > 0 ? (
            <button
              type="button"
              disabled={loading}
              onClick={goBack}
              className="rounded-[9px] border px-4 py-2.5 text-[13px] font-semibold"
              style={{
                borderColor: PORTAL_C.line,
                color: PORTAL_C.sub,
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
                borderColor: PORTAL_C.line,
                color: PORTAL_C.sub,
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
              (step === "signatur" && (!hwHasSig || !hwName.trim()))
            }
            onClick={() => {
              if (step === "signatur") void onSubmit();
              else goNext();
            }}
            className={cn(
              "ml-auto flex-1 rounded-[9px] px-4 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-50 sm:flex-none"
            )}
            style={{ background: PORTAL_C.primary }}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </PortalModalShell>
  );
}
