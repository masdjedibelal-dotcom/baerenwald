/**
 * Q12 / P0-3: Parität Portal ↔ CRM
 * 1) Fixture-Dateien (Hash)
 * 2) resolveVorgang()-Ausgabe je Fixture
 *
 * npm run test:resolver-parity
 * Rot (exit 1) bei Drift ist erwartet, bis P2 Sync/Entscheidung.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const portalRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const crmCandidates = [
  resolve(portalRoot, "../baerenwald-system"),
  resolve(process.cwd(), "../baerenwald-system"),
  process.env.CRM_REPO_ROOT?.trim() || "",
].filter(Boolean);

const crmRoot = crmCandidates.find((p) =>
  existsSync(join(p, "src/lib/vorgang/resolve-vorgang.ts"))
);

if (!crmRoot) {
  console.error("✗ CRM-Repo nicht gefunden. Erwartet: ../baerenwald-system");
  console.error("  Oder CRM_REPO_ROOT setzen.");
  process.exit(1);
}

type Pair = { label: string; portal: string; crm: string };

const pairs: Pair[] = [
  {
    label: "shared-resolver-fixtures.ts",
    portal: join(portalRoot, "src/lib/crm-vorgang/shared-resolver-fixtures.ts"),
    crm: join(crmRoot, "src/lib/vorgang/shared-resolver-fixtures.ts"),
  },
  {
    label: "resolve-vorgang.fixtures.json",
    portal: join(portalRoot, "shared/crm-vorgang/resolve-vorgang.fixtures.json"),
    crm: join(crmRoot, "src/lib/vorgang/resolve-vorgang.fixtures.json"),
  },
];

function normalize(src: string): string {
  return src.replace(/\r\n/g, "\n").replace(/^\/\*\*[\s\S]*?\*\/\n?/, "").trim();
}

function hash(content: string): string {
  return createHash("sha256").update(normalize(content)).digest("hex");
}

let failed = 0;

for (const p of pairs) {
  if (!existsSync(p.portal)) {
    console.error(`✗ Portal fehlt (${p.label}):`, p.portal);
    failed++;
    continue;
  }
  if (!existsSync(p.crm)) {
    console.error(`✗ CRM fehlt (${p.label}):`, p.crm);
    failed++;
    continue;
  }
  const hp = hash(readFileSync(p.portal, "utf8"));
  const hc = hash(readFileSync(p.crm, "utf8"));
  if (hp !== hc) {
    failed++;
    console.error(`✗ Datei-Drift (${p.label})`);
    console.error(`  Portal: ${p.portal}`);
    console.error(`  CRM:    ${p.crm}`);
    console.error(`  Hash Portal: ${hp.slice(0, 12)}`);
    console.error(`  Hash CRM:    ${hc.slice(0, 12)}`);
  } else {
    console.log(`✓ Datei-Parität (${p.label})`);
  }
}

type Row = {
  id: string;
  phase: string;
  unterstatus: string;
  needsAction: boolean;
  actor: string | null;
  badges: Record<string, unknown>;
};

function runDump(
  root: string,
  fixturesAlias: string,
  resolverAlias: string
): Row[] {
  const dir = mkdtempSync(join(tmpdir(), "bw-parity-"));
  const scriptPath = join(root, "scripts", `.parity-dump-${process.pid}.ts`);
  const outFile = join(dir, "out.json");
  const src = `
import { writeFileSync } from "node:fs";
import { RESOLVE_VORGANG_FIXTURES } from ${JSON.stringify(fixturesAlias)};
import { resolveVorgang } from ${JSON.stringify(resolverAlias)};
const out = RESOLVE_VORGANG_FIXTURES.map((fx) => {
  const r = resolveVorgang(fx.input);
  return {
    id: fx.id,
    phase: r.phase,
    unterstatus: r.unterstatus,
    needsAction: r.needsAction,
    actor: r.actor,
    badges: r.badges,
  };
});
writeFileSync(${JSON.stringify(outFile)}, JSON.stringify(out, null, 2));
`;
  writeFileSync(scriptPath, src);
  const res = spawnSync("npx", ["--yes", "tsx", scriptPath], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  try {
    rmSync(scriptPath, { force: true });
  } catch {
    /* ignore */
  }
  if (res.status !== 0) {
    console.error(`✗ Dump fehlgeschlagen (cwd=${root})`);
    console.error(res.stderr || res.stdout);
    failed++;
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    return [];
  }
  const rows = JSON.parse(readFileSync(outFile, "utf8")) as Row[];
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  return rows;
}

console.log("— Resolver-Ausgabe vergleichen —");
console.log("  CRM-Root:", crmRoot);

const portalRows = runDump(
  portalRoot,
  "@/lib/crm-vorgang/fixtures",
  "@/lib/crm-vorgang/resolve-vorgang"
);
const crmRows = runDump(
  crmRoot,
  "@/lib/vorgang/fixtures",
  "@/lib/vorgang/resolve-vorgang"
);

const byId = new Map(crmRows.map((r) => [r.id, r]));
const allIds = new Set([
  ...portalRows.map((r) => r.id),
  ...crmRows.map((r) => r.id),
]);

for (const id of [...allIds].sort()) {
  const p = portalRows.find((r) => r.id === id);
  const c = byId.get(id);
  if (!p) {
    failed++;
    console.error(`✗ Fixture nur im CRM: ${id}`);
    continue;
  }
  if (!c) {
    failed++;
    console.error(`✗ Fixture nur im Portal: ${id}`);
    continue;
  }
  const keys: (keyof Row)[] = ["phase", "unterstatus", "needsAction", "actor"];
  const diffs: string[] = [];
  for (const k of keys) {
    if (JSON.stringify(p[k]) !== JSON.stringify(c[k])) {
      diffs.push(
        `${k}: Portal=${JSON.stringify(p[k])} CRM=${JSON.stringify(c[k])}`
      );
    }
  }
  if (JSON.stringify(p.badges) !== JSON.stringify(c.badges)) {
    diffs.push(
      `badges: Portal=${JSON.stringify(p.badges)} CRM=${JSON.stringify(c.badges)}`
    );
  }
  if (diffs.length) {
    failed++;
    console.error(`✗ Resolver-Drift ${id}`);
    for (const d of diffs) console.error(`    ${d}`);
  } else {
    console.log(`✓ Resolver ${id}`);
  }
}

if (failed > 0) {
  console.error(
    `\n✗ Parität: ${failed} Abweichung(en) — Sync/Entscheidung nötig (P2-1).`
  );
  process.exit(1);
}
console.log("\n✓ Parität Portal ↔ CRM (Dateien + Resolver-Ausgabe)");
