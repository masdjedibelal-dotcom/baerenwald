"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { updatePartnerProfil, uploadPartnerProfilLogo } from "@/app/actions/partner-profil";
import { retryPendingPartnerAutoAngebote } from "@/app/actions/partner-auto-dokumente";
import { PartnerDetailInfoBox } from "@/components/partner/PartnerDetailUi";
import { PartnerRahmenvertragCard } from "@/components/partner/PartnerRahmenvertragCard";
import { PortalKontoSicherheitPanel } from "@/components/shared/PortalKontoSicherheitPanel";
import { PortalEinstellungenShell } from "@/components/shared/PortalEinstellungenShell";
import { PortalPushSettingsPanel } from "@/components/shared/PortalPushSettingsPanel";
import { usePortalUploadBusy } from "@/components/shared/usePortalUploadBusy";
import {
  EinstellungenEdField,
  EinstellungenEditModal,
  EinstellungenGrid2,
  EinstellungenLogoRow,
  EinstellungenPfList,
  EinstellungenPfRow,
  EinstellungenSectionCard,
} from "@/components/shared/PortalEinstellungenUi";
import { filterProfilStammCompliance } from "@/lib/partner/compliance-summary";
import type {
  PartnerHandwerkerProfil,
  PartnerProfilKontext,
} from "@/lib/partner/get-partner-data";
import { resolveHandwerkerAnschrift } from "@/lib/partner/handwerker-anschrift";
import { HW_FIRMEN_SECTIONS } from "@/lib/portal2/einstellungen-ui";
import { partnerPortalToast, portalToastError } from "@/lib/shared/portal-toast";

