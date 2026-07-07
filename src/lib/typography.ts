/** Zentrale Typografie-Klassen (Tailwind) — Design-System */

export const TYPO = {
  display: "font-display font-bold tracking-tight",

  h1: "font-sans font-extrabold text-4xl lg:text-5xl leading-[1.1] tracking-tight text-text-primary",
  h2: "font-sans font-bold text-3xl lg:text-4xl leading-[1.15] tracking-tight text-text-primary",
  h3: "font-sans font-bold text-2xl leading-[1.2] tracking-tight text-text-primary",
  h4: "font-sans font-semibold text-xl leading-snug text-text-primary",

  eyebrow:
    "font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-text-tertiary",
  eyebrowAccent:
    "font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-accent",
  eyebrowInverse:
    "font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-white/60",

  bodyLg:
    "font-sans text-lg text-text-secondary leading-relaxed font-normal",
  body: "font-sans text-base text-text-secondary leading-relaxed font-normal",
  bodySm:
    "font-sans text-sm text-text-secondary leading-relaxed font-normal",
  bodyXs:
    "font-sans text-xs text-text-tertiary leading-relaxed font-normal",

  label:
    "font-sans text-[11px] font-bold uppercase tracking-widest",
  labelSm:
    "font-sans text-[10px] font-semibold uppercase tracking-widest",

  meta: "font-sans text-xs text-text-tertiary font-normal",

  heroH1:
    "font-sans font-extrabold text-5xl lg:text-6xl leading-[1.05] tracking-tight text-white",
  heroBody:
    "font-sans text-base lg:text-lg text-white/70 leading-relaxed font-normal",
} as const;
