"use client";

import { NextStudio } from "next-sanity/studio";
import config from "../../../sanity.kindergarten.config";

export const dynamic = "force-static";

export default function KindergartenStudioPage() {
  return <NextStudio config={config} />;
}
