"use client";

import { useMemo, useState } from "react";

import { submitAnfrageAction } from "@/app/actions/submit-anfrage";
import { DatenschutzCheckbox } from "@/components/funnel/DatenschutzCheckbox";
import { PhotoUpload } from "@/components/funnel/PhotoUpload";
import { StepWrapper } from "@/components/funnel/StepWrapper";
import { ladeAnfrageFotosHoch, neueFotoSitzung } from "@/lib/funnel/fotos-hochladen";
import {
  ANFRAGE_ANLIEGEN,
  ANFRAGE_KUNDENTYPEN,
  ANFRAGE_OBJEKTARTEN,
  ANFRAGE_ZEITRAUM,
  type AnfrageDaten,
  anfrageBudgetOptionen,
} from "@/lib/funnel/anfrage-weg";
import { istTeo } from "@/lib/marke";
import { cn } from "@/lib/utils";

const SCHRITTE = [
  { label: "Wer", frage: "Wer fragt an?", sub: "Damit wir die richtigen Fragen stellen." },
  { label: "Anliegen", frage: "Was steht an?", sub: "Mehrfachauswahl möglich." },
  { label: "Eckdaten", frage: "Die Eckdaten", sub: "Je genauer, desto besser können wir uns vorbereiten." },
  { label: "Kontakt", frage: "Wie erreichen wir Sie?", sub: "Wir melden uns persönlich, meist noch am selben Werktag." },
] as const;

