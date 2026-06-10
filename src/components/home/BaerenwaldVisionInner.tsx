import Image from "next/image";

import {
  BAERENWALD_VISION_CLOSING,
  BAERENWALD_VISION_HEADLINE,
  BAERENWALD_VISION_IMAGE,
  BAERENWALD_VISION_IMAGE_ALT,
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
    <div className="vision-split">
      <div className="vision-split-copy">
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
      <div className="vision-split-visual">
        <div className="vision-visual-frame">
          <Image
            src={BAERENWALD_VISION_IMAGE}
            alt={BAERENWALD_VISION_IMAGE_ALT}
            fill
            className="vision-visual-img"
            sizes="(max-width: 900px) 100vw, 480px"
          />
        </div>
      </div>
    </div>
  );
}
