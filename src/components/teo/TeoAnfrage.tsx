"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AppWindow,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building,
  Building2,
  CalendarCheck,
  Check,
  CircleCheck,
  ClipboardList,
  Droplets,
  Ellipsis,
  Flame,
  House,
  Layers,
  type LucideIcon,
  PaintRoller,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Trash2,
  Trees,
  TriangleAlert,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";

import { submitTeoAnfrageAction } from "@/app/actions/submit-teo-anfrage";
import { DatenschutzCheckbox } from "@/components/funnel/DatenschutzCheckbox";
import { PhotoUpload } from "@/components/funnel/PhotoUpload";
import { TeoLogo } from "@/components/teo/TeoRahmen";
import { TEO_USPS } from "@/components/teo/teo-usps";
import { ladeAnfrageFotosHoch, neueFotoSitzung } from "@/lib/funnel/fotos-hochladen";
import {
  TEO_ABSENDER,
  TEO_DRINGLICHKEIT,
  TEO_FAELLE,
  TEO_LEISTUNGEN,
  TEO_MASSNAHMEN,
  TEO_SCHADEN_ARTEN,
  TEO_SCHADEN_ORT,
  TEO_SITUATIONEN,
  TEO_START,
  type TeoSituation,
  type TeoAnfrageDaten,
} from "@/lib/funnel/teo-anfrage";
import { MELDE_BEREICH_ICON } from "@/lib/org/melde-bereich-icons";
import { cn } from "@/lib/utils";

import "@/app/baerenwald-landing.css";
import "@/app/teo-landing.css";
import "@/app/teo-anfrage.css";

type Kachel = { id: string; label: string; hint?: string };

const ICON_FALL: Record<string, LucideIcon> = {
  schaden: TriangleAlert,
  massnahme: ClipboardList,
  betrieb: CalendarCheck,
  kennenlernen: Building2,
};
const ICON_MASSNAHME: Record<string, LucideIcon> = {
  dach: House,
  fassade: Building,
  fenster: AppWindow,
  treppenhaus: PaintRoller,
  heizung: Flame,
  leitungen: Droplets,
  elektro: Zap,
  balkone: Layers,
  aussen: Trees,
  sonstiges: Ellipsis,
};
const ICON_LEISTUNG: Record<string, LucideIcon> = {
  hausmeister: Wrench,
  reinigung: Sparkles,
  winter: Snowflake,
  garten: Trees,
  wartung: ShieldCheck,
  muell: Trash2,
};
const ICON_ABSENDER: Record<string, LucideIcon> = {
  hausverwaltung: Briefcase,
  weg: Users,
  bestandshalter: Building2,
};

const DETAIL_FRAGE: Record<string, string> = {
  schaden: "Was ist passiert?",
  massnahme: "Was soll gemacht werden?",
  betrieb: "Welche Leistungen brauchen Sie?",
  kennenlernen: "Wie viele Häuser sind es?",
};

