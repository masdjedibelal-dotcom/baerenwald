"use client";

/** Kontakt vor Ort mit antippbarer Telefonnummer (erste Nummer im Text). */
export function KontaktVorOrt({ text }: { text: string }) {
  const t = text.trim();
  const m = t.match(/\+?\d[\d\s/()-]{5,}\d/);
  if (!m) return <span>{t}</span>;
  const nummer = m[0];
  const tel = nummer.replace(/[^\d+]/g, "");
  const i = t.indexOf(nummer);
  return (
    <span>
      {t.slice(0, i)}
      <a href={`tel:${tel}`} className="font-semibold text-[var(--p2-primary)] underline underline-offset-2">
        {nummer}
      </a>
      {t.slice(i + nummer.length)}
    </span>
  );
}
