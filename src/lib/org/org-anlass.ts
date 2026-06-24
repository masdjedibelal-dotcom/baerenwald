import type { LeadAnlass } from "@/lib/org/types";

const LABELS: Record<LeadAnlass, string> = {
  meldung: "Meldung",
  projekt: "Projekt",
  servicepaket: "Servicepaket",
  sonstiges: "Sonstiges",
};

export function labelOrgAnlass(anlass?: string | null): string {
  if (!anlass) return "Anfrage";
  return LABELS[anlass as LeadAnlass] ?? anlass;
}
