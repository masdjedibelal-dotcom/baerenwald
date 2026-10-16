"use client";

import { useEffect, useState } from "react";

import { listMeineUnterlagen, type PortalUnterlage } from "@/app/actions/portal-unterlagen";
import { EinstellungenSectionCard } from "@/components/shared/PortalEinstellungenUi";
import { safeAction } from "@/lib/actions/safe-action";

function datum(iso: string | null): string {
  const d = String(iso ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return "";
  const [y, m, t] = d.split("-");
  return `${t}.${m}.${y}`;
}

/** „Ihre Unterlagen“: allgemeine Dokumente von Bärenwald (nicht an einen Vorgang gebunden). Nur wenn vorhanden. */
export function PortalUnterlagenKarte() {
  const [liste, setListe] = useState<PortalUnterlage[]>([]);
  useEffect(() => {
    safeAction(listMeineUnterlagen())
      .then((r) => setListe(r.ok ? r.liste : []))
      .catch(() => setListe([]));
  }, []);
  if (!liste.length) return null;
  return (
    <EinstellungenSectionCard title="Ihre Unterlagen">
      <ul className="divide-y divide-[var(--p2-line)]">
        {liste.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
            <a href={d.href} target="_blank" rel="noopener noreferrer" className="portal-text-body min-w-0 font-medium text-accent">
              {d.name}
            </a>
            <span className="portal-text-meta shrink-0 text-text-tertiary">{datum(d.datum)}</span>
          </li>
        ))}
      </ul>
    </EinstellungenSectionCard>
  );
}
