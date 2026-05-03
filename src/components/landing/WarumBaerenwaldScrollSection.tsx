"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import type { MotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { WARUM_EINSATZ_BLOCKS } from "@/lib/warum-blocks";

function WarumEinsatzIcon({ index }: { index: number }) {
  const cls = "warum-card-icon-svg";
  const i = index % 3;
  if (i === 0) {
    return (
      <svg
        className={cls}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinejoin="round" />
      </svg>
    );
  }
  if (i === 1) {
    return (
      <svg
        className={cls}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path
        d="M22 4 12 14.01l-3-3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarumHeadline() {
  return (
    <>
      <h2 id="warum-heading" className="warum-h2">
        Warum Bärenwald?
      </h2>
      <p className="warum-sub">
        Wir glauben dass Handwerk
        <br />
        anders geht.
      </p>
    </>
  );
}

function WarumStaticCard({
  block,
  index,
}: {
  block: (typeof WARUM_EINSATZ_BLOCKS)[number];
  index: number;
}) {
  return (
    <div className="warum-card-slot">
      <div className="warum-card">
        <span className="warum-card-icon" aria-hidden>
          <WarumEinsatzIcon index={index} />
        </span>
        <h3>{block.titel}</h3>
        <p>{block.text}</p>
      </div>
    </div>
  );
}

function WarumScrollCard({
  x,
  opacity,
  block,
  index,
  stackZIndex,
}: {
  x: MotionValue<number>;
  opacity: MotionValue<number>;
  block: (typeof WARUM_EINSATZ_BLOCKS)[number];
  index: number;
  /** Stacking: höhere Karte liegt oben (Apple-artig übereinander) */
  stackZIndex: number;
}) {
  return (
    <div
      className="warum-card-slot warum-card-slot--stack"
      style={{ zIndex: stackZIndex }}
    >
      <motion.div className="warum-card" style={{ x, opacity }}>
        <span className="warum-card-icon" aria-hidden>
          <WarumEinsatzIcon index={index} />
        </span>
        <h3>{block.titel}</h3>
        <p>{block.text}</p>
      </motion.div>
    </div>
  );
}

/** Desktop: normale Sektion ohne Scroll-Story */
function WarumDesktopStatic() {
  return (
    <section className="warum-section" aria-labelledby="warum-heading">
      <div className="warum-inner warum-inner--static">
        <div className="warum-sticky">
          <WarumHeadline />
        </div>
        <div className="warum-cards warum-cards--static">
          {WARUM_EINSATZ_BLOCKS.map((block, index) => (
            <WarumStaticCard key={block.titel} block={block} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Mobil: Sticky-Bühne + Karten als Stack (übereinander, nacheinander von rechts/links) */
function WarumMobileScrollStory() {
  const trackRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  /* Karte 1: von rechts einfliegen, dann sichtbar */
  const x1 = useTransform(scrollYProgress, [0, 0.14], [200, 0]);
  const opacity1 = useTransform(scrollYProgress, [0, 0.08, 0.2], [0, 1, 1]);

  /* Karte 2: von rechts über Karte 1 */
  const x2 = useTransform(scrollYProgress, [0.22, 0.38], [200, 0]);
  const opacity2 = useTransform(scrollYProgress, [0.2, 0.26, 0.45], [0, 1, 1]);

  /* Karte 3: von links über Karte 2 */
  const x3 = useTransform(scrollYProgress, [0.44, 0.6], [-200, 0]);
  const opacity3 = useTransform(scrollYProgress, [0.42, 0.5, 0.68], [0, 1, 1]);

  return (
    <section className="warum-section" aria-labelledby="warum-heading">
      <div ref={trackRef} className="warum-scroll-track warum-scroll-track--mobile-story">
        <div className="warum-pin-stage">
          <div className="warum-inner warum-inner--pinned warum-inner--mobile-stack">
            <div className="warum-sticky">
              <WarumHeadline />
            </div>
            <div className="warum-cards warum-cards--stack">
              <WarumScrollCard
                x={x1}
                opacity={opacity1}
                block={WARUM_EINSATZ_BLOCKS[0]!}
                index={0}
                stackZIndex={1}
              />
              <WarumScrollCard
                x={x2}
                opacity={opacity2}
                block={WARUM_EINSATZ_BLOCKS[1]!}
                index={1}
                stackZIndex={2}
              />
              <WarumScrollCard
                x={x3}
                opacity={opacity3}
                block={WARUM_EINSATZ_BLOCKS[2]!}
                index={2}
                stackZIndex={3}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function WarumBaerenwaldScrollSection() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return mobile ? <WarumMobileScrollStory /> : <WarumDesktopStatic />;
}
