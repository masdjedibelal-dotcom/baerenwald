import type { ObjektFinanzCsvRow } from "@/lib/org/objektakte/load-objekt-finanz-portal";

function escCell(v: string): string {
  const s = v.replace(/"/g, '""');
  return `"${s}"`;
}

function fmtEuroCsv(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "";
  return n.toFixed(2).replace(".", ",");
}

function fmtDatumCsv(iso: string): string {
  const d = iso?.trim()?.slice(0, 10);
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return "";
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

export function buildObjektKostenCsv(input: {
  objektTitel: string;
  objektAdresse: string;
  von: string;
  bis: string;
  rows: ObjektFinanzCsvRow[];
  summeRechnungen: number;
}): string {
  const header = [
    "objekt",
    "objekt_adresse",
    "zeitraum_von",
    "zeitraum_bis",
    "vorgang_id",
    "vorgang_titel",
    "vorgang_datum",
    "status",
    "gewerk",
    "kostentraeger",
    "betrag_eur",
    "kosten_status",
    "rechnung_nr",
    "rechnung_datum",
    "pdf_verfuegbar",
  ];

  const lines: string[] = ["\uFEFF" + header.join(";")];

  for (const r of input.rows) {
    lines.push(
      [
        escCell(input.objektTitel),
        escCell(input.objektAdresse),
        escCell(fmtDatumCsv(input.von)),
        escCell(fmtDatumCsv(input.bis)),
        escCell(r.vorgangId),
        escCell(r.vorgangTitel),
        escCell(fmtDatumCsv(r.vorgangDatum)),
        escCell(r.status),
        escCell(r.gewerk),
        escCell(r.kostentraeger),
        escCell(fmtEuroCsv(r.betragEuro)),
        escCell(r.kostenStatus),
        escCell(r.rechnungNr),
        escCell(fmtDatumCsv(r.rechnungDatum)),
        escCell(r.pdfVerfuegbar),
      ].join(";")
    );
  }

  if (input.summeRechnungen > 0) {
    lines.push(
      [
        '""',
        '""',
        '""',
        '""',
        '""',
        '""',
        '""',
        '""',
        '""',
        escCell("SUMME"),
        escCell(fmtEuroCsv(input.summeRechnungen)),
        escCell("rechnung"),
        '""',
        '""',
        '""',
      ].join(";")
    );
  }

  return lines.join("\r\n");
}
