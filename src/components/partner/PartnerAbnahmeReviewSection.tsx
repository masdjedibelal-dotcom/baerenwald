"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, Send } from "lucide-react";

import {
  bestaetigePartnerAbnahme,
  getPartnerAbnahmeStatus,
  versendePartnerAbnahme,
} from "@/app/actions/partner-abnahmeprotokoll";
import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

type Status = {
  protokoll_id: string | null;
  pdf_url: string | null;
  abnahme_datum: string | null;
  punkte_count: number;
  maengel_count: number;
  an_kunde_gesendet_at: string | null;
  handwerker_bestaetigt_at: string | null;
};

type Props = {
  auftragId: string;
  protokollId?: string | null;
  initialPdfUrl?: string | null;
  focus?: boolean;
};

export function PartnerAbnahmeReviewSection({
  auftragId,
  protokollId,
  initialPdfUrl,
  focus,
}: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status | null>(
    initialPdfUrl
      ? {
          protokoll_id: protokollId ?? null,
          pdf_url: initialPdfUrl,
          abnahme_datum: null,
          punkte_count: 0,
          maengel_count: 0,
          an_kunde_gesendet_at: null,
          handwerker_bestaetigt_at: null,
        }
      : null
  );
  const [loading, setLoading] = useState(!initialPdfUrl);
  const [busy, setBusy] = useState<"bestaetigen" | "versenden" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getPartnerAbnahmeStatus(auftragId, protokollId);
    setLoading(false);
    if (!r.ok) {
      if (!initialPdfUrl) setStatus(null);
      return;
    }
    setStatus({
      protokoll_id: r.protokoll_id,
      pdf_url: r.pdf_url ?? initialPdfUrl ?? null,
      abnahme_datum: r.abnahme_datum,
      punkte_count: r.punkte_count,
      maengel_count: r.maengel_count,
      an_kunde_gesendet_at: r.an_kunde_gesendet_at,
      handwerker_bestaetigt_at: r.handwerker_bestaetigt_at,
    });
  }, [auftragId, protokollId, initialPdfUrl]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!focus) return;
    const t = window.setTimeout(() => {
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [focus]);

  if (loading && !status?.pdf_url) {
    return (
      <PortalDetailCard title="Abnahmeprotokoll">
        <p className="text-[13px]" style={{ color: PORTAL_VAR.sub }}>
          Protokoll wird geladen …
        </p>
      </PortalDetailCard>
    );
  }

  if (!status?.pdf_url && !status?.protokoll_id) return null;

  const confirmed = Boolean(status.handwerker_bestaetigt_at);
  const sent = Boolean(status.an_kunde_gesendet_at);
  const done = confirmed || sent;

  async function onBestaetigen() {
    setBusy("bestaetigen");
    const r = await bestaetigePartnerAbnahme(auftragId, status?.protokoll_id);
    setBusy(null);
    if (!r.ok) {
      portalToastError(r.error);
      return;
    }
    portalToastSuccess("Abnahmeprotokoll bestätigt.");
    await load();
    router.refresh();
  }

  async function onVersenden() {
    setBusy("versenden");
    const r = await versendePartnerAbnahme(auftragId, status?.protokoll_id);
    setBusy(null);
    if (!r.ok) {
      portalToastError(r.error);
      return;
    }
    portalToastSuccess("Abnahmeprotokoll an Kunden versendet.");
    await load();
    router.refresh();
  }

  return (
    <div ref={rootRef}>
      <PortalDetailCard title="Abnahmeprotokoll">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
              style={{ background: PORTAL_VAR.primarySoft, color: PORTAL_VAR.primary }}
            >
              <FileText className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-bold text-text-primary">
                Abnahmeprotokoll bereit
              </p>
              <p className="mt-0.5 text-[12.5px] text-text-tertiary">
                {[
                  status.abnahme_datum
                    ? `Datum ${new Date(status.abnahme_datum).toLocaleDateString("de-DE")}`
                    : null,
                  `${status.punkte_count} Leistung${status.punkte_count === 1 ? "" : "en"}`,
                  status.maengel_count
                    ? `${status.maengel_count} Mangel${status.maengel_count === 1 ? "" : "e"}`
                    : "ohne Mangel",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {sent ? (
                <span className="mt-2 inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11.5px] font-bold text-emerald-800">
                  Versendet
                </span>
              ) : confirmed ? (
                <span className="mt-2 inline-block rounded-full bg-sky-100 px-2.5 py-0.5 text-[11.5px] font-bold text-sky-800">
                  Bestätigt
                </span>
              ) : null}
            </div>
          </div>

          {status.pdf_url ? (
            <a
              href={status.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-xl border border-border-light bg-muted/20"
            >
              <iframe
                title="Abnahmeprotokoll PDF"
                src={status.pdf_url}
                className="h-[280px] w-full border-0"
              />
              <p
                className="border-t border-border-light px-3 py-2 text-center text-[12.5px] font-semibold"
                style={{ color: PORTAL_VAR.primary }}
              >
                PDF öffnen
              </p>
            </a>
          ) : null}

          {!done ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="btn-pill-outline flex flex-1 items-center justify-center gap-2"
                disabled={busy !== null}
                onClick={() => void onBestaetigen()}
              >
                <Check className="h-4 w-4" aria-hidden />
                {busy === "bestaetigen" ? "…" : "Bestätigen"}
              </button>
              <button
                type="button"
                className={cn(
                  "btn-pill-primary flex flex-1 items-center justify-center gap-2",
                  busy && "opacity-60"
                )}
                disabled={busy !== null}
                onClick={() => void onVersenden()}
              >
                <Send className="h-4 w-4" aria-hidden />
                {busy === "versenden" ? "…" : "Versenden"}
              </button>
            </div>
          ) : null}
        </div>
      </PortalDetailCard>
    </div>
  );
}
