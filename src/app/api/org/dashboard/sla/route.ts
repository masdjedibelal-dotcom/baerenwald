import { NextResponse } from "next/server";

import { loadOrgSlaKpis } from "@/lib/org/load-org-sla-kpis";
import { requireOrganisationSession } from "@/lib/org/require-org-session";

export const runtime = "nodejs";

/** SLA-KPIs für HV-Dashboard (Median, letzte N Tage). */
export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const daysRaw = new URL(req.url).searchParams.get("days");
  const days = Math.min(
    365,
    Math.max(30, Number(daysRaw ?? 90) || 90)
  );

  const kpis = await loadOrgSlaKpis(session.kunde.id, days);
  return NextResponse.json(kpis);
}
