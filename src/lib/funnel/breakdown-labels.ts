import type { PriceLineItem } from "./types";

/** Labels für Preiszeilen (UI + Bestätigungs-E-Mail). */
export const LEISTUNGS_LABELS: Record<string, string> = {
  "sanitaer.verstopfung": "Rohrreinigung",
  "sanitaer.leck": "Leck / Rohrbruch",
  "sanitaer.wc": "WC / Heizung",
  "sanitaer.armatur": "Armatur / Bad",
  "elektro.steckdose": "Elektro (einzelne Punkte)",
  "elektro.fi_schalter": "Elektrik erneuern",
  "elektro.sicherungskasten": "Sicherungskasten modernisieren",
  "elektro.echeck": "E-Check / Sicherheitsprüfung",
  "elektro.fehlersuche": "Elektro Fehlersuche",
  "elektro.qm": "Elektrik (nach Fläche)",
  "elektro.punkte": "Elektro (einzelne Punkte)",
  "garten.rasen": "Rasenpflege",
  "garten.pflege_klein": "Gartenpflege (klein)",
  "garten.pflege_mittel": "Gartenpflege (mittel)",
  "garten.pflege_gross": "Gartenpflege (groß)",
  "garten.gestaltung": "Gartengestaltung",
  "garten.baum_klein": "Baumpflege",
  "garten.baum_gross": "Baumpflege (groß)",
  "garten.hecke": "Heckenschnitt",
  "garten.pflaster": "Pflaster / Terrasse",
  "maler.waende": "Wände streichen",
  "maler.waende_decke": "Wände + Decke streichen",
  "maler.tapezieren": "Tapezieren",
  "maler.fassade": "Fassade streichen",
  "boden.laminat": "Laminat verlegen",
  "boden.parkett": "Parkett verlegen",
  "boden.parkett_schleifen": "Parkett abschleifen & versiegeln",
  "boden.vinyl": "Vinyl / Designboden",
  "boden.fliesen": "Fliesen verlegen",
  "boden.balkon_belag": "Balkon / Terrasse Belag",
  "boden.teppich": "Teppich verlegen",
  "bad.fliesen": "Bad fliesen",
  "bad.komplett": "Bad komplett",
  "bad.objekte": "Sanitärobjekte",
  "heizung.gas": "Heizung (Gas)",
  "heizung.klein": "Heizungssanierung",
  "heizung.mittel": "Heizungssanierung",
  "heizung.gross": "Heizungssanierung",
  "heizung.wartung": "Heizungswartung",
  "heizung.heizkoerper": "Heizkörper tauschen",
  "heizung.tausch": "Heizungstausch",
  "heizung_notfall.ausfall": "Notfall Heizung / Wasser",
  "dach.ziegel_wenige": "Dach — wenige Ziegel",
  "dach.ziegel_bereich": "Dach — Ziegelbereich",
  "dach.ziegel": "Dach reparieren",
  "dach.daemmung": "Dachdämmung",
  "dach.komplett": "Dach sanieren",
  "dach.regenrinne": "Regenrinne",
  "fassade.anstrich": "Fassade streichen",
  "fenster.standard": "Fenster Standard",
  "fenster.premium": "Fenster Premium",
  "elektro.leitungen": "Elektro — Leitungen",
  "ausbau.umbau": "Ausbau / Umbau",
  "terrasse.aussen": "Terrasse / Außen",
  "gartenpflege.saison": "Gartenpflege",
  "gartengestaltung.einmal": "Gartengestaltung",
  "baum.pflege": "Baumpflege",
  "wasser.einsatz": "Wasser & Rohre",
  "reinigung.regelmaessig": "Reinigung",
  "reinigung.einmalig": "Reinigung",
  "allgemein.allgemein": "Handwerksleistung",
};

