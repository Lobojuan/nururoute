/**
 * Shared head metadata for public NuruRoute routes.
 * Canonical + og:url live on leaf routes only (never on __root).
 */
export const SITE_URL = "https://demo.nururoute.com";
export const SITE_NAME = "NuruRoute";

type Options = { card?: "summary" | "summary_large_image"; noindex?: boolean };

export function pageMeta(path: string, title: string, description: string, opts: Options = {}) {
  const url = `${SITE_URL}${path === "/" ? "/" : path}`;
  const meta: Record<string, string>[] = [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: url },
    { property: "og:site_name", content: SITE_NAME },
    { name: "twitter:card", content: opts.card ?? "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
  if (opts.noindex) meta.push({ name: "robots", content: "noindex, nofollow" });
  return {
    meta,
    links: opts.noindex ? [] : [{ rel: "canonical", href: url }],
  };
}

/** Public, indexable routes — used by the sitemap. `/console` and `/admin/*` are deliberately excluded. */
export const PUBLIC_PATHS = ["/", "/models", "/wallet", "/developers", "/studio", "/pricing", "/impact", "/investors"] as const;
