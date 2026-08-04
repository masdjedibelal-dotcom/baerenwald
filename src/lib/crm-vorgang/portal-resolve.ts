import { auftragBrauchtHandwerkerAktion } from "@/lib/crm-vorgang/handwerker-aktion-offen";
import { resolveVorgang } from "@/lib/crm-vorgang/resolve-vorgang";
import { resolveVorgangDisplay } from "@/lib/crm-vorgang/resolve-vorgang-display";
import type { PortalRole, ResolveVorgangInput } from "@/lib/crm-vorgang/types";
import type { KundeVorgangStatus } from "@/lib/portal/kunde-vorgang-status";

type PortalLeadSlice = {
  id: string;
  status?: string | null;
  situation?: string | null;
  funnel_daten?: unknown;
  kanal?: string | null;
  org_freigabe_status?: string | null;
  hv_meldung_status?: string | null;
  kontakt_name?: string | null;
  plz?: string | null;
  bereiche?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type PortalAngebotSlice = {
  id: string;
  status?: string | null;
  status_einfach?: string | null;
  gesendet_am?: string | null;
  gesendet_kunde_at?: string | null;
  created_at?: string | null;
};

type PortalAuftragSlice = {
  id: string;
  status?: string | null;
  created_at?: string | null;
  positionen?: Array<{
    handwerker_id?: string | null;
    handwerker_status?: string | null;
  }> | null;
};

const PILL_FROM_DISPLAY: Record<string, string> = {
  neu: "neu",
  warten: "in_arbeit",
  aktiv: "in_arbeit",
  fertig: "abgeschlossen",
  storniert: "abgelehnt",
};

type PortalRechnungSlice = {
  id: string;
  status?: string | null;
  faellig?: string | null;
  faellig_am?: string | null;
  rechnungsdatum?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  gesendet_at?: string | null;
};

/** DB-Zeile → CRM-Resolver-Input. */
export function mapPortalRechnungForResolver(
  row: PortalRechnungSlice
): {
  id: string;
  status: string;
  faellig: string | null;
  created_at: string;
  updated_at?: string | null;
} {
  const created =
    row.created_at?.trim() ||
    row.gesendet_at?.trim() ||
    new Date().toISOString();
  const faellig =
    row.faellig?.trim() ||
    row.faellig_am?.trim() ||
    row.rechnungsdatum?.trim() ||
    null;
  return {
    id: String(row.id),
    status: String(row.status ?? "entwurf"),
    faellig,
    created_at: created,
    updated_at: row.updated_at,
  };
}

export function buildPortalResolveInput(input: {
  lead: PortalLeadSlice;
  angebot?: PortalAngebotSlice | null;
  auftrag?: PortalAuftragSlice | null;
  rechnungen?: PortalRechnungSlice[] | null;
}): ResolveVorgangInput {
  const lead = input.lead;
  const created = lead.created_at?.trim() || new Date().toISOString();
  return {
    lead: {
      id: lead.id,
      status: lead.status ?? "neu",
      situation: lead.situation,
      funnel_daten: lead.funnel_daten,
      kanal: lead.kanal,
      org_freigabe_status: lead.org_freigabe_status,
      hv_meldung_status: lead.hv_meldung_status,
      kontakt_name: lead.kontakt_name,
      plz: lead.plz,
      bereiche: lead.bereiche,
      created_at: created,
      updated_at: lead.updated_at,
    },
    angebote: input.angebot
      ? [
          {
            id: input.angebot.id,
            status: input.angebot.status,
            status_einfach: input.angebot.status_einfach,
            gesendet_am: input.angebot.gesendet_am,
            gesendet_kunde_at: input.angebot.gesendet_kunde_at,
            created_at: input.angebot.created_at ?? created,
          },
        ]
      : [],
    auftraege: input.auftrag
      ? [
          {
            id: input.auftrag.id,
            status: input.auftrag.status ?? "offen",
            created_at: input.auftrag.created_at ?? created,
            handwerkerAktionOffen: auftragBrauchtHandwerkerAktion(
              input.auftrag.positionen ?? []
            ),
          },
        ]
      : [],
    rechnungen: (input.rechnungen ?? []).map(mapPortalRechnungForResolver),
  };
}

/** Rolle für buildKundeVorgaenge / resolvePortalKundeVorgangStatus. */
export function resolvePortalBuildRole(opts: {
  mieterStatusMode?: boolean;
  hvPortalMode?: boolean;
}): PortalRole {
  if (opts.mieterStatusMode) return "mieter";
  if (opts.hvPortalMode) return "hv";
  return "kunde";
}

/** CRM-Resolver → Portal-Status (Wave 1 read-only). */
export function resolvePortalKundeVorgangStatus(input: {
  lead: PortalLeadSlice;
  angebot?: PortalAngebotSlice | null;
  auftrag?: PortalAuftragSlice | null;
  rechnungen?: PortalRechnungSlice[] | null;
  role?: PortalRole;
  /** HV-Mieter: vereinfachte Labels bleiben über Legacy-Resolver. */
  useLegacyHvMieter?: boolean;
  legacy: KundeVorgangStatus;
}): KundeVorgangStatus & {
  resolverPhaseLabel?: string;
  resolverUnterstatusLabel?: string;
  resolverActionHint?: string | null;
} {
  if (input.useLegacyHvMieter) {
    return input.legacy;
  }

  const resolved = resolveVorgang(buildPortalResolveInput(input));
  const display = resolveVorgangDisplay(resolved, input.role ?? "kunde");
  const pillKey = PILL_FROM_DISPLAY[display.pillKind] ?? input.legacy.pillKey;

  return {
    ...input.legacy,
    label: display.phaseLabel,
    pillKey,
    needsAction: resolved.needsAction || input.legacy.needsAction,
    resolverPhaseLabel: display.phaseLabel,
    resolverUnterstatusLabel: display.unterstatusLabel,
    resolverActionHint: display.actionHint,
  };
}
