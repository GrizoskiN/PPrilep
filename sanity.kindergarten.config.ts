/**
 * Sanity Studio — Наша Иднина kindergarten CMS.
 * Mounted at /gradinka — kindergarten staff only.
 *
 * Staff see only: Установи, Персонал, Мени, Програма, Соопштенија, Документи.
 * They cannot access the main /studio (Позитива / Случувања).
 */

import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { kindergartenSchemaTypes } from "./sanity/schemas/kindergarten";
import { kindergartenStructure } from "./sanity/kindergartenStructure";

export default defineConfig({
  name:     "kindergarten",
  title:    "Наша Иднина — Градинки",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset:   process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  basePath:  "/gradinka",
  plugins:   [structureTool({ structure: kindergartenStructure })],
  schema:    { types: kindergartenSchemaTypes },
});
