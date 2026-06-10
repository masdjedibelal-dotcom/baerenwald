import {
  BAERENWALD_VISION_CLOSING,
  BAERENWALD_VISION_HEADLINE,
  BAERENWALD_VISION_LEAD,
  BAERENWALD_VISION_PILLARS,
} from "@/lib/baerenwald-vision-story";

export interface BaerenwaldVisionInnerProps {
  headingId?: string;
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
            <p className="vision-pillar-title">{pillar.title}</p>
            <p className="vision-pillar-text">{pillar.text}</p>
          </li>
        ))}
      </ul>
      <p className="vision-closing">{BAERENWALD_VISION_CLOSING}</p>
    </div>
  );
}
