"use client";

import { useMemo, useState } from "react";

import { PartnerAbnahmeprotokollForm } from "@/components/partner/PartnerAbnahmeprotokollForm";
import {
  PartnerDetailSection,
  PartnerDetailSuccessBox,
} from "@/components/partner/PartnerDetailUi";
import {
  allePartnerPositionenErledigt,
  partnerKannErledigtMelden,
} from "@/lib/partner/partner-position-erledigt";
import {
  positionHandwerkerAbgeschlossen,
  positionHandwerkerErledigt,
} from "@/lib/partner/partner-konditionen";
import type { PartnerAuftragPosition } from "@/lib/partner/get-partner-data";
import type { VorgangState } from "@/lib/partner/vorgang-state";

export function PartnerAuftragErledigtSection({
  auftragId,
  auftragStatus,
  positionen,
  vorgangState,
  defaultOrt,
}: {
  auftragId: string;
  auftragStatus: string;
  positionen: PartnerAuftragPosition[];
  vorgangState?: VorgangState;
  defaultOrt?: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [done, setDone] = useState(false);
  const [vollstaendig, setVollstaendig] = useState(false);

  const kannMelden = partnerKannErledigtMelden({
    positionen,
    vorgangState,
    auftragStatus,
  });
  const alleErledigt = allePartnerPositionenErledigt(positionen);

  const offeneLeistungen = useMemo(
    () =>
      positionen
        .filter(
          (p) =>
            positionHandwerkerAbgeschlossen(p.handwerker_status) &&
            !positionHandwerkerErledigt(p.handwerker_status)
        )
        .map((p) => String(p.leistung_name ?? "Leistung").trim())
        .filter(Boolean),
    [positionen]
  );

  if (!kannMelden && !alleErledigt && !done) return null;

  if (alleErledigt || done) {
    return (
      <PartnerDetailSection title="Abschluss">
        <PartnerDetailSuccessBox>
          <p className="font-semibold">Leistungen als erledigt gemeldet</p>
          <p className="portal-text-meta mt-1 text-text-secondary">
            {vollstaendig
              ? "Abnahmeprotokoll erstellt. Bärenwald und die Hausverwaltung werden informiert."
              : "Ihr Abnahmeprotokoll wurde gespeichert. Weitere Handwerker am Auftrag sind ggf. noch offen."}
          </p>
        </PartnerDetailSuccessBox>
      </PartnerDetailSection>
    );
  }

  if (showForm) {
    return (
      <PartnerAbnahmeprotokollForm
        auftragId={auftragId}
        leistungen={offeneLeistungen}
        defaultOrt={defaultOrt}
        onSuccess={(v) => {
          setVollstaendig(v);
          setDone(true);
          setShowForm(false);
        }}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  return (
    <PartnerDetailSection title="Abschluss">
      <p className="portal-text-body text-text-secondary mb-4">
        Wenn alle Arbeiten erledigt sind: Abschluss-Checkliste, Fotos/Bericht und
        Canvas-Signatur mit dem Kunden vor Ort.
      </p>
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="btn-pill-primary portal-btn w-full sm:w-auto"
      >
        Abschlussdokumentation &amp; Signatur
      </button>
    </PartnerDetailSection>
  );
}
