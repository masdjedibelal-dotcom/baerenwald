"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

import { PortalKiAssistField } from "@/components/shared/PortalKiAssistField";
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
  onresult:
    | ((ev: {
        results: ArrayLike<{ 0: { transcript: string } }>;
      }) => void)
    | null;
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
 * Handwerker-Textfeld: Mikrofon + KI-Chat mit Übernehmen (CRM-Pattern).
 */
export function PartnerKiKorrekturField({
  scope,
  name = "beschreibung",
  value,
  onChange,
  rows = 3,
  required,
  placeholder,
  label = "Beschreibung",
  className,
  leistungName,
  auftragTitel,
  rohName = "beschreibung_roh",
}: Props) {
  const [roh, setRoh] = useState(value);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
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

  function toggleMic() {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setMicError("Spracherkennung wird von diesem Gerät nicht unterstützt.");
      return;
    }
    setMicError(null);
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
      setMicError("Mikrofon konnte nicht gestartet werden.");
    }
  }

  function onTextChange(next: string) {
    onChange(next);
    if (!roh || roh === value) setRoh(next);
  }

  function onApply(text: string) {
    if (!roh.trim()) setRoh(value.trim() || text);
    onChange(text);
  }

  const contextHint = [
    auftragTitel?.trim() ? `Auftrag: ${auftragTitel.trim()}` : null,
    leistungName?.trim() ? `Leistung: ${leistungName.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className={cn("space-y-1.5", className)}>
      <PortalKiAssistField
        scope={scope}
        label={label}
        value={value}
        onApply={onApply}
        contextHint={contextHint || null}
        required={required}
        labelExtra={
          speechSupported ? (
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
          ) : null
        }
      >
        <textarea
          name={name}
          rows={rows}
          required={required}
          value={value}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={placeholder}
          className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
        />
      </PortalKiAssistField>
      <input type="hidden" name={rohName} value={roh || value} />
      {micError ? (
        <p className="text-[12px] text-red-700" role="alert">
          {micError}
        </p>
      ) : null}
    </div>
  );
}
