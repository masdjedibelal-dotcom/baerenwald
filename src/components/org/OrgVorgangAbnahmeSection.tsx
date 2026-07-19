"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { submitOrgHvAbnahme, type HvAbnahmeArt } from "@/app/actions/org-hv-abnahme";
import { SignatureCanvas } from "@/components/shared/SignatureCanvas";
import { VorgangTimeline } from "@/components/shared/VorgangTimeline";
import { RoleStatusPill } from "@/components/shared/RoleStatusPill";
import { orgPortalToast } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

type AbnahmeDoku = {
  leistungen: Array<{ name: string; kategorie?: string }>;
  fotos?: Array<{ name: string; href?: string }>;
  bemerkung?: string | null;
  betrieb?: string | null;
  ausfuehrung?: string | null;
};

type ExistingAbnahme = {
  art: HvAbnahmeArt;
  anmerkung?: string | null;
  signiert_name: string;
  signiert_am: string;
};

type Props = {
  leadId: string;
  auftragId: string;
  objektLabel?: string;
  einheitLabel?: string;
  doku?: AbnahmeDoku;
  existing?: ExistingAbnahme | null;
  onSubmitted?: () => void;
};

const TIMELINE = [
  { id: "beauftragt", label: "Beauftragt", done: true, active: false },
  { id: "ausfuehrung", label: "Ausführung", done: true, active: false },
  { id: "abnahme", label: "Abnahme", done: false, active: true },
  { id: "erledigt", label: "Erledigt", done: false, active: false },
];

