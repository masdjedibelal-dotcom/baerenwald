"use client";

import { useMemo, useState } from "react";
import { Package } from "lucide-react";

import type { KatalogProdukt } from "@/lib/katalog/katalog-produkte";
import {
  formatProduktPreis,
  groessenklasseLabel,
} from "@/lib/katalog/katalog-produkte";
import type { OrganisationKunde, OrganisationObjekt } from "@/lib/org/types";
import {
  PortalListeEyebrow,
  PortalListeFilterChip,
  PortalListeTitle,
} from "@/components/shared/PortalListeChrome";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

type Props = {
  kunde: OrganisationKunde;
  objekte: OrganisationObjekt[];
  produkte: KatalogProdukt[];
  onOrdered: () => void;
};

const FAMILIEN: Array<{ id: string; label: string }> = [
  { id: "pakete", label: "Übergabe & Vermietung" },
  { id: "renovierung", label: "Renovierung" },
  { id: "fix", label: "Fixpreis-Leistungen" },
  { id: "service", label: "Service-Abos" },
  { id: "zubuch", label: "Zubuch-Optionen" },
];

export function OrganisationLeistungenPanel({
  objekte,
  produkte,
  onOrdered,
}: Props) {
  const [familie, setFamilie] = useState("pakete");
  const [objektId, setObjektId] = useState(objekte[0]?.id ?? "");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(
    () => produkte.filter((p) => p.familie === familie),
    [produkte, familie]
  );

  async function bestellen(produkt: KatalogProdukt, groessenklasse?: string) {
    if (!objektId) {
      portalToastError("Bitte Objekt wählen.");
      return;
    }
    setBusy(produkt.slug);
    try {
      const res = await fetch("/api/org/katalog/bestellen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produktSlug: produkt.slug,
          kundeObjektId: objektId,
          groessenklasse,
        }),
      });
      const data = (await res.json()) as { error?: string; modus?: string };
      if (!res.ok) throw new Error(data.error ?? "Bestellung fehlgeschlagen");
      portalToastSuccess(
        data.modus === "direkt"
          ? "Beauftragt — Bärenwald setzt um."
          : "Anfrage eingegangen — Angebot folgt."
      );
      onOrdered();
    } catch (e) {
      portalToastError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <PortalListeEyebrow>Katalog</PortalListeEyebrow>
        <PortalListeTitle>Leistungen</PortalListeTitle>
        <p className="max-w-[40rem] text-[15px] leading-[1.55] text-[#55615B]">
          Pakete, Fixpreise und Service-Abos für Ihre Objekte
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FAMILIEN.map((f) => (
          <PortalListeFilterChip
            key={f.id}
            active={familie === f.id}
            onClick={() => setFamilie(f.id)}
          >
            {f.label}
          </PortalListeFilterChip>
        ))}
      </div>

      <label className="block space-y-1.5">
        <span className="text-[13px] font-semibold text-[#55615B]">Objekt</span>
        <select
          value={objektId}
          onChange={(e) => setObjektId(e.target.value)}
          className="portal-leistungen-select"
        >
          {objekte.map((o) => (
            <option key={o.id} value={o.id}>
              {o.titel}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3.5 sm:grid-cols-2">
        {filtered.map((p) => (
          <article key={p.slug} className="portal-leistungen-card">
            <div className="flex items-start gap-3">
              <span className="portal-leistungen-icon" aria-hidden>
                <Package className="h-5 w-5" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <h3 className="text-[17px] font-bold leading-snug text-text-primary">
                  {p.bezeichnung}
                </h3>
                <p className="mt-1 text-[14.5px] font-semibold text-[#2E7D52]">
                  {formatProduktPreis(p)}
                </p>
              </div>
            </div>
            {p.preis_typ === "fix" && p.preise.some((pr) => pr.groessenklasse) ? (
              <div className="mt-auto space-y-2">
                {p.preise.map((pr) => (
                  <button
                    key={pr.id}
                    type="button"
                    disabled={busy === p.slug}
                    className="portal-leistungen-cta"
                    onClick={() => void bestellen(p, pr.groessenklasse ?? undefined)}
                  >
                    {groessenklasseLabel(pr.groessenklasse)} · {pr.preis_fix} € netto
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                disabled={busy === p.slug}
                className={cn("portal-leistungen-cta", "mt-auto")}
                onClick={() => void bestellen(p)}
              >
                {p.has_fixpreis || p.preis_typ === "fix"
                  ? "Beauftragen"
                  : "Angebot anfordern"}
              </button>
            )}
          </article>
        ))}
        {filtered.length === 0 ? (
          <p className="text-[14.5px] text-[#55615B] sm:col-span-2">
            Keine Leistungen in dieser Kategorie.
          </p>
        ) : null}
      </div>

      {familie === "service" ? (
        <p className="text-[13.5px] leading-[1.6] text-[#8A938E]">
          Abos starten am 1. des Folgemonats, Kündigung zum Monatsende mit 4 Wochen Frist.
          Sammelrechnung 1× monatlich je Objekt.
        </p>
      ) : null}
    </div>
  );
}
