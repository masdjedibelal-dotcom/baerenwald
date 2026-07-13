"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { submitPartnerAbnahmeprotokoll } from "@/app/actions/partner-abnahmeprotokoll";
import {
  PartnerDetailError,
  PartnerDetailSection,
} from "@/components/partner/PartnerDetailUi";
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    });

    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }

    partnerPortalToast.erledigtGemeldet();
    router.refresh();
    onSuccess(res.vollstaendig);
  }

  return (
    <PartnerDetailSection title="Abnahmeprotokoll">
      <p className="portal-text-body text-text-secondary mb-4">
        Füllen Sie das Protokoll gemeinsam mit dem Kunden vor Ort aus. Die
        Unterschrift erfolgt digital durch den vollständigen Namen.
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
            Digitale Unterschrift (voller Name)
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
          </label>
        </div>

        {error ? <PartnerDetailError message={error} /> : null}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="btn-pill-primary portal-btn"
          >
            {loading ? "Wird gespeichert…" : "Abnahme abschließen"}
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
