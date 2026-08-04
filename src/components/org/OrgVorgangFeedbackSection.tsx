"use client";

import { useState } from "react";

import { orgPortalToast } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

type HvFeedbackState = {
  bewertung?: { sterne: number; freitext?: string | null } | null;
  maengel?: Array<{ freitext?: string | null; created_at?: string }>;
};

export function OrgVorgangFeedbackSection({
  leadId,
  feedbackBereit,
  handwerkerErledigt,
  hvFeedback,
  onSubmitted,
}: {
  leadId: string;
  feedbackBereit?: boolean;
  handwerkerErledigt?: boolean;
  hvFeedback?: HvFeedbackState;
  onSubmitted?: () => void;
}) {
  const [mode, setMode] = useState<"feedback" | "maengel">("feedback");
  const [sterne, setSterne] = useState(0);
  const [freitext, setFreitext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bewertungDone, setBewertungDone] = useState(false);

  if (!feedbackBereit) return null;

  const hatBewertung = Boolean(hvFeedback?.bewertung) || bewertungDone;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const body =
      mode === "maengel"
        ? { leadId, feedbackTyp: "maengel" as const, freitext }
        : { leadId, feedbackTyp: "bewertung" as const, sterne, freitext: freitext.trim() || undefined };

    if (mode === "feedback" && sterne < 1) {
      setBusy(false);
      setError("Bitte Sterne wählen.");
      return;
    }

    try {
      const res = await fetch("/api/org/vorgang-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Fehler beim Senden.");
        return;
      }
      if (mode === "maengel") {
        orgPortalToast.maengelGemeldet();
        setFreitext("");
      } else {
        orgPortalToast.feedbackGesendet();
        setBewertungDone(true);
      }
      onSubmitted?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border-default bg-surface-card p-4 space-y-3">
      {handwerkerErledigt ? (
        <p className="text-sm font-medium text-emerald-700">
          Handwerker hat die Leistungen abgeschlossen.
        </p>
      ) : null}

      <p className="text-sm font-semibold">Rückmeldung an Bärenwald</p>

      {hatBewertung && hvFeedback?.bewertung ? (
        <p className="text-sm text-text-secondary">
          Bewertung abgegeben: {"★".repeat(hvFeedback.bewertung.sterne)}
          {hvFeedback.bewertung.freitext ? (
            <span className="block mt-1 whitespace-pre-wrap">
              {hvFeedback.bewertung.freitext}
            </span>
          ) : null}
        </p>
      ) : null}

      {hvFeedback?.maengel?.length ? (
        <div className="text-sm text-text-secondary space-y-1">
          <p className="font-medium text-amber-800">Gemeldete Mängel</p>
          {hvFeedback.maengel.map((m, i) => (
            <p key={i} className="whitespace-pre-wrap rounded bg-amber-50 p-2 text-xs">
              {m.freitext}
            </p>
          ))}
        </div>
      ) : null}

      {!hatBewertung || mode === "maengel" ? (
        <>
          <div className="flex flex-wrap gap-2">
            {!hatBewertung ? (
              <button
                type="button"
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium border",
                  mode === "feedback"
                    ? "border-accent bg-accent-light text-accent"
                    : "border-border-default"
                )}
                onClick={() => setMode("feedback")}
              >
                Feedback
              </button>
            ) : null}
            <button
              type="button"
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium border",
                mode === "maengel"
                  ? "border-amber-500 bg-amber-50 text-amber-800"
                  : "border-border-default"
              )}
              onClick={() => setMode("maengel")}
            >
              Mängel melden
            </button>
          </div>

          {error ? (
            <p className="text-xs text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <form onSubmit={submit} className="space-y-3">
            {mode === "feedback" && !hatBewertung ? (
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={cn(
                      "text-xl",
                      n <= sterne ? "text-amber-500" : "text-muted"
                    )}
                    onClick={() => setSterne(n)}
                    aria-label={`${n} Sterne`}
                  >
                    ★
                  </button>
                ))}
              </div>
            ) : null}

            <textarea
              className="input-field w-full min-h-[72px] text-sm"
              placeholder={
                mode === "maengel"
                  ? "Beschreiben Sie die Mängel — Bärenwald erhält einen Hinweis zur Nachbearbeitung."
                  : "Optional: Anmerkung"
              }
              value={freitext}
              onChange={(e) => setFreitext(e.target.value)}
              required={mode === "maengel"}
            />

            <button
              type="submit"
              className={cn(
                "btn-pill-outline text-sm",
                mode === "maengel" && "border-amber-500 text-amber-800"
              )}
              disabled={busy}
            >
              {busy
                ? "Wird gesendet…"
                : mode === "maengel"
                  ? "Mängel an Bärenwald melden"
                  : "Feedback senden"}
            </button>
          </form>
        </>
      ) : null}
    </div>
  );
}
