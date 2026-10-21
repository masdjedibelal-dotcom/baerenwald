# TEO-Arbeitsplatz (Hausverwaltung / WEG)

Nur bei `NEXT_PUBLIC_MARKE=teo` (sonst 404). Route: `/arbeitsplatz`.

- **Aussehen = CRM.** `kit/` wird aus dem CRM erzeugt: `node scripts/sync-crm-kit.mjs` im CRM-Repo
  (mock-ui-Bausteine + kompiliertes CRM-CSS). Nie von Hand ändern. Eigene Ergänzungen nur in `arbeitsplatz.css`.
- **Rechte:** eine Tabelle in `rechte.ts` (`darf(person, aktion)`). Oberfläche und Server prüfen damit.
- **Wer ist eingeloggt:** `kontext.ts` (Mitgliedschaft → offene Einladung → Hauptkonto).
- **Daten:** `daten/*` (server-only, immer org- und objektgefiltert). **Änderungen:** `aktionen/*` (Server Actions,
  jede prüft Login + Recht + Zugehörigkeit). HV-Entscheidungen teilen sich die Logik mit dem alten Portal
  (`src/teo/hv/vorgang-aktionen.ts`).
- **Status-Wortschatz:** `vorgang-status.ts` (Neu · Zu entscheiden · Bei TEO · Termin · Beauftragt · Erledigt · Abgelehnt).
- **Design-Regeln:** Hauptaktion oben rechts (topbar-cta) bzw. ein grüner Knopf im Detailkopf, Bearbeiten im Seitenfenster
  (`shell/ApSheet`), keine Erklärtexte, was man nicht darf sieht man nicht.
