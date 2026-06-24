"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { AlertTriangle, Filter, Mail, Phone } from "lucide-react";

import { OrgFreigabeBanner } from "@/components/org/OrgFreigabeBanner";
import { PortalListCard } from "@/components/shared/PortalListCard";
import { meldeKategorieLabel } from "@/lib/org/melde-kategorien";
import {
  eingangStatusLabel,
  isMeldeNotfall,
  meldeFotosFromLead,
  meldeKategorieFromLead,
} from "@/lib/org/org-eingang-utils";
import type { OrganisationLead, OrganisationObjekt } from "@/lib/org/types";
import { fmtPortalStatus } from "@/lib/portal/portal-display";
import { portalDetailStatusPillClass } from "@/lib/shared/portal-detail-format";
import { cn } from "@/lib/utils";

type Props = {
  eingang: OrganisationLead[];
  objekte: OrganisationObjekt[];
  onRefresh: () => void;
};

type StatusFilter = "alle" | "neu" | "wartet_melder" | "wartet_freigabe";

export function OrganisationEingangPanel({
  eingang,
  objekte,
  onRefresh,
}: Props) {
  const [objektFilter, setObjektFilter] = useState<string>("alle");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("alle");
  const [onlyNotfall, setOnlyNotfall] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    eingang[0]?.id ?? null
  );
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return eingang.filter((lead) => {
      if (objektFilter !== "alle" && lead.kunde_objekt_id !== objektFilter) {
        return false;
      }
      if (onlyNotfall && !isMeldeNotfall(lead)) return false;
      if (statusFilter === "neu") {
        return lead.status === "neu" || !lead.status;
      }
      if (statusFilter === "wartet_melder") {
        return lead.einladung_status === "offen";
      }
      if (statusFilter === "wartet_freigabe") {
        return lead.org_freigabe_status === "ausstehend";
      }
      return true;
    });
  }, [eingang, objektFilter, onlyNotfall, statusFilter]);

  const selected =
    filtered.find((l) => l.id === selectedId) ??
    eingang.find((l) => l.id === selectedId) ??
    null;

  const fotos = selected ? meldeFotosFromLead(selected) : [];
  const kategorie = selected ? meldeKategorieFromLead(selected) : null;

  const resendEinladung = async () => {
    if (!selected) return;
    setResendBusy(true);
    setResendMsg(null);
    try {
      const res = await fetch("/api/org/meldung-einladung-erneut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: selected.id }),
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

  return (
    <div className="space-y-4">
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
          <option value="wartet_freigabe">Wartet Freigabe</option>
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
                  onClick={() => setSelectedId(lead.id)}
                  title={kat}
                  subtitle={lead.objekt?.titel ?? "Objekt"}
                  statusLabel={fmtPortalStatus(eingangStatusLabel(lead))}
                  statusPillClass={portalDetailStatusPillClass(
                    lead.org_freigabe_status === "ausstehend"
                      ? "wartet"
                      : lead.status ?? ""
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

        <aside className="card-bordered p-4 rounded-xl space-y-3 min-h-[280px]">
          {selected ? (
            <>
              <OrgFreigabeBanner
                leadId={selected.id}
                status={selected.org_freigabe_status ?? ""}
                onUpdated={onRefresh}
              />

              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {meldeKategorieLabel(kategorie ?? undefined)}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {selected.objekt?.titel ?? "Objekt"}
                  </p>
                  {selected.objekt?.adresseZeile ? (
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {selected.objekt.adresseZeile}
                      {selected.objekt.plzOrt
                        ? ` · ${selected.objekt.plzOrt}`
                        : ""}
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

              {selected.kontakt_nachricht ? (
                <div>
                  <p className="text-xs font-medium text-text-tertiary mb-1">
                    Beschreibung
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {selected.kontakt_nachricht}
                  </p>
                </div>
              ) : null}

              {(selected.melder_name ||
                selected.melder_einheit ||
                selected.melder_email ||
                selected.melder_telefon) && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                  <p className="text-xs font-medium text-text-tertiary">Melder</p>
                  {selected.melder_name ? (
                    <p>
                      <strong>{selected.melder_name}</strong>
                      {selected.melder_einheit
                        ? ` · ${selected.melder_einheit}`
                        : ""}
                    </p>
                  ) : null}
                  {selected.melder_email ? (
                    <p className="inline-flex items-center gap-1 text-text-secondary">
                      <Mail className="h-3.5 w-3.5" />
                      {selected.melder_email}
                    </p>
                  ) : null}
                  {selected.melder_telefon ? (
                    <p className="inline-flex items-center gap-1 text-text-secondary">
                      <Phone className="h-3.5 w-3.5" />
                      {selected.melder_telefon}
                    </p>
                  ) : null}
                </div>
              )}

              {selected.einladung_status === "offen" ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                  <p>Wartet auf Ergänzung durch Melder.</p>
                  {selected.melder_email ? (
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

              {selected.created_at ? (
                <p className="text-xs text-text-tertiary">
                  Eingegangen:{" "}
                  {new Date(selected.created_at).toLocaleString("de-DE")}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-text-secondary">Meldung auswählen</p>
          )}
        </aside>
      </div>
    </div>
  );
}
