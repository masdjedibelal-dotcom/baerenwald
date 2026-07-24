import { readFileSync, existsSync } from "fs";
import path from "path";

/** Kontext aus scripts/e2e-seed-musterverwaltung.ts */
export type MusterContext = {
  orgKundeId: string;
  orgKennung: string;
  orgBId: string;
  schwelleEur: number;
  objektGH12: { id: string; slug: string; kostenstelle: string };
  objektLS7: { id: string; slug: string };
  einheitGH12Id: string;
  wohnflaecheGH12: number;
  users: {
    adminEmail: string;
    sachbearbeiterEmail: string;
    password: string;
  };
  partners: { shkEmail: string; malerEmail: string; shkId: string; malerId: string };
  bestandsLeadId: string;
  fixProduktSlug: string;
  bandProduktSlug: string;
  aboSlugs: string[];
};

export function loadMusterContext(): MusterContext {
  const p = path.join(__dirname, "../.cache/muster-context.json");
  if (!existsSync(p)) {
    throw new Error(
      "muster-context.json fehlt — zuerst: npm run e2e:seed:muster"
    );
  }
  return JSON.parse(readFileSync(p, "utf8")) as MusterContext;
}

export function uniqueMelderEmail(tag = "mieter"): string {
  return `e2e-${tag}+${Date.now()}@example.com`;
}
