import { notifyHvMieterEvent } from "@/lib/org/notify-hv-mieter-event";
import { MIETER_EMAIL_ENABLED } from "@/lib/melde/mieter-mail-policy";

/** Neuer Bautagebuch-Eintrag — HV statt Mieter (Standard). */
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
}
