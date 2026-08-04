import type { GptVizBrief, GptVizModus } from "@/lib/gpt-viz/types";

export function promptStrengthForModus(modus: GptVizModus, strukturLock: boolean): number {
  const base: Record<GptVizModus, number> = {
    auffrischen: 0.36,
    teilsanierung: 0.48,
    stil_update: 0.52,
  };
  let strength = base[modus] ?? 0.38;
  if (strukturLock) strength = Math.min(strength, modus === "auffrischen" ? 0.36 : 0.5);
  return strength;
}

export function guidanceScaleForModus(modus: GptVizModus): number {
  if (modus === "auffrischen") return 8;
  if (modus === "teilsanierung") return 10;
  return 11;
}

export function negativePromptForBrief(brief?: GptVizBrief | null): string {
  const parts = [
    "new windows",
    "new doors",
    "skylight",
    "changed room layout",
    "different room shape",
    "different camera angle",
    "outdoor landscape",
    "people",
    "text",
    "watermark",
    "distorted objects",
    "melted geometry",
    "unrealistic",
    "low quality",
    "blurry",
    "cgi look",
  ];
  if (brief?.struktur_lock) {
    parts.push("added openings", "removed walls", "open floor plan change");
  }
  return parts.join(", ");
}
