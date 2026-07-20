/**
 * Portal 2.0 D6/D12 — Einstellungen Shared + Rollen-Varianten.
 */
import {
  EINSTELLUNGEN_BRANDING_FOOTER,
  EINSTELLUNGEN_BRANDING_INTRO,
  EINSTELLUNGEN_BRANDING_TITLE,
  EINSTELLUNGEN_OBJEKT_SCHWELLE_TITLE,
  EINSTELLUNGEN_PROFIL_EDIT,
  EINSTELLUNGEN_SCHWELLE_INTRO,
  EINSTELLUNGEN_SCHWELLE_TITLE,
  einstellungenPageTitle,
  formatEinstellungenSchwelle,
} from "../src/lib/portal2/einstellungen";
import {
  HW_FIRMEN_CARD_TITLE,
  HW_FIRMEN_FOOTER,
  HW_FIRMEN_INTRO,
  HW_FIRMEN_SECTIONS,
  MIETER_KONTO_ZUGANG_TITLE,
  MIETER_SPRACHE_TITLE,
  einstellungenContentMaxWidth,
  mieterKontoZugangHinweis,
} from "../src/lib/portal2/einstellungen-ui";
import {
  BRAND_PRESETS,
  findBrandPresetByPrimary,
} from "../src/lib/portal2/brand-presets";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 D12 einstellungen");

assert("hv title", einstellungenPageTitle("hv") === "Einstellungen");
assert("mieter title", einstellungenPageTitle("mieter") === "Konto");
assert("hw title", einstellungenPageTitle("handwerker") === "Firmendaten");
assert("privat title", einstellungenPageTitle("privat") === "Einstellungen");

assert("maxW hv 560", einstellungenContentMaxWidth("hv") === 560);
assert("maxW mieter 560", einstellungenContentMaxWidth("mieter") === 560);
assert("maxW privat 560", einstellungenContentMaxWidth("privat") === 560);
assert("maxW hw 640", einstellungenContentMaxWidth("handwerker") === 640);

assert(
  "branding title",
  EINSTELLUNGEN_BRANDING_TITLE === "Branding & White-Label"
);
assert(
  "branding intro mieter",
  EINSTELLUNGEN_BRANDING_INTRO.includes("Mieter & Eigentümer") &&
    EINSTELLUNGEN_BRANDING_INTRO.includes("Bärenwald tritt dort nicht")
);
assert(
  "branding footer",
  EINSTELLUNGEN_BRANDING_FOOTER.includes("automatisch gespeichert")
);
assert("profil edit", EINSTELLUNGEN_PROFIL_EDIT === "Profil bearbeiten");
assert(
  "schwelle title",
  EINSTELLUNGEN_SCHWELLE_TITLE === "Globaler Freigabe-Schwellenwert"
);
assert(
  "schwelle intro",
  EINSTELLUNGEN_SCHWELLE_INTRO.includes("ohne manuelle Freigabe")
);
assert(
  "objekt schwelle",
  EINSTELLUNGEN_OBJEKT_SCHWELLE_TITLE === "Objekt-spezifische Schwellenwerte"
);

assert("5 presets for editor", BRAND_PRESETS.length === 5);
assert(
  "active brand match",
  findBrandPresetByPrimary("#22508C")?.id === "blau"
);

assert(
  "money format",
  formatEinstellungenSchwelle(500).includes("500")
);

assert(
  "hw card title",
  HW_FIRMEN_CARD_TITLE === "Firmendaten für Angebote & Rechnungen"
);
assert("hw intro ustg", HW_FIRMEN_INTRO.includes("§14 UStG"));
assert("hw footer autosave", HW_FIRMEN_FOOTER.includes("automatisch gespeichert"));
assert("hw section anschrift", HW_FIRMEN_SECTIONS.anschrift === "ANSCHRIFT & KONTAKT");
assert("hw section bank", HW_FIRMEN_SECTIONS.bank.includes("BANKVERBINDUNG"));

assert("mieter zugang", MIETER_KONTO_ZUGANG_TITLE === "Zugang");
assert("mieter sprache", MIETER_SPRACHE_TITLE === "Sprache");
assert(
  "mieter hinweis mail",
  mieterKontoZugangHinweis("hv@example.de").includes("hv@example.de")
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-einstellungen checks passed.");
