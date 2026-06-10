"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { BaerenwaldVisionInner } from "@/components/home/BaerenwaldVisionInner";
import { HowTimelineMotion } from "@/components/home/HowTimelineMotion";
import { KiBeratungLandingSection } from "@/components/home/KiBeratungLandingSection";
import {
  ProjektGalerie,
  type BaerenwaldProjekt,
} from "@/components/home/ProjektGalerie";
import {
  TestimonialsMarquee,
  type MarqueeTestimonial,
} from "@/components/home/TestimonialsMarquee";
import { SectionDivider } from "@/components/landing/SectionDividers";
import { VermittlungSection } from "@/components/home/VermittlungSection";
import { WarumBaerenwaldScrollSection } from "@/components/landing/WarumBaerenwaldScrollSection";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { BwIcon } from "@/components/ui/BwIcon";
import { WaveUnderline } from "@/components/ui/WaveUnderline";
import {
  LANDING_ICON_HERO_KI,
  LANDING_ICON_HERO_PREIS,
} from "@/lib/landing-icons";
import { SITE_CONFIG } from "@/lib/config";
import { RECHNER_KI_BERATUNG_HREF } from "@/lib/rechner-links";
import { HOME_FAQ_ITEMS } from "@/lib/home-content";
import { capturePostHogEvent } from "@/lib/consent/posthog-client";

const TESTIMONIALS = [
  {
    name: "Familie K.",
    rolle: "Schwabing, München",
    initials: "FK",
    color: "green" as const,
    quote:
      "Transparente Preisspanne, pünktlicher Handwerker — genau das was wir gesucht haben. Kein Stress mit verschiedenen Betrieben.",
  },
  {
    name: "Lena M.",
    rolle: "Maxvorstadt, München",
    initials: "LM",
    color: "teal" as const,
    quote:
      "Ich hätte nie gedacht dass Bad-Renovierung so reibungslos läuft. Fliesen, Sanitär, Elektro — ich hatte einen Ansprechpartner für alles. Kein einziger Anruf den ich selbst koordinieren musste.",
  },
  {
    name: "Thomas R.",
    rolle: "Grünwald",
    initials: "TR",
    color: "amber" as const,
    quote:
      "Unverbindliche Beratung, kein Druck. Das Angebot kam schnell und war klar. So wünscht man sich Handwerk.",
  },
  {
    name: "Sandra B.",
    rolle: "Bogenhausen, München",
    initials: "SB",
    color: "blue" as const,
    quote:
      "Heizung im Januar ausgefallen — zügig war jemand da. Sehr zuverlässig und freundlich.",
  },
  {
    name: "Markus H.",
    rolle: "Pasing, München",
    initials: "MH",
    color: "gray" as const,
    quote:
      "Gartenpflege seit zwei Jahren. Kommt immer pünktlich, macht saubere Arbeit. Kann ich nur empfehlen.",
  },
] satisfies readonly MarqueeTestimonial[];

