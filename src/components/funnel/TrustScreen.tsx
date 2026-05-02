"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

const PLACEHOLDER_EMOJI = "🏗️";

const TRUST_CONTENT = {
  intro: {
    image: "/images/trust-koordination.jpg",
    imageAlt:
      "Bärenwald Projektleiter koordiniert Handwerker in einer Münchner Wohnung",
    eyebrow: "Unsere Vision",
    headline: "Handwerk neu gedacht.",
    text: "Ein Ansprechpartner der alles koordiniert. Volle Preistransparenz von Anfang an. Statusupdates während des Projekts und digitales Abnahmeprotokoll am Ende — so wie es sein sollte.",
  },
  preis: {
    image: "/images/trust-preis.jpg",
    imageAlt: "Handwerker zeigt Kunden transparentes Angebot auf Tablet",
    eyebrow: "Keine Überraschungen",
    headline: "Der Preis steht\nbevor wir anfangen.",
    text: "Unser Rechner zeigt dir einen unverbindlichen Preisrahmen — eine ehrliche Preisindikation auf Basis aktueller Münchner Marktpreise, noch bevor du anrufst. Nach dem Vor-Ort-Termin bekommst du ein verbindliches Festpreisangebot. Kein Nachtrag ohne deine Zustimmung.",
  },
  qualitaet: {
    image: "/images/trust-qualitaet.jpg",
    imageAlt:
      "Handwerker und Kunde bei digitaler Abnahme in frisch renoviertem Raum",
    eyebrow: "Unser Versprechen",
    headline: "Sauber übergeben.\nDigital dokumentiert.",
    text: "Wir hinterlassen dein Zuhause so wie wir es vorgefunden haben — nur besser. Jedes Projekt wird mit einem digitalen Abnahmeprotokoll abgeschlossen. Damit du weißt was gemacht wurde und alles zur Aufbewahrung hast.",
  },
} as const;

export type TrustScreenVariant = keyof typeof TRUST_CONTENT;

export interface TrustScreenProps {
  variant: TrustScreenVariant;
}

export function TrustScreen({ variant }: TrustScreenProps) {
  const content = TRUST_CONTENT[variant];
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="trust-screen-wrap">
      <div className={cn("trust-screen")}>
        <div className="trust-image-wrap">
          {!imgFailed ? (
            <Image
              src={content.image}
              alt={content.imageAlt}
              fill
              className="trust-image"
              priority
              sizes="(max-width: 640px) 100vw, 36rem"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="trust-image-placeholder" aria-hidden>
              {PLACEHOLDER_EMOJI}
            </div>
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
