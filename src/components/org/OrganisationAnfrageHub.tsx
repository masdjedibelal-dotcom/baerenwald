"use client";

import { useEffect, useState } from "react";

import { PortalFunnelHost } from "@/components/funnel/PortalFunnelHost";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { track } from "@/lib/analytics";
import type { OrganisationObjekt } from "@/lib/org/types";

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

/**
 * HV Create — ein Funnel (PortalFunnelHost, channel portal_hv).
 */
export function OrganisationAnfrageHub({
  open = true,
  objekte: objekteProp,
  kundeEmail,
  kundeName,
  onClose,
  onDone,
}: Props) {
  const [objekte, setObjekte] = useState(objekteProp);

  useEffect(() => {
    setObjekte(objekteProp);
  }, [objekteProp]);

  useEffect(() => {
    if (open) track.orgAnfrageGestartet("projekt");
  }, [open]);

  if (!open) return null;

  return (
    <PortalModalShell
      open={open}
      title="Neuer Vorgang"
      onClose={onClose}
      size="funnel"
      maxWidth={560}
    >
      {objekte.length === 0 ? (
        <p className="mb-3 text-sm text-text-secondary">
          Noch kein Objekt — Sie können im Funnel ein neues anlegen.
        </p>
      ) : null}
      <PortalFunnelHost
        channel="portal_hv"
        layout="modal"
        objekte={objekte.map((o) => ({
          id: o.id,
          titel: o.titel,
          strasse: o.strasse,
          hausnummer: o.hausnummer,
          plz: o.plz,
          ort: o.ort,
          melde_slug: o.melde_slug,
        }))}
        prefill={{
          name: kundeName ?? undefined,
          email: kundeEmail ?? undefined,
        }}
        onClose={onClose}
        onDone={() => {
          onDone();
        }}
        onObjekteChanged={(next) => {
          setObjekte((prev) => {
            const byId = new Map(prev.map((o) => [o.id, o]));
            return next.map((n) => {
              const old = byId.get(n.id);
              if (old) {
                return {
                  ...old,
                  titel: n.titel,
                  strasse: n.strasse ?? old.strasse,
                  hausnummer: n.hausnummer ?? old.hausnummer,
                  plz: n.plz ?? old.plz,
                  ort: n.ort ?? old.ort,
                  melde_slug: n.melde_slug ?? old.melde_slug,
                };
              }
              return {
                id: n.id,
                kunde_id: "",
                titel: n.titel,
                strasse: n.strasse ?? null,
                hausnummer: n.hausnummer ?? null,
                plz: n.plz ?? null,
                ort: n.ort ?? null,
                melde_slug: n.melde_slug ?? null,
                melde_aktiv: true,
                einheiten_hinweis: null,
                notizen_intern: null,
              } as OrganisationObjekt;
            });
          });
        }}
      />
    </PortalModalShell>
  );
}
