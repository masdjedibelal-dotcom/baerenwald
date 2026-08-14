"use client";

import { useCallback, useEffect, useState } from "react";

import {
  EinstellungenSectionHeader,
  EinstellungenToggle,
} from "@/components/shared/PortalEinstellungenUi";
import {
  canRequestPushPermission,
  isIosDevice,
  isPushClientSupported,
  isStandaloneDisplay,
  setPushEnabled,
} from "@/lib/push/client";
import type { PushPortalScope } from "@/lib/push/types";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
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
    if (isStandaloneDisplay()) {
      setStatusHint("Als App auf dem Home-Bildschirm — Push möglich.");
      return;
    }
    setStatusHint(
      "Funktioniert im Browser und als Home-Bildschirm-App (iOS nur als App)."
    );
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
      await setPushEnabled(next, portal);
      setEnabled(next);
      portalToastSuccess(
        next
          ? "Push-Benachrichtigungen aktiviert"
          : "Push-Benachrichtigungen deaktiviert"
      );
      refreshHint();
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
      const res = await fetch("/api/push/test", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        portalToastError(json.error || "Test fehlgeschlagen.");
        return;
      }
      portalToastSuccess("Testnachricht gesendet");
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
      <p className="portal-text-meta" style={{ color: PORTAL_VAR.sub }}>
        Push auf dem Sperrbildschirm bei neuen Vorgängen und wenn ein Angebot
        vorliegt. Die In-App-Glocke bleibt immer aktiv. Keine Preise in den
        Push-Texten.
      </p>

      <EinstellungenToggle
        checked={enabled}
        onChange={onToggle}
        disabled={disableToggle}
        title="Push-Benachrichtigungen"
        description={loading ? "Lade Status…" : statusHint}
      />

      {isIosDevice() && !isStandaloneDisplay() ? (
        <div className="rounded-[11px] border border-border-default px-3.5 py-3">
          <p className="portal-text-card-title">Zum Home-Bildschirm</p>
          <ol
            className="portal-text-meta mt-2 list-decimal space-y-1 pl-4"
            style={{ color: PORTAL_VAR.sub }}
          >
            <li>Safari: Teilen-Symbol tippen</li>
            <li>„Zum Home-Bildschirm“ wählen</li>
            <li>App öffnen und Push hier aktivieren</li>
          </ol>
        </div>
      ) : null}

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
