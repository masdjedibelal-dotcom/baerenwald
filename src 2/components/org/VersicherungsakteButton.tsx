"use client";

import { FileText } from "lucide-react";

/** Versicherungsakte-Download im Vorgangs-Detail */
export function VersicherungsakteButton({ auftragId }: { auftragId: string }) {
  return (
    <a
      href={`/api/org/versicherungsakte?auftragId=${encodeURIComponent(auftragId)}`}
      className="inline-flex items-center gap-2 rounded-lg border border-border-default px-3 py-2 text-sm font-medium text-accent hover:bg-accent-light/40"
      target="_blank"
      rel="noopener noreferrer"
    >
      <FileText className="h-4 w-4" />
      Versicherungsakte (PDF)
    </a>
  );
}
