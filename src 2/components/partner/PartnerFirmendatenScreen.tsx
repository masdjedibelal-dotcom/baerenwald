"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { updatePartnerProfil, uploadPartnerProfilLogo } from "@/app/actions/partner-profil";
import { PartnerDetailInfoBox } from "@/components/partner/PartnerDetailUi";
import { PartnerRahmenvertragCard } from "@/components/partner/PartnerRahmenvertragCard";
import { PortalEinstellungenShell } from "@/components/shared/PortalEinstellungenShell";
import {
  EinstellungenEdField,
  EinstellungenGrid2,
  EinstellungenSectionLabel,
} from "@/components/shared/PortalEinstellungenUi";
import { filterProfilStammCompliance } from "@/lib/partner/compliance-summary";
import type {
  PartnerHandwerkerProfil,
  PartnerProfilKontext,
} from "@/lib/partner/get-partner-data";
import { checkPartnerFirmendatenGate } from "@/lib/partner/partner-firmendaten-gate";
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
  kleinunternehmer: boolean;
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
    kleinunternehmer: Boolean(h.kleinunternehmer),
  };
}

/**
 * D12 Handwerker — Firmendaten mit Subnav:
 * Anschrift & Kontakt · Steuer & Register · Bankverbindung · Stammunterlagen
 */
export function PartnerFirmendatenScreen({
  handwerker,
  profil,
}: {
  handwerker: PartnerHandwerkerProfil;
  profil: PartnerProfilKontext;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => draftFromProfil(handwerker));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const gate = checkPartnerFirmendatenGate({
    firma: draft.firma,
    name: draft.inhaber,
    strasse: draft.strasse,
    ort: draft.ort,
    telefon: draft.tel,
    steuernummer: draft.steuernr,
    ustid: draft.ustid,
    iban: draft.iban,
  });

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
      fd.set("kleinunternehmer", next.kleinunternehmer ? "1" : "0");
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

  const set = (key: keyof Draft, val: string | boolean) => {
    schedule({ ...draft, [key]: val } as Draft);
  };

  async function onLogoChange(file: File | null) {
    if (!file) return;
    setLogoBusy(true);
    const fd = new FormData();
    fd.set("logo", file);
    const res = await uploadPartnerProfilLogo(fd);
    setLogoBusy(false);
    if (!res.ok) {
      portalToastError("Logo nicht gespeichert", res.error);
      return;
    }
    partnerPortalToast.stammdatenGespeichert();
    router.refresh();
  }

  const footer = (
    <p className="text-[11.5px] leading-relaxed text-text-tertiary">
      {HW_FIRMEN_FOOTER}
      {saving ? " · Speichern…" : ""}
    </p>
  );

  const handwerkskarte = filterProfilStammCompliance([
    ...profil.allgemein,
    ...profil.meister,
  ]);

  return (
    <PortalEinstellungenShell variant="handwerker">
      {(tab) => {
        if (tab === "stamm") {
          return (
            <div className="space-y-6">
              <PartnerRahmenvertragCard
                rahmenvertrag={profil.rahmenvertrag}
                stammItems={profil.stamm}
                handwerkskarte={handwerkskarte}
              />
              {handwerkskarte.length === 0 ? (
                <PartnerDetailInfoBox>
                  Weitere Unterlagen zum Bauauftrag (z. B. Freistellungsbescheinigung,
                  Personalliste) erscheinen, sobald Bärenwald dein Angebot übernommen
                  hat — unter „Angebote“ und „Aufträge“.
                </PartnerDetailInfoBox>
              ) : null}
            </div>
          );
        }

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
                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border-default px-3 py-2.5">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={draft.kleinunternehmer}
                    onChange={(e) => set("kleinunternehmer", e.target.checked)}
                  />
                  <span className="text-[13px] leading-snug text-text-secondary">
                    <span className="font-semibold text-text-primary">
                      Kleinunternehmer §19 UStG
                    </span>
                    <span className="mt-0.5 block text-[12px]">
                      Rechnungen ohne MwSt-Ausweis, mit gesetzlichem Hinweis.
                    </span>
                  </span>
                </label>
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
            {!gate.okRechnung ? (
              <PartnerDetailInfoBox>
                Für Auto-Angebot & Rechnung fehlen noch:{" "}
                {gate.missingRechnung.join(", ")}.
              </PartnerDetailInfoBox>
            ) : null}

            <div>
              <EinstellungenSectionLabel>
                {HW_FIRMEN_SECTIONS.logo}
              </EinstellungenSectionLabel>
              <div className="flex items-center gap-3.5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-default bg-muted">
                  {handwerker.logo_signed_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={handwerker.logo_signed_url}
                      alt="Firmenlogo"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
                      {draft.logo}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] leading-relaxed text-text-secondary">
                    {HW_FIRMEN_LOGO_HINT}
                  </p>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      void onLogoChange(f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    disabled={logoBusy}
                    onClick={() => logoInputRef.current?.click()}
                    className="mt-2 rounded-lg border border-border-default px-3 py-1.5 text-[12.5px] font-semibold text-text-primary disabled:opacity-50"
                  >
                    {logoBusy ? "Wird hochgeladen…" : "Logo hochladen"}
                  </button>
                </div>
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
