"use client";

import { motion, useInView, useScroll, useTransform } from "framer-motion";
import type { MotionValue } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

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

function WarumMobileCard({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      className="warum-card"
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
}

function WarumDesktopCard({
  x,
  opacity,
  block,
  index,
}: {
  x: MotionValue<number>;
  opacity: MotionValue<number>;
  block: (typeof WARUM_EINSATZ_BLOCKS)[number];
  index: number;
}) {
  return (
    <div className="warum-card-slot">
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

export function WarumBaerenwaldScrollSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const x1 = useTransform(scrollYProgress, [0, 0.25], [200, 0]);
  const opacity1 = useTransform(scrollYProgress, [0, 0.25], [0, 1]);
  const x2 = useTransform(scrollYProgress, [0.25, 0.5], [200, 0]);
  const opacity2 = useTransform(scrollYProgress, [0.25, 0.5], [0, 1]);
  const x3 = useTransform(scrollYProgress, [0.5, 0.75], [200, 0]);
  const opacity3 = useTransform(scrollYProgress, [0.5, 0.75], [0, 1]);

  return (
    <section
      ref={sectionRef}
      className="warum-section"
      style={narrow ? undefined : { minHeight: "400vh" }}
      aria-labelledby="warum-heading"
    >
      <div
        className="warum-inner"
        style={narrow ? undefined : { minHeight: "400vh" }}
      >
        <div className="warum-sticky">
          <h2 id="warum-heading" className="warum-h2">
            Warum Bärenwald?
          </h2>
          <p className="warum-sub">
            Wir glauben dass Handwerk
            <br />
            anders geht.
          </p>
        </div>

        <div className="warum-cards">
          {narrow ? (
            WARUM_EINSATZ_BLOCKS.map((b, i) => (
              <div key={b.titel} className="warum-card-slot warum-card-slot--mobile">
                <WarumMobileCard delay={i * 0.08}>
                  <span className="warum-card-icon" aria-hidden>
                    <WarumEinsatzIcon index={i} />
                  </span>
                  <h3>{b.titel}</h3>
                  <p>{b.text}</p>
                </WarumMobileCard>
              </div>
            ))
          ) : (
            <>
              <WarumDesktopCard
                x={x1}
                opacity={opacity1}
                block={WARUM_EINSATZ_BLOCKS[0]!}
                index={0}
              />
              <WarumDesktopCard
                x={x2}
                opacity={opacity2}
                block={WARUM_EINSATZ_BLOCKS[1]!}
                index={1}
              />
              <WarumDesktopCard
                x={x3}
                opacity={opacity3}
                block={WARUM_EINSATZ_BLOCKS[2]!}
                index={2}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
