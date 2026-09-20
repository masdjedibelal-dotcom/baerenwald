"use client";

import { PortalIcon } from "@/components/portal/PortalIcon";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { PortalCheckbox, PortalInput, PortalSelect, PortalTextarea } from "@/components/shared/PortalFormControls";
import { PartnerDirektKameraSlot } from "@/components/partner/PartnerDirektKameraSlot";
import { PartnerKiKorrekturField } from "@/components/partner/PartnerKiKorrekturField";
import { PartnerMultiFotoSlot } from "@/components/partner/PartnerMultiFotoSlot";
import { PortalButton } from "@/components/portal/PortalButton";
import { PortalField } from "@/components/shared/PortalField";
import {
  paintPortalBusyNow,
  PORTAL_BUSY_MIN_MS,
  usePortalBusy,
} from "@/components/shared/PortalBusyContext";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import {
  addPartnerPositionFortschritt,
  completePartnerPosition,
  createPartnerTagebuchEintrag,
  createPartnerWeitereArbeit,
  listPartnerAuftragTagebuchEintraege,
  markPartnerPositionenErledigt,
  startPartnerPosition,
  type PartnerTagebuchListenEintrag,
} from "@/app/actions/partner-position-eintraege";
import { PartnerLeistungUpdatesAccordion } from "@/components/partner/PartnerLeistungUpdatesAccordion";
import { normalizePartnerCameraPhoto } from "@/lib/partner/normalize-camera-photo";
import {
  formatZeitMinuten,
  lebenszyklusLabel,
} from "@/lib/partner/position-lebenszyklus";
import { useFieldErrors } from "@/lib/portal2/form-schema";
import { HW_DOKU_STORY } from "@/lib/portal2/hw-doku-story";
import { PORTAL_C, PORTAL_VAR } from "@/lib/portal2/tokens";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";
import { EMPTY, TOAST } from '@/lib/portal-copy'

export type LebenszyklusPosition = {
  id: string;
  leistung_name: string;
  leistung_status?: string | null;
  verguetung?: string | null;
  typ?: string | null;
  anerkennung_status?: string | null;
  preis_partner?: number | null;
  stundensatz?: number | null;
  einheit?: string | null;
  menge?: number | null;
  zeit_minuten_summe?: number | null;
};

type SheetMode = "start" | "fortschritt" | "erledigt";

type Props = {
  auftragId: string;
  positionen: LebenszyklusPosition[];
  onDone?: () => void | Promise<void>;
  preferredPositionIds?: string[];
  anfrageId?: string | null;
  auftragTitel?: string | null;
  /** Deep-Link: erstes bevorzugtes Sheet öffnen */
  autoOpenPreferred?: boolean;
  /** Erledigter Auftrag: nur lesen, keine Start-/Update-/Nachtrag-Aktionen. */
  readOnly?: boolean;
  /**
   * Deep-Link / CRM-Anforderung: Multi-Update-Sheet mit bevorzugten Leistungen öffnen.
   * (Kein Tagebuch-Tab mehr — Tagebuch nur im CRM.)
   */
  openUpdateOnMount?: boolean;
};

