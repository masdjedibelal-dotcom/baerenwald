"use client";

import { useEffect, useState } from "react";

import { PortalModalShell } from "@/components/shared/PortalModalShell";
import {
  canRequestPushPermission,
  isPushClientSupported,
  setPushEnabled,
} from "@/lib/push/client";
import type { PushPortalScope } from "@/lib/push/types";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";

const STORAGE_KEY = "bw_push_optin_dismissed_at";
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

type Props = {
  portal: PushPortalScope;
  enabled?: boolean;
};

/**
 * Soft-Prompt für Push (kein sofortiger Permission-Dialog).
 */
export function PortalPushOptInBanner({ portal, enabled = true }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled || !isPushClientSupported()) return;
    const gate = canRequestPushPermission();
    if (!gate.ok && gate.reason !== "ios_needs_pwa") return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const ts = Number(raw);
        if (Number.isFinite(ts) && Date.now() - ts < COOLDOWN_MS) return;
      }
    } catch {
      /* ignore */
    }

    let timer: number | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/push/prefs");
        const json = (await res.json()) as { push_enabled?: boolean };
        if (cancelled || (res.ok && json.push_enabled)) return;
      } catch {
        return;
      }
      timer = window.setTimeout(() => {
        if (!cancelled) setOpen(true);
      }, 2500);
    })();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [enabled, portal]);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  async function activate() {
    setBusy(true);
    try {
      await setPushEnabled(true, portal);
      portalToastSuccess("Push-Benachrichtigungen aktiviert");
      dismiss();
    } catch (e) {
      portalToastError(
        e instanceof Error ? e.message : "Aktivierung fehlgeschlagen."
      );
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <PortalModalShell
      open={open}
      onClose={dismiss}
      title="Benachrichtigungen"
      variant="confirm"
      onConfirm={() => void activate()}
      confirmDisabled={busy}
      confirmLabel="Aktivieren"
      busy={busy}
      busyTitle="Wird aktiviert…"
    >
      <p className="portal-text-body text-text-secondary">
        Sofort erfahren, wenn ein neuer Vorgang eingeht oder ein Angebot
        vorliegt — auch bei geschlossenem Browser (Home-Bildschirm-App).
      </p>
      <p className="portal-text-meta mt-3 text-text-tertiary">
        × = später erneut erinnern · Haken = aktivieren
      </p>
    </PortalModalShell>
  );
}
