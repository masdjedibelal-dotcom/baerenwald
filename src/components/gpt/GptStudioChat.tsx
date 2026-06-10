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
  type GptChatMessage,
  type GptVizPhase,
  type PendingUpload,
} from "@/components/gpt/gpt-chat-types";
import { useGptProjekt } from "@/components/gpt/gpt-projekt-context";
import type { KiRechnerFunnelData } from "@/components/funnel/KiRechnerChat";
import type { KiParsedBekannt } from "@/lib/ki-rechner/types";
import { useGptChatScroll } from "@/hooks/use-gpt-chat-scroll";
import { useMobileComposerInset } from "@/hooks/use-mobile-composer-inset";
import { GPT_VIZ_LIMITS, VIZ_NACHPROMPT_TAGS } from "@/lib/gpt-viz/constants";
import { limitCodeToVizBlock } from "@/lib/gpt-viz/limits";
import type { GptVizLimitCode } from "@/lib/gpt-viz/limits";
import {
  buildLeadQuestion,
  extractLeadForField,
  mergeLeadDraft,
  nextLeadField,
  type GptLeadDraft,
  type GptLeadField,
} from "@/lib/gpt-viz/lead-collect";
import { actionsForIntent, postRenderActions } from "@/lib/gpt-viz/gpt-studio-actions";
import type { GptStudioIntent } from "@/lib/gpt-viz/gpt-studio-intents";
import type {
  GptVizBauErklaerung,
  GptVizPrepareQuestion,
  GptVizRaumAnalyse,
} from "@/lib/gpt-viz/types";
import {
  countUserMessages,
  KI_MAX_USER_MESSAGES,
} from "@/lib/ki-rechner/guards";
import {
  applyGuidedFieldValue,
  buildDraftSummaryItems,
  buildLeadFormBlock,
  emptyGuidedDraft,
} from "@/lib/guided-chat/draft";
import {
  buildGuidedAssistantFromDraft,
  mergeClassificationIntoGuided,
  type GuidedAssistantPayload,
} from "@/lib/guided-chat/respond";
import type { GptChatBlock, GuidedField, GuidedFunnelDraft } from "@/lib/guided-chat/types";
import { draftToKiParsed } from "@/lib/guided-chat/types";
import { cn } from "@/lib/utils";

import "./guided-chat.css";
import "./gpt-viz.css";

const INITIAL_TEXT = `Hi! Ich bin dein Handwerks-Assistent von Bärenwald — für Renovierung, Reparatur und Umbau in München.

Schreib einfach los — oder wähle unten, womit wir starten sollen. Beraten, visualisieren, Preisrahmen oder direkt anfragen: alles hier im Chat.`;

type GptStudioChatProps = {
  onPreisBereit: (data: KiRechnerFunnelData) => void;
  onBeratungBereit: () => void;
  locked?: boolean;
  /** Rechner/Portal: Preisrahmen oder Beratungs-Funnel vorbereiten (parallel zur Visualisierung). */
  priceHandoff?: boolean;
};

function isActiveVizFlow(phase: GptVizPhase, flowActive: boolean): boolean {
  if (!flowActive) return false;
  return (
    phase === "raum_upload" ||
    phase === "wunsch_quelle" ||
    phase === "wunsch_confirm" ||
    phase === "viz_questions" ||
    phase === "rendering"
  );
}

