"use client";

import { useEffect, useState } from "react";

import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";

export type PortalInviteMailtoReady = {
  mailto: string;
  /** Registrierungs-Link (zum Kopieren) */
  url?: string | null;
  rolle?: string;
  toEmail?: string | null;
};

/**
 * Nach API-Einladung: Mail-App nur per echtem Button-Klick öffnen.
 * `mailto:` nach fetch/setTimeout wird vom Browser oft blockiert.
 */
export function PortalInviteMailtoSheet({
  open,
  payload,
  onClose,
}: {
  open: boolean;
  payload: PortalInviteMailtoReady | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const url = payload?.url?.trim() || "";
  const mailto = payload?.mailto?.trim() || "";
  const rolle = payload?.rolle?.trim() || "";
  const toEmail = payload?.toEmail?.trim() || "";

  useEffect(() => {
    if (!open || !url) return;
    let cancelled = false;
    void (async () => {
      try {
        await navigator.clipboard.writeText(url);
        if (!cancelled) {
          setCopied(true);
          orgPortalToast.linkKopiert();
        }
      } catch {
        /* Button „Kopieren“ bleibt */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, url]);

  async function copyAgain() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      orgPortalToast.linkKopiert();
    } catch {
      portalToastError("Kopieren fehlgeschlagen");
    }
  }

  function openMail() {
    if (!mailto) return;
    // Synchron im Click-Handler — sonst blockiert der Browser mailto.
    window.location.href = mailto;
  }

  return (
    <PortalModalShell
      open={open && Boolean(payload)}
      title="Portal-Link bereit"
      subtitle={
        rolle
          ? `Einladung für ${rolle}${toEmail ? ` · ${toEmail}` : ""}`
          : toEmail
            ? toEmail
            : "Kein Mail-Programm automatisch — bitte Button nutzen."
      }
      onClose={onClose}
      variant="confirm"
      footer={
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="portal-action-btn portal-action-btn--primary portal-action-btn--block"
            disabled={!mailto}
            onClick={openMail}
          >
            Mail-App öffnen
          </button>
          <button
            type="button"
            className="portal-action-btn portal-action-btn--secondary portal-action-btn--block"
            disabled={!url}
            onClick={() => void copyAgain()}
          >
            {copied ? "Link kopiert" : "Link kopieren"}
          </button>
          <button
            type="button"
            className="portal-action-btn portal-action-btn--ghost portal-action-btn--block"
            onClick={onClose}
          >
            Fertig
          </button>
        </div>
      }
    >
      <p className="portal-text-body text-text-secondary">
        Der Browser öffnet die Mail-App oft nicht von allein. Tippe auf „Mail-App
        öffnen“ — oder kopiere den Link und sende ihn selbst.
      </p>
      {url ? (
        <p className="mt-3 break-all rounded-[10px] border border-border-light bg-white px-3 py-2.5 text-[12.5px] text-text-secondary">
          {url}
        </p>
      ) : null}
    </PortalModalShell>
  );
}
