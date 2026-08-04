import Link from "next/link";

import type { HandwerkerContentItem } from "@/lib/handwerker-types";

export function StadtteilLinksSection({
  links,
  leistungLabel,
}: {
  links: HandwerkerContentItem[];
  leistungLabel: string;
}) {
  if (links.length === 0) return null;

  return (
    <section className="stadtteil-links-section">
      <div className="article-section-inner">
        <h2 className="stadtteil-links-title">
          {leistungLabel} in deinem Stadtteil
        </h2>
        <p className="stadtteil-links-sub">
          Wir sind in ganz München und Umgebung für dich da.
        </p>
        <div className="stadtteil-links-grid">
          {links.map((c) => (
            <Link
              key={c.slug}
              href={`/${c.slug}`}
              className="stadtteil-links-item"
            >
              {c.h1}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
