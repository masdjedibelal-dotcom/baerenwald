"use client";

import { useEffect } from "react";

/** Kopfzeile: nach etwas Scrollen schmaler mit Glas-Grund (Klasse am <html>, CSS in teo-landing.css). */
export function TeoScrollKopf() {
  useEffect(() => {
    const html = document.documentElement;
    let gesetzt = false;
    const pruefen = () => {
      const jetzt = window.scrollY > 40;
      if (jetzt !== gesetzt) {
        gesetzt = jetzt;
        html.classList.toggle("teo-gescrollt", jetzt);
      }
    };
    pruefen();
    window.addEventListener("scroll", pruefen, { passive: true });
    return () => {
      window.removeEventListener("scroll", pruefen);
      html.classList.remove("teo-gescrollt");
    };
  }, []);
  return null;
}
