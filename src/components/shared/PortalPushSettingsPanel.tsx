"use client";

import { useCallback, useEffect, useState } from "react";

import {
  EinstellungenSectionHeader,
  EinstellungenToggle,
} from "@/components/shared/PortalEinstellungenUi";
import { usePortalBusy } from "@/components/shared/PortalBusyContext";
import {
  canRequestPushPermission,
  isPushClientSupported,
  setPushEnabled,
} from "@/lib/push/client";
import type { PushPortalScope } from "@/lib/push/types";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";

type Props = {
  portal: PushPortalScope;
};

/**
 * Master-Toggle Push für alle Portale (Einstellungen → Benachrichtigungen).
 */
export function PortalPushSettingsPanel({ portal }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [statusHint, setStatusHint] = useState<string>("");
  const { runBusy } = usePortalBusy();

  const refreshHint = useCallback(() => {
    const gate = canRequestPushPermission();
    if (!isPushClientSupported()) {
      setStatusHint("Dieses Gerät/Browser unterstützt keine Push-Benachrichtigungen.");
      return;
    }
    if (gate.reason === "ios_needs_pwa") {
      setStatusHint(
        "Auf dem iPhone: Teilen → „Zum Home-Bildschirm“ — danach hier aktivieren."
      );
      return;
    }
    if (gate.reason === "blocked") {
      setStatusHint(
        "Benachrichtigungen sind im System blockiert. Bitte in den Geräte-Einstellungen erlauben."
      );
      return;
    }
    setStatusHint("");
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/push/prefs");
        const json = (await res.json()) as {
          push_enabled?: boolean;
          error?: string;
        };
        if (!cancelled && res.ok) {
          setEnabled(Boolean(json.push_enabled));
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) {
          setLoading(false);
          refreshHint();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshHint]);

  async function onToggle(next: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      await runBusy(async () => {
        await setPushEnabled(next, portal);
        setEnabled(next);
        portalToastSuccess(
          next
            ? "Push-Benachrichtigungen aktiviert"
            : "Push-Benachrichtigungen deaktiviert"
        );
        refreshHint();
      });
    } catch (e) {
      portalToastError(
        e instanceof Error ? e.message : "Einstellung konnte nicht gespeichert werden."
      );
      refreshHint();
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    try {
      await runBusy(async () => {
        const res = await fetch("/api/push/test", { method: "POST" });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          portalToastError(json.error || "Test fehlgeschlagen.");
          return;
        }
        portalToastSuccess("Testnachricht gesendet");
      });
    } finally {
      setBusy(false);
    }
  }

  const disableToggle =
    busy ||
    loading ||
    (!enabled && canRequestPushPermission().reason === "ios_needs_pwa") ||
    (!enabled && canRequestPushPermission().reason === "blocked") ||
    (!enabled && canRequestPushPermission().reason === "unsupported");

  return (
    <div className="space-y-4">
      <EinstellungenSectionHeader title="Benachrichtigungen" />

      <EinstellungenToggle
        checked={enabled}
        onChange={onToggle}
        disabled={disableToggle}
        title="Push-Benachrichtigungen"
        description={loading ? "Lade Status…" : statusHint || undefined}
      />

      {enabled ? (
        <button
          type="button"
          className="btn-pill-outline portal-btn-compact"
          disabled={busy}
          onClick={() => void sendTest()}
        >
          Testnachricht senden
        </button>
      ) : null}
    </div>
  );
}
