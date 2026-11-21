import { istTeo } from "@/lib/marke";
import { PARTNER_AUTH_COPY } from "@/lib/partner/partner-auth-copy";

type Variant = "login" | "register" | "blocked";

export function PartnerAuthFlowHint({ variant }: { variant: Variant }) {
  // TEO: kein zweiter Erklärtext — Seite/Karte sagt es bereits (ein Satz reicht)
  if (istTeo && variant === "login") return null;
  if (variant === "blocked" && istTeo) {
    return (
      <p className="portal-text-body text-left text-text-secondary">
        Ihr Betrieb ist noch nicht angelegt oder die E-Mail stimmt nicht mit unseren Unterlagen überein.
      </p>
    );
  }
  if (variant === "blocked") {
    return (
      <div className="space-y-3 text-left">
        <p className="portal-text-body text-text-secondary">{PARTNER_AUTH_COPY.blocked.body}</p>
        <ol className="list-decimal space-y-1.5 pl-5 portal-text-meta text-text-secondary">
          {PARTNER_AUTH_COPY.blocked.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    );
  }

  const text =
    variant === "register"
      ? PARTNER_AUTH_COPY.flowSteps
      : PARTNER_AUTH_COPY.loginHint;

  return (
    <p className="rounded-card bg-muted/60 px-3 py-2 portal-text-meta text-text-secondary">
      {text}
    </p>
  );
}
