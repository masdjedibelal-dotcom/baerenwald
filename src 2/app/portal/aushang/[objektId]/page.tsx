import { redirect } from "next/navigation";

import { meldeAushangPdfPath } from "@/lib/portal2/aushang";

type Props = { params: { objektId: string } };

/**
 * Alte Print-Route → individualisierter Aushang-PDF
 * (Konzept „Details vereinheitlichen“).
 */
export default function PortalAushangRedirectPage({ params }: Props) {
  redirect(meldeAushangPdfPath(params.objektId));
}
