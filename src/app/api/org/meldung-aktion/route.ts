import { NextResponse } from "next/server";

import { requireOrgWrite } from "@/lib/org/assert-org-objekt";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { meldungAblehnen, meldungAnTeo } from "@/teo/hv/vorgang-aktionen";

export const runtime = "nodejs";

type Aktion = "angebot_einfordern" | "direkt_baerenwald" | "ablehnen";

type Body = {
  leadId: string;
  aktion: Aktion;
};

/**
 * HV-Aktion auf Meldung (altes Portal; Logik in teo/hv/vorgang-aktionen):
 * - direkt_baerenwald / angebot_einfordern (neu → angebot_eingefordert)
 * - ablehnen (nur aus neu)
 */
export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  const write = requireOrgWrite(session);
  if (!write.ok) {
    return NextResponse.json({ error: write.error }, { status: write.status });
  }

  const body = (await req.json()) as Body;
  const leadId = String(body.leadId ?? "").trim();
  const aktion = body.aktion;
  if (!leadId || !["angebot_einfordern", "direkt_baerenwald", "ablehnen"].includes(aktion)) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const r =
    aktion === "ablehnen"
      ? await meldungAblehnen(session.kunde.id, leadId)
      : await meldungAnTeo(session.kunde.id, leadId, { wirKuemmernMail: aktion === "direkt_baerenwald" });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true, status: r.status });
}
