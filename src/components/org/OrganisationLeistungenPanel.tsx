"use client";

import { useMemo, useState } from "react";
import { Package } from "lucide-react";

import type { KatalogProdukt } from "@/lib/katalog/katalog-produkte";
import {
  formatProduktPreis,
  groessenklasseLabel,
} from "@/lib/katalog/katalog-produkte";
import type { OrganisationKunde, OrganisationObjekt } from "@/lib/org/types";
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
  kunde,
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
    <div className="space-y-4">
      <div className="space-y-0.5">
        <p className="portal-text-section text-text-primary">Leistungen</p>
        <p className="portal-text-body text-text-secondary">
          Pakete, Fixpreise und Service-Abos für Ihre Objekte
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FAMILIEN.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFamilie(f.id)}
            className={cn(
              "rounded-full px-3 py-1.5 portal-text-meta font-semibold",
              familie === f.id
                ? "bg-accent-light text-accent"
                : "bg-muted text-text-secondary"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <label className="block space-y-1">
        <span className="portal-text-meta text-text-secondary">Objekt</span>
        <select
          value={objektId}
          onChange={(e) => setObjektId(e.target.value)}
          className="input-field w-full max-w-md"
        >
          {objekte.map((o) => (
            <option key={o.id} value={o.id}>
              {o.titel}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((p) => (
          <article key={p.slug} className="card-bordered flex flex-col p-4">
            <div className="mb-2 flex items-start gap-2">
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <h3 className="font-semibold text-text-primary">{p.bezeichnung}</h3>
                <p className="portal-text-meta text-text-secondary">
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
                    className="btn-pill-outline w-full justify-between portal-btn-compact"
                    onClick={() => void bestellen(p, pr.groessenklasse ?? undefined)}
                  >
                    <span>{groessenklasseLabel(pr.groessenklasse)}</span>
                    <span>{pr.preis_fix} € netto</span>
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                disabled={busy === p.slug}
                className="btn-pill-primary mt-auto"
                onClick={() => void bestellen(p)}
              >
                {p.has_fixpreis || p.preis_typ === "fix" ? "Beauftragen" : "Angebot anfordern"}
              </button>
            )}
          </article>
        ))}
        {filtered.length === 0 ? (
          <p className="portal-text-body text-text-secondary sm:col-span-2">
            Keine Leistungen in dieser Kategorie.
          </p>
        ) : null}
      </div>

      {familie === "service" ? (
        <p className="portal-text-meta text-text-tertiary">
          Abos starten am 1. des Folgemonats, Kündigung zum Monatsende mit 4 Wochen Frist.
          Sammelrechnung 1× monatlich je Objekt.
        </p>
      ) : null}
    </div>
  );
}
