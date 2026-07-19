import {
  BRAND_PRESETS,
  findBrandPresetByPrimary,
  orgBrandFromKunde,
  resolveBrandPalette,
} from "@/lib/portal2/brand-presets";
import { applyBrandStyle } from "@/lib/portal2/apply-brand";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

assert("5 presets", BRAND_PRESETS.length === 5);
assert(
  "Steiner-Blau",
  BRAND_PRESETS[0]!.primary === "#22508C" &&
    BRAND_PRESETS[0]!.primaryDk === "#1b426f" &&
    BRAND_PRESETS[0]!.soft === "#E8EEF6"
);
assert(
  "Petrol",
  BRAND_PRESETS[4]!.primary === "#1F6E78" && BRAND_PRESETS[4]!.soft === "#E6F0F1"
);

const resolved = resolveBrandPalette({ primary: "#8C2F45" });
assert(
  "resolve from primary alone",
  resolved.primaryDk === "#6f2537" && resolved.soft === "#F6E9EC"
);

assert(
  "find preset",
  findBrandPresetByPrimary("#2E6B4F")?.id === "gruen"
);

const brand = orgBrandFromKunde({
  org_anzeigename: "Muster HV",
  org_primary_color: "#1F6E78",
  org_telefon: "089 111",
  email: "hv@example.de",
  org_strasse: "Teststr. 1",
  org_ort: "80331 München",
});
assert("org name", brand.name === "Muster HV");
assert("org sub default", brand.sub === "Hausverwaltung");
assert("org primary petrol", brand.primary === "#1F6E78");
assert("org logo kuerzel", brand.logo === "MH");
assert("org tel", brand.tel === "089 111");

const style = applyBrandStyle({ primary: "#22508C" });
assert(
  "applyBrand sets vars",
  style["--org-primary" as keyof typeof style] === "#22508C" &&
    style["--org-primary-dk" as keyof typeof style] === "#1b426f"
);

if (failed) {
  console.error(`\n${failed} brand test(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2 brand tests passed.");
