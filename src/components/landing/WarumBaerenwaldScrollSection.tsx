"use client";

import { motion, useInView } from "framer-motion";
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

/** Mobil: normales Scrollen, Karten blenden nacheinander ein (useInView) */
function WarumRevealCard({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px -8% 0px" });

  return (
    <motion.div
      ref={ref}
      className="warum-card"
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: 0.45, delay }}
    >
      {children}
    </motion.div>
  );
}

function WarumMobileSimple() {
  return (
    <section className="warum-section" aria-labelledby="warum-heading">
      <div className="warum-inner warum-inner--static">
        <div className="warum-sticky">
          <WarumHeadline />
        </div>
        <div className="warum-cards warum-cards--static">
          {WARUM_EINSATZ_BLOCKS.map((block, index) => (
            <div
              key={block.titel}
              className="warum-card-slot warum-card-slot--reveal"
            >
              <WarumRevealCard delay={index * 0.08}>
                <span className="warum-card-icon" aria-hidden>
                  <WarumEinsatzIcon index={index} />
                </span>
                <h3>{block.titel}</h3>
                <p>{block.text}</p>
              </WarumRevealCard>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Desktop: statische Karten */
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

export function WarumBaerenwaldScrollSection() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return mobile ? <WarumMobileSimple /> : <WarumDesktopStatic />;
}
