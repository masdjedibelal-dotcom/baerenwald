"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";

import { submitPartnerAbnahmeNachSignatur } from "@/app/actions/partner-abnahmeprotokoll";
import { PortalDetailError } from "@/components/shared/PortalDetailUi";
import { PartnerKiKorrekturField } from "@/components/partner/PartnerKiKorrekturField";
import { PortalContentBusy } from "@/components/shared/PortalContentBusy";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { usePortalRefresh } from "@/components/shared/usePortalRefresh";
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

const STEPS = [
  { id: "leistungen", label: "Leistungen" },
  { id: "maengel", label: "Mängel" },
  { id: "angaben", label: "Angaben" },
  { id: "sig_hw", label: "Ihre Signatur" },
  { id: "sig_kunde", label: "Kunde" },
] as const;

type Step = (typeof STEPS)[number]["id"];

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
    punkte_count: number;
    maengel_count: number;
  }) => void;
};

type AddMode = "wahl" | "leer" | "erkannt" | "mangel" | null;

const ERGEBNIS_OPTIONS: PortalAbnahmeErgebnis[] = [
  "abgenommen",
  "mit_vorbehalt",
  "verweigert",
];

function StepProgress({ stepIndex }: { stepIndex: number }) {
  return (
    <div className="mb-4 flex items-center gap-1.5" aria-hidden>
      {STEPS.map((s, i) => {
        const done = i < stepIndex;
        const act = i === stepIndex;
        return (
          <div key={s.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div
              className="h-1 w-full rounded-full"
              style={{
                background: done || act ? PORTAL_VAR.primary : PORTAL_VAR.line,
              }}
            />
            <span
              className="hidden truncate text-[10px] font-semibold sm:block"
              style={{ color: act ? PORTAL_VAR.ink : PORTAL_VAR.faint }}
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function PartnerAbnahmeAbschlussSheet({
  open,
  auftragId,
  auftragTitel,
  leistungItems,
  defaultOrt = "",
  onClose,
  onSuccess,
}: Props) {
  const { refresh } = usePortalRefresh();
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
  const [showNotiz, setShowNotiz] = useState(false);

  const [addMode, setAddMode] = useState<AddMode>(null);
  const [draftTitel, setDraftTitel] = useState("");
  const [draftBeschreibung, setDraftBeschreibung] = useState("");
  const [draftFrist, setDraftFrist] = useState("");
  const [draftLeistungId, setDraftLeistungId] = useState<string | null>(null);
  const [expandedPunktId, setExpandedPunktId] = useState<string | null>(null);

  const [hwName, setHwName] = useState("");
  const [kundeName, setKundeName] = useState("");
  const [hwSig, setHwSig] = useState<string | null>(null);
  const [hwHasSig, setHwHasSig] = useState(false);
  const [kundeSig, setKundeSig] = useState<string | null>(null);
  const [kundeHasSig, setKundeHasSig] = useState(false);

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const stepMeta = STEPS[stepIndex] ?? STEPS[0];

  const undokumentiertePositionen = useMemo(
    () =>
      leistungItems.filter(
        (l) => String(l.leistung_status ?? "offen").toLowerCase() !== "erledigt"
      ),
    [leistungItems]
  );

  useEffect(() => {
    if (!open) {
      setLoading(false);
      setError(null);
      return;
    }
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
    setShowNotiz(false);
    setAddMode(null);
    setExpandedPunktId(null);
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

  function goNext() {
    setError(null);
    if (step === "leistungen") {
      if (!punkte.length) {
        setError("Mindestens eine abgeschlossene Leistung hinzufügen.");
        return;
      }
      setStep("maengel");
      return;
    }
    if (step === "maengel") {
      setStep("angaben");
      return;
    }
    if (step === "angaben") {
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
      if (!hwName.trim()) setHwName(vertreter.trim());
      setStep("sig_hw");
      return;
    }
    if (step === "sig_hw") {
      if (hwName.trim().length < 3) {
        setError("Bitte den vollen Namen ausschreiben (mind. 3 Zeichen).");
        return;
      }
      if (!hwHasSig || !hwSig?.trim()) {
        setError("Bitte Ihre Signatur zeichnen.");
        return;
      }
      setStep("sig_kunde");
    }
  }

  function goBack() {
    setError(null);
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev.id);
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
    if (!hwNameOk) {
      return "Bitte den vollen Namen des Handwerkers ausschreiben (mind. 3 Zeichen).";
    }
    if (!hwHasSig || !hwSig?.trim()) return "Bitte die Handwerker-Signatur zeichnen.";
    if (!kundeNameOk) {
      return "Bitte den vollen Namen des Kunden ausschreiben (mind. 3 Zeichen).";
    }
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
      // Busy vom Modal sofort lösen — sonst hält PortalModalShell den
      // globalen Shell-Busy fest, wenn open=false und loading noch true.
      setLoading(false);
      onSuccess({
        vollstaendig: res.vollstaendig,
        pdf_url: res.pdf_url,
        protokoll_id: res.protokoll_id,
        punkte_count: res.punkte_count,
        maengel_count: res.maengel_count,
      });
      void refresh();
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

  const title = loading
    ? "Protokoll wird erstellt"
    : step === "leistungen"
      ? "Leistungen prüfen"
      : step === "maengel"
        ? "Mängel"
        : step === "angaben"
          ? "Abnahme-Angaben"
          : step === "sig_hw"
            ? "Ihre Signatur"
            : "Kunden-Signatur";

  const subtitle = loading
    ? "Bitte warten — danach kehren Sie zum Vorgang zurück"
    : `Schritt ${stepIndex + 1} von ${STEPS.length}: ${stepMeta.label}`;

  return (
    <PortalModalShell
      open={open}
      title={title}
      subtitle={subtitle}
      onClose={() => {
        if (loading) return;
        onClose();
      }}
      variant="funnel"
      dirty={dirty}
      closeOnBackdrop={!loading}
      busy={loading}
      busyTitle="Abnahmedokument wird abgeschlossen…"
      busyBody="Signaturen werden gespeichert und das Protokoll erstellt."
    >
      {loading ? (
        <PortalContentBusy
          title="Abnahmedokument wird abgeschlossen…"
          body="Signaturen werden gespeichert und das Protokoll erstellt. Danach öffnet sich der Vorgang mit dem neuen Status."
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <StepProgress stepIndex={stepIndex} />

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-2">
            {error ? <PortalDetailError message={error} /> : null}

            {step === "leistungen" ? (
              <>
                {undokumentiertePositionen.length > 0 ? (
                  <p
                    className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] leading-snug text-amber-950"
                    role="status"
                  >
                    {undokumentiertePositionen.length === 1
                      ? "1 Position noch nicht dokumentiert."
                      : `${undokumentiertePositionen.length} Positionen noch nicht dokumentiert.`}{" "}
                    Abschluss trotzdem möglich.
                  </p>
                ) : null}

                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px]" style={{ color: PORTAL_VAR.sub }}>
                    {punkte.length === 0
                      ? "Erledigte Positionen werden vorausgefüllt."
                      : `${punkte.length} Leistung${punkte.length === 1 ? "" : "en"} im Protokoll`}
                  </p>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold"
                    style={{
                      borderColor: PORTAL_VAR.line,
                      color: PORTAL_VAR.primary,
                    }}
                    onClick={() => setAddMode("wahl")}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Hinzufügen
                  </button>
                </div>

                {punkte.length === 0 ? (
                  <button
                    type="button"
                    className="portal-action-btn portal-action-btn--secondary portal-action-btn--block"
                    onClick={() => setAddMode("wahl")}
                  >
                    Erste Leistung hinzufügen
                  </button>
                ) : (
                  <ul className="space-y-2">
                    {punkte.map((p) => {
                      const openDetail = expandedPunktId === p.id;
                      return (
                        <li
                          key={p.id}
                          className="rounded-xl border border-border-light bg-white px-3 py-2.5"
                        >
                          <div className="flex items-start gap-2">
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
                              className="portal-input min-w-0 flex-1 rounded-lg border border-border-default px-2.5 py-2 text-[14px] font-semibold"
                            />
                            <button
                              type="button"
                              aria-label="Entfernen"
                              className="shrink-0 p-2 text-text-tertiary"
                              onClick={() =>
                                setPunkte((prev) =>
                                  prev.filter((x) => x.id !== p.id)
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <button
                            type="button"
                            className="mt-1.5 text-[12px] font-semibold"
                            style={{ color: PORTAL_VAR.primary }}
                            onClick={() =>
                              setExpandedPunktId(openDetail ? null : p.id)
                            }
                          >
                            {openDetail
                              ? "Beschreibung ausblenden"
                              : p.beschreibung?.trim()
                                ? "Beschreibung bearbeiten"
                                : "Beschreibung (optional)"}
                          </button>
                          {openDetail ? (
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
                              placeholder="Kurz beschreiben oder einsprechen"
                            />
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            ) : null}

            {step === "maengel" ? (
              <>
                <p className="text-[13px] leading-snug" style={{ color: PORTAL_VAR.sub }}>
                  Optional. Ohne Mängel läuft die Abnahme ohne Vorbehalt.
                </p>

                <div className="flex items-center justify-between gap-2">
                  <p
                    className="text-[14px] font-semibold"
                    style={{ color: PORTAL_VAR.ink }}
                  >
                    {maengel.length === 0
                      ? "Keine Mängel"
                      : maengel.length === 1
                        ? "1 Mangel"
                        : `${maengel.length} Mängel`}
                  </p>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold"
                    style={{
                      borderColor: PORTAL_VAR.line,
                      color: PORTAL_VAR.primary,
                    }}
                    onClick={() => {
                      resetDraft();
                      setAddMode("mangel");
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Mangel
                  </button>
                </div>

                {maengel.length > 0 ? (
                  <ul className="space-y-2">
                    {maengel.map((m) => (
                      <li
                        key={m.id}
                        className="rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-2.5"
                      >
                        <div className="flex items-start gap-2">
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
                            className="portal-input min-w-0 flex-1 rounded-lg border border-border-default bg-white px-2.5 py-2 text-[14px] font-semibold"
                          />
                          <button
                            type="button"
                            aria-label="Entfernen"
                            className="shrink-0 p-2 text-text-tertiary"
                            onClick={() =>
                              setMaengel((prev) =>
                                prev.filter((x) => x.id !== m.id)
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {m.beschreibung?.trim() ? (
                          <p className="mt-1.5 text-[12.5px] leading-snug text-text-secondary">
                            {m.beschreibung}
                          </p>
                        ) : null}
                        {m.frist ? (
                          <p className="mt-1 text-[12px] text-text-tertiary">
                            Frist: {m.frist}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : null}

            {step === "angaben" ? (
              <div className="space-y-3.5">
                <label className="block space-y-1">
                  <span className="text-[12px] font-semibold text-text-tertiary">
                    Projekt *
                  </span>
                  <input
                    value={projektbezeichnung}
                    onChange={(e) => setProjektbezeichnung(e.target.value)}
                    placeholder="Objekt- oder Auftragsname"
                    className="portal-input w-full rounded-xl border border-border-default px-3 py-3 text-[15px]"
                    required
                  />
                </label>

                <div className="grid grid-cols-1 gap-3">
                  <label className="block space-y-1">
                    <span className="text-[12px] font-semibold text-text-tertiary">
                      Datum *
                    </span>
                    <input
                      type="date"
                      value={abnahmeDatum}
                      onChange={(e) => setAbnahmeDatum(e.target.value)}
                      className="portal-input w-full rounded-xl border border-border-default px-3 py-3 text-[15px]"
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
                      className="portal-input w-full rounded-xl border border-border-default px-3 py-3 text-[15px]"
                      required
                    />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-[12px] font-semibold text-text-tertiary">
                    Vertreter vor Ort *
                  </span>
                  <input
                    value={vertreter}
                    onChange={(e) => setVertreter(e.target.value)}
                    placeholder="Ihr Name"
                    className="portal-input w-full rounded-xl border border-border-default px-3 py-3 text-[15px]"
                    required
                  />
                </label>

                <fieldset className="space-y-2">
                  <legend className="text-[12px] font-semibold text-text-tertiary">
                    Ergebnis
                  </legend>
                  <div className="flex flex-col gap-2">
                    {ERGEBNIS_OPTIONS.map((key) => (
                      <label
                        key={key}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-[14px] font-semibold",
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
                          className="h-4 w-4 accent-[var(--portal-primary,#1f6a3f)]"
                          onChange={() => {
                            setErgebnisTouched(true);
                            setErgebnis(key);
                          }}
                        />
                        {PORTAL_ABNAHME_ERGEBNIS_LABEL[key]}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {showNotiz || notizen.trim() ? (
                  <PartnerKiKorrekturField
                    scope="abnahmeprotokoll"
                    label="Interne Notiz (optional)"
                    value={notizen}
                    onChange={setNotizen}
                    rows={2}
                    auftragTitel={auftragTitel}
                    placeholder="Kurz notieren oder einsprechen"
                  />
                ) : (
                  <button
                    type="button"
                    className="text-[13px] font-semibold"
                    style={{ color: PORTAL_VAR.primary }}
                    onClick={() => setShowNotiz(true)}
                  >
                    + Interne Notiz hinzufügen
                  </button>
                )}
              </div>
            ) : null}

            {step === "sig_hw" ? (
              <div className="space-y-4">
                <p className="text-[13px] leading-snug" style={{ color: PORTAL_VAR.sub }}>
                  Bitte mit dem Namen unterschreiben, der im Protokoll erscheint.
                </p>
                <label className="block space-y-1.5">
                  <span className="text-[12px] font-semibold text-text-tertiary">
                    Ihr Name *
                  </span>
                  <input
                    value={hwName}
                    onChange={(e) => setHwName(e.target.value)}
                    className="portal-input w-full rounded-xl border border-border-default px-3 py-3 text-[15px]"
                    autoComplete="name"
                  />
                </label>
                <div>
                  <p className="mb-1.5 text-[12px] font-semibold text-text-tertiary">
                    Signatur *
                  </p>
                  <SignatureCanvas
                    onChange={(has, url) => {
                      setHwHasSig(has);
                      setHwSig(url);
                    }}
                  />
                </div>
              </div>
            ) : null}

            {step === "sig_kunde" ? (
              <div className="space-y-4">
                <p className="text-[13px] leading-snug" style={{ color: PORTAL_VAR.sub }}>
                  Gerät dem Kunden geben — Name und Unterschrift vor Ort.
                </p>
                <label className="block space-y-1.5">
                  <span className="text-[12px] font-semibold text-text-tertiary">
                    Name Kunde *
                  </span>
                  <input
                    value={kundeName}
                    onChange={(e) => setKundeName(e.target.value)}
                    className="portal-input w-full rounded-xl border border-border-default px-3 py-3 text-[15px]"
                    autoComplete="name"
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
              </div>
            ) : null}
          </div>

          <div
            className="-mx-1 mt-3 border-t bg-[var(--portal-surface,#fff)] px-1 pt-3"
            style={{ borderColor: PORTAL_VAR.line }}
          >
            <div className="portal-action-row">
              {stepIndex > 0 ? (
                <button
                  type="button"
                  className="portal-action-btn portal-action-btn--secondary"
                  onClick={goBack}
                >
                  <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
                  Zurück
                </button>
              ) : null}
              {step === "sig_kunde" ? (
                <button
                  type="button"
                  className="portal-action-btn portal-action-btn--primary"
                  disabled={!canSubmit}
                  onClick={() => void submit()}
                >
                  Protokoll abschließen
                </button>
              ) : (
                <button
                  type="button"
                  className="portal-action-btn portal-action-btn--primary"
                  onClick={goNext}
                >
                  {step === "maengel" && maengel.length === 0
                    ? "Keine Mängel — weiter"
                    : "Weiter"}
                </button>
              )}
            </div>
            {step === "sig_kunde" && !canSubmit ? (
              <p
                className="mt-2 text-center text-[12px]"
                style={{ color: PORTAL_VAR.faint }}
              >
                {submitBlockReason() ??
                  "Name und Signatur des Kunden fehlen noch."}
              </p>
            ) : null}
          </div>
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
              <div className="portal-action-row">
                <button
                  type="button"
                  className="portal-action-btn portal-action-btn--secondary"
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
                  className="portal-action-btn portal-action-btn--primary"
                  disabled={!availableLeistungen.length}
                  onClick={() => setAddMode("erkannt")}
                >
                  Erkannt — aus Auftrag
                </button>
              </div>
            ) : null}
            {addMode === "wahl" && !availableLeistungen.length ? (
              <p className="text-[12px] text-text-tertiary">
                Alle zugewiesenen Leistungen sind bereits hinzugefügt.
              </p>
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
                    className="portal-input w-full rounded-xl border border-border-default px-3 py-3 text-[15px]"
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
                  placeholder="Tippen — KI formuliert kundenfertig"
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
                      className="portal-input w-full rounded-xl border border-border-default px-3 py-3"
                    />
                  </label>
                ) : null}
                <div className="portal-action-row">
                  <button
                    type="button"
                    className="portal-action-btn portal-action-btn--secondary"
                    onClick={resetDraft}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    className="portal-action-btn portal-action-btn--primary"
                    disabled={draftTitel.trim().length < 2}
                    onClick={() => {
                      const ok =
                        addMode === "mangel" ? addMangel() : addLeerLeistung();
                      if (ok) resetDraft();
                    }}
                  >
                    Hinzufügen
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
                        className="portal-input w-full rounded-xl border border-border-default px-3 py-3"
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
                      placeholder="Tippen — KI formuliert kundenfertig"
                    />
                    <div className="portal-action-row">
                      <button
                        type="button"
                        className="portal-action-btn portal-action-btn--secondary"
                        onClick={resetDraft}
                      >
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        className="portal-action-btn portal-action-btn--primary"
                        disabled={draftTitel.trim().length < 2}
                        onClick={() => {
                          if (addErkanntLeistung()) resetDraft();
                        }}
                      >
                        Hinzufügen
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