function SendMessageIcon() {
  return (
    <svg className="ki-rechner-chat-send-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m22 2-7 20-4-9-9-4 20-7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2 11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GptStudioChat({
  onPreisBereit,
  onBeratungBereit,
  locked = false,
  priceHandoff = false,
}: GptStudioChatProps) {

  const {
    sessionId,
    brief,
    sessionError,
    clearSessionError,
    ensureSession,
    refreshBrief,
    mergeChatVerlauf,
  } = useGptProjekt();
  const guidedHybrid = priceHandoff;
  const [guidedDraft, setGuidedDraft] = useState<GuidedFunnelDraft>(() =>
    emptyGuidedDraft()
  );
  const [messages, setMessages] = useState<GptChatMessage[]>(() => [
    {
      id: newChatId(),
      role: "assistant",
      text: INITIAL_TEXT,
      blocks: guidedHybrid ? [{ type: "journey_entry" }] : undefined,
      actions: guidedHybrid
        ? undefined
        : [
            { id: "start_viz", label: "Raum visualisieren" },
            { id: "start_beratung", label: "Erst beraten" },
          ],
    },
  ]);
  const [vizPhase, setVizPhase] = useState<GptVizPhase>("idle");
  const [vizFlowActive, setVizFlowActive] = useState(false);
  const [wunschText, setWunschText] = useState("");
  const [istUrl, setIstUrl] = useState<string | null>(null);
  const [renderCount, setRenderCount] = useState(0);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload>(null);
  const [leadActive, setLeadActive] = useState(false);
  const [leadDraft, setLeadDraft] = useState<GptLeadDraft>({});
  const [awaitingLeadField, setAwaitingLeadField] = useState<GptLeadField | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatRootRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);
  const priceHandoffStateRef = useRef<"none" | "preis" | "beratung">("none");

  const userMessageCount = countUserMessages(
    messagesForClaude(messages).map((m) => ({ role: m.role, content: m.content }))
  );
  const limitReached = userMessageCount >= KI_MAX_USER_MESSAGES;

  useMobileComposerInset(chatRootRef);

  const { syncTextareaHeight, handleInputFocus, handleInputBlur } = useGptChatScroll({
    chatRootRef,
    messagesScrollRef,
    textareaRef,
    scrollTriggers: [messages, loading, error, brief?.ergebnis_bild_url, brief?.gpt_erklaerung],
  });

  const append = useCallback((msg: Omit<GptChatMessage, "id"> & { id?: string }) => {
    setMessages((prev) => [...prev, { ...msg, id: msg.id ?? newChatId() }]);
  }, []);

  const appendAssistant = useCallback(
    (text: string, extras?: Partial<Omit<GptChatMessage, "id" | "role">>) => {
      append({ role: "assistant", text, ...extras });
    },
    [append]
  );

  const appendGuidedPayload = useCallback(
    (payload: GuidedAssistantPayload) => {
      setGuidedDraft(payload.draft);
      appendAssistant(payload.text, { blocks: payload.blocks });
    },
    [appendAssistant]
  );

  const appendVizLimitMessage = useCallback(
    (message: string, limitCode: GptVizLimitCode, portalRegisterUrl?: string) => {
      const blocks: GptChatBlock[] = [
        {
          type: "viz_limit",
          reason: limitCodeToVizBlock(limitCode),
          portalRegisterUrl:
            portalRegisterUrl ?? brief?.limits?.portal_register_url ?? "/portal/registrieren",
        },
      ];
      appendAssistant(message, { blocks });
    },
    [appendAssistant, brief?.limits?.portal_register_url]
  );

  const syncPreisHandoff = useCallback(
    (draft: GuidedFunnelDraft, history: GptChatMessage[]) => {
      const parsed = draftToKiParsed(draft);
      if (!parsed || priceHandoffStateRef.current === "preis") return;
      priceHandoffStateRef.current = "preis";
      const verlauf = messagesForClaude(history).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      onPreisBereit({
        situation: parsed.situation,
        bereiche: parsed.bereiche,
        groesse: parsed.groesse,
        plz: parsed.plz,
        zeitraum: parsed.zeitraum,
        kundentyp: parsed.kundentyp,
        fachdetails: parsed.fachdetails,
        ki_session_id: sessionId ?? undefined,
        ki_chat_verlauf: verlauf,
      });
    },
    [onPreisBereit, sessionId]
  );

  useEffect(() => {
    void mergeChatVerlauf(textMessagesForSync(messages));
  }, [messages, mergeChatVerlauf]);

  useEffect(() => {
    if (!sessionError) return;
    setError(sessionError);
    appendVizLimitMessage(
      sessionError,
      "visitor_sessions",
      brief?.limits?.portal_register_url
    );
    clearSessionError();
  }, [
    sessionError,
    appendVizLimitMessage,
    brief?.limits?.portal_register_url,
    clearSessionError,
  ]);

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

  const shouldCheckPriceHandoff = useCallback(
    (lead?: boolean) =>
      priceHandoff &&
      !lead &&
      !leadActive &&
      !isActiveVizFlow(vizPhase, vizFlowActive),
    [priceHandoff, leadActive, vizPhase, vizFlowActive]
  );

  const applyPriceHandoff = useCallback(
    (
      history: GptChatMessage[],
      data: {
        displayText?: string;
        priceHandoffTyp?: string;
        priceHandoffParsed?: KiParsedBekannt | { typ: string; antwort?: string };
      }
    ) => {
      if (!priceHandoff || !data.priceHandoffTyp) return;

      if (guidedHybrid) {
        const payload = mergeClassificationIntoGuided(
          guidedDraft,
          data.priceHandoffTyp,
          data.priceHandoffParsed,
          data.displayText
        );
        appendGuidedPayload(payload);
        if (payload.blocks.some((b) => b.type === "price_card")) {
          syncPreisHandoff(payload.draft, history);
        }
        if (
          data.priceHandoffTyp === "unbekannt" ||
          data.priceHandoffTyp === "zu_komplex"
        ) {
          if (priceHandoffStateRef.current === "none") {
            priceHandoffStateRef.current = "beratung";
            onBeratungBereit();
          }
        }
        return;
      }

      const verlauf = messagesForClaude(history).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      if (
        data.priceHandoffTyp === "bekannt" &&
        data.priceHandoffParsed?.typ === "bekannt"
      ) {
        if (priceHandoffStateRef.current === "preis") return;
        priceHandoffStateRef.current = "preis";
        const p = data.priceHandoffParsed as KiParsedBekannt;
        onPreisBereit({
          situation: p.situation,
          bereiche: p.bereiche,
          groesse: p.groesse,
          plz: p.plz,
          zeitraum: p.zeitraum,
          kundentyp: p.kundentyp,
          fachdetails: p.fachdetails,
          ki_session_id: sessionId ?? undefined,
          ki_chat_verlauf: verlauf,
        });
        appendAssistant(
          "Super — ich habe ein klares Bild von deinem Vorhaben.\n\nTippe unten auf **Zum Preis**, dann siehst du deinen unverbindlichen Preisrahmen."
        );
        return;
      }

      if (
        data.priceHandoffTyp === "unbekannt" ||
        data.priceHandoffTyp === "zu_komplex"
      ) {
        if (priceHandoffStateRef.current !== "none") return;
        priceHandoffStateRef.current = "beratung";
        onBeratungBereit();
        appendAssistant(
          "Für dein Vorhaben ist eine persönliche Beratung am sinnvollsten.\n\nTippe unten auf **Zur Beratung**, dann kannst du uns deine Kontaktdaten hinterlassen."
        );
      }
    },
    [
      priceHandoff,
      guidedHybrid,
      guidedDraft,
      appendGuidedPayload,
      syncPreisHandoff,
      sessionId,
      onPreisBereit,
      onBeratungBereit,
      appendAssistant,
    ]
  );

  const applyGuidedSelection = useCallback(
    (field: GuidedField, value: string, userLabel: string) => {
      const updated = applyGuidedFieldValue(guidedDraft, field, value);
      const userMsg: GptChatMessage = {
        id: newChatId(),
        role: "user",
        text: userLabel,
      };
      setMessages((prev) => [...prev, userMsg]);
      const payload = buildGuidedAssistantFromDraft(updated);
      setGuidedDraft(payload.draft);
      appendAssistant(payload.text, { blocks: payload.blocks });
      if (payload.blocks.some((b) => b.type === "price_card")) {
        syncPreisHandoff(payload.draft, [...messages, userMsg]);
      }
    },
    [guidedDraft, messages, appendAssistant, syncPreisHandoff]
  );

  const askClaude = useCallback(
    async (
      history: GptChatMessage[],
      sid: string | null,
      wunschOverride?: string,
      lead?: { draft: GptLeadDraft; nextField: GptLeadField | null },
      vizFlow?: boolean,
      checkPriceHandoff?: boolean
    ) => {
      const res = await fetch("/api/gpt-studio/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesForClaude(history),
          gpt_session_id: sid,
          wunsch_text: wunschOverride?.trim() || undefined,
          lead_active: Boolean(lead),
          lead_draft: lead?.draft,
          lead_next_field: lead?.nextField ?? undefined,
          viz_flow_active: vizFlow ?? isActiveVizFlow(vizPhase, vizFlowActive),
          price_handoff_check: Boolean(checkPriceHandoff),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        displayText?: string;
        intent?: GptStudioIntent;
        priceHandoffTyp?: string;
        priceHandoffParsed?: KiParsedBekannt;
      };
      if (!res.ok) throw new Error(data.error ?? "Antwort fehlgeschlagen.");
      return data;
    },
    [vizPhase, vizFlowActive]
  );

  const postLeadToApi = useCallback(
    async (draft: GptLeadDraft) => {
      const sid = sessionId ?? (await ensureSession());
      if (!sid) throw new Error("Session fehlt.");

      const res = await fetch("/api/gpt-viz/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sid,
          name: draft.name,
          email: draft.email,
          telefon: draft.telefon,
          plz: draft.plz,
          strasse: draft.strasse,
          hausnummer: draft.hausnummer,
          notizen: draft.notizen,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Anfrage fehlgeschlagen.");
    },
    [sessionId, ensureSession]
  );

  const showLeadForm = useCallback(
    (userText?: string) => {
      if (userText) {
        append({ role: "user", text: userText });
      }
      setLeadActive(true);
      setLeadDraft({});
      setAwaitingLeadField(null);
      if (guidedHybrid) {
        appendAssistant(
          "Perfekt — fülle kurz die Felder aus, dann geht deine Anfrage direkt an **Bärenwald**.",
          { blocks: [buildLeadFormBlock(guidedDraft)] }
        );
      } else {
        setAwaitingLeadField("name");
        appendAssistant(buildLeadQuestion("name"));
      }
    },
    [append, appendAssistant, guidedDraft, guidedHybrid]
  );

  const submitLeadForm = useCallback(
    async (draft: GptLeadDraft) => {
      setLoading(true);
      setError(null);
      try {
        await postLeadToApi(draft);
        await refreshBrief();
        setLeadActive(false);
        setAwaitingLeadField(null);
        setVizPhase("done");
        appendAssistant(
          "Perfekt — deine Anfrage ist bei uns eingegangen. Wir melden uns bei dir. Du kannst jetzt noch **zweimal** an deiner Visualisierung feilen — oder einfach weiterfragen.",
          {
            actions: [{ id: "render_again", label: "Noch anpassen" }],
          }
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Anfrage fehlgeschlagen.");
      } finally {
        setLoading(false);
      }
    },
    [postLeadToApi, appendAssistant, refreshBrief]
  );

  const continueLeadAfterAnswer = useCallback(
    async (history: GptChatMessage[], draft: GptLeadDraft, sid: string | null) => {
      const next = nextLeadField(draft);
      if (!next) {
        setLoading(true);
        setError(null);
        try {
          await postLeadToApi(draft);
          await refreshBrief();
          setLeadActive(false);
          setAwaitingLeadField(null);
          setVizPhase("done");
          appendAssistant(
            "Perfekt — ich habe deine Anfrage an **Bärenwald** gesendet. Wir melden uns bei dir. Du kannst jetzt noch **zweimal** an deiner Visualisierung feilen.",
            {
              actions: [{ id: "render_again", label: "Noch anpassen" }],
            }
          );
        } catch (err) {
          setError(err instanceof Error ? err.message : "Anfrage fehlgeschlagen.");
        } finally {
          setLoading(false);
        }
        return;
      }

      setAwaitingLeadField(next);
      setLoading(true);
      setError(null);
      try {
        const claude = await askClaude(history, sid, undefined, { draft, nextField: next });
        appendAssistant(claude.displayText ?? buildLeadQuestion(next));
      } catch {
        appendAssistant(buildLeadQuestion(next));
      } finally {
        setLoading(false);
      }
    },
    [askClaude, appendAssistant, postLeadToApi, refreshBrief]
  );

  const showVizQuestion = useCallback(
    (question: GptVizPrepareQuestion) => {
      appendAssistant(question.question, {
        blocks: [{ type: "viz_decision", question }],
      });
    },
    [appendAssistant]
  );

  const executeRender = useCallback(async (wunschOverride?: string) => {
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
        limit_code?: GptVizLimitCode;
        portal_register_url?: string;
        ergebnis_bild_url?: string;
        render_count?: number;
        max_renders?: number;
        renders_remaining?: number;
        limits?: NonNullable<typeof brief>["limits"];
      };
      if (!res.ok) {
        const msg = data.error ?? "Render fehlgeschlagen.";
        setError(msg);
        if (data.limit_code) {
          appendVizLimitMessage(msg, data.limit_code, data.portal_register_url);
        }
        setVizPhase("wunsch_confirm");
        return;
      }

      const resultUrl = data.ergebnis_bild_url!;
      setWunschText(effectiveWunsch);
      setRenderCount(data.render_count ?? renderCount + 1);
      setVizPhase("result");

      let erklaerung: GptVizBauErklaerung | null = null;
      let zielbildUrl: string | null | undefined;
      try {
        const erkRes = await fetch("/api/gpt-viz/erklaerung", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sid }),
        });
        const erkData = (await erkRes.json()) as {
          gpt_erklaerung?: GptVizBauErklaerung;
          zielbild_url?: string | null;
        };
        if (erkRes.ok && erkData.gpt_erklaerung) {
          erklaerung = erkData.gpt_erklaerung;
        }
        zielbildUrl = erkRes.ok ? erkData.zielbild_url : null;
      } catch {
        /* Fallback im Zielbild-Composer */
      }
      await refreshBrief();

      appendAssistant(
        erklaerung?.chat_kurz ??
          "So könnte dein Raum aussehen — unten findest du dein **Zielbild** mit Projekt-Analyse zum Herunterladen.",
        {
          compare: {
            before: { url: istUrl, label: "Vorher", downloadName: "baerenwald-vorher.jpg" },
            after: { url: resultUrl, label: "Nachher", downloadName: "baerenwald-nachher.jpg" },
            erklaerung,
            zielbild_url: zielbildUrl ?? undefined,
          },
        }
      );

      const history = [...messages];
      const claude = await askClaude(history, sid);
      const limits = data.limits ?? brief?.limits;
      const maxRenders =
        data.max_renders ?? limits?.max_renders ?? GPT_VIZ_LIMITS.guest.maxRenders;
      const leadUnlocked = limits?.lead_unlocked ?? false;
      const postActions = postRenderActions(
        data.render_count ?? renderCount + 1,
        maxRenders,
        leadUnlocked
      );
      const canRenderAgain = postActions.some((a) => a.id === "render_again");
      appendAssistant(claude.displayText ?? "Frag mich gern, was das für dein Projekt bedeutet.", {
        blocks: guidedHybrid
          ? [
              ...(!leadUnlocked
                ? [
                    {
                      type: "primary_cta" as const,
                      actionId: "lead_start",
                      label: canRenderAgain
                        ? "Projekt anfragen"
                        : "Projekt senden — 2× anpassen",
                    },
                  ]
                : []),
              ...(canRenderAgain
                ? [
                    {
                      type: "primary_cta" as const,
                      actionId: "render_again",
                      label: "Noch anpassen",
                      variant: leadUnlocked ? ("primary" as const) : ("outline" as const),
                    },
                  ]
                : []),
              ...(!canRenderAgain && leadUnlocked
                ? [
                    {
                      type: "viz_limit" as const,
                      reason: "needs_portal" as const,
                      portalRegisterUrl:
                        limits?.portal_register_url ?? "/portal/registrieren",
                    },
                  ]
                : []),
            ]
          : undefined,
        actions: guidedHybrid ? undefined : postActions,
      });
      setVizPhase("lead");
    } catch {
      setError("Render fehlgeschlagen.");
      setVizPhase("wunsch_confirm");
    } finally {
      setLoading(false);
    }
  }, [
    wunschText,
    istUrl,
    sessionId,
    ensureSession,
    appendAssistant,
    appendVizLimitMessage,
    messages,
    askClaude,
    renderCount,
    refreshBrief,
    guidedHybrid,
    brief?.limits,
  ]);

  const requestRender = useCallback(
    async (wunschOverride?: string) => {
      const effectiveWunsch = (wunschOverride ?? wunschText).trim();
      if (!effectiveWunsch || !istUrl) return;
      const sid = sessionId ?? (await ensureSession());
      if (!sid) return;

      setLoading(true);
      setError(null);
      try {
        const prepRes = await fetch("/api/gpt-viz/prepare-render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sid, wunsch_text: effectiveWunsch }),
        });
        const prepData = (await prepRes.json()) as {
          error?: string;
          ready?: boolean;
          questions?: GptVizPrepareQuestion[];
        };
        if (!prepRes.ok) {
          setError(prepData.error ?? "Vorbereitung fehlgeschlagen.");
          return;
        }
        setWunschText(effectiveWunsch);
        if (!prepData.ready && prepData.questions?.length) {
          setVizPhase("viz_questions");
          showVizQuestion(prepData.questions[0]);
          return;
        }
        await executeRender(effectiveWunsch);
      } catch {
        setError("Vorbereitung fehlgeschlagen.");
      } finally {
        setLoading(false);
      }
    },
    [wunschText, istUrl, sessionId, ensureSession, showVizQuestion, executeRender]
  );

  const answerVizQuestion = useCallback(
    async (questionId: string, optionId: string, optionLabel: string) => {
      const effectiveWunsch = wunschText.trim();
      if (!effectiveWunsch || !istUrl) return;
      const sid = sessionId ?? (await ensureSession());
      if (!sid) return;

      setLoading(true);
      setError(null);
      try {
        const prepRes = await fetch("/api/gpt-viz/prepare-render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sid,
            wunsch_text: effectiveWunsch,
            answer: { question_id: questionId, option_id: optionId, option_label: optionLabel },
          }),
        });
        const prepData = (await prepRes.json()) as {
          error?: string;
          ready?: boolean;
          questions?: GptVizPrepareQuestion[];
        };
        if (!prepRes.ok) {
          setError(prepData.error ?? "Antwort konnte nicht verarbeitet werden.");
          return;
        }
        if (!prepData.ready && prepData.questions?.length) {
          setVizPhase("viz_questions");
          showVizQuestion(prepData.questions[0]);
          return;
        }
        setVizPhase("wunsch_confirm");
        await executeRender(effectiveWunsch);
      } catch {
        setError("Antwort konnte nicht verarbeitet werden.");
      } finally {
        setLoading(false);
      }
    },
    [wunschText, istUrl, sessionId, ensureSession, showVizQuestion, executeRender]
  );

  const handleUpload = useCallback(
    async (kind: "raum" | "inspiration", file: File) => {
      setLoading(true);
      setError(null);
      setPendingUpload(null);
      setVizFlowActive(true);
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

        const claude = await askClaude(nextHistory, sid, undefined, undefined, true);
        appendAssistant(claude.displayText ?? "Danke für das Foto!", {
          blocks: guidedHybrid
            ? kind === "raum"
              ? [
                  {
                    type: "primary_cta" as const,
                    actionId: "wunsch_text_mode",
                    label: "Wunsch beschreiben",
                  },
                  {
                    type: "primary_cta" as const,
                    actionId: "wunsch_inspiration",
                    label: "Inspirationsbild",
                    variant: "outline" as const,
                  },
                ]
              : [
                  {
                    type: "primary_cta" as const,
                    actionId: "render",
                    label: "So visualisieren",
                  },
                ]
            : undefined,
          actions: guidedHybrid
            ? undefined
            : kind === "raum"
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

      if (actionId === "guided_anpassen") {
        const payload = buildGuidedAssistantFromDraft(guidedDraft);
        appendGuidedPayload(payload);
        return;
      }

      if (actionId.startsWith("guided:")) {
        const [, field, ...rest] = actionId.split(":");
        const value = rest.join(":");
        const labels: Record<string, string> = {
          situation: "Situation gewählt",
          bereich: "Bereich gewählt",
          groesse: `${value} ${guidedDraft.groesseEinheit ?? "m²"}`,
          plz: `PLZ ${value}`,
          zeitraum: "Zeitrahmen gewählt",
        };
        applyGuidedSelection(
          field as GuidedField,
          value,
          labels[field] ?? value
        );
        return;
      }

      if (actionId === "journey_beraten") {
        append({ role: "user", text: "Ich möchte mich beraten lassen." });
        appendAssistant(
          "Gerne — erzähl mir einfach von deinem Vorhaben. Ich stelle dir die passenden Fragen und wir finden gemeinsam den nächsten Schritt."
        );
        return;
      }

      if (actionId === "journey_preis") {
        append({ role: "user", text: "Ich möchte einen Preisrahmen berechnen." });
        const payload = buildGuidedAssistantFromDraft(guidedDraft, {
          prefixText: "Alles klar — ein paar kurze Angaben, dann rechnen wir deinen Rahmen aus.",
        });
        appendGuidedPayload(payload);
        return;
      }

      if (actionId === "journey_anfrage") {
        showLeadForm("Ich möchte eine Anfrage senden.");
        return;
      }

      if (actionId === "start_viz" || actionId === "journey_viz") {
        await ensureSession();
        setVizFlowActive(true);
        setVizPhase("raum_upload");
        setPendingUpload("raum");
        append({ role: "user", text: "Ich möchte meinen Raum visualisieren." });
        appendAssistant(
          "Gerne — schick mir zuerst ein **Foto deines aktuellen Raums** über Bild hochladen unten links. Davon starten wir die Visualisierung."
        );
        return;
      }

      if (actionId === "start_beratung") {
        setVizFlowActive(false);
        const userMsg: GptChatMessage = {
          id: newChatId(),
          role: "user",
          text: "Ich möchte mich erst beraten lassen.",
        };
        const next = [...messages, userMsg];
        setMessages(next);
        setLoading(true);
        try {
          const checkPrice = shouldCheckPriceHandoff();
          const claude = await askClaude(next, sessionId, undefined, undefined, false, checkPrice);
          const reply = claude.displayText ?? "Erzähl mir von deinem Vorhaben — ich bin da.";
          appendAssistant(reply);
          applyPriceHandoff([...next, { id: newChatId(), role: "assistant", text: reply }], claude);
        } finally {
          setLoading(false);
        }
        return;
      }

      if (actionId === "wunsch_inspiration") {
        setPendingUpload("inspiration");
        appendAssistant(
          "Optional: Schick mir ein **Inspirationsbild** über Bild hochladen unten links — oder beschreib deinen Wunsch einfach hier im Chat."
        );
        return;
      }

      if (actionId === "wunsch_text_mode") {
        setVizFlowActive(true);
        setVizPhase("wunsch_confirm");
        appendAssistant("Beschreib mir, wie der Raum **aussehen soll** — Stil, Materialien, Farben. Ich fasse es zusammen.");
        return;
      }

      if (actionId === "render") {
        await requestRender();
        return;
      }

      if (actionId.startsWith("viz_answer|")) {
        const [, questionId, optionId, encodedLabel] = actionId.split("|");
        const optionLabel = encodedLabel ? decodeURIComponent(encodedLabel) : optionId;
        if (questionId && optionId) {
          await answerVizQuestion(questionId, optionId, optionLabel);
        }
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
        await requestRender();
        return;
      }

      if (actionId === "lead_start") {
        showLeadForm("Ich möchte das Projekt senden.");
        return;
      }
    },
    [
      loading,
      guidedDraft,
      guidedHybrid,
      ensureSession,
      append,
      appendAssistant,
      appendGuidedPayload,
      applyGuidedSelection,
      showLeadForm,
      messages,
      sessionId,
      askClaude,
      requestRender,
      answerVizQuestion,
      shouldCheckPriceHandoff,
      applyPriceHandoff,
    ]
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

    if (leadActive && awaitingLeadField) {
      const updated = mergeLeadDraft(leadDraft, extractLeadForField(text, awaitingLeadField));
      setLeadDraft(updated);
      await continueLeadAfterAnswer(nextHistory, updated, sid);
      return;
    }

    const accumulatesWunsch =
      vizFlowActive &&
      (vizPhase === "wunsch_quelle" || vizPhase === "wunsch_confirm" || vizPhase === "raum_upload");
    const nextWunsch = accumulatesWunsch
      ? (wunschText ? `${wunschText}\n${text}`.trim() : text)
      : wunschText;
    if (nextWunsch !== wunschText) setWunschText(nextWunsch);

    const wantsExplicitRender =
      /\b(jetzt visualisier|visualisier(?:en)?|so umsetzen|render|mach(?:en)?\s+(?:das|mir)\s+bild|zeig(?:en|)\s+(?:mir\s+)?(?:das\s+)?(?:ergebnis|bild))\b/i.test(
        text
      ) &&
      istUrl &&
      nextWunsch.trim();

    if (wantsExplicitRender) {
      setVizFlowActive(true);
      await requestRender(nextWunsch);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const checkPrice = shouldCheckPriceHandoff();
      const data = await askClaude(nextHistory, sid, nextWunsch, undefined, undefined, checkPrice);
      const hasRenderResult = Boolean(brief?.ergebnis_bild_url) || vizPhase === "result" || vizPhase === "lead";

      if (data.intent === "suggest_viz") {
        setVizFlowActive(false);
      }

      if (data.intent === "lead_start") {
        showLeadForm();
      } else {
        const reply = data.displayText ?? "Wie kann ich dir helfen?";
        const vizActions = actionsForIntent({
          intent: data.intent ?? null,
          istUrl: Boolean(istUrl),
          wunschText: nextWunsch,
          hasRenderResult,
        });

        if (guidedHybrid && data.priceHandoffTyp) {
          applyPriceHandoff(
            [...nextHistory, { id: newChatId(), role: "assistant", text: reply }],
            { ...data, displayText: reply }
          );
        } else if (guidedHybrid && data.intent === "suggest_viz") {
          appendAssistant(reply, {
            blocks: [
              {
                type: "primary_cta",
                actionId: "journey_viz",
                label: "Raum visualisieren",
              },
            ],
          });
        } else {
          appendAssistant(reply, {
            actions: vizActions,
          });
          if (!guidedHybrid) {
            applyPriceHandoff(
              [...nextHistory, { id: newChatId(), role: "assistant", text: reply }],
              { ...data, displayText: reply }
            );
          }
        }
      }

      if (data.intent === "render" && istUrl && nextWunsch.trim()) {
        setVizFlowActive(true);
        await requestRender(nextWunsch);
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
    vizFlowActive,
    istUrl,
    brief?.ergebnis_bild_url,
    leadActive,
    awaitingLeadField,
    leadDraft,
    continueLeadAfterAnswer,
    wunschText,
    askClaude,
    appendAssistant,
    requestRender,
    syncTextareaHeight,
    shouldCheckPriceHandoff,
    applyPriceHandoff,
    showLeadForm,
  ]);

  const inputDisabled = loading || locked || limitReached || vizPhase === "rendering";

  return (
    <div
      ref={chatRootRef}
      className={cn(
        "ki-rechner-chat",
        guidedHybrid && "gpt-guided-root",
        locked && "ki-rechner-chat--locked"
      )}
    >
      <div className="gpt-chat-sticky-top">
        <div className="ki-rechner-chat-header">
          <div className="ki-rechner-chat-avatar">
            <Image src="/logo-mark-green.png" alt="" width={32} height={32} className="ki-rechner-chat-logo" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="ki-rechner-chat-title">
              Bärenwald{" "}
              <span className="ki-rechner-mode-label ki-rechner-mode-label--chat">BärenwaldGPT</span>
            </div>
            {!guidedHybrid || buildDraftSummaryItems(guidedDraft).length === 0 ? (
              <div className="ki-rechner-chat-sub">Beraten · Visualisieren · Preis · Anfrage</div>
            ) : null}
          </div>
        </div>

        {guidedHybrid && buildDraftSummaryItems(guidedDraft).length > 0 ? (
          <div className="gpt-chat-journey-bar" aria-label="Projekt-Kurzüberblick">
            {buildDraftSummaryItems(guidedDraft).map((item) => (
              <span key={item.label} className="gpt-guided-summary-chip">
                <strong>{item.label}:</strong> {item.value}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div ref={messagesScrollRef} className="ki-rechner-chat-messages">
        {messages.map((msg) => (
          <GptChatBubble
            key={msg.id}
            message={msg}
            onAction={(id) => void handleAction(id)}
            onLeadSubmit={(draft) => void submitLeadForm(draft)}
            disabled={loading}
            suppressSummaryBlocks={guidedHybrid}
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

        <div ref={messagesEndRef} className="ki-rechner-chat-scroll-anchor" aria-hidden />
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
            onChange={(e) => {
              setInput(e.target.value);
              requestAnimationFrame(syncTextareaHeight);
            }}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
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
