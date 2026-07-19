"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { buildMeldeQrUrl } from "@/lib/org/melde-url";
import type { OrganisationObjekt } from "@/lib/org/types";
import {
  formatPortalEinladenFootnote,
  PORTAL_EINLADEN_COPY,
  PORTAL_EINLADEN_MAIL,
  PORTAL_EINLADEN_QR,
  PORTAL_EINLADEN_QR_HIDE,
  PORTAL_EINLADEN_SUBTITLE,
  PORTAL_EINLADEN_TITLE,
} from "@/lib/portal2/modal-einladen";
import { buildPortalEinladungMailto } from "@/lib/portal2/portal-einladungen";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";

export type PortalModalEinladenProps = {
  open?: boolean;
  onClose: () => void;
  orgKennung: string;
  objekte: OrganisationObjekt[];
  /** Vorauswahl */
  initialObjektId?: string | null;
  orgAnzeigename?: string | null;
};

type EinheitOpt = { id: string; bezeichnung: string };

/**
 * Mock `modalEinladen()` + E4 Token-Link.
 * Primär: teilbarer Registrierungs-Link + QR; Mail nur mailto (HV-Branding, nie BW-Absender).
 */
export function PortalModalEinladen({
  open = true,
  onClose,
  orgKennung,
  objekte,
  initialObjektId,
  orgAnzeigename,
}: PortalModalEinladenProps) {
  const kennung = orgKennung.trim().toLowerCase();
  const [objektId, setObjektId] = useState(
    () => initialObjektId?.trim() || objekte[0]?.id || ""
  );
  const [einheiten, setEinheiten] = useState<EinheitOpt[]>([]);
  const [einheitId, setEinheitId] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const objekt = useMemo(
    () => objekte.find((o) => o.id === objektId) ?? null,
    [objekte, objektId]
  );

  const objektLabel =
    objekt?.titel?.trim() ||
    [objekt?.strasse, objekt?.hausnummer].filter(Boolean).join(" ") ||
    "Objekt";

  const einheitLabel =
    einheiten.find((e) => e.id === einheitId)?.bezeichnung?.trim() || null;

  const hvName = orgAnzeigename?.trim() || "Ihre Hausverwaltung";

  const loadEinheiten = useCallback(async (oid: string) => {
    if (!oid) {
      setEinheiten([]);
      setEinheitId("");
      return;
    }
    const res = await fetch(
      `/api/org/objekte/einheiten?objektId=${encodeURIComponent(oid)}`
    );
    const json = (await res.json()) as { einheiten?: EinheitOpt[] };
    const list = json.einheiten ?? [];
    setEinheiten(list);
    setEinheitId(list[0]?.id ?? "");
  }, []);

  const createInvite = useCallback(
    async (oid: string, eid: string, ref: string | null) => {
      if (!oid) return;
      setBusy(true);
      setLink("");
      try {
        const res = await fetch("/api/org/portal-einladungen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            objektId: oid,
            einheitId: eid || null,
            einheitRef: ref,
          }),
        });
        const json = (await res.json()) as { error?: string; url?: string };
        if (!res.ok || !json.url) {
          portalToastError(
            "Einladung nicht erstellt",
            json.error ??
              "Migration noch nicht freigegeben oder Serverfehler."
          );
          return;
        }
        setLink(json.url);
        setQrOpen(true);
      } finally {
        setBusy(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!open) {
      setQrOpen(false);
      setCopied(false);
      setLink("");
      return;
    }
    const nextId = initialObjektId?.trim() || objekte[0]?.id || "";
    setObjektId(nextId);
    void loadEinheiten(nextId);
  }, [open, initialObjektId, objekte, loadEinheiten]);

  useEffect(() => {
    if (!open || !objektId) return;
    void createInvite(objektId, einheitId, null);
  }, [open, objektId, einheitId, createInvite]);

  const footnote = formatPortalEinladenFootnote(
    einheitLabel ? `${objektLabel} · ${einheitLabel}` : objektLabel
  );
  const qrSrc = link ? buildMeldeQrUrl(link) : "";

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      orgPortalToast.linkKopiert();
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      portalToastError("Kopieren fehlgeschlagen");
    }
  }

  return (
    <PortalModalShell
      open={open}
      title={PORTAL_EINLADEN_TITLE}
      subtitle={PORTAL_EINLADEN_SUBTITLE}
      onClose={onClose}
    >
      {!kennung ? (
        <p className="portal-einladen-warn">
          Melde-Kennung fehlt. Bitte Bärenwald kontaktieren — danach können
          Links geteilt werden.
        </p>
      ) : objekte.length === 0 ? (
        <p className="portal-einladen-warn">
          Bitte zuerst ein Objekt anlegen.
        </p>
      ) : (
        <div className="portal-einladen-body">
          <label className="portal-einladen-label">
            Objekt
            <select
              className="portal-einladen-select"
              value={objektId}
              onChange={(e) => {
                const id = e.target.value;
                setObjektId(id);
                setLink("");
                setQrOpen(false);
                void loadEinheiten(id);
              }}
            >
              {objekte.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.titel}
                </option>
              ))}
            </select>
          </label>

          <label className="portal-einladen-label">
            Einheit (optional)
            <select
              className="portal-einladen-select"
              value={einheitId}
              onChange={(e) => {
                setEinheitId(e.target.value);
                setLink("");
              }}
            >
              <option value="">Ganzes Objekt</option>
              {einheiten.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.bezeichnung}
                </option>
              ))}
            </select>
          </label>

          <div className="portal-einladen-row">
            <input
              className="portal-einladen-input"
              readOnly
              value={busy ? "Link wird erzeugt…" : link}
              aria-label="Einladungs-Link"
              placeholder={
                busy ? undefined : "Link erscheint nach Erzeugung"
              }
            />
            <button
              type="button"
              className="portal-einladen-copy"
              onClick={() => void copyLink()}
              disabled={!link || busy}
            >
              {copied ? "Kopiert" : PORTAL_EINLADEN_COPY}
            </button>
          </div>

          <div className="portal-einladen-actions">
            <a
              className="portal-einladen-secondary"
              href={
                link
                  ? buildPortalEinladungMailto({
                      link,
                      hvName,
                      objektLabel,
                      einheitRef: einheitLabel,
                    })
                  : undefined
              }
              aria-disabled={!link}
              onClick={(e) => {
                if (!link) e.preventDefault();
              }}
            >
              {PORTAL_EINLADEN_MAIL}
            </a>
            <button
              type="button"
              className="portal-einladen-secondary"
              disabled={!link}
              onClick={() => setQrOpen((v) => !v)}
            >
              {qrOpen ? PORTAL_EINLADEN_QR_HIDE : PORTAL_EINLADEN_QR}
            </button>
            <button
              type="button"
              className="portal-einladen-secondary"
              disabled={busy || !objektId}
              onClick={() =>
                void createInvite(
                  objektId,
                  einheitId,
                  einheitLabel
                )
              }
            >
              Neu erzeugen
            </button>
          </div>

          {qrOpen && qrSrc ? (
            <div className="portal-einladen-qr">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt={`QR-Code Einladung ${objektLabel}`}
                width={200}
                height={200}
              />
            </div>
          ) : null}

          <p className="portal-einladen-footnote">{footnote}</p>
          <p className="portal-einladen-footnote" style={{ marginTop: 6 }}>
            Mail nur über Ihr E-Mail-Programm (HV-Absender) — niemals über
            Bärenwald.
          </p>
        </div>
      )}
    </PortalModalShell>
  );
}
