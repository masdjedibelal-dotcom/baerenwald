"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  previewPartnerAutoDokument,
  submitPartnerAutoAngebot,
  submitPartnerAutoRechnung,
  type PartnerAutoDocPreview,
} from "@/app/actions/partner-auto-dokumente";
import { updatePartnerProfil } from "@/app/actions/partner-profil";
import { PartnerDetailError } from "@/components/partner/PartnerDetailUi";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { usePortalUploadBusy } from "@/components/shared/usePortalUploadBusy";
import type { AutoDocRegieOverride } from "@/lib/partner/partner-auto-doc-positionen";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { partnerPortalToast } from "@/lib/shared/portal-toast";

function fmtEur(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

type Step = "ask" | "fehlend" | "preview";

type Props = {
  open: boolean;
  /** Klassischer Angebot-Pfad (optional bei Rechnung mit auftragId). */
  anfrageId?: string | null;
  /** Direktauftrag/Akut: Rechnung aus Auftrags-Leistungen. */
  auftragId?: string | null;
  art: "angebot" | "rechnung";
  leistungsZeitraum?: string;
  onClose: () => void;
  onSuccess: () => void;
  /** Optional: ohne Dokument weiter (Nein). */
  allowSkip?: boolean;
  /** Direkt Preview/fehlende Daten laden (ohne Ja/Nein). Default: true bei Rechnung. */
  skipAsk?: boolean;
  /**
   * Rechnung: bei fehlenden Firmendaten nicht inline nachtragen,
   * sondern Popup mit CTA zu den Einstellungen.
   */
  onFirmendatenMissing?: (missingLabels: string[]) => void;
};

type DokumentVorschauProps = {
  art: "angebot" | "rechnung";
  preview: PartnerAutoDocPreview;
  dokumentNr: string;
  onDokumentNrChange: (v: string) => void;
  leistungsZeitraum?: string;
};

/** Inline-Dokumentvorschau — entspricht dem PDF; nur die Nummer ist editierbar. */
function RechnungDokumentVorschau({
  art,
  preview,
  dokumentNr,
  onDokumentNrChange,
  leistungsZeitraum,
}: DokumentVorschauProps) {
  const fd = preview.firmendaten;
  const emp = preview.empfaenger;
  const ku = Boolean(fd.kleinunternehmer);
  const mwstSumme = ku
    ? 0
    : preview.positionen.reduce(
        (s, p) => s + p.netto * (Number(p.mwstSatz) || 0) / 100,
        0
      );
  const brutto = preview.nettoSumme + mwstSumme;
  const absenderZeile = [
    [fd.strasse, fd.hausnummer].filter(Boolean).join(" "),
    [fd.plz, fd.ort].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  const heute = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-3">
      <p className="text-[12.5px]" style={{ color: PORTAL_VAR.sub }}>
        Vorschau dessen, was du absendest. Nur die{" "}
        {art === "angebot" ? "Angebotsnummer" : "Rechnungsnummer"} kannst du
        noch ändern — der Rest entspricht dem PDF.
      </p>

      <div
        className="overflow-hidden rounded-xl bg-white shadow-sm"
        style={{ border: `1px solid ${PORTAL_VAR.line}` }}
      >
        <div className="space-y-5 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <p
                className="text-[15px] font-bold"
                style={{ color: PORTAL_VAR.ink }}
              >
                {fd.firma || "Dein Betrieb"}
              </p>
              {absenderZeile ? (
                <p className="text-[12px]" style={{ color: PORTAL_VAR.sub }}>
                  {absenderZeile}
                </p>
              ) : null}
              {fd.telefon ? (
                <p className="text-[12px]" style={{ color: PORTAL_VAR.sub }}>
                  Tel. {fd.telefon}
                </p>
              ) : null}
            </div>
            <div className="text-right">
              <p
                className="text-[15px] font-bold tracking-wide"
                style={{ color: PORTAL_VAR.ink }}
              >
                {art === "rechnung" ? "RECHNUNG" : "ANGEBOT"}
              </p>
              <p className="text-[12px]" style={{ color: PORTAL_VAR.sub }}>
                Datum {heute}
              </p>
              {art === "rechnung" && leistungsZeitraum?.trim() ? (
                <p className="text-[12px]" style={{ color: PORTAL_VAR.sub }}>
                  Leistungszeitraum {leistungsZeitraum.trim()}
                </p>
              ) : null}
            </div>
          </div>

          <div
            className="grid gap-3 sm:grid-cols-2"
            style={{ borderTop: `1px solid ${PORTAL_VAR.line2}` }}
          >
            <div className="pt-3">
              <p
                className="mb-1 text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: PORTAL_VAR.faint }}
              >
                Empfänger
              </p>
              <p
                className="text-[13px] font-semibold"
                style={{ color: PORTAL_VAR.ink }}
              >
                {emp.firma}
              </p>
              <p className="text-[12px]" style={{ color: PORTAL_VAR.sub }}>
                {emp.strasse}
              </p>
              <p className="text-[12px]" style={{ color: PORTAL_VAR.sub }}>
                {emp.plzOrt}
              </p>
            </div>
            <div className="pt-3 sm:text-right">
              <label className="inline-block space-y-1 sm:ml-auto sm:text-left">
                <span
                  className="block text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: PORTAL_VAR.faint }}
                >
                  {art === "angebot" ? "Angebotsnummer *" : "Rechnungsnummer *"}
                </span>
                <input
                  type="text"
                  value={dokumentNr}
                  onChange={(e) => onDokumentNrChange(e.target.value)}
                  className="portal-input w-full min-w-[11rem] font-semibold sm:w-auto"
                  autoComplete="off"
                  autoFocus={art === "rechnung"}
                />
              </label>
            </div>
          </div>

          {(preview.betreff || preview.objektOrt) && (
            <div>
              {preview.betreff ? (
                <p
                  className="text-[13px] font-semibold"
                  style={{ color: PORTAL_VAR.ink }}
                >
                  {preview.betreff}
                </p>
              ) : null}
              {preview.objektOrt ? (
                <p className="text-[12px]" style={{ color: PORTAL_VAR.sub }}>
                  Objekt: {preview.objektOrt}
                </p>
              ) : null}
            </div>
          )}

          <div className="space-y-0">
            <div
              className="grid grid-cols-[1fr_auto] gap-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{
                color: PORTAL_VAR.faint,
                borderBottom: `1px solid ${PORTAL_VAR.line2}`,
              }}
            >
              <span>Position</span>
              <span>Netto</span>
            </div>
            {preview.positionen.map((p, i) => (
              <div
                key={`${p.titel}-${i}`}
                className="grid grid-cols-[1fr_auto] gap-2 py-2.5"
                style={{
                  borderBottom: `1px solid ${PORTAL_VAR.line2}`,
                }}
              >
                <div className="min-w-0">
                  <p
                    className="text-[13px] font-semibold"
                    style={{ color: PORTAL_VAR.ink }}
                  >
                    {p.titel}
                    {p.menge != null && p.einheit
                      ? ` · ${p.menge} ${p.einheit}`
                      : ""}
                  </p>
                  {p.beschreibung ? (
                    <p
                      className="mt-0.5 whitespace-pre-wrap text-[12px]"
                      style={{ color: PORTAL_VAR.sub }}
                    >
                      {p.beschreibung}
                    </p>
                  ) : null}
                  {!ku && p.mwstSatz > 0 ? (
                    <p
                      className="mt-0.5 text-[11px]"
                      style={{ color: PORTAL_VAR.faint }}
                    >
                      zzgl. {p.mwstSatz}&nbsp;% MwSt.
                    </p>
                  ) : null}
                </div>
                <span
                  className="shrink-0 text-[13px] font-semibold tabular-nums"
                  style={{ color: PORTAL_VAR.ink }}
                >
                  {fmtEur(p.netto)}
                </span>
              </div>
            ))}
          </div>

          <div className="ml-auto w-full max-w-[16rem] space-y-1 text-[13px]">
            <div className="flex justify-between gap-4">
              <span style={{ color: PORTAL_VAR.sub }}>Summe netto</span>
              <span
                className="font-semibold tabular-nums"
                style={{ color: PORTAL_VAR.ink }}
              >
                {fmtEur(preview.nettoSumme)}
              </span>
            </div>
            {ku ? (
              <p className="text-[11px]" style={{ color: PORTAL_VAR.faint }}>
                MwSt. 0,00 € (Kleinunternehmer §19 UStG)
              </p>
            ) : (
              <div className="flex justify-between gap-4">
                <span style={{ color: PORTAL_VAR.sub }}>MwSt.</span>
                <span
                  className="tabular-nums"
                  style={{ color: PORTAL_VAR.ink }}
                >
                  {fmtEur(mwstSumme)}
                </span>
              </div>
            )}
            <div
              className="flex justify-between gap-4 border-t pt-1.5 text-[14px] font-bold"
              style={{ borderColor: PORTAL_VAR.line2, color: PORTAL_VAR.ink }}
            >
              <span>{ku ? "Gesamt" : "Brutto"}</span>
              <span className="tabular-nums">{fmtEur(brutto)}</span>
            </div>
          </div>

          {art === "rechnung" && fd.iban ? (
            <div
              className="space-y-0.5 pt-1 text-[12px]"
              style={{
                borderTop: `1px solid ${PORTAL_VAR.line2}`,
                color: PORTAL_VAR.sub,
              }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: PORTAL_VAR.faint }}
              >
                Zahlung
              </p>
              <p>IBAN: {fd.iban}</p>
              {dokumentNr.trim() ? (
                <p>Verwendungszweck: {dokumentNr.trim()}</p>
              ) : null}
            </div>
          ) : null}

          {(fd.steuernummer || fd.ustid || ku) && (
            <p className="text-[11px]" style={{ color: PORTAL_VAR.faint }}>
              {[
                fd.steuernummer ? `Steuernr.: ${fd.steuernummer}` : null,
                fd.ustid ? `USt-IdNr.: ${fd.ustid}` : null,
                ku
                  ? "Gemäß §19 UStG wird keine Umsatzsteuer berechnet."
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Auto-Dokument: optional Ja/Nein → ggf. fehlende Daten → Preview → Submit.
 */
export function PartnerDokumentPreviewModal({
  open,
  anfrageId,
  auftragId,
  art,
  leistungsZeitraum,
  onClose,
  onSuccess,
  allowSkip = true,
  skipAsk,
  onFirmendatenMissing,
}: Props) {
  const router = useRouter();
  const { uploadBusy: loading, runUpload } = usePortalUploadBusy();
  const autoSkipAsk = skipAsk ?? art === "rechnung";
  const [step, setStep] = useState<Step>(autoSkipAsk ? "preview" : "ask");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PartnerAutoDocPreview | null>(null);
  const [dokumentNr, setDokumentNr] = useState("");

  const [firma, setFirma] = useState("");
  const [strasse, setStrasse] = useState("");
  const [hausnummer, setHausnummer] = useState("");
  const [plz, setPlz] = useState("");
  const [ort, setOrt] = useState("");
  const [telefon, setTelefon] = useState("");
  const [steuernummer, setSteuernummer] = useState("");
  const [ustid, setUstid] = useState("");
  const [iban, setIban] = useState("");

  const [regieDraft, setRegieDraft] = useState<
    Record<string, { titel: string; beschreibung: string; zeitMin: string; satz: string }>
  >({});

  const overrides = useMemo((): AutoDocRegieOverride[] => {
    return Object.entries(regieDraft).map(([positionId, d]) => ({
      positionId,
      titel: d.titel.trim() || undefined,
      beschreibung: d.beschreibung.trim() || undefined,
      zeitMinuten: d.zeitMin.trim() ? Number(d.zeitMin) : undefined,
      stundensatz: d.satz.trim() ? Number(d.satz.replace(",", ".")) : undefined,
    }));
  }, [regieDraft]);

  const cancelLabel = art === "rechnung" ? "Abbrechen" : "Nein, ohne Dokument";
  const previewSubmitLabel =
    art === "rechnung"
      ? loading
        ? "Wird gesendet…"
        : "Absenden"
      : loading
        ? "Wird erstellt…"
        : "Angebot erstellen & bestätigen";

  async function loadPreview(withOverrides: AutoDocRegieOverride[] = []) {
    setError(null);
    return runUpload(async () => {
      const res = await previewPartnerAutoDokument({
        anfrageId,
        auftragId,
        art,
        overrides: withOverrides,
      });
      if (!res.ok) {
        setError(res.error);
        return false;
      }
      setPreview(res.preview);
      setDokumentNr(res.preview.dokumentNr);
      setFirma(res.preview.firmendaten.firma);
      setStrasse(res.preview.firmendaten.strasse);
      setHausnummer(res.preview.firmendaten.hausnummer);
      setPlz(res.preview.firmendaten.plz);
      setOrt(res.preview.firmendaten.ort);
      setTelefon(res.preview.firmendaten.telefon);
      setSteuernummer(res.preview.firmendaten.steuernummer);
      setUstid(res.preview.firmendaten.ustid);
      setIban(res.preview.firmendaten.iban);

      const nextDraft: typeof regieDraft = {};
      for (const f of res.preview.missingFields) {
        if (f.scope !== "regie" || !f.positionId) continue;
        nextDraft[f.positionId] = nextDraft[f.positionId] ?? {
          titel: "",
          beschreibung: "",
          zeitMin: "",
          satz: "",
        };
      }
      setRegieDraft(nextDraft);

      const firmMissing = res.preview.missingFields.filter(
        (f) => f.scope === "firmendaten"
      );
      if (
        art === "rechnung" &&
        firmMissing.length > 0 &&
        onFirmendatenMissing
      ) {
        onFirmendatenMissing(firmMissing.map((f) => f.label));
        onClose();
        return false;
      }

      if (res.preview.missingFields.length > 0) {
        setStep("fehlend");
      } else {
        setStep("preview");
      }
      return true;
    });
  }

  useEffect(() => {
    if (!open) {
      setStep(autoSkipAsk ? "preview" : "ask");
      setError(null);
      setPreview(null);
      setDokumentNr("");
      setRegieDraft({});
      return;
    }
    setError(null);
    if (autoSkipAsk) {
      void loadPreview([]);
    } else {
      setStep("ask");
    }
    // Nur bei Öffnen / Kontextwechsel laden — nicht bei jedem Render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open gate
  }, [open, anfrageId, auftragId, art, autoSkipAsk]);

  async function handleJa() {
    await loadPreview([]);
  }

  async function saveFehlendAndContinue() {
    setError(null);

    await runUpload(async () => {
      const needsFirma = preview?.missingFields.some((f) => f.scope === "firmendaten");
      if (needsFirma) {
        const fd = new FormData();
        fd.set("firma", firma.trim());
        fd.set("inhaber", firma.trim() || "Inhaber");
        fd.set("strasse", strasse.trim());
        fd.set("hausnummer", hausnummer.trim());
        fd.set("plz", plz.trim());
        fd.set("ort", ort.trim());
        fd.set("telefon", telefon.trim());
        if (steuernummer.trim()) fd.set("steuernummer", steuernummer.trim());
        if (ustid.trim()) fd.set("ustid", ustid.trim());
        if (iban.trim()) fd.set("iban", iban.trim());
        const saved = await updatePartnerProfil(fd);
        if (!saved.ok) {
          setError(saved.error);
          return;
        }
      }

      const res = await previewPartnerAutoDokument({
        anfrageId,
        auftragId,
        art,
        overrides,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPreview(res.preview);
      setDokumentNr(res.preview.dokumentNr);
      if (res.preview.missingFields.length > 0) {
        setError(
          `Noch fehlend: ${res.preview.missingFields.map((m) => m.label).join(", ")}.`
        );
        return;
      }
      setStep("preview");
    });
  }

  async function onSubmit() {
    if (!preview?.canSubmit && preview?.missingFields.length) return;
    const nr = dokumentNr.trim();
    if (!nr) {
      setError(
        art === "rechnung"
          ? "Bitte deine Rechnungsnummer eintragen."
          : "Bitte eine Angebotsnummer eintragen."
      );
      return;
    }
    setError(null);
    await runUpload(async () => {
      const res =
        art === "angebot"
          ? await submitPartnerAutoAngebot(String(anfrageId ?? preview?.anfrageId ?? ""), {
              dokumentNr: nr,
              overrides,
            })
          : await submitPartnerAutoRechnung({
              anfrageId,
              auftragId,
              leistungsZeitraum,
              dokumentNr: nr,
              overrides,
            });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (art === "angebot") {
        partnerPortalToast.unterlagenHochgeladen();
      } else {
        partnerPortalToast.rechnungEingereicht();
      }
      router.refresh();
      onSuccess();
    });
  }

  const title =
    step === "ask"
      ? art === "angebot"
        ? "Angebot automatisch erstellen?"
        : "Rechnung automatisch erstellen?"
      : step === "fehlend"
        ? "Fehlende Daten ergänzen"
        : art === "angebot"
          ? "Angebot prüfen"
          : "Rechnung absenden";

  const subtitle =
    step === "ask"
      ? "Aus Firmendaten und Leistungen — sichtbar bei dir und bei Bärenwald unter Dokumente."
      : step === "fehlend"
        ? "Angaben werden in deinen Firmendaten gespeichert."
        : art === "angebot"
          ? "So sieht dein Angebot aus — Nummer kannst du noch anpassen."
          : "So sieht deine Rechnung aus — nur die Nummer kannst du noch anpassen, dann Absenden.";

  const firmMissingKeys = new Set(
    (preview?.missingFields ?? [])
      .filter((f) => f.scope === "firmendaten")
      .map((f) => f.key)
  );
  const regieFields = (preview?.missingFields ?? []).filter(
    (f) => f.scope === "regie"
  );
  const regieByPos = useMemo(() => {
    const map = new Map<string, typeof regieFields>();
    for (const f of regieFields) {
      if (!f.positionId) continue;
      const list = map.get(f.positionId) ?? [];
      list.push(f);
      map.set(f.positionId, list);
    }
    return map;
  }, [regieFields]);

  return (
    <PortalModalShell
      open={open}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      variant={step === "fehlend" ? "edit" : "preview"}
      maxWidth={step === "preview" ? 640 : 560}
      closeOnBackdrop={false}
      busy={loading}
      busyTitle={
        art === "rechnung" ? "Rechnung wird verarbeitet…" : "Dokument wird verarbeitet…"
      }
      busyBody="Einen Moment bitte."
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
          {step === "ask" ? (
            <div className="space-y-3">
              <p className="text-[14px] leading-relaxed" style={{ color: PORTAL_VAR.sub }}>
                {art === "angebot"
                  ? "Wir erstellen automatisch dein Angebot an Bärenwald. Es erscheint unter Dokumente bei dir und bei Bärenwald."
                  : "Wir erstellen automatisch deine Rechnung. Regiepositionen rechnen wir aus erfasster Zeit × hinterlegtem Stundensatz."}
              </p>
              <p className="text-[12.5px]" style={{ color: PORTAL_VAR.faint }}>
                Fehlende Pflichtangaben kannst du im nächsten Schritt nachtragen.
                Mit „Nein“ gehst du ohne automatisches Dokument weiter — die Frage kommt beim nächsten Mal erneut.
              </p>
            </div>
          ) : null}

          {step === "fehlend" && preview ? (
            <div className="space-y-4">
              {firmMissingKeys.size > 0 ? (
                <div className="space-y-3">
                  <p className="text-[12px] font-bold uppercase tracking-wide text-text-tertiary">
                    Firmendaten
                  </p>
                  {(firmMissingKeys.has("firma") ||
                    firmMissingKeys.has("Firmenname")) && (
                    <label className="block space-y-1">
                      <span className="text-[12px] font-semibold text-text-tertiary">
                        Firmenname *
                      </span>
                      <input
                        value={firma}
                        onChange={(e) => setFirma(e.target.value)}
                        className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                      />
                    </label>
                  )}
                  {(firmMissingKeys.has("anschrift") ||
                    firmMissingKeys.has("Anschrift (Straße, PLZ, Ort)") ||
                    firmMissingKeys.has("Anschrift (Straße + PLZ/Ort)")) && (
                    <>
                      <label className="block space-y-1">
                        <span className="text-[12px] font-semibold text-text-tertiary">
                          Straße *
                        </span>
                        <input
                          value={strasse}
                          onChange={(e) => setStrasse(e.target.value)}
                          className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-[12px] font-semibold text-text-tertiary">
                          Hausnummer
                        </span>
                        <input
                          value={hausnummer}
                          onChange={(e) => setHausnummer(e.target.value)}
                          className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-[12px] font-semibold text-text-tertiary">
                          PLZ *
                        </span>
                        <input
                          value={plz}
                          onChange={(e) => setPlz(e.target.value)}
                          className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-[12px] font-semibold text-text-tertiary">
                          Ort *
                        </span>
                        <input
                          value={ort}
                          onChange={(e) => setOrt(e.target.value)}
                          className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                        />
                      </label>
                    </>
                  )}
                  {firmMissingKeys.has("telefon") ||
                  firmMissingKeys.has("Telefon") ? (
                    <label className="block space-y-1">
                      <span className="text-[12px] font-semibold text-text-tertiary">
                        Telefon *
                      </span>
                      <input
                        value={telefon}
                        onChange={(e) => setTelefon(e.target.value)}
                        className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                      />
                    </label>
                  ) : null}
                  {(firmMissingKeys.has("steuer") ||
                    firmMissingKeys.has("Steuernummer oder USt-IdNr.")) && (
                    <>
                      <label className="block space-y-1">
                        <span className="text-[12px] font-semibold text-text-tertiary">
                          Steuernummer
                        </span>
                        <input
                          value={steuernummer}
                          onChange={(e) => setSteuernummer(e.target.value)}
                          className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-[12px] font-semibold text-text-tertiary">
                          USt-IdNr.
                        </span>
                        <input
                          value={ustid}
                          onChange={(e) => setUstid(e.target.value)}
                          className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                        />
                      </label>
                    </>
                  )}
                  {firmMissingKeys.has("iban") || firmMissingKeys.has("IBAN") ? (
                    <label className="block space-y-1">
                      <span className="text-[12px] font-semibold text-text-tertiary">
                        IBAN *
                      </span>
                      <input
                        value={iban}
                        onChange={(e) => setIban(e.target.value)}
                        className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                      />
                    </label>
                  ) : null}
                </div>
              ) : null}

              {Array.from(regieByPos.entries()).map(([pid, fields]) => {
                const draft = regieDraft[pid] ?? {
                  titel: "",
                  beschreibung: "",
                  zeitMin: "",
                  satz: "",
                };
                return (
                  <div
                    key={pid}
                    className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/40 p-3"
                  >
                    <p className="text-[13px] font-bold text-amber-950">
                      Regieposition
                    </p>
                    {fields.some((f) => f.key.startsWith("regie_titel")) ? (
                      <label className="block space-y-1">
                        <span className="text-[12px] font-semibold text-text-tertiary">
                          Titel *
                        </span>
                        <input
                          value={draft.titel}
                          onChange={(e) =>
                            setRegieDraft((prev) => ({
                              ...prev,
                              [pid]: { ...draft, titel: e.target.value },
                            }))
                          }
                          className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                        />
                      </label>
                    ) : null}
                    <label className="block space-y-1">
                      <span className="text-[12px] font-semibold text-text-tertiary">
                        Beschreibung
                      </span>
                      <textarea
                        value={draft.beschreibung}
                        onChange={(e) =>
                          setRegieDraft((prev) => ({
                            ...prev,
                            [pid]: { ...draft, beschreibung: e.target.value },
                          }))
                        }
                        rows={2}
                        className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                      />
                    </label>
                    {fields.some((f) => f.key.startsWith("regie_zeit")) ? (
                      <label className="block space-y-1">
                        <span className="text-[12px] font-semibold text-text-tertiary">
                          Zeit (Minuten) *
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={draft.zeitMin}
                          onChange={(e) =>
                            setRegieDraft((prev) => ({
                              ...prev,
                              [pid]: { ...draft, zeitMin: e.target.value },
                            }))
                          }
                          className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                        />
                      </label>
                    ) : null}
                    {fields.some((f) => f.key.startsWith("regie_satz")) ? (
                      <label className="block space-y-1">
                        <span className="text-[12px] font-semibold text-text-tertiary">
                          Stundensatz (€) *
                        </span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={draft.satz}
                          onChange={(e) =>
                            setRegieDraft((prev) => ({
                              ...prev,
                              [pid]: { ...draft, satz: e.target.value },
                            }))
                          }
                          className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                        />
                      </label>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {step === "preview" ? (
            <>
              {preview ? (
                <RechnungDokumentVorschau
                  art={art}
                  preview={preview}
                  dokumentNr={dokumentNr}
                  onDokumentNrChange={setDokumentNr}
                  leistungsZeitraum={leistungsZeitraum}
                />
              ) : null}
            </>
          ) : null}

          {error ? <PartnerDetailError message={error} /> : null}
        </div>

        <div
          className="portal-action-row shrink-0 border-t pt-3"
          style={{ borderColor: PORTAL_VAR.line2 }}
        >
          {step === "ask" ? (
            <>
              {allowSkip ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={onClose}
                  className="portal-action-btn portal-action-btn--secondary"
                >
                  {cancelLabel}
                </button>
              ) : null}
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleJa()}
                className="portal-action-btn portal-action-btn--primary"
              >
                {loading ? "Prüfe…" : "Ja, erstellen"}
              </button>
            </>
          ) : null}

          {step === "fehlend" ? (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="portal-action-btn portal-action-btn--secondary"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void saveFehlendAndContinue()}
                className="portal-action-btn portal-action-btn--primary"
              >
                {loading ? "Speichern…" : "Weiter zur Vorschau"}
              </button>
            </>
          ) : null}

          {step === "preview" ? (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="portal-action-btn portal-action-btn--secondary"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={
                  loading ||
                  !preview ||
                  preview.missingFields.length > 0 ||
                  !dokumentNr.trim()
                }
                onClick={() => void onSubmit()}
                className="portal-action-btn portal-action-btn--primary"
              >
                {previewSubmitLabel}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </PortalModalShell>
  );
}
