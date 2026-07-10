"use client";

import { useState } from "react";

import { OrganisationManuellerVorgangForm } from "@/components/org/OrganisationManuellerVorgangForm";
import { OrganisationMeldungErfassenForm } from "@/components/org/OrganisationMeldungErfassenForm";
import { OrganisationProjektFunnel } from "@/components/org/OrganisationProjektFunnel";
import { OrganisationServicepaketFlow } from "@/components/org/OrganisationServicepaketFlow";
import type { OrganisationObjekt } from "@/lib/org/types";
import { track } from "@/lib/analytics";

type HubMode = "hub" | "meldung_direkt" | "meldung_einladen" | "projekt" | "servicepaket" | "vorgang_manuell";

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

  if (mode === "meldung_direkt") {
    return (
      <OrganisationMeldungErfassenForm
        objekte={objekte}
        mode="direkt"
        onDone={() => {
          onDone();
          onClose();
        }}
      />
    );
  }

  if (mode === "meldung_einladen") {
    return (
      <OrganisationMeldungErfassenForm
        objekte={objekte}
        mode="einladen"
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

  if (mode === "vorgang_manuell") {
    return (
      <OrganisationManuellerVorgangForm
        objekte={objekte}
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
            setMode("meldung_direkt");
          }}
        >
          <span className="font-medium block">Meldung anlegen</span>
          <span className="text-xs text-text-tertiary mt-1">
            Direkterfassung (Telefon, E-Mail)
          </span>
        </button>
        <button
          type="button"
          className="org-hub-card"
          onClick={() => {
            track.orgAnfrageGestartet("meldung");
            setMode("meldung_einladen");
          }}
        >
          <span className="font-medium block">Mieter einladen</span>
          <span className="text-xs text-text-tertiary mt-1">
            Link mit Fotos und Details
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
            track.orgAnfrageGestartet("meldung");
            setMode("vorgang_manuell");
          }}
        >
          <span className="font-medium block">Manueller Vorgang</span>
          <span className="text-xs text-text-tertiary mt-1">
            Ohne Mieter — Telefon, E-Mail, intern
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
