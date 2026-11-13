import { Camera, Headset, Layers, ReceiptText } from "lucide-react";

/** Kern-USPs von teo: Leiste unter dem Hero und Seitenspalte der Anfrage. */
export const TEO_USPS = [
  { icon: Layers, text: "Alle Gewerke, klein bis groß" },
  { icon: Headset, text: "Ein Ansprechpartner für alles" },
  { icon: ReceiptText, text: "Zum Preis eines Fachbetriebs" },
  { icon: Camera, text: "Jede Arbeit mit Fotos belegt" },
] as const;
