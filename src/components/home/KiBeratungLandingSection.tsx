"use client";

import Link from "next/link";
import posthog from "posthog-js";

import { RECHNER_KI_BERATUNG_HREF } from "@/lib/rechner-links";

const STEPS = [
  {
    n: "1",
    title: "Vorhaben beschreiben",
    desc: "Idee oder konkretes Projekt — einfach lostippen.",
  },
  {
    n: "2",
    title: "Beratung im Chat",
    desc: "Gewerke, Ablauf und typische Fragen klären.",
  },
  {
    n: "3",
    title: "Optional Preisrahmen",
    desc: "Unverbindliche Orientierung, wenn du soweit bist.",
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
        <div className="ki-beratung-landing-title-wrap">
          <div className="ki-beratung-landing-title-card">
            <span
              className="ki-rechner-mode-label ki-rechner-starter-stoerer"
              aria-hidden
            >
              Neu
            </span>
            <h2 id="ki-beratung-landing-h2">BärenwaldGPT</h2>
          </div>
        </div>
        <p className="ki-beratung-landing-sub">
          Handwerkliches klären, bevor du den Preis siehst — Renovierung und Umbau
          in München, mit einem Ansprechpartner.
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
            posthog.capture("landing_ki_beratung_cta_clicked", {
              location: "hero_follow",
            })
          }
        >
          KI-Beratung starten
        </Link>
      </div>
    </section>
  );
}