/** HV-Portal: digitale Abnahme & Signatur (Design Phase D). */
export function OrgVorgangAbnahmeSection({
  leadId,
  auftragId,
  objektLabel,
  einheitLabel,
  doku,
  existing,
  onSubmitted,
}: Props) {
  const router = useRouter();
  const [art, setArt] = useState<HvAbnahmeArt | null>(existing?.art ?? null);
  const [anmerkung, setAnmerkung] = useState(existing?.anmerkung ?? "");
  const [signiertName, setSigniertName] = useState(existing?.signiert_name ?? "");
  const [signatur, setSignatur] = useState<string | null>(null);
  const [hasSig, setHasSig] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(Boolean(existing));

  if (done && existing) {
    return (
      <div className="portal-surface space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">Abnahme</h2>
          <RoleStatusPill
            label={
              existing.art === "zurueckgewiesen"
                ? "In Klärung"
                : existing.art === "mit_anmerkung"
                  ? "Abgenommen (Anmerkung)"
                  : "Abgenommen"
            }
            semantic={existing.art === "zurueckgewiesen" ? "warten" : "fertig"}
          />
        </div>
        <p className="text-sm text-text-secondary">
          Signiert von {existing.signiert_name} am{" "}
          {new Intl.DateTimeFormat("de-DE").format(new Date(existing.signiert_am))}.
        </p>
        {existing.anmerkung ? (
          <p className="rounded-lg bg-muted/30 p-3 text-sm whitespace-pre-wrap">
            {existing.anmerkung}
          </p>
        ) : null}
      </div>
    );
  }

  async function submit(nextArt: HvAbnahmeArt) {
    setBusy(true);
    setError(null);
    const res = await submitOrgHvAbnahme({
      leadId,
      auftragId,
      art: nextArt,
      anmerkung: anmerkung.trim() || undefined,
      signiertName,
      signaturPng: signatur ?? undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (nextArt === "zurueckgewiesen") {
      orgPortalToast.maengelGemeldet();
    } else {
      orgPortalToast.feedbackGesendet();
    }
    setDone(true);
    onSubmitted?.();
    router.refresh();
  }

  const canSign =
    art != null &&
    art !== "zurueckgewiesen" &&
    hasSig &&
    signiertName.trim().length > 0 &&
    (art !== "mit_anmerkung" || anmerkung.trim().length > 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-[#faf0d8] p-4 text-sm text-[#5c4a10]">
        <p className="font-semibold text-[#4c3d0c]">Ihre Abnahme wird benötigt.</p>
        <p className="mt-1">
          Der Betrieb hat die Arbeiten abgeschlossen. Prüfen Sie die Unterlagen und signieren
          Sie die Abnahme — danach schließt Bärenwald den Vorgang ab.
        </p>
      </div>

      <VorgangTimeline steps={TIMELINE} />

      {doku ? (
        <div className="portal-surface space-y-3 p-4">
          <h2 className="font-semibold">Abschlussdokumentation des Betriebs</h2>
          {(objektLabel || einheitLabel) && (
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              {objektLabel ? (
                <p>
                  <span className="text-text-tertiary">Objekt: </span>
                  {objektLabel}
                </p>
              ) : null}
              {einheitLabel ? (
                <p>
                  <span className="text-text-tertiary">Einheit: </span>
                  {einheitLabel}
                </p>
              ) : null}
              {doku.betrieb ? (
                <p>
                  <span className="text-text-tertiary">Betrieb: </span>
                  {doku.betrieb}
                </p>
              ) : null}
            </div>
          )}
          <ul className="space-y-2">
            {doku.leistungen.map((l) => (
              <li key={l.name} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-xs text-white">
                  ✓
                </span>
                <span>
                  <b>{l.name}</b>
                  {l.kategorie ? (
                    <span className="ml-2 text-xs text-text-tertiary">{l.kategorie}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          {doku.bemerkung ? (
            <p className="rounded-lg border border-border-light bg-[#fbfcfb] p-3 text-sm">
              <b>Bemerkung des Betriebs:</b> {doku.bemerkung}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="portal-surface space-y-4 p-4">
        <h2 className="font-semibold">Abnahme</h2>

        <label className="flex cursor-pointer gap-3">
          <input
            type="radio"
            name="abnahme-art"
            checked={art === "ohne_vorbehalt"}
            onChange={() => setArt("ohne_vorbehalt")}
            className="mt-1"
          />
          <span>
            <b className="block text-sm">Abnahme ohne Vorbehalt</b>
            <span className="text-xs text-text-secondary">
              Die Leistung ist vollständig und ordnungsgemäß erbracht.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer gap-3">
          <input
            type="radio"
            name="abnahme-art"
            checked={art === "mit_anmerkung"}
            onChange={() => setArt("mit_anmerkung")}
            className="mt-1"
          />
          <span>
            <b className="block text-sm">Abnahme mit Anmerkung</b>
            <span className="text-xs text-text-secondary">
              Die Leistung wird abgenommen; eine Anmerkung wird dokumentiert.
            </span>
          </span>
        </label>

        {art === "mit_anmerkung" ? (
          <textarea
            className="portal-input w-full min-h-[72px] rounded-xl border border-border-default p-3"
            placeholder="z. B. Fuge farblich leicht abweichend — im Rahmen akzeptiert."
            value={anmerkung}
            onChange={(e) => setAnmerkung(e.target.value)}
          />
        ) : null}

        {art && art !== "zurueckgewiesen" ? (
          <>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-text-tertiary">Name</span>
              <input
                type="text"
                className="portal-input w-full rounded-xl border border-border-default p-3"
                value={signiertName}
                onChange={(e) => setSigniertName(e.target.value)}
                placeholder="Vor- und Nachname"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-text-tertiary">Unterschrift</span>
              <SignatureCanvas
                onChange={(has, data) => {
                  setHasSig(has);
                  setSignatur(data);
                }}
              />
            </label>
          </>
        ) : null}

        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-pill-primary"
            disabled={!canSign || busy}
            onClick={() => void submit(art!)}
          >
            {busy ? "Wird gespeichert…" : "Abnahme signieren"}
          </button>
          <button
            type="button"
            className="text-sm font-semibold text-text-tertiary underline"
            onClick={() => setRejectOpen((v) => !v)}
          >
            Zurückweisen…
          </button>
        </div>

        {rejectOpen ? (
          <div className="space-y-3 rounded-xl border border-border-light bg-[#fbfcfb] p-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-text-tertiary">
                Begründung der Zurückweisung
              </span>
              <textarea
                className="portal-input w-full min-h-[72px] rounded-xl border border-border-default p-3"
                value={anmerkung}
                onChange={(e) => setAnmerkung(e.target.value)}
                placeholder="Was ist nicht in Ordnung? Bärenwald klärt das mit dem Betrieb."
              />
            </label>
            <button
              type="button"
              className={cn("btn-pill-primary", "bg-[#8a6d1a] hover:bg-[#7a6018]")}
              disabled={busy || !anmerkung.trim()}
              onClick={() => void submit("zurueckgewiesen")}
            >
              An Bärenwald zurückgeben
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
