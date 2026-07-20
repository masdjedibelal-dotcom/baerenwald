import { RESOLVE_VORGANG_FIXTURES } from "@/lib/crm-vorgang/fixtures";
// Kanonische Fälle: shared/crm-vorgang/resolve-vorgang.fixtures.json (mit CRM-Repo sync halten)
import { resolveVorgang } from "@/lib/crm-vorgang/resolve-vorgang";
import { resolvePortalKundeVorgangStatus } from "@/lib/crm-vorgang/portal-resolve";
import {
  buildMieterTimelineFromResolver,
  MIETER_TIMELINE_ORDER,
  resolveRoleStatus,
} from "@/lib/crm-vorgang/role-status";

let failed = 0;
for (const fx of RESOLVE_VORGANG_FIXTURES) {
  const r = resolveVorgang(fx.input);
  const ok =
    r.phase === fx.expect.phase &&
    r.unterstatus === fx.expect.unterstatus &&
    r.needsAction === fx.expect.needsAction &&
    r.actor === fx.expect.actor &&
    (fx.expect.ueberfaellig == null || r.ueberfaellig === fx.expect.ueberfaellig) &&
    (fx.expect.notfall == null || r.badges.notfall === fx.expect.notfall) &&
    (fx.expect.wartet_freigabe == null ||
      r.badges.wartet_freigabe === fx.expect.wartet_freigabe);
  if (!ok) {
    failed++;
    console.error(`  ✗ ${fx.id}`);
    continue;
  }
  console.log(`  ✓ ${fx.id}`);
}

const portalAngebot = resolvePortalKundeVorgangStatus({
  lead: { id: "L-K1", status: "angebot", created_at: "2026-06-10T10:00:00Z" },
  angebot: {
    id: "AN-K1",
    status_einfach: "gesendet",
    created_at: "2026-06-10T12:00:00Z",
  },
  legacy: {
    phase: "angebot_liegt_vor",
    label: "Angebot liegt vor",
    pillKey: "angebot",
    sortPriority: 5,
    needsAction: true,
  },
});
if (!portalAngebot.resolverPhaseLabel) {
  failed++;
  console.error("  ✗ portal-resolve-angebot");
} else {
  console.log("  ✓ portal-resolve-angebot");
}

const portalRechnung = resolvePortalKundeVorgangStatus({
  lead: {
    id: "L-R1",
    status: "abgeschlossen",
    created_at: "2026-05-01T10:00:00Z",
  },
  auftrag: {
    id: "AU-R1",
    status: "abgeschlossen",
    created_at: "2026-05-03T10:00:00Z",
    positionen: [],
  },
  rechnungen: [
    {
      id: "RE-R1",
      status: "gesendet",
      faellig_am: "2026-05-01",
      created_at: "2026-05-10T10:00:00Z",
    },
  ],
  legacy: {
    phase: "abgeschlossen",
    label: "Abgeschlossen",
    pillKey: "abgeschlossen",
    sortPriority: 80,
    needsAction: false,
  },
});
if (portalRechnung.label !== "Rechnung") {
  failed++;
  console.error("  ✗ portal-resolve-rechnung", portalRechnung.label);
} else {
  console.log("  ✓ portal-resolve-rechnung");
}

const portalHvFreigabe = resolvePortalKundeVorgangStatus({
  lead: {
    id: "L-F1",
    status: "kontaktiert",
    org_freigabe_status: "ausstehend",
    kanal: "hv_melder_link",
    created_at: "2026-07-09T10:00:00Z",
  },
  angebot: {
    id: "AN-F1",
    status_einfach: "entwurf",
    created_at: "2026-07-09T11:00:00Z",
  },
  role: "hv",
  legacy: {
    phase: "angebot_wird_erstellt",
    label: "Angebot wird erstellt",
    pillKey: "in_arbeit",
    sortPriority: 3,
    needsAction: true,
  },
});
if (
  portalHvFreigabe.label !== "In Bearbeitung" ||
  portalHvFreigabe.resolverActionHint !== "Freigabe ausstehend"
) {
  failed++;
  console.error(
    "  ✗ portal-resolve-hv",
    portalHvFreigabe.label,
    portalHvFreigabe.resolverActionHint
  );
} else {
  console.log("  ✓ portal-resolve-hv");
}

const roleExtra = 3;
const notfallFx = RESOLVE_VORGANG_FIXTURES.find((f) => f.id === "1-notfall-anfrage");
if (notfallFx) {
  const resolved = resolveVorgang(notfallFx.input);
  const mieter = resolveRoleStatus(resolved, "mieter");
  const timeline = buildMieterTimelineFromResolver(resolved);
  if (
    mieter.timelineStep !== "eingegangen" ||
    mieter.listLabel !== "Eingegangen" ||
    timeline.length !== MIETER_TIMELINE_ORDER.length
  ) {
    failed++;
    console.error("  ✗ role-status-mieter", mieter.timelineStep, timeline.length);
  } else {
    console.log("  ✓ role-status-mieter");
  }
} else {
  failed++;
  console.error("  ✗ role-status-mieter (fixture missing)");
}

const freigabeFx = RESOLVE_VORGANG_FIXTURES.find((f) => f.id === "2-freigabe-ausstehend");
if (freigabeFx) {
  const resolved = resolveVorgang(freigabeFx.input);
  const hv = resolveRoleStatus(resolved, "hv");
  if (hv.listLabel !== "In Bearbeitung" || hv.actionHint !== "Freigabe ausstehend") {
    failed++;
    console.error("  ✗ role-status-hv", hv.listLabel, hv.actionHint);
  } else {
    console.log("  ✓ role-status-hv");
  }
} else {
  failed++;
  console.error("  ✗ role-status-hv (fixture missing)");
}

const auftragFx = RESOLVE_VORGANG_FIXTURES.find((f) => f.id === "3-hw-anfrage-offen");
if (auftragFx) {
  const resolved = resolveVorgang(auftragFx.input);
  const mieter = resolveRoleStatus(resolved, "mieter");
  if (mieter.timelineStep !== "beauftragt" || mieter.listLabel !== "Beauftragt") {
    failed++;
    console.error("  ✗ role-status-beauftragt", mieter.timelineStep);
  } else {
    console.log("  ✓ role-status-beauftragt");
  }
} else {
  failed++;
  console.error("  ✗ role-status-beauftragt (fixture missing)");
}

const total = RESOLVE_VORGANG_FIXTURES.length + 3 + roleExtra;
console.log(`\n${total - failed}/${total} grün`);
process.exit(failed > 0 ? 1 : 0);
