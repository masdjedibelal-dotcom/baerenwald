"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PortalButton } from "@/components/portal/PortalButton";

import { useCookieConsent } from "@/components/consent/CookieConsentContext";
import { DokumenteTabelle } from "@/components/shared/DokumenteTabelle";
import { PortalTextarea } from "@/components/shared/PortalFormControls";
import { PortalPhotoGallery } from "@/components/shared/PortalPhotoGallery";
import { VorgangDetailBlocks } from "@/components/shared/vorgang-detail";
import {
  MieterWlCard,
  MieterWlFrame,
} from "@/components/melden/MieterWlFrame";
import { MieterStgTimeline } from "@/components/melden/MieterStgTimeline";
import {
  MIETER_WL_STATUS,
  mieterStgActiveCopy,
  type MieterWlBrand,
} from "@/lib/portal2/mieter-wl";
import { buildMeldeStatusVorgangDetailVm } from "@/lib/vorgang/build-org-lead-detail-vm";
import type { MieterStatusStufe } from "@/lib/vorgang/vorgang-phase";
import { istTeo } from "@/lib/marke";
import "./melden.css";

type Anhang = { id: string; name: string; datum?: string; href: string };

type MeldeDetailExtras = {
  meldeStrasse?: string | null;
  meldePlz?: string | null;
  meldeOrt?: string | null;
  meldeSituation?: string | null;
  meldeBereich?: string | null;
  meldeZeitraum?: string | null;
  meldeFachdetails?: Array<{ label: string; value: string }>;
  fotos?: string[];
};

type Props = {
  brand: MieterWlBrand;
  token: string;
  objektTitel: string;
  melderName: string;
  einheit: string | null;
  referenz: string;
  initialStufe: MieterStatusStufe;
  erledigt: boolean;
  anhaenge?: Anhang[];
  /** Kurzbeschreibung der Meldung (ohne Preise) */
  beschreibung?: string | null;
  statusLabel?: string;
  meldeDetail?: MeldeDetailExtras;
  datenschutzHref?: string;
  impressumHref?: string;
};

const STATUS_POLL_MS = 20_000;

/**
 * D9 `wlStatus` — STG-Timeline (de+en) im HV-Branding.
 * Phase wird live gepollt (ohne Portal-Login).
 */
