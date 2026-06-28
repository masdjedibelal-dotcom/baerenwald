import type { PartnerComplianceItem } from "@/lib/partner/partner-compliance";
import { isPartnerBauprojektCompliance } from "@/lib/partner/compliance-summary";

export function buildPartnerAuftragPflichten(opts: {
  compliance_projekt?: PartnerComplianceItem[];
}): string[] {
  const istBauprojekt = isPartnerBauprojektCompliance(opts.compliance_projekt);
  const pflichten: string[] = [
    "Leistungen und Konditionen prüfen und verbindlich bestätigen",
    "Partnerschafts-Rahmenvertrag zur Kenntnis nehmen",
  ];

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
