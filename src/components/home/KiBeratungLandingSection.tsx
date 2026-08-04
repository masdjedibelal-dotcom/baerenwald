"use client";

import Link from "next/link";
import { capturePostHogEvent } from "@/lib/consent/posthog-client";
import { RECHNER_KI_BERATUNG_HREF } from "@/lib/rechner-links";

const STEPS = [
  {
    n: "1",
    title: "Vorhaben schildern",
    desc: "Bad, Heizung, Umbau — erzähl einfach, was ansteht.",
  },
  {
    n: "2",
    title: "Idee sehen & einordnen",
    desc: "Optional Raum visualisieren, Gewerke klären und Preisrahmen — im selben Gespräch.",
  },
  {
    n: "3",
    title: "Anfrage senden",
    desc: "Bärenwald meldet sich — ein Ansprechpartner für alles.",
  },
] as const;

export function KiBeratungLandingSection() {
  return (
    <section
      id="ki-beratung"
      className="ki-beratung-landing"
      aria-labelledby="ki-beratung-landing-h2"
    >
      <div className="inner ki-beratung-landing-inner">
        <p className="ki-beratung-landing-eyebrow">Beratung & Visualisierung</p>
        <h2 id="ki-beratung-landing-h2" className="ki-beratung-landing-h2">
          Von der Idee bis zur Anfrage — in einem Durchgang
        </h2>
        <p className="ki-beratung-landing-sub">
          Beschreib dein Projekt, lass dir optional deinen Raum zeigen und hol dir
          einen Preisrahmen — ohne zwischen Masken zu springen. Mit einem
          Ansprechpartner in München.
        </p>

        <ol className="ki-beratung-landing-steps">
          {STEPS.map((step) => (
            <li key={step.n} className="ki-beratung-landing-step">
              <span className="ki-beratung-landing-step-n" aria-hidden>
                {step.n}
              </span>
              <div>
                <p className="ki-beratung-landing-step-title">{step.title}</p>
                <p className="ki-beratung-landing-step-desc">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>

        <Link
          href={RECHNER_KI_BERATUNG_HREF}
          className="ki-beratung-landing-cta"
          onClick={() =>
            capturePostHogEvent("landing_ki_beratung_cta_clicked", {
              location: "section",
            })
          }
        >
          Mein Projekt mit KI besprechen
        </Link>
      </div>
    </section>
  );
}