/** Auswahl als Kacheln mit Icon — einfach (Radio) oder mehrfach (Checkbox). */
function Kacheln({
  optionen,
  icons,
  gewaehlt,
  onWahl,
  mehrfach = true,
  breit = false,
}: {
  optionen: readonly Kachel[];
  icons: Record<string, LucideIcon>;
  gewaehlt: string[];
  onWahl: (ids: string[]) => void;
  mehrfach?: boolean;
  breit?: boolean;
}) {
  return (
    <div className={cn("ta-kacheln", breit && "ta-kacheln--breit")} role={mehrfach ? "group" : "radiogroup"}>
      {optionen.map((o) => {
        const aktiv = gewaehlt.includes(o.id);
        const Icon = icons[o.id] ?? Ellipsis;
        return (
          <button
            key={o.id}
            type="button"
            role={mehrfach ? "checkbox" : "radio"}
            aria-checked={aktiv}
            className={cn("ta-kachel", aktiv && "ist-gewaehlt")}
            onClick={() => onWahl(mehrfach ? (aktiv ? gewaehlt.filter((x) => x !== o.id) : [...gewaehlt, o.id]) : [o.id])}
          >
            <span className="ta-kachel__icon">
              <Icon size={22} strokeWidth={1.6} />
            </span>
            <span className="ta-kachel__text">
              <b>{o.label}</b>
              {o.hint ? <small>{o.hint}</small> : null}
            </span>
            <span className="ta-kachel__haken" aria-hidden="true">
              <Check size={14} strokeWidth={3} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Pillen({ optionen, wert, onWahl }: { optionen: readonly string[]; wert: string; onWahl: (v: string) => void }) {
  return (
    <div className="ta-pillen" role="radiogroup">
      {optionen.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={wert === o}
          className={cn("ta-pille", wert === o && "ist-gewaehlt")}
          onClick={() => onWahl(wert === o ? "" : o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Feld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="ta-feld">
      <span className="ta-feld__label">{label}</span>
      {children}
    </label>
  );
}

function Gruppe({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ta-feld">
      <span className="ta-feld__label">{label}</span>
      {children}
    </div>
  );
}

/** Servus TEO: Anfrage für Verwaltungen und Bestandshalter — Fall → Details → Objekt → Kontakt, ohne Preise. */
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
  const [vorwahl, setVorwahl] = useState<TeoSituation | null>(null);
  const [bereit, setBereit] = useState(false);

  // Einstieg von der Startseite (?s=heizung …): Fall und Auswahl vorbelegen, direkt zu Schritt 2
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("s");
    const sit = TEO_SITUATIONEN.find((x) => x.id === id);
    if (sit) {
      setD((p) => ({ ...p, fall: sit.fall, schadenArten: sit.schadenArten ?? [], leistungen: sit.leistungen ?? [] }));
      setVorwahl(sit);
      setSchritt(1);
    }
    setBereit(true);
  }, []);

  function vorwahlAendern() {
    setVorwahl(null);
    setFehler(null);
    setSchritt(0);
    window.history.replaceState(null, "", window.location.pathname);
  }
  const set = <K extends keyof TeoAnfrageDaten>(k: K, v: TeoAnfrageDaten[K]) => setD((p) => ({ ...p, [k]: v }));
  const kennenlernen = d.fall === "kennenlernen";
  const notfall = d.fall === "schaden" && d.dringlichkeit === "notfall";
  const absender = TEO_ABSENDER.find((a) => a.id === d.absender) ?? TEO_ABSENDER[0]!;

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
      if (notfall && !d.telefon.trim()) return "Bitte geben Sie für einen Notfall eine Telefonnummer an.";
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
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
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
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    } catch (e) {
      setStatus("idle");
      setFehler(e instanceof Error ? e.message : "Bitte versuchen Sie es erneut.");
    }
  }

  const fragen = ["Worum geht es?", DETAIL_FRAGE[d.fall] ?? "Details", kennenlernen ? "Noch etwas?" : "Wo ist das Objekt?", "Wer fragt an?"];

  return (
    <div className="teo-site ta">
      <div className="ta-grund" aria-hidden="true" />

      <header className="ta-kopf">
        <Link href="/" className="ta-kopf__marke" aria-label="Zur Startseite">
          <TeoLogo />
        </Link>
        {status !== "done" ? <span className="ta-kopf__schritt">{schritt + 1} von 4</span> : null}
        <Link href="/" className="ta-rund" aria-label="Anfrage schließen">
          <X size={18} />
        </Link>
      </header>
      {status !== "done" ? (
        <div className="ta-fortschritt" aria-hidden="true">
          <span className="ta-fortschritt__spur">
            <span style={{ width: `${((schritt + 1) / 4) * 100}%` }} />
          </span>
        </div>
      ) : null}

      <main className={`ta-main ${bereit ? "" : "ta-main--wartet"}`}>
        <aside className="ta-seite">
          <h2>
            <span>Anfrage stellen.</span> <span className="ta-blau">Wir kümmern uns um den Rest.</span>
          </h2>
          <ul>
            {TEO_USPS.map((u) => (
              <li key={u.text}>
                <span className="ta-seite__icon">
                  <u.icon size={18} strokeWidth={1.8} />
                </span>
                {u.text}
              </li>
            ))}
          </ul>
        </aside>
        {status === "done" ? (
          <div className="ta-karte ta-danke">
            <span className="ta-danke__icon">
              <CircleCheck size={36} strokeWidth={1.6} />
            </span>
            <h1>Danke, Ihre Anfrage ist da.</h1>
            <p>{notfall ? "Wir rufen Sie so schnell wie möglich zurück." : "Wir melden uns am nächsten Werktag."}</p>
            <Link href="/" className="teo-btn">
              Zur Startseite
            </Link>
          </div>
        ) : (
          <div className="ta-karte" key={schritt}>
            {vorwahl && schritt > 0 ? (
              <p className="ta-vorwahl">
                <span>{vorwahl.label}</span>
                <button type="button" onClick={vorwahlAendern}>
                  ändern
                </button>
              </p>
            ) : null}
            <h1>{fragen[schritt]}</h1>

            {schritt === 0 ? (
              <Kacheln
                optionen={TEO_FAELLE}
                icons={ICON_FALL}
                gewaehlt={d.fall ? [d.fall] : []}
                mehrfach={false}
                breit
                onWahl={([v]) => v && set("fall", v as TeoAnfrageDaten["fall"])}
              />
            ) : null}

            {schritt === 1 && d.fall === "schaden" ? (
              <>
                <Kacheln optionen={TEO_SCHADEN_ARTEN} icons={MELDE_BEREICH_ICON} gewaehlt={d.schadenArten} onWahl={(v) => set("schadenArten", v)} />
                <Gruppe label="Wie dringend?">
                  <Pillen
                    optionen={TEO_DRINGLICHKEIT.map((x) => x.label)}
                    wert={TEO_DRINGLICHKEIT.find((x) => x.id === d.dringlichkeit)?.label ?? ""}
                    onWahl={(v) => set("dringlichkeit", TEO_DRINGLICHKEIT.find((x) => x.label === v)?.id ?? "")}
                  />
                </Gruppe>
                {notfall ? <p className="ta-hinweis">Wir rufen Sie zurück. Bitte geben Sie am Ende Ihre Telefonnummer an.</p> : null}
                <Gruppe label="Wo?">
                  <Pillen
                    optionen={TEO_SCHADEN_ORT.map((x) => x.label)}
                    wert={TEO_SCHADEN_ORT.find((x) => x.id === d.schadenOrt)?.label ?? ""}
                    onWahl={(v) => set("schadenOrt", TEO_SCHADEN_ORT.find((x) => x.label === v)?.id ?? "")}
                  />
                </Gruppe>
                {d.schadenOrt === "wohnung" ? (
                  <Feld label="Wohnung oder Einheit">
                    <input className="ta-input" placeholder="z. B. WE 7, 2. OG links" value={d.einheit} onChange={(e) => set("einheit", e.target.value)} />
                  </Feld>
                ) : null}
                <Feld label="Wer öffnet vor Ort? (optional)">
                  <input className="ta-input" placeholder="Name und Telefon" value={d.kontaktVorOrt} onChange={(e) => set("kontaktVorOrt", e.target.value)} />
                </Feld>
              </>
            ) : null}

            {schritt === 1 && d.fall === "massnahme" ? (
              <>
                <Kacheln optionen={TEO_MASSNAHMEN} icons={ICON_MASSNAHME} gewaehlt={d.massnahmen} onWahl={(v) => set("massnahmen", v)} />
                <Feld label="Angebot gebraucht bis (optional)">
                  <input type="date" className="ta-input" value={d.frist} onChange={(e) => set("frist", e.target.value)} />
                </Feld>
                <div className="ta-zeile">
                  <Feld label="Einheiten">
                    <input className="ta-input" inputMode="numeric" value={d.einheiten} onChange={(e) => set("einheiten", e.target.value.replace(/\D/g, ""))} />
                  </Feld>
                  <Feld label="Baujahr">
                    <input className="ta-input" inputMode="numeric" maxLength={4} value={d.baujahr} onChange={(e) => set("baujahr", e.target.value.replace(/\D/g, ""))} />
                  </Feld>
                </div>
              </>
            ) : null}

            {schritt === 1 && d.fall === "betrieb" ? (
              <>
                <Kacheln optionen={TEO_LEISTUNGEN} icons={ICON_LEISTUNG} gewaehlt={d.leistungen} onWahl={(v) => set("leistungen", v)} />
                <div className="ta-zeile">
                  <Feld label="Einheiten">
                    <input className="ta-input" inputMode="numeric" value={d.einheiten} onChange={(e) => set("einheiten", e.target.value.replace(/\D/g, ""))} />
                  </Feld>
                  <Feld label="Treppenhäuser">
                    <input className="ta-input" inputMode="numeric" value={d.treppenhaeuser} onChange={(e) => set("treppenhaeuser", e.target.value.replace(/\D/g, ""))} />
                  </Feld>
                </div>
                <Gruppe label="Ab wann?">
                  <Pillen optionen={TEO_START} wert={d.start} onWahl={(v) => set("start", v)} />
                </Gruppe>
              </>
            ) : null}

            {schritt === 1 && kennenlernen ? (
              <div className="ta-zeile">
                <Feld label="Häuser">
                  <input className="ta-input" inputMode="numeric" value={d.objekteAnzahl} onChange={(e) => set("objekteAnzahl", e.target.value.replace(/\D/g, ""))} />
                </Feld>
                <Feld label="Einheiten gesamt">
                  <input className="ta-input" inputMode="numeric" value={d.einheitenGesamt} onChange={(e) => set("einheitenGesamt", e.target.value.replace(/\D/g, ""))} />
                </Feld>
              </div>
            ) : null}

            {schritt === 2 ? (
              <>
                {!kennenlernen ? (
                  <>
                    <Feld label="Straße und Hausnummer">
                      <input className="ta-input" autoComplete="street-address" value={d.strasse} onChange={(e) => set("strasse", e.target.value)} />
                    </Feld>
                    <div className="ta-zeile ta-zeile--plz">
                      <Feld label="PLZ *">
                        <input className="ta-input" inputMode="numeric" maxLength={5} value={d.plz} onChange={(e) => set("plz", e.target.value.replace(/\D/g, ""))} />
                      </Feld>
                      <Feld label="Ort">
                        <input className="ta-input" value={d.ort} onChange={(e) => set("ort", e.target.value)} />
                      </Feld>
                    </div>
                  </>
                ) : null}
                <Feld label={d.fall === "schaden" || d.fall === "massnahme" ? "Beschreibung *" : "Beschreibung (optional)"}>
                  <textarea
                    className="ta-input ta-textarea"
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
                <Kacheln
                  optionen={TEO_ABSENDER}
                  icons={ICON_ABSENDER}
                  gewaehlt={[d.absender]}
                  mehrfach={false}
                  breit
                  onWahl={([v]) => v && set("absender", v as TeoAnfrageDaten["absender"])}
                />
                <Feld label={absender.feld}>
                  <input className="ta-input" autoComplete="organization" value={d.firma} onChange={(e) => set("firma", e.target.value)} />
                </Feld>
                <Feld label="Ihr Name *">
                  <input className="ta-input" autoComplete="name" value={d.name} onChange={(e) => set("name", e.target.value)} />
                </Feld>
                <div className="ta-zeile">
                  <Feld label="E-Mail-Adresse">
                    <input
                      type="email"
                      className="ta-input"
                      autoComplete="email"
                      inputMode="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      value={d.email}
                      onChange={(e) => set("email", e.target.value)}
                    />
                  </Feld>
                  <Feld label={notfall ? "Telefonnummer *" : "Telefonnummer"}>
                    <input type="tel" className="ta-input" autoComplete="tel" inputMode="tel" value={d.telefon} onChange={(e) => set("telefon", e.target.value)} />
                  </Feld>
                </div>
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

            {fehler ? <p className="ta-fehler">{fehler}</p> : null}
          </div>
        )}
      </main>

      {status !== "done" ? (
        <div className="ta-leiste">
          <div className="ta-leiste__innen">
            <span className="ta-leiste__platz" aria-hidden="true" />
            <div className="ta-leiste__knoepfe">
              <button type="button" className="ta-zurueck" onClick={zurueck}>
                <ArrowLeft size={18} />
                <span>Zurück</span>
              </button>
              {schritt < 3 ? (
                <button type="button" className="teo-btn ta-weiter" onClick={weiter}>
                  Weiter
                  <ArrowRight size={18} />
                </button>
              ) : (
                <button type="button" className="teo-btn ta-weiter" disabled={status === "loading"} onClick={() => void absenden()}>
                  {status === "loading" ? "Wird gesendet…" : "Anfrage senden"}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
