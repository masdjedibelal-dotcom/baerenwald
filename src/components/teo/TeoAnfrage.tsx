"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { submitTeoAnfrageAction } from "@/app/actions/submit-teo-anfrage";
import { DatenschutzCheckbox } from "@/components/funnel/DatenschutzCheckbox";
import { FunnelHeader } from "@/components/funnel/FunnelHeader";
import { PhotoUpload } from "@/components/funnel/PhotoUpload";
import { StepWrapper } from "@/components/funnel/StepWrapper";
import { ladeAnfrageFotosHoch, neueFotoSitzung } from "@/lib/funnel/fotos-hochladen";
import {
  TEO_ANGEBOTE_ANZAHL,
  TEO_DRINGLICHKEIT,
  TEO_FAELLE,
  TEO_LEISTUNGEN,
  TEO_MASSNAHMEN,
  TEO_SCHADEN_ARTEN,
  TEO_SCHADEN_ORT,
  TEO_START,
  type TeoAnfrageDaten,
} from "@/lib/funnel/teo-anfrage";
import { cn } from "@/lib/utils";

import "@/app/baerenwald-landing.css";

const DETAIL_FRAGE: Record<string, string> = {
  schaden: "Was ist passiert?",
  massnahme: "Was soll gemacht werden?",
  betrieb: "Welche Leistungen?",
  kennenlernen: "Ihre Objekte",
};

