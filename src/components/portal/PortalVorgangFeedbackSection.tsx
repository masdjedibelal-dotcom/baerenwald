"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { submitPortalMieterFeedback } from "@/app/actions/portal-feedback";
import { PortalDetailSuccessBox } from "@/components/shared/PortalDetailUi";
import { kundePortalToast } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

export function PortalVorgangFeedbackSection({
  leadId,
  feedbackBereit,
  mieterFeedback,
}: {
  leadId: string;
  feedbackBereit?: boolean;
  mieterFeedback?: { sterne: number; freitext?: string | null } | null;
}) {
  const router = useRouter();
  const [sterne, setSterne] = useState(0);
  const [freitext, setFreitext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!feedbackBereit) return null;

  if (mieterFeedback || done) {
    const s = mieterFeedback?.sterne ?? sterne;
    return (
      <article className="portal-surface space-y-2 p-4">
        <PortalDetailSuccessBox>
          <p className="font-semibold">Danke für dein Feedback!</p>
          {s > 0 ? (
            <p className="portal-text-meta mt-1 text-amber-600">
              {"★".repeat(s)}
              {"☆".repeat(5 - s)}
            </p>
          ) : null}
          {mieterFeedback?.freitext ? (
            <p className="portal-text-meta mt-2 text-text-secondary whitespace-pre-wrap">
              {mieterFeedback.freitext}
            </p>
          ) : null}
        </PortalDetailSuccessBox>
      </article>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sterne < 1) return;
    setBusy(true);
    setError(null);
    const res = await submitPortalMieterFeedback({
      leadId,
      sterne,
      freitext: freitext.trim() || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone(true);
    kundePortalToast.feedbackGesendet();
    router.refresh();
  }

  return (
    <article className="portal-surface space-y-3 p-4">
      <p className="portal-text-body font-semibold text-text-primary">
        Wie war der Service?
      </p>
      <p className="portal-text-meta text-text-secondary">
        Der Handwerker hat die Arbeiten abgeschlossen. Deine Rückmeldung hilft
        uns, den Service zu verbessern.
      </p>
      {error ? (
        <p className="portal-text-meta text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={cn(
                "text-2xl transition-colors",
                n <= sterne ? "text-amber-500" : "text-muted"
              )}
              onClick={() => setSterne(n)}
              aria-label={`${n} Sterne`}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          className="input-field w-full min-h-[72px]"
          placeholder="Optional: Anmerung"
          value={freitext}
          onChange={(e) => setFreitext(e.target.value)}
        />
        <button
          type="submit"
          className="btn-pill-outline portal-btn w-full sm:w-auto"
          disabled={busy || sterne < 1}
        >
          {busy ? "Wird gesendet…" : "Feedback senden"}
        </button>
      </form>
    </article>
  );
}
