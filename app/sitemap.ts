import type { MetadataRoute } from "next";

const SITE_URL = "https://mojprilep.mk";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Public, indexable routes. Dynamic content pages (issues, initiatives,
  // positive stories, kindergartens) can be appended here later by querying
  // Supabase / Sanity at build time.
  const routes: {
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }[] = [
    { path: "/", changeFrequency: "daily", priority: 1 },
    { path: "/issues", changeFrequency: "hourly", priority: 0.9 },
    { path: "/map", changeFrequency: "daily", priority: 0.7 },
    { path: "/heroes", changeFrequency: "daily", priority: 0.7 },
    { path: "/initiatives", changeFrequency: "daily", priority: 0.8 },
    { path: "/communities", changeFrequency: "weekly", priority: 0.6 },
    { path: "/events", changeFrequency: "daily", priority: 0.7 },
    { path: "/positive", changeFrequency: "daily", priority: 0.7 },
    { path: "/projects", changeFrequency: "weekly", priority: 0.6 },
    { path: "/about", changeFrequency: "monthly", priority: 0.5 },
    { path: "/sponsors", changeFrequency: "monthly", priority: 0.5 },
    { path: "/utility/water", changeFrequency: "weekly", priority: 0.6 },
    { path: "/utility/garbage", changeFrequency: "weekly", priority: 0.6 },
    { path: "/kindergarten", changeFrequency: "weekly", priority: 0.6 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  ];

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
