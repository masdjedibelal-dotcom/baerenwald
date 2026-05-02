"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useEffect, useRef } from "react";

import { HOME_HOW_STEPS } from "@/lib/home-how-steps";

const STEP_DIRECTIONS = ["left", "bottom", "right"] as const;

const stepVariants = {
  hidden: (direction: (typeof STEP_DIRECTIONS)[number]) => ({
    opacity: 0,
    x:
      direction === "left" ? -60 : direction === "right" ? 60 : 0,
    y: direction === "bottom" ? 60 : 0,
  }),
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const,
    },
  },
};

function HowStepRow({
  step,
  direction,
  styleDelay,
}: {
  step: (typeof HOME_HOW_STEPS)[number];
  direction: (typeof STEP_DIRECTIONS)[number];
  styleDelay: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      className="how-tl-step"
      style={{ ["--how-step-delay" as string]: styleDelay }}
      custom={direction}
      variants={stepVariants}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
    >
      <div className="how-tl-step-marker">{step.emoji}</div>
      <div className="how-tl-step-content">
        <p className="how-tl-content-title">{step.title}</p>
        <p className="how-tl-content-desc">{step.desc}</p>
      </div>
    </motion.div>
  );
}

export function HowTimelineMotion() {
  const blockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = blockRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          el.classList.add("how-timeline-block--visible");
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="how-section" id="how">
      <div className="how-section-inner">
        <div className="how-tl-header fade-up">
          <h2 className="how-h2">So läuft es bei uns.</h2>
          <p className="how-tl-sub">
            Kein Abstimmen. Kein Nachfragen.
            <br />
            Kein Stress.
          </p>
        </div>
        <div ref={blockRef} className="how-timeline-block">
          <div className="how-timeline-wrap">
            <div className="how-timeline-line" aria-hidden>
              <div className="how-timeline-line-fill" />
            </div>
            <div className="how-timeline-steps">
              {HOME_HOW_STEPS.map((step, i) => (
                <HowStepRow
                  key={step.title}
                  step={step}
                  direction={STEP_DIRECTIONS[i] ?? "left"}
                  styleDelay={`${0.08 + i * 0.12}s`}
                />
              ))}
            </div>
          </div>
          <div className="how-tl-cta-wrap fade-up">
            <Link href="/rechner" className="how-tl-cta">
              Zum Preisrechner →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
