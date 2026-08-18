// Native app store links for "Мој Прилеп".
// Used by the /app smart redirect route and the mobile install banner.

export const APP_STORE_URL =
  "https://apps.apple.com/us/app/%D0%BC%D0%BE%D1%98-%D0%BF%D1%80%D0%B8%D0%BB%D0%B5%D0%BF/id6790649077";

export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=mojprilep.mk";

export type MobilePlatform = "ios" | "android" | "other";

/** Best-effort platform sniff from a User-Agent string. */
export function detectPlatform(userAgent: string | null | undefined): MobilePlatform {
  const ua = (userAgent ?? "").toLowerCase();
  // iPadOS 13+ reports as desktop Safari, so also check for Mac + touch heuristics
  // where possible. On the server we only have the UA string, so match the common cases.
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "other";
}

/** The store URL a given platform should land on. Desktop/other → Play listing (browsable on web). */
export function storeUrlForPlatform(platform: MobilePlatform): string {
  if (platform === "ios") return APP_STORE_URL;
  return PLAY_STORE_URL;
}
