"use client";

import { Loader2, Mic, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const MAX_SECONDS = 60;
const BAR_COUNT = 32;

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult:
    | ((ev: {
        results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }>;
      }) => void)
    | null;
  onerror: ((ev?: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

async function polishTranscript(raw: string): Promise<string> {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Keine Sprache erkannt — bitte erneut sprechen.");
  try {
    const res = await fetch("/api/gpt-studio/voice-polish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed }),
    });
    const data = (await res.json()) as { text?: string; error?: string };
    if (!res.ok) throw new Error(data.error || "Umschreibung fehlgeschlagen.");
    return (data.text || trimmed).trim();
  } catch (err) {
    if (err instanceof Error && /Keine Sprache/.test(err.message)) throw err;
    return trimmed.replace(/\s+/g, " ").trim();
  }
}

type Props = {
  disabled?: boolean;
  /** true während Aufnahme/Umschreiben — Parent blendet Textfeld aus */
  onActiveChange?: (active: boolean) => void;
  onTextReady: (text: string) => void;
  onError?: (message: string) => void;
};

/**
 * ChatGPT-ähnliche Sprachnotiz im Composer: Waveform, max. 60s,
 * danach schlankes Deutsch → Chat.
 */
export function GptChatVoiceRecorder({
  disabled,
  onActiveChange,
  onTextReady,
  onError,
}: Props) {
  const [phase, setPhase] = useState<"idle" | "recording" | "processing">("idle");
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(0.12));

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<number>(0);
  const startedAtRef = useRef(0);
  const speechRef = useRef<SpeechRec | null>(null);
  const transcriptRef = useRef("");
  const stopRef = useRef<() => void>(() => {});
  const recordingActiveRef = useRef(false);

  const cleanupMedia = useCallback(() => {
    recordingActiveRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = 0;
    try {
      speechRef.current?.stop();
    } catch {
      /* ignore */
    }
    speechRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  useEffect(() => () => cleanupMedia(), [cleanupMedia]);

  useEffect(() => {
    onActiveChange?.(phase !== "idle");
  }, [phase, onActiveChange]);

  const finishRecording = useCallback(async () => {
    if (phase === "processing") return;
    setPhase("processing");
    cleanupMedia();

    const raw = transcriptRef.current.trim();
    try {
      const polished = await polishTranscript(raw);
      if (!polished) {
        onError?.("Keine Sprache erkannt — bitte erneut sprechen.");
        setPhase("idle");
        setSeconds(0);
        setLevels(Array(BAR_COUNT).fill(0.12));
        return;
      }
      onTextReady(polished);
    } catch (err) {
      onError?.(
        err instanceof Error ? err.message : "Sprachnotiz konnte nicht verarbeitet werden."
      );
    } finally {
      setPhase("idle");
      setSeconds(0);
      setLevels(Array(BAR_COUNT).fill(0.12));
      transcriptRef.current = "";
      chunksRef.current = [];
    }
  }, [cleanupMedia, onError, onTextReady, phase]);

  stopRef.current = () => {
    void finishRecording();
  };

  const startWaveform = useCallback((stream: MediaStream) => {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.72;
    source.connect(analyser);
    analyserRef.current = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const next: number[] = [];
      for (let i = 0; i < BAR_COUNT; i++) {
        const idx = Math.floor((i / BAR_COUNT) * data.length);
        const v = (data[idx] ?? 0) / 255;
        next.push(Math.max(0.1, Math.min(1, v * 1.35)));
      }
      setLevels(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startSpeech = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return false;
    const rec = new Ctor();
    rec.lang = "de-DE";
    rec.continuous = true;
    rec.interimResults = true;
    transcriptRef.current = "";
    rec.onresult = (ev) => {
      let spoken = "";
      for (let i = 0; i < ev.results.length; i++) {
        spoken += ev.results[i][0].transcript;
      }
      transcriptRef.current = spoken.trim();
    };
    rec.onerror = () => {
      /* Aufnahme läuft weiter */
    };
    rec.onend = () => {
      if (recordingActiveRef.current) {
        try {
          rec.start();
        } catch {
          /* ignore */
        }
      }
    };
    speechRef.current = rec;
    try {
      rec.start();
      return true;
    } catch {
      return false;
    }
  }, []);

  async function startRecording() {
    if (disabled || phase !== "idle") return;
    if (!navigator.mediaDevices?.getUserMedia) {
      onError?.("Mikrofon wird von diesem Gerät nicht unterstützt.");
      return;
    }
    if (!getSpeechRecognition()) {
      onError?.(
        "Spracherkennung fehlt in diesem Browser. Bitte Chrome oder Safari nutzen."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];
      transcriptRef.current = "";

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(200);

      if (!startSpeech()) {
        cleanupMedia();
        onError?.("Spracherkennung konnte nicht gestartet werden.");
        return;
      }

      startWaveform(stream);
      recordingActiveRef.current = true;
      startedAtRef.current = Date.now();
      setSeconds(0);
      setPhase("recording");

      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= MAX_SECONDS) {
          stopRef.current();
        }
      }, 200);
    } catch {
      cleanupMedia();
      onError?.("Mikrofon-Zugriff verweigert oder nicht verfügbar.");
      setPhase("idle");
    }
  }

  if (phase === "recording" || phase === "processing") {
    const remaining = Math.max(0, MAX_SECONDS - seconds);
    return (
      <div
        className={cn(
          "gpt-chat-voice-bar",
          phase === "processing" && "gpt-chat-voice-bar--processing"
        )}
        role="status"
        aria-live="polite"
      >
        <button
          type="button"
          className="gpt-chat-voice-stop"
          disabled={phase === "processing"}
          onClick={() => void finishRecording()}
          aria-label="Aufnahme beenden"
        >
          {phase === "processing" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
          )}
        </button>
        <div className="gpt-chat-voice-wave" aria-hidden>
          {levels.map((level, i) => (
            <span
              key={i}
              className="gpt-chat-voice-bar-seg"
              style={{ transform: `scaleY(${level})` }}
            />
          ))}
        </div>
        <span className="gpt-chat-voice-timer">
          {phase === "processing"
            ? "Schreibe um …"
            : `0:${String(Math.min(seconds, MAX_SECONDS)).padStart(2, "0")} / 0:${String(MAX_SECONDS).padStart(2, "0")}`}
        </span>
        {phase === "recording" ? (
          <span className="sr-only">Noch {remaining} Sekunden</span>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="gpt-chat-voice-mic"
      disabled={disabled}
      onClick={() => void startRecording()}
      aria-label="Sprachnotiz aufnehmen"
      title="Sprachnotiz (max. 60 Sekunden)"
    >
      <Mic className="h-5 w-5" aria-hidden />
    </button>
  );
}
