import type { PartnerComplianceItem } from "@/lib/partner/partner-compliance";
import { isPartnerBauprojektAuftrag } from "@/lib/partner/compliance-summary";

export function buildPartnerAuftragPflichten(opts: {
  compliance_projekt?: PartnerComplianceItem[];
  ist_bauprojekt?: boolean;
  /** Bei Leistungsänderungen am laufenden Auftrag — kein erneuter Projektvertrag. */
  includeProjektvertrag?: boolean;
}): string[] {
  const istBauprojekt = isPartnerBauprojektAuftrag({
    ist_bauprojekt: opts.ist_bauprojekt,
    compliance_projekt: opts.compliance_projekt,
  });
  const pflichten: string[] = [
    "Leistungen und Konditionen prüfen und verbindlich bestätigen",
  ];

  if (opts.includeProjektvertrag !== false) {
    pflichten.push(
      "Projektvertrag (Leistungsvertrag) prüfen und verbindlich bestätigen"
    );
  }

  if (istBauprojekt) {
    pflichten.push(
      "Pflicht-Unterlagen für das Bauprojekt vor bzw. während der Ausführung bereitstellen"
    );
    pflichten.push("Bautagebuch führen und auf Anforderung von Bärenwald Einträge erstellen");
    for (const item of opts.compliance_projekt ?? []) {
      if (item.pflicht && item.status !== "erledigt") {
        pflichten.push(item.bezeichnung);
      }
    }
  }

  pflichten.push(
    "Unterlagen an Bärenwald hochladen (z. B. Angebot, Protokoll) — optional vor Start"
  );
  pflichten.push("Nach Abschluss Rechnung als PDF an Bärenwald übermitteln");

  return pflichten;
}
