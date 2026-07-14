import { MeldenBestaetigungClient } from "@/components/melden/MeldenBestaetigungClient";

export const metadata = {
  title: "Meldung eingegangen",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: {
    org?: string;
    token?: string;
    statusLink?: string;
  };
};

export default function MeldenBestaetigungPage({ searchParams }: Props) {
  const orgName = searchParams.org?.trim() || "Ihre Hausverwaltung";

  return (
    <MeldenBestaetigungClient
      orgName={orgName}
      statusToken={searchParams.token}
      statusLink={searchParams.statusLink}
    />
  );
}
