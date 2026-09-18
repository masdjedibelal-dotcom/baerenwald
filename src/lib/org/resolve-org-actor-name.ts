import type { OrganisationKunde } from "@/lib/org/types";

/** Anzeigename für Audit „Zuletzt geändert von". */
export function resolveOrgActorName(input: {
  kunde: OrganisationKunde;
  email: string;
  personName?: string | null;
}): string {
  const person = input.personName?.trim();
  if (person) return person;
  const org =
    input.kunde.org_anzeigename?.trim() || input.kunde.name?.trim() || "";
  if (org) return org;
  const local = input.email.split("@")[0]?.trim();
  return local || "Verwaltung";
}