type Draft = {
  firma: string;
  inhaber: string;
  strasse: string;
  hausnummer: string;
  plz: string;
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
  const anschrift = resolveHandwerkerAnschrift(h);
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
    strasse: anschrift.strasse,
    hausnummer: anschrift.hausnummer,
    plz: anschrift.plz,
    ort: anschrift.ort,
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
 * Handwerker — Tab „Daten“: Anschrift, Steuer, Bank in einem Bearbeiten/Speichern.
 */
export function PartnerFirmendatenScreen({
  handwerker,
  profil,
}: {
  handwerker: PartnerHandwerkerProfil;
  profil: PartnerProfilKontext;
}) {
  const router = useRouter();
  const { uploadBusy: saving, runUpload } = usePortalUploadBusy();
  const [saved, setSaved] = useState(() => draftFromProfil(handwerker));
  const [edit, setEdit] = useState<Draft | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSaved(draftFromProfil(handwerker));
    setLogoPreview(null);
  }, [handwerker]);

  const logoSrc = logoPreview || handwerker.logo_signed_url;

  function openEdit() {
    setEdit({ ...saved });
    setEditOpen(true);
  }

  function closeEdit() {
    if (saving) return;
    setEditOpen(false);
    setEdit(null);
  }

  async function persist(next: Draft) {
    return runUpload(async () => {
      const fd = new FormData();
      fd.set("firma", next.firma);
      fd.set("inhaber", next.inhaber);
      fd.set("strasse", next.strasse);
      fd.set("hausnummer", next.hausnummer);
      fd.set("plz", next.plz);
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
      if (!res.ok) {
        portalToastError("Daten nicht gespeichert", res.error);
        return false;
      }
      setSaved(next);
      partnerPortalToast.stammdatenGespeichert();
      try {
        const retry = await retryPendingPartnerAutoAngebote();
        if (retry.created > 0) {
          partnerPortalToast.unterlagenHochgeladen();
        } else if (retry.errors[0]) {
          portalToastError("Angebot nachziehen fehlgeschlagen", retry.errors[0]);
        }
      } catch {
        /* ignore */
      }
      router.refresh();
      return true;
    });
  }

  async function onSaveEdit() {
    if (!edit) return;
    const ok = await persist(edit);
    if (ok) closeEdit();
  }

  async function onLogoChange(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      portalToastError("Nur Bilder erlaubt");
      return;
    }
    const localPreview = URL.createObjectURL(file);
    setLogoPreview(localPreview);
    const fd = new FormData();
    fd.set("logo", file);
    await runUpload(async () => {
      const res = await uploadPartnerProfilLogo(fd);
      if (!res.ok) {
        setLogoPreview(null);
        portalToastError("Logo nicht gespeichert", res.error);
        return;
      }
      partnerPortalToast.stammdatenGespeichert();
      router.refresh();
    });
  }

  const handwerkskarte = filterProfilStammCompliance([
    ...profil.allgemein,
    ...profil.meister,
  ]);

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
                    Weitere Unterlagen zum Bauauftrag (z. B.
                    Freistellungsbescheinigung, Personalliste) erscheinen, sobald
                    Bärenwald dein Angebot übernommen hat — unter „Vorgänge“.
                  </PartnerDetailInfoBox>
                ) : null}
              </div>
            );
          }

          if (tab === "benachrichtigungen") {
            return <PortalPushSettingsPanel portal="partner" />;
          }

          return (
            <>
              <EinstellungenSectionCard title={HW_FIRMEN_SECTIONS.logo}>
                <EinstellungenLogoRow
                  fallbackLabel={saved.logo}
                  uploadBusy={saving}
                  hasLogo={Boolean(logoSrc)}
                  onUploadClick={() => logoInputRef.current?.click()}
                  fileInput={
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        e.target.value = "";
                        void onLogoChange(f);
                      }}
                    />
                  }
                  preview={
                    logoSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoSrc}
                        alt="Firmenlogo"
                        className="h-full w-full object-contain"
                      />
                    ) : null
                  }
                />
              </EinstellungenSectionCard>

              <EinstellungenSectionCard
                title={HW_FIRMEN_SECTIONS.anschrift}
                onEdit={openEdit}
                editLabel="Daten bearbeiten"
              >
                <EinstellungenPfList>
                  <EinstellungenPfRow
                    label="Firmenname"
                    value={dash(saved.firma)}
                  />
                  <EinstellungenPfRow
                    label="Inhaber / Geschäftsführung"
                    value={dash(saved.inhaber)}
                  />
                  <EinstellungenPfRow
                    label="Straße"
                    value={dash(saved.strasse)}
                  />
                  <EinstellungenPfRow
                    label="Hausnummer"
                    value={dash(saved.hausnummer)}
                  />
                  <EinstellungenPfRow label="PLZ" value={dash(saved.plz)} />
                  <EinstellungenPfRow label="Ort" value={dash(saved.ort)} />
                  <EinstellungenPfRow
                    label="Telefon"
                    value={dash(saved.tel)}
                  />
                  <EinstellungenPfRow
                    label="E-Mail"
                    value={dash(saved.mail)}
                  />
                </EinstellungenPfList>
              </EinstellungenSectionCard>

              <EinstellungenSectionCard title={HW_FIRMEN_SECTIONS.steuer}>
                <EinstellungenPfList>
                  <EinstellungenPfRow
                    label="USt-IdNr."
                    value={dash(saved.ustid)}
                  />
                  <EinstellungenPfRow
                    label="Steuernummer"
                    value={dash(saved.steuernr)}
                  />
                  <EinstellungenPfRow
                    label="Handelsregister"
                    value={dash(saved.hrb)}
                  />
                  <EinstellungenPfRow
                    label="Kleinunternehmer §19 UStG"
                    value={saved.kleinunternehmer ? "Ja" : "Nein"}
                  />
                </EinstellungenPfList>
              </EinstellungenSectionCard>

              <EinstellungenSectionCard title={HW_FIRMEN_SECTIONS.bank}>
                <EinstellungenPfList>
                  <EinstellungenPfRow label="IBAN" value={dash(saved.iban)} />
                  <EinstellungenPfRow label="BIC" value={dash(saved.bic)} />
                  <EinstellungenPfRow label="Bank" value={dash(saved.bank)} />
                </EinstellungenPfList>
              </EinstellungenSectionCard>

              <PortalKontoSicherheitPanel signOutHref="/partner/login" />
            </>
          );
        }}
      </PortalEinstellungenShell>

      {edit && editOpen ? (
        <EinstellungenEditModal
          open
          title="Daten bearbeiten"
          subtitle="Anschrift, Steuer und Bank — Speichern über den Button unten."
          onClose={closeEdit}
          onSave={() => void onSaveEdit()}
          saving={saving}
        >
          <p className="portal-liste-eyebrow !mb-0">
            {HW_FIRMEN_SECTIONS.anschrift}
          </p>
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
              autoComplete="address-line1"
            />
            <EinstellungenEdField
              label="Hausnummer"
              value={edit.hausnummer}
              onChange={(v) => setEdit({ ...edit, hausnummer: v })}
              autoComplete="address-line2"
            />
          </EinstellungenGrid2>
          <EinstellungenGrid2>
            <EinstellungenEdField
              label="PLZ"
              value={edit.plz}
              onChange={(v) => setEdit({ ...edit, plz: v })}
              autoComplete="postal-code"
            />
            <EinstellungenEdField
              label="Ort"
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
          <p className="portal-text-meta text-text-tertiary">
            E-Mail-Änderung nur über Support.
          </p>

          <p className="portal-liste-eyebrow !mb-0 pt-2">
            {HW_FIRMEN_SECTIONS.steuer}
          </p>
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
            <span className="portal-text-body leading-snug text-text-secondary">
              <span className="font-semibold text-text-primary">
                Kleinunternehmer §19 UStG
              </span>
              <span className="portal-text-meta mt-0.5 block">
                Rechnungen ohne MwSt-Ausweis, mit gesetzlichem Hinweis.
              </span>
            </span>
          </label>

          <p className="portal-liste-eyebrow !mb-0 pt-2">
            {HW_FIRMEN_SECTIONS.bank}
          </p>
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
        </EinstellungenEditModal>
      ) : null}
    </>
  );
}
