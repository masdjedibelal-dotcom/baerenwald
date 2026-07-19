"use client";

import { useState } from "react";

import { OrganisationManuellerVorgangForm } from "@/components/org/OrganisationManuellerVorgangForm";
import { OrganisationMeldungErfassenForm } from "@/components/org/OrganisationMeldungErfassenForm";
import { OrganisationProjektFunnel } from "@/components/org/OrganisationProjektFunnel";
import { OrganisationServicepaketFlow } from "@/components/org/OrganisationServicepaketFlow";
import { PortalModalEinladen } from "@/components/shared/PortalModalEinladen";
import { PortalModalNeueAnfrage } from "@/components/shared/PortalModalNeueAnfrage";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { track } from "@/lib/analytics";
import type { PortalNeueAnfrageActionId } from "@/lib/portal2/modal-neue-anfrage";
import type { OrganisationObjekt } from "@/lib/org/types";

type HubMode =
  | "hub"
  | "meldung_direkt"
  | "einladen"
  | "projekt"
  | "servicepaket"
  | "vorgang_manuell";

type Props = {
  open?: boolean;
  objekte: OrganisationObjekt[];
  orgKennung?: string | null;
  orgAnzeigename?: string | null;
  kundeEmail?: string | null;
  kundeName?: string | null;
  onClose: () => void;
  onDone: () => void;
};

const FLOW_TITLES: Record<Exclude<HubMode, "hub" | "einladen">, string> = {
  meldung_direkt: "Meldung anlegen",
  projekt: "Projekt / Sanierung",
  vorgang_manuell: "Manueller Vorgang",
  servicepaket: "Servicepaket bestellen",
};

/**
 * Org-Create-Hub — B8 `modalNeueAnfrage` + B9 `modalEinladen` + reale Flows.
 */
export function OrganisationAnfrageHub({
  open = true,
  objekte,
  orgKennung,
  orgAnzeigename,
  kundeEmail,
  kundeName,
  onClose,
  onDone,
}: Props) {
  const [mode, setMode] = useState<HubMode>("hub");

  function backToHub() {
    setMode("hub");
  }

  function handleClose() {
    setMode("hub");
    onClose();
  }

  function handleSelect(id: PortalNeueAnfrageActionId) {
    if (id === "einladen") {
      track.orgAnfrageGestartet("meldung");
      setMode("einladen");
      return;
    }
    if (objekte.length === 0) return;
    switch (id) {
      case "meldung":
        track.orgAnfrageGestartet("meldung");
        setMode("meldung_direkt");
        break;
      case "projekt":
        track.orgAnfrageGestartet("projekt");
        setMode("projekt");
        break;
      case "manuell":
        track.orgAnfrageGestartet("meldung");
        setMode("vorgang_manuell");
        break;
      case "servicepaket":
        track.orgAnfrageGestartet("servicepaket");
        setMode("servicepaket");
        break;
    }
  }

  function finish() {
    setMode("hub");
    onDone();
  }

  if (mode === "hub") {
    return (
      <PortalModalNeueAnfrage
        open={open}
        onClose={handleClose}
        onSelect={handleSelect}
        notice={
          objekte.length === 0
            ? "Bitte zuerst ein Objekt anlegen — danach können Sie Vorgänge starten."
            : null
        }
        enabledIds={objekte.length === 0 ? [] : undefined}
      />
    );
  }

  if (mode === "einladen") {
    return (
      <PortalModalEinladen
        open={open}
        onClose={handleClose}
        orgKennung={orgKennung?.trim() || ""}
        orgAnzeigename={orgAnzeigename}
        objekte={objekte}
      />
    );
  }

  return (
    <PortalModalShell
      open={open}
      title={FLOW_TITLES[mode]}
      onClose={handleClose}
      maxWidth={520}
    >
      <button
        type="button"
        className="portal-neue-anfrage-back"
        onClick={backToHub}
      >
        ‹ Zurück zur Auswahl
      </button>

      {mode === "meldung_direkt" ? (
        <OrganisationMeldungErfassenForm
          objekte={objekte}
          mode="direkt"
          onDone={finish}
        />
      ) : null}

      {mode === "projekt" ? (
        <OrganisationProjektFunnel
          objekte={objekte}
          kundeEmail={kundeEmail}
          kundeName={kundeName}
          onDone={finish}
        />
      ) : null}

      {mode === "vorgang_manuell" ? (
        <OrganisationManuellerVorgangForm
          objekte={objekte}
          onDone={finish}
        />
      ) : null}

      {mode === "servicepaket" ? (
        <OrganisationServicepaketFlow
          objekte={objekte}
          kundeEmail={kundeEmail}
          kundeName={kundeName}
          onDone={finish}
        />
      ) : null}
    </PortalModalShell>
  );
}
