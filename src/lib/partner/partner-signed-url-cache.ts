import { resolvePartnerFileUrl } from "@/lib/partner/partner-storage";

/** Request-lokaler Cache: gleiche Storage-Pfade nur einmal signieren. */
export function createPartnerSignedUrlCache() {
  const cache = new Map<string, Promise<string | null>>();

  async function resolve(
    stored: string | null | undefined,
    expiresIn = 3600
  ): Promise<string | null> {
    if (!stored?.trim()) return null;
    const key = `${expiresIn}:${stored.trim()}`;
    let p = cache.get(key);
    if (!p) {
      p = resolvePartnerFileUrl(stored, expiresIn);
      cache.set(key, p);
    }
    return p;
  }

  async function resolveMany(
    stored: Array<string | null | undefined>,
    expiresIn = 3600
  ): Promise<string[]> {
    const urls = await Promise.all(stored.map((s) => resolve(s, expiresIn)));
    return urls.filter((u): u is string => Boolean(u));
  }

  return { resolve, resolveMany };
}

export type PartnerSignedUrlCache = ReturnType<typeof createPartnerSignedUrlCache>;