function Wahl({
  optionen,
  wert,
  onWahl,
}: {
  optionen: readonly string[];
  wert: string;
  onWahl: (v: string) => void;
}) {
  return (
    <div className="anfrage-wahl">
      {optionen.map((o) => (
        <button
          key={o}
          type="button"
          className={cn("anfrage-wahl__opt", wert === o && "selected")}
          onClick={() => onWahl(wert === o ? "" : o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/**
 * Allgemeine Anfrage ohne Preisrahmen: Wer → Anliegen → Eckdaten → Kontakt.
 * Erreichbar über „Anfrage stellen“ (Startseite) und „Etwas anderes?“ im Rechner.
 */
export function AnfrageWeg({ onAbbrechen }: { onAbbrechen: () => void }) {
  const [schritt, setSchritt] = useState(0);
  const [d, setD] = useState<AnfrageDaten>(() => ({
    // Servus TEO richtet sich an Hausverwaltungen — vorausgewählt, aber änderbar
    kundentyp: istTeo ? "hausverwaltung" : "",
    anliegen: [],
    plz: "",
    ort: "",
    strasse: "",
    objektart: "",
    flaeche: "",
    zeitraum: "",
    budget: "",
    beschreibung: "",
    bau: { geschosse: "", einheiten: "", baujahr: "", lv: "", architekt: "" },
    name: "",
    firma: "",
    email: "",
    telefon: "",
    datenschutz: false,
    sitzung: neueFotoSitzung(),
    fotos: [],
  }));
  const [dateien, setDateien] = useState<File[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);
  const [dsFehler, setDsFehler] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  const set = <K extends keyof AnfrageDaten>(k: K, v: AnfrageDaten[K]) => setD((p) => ({ ...p, [k]: v }));
  const setBau = (k: keyof AnfrageDaten["bau"], v: string) => setD((p) => ({ ...p, bau: { ...p.bau, [k]: v } }));
  const budgetOptionen = useMemo(() => anfrageBudgetOptionen(d.kundentyp || null), [d.kundentyp]);
  const bauprojekt = d.anliegen.includes("bauprojekt");

  function pruefe(i: number): string | null {
    if (i === 0 && !d.kundentyp) return "Bitte wählen Sie aus, wer anfragt.";
    if (i === 1 && !d.anliegen.length) return "Bitte wählen Sie mindestens einen Punkt aus.";
    if (i === 2) {
      if (!/^\d{5}$/.test(d.plz.trim())) return "Bitte geben Sie die PLZ des Objekts an.";
      if (d.beschreibung.trim().length < 10) return "Bitte beschreiben Sie kurz Ihr Vorhaben.";
    }
    if (i === 3) {
      if (d.name.trim().length < 2) return "Bitte geben Sie Ihren Namen an.";
      if (!d.email.trim() && !d.telefon.trim()) return "Bitte geben Sie eine E-Mail-Adresse oder Telefonnummer an.";
      if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) {
        return "Bitte geben Sie eine gültige E-Mail-Adresse an.";
      }
    }
    return null;
  }

  function weiter() {
    const f = pruefe(schritt);
    setFehler(f);
    if (f) return;
    setSchritt((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }

  function zurueck() {
    setFehler(null);
    if (schritt === 0) return onAbbrechen();
    setSchritt((s) => s - 1);
  }

  async function fotosHochladen(): Promise<string[]> {
    const { urls } = await ladeAnfrageFotosHoch(dateien, d.sitzung);
    return urls;
  }

  async function absenden() {
    const f = pruefe(3);
    setFehler(f);
    if (f) return;
    if (!d.datenschutz) {
      setDsFehler(true);
      return;
    }
    setStatus("loading");
    try {
      const fotos = await fotosHochladen();
      const res = await submitAnfrageAction({ ...d, fotos });
      if (!res.ok) {
        setStatus("idle");
        setFehler(res.error);
        return;
      }
      setStatus("done");
    } catch (e) {
      setStatus("idle");
      setFehler(e instanceof Error ? e.message : "Bitte versuchen Sie es erneut oder rufen Sie uns an.");
    }
  }

  if (status === "done") {
    return (
      <StepWrapper stepLabel="Anfrage" question="Danke — Ihre Anfrage ist da." animateKey="anfrage-danke" tilesCard>
        <div className="individuell-danke">
          <p className="individuell-danke__text">Wir melden uns persönlich bei Ihnen, meist noch am selben Werktag.</p>
        </div>
      </StepWrapper>
    );
  }

  const s = SCHRITTE[schritt]!;
  return (
    <StepWrapper
      stepLabel={`Anfrage · Schritt ${schritt + 1} von ${SCHRITTE.length}`}
      question={s.frage}
      subtext={s.sub}
      animateKey={`anfrage-${schritt}`}
      tilesCard
    >
      <div className="individuell-form space-y-3">
        {schritt === 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {ANFRAGE_KUNDENTYPEN.map((k) => (
              <button
                key={k.id}
                type="button"
                className={cn("funnel-tile", d.kundentyp === k.id && "selected")}
                onClick={() => set("kundentyp", k.id)}
              >
                <span className="funnel-tile-label">{k.label}</span>
                <span className="funnel-tile-hint">{k.hint}</span>
              </button>
            ))}
          </div>
        ) : null}

        {schritt === 1 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ANFRAGE_ANLIEGEN.map((a) => {
              const aktiv = d.anliegen.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  className={cn("funnel-tile funnel-tile--text-only", aktiv && "selected")}
                  onClick={() =>
                    set("anliegen", aktiv ? d.anliegen.filter((x) => x !== a.id) : [...d.anliegen, a.id])
                  }
                >
                  <span className="funnel-tile-label">{a.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {schritt === 2 ? (
          <>
            <div className="anfrage-zeile">
              <label className="anfrage-feld anfrage-feld--plz">
                <span className="anfrage-feld__label">PLZ *</span>
                <input
                  className="funnel-input"
                  inputMode="numeric"
                  maxLength={5}
                  value={d.plz}
                  onChange={(e) => set("plz", e.target.value.replace(/\D/g, ""))}
                />
              </label>
              <label className="anfrage-feld">
                <span className="anfrage-feld__label">Ort</span>
                <input className="funnel-input" value={d.ort} onChange={(e) => set("ort", e.target.value)} />
              </label>
            </div>
            <label className="anfrage-feld">
              <span className="anfrage-feld__label">Straße und Hausnummer (optional)</span>
              <input className="funnel-input" value={d.strasse} onChange={(e) => set("strasse", e.target.value)} />
            </label>
            <div className="anfrage-feld">
              <span className="anfrage-feld__label">Objekt</span>
              <Wahl optionen={ANFRAGE_OBJEKTARTEN} wert={d.objektart} onWahl={(v) => set("objektart", v)} />
            </div>
            <label className="anfrage-feld">
              <span className="anfrage-feld__label">Fläche (ca. m², optional)</span>
              <input
                className="funnel-input"
                inputMode="numeric"
                placeholder="z. B. 80"
                value={d.flaeche}
                onChange={(e) => set("flaeche", e.target.value)}
              />
            </label>
            {bauprojekt ? (
              <div className="anfrage-bau">
                <p className="anfrage-bau__titel">Zum Bauprojekt</p>
                <div className="anfrage-zeile">
                  <label className="anfrage-feld">
                    <span className="anfrage-feld__label">Geschosse</span>
                    <input className="funnel-input" inputMode="numeric" value={d.bau.geschosse} onChange={(e) => setBau("geschosse", e.target.value)} />
                  </label>
                  <label className="anfrage-feld">
                    <span className="anfrage-feld__label">Einheiten</span>
                    <input className="funnel-input" inputMode="numeric" value={d.bau.einheiten} onChange={(e) => setBau("einheiten", e.target.value)} />
                  </label>
                </div>
                <label className="anfrage-feld">
                  <span className="anfrage-feld__label">Baujahr / Neubau</span>
                  <input
                    className="funnel-input"
                    placeholder="z. B. 1978 oder Neubau"
                    value={d.bau.baujahr}
                    onChange={(e) => setBau("baujahr", e.target.value)}
                  />
                </label>
                <div className="anfrage-feld">
                  <span className="anfrage-feld__label">Leistungsverzeichnis vorhanden?</span>
                  <Wahl
                    optionen={["Ja", "In Arbeit", "Nein"]}
                    wert={{ ja: "Ja", in_arbeit: "In Arbeit", nein: "Nein", "": "" }[d.bau.lv]}
                    onWahl={(v) => setBau("lv", ({ Ja: "ja", "In Arbeit": "in_arbeit", Nein: "nein" } as Record<string, string>)[v] ?? "")}
                  />
                </div>
                <div className="anfrage-feld">
                  <span className="anfrage-feld__label">Architekt / Fachplaner</span>
                  <Wahl
                    optionen={["Vorhanden", "Wird benötigt"]}
                    wert={{ vorhanden: "Vorhanden", benoetigt: "Wird benötigt", "": "" }[d.bau.architekt]}
                    onWahl={(v) =>
                      setBau("architekt", ({ Vorhanden: "vorhanden", "Wird benötigt": "benoetigt" } as Record<string, string>)[v] ?? "")
                    }
                  />
                </div>
              </div>
            ) : null}
            <div className="anfrage-feld">
              <span className="anfrage-feld__label">Zeitraum</span>
              <Wahl optionen={ANFRAGE_ZEITRAUM} wert={d.zeitraum} onWahl={(v) => set("zeitraum", v)} />
            </div>
            <div className="anfrage-feld">
              <span className="anfrage-feld__label">Budget</span>
              <Wahl optionen={budgetOptionen} wert={d.budget} onWahl={(v) => set("budget", v)} />
            </div>
            <label className="anfrage-feld">
              <span className="anfrage-feld__label">Beschreibung *</span>
              <textarea
                className="funnel-textarea"
                rows={5}
                maxLength={2000}
                placeholder="Was soll gemacht werden? Besondere Wünsche oder Rahmenbedingungen …"
                value={d.beschreibung}
                onChange={(e) => set("beschreibung", e.target.value)}
              />
            </label>
            <PhotoUpload
              files={dateien}
              onChange={setDateien}
              maxFiles={5}
              buttonTitle="Fotos (optional)"
              buttonHint="Bis zu 5 Fotos, je max. 8 MB — damit wir uns vorab ein Bild machen können."
            />
          </>
        ) : null}

        {schritt === 3 ? (
          <>
            <label className="anfrage-feld">
              <span className="anfrage-feld__label">Ihr Name *</span>
              <input className="funnel-input" autoComplete="name" value={d.name} onChange={(e) => set("name", e.target.value)} />
            </label>
            {d.kundentyp !== "privat" ? (
              <label className="anfrage-feld">
                <span className="anfrage-feld__label">
                  {d.kundentyp === "hausverwaltung" ? "Hausverwaltung / Eigentümergemeinschaft" : "Firma"}
                </span>
                <input
                  className="funnel-input"
                  autoComplete="organization"
                  value={d.firma}
                  onChange={(e) => set("firma", e.target.value)}
                />
              </label>
            ) : null}
            <label className="anfrage-feld">
              <span className="anfrage-feld__label">E-Mail-Adresse</span>
              <input
                type="email"
                className="funnel-input"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                value={d.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </label>
            <label className="anfrage-feld">
              <span className="anfrage-feld__label">Telefonnummer</span>
              <input
                type="tel"
                className="funnel-input"
                autoComplete="tel"
                inputMode="tel"
                value={d.telefon}
                onChange={(e) => set("telefon", e.target.value)}
              />
            </label>
            <p className="anfrage-hinweis">Bitte geben Sie mindestens eine E-Mail-Adresse oder Telefonnummer an.</p>
            <DatenschutzCheckbox
              checked={d.datenschutz}
              onChange={(v) => {
                set("datenschutz", v);
                if (v) setDsFehler(false);
              }}
              showError={dsFehler}
            />
          </>
        ) : null}

        {fehler ? <p className="field-error">{fehler}</p> : null}
        <div className="individuell-form__aktionen">
          <button type="button" className="individuell-form__zurueck" onClick={zurueck}>
            ← {schritt === 0 ? "Zurück zum Rechner" : "Zurück"}
          </button>
          {schritt < SCHRITTE.length - 1 ? (
            <button type="button" className="komplex-submit-btn" onClick={weiter}>
              Weiter →
            </button>
          ) : (
            <button type="button" className="komplex-submit-btn" disabled={status === "loading"} onClick={() => void absenden()}>
              {status === "loading" ? "Wird gesendet…" : "Anfrage senden"}
            </button>
          )}
        </div>
      </div>
    </StepWrapper>
  );
}
