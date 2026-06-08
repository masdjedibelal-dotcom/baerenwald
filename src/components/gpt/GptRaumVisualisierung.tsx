"use client";

import { useCallback, useEffect, useState } from "react";

import { useGptProjekt } from "@/components/gpt/gpt-projekt-context";
import { GptVizBeforeAfter } from "@/components/gpt/GptVizBeforeAfter";
import { GptVizEinstieg } from "@/components/gpt/GptVizEinstieg";
import { GptVizLeadForm } from "@/components/gpt/GptVizLeadForm";
import { GptVizRaumAnalysePanel } from "@/components/gpt/GptVizRaumAnalyse";
import { GptVizWunschEditor } from "@/components/gpt/GptVizWunschEditor";
import { GPT_VIZ_MAX_RENDERS } from "@/lib/gpt-viz/constants";
import type {
  GptVizBauErklaerung,
  GptVizRaumAnalyse,
  GptVizRenderVersion,
} from "@/lib/gpt-viz/types";

import "./gpt-viz.css";

type Step =
  | "einstieg"
  | "upload"
  | "analyse"
  | "wunsch"
  | "render"
  | "erklaerung"
  | "lead";

type UploadKind = "raum" | "inspiration";

type GptRaumVisualisierungProps = {
  onBeratung?: () => void;
  initialStep?: Step;
};

