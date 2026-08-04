import type { FunnelStep, StepOption } from "@/lib/funnel/types";

/** Nur noch Baumarbeit ohne globale Frequenz-Kachel — direkt zur Baum-Anzahl / Fachdetails. */
const SKIP_FREQ = new Set(["baum"]);

/** Baumarbeiten: keine globale Häufigkeits-Kachel — direkt zur Baum-Anzahl. */
export function shouldSkipBetreuungHaeufigkeit(bereiche: string[]): boolean {
  if (bereiche.length === 0) return false;
  return bereiche.every((x) => SKIP_FREQ.has(x));
}

function onlyHausmeister(bereiche: string[]): boolean {
  return bereiche.length > 0 && bereiche.every((x) => x === "hausmeister");
}

function onlyWinter(bereiche: string[]): boolean {
  return bereiche.length > 0 && bereiche.every((x) => x === "winter");
}

function hasReinigung(bereiche: string[]): boolean {
  return bereiche.includes("reinigung");
}

function hasGartenPflege(bereiche: string[]): boolean {
  return bereiche.includes("garten");
}

/** Dynamische Häufigkeits-/Service-Kachel für Betreuung (je nach gewählten Bereichen). */
export function buildBetreuungHaeufigkeitStep(bereiche: string[]): FunnelStep {
  if (onlyWinter(bereiche)) {
    return {
      id: "betreuung_haeufigkeit",
      question: "Wie soll der Winterdienst gebucht werden?",
      subtext: undefined,
      inputType: "tiles-single",
      options: [
        {
          value: "saison",
          label: "Saison-Pauschale",
          hint: "Absicherung über die Wintersaison",
          faktor: 1.0,
        },
        {
          value: "einmalig",
          label: "Einmalig / Express",
          hint: "Akuter Schnee — Mindest-Pauschale",
          faktor: 1.0,
        },
      ],
    };
  }

  if (onlyHausmeister(bereiche)) {
    return {
      id: "betreuung_haeufigkeit",
      question: "Wie soll der Service aussehen?",
      subtext: undefined,
      inputType: "tiles-single",
      options: [
        {
          value: "monatlich",
          label: "Monatlicher Pauschalvertrag",
          hint: "Feste monatliche Betreuung",
          faktor: 1.0,
        },
        {
          value: "nach_bedarf",
          label: "Nach Bedarf",
          hint: "Wir kommen, wenn etwas anfällt",
          faktor: 1.05,
        },
        {
          value: "jahresvertrag",
          label: "Jahresvertrag",
          hint: "Rundum-Betreuung für 12 Monate",
          faktor: 0.95,
        },
      ],
    };
  }

  if (hasReinigung(bereiche) && !hasGartenPflege(bereiche)) {
    return {
      id: "betreuung_haeufigkeit",
      question: "Wie oft soll gereinigt werden?",
      inputType: "tiles-single",
      options: reinigungOptions(),
    };
  }

  if (hasGartenPflege(bereiche) && !hasReinigung(bereiche)) {
    return {
      id: "betreuung_haeufigkeit",
      question: "Wie oft soll der Garten gepflegt werden?",
      inputType: "tiles-single",
      options: gartenOptions(),
    };
  }

  return {
    id: "betreuung_haeufigkeit",
    question: "Wie oft soll jemand kommen?",
    inputType: "tiles-single",
    options: mixedOptions(hasReinigung(bereiche)),
  };
}

function gartenOptions(): StepOption[] {
  return [
    {
      value: "woechentlich",
      label: "Wöchentlich",
      hint: "Intensive Pflege",
      faktor: 0.85,
    },
    {
      value: "zweimal_monat",
      label: "Alle 2 Wochen",
      hint: "Standard in der Saison",
      faktor: 0.9,
    },
    {
      value: "monatlich",
      label: "Monatlich",
      hint: "Grundpflege",
      faktor: 1.0,
    },
    {
      value: "saisonal",
      label: "Saisonal",
      hint: "Frühjahr & Herbst",
      faktor: 1.1,
    },
  ];
}

function reinigungOptions(): StepOption[] {
  return [
    {
      value: "woechentlich",
      label: "Wöchentlich",
      hint: "Fester Turnus",
      faktor: 0.85,
    },
    {
      value: "zweimal_monat",
      label: "Alle 2 Wochen",
      hint: "Mittlere Frequenz",
      faktor: 0.9,
    },
    {
      value: "monatlich",
      label: "Monatlich",
      hint: "Leichte Reinigung",
      faktor: 1.0,
    },
    {
      value: "einmalig",
      label: "Einmalig",
      hint: "z. B. Endreinigung oder Frühjahrsputz",
      faktor: 1.3,
    },
  ];
}

function mixedOptions(mitEinmalig: boolean): StepOption[] {
  const base: StepOption[] = [
    {
      value: "woechentlich",
      label: "Wöchentlich",
      hint: "Intensive Betreuung",
      faktor: 0.85,
    },
    {
      value: "zweimal_monat",
      label: "Alle 2 Wochen",
      hint: "Standard",
      faktor: 0.9,
    },
    {
      value: "monatlich",
      label: "Monatlich",
      hint: "Weniger häufig",
      faktor: 1.0,
    },
    {
      value: "saisonal",
      label: "Saisonal",
      hint: "Frühjahr & Herbst",
      faktor: 1.1,
    },
  ];
  if (mitEinmalig) {
    base.push({
      value: "einmalig",
      label: "Einmalig (Reinigung)",
      hint: "Endreinigung oder großer Putz",
      faktor: 1.3,
    });
  }
  return base;
}