const GEWERK_SERVICE_SLUG: Record<string, string> = {
  Sanitär: "sanitaer",
  Elektro: "elektro",
  Garten: "garten",
  Maler: "maler",
  Boden: "boden",
  Bad: "bad",
  Heizung: "heizung",
  Dach: "dach",
  Fassade: "fassade",
  Fenster: "fenster",
  Reinigung: "reinigung",
  Gartenpflege: "gartenpflege",
  Gartengestaltung: "gartengestaltung",
  Baumpflege: "baum",
  Ausbau: "ausbau",
  "Terrasse / Außen": "terrasse",
  "Wasser & Rohre": "wasser",
};

function beschreibungToTypeSlug(beschreibung: string, gewerk: string): string {
  const b = beschreibung.trim().toLowerCase();

  if (gewerk === "Bad") {
    if (b.includes("komplett")) return "komplett";
    if (b.includes("einzelobj") || b.includes("sanitärobj")) return "objekte";
    if (b.includes("fliesen")) return "fliesen";
    if (b.includes("badsanierung")) return "fliesen";
    return "fliesen";
  }
  if (gewerk === "Boden") {
    if (b.includes("laminat")) return "laminat";
    if (b.includes("abschleif") && b.includes("versiegel")) return "parkett_schleifen";
    if (b.includes("parkett")) return "parkett";
    if (b.includes("vinyl") || b.includes("designboden")) return "vinyl";
    if (b.includes("fliesen")) return "fliesen";
    if (b.includes("teppich")) return "teppich";
    return "vinyl";
  }
  if (gewerk === "Maler") {
    if (b.includes("decke")) return "waende_decke";
    if (b.includes("tapezier")) return "tapezieren";
    if (b.includes("wände") || b.includes("wand")) return "waende";
    return "waende";
  }
  if (gewerk === "Fassade") {
    if (b.includes("außen") || b.includes("aussen")) return "fassade";
    if (b.includes("dämmung") || b.includes("daemmung")) return "daemmung";
    if (b.includes("anteil")) return "daemmung";
    if (b.includes("fassadenfläche") || b.includes("anstrich")) return "anstrich";
    return "anstrich";
  }
  if (gewerk === "Heizung") {
    if (b.includes("heizkörper") || b.includes("heizkoerper")) return "heizkoerper";
    if (b.includes("wartung") || b.includes("notfall")) return "wartung";
    if (b.includes("(klein)")) return "klein";
    if (b.includes("(mittel)")) return "mittel";
    if (b.includes("(groß)") || b.includes("(gross)")) return "gross";
    if (b.includes("tausch") || b.includes("sanierung")) return "mittel";
    return "gas";
  }
  if (gewerk === "Dach") {
    if (b.includes("wenige ziegel")) return "ziegel_wenige";
    if (b.includes("größerer ziegel") || b.includes("groesserer ziegel")) {
      return "ziegel_bereich";
    }
    if (b.includes("ziegel")) return "ziegel_wenige";
    if (b.includes("dämmung") || b.includes("daemmung")) return "daemmung";
    if (b.includes("regenrinne") || b.includes("ablauf")) return "regenrinne";
    return "komplett";
  }
  if (gewerk === "Elektro") {
    if (b.includes("fehlersuche")) return "fehlersuche";
    if (b.includes("e-check") || b.includes("echeck") || b.includes("sicherheitsprüf")) {
      return "echeck";
    }
    if (b.includes("sicherungskasten modern")) return "sicherungskasten";
    if (b.includes("fi") || b.includes("sicherungs")) return "fi_schalter";
    if (b.includes("fläche") || b.includes("nach fläche")) return "qm";
    if (b.includes("punkt") || b.includes("arbeitspunkt")) return "punkte";
    if (b.includes("steckdose")) return "steckdose";
    return "qm";
  }
  if (gewerk === "Sanitär") {
    if (b.includes("verstopf")) return "verstopfung";
    if (b.includes("leck") || b.includes("rohr")) return "leck";
    if (b.includes("armatur") || b.includes("einzelteil")) return "armatur";
    if (b.includes("warmwasser") || b.includes("wc")) return "wc";
    return "armatur";
  }
  if (gewerk === "Garten") {
    if (b.includes("pflege") && b.includes("klein")) return "pflege_klein";
    if (b.includes("pflege") && b.includes("mittel")) return "pflege_mittel";
    if (b.includes("pflege") && b.includes("groß")) return "pflege_gross";
    if (b.includes("pflege") && b.includes("gross")) return "pflege_gross";
    if (b.includes("gestaltung")) return "gestaltung";
    if (b.includes("baum") && b.includes("groß")) return "baum_gross";
    if (b.includes("baum") && b.includes("gross")) return "baum_gross";
    if (b.includes("baum")) return "baum_klein";
    if (b.includes("rasen")) return "rasen";
    if (b.includes("hecke")) return "hecke";
    if (b.includes("pflaster") || b.includes("terrasse")) return "pflaster";
    return "pflege_mittel";
  }
  if (gewerk === "Fenster") {
    if (b.includes("premium")) return "premium";
    return "standard";
  }
  if (gewerk === "Gartenpflege") return "saison";
  if (gewerk === "Gartengestaltung") return "einmal";
  if (gewerk === "Baumpflege") return "pflege";
  if (gewerk === "Ausbau") return "umbau";
  if (gewerk === "Terrasse / Außen") return "aussen";
  if (gewerk === "Wasser & Rohre") return "einsatz";
  if (gewerk === "Reinigung") {
    if (b.includes("einmal")) return "einmalig";
    return "regelmaessig";
  }

  if (b.includes("verstopf")) return "verstopfung";
  if (b.includes("leck")) return "leck";
  if (b.includes("steckdose")) return "steckdose";
  if (b.includes("fi ")) return "fi_schalter";
  if (b.includes("fehlersuche")) return "fehlersuche";
  if (b.includes("rasen")) return "rasen";
  if (b.includes("hecke")) return "hecke";
  if (b.includes("pflaster")) return "pflaster";
  if (b.includes("wände + decke") || b.includes("waende + decke"))
    return "waende_decke";
  if (b.includes("wände streichen")) return "waende";
  if (b.includes("fassade")) return "anstrich";
  if (b.includes("laminat")) return "laminat";
  if (b.includes("parkett")) return "parkett";
  if (b.includes("vinyl")) return "vinyl";
  if (b.includes("balkon") || b.includes("terrasse belag")) return "balkon_belag";
  if (b.includes("fliesen boden")) return "fliesen";
  if (b.includes("fliesen")) return "fliesen";
  if (b.includes("teppich")) return "teppich";
  if (b.includes("bad — fliesen") || b.includes("bad fliesen")) return "fliesen";
  if (b.includes("komplettsanierung")) return "komplett";
  if (b.includes("sanitärobj")) return "objekte";
  if (b.includes("gasheizung")) return "gas";
  if (b.includes("wartung")) return "wartung";
  if (b.includes("ziegel")) return "ziegel";
  if (b.includes("dach komplett")) return "komplett";
  if (b.includes("regenrinne")) return "regenrinne";
  if (b.includes("montage")) return "aufbau";

  return "allgemein";
}

function serviceSlugForLine(item: PriceLineItem): string {
  const g = item.gewerk;
  const b = item.beschreibung.toLowerCase();
  if (g === "Fassade" && (b.includes("außen") || b.includes("aussen")))
    return "maler";
  return GEWERK_SERVICE_SLUG[g] ?? g.toLowerCase().replace(/\s+/g, "_");
}

export function getLeistungsLabel(gewerk: string, type: string): string {
  const key = `${gewerk}.${type}`;
  return LEISTUNGS_LABELS[key] ?? `${gewerk} — ${type}`;
}

/** Kurzlabel für Tabellen / E-Mail-Zeilen. */
export function lineLeistungsLabel(item: PriceLineItem): string {
  const slug = serviceSlugForLine(item);
  const type = beschreibungToTypeSlug(item.beschreibung, item.gewerk);
  const key = `${slug}.${type}`;
  return (
    LEISTUNGS_LABELS[key] ??
    (item.beschreibung.trim() || getLeistungsLabel(slug, type))
  );
}