function formatEuro(n: number): string {
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function isRegiePosition(p: LebenszyklusPosition): boolean {
  return (
    p.typ === "regie" ||
    String(p.verguetung ?? "").toLowerCase() === "aufwand"
  );
}

function regieStundensatz(p: LebenszyklusPosition): number | null {
  if (p.stundensatz != null && p.stundensatz > 0) return p.stundensatz;
  const einheit = String(p.einheit ?? "").toLowerCase();
  if (
    (einheit === "h" || einheit === "std") &&
    p.preis_partner != null &&
    p.preis_partner > 0
  ) {
    return p.preis_partner;
  }
  return null;
}

/** Erfasste Minuten — Zeitbuchung, sonst Menge in Stunden. */
function regieArbeitsminuten(p: LebenszyklusPosition): number {
  if (p.zeit_minuten_summe != null && p.zeit_minuten_summe > 0) {
    return Math.round(p.zeit_minuten_summe);
  }
  const einheit = String(p.einheit ?? "").toLowerCase();
  if (
    (einheit === "h" || einheit === "std") &&
    p.menge != null &&
    p.menge > 0
  ) {
    return Math.round(p.menge * 60);
  }
  return 0;
}

function regieGesamtpreis(p: LebenszyklusPosition): number | null {
  const min = regieArbeitsminuten(p);
  const satz = regieStundensatz(p);
  if (min > 0 && satz != null) {
    return Math.round((min / 60) * satz * 100) / 100;
  }
  const einheit = String(p.einheit ?? "").toLowerCase();
  if (
    p.preis_partner != null &&
    p.preis_partner > 0 &&
    einheit !== "h" &&
    einheit !== "std"
  ) {
    return p.preis_partner;
  }
  return null;
}

function formatPartnerPreisLabel(p: LebenszyklusPosition): string | null {
  if (isRegiePosition(p)) {
    const gesamt = regieGesamtpreis(p);
    return gesamt != null ? formatEuro(gesamt) : null;
  }
  if (p.preis_partner != null && p.preis_partner > 0) {
    return formatEuro(p.preis_partner);
  }
  return null;
}

function mengeLabel(p: LebenszyklusPosition): string | null {
  if (isRegiePosition(p)) return null;
  if (p.einheit && p.menge != null) return `${p.menge} ${p.einheit}`;
  return null;
}

function positionMetaLine(
  p: LebenszyklusPosition,
  opts: { preferred: boolean; blocked: boolean }
): string {
  const st = p.leistung_status ?? "offen";
  const isAufwand = p.verguetung === "aufwand";
  const isRegie = p.typ === "regie" || isAufwand;
  const inPruefung = p.anerkennung_status === "in_pruefung";
  const isAbgelehnt = p.anerkennung_status === "abgelehnt";
  return [
    inPruefung
      ? "Noch zur Prüfung"
      : isAbgelehnt
        ? "Abgelehnt"
        : lebenszyklusLabel(st),
    isRegie ? "Regie" : mengeLabel(p),
    opts.preferred && !opts.blocked ? "Update angefordert" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Kompakte Icon-CTA (Mobil) — Update / Erledigt nebeneinander. */
function PositionActionIconBtn({
  label,
  variant,
  onClick,
  children,
}: {
  label: string;
  variant: "primary" | "outline";
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <PortalButton
      variant="primary"
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-pill transition-colors",
        variant === "primary"
          ? "bg-[var(--p2-primary)] text-white"
          : "border border-border-default bg-white text-text-primary"
      )}
    >
      {children}
    </PortalButton>
  );
}

/**
 * Mock-Flow: Leistungskarten mit CTA → Bottom Sheet (Foto + Beschreibung).
 */
export function PartnerPositionLebenszyklusList({
  auftragId,
  positionen,
  onDone,
  preferredPositionIds = [],
  anfrageId,
  auftragTitel,
  autoOpenPreferred = false,
  readOnly = false,
  openUpdateOnMount = false,
}: Props) {
  const [sheet, setSheet] = useState<{
    mode: SheetMode;
    position: LebenszyklusPosition;
  } | null>(null);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [tbTitel, setTbTitel] = useState("");
  const [tbBeschreibung, setTbBeschreibung] = useState("");
  const [tbSelected, setTbSelected] = useState<string[]>([]);
  const [tbErledigt, setTbErledigt] = useState<string[]>([]);
  const [tbFotos, setTbFotos] = useState<File[]>([]);
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const [bulkErledigtOpen, setBulkErledigtOpen] = useState(false);
  const [bulkBeschreibung, setBulkBeschreibung] = useState("");
  const [bulkFotos, setBulkFotos] = useState<File[]>([]);
  const [erledigtAccordionOpen, setErledigtAccordionOpen] = useState(false);
  const [nachtragOpen, setNachtragOpen] = useState(false);
  const [nachtragTitel, setNachtragTitel] = useState("");
  const [nachtragBegruendung, setNachtragBegruendung] = useState("");
  const [nachtragStundensatz, setNachtragStundensatz] = useState("");
  const [nachtragHours, setNachtragHours] = useState(0);
  const [nachtragMins, setNachtragMins] = useState(0);
  const [nachtragFotos, setNachtragFotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [beschreibung, setBeschreibung] = useState("");
  const [sheetFotos, setSheetFotos] = useState<File[]>([]);
  const [updates, setUpdates] = useState<PartnerTagebuchListenEintrag[]>([]);
  const autoOpenedRef = useRef(false);
  const updateOpenedRef = useRef(false);
  const sheetFormRef = useRef<HTMLFormElement>(null);
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } =
    useFieldErrors();
  const { runBusy } = usePortalBusy();
  const preferredSet = useMemo(
    () => new Set(preferredPositionIds.map((id) => id.trim()).filter(Boolean)),
    [preferredPositionIds]
  );

  async function reloadUpdates() {
    const aid = auftragId?.trim();
    if (!aid) {
      setUpdates([]);
      return;
    }
    try {
      const rows = await listPartnerAuftragTagebuchEintraege(aid);
      setUpdates(rows);
    } catch {
      /* Liste optional */
    }
  }

  useEffect(() => {
    void reloadUpdates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auftragId]);

  const updatesByPosition = useMemo(() => {
    const map = new Map<string, PartnerTagebuchListenEintrag[]>();
    for (const e of updates) {
      // Nur eigene HW-Updates (CRM-Einträge bleiben im CRM)
      if (e.quelleLabel !== "Partner") continue;
      const ids =
        e.leistungIds?.length > 0
          ? e.leistungIds
          : []; /* Legacy ohne Positionsbezug: nicht unter Leistung */
      for (const pid of ids) {
        const list = map.get(pid) ?? [];
        list.push(e);
        map.set(pid, list);
      }
    }
    return map;
  }, [updates]);

  async function afterSaveRefresh() {
    await reloadUpdates();
    await onDone?.();
  }

  const sortedPositionen = useMemo(() => {
    if (!preferredSet.size) return positionen;
    return [...positionen].sort((a, b) => {
      const ap = preferredSet.has(a.id) ? 0 : 1;
      const bp = preferredSet.has(b.id) ? 0 : 1;
      return ap - bp;
    });
  }, [positionen, preferredSet]);

  const actionablePositionen = useMemo(
    () =>
      sortedPositionen.filter(
        (p) =>
          p.anerkennung_status !== "in_pruefung" &&
          p.anerkennung_status !== "abgelehnt"
      ),
    [sortedPositionen]
  );
  const erledigtCount = useMemo(
    () =>
      actionablePositionen.filter((p) => p.leistung_status === "erledigt").length,
    [actionablePositionen]
  );
  const offenPositionen = useMemo(
    () =>
      sortedPositionen.filter((p) => (p.leistung_status ?? "offen") !== "erledigt"),
    [sortedPositionen]
  );
  const erledigtPositionen = useMemo(
    () =>
      sortedPositionen.filter((p) => (p.leistung_status ?? "offen") === "erledigt"),
    [sortedPositionen]
  );
  const progressPct =
    actionablePositionen.length > 0
      ? Math.round((erledigtCount / actionablePositionen.length) * 100)
      : 0;

  const bulkSelectableIds = useMemo(
    () =>
      actionablePositionen
        .filter((p) => {
          if (p.leistung_status === "erledigt") return false;
          // Regie/Nachtrag wie normale Positionen auswählbar (nach Freigabe)
          return true;
        })
        .map((p) => p.id),
    [actionablePositionen]
  );

  useEffect(() => {
    if (!openUpdateOnMount || readOnly || updateOpenedRef.current) return;
    if (!preferredPositionIds.length) return;
    updateOpenedRef.current = true;
    setTbSelected(
      preferredPositionIds.filter((id) =>
        positionen.some((p) => p.id === id)
      )
    );
    setUpdateOpen(true);
  }, [openUpdateOnMount, preferredPositionIds, positionen, readOnly]);

  useEffect(() => {
    if (!autoOpenPreferred || autoOpenedRef.current || !preferredSet.size) return;
    const target = sortedPositionen.find(
      (p) => preferredSet.has(p.id) && p.leistung_status !== "erledigt"
    );
    if (!target) return;
    autoOpenedRef.current = true;
    const st = target.leistung_status ?? "offen";
    setSheet({
      mode: st === "in_arbeit" ? "fortschritt" : "start",
      position: target,
    });
  }, [autoOpenPreferred, preferredSet, sortedPositionen]);

  useEffect(() => {
    setBeschreibung("");
    setSheetFotos([]);
  }, [sheet?.position.id, sheet?.mode]);

  function toggleBulk(id: string) {
    setBulkSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAllBulk() {
    setBulkSelected(bulkSelectableIds);
  }

  function openBulkErledigt() {
    if (!bulkSelected.length || submitting) return;
    setBulkBeschreibung("");
    setBulkFotos([]);
    setBulkErledigtOpen(true);
  }

  function closeBulkErledigt() {
    if (submitting) return;
    setBulkErledigtOpen(false);
    setBulkBeschreibung("");
    setBulkFotos([]);
  }

  function submitBulkErledigt() {
    if (!bulkSelected.length || submitting) return;
    const formData = new FormData();
    formData.set("auftragId", auftragId);
    if (anfrageId) formData.set("anfrageId", anfrageId);
    if (bulkBeschreibung.trim()) {
      formData.set("beschreibung", bulkBeschreibung.trim());
    }
    for (const id of bulkSelected) formData.append("positionIds", id);
    paintPortalBusyNow(setSubmitting);
    void (async () => {
      try {
        await runBusy(async () => {
          try {
            for (const f of bulkFotos.slice(0, 12)) {
              formData.append("fotos", await normalizePartnerCameraPhoto(f));
            }
          } catch {
            portalToastError(TOAST.foto_konnte_nicht_verarbeitet_werden_bitte_erneu
            );
            return;
          }
          const res = await markPartnerPositionenErledigt(formData);
          if (!res.ok) {
            portalToastError(res.error);
            return;
          }
          portalToastSuccess(
            res.count === 1
              ? "Leistung als erledigt markiert."
              : `${res.count} Leistungen erledigt.`
          );
          setBulkSelected([]);
          setBulkErledigtOpen(false);
          setBulkBeschreibung("");
          setBulkFotos([]);
          await reloadUpdates();
          await onDone?.();
        }, Math.max(PORTAL_BUSY_MIN_MS, 400));
      } finally {
        setSubmitting(false);
      }
    })();
  }

  function closeUpdateSheet() {
    setUpdateOpen(false);
    setTbSelected([]);
    setTbErledigt([]);
    setTbTitel("");
    setTbBeschreibung("");
    setTbFotos([]);
  }

  function submitLeistungsUpdate() {
    if (submitting) return;
    if (!tbSelected.length) {
      portalToastError(TOAST.mindestens_eine_leistung_auswaehlen);
      return;
    }
    if (!tbTitel.trim() && !tbBeschreibung.trim() && !tbFotos.length) {
      portalToastError(TOAST.titel_text_oder_foto_angeben);
      return;
    }
    const formData = new FormData();
    formData.set("auftragId", auftragId);
    if (anfrageId) formData.set("anfrageId", anfrageId);
    if (tbTitel.trim()) formData.set("titel", tbTitel.trim());
    if (tbBeschreibung.trim()) formData.set("beschreibung", tbBeschreibung.trim());
    for (const id of tbSelected) formData.append("positionIds", id);
    for (const id of tbErledigt) formData.append("erledigtPositionIds", id);
    setSubmitting(true);
    void (async () => {
      try {
        await runBusy(async () => {
          try {
            for (const f of tbFotos.slice(0, 5)) {
              formData.append("fotos", await normalizePartnerCameraPhoto(f));
            }
          } catch {
            portalToastError(TOAST.foto_konnte_nicht_verarbeitet_werden_bitte_erneu
            );
            return;
          }
          const res = await createPartnerTagebuchEintrag(formData);
          if (!res.ok) {
            portalToastError(res.error);
            return;
          }
          portalToastSuccess(
            tbSelected.length > 1
              ? `Update für ${tbSelected.length} Leistungen gespeichert.`
              : "Update gespeichert."
          );
          closeUpdateSheet();
          await onDone?.();
        }, Math.max(PORTAL_BUSY_MIN_MS, 600));
      } finally {
        setSubmitting(false);
      }
    })();
  }

  async function normalizeFotoField(
    formData: FormData,
    field: string
  ): Promise<boolean> {
    const raw = formData.get(field);
    if (!(raw instanceof File) || raw.size <= 0) return true;
    try {
      formData.set(field, await normalizePartnerCameraPhoto(raw));
      return true;
    } catch {
      portalToastError(TOAST.foto_konnte_nicht_verarbeitet_werden_bitte_erneu
      );
      return false;
    }
  }

  async function normalizeFotosList(formData: FormData): Promise<boolean> {
    const raw = formData
      .getAll("fotos")
      .filter((f): f is File => f instanceof File && f.size > 0);
    if (!raw.length) return true;
    formData.delete("fotos");
    try {
      for (const f of raw.slice(0, 12)) {
        formData.append("fotos", await normalizePartnerCameraPhoto(f));
      }
      return true;
    } catch {
      portalToastError(TOAST.foto_konnte_nicht_verarbeitet_werden_bitte_erneu
      );
      return false;
    }
  }

  function hasFoto(formData: FormData, field: string): boolean {
    const f = formData.get(field);
    return f instanceof File && f.size > 0;
  }

  function submitSheet(formData: FormData) {
    if (!sheet?.mode || submitting) return;
    if (anfrageId) formData.set("anfrageId", anfrageId);
    const sheetIsRegie =
      sheet.position.typ === "regie" ||
      sheet.position.verguetung === "aufwand";
    const mode = sheet.mode;
    const positionId = sheet.position.id;

    // Regie: Start-Slot → einheitlich als foto (Duplikat foto_start entfernen)
    const startSlot = formData.get("foto_start");
    if (startSlot instanceof File && startSlot.size > 0) {
      formData.set("foto", startSlot);
    }
    formData.delete("foto_start");

    /* FORM_VALIDATION: partner-position-lebenszyklus */
    if (sheetIsRegie && (mode === "start" || mode === "erledigt")) {
      const errors: Record<string, string> = {};
      if (mode === "start" && !hasFoto(formData, "foto")) {
        errors.foto = TOAST.bitte_ein_start_foto_hinzufuegen;
      }
      if (mode === "erledigt" && !hasFoto(formData, "foto_ende")) {
        errors.foto = TOAST.bitte_ein_ende_foto_hinzufuegen;
      }
      const beschr = String(formData.get("beschreibung") ?? "").trim();
      if (!beschr) {
        errors.beschreibung = TOAST.bitte_eine_kurze_beschreibung_angeben;
      }
      // Gesamtzeit erst beim Abschluss — Start und Ende sind zeitlich getrennt
      if (mode === "erledigt") {
        const std = Number(formData.get("zeitStd") ?? 0);
        const min = Number(formData.get("zeitMin") ?? 0);
        if (!Number.isFinite(std) || !Number.isFinite(min) || std * 60 + min <= 0) {
          errors.zeit = TOAST.bitte_die_tatsaechliche_zeit_aufwand_auswaehlen;
        }
      }
      if (Object.keys(errors).length) {
        applyFieldErrors(errors, sheetFormRef.current);
        return;
      }
    }
    clearFieldErrors();

    paintPortalBusyNow(setSubmitting);
    void (async () => {
      let ok = false;
      try {
        await runBusy(async () => {
          // Immer vor Upload verdichten (wie bei normalen Updates)
          if (!(await normalizeFotoField(formData, "foto"))) return;
          if (!(await normalizeFotoField(formData, "foto_ende"))) return;
          if (!(await normalizeFotosList(formData))) return;

          const captureStart =
            String(formData.get("captureAt_start") ?? "").trim() ||
            String(formData.get("captureAt") ?? "").trim();
          if (captureStart) formData.set("captureAt", captureStart);

          const endeFoto = formData.get("foto_ende");
          const hasEnde =
            endeFoto instanceof File && endeFoto.size > 0 && sheetIsRegie;

          if (!sheetIsRegie && sheetFotos.length > 0) {
            formData.delete("fotos");
            formData.delete("foto");
            try {
              for (const f of sheetFotos.slice(0, 12)) {
                formData.append("fotos", await normalizePartnerCameraPhoto(f));
              }
            } catch {
              portalToastError(TOAST.foto_konnte_nicht_verarbeitet_werden_bitte_erneu
              );
              return;
            }
          }

          try {
            if (mode === "start") {
              const startRes = await startPartnerPosition(formData);
              if (!startRes.ok) {
                portalToastError(startRes.error);
                return;
              }
              // Ende optional mitgeben (Legacy) — normalerweise erst später beim Abschluss
              if (hasEnde) {
                const endeFd = new FormData();
                endeFd.set("positionId", positionId);
                if (anfrageId) endeFd.set("anfrageId", anfrageId);
                endeFd.set("foto", endeFoto);
                const captureEnde = String(
                  formData.get("captureAt_ende") ?? ""
                ).trim();
                if (captureEnde) endeFd.set("captureAt", captureEnde);
                const beschr = String(formData.get("beschreibung") ?? "").trim();
                if (beschr) endeFd.set("beschreibung", beschr);
                const zeitStd = formData.get("zeitStd");
                const zeitMin = formData.get("zeitMin");
                if (zeitStd != null) endeFd.set("zeitStd", String(zeitStd));
                if (zeitMin != null) endeFd.set("zeitMin", String(zeitMin));
                const endeRes = await completePartnerPosition(endeFd);
                if (!endeRes.ok) {
                  portalToastError(endeRes.error);
                  await onDone?.();
                  return;
                }
              }
              portalToastSuccess(
                hasEnde
                  ? HW_DOKU_STORY.positionEndeToast
                  : "Start-Foto gespeichert — Arbeit gestartet."
              );
            } else if (mode === "fortschritt") {
              const res = await addPartnerPositionFortschritt(formData);
              if (!res.ok) {
                portalToastError(res.error);
                return;
              }
              portalToastSuccess(TOAST.update_gespeichert);
            } else {
              if (
                hasEnde &&
                (!(formData.get("foto") instanceof File) ||
                  (formData.get("foto") instanceof File &&
                    (formData.get("foto") as File).size <= 0))
              ) {
                formData.set("foto", endeFoto);
                const captureEnde = String(
                  formData.get("captureAt_ende") ?? ""
                ).trim();
                if (captureEnde) formData.set("captureAt", captureEnde);
              }
              const res = await completePartnerPosition(formData);
              if (!res.ok) {
                portalToastError(res.error);
                return;
              }
              portalToastSuccess(HW_DOKU_STORY.positionEndeToast);
            }
          } catch {
            portalToastError(TOAST.speichern_fehlgeschlagen_foto);
            return;
          }

          ok = true;
          await onDone?.();
          setSheet(null);
          setBeschreibung("");
          setSheetFotos([]);
        }, Math.max(PORTAL_BUSY_MIN_MS, 600));
      } catch {
        portalToastError(TOAST.speichern_fehlgeschlagen_bitte_erneut_versuchen);
      } finally {
        setSubmitting(false);
      }
      void ok;
    })();
  }

  function closeNachtrag() {
    if (submitting) return;
    setNachtragOpen(false);
    setNachtragTitel("");
    setNachtragBegruendung("");
    setNachtragStundensatz("");
    setNachtragHours(0);
    setNachtragMins(0);
    setNachtragFotos([]);
  }

  function submitNachtrag() {
    if (nachtragTitel.trim().length < 4) {
      portalToastError(TOAST.titel_mind_4_zeichen);
      return;
    }
    if (nachtragBegruendung.trim().length < 8) {
      portalToastError(TOAST.begruendung_mind_8_zeichen);
      return;
    }
    const formData = new FormData();
    formData.set("auftragId", auftragId);
    formData.set("titel", nachtragTitel.trim());
    formData.set("begruendung", nachtragBegruendung.trim());
    if (nachtragStundensatz.trim()) {
      formData.set("stundensatz", nachtragStundensatz.trim());
    }
    const totalMin = nachtragHours * 60 + nachtragMins;
    if (totalMin > 0) formData.set("schaetzungMinuten", String(totalMin));
    if (submitting) return;
    setSubmitting(true);
    void (async () => {
      try {
        await runBusy(async () => {
          try {
            for (const f of nachtragFotos.slice(0, 12)) {
              formData.append("fotos", await normalizePartnerCameraPhoto(f));
            }
          } catch {
            portalToastError(TOAST.foto_konnte_nicht_verarbeitet_werden_bitte_erneu
            );
            return;
          }
          const res = await createPartnerWeitereArbeit(formData);
          if (!res.ok) {
            portalToastError(res.error);
            return;
          }
          portalToastSuccess(TOAST.nachtrag_eingereicht_noch_zur_pruefung_durch_bae
          );
          await onDone?.();
          setNachtragOpen(false);
          setNachtragTitel("");
          setNachtragBegruendung("");
          setNachtragStundensatz("");
          setNachtragHours(0);
          setNachtragMins(0);
          setNachtragFotos([]);
        }, Math.max(PORTAL_BUSY_MIN_MS, 600));
      } finally {
        setSubmitting(false);
      }
    })();
  }

  function closeSheet() {
    if (submitting) return;
    setSheet(null);
    setBeschreibung("");
    setSheetFotos([]);
  }

  return (
    <div className="space-y-4">
      <div>
        <h3
          className="text-fs-head font-bold leading-tight"
          style={{
            color: PORTAL_VAR.ink,
            fontFamily: "var(--p2-font-head, " + PORTAL_VAR.head + ")",
          }}
        >
          {HW_DOKU_STORY.title}
        </h3>
      </div>

      <div>
        <div className="mt-0 flex items-center justify-between gap-2">
          <p className="text-fs-meta font-semibold" style={{ color: PORTAL_VAR.sub }}>
            Fortschritt
          </p>
          <p className="text-fs-meta font-semibold" style={{ color: PORTAL_VAR.sub }}>
            {erledigtCount} von {actionablePositionen.length} erledigt
          </p>
        </div>
        {!readOnly && bulkSelectableIds.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {bulkSelected.length > 0 ? (
              <>
                <PortalButton
                  variant="secondary"
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setTbSelected([...bulkSelected]);
                    setTbErledigt([]);
                    setTbTitel("");
                    setTbBeschreibung("");
                    setTbFotos([]);
                    setUpdateOpen(true);
                  }}
                >
                  Update ({bulkSelected.length})
                </PortalButton>
                <PortalButton
                  variant="primary"
                  type="button"
                  disabled={submitting}
                  onClick={openBulkErledigt}
                >
                  {bulkSelected.length} als erledigt
                </PortalButton>
                <PortalButton
                  variant="secondary"
                  type="button"
                  disabled={submitting}
                  onClick={() => setBulkSelected([])}
                >
                  Auswahl aufheben
                </PortalButton>
              </>
            ) : null}
            {bulkSelected.length < bulkSelectableIds.length ? (
              <PortalButton
                variant="secondary"
                type="button"
                disabled={submitting}
                onClick={selectAllBulk}
              >
                Alle auswählen
              </PortalButton>
            ) : null}
          </div>
        ) : null}
        <div
          className="mt-1.5 h-2 overflow-hidden rounded-pill"
          style={{ background: PORTAL_C.line2 }}
          role="progressbar"
          aria-valuenow={erledigtCount}
          aria-valuemin={0}
          aria-valuemax={actionablePositionen.length}
          aria-valuetext={`${progressPct} Prozent`}
        >
          <div
            className="h-full rounded-pill transition-[width] duration-300 ease-out"
            style={{
              width: `${Math.max(0, Math.min(100, progressPct))}%`,
              backgroundColor: PORTAL_C.primary,
            }}
          />
        </div>
      </div>

      {preferredSet.size > 0 ? (
        <p
          className="rounded-sheet border border-warning-border bg-warning-bg px-3.5 py-3 text-fs-body font-bold leading-snug text-warning-text"
          role="status"
        >
          {HW_DOKU_STORY.preferredBanner}
        </p>
      ) : null}

      {sortedPositionen.length === 0 ? (
        <div className="px-0 py-5 text-center" data-testid="hw-first-job-empty">
          <p className="text-fs-body font-bold" style={{ color: PORTAL_VAR.ink }}>
            Noch keine Leistung
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {offenPositionen.length > 0 ? (
            <ul className="divide-y divide-border-light">
              {offenPositionen.map((p) => {
                const st = p.leistung_status ?? "offen";
                const isArbeit = st === "in_arbeit";
                const isAufwand = p.verguetung === "aufwand";
                const isRegie = p.typ === "regie" || isAufwand;
                const isPreferred = preferredSet.has(p.id);
                const inPruefung = p.anerkennung_status === "in_pruefung";
                const isAbgelehnt = p.anerkennung_status === "abgelehnt";
                const isBlocked = inPruefung || isAbgelehnt;
                const arbeitsMin = isRegie ? regieArbeitsminuten(p) : 0;
                const gesamtPreis = isRegie ? regieGesamtpreis(p) : null;
                const meta = positionMetaLine(p, {
                  preferred: isPreferred,
                  blocked: isBlocked,
                });
                const showActions = !readOnly && !isBlocked;
                const updateMode: SheetMode =
                  st === "offen" ? "start" : "fortschritt";
                const updateLabel =
                  st === "offen" && isRegie ? "Start (Foto)" : "Update";
                const erledigtLabel = isRegie ? "Ende (Foto)" : "Erledigt";
                const showErledigtBtn =
                  showActions && (isArbeit || st === "offen");
                const showUpdateBtn =
                  showActions && (st === "offen" || isArbeit);
                const preisLabel = !isRegie ? formatPartnerPreisLabel(p) : null;

                return (
                  <li
                    key={p.id}
                    className={cn(
                      "px-0 py-3",
                      isBlocked && "opacity-70",
                      isPreferred && !isBlocked && "bg-warning-bg/60"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      {!readOnly && !isBlocked ? (
                        <PortalButton
                          variant="primary"
                          type="button"
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-field border",
                            bulkSelected.includes(p.id)
                              ? "border-accent bg-accent text-white"
                              : "border-border-default bg-white"
                          )}
                          aria-pressed={bulkSelected.includes(p.id)}
                          aria-label={`${p.leistung_name} auswählen`}
                          onClick={() => toggleBulk(p.id)}
                        >
                          {bulkSelected.includes(p.id) ? (
                            <PortalIcon n="check" ctx="default" className="h-3 w-3" />
                          ) : null}
                        </PortalButton>
                      ) : (
                        <div
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-field border border-border-default bg-white"
                          aria-hidden
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-fs-title font-bold leading-snug",
                              isBlocked
                                ? "text-text-secondary"
                                : "text-text-primary"
                            )}
                          >
                            {p.leistung_name}
                          </p>
                          {preisLabel ? (
                            <p
                              className={cn(
                                "hidden shrink-0 text-fs-title font-bold tabular-nums sm:block",
                                isBlocked
                                  ? "text-text-tertiary"
                                  : "text-text-primary"
                              )}
                            >
                              {preisLabel}
                            </p>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-fs-meta text-text-tertiary">
                          {meta}
                        </p>
                        {isRegie ? (
                          <div className="mt-1.5 space-y-0.5 text-fs-meta text-text-secondary">
                            <p className="flex justify-between gap-3">
                              <span className="shrink-0 text-text-tertiary">
                                Arbeitsstunden
                              </span>
                              <span className="min-w-0 text-right font-semibold tabular-nums text-text-primary">
                                {arbeitsMin > 0
                                  ? formatZeitMinuten(arbeitsMin)
                                  : "—"}
                              </span>
                            </p>
                            <p className="flex justify-between gap-3">
                              <span className="shrink-0 text-text-tertiary">
                                Gesamtpreis
                              </span>
                              <span className="min-w-0 text-right font-semibold tabular-nums text-text-primary">
                                {gesamtPreis != null
                                  ? formatEuro(gesamtPreis)
                                  : "—"}
                              </span>
                            </p>
                          </div>
                        ) : null}
                        {inPruefung ? (
                          <p className="mt-1 text-fs-meta font-semibold text-warning-text">
                            Eingereicht — noch zur Prüfung. Nach Freigabe wie
                            üblich starten und abschließen.
                          </p>
                        ) : null}

                        {/* Desktop: Text-Buttons in einer Zeile */}
                        {showUpdateBtn || showErledigtBtn ? (
                          <div className="mt-2.5 hidden flex-row flex-wrap gap-2 sm:flex">
                            {showUpdateBtn ? (
                              <PortalButton
                                variant="primary"
                                type="button"
                                onClick={() =>
                                  setSheet({ mode: updateMode, position: p })
                                }
                              >
                                {updateLabel}
                              </PortalButton>
                            ) : null}
                            {showErledigtBtn ? (
                              <PortalButton
                                variant="secondary"
                                type="button"
                                onClick={() =>
                                  setSheet({ mode: "erledigt", position: p })
                                }
                              >
                                {erledigtLabel}
                              </PortalButton>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      {/* Mobil: zwei Icons rechts neben der Zeile */}
                      {showUpdateBtn || showErledigtBtn ? (
                        <div className="flex shrink-0 flex-row items-start gap-1.5 sm:hidden">
                          {showUpdateBtn ? (
                            <PositionActionIconBtn
                              label={updateLabel}
                              variant="primary"
                              onClick={() =>
                                setSheet({ mode: updateMode, position: p })
                              }
                            >
                              <PortalIcon n="photo" ctx="default" className="h-[18px] w-[18px]" />
                            </PositionActionIconBtn>
                          ) : null}
                          {showErledigtBtn ? (
                            <PositionActionIconBtn
                              label={erledigtLabel}
                              variant="outline"
                              onClick={() =>
                                setSheet({ mode: "erledigt", position: p })
                              }
                            >
                              <PortalIcon n="check" ctx="default" className="h-[18px] w-[18px]" />
                            </PositionActionIconBtn>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <PartnerLeistungUpdatesAccordion
                      eintraege={updatesByPosition.get(p.id) ?? []}
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-0 py-4 text-center text-fs-body text-text-tertiary">
              Alle offenen Leistungen erledigt.
            </p>
          )}

          {erledigtPositionen.length > 0 ? (
            <div className="border-t border-border-light pt-1">
              <PortalButton
                variant="ghost"
                type="button"
                className="flex min-h-[48px] w-full items-center justify-between gap-3 px-0 py-2.5 text-left"
                aria-expanded={erledigtAccordionOpen}
                onClick={() => setErledigtAccordionOpen((o) => !o)}
              >
                <span className="text-fs-body font-bold text-text-primary">
                  {erledigtPositionen.length} erledigt
                </span>
                <PortalIcon n="chevron-down" ctx="default" className={cn(
                    "h-5 w-5 shrink-0 text-text-tertiary transition-transform",
                    erledigtAccordionOpen && "rotate-180"
                  )} aria-hidden />
              </PortalButton>
              {erledigtAccordionOpen ? (
                <ul className="divide-y divide-border-light border-t border-border-light">
                  {erledigtPositionen.map((p) => {
                    const isAufwand = p.verguetung === "aufwand";
                    const isRegie = p.typ === "regie" || isAufwand;
                    const meta = positionMetaLine(p, {
                      preferred: false,
                      blocked: false,
                    });
                    const preisLabel = !isRegie
                      ? formatPartnerPreisLabel(p)
                      : null;
                    return (
                      <li key={p.id} className="px-0 py-3">
                        <div className="flex items-start gap-2.5">
                          <div
                            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-field border border-accent bg-accent text-white"
                            aria-hidden
                          >
                            <PortalIcon n="check" ctx="default" className="h-3 w-3" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-fs-title font-bold leading-snug text-text-primary">
                                {p.leistung_name}
                              </p>
                              {preisLabel ? (
                                <p className="shrink-0 text-fs-title font-bold tabular-nums text-text-primary">
                                  {preisLabel}
                                </p>
                              ) : null}
                            </div>
                            <p className="mt-0.5 text-fs-meta text-text-tertiary">
                              {meta}
                            </p>
                            <PartnerLeistungUpdatesAccordion
                              eintraege={updatesByPosition.get(p.id) ?? []}
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {!readOnly ? (
        <div className="space-y-2">
          <PortalButton
            variant="ghost"
            type="button"
            className="w-full rounded-[10px] border border-dashed px-3 py-3 text-fs-body font-semibold text-text-primary"
            style={{ borderColor: PORTAL_VAR.line, background: "var(--p2-panel)" }}
            onClick={() => setNachtragOpen(true)}
          >
            + Nachtrag / Regie
          </PortalButton>
          <p className="text-fs-caption leading-relaxed text-text-tertiary">
            Zusätzliche Arbeit erst melden — Bärenwald prüft und weist zu.
          </p>
        </div>
      ) : null}

      {sheet ? (
        <PortalModalShell
          open
          title={
            sheet.mode === "erledigt"
              ? sheet.position.typ === "regie" ||
                sheet.position.verguetung === "aufwand"
                ? "Ende dokumentieren"
                : "Erledigt"
              : sheet.mode === "start" &&
                  (sheet.position.typ === "regie" ||
                    sheet.position.verguetung === "aufwand")
                ? "Start dokumentieren"
                : "Update"
          }
          subtitle={sheet.position.leistung_name}
          onClose={closeSheet}
          variant="edit"
          dirty={
            !submitting &&
            (beschreibung.trim().length > 0 ||
              sheetFotos.length > 0 ||
              sheet.mode !== "erledigt")
          }
          closeOnBackdrop={!submitting}
          busy={submitting}
          busyTitle={
            sheet.mode === "erledigt"
              ? "Wird abgeschlossen…"
              : "Wird gespeichert…"
          }
          busyBody="Fotos und Daten werden übertragen."
        >
          {(() => {
            const sheetIsRegie =
              sheet.position.typ === "regie" ||
              sheet.position.verguetung === "aufwand";
            const fotoPflicht =
              sheetIsRegie &&
              (sheet.mode === "start" || sheet.mode === "erledigt");
            const textPflicht = fotoPflicht;
            return (
          <form
            ref={sheetFormRef}
            className="flex flex-col gap-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (submitting) return;
              submitSheet(new FormData(e.currentTarget));
            }}
          >
            <input type="hidden" name="positionId" value={sheet.position.id} />
            {anfrageId ? (
              <input type="hidden" name="anfrageId" value={anfrageId} />
            ) : null}

            {sheetIsRegie && sheet.mode === "start" ? (
              <PortalField
                name="foto"
                error={fieldErrors.foto}
                required
              >
                <PartnerDirektKameraSlot
                  name="foto_start"
                  captureAtName="captureAt_start"
                  label="Start-Foto"
                  required
                />
              </PortalField>
            ) : sheetIsRegie && sheet.mode === "erledigt" ? (
              <PortalField
                name="foto"
                error={fieldErrors.foto}
                required
              >
                <PartnerDirektKameraSlot
                  name="foto_ende"
                  captureAtName="captureAt_ende"
                  label="Ende-Foto"
                  required
                />
              </PortalField>
            ) : (
              <PartnerMultiFotoSlot
                label={
                  sheet.mode === "erledigt"
                    ? "Ergebnis-Fotos"
                    : "Fotos (optional)"
                }
                required={false}
                value={sheetFotos}
                onChange={setSheetFotos}
                disabled={submitting}
              />
            )}

            <div>
              <PortalField
                name="beschreibung"
                error={fieldErrors.beschreibung}
                required={textPflicht}
              >
                <PartnerKiKorrekturField
                  scope="bautagebuch"
                  label="Beschreibung"
                  value={beschreibung}
                  onChange={(v) => {
                    setBeschreibung(v);
                    clearField("beschreibung");
                  }}
                  rows={8}
                  required={textPflicht}
                  leistungName={sheet.position.leistung_name}
                  auftragTitel={auftragTitel}
                  placeholder="Kurz beschreiben…"
                />
              </PortalField>
            </div>

            {sheetIsRegie &&
            (sheet.mode === "fortschritt" || sheet.mode === "erledigt") ? (
              <PortalField
                name="zeit"
                label="Tatsächliche Zeit Aufwand"
                error={fieldErrors.zeit}
                required={sheet.mode === "erledigt"}
                className="mt-3"
              >
                <div className="flex items-center gap-1.5">
                  <PortalSelect
                    name="zeitStd"
                    defaultValue={
                      sheet.position.zeit_minuten_summe
                        ? Math.floor(sheet.position.zeit_minuten_summe / 60)
                        : 0
                    }
                    aria-label="Stunden"
                    className="portal-input min-w-0 flex-1 rounded-field border border-border-default px-2 py-2.5"
                    onChange={() => clearField("zeit")}
                  >
                    {Array.from({ length: 49 }, (_, h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")} Std
                      </option>
                    ))}
                  </PortalSelect>
                  <span className="text-fs-body font-semibold text-text-tertiary">
                    :
                  </span>
                  <PortalSelect
                    name="zeitMin"
                    defaultValue={
                      sheet.position.zeit_minuten_summe
                        ? sheet.position.zeit_minuten_summe % 60
                        : 0
                    }
                    aria-label="Minuten"
                    className="portal-input min-w-0 flex-1 rounded-field border border-border-default px-2 py-2.5"
                    onChange={() => clearField("zeit")}
                  >
                    {Array.from({ length: 60 }, (_, m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, "0")} Min
                      </option>
                    ))}
                  </PortalSelect>
                </div>
              </PortalField>
            ) : null}

            <div className="mt-5">
              <PortalButton
                variant="primary"
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? "Speichern…" : "Speichern"}
              </PortalButton>
            </div>
          </form>
            );
          })()}
        </PortalModalShell>
      ) : null}

      <PortalModalShell
        open={bulkErledigtOpen}
        title="Erledigt"
        subtitle={
          bulkSelected.length === 1
            ? sortedPositionen.find((p) => p.id === bulkSelected[0])
                ?.leistung_name ?? "1 Leistung"
            : `${bulkSelected.length} Leistungen — Beschreibung gilt für jede Position`
        }
        onClose={closeBulkErledigt}
        variant="edit"
        dirty={
          !submitting &&
          (bulkBeschreibung.trim().length > 0 || bulkFotos.length > 0)
        }
        closeOnBackdrop={!submitting}
        busy={submitting && bulkErledigtOpen}
        busyTitle="Wird abgeschlossen…"
        busyBody="Fotos und Daten werden übertragen."
      >
        <div className="flex flex-col gap-3">
          {bulkSelected.length > 1 ? (
            <ul className="max-h-28 space-y-1 overflow-y-auto rounded-sheet border border-border-light px-3 py-2">
              {bulkSelected.map((id) => {
                const name =
                  sortedPositionen.find((p) => p.id === id)?.leistung_name ??
                  "Leistung";
                return (
                  <li
                    key={id}
                    className="text-fs-meta font-semibold text-text-primary"
                  >
                    {name}
                  </li>
                );
              })}
            </ul>
          ) : null}
          <PartnerMultiFotoSlot
            label="Ergebnis-Fotos"
            required={false}
            value={bulkFotos}
            onChange={setBulkFotos}
            disabled={submitting}
          />
          <PartnerKiKorrekturField
            scope="bautagebuch"
            label="Beschreibung"
            value={bulkBeschreibung}
            onChange={setBulkBeschreibung}
            rows={8}
            auftragTitel={auftragTitel}
            placeholder="Kurz beschreiben… (wird bei jeder Position hinterlegt)"
          />
          <PortalButton
            variant="primary"
            type="button"
            className="mt-2 w-full"
            disabled={submitting}
            onClick={submitBulkErledigt}
          >
            {submitting
              ? "Speichern…"
              : bulkSelected.length === 1
                ? "Als erledigt speichern"
                : `${bulkSelected.length} als erledigt speichern`}
          </PortalButton>
        </div>
      </PortalModalShell>

      <PortalModalShell
        open={updateOpen}
        title="Update"
        subtitle="Leistungen auswählen und Fortschritt dokumentieren."
        onClose={closeUpdateSheet}
        variant="edit"
        dirty={
          !submitting &&
          (tbTitel.trim().length > 0 ||
            tbBeschreibung.trim().length > 0 ||
            tbSelected.length > 0 ||
            tbFotos.length > 0)
        }
        closeOnBackdrop={!submitting}
        busy={submitting && updateOpen}
        busyTitle="Wird gespeichert…"
        busyBody="Update wird übertragen."
      >
        <div className="flex flex-col gap-3">
          <div>
            <p className="portal-form-label">Leistungen</p>
            <p className="mt-0.5 text-fs-caption text-text-tertiary">
              Eine oder mehrere Leistungen für dieses Update.
            </p>
            {sortedPositionen.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <PortalButton
                  variant="secondary"
                  type="button"
                  disabled={
                    submitting ||
                    tbSelected.length === sortedPositionen.length
                  }
                  onClick={() => {
                    const all = sortedPositionen.map((p) => p.id);
                    setTbSelected(all);
                    setTbErledigt((er) => er.filter((x) => all.includes(x)));
                  }}
                >
                  Alle auswählen
                </PortalButton>
                <span className="text-fs-caption text-text-tertiary">
                  {tbSelected.length === 0
                    ? EMPTY.gewaehlt
                    : `${tbSelected.length} von ${sortedPositionen.length}`}
                </span>
              </div>
            ) : null}
            <ul className="mt-1.5 max-h-40 space-y-1 overflow-y-auto">
              {sortedPositionen.map((p) => {
                const checked = tbSelected.includes(p.id);
                const alreadyDone = p.leistung_status === "erledigt";
                return (
                  <li
                    key={p.id}
                    className="rounded-card border border-border-light px-2.5 py-2"
                  >
                    <label className="flex cursor-pointer items-start gap-2">
                      <PortalCheckbox
                        className="mt-1"
                        checked={checked}
                        disabled={submitting}
                        onChange={() => {
                          setTbSelected((prev) => {
                            const next = checked
                              ? prev.filter((x) => x !== p.id)
                              : [...prev, p.id];
                            setTbErledigt((er) =>
                              er.filter((x) => next.includes(x))
                            );
                            return next;
                          });
                        }}
                      />
                      <span className="min-w-0 flex-1 text-fs-body font-semibold">
                        {p.leistung_name}
                      </span>
                    </label>
                    {checked && !alreadyDone ? (
                      <label className="ml-6 mt-1 flex items-center gap-2 text-fs-caption text-text-secondary">
                        <PortalCheckbox
                          checked={tbErledigt.includes(p.id)}
                          disabled={submitting}
                          onChange={() =>
                            setTbErledigt((prev) =>
                              prev.includes(p.id)
                                ? prev.filter((x) => x !== p.id)
                                : [...prev, p.id]
                            )
                          }
                        />
                        Als erledigt markieren
                      </label>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>

          <PartnerKiKorrekturField
            scope="bautagebuch"
            name="titel"
            rohName="titel_roh"
            singleLine
            label="Titel"
            value={tbTitel}
            onChange={setTbTitel}
            auftragTitel={auftragTitel}
            placeholder="Kurzer Titel zum Update"
          />
          <PartnerKiKorrekturField
            scope="bautagebuch"
            label="Beschreibung"
            value={tbBeschreibung}
            onChange={setTbBeschreibung}
            rows={8}
            auftragTitel={auftragTitel}
            placeholder="Was wurde gemacht?"
          />
          <PartnerMultiFotoSlot
            label="Fotos (optional)"
            required={false}
            value={tbFotos}
            onChange={setTbFotos}
            disabled={submitting}
          />
          <PortalButton
            variant="primary"
            type="button"
            className="mt-2 w-full"
            disabled={submitting}
            onClick={submitLeistungsUpdate}
          >
            {submitting ? "Speichern…" : "Speichern"}
          </PortalButton>
        </div>
      </PortalModalShell>

      <PortalModalShell
        open={nachtragOpen}
        title="Nachtrag / Regie"
        subtitle="Noch nicht ausführen — Bärenwald prüft und weist zu."
        onClose={closeNachtrag}
        variant="edit"
        dirty={
          !submitting &&
          (nachtragTitel.trim().length > 0 ||
            nachtragBegruendung.trim().length > 0 ||
            nachtragStundensatz.trim().length > 0 ||
            nachtragFotos.length > 0 ||
            nachtragHours > 0 ||
            nachtragMins > 0)
        }
        closeOnBackdrop={!submitting}
        busy={submitting && nachtragOpen}
        busyTitle="Nachtrag wird eingereicht…"
        busyBody="Einen Moment — Bärenwald erhält die Meldung."
      >
        <div className="flex flex-col gap-3">
          <PartnerMultiFotoSlot
            label="Fotos"
            required={false}
            value={nachtragFotos}
            onChange={setNachtragFotos}
            disabled={submitting}
          />
          <label className="flex flex-col gap-1">
            <span className="text-fs-caption font-bold tracking-wide text-text-tertiary">
              Titel *
            </span>
            <PortalInput
              value={nachtragTitel}
              onChange={(e) => setNachtragTitel(e.target.value)}
              required
              minLength={4}
              placeholder="z. B. Zusätzliche Leitung verlegen"
              className="portal-input w-full rounded-field border border-border-default px-3 py-2.5"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-fs-caption font-bold tracking-wide text-text-tertiary">
              Begründung *
            </span>
            <PortalTextarea
              value={nachtragBegruendung}
              onChange={(e) => setNachtragBegruendung(e.target.value)}
              required
              minLength={8}
              rows={8}
              placeholder="Warum nötig? Was wurde vorgefunden?"
              className="portal-input w-full min-h-[160px] resize-y rounded-field border border-border-default px-3 py-3 text-fs-title leading-relaxed"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-fs-caption font-bold tracking-wide text-text-tertiary">
                Stundensatz in €
              </span>
              <PortalInput
                type="text"
                inputMode="decimal"
                value={nachtragStundensatz}
                onChange={(e) => setNachtragStundensatz(e.target.value)}
                placeholder="z. B. 65"
                className="portal-input w-full rounded-field border border-border-default px-3 py-2.5"
              />
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-fs-caption font-bold tracking-wide text-text-tertiary">
                Geschätzte Zeit Aufwand
              </span>
              <div className="flex items-center gap-1.5">
                <PortalSelect
                  value={nachtragHours}
                  onChange={(e) => setNachtragHours(Number(e.target.value))}
                  aria-label="Stunden"
                  className="portal-input min-w-0 flex-1 rounded-field border border-border-default px-2 py-2.5"
                >
                  {Array.from({ length: 49 }, (_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, "0")}
                    </option>
                  ))}
                </PortalSelect>
                <span className="text-fs-body font-semibold text-text-tertiary">
                  :
                </span>
                <PortalSelect
                  value={nachtragMins}
                  onChange={(e) => setNachtragMins(Number(e.target.value))}
                  aria-label="Minuten"
                  className="portal-input min-w-0 flex-1 rounded-field border border-border-default px-2 py-2.5"
                >
                  {Array.from({ length: 60 }, (_, m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, "0")}
                    </option>
                  ))}
                </PortalSelect>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5">
          <PortalButton
            variant="primary"
            block
            disabled={
              submitting ||
              nachtragTitel.trim().length < 4 ||
              nachtragBegruendung.trim().length < 8
            }
            onClick={() => submitNachtrag()}
          >
            {submitting ? "Senden…" : "Zur Prüfung"}
          </PortalButton>
        </div>
      </PortalModalShell>
    </div>
  );
}
