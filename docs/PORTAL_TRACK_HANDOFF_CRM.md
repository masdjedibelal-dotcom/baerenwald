# Portal-Track — Handoff an CRM

Stand: Juli 2026  
**Portal-Repo:** `handwerks-plattform` — Dev-Track **abgeschlossen**  
**Nächster Schritt:** CRM-Repo `baerenwald-crm-dashboard` → [CRM_TRACK_PLAN.md](./CRM_TRACK_PLAN.md)

---

## Erledigt (Portal)

| Bereich | Status |
|---------|--------|
| WL / No-Mieter-Mail | ✅ |
| Design P0 (PortalShell, Timeline, Pills) | ✅ |
| HV-Abnahme (Migration + UI) | ✅ |
| Rechtspaket (Entwürfe + Melde-Templates) | ✅ |
| AV-Archiv (`av_text_snapshot`, `av_akzeptiert_von`) | ✅ |
| 30-Tage Bestands-Gate → Hard Gate alle Nutzer | ✅ |
| DPA-Ordnerstruktur | ✅ (prozedural) |
| Build + Tests | ✅ siehe unten |

---

## Migrationen (Supabase)

Manuell anwenden falls noch offen:

| Datei | Inhalt |
|-------|--------|
| `20260815120000_org_whitelabel_stamm.sql` | WL-Stammdaten |
| `20260816120000_hv_portal_abnahmen.sql` | HV-Abnahme |
| `20260817120000_org_av_archiv_gate.sql` | AV-Archiv + `wl_ansprache_am` |

---

## Tests

```bash
npm run test:crm-vorgang
npm run test:org-whitelabel-gate
npm run build
```

---

## Bewusst offen (nicht Portal-Dev)

| Thema | Wo |
|-------|-----|
| Anwalt: AVV 1.0, Impressum, Fragen 1/4/6 | `docs/legal/` |
| Löschjobs | CRM + nach Fristen-Freigabe |
| CRM Phasen A–D | `baerenwald-crm-dashboard` |
| Objektakte 8-Tabs-Mock (Design optional) | Designer |

---

## CRM-Kickoff

Neue Session in **`baerenwald-crm-dashboard`**. Prompt aus [CRM_TRACK_PLAN.md](./CRM_TRACK_PLAN.md) § Kickoff — **Schritt 0**, Stopp nach Diff.

Fixtures kopieren:

`handwerks-plattform/shared/crm-vorgang/resolve-vorgang.fixtures.json`  
→ `baerenwald-crm-dashboard/shared/crm-vorgang/resolve-vorgang.fixtures.json`
