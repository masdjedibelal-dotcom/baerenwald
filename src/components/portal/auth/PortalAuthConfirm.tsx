"use client";

import { AuthBtn } from "@/components/portal/auth/AuthPrimitives";

type Props = {
  icon: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  footer?: React.ReactNode;
};

/**
 * Mock `authConfirm(icon, title, body, action)`.
 */
export function PortalAuthConfirm({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  footer,
}: Props) {
  return (
    <div className="portal-auth-confirm text-center">
      <div className="portal-auth-confirm-icon" aria-hidden>
        {icon}
      </div>
      <h2 className="portal-auth-heading">{title}</h2>
      <p className="portal-auth-sub mx-auto mt-2 max-w-[340px]">{body}</p>
      {actionLabel && onAction ? (
        <div className="mt-6">
          <AuthBtn onClick={onAction}>{actionLabel}</AuthBtn>
        </div>
      ) : null}
      {footer ? <div className="mt-5">{footer}</div> : null}
    </div>
  );
}
