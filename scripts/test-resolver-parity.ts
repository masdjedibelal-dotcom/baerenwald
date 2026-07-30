/**
 * Q12: Paritäts-Guard — shared-resolver-fixtures müssen in Portal + CRM identisch sein.
 * npm run test:resolver-parity
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const portalFile = resolve(
  process.cwd(),
  "src/lib/crm-vorgang/shared-resolver-fixtures.ts"
);
/** Desktop/Bärenwald/handwerks-plattform → Desktop/Bärenwald-Backend/… */
const crmCandidates = [
  resolve(
    process.cwd(),
    "../../Bärenwald-Backend/baerenwald-crm-dashboard/src/lib/vorgang/shared-resolver-fixtures.ts"
  ),
  resolve(
    process.cwd(),
    "../Bärenwald-Backend/baerenwald-crm-dashboard/src/lib/vorgang/shared-resolver-fixtures.ts"
  ),
  process.env.CRM_REPO_FIXTURES?.trim() || "",
].filter(Boolean);

const crmFile = crmCandidates.find((p) => existsSync(p)) ?? crmCandidates[0];

function normalize(src: string): string {
  return src
    .replace(/\r\n/g, "\n")
    .replace(/^\/\*\*[\s\S]*?\*\/\n?/, "")
    .trim();
}

function hash(content: string): string {
  return createHash("sha256").update(normalize(content)).digest("hex");
}

if (!existsSync(portalFile)) {
  console.error("✗ Portal-Fixtures fehlen:", portalFile);
  process.exit(1);
}
if (!existsSync(crmFile)) {
  console.error(
    "✗ CRM-Fixtures fehlen (Pfad relativ zum Portal-Repo):",
    crmFile
  );
  process.exit(1);
}

const portal = readFileSync(portalFile, "utf8");
const crm = readFileSync(crmFile, "utf8");
const hp = hash(portal);
const hc = hash(crm);

if (hp !== hc) {
  console.error("✗ Resolver-Fixtures divergieren (Portal ≠ CRM)");
  console.error("  Portal:", portalFile);
  console.error("  CRM:   ", crmFile);
  console.error("  Hash Portal:", hp.slice(0, 12));
  console.error("  Hash CRM:   ", hc.slice(0, 12));
  console.error("  → Dateien wieder syncen (Copy-Sync Q12).");
  process.exit(1);
}

console.log("✓ shared-resolver-fixtures Parität Portal ↔ CRM");
