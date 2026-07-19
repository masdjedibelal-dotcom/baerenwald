"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { submitPartnerAbnahmeprotokoll } from "@/app/actions/partner-abnahmeprotokoll";
import {
  PartnerDetailError,
  PartnerDetailSection,
} from "@/components/partner/PartnerDetailUi";
import { SignatureCanvas } from "@/components/shared/SignatureCanvas";
import {
  HW_ABSCHLUSS_CHECKS,
  type HwAbschlussCheckId,
} from "@/lib/portal2/hw-kalkulation";
import { partnerPortalToast } from "@/lib/shared/portal-toast";

type Props = {
  auftragId: string;
  leistungen: string[];
  defaultOrt?: string;
  onSuccess: (vollstaendig: boolean) => void;
  onCancel: () => void;
};

export function PartnerAbnahmeprotokollForm({
  auftragId,
  leistungen,
  defaultOrt = "",
  onSuccess,
  onCancel,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [protokollText, setProtokollText] = useState("");
  const [maengelText, setMaengelText] = useState("");
  const [ort, setOrt] = useState(defaultOrt);
  const [abnahmeDatum, setAbnahmeDatum] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [hwName, setHwName] = useState("");
  const [kundeName, setKundeName] = useState("");
  const [checks, setChecks] = useState<Record<HwAbschlussCheckId, boolean>>({
    leistung: false,
    funktion: false,
    sauber: false,
    material: false,
  });
  const [hwSig, setHwSig] = useState<string | null>(null);
  const [hwHasSig, setHwHasSig] = useState(false);
  const [kundeSig, setKundeSig] = useState<string | null>(null);
  const [kundeHasSig, setKundeHasSig] = useState(false);

  const allChecks = useMemo(
    () => HW_ABSCHLUSS_CHECKS.every((c) => checks[c.id]),
    [checks]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allChecks) {
      setError("Bitte alle Abschluss-Punkte bestätigen.");
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
  }

  return (
    <PartnerDetailSection title="Abschlussdokumentation">
      <p className="portal-text-body text-text-secondary mb-4">
        Checkliste, Bericht und Canvas-Signatur vor Ort. Die Gegenzeichnung der
        Hausverwaltung bleibt im Kunden-/HV-Portal.
      </p>

      {leistungen.length > 0 ? (
        <div className="mb-4 rounded-xl border border-border-light bg-muted/20 p-3">
          <p className="portal-text-meta font-semibold text-text-tertiary mb-1">
            Leistungen in diesem Abschluss
          </p>
          <ul className="portal-text-body list-disc pl-5 text-text-secondary">
            {leistungen.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2 rounded-xl border border-border-light p-4">
          <p className="portal-text-meta font-semibold text-text-tertiary">
            Abschluss-Checkliste
          </p>
          {HW_ABSCHLUSS_CHECKS.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer gap-3 rounded-lg px-1 py-1.5 hover:bg-muted/30"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={checks[c.id]}
                onChange={(e) =>
                  setChecks((prev) => ({ ...prev, [c.id]: e.target.checked }))
                }
              />
              <span>
                <span className="block text-sm font-semibold text-text-primary">
                  {c.title}
                </span>
                <span className="block text-xs text-text-secondary">
                  {c.subtitle}
                </span>
              </span>
            </label>
          ))}
        </div>

        <label className="block space-y-1.5">
          <span className="portal-text-meta font-medium text-text-secondary">
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
          <span className="portal-text-meta font-medium text-text-secondary">
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

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="portal-text-meta font-medium text-text-secondary">
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
            <span className="portal-text-meta font-medium text-text-secondary">
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

        <div className="rounded-xl border border-border-light p-4 space-y-4">
          <p className="portal-text-meta font-semibold text-text-tertiary">
            Digitale Signatur (Canvas)
          </p>
          <label className="block space-y-1.5">
            <span className="portal-text-meta font-medium text-text-secondary">
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
            <span className="portal-text-meta font-medium text-text-secondary">
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
            <p className="portal-text-meta text-text-tertiary">
              Optional: Gegenzeichnung vor Ort (HV-Gegenzeichnung bleibt in D3/D7).
            </p>
            <SignatureCanvas
              onChange={(has, dataUrl) => {
                setKundeHasSig(has);
                setKundeSig(dataUrl);
              }}
            />
          </label>
        </div>

        {error ? <PartnerDetailError message={error} /> : null}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="submit"
            disabled={loading || !allChecks || !hwHasSig}
            className="btn-pill-primary portal-btn"
          >
            {loading ? "Wird gespeichert…" : "Abschluss signieren"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="btn-pill-outline portal-btn"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </PartnerDetailSection>
  );
}
