"use client";

import { useEffect, useState } from "react";

import { PortalButton } from "@/components/portal/PortalButton";
import {
  PortalSelect,
  PortalTextarea,
} from "@/components/shared/PortalFormControls";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import {
  PORTAL_KUNDE_ABLEHNUNG_GRUND_LABELS,
  PORTAL_KUNDE_ABLEHNUNG_GRUND_OPTIONS,
  type PortalKundeAblehnungGrund,
} from "@/lib/portal2/ablehnung-labels";

export type PortalAngebotAblehnenPayload = {
  grund: PortalKundeAblehnungGrund;
  notiz: string;
};

type Props = {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (payload: PortalAngebotAblehnenPayload) => void | Promise<void>;
  /** z. B. „Angebot ablehnen?“ */
  title?: string;
};

/**
 * Pflicht: Auswahlgrund + Freitext (Notiz). Speichert über rejectKundeAngebot → CRM-Spalten.
 */
export function PortalAngebotAblehnenModal({
  open,
  loading,
  onClose,
  onConfirm,
  title = "Angebot ablehnen?",
}: Props) {
  const [grund, setGrund] = useState<PortalKundeAblehnungGrund | "">("");
  const [notiz, setNotiz] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setGrund("");
      setNotiz("");
      setFieldError(null);
    }
  }, [open]);

  const dirty = Boolean(grund) || notiz.trim().length > 0;
  const canSubmit = Boolean(grund) && notiz.trim().length >= 3 && !loading;

  async function submit() {
    if (!grund) {
      setFieldError("Bitte einen Grund auswählen.");
      return;
    }
    if (notiz.trim().length < 3) {
      setFieldError("Bitte eine kurze Begründung eingeben (mindestens 3 Zeichen).");
      return;
    }
    setFieldError(null);
    await onConfirm({ grund, notiz: notiz.trim().slice(0, 500) });
  }

  return (
    <PortalModalShell
      open={open}
      title={title}
      onClose={() => {
        if (loading) return;
        onClose();
      }}
      variant="edit"
      dirty={dirty}
      closeOnBackdrop={!loading}
      busy={Boolean(loading)}
      onConfirm={() => void submit()}
      confirmDisabled={!canSubmit}
      confirmLabel="Ablehnen"
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="portal-form-label">
            Grund <span className="text-p2-danger">*</span>
          </span>
          <PortalSelect
            value={grund}
            disabled={loading}
            onChange={(e) => {
              setGrund(e.target.value as PortalKundeAblehnungGrund | "");
              setFieldError(null);
            }}
            className="portal-field w-full"
            required
          >
            <option value="">Bitte wählen…</option>
            {PORTAL_KUNDE_ABLEHNUNG_GRUND_OPTIONS.map((id) => (
              <option key={id} value={id}>
                {PORTAL_KUNDE_ABLEHNUNG_GRUND_LABELS[id]}
              </option>
            ))}
          </PortalSelect>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="portal-form-label">
            Begründung <span className="text-p2-danger">*</span>
          </span>
          <PortalTextarea
            value={notiz}
            onChange={(e) => {
              setNotiz(e.target.value);
              setFieldError(null);
            }}
            rows={3}
            maxLength={500}
            placeholder="Kurz erläutern, warum Sie ablehnen…"
            className="portal-input w-full rounded-field border border-border-default px-3 py-2.5"
            disabled={loading}
            required
          />
        </label>
        {fieldError ? (
          <p className="portal-text-meta text-p2-danger" role="alert">
            {fieldError}
          </p>
        ) : null}
        <div className="portal-modal-discard-actions portal-action-row mt-1">
          <PortalButton
            variant="secondary"
            disabled={loading}
            onClick={onClose}
          >
            Weiter bearbeiten
          </PortalButton>
          <PortalButton
            variant="danger"
            disabled={!canSubmit}
            onClick={() => void submit()}
          >
            {loading ? "Bitte warten…" : "Ablehnen"}
          </PortalButton>
        </div>
      </div>
    </PortalModalShell>
  );
}
