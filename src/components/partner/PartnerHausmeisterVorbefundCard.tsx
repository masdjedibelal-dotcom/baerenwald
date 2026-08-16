"use client";

import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { PortalPhotoGallery } from "@/components/shared/PortalPhotoGallery";

export type PartnerBefundEintrag = {
  id: string;
  titel: string;
  beschreibung?: string | null;
  eintrag_typ?: string | null;
  foto_urls?: string[] | null;
  foto_signed_urls?: string[] | null;
};

type ChecklistItem = {
  key: string;
  titel: string;
  notiz: string;
  fotos: string[];
};

function fotoList(e: PartnerBefundEintrag): string[] {
  const signed = (e.foto_signed_urls ?? []).filter(Boolean);
  if (signed.length) return signed;
  return (e.foto_urls ?? []).filter(Boolean) as string[];
}

/** Bullet-Zeilen aus altem Aggregat-Text (ohne Header Ergebnis/Vorlage). */
function parseAggregateLines(
  text: string,
  entryId: string
): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line.startsWith("•") && !line.startsWith("-")) continue;
    const body = line.replace(/^[•\-]\s*/, "");
    const m = body.match(
      /^(.+?)(?:\s*\[([^\]]+)\])?(?:\s*[—–\-]\s*(.*))?$/
    );
    if (!m) continue;
    const titel = (m[1] ?? "").trim();
    if (!titel) continue;
    items.push({
      key: `${entryId}:${items.length}`,
      titel,
      notiz: (m[3] ?? "").trim(),
      fotos: [],
    });
  }
  if (items.length === 0 && text.trim()) {
    const cleaned = text
      .split("\n")
      .map((l) => l.trim())
      .filter(
        (l) =>
          l &&
          !/^Durchgeführt von:/i.test(l) &&
          !/^Ergebnis:/i.test(l) &&
          !/^Vorlage:/i.test(l)
      )
      .join("\n")
      .trim();
    if (cleaned) {
      items.push({
        key: `${entryId}:0`,
        titel: "Prüfpunkt",
        notiz: cleaned,
        fotos: [],
      });
    }
  }
  return items;
}

function buildChecklist(eintraege: PartnerBefundEintrag[]): {
  items: ChecklistItem[];
  sharedFotos: string[];
} {
  const befund = eintraege.filter(
    (e) => String(e.eintrag_typ ?? "") === "befund"
  );
  if (!befund.length) return { items: [], sharedFotos: [] };

  const aggregate = befund.filter((e) =>
    /^Hausmeister-Vorbefund/i.test(String(e.titel ?? "").trim())
  );
  const points = befund.filter(
    (e) => !/^Hausmeister-Vorbefund/i.test(String(e.titel ?? "").trim())
  );

  if (points.length) {
    return {
      items: points.map((e) => ({
        key: e.id,
        titel: String(e.titel ?? "").trim() || "Prüfpunkt",
        notiz: String(e.beschreibung ?? "").trim(),
        fotos: fotoList(e),
      })),
      sharedFotos: [],
    };
  }

  const out: ChecklistItem[] = [];
  const shared: string[] = [];
  for (const e of aggregate) {
    out.push(...parseAggregateLines(String(e.beschreibung ?? ""), e.id));
    shared.push(...fotoList(e));
  }
  return { items: out, sharedFotos: Array.from(new Set(shared)) };
}

/**
 * Partner Details: HM-Vorbefund als Card — Checkliste mit Divider (wie Leistungen).
 */
export function PartnerHausmeisterVorbefundCard({
  eintraege,
}: {
  eintraege: PartnerBefundEintrag[];
}) {
  const { items, sharedFotos } = buildChecklist(eintraege);
  if (!items.length && !sharedFotos.length) return null;
  if (!items.length) return null;

  return (
    <PortalDetailCard title="Hausmeister-Vorbefund">
      <ul className="portal-text-body divide-y divide-border-light">
        {items.map((item) => (
          <li key={item.key} className="px-0 py-3 first:pt-0 last:pb-0">
            <p className="portal-text-body font-semibold text-text-primary">
              {item.titel}
            </p>
            {item.notiz ? (
              <p className="portal-text-meta mt-0.5 whitespace-pre-wrap text-text-secondary">
                {item.notiz}
              </p>
            ) : null}
            {item.fotos.length > 0 ? (
              <PortalPhotoGallery urls={item.fotos} className="mt-2" />
            ) : null}
          </li>
        ))}
      </ul>
      {sharedFotos.length > 0 ? (
        <div className="mt-3 border-t border-border-light pt-3">
          <PortalPhotoGallery urls={sharedFotos} />
        </div>
      ) : null}
    </PortalDetailCard>
  );
}
