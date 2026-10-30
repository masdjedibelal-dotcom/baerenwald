import { DoorOpen, Droplets, Ellipsis, Flame, House, type LucideIcon, Waves, Zap } from "lucide-react";

import { MELDE_BEREICHE, type MeldeBereichId } from "@/lib/org/melde-bereiche";

/** Servus TEO: Icons zu den Schadenbereichen — gleich in Mieter-Meldung, Website-Anfrage und Arbeitsplatz. */
export const MELDE_BEREICH_ICON: Record<MeldeBereichId, LucideIcon> = {
  wasser: Droplets,
  heizung: Flame,
  strom: Zap,
  fenster_tuer: DoorOpen,
  dach: House,
  schimmel: Waves,
  sonstiges: Ellipsis,
  baum_notfall: Ellipsis,
};

/** Icon zum Funnel-Wert (`bereich`, z. B. „sanitaer“) einer Melde-Kachel. */
export function meldeBereichIconFuerWert(wert: string): LucideIcon {
  const id = MELDE_BEREICHE.find((o) => o.bereich === wert)?.id;
  return id ? MELDE_BEREICH_ICON[id] : Ellipsis;
}
