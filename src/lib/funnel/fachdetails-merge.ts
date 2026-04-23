import type { FachdetailsState } from "@/lib/funnel/types";

/** Merged `fachdetails` aus einem Patch (inkl. vollständigem `fachdetailAnswers`-Objekt). */
export function mergeFachdetailsPatch(
  prev: FachdetailsState,
  p: Partial<FachdetailsState>
): FachdetailsState {
  return {
    fachdetailAnswers:
      p.fachdetailAnswers !== undefined
        ? p.fachdetailAnswers
        : prev.fachdetailAnswers,
    neubauen:
      p.neubauen !== undefined
        ? { ...prev.neubauen, ...p.neubauen }
        : prev.neubauen,
    elektro:
      p.elektro !== undefined
        ? { ...prev.elektro, ...p.elektro }
        : prev.elektro,
    sanitaer:
      p.sanitaer !== undefined
        ? { ...prev.sanitaer, ...p.sanitaer }
        : prev.sanitaer,
    heizung:
      p.heizung !== undefined
        ? { ...prev.heizung, ...p.heizung }
        : prev.heizung,
    fassade:
      p.fassade !== undefined
        ? { ...prev.fassade, ...p.fassade }
        : prev.fassade,
    maler:
      p.maler !== undefined
        ? { ...prev.maler, ...p.maler }
        : prev.maler,
    boden:
      p.boden !== undefined
        ? { ...prev.boden, ...p.boden }
        : prev.boden,
    dach:
      p.dach !== undefined ? { ...prev.dach, ...p.dach } : prev.dach,
    garten:
      p.garten !== undefined
        ? { ...prev.garten, ...p.garten }
        : prev.garten,
    fenster:
      p.fenster !== undefined
        ? { ...prev.fenster, ...p.fenster }
        : prev.fenster,
  };
}
