import { redirect } from "next/navigation";

import { meldeAushangPdfPath } from "@/lib/org/melde-aushang-ui";
import { requireOrganisationSession } from "@/lib/org/require-org-session";

type Props = { params: { objektId: string } };

/** Legacy-Route — leitet auf die PDF-Ansicht im Browser um. */
export default async function PortalAushangPrintPage({ params }: Props) {
  const { objektId } = params;
  const session = await requireOrganisationSession();
  if (!session.ok) {
    redirect(
      `/portal/login?next=${encodeURIComponent(meldeAushangPdfPath(objektId))}`
    );
  }

  redirect(meldeAushangPdfPath(objektId));
}
