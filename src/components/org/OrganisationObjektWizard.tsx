"use client";

import { useState } from "react";

import {
  EinstellungenCard,
  EinstellungenEuroSlider,
  EinstellungenInfoBox,
} from "@/components/shared/PortalEinstellungenUi";
import {
  EINSTELLUNGEN_SCHWELLE_SLIDER_MAX,
  EINSTELLUNGEN_SCHWELLE_SLIDER_MIN,
  EINSTELLUNGEN_SCHWELLE_SLIDER_STEP,
  formatEinstellungenSchwelle,
  snapEinstellungenSchwelle,
} from "@/lib/portal2/einstellungen";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import {
  formatObjRegelnReview,
  OBJ_SCHWELLE_INFO,
  OBJ_SCHWELLE_WIZARD_DESC,
  OBJ_SCHWELLE_WIZARD_TITLE,
  OBJ_TYP_OPTIONS,
  OBJ_WIZ_STEPS,
  OBJ_WIZ_TITLES,
  objWizNext,
  objWizValid,
  type ObjWizDraft,
  type ObjWizPayload,
} from "@/lib/portal2/objekte";
import { cn } from "@/lib/utils";

type Props = {
  initialDraft?: ObjWizDraft;
  /** Bestehende Notizen beim Bearbeiten (Meta mergen). */
  existingNotizen?: string | null;
  editMode?: boolean;
  defaultHv?: string;
  /** `modal` = Fullscreen wie Neuer Vorgang (PortalModalShell funnel). */
  variant?: "page" | "modal";
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
  variant = "page",
  onCancel,
  onDone,
}: Props) {
  const isModal = variant === "modal";
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
            placeholder="WEG Mustermannstraße 1"
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
        <div className="grid grid-cols-[1fr_100px] gap-2.5">
          <label className="block min-w-0">
            <span className="portal-text-label mb-1.5 block text-text-secondary">
              Straße
            </span>
            <input
              className="portal-input w-full rounded-[10px] border border-border-default px-3 py-3 text-sm"
              placeholder="Mustermannstraße"
              value={draft.strasse ?? ""}
              onChange={(e) => set("strasse", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="portal-text-label mb-1.5 block text-text-secondary">
              Nr.
            </span>
            <input
              className="portal-input w-full rounded-[10px] border border-border-default px-3 py-3 text-sm"
              placeholder="1"
              value={draft.hausnummer ?? ""}
              onChange={(e) => set("hausnummer", e.target.value)}
            />
          </label>
        </div>
        <div className="grid grid-cols-[110px_1fr] gap-2.5">
          <label className="block">
            <span className="portal-text-label mb-1.5 block text-text-secondary">
              PLZ
            </span>
            <input
              className="portal-input w-full rounded-[10px] border border-border-default px-3 py-3 text-sm"
              placeholder="80331"
              inputMode="numeric"
              autoComplete="postal-code"
              value={draft.plz ?? ""}
              onChange={(e) => set("plz", e.target.value)}
            />
          </label>
          <label className="block min-w-0">
            <span className="portal-text-label mb-1.5 block text-text-secondary">
              Ort
            </span>
            <input
              className="portal-input w-full rounded-[10px] border border-border-default px-3 py-3 text-sm"
              placeholder="München"
              autoComplete="address-level2"
              value={draft.ort ?? ""}
              onChange={(e) => set("ort", e.target.value)}
            />
          </label>
        </div>
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
        <p className="rounded-[10px] bg-muted px-3.5 py-2.5 text-[12.5px] leading-relaxed text-text-secondary">
          Optional — nur wenn für dieses Objekt ein eigener Ansprechpartner
          hinterlegt werden soll.
        </p>
        <label className="block">
          <span className="portal-text-label mb-1.5 block text-text-secondary">
            Ansprechpartner
          </span>
          <input
            className="portal-input w-full rounded-[10px] border border-border-default px-3 py-3 text-sm"
            placeholder="Name"
            value={draft.kontakt ?? ""}
            onChange={(e) => set("kontakt", e.target.value)}
            autoComplete="name"
          />
        </label>
        <label className="block">
          <span className="portal-text-label mb-1.5 block text-text-secondary">
            E-Mail
          </span>
          <input
            type="email"
            className="portal-input w-full rounded-[10px] border border-border-default px-3 py-3 text-sm"
            placeholder="name@firma.de"
            value={draft.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className="portal-text-label mb-1.5 block text-text-secondary">
            Telefon
          </span>
          <input
            type="tel"
            className="portal-input w-full rounded-[10px] border border-border-default px-3 py-3 text-sm"
            placeholder="089 / …"
            value={draft.tel ?? ""}
            onChange={(e) => set("tel", e.target.value)}
            autoComplete="tel"
          />
        </label>
      </div>
    );
  } else if (step === "regeln") {
    content = (
      <EinstellungenCard title={OBJ_SCHWELLE_WIZARD_TITLE}>
        <div className="flex flex-col gap-3">
          <p
            className="text-[13px] leading-[1.55]"
            style={{ color: PORTAL_VAR.sub }}
          >
            {OBJ_SCHWELLE_WIZARD_DESC}
          </p>
          <EinstellungenEuroSlider
            value={snapEinstellungenSchwelle(
              Number.isFinite(schwelle) ? schwelle : 500
            )}
            min={EINSTELLUNGEN_SCHWELLE_SLIDER_MIN}
            max={EINSTELLUNGEN_SCHWELLE_SLIDER_MAX}
            step={EINSTELLUNGEN_SCHWELLE_SLIDER_STEP}
            formatValue={formatEinstellungenSchwelle}
            onChange={(v) => set("schwelle", snapEinstellungenSchwelle(v))}
          />
          <EinstellungenInfoBox>
            {OBJ_SCHWELLE_INFO(
              snapEinstellungenSchwelle(Number.isFinite(schwelle) ? schwelle : 500)
            )}
          </EinstellungenInfoBox>
        </div>
      </EinstellungenCard>
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
            [
              [draft.strasse, draft.hausnummer].filter(Boolean).join(" "),
              [draft.plz, draft.ort].filter(Boolean).join(" "),
            ]
              .filter(Boolean)
              .join(", ")
          )}
          {row(
            "Einheiten",
            draft.typ === "Einfamilienhaus (B2C)" ? 1 : we
          )}
          {row("Ansprechpartner", draft.kontakt)}
          {row("E-Mail", draft.email)}
          {row("Telefon", draft.tel)}
          {row(
            "Regeln",
            formatObjRegelnReview(!!draft.autopass, schwelle)
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        isModal
          ? "portal-objekt-wizard--modal flex min-h-0 flex-1 flex-col"
          : "mx-auto flex w-full max-w-[640px] flex-col"
      )}
    >
      <div
        className={cn(
          isModal ? "min-h-0 flex-1 overflow-y-auto px-1 pb-4" : undefined
        )}
      >
        <div className={isModal ? "mb-4" : "mb-5"}>
          {stepIndex > 0 || !isModal ? (
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
          ) : null}
          <div className="mb-2 flex gap-1.5">
            {OBJ_WIZ_STEPS.map((_, si) => (
              <div
                key={si}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  si <= stepIndex ? "bg-accent" : "bg-border-default"
                )}
              />
            ))}
          </div>
          <p className="mb-1.5 text-xs font-semibold text-text-tertiary">
            Schritt {stepIndex + 1} von {OBJ_WIZ_STEPS.length}
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-[22px] font-bold leading-tight text-text-primary md:text-[23px]">
            {titles[step]}
          </h2>
        </div>

        <div className="w-full space-y-3">
          {err ? (
            <div
              role="alert"
              className="portal-danger-soft flex items-center gap-2 rounded-[9px] border px-3 py-2.5 text-[12.5px] font-semibold"
            >
              <span aria-hidden>⚠</span>
              {err}
            </div>
          ) : null}
          {content}
        </div>
      </div>

      <div
        className={cn(
          "border-t border-border-default",
          isModal
            ? "shrink-0 bg-white px-1 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
            : "mt-6 pt-4"
        )}
      >
        <button
          type="button"
          disabled={busy || (!valid && step !== "fertig")}
          onClick={() => void advance()}
          className={cn(
            "w-full rounded-[10px] px-4 py-3.5 text-[15px] font-semibold text-white",
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
