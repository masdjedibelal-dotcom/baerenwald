import type { BaerenwaldProjekt, ProjektPhase } from "@/components/home/ProjektGalerie";

/**
 * Baustellenfotos je Projekt (Stand 06.11.2026). Ort nur Stadtteil/Gemeinde,
 * keine Hausnummern; Fotos mit erkennbaren Personen oder Kennzeichen sind nicht dabei.
 * Bilder: public/images/projekte/<slug>-<n>.jpg — Reihenfolge = Reihenfolge der Liste.
 */
type Foto = [phase: ProjektPhase | null, beschreibung: string];

const VERLAUF = "linear-gradient(135deg, var(--fl-accent-dark), var(--fl-accent))";

function projekt(
  id: number,
  slug: string,
  daten: {
    titel: string;
    ort?: string;
    gewerke: string[];
    tag?: BaerenwaldProjekt["tag"];
    fotos: Foto[];
  }
): BaerenwaldProjekt {
  const bilder = daten.fotos.map((_, i) => `/images/projekte/${slug}-${i + 1}.jpg`);
  return {
    id,
    bild: bilder[0],
    bilder,
    bildPhasen: daten.fotos.map(([p]) => p),
    bildAlts: daten.fotos.map(([, b]) => `${daten.titel}: ${b}`),
    bildAlt: `${daten.titel}${daten.ort ? ` in ${daten.ort}` : ""}`,
    gewerk: daten.titel,
    stadtteil: daten.ort,
    tag: daten.tag,
    gewerke: daten.gewerke,
    placeholderGradient: VERLAUF,
    placeholderEmoji: "",
  };
}

const GALABAU = ["Garten- und Landschaftsbau"];

