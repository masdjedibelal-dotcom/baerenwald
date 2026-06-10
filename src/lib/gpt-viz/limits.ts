import { GPT_VIZ_LIMITS } from "@/lib/gpt-viz/constants";
import { portalRegisterForGptUrl } from "@/lib/portal/portal-site-url";
import { supabaseAdmin } from "@/lib/supabase";
import type {
  GptProjektBrief,
  GptVizLimitsInfo,
  GptVizSessionRow,
} from "@/lib/gpt-viz/types";

export type GptVizTier = "guest" | "guest_lead" | "portal";

export type GptVizLimitCode =
  | "guest_needs_lead"
  | "guest_exhausted"
  | "portal_monthly"
  | "session_exhausted"
  | "analyze_exhausted"
  | "visitor_sessions";

export function resolveGptVizTier(
  session: GptVizSessionRow,
  portalKundeId: string | null
): GptVizTier {
  if (portalKundeId && session.kunde_id === portalKundeId) return "portal";
  if (session.lead_submitted_at) return "guest_lead";
  return "guest";
}

export function maxRendersForTier(tier: GptVizTier): number {
  switch (tier) {
    case "guest":
      return GPT_VIZ_LIMITS.guest.maxRenders;
    case "guest_lead":
      return GPT_VIZ_LIMITS.guest.maxRendersAfterLead;
    case "portal":
      return GPT_VIZ_LIMITS.portal.maxRendersPerSession;
  }
}

export function maxAnalyzesForTier(tier: GptVizTier): number {
  return tier === "portal"
    ? GPT_VIZ_LIMITS.portal.maxAnalyzesPerSession
    : GPT_VIZ_LIMITS.guest.maxAnalyzesPerSession;
}

export async function countPortalRendersThisMonth(kundeId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data, error } = await supabaseAdmin
    .from("gpt_raum_sessions")
    .select("render_count")
    .eq("kunde_id", kundeId)
    .gte("created_at", startOfMonth.toISOString());

  if (error) return 0;
  return (data ?? []).reduce((sum, row) => sum + Number(row.render_count ?? 0), 0);
}

export async function countVisitorSessionsRecent(visitorToken: string): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - GPT_VIZ_LIMITS.anonymous.sessionWindowDays);

  const { count, error } = await supabaseAdmin
    .from("gpt_raum_sessions")
    .select("id", { count: "exact", head: true })
    .eq("visitor_token", visitorToken)
    .gte("created_at", since.toISOString());

  if (error) return 0;
  return count ?? 0;
}

/** Wann das älteste Gast-Projekt aus dem Fenster fällt (ISO) — für Countdown im Registrierungs-Gate. */
export async function getVisitorSessionRetryAfter(
  visitorToken: string
): Promise<string | null> {
  const since = new Date();
  since.setDate(since.getDate() - GPT_VIZ_LIMITS.anonymous.sessionWindowDays);

  const { data, error } = await supabaseAdmin
    .from("gpt_raum_sessions")
    .select("created_at")
    .eq("visitor_token", visitorToken)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true })
    .limit(1);

  if (error || !data?.[0]?.created_at) return null;

  const retry = new Date(data[0].created_at);
  retry.setDate(retry.getDate() + GPT_VIZ_LIMITS.anonymous.sessionWindowDays);
  return retry.toISOString();
}

export type RenderLimitCheck = {
  allowed: boolean;
  code?: GptVizLimitCode;
  message?: string;
  max_renders: number;
  renders_remaining: number;
};

