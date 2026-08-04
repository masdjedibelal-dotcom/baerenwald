import { localBusinessSchema } from "@/lib/schema";

/** HomeAndConstructionBusiness — siteweit im Root-Layout */
export function JsonLdLocalBusiness() {
  const json = JSON.stringify(localBusinessSchema());
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
