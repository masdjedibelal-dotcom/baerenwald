"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { updatePartnerProfil, uploadPartnerProfilLogo } from "@/app/actions/partner-profil";
import { PartnerDetailInfoBox } from "@/components/partner/PartnerDetailUi";
import { PartnerRahmenvertragCard } from "@/components/partner/PartnerRahmenvertragCard";
import { PortalKontoSicherheitPanel } from "@/components/shared/PortalKontoSicherheitPanel";
import { PortalEinstellungenShell } from "@/components/shared/PortalEinstellungenShell";
import {
  EinstellungenEdField,
  EinstellungenEditModal,
  EinstellungenGrid2,
  EinstellungenPfRow,
  EinstellungenSectionHeader,
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

type EditTab = "anschrift" | "steuer" | "bank" | null;

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

function dash(v: string) {
  return v.trim() || "—";
}

/**
 * D12 Handwerker — Firmendaten nur Anzeige; Bearbeiten per Stift → Modal.
 */
export function PartnerFirmendatenScreen({
  handwerker,
  profil,
}: {
  handwerker: PartnerHandwerkerProfil;
  profil: PartnerProfilKontext;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(() => draftFromProfil(handwerker));
  const [edit, setEdit] = useState<Draft | null>(null);
  const [editTab, setEditTab] = useState<EditTab>(null);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const gate = checkPartnerFirmendatenGate({
    firma: saved.firma,
    name: saved.inhaber,
    strasse: saved.strasse,
    ort: saved.ort,
    telefon: saved.tel,
    steuernummer: saved.steuernr,
    ustid: saved.ustid,
    iban: saved.iban,
  });

  useEffect(() => {
    setSaved(draftFromProfil(handwerker));
  }, [handwerker]);

  function openEdit(tab: Exclude<EditTab, null>) {
    setEdit({ ...saved });
    setEditTab(tab);
  }

  function closeEdit() {
    if (saving) return;
    setEditTab(null);
    setEdit(null);
  }

  async function persist(next: Draft) {
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
      return false;
    }
    setSaved(next);
    partnerPortalToast.stammdatenGespeichert();
    router.refresh();
    return true;
  }

  async function onSaveEdit() {
    if (!edit) return;
    const ok = await persist(edit);
    if (ok) closeEdit();
  }

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

  const handwerkskarte = filterProfilStammCompliance([
    ...profil.allgemein,
    ...profil.meister,
  ]);

  const modalTitle =
    editTab === "steuer"
      ? HW_FIRMEN_SECTIONS.steuer
      : editTab === "bank"
        ? HW_FIRMEN_SECTIONS.bank
        : HW_FIRMEN_SECTIONS.anschrift;

  return (
    <>
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
              <EinstellungenSectionHeader
                title={HW_FIRMEN_SECTIONS.steuer}
                onEdit={() => openEdit("steuer")}
              />
              <div className="flex flex-col gap-[11px]">
                <EinstellungenGrid2>
                  <EinstellungenPfRow label="USt-IdNr." value={dash(saved.ustid)} />
                  <EinstellungenPfRow
                    label="Steuernummer"
                    value={dash(saved.steuernr)}
                  />
                </EinstellungenGrid2>
                <EinstellungenPfRow
                  label="Handelsregister"
                  value={dash(saved.hrb)}
                />
                <EinstellungenPfRow
                  label="Kleinunternehmer §19 UStG"
                  value={saved.kleinunternehmer ? "Ja" : "Nein"}
                />
              </div>
              <p className="text-[11.5px] leading-relaxed text-text-tertiary">
                {HW_FIRMEN_FOOTER}
              </p>
            </div>
          );
        }

        if (tab === "bank") {
          return (
            <div className="space-y-3">
              <EinstellungenSectionHeader
                title={HW_FIRMEN_SECTIONS.bank}
                onEdit={() => openEdit("bank")}
              />
              <div className="flex flex-col gap-[11px]">
                <EinstellungenPfRow label="IBAN" value={dash(saved.iban)} />
                <EinstellungenGrid2>
                  <EinstellungenPfRow label="BIC" value={dash(saved.bic)} />
                  <EinstellungenPfRow label="Bank" value={dash(saved.bank)} />
                </EinstellungenGrid2>
              </div>
              <p className="text-[11.5px] leading-relaxed text-text-tertiary">
                {HW_FIRMEN_FOOTER}
              </p>
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
              <EinstellungenSectionHeader title={HW_FIRMEN_SECTIONS.logo} />
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
                      {saved.logo}
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
              <EinstellungenSectionHeader
                title={HW_FIRMEN_SECTIONS.anschrift}
                onEdit={() => openEdit("anschrift")}
              />
              <div className="flex flex-col gap-[11px]">
                <EinstellungenGrid2>
                  <EinstellungenPfRow
                    label="Firmenname"
                    value={dash(saved.firma)}
                  />
                  <EinstellungenPfRow
                    label="Inhaber / Geschäftsführung"
                    value={dash(saved.inhaber)}
                  />
                </EinstellungenGrid2>
                <EinstellungenGrid2>
                  <EinstellungenPfRow label="Straße" value={dash(saved.strasse)} />
                  <EinstellungenPfRow label="PLZ / Ort" value={dash(saved.ort)} />
                </EinstellungenGrid2>
                <EinstellungenGrid2>
                  <EinstellungenPfRow label="Telefon" value={dash(saved.tel)} />
                  <EinstellungenPfRow label="E-Mail" value={dash(saved.mail)} />
                </EinstellungenGrid2>
              </div>
            </div>

            <p className="text-[11.5px] leading-relaxed text-text-tertiary">
              {HW_FIRMEN_FOOTER}
            </p>
            <PortalKontoSicherheitPanel signOutHref="/partner/login" />
          </div>
        );
      }}
    </PortalEinstellungenShell>

    {edit && editTab ? (
      <EinstellungenEditModal
        open
        title={modalTitle}
        subtitle="Änderungen erst nach Speichern übernehmen."
        onClose={closeEdit}
        onSave={() => void onSaveEdit()}
        saving={saving}
      >
        {editTab === "anschrift" ? (
          <>
            <EinstellungenGrid2>
              <EinstellungenEdField
                label="Firmenname"
                value={edit.firma}
                onChange={(v) => setEdit({ ...edit, firma: v })}
                autoComplete="organization"
              />
              <EinstellungenEdField
                label="Inhaber / Geschäftsführung"
                value={edit.inhaber}
                onChange={(v) => setEdit({ ...edit, inhaber: v })}
                autoComplete="name"
              />
            </EinstellungenGrid2>
            <EinstellungenGrid2>
              <EinstellungenEdField
                label="Straße"
                value={edit.strasse}
                onChange={(v) => setEdit({ ...edit, strasse: v })}
                autoComplete="street-address"
              />
              <EinstellungenEdField
                label="PLZ / Ort"
                value={edit.ort}
                onChange={(v) => setEdit({ ...edit, ort: v })}
                autoComplete="address-level2"
              />
            </EinstellungenGrid2>
            <EinstellungenEdField
              label="Telefon"
              value={edit.tel}
              onChange={(v) => setEdit({ ...edit, tel: v })}
              type="tel"
              autoComplete="tel"
            />
            <EinstellungenPfRow label="E-Mail" value={dash(edit.mail)} />
            <p className="text-[11.5px] text-text-tertiary">
              E-Mail-Änderung nur über Support.
            </p>
          </>
        ) : null}

        {editTab === "steuer" ? (
          <>
            <EinstellungenGrid2>
              <EinstellungenEdField
                label="USt-IdNr."
                value={edit.ustid}
                onChange={(v) => setEdit({ ...edit, ustid: v })}
              />
              <EinstellungenEdField
                label="Steuernummer"
                value={edit.steuernr}
                onChange={(v) => setEdit({ ...edit, steuernr: v })}
              />
            </EinstellungenGrid2>
            <EinstellungenEdField
              label="Handelsregister"
              value={edit.hrb}
              onChange={(v) => setEdit({ ...edit, hrb: v })}
            />
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border-default px-3 py-2.5">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={edit.kleinunternehmer}
                onChange={(e) =>
                  setEdit({ ...edit, kleinunternehmer: e.target.checked })
                }
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
          </>
        ) : null}

        {editTab === "bank" ? (
          <>
            <EinstellungenEdField
              label="IBAN"
              value={edit.iban}
              onChange={(v) => setEdit({ ...edit, iban: v })}
              autoComplete="off"
            />
            <EinstellungenGrid2>
              <EinstellungenEdField
                label="BIC"
                value={edit.bic}
                onChange={(v) => setEdit({ ...edit, bic: v })}
              />
              <EinstellungenEdField
                label="Bank"
                value={edit.bank}
                onChange={(v) => setEdit({ ...edit, bank: v })}
              />
            </EinstellungenGrid2>
          </>
        ) : null}
      </EinstellungenEditModal>
    ) : null}
    </>
  );
}
