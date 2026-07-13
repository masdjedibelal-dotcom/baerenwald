"use client";

import { useEffect, useState } from "react";

import {
  buildMieterStatusTimeline,
} from "@/lib/vorgang/plattform-status";
import {
  mieterStatusLabel,
  type MieterStatusStufe,
} from "@/lib/vorgang/vorgang-phase";
import { DokumenteTabelle } from "@/components/shared/DokumenteTabelle";
import { cn } from "@/lib/utils";

type Slot = {
  id: string;
  slot_beginn: string;
  slot_ende?: string | null;
  status: string;
};

type Props = {
  token: string;
  objektTitel: string;
  orgName: string;
  melderName: string;
  einheit: string | null;
  referenz: string;
  initialStufe: MieterStatusStufe;
  erledigt: boolean;
  anhaenge?: Array<{ id: string; name: string; datum?: string; href: string }>;
};

function fmtSlot(iso: string) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** S11 Mieter-Status mit Timeline, Terminen, Feedback */
export function MeldeStatusClient({
  token,
  objektTitel,
  orgName,
  melderName,
  einheit,
  referenz,
  initialStufe,
  erledigt,
  anhaenge = [],
}: Props) {
  const [stufe] = useState(initialStufe);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bestaetigt, setBestaetigt] = useState<Slot | null>(null);
  const [sterne, setSterne] = useState(0);
  const [freitext, setFreitext] = useState("");
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const timeline = buildMieterStatusTimeline(stufe);
  const label = mieterStatusLabel(stufe);

  async function loadSlots() {
    const res = await fetch(`/api/melden/terminslots?token=${encodeURIComponent(token)}`);
    const json = (await res.json()) as { slots?: Slot[]; bestaetigt?: Slot | null };
    setSlots(json.slots ?? []);
    setBestaetigt(json.bestaetigt ?? null);
  }

  useEffect(() => {
    void loadSlots();
  }, [token]);

  async function confirmSlot(slotId: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/melden/terminslots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, slotId, action: "bestaetigen" }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(json.error ?? "Fehler");
        return;
      }
      setMsg("Termin bestätigt.");
      await loadSlots();
    } finally {
      setBusy(false);
    }
  }

  async function declineSlot(slotId: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/melden/terminslots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, slotId, action: "absagen" }),
      });
      if (res.ok) await loadSlots();
    } finally {
      setBusy(false);
    }
  }

  async function submitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (sterne < 1) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/melden/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, sterne, freitext }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(json.error ?? "Fehler");
        return;
      }
      setFeedbackDone(true);
      setMsg("Danke für dein Feedback!");
    } finally {
      setBusy(false);
    }
  }

  const vorgeschlagene = slots.filter((s) => s.status === "vorgeschlagen");

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <p className="text-sm text-text-tertiary">Status deiner Meldung</p>
        <h1 className="mt-1 text-xl font-semibold text-text-primary">{objektTitel}</h1>
        {einheit ? (
          <p className="text-sm text-text-secondary">Einheit {einheit}</p>
        ) : null}
      </div>

      <article className="card-bordered space-y-4 p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Aktueller Status
          </p>
          <p className="mt-1 text-lg font-semibold text-accent">{label}</p>
        </div>

        <ol className="space-y-2 border-t border-border-default pt-4">
          {timeline.map((step) => (
            <li key={step.id} className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  step.done
                    ? "bg-emerald-100 text-emerald-800"
                    : step.active
                      ? "bg-accent-light text-accent"
                      : "bg-muted text-text-tertiary"
                )}
              >
                {step.done ? "✓" : step.active ? "•" : ""}
              </span>
              <span
                className={cn(
                  step.active ? "font-semibold text-text-primary" : "text-text-secondary"
                )}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>

        <div className="border-t border-border-default pt-4 text-sm text-text-secondary">
          <p>Hallo {melderName},</p>
          <p className="mt-2">
            {orgName} und Bärenwald bearbeiten deine Meldung. Referenz{" "}
            <span className="font-mono font-medium">{referenz}</span>.
          </p>
        </div>
      </article>

      {bestaetigt ? (
        <article className="card-bordered p-4">
          <p className="text-sm font-semibold text-text-primary">Dein Termin</p>
          <p className="mt-1 text-sm text-accent">{fmtSlot(bestaetigt.slot_beginn)}</p>
        </article>
      ) : vorgeschlagene.length > 0 ? (
        <article className="card-bordered space-y-3 p-4">
          <p className="text-sm font-semibold">Terminvorschläge</p>
          <ul className="space-y-2">
            {vorgeschlagene.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-light p-3"
              >
                <span className="text-sm">{fmtSlot(s.slot_beginn)}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-pill-outline portal-btn-compact"
                    disabled={busy}
                    onClick={() => void confirmSlot(s.id)}
                  >
                    Bestätigen
                  </button>
                  <button
                    type="button"
                    className="text-xs text-text-tertiary underline"
                    disabled={busy}
                    onClick={() => void declineSlot(s.id)}
                  >
                    Passt nicht
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      {erledigt && anhaenge.length > 0 ? (
        <DokumenteTabelle heading="Anhänge" dokumente={anhaenge} />
      ) : null}

      {erledigt && !feedbackDone ? (
        <article className="card-bordered space-y-3 p-4">
          <p className="text-sm font-semibold">Wie war der Service?</p>
          <form onSubmit={submitFeedback} className="space-y-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={cn(
                    "text-2xl",
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
              placeholder="Optional: Anmerkung"
              value={freitext}
              onChange={(e) => setFreitext(e.target.value)}
            />
            <button
              type="submit"
              className="btn-pill-outline portal-btn w-full"
              disabled={busy || sterne < 1}
            >
              Feedback senden
            </button>
          </form>
        </article>
      ) : null}

      {msg ? (
        <p className="text-center text-sm text-text-secondary" role="status">
          {msg}
        </p>
      ) : null}

      <p className="text-center text-xs text-text-tertiary">
        Bärenwald München · Hausverwaltungs-Service
      </p>
    </div>
  );
}
