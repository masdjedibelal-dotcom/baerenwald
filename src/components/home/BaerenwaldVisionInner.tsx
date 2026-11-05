import {
  BAERENWALD_VISION_CLOSING,
  BAERENWALD_VISION_HEADLINE,
  BAERENWALD_VISION_LEAD,
  BAERENWALD_VISION_PILLARS,
} from "@/lib/baerenwald-vision-story";

export interface BaerenwaldVisionInnerProps {
  headingId?: string;
}

type MockArt = (typeof BAERENWALD_VISION_PILLARS)[number]["mock"];

/** Schlichte Ansichten aus Kundensicht (Beispiel Bad) — keine echten Daten, keine Fotos. */
function VisionMock({ art }: { art: MockArt }) {
  if (art === "bautagebuch") {
    return (
      <div className="vision-mock" aria-hidden>
        <p className="vision-mock-kopf">Bautagebuch · Bad</p>
        <div className="vision-mock-foto" />
        <p className="vision-mock-zeile">
          <b>Fliesen verlegt</b>
          <span>Heute, 14:20 · Fliesenbetrieb</span>
        </p>
      </div>
    );
  }
  if (art === "abnahme") {
    return (
      <div className="vision-mock" aria-hidden>
        <p className="vision-mock-kopf">Absprachen · Bad</p>
        <ul className="vision-mock-liste">
          <li className="vision-mock-erledigt">Vorwand gestellt</li>
          <li className="vision-mock-erledigt">Abdichtung geprüft</li>
          <li className="vision-mock-freigabe">Armatur geändert · freigegeben</li>
          <li className="vision-mock-offen">Silikonfugen · offen</li>
        </ul>
      </div>
    );
  }
  return (
    <div className="vision-mock" aria-hidden>
      <p className="vision-mock-kopf">Kundenportal · Bad</p>
      <p className="vision-mock-zeile">
        <b>Abnahmeprotokoll</b>
        <span className="vision-mock-pill">Abgenommen</span>
      </p>
      <svg className="vision-mock-unterschrift" viewBox="0 0 120 28" fill="none">
        <path
          d="M4 20c8-14 14-14 16-4s6 8 12-2 10-8 12 0 8 6 14-4 12-6 16 2 10 4 18-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <p className="vision-mock-fuss">PDF · 12 Fotos · Mängel: keine</p>
    </div>
  );
}

export function BaerenwaldVisionInner({
  headingId = "vision-heading",
}: BaerenwaldVisionInnerProps) {
  return (
    <div className="vision-copy">
      <h2 id={headingId} className="vision-headline">
        {BAERENWALD_VISION_HEADLINE}
      </h2>
      <p className="vision-lead">{BAERENWALD_VISION_LEAD}</p>
      <ul className="vision-pillars">
        {BAERENWALD_VISION_PILLARS.map((pillar) => (
          <li key={pillar.title} className="vision-pillar">
            <VisionMock art={pillar.mock} />
            <p className="vision-pillar-title">{pillar.title}</p>
            <p className="vision-pillar-text">{pillar.text}</p>
          </li>
        ))}
      </ul>
      <p className="vision-closing">{BAERENWALD_VISION_CLOSING}</p>
    </div>
  );
}
