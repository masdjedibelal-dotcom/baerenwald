"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type Scope = "bautagebuch" | "abnahmeprotokoll";

type Props = {
  scope: Scope;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  required?: boolean;
  placeholder?: string;
  label?: string;
  className?: string;
  leistungName?: string | null;
  auftragTitel?: string | null;
  /** Rohtext für Form-Submit (hidden) — Name default beschreibung_roh */
  rohName?: string;
};

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
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

/**
 * Textfeld + optional Mikrofon (Web Speech) + „KI korrigieren“.
 * Rohtext bleibt in hidden field; sichtbarer Wert = final/korrigiert.
 */
export function PartnerKiKorrekturField({
  scope,
  name = "beschreibung",
  value,
  onChange,
  rows = 3,
  required,
  placeholder,
  label,
  className,
  leistungName,
  auftragTitel,
  rohName = "beschreibung_roh",
}: Props) {
  const [roh, setRoh] = useState(value);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const micBaseRef = useRef("");
  const speechSupported = Boolean(getSpeechRecognition());

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const runKi = useCallback(async () => {
    const text = value.trim() || roh.trim();
    if (text.length < 3) {
      setError("Bitte zuerst Text eingeben oder einsprechen.");
      return;
    }
    setBusy(true);
    setError(null);
    if (!roh.trim()) setRoh(text);
    try {
      const res = await fetch("/api/partner/ki-korrigieren", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          rohtext: text,
          kontext: {
            leistungName: leistungName ?? null,
            auftragTitel: auftragTitel ?? null,
          },
        }),
      });
      const json = (await res.json()) as { ok?: boolean; text?: string; error?: string };
      if (!res.ok || !json.ok || !json.text?.trim()) {
        setError(json.error ?? "KI-Korrektur fehlgeschlagen.");
        return;
      }
      if (!roh.trim()) setRoh(text);
      onChange(json.text.trim());
    } catch {
      setError("Netzwerkfehler bei KI-Korrektur.");
    } finally {
      setBusy(false);
    }
  }, [value, roh, scope, leistungName, auftragTitel, onChange]);

  function toggleMic() {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError("Spracherkennung wird von diesem Gerät nicht unterstützt.");
      return;
    }
    setError(null);
    if (listening && recRef.current) {
      recRef.current.stop();
      setListening(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = "de-DE";
    rec.continuous = true;
    rec.interimResults = true;
    micBaseRef.current = (value.trim() || roh.trim()).trim();
    rec.onresult = (ev) => {
      let spoken = "";
      for (let i = 0; i < ev.results.length; i++) {
        spoken += ev.results[i][0].transcript;
      }
      const next = spoken.trim();
      if (!next) return;
      const base = micBaseRef.current;
      const merged = base ? `${base} ${next}`.trim() : next;
      setRoh(merged);
      onChange(merged);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("Mikrofon konnte nicht gestartet werden.");
    }
  }

  function onTextChange(next: string) {
    onChange(next);
    if (!roh || roh === value) setRoh(next);
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <span className="text-[14px] font-bold text-text-primary">{label}</span>
      ) : null}
      <textarea
        name={name}
        rows={rows}
        required={required}
        value={value}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder={placeholder}
        className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
      />
      <input type="hidden" name={rohName} value={roh || value} />
      <div className="flex flex-wrap items-center gap-2">
        {speechSupported ? (
          <button
            type="button"
            onClick={toggleMic}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold",
              listening
                ? "border-red-300 bg-red-50 text-red-800"
                : "border-border-default bg-white text-text-secondary"
            )}
            aria-pressed={listening}
          >
            {listening ? (
              <MicOff className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Mic className="h-3.5 w-3.5" aria-hidden />
            )}
            {listening ? "Stop" : "Einsprechen"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void runKi()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-white px-3 py-1.5 text-[12.5px] font-semibold text-text-primary disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          )}
          KI korrigieren
        </button>
      </div>
      {error ? (
        <p className="text-[12px] text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
