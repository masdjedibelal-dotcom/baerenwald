import type { FachdetailsState, Kundentyp, Situation, Zeitraum } from "@/lib/funnel/types";

export type KiAnfrageTyp =
  | "bekannt"
  | "unbekannt"
  | "zu_komplex"
  | "off_topic"
  | "chat";

export type KiParsedBekannt = {
  typ: "bekannt";
  situation: Situation;
  bereiche: string[];
  groesse?: number;
  plz?: string;
  zeitraum?: Zeitraum;
  kundentyp?: Kundentyp;
  fachdetails?: Record<string, string>;
};

export type KiParsedRueckruf = {
  typ: "unbekannt" | "zu_komplex";
  antwort: string;
  cta?: "rueckruf" | "beratung";
};

export type KiParsedOffTopic = {
  typ: "off_topic";
  antwort: string;
};

export type KiParsedPayload =
  | KiParsedBekannt
  | KiParsedRueckruf
  | KiParsedOffTopic;

export type KiFunnelHandoff = {
  situation: Situation;
  bereiche: string[];
  groesse: number | null;
  groesseEinheit: "qm" | "stueck" | "meter" | null;
  plz: string;
  zeitraum: Zeitraum | null;
  kundentyp: Kundentyp | null;
  fachdetails: Partial<FachdetailsState>;
  badAusstattung: "standard" | "komfort" | "gehoben" | null;
  zugaenglichkeit: "einfach" | "mittel" | "schwer" | "unknown";
  zustand: "gut" | "mittel" | "schlecht" | "unknown";
};
