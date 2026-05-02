"use client";

import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useState } from "react";

export type MarqueeTestimonialColor =
  | "green"
  | "teal"
  | "amber"
  | "blue"
  | "gray";

export type MarqueeTestimonial = {
  name: string;
  rolle: string;
  initials: string;
  quote: string;
  color: MarqueeTestimonialColor;
};

const AVATAR_COLORS: Record<
  MarqueeTestimonialColor,
  { bg: string; color: string }
> = {
  amber: { bg: "#FAEEDA", color: "#854F0B" },
  gray: { bg: "#F1EFE8", color: "#444441" },
  green: { bg: "#EAF3DE", color: "#3B6D11" },
  teal: { bg: "#E1F5EE", color: "#0F6E56" },
  blue: { bg: "#E6F1FB", color: "#185FA5" },
};

export function TestimonialsMarquee({
  testimonials,
}: {
  testimonials: readonly MarqueeTestimonial[];
}) {
  const [paused, setPaused] = useState(false);
  const controls = useAnimationControls();

  useEffect(() => {
    if (paused) {
      void controls.stop();
    } else {
      void controls.start({
        x: ["0%", "-50%"],
        transition: {
          duration: 30,
          repeat: Infinity,
          ease: "linear",
        },
      });
    }
  }, [paused, controls]);

  const doubled = [...testimonials, ...testimonials];

  return (
    <div
      className="marquee-wrapper"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <motion.div className="marquee-track" animate={controls}>
        {doubled.map((t, i) => {
          const col = AVATAR_COLORS[t.color];
          return (
            <div
              key={`${t.initials}-${i}`}
              className="testimonial-card testimonial-card--marquee"
            >
              <div className="testimonial-stars" aria-hidden>
                ★★★★★
              </div>
              <p className="testimonial-quote">{t.quote}</p>
              <div className="testimonial-divider" />
              <div className="testimonial-author">
                <div
                  className="testimonial-avatar"
                  style={{ background: col.bg, color: col.color }}
                  aria-hidden
                >
                  {t.initials}
                </div>
                <div>
                  <p className="testimonial-name">{t.name}</p>
                  <p className="testimonial-rolle">{t.rolle}</p>
                </div>
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
