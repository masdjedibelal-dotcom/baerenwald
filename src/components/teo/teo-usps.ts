import { ClipboardCheck, Headset, ReceiptText, ShieldCheck } from "lucide-react";

/** Kern-USPs von teo: Leiste unter dem Hero und Seitenspalte der Anfrage. */
export const TEO_USPS = [
  { icon: Headset, text: "Ein Ansprechpartner" },
  { icon: ReceiptText, text: "Eine Rechnung" },
  { icon: ShieldCheck, text: "Haftung bei uns" },
  { icon: ClipboardCheck, text: "Geprüfte Abnahme" },
] as const;