function Kacheln({
  optionen,
  gewaehlt,
  onWahl,
  mehrfach = true,
}: {
  optionen: readonly { id: string; label: string }[];
  gewaehlt: string[];
  onWahl: (ids: string[]) => void;
  mehrfach?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {optionen.map((o) => {
        const aktiv = gewaehlt.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            className={cn("funnel-tile funnel-tile--text-only", aktiv && "selected")}
            onClick={() => onWahl(mehrfach ? (aktiv ? gewaehlt.filter((x) => x !== o.id) : [...gewaehlt, o.id]) : aktiv ? [] : [o.id])}
          >
            <span className="funnel-tile-label">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Wahl({ optionen, wert, onWahl }: { optionen: readonly string[]; wert: string; onWahl: (v: string) => void }) {
  return (
    <div className="anfrage-wahl">
      {optionen.map((o) => (
        <button key={o} type="button" className={cn("anfrage-wahl__opt", wert === o && "selected")} onClick={() => onWahl(wert === o ? "" : o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

function Feld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="anfrage-feld">
      <span className="anfrage-feld__label">{label}</span>
      {children}
    </label>
  );
}

/** Servus TEO: Anfrage für Hausverwaltungen und WEGs — Fall → Details → Objekt → Kontakt, ohne Preise. */
export function TeoAnfrage() {
  const router = useRouter();
  const [schritt, setSchritt] = useState(0);
  const [d, setD] = useState<TeoAnfrageDaten>(() => ({
    fall: "",
    absender: "hausverwaltung",
    schadenArten: [],
    schadenOrt: "",
    einheit: "",
    dringlichkeit: "",
    kontaktVorOrt: "",
    massnahmen: [],
    frist: "",
    angebote: "",
    einheiten: "",
    baujahr: "",
    leistungen: [],
    treppenhaeuser: "",
    start: "",
    objekteAnzahl: "",
    einheitenGesamt: "",
    strasse: "",
    plz: "",
    ort: "",
    beschreibung: "",
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
  const set = <K extends keyof TeoAnfrageDaten>(k: K, v: TeoAnfrageDaten[K]) => setD((p) => ({ ...p, [k]: v }));
  const kennenlernen = d.fall === "kennenlernen";

  function pruefe(i: number): string | null {
    if (i === 0 && !d.fall) return "Bitte wählen Sie aus, worum es geht.";
    if (i === 1) {
      if (d.fall === "schaden" && !d.schadenArten.length) return "Bitte wählen Sie aus, was betroffen ist.";
      if (d.fall === "schaden" && !d.dringlichkeit) return "Bitte wählen Sie, wie dringend es ist.";
      if (d.fall === "massnahme" && !d.massnahmen.length) return "Bitte wählen Sie mindestens eine Maßnahme.";
      if (d.fall === "betrieb" && !d.leistungen.length) return "Bitte wählen Sie mindestens eine Leistung.";
    }
    if (i === 2) {
      if (!kennenlernen && !/^\d{5}$/.test(d.plz.trim())) return "Bitte geben Sie die PLZ des Objekts an.";
      if ((d.fall === "schaden" || d.fall === "massnahme") && d.beschreibung.trim().length < 10) return "Bitte beschreiben Sie es kurz.";
    }
    if (i === 3) {
      if (d.name.trim().length < 2) return "Bitte geben Sie Ihren Namen an.";
      if (!d.email.trim() && !d.telefon.trim()) return "Bitte geben Sie eine E-Mail-Adresse oder Telefonnummer an.";
      if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) return "Bitte geben Sie eine gültige E-Mail-Adresse an.";
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
    if (schritt === 0) return router.push("/");
    setSchritt((s) => s - 1);
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
      const { urls } = await ladeAnfrageFotosHoch(dateien, d.sitzung);
      const res = await submitTeoAnfrageAction({ ...d, fotos: urls });
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

  const fragen = ["Worum geht es?", DETAIL_FRAGE[d.fall] ?? "Details", kennenlernen ? "Noch etwas?" : "Wo ist das Objekt?", "Wie erreichen wir Sie?"];

  return (
    <div className="min-h-dvh funnel-main--strip-a">
      <FunnelHeader onFunnelReset={() => router.push("/")} />
      <main className="funnel-rechner-main w-full">
        {status === "done" ? (
          <StepWrapper stepLabel="Anfrage" question="Danke, Ihre Anfrage ist da." animateKey="teo-danke" tilesCard>
            <div className="individuell-danke">
              <p className="individuell-danke__text">
                {d.fall === "schaden" && d.dringlichkeit === "notfall" ? "Wir melden uns so schnell wie möglich." : "Wir melden uns am nächsten Werktag."}
              </p>
            </div>
          </StepWrapper>
        ) : (
          <StepWrapper stepLabel={`Schritt ${schritt + 1} von 4`} question={fragen[schritt]!} animateKey={`teo-${schritt}-${d.fall}`} tilesCard>
            <div className="individuell-form space-y-3">
              {schritt === 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {TEO_FAELLE.map((f) => (
                    <button key={f.id} type="button" className={cn("funnel-tile", d.fall === f.id && "selected")} onClick={() => set("fall", f.id)}>
                      <span className="funnel-tile-label">{f.label}</span>
                      <span className="funnel-tile-hint">{f.hint}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {schritt === 1 && d.fall === "schaden" ? (
                <>
                  <Kacheln optionen={TEO_SCHADEN_ARTEN} gewaehlt={d.schadenArten} onWahl={(v) => set("schadenArten", v)} />
                  <div className="anfrage-feld">
                    <span className="anfrage-feld__label">Wie dringend?</span>
                    <Wahl
                      optionen={TEO_DRINGLICHKEIT.map((x) => x.label)}
                      wert={TEO_DRINGLICHKEIT.find((x) => x.id === d.dringlichkeit)?.label ?? ""}
                      onWahl={(v) => set("dringlichkeit", TEO_DRINGLICHKEIT.find((x) => x.label === v)?.id ?? "")}
                    />
                  </div>
                  <div className="anfrage-feld">
                    <span className="anfrage-feld__label">Wo?</span>
                    <Wahl
                      optionen={TEO_SCHADEN_ORT.map((x) => x.label)}
                      wert={TEO_SCHADEN_ORT.find((x) => x.id === d.schadenOrt)?.label ?? ""}
                      onWahl={(v) => set("schadenOrt", TEO_SCHADEN_ORT.find((x) => x.label === v)?.id ?? "")}
                    />
                  </div>
                  {d.schadenOrt === "wohnung" ? (
                    <Feld label="Wohnung">
                      <input className="funnel-input" placeholder="z. B. WE 7, 2. OG links" value={d.einheit} onChange={(e) => set("einheit", e.target.value)} />
                    </Feld>
                  ) : null}
                  <Feld label="Kontakt vor Ort (optional)">
                    <input className="funnel-input" placeholder="Name und Telefon" value={d.kontaktVorOrt} onChange={(e) => set("kontaktVorOrt", e.target.value)} />
                  </Feld>
                </>
              ) : null}

              {schritt === 1 && d.fall === "massnahme" ? (
                <>
                  <Kacheln optionen={TEO_MASSNAHMEN} gewaehlt={d.massnahmen} onWahl={(v) => set("massnahmen", v)} />
                  <Feld label="Angebot benötigt bis (z. B. Eigentümerversammlung)">
                    <input type="date" className="funnel-input" value={d.frist} onChange={(e) => set("frist", e.target.value)} />
                  </Feld>
                  <div className="anfrage-feld">
                    <span className="anfrage-feld__label">Wie viele Angebote?</span>
                    <Wahl optionen={TEO_ANGEBOTE_ANZAHL} wert={d.angebote} onWahl={(v) => set("angebote", v)} />
                  </div>
                  <div className="anfrage-zeile">
                    <Feld label="Einheiten">
                      <input className="funnel-input" inputMode="numeric" value={d.einheiten} onChange={(e) => set("einheiten", e.target.value.replace(/\D/g, ""))} />
                    </Feld>
                    <Feld label="Baujahr">
                      <input className="funnel-input" inputMode="numeric" maxLength={4} value={d.baujahr} onChange={(e) => set("baujahr", e.target.value.replace(/\D/g, ""))} />
                    </Feld>
                  </div>
                </>
              ) : null}

              {schritt === 1 && d.fall === "betrieb" ? (
                <>
                  <Kacheln optionen={TEO_LEISTUNGEN} gewaehlt={d.leistungen} onWahl={(v) => set("leistungen", v)} />
                  <div className="anfrage-zeile">
                    <Feld label="Einheiten">
                      <input className="funnel-input" inputMode="numeric" value={d.einheiten} onChange={(e) => set("einheiten", e.target.value.replace(/\D/g, ""))} />
                    </Feld>
                    <Feld label="Treppenhäuser">
                      <input className="funnel-input" inputMode="numeric" value={d.treppenhaeuser} onChange={(e) => set("treppenhaeuser", e.target.value.replace(/\D/g, ""))} />
                    </Feld>
                  </div>
                  <div className="anfrage-feld">
                    <span className="anfrage-feld__label">Ab wann?</span>
                    <Wahl optionen={TEO_START} wert={d.start} onWahl={(v) => set("start", v)} />
                  </div>
                </>
              ) : null}

              {schritt === 1 && kennenlernen ? (
                <div className="anfrage-zeile">
                  <Feld label="Anzahl Objekte">
                    <input className="funnel-input" inputMode="numeric" value={d.objekteAnzahl} onChange={(e) => set("objekteAnzahl", e.target.value.replace(/\D/g, ""))} />
                  </Feld>
                  <Feld label="Einheiten gesamt">
                    <input className="funnel-input" inputMode="numeric" value={d.einheitenGesamt} onChange={(e) => set("einheitenGesamt", e.target.value.replace(/\D/g, ""))} />
                  </Feld>
                </div>
              ) : null}

              {schritt === 2 ? (
                <>
                  {!kennenlernen ? (
                    <>
                      <Feld label="Straße und Hausnummer">
                        <input className="funnel-input" autoComplete="street-address" value={d.strasse} onChange={(e) => set("strasse", e.target.value)} />
                      </Feld>
                      <div className="anfrage-zeile">
                        <label className="anfrage-feld anfrage-feld--plz">
                          <span className="anfrage-feld__label">PLZ *</span>
                          <input className="funnel-input" inputMode="numeric" maxLength={5} value={d.plz} onChange={(e) => set("plz", e.target.value.replace(/\D/g, ""))} />
                        </label>
                        <Feld label="Ort">
                          <input className="funnel-input" value={d.ort} onChange={(e) => set("ort", e.target.value)} />
                        </Feld>
                      </div>
                    </>
                  ) : null}
                  <Feld label={d.fall === "schaden" || d.fall === "massnahme" ? "Beschreibung *" : "Beschreibung (optional)"}>
                    <textarea
                      className="funnel-textarea"
                      rows={5}
                      maxLength={2000}
                      placeholder={
                        d.fall === "schaden"
                          ? "z. B. Wasser tropft im Keller von der Decke"
                          : d.fall === "massnahme"
                            ? "z. B. Fassade Nordseite, Risse und abplatzender Putz"
                            : kennenlernen
                              ? "Was kostet Sie heute am meisten Zeit?"
                              : ""
                      }
                      value={d.beschreibung}
                      onChange={(e) => set("beschreibung", e.target.value)}
                    />
                  </Feld>
                  {!kennenlernen ? (
                    <PhotoUpload files={dateien} onChange={setDateien} maxFiles={5} buttonTitle="Fotos (optional)" buttonHint="Bis zu 5 Fotos, je max. 8 MB." />
                  ) : null}
                </>
              ) : null}

              {schritt === 3 ? (
                <>
                  <div className="anfrage-wahl">
                    {(
                      [
                        ["hausverwaltung", "Hausverwaltung"],
                        ["weg", "WEG (selbstverwaltet)"],
                      ] as const
                    ).map(([id, l]) => (
                      <button key={id} type="button" className={cn("anfrage-wahl__opt", d.absender === id && "selected")} onClick={() => set("absender", id)}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <Feld label={d.absender === "weg" ? "Name der WEG" : "Hausverwaltung"}>
                    <input className="funnel-input" autoComplete="organization" value={d.firma} onChange={(e) => set("firma", e.target.value)} />
                  </Feld>
                  <Feld label="Ihr Name *">
                    <input className="funnel-input" autoComplete="name" value={d.name} onChange={(e) => set("name", e.target.value)} />
                  </Feld>
                  <Feld label="E-Mail-Adresse">
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
                  </Feld>
                  <Feld label="Telefonnummer">
                    <input type="tel" className="funnel-input" autoComplete="tel" inputMode="tel" value={d.telefon} onChange={(e) => set("telefon", e.target.value)} />
                  </Feld>
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
                  ← Zurück
                </button>
                {schritt < 3 ? (
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
        )}
      </main>
    </div>
  );
}
