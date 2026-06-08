"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { GptChatBriefBar } from "@/components/gpt/GptChatBriefBar";
import { GptChatBubble } from "@/components/gpt/GptChatBubble";
import {
  newChatId,
  textMessagesForSync,
  type GptChatAction,
  type GptChatMessage,
  type GptVizPhase,
} from "@/components/gpt/gpt-chat-types";
import { useGptProjekt } from "@/components/gpt/gpt-projekt-context";
import type { KiRechnerFunnelData } from "@/components/funnel/KiRechnerChat";
import { useMobileComposerInset } from "@/hooks/use-mobile-composer-inset";
import { GPT_VIZ_MAX_RENDERS, VIZ_NACHPROMPT_TAGS } from "@/lib/gpt-viz/constants";
import type { GptVizBauErklaerung, GptVizRaumAnalyse } from "@/lib/gpt-viz/types";
import {
  countUserMessages,
  isObviousOffTopic,
  KI_MAX_USER_MESSAGES,
  KI_OFF_TOPIC_REPLY,
  KI_TEXTAREA_MAX_LINES,
} from "@/lib/ki-rechner/guards";
import type { KiParsedBekannt } from "@/lib/ki-rechner/types";
import { cn } from "@/lib/utils";

import "./gpt-viz.css";

const TEXTAREA_MIN_HEIGHT_PX = 40;

