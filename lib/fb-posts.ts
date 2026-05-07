export interface FbPost {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"),
  );
  if (!match) return "";
  return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function extractLink(item: string): string {
  // <link> in RSS may be self-closing or plain text node
  const plain = item.match(/<link>([^<]+)<\/link>/i);
  if (plain) return plain[1].trim();
  const guid = extractTag(item, "guid");
  return guid;
}

export async function fetchFbPagePosts(pageSlug: string): Promise<FbPost[]> {
  try {
    const res = await fetch(`https://rsshub.app/facebook/page/${pageSlug}`, {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const items = xml.split(/<item[\s>]/i).slice(1);

    return items
      .map((item) => ({
        title: extractTag(item, "title"),
        link: extractLink(item),
        description: extractTag(item, "description"),
        pubDate: extractTag(item, "pubDate"),
      }))
      .filter((p) => p.title || p.description);
  } catch {
    return [];
  }
}
