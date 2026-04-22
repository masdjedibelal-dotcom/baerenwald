"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";

import { PageLayout } from "@/components/layout/PageLayout";
import { CTAButton } from "@/components/ui/CTAButton";
import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { CTA } from "@/lib/cta-config";
import { SITE_CONFIG } from "@/lib/config";
import type { Situation as FunnelSituation } from "@/lib/funnel/types";
import { HOME_FAQ_ITEMS, HOME_TESTIMONIALS } from "@/lib/home-content";
import { LEISTUNGEN, leistungHref } from "@/lib/routes";
import { buildSearchUrl } from "@/lib/search";
import { SITUATION_OPTIONS } from "@/lib/situation-options";
import type { Situation as MarketingSituation } from "@/lib/types";
import { cn } from "@/lib/utils";

import { FaqAccordion } from "./FaqAccordion";

const tel = SITE_CONFIG.phone.replace(/\s/g, "");

function rechnerSituationParam(id: MarketingSituation): FunnelSituation {
  const m: Record<MarketingSituation, FunnelSituation> = {
    renovierung: "erneuern",
    neubau: "neubauen",
    akut: "notfall",
    pflege: "betreuung",
    b2b: "gewerbe",
  };
  return m[id];
}

const HERO_CHIPS: (
  | { label: string; situation: FunnelSituation; notfall?: boolean; leistung?: undefined }
  | { label: string; leistung: string; situation?: undefined; notfall?: boolean }
)[] = [
  { label: "Wohnung streichen", situation: "erneuern" },
  { label: "Neues Bad", leistung: "badezimmer-sanierung" },
  { label: "Heizung tauschen", situation: "erneuern" },
  { label: "Gartenpflege", situation: "betreuung" },
  { label: "Neuer Boden", situation: "erneuern" },
  { label: "Dringend — Notfall", situation: "notfall", notfall: true },
];

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconStar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function IconDoc({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h6M8 13h8M8 17h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconNetwork({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5" cy="18" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="19" cy="18" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7v4M7.5 16.5l3-2M16.5 16.5l-3-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function HomeLanding() {
  const router = useRouter();
  const [searchQ, setSearchQ] = useState("");

  const submitSearch = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      const raw = searchQ;
      const t = raw.trim().slice(0, 80);
      if (raw.length > 0 && t.length === 0) return;
      if (t.length === 0) {
        router.push("/rechner");
        return;
      }
      router.push(buildSearchUrl(t));
    },
    [router, searchQ]
  );

  return (
    <PageLayout>
      {/* Section 1 — Hero */}
      <section className="relative min-h-[90vh] overflow-hidden bg-surface-dark text-white">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, rgba(46,125,82,0.08) 0%, transparent 60%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto flex min-h-[90vh] w-full max-w-[1200px] flex-col items-center px-6 py-20 lg:flex-row lg:items-center">
          <div className="w-full flex-1 lg:max-w-[60%]">
            <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.15em] text-accent">
              München &amp; Umgebung · Meisterbetriebe
            </p>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-white lg:text-6xl">
              Was suchst du?
            </h1>
            <p className="mt-1 font-display text-5xl italic leading-[1.05] text-accent lg:text-6xl">
              Wir kümmern uns darum.
            </p>
            <p className="mt-2 text-xs text-white/60">{CTA.heroSub}</p>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/60">
              Beschreib einfach was du brauchst — wir zeigen dir was es kostet und
              organisieren alles weitere.
            </p>

            <form className="mt-8 max-w-xl" onSubmit={submitSearch}>
              <div className="relative">
                <input
                  type="text"
                  name="q"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value.slice(0, 80))}
                  placeholder="Leistungsname exakt wie in den Vorschlägen, z. B. Neues Bad …"
                  maxLength={80}
                  inputMode="search"
                  enterKeyHint="search"
                  className="w-full rounded-2xl border-0 bg-surface-card py-4 pl-5 pr-36 text-base text-text-primary shadow-[0_0_0_1px_rgba(255,255,255,0.1)] outline-none transition-shadow placeholder:text-text-tertiary focus:shadow-[0_0_0_2px_rgba(46,125,82,0.4)]"
                  aria-label={CTA.hero}
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 sm:px-5"
                >
                  <span>Suchen</span>
                  <ArrowRight className="size-4 shrink-0" aria-hidden />
                </button>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs text-white/40">Oft gesucht:</span>
              {HERO_CHIPS.map((c) => (
                <Link
                  key={c.label}
                  href={
                    "leistung" in c && c.leistung
                      ? `/rechner?leistung=${encodeURIComponent(c.leistung)}`
                      : `/rechner?situation=${(c as { situation: FunnelSituation }).situation}`
                  }
                  className={cn(
                    "cursor-pointer rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/60 transition hover:border-white/30 hover:text-white/70",
                    c.notfall &&
                      "border-red-500/30 text-red-400/60 hover:border-red-500/50 hover:text-red-400"
                  )}
                >
                  {c.label}
                </Link>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-white/35">
              <span>✓ Kostenlos &amp; unverbindlich</span>
              <span>✓ Festpreisangebot</span>
              <span>✓ Meisterbetriebe</span>
              <span>✓ Antwort innerhalb 24h</span>
            </div>

            <a
              href={`tel:${tel}`}
              className="mt-6 inline-flex text-sm text-white/35 transition hover:text-white/70"
            >
              {CTA.call}
            </a>
          </div>

          <div className="mt-12 hidden w-full flex-1 justify-center pl-0 lg:mt-0 lg:flex lg:max-w-[40%] lg:pl-8">
            <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-sm">
              <p className="mb-5 text-sm font-semibold text-white/70">
                So läuft es ab
              </p>
              <ol className="space-y-4">
                {[
                  ["1", "Beschreib was du brauchst"],
                  ["2", "Wir berechnen den Preisrahmen"],
                  ["3", "Kostenloser Termin vor Ort"],
                ].map(([num, text]) => (
                  <li key={num} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                      {num}
                    </span>
                    <span className="text-sm text-white/60">{text}</span>
                  </li>
                ))}
              </ol>
              <div className="my-3 border-t border-white/[0.06]" />
              <p className="text-center text-xs text-white/30">
                4,9 ★ · 500+ Projekte · München
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 */}
      <SectionWrapper bg="white" className="py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-funnel-accent">
            Das kennt jeder
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-text-primary lg:text-4xl">
            Drei Handwerker koordinieren kostet Zeit, Nerven und Geld.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-text-secondary">
            Wer renoviert braucht Maler, Bodenleger, Elektriker — und verbringt
            Stunden damit alles abzustimmen. Bärenwald übernimmt die
            Koordination. Ein Ansprechpartner, wir kümmern uns um alle Handwerker, eine Rechnung.
          </p>
        </div>
        <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
          {[
            {
              Icon: IconCalendar,
              title: "Ein Termin reicht",
              text: "Kein Abstimmen mit mehreren Betrieben. Ein Vor-Ort-Termin, wir kümmern uns um alles.",
            },
            {
              Icon: IconStar,
              title: "Geprüfte Meisterbetriebe",
              text: "Wir arbeiten nur mit zertifizierten Fachbetrieben aus München und Umgebung.",
            },
            {
              Icon: IconDoc,
              title: "Eine Rechnung",
              text: "Kein Papierchaos mit mehreren Rechnungen. Alles läuft über Bärenwald.",
            },
          ].map((c) => (
            <div key={c.title} className="text-center md:text-left">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-funnel-accent/15 text-funnel-accent md:mx-0">
                <c.Icon className="size-8" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-text-primary">
                {c.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {c.text}
              </p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Section 3 */}
      <SectionWrapper bg="white" className="bg-surface-page py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold text-text-primary lg:text-4xl">
            So einfach geht&apos;s
          </h2>
        </div>
        <div className="mt-16 grid gap-12 lg:grid-cols-3 lg:gap-8">
          {[
            {
              n: "01",
              title: "Preisrechner ausfüllen",
              text: "In 2 Minuten dein Vorhaben beschreiben und einen realistischen Preisrahmen erhalten. Kostenlos und unverbindlich.",
            },
            {
              n: "02",
              title: "Kostenloser Vor-Ort-Termin",
              text: "Wir kommen zu dir, schauen uns alles an und erstellen ein genaues Angebot. Kein Auftragszwang.",
            },
            {
              n: "03",
              title: "Wir koordinieren alles",
              text: "Du lehnst dich zurück. Wir koordinieren Termine, Handwerker und Materialien. Du bekommst am Ende eine Rechnung.",
            },
          ].map((s) => (
            <div key={s.n} className="relative text-center lg:text-left">
              <p className="font-display text-6xl font-bold leading-none text-funnel-accent/20">
                {s.n}
              </p>
              <h3 className="mt-4 font-display text-xl font-bold text-text-primary">
                {s.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                {s.text}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-12 flex justify-center">
          <CTAButton
            href="/rechner"
            label={CTA.section}
            variant="primary"
            className="px-8 py-4 text-base"
          />
        </div>
      </SectionWrapper>

      {/* Section 4 */}
      <section className="bg-funnel-accent py-16 text-white">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {[
            { num: "12+", label: "Leistungen aus einer Hand" },
            { num: "500+", label: "Abgeschlossene Projekte" },
            { num: "4,9", label: "Sterne bei Google" },
            { num: "48h", label: "Reaktionszeit garantiert" },
          ].map((k) => (
            <div key={k.label} className="text-center">
              <p className="font-display text-4xl font-bold text-white">{k.num}</p>
              <p className="mt-1 text-sm text-white/70">{k.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 5 — Leistungen */}
      <SectionWrapper id="leistungen" bg="white" className="py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold text-text-primary">
            Handwerksleistungen aus einer Hand
          </h2>
          <p className="mt-3 text-text-secondary">
            Von der Einzelreparatur bis zur Komplettsanierung — wir koordinieren
            alles.
          </p>
        </div>
        <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LEISTUNGEN.map((l) => (
            <li key={l.slug}>
              <Link
                href={leistungHref(l.slug)}
                className="group relative flex h-full flex-col rounded-2xl border border-border-default p-5 transition hover:border-funnel-accent hover:shadow-sm"
              >
                <span className="text-3xl" aria-hidden>
                  {l.icon}
                </span>
                <span className="mt-3 font-semibold text-text-primary">{l.label}</span>
                <span className="mt-1 text-xs text-text-secondary">{l.kurz}</span>
                <span className="mt-4 text-right text-lg font-bold text-funnel-accent opacity-0 transition group-hover:opacity-100">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-center">
          <a
            href="#leistungen"
            className="text-sm font-medium text-funnel-accent hover:underline"
          >
            Alle Leistungen ansehen →
          </a>
        </p>
      </SectionWrapper>

      {/* Section 6 */}
      <section className="bg-surface-dark py-24 text-white">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-6 lg:grid-cols-2 lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-funnel-accent">
              Warum Bärenwald
            </p>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-white">
              Handwerk wie es sein soll.
            </h2>
            <p className="mt-4 text-white/70">
              Seit Jahren vertrauen Münchner Haushalte auf unsere Betriebe.
            </p>
            <div className="mt-8">
              <CTAButton
                href="/rechner"
                label={CTA.section}
                variant="primary"
                className="px-8 py-4 text-base"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                Icon: IconShield,
                title: "Kein Auftragszwang",
                text: "Kostenlose Erstberatung und unverbindliches Angebot.",
              },
              {
                Icon: IconUsers,
                title: "Meisterbetriebe",
                text: "Nur geprüfte Fachbetriebe aus München.",
              },
              {
                Icon: IconTag,
                title: "Festpreisangebot",
                text: "Kein böses Erwachen — Preis steht vor Auftragsbeginn fest.",
              },
              {
                Icon: IconNetwork,
                title: "Koordination inklusive",
                text: "Wir kümmern uns um alle Handwerker. Du brauchst nur einen Ansprechpartner.",
              },
            ].map((u) => (
              <div
                key={u.title}
                className="rounded-xl bg-surface-card/5 p-5"
              >
                <u.Icon className="size-6 text-white" />
                <p className="mt-3 text-sm font-semibold text-white">{u.title}</p>
                <p className="mt-1 text-xs text-white/60">{u.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 7 */}
      <SectionWrapper bg="white" className="bg-surface-page py-24">
        <h2 className="text-center font-display text-3xl font-bold text-text-primary">
          Was planst du?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-text-secondary">
          Wähle dein Vorhaben und starte direkt in den Rechner.
        </p>
        <ul className="mx-auto mt-12 grid max-w-[900px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SITUATION_OPTIONS.map((s) => (
            <li key={s.id}>
              <Link
                href={`/rechner?situation=${rechnerSituationParam(s.id)}`}
                className="group flex h-full flex-col rounded-2xl border border-border-default bg-surface-card p-6 transition hover:border-funnel-accent"
              >
                <span className="font-semibold text-text-primary">{s.label}</span>
                <span className="mt-1 text-sm text-text-secondary">{s.hint}</span>
                <span className="mt-4 font-bold text-funnel-accent">→</span>
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/rechner"
              className="group flex h-full flex-col rounded-2xl border border-dashed border-border-default bg-surface-card p-6 transition hover:border-funnel-accent"
            >
              <span className="font-semibold text-text-primary">Individuell</span>
              <span className="mt-1 text-sm text-text-secondary">
                Direkt beschreiben was du brauchst
              </span>
              <span className="mt-4 font-bold text-funnel-accent">→</span>
            </Link>
          </li>
        </ul>
      </SectionWrapper>

      {/* Section 8 */}
      <SectionWrapper bg="white" className="py-24">
        <h2 className="text-center font-display text-3xl font-bold text-text-primary">
          Was unsere Kunden sagen
        </h2>
        <ul className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
          {HOME_TESTIMONIALS.map((t, i) => (
            <li
              key={i}
              className="rounded-2xl border border-border-default p-6"
            >
              <div className="text-sm text-amber-400" aria-hidden>
                {"★".repeat(5)}
              </div>
              <p className="mt-3 text-base italic leading-relaxed text-text-secondary">
                {t.quote}
              </p>
              <p className="mt-4 text-sm font-semibold text-text-primary">{t.who}</p>
            </li>
          ))}
        </ul>
      </SectionWrapper>

      {/* Section 9 */}
      <SectionWrapper bg="white" className="bg-surface-page py-24">
        <h2 className="text-center font-display text-3xl font-bold text-text-primary">
          Häufige Fragen
        </h2>
        <div className="mt-10">
          <FaqAccordion items={HOME_FAQ_ITEMS} />
        </div>
      </SectionWrapper>

      {/* Section 10 */}
      <section className="bg-funnel-accent py-24 text-center text-white">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="font-display text-4xl font-bold tracking-tight text-white">
            Bereit für dein Projekt?
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Kostenlosen Preisrahmen in 2 Minuten berechnen — unverbindlich und
            ohne Anmeldung.
          </p>
          <Link
            href="/rechner"
            className={cn(
              "mt-8 inline-flex items-center justify-center rounded-full bg-surface-card px-10 py-4",
              "text-base font-bold text-funnel-accent transition hover:bg-surface-card/90"
            )}
          >
            {CTA.final}
          </Link>
          <p className="mt-4 text-xs text-white/60">
            Kein Auftragszwang · Kostenlos · Antwort innerhalb 24h
          </p>
        </div>
      </section>
    </PageLayout>
  );
}