export async function checkRenderLimit(
  session: GptVizSessionRow,
  portalKundeId: string | null
): Promise<RenderLimitCheck> {
  const tier = resolveGptVizTier(session, portalKundeId);
  const maxRenders = maxRendersForTier(tier);
  const used = session.render_count;
  const sessionRemaining = Math.max(0, maxRenders - used);

  if (tier === "portal" && portalKundeId) {
    const monthlyUsed = await countPortalRendersThisMonth(portalKundeId);
    const monthlyLeft = GPT_VIZ_LIMITS.portal.maxRendersPerMonth - monthlyUsed;
    if (monthlyLeft <= 0) {
      return {
        allowed: false,
        code: "portal_monthly",
        message:
          "Dein monatliches Visualisierungs-Kontingent im Portal ist aufgebraucht. Nächsten Monat geht es weiter — oder schreib uns direkt.",
        max_renders: maxRenders,
        renders_remaining: 0,
      };
    }
    if (used >= maxRenders) {
      return {
        allowed: false,
        code: "session_exhausted",
        message: `Maximal ${maxRenders} Visualisierungen in diesem Projekt.`,
        max_renders: maxRenders,
        renders_remaining: 0,
      };
    }
    return {
      allowed: true,
      max_renders: maxRenders,
      renders_remaining: Math.min(sessionRemaining, monthlyLeft),
    };
  }

  if (used >= maxRenders) {
    if (tier === "guest") {
      return {
        allowed: false,
        code: "guest_needs_lead",
        message:
          "Du hast deine kostenlose Visualisierung genutzt. Sende dein Projekt — dann kannst du noch zweimal anpassen. Oder registriere dich kostenlos im Portal.",
        max_renders: maxRenders,
        renders_remaining: 0,
      };
    }
    return {
      allowed: false,
      code: "guest_exhausted",
      message:
        "Du hast alle Visualisierungen für dieses Projekt genutzt. Registriere dich kostenlos im Portal für weitere Projekte.",
      max_renders: maxRenders,
      renders_remaining: 0,
    };
  }

  return {
    allowed: true,
    max_renders: maxRenders,
    renders_remaining: sessionRemaining,
  };
}

export function checkAnalyzeLimit(
  session: GptVizSessionRow,
  portalKundeId: string | null
): { allowed: boolean; code?: GptVizLimitCode; message?: string } {
  const tier = resolveGptVizTier(session, portalKundeId);
  const max = maxAnalyzesForTier(tier);
  if (session.analyze_count >= max) {
    return {
      allowed: false,
      code: "analyze_exhausted",
      message:
        tier === "portal"
          ? "Analyse-Limit für dieses Projekt erreicht."
          : "Für dieses Projekt sind Ist- und Inspirations-Analyse vorgesehen. Sende eine Anfrage oder nutze das Portal für mehr.",
    };
  }
  return { allowed: true };
}

export async function buildGptVizLimitsInfo(
  session: GptVizSessionRow,
  portalKundeId: string | null
): Promise<GptVizLimitsInfo> {
  const tier = resolveGptVizTier(session, portalKundeId);
  const maxRenders = maxRendersForTier(tier);
  const maxAnalyzes = maxAnalyzesForTier(tier);
  const renderCheck = await checkRenderLimit(session, portalKundeId);

  let portalMonthlyRemaining: number | null = null;
  if (tier === "portal" && portalKundeId) {
    const monthlyUsed = await countPortalRendersThisMonth(portalKundeId);
    portalMonthlyRemaining = Math.max(
      0,
      GPT_VIZ_LIMITS.portal.maxRendersPerMonth - monthlyUsed
    );
  }

  return {
    tier,
    max_renders: maxRenders,
    renders_remaining: renderCheck.renders_remaining,
    max_analyzes: maxAnalyzes,
    analyzes_remaining: Math.max(0, maxAnalyzes - session.analyze_count),
    portal_monthly_remaining: portalMonthlyRemaining,
    lead_unlocked: Boolean(session.lead_submitted_at),
    portal_register_url: portalRegisterForGptUrl(),
  };
}

export async function enrichBriefWithLimits(
  session: GptVizSessionRow,
  brief: GptProjektBrief,
  portalKundeId: string | null
): Promise<GptProjektBrief> {
  return {
    ...brief,
    limits: await buildGptVizLimitsInfo(session, portalKundeId),
  };
}

export function limitCodeToVizBlock(
  code: GptVizLimitCode
): "needs_lead" | "needs_portal" | "portal_monthly" {
  if (code === "guest_needs_lead") return "needs_lead";
  if (code === "portal_monthly") return "portal_monthly";
  return "needs_portal";
}
