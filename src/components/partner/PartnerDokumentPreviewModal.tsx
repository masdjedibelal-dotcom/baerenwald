"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  previewPartnerAutoDokument,
  submitPartnerAutoAngebot,
  submitPartnerAutoRechnung,
  type PartnerAutoDocPreview,
} from "@/app/actions/partner-auto-dokumente";
import { PartnerDetailError } from "@/components/partner/PartnerDetailUi";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { partnerPortalToast } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

function fmtEur(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

type Props = {
  open: boolean;
  anfrageId: string;
  art: "angebot" | "rechnung";
  leistungsZeitraum?: string;
  onClose: () => void;
  onSuccess: () => void;
  /** Optional: Modal schließen ohne Dokument (z. B. später). */
  allowSkip?: boolean;
};

export function PartnerDokumentPreviewModal({
  open,
  anfrageId,
  art,
  leistungsZeitraum,
  onClose,
  onSuccess,
  allowSkip = true,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PartnerAutoDocPreview | null>(null);
  const [dokumentNr, setDokumentNr] = useState("");

  useEffect(() => {
    if (!open || !anfrageId) return;
    let cancelled = false;
    setPreviewLoading(true);
    setError(null);
    setPreview(null);
    setDokumentNr("");
    void previewPartnerAutoDokument({ anfrageId, art }).then((res) => {
      if (cancelled) return;
      setPreviewLoading(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPreview(res.preview);
      setDokumentNr(res.preview.dokumentNr);
    });
    return () => {
      cancelled = true;
    };
  }, [open, anfrageId, art]);

  async function onSubmit() {
    if (!preview?.canSubmit) return;
    const nr = dokumentNr.trim();
    if (!nr) {
      setError(
        art === "rechnung"
          ? "Bitte deine Rechnungsnummer eintragen."
          : "Bitte eine Angebotsnummer eintragen."
      );
      return;
    }
    setLoading(true);
    setError(null);
    const res =
      art === "angebot"
        ? await submitPartnerAutoAngebot(anfrageId, { dokumentNr: nr })
        : await submitPartnerAutoRechnung({
            anfrageId,
            leistungsZeitraum,
            dokumentNr: nr,
          });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (art === "angebot") {
      partnerPortalToast.unterlagenHochgeladen();
    } else {
      partnerPortalToast.rechnungEingereicht();
    }
    router.refresh();
    onSuccess();
  }

  const title = art === "angebot" ? "Angebot prüfen" : "Rechnung prüfen";
  const primary =
    art === "angebot"
      ? loading
        ? "Wird erstellt…"
        : "Angebot erstellen & bestätigen"
      : loading
        ? "Wird eingereicht…"
        : "Rechnung einreichen";

  return (
    <PortalModalShell
      open={open}
      title={title}
      subtitle={
        art === "angebot"
          ? "Aus Firmendaten und bestätigten Konditionen"
          : "Aus Firmendaten und erledigten Leistungen"
      }
      onClose={onClose}
      size="funnel"
      maxWidth={560}
      closeOnBackdrop={false}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
          {previewLoading ? (
            <p className="text-[13px]" style={{ color: PORTAL_VAR.sub }}>
              Vorschau wird geladen…
            </p>
          ) : null}

          {preview ? (
            <>
              <div
                className="rounded-xl p-3 space-y-3"
                style={{ border: `1px solid ${PORTAL_VAR.line}` }}
              >
                <label className="block space-y-1.5">
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: PORTAL_VAR.faint }}
                  >
                    {art === "angebot"
                      ? "Angebotsnummer *"
                      : "Deine Rechnungsnummer *"}
                  </span>
                  <input
                    type="text"
                    value={dokumentNr}
                    onChange={(e) => setDokumentNr(e.target.value)}
                    placeholder={
                      art === "rechnung" ? "z. B. RE-2026-0042" : "z. B. A-2026-12"
                    }
                    className="portal-input w-full font-semibold"
                    autoComplete="off"
                  />
                  <span
                    className="block text-[11.5px] leading-snug"
                    style={{ color: PORTAL_VAR.faint }}
                  >
                    {art === "rechnung"
                      ? "Pflichtangabe auf der Rechnung — bitte deine interne, fortlaufende Nummer verwenden. Vorschlag ist anpassbar."
                      : "Vorschlag aus Firma/Datum — kannst du vor dem Erstellen anpassen."}
                  </span>
                </label>
                <p className="text-[13px]" style={{ color: PORTAL_VAR.sub }}>
                  {preview.betreff}
                  {preview.objektOrt ? ` · ${preview.objektOrt}` : ""}
                </p>
              </div>

              <div className="space-y-2">
                <p
                  className="text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: PORTAL_VAR.faint }}
                >
                  Positionen
                </p>
                {preview.positionen.map((p, i) => (
                  <div
                    key={`${p.titel}-${i}`}
                    className="flex justify-between gap-3 rounded-lg px-3 py-2"
                    style={{ border: `1px solid ${PORTAL_VAR.line2}` }}
                  >
                    <span className="text-[13px]" style={{ color: PORTAL_VAR.ink }}>
                      {p.titel}
                    </span>
                    <span
                      className="shrink-0 text-[13px] font-semibold"
                      style={{ color: PORTAL_VAR.ink }}
                    >
                      {fmtEur(p.netto)}
                    </span>
                  </div>
                ))}
                <p
                  className="pt-1 text-right text-[14px] font-semibold"
                  style={{ color: PORTAL_VAR.ink }}
                >
                  Netto {fmtEur(preview.nettoSumme)}
                </p>
              </div>

              {preview.missingFirmendaten.length > 0 ? (
                <div
                  className="rounded-xl p-3 text-[13px]"
                  style={{
                    background: "#FEF3C7",
                    color: "#92400E",
                    border: "1px solid #FDE68A",
                  }}
                >
                  <p className="font-semibold">Firmendaten unvollständig</p>
                  <p className="mt-1">
                    Bitte ergänzen: {preview.missingFirmendaten.join(", ")}.
                  </p>
                  <Link
                    href="/partner?section=profil"
                    className="mt-2 inline-block font-semibold underline"
                  >
                    Zu Firmendaten →
                  </Link>
                </div>
              ) : null}
            </>
          ) : null}

          {error ? <PartnerDetailError message={error} /> : null}
        </div>

        <div
          className="flex shrink-0 flex-wrap gap-2 border-t pt-3"
          style={{ borderColor: PORTAL_VAR.line2 }}
        >
          {allowSkip ? (
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="rounded-[9px] border px-4 py-2.5 text-[13px] font-semibold"
              style={{
                borderColor: PORTAL_VAR.line,
                color: PORTAL_VAR.sub,
                background: "#fff",
              }}
            >
              Später
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
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
              previewLoading ||
              !preview?.canSubmit ||
              !dokumentNr.trim()
            }
            onClick={() => void onSubmit()}
            className={cn(
              "ml-auto flex-1 rounded-[9px] px-4 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-50 sm:flex-none"
            )}
            style={{ background: PORTAL_VAR.primary }}
          >
            {primary}
          </button>
        </div>
      </div>
    </PortalModalShell>
  );
}
