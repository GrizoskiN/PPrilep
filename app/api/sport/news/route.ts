/**
 * POST /api/sport/news — a club publishes an announcement.
 * DELETE /api/sport/news?id=… — a club removes one of its own.
 *
 * Unlike /api/sport/submit these posts go live immediately: the account was
 * bound to the club by an admin, so the vetting already happened once, and a
 * "уписот е отворен до петок" notice reviewed on Monday is worthless. They are
 * written as published documents with `isSubmission: false, reviewed: true`,
 * which is what the public queries expect.
 *
 * Authorization is Postgres-side only (profiles.club_id) — see lib/sport/owner.ts.
 * Multipart, because a post may carry one image.
 *
 * Requires SANITY_WRITE_TOKEN with content-create permission.
 */

import { NextResponse } from "next/server";
import { createClient } from "next-sanity";
import { getRequestUser } from "../../../../lib/supabase/request-user";
import { canWriteClub } from "../../../../lib/sport/owner";

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
const WRITE_TOKEN = process.env.SANITY_WRITE_TOKEN;

function getSanityClient() {
  return createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: "2024-01-01",
    useCdn: false,
    token: WRITE_TOKEN,
  });
}

const MAX_TITLE = 120;
const MAX_BODY = 2000;
const MAX_IMG_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_POSTS_PER_DAY = 5;

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > RATE_MAX;
}

/** Only http(s) survives — anything else would be an href we should not write. */
function cleanUrl(raw: string | null): string | undefined {
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

export async function POST(req: Request) {
  try {
    if (!WRITE_TOKEN) {
      return NextResponse.json(
        { error: "Серверот не е конфигуриран." },
        { status: 503 },
      );
    }

    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "Мора да сте најавени." }, { status: 401 });
    }
    if (rateLimited(user.id)) {
      return NextResponse.json(
        { error: "Премногу објави одеднаш. Почекај една минута." },
        { status: 429 },
      );
    }

    const form = await req.formData();
    const slug = ((form.get("slug") as string) ?? "").trim();

    if (!(await canWriteClub(user.id, slug))) {
      return NextResponse.json(
        { error: "Немаш пристап до овој клуб." },
        { status: 403 },
      );
    }

    const title = ((form.get("title") as string) ?? "").trim().slice(0, MAX_TITLE);
    const body = ((form.get("body") as string) ?? "").trim().slice(0, MAX_BODY);
    if (!title) {
      return NextResponse.json({ error: "Насловот е задолжителен." }, { status: 400 });
    }

    const sanity = getSanityClient();

    const club = await sanity.fetch<{ _id: string } | null>(
      `*[_type == "sportClub" && slug.current == $slug && !(_id in path("drafts.**"))][0]{ _id }`,
      { slug },
    );
    if (!club) {
      return NextResponse.json(
        { error: "Клубот сè уште не е објавен." },
        { status: 404 },
      );
    }

    // A club that posts five times in a day is either testing or spamming; both
    // are better stopped here than moderated later.
    const todayCount = await sanity
      .fetch<number>(
        `count(*[_type == "sportPost" && club._ref == $id && publishedAt > $since])`,
        { id: club._id, since: new Date(Date.now() - 86_400_000).toISOString() },
      )
      .catch(() => 0);
    if (todayCount >= MAX_POSTS_PER_DAY) {
      return NextResponse.json(
        { error: "Достигнат е дневниот лимит од 5 објави." },
        { status: 429 },
      );
    }

    // ── Optional image ───────────────────────────────────────────────────────
    let imageRef: { _type: "image"; asset: { _type: "reference"; _ref: string } } | undefined;
    const file = form.get("image");
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_IMG_BYTES) {
        return NextResponse.json(
          { error: "Сликата е преголема (макс. 8 MB)." },
          { status: 400 },
        );
      }
      const asset = await sanity.assets.upload(
        "image",
        Buffer.from(await file.arrayBuffer()),
        { filename: file.name || "post.jpg" },
      );
      imageRef = { _type: "image", asset: { _type: "reference", _ref: asset._id } };
    }

    const doc = await sanity.create({
      _type: "sportPost",
      club: { _type: "reference", _ref: club._id },
      title,
      body: body || undefined,
      image: imageRef,
      link: cleanUrl((form.get("link") as string) ?? null),
      publishedAt: new Date().toISOString(),
      pinned: false,
      // Posted by a bound account — vetted once, at binding time.
      isSubmission: false,
      reviewed: true,
      submittedBy: {
        name: ((form.get("authorName") as string) ?? "").trim().slice(0, 120) || undefined,
        email: user.email ?? undefined,
        userId: user.id,
      },
    });

    return NextResponse.json({ ok: true, id: doc._id });
  } catch (err) {
    console.error("[sport/news] POST", err);
    return NextResponse.json({ error: "Нешто тргна наопаку." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!WRITE_TOKEN) {
      return NextResponse.json({ error: "Серверот не е конфигуриран." }, { status: 503 });
    }

    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "Мора да сте најавени." }, { status: 401 });
    }

    const id = new URL(req.url).searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json({ error: "Недостасува id." }, { status: 400 });
    }

    const sanity = getSanityClient();

    // The club is read from the post itself, not from the request: otherwise a
    // club owner could delete another club's post by naming their own slug.
    const post = await sanity.fetch<{ slug: string | null } | null>(
      `*[_type == "sportPost" && _id == $id][0]{ "slug": club->slug.current }`,
      { id },
    );
    if (!post?.slug) {
      return NextResponse.json({ error: "Објавата не постои." }, { status: 404 });
    }
    if (!(await canWriteClub(user.id, post.slug))) {
      return NextResponse.json({ error: "Немаш пристап." }, { status: 403 });
    }

    await sanity.delete(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[sport/news] DELETE", err);
    return NextResponse.json({ error: "Нешто тргна наопаку." }, { status: 500 });
  }
}
