"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Filter, Mail, Phone, X } from "lucide-react";

import { OrgFreigabeBanner } from "@/components/org/OrgFreigabeBanner";
import { OrgMeldungAktionBanner } from "@/components/org/OrgMeldungAktionBanner";
import { PortalListCard } from "@/components/shared/PortalListCard";
import { formatPreisspanneDisplay } from "@/lib/org/hv-meldung-workflow";
import { meldeKategorieLabel } from "@/lib/org/melde-kategorien";
import {
  eingangStatusLabel,
  isMeldeNotfall,
  meldeFotosFromLead,
  meldeKategorieFromLead,
} from "@/lib/org/org-eingang-utils";
import type {
  OrganisationKunde,
  OrganisationLead,
  OrganisationObjekt,
} from "@/lib/org/types";
import { fmtPortalStatus } from "@/lib/portal/portal-display";
import { portalDetailStatusPillClass } from "@/lib/shared/portal-detail-format";
import { cn } from "@/lib/utils";

type Props = {
  kunde: OrganisationKunde;
  eingang: OrganisationLead[];
  objekte: OrganisationObjekt[];
  initialSelectedId?: string | null;
  onRefresh: () => void;
};

type StatusFilter = "alle" | "neu" | "wartet_melder" | "in_bearbeitung";

