/* eslint-disable @next/next/no-img-element */

/** Weiches 3D-Icon der TEO-Website (public/brand/teo/icons/<name>.png, transparent, 256 px). */
export type TeoIconName =
  | "farbrolle"
  | "handy"
  | "headset"
  | "kalender"
  | "kamera"
  | "netzwerk"
  | "rechnung"
  | "regler"
  | "schild"
  | "schraubenschluessel"
  | "werkzeugkasten";

export function TeoIcon3D({ name, size = 56, className }: { name: TeoIconName; size?: number; className?: string }) {
  return (
    <img
      src={`/brand/teo/icons/${name}.png`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={`ts-icon3d ${className ?? ""}`}
    />
  );
}