export const PROJEKTE_FOTOS: readonly BaerenwaldProjekt[] = [
  projekt(101, "bad-ramersdorf", {
    titel: "Komplettbadsanierung",
    ort: "München-Ramersdorf-Perlach",
    gewerke: ["Sanitär", "Trockenbau", "Elektro", "Malerarbeiten", "Schreinerarbeiten", "Fliesenarbeiten"],
    fotos: [
      ["nachher", "Regendusche und Wandnische"],
      ["vorher", "Badewanne"],
      ["nachher", "Dusche mit Glasabtrennung"],
    ],
  }),
  projekt(102, "bad-schwabing-mikrozement", {
    titel: "Komplettbadsanierung mit Mikrozement in Spachteltechnik",
    ort: "München-Schwabing",
    gewerke: ["Abriss und Rückbau", "Trockenbau", "Sanitär", "Elektro", "Malerarbeiten", "Fliesenarbeiten"],
    fotos: [
      ["nachher", "Wannenbad"],
      ["vorher", "Gäste-WC"],
      ["nachher", "Gäste-WC"],
      ["nachher", "Wannenbad mit Deckenbeleuchtung"],
      ["nachher", "Duschbad"],
    ],
  }),
  projekt(103, "abriss-betonbau-altstadt", {
    titel: "Tiefbau, Abrissarbeiten und Betonbau",
    ort: "München, am Marienplatz",
    gewerke: ["Abriss und Rückbau", "Eisenflechterarbeiten (Bewehrung)", "Maurerarbeiten", "Betonbau"],
    fotos: [
      ["waehrend", "Rohbau mit Wandöffnung"],
      ["waehrend", "Freigelegtes Mauerwerk und Boden"],
      ["waehrend", "Bewehrungsstahl und Schalungsmaterial"],
      ["waehrend", "Bewehrung im Baubereich"],
      ["waehrend", "Bewehrung und Abstützung"],
    ],
  }),
  projekt(104, "fassade-wohnanlage-perlach", {
    titel: "Kompletter Fassadenanstrich einer Wohnanlage",
    ort: "München-Ramersdorf-Perlach",
    gewerke: ["Malerarbeiten", "Gerüstbau"],
    fotos: [
      [null, "Giebelfassade vom Garten"],
      ["waehrend", "Hofansicht mit Gerüst"],
      ["waehrend", "Gartenseite mit Gerüst"],
      ["waehrend", "Seitenansicht mit Gerüst"],
      [null, "Giebel und Zufahrt"],
    ],
  }),
  projekt(105, "poolfundament-valley", {
    titel: "Betonfundament für einen Pool",
    ort: "Valley",
    gewerke: GALABAU,
    fotos: [
      ["nachher", "Fertig abgezogenes Poolfundament"],
      ["waehrend", "Bewehrungsmatte und Einfassung"],
      ["waehrend", "Beton abziehen"],
      ["waehrend", "Beton abziehen, Detail"],
    ],
  }),
  projekt(106, "rohrbruch-garching", {
    titel: "Rohrbruchreparatur und Bodeninstandsetzung",
    ort: "Garching-Hochbrück",
    gewerke: ["Sanitär", "Bodenlegerarbeiten"],
    fotos: [
      ["nachher", "Geschlossene Reparaturstelle"],
      ["waehrend", "Freigelegte Rohrleitung mit Verbindern"],
      ["waehrend", "Rohrleitung und Bewehrung"],
      ["waehrend", "Bodenöffnung verfüllt"],
      ["waehrend", "Bodenfläche geglättet"],
    ],
  }),
  projekt(107, "wdvs-untergiesing", {
    titel: "Großprojekt Fassadendämmung (WDVS)",
    ort: "München, am Candidplatz",
    gewerke: ["Fassadenbau (Wärmedämmverbundsystem)"],
    fotos: [
      ["waehrend", "Innenhof, Gesamtansicht"],
      ["waehrend", "Innenhof mit Dämmplatten und Kran"],
      ["waehrend", "Eingerüstete Fassade mit Baustellensilo"],
    ],
  }),
  projekt(108, "garten-ramersdorf", {
    titel: "Komplette Gartenumgestaltung",
    ort: "München-Ramersdorf-Perlach",
    gewerke: GALABAU,
    fotos: [
      ["nachher", "Dielenterrasse und Gartenfläche"],
      ["vorher", "Bestandsterrasse am Haus"],
      ["vorher", "Bestandsterrasse und Garten"],
      ["nachher", "Terrasse mit Randeinfassung"],
      ["nachher", "Terrasse und Holzsichtschutz"],
    ],
  }),
  projekt(109, "ueberdachung-berg-am-laim", {
    titel: "Wintergarten und Überdachungen",
    ort: "München-Berg am Laim",
    gewerke: GALABAU,
    fotos: [
      ["nachher", "Montierte Eingangsüberdachung mit Seitenelement"],
      ["waehrend", "Wintergarten mit Verglasung"],
      ["nachher", "Montierte Eingangsüberdachung, Dachansicht"],
    ],
  }),
  projekt(110, "betonmauer-planegg", {
    titel: "Betonmauer als Sichtschutz",
    ort: "Planegg-Martinsried",
    gewerke: GALABAU,
    fotos: [
      ["nachher", "Betonmauer, Außenseite"],
      ["nachher", "Betonmauer, Terrassenseite"],
    ],
  }),
  projekt(111, "baumfaellung-perlach", {
    titel: "Baumfällung",
    ort: "München-Ramersdorf-Perlach",
    gewerke: ["Baumpflege"],
    fotos: [
      ["nachher", "Gebäudeansicht nach der Fällung"],
      ["vorher", "Baum am Gebäude"],
      ["nachher", "Baumstumpf nach der Fällung"],
    ],
  }),
  projekt(112, "terrasse-obermenzing", {
    titel: "Terrassenbau",
    ort: "München-Obermenzing",
    gewerke: GALABAU,
    fotos: [
      ["nachher", "Fertige Plattenterrasse"],
      ["vorher", "Terrassenfläche und bestehende Stufen"],
      ["waehrend", "Verlegter Plattenbelag mit Wasserwaage"],
    ],
  }),
  projekt(113, "elektro-maxvorstadt", {
    titel: "Elektroinstallation im Gewerbeobjekt",
    ort: "München-Maxvorstadt",
    tag: "gewerbe",
    gewerke: ["Elektro"],
    fotos: [
      ["waehrend", "Elektroverteilung mit Verdrahtung"],
      ["standort", "Straßenansicht des Gewerbeobjekts"],
      ["waehrend", "Kabelzuführung zur Verteilung"],
      ["waehrend", "Beschriftete Leitungen"],
      ["waehrend", "Leitungen am Schaltschrank"],
      ["waehrend", "Netzwerkschrank mit Patchfeldern"],
    ],
  }),
  projekt(114, "laminat-perlach", {
    titel: "Neuer Laminatboden",
    ort: "München-Ramersdorf-Perlach",
    gewerke: ["Bodenlegerarbeiten"],
    fotos: [
      ["nachher", "Raumansicht"],
      ["nachher", "Raumansicht"],
      ["nachher", "Raumansicht"],
      ["nachher", "Raumansicht"],
      ["nachher", "Raumansicht"],
    ],
  }),
  projekt(115, "terrasse-dachau", {
    titel: "Kompletter Terrassenumbau",
    ort: "Dachau",
    gewerke: GALABAU,
    fotos: [
      ["nachher", "Neuer Plattenbelag, Gesamtansicht"],
      ["vorher", "Alter Plattenbelag, Gesamtansicht"],
      ["vorher", "Alter Plattenbelag, Seitenterrasse"],
      ["nachher", "Neuer Plattenbelag, Seitenterrasse"],
    ],
  }),
  projekt(116, "gartenzaun-putzbrunn", {
    titel: "Gartengestaltung mit Neupflanzung und neuem Zaun",
    ort: "Putzbrunn",
    gewerke: GALABAU,
    fotos: [
      ["nachher", "Sichtschutzzaun an der Gartenecke"],
      ["vorher", "Gehweg mit bestehender Hecke"],
      ["vorher", "Außenansicht der bestehenden Hecke"],
      ["nachher", "Sichtschutzzaun entlang des Gehwegs"],
      ["nachher", "Zaun und Bepflanzung, Detail"],
    ],
  }),
  projekt(117, "swim-spa", {
    titel: "Anlieferung und Einsetzen eines Swim-Spas",
    gewerke: ["Poolmontage", "Kranarbeiten"],
    fotos: [
      ["waehrend", "Eingesetzter Swim-Spa, Technikseite"],
      ["waehrend", "Anlieferung mit Kran"],
      ["waehrend", "Swim-Spa am Kran"],
    ],
  }),
];
