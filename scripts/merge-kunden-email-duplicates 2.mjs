/**
 * Einmalig: Duplikat-Kunden nach E-Mail mergen (wie Migration 20260609120000).
 * Ausführen: node scripts/merge-kunden-email-duplicates.mjs
 * Danach Migration im SQL Editor / supabase db push für Unique-Index.
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase env fehlt");

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function get(path) {
  const r = await fetch(`${url}/rest/v1/${path}`, { headers });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

async function patch(table, id, body) {
  const r = await fetch(`${url}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
}

async function del(table, id) {
  const r = await fetch(`${url}/rest/v1/${table}?id=eq.${id}`, {
    method: "DELETE",
    headers: { ...headers, Prefer: "return=minimal" },
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
}

async function count(table, kundeId) {
  const rows = await get(`${table}?select=id&kunde_id=eq.${kundeId}`);
  return rows.length;
}

async function score(kundeId) {
  const [l, a, au] = await Promise.all([
    count("leads", kundeId),
    count("angebote", kundeId),
    count("auftraege", kundeId),
  ]);
  return l + a + au;
}

async function main() {
  const kunden = await get(
    "kunden?select=id,name,email,auth_user_id,created_at&order=created_at.asc"
  );

  const groups = new Map();
  for (const k of kunden) {
    const e = (k.email ?? "").trim().toLowerCase();
    if (!e) continue;
    if (!groups.has(e)) groups.set(e, []);
    groups.get(e).push(k);
  }

  for (const [email, list] of groups) {
    if (list.length < 2) continue;
    console.log(`Merge ${email} (${list.length} Stämme)`);

    const scored = await Promise.all(
      list.map(async (k) => ({
        k,
        daten: await score(k.id),
      }))
    );
    scored.sort((a, b) => {
      if (b.daten !== a.daten) return b.daten - a.daten;
      if (Boolean(b.k.auth_user_id) !== Boolean(a.k.auth_user_id)) {
        return b.k.auth_user_id ? 1 : -1;
      }
      return new Date(a.k.created_at).getTime() - new Date(b.k.created_at).getTime();
    });

    const canonical = scored[0].k;
    console.log("  canonical:", canonical.id, canonical.name);

    for (const { k } of scored.slice(1)) {
      for (const table of ["leads", "angebote", "auftraege", "kunden_objekte"]) {
        const rows = await get(`${table}?select=id&kunde_id=eq.${k.id}`);
        for (const row of rows) {
          await patch(table, row.id, { kunde_id: canonical.id });
        }
        if (rows.length) console.log(`  ${table}: ${rows.length} → ${canonical.id}`);
      }
      if (k.auth_user_id && !canonical.auth_user_id) {
        await patch("kunden", canonical.id, { auth_user_id: k.auth_user_id });
        canonical.auth_user_id = k.auth_user_id;
        console.log("  auth übernommen von", k.id);
      }
      await del("kunden", k.id);
      console.log("  gelöscht:", k.id, k.name);
    }

    await patch("kunden", canonical.id, { email });
  }

  console.log("Fertig. Bitte Migration 20260609120000 im SQL Editor ausführen (Unique-Index).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
