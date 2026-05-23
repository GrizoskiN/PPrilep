/**
 * Sanity Studio configuration.
 *
 * The Studio is mounted at /studio via app/studio/[[...index]]/page.tsx.
 * Visit https://mojprilep.mk/studio (or localhost:3000/studio in dev) and
 * sign in with the Sanity account that owns this project.
 */

import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./sanity/schemas";

export default defineConfig({
  name: "default",
  title: "Подобар Прилеп — CMS",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  basePath: "/studio",
  plugins: [structureTool(), visionTool()],
  schema: { types: schemaTypes },
});
