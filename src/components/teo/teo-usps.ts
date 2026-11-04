import { Camera, Layers, ReceiptText, ShieldCheck } from "lucide-react";

/** Kern-USPs von teo: Leiste unter dem Hero und Seitenspalte der Anfrage. */
export const TEO_USPS = [
  { icon: Layers, text: "Alle Gewerke, klein bis groß" },
  { icon: ShieldCheck, text: "Ein Vertrag, wir haften" },
  { icon: ReceiptText, text: "Zum Preis eines Fachbetriebs" },
  { icon: Camera, text: "Jede Arbeit mit Fotos belegt" },
] as const;
