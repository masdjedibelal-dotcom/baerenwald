"use client";

import { BwRechnerPageClient } from "@/components/funnel/BwRechnerPageClient";
import { TeoKontakt } from "@/components/teo/TeoKontakt";
import { istTeo } from "@/lib/marke";

/** Bärenwald: Preisrechner. Servus TEO: Kontaktformular für Verwaltungen und Bestandshalter. */
export default function RechnerPage() {
  return istTeo ? <TeoKontakt /> : <BwRechnerPageClient resetPath="/rechner" />;
}
