"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import {
  formatSchwelleEur,
  formatObjRegelnReview,
  OBJ_AUTOPASS_OFFENER_PUNKT,
  OBJ_TYP_OPTIONS,
  OBJ_WIZ_STEPS,
  OBJ_WIZ_TITLES,
  objWizNext,
  objWizValid,
  type ObjWizDraft,
  type ObjWizPayload,
} from "@/lib/portal2/objekte";

type Props = {
  initialDraft?: ObjWizDraft;
  /** Bestehende Notizen beim Bearbeiten (Meta mergen). */
  existingNotizen?: string | null;
  editMode?: boolean;
  defaultHv?: string;
  onCancel: () => void;
  onDone: (payload: ObjWizPayload) => Promise<void>;
};

function OptRow({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-[10px] border px-3 py-3 text-left text-sm font-medium transition-colors",
        selected
          ? "border-accent bg-accent-light text-accent"
          : "border-border-default bg-white text-text-primary hover:border-accent/40"
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px]",
          selected
            ? "border-accent bg-accent text-white"
            : "border-border-default text-transparent"
        )}
      >
        ✓
      </span>
      {label}
    </button>
  );
}

export function OrganisationObjektWizard({
  initialDraft,
  existingNotizen,
  editMode,
  defaultHv,
  onCancel,
  onDone,
}: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<ObjWizDraft>(() => ({
    we: 1,
    schwelle: 500,
    autopass: false,
    hv: defaultHv ?? "",
    ...initialDraft,
  }));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const step = OBJ_WIZ_STEPS[stepIndex]?.[0] ?? "stamm";
  const set = (k: keyof ObjWizDraft, val: string | number | boolean) => {
    setDraft((d) => ({ ...d, [k]: val }));
    setErr("");
  };

  const we =
    draft.we === undefined || draft.we === "" ? 1 : Number(draft.we) || 1;
  const schwelle =
    draft.schwelle === undefined ||
    draft.schwelle === null ||
    draft.schwelle === ""
      ? 500
      : Number(draft.schwelle);
  const valid = objWizValid(step, draft);

  const titles = {
    ...OBJ_WIZ_TITLES,
    fertig: editMode ? "Prüfen & speichern" : "Prüfen & anlegen",
  };

  const advance = async () => {
    const result = objWizNext(
      OBJ_WIZ_STEPS,
      stepIndex,
      draft,
      existingNotizen
    );
    if (!result.ok) {
      setErr(result.error);
      return;
    }
    if (!result.done) {
      setStepIndex(result.stepIndex);
      setErr("");
      return;
    }
    setBusy(true);
    try {
      await onDone(result.payload);
    } finally {
      setBusy(false);
    }
  };

  let content: React.ReactNode = null;

  if (step === "stamm") {
    content = (
      <div className="flex flex-col gap-3.5">
        <label className="block">
          <span className="portal-text-label mb-1.5 block text-text-secondary">
            Bezeichnung
          </span>
          <input
            className="portal-input w-full rounded-[10px] border border-border-default px-3 py-3 text-sm"
            placeholder="z. B. Lindenstraße 24"
            value={draft.name ?? ""}
            onChange={(e) => set("name", e.target.value)}
          />
        </label>
        <div>
          <span className="portal-text-label mb-1.5 block text-text-secondary">
            Objekttyp
          </span>
          <div className="flex flex-col gap-2">
            {OBJ_TYP_OPTIONS.map((t) => (
              <OptRow
                key={t}
                label={t}
                selected={draft.typ === t}
                onSelect={() => set("typ", t)}
              />
            ))}
          </div>
        </div>
        <label className="block">
          <span className="portal-text-label mb-1.5 block text-text-secondary">
            Adresse
          </span>
          <input
            className="portal-input w-full rounded-[10px] border border-border-default px-3 py-3 text-sm"
            placeholder="Straße & Hausnummer"
            value={draft.adr ?? ""}
            onChange={(e) => set("adr", e.target.value)}
          />
        </label>
        <label className="block">
          <span className="portal-text-label mb-1.5 block text-text-secondary">
            PLZ / Ort
          </span>
          <input
            className="portal-input w-full rounded-[10px] border border-border-default px-3 py-3 text-sm"
            placeholder="z. B. 80802 München"
            value={draft.plz ?? ""}
            onChange={(e) => set("plz", e.target.value)}
          />
        </label>
      </div>
    );
  } else if (step === "einheiten") {
    const isEfh = draft.typ === "Einfamilienhaus (B2C)";
    content = (
      <div className="flex flex-col gap-3.5">
        <div>
          <span className="portal-text-label mb-1.5 block text-text-secondary">
            Anzahl Wohneinheiten
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-[42px] w-[42px] items-center justify-center rounded-[10px] border border-border-default bg-white text-xl text-text-secondary"
              onClick={() => set("we", Math.max(1, we - 1))}
            >
              −
            </button>
            <input
              type="number"
              min={1}
              className="w-20 rounded-[10px] border border-border-default px-3 py-3 text-center text-base font-bold"
              value={we}
              onChange={(e) => set("we", e.target.value)}
            />
            <button
              type="button"
              className="flex h-[42px] w-[42px] items-center justify-center rounded-[10px] border border-border-default bg-white text-xl text-text-secondary"
              onClick={() => set("we", we + 1)}
            >
              ＋
            </button>
          </div>
          {isEfh ? (
            <p className="mt-2 text-xs text-text-tertiary">
              Einfamilienhäuser haben in der Regel 1 Einheit.
            </p>
          ) : null}
        </div>
        <p className="rounded-[10px] bg-muted px-3.5 py-2.5 text-[12.5px] leading-relaxed text-text-secondary">
          Wohneinheiten und Mieter können nach dem Anlegen im Objekt-Detail
          ergänzt werden.
        </p>
      </div>
    );
  } else if (step === "verwaltung") {
    content = (
      <div className="flex flex-col gap-3.5">
        <label className="block">
          <span className="portal-text-label mb-1.5 block text-text-secondary">
            Hausverwaltung
          </span>
          <input
            className="portal-input w-full rounded-[10px] border border-border-default px-3 py-3 text-sm"
            placeholder="z. B. Immobilien Steiner GmbH"
            value={draft.hv ?? ""}
            onChange={(e) => set("hv", e.target.value)}
          />
        </label>
        <label className="block">
          <span className="portal-text-label mb-1.5 block text-text-secondary">
            Ansprechpartner (optional)
          </span>
          <input
            className="portal-input w-full rounded-[10px] border border-border-default px-3 py-3 text-sm"
            placeholder="Name"
            value={draft.kontakt ?? ""}
            onChange={(e) => set("kontakt", e.target.value)}
          />
        </label>
        <label className="block">
          <span className="portal-text-label mb-1.5 block text-text-secondary">
            Telefon (optional)
          </span>
          <input
            type="tel"
            className="portal-input w-full rounded-[10px] border border-border-default px-3 py-3 text-sm"
            placeholder="030 / …"
            value={draft.tel ?? ""}
            onChange={(e) => set("tel", e.target.value)}
          />
        </label>
      </div>
    );
  } else if (step === "regeln") {
    content = (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => set("autopass", !draft.autopass)}
          className="flex w-full items-start gap-3 rounded-[12px] border border-border-default bg-white p-4 text-left"
        >
          <span
            className={cn(
              "mt-0.5 flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors",
              draft.autopass ? "bg-accent" : "bg-border-default"
            )}
            aria-hidden
          >
            <span
              className={cn(
                "h-5 w-5 rounded-full bg-white shadow transition-transform",
                draft.autopass ? "translate-x-4" : "translate-x-0"
              )}
            />
          </span>
          <span>
            <span className="block text-[13.5px] font-semibold text-text-primary">
              Notfall-Autopass
            </span>
            <span className="mt-1 block text-xs leading-snug text-text-secondary">
              Bei Notfällen direkt Handwerker anfragen, ohne HV-Freigabe.
            </span>
            <span className="mt-1.5 block text-[11px] text-text-tertiary">
              {OBJ_AUTOPASS_OFFENER_PUNKT}
            </span>
          </span>
        </button>
        <div className="rounded-[12px] border border-border-default bg-white p-4">
          <p className="text-[13.5px] font-semibold text-text-primary">
            Freigabe-Schwellenwert
          </p>
          <p className="mb-3 mt-1 text-xs leading-snug text-text-secondary">
            Angebote bis zu diesem Betrag ohne HV-Freigabe beauftragen.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={2000}
              step={50}
              value={Number.isFinite(schwelle) ? schwelle : 500}
              onChange={(e) => set("schwelle", Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-[100px] text-right font-[family-name:var(--font-display)] text-lg font-bold text-accent">
              {formatSchwelleEur(schwelle)}
            </span>
          </div>
        </div>
      </div>
    );
  } else {
    const row = (k: string, v: string | number | undefined) => (
      <div key={k} className="text-[13px]">
        <b>{k}: </b>
        {v === undefined || v === "" ? "—" : String(v)}
      </div>
    );
    content = (
      <div className="py-3 text-center">
        <p className="mb-2 text-[28px]" aria-hidden>
          🏢
        </p>
        <p className="mb-3.5 font-[family-name:var(--font-display)] text-[17px] font-bold text-text-primary">
          {editMode ? "Änderungen prüfen" : "Objekt anlegen"}
        </p>
        <div className="flex flex-col gap-1.5 rounded-[10px] bg-muted p-3.5 text-left text-[13px]">
          {row("Bezeichnung", draft.name)}
          {row("Typ", draft.typ)}
          {row(
            "Adresse",
            [draft.adr, draft.plz].filter(Boolean).join(", ")
          )}
          {row(
            "Einheiten",
            draft.typ === "Einfamilienhaus (B2C)" ? 1 : we
          )}
          {row("Verwaltung", draft.hv)}
          {row(
            "Regeln",
            formatObjRegelnReview(!!draft.autopass, schwelle)
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="mb-4">
        <button
          type="button"
          className="mb-3 text-[13px] font-semibold text-accent"
          onClick={() => {
            if (stepIndex === 0) onCancel();
            else {
              setStepIndex((i) => i - 1);
              setErr("");
            }
          }}
        >
          ‹ {stepIndex === 0 ? "Abbrechen" : "Zurück"}
        </button>
        <div className="mb-1.5 flex gap-1">
          {OBJ_WIZ_STEPS.map((_, si) => (
            <div
              key={si}
              className={cn(
                "h-1 flex-1 rounded-sm",
                si <= stepIndex ? "bg-accent" : "bg-border-default"
              )}
            />
          ))}
        </div>
        <p className="mb-1 text-xs font-semibold text-text-tertiary">
          Schritt {stepIndex + 1} von {OBJ_WIZ_STEPS.length}
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-[22px] font-bold text-text-primary md:text-[23px]">
          {titles[step]}
        </h2>
      </div>

      <div className="mx-auto w-full max-w-[640px] space-y-3">
        {err ? (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-[9px] border border-[#F5C2C0] bg-[#FDECEC] px-3 py-2.5 text-[12.5px] font-semibold text-[#B42318]"
          >
            <span aria-hidden>⚠</span>
            {err}
          </div>
        ) : null}
        {content}
      </div>

      <div className="mt-6 border-t border-border-default pt-4">
        <button
          type="button"
          disabled={busy || (!valid && step !== "fertig")}
          onClick={() => void advance()}
          className={cn(
            "w-full max-w-[640px] rounded-[10px] px-4 py-3.5 text-[15px] font-semibold text-white",
            valid || step === "fertig"
              ? "bg-accent hover:opacity-95"
              : "cursor-not-allowed bg-[#B9C4BC]"
          )}
        >
          {busy
            ? "Speichern…"
            : stepIndex < OBJ_WIZ_STEPS.length - 1
              ? "Weiter"
              : editMode
                ? "Speichern"
                : "Objekt anlegen"}
        </button>
      </div>
    </div>
  );
}
