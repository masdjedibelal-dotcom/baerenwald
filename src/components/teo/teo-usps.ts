import { Camera, Headset, Layers, ReceiptText } from "lucide-react";

import type { TeoIconName } from "@/components/teo/TeoIcon3D";

/** Kern-USPs von teo: Leiste unter dem Hero und Seitenspalte der Anfrage. */
export const TEO_USPS = [
  { icon: Layers, bild: "werkzeugkasten" as TeoIconName, text: "Alle Gewerke, klein bis groß" },
  { icon: Headset, bild: "headset" as TeoIconName, text: "Ein Ansprechpartner für alles" },
  { icon: ReceiptText, bild: "rechnung" as TeoIconName, text: "Zum Preis eines Fachbetriebs" },
  { icon: Camera, bild: "kamera" as TeoIconName, text: "Jede Arbeit mit Fotos belegt" },
] as const;
