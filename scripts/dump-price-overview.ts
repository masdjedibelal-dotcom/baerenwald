/**
 * Exportiert (1) alle Rohwerte aus PREISE und (2) Rechner-Ausgaben für viele
 * repräsentative Funnel-Zustände als CSV unter data/preis/
 *
 * Ausführen: npm run dump-prices
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { FunnelState } from "../src/lib/funnel/types";
import {
  GU_MARGE,
  NOTDIENST_AUFSCHLAG_EUR,
  PREISE,
  calculatePrice,
  mapToPrice,
} from "../src/lib/funnel/price-calc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "data", "preis");

type BasisEintrag = {
  min: number;
  max: number;
  einheit: string;
  groesseVon?: number;
  groesseBis?: number;
};

function escCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function row(cells: (string | number | null | undefined)[]): string {
  return cells.map(escCell).join(",");
}

function flattenPreise(
  obj: Record<string, unknown>,
  prefix: string
): { path: string; e: BasisEintrag }[] {
  const out: { path: string; e: BasisEintrag }[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && "min" in (v as object) && "max" in (v as object)) {
      out.push({ path: p, e: v as BasisEintrag });
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out.push(...flattenPreise(v as Record<string, unknown>, p));
    }
  }
  return out;
}

function baseErneuern(): FunnelState {
  return {
    situation: "erneuern",
    bereiche: [],
    kundentyp: "eigentuemer",
    showOmitHint: false,
    umfang: null,
    umfangFaktor: 1,
    groesse: 40,
    groesseEinheit: "qm",
    badAusstattung: "standard",
    plz: "80331",
    zeitraum: "flexibel",
    priceMin: 0,
    priceMax: 0,
    breakdown: [],
    istFallback: false,
    komplexReason: null,
    budgetCheck: null,
    dringlichkeit: null,
    zugaenglichkeit: "einfach",
    zustand: "mittel",
    fachdetails: {},
    freitext: null,
    photos: [],
    name: "",
    vorname: "",
    nachname: "",
    leadBeschreibung: "",
    email: "",
    telefon: "",
    selectedSlot: null,
    submitted: false,
  };
}

type Fixture = { id: string; beschreibung: string; state: FunnelState };

function buildFixtures(): Fixture[] {
  const f: Fixture[] = [];

  const push = (id: string, beschreibung: string, state: FunnelState) =>
    f.push({ id, beschreibung, state });

  // ── Maler
  for (const was of ["waende", "waende_decke", "komplett", "tapezieren"] as const) {
    for (const groesse of [35, 90]) {
      push(
        `maler_${was}_${groesse}qm`,
        `Erneuern Maler was=${was} ${groesse} m²`,
        {
          ...baseErneuern(),
          bereiche: ["maler"],
          groesse,
          groesseEinheit: "qm",
          fachdetails: { maler: { was } },
        }
      );
    }
  }

  // ── Boden (alle Beläge + Abriss-Follow-up bei einem Belag)
  const bodenAktuell = [
    "laminat",
    "parkett",
    "parkett_schleifen",
    "vinyl",
    "fliesen",
    "balkon_belag",
    "teppich",
  ] as const;
  for (const aktuell of bodenAktuell) {
    push(
      `boden_${aktuell}_40qm`,
      `Erneuern Boden ${aktuell} 40 m²`,
      {
        ...baseErneuern(),
        bereiche: ["boden"],
        groesse: 40,
        fachdetails: { boden: { aktuell } },
      }
    );
  }
  push(
    "boden_laminat_mit_abriss_40qm",
    "Erneuern Laminat mit Verlegeart (Abriss-Zuschlag)",
    {
      ...baseErneuern(),
      bereiche: ["boden"],
      groesse: 40,
      fachdetails: { boden: { aktuell: "laminat", verlegung: "kleben" } },
    }
  );

  // ── Fassade
  for (const art of ["anstrich", "daemmung", "bekleidung"] as const) {
    push(
      `fassade_${art}_100qm`,
      `Erneuern Fassade art=${art} 100 m²`,
      {
        ...baseErneuern(),
        bereiche: ["fassade"],
        groesse: 100,
        fachdetails: { fassade: { art } },
      }
    );
  }

  // ── Dach
  const dachV = [
    "ziegel_wenige",
    "ziegel_bereich",
    "dachfenster",
    "regenrinne",
    "daemmung",
    "komplett",
    "undichtigkeit",
  ] as const;
  for (const vorhaben of dachV) {
    const groesseEinheit =
      vorhaben === "regenrinne" ? ("meter" as const) : ("qm" as const);
    const groesse = vorhaben === "regenrinne" ? 12 : 80;
    push(
      `dach_${vorhaben}`,
      `Erneuern Dach vorhaben=${vorhaben}`,
      {
        ...baseErneuern(),
        bereiche: ["dach"],
        groesse,
        groesseEinheit,
        fachdetails: { dach: { vorhaben } },
      }
    );
  }

  // ── Fenster (Erneuern)
  for (const ausstattung of [
    "standard",
    "premium",
    "tuer",
    "balkon_tuer",
  ] as const) {
    push(
      `fenster_${ausstattung}_2stueck`,
      `Erneuern Fenster ${ausstattung} ×2`,
      {
        ...baseErneuern(),
        bereiche: ["fenster"],
        groesse: 2,
        groesseEinheit: "stueck",
        fachdetails: { fenster: { ausstattung } },
      }
    );
  }

  // ── Heizung Erneuern
  const heizBase = {
    ...baseErneuern(),
    bereiche: ["heizung"] as string[],
  };
  push(
    "heizung_gas_brennwert_50qm",
    "Heizung tauschen → Gas-Brennwert, 50 m²",
    {
      ...heizBase,
      groesse: 50,
      fachdetails: {
        heizung: { typ: "gas", ziel: "gas_brennwert" },
      },
    }
  );
  push(
    "heizung_gas_brennwert_150qm",
    "Heizung tauschen → Gas-Brennwert, 150 m²",
    {
      ...heizBase,
      groesse: 150,
      fachdetails: {
        heizung: { typ: "gas", ziel: "gas_brennwert" },
      },
    }
  );
  for (const groesse of [50, 120, 220]) {
    push(
      `heizung_wp_neu_${groesse}qm`,
      `Heizung Erneuern → WP/Hybrid Ziel, ${groesse} m²`,
      {
        ...heizBase,
        groesse,
        fachdetails: {
          heizung: { typ: "gas", ziel: "waermepumpe" },
        },
      }
    );
  }
  push(
    "heizung_wartung",
    "Heizung Wartung",
    {
      ...heizBase,
      groesse: null,
      fachdetails: { heizung: { typ: "wartung" } },
    }
  );
  push(
    "heizung_heizkoerper_x3",
    "Heizkörper tauschen ×3",
    {
      ...heizBase,
      groesse: null,
      fachdetails: { heizung: { typ: "heizkoerper", anzahl: 3 } },
    }
  );

  // ── Bad Komplett (alle PREISE.bad-Schlüssel über m² + Ausstattung)
  const aus = ["standard", "komfort", "gehoben"] as const;
  const groByTier: Record<string, number> = {
    klein: 4,
    mittel: 6,
    gross: 10,
  };
  for (const a of aus) {
    for (const tier of ["klein", "mittel", "gross"] as const) {
      const g = groByTier[tier];
      push(
        `bad_komplett_${tier}_${a}`,
        `Bad Komplett-Sanierung ca. ${g} m², ${a}`,
        {
          ...baseErneuern(),
          bereiche: ["bad"],
          groesse: g,
          badAusstattung: a,
          fachdetails: { sanitaer: { badWas: "komplett" } },
        }
      );
    }
  }

  // ── Bad Teilsanierung
  for (const badWas of ["fliesen", "leitungen", "wanne_dusche"] as const) {
    push(
      `bad_teil_${badWas}_8qm`,
      `Bad Teilsanierung ${badWas} 8 m²`,
      {
        ...baseErneuern(),
        bereiche: ["bad"],
        groesse: 8,
        badAusstattung: "standard",
        fachdetails: { sanitaer: { badWas } },
      }
    );
  }
  push(
    "bad_teil_objekte_liste",
    "Bad Teilsanierung Objekte (Waschbecken+WC)",
    {
      ...baseErneuern(),
      bereiche: ["bad"],
      groesse: 8,
      fachdetails: {
        sanitaer: {
          badWas: "objekte",
          objektListe: ["waschbecken", "wc"],
        },
      },
    }
  );

  // ── Elektro Erneuern
  const elProb = [
    "sicherungskasten",
    "leitungen",
    "neue_leitungen",
    "echeck",
    "sonstiges",
  ] as const;
  for (const problem of elProb) {
    push(
      `elektro_erneuern_${problem}`,
      `Elektro Erneuern problem=${problem}`,
      {
        ...baseErneuern(),
        bereiche: ["strom"],
        groesse: 1,
        fachdetails: { elektro: { problem } },
      }
    );
  }

  // ── Garten Erneuern (Pflege nach Größe)
  for (const g of [40, 120, 400]) {
    push(
      `garten_pflege_erneuern_${g}qm`,
      `Gartenpflege Erneuern ${g} m²`,
      {
        ...baseErneuern(),
        bereiche: ["garten"],
        groesse: g,
        fachdetails: { garten: { was: "pflege" } },
      }
    );
  }
  for (const was of ["hecke", "pflaster"] as const) {
    push(
      `garten_${was}_60qm`,
      `Garten ${was} 60 m²`,
      {
        ...baseErneuern(),
        bereiche: ["garten"],
        groesse: 60,
        fachdetails: { garten: { was } },
      }
    );
  }
  push(
    "garten_baum_klein",
    "Baum klein",
    {
      ...baseErneuern(),
      bereiche: ["garten"],
      groesse: 1,
      fachdetails: { garten: { was: "baum", baumgroesse: "klein" } },
    }
  );
  push(
    "garten_baum_gross",
    "Baum groß",
    {
      ...baseErneuern(),
      bereiche: ["garten"],
      groesse: 1,
      fachdetails: { garten: { was: "baum", baumgroesse: "gross" } },
    }
  );

  // ── GU Gartengestaltung
  for (const leistung of ["auffrischung", "neuanlage"] as const) {
    for (const zaun of ["ja", "nein"] as const) {
      for (const zu of ["einfach", "schwer"] as const) {
        push(
          `projekt_garten_${leistung}_zaun${zaun}_zug${zu}_80qm`,
          `Gartengestaltung ${leistung}, Zaun ${zaun}, Zugang ${zu}, 80 m²`,
          {
            ...baseErneuern(),
            bereiche: ["gartengestaltung"],
            groesse: 80,
            fachdetails: {
              projekt: {
                gartenLeistung: leistung,
                gartenZaun: zaun,
                gartenZugaenglichkeit: zu,
              },
            },
          }
        );
      }
    }
  }

  // ── GU weitere Pakete
  push(
    "projekt_ausbau_dg_45qm",
    "Dachausbau DG 45 m² (Rohbau ja, Höhe mittel)",
    {
      ...baseErneuern(),
      bereiche: ["ausbau_dg"],
      groesse: 45,
      fachdetails: {
        projekt: { ausbauRohbau: "ja", ausbauDeckenhoehe: "mittel" },
      },
    }
  );
  push(
    "projekt_ausbau_keller_30qm",
    "Kellerausbau 30 m²",
    {
      ...baseErneuern(),
      bereiche: ["ausbau_keller"],
      groesse: 30,
      fachdetails: {
        projekt: { ausbauRohbau: "ja", ausbauDeckenhoehe: "hoch" },
      },
    }
  );
  push(
    "projekt_durchbruch_tragend_x2",
    "Wanddurchbruch tragend ×2",
    {
      ...baseErneuern(),
      bereiche: ["grundriss_umbau"],
      groesse: 1,
      fachdetails: {
        projekt: { durchbruchTragend: true, durchbruchAnzahl: 2 },
      },
    }
  );
  push(
    "projekt_durchbruch_nicht_tragend",
    "Wanddurchbruch nicht tragend",
    {
      ...baseErneuern(),
      bereiche: ["grundriss_umbau"],
      groesse: 1,
      fachdetails: { projekt: { durchbruchTragend: false } },
    }
  );
  push(
    "projekt_terrasse_neu_25qm_holz",
    "Terrasse neu GU 25 m² Holz",
    {
      ...baseErneuern(),
      bereiche: ["terrasse_neu"],
      groesse: 25,
      fachdetails: { projekt: { terrasseMaterial: "holz", terrasseUnterbau: "nein" } },
    }
  );
  push(
    "projekt_terrasse_neu_unterbau_ja",
    "Terrasse neu mit Unterbau-Zuschlag",
    {
      ...baseErneuern(),
      bereiche: ["terrasse_neu"],
      groesse: 20,
      fachdetails: { projekt: { terrasseMaterial: "stein", terrasseUnterbau: "ja" } },
    }
  );

  // ── Betreuung
  const bet = (patch: Partial<FunnelState>): FunnelState => ({
    ...baseErneuern(),
    situation: "betreuung",
    kundentyp: "hausverwaltung",
    umfang: "monatlich",
    ...patch,
  });

  push(
    "betreuung_reinigung_regelmaessig_200qm",
    "Betreuung Reinigung regelmäßig 200 m²",
    bet({
      bereiche: ["reinigung"],
      umfang: null,
      groesse: 200,
    })
  );
  for (const g of [50, 80, 120]) {
    push(
      `betreuung_reinigung_einmalig_${g}qm`,
      `Betreuung Reinigung einmalig ${g} m²`,
      bet({
        bereiche: ["reinigung"],
        umfang: "einmalig",
        groesse: g,
      })
    );
  }
  push(
    "betreuung_winter_saison_600qm",
    "Betreuung Winterdienst Saison 600 m²",
    bet({
      bereiche: ["winter"],
      umfang: "monatlich",
      groesse: 600,
    })
  );
  push(
    "betreuung_winter_einmalig",
    "Betreuung Winterdienst einmalig",
    bet({
      bereiche: ["winter"],
      umfang: "einmalig",
      groesse: 0,
    })
  );
  push(
    "betreuung_hausmeister_monatlich_klein",
    "Hausmeister monatlich kleine Objektgröße",
    bet({
      bereiche: ["hausmeister"],
      umfang: "monatlich",
      groesse: 55,
    })
  );
  push(
    "betreuung_hausmeister_monatlich_gross",
    "Hausmeister monatlich große Objektgröße",
    bet({
      bereiche: ["hausmeister"],
      umfang: "monatlich",
      groesse: 120,
    })
  );
  push(
    "betreuung_hausmeister_nach_bedarf",
    "Hausmeister nach Bedarf",
    bet({
      bereiche: ["hausmeister"],
      umfang: "nach_bedarf",
      groesse: 100,
    })
  );
  push(
    "betreuung_hausmeister_jahresvertrag",
    "Hausmeister Jahresvertrag",
    bet({
      bereiche: ["hausmeister"],
      umfang: "jahresvertrag",
      groesse: 100,
    })
  );
  push(
    "betreuung_baum_x3",
    "Betreuung Baumarbeiten 3 Bäume",
    bet({
      bereiche: ["baumarbeiten"],
      groesse: 3,
      fachdetails: { garten: { was: "baum", baumgroesse: "klein" } },
    })
  );
  push(
    "betreuung_garten_pflege_150qm",
    "Betreuung Gartenpflege 150 m²",
    bet({
      bereiche: ["garten"],
      groesse: 150,
      fachdetails: { garten: { was: "pflege" } },
    })
  );

  // ── Reparatur / Notfall (kaputt)
  const kap = (patch: Partial<FunnelState>): FunnelState => ({
    ...baseErneuern(),
    situation: "kaputt",
    zeitraum: "diese_woche",
    ...patch,
  });

  push(
    "kaputt_sanitaer_verstopfung",
    "Kaputt Sanitär Verstopfung",
    kap({
      bereiche: ["wasser"],
      fachdetails: { sanitaer: { lage: "verstopfung" } },
    })
  );
  push(
    "kaputt_sanitaer_leck_wand",
    "Kaputt Sanitär Leck Wand",
    kap({
      bereiche: ["wasser"],
      fachdetails: { sanitaer: { lage: "wand" } },
    })
  );
  push(
    "kaputt_elektro_fi",
    "Kaputt Elektro Sicherung",
    kap({
      bereiche: ["strom"],
      fachdetails: { elektro: { problem: "sicherung" } },
    })
  );
  push(
    "kaputt_elektro_steckdose",
    "Kaputt Steckdose",
    kap({
      bereiche: ["elektro"],
      fachdetails: { elektro: { problem: "steckdose" } },
    })
  );
  push(
    "kaputt_heizung_notfall",
    "Kaputt Heizung (Notfall-Pfad)",
    kap({
      bereiche: ["heizung"],
      zeitraum: "sofort",
      fachdetails: { heizung: { typ: "gas" } },
    })
  );
  push(
    "kaputt_fenster_reparatur",
    "Kaputt Fenster Reparatur",
    kap({
      bereiche: ["fenster_tuer"],
      fachdetails: { fenster: { defekt: "glas" } },
    })
  );
  push(
    "kaputt_dach_ziegel_wenige",
    "Kaputt Dach wenige Ziegel",
    kap({
      bereiche: ["dach"],
      fachdetails: { dach: { vorhaben: "ziegel_wenige" } },
    })
  );

  // PLZ-Faktoren (einmal Heizung groß als Referenz)
  for (const [plz, plzLabel] of [
    ["80331", "Muenchen_1.0"],
    ["85221", "Umland_nah_1.03"],
    ["86356", "Umland_weiter_1.06"],
  ] as const) {
    push(
      `plz_sample_heizung_150qm_${plzLabel}`,
      `PLZ-Referenz Heizung 150 m² ${plz}`,
      {
        ...baseErneuern(),
        bereiche: ["heizung"],
        plz,
        groesse: 150,
        fachdetails: { heizung: { typ: "gas", ziel: "gas_brennwert" } },
      }
    );
  }

  return f;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const basisRows = flattenPreise(PREISE as unknown as Record<string, unknown>, "");
  const basisHeader = [
    "pfad",
    "min_eur_basis_muenchen",
    "max_eur_basis_muenchen",
    "einheit",
    "groesse_von",
    "groesse_bis",
    "hinweis",
  ];
  const basisLines = [
    row(basisHeader),
    row([
      "",
      "",
      "",
      "",
      "",
      "",
      `GU_MARGE=${GU_MARGE}; NOTDIENST_AUFSCHLAG_EUR=${NOTDIENST_AUFSCHLAG_EUR}; Werte vor PLZ/Mindestauftrag/Rundung im Rechner`,
    ]),
    ...basisRows.map(({ path, e }) =>
      row([
        path,
        e.min,
        e.max,
        e.einheit,
        e.groesseVon ?? "",
        e.groesseBis ?? "",
        "",
      ])
    ),
  ];
  writeFileSync(
    join(OUT_DIR, "01-preis-basis-preise-objekt.csv"),
    basisLines.join("\n"),
    "utf8"
  );

  const fixtures = buildFixtures();
  const calcHeader = [
    "id",
    "beschreibung",
    "situation",
    "bereiche",
    "groesse",
    "groesse_einheit",
    "plz",
    "map_service",
    "map_type",
    "ausgabe_min_eur",
    "ausgabe_max_eur",
    "ausgabe_mitte",
    "result_modus",
    "plz_faktor",
    "mindestauftrag",
    "preview_false",
    "komplex_reason",
  ];

  const calcLines = [row(calcHeader)];
  for (const x of fixtures) {
    const m = mapToPrice(x.state);
    const r = calculatePrice(x.state, { preview: false });
    calcLines.push(
      row([
        x.id,
        x.beschreibung,
        x.state.situation ?? "",
        x.state.bereiche.join("+"),
        x.state.groesse ?? "",
        x.state.groesseEinheit ?? "",
        x.state.plz,
        m?.service ?? "",
        m && "type" in m ? String(m.type) : "",
        r.min,
        r.max,
        Math.round(r.mitte),
        r.resultModus,
        r.plzFaktor,
        r.mindestauftragAktiv ? "ja" : "nein",
        "nein",
        r.komplexReason ?? "",
      ])
    );
  }

  writeFileSync(
    join(OUT_DIR, "02-preis-rechner-fixtures.csv"),
    calcLines.join("\n"),
    "utf8"
  );

  // eslint-disable-next-line no-console
  console.log(
    `OK: ${basisRows.length} Basiszeilen, ${fixtures.length} Rechnerzeilen → ${OUT_DIR}`
  );
}

main();
