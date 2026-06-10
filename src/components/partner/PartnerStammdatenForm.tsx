"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { updatePartnerProfil } from "@/app/actions/partner-profil";
import {
  PartnerDetailError,
  PartnerDetailSection,
  PartnerDetailSuccessBox,
} from "@/components/partner/PartnerDetailUi";
import type { PartnerHandwerkerProfil } from "@/lib/partner/get-partner-data";

const inputClass =
  "w-full rounded-xl border border-border-default bg-surface-card px-3 py-2.5 portal-text-body text-text-primary outline-none focus:border-accent";

export function PartnerStammdatenForm({ handwerker }: { handwerker: PartnerHandwerkerProfil }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    const res = await updatePartnerProfil(fd);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <PartnerDetailSection title="Stammdaten">
      <p className="portal-text-meta -mt-1 text-text-secondary">
        Diese Angaben nutzt Bärenwald für Verträge, Abrechnung und die Kommunikation mit dir.
        Gewerke werden vom Team gepflegt.
      </p>

      {handwerker.gewerkNamen.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {handwerker.gewerkNamen.map((name) => (
            <span key={name} className="tag bg-muted text-text-secondary">
              {name}
            </span>
          ))}
        </div>
      ) : null}

      <form id="partner-stammdaten" onSubmit={onSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 sm:col-span-2">
            <span className="portal-text-meta font-medium text-text-secondary">
              Ansprechpartner *
            </span>
            <input
              name="name"
              required
              defaultValue={handwerker.name}
              className={inputClass}
              autoComplete="name"
            />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="portal-text-meta font-medium text-text-secondary">Firma</span>
            <input
              name="firma"
              defaultValue={handwerker.firma ?? ""}
              className={inputClass}
              autoComplete="organization"
            />
          </label>
          <label className="block space-y-1">
            <span className="portal-text-meta font-medium text-text-secondary">Telefon *</span>
            <input
              name="telefon"
              required
              type="tel"
              defaultValue={handwerker.telefon ?? ""}
              className={inputClass}
              autoComplete="tel"
            />
          </label>
          <label className="block space-y-1">
            <span className="portal-text-meta font-medium text-text-secondary">WhatsApp</span>
            <input
              name="whatsapp"
              type="tel"
              defaultValue={handwerker.whatsapp ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="portal-text-meta font-medium text-text-secondary">E-Mail</span>
            <input
              value={handwerker.email ?? ""}
              readOnly
              disabled
              className={cnDisabled(inputClass)}
              title="E-Mail ist an dein Login gebunden"
            />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="portal-text-meta font-medium text-text-secondary">Webseite</span>
            <input
              name="webseite"
              type="url"
              defaultValue={handwerker.webseite ?? ""}
              className={inputClass}
              placeholder="https://"
            />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="portal-text-meta font-medium text-text-secondary">Adresse</span>
            <input
              name="adresse"
              defaultValue={handwerker.adresse ?? ""}
              className={inputClass}
              autoComplete="street-address"
            />
          </label>
          <label className="block space-y-1">
            <span className="portal-text-meta font-medium text-text-secondary">Steuernummer</span>
            <input
              name="steuernummer"
              defaultValue={handwerker.steuernummer ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block space-y-1">
            <span className="portal-text-meta font-medium text-text-secondary">USt-IdNr.</span>
            <input name="ustid" defaultValue={handwerker.ustid ?? ""} className={inputClass} />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="portal-text-meta font-medium text-text-secondary">IBAN</span>
            <input
              name="iban"
              defaultValue={handwerker.iban ?? ""}
              className={inputClass}
              autoComplete="off"
            />
          </label>
        </div>

        {error ? <PartnerDetailError message={error} /> : null}
        {success ? (
          <PartnerDetailSuccessBox>Stammdaten gespeichert.</PartnerDetailSuccessBox>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="btn-pill-primary portal-btn w-full sm:w-auto !px-6 !py-3"
        >
          {loading ? "Wird gespeichert…" : "Stammdaten speichern"}
        </button>
      </form>
    </PartnerDetailSection>
  );
}

function cnDisabled(base: string): string {
  return `${base} cursor-not-allowed opacity-70`;
}
