/**
 * iOS/Safari: `<input type="file" multiple>` liefert nach „Foto aufnehmen“
 * oft eine leere FileList — ohne Fehler, ohne Datei.
 * Mobil daher einzeln wählen; Desktop darf Mehrfachauswahl.
 * Drag-and-Drop ist davon nicht betroffen.
 */
export function allowMultipleFilePicker(isMobile: boolean): boolean {
  return !isMobile;
}
