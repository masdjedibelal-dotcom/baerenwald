"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

import { BwIcon } from "@/components/ui/BwIcon";
import { HOME_HOW_STEPS } from "@/lib/home-how-steps";

function HowStepCard({
  step,
  delay,
}: {
  step: (typeof HOME_HOW_STEPS)[number];
  delay: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.article
      ref={ref}
      className="how-step-card"
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      <span className="how-step-card-num" aria-hidden>
        {step.step}
      </span>
      <span className="how-step-card-icon" aria-hidden>
        <BwIcon name={step.icon} size={28} />
      </span>
      <h3 className="how-step-card-title">{step.title}</h3>
      <p className="how-step-card-desc">{step.desc}</p>
    </motion.article>
  );
}

export function HowTimelineMotion() {
  return (
    <section className="how-section" id="how">
      <div className="how-section-inner">
        <header className="how-tl-header fade-up">
          <h2 className="how-h2">So läuft es bei uns.</h2>
          <p className="how-tl-sub">
            Kein Abstimmen. Kein Nachfragen. Kein Stress.
          </p>
        </header>

        <div className="how-steps-grid fade-up d1">
          {HOME_HOW_STEPS.map((step, i) => (
            <HowStepCard key={step.title} step={step} delay={i * 0.08} />
          ))}
        </div>

        <div className="how-tl-cta-wrap fade-up d2">
          <Link href="/kontakt" className="how-tl-cta-btn">
            Kontakt aufnehmen →
          </Link>
        </div>
      </div>
    </section>
  );
}
