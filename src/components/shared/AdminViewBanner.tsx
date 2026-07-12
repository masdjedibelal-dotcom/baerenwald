"use client";

import { useRouter } from "next/navigation";

const COOKIE_NAME = "bw_admin_view";

function readBanner(): { roleLabel: string; adminEmail: string } | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE_NAME}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as {
      roleLabel?: string;
      adminEmail?: string;
    };
    if (!parsed.roleLabel) return null;
    return {
      roleLabel: parsed.roleLabel,
      adminEmail: parsed.adminEmail ?? "CRM-Admin",
    };
  } catch {
    return null;
  }
}

function clearBannerCookie() {
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; path=/`;
}

export function AdminViewBanner() {
  const router = useRouter();
  const info = readBanner();
  if (!info) return null;

  return (
    <div
      className="sticky top-0 z-[100] border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950"
      role="status"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <span>
          <strong>Admin-Ansicht:</strong> Du siehst das Portal als{" "}
          <strong>{info.roleLabel}</strong>. (Eingestiegen von {info.adminEmail})
        </span>
        <button
          type="button"
          className="rounded-lg border border-amber-400 bg-white px-3 py-1 text-xs font-medium hover:bg-amber-100"
          onClick={() => {
            clearBannerCookie();
            const path = window.location.pathname.startsWith("/partner")
              ? "/partner/auth/signout"
              : "/portal/auth/signout";
            router.push(path);
          }}
        >
          Admin-Ansicht beenden
        </button>
      </div>
    </div>
  );
}
