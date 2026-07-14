# DPA-Archiv (Auftragsverarbeitungsverträge mit Subprozessoren)

Stand: Juli 2026 — **prozedural**, nicht rechtsverbindlich.

## Zweck

Nachweise für Art. 28 DSGVO mit technischen Dienstleistern (Supabase, Vercel, Resend, …). Getrennt vom HV-AVV (`av_text_snapshot` auf `kunden`).

## Ordnerstruktur (empfohlen)

```
docs/legal/dpa/
  README.md              ← diese Datei
  supabase/              ← DPA/SCC-PDF von Supabase Dashboard
  vercel/                ← DPA von Vercel
  resend/                ← DPA von Resend
  posthog/               ← falls aktiv
  _index.md              ← Tabelle: Anbieter, Datum, Version, Ablage
```

## Pflegeprozess

1. Beim Onboarding neuer Subprozessoren: Eintrag in [SUBPROZESSOREN_REGISTER.md](../SUBPROZESSOREN_REGISTER.md).
2. DPA-PDF herunterladen → Unterordner ablegen, Dateiname `YYYY-MM-DD_<anbieter>_dpa.pdf`.
3. `_index.md` aktualisieren (Datum, Vertragsversion, verantwortliche Person).
4. Bei HV-relevanten Änderungen: 30-Tage-Widerspruchsfrist laut Register.

## Offen (Ops)

- [ ] Supabase DPA + Region aus Dashboard dokumentieren
- [ ] Vercel DPA ablegen
- [ ] Resend DPA ablegen
- [ ] PostHog-Status klären (Opt-in / AVV)

Siehe auch [TOM_ANLAGE_ENTWURF.md](../TOM_ANLAGE_ENTWURF.md).
