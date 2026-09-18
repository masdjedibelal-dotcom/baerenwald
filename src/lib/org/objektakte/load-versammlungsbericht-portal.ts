import type { ObjektHistorieRowPortal } from "@/lib/org/objektakte/types";
import { loadObjektAktePortal } from "@/lib/org/objektakte/load-objekt-akte-portal";
import { summeObjektVorgangKosten } from "@/lib/org/objektakte/resolve-objekt-vorgang-kosten";
import { formatObjektAdresse } from "@/lib/portal2/objekte";
import { supabaseAdmin } from "@/lib/supabase";

export type VersammlungsberichtPortalPayload = {
  orgName: string;
  objektTitel: string;
  objektAdresse: string;
  zeitraumVon: string;
  zeitraumBis: string;
  erstelltAm: string;
  einzelpreise: boolean;
  vorgaengeImZeitraum: ObjektHistorieRowPortal[];
  vorgaengeOffen: ObjektHistorieRowPortal[];
  anlagenHighlights: Array<{
    bezeichnung: string;
    vorgangCount: number;
    kostenSumme: number;
  }>;
  gesamtKosten: number;
  ohneKostenAngabe: number;
  nachGewerk: Array<{ gewerk: string; count: number; summe: number }>;
  leererZeitraum: boolean;
  keineAnlagen: boolean;
};

function datumInRange(d: string, von: string, bis: string): boolean {
  const day = d.slice(0, 10);
  if (von && day < von) return false;
  if (bis && day > bis) return false;
  return true;
}

function istOffen(row: ObjektHistorieRowPortal): boolean {
  const s = row.statusLabel.toLowerCase();
  return !(s.includes("erledigt") || s.includes("storniert"));
}

export async function loadVersammlungsberichtPortal(input: {
  kundeId: string;
  objektId: string;
  von: string;
  bis: string;
  einzelpreise: boolean;
}): Promise<VersammlungsberichtPortalPayload | null> {
  const kid = input.kundeId.trim();
  const oid = input.objektId.trim();
  const von = input.von.trim();
  const bis = input.bis.trim();
  if (!kid || !oid) return null;

  const [akte, objektRes, kundeRes] = await Promise.all([
    loadObjektAktePortal(kid, oid),
    supabaseAdmin
      .from("kunden_objekte")
      .select("id, titel, strasse, hausnummer, plz, ort")
      .eq("id", oid)
      .eq("kunde_id", kid)
      .maybeSingle(),
    supabaseAdmin
      .from("kunden")
      .select("name, org_anzeigename")
      .eq("id", kid)
      .maybeSingle(),
  ]);

  if (!akte || !objektRes.data) return null;

  const vorgaengeImZeitraum = akte.historie.filter((r) =>
    datumInRange(r.datum, von, bis)
  );
  const vorgaengeOffen = vorgaengeImZeitraum.filter(istOffen);
  const { summe, ohneAngabe } = summeObjektVorgangKosten(vorgaengeImZeitraum);

  const gewerkMap = new Map<string, { count: number; summe: number }>();
  const anlageStats = new Map<
    string,
    { bezeichnung: string; vorgangCount: number; kostenSumme: number }
  >();

  for (const r of vorgaengeImZeitraum) {
    const g = r.gewerkLabel?.trim() || "—";
    if (g !== "—") {
      const cur = gewerkMap.get(g) ?? { count: 0, summe: 0 };
      cur.count++;
      if (r.kostenEuro != null) cur.summe += r.kostenEuro;
      gewerkMap.set(g, cur);
    }
    const label = r.anlageLabel?.trim();
    if (label) {
      const cur = anlageStats.get(label) ?? {
        bezeichnung: label,
        vorgangCount: 0,
        kostenSumme: 0,
      };
      cur.vorgangCount++;
      if (r.kostenEuro != null) cur.kostenSumme += r.kostenEuro;
      anlageStats.set(label, cur);
    }
  }

  const obj = objektRes.data;
  const kunde = kundeRes.data;

  return {
    orgName: (kunde?.org_anzeigename || kunde?.name || "Hausverwaltung").trim(),
    objektTitel: obj.titel?.trim() || "Objekt",
    objektAdresse: formatObjektAdresse(obj) || "—",
    zeitraumVon: von,
    zeitraumBis: bis,
    erstelltAm: new Date().toISOString().slice(0, 10),
    einzelpreise: input.einzelpreise,
    vorgaengeImZeitraum,
    vorgaengeOffen,
    anlagenHighlights: Array.from(anlageStats.values())
      .filter((a) => a.vorgangCount >= 2)
      .sort((a, b) => b.kostenSumme - a.kostenSumme),
    gesamtKosten: summe,
    ohneKostenAngabe: ohneAngabe,
    nachGewerk: Array.from(gewerkMap.entries())
      .map(([gewerk, v]) => ({ gewerk, count: v.count, summe: v.summe }))
      .sort((a, b) => b.summe - a.summe),
    leererZeitraum: vorgaengeImZeitraum.length === 0,
    keineAnlagen: akte.anlagen.length === 0,
  };
}
