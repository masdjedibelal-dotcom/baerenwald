"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText } from "lucide-react";

import {
  bestaetigePartnerAbnahme,
  getPartnerAbnahmeStatus,
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
  freigabe_status: string | null;
};

type Props = {
  auftragId: string;
  protokollId?: string | null;
  initialPdfUrl?: string | null;
  initialFreigabeStatus?: string | null;
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
  focus,
}: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status | null>(
    initialPdfUrl || initialFreigabeStatus
      ? {
          protokoll_id: protokollId ?? null,
          pdf_url: initialPdfUrl ?? null,
          abnahme_datum: null,
          punkte_count: 0,
          maengel_count: 0,
          an_kunde_gesendet_at: null,
          handwerker_bestaetigt_at: null,
          freigabe_status: initialFreigabeStatus ?? null,
        }
      : null
  );
  const [loading, setLoading] = useState(!initialPdfUrl && !initialFreigabeStatus);
  const [busy, setBusy] = useState(false);

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
      punkte_count: r.punkte_count,
      maengel_count: r.maengel_count,
      an_kunde_gesendet_at: r.an_kunde_gesendet_at,
      handwerker_bestaetigt_at: r.handwerker_bestaetigt_at,
      freigabe_status: r.freigabe_status ?? initialFreigabeStatus ?? null,
    });
  }, [auftragId, protokollId, initialPdfUrl, initialFreigabeStatus]);

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
      punkte_count: prev?.punkte_count ?? 0,
      maengel_count: prev?.maengel_count ?? 0,
      an_kunde_gesendet_at: prev?.an_kunde_gesendet_at ?? null,
      handwerker_bestaetigt_at: prev?.handwerker_bestaetigt_at ?? null,
      freigabe_status:
        initialFreigabeStatus ?? prev?.freigabe_status ?? null,
    }));
  }, [initialPdfUrl, initialFreigabeStatus, protokollId]);

  useEffect(() => {
    if (!focus) return;
    const t = window.setTimeout(() => {
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [focus]);

  if (loading && !status?.pdf_url && !status?.freigabe_status) {
    return (
      <PortalDetailCard title="Abnahmeprotokoll">
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
  const showBestaetigen = !confirmed && freigabe !== "abgelehnt";
  const badge = freigabeBadge(status.freigabe_status, sent);

  async function onBestaetigen() {
    setBusy(true);
    const r = await bestaetigePartnerAbnahme(auftragId, status?.protokoll_id);
    setBusy(false);
    if (!r.ok) {
      portalToastError(r.error);
      return;
    }
    portalToastSuccess("Abnahmeprotokoll bestätigt.");
    await load();
    router.refresh();
  }

  return (
    <div ref={rootRef}>
      <PortalDetailCard title="Ihre Teilabnahme">
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
                Teilabnahme eingereicht
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
              <p className="mt-2 text-[12.5px] text-text-secondary">
                {freigabe === "abgelehnt"
                  ? "Bärenwald hat die Teilabnahme abgelehnt. Bitte Nacharbeit erledigen und erneut abschließen."
                  : freigabe === "freigegeben" || sent
                    ? "Freigegeben. Den finalen Versand an den Kunden übernimmt Bärenwald."
                    : "Kein automatischer Versand an den Kunden. Bärenwald prüft und gibt frei."}
              </p>
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

          {showBestaetigen ? (
            <button
              type="button"
              className="portal-action-btn portal-action-btn--primary portal-action-btn--block gap-2"
              disabled={busy}
              onClick={() => void onBestaetigen()}
            >
              <Check className="h-4 w-4" aria-hidden />
              {busy ? "…" : "Bestätigen"}
            </button>
          ) : null}
        </div>
      </PortalDetailCard>
    </div>
  );
}