export function MeldeStatusClient({
  brand,
  token,
  objektTitel,
  melderName,
  einheit,
  referenz,
  initialStufe,
  erledigt: initialErledigt,
  anhaenge: initialAnhaenge = [],
  beschreibung = null,
  statusLabel: initialStatusLabel,
  meldeDetail,
  datenschutzHref,
  impressumHref,
}: Props) {
  const lang = "de" as const;
  const { setLegalLinks } = useCookieConsent();
  const [stufe, setStufe] = useState(initialStufe);
  const [erledigt, setErledigt] = useState(initialErledigt);
  const [anhaenge, setAnhaenge] = useState(initialAnhaenge);
  const [statusLabel, setStatusLabel] = useState(initialStatusLabel);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [wiederOffen, setWiederOffen] = useState(false);
  const [wiederText, setWiederText] = useState("");
  const [wiederGemeldet, setWiederGemeldet] = useState(false);

  /** Servus TEO: Problem ist nach Erledigung wieder da → neuer Vorgang (Gewährleistung). */
  async function wiederMelden() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/melden/wieder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, text: wiederText }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; statusPfad?: string | null };
      if (!res.ok) {
        setMsg(json.error ?? "Bitte versuchen Sie es erneut.");
        return;
      }
      if (json.statusPfad) {
        window.location.assign(json.statusPfad);
        return;
      }
      setWiederOffen(false);
      setWiederGemeldet(true);
      setMsg("Danke, wir kümmern uns darum.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (datenschutzHref && impressumHref) {
      setLegalLinks({
        datenschutz: datenschutzHref,
        impressum: impressumHref,
      });
      return () => setLegalLinks(null);
    }
    return undefined;
  }, [datenschutzHref, impressumHref, setLegalLinks]);

  const active = useMemo(
    () => mieterStgActiveCopy(stufe, lang),
    [stufe, lang]
  );

  const fotos = meldeDetail?.fotos ?? [];

  const detailVm = useMemo(
    () =>
      buildMeldeStatusVorgangDetailVm({
        idLabel: referenz,
        titel: active.title,
        statusLabel: statusLabel ?? active.subtitle,
        objektTitel,
        einheit,
        beschreibung,
        meldeStrasse: meldeDetail?.meldeStrasse,
        meldePlz: meldeDetail?.meldePlz,
        meldeOrt: meldeDetail?.meldeOrt,
        meldeSituation: meldeDetail?.meldeSituation,
        meldeBereich: meldeDetail?.meldeBereich,
        meldeZeitraum: meldeDetail?.meldeZeitraum,
        meldeFachdetails: meldeDetail?.meldeFachdetails,
        /* Fotos separat hinter Aufklapp — nicht im Detail-VM */
        fotos: [],
      }),
    [
      referenz,
      active.title,
      active.subtitle,
      statusLabel,
      objektTitel,
      einheit,
      beschreibung,
      meldeDetail,
    ]
  );

  const metaLine = [objektTitel, einheit].filter(Boolean).join(" · ");

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/melden/status?token=${encodeURIComponent(token)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const json = (await res.json()) as {
        stufe?: MieterStatusStufe;
        erledigt?: boolean;
        statusLabel?: string;
        anhaenge?: Anhang[];
      };
      if (json.stufe) setStufe(json.stufe);
      if (typeof json.erledigt === "boolean") setErledigt(json.erledigt);
      if (json.statusLabel) setStatusLabel(json.statusLabel);
      if (Array.isArray(json.anhaenge)) setAnhaenge(json.anhaenge);
    } catch {
      /* offline / kurzzeitig — nächster Poll */
    }
  }, [token]);

  useEffect(() => {
    void refreshStatus();
    const id = window.setInterval(() => {
      void refreshStatus();
    }, STATUS_POLL_MS);

    const onVis = () => {
      if (document.visibilityState === "visible") {
        void refreshStatus();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [refreshStatus]);

  const firstName = melderName.trim().split(/\s+/)[0] || melderName;
  const t = MIETER_WL_STATUS;

  return (
    <MieterWlFrame
      brand={brand}
      datenschutzHref={datenschutzHref}
      impressumHref={impressumHref}
    >
      <div className="space-y-4">
        <div>
          <h1 className="mieter-wl-objekt-title" style={{ fontSize: 21 }}>
            {t.title_de}
          </h1>
          <p className="text-fs-meta text-[var(--p2-sub)] mt-1">{metaLine}</p>
        </div>

        <MieterStgTimeline stufe={stufe} lang={lang} />

        <VorgangDetailBlocks vm={detailVm} />

        {fotos.length > 0 ? (
          <details className="rounded-[10px] border border-[var(--p2-line)] bg-white">
            <summary className="cursor-pointer select-none px-4 py-3 text-fs-body font-semibold text-[var(--p2-ink)]">
              Fotos anzeigen ({fotos.length})
            </summary>
            <div className="border-t border-[var(--p2-line)] px-4 py-3">
              <PortalPhotoGallery urls={fotos} />
            </div>
          </details>
        ) : null}

        {erledigt && anhaenge.length > 0 ? (
          <DokumenteTabelle heading={"Anhänge"} dokumente={anhaenge} />
        ) : null}

        {erledigt && istTeo && !wiederGemeldet ? (
          <MieterWlCard>
            <div className="p-4 space-y-3">
              <p className="text-fs-title font-bold text-[var(--p2-ink)]">{"Problem wieder da?"}</p>
              {wiederOffen ? (
                <>
                  <PortalTextarea
                    value={wiederText}
                    onChange={(e) => setWiederText(e.target.value)}
                    rows={3}
                    placeholder="Was tritt wieder auf?"
                  />
                  <PortalButton
                    variant="primary"
                    type="button"
                    className="mieter-wl-btn mieter-wl-btn--primary"
                    disabled={busy || wiederText.trim().length < 5}
                    onClick={() => void wiederMelden()}
                  >
                    {"Erneut melden"}
                  </PortalButton>
                </>
              ) : (
                <PortalButton
                  variant="primary"
                  type="button"
                  className="mieter-wl-btn mieter-wl-btn--primary"
                  onClick={() => setWiederOffen(true)}
                >
                  {"Ja, erneut melden"}
                </PortalButton>
              )}
            </div>
          </MieterWlCard>
        ) : null}

        {msg ? (
          <p className="text-center text-sm text-[var(--p2-sub)]" role="status">
            {msg}
          </p>
        ) : null}

        <p className="text-fs-meta text-[var(--p2-sub)] leading-relaxed">
          {t.hello_de}
          {firstName}
          {" – "}
          {brand.name}
          {t.keep_updated_de}
        </p>
      </div>
    </MieterWlFrame>
  );
}
