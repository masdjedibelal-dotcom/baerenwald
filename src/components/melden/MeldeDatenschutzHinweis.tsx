import Link from "next/link";

import {
  MELDE_DATENSCHUTZ_LINK,
  MELDE_IMPRESSUM_LINK,
  meldeDatenschutzKurztext,
} from "@/lib/org/melde-datenschutz-copy";

type Props = {
  orgName: string;
  mode?: "melden" | "ergaenzen";
};

export function MeldeDatenschutzHinweis({
  orgName,
  mode = "melden",
  datenschutzHref = MELDE_DATENSCHUTZ_LINK,
  impressumHref = MELDE_IMPRESSUM_LINK,
}: Props & {
  datenschutzHref?: string;
  impressumHref?: string;
}) {
  const paragraphs = meldeDatenschutzKurztext(orgName, mode);

  return (
    <div className="melden-privacy-notice" role="note" aria-label="Datenschutzhinweis">
      <p className="melden-privacy-title">Datenschutzhinweis zur Schadenmeldung</p>
      {paragraphs.map((text) => (
        <p key={text} className="melden-privacy-text">
          {text}
        </p>
      ))}
      <p className="melden-privacy-text">
        Weitere Informationen zu deinen Rechten (Auskunft, Löschung, Widerspruch,
        Beschwerde) findest du in unserer{" "}
        <Link href={datenschutzHref} className="underline">
          Datenschutzerklärung
        </Link>{" "}
        und im{" "}
        <Link href={impressumHref} className="underline">
          Impressum
        </Link>
        .
      </p>
    </div>
  );
}
