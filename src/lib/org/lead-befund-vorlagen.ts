/**
 * Hausmeister-Befund-Vorlagen (Systempunkte) + Resolver aus Melde-Funnel.
 */

import {
  isMeldeBereichId,
  type MeldeBereichId,
} from "@/lib/org/melde-bereiche";
import {
  normalizeMeldeFensterProblem,
  normalizeMeldeWasserProblem,
} from "@/lib/funnel/melde-dynamic-questions";

export type BefundVorlageKey =
  | "wasser_leckage"
  | "abfluss"
  | "heizung"
  | "elektro"
  | "schimmel"
  | "tuer_schloss"
  | "fenster_rolladen"
  | "gemeinschaft"
  | "sonstiges";

export type BefundVorlagePunktDef = {
  /** Stabiler Key für Auswertung (auch als DB `vorlage_key` am Punkt). */
  key: string;
  titel: string;
  /** Beim Befund-Start als Vorschlag (typisch 2–3 pro Vorlage). */
  haeufig?: boolean;
};

export type BefundVorlageDef = {
  key: BefundVorlageKey;
  label: string;
  /** Optionaler Hinweis über der Punkteliste (z. B. Elektro). */
  hinweis?: string;
  punkte: BefundVorlagePunktDef[];
};

const BASIS_PUNKTE: BefundVorlagePunktDef[] = [
  {
    key: "basis_vorgefunden",
    titel: "Schaden wie gemeldet vorgefunden",
    haeufig: true,
  },
  {
    key: "basis_fotos",
    titel: "Fotos vom Ist-Zustand gemacht",
    haeufig: true,
  },
  {
    key: "basis_ursache",
    titel:
      "Ursache / Herkunft notiert (Notiz: Gemeinschaft · Sondereigentum · Mieter)",
  },
  {
    key: "basis_sofortmassnahme",
    titel: "Sofortmaßnahme nötig/durchgeführt",
  },
];

/** Erstes Ursachen-Element als dritter Vorschlag, falls nicht gesetzt. */
function withBasis(ursachen: BefundVorlagePunktDef[]): BefundVorlagePunktDef[] {
  const urs = ursachen.map((p, i) => ({
    ...p,
    haeufig: p.haeufig ?? i === 0,
  }));
  return [...BASIS_PUNKTE, ...urs];
}

export const LEAD_BEFUND_VORLAGEN: Record<
  BefundVorlageKey,
  BefundVorlageDef
