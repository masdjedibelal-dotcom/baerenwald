/** Kosten-Kaskade: Rechnung → Auftrag (Angebot) → „offen". Kein Budget-Fallback. */

type RechnungRow = {
  status: string;
  brutto?: number | null;
  rechnung_art?: string | null;
  created_at: string;
  updated_at?: string | null;
};

type AngebotRow = {
  id?: string;
  gesamt_fix?: number | null;
  gesamt_min?: number | null;
  gesamt_max?: number | null;
};

type AuftragRow = {
  status: string;
  angebot_id?: string | null;
};

function isSatellitenRechnung(r: RechnungRow): boolean {
  const art = (r.rechnung_art ?? "").trim().toLowerCase();
  return art === "abschlag";
}

function isPhaseWinningRechnung(r: RechnungRow): boolean {
  const st = (r.status ?? "").trim().toLowerCase();
  if (!st || st === "storniert" || st === "entwurf") return false;
  if (isSatellitenRechnung(r)) return false;
  return true;
}

function euroFromAngebot(ang: AngebotRow | null | undefined): number | null {
  if (!ang) return null;
  const fix = ang.gesamt_fix != null ? Number(ang.gesamt_fix) : null;
  if (fix != null && Number.isFinite(fix) && fix > 0) return Math.round(fix);
  const min = ang.gesamt_min != null ? Number(ang.gesamt_min) : null;
  const max = ang.gesamt_max != null ? Number(ang.gesamt_max) : null;
  if (min != null && max != null && Number.isFinite(min) && Number.isFinite(max)) {
    return Math.round((min + max) / 2);
  }
  return null;
}

function formatEuro(euro: number): string {
  return `${euro.toLocaleString("de-DE")} €`;
}

export function resolveObjektVorgangKosten(input: {
  rechnungen: RechnungRow[];
  auftraege: AuftragRow[];
  angebote: AngebotRow[];
}): { euro: number | null; label: string } {
  const winning = input.rechnungen.filter(isPhaseWinningRechnung);
  if (winning.length) {
    const newest = [...winning].sort((a, b) =>
      (b.updated_at ?? b.created_at).localeCompare(a.updated_at ?? a.created_at)
    )[0];
    const brutto = Number(newest?.brutto);
    if (Number.isFinite(brutto) && brutto > 0) {
      const euro = Math.round(brutto);
      return { euro, label: formatEuro(euro) };
    }
  }

  for (const auf of input.auftraege) {
    if ((auf.status ?? "").trim().toLowerCase() === "storniert") continue;
    const linked = auf.angebot_id
      ? input.angebote.find((a) => a.id === auf.angebot_id)
      : null;
    let euro = euroFromAngebot(linked);
    if (euro == null) {
      for (const ang of input.angebote) {
        euro = euroFromAngebot(ang);
        if (euro != null) break;
      }
    }
    if (euro != null) return { euro, label: formatEuro(euro) };
  }

  return { euro: null, label: "offen" };
}

export function summeObjektVorgangKosten(
  rows: Array<{ kostenEuro: number | null }>
): { summe: number; ohneAngabe: number } {
  let summe = 0;
  let ohneAngabe = 0;
  for (const r of rows) {
    if (r.kostenEuro == null) ohneAngabe++;
    else summe += r.kostenEuro;
  }
  return { summe, ohneAngabe };
}
