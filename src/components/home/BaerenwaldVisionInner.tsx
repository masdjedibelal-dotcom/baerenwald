import {
  BAERENWALD_VISION_BULLETS,
  BAERENWALD_VISION_EYEBROW,
  BAERENWALD_VISION_PARAGRAPH_3A,
  BAERENWALD_VISION_PARAGRAPHS,
} from "@/lib/baerenwald-vision-story";

export interface BaerenwaldVisionInnerProps {
  /** Vermeidet doppelte `id` auf einer Seite mit mehreren Blöcken */
  headingId?: string;
}

/**
 * Gleicher Inhalt wie Startseite (Vision) — für Über-uns mit identischen Klassen,
 * damit Typo/Farben übereinstimmen.
 */
export function BaerenwaldVisionInner({
  headingId = "vision-heading",
}: BaerenwaldVisionInnerProps) {
  return (
    <>
      <p className="vision-eyebrow">{BAERENWALD_VISION_EYEBROW}</p>
      <h2 id={headingId} className="vision-headline">
        Gegründet weil Handwerk
        <br />
        besser geht.
      </h2>
      {BAERENWALD_VISION_PARAGRAPHS.map((text, i) => (
        <p key={i} className="vision-text">
          {text}
        </p>
      ))}
      <p className="vision-text">{BAERENWALD_VISION_PARAGRAPH_3A}</p>
      <div className="vision-divider" aria-hidden />
      <ul className="vision-points">
        {BAERENWALD_VISION_BULLETS.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </>
  );
}
