import { Manrope } from 'next/font/google'

/** Drucke: Manrope fest einbinden (eigene Variable — unabhängig von --font-sans der Seite). */
const druckSchrift = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--druck-schrift' })

export const DRUCK_SCHRIFT = druckSchrift.variable
