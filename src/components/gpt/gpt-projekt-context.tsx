"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { GPT_VIZ_SESSION_STORAGE_KEY } from "@/lib/gpt-viz/constants";
import { getOrCreateGptVisitorToken } from "@/lib/gpt-viz/visitor-token";
import type { GptProjektBrief } from "@/lib/gpt-viz/types";

type GptProjektContextValue = {
  sessionId: string | null;
  brief: GptProjektBrief | null;
  loadingBrief: boolean;
  sessionError: string | null;
  clearSessionError: () => void;
  ensureSession: () => Promise<string | null>;
  refreshBrief: () => Promise<void>;
  mergeChatVerlauf: (
    verlauf: { role: "user" | "assistant"; content: string }[]
  ) => Promise<void>;
};

const GptProjektContext = createContext<GptProjektContextValue | null>(null);

export function GptProjektProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [brief, setBrief] = useState<GptProjektBrief | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(GPT_VIZ_SESSION_STORAGE_KEY);
    if (stored) setSessionId(stored);
  }, []);

  const refreshBrief = useCallback(async () => {
    if (!sessionId) {
      setBrief(null);
      return;
    }
    setLoadingBrief(true);
    try {
      const res = await fetch(
        `/api/gpt-projekt/brief?sessionId=${encodeURIComponent(sessionId)}`
      );
      if (!res.ok) {
        setBrief(null);
        return;
      }
      const data = (await res.json()) as { brief: GptProjektBrief };
      setBrief(data.brief);
    } catch {
      setBrief(null);
    } finally {
      setLoadingBrief(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void refreshBrief();
  }, [refreshBrief]);

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId;
    try {
      const res = await fetch("/api/gpt-viz/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitor_token: getOrCreateGptVisitorToken() }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setSessionError(err.error ?? "Session konnte nicht gestartet werden.");
        return null;
      }
      const data = (await res.json()) as { session_id: string };
      setSessionError(null);
      localStorage.setItem(GPT_VIZ_SESSION_STORAGE_KEY, data.session_id);
      setSessionId(data.session_id);
      return data.session_id;
    } catch {
      return null;
    }
  }, [sessionId]);

  const mergeChatVerlauf = useCallback(
    async (verlauf: { role: "user" | "assistant"; content: string }[]) => {
      const sid = sessionId ?? (await ensureSession());
      if (!sid) return;
      try {
        await fetch("/api/gpt-projekt/merge-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sid,
            ki_chat_verlauf: verlauf,
          }),
        });
        await refreshBrief();
      } catch {
        /* still show UI */
      }
    },
    [sessionId, ensureSession, refreshBrief]
  );

  const clearSessionError = useCallback(() => setSessionError(null), []);

  const value = useMemo(
    () => ({
      sessionId,
      brief,
      loadingBrief,
      sessionError,
      clearSessionError,
      ensureSession,
      refreshBrief,
      mergeChatVerlauf,
    }),
    [
      sessionId,
      brief,
      loadingBrief,
      sessionError,
      clearSessionError,
      ensureSession,
      refreshBrief,
      mergeChatVerlauf,
    ]
  );

  return (
    <GptProjektContext.Provider value={value}>{children}</GptProjektContext.Provider>
  );
}

export function useGptProjekt() {
  const ctx = useContext(GptProjektContext);
  if (!ctx) throw new Error("useGptProjekt nur innerhalb GptProjektProvider");
  return ctx;
}
