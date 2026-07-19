/**
 * Seed „Musterverwaltung“ für E2E-Spezifikation.
 * npm run e2e:seed:muster
 */
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { readFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const PASSWORD = "E2eTestPass2026!";
const ORG_KENNUNG = "muster-hv";
const SCHWELLE = 2500;

const ADMIN_EMAIL = "e2e-muster-admin@baerenwald-test.local";
const SB_EMAIL = "e2e-muster-sb@baerenwald-test.local";
const SHK_EMAIL = "e2e-muster-shk@baerenwald-test.local";
const MALER_EMAIL = "e2e-muster-maler@baerenwald-test.local";
const HV_B_EMAIL = "e2e-muster-hvb@baerenwald-test.local";
const BESTAND_EMAIL = "e2e-bestand-privat@example.com";

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

async function ensureUser(admin: ReturnType<typeof createClient>, email: string) {
  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 300 });
  const hit = listed?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (hit?.id) {
    await admin.auth.admin.updateUserById(hit.id, {
      password: PASSWORD,
      email_confirm: true,
    });
    return hit.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user?.id) throw new Error(`${email}: ${error?.message}`);
  return data.user.id;
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const adminUid = await ensureUser(admin, ADMIN_EMAIL);
  const sbUid = await ensureUser(admin, SB_EMAIL);
  const shkUid = await ensureUser(admin, SHK_EMAIL);
  const malerUid = await ensureUser(admin, MALER_EMAIL);
  await ensureUser(admin, HV_B_EMAIL);

  // HV Musterverwaltung
  let orgId: string;
  const { data: existingOrg } = await admin
    .from("kunden")
    .select("id")
    .eq("org_kennung", ORG_KENNUNG)
    .maybeSingle();

  if (existingOrg?.id) {
    orgId = existingOrg.id;
    await admin
      .from("kunden")
      .update({
        name: "Musterverwaltung GmbH",
        org_anzeigename: "Musterverwaltung",
        portal_modus: "organisation",
        freigabe_modus: "freigabe",
        freigabe_schwelle_eur: SCHWELLE,
        kleinreparatur_aktiv: true,
        kleinreparatur_schwelle_eur: 200,
        auth_user_id: adminUid,
        email: ADMIN_EMAIL,
      })
      .eq("id", orgId);
  } else {
    const { data: neu, error } = await admin
      .from("kunden")
      .insert({
        name: "Musterverwaltung GmbH",
        org_anzeigename: "Musterverwaltung",
        org_kennung: ORG_KENNUNG,
        portal_modus: "organisation",
        freigabe_modus: "freigabe",
        freigabe_schwelle_eur: SCHWELLE,
        kleinreparatur_aktiv: true,
        kleinreparatur_schwelle_eur: 200,
        auth_user_id: adminUid,
        email: ADMIN_EMAIL,
        typ: "gewerbe",
      })
      .select("id")
      .single();
    if (error || !neu) throw error;
    orgId = neu.id;
  }

  // HV B (RLS-Negativtest)
  let orgBId: string;
  const { data: orgB } = await admin
    .from("kunden")
    .select("id")
    .eq("org_kennung", "muster-hv-b")
    .maybeSingle();
  if (orgB?.id) {
    orgBId = orgB.id;
  } else {
    const { data: b } = await admin
      .from("kunden")
      .insert({
        name: "Fremd HV B",
        org_kennung: "muster-hv-b",
        portal_modus: "organisation",
        email: HV_B_EMAIL,
        typ: "gewerbe",
      })
      .select("id")
      .single();
    orgBId = b!.id;
  }

  await admin.from("kunden_mitglieder").upsert(
    { kunde_id: orgId, auth_user_id: sbUid, rolle: "sachbearbeiter", aktiv: true },
    { onConflict: "kunde_id,auth_user_id" }
  );

  // Objekte GH12 + LS7
  async function upsertObjekt(
    titel: string,
    slug: string,
    kostenstelle: string | null
  ) {
    const { data: ex } = await admin
      .from("kunden_objekte")
      .select("id")
      .eq("kunde_id", orgId)
      .eq("melde_slug", slug)
      .maybeSingle();
    if (ex?.id) {
      await admin
        .from("kunden_objekte")
        .update({
          titel,
          kostenstelle_nr: kostenstelle,
          melde_aktiv: true,
          plz: "80331",
          strasse: "Musterstraße",
          hausnummer: titel === "GH12" ? "12" : "7",
          ort: "München",
        })
        .eq("id", ex.id);
      return ex.id;
    }
    const { data: o } = await admin
      .from("kunden_objekte")
      .insert({
        kunde_id: orgId,
        titel,
        melde_slug: slug,
        kostenstelle_nr: kostenstelle,
        melde_aktiv: true,
        plz: "80331",
        strasse: "Musterstraße",
        hausnummer: titel === "GH12" ? "12" : "7",
        ort: "München",
        created_by: "portal",
      })
      .select("id")
      .single();
    if (!o?.id) throw new Error(`Objekt ${titel} Insert fehlgeschlagen`);
    return o.id;
  }

  const gh12Id = await upsertObjekt("GH12", "gh12-muster", "KS-GH12");
  const ls7Id = await upsertObjekt("LS7", "ls7-muster", null);

  // Einheit GH12 mit 62 m²
  const { data: einheit } = await admin
    .from("objekt_einheiten")
    .select("id")
    .eq("kunde_objekt_id", gh12Id)
    .eq("bezeichnung", "Whg 3.OG")
    .maybeSingle();

  let einheitId: string;
  if (einheit?.id) {
    einheitId = einheit.id;
    await admin
      .from("objekt_einheiten")
      .update({ wohnflaeche_m2: 62, aktiv: true })
      .eq("id", einheitId);
  } else {
    const { data: e } = await admin
      .from("objekt_einheiten")
      .insert({
        kunde_objekt_id: gh12Id,
        bezeichnung: "Whg 3.OG",
        wohnflaeche_m2: 62,
      })
      .select("id")
      .single();
    einheitId = e!.id;
  }

  // Partner SHK + Maler
  async function upsertPartner(email: string, name: string, uid: string) {
    const { data: ex } = await admin
      .from("handwerker")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (ex?.id) {
      await admin
        .from("handwerker")
        .update({ auth_user_id: uid, name })
        .eq("id", ex.id);
      return ex.id;
    }
    const { data: h, error: hErr } = await admin
      .from("handwerker")
      .insert({ name, email, auth_user_id: uid })
      .select("id")
      .single();
    if (hErr || !h?.id) throw new Error(`Partner ${email}: ${hErr?.message}`);
    return h.id;
  }

  const shkId = await upsertPartner(SHK_EMAIL, "E2E SHK Mustermann", shkUid);
  const malerId = await upsertPartner(MALER_EMAIL, "E2E Maler Meier", malerUid);

  // Fixpreis Verstopfung 189 €
  await admin.from("katalog_produkte").upsert(
    {
      slug: "fix-verstopfung",
      bezeichnung: "Verstopfung beseitigen",
      familie: "fix",
      preis_typ: "fix",
      lohnanteil_prozent: 90,
      has_fixpreis: true,
      aktiv: true,
    },
    { onConflict: "slug" }
  );
  await admin.from("katalog_preise").delete().eq("produkt_slug", "fix-verstopfung");
  await admin.from("katalog_preise").insert({
    produkt_slug: "fix-verstopfung",
    preis_fix: 189,
    lohnanteil_prozent: 90,
  });

  // Bestands-Endkunden-Lead (privat, ohne HV)
  let bestandKundeId: string;
  const { data: bk } = await admin
    .from("kunden")
    .select("id")
    .eq("email", BESTAND_EMAIL)
    .maybeSingle();
  if (bk?.id) {
    bestandKundeId = bk.id;
  } else {
    const { data: neu } = await admin
      .from("kunden")
      .insert({
        name: "E2E Bestandskunde",
        email: BESTAND_EMAIL,
        portal_modus: "privat",
        typ: "privat",
      })
      .select("id")
      .single();
    bestandKundeId = neu!.id;
  }

  let bestandsLeadId: string;
  const { data: bl } = await admin
    .from("leads")
    .select("id")
    .eq("kunde_id", bestandKundeId)
    .eq("kanal", "website")
    .limit(1)
    .maybeSingle();
  if (bl?.id) {
    bestandsLeadId = bl.id;
  } else {
    const { data: lead } = await admin
      .from("leads")
      .insert({
        kunde_id: bestandKundeId,
        kanal: "website",
        status: "neu",
        anlass: "sonstiges",
        kontakt_name: "E2E Bestand",
        kontakt_email: BESTAND_EMAIL,
        situation: "privat",
      })
      .select("id")
      .single();
    bestandsLeadId = lead!.id;
  }

  const ctx = {
    orgKundeId: orgId,
    orgKennung: ORG_KENNUNG,
    orgBId,
    schwelleEur: SCHWELLE,
    objektGH12: { id: gh12Id, slug: "gh12-muster", kostenstelle: "KS-GH12" },
    objektLS7: { id: ls7Id, slug: "ls7-muster" },
    einheitGH12Id: einheitId,
    wohnflaecheGH12: 62,
    users: { adminEmail: ADMIN_EMAIL, sachbearbeiterEmail: SB_EMAIL, password: PASSWORD },
    partners: { shkEmail: SHK_EMAIL, malerEmail: MALER_EMAIL, shkId, malerId },
    bestandsLeadId,
    fixProduktSlug: "fix-verstopfung",
    bandProduktSlug: "uebergabe-stufe-2",
    aboSlugs: ["abo-garten", "abo-reinigung"],
  };

  const cacheDir = path.join(__dirname, "../e2e/.cache");
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(path.join(cacheDir, "muster-context.json"), JSON.stringify(ctx, null, 2));

  console.log("Musterverwaltung-Seed OK → e2e/.cache/muster-context.json");
  console.log(JSON.stringify(ctx, null, 2));
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