export function GptRaumVisualisierung({
  onBeratung,
  initialStep = "einstieg",
}: GptRaumVisualisierungProps) {
  const { sessionId, brief, ensureSession, refreshBrief } = useGptProjekt();
  const [step, setStep] = useState<Step>(initialStep);
  const [einstieg, setEinstieg] = useState<"prompt" | "inspiration" | null>(null);
  const [istUrls, setIstUrls] = useState<string[]>([]);
  const [zielBildUrl, setZielBildUrl] = useState<string | null>(null);
  const [analyse, setAnalyse] = useState<GptVizRaumAnalyse | null>(null);
  const [istBeschreibung, setIstBeschreibung] = useState("");
  const [wunschText, setWunschText] = useState("");
  const [ergebnisUrl, setErgebnisUrl] = useState<string | null>(null);
  const [historie, setHistorie] = useState<GptVizRenderVersion[]>([]);
  const [renderCount, setRenderCount] = useState(0);
  const [erklaerung, setErklaerung] = useState<GptVizBauErklaerung | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nachprompt, setNachprompt] = useState<string | undefined>();

  const sid = sessionId;

  useEffect(() => {
    if (!brief) return;
    if (brief.ist_bilder_urls.length > 0) setIstUrls(brief.ist_bilder_urls);
    if (brief.ziel_bild_url) setZielBildUrl(brief.ziel_bild_url);
    if (brief.raum_analyse) {
      setAnalyse(brief.raum_analyse);
      setIstBeschreibung(brief.raum_analyse.ist_beschreibung);
    }
    if (brief.wunsch_text) setWunschText(brief.wunsch_text);
    if (brief.ergebnis_bild_url) {
      setErgebnisUrl(brief.ergebnis_bild_url);
      setHistorie(brief.ergebnis_historie);
      setRenderCount(brief.render_count);
      if (brief.gpt_erklaerung) {
        setErklaerung(brief.gpt_erklaerung);
        setStep("erklaerung");
      } else {
        setStep("render");
      }
    } else if (brief.raum_analyse && brief.ziel_bild_url) {
      setEinstieg("inspiration");
      setStep("analyse");
    } else if (brief.wunsch_text || brief.ist_bilder_urls.length > 0) {
      setStep("wunsch");
    }
  }, [brief]);

  const handleUpload = useCallback(
    async (file: File, kind: UploadKind) => {
      setError(null);
      setLoading(true);
      const id = sid ?? (await ensureSession());
      if (!id) {
        setError("Session konnte nicht gestartet werden.");
        setLoading(false);
        return;
      }
      const form = new FormData();
      form.set("session_id", id);
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

        if (kind === "inspiration") {
          const inspirationUrl = data.ziel_bild_url ?? data.url ?? null;
          setZielBildUrl(inspirationUrl);
          const analyzeRes = await fetch("/api/gpt-viz/analyze-room", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_id: id,
              image_url: inspirationUrl,
              mode: "inspiration",
            }),
          });
          const analyzeData = (await analyzeRes.json()) as {
            error?: string;
            raum_analyse?: GptVizRaumAnalyse;
            wunsch_text?: string;
          };
          if (analyzeRes.ok && analyzeData.raum_analyse) {
            setAnalyse(analyzeData.raum_analyse);
            setIstBeschreibung(analyzeData.raum_analyse.ist_beschreibung);
            setWunschText(analyzeData.wunsch_text ?? analyzeData.raum_analyse.wunsch_entwurf);
            setStep("analyse");
          } else {
            setStep("wunsch");
            if (analyzeData.error) setError(analyzeData.error);
          }
        } else {
          const urls = data.ist_bilder_urls ?? (data.url ? [data.url] : istUrls);
          setIstUrls(urls);
          setStep("wunsch");
        }
        await refreshBrief();
      } catch {
        setError("Upload fehlgeschlagen.");
      } finally {
        setLoading(false);
      }
    },
    [sid, ensureSession, istUrls, refreshBrief]
  );

  const handleRender = useCallback(async () => {
    if (!wunschText.trim()) {
      setError("Bitte beschreibe deinen Wunsch.");
      return;
    }
    if (istUrls.length === 0) {
      setError("Für die Visualisierung wird ein Foto deines Raums benötigt.");
      return;
    }
    const id = sid ?? (await ensureSession());
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gpt-viz/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: id,
          wunsch_text: wunschText,
          nachprompt,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        ergebnis_bild_url?: string;
        ergebnis_historie?: GptVizRenderVersion[];
        render_count?: number;
      };
      if (!res.ok) {
        setError(data.error ?? "Render fehlgeschlagen.");
        return;
      }
      setErgebnisUrl(data.ergebnis_bild_url ?? null);
      setHistorie(data.ergebnis_historie ?? []);
      setRenderCount(data.render_count ?? 0);
      setStep("render");
      setNachprompt(undefined);

      const erkRes = await fetch("/api/gpt-viz/erklaerung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: id }),
      });
      const erkData = (await erkRes.json()) as {
        gpt_erklaerung?: GptVizBauErklaerung;
      };
      if (erkRes.ok && erkData.gpt_erklaerung) {
        setErklaerung(erkData.gpt_erklaerung);
        setStep("erklaerung");
      }
      await refreshBrief();
    } catch {
      setError("Render fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }, [wunschText, istUrls, sid, ensureSession, nachprompt, refreshBrief]);

  const handleStilWaehlen = (promptDe: string) => {
    setWunschText((prev) => (prev ? `${prev}\n${promptDe}` : promptDe));
  };

  const handleNachprompt = (tag: string) => {
    setNachprompt(tag);
    setWunschText((prev) => `${prev.trim()}\n${tag}`.trim());
  };

  const rendersLeft = GPT_VIZ_MAX_RENDERS - renderCount;
  const uploadTitle =
    einstieg === "inspiration" && !zielBildUrl
      ? "Inspirationsbild hochladen"
      : istUrls.length === 0
        ? "Foto deines Raums hochladen"
        : "Raumfoto ersetzen";

  const showUpload =
    step === "upload" ||
    (step === "wunsch" && einstieg === "inspiration" && !zielBildUrl) ||
    (step === "wunsch" && istUrls.length === 0);

  return (
    <div className="gpt-viz-root">
      {step === "einstieg" ? (
        <GptVizEinstieg
          onMitPrompt={() => {
            setEinstieg("prompt");
            setStep("wunsch");
          }}
          onMitInspiration={() => {
            setEinstieg("inspiration");
            setStep("upload");
          }}
        />
      ) : null}

      {showUpload ? (
        <div>
          <h2 className="gpt-viz-step-title">{uploadTitle}</h2>
          <div className="gpt-viz-upload">
            <label className="gpt-viz-upload-label">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const kind: UploadKind =
                    einstieg === "inspiration" && !zielBildUrl ? "inspiration" : "raum";
                  void handleUpload(f, kind);
                  e.target.value = "";
                }}
              />
              {loading ? "Wird verarbeitet …" : "Bild auswählen"}
            </label>
          </div>
          {zielBildUrl ? (
            <div className="gpt-viz-dual-preview" style={{ marginTop: "0.75rem" }}>
              <div>
                <p className="gpt-viz-preview-label">Inspirationsbild</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={zielBildUrl} alt="Inspirationsbild" className="gpt-viz-preview-img" />
              </div>
            </div>
          ) : null}
          {istUrls[0] ? (
            <div className="gpt-viz-dual-preview" style={{ marginTop: "0.75rem" }}>
              <div>
                <p className="gpt-viz-preview-label">Dein Raum (Ist)</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={istUrls[0]} alt="Raumfoto" className="gpt-viz-preview-img" />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === "analyse" && analyse ? (
        <div>
          <h2 className="gpt-viz-step-title">
            {einstieg === "inspiration" ? "Stil erkannt" : "Raum erkannt"}
          </h2>
          {zielBildUrl ? (
            <div className="gpt-viz-dual-preview" style={{ marginBottom: "0.75rem" }}>
              <div>
                <p className="gpt-viz-preview-label">Inspirationsbild</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={zielBildUrl} alt="Inspirationsbild" className="gpt-viz-preview-img" />
              </div>
            </div>
          ) : null}
          <GptVizRaumAnalysePanel
            analyse={analyse}
            istBeschreibung={istBeschreibung}
            onIstChange={setIstBeschreibung}
            wunschText={wunschText}
            onWunschChange={setWunschText}
            onStilWaehlen={handleStilWaehlen}
          />
          <div className="gpt-viz-actions">
            {istUrls.length === 0 ? (
              <button
                type="button"
                className="gpt-viz-btn gpt-viz-btn--outline"
                onClick={() => setStep("upload")}
              >
                Raumfoto hinzufügen
              </button>
            ) : (
              <button
                type="button"
                className="gpt-viz-btn gpt-viz-btn--primary"
                disabled={loading || !wunschText.trim()}
                onClick={() => void handleRender()}
              >
                So visualisieren
              </button>
            )}
          </div>
        </div>
      ) : null}

      {step === "wunsch" ? (
        <div>
          <h2 className="gpt-viz-step-title">Dein Wunsch</h2>
          <GptVizWunschEditor
            wunschText={wunschText}
            onWunschChange={setWunschText}
            hasPhoto={istUrls.length > 0}
            showNachprompt={renderCount > 0}
            onNachprompt={handleNachprompt}
          />
          {(zielBildUrl || istUrls[0]) && (
            <div className="gpt-viz-dual-preview" style={{ marginTop: "0.75rem" }}>
              {zielBildUrl ? (
                <div>
                  <p className="gpt-viz-preview-label">Inspirationsbild</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={zielBildUrl} alt="Inspirationsbild" className="gpt-viz-preview-img" />
                </div>
              ) : null}
              {istUrls[0] ? (
                <div>
                  <p className="gpt-viz-preview-label">Dein Raum (Ist)</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={istUrls[0]} alt="Raumfoto" className="gpt-viz-preview-img" />
                </div>
              ) : null}
            </div>
          )}
          <div className="gpt-viz-actions">
            {istUrls.length === 0 ? (
              <button
                type="button"
                className="gpt-viz-btn gpt-viz-btn--outline"
                onClick={() => setStep("upload")}
              >
                Raumfoto hinzufügen
              </button>
            ) : (
              <button
                type="button"
                className="gpt-viz-btn gpt-viz-btn--primary"
                disabled={loading || !wunschText.trim()}
                onClick={() => void handleRender()}
              >
                {loading ? "Visualisiere …" : "So visualisieren"}
              </button>
            )}
          </div>
        </div>
      ) : null}

      {(step === "render" || step === "erklaerung") && ergebnisUrl && istUrls[0] ? (
        <div>
          <h2 className="gpt-viz-step-title">Vorher / Nachher</h2>
          <GptVizBeforeAfter
            istUrl={istUrls[0]}
            ergebnisUrl={ergebnisUrl}
            historie={historie}
            onVersionSelect={setErgebnisUrl}
            beschreibung={wunschText.trim() || istBeschreibung.trim()}
          />
          {rendersLeft > 0 ? (
            <div className="gpt-viz-actions">
              <button
                type="button"
                className="gpt-viz-btn gpt-viz-btn--outline"
                onClick={() => setStep("wunsch")}
              >
                Anpassen ({rendersLeft} übrig)
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === "erklaerung" && erklaerung ? (
        <div className="gpt-viz-erklaerung">
          <h4>{erklaerung.titel}</h4>
          <p className="gpt-viz-muted">{erklaerung.zusammenfassung}</p>
          {erklaerung.gewerke.length > 0 ? (
            <ul>
              {erklaerung.gewerke.map((g) => (
                <li key={g.name}>
                  <strong>{g.name}:</strong> {g.beschreibung}
                </li>
              ))}
            </ul>
          ) : null}
          {erklaerung.hinweis_gu ? (
            <p className="gpt-viz-muted" style={{ marginTop: "0.5rem" }}>
              {erklaerung.hinweis_gu}
            </p>
          ) : null}
          <div className="gpt-viz-actions" style={{ marginTop: "0.75rem" }}>
            <button
              type="button"
              className="gpt-viz-btn gpt-viz-btn--primary"
              onClick={() => setStep("lead")}
            >
              Projekt an Bärenwald senden
            </button>
            {onBeratung ? (
              <button
                type="button"
                className="gpt-viz-btn gpt-viz-btn--outline"
                onClick={onBeratung}
              >
                Noch Fragen? Zur Beratung
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === "lead" && sid ? (
        <GptVizLeadForm sessionId={sid} onSuccess={() => refreshBrief()} />
      ) : null}

      {error ? <p className="gpt-viz-error">{error}</p> : null}

      {step !== "einstieg" && step !== "lead" ? (
        <button
          type="button"
          className="gpt-viz-btn gpt-viz-btn--outline"
          style={{ alignSelf: "flex-start", marginTop: "0.25rem" }}
          onClick={() => {
            setStep("einstieg");
            setEinstieg(null);
            setError(null);
          }}
        >
          Neu starten
        </button>
      ) : null}
    </div>
  );
}
