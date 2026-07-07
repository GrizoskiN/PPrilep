/**
 * Meta Graph API helpers — publish to our Facebook Page and Instagram.
 *
 * Server-only. Requires these env vars (never expose to the client):
 *   FB_PAGE_ID              — numeric id of the Facebook Page
 *   IG_USER_ID              — id of the Instagram Business account linked to it
 *   META_PAGE_ACCESS_TOKEN  — long-lived / System User token with
 *                             pages_manage_posts + instagram_content_publish
 *
 * Instagram publishing is a two-step flow: create a media container from a
 * public image URL, then publish that container. IG captions cannot contain
 * clickable links (Meta restriction), so the event URL is included as text.
 */

const GRAPH = "https://graph.facebook.com/v21.0";

const PAGE_ID = process.env.FB_PAGE_ID;
const IG_USER_ID = process.env.IG_USER_ID;
const TOKEN = process.env.META_PAGE_ACCESS_TOKEN;

export interface SocialPost {
  title: string;
  when: string;          // human-readable date range
  location: string;
  description: string | null;
  url: string;           // canonical event URL (absolute)
}

/** True only when the Facebook credentials are configured. */
export function facebookConfigured(): boolean {
  return Boolean(PAGE_ID && TOKEN);
}

/** True only when the Instagram credentials are configured. */
export function instagramConfigured(): boolean {
  return Boolean(IG_USER_ID && TOKEN);
}

function truncate(text: string, max: number): string {
  const clean = text.trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

/** Shared caption for both networks. */
export function buildCaption(ev: SocialPost): string {
  const lines = [`📅 ${ev.title}`, "", `🗓 ${ev.when}`, `📍 ${ev.location}`];
  if (ev.description) lines.push("", truncate(ev.description, 400));
  lines.push("", `ℹ Повеќе: ${ev.url}`, "", "#МојПрилеп #Прилеп #Случувања");
  return lines.join("\n");
}

async function graph(
  path: string,
  params: Record<string, string>,
  token: string | undefined = TOKEN,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, access_token: token }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = (data.error as { message?: string })?.message ?? JSON.stringify(data);
    throw new Error(err);
  }
  return data;
}

// A Page's feed requires a *Page* access token, not the user/System-User token
// (which only works for Instagram publishing). We derive the page token from the
// configured token and cache it — page tokens minted from a never-expiring
// System User token don't expire either.
let cachedPageToken: string | null = null;

async function getPageAccessToken(): Promise<string> {
  if (cachedPageToken) return cachedPageToken;
  const res = await fetch(
    `${GRAPH}/${PAGE_ID}?fields=access_token&access_token=${TOKEN}`,
  );
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    error?: { message?: string };
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error?.message ?? "Could not obtain Page access token");
  }
  cachedPageToken = data.access_token;
  return cachedPageToken;
}

/**
 * Publish to the Facebook Page. When a cover image is available we post it as a
 * *photo* (the image is guaranteed to render); otherwise we fall back to a link
 * post whose card is scraped from the event page's OG tags. The caption already
 * contains the event URL as text, so the link is present either way.
 * Returns the created post id.
 */
export async function postToFacebook(
  caption: string,
  url: string,
  imageUrl?: string | null,
): Promise<string> {
  if (!facebookConfigured()) throw new Error("Facebook not configured");
  const pageToken = await getPageAccessToken();
  if (imageUrl) {
    const data = await graph(
      `${PAGE_ID}/photos`,
      { url: imageUrl, caption },
      pageToken,
    );
    // /photos returns the photo id + the feed story id (post_id).
    return String(data.post_id ?? data.id ?? "");
  }
  const data = await graph(
    `${PAGE_ID}/feed`,
    { message: caption, link: url },
    pageToken,
  );
  return String(data.id ?? "");
}

/**
 * Poll a media container until Instagram has finished ingesting the image.
 * Publishing before the container reports FINISHED fails with
 * "Media ID is not available", so we wait (up to ~10s) for readiness.
 */
async function waitForContainer(creationId: string): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const res = await fetch(
      `${GRAPH}/${creationId}?fields=status_code&access_token=${TOKEN}`,
    );
    const data = (await res.json().catch(() => ({}))) as {
      status_code?: string;
    };
    const status = data.status_code;
    if (status === "FINISHED") return;
    if (status === "ERROR" || status === "EXPIRED") {
      throw new Error(`IG container ${status}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("IG container not ready (timed out)");
}

/**
 * Publish a single-image post to Instagram (container → wait → publish).
 * `imageUrl` must be a public JPEG. Returns the published media id.
 */
export async function postToInstagram(caption: string, imageUrl: string): Promise<string> {
  if (!instagramConfigured()) throw new Error("Instagram not configured");
  const container = await graph(`${IG_USER_ID}/media`, {
    image_url: imageUrl,
    caption,
  });
  const creationId = String(container.id ?? "");
  if (!creationId) throw new Error("No creation id returned");
  await waitForContainer(creationId);
  const published = await graph(`${IG_USER_ID}/media_publish`, {
    creation_id: creationId,
  });
  return String(published.id ?? "");
}
