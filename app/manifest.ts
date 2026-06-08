import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Мој Прилеп — граѓанска платформа",
    short_name: "Мој Прилеп",
    description:
      "Граѓанска платформа за афирмација на граѓанските вредности преку реализација на проекти од јавен интерес.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f4f7",
    theme_color: "#2aa99d",
    lang: "mk",
    orientation: "portrait",
    categories: ["government", "social", "news"],
    icons: [
      {
        src: "/logo/app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/logo/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/logo/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
