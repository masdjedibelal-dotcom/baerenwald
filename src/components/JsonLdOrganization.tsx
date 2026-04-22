import { localBusinessSchema } from "@/lib/schema";

export function JsonLdOrganization() {
  const json = JSON.stringify(localBusinessSchema());
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
