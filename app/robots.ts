import type { MetadataRoute } from "next";

const SITE_URL = "https://mojprilep.mk";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep private / app-internal areas out of search results.
      disallow: ["/account", "/studio", "/api/", "/auth/", "/gradinka"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
