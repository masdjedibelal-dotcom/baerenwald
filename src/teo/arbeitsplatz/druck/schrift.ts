import { Manrope } from 'next/font/google'

/** Drucke: Manrope fest einbinden (eigene Variable — unabhängig von --font-sans der Seite). Variable Schrift wie im Layout, ohne feste Stärken. */
const druckSchrift = Manrope({ subsets: ['latin'], variable: '--druck-schrift' })

export const DRUCK_SCHRIFT = druckSchrift.variable
