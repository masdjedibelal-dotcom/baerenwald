"use client";

import { HelpCircle } from "lucide-react";

type OnboardingHelpButtonProps = {
  onClick: () => void;
  label?: string;
};

export function OnboardingHelpButton({
  onClick,
  label = "Tour starten",
}: OnboardingHelpButtonProps) {
  return (
    <button
      type="button"
      className="onboarding-help-btn"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <HelpCircle className="h-5 w-5" aria-hidden />
    </button>
  );
}
