"use client";

import { BwRechnerPageClient } from "@/components/funnel/BwRechnerPageClient";
import { TeoAnfrage } from "@/components/teo/TeoAnfrage";
import { istTeo } from "@/lib/marke";

/** Bärenwald: Preisrechner. Servus TEO: Anfrage für Verwaltungen und Bestandshalter, ohne Preisrahmen. */
export default function RechnerPage() {
  return istTeo ? <TeoAnfrage /> : <BwRechnerPageClient resetPath="/rechner" />;
}
