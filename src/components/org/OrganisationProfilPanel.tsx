"use client";

import Image from "next/image";

import { OrganisationExportPanel, OrganisationTeamPanel } from "@/components/org/OrganisationTeamPanel";
import { OrganisationEinstellungenPanel } from "@/components/org/OrganisationEinstellungenPanel";
import { OrganisationMeldeMaterial } from "@/components/org/OrganisationMeldeMaterial";
import type { OrganisationKunde } from "@/lib/org/types";

type Props = {
  kunde: OrganisationKunde;
  objektCount: number;
  onSaved: () => void;
  isAdmin?: boolean;
};

export function OrganisationProfilPanel({ kunde, objektCount, onSaved, isAdmin = true }: Props) {
  const displayName =
    kunde.org_anzeigename?.trim() || kunde.name?.trim() || "Hausverwaltung";

  return (
    <div className="space-y-6">
      <section className="card-bordered space-y-3 p-4 sm:p-5">
        <h2 className="font-semibold text-text-primary">Organisation</h2>
        <div className="flex items-center gap-3">
          {kunde.org_logo_url ? (
            <Image
              src={kunde.org_logo_url}
              alt=""
              width={40}
              height={40}
              className="rounded-lg"
              unoptimized
            />
          ) : null}
          <div>
            <p className="portal-text-body font-medium">{displayName}</p>
            {kunde.email ? (
              <p className="portal-text-meta text-text-secondary">{kunde.email}</p>
            ) : null}
          </div>
        </div>
        {kunde.org_kennung ? (
          <p className="portal-text-meta text-text-tertiary">
            Kennung: <span className="font-mono">{kunde.org_kennung}</span>
          </p>
        ) : null}
        <p className="portal-text-meta text-text-tertiary">
          Stammdaten und Logo werden von Bärenwald gepflegt.
        </p>
      </section>

      <OrganisationMeldeMaterial kunde={kunde} objektCount={objektCount} />

      <OrganisationTeamPanel kunde={kunde} isAdmin={isAdmin} />

      <OrganisationExportPanel />

      <section className="card-bordered p-4 sm:p-5">
        <h2 className="mb-4 font-semibold text-text-primary">Freigabe & Regeln</h2>
        <OrganisationEinstellungenPanel kunde={kunde} onSaved={onSaved} embedded readOnly={!isAdmin} />
      </section>
    </div>
  );
}
