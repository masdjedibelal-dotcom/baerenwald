"use client";

import Image from "next/image";
import { useState } from "react";

import { istTeo, MARKE } from "@/lib/marke";
import { cn } from "@/lib/utils";

const TRUST_CONTENT = {
  intro: {
    image: "/images/trust-koordination.jpg",
    imageAlt:
      `${MARKE.name} Projektleiter koordiniert Partner in einer Münchner Wohnung`,
    eyebrow: "Unsere Vision",
    headline: "Handwerk neu gedacht.",
    text: "Ein Ansprechpartner der alles koordiniert. Volle Preistransparenz von Anfang an. Statusupdates während des Projekts und digitales Abnahmeprotokoll am Ende — so wie es sein sollte.",
  },
  preis: {
    image: "/images/trust-preis.jpg",
    imageAlt: "Partner zeigt Kunden transparentes Angebot auf Tablet",
    eyebrow: "Keine Überraschungen",
    headline: "Der Preis steht\nbevor wir anfangen.",
    text: "Unser Rechner zeigt Ihnen einen unverbindlichen Preisrahmen — eine ehrliche Preisindikation auf Basis unserer Projekterfahrung in München, noch bevor Sie anrufen. Nach dem Vor-Ort-Termin bekommen Sie ein verbindliches Festpreisangebot. Kein Nachtrag ohne Ihre Zustimmung.",
  },
  qualitaet: {
    image: "/images/trust-qualitaet.jpg",
    imageAlt:
      "Partner und Kunde bei digitaler Abnahme in frisch renoviertem Raum",
    eyebrow: "Unser Versprechen",
    headline: "Sauber übergeben.\nDigital dokumentiert.",
    text: "Wir hinterlassen Ihr Zuhause so wie wir es vorgefunden haben — nur besser. Jedes Projekt wird mit einem digitalen Abnahmeprotokoll abgeschlossen. Damit Sie wissen, was gemacht wurde und alles zur Aufbewahrung haben.",
  },
} as const;

/** Servus TEO: gleiche Bilder, Texte für Hausverwaltungen. */
const TRUST_CONTENT_TEO: Record<keyof typeof TRUST_CONTENT, { eyebrow: string; headline: string; text: string }> = {
  intro: {
    eyebrow: "Für Verwaltungen",
    headline: "Ein Ansprechpartner.\nAlle Gewerke.",
    text: "teo koordiniert Betriebe, Termine und Abnahme. Den Stand jedes Vorgangs sehen Sie im Portal — Protokoll, Fotos und Rechnung inklusive.",
  },
  preis: {
    eyebrow: "Keine Überraschungen",
    headline: "Der Preis steht\nbevor wir anfangen.",
    text: "Der Rechner zeigt einen unverbindlichen Preisrahmen auf Basis unserer Projekterfahrung in München. Nach der Prüfung vor Ort erhalten Sie ein verbindliches Angebot — als Entscheidungsgrundlage für Verwaltung und Beirat.",
  },
  qualitaet: {
    eyebrow: "Unser Versprechen",
    headline: "Sauber übergeben.\nDigital dokumentiert.",
    text: "Jeder Vorgang endet mit einem digitalen Abnahmeprotokoll. Fotos und Rechnung liegen im Portal — nachvollziehbar für Verwaltung, Eigentümer und Beirat.",
  },
};

export type TrustScreenVariant = keyof typeof TRUST_CONTENT;

export interface TrustScreenProps {
  variant: TrustScreenVariant;
}

export function TrustScreen({ variant }: TrustScreenProps) {
  const content = istTeo ? { ...TRUST_CONTENT[variant], ...TRUST_CONTENT_TEO[variant] } : TRUST_CONTENT[variant];
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="trust-screen-wrap">
      <div className={cn("trust-screen")}>
        <div className="trust-image-wrap">
          {!imgFailed ? (
            <Image
              src={content.image}
              alt={content.imageAlt}
              width={764}
              height={1024}
              className="trust-image"
              priority
              sizes="(max-width: 640px) 100vw, 36rem"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="trust-image-placeholder" aria-hidden />
          )}
          <div className="trust-image-gradient" aria-hidden />
        </div>

        <div className="trust-content">
          <span className="trust-eyebrow">{content.eyebrow}</span>
          <h2 className="trust-headline">{content.headline}</h2>
          <p className="trust-text">{content.text}</p>
        </div>
      </div>
    </div>
  );
}
