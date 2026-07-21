"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus } from "lucide-react";

import {
  EinstellungenCard,
  EinstellungenEdField,
} from "@/components/shared/PortalEinstellungenUi";
import {
  PortalListTable,
  PortalListTableCell,
  PortalListTableRow,
} from "@/components/shared/PortalListTable";
import { PORTAL_C } from "@/lib/portal2/tokens";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

type Bewohner = {
  id: string;
  objekt_einheit_id: string;
  name: string;
  telefon?: string | null;
  email?: string | null;
  objekt_einheiten?: {
    bezeichnung?: string | null;
    etage?: string | null;
  } | null;
};

const BEWOHNER_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "wohnung", label: "Wohnung" },
  { key: "etage", label: "Etage" },
  { key: "aktion", label: "" },
];

const BEWOHNER_INTRO =
  "Der Vorteil: Hier sammeln Sie Mieter intern. Bei Schadensmeldungen können Sie Vorgänge direkt mit einem Mieter verknüpfen. Sichtbar nur für die Hausverwaltung im Portal — nicht im öffentlichen Meldeformular.";

export function OrganisationObjektEinheitenBewohnerPanel({
  objektId,
  detailLayout = false,
}: {
  objektId: string;
  /** E2 Detail-Tab: Listenfläche ohne Extra-Chrome. */
  detailLayout?: boolean;
  /** @deprecated Einheiten-Count — nicht mehr benötigt */
  titleCount?: number;
}) {
  const [bewohner, setBewohner] = useState<Bewohner[]>([]);
  const [name, setName] = useState("");
  const [wohnung, setWohnung] = useState("");
  const [etage, setEtage] = useState("");
  const [telefon, setTelefon] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadBewohner = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/org/einheit-bewohner?objektId=${objektId}`);
      const json = (await res.json()) as { bewohner?: Bewohner[] };
      setBewohner(json.bewohner ?? []);
    } finally {
      setLoading(false);
    }
  }, [objektId]);

  useEffect(() => {
    void loadBewohner();
  }, [loadBewohner]);

  async function addBewohner(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !wohnung.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/org/einheit-bewohner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objektId,
          name: name.trim(),
          wohnung: wohnung.trim(),
          etage: etage.trim() || undefined,
          telefon: telefon.trim() || undefined,
          email: email.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Fehler");
      setName("");
      setWohnung("");
      setEtage("");
      setTelefon("");
      setEmail("");
      orgPortalToast.objektAktualisiert();
      await loadBewohner();
    } catch (err) {
      portalToastError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function removeBewohner(id: string) {
    if (!window.confirm("Bewohner wirklich entfernen?")) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/org/einheit-bewohner?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Fehler");
      orgPortalToast.objektAktualisiert();
      await loadBewohner();
    } catch (err) {
      portalToastError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(
        "space-y-3",
        detailLayout && "rounded-xl border border-border-default bg-white p-4"
      )}
    >
      <div>
        <p className="text-sm font-semibold text-text-primary">Bewohner</p>
        <p
          className="mt-1.5 text-[13px] leading-[1.55]"
          style={{ color: PORTAL_C.sub }}
        >
          {BEWOHNER_INTRO}
        </p>
      </div>

      <PortalListTable
        columns={BEWOHNER_COLUMNS}
        empty={
          !loading && bewohner.length === 0 ? (
            <p
              className="px-3.5 py-4 text-[13px]"
              style={{ color: PORTAL_C.sub }}
            >
              Noch keine Bewohner erfasst.
            </p>
          ) : null
        }
      >
        {loading ? (
          <p
            className="px-3.5 py-4 text-[13px]"
            style={{ color: PORTAL_C.sub }}
          >
            Lade Bewohner …
          </p>
        ) : (
          bewohner.map((b) => {
            const wohnungLabel =
              b.objekt_einheiten?.bezeichnung?.trim() || "—";
            const etageLabel = b.objekt_einheiten?.etage?.trim() || "—";
            const kontakt = [b.telefon, b.email].filter(Boolean).join(" · ");
            return (
              <PortalListTableRow key={b.id} columns={4}>
                <PortalListTableCell label="Name">
                  <p className="truncate text-[13.5px] font-semibold text-text-primary">
                    {b.name}
                  </p>
                  {kontakt ? (
                    <p
                      className="mt-0.5 truncate text-[12px]"
                      style={{ color: PORTAL_C.sub }}
                    >
                      {kontakt}
                    </p>
                  ) : null}
                </PortalListTableCell>
                <PortalListTableCell label="Wohnung">
                  <span className="text-[13px] font-medium text-text-secondary">
                    {wohnungLabel}
                  </span>
                </PortalListTableCell>
                <PortalListTableCell label="Etage">
                  <span className="text-[13px] font-medium text-text-secondary">
                    {etageLabel}
                  </span>
                </PortalListTableCell>
                <PortalListTableCell className="sm:justify-self-end">
                  <button
                    type="button"
                    className="rounded-[9px] border border-red-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    disabled={busy}
                    onClick={() => void removeBewohner(b.id)}
                  >
                    Entfernen
                  </button>
                </PortalListTableCell>
              </PortalListTableRow>
            );
          })
        )}
      </PortalListTable>

      <EinstellungenCard title="Bewohner hinzufügen">
        <form
          onSubmit={(e) => void addBewohner(e)}
          className="flex flex-col gap-3"
        >
          <EinstellungenEdField
            label="Name"
            value={name}
            onChange={setName}
            placeholder="Max Mustermann"
            autoComplete="name"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <EinstellungenEdField
              label="Wohnung"
              value={wohnung}
              onChange={setWohnung}
              placeholder="z. B. Whg 12"
            />
            <EinstellungenEdField
              label="Etage"
              value={etage}
              onChange={setEtage}
              placeholder="z. B. EG, 1. OG"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <EinstellungenEdField
              label="Telefon (optional)"
              type="tel"
              value={telefon}
              onChange={setTelefon}
              placeholder="089 / …"
              autoComplete="tel"
            />
            <EinstellungenEdField
              label="E-Mail (optional)"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="mieter@example.de"
              autoComplete="email"
            />
          </div>
          <button
            type="submit"
            className="btn-pill-primary inline-flex w-full items-center justify-center gap-2 sm:w-auto"
            disabled={busy || !name.trim() || !wohnung.trim()}
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            {busy ? "Speichern…" : "Bewohner anlegen"}
          </button>
        </form>
      </EinstellungenCard>
    </div>
  );
}
