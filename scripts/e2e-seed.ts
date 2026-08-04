/**
 * E2E-Testdaten: org_kennung, Auth-User, lead_kanal-Enum.
 * npx tsx scripts/e2e-seed.ts
 */
import { readFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      const k = t.slice(0, i).trim();
      if (!process.env[k]) process.env[k] = t.slice(i + 1).trim();
    }
  }
}

const E2E_PASSWORD = "E2eTestPass2026!";
const E2E_ORG_EMAIL = "e2e-hv@baerenwald-test.local";
const E2E_PARTNER_EMAIL = "e2e-partner@baerenwald-test.local";

async function ensureAuthUser(
  admin: ReturnType<typeof createClient>,
  email: string
): Promise<string> {
  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = listed?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing?.id) {
    await admin.auth.admin.updateUserById(existing.id, {
      password: E2E_PASSWORD,
      email_confirm: true,
    });
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: E2E_PASSWORD,
    email_confirm: true,
    user_metadata: { name: "E2E Test" },
  });
  if (error || !data.user?.id) {
    throw new Error(`Auth-User ${email}: ${error?.message ?? "fehlgeschlagen"}`);
  }
  return data.user.id;
}

async function applyLeadKanalMigration(admin: ReturnType<typeof createClient>) {
  const sql = `
    do $$ begin alter type public.lead_kanal add value if not exists 'hv_melder_link';
    exception when duplicate_object then null; end $$;
    do $$ begin alter type public.lead_kanal add value if not exists 'hv_direkt';
    exception when duplicate_object then null; end $$;
    do $$ begin alter type public.lead_kanal add value if not exists 'hv_einladung';
    exception when duplicate_object then null; end $$;
    do $$ begin alter type public.lead_kanal add value if not exists 'hv_katalog';
    exception when duplicate_object then null; end $$;
  `;
  const { error } = await admin.rpc("exec_sql", { query: sql }).maybeSingle();
  if (error) {
    console.warn("[e2e-seed] lead_kanal via rpc nicht möglich — bitte Migration manuell:", error.message);
  }
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Supabase-Keys fehlen in .env.local");
    process.exit(1);
  }

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  await applyLeadKanalMigration(admin);

  const orgUserId = await ensureAuthUser(admin, E2E_ORG_EMAIL);
  const partnerUserId = await ensureAuthUser(admin, E2E_PARTNER_EMAIL);

  const { data: orgKunde } = await admin
    .from("kunden")
    .select("id, org_kennung, email, auth_user_id")
    .eq("portal_modus", "organisation")
    .limit(1)
    .maybeSingle();

  if (!orgKunde?.id) {
    console.error("Keine HV-Organisation in kunden gefunden.");
    process.exit(1);
  }

  await admin
    .from("kunden")
    .update({
      email: E2E_ORG_EMAIL,
      auth_user_id: orgUserId,
      org_kennung: orgKunde.org_kennung ?? "baerenwald-hv",
      portal_modus: "organisation",
      freigabe_modus: "freigabe",
    })
    .eq("id", orgKunde.id);

  const { data: objekt } = await admin
    .from("kunden_objekte")
    .select("id, melde_slug")
    .eq("kunde_id", orgKunde.id)
    .eq("melde_aktiv", true)
    .not("melde_slug", "is", null)
    .limit(1)
    .maybeSingle();

  const { data: hw } = await admin
    .from("handwerker")
    .select("id, email, auth_user_id")
    .limit(1)
    .maybeSingle();

  if (hw?.id) {
    await admin
      .from("handwerker")
      .update({ email: E2E_PARTNER_EMAIL, auth_user_id: partnerUserId })
      .eq("id", hw.id);
  }

  const { data: crmProfile } = await admin
    .from("user_profiles")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (crmProfile?.id) {
    const { data: crmUser } = await admin.auth.admin.getUserById(crmProfile.id);
    if (crmUser?.user?.email) {
      await admin.auth.admin.updateUserById(crmProfile.id, {
        password: E2E_PASSWORD,
        email_confirm: true,
      });
      console.log(`CRM-User: ${crmUser.user.email} (Passwort gesetzt)`);
    }
  }

  const { data: sampleLead } = await admin
    .from("leads")
    .select("id")
    .eq("auftraggeber_kunde_id", orgKunde.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log("\n=== E2E Seed OK ===");
  console.log(`HV Portal:  ${E2E_ORG_EMAIL} / ${E2E_PASSWORD}`);
  console.log(`Partner:    ${E2E_PARTNER_EMAIL} / ${E2E_PASSWORD}`);
  console.log(`Org-Kennung: ${orgKunde.org_kennung ?? "baerenwald-hv"}`);
  console.log(`Objekt-Slug: ${objekt?.melde_slug ?? "—"}`);
  if (sampleLead?.id) console.log(`CRM Lead:   ${sampleLead.id}`);
  console.log("\n.env.local ergänzen:");
  console.log(`E2E_ORG_EMAIL=${E2E_ORG_EMAIL}`);
  console.log(`E2E_ORG_PASSWORD=${E2E_PASSWORD}`);
  console.log(`E2E_PARTNER_EMAIL=${E2E_PARTNER_EMAIL}`);
  console.log(`E2E_PARTNER_PASSWORD=${E2E_PASSWORD}`);
  if (sampleLead?.id) console.log(`E2E_CRM_LEAD_ID=${sampleLead.id}`);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
