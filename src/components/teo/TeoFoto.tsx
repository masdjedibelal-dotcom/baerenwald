import fs from "node:fs";
import path from "node:path";

/**
 * Foto der TEO-Website aus public/brand/teo/fotos/<name>.jpg.
 * Fehlt die Datei noch, zeigt die Fläche einen ruhigen Verlauf (gleiches Format, kein Layout-Sprung).
 */
export function TeoFoto({ name, alt, className }: { name: string; alt: string; className?: string }) {
  const datei = path.join(process.cwd(), "public", "brand", "teo", "fotos", `${name}.jpg`);
  const da = fs.existsSync(datei);
  return (
    <div className={`ts-foto ${da ? "" : "ts-foto--leer"} ${className ?? ""}`}>
      {da ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/brand/teo/fotos/${name}.jpg`} alt={alt} loading="lazy" decoding="async" />
      ) : null}
    </div>
  );
}
