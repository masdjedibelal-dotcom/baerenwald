"use client";

import Image from "next/image";
import Link from "next/link";
import { ImagePlus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { GptChatBriefBar } from "@/components/gpt/GptChatBriefBar";
import { GptChatBubble } from "@/components/gpt/GptChatBubble";
import {
  messagesForClaude,
  newChatId,
  textMessagesForSync,
  type GptChatAction,
  type GptChatMessage,
  type GptVizPhase,
  type PendingUpload,
} from "@/components/gpt/gpt-chat-types";
import { useGptProjekt } from "@/components/gpt/gpt-projekt-context";
import type { KiRechnerFunnelData } from "@/components/funnel/KiRechnerChat";
import { useMobileComposerInset } from "@/hooks/use-mobile-composer-inset";
import { GPT_VIZ_MAX_RENDERS, VIZ_NACHPROMPT_TAGS } from "@/lib/gpt-viz/constants";
import type { GptVizRaumAnalyse } from "@/lib/gpt-viz/types";
import {
  countUserMessages,
  KI_MAX_USER_MESSAGES,
  KI_TEXTAREA_MAX_LINES,
} from "@/lib/ki-rechner/guards";
import { cn } from "@/lib/utils";

import "./gpt-viz.css";

const TEXTAREA_MIN_HEIGHT_PX = 40;

const INITIAL_TEXT = `Hi! Ich bin dein Handwerks-Assistent von Bärenwald — für Renovierung, Reparatur und Umbau in München.

Du kannst mir alles erzählen: Gewerke, Ablauf, Ideen — oder wir **visualisieren deinen Raum** mit Foto und Wunsch. Am Ende kannst du das Projekt direkt an uns senden.

Womit sollen wir starten?`;

type GptStudioChatProps = {
  onPreisBereit: (data: KiRechnerFunnelData) => void;
  onBeratungBereit: () => void;
  locked?: boolean;
};

function SendMessageIcon() {
  return (
    <svg className="ki-rechner-chat-send-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m22 2-7 20-4-9-9-4 20-7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2 11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GptStudioChat({ onPreisBereit, onBeratungBereit, locked = false }: GptStudioChatProps) {
  void onPreisBereit;
  void onBeratungBereit;

  const { sessionId, brief, ensureSession, refreshBrief, mergeChatVerlauf } = useGptProjekt();
  const [messages, setMessages] = useState<GptChatMessage[]>(() => [
    {
      id: newChatId(),
      role: "assistant",
      text: INITIAL_TEXT,
      actions: [
        { id: "start_viz", label: "Raum visualisieren" },
        { id: "start_beratung", label: "Erst beraten" },
      ],
    },
  ]);
  const [vizPhase, setVizPhase] = useState<GptVizPhase>("idle");
  const [wunschText, setWunschText] = useState("");
  const [istUrl, setIstUrl] = useState<string | null>(null);
  const [renderCount, setRenderCount] = useState(0);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatRootRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);

  const userMessageCount = countUserMessages(
    messagesForClaude(messages).map((m) => ({ role: m.role, content: m.content }))
  );
  const limitReached = userMessageCount >= KI_MAX_USER_MESSAGES;

  useMobileComposerInset(chatRootRef);

  const append = useCallback((msg: Omit<GptChatMessage, "id"> & { id?: string }) => {
    setMessages((prev) => [...prev, { ...msg, id: msg.id ?? newChatId() }]);
  }, []);

  const appendAssistant = useCallback(
    (text: string, extras?: Partial<Omit<GptChatMessage, "id" | "role">>) => {
      append({ role: "assistant", text, ...extras });
    },
    [append]
  );

  const scrollChatToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      messagesScrollRef.current?.scrollTo({
        top: messagesScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  useEffect(() => {
    scrollChatToEnd();
  }, [messages, loading, scrollChatToEnd]);

  useEffect(() => {
    void mergeChatVerlauf(textMessagesForSync(messages));
  }, [messages, mergeChatVerlauf]);

  useEffect(() => {
    if (!brief || hydratedRef.current) return;
    hydratedRef.current = true;
    if (brief.ist_bilder_urls[0]) setIstUrl(brief.ist_bilder_urls[0]);
    if (brief.wunsch_text) setWunschText(brief.wunsch_text);
    if (brief.ergebnis_bild_url) {
      setRenderCount(brief.render_count);
      setVizPhase(brief.gpt_erklaerung ? "lead" : "result");
    } else if (brief.ist_bilder_urls[0]) {
      setVizPhase("wunsch_confirm");
    }
  }, [brief]);

  const syncTextareaHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const styles = getComputedStyle(ta);
    const lineHeight = parseFloat(styles.lineHeight) || 22;
    const padY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const maxHeight = lineHeight * KI_TEXTAREA_MAX_LINES + padY;
    ta.style.height = `${Math.max(TEXTAREA_MIN_HEIGHT_PX, Math.min(ta.scrollHeight, maxHeight))}px`;
  }, []);

  useEffect(() => {
    syncTextareaHeight();
  }, [input, syncTextareaHeight]);

  const askClaude = useCallback(
    async (history: GptChatMessage[], sid: string | null, wunschOverride?: string) => {
      const res = await fetch("/api/gpt-studio/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesForClaude(history),
          gpt_session_id: sid,
          wunsch_text: wunschOverride?.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        displayText?: string;
        intent?: "render" | null;
      };
      if (!res.ok) throw new Error(data.error ?? "Antwort fehlgeschlagen.");
      return data;
    },
    []
  );

  const runRender = useCallback(async (wunschOverride?: string) => {
    const effectiveWunsch = (wunschOverride ?? wunschText).trim();
    if (!effectiveWunsch || !istUrl) return;
    const sid = sessionId ?? (await ensureSession());
    if (!sid) return;

    setLoading(true);
    setVizPhase("rendering");
    setError(null);

    try {
      const res = await fetch("/api/gpt-viz/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid, wunsch_text: effectiveWunsch }),
      });
      const data = (await res.json()) as {
        error?: string;
        ergebnis_bild_url?: string;
        render_count?: number;
      };
      if (!res.ok) {
        setError(data.error ?? "Render fehlgeschlagen.");
        setVizPhase("wunsch_confirm");
        return;
      }

      const resultUrl = data.ergebnis_bild_url!;
      setWunschText(effectiveWunsch);
      setRenderCount(data.render_count ?? renderCount + 1);
      setVizPhase("result");

      appendAssistant(
        "So könnte dein Raum aussehen — Vorher und Nachher. Dein **Zielbild** kannst du direkt darunter herunterladen.",
        {
          compare: {
            before: { url: istUrl, label: "Vorher", downloadName: "baerenwald-vorher.jpg" },
            after: { url: resultUrl, label: "Nachher", downloadName: "baerenwald-nachher.jpg" },
            beschreibung: effectiveWunsch,
          },
        }
      );

      await fetch("/api/gpt-viz/erklaerung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid }),
      });
      await refreshBrief();

      const history = [...messages];
      const claude = await askClaude(history, sid);
      const actions: GptChatAction[] = [{ id: "lead_start", label: "Projekt senden" }];
      const left = GPT_VIZ_MAX_RENDERS - (data.render_count ?? 0);
      if (left > 0) actions.unshift({ id: "render_again", label: "Noch anpassen" });
      appendAssistant(claude.displayText ?? "Frag mich gern, was das für dein Projekt bedeutet.", { actions });
      setVizPhase("lead");
    } catch {
      setError("Render fehlgeschlagen.");
      setVizPhase("wunsch_confirm");
    } finally {
      setLoading(false);
    }
  }, [wunschText, istUrl, sessionId, ensureSession, appendAssistant, messages, askClaude, renderCount, refreshBrief]);

  const handleUpload = useCallback(
    async (kind: "raum" | "inspiration", file: File) => {
      setLoading(true);
      setError(null);
      setPendingUpload(null);
      const sid = sessionId ?? (await ensureSession());
      if (!sid) {
        setError("Session konnte nicht gestartet werden.");
        setLoading(false);
        return;
      }

      const form = new FormData();
      form.set("session_id", sid);
      form.set("kind", kind);
      form.set("file", file);

      const userLabel =
        kind === "raum" ? "Hier ist ein Foto von meinem Raum." : "Hier ist mein Inspirationsbild.";

      try {
        const res = await fetch("/api/gpt-viz/upload", { method: "POST", body: form });
        const data = (await res.json()) as {
          error?: string;
          url?: string;
          ist_bilder_urls?: string[];
          ziel_bild_url?: string;
        };
        if (!res.ok) {
          setError(data.error ?? "Upload fehlgeschlagen.");
          return;
        }

        if (kind === "raum") {
          const url = data.ist_bilder_urls?.[data.ist_bilder_urls.length - 1] ?? data.url!;
          setIstUrl(url);
          await fetch("/api/gpt-viz/analyze-room", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sid, image_url: url, mode: "raum" }),
          });
          setVizPhase("wunsch_quelle");
        } else {
          const url = data.ziel_bild_url ?? data.url!;
          const analyzeRes = await fetch("/api/gpt-viz/analyze-room", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sid, image_url: url, mode: "inspiration" }),
          });
          const analyzeData = (await analyzeRes.json()) as {
            wunsch_text?: string;
            raum_analyse?: GptVizRaumAnalyse;
          };
          if (analyzeRes.ok && analyzeData.wunsch_text) {
            setWunschText(analyzeData.wunsch_text);
          }
          setVizPhase("wunsch_confirm");
        }

        await refreshBrief();

        const userMsg: GptChatMessage = {
          id: newChatId(),
          role: "user",
          text: userLabel,
          userImage: {
            url: kind === "raum" ? (data.ist_bilder_urls?.at(-1) ?? data.url!) : (data.ziel_bild_url ?? data.url!),
            label: kind === "raum" ? "Raumfoto" : "Inspiration",
            downloadName: "upload.jpg",
          },
        };
        const nextHistory = [...messages, userMsg];
        setMessages(nextHistory);

        const claude = await askClaude(nextHistory, sid);
        appendAssistant(claude.displayText ?? "Danke für das Foto!", {
          actions:
            kind === "raum"
              ? [
                  { id: "wunsch_inspiration", label: "Inspirationsbild" },
                  { id: "wunsch_text_mode", label: "Wunsch beschreiben" },
                ]
              : [{ id: "render", label: "So visualisieren" }],
        });
      } catch {
        setError("Upload fehlgeschlagen.");
      } finally {
        setLoading(false);
      }
    },
    [sessionId, ensureSession, messages, askClaude, appendAssistant, refreshBrief]
  );

  const handleAction = useCallback(
    async (actionId: string) => {
      if (loading) return;

      if (actionId === "start_viz") {
        await ensureSession();
        setVizPhase("raum_upload");
        setPendingUpload("raum");
        append({ role: "user", text: "Ich möchte meinen Raum visualisieren." });
        appendAssistant(
          "Gerne — schick mir zuerst ein **Foto deines aktuellen Raums** (📎 unten links). Davon starten wir die Visualisierung."
        );
        return;
      }

      if (actionId === "start_beratung") {
        const userMsg: GptChatMessage = {
          id: newChatId(),
          role: "user",
          text: "Ich möchte mich erst beraten lassen.",
        };
        const next = [...messages, userMsg];
        setMessages(next);
        setLoading(true);
        try {
          const claude = await askClaude(next, sessionId);
          appendAssistant(claude.displayText ?? "Erzähl mir von deinem Vorhaben — ich bin da.");
        } finally {
          setLoading(false);
        }
        return;
      }

      if (actionId === "wunsch_inspiration") {
        setPendingUpload("inspiration");
        appendAssistant("Optional: Schick mir ein **Inspirationsbild** (📎) — oder beschreib deinen Wunsch einfach hier im Chat.");
        return;
      }

      if (actionId === "wunsch_text_mode") {
        setVizPhase("wunsch_confirm");
        appendAssistant("Beschreib mir, wie der Raum **aussehen soll** — Stil, Materialien, Farben. Ich fasse es zusammen.");
        return;
      }

      if (actionId === "render") {
        await runRender();
        return;
      }

      if (actionId === "render_again") {
        appendAssistant("Was soll anders sein? Schreib es mir — oder wähle:", {
          actions: VIZ_NACHPROMPT_TAGS.map((tag) => ({
            id: `nachprompt:${tag}`,
            label: tag,
          })),
        });
        return;
      }

      if (actionId.startsWith("nachprompt:")) {
        const tag = actionId.replace("nachprompt:", "");
        setWunschText((prev) => `${prev.trim()}\n${tag}`.trim());
        await runRender();
        return;
      }

      if (actionId === "lead_start") {
        appendAssistant("Trag hier deine Kontaktdaten ein — dein Projekt-Brief geht mit:", {
          showLeadForm: true,
        });
        return;
      }
    },
    [loading, ensureSession, append, appendAssistant, messages, sessionId, askClaude, runRender]
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || locked || limitReached) return;

    const userMsg: GptChatMessage = { id: newChatId(), role: "user", text };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    requestAnimationFrame(syncTextareaHeight);

    const sid = sessionId ?? (await ensureSession());

    const nextWunsch =
      vizPhase === "wunsch_quelle" || vizPhase === "wunsch_confirm" || vizPhase === "lead" || vizPhase === "result"
        ? (wunschText ? `${wunschText}\n${text}`.trim() : text)
        : wunschText;
    if (nextWunsch !== wunschText) setWunschText(nextWunsch);

    const wantsRender =
      /\b(visualisier|so umsetzen|render|mach das bild|zeig mir das ergebnis)\b/i.test(text) &&
      istUrl &&
      nextWunsch.trim();

    if (wantsRender) {
      await runRender(nextWunsch);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await askClaude(nextHistory, sid, nextWunsch);
      const actions: GptChatAction[] = [];
      if (istUrl && nextWunsch.trim() && vizPhase !== "result" && vizPhase !== "lead") {
        actions.push({ id: "render", label: "So visualisieren" });
      }
      if (vizPhase === "result" || vizPhase === "lead") {
        actions.push({ id: "lead_start", label: "Projekt senden" });
      }
      if (vizPhase === "idle" && istUrl) {
        actions.push({ id: "start_viz", label: "Raum visualisieren" });
      }
      appendAssistant(data.displayText ?? "Wie kann ich dir helfen?", {
        actions: actions.length ? actions : undefined,
      });
      if (data.intent === "render" && istUrl && nextWunsch.trim()) {
        await runRender(nextWunsch);
      }
    } catch {
      setError("Verbindungsfehler — bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }, [
    input,
    loading,
    locked,
    limitReached,
    messages,
    sessionId,
    ensureSession,
    vizPhase,
    istUrl,
    wunschText,
    askClaude,
    appendAssistant,
    runRender,
    syncTextareaHeight,
  ]);

  const inputDisabled = loading || locked || limitReached || vizPhase === "rendering";

  return (
    <div ref={chatRootRef} className={cn("ki-rechner-chat", locked && "ki-rechner-chat--locked")}>
      <div className="ki-rechner-chat-header">
        <div className="ki-rechner-chat-avatar">
          <Image src="/logo-mark-green.png" alt="" width={32} height={32} className="ki-rechner-chat-logo" />
        </div>
        <div>
          <div className="ki-rechner-chat-title">
            Bärenwald <span className="ki-rechner-mode-label ki-rechner-mode-label--chat">BärenwaldGPT</span>
          </div>
          <div className="ki-rechner-chat-sub">Beraten · Visualisieren · Anfragen</div>
        </div>
      </div>

      <div ref={messagesScrollRef} className="ki-rechner-chat-messages">
        {messages.map((msg) => (
          <GptChatBubble
            key={msg.id}
            message={msg}
            onAction={(id) => void handleAction(id)}
            sessionId={sessionId}
            onLeadSuccess={() => {
              setVizPhase("done");
              appendAssistant(
                "Danke — dein Projekt ist bei uns eingegangen. Melde dich gern, wenn du noch Fragen hast."
              );
            }}
            disabled={loading}
          />
        ))}

        {loading ? (
          <div className="ki-rechner-chat-row ki-rechner-chat-row--assistant">
            <div className="ki-rechner-chat-bubble ki-rechner-chat-bubble--assistant ki-rechner-chat-typing">
              <span className="ki-rechner-chat-dot" />
              <span className="ki-rechner-chat-dot" />
              <span className="ki-rechner-chat-dot" />
            </div>
          </div>
        ) : null}

        <div ref={messagesEndRef} />
      </div>

      {error ? <p className="ki-rechner-chat-error" role="alert">{error}</p> : null}

      <GptChatBriefBar brief={brief} />

      <div className="ki-rechner-chat-composer">
        <div className={cn("ki-rechner-chat-inputbar gpt-chat-inputbar", limitReached && "ki-rechner-chat-inputbar--disabled")}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              const kind = pendingUpload ?? "raum";
              if (f) void handleUpload(kind, f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="gpt-chat-attach"
            disabled={inputDisabled}
            aria-label={pendingUpload === "inspiration" ? "Inspirationsbild" : "Raumfoto hochladen"}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="h-5 w-5" aria-hidden />
          </button>
          <textarea
            ref={textareaRef}
            rows={1}
            enterKeyHint="send"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={limitReached ? "Nachrichtenlimit erreicht" : "Nachricht eingeben …"}
            className="ki-rechner-chat-input ki-rechner-chat-textarea"
            disabled={inputDisabled}
            aria-label="Nachricht"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!input.trim() || inputDisabled}
            className="ki-rechner-chat-send"
            aria-label="Senden"
          >
            <SendMessageIcon />
          </button>
        </div>
        <p className="ki-rechner-chat-privacy">
          KI-Dienst Anthropic · <Link href="/datenschutz#ki-beratung">Datenschutz</Link>
        </p>
      </div>
    </div>
  );
}
