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
    cta: "Jetzt loslegen →",
  },
  preis: {
    image: "/images/trust-preis.jpg",
    imageAlt: "Handwerker zeigt Kunden transparentes Angebot auf Tablet",
    eyebrow: "Keine Überraschungen",
    headline: "Der Preis steht\nbevor wir anfangen.",
    text: "Unser Rechner gibt dir eine ehrliche Preisindikation — bevor du überhaupt anrufst. Nach dem Vor-Ort-Termin bekommst du ein verbindliches Festpreisangebot. Kein Nachtrag ohne deine Zustimmung.",
    cta: null as string | null,
  },
  qualitaet: {
    image: "/images/trust-qualitaet.jpg",
    imageAlt:
      "Handwerker und Kunde bei digitaler Abnahme in frisch renoviertem Raum",
    eyebrow: "Unser Versprechen",
    headline: "Sauber übergeben.\nDigital dokumentiert.",
    text: "Wir hinterlassen dein Zuhause so wie wir es vorgefunden haben — nur besser. Jedes Projekt wird mit einem digitalen Abnahmeprotokoll abgeschlossen. Damit du weißt was gemacht wurde und alles zur Aufbewahrung hast.",
    cta: null as string | null,
  },
} as const;

export type TrustScreenVariant = keyof typeof TRUST_CONTENT;

export interface TrustScreenProps {
  variant: TrustScreenVariant;
  onWeiter: () => void;
}

export function TrustScreen({ variant, onWeiter }: TrustScreenProps) {
  const content = TRUST_CONTENT[variant];
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      className={cn(
        "trust-screen",
        variant === "intro" && "trust-screen--intro",
        variant !== "intro" && "trust-screen--under-header"
      )}
    >
      <div className="trust-image-wrap">
        {variant === "intro" ? (
          <button
            type="button"
            className="trust-skip"
            onClick={onWeiter}
          >
            Überspringen
          </button>
        ) : null}

        {!imgFailed ? (
          <Image
            src={content.image}
            alt={content.imageAlt}
            fill
            className="trust-image"
            priority
            sizes="100vw"
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
        {content.cta ? (
          <button type="button" className="trust-cta" onClick={onWeiter}>
            {content.cta}
          </button>
        ) : null}
      </div>
    </div>
  );
}
