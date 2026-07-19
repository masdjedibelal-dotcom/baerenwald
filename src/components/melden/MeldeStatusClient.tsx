"use client";

import { useEffect, useMemo, useState } from "react";

import { DokumenteTabelle } from "@/components/shared/DokumenteTabelle";
import {
  MieterWlCard,
  MieterWlFrame,
} from "@/components/melden/MieterWlFrame";
import { MieterStgTimeline } from "@/components/melden/MieterStgTimeline";
import type { MeldeLang } from "@/lib/melden/melde-i18n";
import {
  MIETER_WL_STATUS,
  mieterStgActiveCopy,
  type MieterWlBrand,
} from "@/lib/portal2/mieter-wl";
import type { MieterStatusStufe } from "@/lib/vorgang/vorgang-phase";
import { cn } from "@/lib/utils";
import "./melden.css";

type Slot = {
  id: string;
  slot_beginn: string;
  slot_ende?: string | null;
  status: string;
};

type Props = {
  brand: MieterWlBrand;
  token: string;
  objektTitel: string;
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

/**
 * D9 `wlStatus` — STG-Timeline (de+en) im HV-Branding.
 * Termin-/Feedback-APIs unverändert.
 */
export function MeldeStatusClient({
  brand,
  token,
  objektTitel,
  melderName,
  einheit,
  referenz,
  initialStufe,
  erledigt,
  anhaenge = [],
}: Props) {
  const [lang, setLang] = useState<MeldeLang>("de");
  const [stufe] = useState(initialStufe);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bestaetigt, setBestaetigt] = useState<Slot | null>(null);
  const [sterne, setSterne] = useState(0);
  const [freitext, setFreitext] = useState("");
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const active = useMemo(
    () => mieterStgActiveCopy(stufe, lang),
    [stufe, lang]
  );

  const metaLine = [objektTitel, einheit, referenz].filter(Boolean).join(" · ");

  async function loadSlots() {
    const res = await fetch(
      `/api/melden/terminslots?token=${encodeURIComponent(token)}`
    );
    const json = (await res.json()) as {
      slots?: Slot[];
      bestaetigt?: Slot | null;
    };
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
      setMsg(lang === "en" ? "Appointment confirmed." : "Termin bestätigt.");
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
      setMsg(lang === "en" ? "Thanks for your feedback!" : "Danke für Ihr Feedback!");
    } finally {
      setBusy(false);
    }
  }

  const vorgeschlagene = slots.filter((s) => s.status === "vorgeschlagen");
  const firstName = melderName.trim().split(/\s+/)[0] || melderName;
  const t = MIETER_WL_STATUS;

  return (
    <MieterWlFrame brand={brand} lang={lang} onLangChange={setLang}>
      <div className="space-y-4">
        <div>
          <h1 className="mieter-wl-objekt-title" style={{ fontSize: 21 }}>
            {lang === "en" ? t.title_en : t.title_de}
          </h1>
          <p className="text-[13px] text-[#4a5c54] mt-1">{metaLine}</p>
          <p className="mt-3 text-[14px] font-semibold text-[#16201B]">
            {active.title}
            <span className="font-normal text-[#4a5c54]">
              {" "}
              — {active.subtitle}
            </span>
          </p>
        </div>

        <MieterStgTimeline stufe={stufe} lang={lang} />

        {bestaetigt ? (
          <MieterWlCard>
            <div className="p-4">
              <p className="text-[14.5px] font-bold text-[#16201B]">
                {lang === "en" ? "Your appointment" : "Ihr Termin"}
              </p>
              <p className="mt-1 text-sm font-semibold text-[color:var(--org-primary,#2E7D52)]">
                {fmtSlot(bestaetigt.slot_beginn)}
              </p>
            </div>
          </MieterWlCard>
        ) : vorgeschlagene.length > 0 ? (
          <MieterWlCard>
            <div className="p-4 space-y-3">
              <p className="text-[14.5px] font-bold text-[#16201B]">
                {lang === "en" ? "Appointment" : "Terminvorschlag"}
              </p>
              <p className="text-[12.5px] text-[#4a5c54] leading-relaxed">
                {lang === "en"
                  ? "The assigned contractor suggests the following times. Please choose one."
                  : "Der beauftragte Betrieb schlägt folgende Zeiten vor. Bitte wählen Sie einen Termin."}
              </p>
              <ul className="space-y-2">
                {vorgeschlagene.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[rgba(0,0,0,.08)] p-3"
                  >
                    <span className="text-[13.5px] font-semibold">
                      {fmtSlot(s.slot_beginn)}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="mieter-wl-btn mieter-wl-btn--primary !w-auto !py-2 !px-3 !text-[12.5px]"
                        disabled={busy}
                        onClick={() => void confirmSlot(s.id)}
                      >
                        {lang === "en" ? "Confirm" : "Bestätigen"}
                      </button>
                      <button
                        type="button"
                        className="text-xs text-[#8a9690] underline"
                        disabled={busy}
                        onClick={() => void declineSlot(s.id)}
                      >
                        {lang === "en" ? "Doesn't fit" : "Passt nicht"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </MieterWlCard>
        ) : null}

        {erledigt && anhaenge.length > 0 ? (
          <DokumenteTabelle heading={lang === "en" ? "Attachments" : "Anhänge"} dokumente={anhaenge} />
        ) : null}

        {erledigt && !feedbackDone ? (
          <MieterWlCard>
            <div className="p-4 space-y-3">
              <p className="text-[14.5px] font-bold text-[#16201B]">
                {lang === "en" ? "How was the service?" : "Wie war der Service?"}
              </p>
              <form onSubmit={submitFeedback} className="space-y-3">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={cn(
                        "text-2xl",
                        n <= sterne ? "text-amber-500" : "text-[#d0d5d2]"
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
                  placeholder={
                    lang === "en" ? "Optional note" : "Optional: Anmerkung"
                  }
                  value={freitext}
                  onChange={(e) => setFreitext(e.target.value)}
                />
                <button
                  type="submit"
                  className="mieter-wl-btn mieter-wl-btn--primary"
                  disabled={busy || sterne < 1}
                >
                  {lang === "en" ? "Send feedback" : "Feedback senden"}
                </button>
              </form>
            </div>
          </MieterWlCard>
        ) : null}

        {msg ? (
          <p className="text-center text-sm text-[#4a5c54]" role="status">
            {msg}
          </p>
        ) : null}

        <p className="text-[12.5px] text-[#4a5c54] leading-relaxed">
          {lang === "en" ? t.hello_en : t.hello_de}
          {firstName}
          {" – "}
          {brand.name}
          {lang === "en" ? t.keep_updated_en : t.keep_updated_de}
        </p>
      </div>
    </MieterWlFrame>
  );
}
