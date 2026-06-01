/**
 * Sanity Studio — main CMS (Позитива blog + Случувања events).
 * Mounted at /studio — admin only.
 *
 * Kindergarten studio is separate: see sanity.kindergarten.config.ts → /gradinka
 */

import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./sanity/schemas";
import { structure } from "./sanity/structure";

export default defineConfig({
  name:     "main",
  title:    "Мој Прилеп — CMS",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset:   process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  basePath:  "/studio",
  plugins:   [structureTool({ structure }), visionTool()],
  schema:    { types: schemaTypes },
});
