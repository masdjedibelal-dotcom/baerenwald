import { resolveVorgang } from "@/lib/crm-vorgang/resolve-vorgang";
import type { ResolveVorgangInput } from "@/lib/crm-vorgang/types";
import {
  PORTAL_FLOW,
  PORTAL_STATUS,
} from "@/lib/portal2/status";
import {
  PORTAL_FLOW_MAPPING,
  portalFlowTimeline,
  resolvePortalFlowStatus,
} from "@/lib/portal2/status-mapping";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

assert("FLOW length 8", PORTAL_FLOW.length === 8);
assert(
  "STATUS labels",
  PORTAL_STATUS.gemeldet.label === "Neu gemeldet" &&
    PORTAL_STATUS.angefragt.label === "Handwerker angefragt" &&
    PORTAL_STATUS.abschluss.label === "Abschluss / Signatur" &&
    PORTAL_STATUS.bezahlt.label === "Abgeschlossen"
);
assert(
  "STATUS colors",
  PORTAL_STATUS.gemeldet.color === "#1F4FA8" &&
    PORTAL_STATUS.gemeldet.bg === "#E4ECF7" &&
    PORTAL_STATUS.angefragt.color === "#8A5A06" &&
    PORTAL_STATUS.auftrag.color === "#1F6A3F" &&
    PORTAL_STATUS.bezahlt.color === "#4B5563"
);

assert(
  "mapping covers all FLOW ids",
  PORTAL_FLOW.every((id) => Boolean(PORTAL_FLOW_MAPPING[id]))
);

function leadBase(over: Partial<ResolveVorgangInput["lead"]> = {}): ResolveVorgangInput {
  return {
    lead: {
      id: "l1",
      status: "neu",
      created_at: "2026-07-01T10:00:00Z",
      org_freigabe_status: "ausstehend",
      hv_meldung_status: "neu",
      ...over,
    },
  };
}

{
  const r = resolveVorgang(leadBase());
  const flow = resolvePortalFlowStatus({
    resolved: r,
    extra: { org_freigabe_status: "ausstehend", hv_meldung_status: "neu" },
  });
  assert("gemeldet", flow === "gemeldet");
}

{
  const r = resolveVorgang(
    leadBase({ org_freigabe_status: "freigegeben", hv_meldung_status: "angebot_eingefordert" })
  );
  const flow = resolvePortalFlowStatus({
    resolved: r,
    extra: {
      org_freigabe_status: "freigegeben",
      hv_meldung_status: "angebot_eingefordert",
    },
  });
  assert("freigegeben", flow === "freigegeben");
}

{
  const r = resolveVorgang({
    ...leadBase({ org_freigabe_status: "freigegeben" }),
    angebote: [
      {
        id: "a1",
        status: "entwurf",
        status_einfach: "entwurf",
        created_at: "2026-07-02T10:00:00Z",
      },
    ],
  });
  const flow = resolvePortalFlowStatus({
    resolved: r,
    extra: { org_freigabe_status: "freigegeben", hwAngefragt: true },
  });
  assert("angefragt", flow === "angefragt");
}

{
  const r = resolveVorgang({
    ...leadBase(),
    angebote: [
      {
        id: "a1",
        status: "gesendet",
        status_einfach: "gesendet",
        created_at: "2026-07-02T10:00:00Z",
        gesendet_am: "2026-07-02T10:00:00Z",
      },
    ],
  });
  const flow = resolvePortalFlowStatus({
    resolved: r,
    extra: { angebotVorgelegt: true },
  });
  assert("angebot", flow === "angebot");
}

{
  const r = resolveVorgang({
    ...leadBase(),
    auftraege: [
      {
        id: "u1",
        status: "in_arbeit",
        created_at: "2026-07-03T10:00:00Z",
      },
    ],
  });
  const flow = resolvePortalFlowStatus({ resolved: r });
  assert("auftrag", flow === "auftrag");
}

{
  const r = resolveVorgang({
    ...leadBase(),
    auftraege: [
      {
        id: "u1",
        status: "abnahme",
        created_at: "2026-07-03T10:00:00Z",
      },
    ],
  });
  const flow = resolvePortalFlowStatus({
    resolved: r,
    extra: { abnahmeOffen: true },
  });
  assert("abschluss", flow === "abschluss");
}

{
  const r = resolveVorgang({
    ...leadBase(),
    rechnungen: [
      {
        id: "r1",
        status: "gesendet",
        created_at: "2026-07-04T10:00:00Z",
      },
    ],
  });
  const flow = resolvePortalFlowStatus({ resolved: r });
  assert("rechnung", flow === "rechnung");
}

{
  const r = resolveVorgang({
    ...leadBase(),
    rechnungen: [
      {
        id: "r1",
        status: "bezahlt",
        created_at: "2026-07-05T10:00:00Z",
      },
    ],
  });
  const flow = resolvePortalFlowStatus({ resolved: r });
  assert("bezahlt", flow === "bezahlt");
}

{
  const tl = portalFlowTimeline("auftrag");
  assert(
    "timeline done/active",
    tl.filter((s) => s.done).length === 4 &&
      tl.find((s) => s.active)?.id === "auftrag"
  );
}

if (failed) {
  console.error(`\n${failed} portal2 status test(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2 status/mapping tests passed.");
