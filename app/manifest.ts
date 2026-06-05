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
        src: "/logo/logo-black.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
