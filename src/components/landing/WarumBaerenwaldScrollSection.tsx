"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

import { SiteIcon } from "@/components/ui/SiteIcon";
import { WARUM_EINSATZ_BLOCKS } from "@/lib/warum-blocks";

function WarumCard({
  block,
  delay = 0,
}: {
  block: (typeof WARUM_EINSATZ_BLOCKS)[number];
  delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px -8% 0px" });

  return (
    <motion.article
      ref={ref}
      className="warum-card"
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.45, delay }}
    >
      <span className="warum-card-icon" aria-hidden>
        <SiteIcon asset={block.icon} size={32} />
      </span>
      <h3>{block.titel}</h3>
      <p>{block.text}</p>
    </motion.article>
  );
}

export function WarumBaerenwaldScrollSection() {
  return (
    <section className="warum-section" aria-labelledby="warum-heading">
      <div className="warum-inner warum-inner--grid">
        <header className="warum-header">
          <h2 id="warum-heading" className="warum-h2">
            Warum Bärenwald?
          </h2>
          <p className="warum-sub">
            Ein Ansprechpartner, klare Schritte — für Kunden und Handwerk gleichermaßen.
          </p>
        </header>
        <div className="warum-cards-grid">
          {WARUM_EINSATZ_BLOCKS.map((block, index) => (
            <WarumCard key={block.titel} block={block} delay={index * 0.06} />
          ))}
        </div>
      </div>
    </section>
  );
}
