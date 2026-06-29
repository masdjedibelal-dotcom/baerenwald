export function buildPartnerAuftragPflichten(opts: {
  ist_bauprojekt?: boolean;
  /** Bei Leistungsänderungen am laufenden Auftrag — kein erneuter Projektvertrag. */
  includeProjektvertrag?: boolean;
}): string[] {
  const istBauprojekt = opts.ist_bauprojekt === true;
  const pflichten: string[] = [
    "Leistungen und Konditionen prüfen und verbindlich bestätigen",
  ];

  if (opts.includeProjektvertrag !== false && istBauprojekt) {
    pflichten.push(
      "Projektvertrag (Leistungsvertrag) prüfen und verbindlich bestätigen"
    );
  }

  if (istBauprojekt) {
    pflichten.push(
      "Nachweise laut Projektvertrag (§6 / Anlage 1) vor Arbeitsbeginn bereitstellen — siehe Checkliste unten"
    );
    pflichten.push("Bautagebuch führen und auf Anforderung von Bärenwald Einträge erstellen");
  }

  pflichten.push(
    "Unterlagen an Bärenwald hochladen (z. B. Angebot, Protokoll) — optional vor Start"
  );
  pflichten.push("Nach Abschluss Rechnung als PDF an Bärenwald übermitteln");

  return pflichten;
}