const INITIAL_MESSAGE = `Hi! Ich bin dein Handwerks-Assistent von Bärenwald — für Renovierung, Reparatur und Umbau in München.

Du kannst **beraten** lassen oder deinen Raum **visualisieren** — alles hier im Chat.

• Fragen zu Gewerken, Ablauf und Preisrahmen
• **Raumfoto + Wunsch** → KI-Vorschau, wie es aussehen könnte
• Am Ende: **Projekt an Bärenwald senden**

Womit starten wir?`;

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
  const { sessionId, brief, ensureSession, refreshBrief, mergeChatVerlauf } = useGptProjekt();
  const [messages, setMessages] = useState<GptChatMessage[]>(() => [
    {
      id: newChatId(),
      role: "assistant",
      kind: "text",
      text: INITIAL_MESSAGE,
    },
    {
      id: newChatId(),
      role: "assistant",
      kind: "actions",
      actions: [
        { id: "start_viz", label: "Raum visualisieren", variant: "primary" },
        { id: "start_beratung", label: "Erst beraten", variant: "outline" },
      ],
    },
  ]);
  const [vizPhase, setVizPhase] = useState<GptVizPhase>("idle");
  const [wunschText, setWunschText] = useState("");
  const [istUrl, setIstUrl] = useState<string | null>(null);
  const [renderCount, setRenderCount] = useState(0);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kiSessionId] = useState(() => crypto.randomUUID());
  const chatRootRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);

  const userMessageCount = countUserMessages(
    messages.filter((m) => m.kind === "text").map((m) => ({ role: m.role, content: m.text ?? "" }))
  );
  const limitReached = userMessageCount >= KI_MAX_USER_MESSAGES;
  const inVizFlow = vizPhase !== "idle" && vizPhase !== "done";

  useMobileComposerInset(chatRootRef);

  const append = useCallback((msg: Omit<GptChatMessage, "id"> & { id?: string }) => {
    setMessages((prev) => [...prev, { ...msg, id: msg.id ?? newChatId() }]);
  }, []);

  const scrollChatToEnd = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      messagesScrollRef.current?.scrollTo({
        top: messagesScrollRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    });
  }, []);

  useEffect(() => {
    scrollChatToEnd(false);
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
    const next = Math.max(TEXTAREA_MIN_HEIGHT_PX, Math.min(ta.scrollHeight, maxHeight));
    ta.style.height = `${next}px`;
  }, []);

  useEffect(() => {
    syncTextareaHeight();
  }, [input, syncTextareaHeight]);

  const startVizFlow = useCallback(async () => {
    await ensureSession();
    setIstUrl(null);
    setWunschText("");
    setRenderCount(0);
    setVizPhase("raum_upload");
    append({
      role: "assistant",
      kind: "text",
      text: "Super — **Schritt 1:** Lade ein Foto deines **aktuellen Raums** hoch. Davon startet die Visualisierung (Pflicht für das Ergebnis).",
    });
    append({ role: "assistant", kind: "upload", uploadKind: "raum" });
  }, [append, ensureSession]);

  const afterRaumUpload = useCallback(
    async (url: string, sid: string) => {
      setIstUrl(url);
      append({
        role: "user",
        kind: "image",
        image: { url, label: "Dein Raum (Ist)", downloadName: "baerenwald-raum-ist.jpg" },
      });

      let beschreibung = "";
      try {
        const res = await fetch("/api/gpt-viz/analyze-room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sid, image_url: url, mode: "raum" }),
        });
        const data = (await res.json()) as { raum_analyse?: GptVizRaumAnalyse };
        if (res.ok && data.raum_analyse) {
          beschreibung = data.raum_analyse.ist_beschreibung;
        }
      } catch {
        /* optional */
      }

      await refreshBrief();
      setVizPhase("wunsch_quelle");
      append({
        role: "assistant",
        kind: "text",
        text: beschreibung
          ? `Danke! **So sehe ich deinen Raum:** ${beschreibung}\n\n**Schritt 2:** Wie möchtest du deinen Wunsch festlegen?`
          : "Danke für das Raumfoto!\n\n**Schritt 2:** Wie möchtest du deinen Wunsch festlegen?",
      });
      append({
        role: "assistant",
        kind: "actions",
        actions: [
          { id: "wunsch_inspiration", label: "Inspirationsbild", variant: "outline" },
          { id: "wunsch_text", label: "In Worten beschreiben", variant: "outline" },
          { id: "wunsch_skip", label: "Direkt weiter", variant: "primary" },
        ],
      });
    },
    [append, refreshBrief]
  );

  const showWunschConfirm = useCallback(
    (text: string) => {
      setWunschText(text);
      setVizPhase("wunsch_confirm");
      append({
        role: "assistant",
        kind: "text",
        text: `**Dein Visualisierungs-Wunsch:**\n${text}\n\nPasst das so — oder schreib mir, was du ändern möchtest. Wenn alles stimmt: **So visualisieren**.`,
      });
      append({
        role: "assistant",
        kind: "actions",
        actions: [
          { id: "render", label: "So visualisieren", variant: "primary" },
          { id: "wunsch_anpassen", label: "Noch anpassen", variant: "outline" },
        ],
      });
    },
    [append]
  );

  const handleUpload = useCallback(
    async (kind: "raum" | "inspiration", file: File) => {
      setLoading(true);
      setError(null);
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
          await afterRaumUpload(url, sid);
        } else {
          const url = data.ziel_bild_url ?? data.url!;
          append({
            role: "user",
            kind: "image",
            image: { url, label: "Inspirationsbild", downloadName: "baerenwald-inspiration.jpg" },
          });
          const analyzeRes = await fetch("/api/gpt-viz/analyze-room", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sid, image_url: url, mode: "inspiration" }),
          });
          const analyzeData = (await analyzeRes.json()) as {
            error?: string;
            raum_analyse?: GptVizRaumAnalyse;
            wunsch_text?: string;
          };
          await refreshBrief();
          if (analyzeRes.ok && analyzeData.raum_analyse) {
            const wunsch =
              analyzeData.wunsch_text ?? analyzeData.raum_analyse.wunsch_entwurf;
            append({
              role: "assistant",
              kind: "text",
              text: `**Stil aus deinem Inspirationsbild:**\n${analyzeData.raum_analyse.ist_beschreibung}\n\n**So würde ich es auf deinen Raum übertragen:**`,
            });
            showWunschConfirm(wunsch);
          } else {
            setError(analyzeData.error ?? "Stil-Analyse fehlgeschlagen.");
          }
        }
      } catch {
        setError("Upload fehlgeschlagen.");
      } finally {
        setLoading(false);
      }
    },
    [sessionId, ensureSession, afterRaumUpload, append, showWunschConfirm, refreshBrief]
  );

  const runRender = useCallback(async () => {
    if (!wunschText.trim() || !istUrl) return;
    const sid = sessionId ?? (await ensureSession());
    if (!sid) return;

    setLoading(true);
    setVizPhase("rendering");
    setError(null);
    append({ role: "assistant", kind: "text", text: "Einen Moment — ich erstelle deine Visualisierung …" });

    try {
      const res = await fetch("/api/gpt-viz/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid, wunsch_text: wunschText }),
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
      setRenderCount(data.render_count ?? renderCount + 1);
      setVizPhase("result");

      append({
        role: "assistant",
        kind: "compare",
        text: "**Vorher / Nachher** — Bilder kannst du herunterladen.",
        compare: {
          before: { url: istUrl, label: "Vorher (Ist)", downloadName: "baerenwald-vorher.jpg" },
          after: { url: resultUrl, label: "Nachher (Visualisierung)", downloadName: "baerenwald-nachher.jpg" },
        },
      });

      const erkRes = await fetch("/api/gpt-viz/erklaerung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid }),
      });
      const erkData = (await erkRes.json()) as { gpt_erklaerung?: GptVizBauErklaerung };
      if (erkRes.ok && erkData.gpt_erklaerung) {
        const e = erkData.gpt_erklaerung;
        const gewerke = e.gewerke.map((g) => `• **${g.name}:** ${g.beschreibung}`).join("\n");
        append({
          role: "assistant",
          kind: "text",
          text: `**${e.titel}**\n\n${e.zusammenfassung}${gewerke ? `\n\n${gewerke}` : ""}${e.hinweis_gu ? `\n\n${e.hinweis_gu}` : ""}`,
        });
      }

      const rendersLeft = GPT_VIZ_MAX_RENDERS - (data.render_count ?? renderCount + 1);
      const actions: GptChatAction[] = [
        { id: "lead_start", label: "Projekt an Bärenwald senden", variant: "primary" },
      ];
      if (rendersLeft > 0) {
        actions.unshift({ id: "render_again", label: `Anpassen (${rendersLeft} übrig)`, variant: "outline" });
      }
      append({ role: "assistant", kind: "actions", actions });
      setVizPhase("lead");
      await refreshBrief();
    } catch {
      setError("Render fehlgeschlagen.");
      setVizPhase("wunsch_confirm");
    } finally {
      setLoading(false);
    }
  }, [wunschText, istUrl, sessionId, ensureSession, append, renderCount, refreshBrief]);

  const handleAction = useCallback(
    async (actionId: string) => {
      if (loading) return;

      if (actionId === "start_viz") {
        await startVizFlow();
        return;
      }
      if (actionId === "start_beratung") {
        append({
          role: "assistant",
          kind: "text",
          text: "Alles klar — erzähl mir von deinem Vorhaben. Ich helfe dir bei Gewerken, Ablauf und Preisrahmen.",
        });
        return;
      }
      if (actionId === "wunsch_inspiration") {
        setVizPhase("inspiration_upload");
        append({
          role: "assistant",
          kind: "text",
          text: "Lade ein **Inspirationsbild** hoch (z. B. Pinterest, Magazin) — ich leite daraus deinen Wunsch ab.",
        });
        append({ role: "assistant", kind: "upload", uploadKind: "inspiration" });
        return;
      }
      if (actionId === "wunsch_text") {
        setVizPhase("wunsch_confirm");
        append({
          role: "assistant",
          kind: "text",
          text: "Beschreib kurz, wie dein Raum **aussehen soll** — Materialien, Farben, Stil. Ich fasse es dann zusammen.",
        });
        return;
      }
      if (actionId === "wunsch_skip") {
        showWunschConfirm(wunschText || "Modern, hell, hochwertige Materialien — passend zum Raum.");
        return;
      }
      if (actionId === "render") {
        await runRender();
        return;
      }
      if (actionId === "wunsch_anpassen") {
        append({
          role: "assistant",
          kind: "text",
          text: "Schreib mir einfach, was du ändern möchtest — ich aktualisiere deinen Wunsch.",
        });
        return;
      }
      if (actionId === "render_again") {
        const chipActions = VIZ_NACHPROMPT_TAGS.map((tag) => ({
          id: `nachprompt:${tag}`,
          label: tag,
          variant: "outline" as const,
        }));
        append({
          role: "assistant",
          kind: "text",
          text: "Was soll anders sein? Schreib es oder wähle einen Vorschlag:",
        });
        append({ role: "assistant", kind: "actions", actions: chipActions });
        return;
      }
      if (actionId.startsWith("nachprompt:")) {
        const tag = actionId.replace("nachprompt:", "");
        const next = `${wunschText.trim()}\n${tag}`.trim();
        setWunschText(next);
        await runRender();
        return;
      }
      if (actionId === "lead_start") {
        append({
          role: "assistant",
          kind: "text",
          text: "**Letzter Schritt:** Dein Projekt-Brief geht mit — Visualisierung, Wunsch und Erklärung.",
        });
        append({ role: "assistant", kind: "lead_form" });
        return;
      }
    },
    [loading, append, startVizFlow, showWunschConfirm, wunschText, runRender]
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || locked || limitReached) return;

    append({ role: "user", kind: "text", text });
    setInput("");
    requestAnimationFrame(syncTextareaHeight);

    if (inVizFlow && (vizPhase === "wunsch_confirm" || vizPhase === "result" || vizPhase === "lead")) {
      const updated = wunschText ? `${wunschText}\n${text}`.trim() : text;
      setWunschText(updated);
      append({
        role: "assistant",
        kind: "text",
        text: `Notiert — **aktualisierter Wunsch:**\n${updated}`,
      });
      append({
        role: "assistant",
        kind: "actions",
        actions: [
          { id: "render", label: "So visualisieren", variant: "primary" },
          { id: "lead_start", label: "Projekt senden", variant: "outline" },
        ],
      });
      return;
    }

    if (inVizFlow && vizPhase === "wunsch_quelle") {
      showWunschConfirm(text);
      return;
    }

    if (isObviousOffTopic(text)) {
      append({ role: "assistant", kind: "text", text: KI_OFF_TOPIC_REPLY });
      return;
    }

    setLoading(true);
    setError(null);
    const textOnly = textMessagesForSync(messages);
    textOnly.push({ role: "user", content: text });

    try {
      const res = await fetch("/api/ki-rechner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: textOnly, session_id: kiSessionId }),
      });
      const data = (await res.json()) as {
        parsed?: KiParsedBekannt;
        typ?: string;
        error?: string;
        displayText?: string;
      };

      if (!res.ok) {
        append({
          role: "assistant",
          kind: "text",
          text: data.error ?? "Antwort konnte nicht geladen werden.",
        });
        return;
      }

      const displayText = data.displayText?.trim() || "Antwort konnte nicht geladen werden.";

      if (data.typ === "bekannt" && data.parsed?.typ === "bekannt") {
        const p = data.parsed;
        append({
          role: "assistant",
          kind: "text",
          text: "Super — ich habe ein klares Bild von deinem Vorhaben.\n\nTippe unten auf **Zum Preis** für deinen unverbindlichen Preisrahmen.",
        });
        onPreisBereit({
          situation: p.situation,
          bereiche: p.bereiche,
          groesse: p.groesse,
          plz: p.plz,
          zeitraum: p.zeitraum,
          kundentyp: p.kundentyp,
          fachdetails: p.fachdetails,
          ki_session_id: kiSessionId,
          ki_chat_verlauf: textOnly,
        });
        return;
      }

      if (data.typ === "unbekannt" || data.typ === "zu_komplex") {
        append({
          role: "assistant",
          kind: "text",
          text: `${displayText}\n\nTippe unten auf **Zur Beratung** für Kontaktdaten.`,
        });
        onBeratungBereit();
        return;
      }

      append({
        role: "assistant",
        kind: "text",
        text: displayText,
      });
      if (!inVizFlow) {
        append({
          role: "assistant",
          kind: "actions",
          actions: [{ id: "start_viz", label: "Raum visualisieren", variant: "outline" }],
        });
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
    inVizFlow,
    vizPhase,
    messages,
    append,
    showWunschConfirm,
    wunschText,
    kiSessionId,
    onPreisBereit,
    onBeratungBereit,
    syncTextareaHeight,
  ]);

  const inputDisabled = loading || locked || limitReached || vizPhase === "rendering";
  const placeholder =
    vizPhase === "wunsch_confirm" || vizPhase === "lead"
      ? "Wunsch anpassen …"
      : vizPhase === "wunsch_quelle"
        ? "Wunsch beschreiben …"
        : limitReached
          ? "Nachrichtenlimit erreicht"
          : "Nachricht eingeben …";

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
            onUpload={(kind, file) => void handleUpload(kind, file)}
            sessionId={sessionId}
            onLeadSuccess={() => {
              setVizPhase("done");
              append({
                role: "assistant",
                kind: "text",
                text: "Dein Projekt ist bei uns eingegangen — wir melden uns zeitnah. Du kannst weiter beraten oder eine neue Visualisierung starten.",
              });
              append({
                role: "assistant",
                kind: "actions",
                actions: [{ id: "start_viz", label: "Neue Visualisierung", variant: "outline" }],
              });
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
        <div className={cn("ki-rechner-chat-inputbar", limitReached && "ki-rechner-chat-inputbar--disabled")}>
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
            placeholder={placeholder}
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
