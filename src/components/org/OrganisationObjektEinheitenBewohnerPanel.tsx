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
import { PORTAL_VAR } from "@/lib/portal2/tokens";
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
  "Der Vorteil: Hier sammeln Sie Mieter intern. Bei Schadensmeldungen können Sie Vorgänge direkt mit einem Mieter verknüpfen. Sichtbar nur für die Verwaltung im Portal — nicht im öffentlichen Meldeformular.";

type Props = {
  objektId: string;
  /** Objektadresse zum Vorausfüllen */
  defaultStrasse?: string | null;
  defaultHausnummer?: string | null;
  /** E2 Detail-Tab: Listenfläche ohne Extra-Chrome. */
  detailLayout?: boolean;
  /** @deprecated Einheiten-Count — nicht mehr benötigt */
  titleCount?: number;
};

export function OrganisationObjektEinheitenBewohnerPanel({
  objektId,
  defaultStrasse = "",
  defaultHausnummer = "",
  detailLayout = false,
}: Props) {
  const [bewohner, setBewohner] = useState<Bewohner[]>([]);
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [strasse, setStrasse] = useState(defaultStrasse?.trim() || "");
  const [hausnummer, setHausnummer] = useState(defaultHausnummer?.trim() || "");
  const [einheit, setEinheit] = useState("");
  const [telefon, setTelefon] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (defaultStrasse?.trim()) setStrasse(defaultStrasse.trim());
    if (defaultHausnummer?.trim()) setHausnummer(defaultHausnummer.trim());
  }, [defaultStrasse, defaultHausnummer]);

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
    const name = [vorname, nachname].map((s) => s.trim()).filter(Boolean).join(" ");
    if (!name || !strasse.trim() || !hausnummer.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/org/einheit-bewohner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objektId,
          name,
          wohnung: einheit.trim() || undefined,
          etage: einheit.trim() || undefined,
          telefon: telefon.trim() || undefined,
          email: email.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Fehler");
      setVorname("");
      setNachname("");
      setEinheit("");
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

  const canSubmit =
    vorname.trim().length > 0 &&
    nachname.trim().length > 0 &&
    strasse.trim().length > 1 &&
    hausnummer.trim().length > 0;

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
          style={{ color: PORTAL_VAR.sub }}
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
              style={{ color: PORTAL_VAR.sub }}
            >
              Noch keine Bewohner erfasst.
            </p>
          ) : null
        }
      >
        {loading ? (
          <p
            className="px-3.5 py-4 text-[13px]"
            style={{ color: PORTAL_VAR.sub }}
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
                      style={{ color: PORTAL_VAR.sub }}
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

      <EinstellungenCard title="Mieter anlegen">
        <form
          onSubmit={(e) => void addBewohner(e)}
          className="flex flex-col gap-3"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <EinstellungenEdField
              label="Vorname"
              value={vorname}
              onChange={setVorname}
              placeholder="Max"
              autoComplete="given-name"
            />
            <EinstellungenEdField
              label="Nachname"
              value={nachname}
              onChange={setNachname}
              placeholder="Mustermann"
              autoComplete="family-name"
            />
          </div>
          <div className="grid grid-cols-[1fr_88px] gap-3">
            <EinstellungenEdField
              label="Straße"
              value={strasse}
              onChange={setStrasse}
              placeholder="Musterstraße"
              autoComplete="address-line1"
            />
            <EinstellungenEdField
              label="Nr."
              value={hausnummer}
              onChange={setHausnummer}
              placeholder="12"
            />
          </div>
          <EinstellungenEdField
            label="Wohnung / Etage (optional)"
            value={einheit}
            onChange={setEinheit}
            placeholder="z. B. 4. Stock li"
          />
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
            disabled={busy || !canSubmit}
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            {busy ? "Speichern…" : "Mieter anlegen"}
          </button>
        </form>
      </EinstellungenCard>
    </div>
  );
}
