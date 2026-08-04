import type { RolePillSemantic } from "@/lib/crm-vorgang/role-status";
import { rolePillClass } from "@/lib/crm-vorgang/role-status-ui";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  semantic: RolePillSemantic;
  className?: string;
};

/** Status-Pill nach Resolver-Semantik (4+1 Farben, Design P0-2). */
export function RoleStatusPill({ label, semantic, className }: Props) {
  return (
    <span className={cn(rolePillClass(semantic), className)}>
      {label}
    </span>
  );
}
