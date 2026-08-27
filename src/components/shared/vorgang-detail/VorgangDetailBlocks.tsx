"use client";

import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { PortalPhotoGallery } from "@/components/shared/PortalPhotoGallery";
import { VorgangLeistungenListe } from "@/components/shared/vorgang-detail/VorgangLeistungenListe";
import { cn } from "@/lib/utils";
import {
  sightForRole,
  type BlockSight,
  type VorgangDetailSight,
  type VorgangDetailVM,
} from "@/lib/vorgang/vorgang-detail-vm";

function BlockShell({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <PortalDetailCard title={title} chrome="responsive" className={className}>
      {children}
    </PortalDetailCard>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border-light py-2 text-[13px] last:border-b-0">
      <span className="max-w-[55%] min-w-0 leading-snug text-text-secondary [overflow-wrap:anywhere]">
        {label}
      </span>
      <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-right font-semibold leading-snug text-text-primary [overflow-wrap:anywhere]">
        {value}
      </span>
    </div>
  );
}

function visible(sight: BlockSight): boolean {
  return sight !== "hidden";
}

function formatPartnerEuro(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

/**
 * Partner: eine Details-Card analog HV-Meldung / anderen Vorgangsphasen.
 * Objekt → PLZ/Ort → Funnel → Zeitraum → Beschreibung → Kontakt — stabil über Phasen.
 */
function PartnerUnifiedDetails({
  vm,
  className,
}: {
  vm: VorgangDetailVM;
  className?: string;
}) {
  const { objektMelder: B, ausfuehrung: C } = vm;
  const kontaktName =
    C.kontaktVorOrtName?.trim() || B.melderName?.trim() || null;
  const telefon =
    C.kontaktVorOrtTel?.trim() || B.melderTelefon?.trim() || null;
  const kontaktValue = [kontaktName, telefon].filter(Boolean).join("\n") || null;
  const verguetung =
    typeof C.summeEkNetto === "number" && C.summeEkNetto > 0
      ? formatPartnerEuro(C.summeEkNetto)
      : null;
  const adresse = B.adresseStrasse?.trim() || null;
  const termin =
    C.terminLabel?.trim() &&
    C.terminLabel.trim() !== (B.zeitraumLabel?.trim() || "")
      ? C.terminLabel.trim()
      : null;

  return (
    <div className={cn(className)}>
      <BlockShell title="Details">
        <div className="space-y-0">
          {B.objektTitel ? (
            <MetaRow label="Objekt" value={B.objektTitel} />
          ) : null}
          {adresse ? (
            <MetaRow label="Adresse" value={adresse} />
          ) : (
            <MetaRow label="Adresse" value="Keine Straße hinterlegt" />
          )}
          {B.plzOrt ? <MetaRow label="PLZ / Ort" value={B.plzOrt} /> : null}
          {B.einheit ? <MetaRow label="Einheit" value={B.einheit} /> : null}
          {B.zugangshinweis ? (
            <MetaRow label="Zugang" value={B.zugangshinweis} />
          ) : null}
          {B.situationLabel ? (
            <MetaRow label="Situation" value={B.situationLabel} />
          ) : null}
          {B.bereichLabel ? (
            <MetaRow label="Bereich" value={B.bereichLabel} />
          ) : null}
          {B.zeitraumLabel ? (
            <MetaRow label="Zeitraum" value={B.zeitraumLabel} />
          ) : null}
          {termin ? <MetaRow label="Termin" value={termin} /> : null}
          {B.fachdetailRows?.map((row) => (
            <MetaRow
              key={`${row.label}:${row.value}`}
              label={row.label}
              value={row.value}
            />
          ))}
          {B.beschreibung ? (
            <MetaRow label="Beschreibung" value={B.beschreibung} />
          ) : null}
          {C.gewerk ? <MetaRow label="Gewerk" value={C.gewerk} /> : null}
          {verguetung ? (
            <MetaRow label="Vergütung (Netto)" value={verguetung} />
          ) : null}
          {C.aufgabeNotiz ? (
            <MetaRow label="Aufgabe" value={C.aufgabeNotiz} />
          ) : null}
          {kontaktValue ? (
            <MetaRow label="Kontakt vor Ort" value={kontaktValue} />
          ) : null}
          {B.melderEmail?.trim() ? (
            <MetaRow label="E-Mail" value={B.melderEmail.trim()} />
          ) : null}
        </div>
        {B.fotos && B.fotos.length > 0 ? (
          <div className="mt-3">
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-text-secondary">
              Fotos
            </p>
            <PortalPhotoGallery urls={B.fotos} />
          </div>
        ) : null}
      </BlockShell>
    </div>
  );
}

type Props = {
  vm: VorgangDetailVM;
  /** Override; default aus vm.role */
  sight?: VorgangDetailSight;
  className?: string;
  /** CTAs unter allen Cards (z. B. Freigeben / Ablehnen unter Ausführung). */
  detailsActions?: React.ReactNode;
};

/**
 * Einheitliche Blöcke für alle Portale — Sichtbarkeit über Sight-Matrix.
 * Partner: eine Details-Card (kein Card-Stack).
 * HV: Objekt & Melder + Details (Situation/Bereich/Beschreibung/Fotos/Zeitraum).
 * Kunde/Mieter: gleiche Melde-Details inkl. Fotos; Mieter ohne eigenen Namen.
 */
export function VorgangDetailBlocks({
  vm,
  sight: sightProp,
  className,
  detailsActions,
}: Props) {
  if (vm.role === "partner") {
    return <PartnerUnifiedDetails vm={vm} className={className} />;
  }

  const sight = sightProp ?? sightForRole(vm.role);
  const { auftraggeber: A, objektMelder: B, ausfuehrung: C } = vm;
  const isHv = vm.role === "hv";

  const showAuftraggeber = visible(sight.auftraggeber);
  const showObjekt = visible(sight.objektMelder);
  const showAusfuehrung = visible(sight.ausfuehrung);

  if (!showAuftraggeber && !showObjekt && !showAusfuehrung) return null;

  const siteOnly = sight.objektMelder === "site";
  const safeOnly = sight.objektMelder === "safe";
  const plainExec = sight.ausfuehrung === "plain";

  const adresseDisplay =
    B.adresseStrasse?.trim() ||
    B.adresseZeile?.trim() ||
    null;
  const plzOrtDisplay = B.plzOrt?.trim() || null;

  const isKunde = vm.role === "kunde";
  const isMieter = vm.role === "mieter";
  const hasMeldeTextDetails = Boolean(
    B.situationLabel ||
      B.bereichLabel ||
      B.beschreibung ||
      B.zeitraumLabel ||
      (B.fachdetailRows && B.fachdetailRows.length > 0) ||
      (isHv && B.preisIndikation) ||
      (vm.detailsLeistungen && vm.leistungen.length > 0)
  );
  const showMeldeDetails =
    (isHv || isKunde || isMieter) &&
    (hasMeldeTextDetails ||
      ((isHv || isKunde || isMieter) && Boolean(B.fotos && B.fotos.length > 0)));

  return (
    <div className={cn("space-y-3.5", className)}>
      {showObjekt ? (
        <BlockShell title={isMieter ? "Objekt" : "Objekt & Melder"}>
          <div className="space-y-0">
            {!isMieter && B.melderName ? (
              <MetaRow
                label={siteOnly ? "Kontakt vor Ort" : "Melder"}
                value={B.melderName}
              />
            ) : null}
            {!isHv && B.objektTitel ? (
              <MetaRow label="Objekt" value={B.objektTitel} />
            ) : null}
            <MetaRow label="Adresse" value={adresseDisplay || "—"} />
            {isHv || plzOrtDisplay ? (
              <MetaRow label="PLZ / Ort" value={plzOrtDisplay || "—"} />
            ) : null}
            {B.einheit ? <MetaRow label="Einheit" value={B.einheit} /> : null}
            {!safeOnly && B.zugangshinweis ? (
              <MetaRow label="Zugang" value={B.zugangshinweis} />
            ) : null}
            {!safeOnly && B.melderTelefon ? (
              <MetaRow label="Telefon" value={B.melderTelefon} />
            ) : null}
            {!safeOnly && !siteOnly && B.melderEmail ? (
              <MetaRow label="E-Mail" value={B.melderEmail} />
            ) : null}
          </div>
          {/* Beschreibung nur hier, wenn kein eigener Details-Block folgt */}
          {!isHv && !isKunde && !isMieter && B.beschreibung && !siteOnly ? (
            <p className="portal-text-body mt-3 whitespace-pre-wrap text-text-secondary">
              {B.beschreibung}
            </p>
          ) : null}
        </BlockShell>
      ) : null}

      {showMeldeDetails ? (
        <BlockShell title="Details">
          <div className="space-y-0">
            {B.situationLabel ? (
              <MetaRow label="Situation" value={B.situationLabel} />
            ) : null}
            {B.bereichLabel ? (
              <MetaRow label="Bereich" value={B.bereichLabel} />
            ) : null}
            {B.zeitraumLabel ? (
              <MetaRow label="Zeitraum" value={B.zeitraumLabel} />
            ) : null}
            {isHv && B.preisIndikation ? (
              <MetaRow label="Preisindikation" value={B.preisIndikation} />
            ) : null}
            {B.fachdetailRows?.map((row) => (
              <MetaRow
                key={`${row.label}:${row.value}`}
                label={row.label}
                value={row.value}
              />
            ))}
          </div>
          {B.beschreibung ? (
            <div className="mt-3">
              <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-text-secondary">
                Beschreibung
              </p>
              <p className="portal-text-body whitespace-pre-wrap text-text-secondary">
                {B.beschreibung}
              </p>
            </div>
          ) : null}
          {(isHv || isKunde || isMieter) && B.fotos && B.fotos.length > 0 ? (
            <div className="mt-3">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-text-secondary">
                Fotos
              </p>
              <PortalPhotoGallery urls={B.fotos} />
            </div>
          ) : null}
          {vm.detailsLeistungen && vm.leistungen.length > 0 ? (
            <div className="mt-3 border-t border-border-light pt-3">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-text-secondary">
                {vm.detailsLeistungen.title}
              </p>
              <VorgangLeistungenListe
                items={vm.leistungen}
                mode={vm.detailsLeistungen.mode}
                summeBrutto={A.summeBrutto}
              />
            </div>
          ) : null}
        </BlockShell>
      ) : null}

      {showAuftraggeber ? (
        <BlockShell title="Auftraggeber & Freigabe">
          <div className="space-y-0">
            {A.kostentraeger ? (
              <MetaRow
                label="Kostenträger"
                value={
                  A.kostentraegerVorgeschlagen
                    ? `${A.kostentraeger} (Vorschlag)`
                    : A.kostentraeger
                }
              />
            ) : null}
            {A.versicherungsNr ? (
              <MetaRow label="Versicherungs-Nr." value={A.versicherungsNr} />
            ) : null}
            {A.freigabeStatus ? (
              <MetaRow label="Freigabe" value={A.freigabeStatus} />
            ) : null}
            {A.hvMeldungStatus ? (
              <MetaRow label="Meldung" value={A.hvMeldungStatus} />
            ) : null}
            {typeof A.summeBrutto === "number" && A.summeBrutto > 0 ? (
              <MetaRow
                label="Angebotssumme"
                value={new Intl.NumberFormat("de-DE", {
                  style: "currency",
                  currency: "EUR",
                }).format(A.summeBrutto)}
              />
            ) : null}
            {A.rechnungsempfaengerHint ? (
              <MetaRow label="Rechnung an" value={A.rechnungsempfaengerHint} />
            ) : null}
          </div>
          {sight.leistungen !== "hidden" && sight.leistungen === "vk" ? (
            <div className="mt-3">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-text-secondary">
                Leistungen
              </p>
              <VorgangLeistungenListe
                items={vm.leistungen}
                mode="vk"
                summeBrutto={A.summeBrutto}
              />
              {vm.leistungen.length === 0 ? (
                <p className="portal-text-meta text-text-secondary">
                  Noch keine Leistungen hinterlegt.
                </p>
              ) : null}
            </div>
          ) : null}
        </BlockShell>
      ) : null}

      {showAusfuehrung ? (
        <BlockShell title={plainExec ? "Was passiert als Nächstes" : "Ausführung"}>
          <div className="space-y-0">
            {C.gewerk ? <MetaRow label="Gewerk" value={C.gewerk} /> : null}
            {C.aufgabeNotiz && !plainExec ? (
              <MetaRow label="Aufgabe" value={C.aufgabeNotiz} />
            ) : null}
            {C.terminLabel ? (
              <MetaRow label="Termin" value={C.terminLabel} />
            ) : null}
            {C.handwerkerName && !plainExec ? (
              <MetaRow label="Handwerker" value={C.handwerkerName} />
            ) : null}
            {(siteOnly || sight.ausfuehrung === "full") &&
            (C.kontaktVorOrtName || C.kontaktVorOrtTel) ? (
              <MetaRow
                label="Kontakt vor Ort"
                value={[C.kontaktVorOrtName, C.kontaktVorOrtTel]
                  .filter(Boolean)
                  .join(" · ")}
              />
            ) : null}
          </div>
          {sight.leistungen === "ek" ? (
            <div className="mt-3">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-text-secondary">
                Ihre Leistungen
              </p>
              <VorgangLeistungenListe
                items={vm.leistungen}
                mode="ek"
                summeEkNetto={C.summeEkNetto}
              />
            </div>
          ) : null}
          {sight.leistungen === "plain" && vm.leistungen.length > 0 ? (
            <div className="mt-3">
              <VorgangLeistungenListe items={vm.leistungen} mode="plain" />
            </div>
          ) : null}
          {plainExec && !C.terminLabel && vm.leistungen.length === 0 ? (
            <p className="portal-text-meta text-text-secondary">
              Sobald Termine oder Arbeiten feststehen, erscheinen sie hier.
            </p>
          ) : null}
        </BlockShell>
      ) : null}

      {detailsActions ? (
        <div className="portal-action-row">{detailsActions}</div>
      ) : null}
    </div>
  );
}
