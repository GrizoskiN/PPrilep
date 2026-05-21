"use client";

import dynamic from "next/dynamic";
import type { PinnedIssue } from "./MapClient";

// ssr: false must live in a Client Component — not allowed in Server Components
const MapClient = dynamic(() => import("./MapClient"), { ssr: false });

export default function MapWrapper({ issues }: { issues: PinnedIssue[] }) {
  return <MapClient issues={issues} />;
}
