# Portal Interaktions-Kit

SoT-Layout: [`PORTAL-SURFACE-OPTIMIERUNG.md`](./PORTAL-SURFACE-OPTIMIERUNG.md)  
Komponente: `PortalModalShell` · Tokens: `src/lib/portal2/modal-shell.ts`

## Varianten

| `variant` | Mobil | Desktop | Typische Jobs |
|-----------|--------|---------|----------------|
| **`edit`** (Default) | Bottom Sheet | **Side-Over** rechts | Formulare, Settings, Einladen, Storno mit Grund, Leistung dokumentieren |
| **`confirm`** | kurzes Bottom Sheet | kompaktes Center | Ja/Nein, Success-OK, ⋯-ActionSheets, Auswahl-Listen |
| **`funnel`** | Fullscreen | großes Center-Modal | Create-Wizard, Objekt-Wizard, Abschluss-Schritte |
| **`preview`** | Bottom Sheet | **Side-Over** (breiter) | PDF/Doc-Vorschau, QR-Code |

Legacy: `size="funnel"` → `funnel`; `size="default"` → `edit`.

## Verhalten (S7–S10)

- **`dirty`**: X / Backdrop / Escape / Browser-Back → „Änderungen verwerfen?“
- **History**: Offenes Overlay pusht History-Entry; Back schließt Overlay zuerst
- Nach Speichern/`onClose` ohne Dirty: History-Eintrag wird aufgeräumt

## Chrome

- Detail fullscreen: `PortalShell` Prop `hideMobileChrome` → Bottom-Nav + FAB aus
- Eine Primary am Detail (`PortalDetailStickyActions`); Danger nur im Confirm/⋯

## Checkliste neuer Overlay

1. Richtige `variant`?
2. Formular → `dirty` setzen oder Auto-Touch nutzen (`EinstellungenEditModal`)
3. Funnel/Wizard nicht als Side-Over erzwingen
4. Stichprobe Desktop **und** Mobile
