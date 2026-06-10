"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Calculator,
  ChevronRight,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  handleGuidedInputBlur,
  handleGuidedInputFocus,
  scrollGuidedBlockIntoView,
} from "@/lib/gpt-viz/scroll-guided-into-view";

import { SituationCard } from "@/components/funnel/SituationCard";
import { SelectionTile } from "@/components/funnel/SelectionTile";
import type { GptChatBlock, GuidedDecisionOption } from "@/lib/guided-chat/types";
import type { GptLeadDraft } from "@/lib/gpt-viz/lead-collect";
import { cn } from "@/lib/utils";

import { ChatLeadForm } from "./ChatLeadForm";
import { ChatPriceCard } from "./ChatPriceCard";

const JOURNEY_ENTRY = [
  {
    id: "journey_beraten",
    label: "Beraten lassen",
    hint: "Ablauf, Gewerke und Ideen.",
    icon: MessageCircle,
  },
  {
    id: "journey_viz",
    label: "Raum visualisieren",
    hint: "Foto hochladen, Wunschraum sehen.",
    icon: Sparkles,
  },
  {
    id: "journey_preis",
    label: "Preis berechnen",
    hint: "Unverbindlicher Rahmen.",
    icon: Calculator,
  },
  {
    id: "journey_anfrage",
    label: "Anfrage senden",
    hint: "Direkt an Bärenwald.",
    icon: Send,
  },
] as const;

type ChatGuidedBlocksProps = {
  blocks: GptChatBlock[];
  onAction: (actionId: string) => void;
  onLeadSubmit?: (draft: GptLeadDraft) => void;
  disabled?: boolean;
};