> = {
  wasser_leckage: {
    key: "wasser_leckage",
    label: "Wasser / Leckage",
    punkte: withBasis([
      {
        key: "wl_silikonfugen",
        titel: "Silikonfugen Dusche/Wanne/Spüle geprüft",
      },
      {
        key: "wl_eckventile",
        titel: "Eckventile & Anschlüsse dicht",
      },
      {
        key: "wl_geraeteanschluss",
        titel: "Geräteanschluss (Wasch-/Spülmaschine) geprüft",
      },
      {
        key: "wl_feuchte_wand",
        titel: "Feuchtigkeit an angrenzender Wand/Decke",
      },
      {
        key: "wl_wasseruhr",
        titel: "Wasseruhr läuft bei geschlossenen Hähnen",
      },
      {
        key: "wl_einheit_darunter",
        titel: "Schaden in darunterliegender Einheit sichtbar",
      },
    ]),
  },
  abfluss: {
    key: "abfluss",
    label: "Abfluss",
    punkte: withBasis([
      {
        key: "ab_lokalisiert",
        titel: "Betroffenen Abfluss lokalisiert",
      },
      {
        key: "ab_reinigung",
        titel: "Siphon gereinigt / mechanische Reinigung versucht",
      },
      {
        key: "ab_mehrere",
        titel: "Mehrere Abflüsse betroffen (Verdacht Fallstrang)",
      },
      {
        key: "ab_rueckstau",
        titel: "Rückstau oder Geruch vorhanden",
      },
    ]),
  },
  heizung: {
    key: "heizung",
    label: "Heizung",
    punkte: withBasis([
      {
        key: "hz_umfang",
        titel: "Einzelner Heizkörper oder ganze Einheit betroffen",
      },
      { key: "hz_entlueftet", titel: "Heizkörper entlüftet" },
      {
        key: "hz_thermostat",
        titel: "Thermostatventil gängig gemacht",
      },
      { key: "hz_druck", titel: "Anlagendruck geprüft" },
      { key: "hz_stoermeldung", titel: "Störmeldung am Kessel" },
      {
        key: "hz_warmwasser",
        titel: "Warmwasser ebenfalls betroffen",
      },
    ]),
  },
  elektro: {
    key: "elektro",
    label: "Elektro",
    hinweis:
      "Nur Prüfung — keine Arbeiten an der festen Elektroinstallation.",
    punkte: withBasis([
      {
        key: "el_umfang",
        titel: "Einzelner Punkt oder ganzer Stromkreis betroffen",
      },
      {
        key: "el_sicherung",
        titel: "Sicherung/FI geprüft und zurückgesetzt",
      },
      { key: "el_fi_erneut", titel: "FI löst erneut aus" },
      { key: "el_leuchtmittel", titel: "Leuchtmittel getauscht" },
      {
        key: "el_geraet",
        titel: "Angeschlossenes Gerät als Ursache ausgeschlossen",
      },
      {
        key: "el_klingel",
        titel: "Klingel/Gegensprechanlage geprüft",
      },
      {
        key: "el_beschaedigung",
        titel: "Sichtbare Beschädigung (Brandspuren, lose Dose)",
      },
    ]),
  },
  schimmel: {
    key: "schimmel",
    label: "Schimmel",
    punkte: withBasis([
      {
        key: "sm_dokumentiert",
        titel: "Lage und Ausmaß dokumentiert",
      },
      {
        key: "sm_aussenwand",
        titel: "Außenwand/Fensterlaibung betroffen",
      },
      {
        key: "sm_leckage",
        titel: "Leckage-Verdacht (Leitung/Dach)",
      },
      {
        key: "sm_verhalten",
        titel: "Lüftungs-/Heizverhalten beim Bewohner erfragt",
      },
      {
        key: "sm_messung",
        titel: "Feuchtemessung durchgeführt (falls Gerät vorhanden)",
      },
    ]),
  },
  tuer_schloss: {
    key: "tuer_schloss",
    label: "Tür / Schloss",
    punkte: withBasis([
      { key: "ts_art", titel: "Tür klemmt oder Schloss defekt" },
      {
        key: "ts_nachgestellt",
        titel: "Scharniere/Schließblech nachgestellt",
      },
      {
        key: "ts_geschmiert",
        titel: "Schloss/Zylinder geschmiert",
      },
      {
        key: "ts_schliessanlage",
        titel: "Zylinder der Schließanlage betroffen",
      },
      {
        key: "ts_tuer_typ",
        titel: "Wohnungs- oder Gemeinschaftstür",
      },
    ]),
  },
  fenster_rolladen: {
    key: "fenster_rolladen",
    label: "Fenster / Rollladen",
    punkte: withBasis([
      { key: "fr_beschlag", titel: "Griff/Beschlag geprüft" },
      { key: "fr_dichtung", titel: "Dichtung geprüft" },
      { key: "fr_nachgestellt", titel: "Fenster nachgestellt" },
      {
        key: "fr_glasbruch",
        titel: "Glasbruch (Größe/Gefahr dokumentiert)",
      },
      {
        key: "fr_rollladen",
        titel: "Rollladen/Gurt geprüft (falls vorhanden)",
      },
    ]),
  },
  gemeinschaft: {
    key: "gemeinschaft",
    label: "Gemeinschaftsfläche",
    punkte: withBasis([
      {
        key: "gm_dokumentiert",
        titel: "Situation dokumentiert (Ort, Ausmaß)",
      },
      { key: "gm_gesichert", titel: "Gefahrenstelle gesichert" },
      {
        key: "gm_behoben",
        titel: "Selbst behoben (Reinigung/Entsorgung)",
      },
      { key: "gm_verursacher", titel: "Verursacher erkennbar" },
      { key: "gm_wiederholung", titel: "Wiederholungsfall" },
    ]),
  },
  sonstiges: {
    key: "sonstiges",
    label: "Sonstiges",
    punkte: withBasis([]),
  },
};

export function getBefundVorlage(key: BefundVorlageKey): BefundVorlageDef {
  return LEAD_BEFUND_VORLAGEN[key] ?? LEAD_BEFUND_VORLAGEN.sonstiges;
}

