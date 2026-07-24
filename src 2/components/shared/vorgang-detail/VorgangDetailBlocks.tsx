"use client";

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
    <section
      className={cn(
        "rounded-xl border border-border-default bg-white p-4",
        className
      )}
    >
      <h3 className="mb-3 font-[family-name:var(--font-display)] text-[14px] font-bold text-text-primary">
        {title}
      </h3>
      {children}
    </section>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border-light py-2 text-[13px] last:border-b-0">
      <span className="shrink-0 text-text-secondary">{label}</span>
      <span className="text-right font-semibold text-text-primary">{value}</span>
    </div>
  );
}

function visible(sight: BlockSight): boolean {
  return sight !== "hidden";
}

/** Partner: eine Details-Card (HV-Stil), keine gestapelten Teil-Cards. */
function PartnerUnifiedDetails({
  vm,
  className,
}: {
  vm: VorgangDetailVM;
  className?: string;
}) {
  const { objektMelder: B, ausfuehrung: C } = vm;
  const adresse =
    B.adresseStrasse?.trim() || B.adresseZeile?.trim() || null;
  const kontakt =
    [C.kontaktVorOrtName, C.kontaktVorOrtTel].filter(Boolean).join(" · ") ||
    [B.melderName, B.melderTelefon].filter(Boolean).join(" · ") ||
    null;

  return (
    <div className={cn(className)}>
      <BlockShell title="Details">
        <div className="space-y-0">
          {adresse ? <MetaRow label="Adresse" value={adresse} /> : null}
          {B.melderTelefon ? (
            <MetaRow label="Telefon" value={B.melderTelefon} />
          ) : null}
          {C.gewerk ? <MetaRow label="Gewerk" value={C.gewerk} /> : null}
          {C.terminLabel ? (
            <MetaRow label="Termin" value={C.terminLabel} />
          ) : null}
          {kontakt ? <MetaRow label="Kontakt vor Ort" value={kontakt} /> : null}
          {B.plzOrt ? <MetaRow label="PLZ / Ort" value={B.plzOrt} /> : null}
          {B.objektTitel ? (
            <MetaRow label="Objekt" value={B.objektTitel} />
          ) : null}
          {B.situationLabel ? (
            <MetaRow label="Situation" value={B.situationLabel} />
          ) : null}
          {B.bereichLabel ? (
            <MetaRow label="Bereich" value={B.bereichLabel} />
          ) : null}
          {C.aufgabeNotiz ? (
            <MetaRow label="Aufgabe" value={C.aufgabeNotiz} />
          ) : null}
        </div>
        {B.beschreibung ? (
          <p className="mt-3 whitespace-pre-wrap text-[13px] text-text-secondary">
            {B.beschreibung}
          </p>
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
};

/**
 * Einheitliche Blöcke für alle Portale — Sichtbarkeit über Sight-Matrix.
 * Partner: eine Details-Card (kein Card-Stack).
 * HV: Objekt & Melder + Details (Situation/Bereich/Beschreibung/Fotos/Zeitraum).
 */
export function VorgangDetailBlocks({ vm, sight: sightProp, className }: Props) {
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

  const showMeldeDetails =
    isHv &&
    Boolean(
      B.situationLabel ||
        B.bereichLabel ||
        B.beschreibung ||
        B.zeitraumLabel ||
        (B.fachdetailRows && B.fachdetailRows.length > 0) ||
        (B.fotos && B.fotos.length > 0)
    );

  return (
    <div className={cn("space-y-3.5", className)}>
      {showObjekt ? (
        <BlockShell title="Objekt & Melder">
          <div className="space-y-0">
            {B.melderName ? (
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
          {!isHv && B.beschreibung && !siteOnly ? (
            <p className="portal-text-body mt-3 whitespace-pre-wrap text-text-secondary">
              {B.beschreibung}
            </p>
          ) : null}
          {!isHv && B.fotos && B.fotos.length > 0 && !safeOnly ? (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {B.fotos.slice(0, 8).map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt=""
                  className="aspect-square rounded-lg object-cover"
                />
              ))}
            </div>
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
          {B.fotos && B.fotos.length > 0 ? (
            <div className="mt-3">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-text-secondary">
                Fotos
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {B.fotos.slice(0, 12).map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="aspect-square rounded-lg object-cover"
                  />
                ))}
              </div>
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
    </div>
  );
}
