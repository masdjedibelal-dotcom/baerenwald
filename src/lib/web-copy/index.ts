/**
 * Website-Copy (Marketing, Funnel, Ratgeber) — Du-Ton erlaubt.
 * Portal-UI nutzt `@/lib/portal-copy` (Sie).
 */
export const WEB = {
  ctaProjekt: 'Bereit für dein Projekt?',
  ctaEinordnen: 'Lass uns dein Projekt gemeinsam einordnen — schnell und direkt.',
  ratgeberVoraussetzungen: 'Was du vorher wissen solltest',
  ratgeberQualitaet: 'Woran erkennst du gute Arbeit?',
  carouselVorhaben: 'Beschreib einfach kurz dein Vorhaben',
} as const

export type WebCopyKey = keyof typeof WEB
