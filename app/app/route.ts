import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { detectPlatform, storeUrlForPlatform } from "../../lib/config/appStores";

// Smart install link: mojprilep.mk/app → sends each visitor to the right store.
// Shareable in QR codes, socials, print. Not cached (depends on the request UA).
export const dynamic = "force-dynamic";

export async function GET() {
  const h = await headers();
  const platform = detectPlatform(h.get("user-agent"));
  redirect(storeUrlForPlatform(platform));
}
