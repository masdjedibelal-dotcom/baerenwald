"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { updatePartnerProfil } from "@/app/actions/partner-profil";
import { PortalEinstellungenShell } from "@/components/shared/PortalEinstellungenShell";
import {
  EinstellungenEdField,
  EinstellungenGrid2,
  EinstellungenSectionLabel,
} from "@/components/shared/PortalEinstellungenUi";
import type { PartnerHandwerkerProfil } from "@/lib/partner/get-partner-data";
import {
  HW_FIRMEN_FOOTER,
  HW_FIRMEN_LOGO_HINT,
  HW_FIRMEN_SECTIONS,
} from "@/lib/portal2/einstellungen-ui";
import { partnerPortalToast, portalToastError } from "@/lib/shared/portal-toast";

type Draft = {
  firma: string;
  inhaber: string;
  strasse: string;
  ort: string;
  tel: string;
  mail: string;
  ustid: string;
  steuernr: string;
  hrb: string;
  iban: string;
  bic: string;
  bank: string;
  logo: string;
};

function draftFromProfil(h: PartnerHandwerkerProfil): Draft {
  const inhaber =
    [h.vorname, h.nachname].filter(Boolean).join(" ").trim() || h.name || "";
  const strasse = h.strasse?.trim() || "";
  const ort = h.ort?.trim() || "";
  let fallbackStrasse = strasse;
  let fallbackOrt = ort;
  if (!strasse && !ort && h.adresse?.trim()) {
    const parts = h.adresse.split(",").map((s) => s.trim());
    fallbackStrasse = parts[0] || "";
    fallbackOrt = parts.slice(1).join(", ") || "";
  }
  const logo =
    (h.firma || h.name || "HW")
      .replace(/[^a-zA-ZäöüÄÖÜß0-9\s]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "HW";

  return {
    firma: h.firma?.trim() || "",
    inhaber,
    strasse: fallbackStrasse,
    ort: fallbackOrt,
    tel: h.telefon?.trim() || "",
    mail: h.email?.trim() || "",
    ustid: h.ustid?.trim() || "",
    steuernr: h.steuernummer?.trim() || "",
    hrb: h.handelsregister?.trim() || "",
    iban: h.iban?.trim() || "",
    bic: h.bic?.trim() || "",
    bank: h.bank?.trim() || "",
    logo,
  };
}

/**
 * D12 Handwerker — Einstellungen mit Subnav:
 * Anschrift & Kontakt · Steuer & Register · Bankverbindung
 */
export function PartnerFirmendatenScreen({
  handwerker,
}: {
  handwerker: PartnerHandwerkerProfil;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => draftFromProfil(handwerker));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(draftFromProfil(handwerker));
  }, [handwerker]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const persist = useCallback(
    async (next: Draft) => {
      setSaving(true);
      const fd = new FormData();
      fd.set("firma", next.firma);
      fd.set("inhaber", next.inhaber);
      fd.set("strasse", next.strasse);
      fd.set("ort", next.ort);
      fd.set("telefon", next.tel);
      fd.set("ustid", next.ustid);
      fd.set("steuernummer", next.steuernr);
      fd.set("handelsregister", next.hrb);
      fd.set("iban", next.iban);
      fd.set("bic", next.bic);
      fd.set("bank", next.bank);
      const res = await updatePartnerProfil(fd);
      setSaving(false);
      if (!res.ok) {
        portalToastError("Firmendaten nicht gespeichert", res.error);
        return;
      }
      partnerPortalToast.stammdatenGespeichert();
      router.refresh();
    },
    [router]
  );

  const schedule = (next: Draft) => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void persist(next);
    }, 650);
  };

  const set = (key: keyof Draft, val: string) => {
    schedule({ ...draft, [key]: val });
  };

  const footer = (
    <p className="text-[11.5px] leading-relaxed text-text-tertiary">
      {HW_FIRMEN_FOOTER}
      {saving ? " · Speichern…" : ""}
    </p>
  );

  return (
    <PortalEinstellungenShell variant="handwerker">
      {(tab) => {
        if (tab === "steuer") {
          return (
            <div className="space-y-3">
              <EinstellungenSectionLabel>
                {HW_FIRMEN_SECTIONS.steuer}
              </EinstellungenSectionLabel>
              <div className="flex flex-col gap-[11px]">
                <EinstellungenGrid2>
                  <EinstellungenEdField
                    label="USt-IdNr."
                    value={draft.ustid}
                    onChange={(v) => set("ustid", v)}
                  />
                  <EinstellungenEdField
                    label="Steuernummer"
                    value={draft.steuernr}
                    onChange={(v) => set("steuernr", v)}
                  />
                </EinstellungenGrid2>
                <EinstellungenEdField
                  label="Handelsregister"
                  value={draft.hrb}
                  onChange={(v) => set("hrb", v)}
                />
              </div>
              {footer}
            </div>
          );
        }

        if (tab === "bank") {
          return (
            <div className="space-y-3">
              <EinstellungenSectionLabel>
                {HW_FIRMEN_SECTIONS.bank}
              </EinstellungenSectionLabel>
              <div className="flex flex-col gap-[11px]">
                <EinstellungenEdField
                  label="IBAN"
                  value={draft.iban}
                  onChange={(v) => set("iban", v)}
                  autoComplete="off"
                />
                <EinstellungenGrid2>
                  <EinstellungenEdField
                    label="BIC"
                    value={draft.bic}
                    onChange={(v) => set("bic", v)}
                  />
                  <EinstellungenEdField
                    label="Bank"
                    value={draft.bank}
                    onChange={(v) => set("bank", v)}
                  />
                </EinstellungenGrid2>
              </div>
              {footer}
            </div>
          );
        }

        return (
          <div className="space-y-4">
            <div>
              <EinstellungenSectionLabel>
                {HW_FIRMEN_SECTIONS.logo}
              </EinstellungenSectionLabel>
              <div className="flex items-center gap-3.5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-default bg-muted">
                  <span className="font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
                    {draft.logo}
                  </span>
                </div>
                <p className="text-[12.5px] leading-relaxed text-text-secondary">
                  {HW_FIRMEN_LOGO_HINT}
                </p>
              </div>
            </div>

            <div>
              <EinstellungenSectionLabel>
                {HW_FIRMEN_SECTIONS.anschrift}
              </EinstellungenSectionLabel>
              <div className="flex flex-col gap-[11px]">
                <EinstellungenGrid2>
                  <EinstellungenEdField
                    label="Firmenname"
                    value={draft.firma}
                    onChange={(v) => set("firma", v)}
                    autoComplete="organization"
                  />
                  <EinstellungenEdField
                    label="Inhaber / Geschäftsführung"
                    value={draft.inhaber}
                    onChange={(v) => set("inhaber", v)}
                    autoComplete="name"
                  />
                </EinstellungenGrid2>
                <EinstellungenGrid2>
                  <EinstellungenEdField
                    label="Straße"
                    value={draft.strasse}
                    onChange={(v) => set("strasse", v)}
                    autoComplete="street-address"
                  />
                  <EinstellungenEdField
                    label="PLZ / Ort"
                    value={draft.ort}
                    onChange={(v) => set("ort", v)}
                    autoComplete="address-level2"
                  />
                </EinstellungenGrid2>
                <EinstellungenGrid2>
                  <EinstellungenEdField
                    label="Telefon"
                    value={draft.tel}
                    onChange={(v) => set("tel", v)}
                    type="tel"
                    autoComplete="tel"
                  />
                  <EinstellungenEdField
                    label="E-Mail"
                    value={draft.mail}
                    onChange={() => undefined}
                    disabled
                  />
                </EinstellungenGrid2>
              </div>
            </div>
            {footer}
          </div>
        );
      }}
    </PortalEinstellungenShell>
  );
}
