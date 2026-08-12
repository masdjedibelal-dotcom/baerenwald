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
import type { AutoDocRegieOverride } from "@/lib/partner/partner-auto-doc-positionen";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { partnerPortalToast } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

function fmtEur(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

type Step = "ask" | "fehlend" | "preview";

type Props = {
  open: boolean;
  anfrageId: string;
  art: "angebot" | "rechnung";
  leistungsZeitraum?: string;
  onClose: () => void;
  onSuccess: () => void;
  /** Optional: ohne Dokument weiter (Nein). */
  allowSkip?: boolean;
  /** Direkt Preview/fehlende Daten laden (ohne Ja/Nein). Default: true bei Rechnung. */
  skipAsk?: boolean;
};

/**
 * Auto-Dokument: optional Ja/Nein → ggf. fehlende Daten → Preview → Submit.
 * Parent steuert `open` (z. B. Sticky-CTA Rechnung).
 */
export function PartnerDokumentPreviewModal({
  open,
  anfrageId,
  art,
  leistungsZeitraum,
  onClose,
  onSuccess,
  allowSkip = true,
  skipAsk,
}: Props) {
  const router = useRouter();
  const autoSkipAsk = skipAsk ?? art === "rechnung";
  const [step, setStep] = useState<Step>(autoSkipAsk ? "preview" : "ask");
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
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

  async function loadPreview(withOverrides: AutoDocRegieOverride[] = []) {
    setLoading(true);
    setError(null);
    setPreviewLoading(true);
    const res = await previewPartnerAutoDokument({
      anfrageId,
      art,
      overrides: withOverrides,
    });
    setPreviewLoading(false);
    setLoading(false);
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

    if (res.preview.missingFields.length > 0) {
      setStep("fehlend");
    } else {
      setStep("preview");
    }
    return true;
  }

  useEffect(() => {
    if (!open) {
      setStep(autoSkipAsk ? "preview" : "ask");
      setError(null);
      setPreview(null);
      setDokumentNr("");
      setRegieDraft({});
      setPreviewLoading(false);
      setLoading(false);
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
  }, [open, anfrageId, art, autoSkipAsk]);

  async function handleJa() {
    await loadPreview([]);
  }

  async function saveFehlendAndContinue() {
    setLoading(true);
    setError(null);

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
        setLoading(false);
        setError(saved.error);
        return;
      }
    }

    const res = await previewPartnerAutoDokument({
      anfrageId,
      art,
      overrides,
    });
    setLoading(false);
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
    setLoading(true);
    setError(null);
    const res =
      art === "angebot"
        ? await submitPartnerAutoAngebot(anfrageId, {
            dokumentNr: nr,
            overrides,
          })
        : await submitPartnerAutoRechnung({
            anfrageId,
            leistungsZeitraum,
            dokumentNr: nr,
            overrides,
          });
    setLoading(false);
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
          : "Rechnung prüfen";

  const subtitle =
    step === "ask"
      ? "Aus Firmendaten und Leistungen — sichtbar bei dir und bei Bärenwald unter Dokumente."
      : step === "fehlend"
        ? "Angaben werden in deinen Firmendaten gespeichert."
        : art === "angebot"
          ? "Aus Firmendaten und bestätigten Konditionen"
          : "Rechnungsnummer frei wählbar — Vorschlag aus deinem Nummerkreis.";

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
      maxWidth={560}
      closeOnBackdrop={false}
      busy={loading || previewLoading}
      onConfirm={() => {
        if (step === "ask") void handleJa();
        else if (step === "fehlend") void saveFehlendAndContinue();
        else void onSubmit();
      }}
      confirmDisabled={
        loading ||
        previewLoading ||
        (step === "preview" &&
          (!preview ||
            preview.missingFields.length > 0 ||
            !dokumentNr.trim()))
      }
      confirmLabel={
        step === "ask"
          ? "Ja, erstellen"
          : step === "fehlend"
            ? "Weiter zur Vorschau"
            : art === "angebot"
              ? "Angebot bestätigen"
              : "Rechnung einreichen"
      }
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
              {previewLoading ? (
                <p className="text-[13px]" style={{ color: PORTAL_VAR.sub }}>
                  Vorschau wird geladen…
                </p>
              ) : null}

              {preview ? (
                <>
                  <div
                    className="space-y-3 rounded-xl p-3"
                    style={{ border: `1px solid ${PORTAL_VAR.line}` }}
                  >
                    <label className="block space-y-1.5">
                      <span
                        className="text-[12px] font-semibold"
                        style={{ color: PORTAL_VAR.faint }}
                      >
                        {art === "angebot"
                          ? "Angebotsnummer *"
                          : "Deine Rechnungsnummer *"}
                      </span>
                      <input
                        type="text"
                        value={dokumentNr}
                        onChange={(e) => setDokumentNr(e.target.value)}
                        className="portal-input w-full font-semibold"
                        autoComplete="off"
                      />
                    </label>
                    <p className="text-[13px]" style={{ color: PORTAL_VAR.sub }}>
                      {preview.betreff}
                      {preview.objektOrt ? ` · ${preview.objektOrt}` : ""}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p
                      className="text-[11px] font-semibold uppercase tracking-wide"
                      style={{ color: PORTAL_VAR.faint }}
                    >
                      Positionen
                    </p>
                    {preview.positionen.map((p, i) => (
                      <div
                        key={`${p.titel}-${i}`}
                        className="rounded-lg px-3 py-2"
                        style={{ border: `1px solid ${PORTAL_VAR.line2}` }}
                      >
                        <div className="flex justify-between gap-3">
                          <span
                            className="text-[13px] font-semibold"
                            style={{ color: PORTAL_VAR.ink }}
                          >
                            {p.titel}
                            {p.menge != null && p.einheit
                              ? ` · ${p.menge} ${p.einheit}`
                              : ""}
                          </span>
                          <span
                            className="shrink-0 text-[13px] font-semibold"
                            style={{ color: PORTAL_VAR.ink }}
                          >
                            {fmtEur(p.netto)}
                          </span>
                        </div>
                        {p.beschreibung ? (
                          <p
                            className="mt-1 whitespace-pre-wrap text-[12px]"
                            style={{ color: PORTAL_VAR.sub }}
                          >
                            {p.beschreibung}
                          </p>
                        ) : null}
                      </div>
                    ))}
                    <p
                      className="pt-1 text-right text-[14px] font-semibold"
                      style={{ color: PORTAL_VAR.ink }}
                    >
                      Netto {fmtEur(preview.nettoSumme)}
                    </p>
                  </div>
                </>
              ) : null}
            </>
          ) : null}

          {error ? <PartnerDetailError message={error} /> : null}
        </div>

        <div
          className="flex shrink-0 flex-wrap gap-2 border-t pt-3"
          style={{ borderColor: PORTAL_VAR.line2 }}
        >
          {step === "ask" ? (
            <>
              {allowSkip ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={onClose}
                  className="rounded-[9px] border px-4 py-2.5 text-[13px] font-semibold"
                  style={{
                    borderColor: PORTAL_VAR.line,
                    color: PORTAL_VAR.sub,
                    background: "#fff",
                  }}
                >
                  {cancelLabel}
                </button>
              ) : null}
              <button
                type="button"
                disabled={loading || previewLoading}
                onClick={() => void handleJa()}
                className={cn(
                  "ml-auto flex-1 rounded-[9px] px-4 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-50 sm:flex-none"
                )}
                style={{ background: PORTAL_VAR.primary }}
              >
                {loading || previewLoading ? "Prüfe…" : "Ja, erstellen"}
              </button>
            </>
          ) : null}

          {step === "fehlend" ? (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="rounded-[9px] border px-4 py-2.5 text-[13px] font-semibold"
                style={{
                  borderColor: PORTAL_VAR.line,
                  color: PORTAL_VAR.sub,
                  background: "#fff",
                }}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void saveFehlendAndContinue()}
                className={cn(
                  "ml-auto flex-1 rounded-[9px] px-4 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-50 sm:flex-none"
                )}
                style={{ background: PORTAL_VAR.primary }}
              >
                {loading ? "Speichern…" : "Weiter zur Vorschau"}
              </button>
            </>
          ) : null}

          {step === "preview" ? (
            <>
              <button
                type="button"
                disabled={loading || previewLoading}
                onClick={onClose}
                className="rounded-[9px] border px-4 py-2.5 text-[13px] font-semibold"
                style={{
                  borderColor: PORTAL_VAR.line,
                  color: PORTAL_VAR.sub,
                  background: "#fff",
                }}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                disabled={
                  loading ||
                  previewLoading ||
                  !preview ||
                  preview.missingFields.length > 0 ||
                  !dokumentNr.trim()
                }
                onClick={() => void onSubmit()}
                className={cn(
                  "ml-auto flex-1 rounded-[9px] px-4 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-50 sm:flex-none"
                )}
                style={{ background: PORTAL_VAR.primary }}
              >
                {loading
                  ? art === "angebot"
                    ? "Wird erstellt…"
                    : "Wird eingereicht…"
                  : art === "angebot"
                    ? "Angebot erstellen & bestätigen"
                    : "Rechnung einreichen"}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </PortalModalShell>
  );
}
