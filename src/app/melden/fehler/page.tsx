import Link from "next/link";

type Props = {
  searchParams: { reason?: string };
};

const MESSAGES: Record<string, { title: string; text: string }> = {
  not_found: {
    title: "Link nicht gefunden",
    text: "Diese Organisation oder dieses Objekt ist uns nicht bekannt — oder der Melde-Link wurde deaktiviert.",
  },
  disabled: {
    title: "Melde-Link deaktiviert",
    text: "Für dieses Objekt können derzeit keine Meldungen entgegengenommen werden. Bitte wenden Sie sich an Ihre Hausverwaltung.",
  },
  config: {
    title: "Vorübergehend nicht verfügbar",
    text: "Der Service ist momentan nicht erreichbar. Bitte versuchen Sie es später erneut.",
  },
  no_objects: {
    title: "Noch keine Objekte freigeschaltet",
    text: "Für diese Hausverwaltung ist derzeit kein Gebäude für Online-Meldungen eingerichtet. Bitte wenden Sie sich an Ihre Hausverwaltung oder nutzen Sie den Aushang-Link mit direktem Objekt-QR.",
  },
};

export default function MeldenFehlerPage({ searchParams }: Props) {
  const reason = searchParams.reason ?? "not_found";
  const msg = MESSAGES[reason] ?? MESSAGES.not_found;

  return (
    <div className="melden-page min-h-dvh flex items-center justify-center px-4">
      <div className="melden-shell max-w-md text-center py-12">
        <h1 className="text-xl font-semibold">{msg.title}</h1>
        <p className="text-text-secondary mt-3 text-sm leading-relaxed">
          {msg.text}
        </p>
        <Link
          href="/"
          className="btn-pill-outline inline-flex mt-8"
        >
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}
