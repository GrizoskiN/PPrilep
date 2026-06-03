/**
 * Sanity Studio mount.
 *
 * The catch-all `[[...tool]]` segment lets Sanity own all routing under /studio.
 * This page is a client component (Studio needs the browser DOM).
 */

"use client";

import { NextStudio } from "next-sanity/studio";
import config from "../../../sanity.config";

export const dynamic = "force-static";

export default function StudioPage() {
  return <NextStudio config={config} />;
}