/** Echte Bärenwald-Referenzprojekte (Bildpfade Platzhalter bis finale Assets). */
const PROJEKTE: readonly BaerenwaldProjekt[] = [
  {
    id: 1,
    bild: "/images/projekt-notdienst-kein-warmwasser.png",
    bilder: [
      "/images/projekt-notdienst-kein-warmwasser.png",
      "/images/projekt-notdienst-kein-warmwasser-2.png",
    ],
    bildAlt:
      "Technikraum München: Wilo Star Umwälzpumpe und isolierte Heizungsrohrleitungen nach Notdienst-Einsatz bei Warmwasserausfall",
    gewerk: "Notdienst / Kein Warmwasser",
    stadtteil: "München",
    jahr: "2026",
    tag: "notfall",
    problem:
      "Kompletter Ausfall der Warmwasserversorgung in einem Mehrfamilienhaus — hoher Zeitdruck und sofortiger Handlungsbedarf, da das gesamte Gebäude betroffen war.",
    loesung:
      "• Sofortige Vor-Ort-Analyse und technische Erstbewertung\n• Dokumentation und strukturierte Fehleraufnahme\n• Koordination eines zertifizierten Meisterbetriebs aus unserem Heizungs- und Sanitärnetzwerk\n• Austausch von Pumpe und Steuerung\n• Entlüftung, Neueinstellung und Wiederinbetriebnahme der Anlage\n• Zentrale Koordination aller beteiligten Gewerke und Abläufe",
    ergebnis:
      "Die Warmwasserversorgung wurde innerhalb von 2 Tagen vollständig wiederhergestellt — mit minimaler Ausfallzeit und nur einem zentralen Ansprechpartner für den Auftraggeber.",
    placeholderGradient: "linear-gradient(135deg, #1A3D2B, #2E7D52)",
    placeholderEmoji: "⚡",
  },
  {
    id: 2,
    bild: "/images/projekt-abriss-notdienst-2024.png",
    bilder: [
      "/images/projekt-abriss-notdienst-2024.png",
      "/images/projekt-abriss-notdienst-2024-2.png",
      "/images/projekt-abriss-notdienst-2024-3.png",
      "/images/projekt-abriss-notdienst-2024-4.png",
      "/images/projekt-abriss-notdienst-2024-5.png",
    ],
    bildAlt:
      "Gewerbeumbau in München: Abriss und Rohbau mit freigelegten Installationen, Baustellenkoordination und Elektriker am Verteiler",
    gewerk: "Abriss & Notdienst",
    stadtteil: "München",
    jahr: "2024",
    tag: "gewerbe",
    problem:
      "Kurz vor Weihnachten stand ein laufender Gewerbeumbau still: keine verfügbaren Fachbetriebe, blockierte Entsorgungs- und Containerlogistik sowie ausstehende Straßengenehmigungen. Der komplette Zeitplan war gefährdet und Folgegewerke konnten nicht starten.",
    loesung:
      "• Sofortiger Notdiensteinsatz und Übernahme der kompletten Baustellenkoordination\n• Aktivierung unseres Partnernetzwerks für kurzfristige Unterstützung\n• Organisation und Durchführung der Abbrucharbeiten\n• Koordination von Entsorgung, Containerlogistik und Baustellenabläufen\n• Sicherstellung der Stromversorgung für Abbruch und Baustellenbetrieb durch unseren Elektropartner-Meisterbetrieb\n• Laufende Abstimmung mit allen beteiligten Gewerken vor Ort",
    ergebnis:
      "Der komplette Abriss konnte trotz kritischer Ausgangslage fristgerecht umgesetzt werden. Entsorgung und Logistik wurden auch während des Engpasses organisiert, sodass die nachfolgenden Gewerke ohne Verzögerung weiterarbeiten konnten.\n\nUmsetzung durch eigene Teams und spezialisierte Meister- und Partnerbetriebe.",
    placeholderGradient: "linear-gradient(135deg, #2D2520, #5C4033)",
    placeholderEmoji: "🔨",
  },
  {
    id: 3,
    bild: "/images/projekt-gefahrenabwehr-baum-notfall.jpg",
    bilder: [
      "/images/projekt-gefahrenabwehr-baum-notfall.jpg",
      "/images/projekt-gefahrenabwehr-baum-notfall-2.jpg",
    ],
    bildAlt:
      "Gebrochener Baumast im Innenhof einer Wohnanlage als akutes Sicherheitsrisiko",
    gewerk: "Gefahrenabwehr Baum / Notfall",
    stadtteil: "Hausverwaltung · München",
    jahr: "2026",
    tag: "notfall",
    problem:
      "Großer Ast gebrochen, akute Gefahr für Bewohner und Passanten im Innenhof — sofortiger Handlungsbedarf.",
    loesung:
      "Eigene GaLaBau-Mannschaft in unter 2 Stunden disponiert, Vor-Ort-Gefährdungsanalyse durchgeführt und beschädigten Ast fachgerecht mit Sicherungstechnik zurückgeschnitten.",
    ergebnis:
      "Gefahrenquelle am selben Tag beseitigt, Sicherheit sofort wiederhergestellt und Schnittgut vollständig entsorgt inkl. Einsatzdokumentation und Rechnung am Einsatztag.",
    placeholderGradient: "linear-gradient(135deg, #1A2D3D, #2E5C7D)",
    placeholderEmoji: "🌳",
  },
  {
    id: 4,
    bild: "/images/projekt-dachterrasse-naturstein-2024.png",
    bilder: [
      "/images/projekt-dachterrasse-naturstein-2024.png",
      "/images/projekt-dachterrasse-naturstein-2024-2.png",
      "/images/projekt-dachterrasse-naturstein-2024-3.png",
      "/images/projekt-dachterrasse-naturstein-2024-4.png",
      "/images/projekt-dachterrasse-naturstein-2024-5.png",
      "/images/projekt-dachterrasse-naturstein-2024-6.png",
    ],
    bildAlt:
      "Dachterrasse München: fertig verlegter Naturstein, Spezialaufbau, Estrichpumpe und Schlauchführung bis in den 5. Stock, Montage und Statikerabstimmung",
    gewerk: "Dachterrasse / Sonderlösung Naturstein",
    stadtteil: "München",
    jahr: "2024",
    tag: "privat",
    problem:
      "Natursteinmaterial im Wert von ca. 25.000 € war bereits gekauft, die ursprünglich geplante Standardverlegung auf Dachterrasse und Stellplatz jedoch technisch und wirtschaftlich nicht umsetzbar. Zusätzlich handelte es sich um einen sehr schweren und empfindlichen Naturstein, der aufgrund seiner Bruchanfälligkeit nur mit einer speziellen Verlegetechnik verarbeitet werden konnte.",
    loesung:
      "• Technische Analyse der gesamten Dachterrassenkonstruktion inklusive Abstimmung zum zulässigen Aufbaugewicht\n• Entwicklung einer Sonderlösung gemeinsam mit einem spezialisierten Estrich- und Natursteinbetrieb\n• Organisation der Materialförderung per Estrichpumpe bis in den 5. Stock\n• Herstellung eines tragfähigen Spezialaufbaus unter Berücksichtigung der statischen Anforderungen\n• Verarbeitung des Natursteins mit aufwendiger Haftbrücken-Technik: gewaschener Sand wurde in die Haftbrücke eingearbeitet und zusätzlich beidseitig verarbeitet, um Stabilität und dauerhafte Verbindung sicherzustellen\n• Laufende Abstimmung anhand des Statikerberichts zur sicheren Lastverteilung auf der Dachterrasse\n• Koordination aller beteiligten Gewerke bis zur finalen Fertigstellung",
    ergebnis:
      "Der komplette Naturstein konnte trotz der schwierigen Rahmenbedingungen vollständig verbaut werden — ohne Materialverlust und ohne massive Zusatzkosten. Die technisch anspruchsvolle Dachterrasse wurde statisch sicher umgesetzt und erfolgreich abgeschlossen. Die finale Ausführung und Übergabe erfolgte auf sehr hohem Niveau im Bereich Garten- und Landschaftsbau.",
    placeholderGradient: "linear-gradient(135deg, #1A3D2B, #4A7D2E)",
    placeholderEmoji: "🌿",
  },
  {
    id: 5,
    bild: "/images/projekt-terrasse-steg-bogenhausen.png",
    bilder: [
      "/images/projekt-terrasse-steg-bogenhausen.png",
      "/images/projekt-terrasse-steg-bogenhausen-2.png",
      "/images/projekt-terrasse-steg-bogenhausen-3.png",
      "/images/projekt-terrasse-steg-bogenhausen-4.png",
    ],
    bildAlt:
      "Terrassen- und Steganlage Bogenhausen: Holzoberflächen mit biologischem Osmoholz-Öl behandelt, abgestimmt auf Naturpool und Gartenlandschaft",
    gewerk: "Terrassen- und Steganlage in München Bogenhausen",
    stadtteil: "Privat",
    jahr: "2026",
    tag: "privat",
    problem:
      "Die hochwertigen Holzflächen der bestehenden Terrassen- und Steganlage sollten dauerhaft geschützt und optisch aufgewertet werden. Gewünscht war eine natürliche und nachhaltige Oberflächenbehandlung ohne chemische Beschichtungen, passend zur hochwertigen Garten- und Naturpoolanlage.",
    loesung:
      "• Vorbereitung und Kontrolle der Holzoberflächen\n• Fachgerechte Reinigung der Terrassen- und Stegbereiche\n• Natürliche Behandlung mit biologischem Osmoholz-Öl\n• Gleichmäßige und sorgfältige Einarbeitung des Öls\n• Schutz und Pflege der Holzoberflächen für langfristige Werterhaltung\n• Abstimmung auf die bestehende Garten- und Poollandschaft",
    ergebnis:
      "Die Behandlung wurde vollständig durch das eigene Team von Bärenwald Garten- und Landschaftsbau ausgeführt. Durch die natürliche Ölbehandlung konnten die Holzoberflächen nachhaltig geschützt, optisch aufgewertet und optimal auf die Anforderungen im Außenbereich abgestimmt werden. Das Ergebnis fügt sich harmonisch in die hochwertige Garten- und Naturpoollandschaft ein und unterstützt den langfristigen Werterhalt der Anlage.\n\n✓ Ausgeführt durch eigenes Gewerk – Bärenwald Garten- und Landschaftsbau 🌿",
    placeholderGradient: "linear-gradient(135deg, #1B2E1F, #3D6B45)",
    placeholderEmoji: "🪵",
  },
  {
    id: 6,
    bild: "/images/projekt-gruenwald-villa-sanitaer-heizung.png",
    bilder: [
      "/images/projekt-gruenwald-villa-sanitaer-heizung.png",
      "/images/projekt-gruenwald-villa-sanitaer-heizung-2.png",
      "/images/projekt-gruenwald-villa-sanitaer-heizung-3.png",
      "/images/projekt-gruenwald-villa-sanitaer-heizung-4.png",
      "/images/projekt-gruenwald-villa-sanitaer-heizung-5.png",
    ],
    bildAlt:
      "Grünwald Villa: Wartung Heizung und Sanitär — Viessmann-Anlage, Smart-Home-Fußbodenheizung, BWT-Wasserenthärtung und Steuerungsprüfung im Technikraum",
    gewerk: "Grünwald Villa · Sanitärwartung & Heizungsservice",
    stadtteil: "Privat",
    jahr: "2026",
    tag: "privat",
    problem:
      "Koordination und Betreuung durch Bärenwald München gemeinsam mit einer Meister Sanitär Partnerfirma.\n\nDurchgeführt wurden umfangreiche Wartungs- und Kontrollarbeiten an der Sanitär- und Heizungsanlage:",
    loesung:
      "• Wartung der Fußbodenheizung und Heizkreisverteiler\n• Kontrolle der Heizkreispumpen und Temperaturregelung\n• Prüfung von Druck, Ventilen und Sicherheitsbauteilen\n• Überprüfung der Smart-Home-Heizungssteuerung\n• Wartung der Wasserenthärtungsanlage\n• Kontrolle und Instandsetzung von Sanitärarmaturen\n• Funktionsprüfung der gesamten Heizungs- und Sanitärtechnik\n• Fachgerechter Austausch einzelner Sanitärkomponenten",
    ergebnis:
      "Alle Arbeiten wurden professionell, sauber und zuverlässig durch die Meister Sanitär Partnerfirma umgesetzt. Die gesamte Anlage funktioniert wieder einwandfrei und wurde technisch geprüft übergeben.",
    placeholderGradient: "linear-gradient(135deg, #1A2838, #2E4A66)",
    placeholderEmoji: "🔧",
  },
  {
    id: 7,
    bild: "/images/projekt-kindergarten-sanitaer-notdienst.png",
    bilder: [
      "/images/projekt-kindergarten-sanitaer-notdienst.png",
      "/images/projekt-kindergarten-sanitaer-notdienst-2.png",
      "/images/projekt-kindergarten-sanitaer-notdienst-3.png",
    ],
    bildAlt:
      "Kindergarten: Sanitär-Notdienst an Unterputz-Duscharmatur mit Thermostat — Demontage, Kartuschenwechsel, Funktions- und Dichtheitsprüfung in der Dusche",
    gewerk: "Kindergarten Notdienst · Koordination durch Bärenwald",
    stadtteil: "München",
    jahr: "2026",
    tag: "notfall",
    problem:
      "Im Rahmen eines dringenden Sanitär-Notdienstes in einem Kindergarten wurde durch Bärenwald die komplette Koordination und Umsetzung organisiert.\n\nNach der Schadensaufnahme vor Ort haben wir umgehend einen spezialisierten Meisterbetrieb aus unserem Partnernetzwerk beauftragt und den gesamten Ablauf begleitet — von der Terminabstimmung bis zur erfolgreichen Fertigstellung.\n\nBei der Reparatur handelte es sich um eine spezielle Unterputz-Duscharmatur mit Thermostatregelung. Für den Ausbau der defekten Kartuschen war spezielles Werkzeug sowie ein besonderer Steckschlüssel notwendig, da das Innenventil nur mit Fachwerkzeug geöffnet werden konnte.",
    loesung:
      "Durchgeführt wurden unter anderem:\n\n• Absperren der Wasserzufuhr\n• Ausbau der defekten Thermostat-Kartuschen\n• Demontage und Zerlegung der Unterputz-Armatur\n• Einbau und Justierung neuer Kartuschen\n• Funktions- und Dichtheitsprüfung\n• Wiederinbetriebnahme der Duschanlage",
    ergebnis:
      "Dank der schnellen Koordination durch Bärenwald und der fachgerechten Umsetzung durch den Partner-Meisterbetrieb konnte der Sanitärbereich kurzfristig wieder sicher genutzt werden.\n\nDer Kindergartenbetrieb war dadurch schnell wieder abgesichert und einsatzbereit.\n\nKoordiniert durch Bärenwald München · Umsetzung durch spezialisierten Partner-Meisterbetrieb.",
    placeholderGradient: "linear-gradient(135deg, #1A3D2B, #2E6B8F)",
    placeholderEmoji: "🚿",
  },
  {
    id: 8,
    bild: "/images/projekt-badsanierung-ramersdorf-perlach.png",
    bilder: [
      "/images/projekt-badsanierung-ramersdorf-perlach.png",
      "/images/projekt-badsanierung-ramersdorf-perlach-2.png",
      "/images/projekt-badsanierung-ramersdorf-perlach-3.png",
      "/images/projekt-badsanierung-ramersdorf-perlach-4.png",
      "/images/projekt-badsanierung-ramersdorf-perlach-5.png",
      "/images/projekt-badsanierung-ramersdorf-perlach-6.png",
      "/images/projekt-badsanierung-ramersdorf-perlach-7.png",
      "/images/projekt-badsanierung-ramersdorf-perlach-8.png",
    ],
    bildAlt:
      "Komplette Badsanierung Ramersdorf-Perlach: Entkernung, Elektro-Unterverteilung, Feuchtraum, Fliesen, Geberit-Unterputz, Dusche und fertiges modernes Bad mit LED-Spots",
    gewerk: "Komplette Badsanierung in München Ramersdorf-Perlach",
    stadtteil: "Privat",
    jahr: "2026",
    tag: "privat",
    problem:
      "Die Umsetzung erfolgte durch eigene Teams sowie koordinierte Meisterbetriebe aus den Bereichen Sanitär, Heizung, Elektro, Trockenbau und Fliesenbau.\n\nDurch die enge Zusammenarbeit mit erfahrenen Partner-Meisterbetrieben konnte das Projekt fachgerecht, termingerecht und nach aktuellem technischen Standard umgesetzt werden.",
    loesung:
      "Leistungsumfang:\n\n• Komplette Entkernung und Rückbau\n• Neuinstallation Sanitär- und Abwasserleitungen\n• Elektro-Neuinstallation inklusive Unterverteilung\n• LED-Beleuchtung und Deckenspots\n• Geberit-Unterputzsysteme\n• Feuchtraum-Trockenbau und Abdichtung\n• Estrich- und Fliesenarbeiten\n• Montage von Dusche, WC, Waschtisch und Badmöbeln\n• Installation elektrischer Fußbodenheizung\n• Endmontage, Funktionsprüfung und Übergabe",
    ergebnis:
      "Alle Arbeiten wurden professionell koordiniert und durch eigene Fachkräfte sowie Partner-Meisterbetriebe umgesetzt. Das Ergebnis ist ein modernes, hochwertiges Badezimmer mit aktueller Sanitär- und Elektrotechnik.",
    placeholderGradient: "linear-gradient(135deg, #1A2D36, #2D5A6E)",
    placeholderEmoji: "🛁",
  },
  {
    id: 9,
    bild: "/images/projekt-hebeanlage-notdienst-ottobrunn.png",
    bilder: [
      "/images/projekt-hebeanlage-notdienst-ottobrunn.png",
      "/images/projekt-hebeanlage-notdienst-ottobrunn-2.png",
      "/images/projekt-hebeanlage-notdienst-ottobrunn-3.png",
    ],
    bildAlt:
      "Wohnanlage Ottobrunn: Zugang Technikraum, Hebeanlage mit Steigleitungen und Schaltschrank mit Pumpen-Handeinschaltung nach Notdienst-Koordination",
    gewerk: "Notdienst / Ausfall Hebeanlage",
    stadtteil: "Ottobrunn",
    jahr: "2026",
    tag: "verwaltung",
    problem:
      "Ausfall der Hebeanlage in einer Wohnanlage — akuter Handlungsbedarf zur Sicherstellung des laufenden Betriebs und zur Vermeidung weiterer Schäden.",
    loesung:
      "• Sofortige technische Aufnahme und Dokumentation vor Ort\n• Koordination mit der zuständigen Hausverwaltung\n• Organisation und Beauftragung eines spezialisierten Meisterpartnerbetriebs\n• Planung und Begleitung des Austauschs der Hebeanlage\n• Koordination der Umsetzung bis zur vollständigen Wiederinbetriebnahme",
    ergebnis:
      "Die neue Hebeanlage wurde kurzfristig umgesetzt, fachgerecht installiert und direkt wieder in Betrieb genommen — zentral koordiniert durch Bärenwald mit minimaler Ausfallzeit und nur einem Ansprechpartner für die Hausverwaltung.",
    placeholderGradient: "linear-gradient(135deg, #1A2D3D, #3D4D5C)",
    placeholderEmoji: "⚡",
  },
];

