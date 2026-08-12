import { notifyHvMieterEvent } from "@/lib/org/notify-hv-mieter-event";
import {
  MELDE_NOTIF_COPY,
  formatMeldeNotifTitel,
} from "@/lib/org/melde-vorgang-titel";
import { MIETER_EMAIL_ENABLED } from "@/lib/melde/mieter-mail-policy";
import { notifyPortalLeadUser } from "@/lib/portal/notify-portal-lead-user";

/** Neuer Bautagebuch-Eintrag — HV + Portal-Glocke für verknüpften Kunden. */
export async function notifyMieterBautagebuchEintrag(input: {
  leadId: string;
  handwerkerName: string;
  eintragTitel: string;
  auftragTitel: string;
}): Promise<void> {
  if (MIETER_EMAIL_ENABLED) return;

  await notifyHvMieterEvent({
    leadId: input.leadId,
    typ: "bautagebuch",
    titel: `Fortschritt: ${input.eintragTitel}`,
    body: `${input.handwerkerName} hat einen Bautagebuch-Eintrag zu „${input.auftragTitel}“ veröffentlicht. Der Mieter erhält keine E-Mail — Status-Link bei Bedarf selbst weitergeben.`,
  });

  const titel = formatMeldeNotifTitel(MELDE_NOTIF_COPY.bautagebuch, {
    titel: input.eintragTitel,
  });
  const text = `${input.handwerkerName} hat ein Update zu „${input.auftragTitel}“ veröffentlicht.`;
  await notifyPortalLeadUser({
    leadId: input.leadId,
    typ: "info",
    titel,
    text,
    deepLinkTab: "bautagebuch",
  });

  const { notifyPortalEigentuemer } = await import(
    "@/lib/portal/notify-portal-eigentuemer"
  );
  await notifyPortalEigentuemer({
    leadId: input.leadId,
    kind: "update",
    titel,
    text,
    deepLinkTab: "uebersicht",
  });
}
