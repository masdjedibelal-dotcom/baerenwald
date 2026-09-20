"use client";

import { PortalIcon } from "@/components/portal/PortalIcon";
import { useState } from "react";

type Props = {
  label: string;
  items: string[];
  baseline?: string;
};

/** Ein gemeinsamer Aufklapp-Block unter dem Karten-Grid — nicht pro Karte. */
export function PlanLeistungenDetail({ label, items, baseline }: Props) {
  const [open, setOpen] = useState(false);

  if (!items.length && !baseline) return null;

  return (
    <div className="conversion-plan-detail">
      {baseline ? <p className="conversion-plan-baseline">{baseline}</p> : null}
      {items.length > 0 ? (
        <>
          <button
            type="button"
            className="conversion-plan-detail-toggle"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <span>{open ? "Weniger anzeigen" : label}</span>
            <PortalIcon n="chevron-down" ctx="default" size={18} className={`conversion-plan-detail-icon${open ? " conversion-plan-detail-icon--open" : ""}`} aria-hidden />
          </button>
          {open ? (
            <ul className="conversion-plan-detail-list">
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
