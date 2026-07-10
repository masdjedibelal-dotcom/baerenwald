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

  const orgName =
    (ctx.org?.org_anzeigename as string | null)?.trim() ||
    (ctx.org?.name as string | null)?.trim() ||
    "Auftraggeber";

  return (
    <MeldeFormular
      mode="ergaenzen"
      einladungToken={params.token}
      orgName={orgName}
      orgLogoUrl={(ctx.org?.org_logo_url as string | null) ?? null}
      objektTitel={ctx.objekt?.titel ?? "Objekt"}
      objektAdresse={ctx.objekt?.adresseZeile}
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
