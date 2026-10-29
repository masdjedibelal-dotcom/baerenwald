import fs from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";

/** Liegt public/brand/teo/fotos/<name>.jpg schon vor? */
export function fotoDa(name: string): boolean {
  return fs.existsSync(path.join(process.cwd(), "public", "brand", "teo", "fotos", `${name}.jpg`));
}

/**
 * Foto der TEO-Website aus public/brand/teo/fotos/<name>.jpg.
 * Fehlt die Datei noch, zeigt die Fläche einen ruhigen Verlauf (gleiches Format, kein Layout-Sprung), optional mit `ersatz` (z. B. Icon).
 */
export function TeoFoto({ name, alt, className, ersatz }: { name: string; alt: string; className?: string; ersatz?: ReactNode }) {
  const da = fotoDa(name);
  return (
    <div className={`ts-foto ${da ? "" : "ts-foto--leer"} ${className ?? ""}`}>
      {da ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/brand/teo/fotos/${name}.jpg`} alt={alt} loading="lazy" decoding="async" />
      ) : (
        ersatz ?? null
      )}
    </div>
  );
}
