"use client";

import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";

import { PartnerComplianceCheckliste } from "@/components/partner/PartnerComplianceCheckliste";
import { PartnerDetailInfoBox } from "@/components/partner/PartnerDetailUi";
import { PartnerRahmenvertragCard } from "@/components/partner/PartnerRahmenvertragCard";
import { PartnerStammdatenForm } from "@/components/partner/PartnerStammdatenForm";
import { summarizeComplianceStamm } from "@/lib/partner/compliance-summary";
import type { PartnerProfilKontext, PartnerHandwerkerProfil } from "@/lib/partner/get-partner-data";
import { cn } from "@/lib/utils";

function profilBadgeLabel(profil: PartnerProfilKontext["profil"]): string {
  if (profil.leistet_bauleistung && profil.hat_meister_gewerke) {
    return "Bau · Meisterbetrieb";
  }
  if (profil.leistet_bauleistung) return "Bauleistungen";
  if (profil.hat_meister_gewerke) return "Meister / Fachbetrieb";
  return "Facility / Dienstleistung";
}

export function PartnerProfilPanel({
  handwerker,
  profil,
  onGeheZuAuftrag,
}: {
  handwerker: PartnerHandwerkerProfil;
  profil: PartnerProfilKontext;
  onGeheZuAuftrag?: (auftragId: string) => void;
}) {
  const stamm = [...profil.allgemein, ...profil.meister];
  const summary = summarizeComplianceStamm(stamm);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="portal-text-section text-text-primary">Profil & Unterlagen</h2>
            <p className="portal-text-body mt-0.5 text-text-secondary">
              Stammdaten, Partnerunterlagen und Rahmenvertrag an einem Ort.
            </p>
          </div>
          <span className="tag bg-accent-light text-accent">{profilBadgeLabel(profil.profil)}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SummaryKpi
            label="Pflicht offen"
            value={summary.pflichtOffen}
            tone={summary.pflichtOffen > 0 ? "warn" : "ok"}
          />
          <SummaryKpi label="In Prüfung" value={summary.inPruefung} icon={Clock} />
          <SummaryKpi
            label="Läuft ab"
            value={summary.ablaufWarnung + summary.abgelaufen}
            tone={summary.ablaufWarnung + summary.abgelaufen > 0 ? "warn" : "neutral"}
            icon={AlertTriangle}
          />
          <SummaryKpi
            label="Vorhanden"
            value={summary.erledigt}
            tone="ok"
            icon={CheckCircle2}
          />
        </div>
      </div>

      <PartnerStammdatenForm handwerker={handwerker} />

      <PartnerRahmenvertragCard
        rahmenvertrag={profil.rahmenvertrag}
        stammItems={profil.stamm}
      />

      <section className="space-y-4">
        <PartnerDetailInfoBox>
          Hier pflegst du deine Stamm-Unterlagen: allgemeine Dokumente für alle Betriebe und bei
          Meister-Gewerken zusätzlich Fachbetriebsnachweise. Leistungsunterlagen je Auftrag findest
          du unter dem jeweiligen Projektvertrag.
        </PartnerDetailInfoBox>

        <PartnerComplianceCheckliste
          title="Allgemeine Partnerunterlagen"
          items={profil.allgemein}
          gruppiert
          emptyText="Keine allgemeinen Unterlagen für dein Profil."
        />

        {profil.meister.length > 0 ? (
          <PartnerComplianceCheckliste
            title="Meister & Fachbetrieb"
            items={profil.meister}
            gruppiert
            emptyText="Keine Meister-Unterlagen für dein Profil."
          />
        ) : null}
      </section>

      {profil.offeneLeistungsunterlagen.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h3 className="portal-text-section text-text-primary">Offene Leistungsunterlagen</h3>
            <p className="portal-text-meta mt-0.5 text-text-secondary">
              Pflicht-Dokumente je laufendem Auftrag — Upload erfolgt im jeweiligen Projektvertrag.
            </p>
          </div>
          <ul className="space-y-2">
            {profil.offeneLeistungsunterlagen.map((block) => (
              <li
                key={block.auftrag_id}
                className="rounded-xl border border-border-light bg-surface-card p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="portal-text-body font-semibold text-text-primary">
                      {block.auftrag_titel}
                    </p>
                    <p className="portal-text-meta text-text-secondary">
                      {block.offene_pflicht}{" "}
                      {block.offene_pflicht === 1 ? "Pflicht-Dokument" : "Pflicht-Dokumente"} offen
                    </p>
                  </div>
                  {onGeheZuAuftrag ? (
                    <button
                      type="button"
                      onClick={() => onGeheZuAuftrag(block.auftrag_id)}
                      className="btn-pill-outline portal-btn-compact !px-3"
                    >
                      Zum Auftrag →
                    </button>
                  ) : null}
                </div>
                <ul className="portal-text-meta mt-2 list-inside list-disc text-text-secondary">
                  {block.items.slice(0, 4).map((item) => (
                    <li key={item.slug}>{item.bezeichnung}</li>
                  ))}
                  {block.items.length > 4 ? (
                    <li>… und {block.items.length - 4} weitere</li>
                  ) : null}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function SummaryKpi({
  label,
  value,
  tone = "neutral",
  icon: Icon,
}: {
  label: string;
  value: number;
  tone?: "ok" | "warn" | "neutral";
  icon?: typeof Clock;
}) {
  return (
    <article
      className={cn(
        "rounded-xl border px-3 py-2.5",
        tone === "ok" && "border-emerald-200 bg-emerald-50/60",
        tone === "warn" && "border-amber-200 bg-amber-50/60",
        tone === "neutral" && "border-border-light bg-muted/20"
      )}
    >
      <p className="portal-text-meta text-text-tertiary">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 portal-text-body font-semibold text-text-primary">
        {Icon ? <Icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden /> : null}
        {value}
      </p>
    </article>
  );
}