function MeldungDetail({
  lead,
  kunde,
  onRefresh,
  onClose,
  showClose,
}: {
  lead: OrganisationLead;
  kunde: OrganisationKunde;
  onRefresh: () => void;
  onClose?: () => void;
  showClose?: boolean;
}) {
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  const fotos = meldeFotosFromLead(lead);
  const kategorie = meldeKategorieFromLead(lead);

  const resendEinladung = async () => {
    setResendBusy(true);
    setResendMsg(null);
    try {
      const res = await fetch("/api/org/meldung-einladung-erneut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setResendMsg(json.error ?? "Fehler beim Senden.");
        return;
      }
      setResendMsg("Einladung erneut gesendet.");
    } finally {
      setResendBusy(false);
    }
  };

  const showAngebotFreigabe =
    lead.org_freigabe_status === "ausstehend" &&
    (lead.hv_meldung_status === "angebot_eingefordert" ||
      lead.hv_meldung_status === "kleinreparatur");

  return (
    <>
      {showClose && onClose ? (
        <div className="flex justify-end lg:hidden mb-2">
          <button
            type="button"
            className="p-2 rounded-full hover:bg-muted"
            aria-label="Schließen"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      <OrgMeldungAktionBanner lead={lead} kunde={kunde} onUpdated={onRefresh} />

      {showAngebotFreigabe ? (
        <OrgFreigabeBanner
          leadId={lead.id}
          status={lead.org_freigabe_status ?? ""}
          onUpdated={onRefresh}
        />
      ) : null}

      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {meldeKategorieLabel(kategorie ?? undefined)}
          </p>
          <p className="text-sm text-text-secondary">
            {lead.objekt?.titel ?? "Objekt"}
          </p>
          {lead.objekt?.adresseZeile ? (
            <p className="text-xs text-text-tertiary mt-0.5">
              {lead.objekt.adresseZeile}
              {lead.objekt.plzOrt ? ` · ${lead.objekt.plzOrt}` : ""}
            </p>
          ) : null}
        </div>
        {kategorie === "notfall" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
            <AlertTriangle className="h-3 w-3" />
            Notfall
          </span>
        ) : null}
      </div>

      <div className="rounded-lg bg-muted/40 p-3 text-sm">
        <p className="text-xs font-medium text-text-tertiary mb-1">
          Geschätzte Preisspanne
        </p>
        <p>
          {formatPreisspanneDisplay(
            lead.preis_min,
            lead.preis_max,
            lead.preis_unsicher
          )}
        </p>
      </div>

      {lead.kontakt_nachricht ? (
        <div>
          <p className="text-xs font-medium text-text-tertiary mb-1">
            Beschreibung
          </p>
          <p className="text-sm whitespace-pre-wrap">{lead.kontakt_nachricht}</p>
        </div>
      ) : null}

      {(lead.melder_name ||
        lead.melder_einheit ||
        lead.melder_email ||
        lead.melder_telefon) && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
          <p className="text-xs font-medium text-text-tertiary">Melder</p>
          {lead.melder_name ? (
            <p>
              <strong>{lead.melder_name}</strong>
              {lead.melder_einheit ? ` · ${lead.melder_einheit}` : ""}
            </p>
          ) : null}
          {lead.melder_email ? (
            <p className="inline-flex items-center gap-1 text-text-secondary">
              <Mail className="h-3.5 w-3.5" />
              {lead.melder_email}
            </p>
          ) : null}
          {lead.melder_telefon ? (
            <p className="inline-flex items-center gap-1 text-text-secondary">
              <Phone className="h-3.5 w-3.5" />
              {lead.melder_telefon}
            </p>
          ) : null}
        </div>
      )}

      {lead.einladung_status === "offen" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <p>Wartet auf Ergänzung durch Melder.</p>
          {lead.melder_email ? (
            <button
              type="button"
              className={cn(
                "btn-pill-outline mt-2 text-xs",
                resendBusy && "opacity-60"
              )}
              disabled={resendBusy}
              onClick={resendEinladung}
            >
              Einladung erneut senden
            </button>
          ) : null}
          {resendMsg ? (
            <p className="text-xs mt-2 text-text-secondary">{resendMsg}</p>
          ) : null}
        </div>
      ) : null}

      {fotos.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-text-tertiary mb-2">
            Fotos ({fotos.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {fotos.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative aspect-square overflow-hidden rounded-lg border border-border-default"
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {lead.created_at ? (
        <p className="text-xs text-text-tertiary">
          Eingegangen: {new Date(lead.created_at).toLocaleString("de-DE")}
        </p>
      ) : null}
    </>
  );
}

export function OrganisationEingangPanel({
  kunde,
  eingang,
  objekte,
  initialSelectedId,
  onRefresh,
}: Props) {
  const [objektFilter, setObjektFilter] = useState<string>("alle");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("alle");
  const [onlyNotfall, setOnlyNotfall] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? eingang[0]?.id ?? null
  );
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  useEffect(() => {
    if (initialSelectedId) {
      setSelectedId(initialSelectedId);
      setMobileDetailOpen(true);
    }
  }, [initialSelectedId]);

  const filtered = useMemo(() => {
    return eingang.filter((lead) => {
      if (objektFilter !== "alle" && lead.kunde_objekt_id !== objektFilter) {
        return false;
      }
      if (onlyNotfall && !isMeldeNotfall(lead)) return false;
      const hv = lead.hv_meldung_status ?? "neu";
      if (statusFilter === "neu") return hv === "neu";
      if (statusFilter === "wartet_melder") {
        return lead.einladung_status === "offen";
      }
      if (statusFilter === "in_bearbeitung") {
        return hv !== "neu" && hv !== "abgelehnt" && hv !== "abgeschlossen";
      }
      return true;
    });
  }, [eingang, objektFilter, onlyNotfall, statusFilter]);

  const selected =
    filtered.find((l) => l.id === selectedId) ??
    eingang.find((l) => l.id === selectedId) ??
    null;

  const openDetail = (id: string) => {
    setSelectedId(id);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileDetailOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Meldungen</h2>
        <p className="text-sm text-text-secondary">
          Mieter-Meldungen und Direkterfassungen — Aktionen für neue Vorgänge.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border-default bg-surface-card p-3">
        <span className="inline-flex items-center gap-1 text-xs text-text-tertiary">
          <Filter className="h-3.5 w-3.5" />
          Filter
        </span>
        <select
          className="rounded-lg border border-border-default px-2 py-1.5 text-sm"
          value={objektFilter}
          onChange={(e) => setObjektFilter(e.target.value)}
        >
          <option value="alle">Alle Objekte</option>
          {objekte.map((o) => (
            <option key={o.id} value={o.id}>
              {o.titel}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-border-default px-2 py-1.5 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="alle">Alle Status</option>
          <option value="neu">Neu</option>
          <option value="wartet_melder">Wartet auf Melder</option>
          <option value="in_bearbeitung">In Bearbeitung</option>
        </select>
        <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={onlyNotfall}
            onChange={(e) => setOnlyNotfall(e.target.checked)}
          />
          Nur Notfall
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-text-secondary rounded-xl border border-dashed p-6 text-center">
              Keine Meldungen für die gewählten Filter.
            </p>
          ) : (
            filtered.map((lead) => {
              const kat = meldeKategorieLabel(
                meldeKategorieFromLead(lead) ?? undefined
              );
              const notfall = isMeldeNotfall(lead);
              return (
                <PortalListCard
                  key={lead.id}
                  selected={selectedId === lead.id}
                  onClick={() => openDetail(lead.id)}
                  title={kat}
                  subtitle={lead.objekt?.titel ?? "Objekt"}
                  statusLabel={fmtPortalStatus(eingangStatusLabel(lead))}
                  statusPillClass={portalDetailStatusPillClass(
                    lead.hv_meldung_status === "neu"
                      ? "neu"
                      : lead.org_freigabe_status === "ausstehend"
                        ? "wartet"
                        : lead.hv_meldung_status ?? lead.status ?? ""
                  )}
                  accent="anfrage"
                  meta={[
                    {
                      text: lead.melder_name
                        ? `Melder: ${lead.melder_name}`
                        : "Melder",
                    },
                    ...(notfall
                      ? [{ icon: AlertTriangle, text: "Notfall" }]
                      : []),
                  ]}
                />
              );
            })
          )}
        </div>

        <aside className="hidden lg:block card-bordered p-4 rounded-xl space-y-3 min-h-[280px]">
          {selected ? (
            <MeldungDetail
              lead={selected}
              kunde={kunde}
              onRefresh={onRefresh}
            />
          ) : (
            <p className="text-sm text-text-secondary">Meldung auswählen</p>
          )}
        </aside>
      </div>

      {mobileDetailOpen && selected ? (
        <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 -top-[100vh] bg-black/40"
            aria-label="Overlay schließen"
            onClick={() => setMobileDetailOpen(false)}
          />
          <div className="relative max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl border-t border-border-default">
            <MeldungDetail
              lead={selected}
              kunde={kunde}
              onRefresh={onRefresh}
              showClose
              onClose={() => setMobileDetailOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
