import type { ObjektHistorieRowPortal, ObjektKpiPortal } from "@/lib/org/objektakte/types";
import { summeObjektVorgangKosten } from "@/lib/org/objektakte/resolve-objekt-vorgang-kosten";

const ERLEDIGT = new Set(["Erledigt", "Storniert"]);

function datumImJahr(iso: string, jahr: number): boolean {
  const d = iso.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return Number(d.slice(0, 4)) === jahr;
}

export function computeObjektKpisPortal(
  rows: ObjektHistorieRowPortal[],
  anlagenAnzahl: number,
  jahr = new Date().getFullYear()
): ObjektKpiPortal {
  const jahrRows = rows.filter((r) => datumImJahr(r.datum, jahr));
  const { summe, ohneAngabe } = summeObjektVorgangKosten(jahrRows);

  const gewerkMap = new Map<string, number>();
  for (const r of rows) {
    const g = r.gewerkLabel?.trim() || "—";
    if (g === "—") continue;
    gewerkMap.set(g, (gewerkMap.get(g) ?? 0) + 1);
  }

  return {
    vorgaengeGesamt: rows.length,
    offenInArbeit: rows.filter((r) => !ERLEDIGT.has(r.statusLabel)).length,
    kostenLaufendesJahr: summe,
    kostenOhneAngabeImJahr: ohneAngabe,
    anlagenAnzahl,
    nachGewerk: Array.from(gewerkMap.entries())
      .map(([gewerk, count]) => ({ gewerk, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
  };
}
