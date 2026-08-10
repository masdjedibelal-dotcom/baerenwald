"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";

import { getPartnerAbnahmeStatus } from "@/app/actions/partner-abnahmeprotokoll";
import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

type Status = {
  protokoll_id: string | null;
  pdf_url: string | null;
  abnahme_datum: string | null;
  punkte_count: number;
  maengel_count: number;
  an_kunde_gesendet_at: string | null;
  handwerker_bestaetigt_at: string | null;
  freigabe_status: string | null;
};

type Props = {
  auftragId: string;
  protokollId?: string | null;
  initialPdfUrl?: string | null;
  initialFreigabeStatus?: string | null;
  initialPunkteCount?: number | null;
  initialMaengelCount?: number | null;
  focus?: boolean;
};

function freigabeBadge(status: string | null, sent: boolean) {
  if (sent) {
    return {
      label: "An Kunden / in Unterlagen",
      className: "bg-emerald-100 text-emerald-800",
    };
  }
  const s = String(status ?? "").toLowerCase();
  if (s === "zur_freigabe") {
    return {
      label: "Zur Freigabe an Bärenwald",
      className: "bg-amber-100 text-amber-900",
    };
  }
  if (s === "freigegeben") {
    return {
      label: "Von Bärenwald freigegeben",
      className: "bg-sky-100 text-sky-800",
    };
  }
  if (s === "abgelehnt") {
    return {
      label: "Abgelehnt — Nacharbeit nötig",
      className: "bg-rose-100 text-rose-800",
    };
  }
  return null;
}

export function PartnerAbnahmeReviewSection({
  auftragId,
  protokollId,
  initialPdfUrl,
  initialFreigabeStatus,
  initialPunkteCount,
  initialMaengelCount,
  focus,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status | null>(
    initialPdfUrl || initialFreigabeStatus
      ? {
          protokoll_id: protokollId ?? null,
          pdf_url: initialPdfUrl ?? null,
          abnahme_datum: null,
          punkte_count: initialPunkteCount ?? 0,
          maengel_count: initialMaengelCount ?? 0,
          an_kunde_gesendet_at: null,
          handwerker_bestaetigt_at: null,
          freigabe_status: initialFreigabeStatus ?? null,
        }
      : null
  );
  const [loading, setLoading] = useState(!initialPdfUrl && !initialFreigabeStatus);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getPartnerAbnahmeStatus(auftragId, protokollId);
    setLoading(false);
    if (!r.ok) {
      if (!initialPdfUrl && !initialFreigabeStatus) setStatus(null);
      return;
    }
    setStatus({
      protokoll_id: r.protokoll_id,
      pdf_url: r.pdf_url ?? initialPdfUrl ?? null,
      abnahme_datum: r.abnahme_datum,
      punkte_count: Math.max(r.punkte_count, initialPunkteCount ?? 0),
      maengel_count: Math.max(r.maengel_count, initialMaengelCount ?? 0),
      an_kunde_gesendet_at: r.an_kunde_gesendet_at,
      handwerker_bestaetigt_at: r.handwerker_bestaetigt_at,
      freigabe_status: r.freigabe_status ?? initialFreigabeStatus ?? null,
    });
  }, [
    auftragId,
    protokollId,
    initialPdfUrl,
    initialFreigabeStatus,
    initialPunkteCount,
    initialMaengelCount,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Optimistic nach frischem Abschluss, bevor Status-Fetch greift. */
  useEffect(() => {
    if (!initialPdfUrl && !initialFreigabeStatus && !protokollId) return;
    setStatus((prev) => ({
      protokoll_id: protokollId ?? prev?.protokoll_id ?? null,
      pdf_url: initialPdfUrl ?? prev?.pdf_url ?? null,
      abnahme_datum: prev?.abnahme_datum ?? null,
      punkte_count:
        initialPunkteCount ?? prev?.punkte_count ?? 0,
      maengel_count:
        initialMaengelCount ?? prev?.maengel_count ?? 0,
      an_kunde_gesendet_at: prev?.an_kunde_gesendet_at ?? null,
      handwerker_bestaetigt_at: prev?.handwerker_bestaetigt_at ?? null,
      freigabe_status:
        initialFreigabeStatus ?? prev?.freigabe_status ?? null,
    }));
  }, [
    initialPdfUrl,
    initialFreigabeStatus,
    protokollId,
    initialPunkteCount,
    initialMaengelCount,
  ]);

  useEffect(() => {
    if (!focus) return;
    const t = window.setTimeout(() => {
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [focus]);

  if (loading && !status?.pdf_url && !status?.freigabe_status) {
    return (
      <PortalDetailCard title="Ihr Abschluss">
        <p className="text-[13px]" style={{ color: PORTAL_VAR.sub }}>
          Protokoll wird geladen …
        </p>
      </PortalDetailCard>
    );
  }

  if (!status?.pdf_url && !status?.protokoll_id && !status?.freigabe_status) {
    return null;
  }

  const confirmed = Boolean(status.handwerker_bestaetigt_at);
  const sent = Boolean(status.an_kunde_gesendet_at);
  const freigabe = String(status.freigabe_status ?? "").toLowerCase();
  const badge = freigabeBadge(status.freigabe_status, sent);

  return (
    <div ref={rootRef}>
      <PortalDetailCard title="Ihr Abschluss">
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
                Auftrag abgeschlossen
              </p>
              <p className="mt-0.5 text-[12.5px] text-text-tertiary">
                {[
                  status.abnahme_datum
                    ? `Datum ${new Date(status.abnahme_datum).toLocaleDateString("de-DE")}`
                    : null,
                  `${status.punkte_count} Leistung${status.punkte_count === 1 ? "" : "en"}`,
                  status.maengel_count
                    ? `${status.maengel_count} Mangel${status.maengel_count === 1 ? "" : "e"}`
                    : "ohne Mängel",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {badge ? (
                <span
                  className={cn(
                    "mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11.5px] font-bold",
                    badge.className
                  )}
                >
                  {badge.label}
                </span>
              ) : confirmed ? (
                <span className="mt-2 inline-block rounded-full bg-sky-100 px-2.5 py-0.5 text-[11.5px] font-bold text-sky-800">
                  Bestätigt
                </span>
              ) : null}
              {freigabe === "abgelehnt" ? (
                <p className="mt-2 text-[12.5px] text-text-secondary">
                  Bärenwald hat den Abschluss abgelehnt. Bitte Nacharbeit
                  erledigen und erneut abschließen.
                </p>
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
        </div>
      </PortalDetailCard>
    </div>
  );
}