export default function BaerenwaldLandingClient({
  leistungenSection,
}: {
  leistungenSection?: ReactNode;
}) {
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    const root = document.querySelector(".baerenwald-landing");
    if (!root) return;
    const els = root.querySelectorAll(".fade-up");

    const markIfInView = (el: Element) => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 0;
      if (r.top < vh && r.bottom > 0) {
        el.classList.add("visible");
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px 0px 0px" }
    );

    els.forEach((el) => {
      markIfInView(el);
      io.observe(el);
    });

    const onResize = () => {
      els.forEach((el) => markIfInView(el));
    };
    window.addEventListener("resize", onResize, { passive: true });

    requestAnimationFrame(() => {
      els.forEach((el) => markIfInView(el));
    });

    return () => {
      window.removeEventListener("resize", onResize);
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    const nav = document.querySelector(".landing-nav");
    if (!nav) return;
    const onScroll = () => {
      if (window.scrollY > 20) nav.classList.add("landing-nav--scrolled");
      else nav.classList.remove("landing-nav--scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="baerenwald-landing">
      <header className="landing-nav">
        <Link href="/" className="logo">
          <Image
            src="/logo-mark-green.png"
            alt="Bärenwald München Logo"
            width={36}
            height={36}
            className="logo-img"
          />
          <span>Bärenwald</span>
        </Link>
        <nav className="nav-links" aria-label="Hauptnavigation">
          <a href="#how">Wie es funktioniert</a>
          <a href="#leistungen">Leistungen</a>
          <a href="#faq">FAQ</a>
          <a href="#kontakt">Kontakt</a>
        </nav>
        <Link href="/rechner" className="nav-cta">
          Angebot anfordern
        </Link>
        <button
          type="button"
          className="landing-nav-mobile-toggle"
          onClick={() => setMobileOpen(true)}
          aria-label="Menü öffnen"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
            <path
              d="M3 6h16M3 11h16M3 16h16"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      {mobileOpen ? (
        <div className="site-mobile-menu" role="dialog" aria-modal="true">
          <div className="site-mobile-menu-head">
            <Link href="/" className="logo" onClick={closeMobile}>
              <Image
                src="/logo-mark-green.png"
                alt="Bärenwald München"
                width={36}
                height={36}
                className="logo-img"
              />
              <span>Bärenwald</span>
            </Link>
            <button
              type="button"
              className="site-mobile-close"
              onClick={closeMobile}
              aria-label="Menü schließen"
            >
              ✕
            </button>
          </div>
          <nav className="site-mobile-links" aria-label="Hauptnavigation">
            <a href="#how" onClick={closeMobile}>
              Wie es funktioniert
            </a>
            <a href="#leistungen" onClick={closeMobile}>
              Leistungen
            </a>
            <a href="#faq" onClick={closeMobile}>
              FAQ
            </a>
            <a href="#kontakt" onClick={closeMobile}>
              Kontakt
            </a>
            <Link href="/ratgeber" onClick={closeMobile}>
              Ratgeber
            </Link>
            <Link href={RECHNER_KI_BERATUNG_HREF} onClick={closeMobile}>
              BärenwaldGPT
            </Link>
          </nav>
          <Link href="/rechner" className="site-mobile-cta" onClick={closeMobile}>
            Preisrahmen berechnen →
          </Link>
        </div>
      ) : null}

      <section className="hero-shell">
        <div className="hero-bg" aria-hidden>
          <div className="hero-bg-blob hero-bg-blob-1" />
          <div className="hero-bg-blob hero-bg-blob-2" />
          <div className="hero-bg-grid" />
          <div className="hero-bg-glow" />
        </div>

        <div className="hero-section">
          <div className="hero">
            <div>
              <p className="hero-eyebrow">Handwerker München</p>
              <h1 className="hero-h1-split">
                <span className="hero-h1-line--1 au">
                  Kein Vermittler.
                </span>
                <WaveUnderline
                  className="hero-h1-line--2 hero-h1-wave au d2"
                  tone="on-light"
                >
                  <em>Ein Ansprechpartner.</em>
                </WaveUnderline>
                <span className="hero-h1-line--3 au d3">Für alles.</span>
              </h1>
              <p className="hero-lead au d4">
                Von Reparatur bis Komplettprojekt.
                <br />
                Bärenwald bleibt von Anfang bis Ende dabei — Koordination,
                Handwerk und Umsetzung.
              </p>
              <div className="hero-entry fade-up d1">
                <div className="hero-entry-grid">
                  <Link
                    href="/rechner"
                    className="hero-entry-card hero-entry-card--preis"
                    onClick={() =>
                      capturePostHogEvent("hero_entry_preis_clicked", {
                        location: "hero",
                      })
                    }
                  >
                    <span className="hero-entry-icon" aria-hidden>
                      <BwIcon name={LANDING_ICON_HERO_PREIS} size={28} />
                    </span>
                    <span className="hero-entry-card-copy">
                      <span className="hero-entry-card-title">Preisrahmen ermitteln</span>
                      <span className="hero-entry-card-hint">
                        Schritt für Schritt — der schnelle Weg zum Preisrahmen.
                      </span>
                    </span>
                    <ArrowRight
                      className="hero-entry-arrow"
                      size={20}
                      strokeWidth={2.25}
                      aria-hidden
                    />
                  </Link>
                  <Link
                    href={RECHNER_KI_BERATUNG_HREF}
                    className="hero-entry-card hero-entry-card--ki"
                    onClick={() =>
                      capturePostHogEvent("landing_ki_beratung_cta_clicked", {
                        location: "hero",
                      })
                    }
                  >
                    <span
                      className="hero-entry-stoerer ki-rechner-mode-label"
                      aria-hidden
                    >
                      BärenwaldGPT
                    </span>
                    <span className="hero-entry-icon hero-entry-icon--ki" aria-hidden>
                      <BwIcon name={LANDING_ICON_HERO_KI} size={28} />
                    </span>
                    <span className="hero-entry-card-copy">
                      <span className="hero-entry-card-title">Frag einfach los</span>
                      <span className="hero-entry-card-hint">
                        Beraten, visualisieren, besprechen oder anfragen — wenn
                        du mehr willst als nur den Preis.
                      </span>
                    </span>
                    <ArrowRight
                      className="hero-entry-arrow hero-entry-arrow--ki"
                      size={20}
                      strokeWidth={2.25}
                      aria-hidden
                    />
                  </Link>
                </div>
              </div>
            </div>
            <div className="hero-visual fade-up d2">
              <div className="hero-float-wrap">
                <div className="hero-phones-clip">
                  <Image
                    src="/images/hero-handwerk-muenchen.png"
                    alt="Handwerker-Team bei der Koordination einer Renovierung in München — Bärenwald"
                    fill
                    className="hero-phones-img"
                    sizes="(max-width: 768px) min(92vw, 380px) 380px"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-bottom-round" aria-hidden />
      </section>

      <KiBeratungLandingSection />

      <SectionDivider variant="baum" from="#f7f6f3" to="#2E7D52" />

      <HowTimelineMotion />

      {leistungenSection}

      <SectionDivider variant="hugel" from="#f7f6f3" to="#1A3D2B" />

      <WarumBaerenwaldScrollSection />

      <section
        className="vision-section fade-up"
        aria-labelledby="vision-heading"
      >
        <div className="vision-section-inner">
          <BaerenwaldVisionInner />
        </div>
      </section>

      <SectionDivider variant="welle" from="#f7f6f3" to="#f7f6f3" />

      <section className="testimonials-section">
        <div className="inner testimonials-band">
          <h2 className="checks-section-headline fade-up">Kundenstimmen</h2>
          <p
            className="checks-section-tagline fade-up d1"
            style={{ marginBottom: "32px" }}
          >
            Echte Rückmeldungen aus München und Umgebung.
          </p>
          <TestimonialsMarquee testimonials={TESTIMONIALS} />
        </div>
      </section>

      <SectionDivider variant="welle" from="#f7f6f3" to="#f7f6f3" />

      <ProjektGalerie projekte={PROJEKTE} />

      <SectionDivider variant="baum" from="#f7f6f3" to="#2E7D52" />

      <section
        className="final-cta-section landing-final-cta"
        aria-labelledby="landing-final-cta-h2"
      >
        <div className="final-cta-inner">
          <h2 id="landing-final-cta-h2" className="final-cta-h2">
            Bereit für dein Projekt?
          </h2>
          <p className="final-cta-sub">
            Preisrahmen in wenigen Minuten — ein Ansprechpartner für die
            Umsetzung.
          </p>
          <div className="final-cta-btns">
            <Link
              href="/rechner"
              className="final-cta-btn-primary btn-primary"
            >
              Zum Preisrechner
            </Link>
            <a
              href={SITE_CONFIG.phoneHref}
              className="final-cta-btn-ghost"
              onClick={() =>
                capturePostHogEvent("cta_phone_clicked", { location: "final_cta" })
              }
            >
              {SITE_CONFIG.phone} anrufen
            </a>
          </div>
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="faq-inner">
          <div className="fade-up">
            <h2 className="how-h2">Häufige Fragen</h2>
          </div>
          <div className="faq fade-up d2">
            {HOME_FAQ_ITEMS.map((item, i) => {
              const open = faqOpen === i;
              return (
                <div key={item.q} className={`faq-row${open ? " open" : ""}`}>
                  <button type="button" className="faq-q" onClick={() => setFaqOpen(open ? null : i)}>
                    <span>{item.q}</span>
                    <span className="faq-ico">+</span>
                  </button>
                  <div className="faq-a">{item.a}</div>
                </div>
              );
            })}
          </div>
          <div className="fade-up d3 faq-inner-follow-up">
            <p className="how-tl-sub" style={{ marginTop: "20px" }}>
              <a href="/ratgeber/generalunternehmer-vs-einzelhandwerker-muenchen">
                Generalunternehmer vs. Einzelhandwerker — Ratgeber lesen →
              </a>
            </p>
            <p className="how-tl-sub" style={{ marginTop: "28px" }}>
              Nicht dabei? Ruf uns an — wir helfen persönlich weiter.
            </p>
            <div style={{ marginTop: "20px", display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
              <a
                href={SITE_CONFIG.phoneHref}
                className="btn-cta"
                onClick={() =>
                  capturePostHogEvent("cta_phone_clicked", { location: "faq" })
                }
              >
                {SITE_CONFIG.phone}
              </a>
            </div>
          </div>
        </div>
      </section>

      <SectionDivider variant="welle" from="#f7f6f3" to="#ffffff" />

      <VermittlungSection />

      <MarketingFooter />
    </div>
  );
}
