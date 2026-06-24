"use client";

import { useState } from "react";

import { OrganisationMeldungErfassenForm } from "@/components/org/OrganisationMeldungErfassenForm";
import { OrganisationProjektFunnel } from "@/components/org/OrganisationProjektFunnel";
import { OrganisationServicepaketFlow } from "@/components/org/OrganisationServicepaketFlow";
import type { OrganisationObjekt } from "@/lib/org/types";
import { track } from "@/lib/analytics";

type HubMode = "hub" | "meldung" | "projekt" | "servicepaket";

type Props = {
  objekte: OrganisationObjekt[];
  kundeEmail?: string | null;
  kundeName?: string | null;
  onClose: () => void;
  onDone: () => void;
};

export function OrganisationAnfrageHub({
  objekte,
  kundeEmail,
  kundeName,
  onClose,
  onDone,
}: Props) {
  const [mode, setMode] = useState<HubMode>("hub");

  if (objekte.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-text-secondary">
        Bitte zuerst ein Objekt anlegen.
        <button type="button" className="btn-pill-outline block mt-3" onClick={onClose}>
          Schließen
        </button>
      </div>
    );
  }

  if (mode === "meldung") {
    return (
      <OrganisationMeldungErfassenForm
        objekte={objekte}
        onDone={() => {
          onDone();
          onClose();
        }}
      />
    );
  }

  if (mode === "projekt") {
    return (
      <OrganisationProjektFunnel
        objekte={objekte}
        kundeEmail={kundeEmail}
        kundeName={kundeName}
        onDone={() => {
          onDone();
          onClose();
        }}
      />
    );
  }

  if (mode === "servicepaket") {
    return (
      <OrganisationServicepaketFlow
        objekte={objekte}
        kundeEmail={kundeEmail}
        kundeName={kundeName}
        onDone={() => {
          onDone();
          onClose();
        }}
      />
    );
  }

  return (
    <div>
      <div className="org-hub-grid">
        <button
          type="button"
          className="org-hub-card"
          onClick={() => {
            track.orgAnfrageGestartet("meldung");
            setMode("meldung");
          }}
        >
          <span className="font-medium block">Meldung erfassen</span>
          <span className="text-xs text-text-tertiary mt-1">
            Für Mieter per Einladungslink
          </span>
        </button>
        <button
          type="button"
          className="org-hub-card"
          onClick={() => {
            track.orgAnfrageGestartet("projekt");
            setMode("projekt");
          }}
        >
          <span className="font-medium block">Projekt / Sanierung</span>
          <span className="text-xs text-text-tertiary mt-1">
            Mit Preisrahmen für Ihr Objekt
          </span>
        </button>
        <button
          type="button"
          className="org-hub-card"
          onClick={() => {
            track.orgAnfrageGestartet("servicepaket");
            setMode("servicepaket");
          }}
        >
          <span className="font-medium block">Servicepaket</span>
          <span className="text-xs text-text-tertiary mt-1">
            Hausmeister, Reinigung, Garten — €/Monat
          </span>
        </button>
      </div>
      <button type="button" className="btn-pill-outline mt-4" onClick={onClose}>
        Schließen
      </button>
    </div>
  );
}
