import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { PUBLIC_PATHS, SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = PUBLIC_PATHS.map((p) =>
          [`  <url>`, `    <loc>${SITE_URL}${p}</loc>`, `    <changefreq>weekly</changefreq>`, `    <priority>${p === "/" ? "1.0" : "0.7"}</priority>`, `  </url>`].join("\n"),
        );
        const xml = [`<?xml version="1.0" encoding="UTF-8"?>`, `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`, ...urls, `</urlset>`].join("\n");
        return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
