"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import { submitPartnerAbnahmeNachSignatur } from "@/app/actions/partner-abnahmeprotokoll";
import { PartnerDetailError } from "@/components/partner/PartnerDetailUi";
import { PartnerKiKorrekturField } from "@/components/partner/PartnerKiKorrekturField";
import { PortalContentBusy } from "@/components/shared/PortalContentBusy";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { SignatureCanvas } from "@/components/shared/SignatureCanvas";
import {
  autoAbnahmeErgebnis,
  mapPositionToAbnahmePunkt,
  newLocalId,
  PORTAL_ABNAHME_ERGEBNIS_LABEL,
  type PortalAbnahmeErgebnis,
  type PortalAbnahmeMangel,
  type PortalAbnahmePunkt,
} from "@/lib/partner/abnahme-types";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { partnerPortalToast } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

type LeistungOption = {
  id: string;
  leistung_name: string;
  beschreibung?: string | null;
  gewerk_name?: string | null;
  /** offen | in_arbeit | erledigt */
  leistung_status?: string | null;
};

type Step = "leistungen" | "signatur";

type Props = {
  open: boolean;
  auftragId: string;
  auftragTitel?: string | null;
  leistungItems: LeistungOption[];
  defaultOrt?: string;
  onClose: () => void;
  onSuccess: (result: {
    vollstaendig: boolean;
    pdf_url: string | null;
    protokoll_id: string | null;
  }) => void;
};

type AddMode = "wahl" | "leer" | "erkannt" | "mangel" | null;

const ERGEBNIS_OPTIONS: PortalAbnahmeErgebnis[] = [
  "abgenommen",
  "mit_vorbehalt",
  "verweigert",
];

