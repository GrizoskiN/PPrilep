import { createClient } from "../../lib/supabase/server";
import type { Metadata } from "next";
import type { PinnedIssue } from "./MapClient";
import MapWrapper from "./MapWrapper";

export const metadata: Metadata = {
  title: "Мапа на пријави | Подобар Прилеп",
  description: "Визуелизација на пријавени проблеми според категорија на мапа на Прилеп",
};

export default async function MapPage() {
  const supabase = await createClient();

  // Include issues with a pin AND issues with only a street name (no pin)
  const { data: issues } = await supabase
    .from("issues")
    .select("id, title, category, status, street_name, photo_url, district, lat, lng")
    .or("lat.not.is.null,street_name.not.is.null")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      <MapWrapper issues={(issues ?? []) as PinnedIssue[]} />
    </div>
  );
}