export function isBefundVorlageKey(v: string): v is BefundVorlageKey {
  return v in LEAD_BEFUND_VORLAGEN;
}

const GEMEINSCHAFT_PROBLEME = new Set([
  "muell",
  "treppenhaus_schmutz",
  "gemeinschaft",
]);

function ansFromFunnel(
  fachdetailAnswers: Record<string, unknown> | null | undefined,
  id: string
): string {
  if (!fachdetailAnswers) return "";
  const v = fachdetailAnswers[id];
  if (Array.isArray(v)) return String(v[0] ?? "").trim().toLowerCase();
  return String(v ?? "").trim().toLowerCase();
}

function meldeBereichFromFunnel(funnel: Record<string, unknown>): MeldeBereichId | null {
  const raw = funnel.melde_bereich;
  if (typeof raw === "string" && isMeldeBereichId(raw)) {
    if (raw === "baum_notfall") return "sonstiges";
    return raw;
  }
  return null;
}

/**
 * Ableitung Vorlagen-Key aus Melde-Funnel (`melde_bereich` + `melde_problem`).
 * Kein Funnel-Umbau — fehlende Untertypen → Fallback `sonstiges`.
 */
export function resolveBefundVorlageKey(
  funnelDaten: unknown
): BefundVorlageKey {
  const fd =
    funnelDaten && typeof funnelDaten === "object" && !Array.isArray(funnelDaten)
      ? (funnelDaten as Record<string, unknown>)
      : {};

  const fach =
    fd.fachdetailAnswers &&
    typeof fd.fachdetailAnswers === "object" &&
    !Array.isArray(fd.fachdetailAnswers)
      ? (fd.fachdetailAnswers as Record<string, unknown>)
      : null;

  const bereich = meldeBereichFromFunnel(fd);
  const problemRaw = ansFromFunnel(fach, "melde_problem");

  if (!bereich) return "sonstiges";

  if (bereich === "wasser") {
    const p = normalizeMeldeWasserProblem(problemRaw);
    if (p === "verstopfung") return "abfluss";
    return "wasser_leckage";
  }

  if (bereich === "heizung") return "heizung";
  if (bereich === "strom") return "elektro";
  if (bereich === "schimmel") return "schimmel";

  if (bereich === "fenster_tuer") {
    const p = normalizeMeldeFensterProblem(problemRaw);
    if (p === "tuer_schloss") return "tuer_schloss";
    return "fenster_rolladen";
  }

  if (bereich === "sonstiges") {
    if (GEMEINSCHAFT_PROBLEME.has(problemRaw)) return "gemeinschaft";
    return "sonstiges";
  }

  // dach und unbekannte Bereiche → sonstiges (nur Basis + Freipunkte)
  return "sonstiges";
}

/** Nur häufige Vorschläge (Fallback: erste 3 der Vorlage). */
export function materializeVorlagePunkte(key: BefundVorlageKey): Array<{
  sort_order: number;
  titel: string;
  quelle: "system";
  vorlage_key: string;
}> {
  const vorlage = getBefundVorlage(key);
  const haeufig = vorlage.punkte.filter((p) => p.haeufig);
  const selected =
    haeufig.length > 0 ? haeufig : vorlage.punkte.slice(0, 3);
  return selected.map((p, i) => ({
    sort_order: i,
    titel: p.titel,
    quelle: "system" as const,
    vorlage_key: p.key,
  }));
}

/** Vorlagenpunkte, die noch nicht am Befund hängen (für Hinzufügen-Dropdown). */
export function listVorlageKatalogOffen(
  key: BefundVorlageKey,
  activeVorlageKeys: Iterable<string>
): BefundVorlagePunktDef[] {
  const active = new Set(
    [...activeVorlageKeys].map((k) => k.trim()).filter(Boolean)
  );
  return getBefundVorlage(key).punkte.filter((p) => !active.has(p.key));
}

export function findVorlagePunktDef(
  key: BefundVorlageKey,
  punktKey: string
): BefundVorlagePunktDef | null {
  const k = punktKey.trim();
  if (!k) return null;
  return getBefundVorlage(key).punkte.find((p) => p.key === k) ?? null;
}
