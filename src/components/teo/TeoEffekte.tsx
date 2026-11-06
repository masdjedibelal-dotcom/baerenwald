"use client";

import { useEffect } from "react";

/** Was beim Scrollen nacheinander erscheint: Überschriften und die Einträge der Listen/Karten je Abschnitt. */
const ZIELE = [
  ".ts-abschnitt h2",
  ".ts-vorher__karte li",
  ".ts-app__schritt",
  ".ts-icons li",
  ".ts-beteiligte__karten li",
  ".ts-beteiligte__system",
  ".ts-einstieg__liste li",
  ".ts-kosten__zeile",
].join(",");

/**
 * Startseite: Effekte, die das Lesen führen (sanftes Einblenden, Hervorhebung, Durchstreichen, Farbformen).
 * Ohne JS oder bei „Bewegung reduzieren“ ist alles sofort sichtbar — die Klasse teo-fx schaltet die Effekte erst ein.
 */
export function TeoEffekte() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const html = document.documentElement;
    const elemente = Array.from(document.querySelectorAll<HTMLElement>(ZIELE));
    // Reihenfolge je Eltern-Element: kurze Staffelung in Lesereihenfolge
    const zaehler = new Map<Element, number>();
    for (const el of elemente) {
      const eltern = el.parentElement ?? el;
      const i = zaehler.get(eltern) ?? 0;
      zaehler.set(eltern, i + 1);
      el.style.setProperty("--fx-i", String(Math.min(i, 8)));
      el.classList.add("fx");
    }
    html.classList.add("teo-fx");

    const beobachter = new IntersectionObserver(
      (eintraege) => {
        for (const e of eintraege) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("fx-da");
          beobachter.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 }
    );
    elemente.forEach((el) => beobachter.observe(el));

    // Farbformen: leicht versetzt mitscrollen
    let rahmen = 0;
    const scrollen = () => {
      if (rahmen) return;
      rahmen = requestAnimationFrame(() => {
        rahmen = 0;
        html.style.setProperty("--ts-scroll", String(Math.round(window.scrollY)));
      });
    };
    scrollen();
    window.addEventListener("scroll", scrollen, { passive: true });

    return () => {
      beobachter.disconnect();
      window.removeEventListener("scroll", scrollen);
      cancelAnimationFrame(rahmen);
      html.classList.remove("teo-fx");
      html.style.removeProperty("--ts-scroll");
    };
  }, []);
  return null;
}
