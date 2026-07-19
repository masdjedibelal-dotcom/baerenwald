import { erklaerungFromBrief } from "@/lib/gpt-viz/compose-zielbild";
import { composeGptZielbildPngBuffer } from "@/lib/gpt-viz/compose-zielbild-server";
import { uploadGptVizPngBuffer } from "@/lib/gpt-viz/storage";
import type { GptVizSessionRow } from "@/lib/gpt-viz/types";
import { updateGptVizSession } from "@/lib/gpt-viz/session";

export async function ensureZielbildForSession(
  session: GptVizSessionRow,
  options?: { force?: boolean }
): Promise<{ zielbild_url: string | null; error?: string }> {
  if (session.zielbild_url && !options?.force) {
    return { zielbild_url: session.zielbild_url };
  }

  const vorher = session.ist_bilder_urls[0];
  const nachher = session.ergebnis_bild_url;
  const erk = session.gpt_erklaerung;

  if (!vorher || !nachher || !erk) {
    return {
      zielbild_url: session.zielbild_url,
      error: "Zielbild benötigt Ist-Bild, Ergebnis und Erklärung.",
    };
  }

  try {
    const png = await composeGptZielbildPngBuffer({
      vorherUrl: vorher,
      nachherUrl: nachher,
      erklaerung: erklaerungFromBrief(erk),
    });

    const uploaded = await uploadGptVizPngBuffer(session.id, png, "zielbild");
    if (!uploaded.ok) {
      return { zielbild_url: session.zielbild_url, error: uploaded.error };
    }

    const updated = await updateGptVizSession(session.id, {
      zielbild_url: uploaded.publicUrl,
    });

    return { zielbild_url: updated?.zielbild_url ?? uploaded.publicUrl };
  } catch (e) {
    console.error("[zielbild-export]", e);
    return {
      zielbild_url: session.zielbild_url,
      error: e instanceof Error ? e.message : "Zielbild-Export fehlgeschlagen.",
    };
  }
}
