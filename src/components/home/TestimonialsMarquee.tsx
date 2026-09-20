"use client";
import { PALETTE } from "@/lib/tokens/palette";

import { useState } from "react";

import { cn } from "@/lib/utils";

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
  amber: { bg: PALETTE.hfaeeda, color: PALETTE.h854f0b },
  gray: { bg: PALETTE.hf1efe8, color: PALETTE.h444441 },
  green: { bg: "var(--fl-status-green-bg)", color: PALETTE.h3b6d11 },
  teal: { bg: PALETTE.he1f5ee, color: PALETTE.h0f6e56 },
  blue: { bg: PALETTE.he6f1fb, color: "var(--fl-status-blue)" },
};

export function TestimonialsMarquee({
  testimonials,
}: {
  testimonials: readonly MarqueeTestimonial[];
}) {
  const [paused, setPaused] = useState(false);

  const doubled = [...testimonials, ...testimonials];

  return (
    <div
      className="marquee-wrapper"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div className={cn("marquee-track", paused && "paused")}>
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
      </div>
    </div>
  );
}
