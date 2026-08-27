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
import { AutoReviewPublishAction } from "./sanity/actions/autoReviewPublish";

// Types where "Publish" on a form submission should also mark it reviewed, so a
// single click both approves it and reveals it on the public site.
const AUTO_REVIEW_TYPES = new Set(["sportClub", "sportPost"]);

export default defineConfig({
  name:     "main",
  title:    "Мој Прилеп — CMS",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset:   process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  basePath:  "/studio",
  plugins:   [structureTool({ structure }), visionTool()],
  schema:    { types: schemaTypes },
  document: {
    actions: (prev, context) =>
      AUTO_REVIEW_TYPES.has(context.schemaType)
        ? prev.map((action) =>
            action.action === "publish" ? AutoReviewPublishAction : action,
          )
        : prev,
  },
});
