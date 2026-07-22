import { notFound } from "next/navigation";

import { MeldeFormular } from "@/components/melden/MeldeFormular";
import { resolveEinladungKontext } from "@/lib/org/resolve-melde-kontext";

export const metadata = {
  title: "Meldung ergänzen",
  robots: { index: false, follow: false },
};

type Props = { params: { token: string } };

export default async function MeldenErgaenzenPage({ params }: Props) {
  const ctx = await resolveEinladungKontext(params.token);
  if (!ctx) notFound();

  const org = (ctx.org ?? {}) as Record<string, unknown>;
  const orgName =
    String(org.org_anzeigename ?? "").trim() ||
    String(org.name ?? "").trim() ||
    "Auftraggeber";

  return (
    <MeldeFormular
      mode="ergaenzen"
      einladungToken={params.token}
      orgName={orgName}
      orgLogoUrl={(org.org_logo_url as string | null) ?? null}
      orgLogoKuerzel={(org.org_logo_kuerzel as string | null) ?? null}
      orgSub={(org.org_sub as string | null) ?? null}
      orgPrimaryColor={(org.org_primary_color as string | null) ?? null}
      orgPrimaryColorDk={(org.org_primary_color_dk as string | null) ?? null}
      orgPrimaryColorSoft={
        (org.org_primary_color_soft as string | null) ?? null
      }
      mieterKontaktTelefon={
        (org.mieter_kontakt_telefon as string | null) ?? null
      }
      mieterKontaktEmail={(org.mieter_kontakt_email as string | null) ?? null}
      objektTitel={ctx.objekt?.titel ?? "Objekt"}
      objektAdresse={ctx.objekt?.adresseZeile}
      objektStrasse={ctx.objekt?.strasse}
      objektHausnummer={ctx.objekt?.hausnummer}
      objektPlz={ctx.objekt?.plz}
      objektOrt={ctx.objekt?.ort}
      orgKennung="einladung"
      objektSlug="einladung"
      prefill={{
        name: (ctx.lead.melder_name as string | null) ?? undefined,
        email: (ctx.lead.melder_email as string | null) ?? undefined,
        telefon: (ctx.lead.melder_telefon as string | null) ?? undefined,
        einheit: (ctx.lead.melder_einheit as string | null) ?? undefined,
        beschreibung: (ctx.lead.kontakt_nachricht as string | null) ?? undefined,
      }}
    />
  );
}
