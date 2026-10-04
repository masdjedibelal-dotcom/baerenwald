import { clsx,type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** z. B. für Hintergrund mit geringer Deckkraft aus Hex-Akzent */
export {
  BEREICH_LABELS,
  FACHDETAIL_TO_LEISTUNG,
  SITUATION_LABELS,
} from "@/lib/lead-funnel-labels";