export function PartnerAbnahmeAbschlussSheet({
  open,
  auftragId,
  auftragTitel,
  leistungItems,
  defaultOrt = "",
  onClose,
  onSuccess,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("leistungen");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [punkte, setPunkte] = useState<PortalAbnahmePunkt[]>([]);
  const [maengel, setMaengel] = useState<PortalAbnahmeMangel[]>([]);
  const [ort, setOrt] = useState(defaultOrt);
  const [abnahmeDatum, setAbnahmeDatum] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [projektbezeichnung, setProjektbezeichnung] = useState(
    () => auftragTitel?.trim() || ""
  );
  const [vertreter, setVertreter] = useState("");
  const [ergebnis, setErgebnis] = useState<PortalAbnahmeErgebnis>("abgenommen");
  const [ergebnisTouched, setErgebnisTouched] = useState(false);
  const [notizen, setNotizen] = useState("");

  const [addMode, setAddMode] = useState<AddMode>(null);
  const [draftTitel, setDraftTitel] = useState("");
  const [draftBeschreibung, setDraftBeschreibung] = useState("");
  const [draftFrist, setDraftFrist] = useState("");
  const [draftLeistungId, setDraftLeistungId] = useState<string | null>(null);

  const [hwName, setHwName] = useState("");
  const [kundeName, setKundeName] = useState("");
  const [hwSig, setHwSig] = useState<string | null>(null);
  const [hwHasSig, setHwHasSig] = useState(false);
  const [kundeSig, setKundeSig] = useState<string | null>(null);
  const [kundeHasSig, setKundeHasSig] = useState(false);

  const undokumentiertePositionen = useMemo(
    () =>
      leistungItems.filter(
        (l) => String(l.leistung_status ?? "offen").toLowerCase() !== "erledigt"
      ),
    [leistungItems]
  );

  useEffect(() => {
    if (!open) return;
    setStep("leistungen");
    setLoading(false);
    setError(null);
    const erledigt = leistungItems.filter(
      (l) => String(l.leistung_status ?? "").toLowerCase() === "erledigt"
    );
    setPunkte(erledigt.map(mapPositionToAbnahmePunkt));
    setMaengel([]);
    setOrt(defaultOrt);
    setAbnahmeDatum(new Date().toISOString().slice(0, 10));
    setProjektbezeichnung(auftragTitel?.trim() || "");
    setVertreter("");
    setErgebnis(autoAbnahmeErgebnis(0));
    setErgebnisTouched(false);
    setNotizen("");
    setAddMode(null);
    setHwName("");
    setKundeName("");
    setHwSig(null);
    setHwHasSig(false);
    setKundeSig(null);
    setKundeHasSig(false);
    // Nur beim Öffnen vorbefüllen — nicht bei jedem Parent-Rerender
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open gate
  }, [open]);

  useEffect(() => {
    if (ergebnisTouched) return;
    setErgebnis(autoAbnahmeErgebnis(maengel.length));
  }, [maengel.length, ergebnisTouched]);

  const usedLeistungIds = useMemo(
    () => new Set(punkte.map((p) => p.leistung_id).filter(Boolean) as string[]),
    [punkte]
  );

  const availableLeistungen = useMemo(
    () => leistungItems.filter((l) => !usedLeistungIds.has(l.id)),
    [leistungItems, usedLeistungIds]
  );

  function resetDraft() {
    setDraftTitel("");
    setDraftBeschreibung("");
    setDraftFrist("");
    setDraftLeistungId(null);
    setAddMode(null);
  }

  function addLeerLeistung(): boolean {
    const titel = draftTitel.trim();
    if (!titel) {
      setError("Titel der Leistung fehlt.");
      return false;
    }
    setPunkte((prev) => [
      ...prev,
      {
        id: newLocalId("ok"),
        leistung_name: titel,
        beschreibung: draftBeschreibung,
        status: "ok",
        leistung_id: null,
        gewerk: "Ohne Gewerk",
      },
    ]);
    setDraftTitel("");
    setDraftBeschreibung("");
    setDraftFrist("");
    setDraftLeistungId(null);
    setAddMode("leer");
    setError(null);
    return true;
  }

  function addErkanntLeistung(): boolean {
    const opt = leistungItems.find((l) => l.id === draftLeistungId);
    if (!opt) {
      setError("Bitte eine Leistung wählen.");
      return false;
    }
    setPunkte((prev) => [
      ...prev,
      {
        id: newLocalId("ok"),
        leistung_id: opt.id,
        leistung_name: draftTitel.trim() || opt.leistung_name,
        beschreibung: draftBeschreibung,
        status: "ok",
        gewerk: opt.gewerk_name?.trim() || "Ohne Gewerk",
      },
    ]);
    setDraftTitel("");
    setDraftBeschreibung("");
    setDraftFrist("");
    setDraftLeistungId(null);
    setAddMode("wahl");
    setError(null);
    return true;
  }

  function addMangel(): boolean {
    const titel = draftTitel.trim();
    if (!titel) {
      setError("Mangel-Titel fehlt.");
      return false;
    }
    const id = newLocalId("m");
    setMaengel((prev) => [
      ...prev,
      {
        id,
        punkt_id: id,
        titel,
        beschreibung: draftBeschreibung,
        frist: draftFrist.trim() || null,
        status: "offen",
      },
    ]);
    setDraftTitel("");
    setDraftBeschreibung("");
    setDraftFrist("");
    setDraftLeistungId(null);
    setAddMode("mangel");
    setError(null);
    return true;
  }

  function goSignatur() {
    if (!punkte.length) {
      setError("Mindestens eine abgeschlossene Leistung hinzufügen.");
      return;
    }
    if (!projektbezeichnung.trim()) {
      setError("Projektbezeichnung ist Pflicht.");
      return;
    }
    if (!abnahmeDatum.trim()) {
      setError("Abnahmedatum fehlt.");
      return;
    }
    if (!ort.trim()) {
      setError("Ort der Abnahme ist Pflicht.");
      return;
    }
    if (!vertreter.trim()) {
      setError("Vertreter (Auftragnehmer) ist Pflicht.");
      return;
    }
    setError(null);
    if (!hwName.trim()) setHwName(vertreter.trim());
    setStep("signatur");
  }

  const hwNameOk = hwName.trim().length >= 3;
  const kundeNameOk = kundeName.trim().length >= 3;
  const canSubmit =
    hwNameOk &&
    kundeNameOk &&
    hwHasSig &&
    kundeHasSig &&
    Boolean(hwSig?.trim()) &&
    Boolean(kundeSig?.trim());

  function submitBlockReason(): string | null {
    if (!hwNameOk) return "Bitte den vollen Namen des Handwerkers ausschreiben (mind. 3 Zeichen).";
    if (!hwHasSig || !hwSig?.trim()) return "Bitte die Handwerker-Signatur zeichnen.";
    if (!kundeNameOk) return "Bitte den vollen Namen des Kunden ausschreiben (mind. 3 Zeichen).";
    if (!kundeHasSig || !kundeSig?.trim()) return "Bitte die Kunden-Signatur erfassen.";
    return null;
  }

  async function submit() {
    const block = submitBlockReason();
    if (block) {
      setError(block);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await submitPartnerAbnahmeNachSignatur({
        auftragId,
        abnahmeDatum,
        ort,
        projektbezeichnung: projektbezeichnung.trim(),
        vertreter: vertreter.trim(),
        abnahmeErgebnis: ergebnis,
        notizen: notizen.trim() || null,
        punkte,
        maengel,
        hwUnterschriftName: hwName,
        kundeUnterschriftName: kundeName,
        hwSignaturPng: hwSig,
        kundeSignaturPng: kundeSig,
      });
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
      partnerPortalToast.abschlussSigniert();
      router.refresh();
      onSuccess({
        vollstaendig: res.vollstaendig,
        pdf_url: res.pdf_url,
        protokoll_id: res.protokoll_id,
      });
      // Loading bleibt bis Sheet schließt — kein Formular-Flackern.
    } catch {
      setError("Abschluss fehlgeschlagen. Bitte erneut versuchen.");
      setLoading(false);
    }
  }

  const dirty =
    !loading &&
    (punkte.length > 0 ||
      maengel.length > 0 ||
      notizen.trim().length > 0 ||
      projektbezeichnung.trim().length > 0 ||
      vertreter.trim().length > 0 ||
      hwHasSig ||
      kundeHasSig);

  return (
    <PortalModalShell
      open={open}
      title={
        loading
          ? "Protokoll wird erstellt"
          : step === "leistungen"
            ? "Teilabnahme abschließen"
            : "Kunden-Signatur"
      }
      subtitle={
        loading
          ? "Bitte warten — danach kehren Sie zum Vorgang zurück"
          : step === "leistungen"
            ? "Ihre Leistungen und optional Mängel — danach Freigabe durch Bärenwald"
            : "Kunde und Handwerker unterschreiben vor Ort"
      }
      onClose={() => {
        if (loading) return;
        onClose();
      }}
      variant="funnel"
      dirty={dirty}
      closeOnBackdrop={!loading}
    >
      {loading ? (
        <PortalContentBusy
          title="Abnahmedokument wird abgeschlossen…"
          body="Signaturen werden gespeichert und das Protokoll erstellt. Danach öffnet sich der Vorgang mit dem neuen Status."
        />
      ) : (
      <div className="space-y-5 pb-4">
        {error ? <PartnerDetailError message={error} /> : null}

        {step === "leistungen" ? (
          <>
            {undokumentiertePositionen.length > 0 ? (
              <p
                className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-950"
                role="status"
              >
                {undokumentiertePositionen.length === 1
                  ? "1 Position ist noch nicht erledigt/dokumentiert."
                  : `${undokumentiertePositionen.length} Positionen sind noch nicht erledigt/dokumentiert.`}{" "}
                Sie können trotzdem abschließen — bitte prüfen, ob alle Leistungen
                im Protokoll stehen.
              </p>
            ) : null}

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3
                  className="text-[15px] font-bold"
                  style={{ color: PORTAL_VAR.ink }}
                >
                  Abgeschlossene Leistungen
                </h3>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold"
                  style={{ borderColor: PORTAL_VAR.line, color: PORTAL_VAR.primary }}
                  onClick={() => setAddMode("wahl")}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Hinzufügen
                </button>
              </div>

              {punkte.length === 0 ? (
                <p className="text-[13px]" style={{ color: PORTAL_VAR.sub }}>
                  Erledigte Positionen werden vorausgefüllt. Sonst:
                  einsprechen oder tippen → hinzufügen.
                </p>
              ) : (
                <ul className="space-y-2">
                  {punkte.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-xl border border-border-light bg-white px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <input
                          value={p.leistung_name}
                          onChange={(e) =>
                            setPunkte((prev) =>
                              prev.map((x) =>
                                x.id === p.id
                                  ? { ...x, leistung_name: e.target.value }
                                  : x
                              )
                            )
                          }
                          className="portal-input w-full rounded-lg border border-border-default px-2 py-1.5 text-[14px] font-semibold"
                        />
                        <button
                          type="button"
                          aria-label="Entfernen"
                          className="shrink-0 p-1 text-text-tertiary"
                          onClick={() =>
                            setPunkte((prev) => prev.filter((x) => x.id !== p.id))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <PartnerKiKorrekturField
                        scope="abnahmeprotokoll"
                        className="mt-2"
                        value={p.beschreibung}
                        onChange={(v) =>
                          setPunkte((prev) =>
                            prev.map((x) =>
                              x.id === p.id ? { ...x, beschreibung: v } : x
                            )
                          )
                        }
                        rows={2}
                        auftragTitel={auftragTitel}
                        leistungName={p.leistung_name}
                        placeholder="Beschreibung (optional)"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3 border-t border-border-light pt-4">
              <div className="flex items-center justify-between gap-2">
                <h3
                  className="text-[15px] font-bold"
                  style={{ color: PORTAL_VAR.ink }}
                >
                  Mängel
                </h3>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold"
                  style={{ borderColor: PORTAL_VAR.line, color: PORTAL_VAR.primary }}
                  onClick={() => {
                    resetDraft();
                    setAddMode("mangel");
                  }}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Hinzufügen
                </button>
              </div>
              {maengel.length === 0 ? (
                <p className="text-[13px]" style={{ color: PORTAL_VAR.sub }}>
                  Keine Mängel — Abnahme ohne Vorbehalt ist in Ordnung.
                </p>
              ) : (
                <ul className="space-y-2">
                  {maengel.map((m) => (
                    <li
                      key={m.id}
                      className="rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <input
                          value={m.titel}
                          onChange={(e) =>
                            setMaengel((prev) =>
                              prev.map((x) =>
                                x.id === m.id
                                  ? { ...x, titel: e.target.value }
                                  : x
                              )
                            )
                          }
                          className="portal-input w-full rounded-lg border border-border-default bg-white px-2 py-1.5 text-[14px] font-semibold"
                        />
                        <button
                          type="button"
                          aria-label="Entfernen"
                          className="shrink-0 p-1 text-text-tertiary"
                          onClick={() =>
                            setMaengel((prev) => prev.filter((x) => x.id !== m.id))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <PartnerKiKorrekturField
                        scope="abnahmeprotokoll"
                        className="mt-2"
                        value={m.beschreibung}
                        onChange={(v) =>
                          setMaengel((prev) =>
                            prev.map((x) =>
                              x.id === m.id ? { ...x, beschreibung: v } : x
                            )
                          )
                        }
                        rows={2}
                        auftragTitel={auftragTitel}
                        leistungName={m.titel}
                        placeholder="Mangel beschreiben — einsprechen oder tippen"
                      />
                      {m.frist ? (
                        <p className="mt-1 text-[12px] text-text-tertiary">
                          Frist: {m.frist}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <label className="block space-y-1">
              <span className="text-[12px] font-semibold text-text-tertiary">
                Projektbezeichnung *
              </span>
              <input
                value={projektbezeichnung}
                onChange={(e) => setProjektbezeichnung(e.target.value)}
                placeholder="z. B. Auftrags- oder Objektname"
                className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                required
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-[12px] font-semibold text-text-tertiary">
                  Abnahmedatum *
                </span>
                <input
                  type="date"
                  value={abnahmeDatum}
                  onChange={(e) => setAbnahmeDatum(e.target.value)}
                  className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                  required
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[12px] font-semibold text-text-tertiary">
                  Ort *
                </span>
                <input
                  value={ort}
                  onChange={(e) => setOrt(e.target.value)}
                  placeholder="Ort der Abnahme"
                  className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                  required
                />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-[12px] font-semibold text-text-tertiary">
                Vertreter (Auftragnehmer) *
              </span>
              <input
                value={vertreter}
                onChange={(e) => setVertreter(e.target.value)}
                placeholder="Name des Vertreters vor Ort"
                className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                required
              />
            </label>

            <fieldset className="space-y-2">
              <legend className="text-[12px] font-semibold text-text-tertiary">
                Ergebnis (optional)
              </legend>
              <div className="flex flex-wrap gap-2">
                {ERGEBNIS_OPTIONS.map((key) => (
                  <label
                    key={key}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold",
                      ergebnis === key
                        ? "border-accent bg-accent-light text-text-primary"
                        : "border-border-light bg-white text-text-secondary"
                    )}
                  >
                    <input
                      type="radio"
                      name="abnahme_ergebnis"
                      value={key}
                      checked={ergebnis === key}
                      className="sr-only"
                      onChange={() => {
                        setErgebnisTouched(true);
                        setErgebnis(key);
                      }}
                    />
                    {PORTAL_ABNAHME_ERGEBNIS_LABEL[key]}
                  </label>
                ))}
              </div>
              <p className="text-[12px]" style={{ color: PORTAL_VAR.faint }}>
                Standard aus Mängeln:{" "}
                {PORTAL_ABNAHME_ERGEBNIS_LABEL[autoAbnahmeErgebnis(maengel.length)]}
              </p>
            </fieldset>

            <PartnerKiKorrekturField
              scope="abnahmeprotokoll"
              label="Interne Notiz (optional)"
              value={notizen}
              onChange={setNotizen}
              rows={2}
              auftragTitel={auftragTitel}
              placeholder="Kurz notieren oder einsprechen"
            />

            <button
              type="button"
              className="portal-action-btn portal-action-btn--primary portal-action-btn--block"
              onClick={goSignatur}
            >
              Zur Kunden-Signatur
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="text-[13px] font-semibold text-text-secondary underline"
              onClick={() => setStep("leistungen")}
            >
              ← Zurück zu Leistungen
            </button>

            <label className="block space-y-1.5">
              <span className="text-[12px] font-semibold text-text-tertiary">
                Name Handwerker *
              </span>
              <input
                value={hwName}
                onChange={(e) => setHwName(e.target.value)}
                className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
              />
            </label>
            <div>
              <p className="mb-1.5 text-[12px] font-semibold text-text-tertiary">
                Signatur Handwerker *
              </p>
              <SignatureCanvas
                onChange={(has, url) => {
                  setHwHasSig(has);
                  setHwSig(url);
                }}
              />
            </div>

            <label className="block space-y-1.5">
              <span className="text-[12px] font-semibold text-text-tertiary">
                Name Kunde *
              </span>
              <input
                value={kundeName}
                onChange={(e) => setKundeName(e.target.value)}
                className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
              />
            </label>
            <div>
              <p className="mb-1.5 text-[12px] font-semibold text-text-tertiary">
                Signatur Kunde *
              </p>
              <SignatureCanvas
                onChange={(has, url) => {
                  setKundeHasSig(has);
                  setKundeSig(url);
                }}
              />
            </div>

            <button
              type="button"
              className="portal-action-btn portal-action-btn--primary portal-action-btn--block"
              disabled={!canSubmit}
              onClick={() => void submit()}
            >
              Signatur abschließen
            </button>
            {!canSubmit ? (
              <p className="text-center text-[12px]" style={{ color: PORTAL_VAR.faint }}>
                {submitBlockReason() ??
                  "Namen und beide Signaturen sind nötig, bevor Sie abschließen können."}
              </p>
            ) : null}
          </>
        )}
      </div>
      )}

      {addMode && !loading ? (
        <PortalModalShell
          open
          title={
            addMode === "wahl"
              ? "Leistung hinzufügen"
              : addMode === "mangel"
                ? "Mangel hinzufügen"
                : addMode === "erkannt"
                  ? "Leistung aus Auftrag"
                  : "Leere Leistung"
          }
          onClose={resetDraft}
          variant="edit"
          dirty={
            draftTitel.trim().length > 0 || draftBeschreibung.trim().length > 0
          }
          closeOnBackdrop
        >
          <div className="space-y-3">
            {addMode === "wahl" ? (
              <div className="space-y-2">
                <button
                  type="button"
                  className="portal-action-btn portal-action-btn--secondary portal-action-btn--block"
                  onClick={() => {
                    setDraftTitel("");
                    setDraftBeschreibung("");
                    setAddMode("leer");
                  }}
                >
                  Leer — freie Leistung
                </button>
                <button
                  type="button"
                  className="portal-action-btn portal-action-btn--primary portal-action-btn--block"
                  disabled={!availableLeistungen.length}
                  onClick={() => setAddMode("erkannt")}
                >
                  Erkannt — aus Auftrag
                </button>
                {!availableLeistungen.length ? (
                  <p className="text-[12px] text-text-tertiary">
                    Alle zugewiesenen Leistungen sind bereits hinzugefügt.
                  </p>
                ) : null}
              </div>
            ) : null}

            {addMode === "leer" || addMode === "mangel" ? (
              <div className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-[12px] font-semibold text-text-tertiary">
                    Titel *
                  </span>
                  <input
                    value={draftTitel}
                    onChange={(e) => setDraftTitel(e.target.value)}
                    className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                  />
                </label>
                <PartnerKiKorrekturField
                  scope="abnahmeprotokoll"
                  label="Beschreibung"
                  value={draftBeschreibung}
                  onChange={setDraftBeschreibung}
                  rows={3}
                  auftragTitel={auftragTitel}
                  leistungName={draftTitel}
                  placeholder="Einsprechen oder tippen — KI formuliert kundenfertig"
                />
                {addMode === "mangel" ? (
                  <label className="block space-y-1">
                    <span className="text-[12px] font-semibold text-text-tertiary">
                      Frist (optional)
                    </span>
                    <input
                      type="date"
                      value={draftFrist}
                      onChange={(e) => setDraftFrist(e.target.value)}
                      className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                    />
                  </label>
                ) : null}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    className="portal-action-btn portal-action-btn--primary portal-action-btn--block"
                    onClick={() =>
                      addMode === "mangel" ? addMangel() : addLeerLeistung()
                    }
                  >
                    Hinzufügen &amp; nächste
                  </button>
                  <button
                    type="button"
                    className="portal-action-btn portal-action-btn--secondary portal-action-btn--block"
                    onClick={() => {
                      const ok =
                        addMode === "mangel" ? addMangel() : addLeerLeistung();
                      if (ok) resetDraft();
                    }}
                  >
                    Hinzufügen &amp; fertig
                  </button>
                </div>
              </div>
            ) : null}

            {addMode === "erkannt" ? (
              <div className="space-y-3">
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {availableLeistungen.map((l) => (
                    <li key={l.id}>
                      <button
                        type="button"
                        className={cn(
                          "w-full rounded-lg border px-3 py-2.5 text-left text-[13.5px] font-semibold",
                          draftLeistungId === l.id
                            ? "border-accent bg-accent-light"
                            : "border-border-light bg-white"
                        )}
                        onClick={() => {
                          setDraftLeistungId(l.id);
                          setDraftTitel(l.leistung_name);
                          setDraftBeschreibung(l.beschreibung?.trim() || "");
                        }}
                      >
                        {l.leistung_name}
                        {String(l.leistung_status ?? "").toLowerCase() ===
                        "erledigt" ? (
                          <span className="mt-0.5 block text-[11.5px] font-medium text-text-tertiary">
                            dokumentiert
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
                {draftLeistungId ? (
                  <>
                    <label className="block space-y-1">
                      <span className="text-[12px] font-semibold text-text-tertiary">
                        Titel
                      </span>
                      <input
                        value={draftTitel}
                        onChange={(e) => setDraftTitel(e.target.value)}
                        className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                      />
                    </label>
                    <PartnerKiKorrekturField
                      scope="abnahmeprotokoll"
                      label="Beschreibung"
                      value={draftBeschreibung}
                      onChange={setDraftBeschreibung}
                      rows={3}
                      auftragTitel={auftragTitel}
                      leistungName={draftTitel}
                      placeholder="Einsprechen oder tippen — KI formuliert kundenfertig"
                    />
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        className="portal-action-btn portal-action-btn--primary portal-action-btn--block"
                        onClick={addErkanntLeistung}
                      >
                        Hinzufügen &amp; nächste
                      </button>
                      <button
                        type="button"
                        className="portal-action-btn portal-action-btn--secondary portal-action-btn--block"
                        onClick={() => {
                          if (addErkanntLeistung()) resetDraft();
                        }}
                      >
                        Hinzufügen &amp; fertig
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </PortalModalShell>
      ) : null}
    </PortalModalShell>
  );
}