export function ChatGuidedBlocks({
  blocks,
  onAction,
  onLeadSubmit,
  disabled,
}: ChatGuidedBlocksProps) {
  return (
    <div className="gpt-guided-blocks gpt-guided-root">
      {blocks.map((block, i) => (
        <GuidedBlock
          key={`${block.type}-${i}`}
          block={block}
          onAction={onAction}
          onLeadSubmit={onLeadSubmit}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function GuidedBlock({
  block,
  onAction,
  onLeadSubmit,
  disabled,
}: {
  block: GptChatBlock;
  onAction: (id: string) => void;
  onLeadSubmit?: (draft: GptLeadDraft) => void;
  disabled?: boolean;
}) {
  switch (block.type) {
    case "journey_entry":
      return (
        <div className="gpt-guided-journey-grid gpt-guided-journey-grid--compact">
          {JOURNEY_ENTRY.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={disabled}
                className="gpt-guided-journey-card"
                onClick={() => onAction(opt.id)}
              >
                <span className="gpt-guided-journey-icon-wrap" aria-hidden>
                  <Icon />
                </span>
                <span className="gpt-guided-journey-body">
                  <span className="gpt-guided-journey-title">{opt.label}</span>
                  <span className="gpt-guided-journey-hint">{opt.hint}</span>
                </span>
                <span className="gpt-guided-journey-chevron" aria-hidden>
                  <ChevronRight />
                </span>
              </button>
            );
          })}
        </div>
      );

    case "decision":
      return (
        <DecisionBlock block={block} onAction={onAction} disabled={disabled} />
      );

    case "plz_input":
      return <PlzBlock prefill={block.prefill} onAction={onAction} disabled={disabled} />;

    case "price_card":
      return (
        <ChatPriceCard
          result={block.result}
          draft={block.draft}
          disabled={disabled}
          onAnfrage={() => onAction("lead_start")}
          onAnpassen={() => onAction("guided_anpassen")}
        />
      );

    case "lead_form":
      return (
        <ChatLeadForm
          prefillPlz={block.prefillPlz}
          projectSummary={block.projectSummary}
          disabled={disabled}
          onSubmit={(draft) => onLeadSubmit?.(draft)}
        />
      );

    case "summary":
      return (
        <div className="gpt-guided-summary">
          {block.items.map((item) => (
            <span key={item.label} className="gpt-guided-summary-chip">
              <strong>{item.label}</strong> {item.value}
            </span>
          ))}
        </div>
      );

    case "primary_cta":
      return (
        <button
          type="button"
          disabled={disabled}
          className={
            block.variant === "outline"
              ? "gpt-guided-outline-btn"
              : "gpt-guided-primary-btn"
          }
          onClick={() => onAction(block.actionId)}
        >
          {block.label}
        </button>
      );

    case "viz_limit":
      return (
        <div className="gpt-guided-viz-limit">
          <p className="gpt-guided-viz-limit-text">
            {block.reason === "needs_lead"
              ? "Deine kostenlose Visualisierung ist genutzt. Sende dein Projekt — dann kannst du noch zweimal anpassen."
              : block.reason === "portal_monthly"
                ? "Dein monatliches Visualisierungs-Kontingent im Portal ist aufgebraucht."
                : "Für weitere Visualisierungen registriere dich kostenlos im Portal."}
          </p>
          <div className="gpt-guided-viz-limit-actions">
            {block.reason === "needs_lead" ? (
              <button
                type="button"
                disabled={disabled}
                className="gpt-guided-primary-btn"
                onClick={() => onAction("lead_start")}
              >
                Projekt senden — 2× anpassen
              </button>
            ) : null}
            {block.reason !== "portal_monthly" ? (
              <Link
                href={block.portalRegisterUrl}
                className="gpt-guided-outline-btn gpt-guided-viz-limit-portal"
              >
                Kostenlos im Portal registrieren
              </Link>
            ) : null}
          </div>
        </div>
      );

    case "viz_decision":
      return (
        <div className="gpt-guided-decision gpt-guided-decision--viz">
          <p className="gpt-guided-decision-q">{block.question.question}</p>
          {block.question.hint ? (
            <p className="gpt-guided-decision-hint">{block.question.hint}</p>
          ) : null}
          <div className="gpt-guided-viz-options">
            {block.question.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={disabled}
                className="gpt-guided-viz-option"
                onClick={() =>
                  onAction(
                    `viz_answer|${block.question.id}|${opt.id}|${encodeURIComponent(opt.label)}`
                  )
                }
              >
                <span className="gpt-guided-viz-option-label">{opt.label}</span>
                {opt.hint ? (
                  <span className="gpt-guided-viz-option-hint">{opt.hint}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}

function DecisionBlock({
  block,
  onAction,
  disabled,
}: {
  block: Extract<GptChatBlock, { type: "decision" }>;
  onAction: (id: string) => void;
  disabled?: boolean;
}) {
  const layout = block.layout ?? "default";
  const isSituation = block.field === "situation" && layout === "default";

  if (layout === "chip") {
    return (
      <div className="gpt-guided-decision gpt-guided-decision--chip">
        {block.question ? (
          <p className="gpt-guided-decision-q">{block.question}</p>
        ) : null}
        {block.hint ? <p className="gpt-guided-decision-hint">{block.hint}</p> : null}
        <ChipRow
          field={block.field}
          options={block.options}
          disabled={disabled}
          onAction={onAction}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "gpt-guided-decision",
        layout === "compact" && "gpt-guided-decision--compact"
      )}
    >
      {block.question ? (
        <p className="gpt-guided-decision-q">{block.question}</p>
      ) : null}

      {isSituation ? (
        <div className="gpt-guided-situation-grid">
          {block.options.map((opt) => (
            <GuidedSituationOption
              key={opt.value}
              opt={opt}
              field={block.field}
              disabled={disabled}
              onAction={onAction}
            />
          ))}
        </div>
      ) : (
        <div className="gpt-guided-tile-grid gpt-guided-tile-grid--compact">
          {block.options.map((opt) => (
            <SelectionTile
              key={opt.value}
              option={{
                value: opt.value,
                label: opt.label,
                hint: opt.hint,
                icon: opt.icon,
                emoji: opt.emoji,
              }}
              icon={<TileIcon icon={opt.icon} emoji={opt.emoji} />}
              selected={false}
              multi={false}
              onChange={() => {
                if (!disabled) onAction(`guided:${block.field}:${opt.value}`);
              }}
              className="gpt-guided-tile gpt-guided-tile--compact"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChipRow({
  field,
  options,
  disabled,
  onAction,
}: {
  field: string;
  options: GuidedDecisionOption[];
  disabled?: boolean;
  onAction: (id: string) => void;
}) {
  return (
    <div className="gpt-guided-chip-scroll" role="group">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          className="gpt-guided-chip"
          title={opt.hint}
          onClick={() => onAction(`guided:${field}:${opt.value}`)}
        >
          {opt.emoji ? (
            <span className="gpt-guided-chip-emoji" aria-hidden>
              {opt.emoji}
            </span>
          ) : null}
          <span className="gpt-guided-chip-label">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

function GuidedSituationOption({
  opt,
  field,
  disabled,
  onAction,
}: {
  opt: GuidedDecisionOption;
  field: string;
  disabled?: boolean;
  onAction: (id: string) => void;
}) {
  const iconNode = opt.icon ? (
    <Image
      src={`/icons/${opt.icon}.svg`}
      alt=""
      width={22}
      height={22}
      className="h-[22px] w-[22px]"
    />
  ) : (
    <span className="text-lg" aria-hidden>
      🏠
    </span>
  );

  return (
    <SituationCard
      option={{
        value: opt.value,
        label: opt.label,
        hint: opt.hint ?? "",
        tag: opt.tag,
        tagType: opt.tagType,
      }}
      icon={iconNode}
      watermarkIcon={iconNode}
      selected={false}
      onClick={() => {
        if (!disabled) onAction(`guided:${field}:${opt.value}`);
      }}
      className="gpt-guided-situation-card"
    />
  );
}

function TileIcon({ icon, emoji }: { icon?: string; emoji?: string }): ReactNode {
  if (icon) {
    return (
      <Image
        src={`/icons/${icon}.svg`}
        alt=""
        width={24}
        height={24}
        className="h-6 w-6"
      />
    );
  }
  if (emoji) {
    return (
      <span className="text-lg leading-none" aria-hidden>
        {emoji}
      </span>
    );
  }
  return null;
}

function PlzBlock({
  prefill,
  onAction,
  disabled,
}: {
  prefill?: string;
  onAction: (id: string) => void;
  disabled?: boolean;
}) {
  const [plz, setPlz] = useState(prefill ?? "");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollGuidedBlockIntoView(rootRef.current);
  }, []);

  return (
    <div ref={rootRef} className="gpt-guided-plz">
      <label className="gpt-guided-plz-label" htmlFor="guided-plz-input">
        Postleitzahl
      </label>
      <div className="gpt-guided-plz-row">
        <input
          id="guided-plz-input"
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          value={plz}
          disabled={disabled}
          placeholder="80331"
          className="gpt-guided-plz-input"
          onChange={(e) => setPlz(e.target.value.replace(/\D/g, "").slice(0, 5))}
          onFocus={() => handleGuidedInputFocus(rootRef.current)}
          onBlur={() => handleGuidedInputBlur(rootRef.current)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && plz.length === 5) {
              onAction(`guided:plz:${plz}`);
            }
          }}
        />
        <button
          type="button"
          className="gpt-guided-primary-btn gpt-guided-plz-btn"
          disabled={disabled || plz.length !== 5}
          onClick={() => onAction(`guided:plz:${plz}`)}
        >
          Weiter
        </button>
      </div>
    </div>
  );
}
