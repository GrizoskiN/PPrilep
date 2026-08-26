/**
 * POST /api/positive/submit
 *
 * Citizen story submissions go straight to Sanity as UNPUBLISHED documents
 * (isSubmission: true). Editors review + publish from the
 * "📥 Приказни за преглед" queue in Studio.
 *
 * Requires SANITY_WRITE_TOKEN with content-create permission.
 */

import { NextResponse } from "next/server";
import { createClient } from "next-sanity";
import { getRequestUser } from "../../../../lib/supabase/request-user";
import { slugify } from "../../../../lib/utils";

const PROJECT_ID  = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const DATASET     = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
const WRITE_TOKEN = process.env.SANITY_WRITE_TOKEN;

function getSanityClient() {
  return createClient({
    projectId:  PROJECT_ID,
    dataset:    DATASET,
    apiVersion: "2024-01-01",
    useCdn:     false,
    token:      WRITE_TOKEN,
  });
}

// ── Abuse guards ──────────────────────────────────────────────────────────────
const MAX_TITLE     = 140;
const MAX_STORY     = 6000;
const MAX_FIELD     = 200;
const MAX_IMAGES    = 5;
const MAX_IMG_BYTES = 8 * 1024 * 1024; // 8 MB per image

// Durable per-user cap: how many of this user's submissions may sit unreviewed
// (still drafts) at once. Unlike the in-memory IP rate limit — which resets per
// serverless instance — this is enforced against Sanity itself, so it can't be
// bypassed by instance churn. Bounds both review-queue flooding and the Sanity
// asset storage an attacker can burn through image uploads.
const MAX_PENDING_DRAFTS = 5;

// Best-effort in-memory rate limit (per server instance).
const RATE_WINDOW_MS = 60_000;
const RATE_MAX       = 3;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now    = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > RATE_MAX;
}

export async function POST(req: Request) {
  try {
    if (!WRITE_TOKEN) {
      return NextResponse.json(
        { error: "Серверот не е конфигуриран. Контактирај не на mojpprilep@gmail.com." },
        { status: 503 },
      );
    }

    // ── Require an authenticated user (web cookie OR mobile Bearer token) ──────
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Мора да сте најавени за да испратите приказна." },
        { status: 401 },
      );
    }

    // ── Rate limit per authenticated user (best-effort, in-memory) ────────────
    if (rateLimited(user.id)) {
      return NextResponse.json(
        { error: "Премногу пораки. Почекај една минута и обиди се повторно." },
        { status: 429 },
      );
    }

    const sanity = getSanityClient();

    // ── Durable cap: too many of this user's stories still awaiting review? ───
    try {
      const pending: number = await sanity.fetch(
        `count(*[_type == "post" && submittedBy.userId == $uid && isSubmission == true && reviewed != true && _id in path("drafts.**")])`,
        { uid: user.id },
      );
      if (typeof pending === "number" && pending >= MAX_PENDING_DRAFTS) {
        return NextResponse.json(
          {
            error:
              "Имаш премногу приказни кои чекаат преглед. Почекај да бидат одобрени пред да испратиш нова.",
          },
          { status: 429 },
        );
      }
    } catch {
      // If the count query fails, don't block a legitimate submission — the
      // per-user rate limit above still applies.
    }

    const form   = await req.formData();

    // Honeypot — real users never fill this. Bots do. Silently succeed.
    if ((form.get("website") as string)?.trim()) {
      return NextResponse.json({ ok: true });
    }

    const title          = (form.get("title")          as string)?.trim().slice(0, MAX_TITLE);
    const story          = (form.get("story")          as string)?.trim().slice(0, MAX_STORY);
    const institution    = (form.get("institution")    as string)?.trim().slice(0, MAX_FIELD) || null;
    const subject        = (form.get("subject")        as string)?.trim().slice(0, MAX_FIELD) || null;
    const videoUrl       = (form.get("videoUrl")       as string)?.trim().slice(0, 500) || null;
    const categoriesRaw  = (form.get("categories")     as string)?.trim() || "";
    const categories     = categoriesRaw ? categoriesRaw.split(",").map((c) => c.trim()).filter(Boolean) : [];
    const submitterName  = (form.get("submitterName")  as string)?.trim().slice(0, MAX_FIELD) || null;
    const submitterEmail = (form.get("submitterEmail") as string)?.trim().slice(0, MAX_FIELD) || null;
    const phone          = (form.get("phone")          as string)?.trim().slice(0, 40) || null;

    if (!title || !story) {
      return NextResponse.json({ error: "Наслов и текст се задолжителни." }, { status: 400 });
    }

    // ── Upload images to Sanity Assets ────────────────────────────────────────
    const imageFiles    = form.getAll("images") as File[];
    const imageAssetIds: string[] = [];

    for (const file of imageFiles.slice(0, MAX_IMAGES)) {
      if (file.size === 0) continue;
      if (file.size > MAX_IMG_BYTES) {
        return NextResponse.json(
          { error: "Сликите смеат да бидат најмногу 8 MB." },
          { status: 413 },
        );
      }
      if (!file.type.startsWith("image/")) continue;

      const buffer   = Buffer.from(await file.arrayBuffer());
      const uploaded = await sanity.assets.upload("image", buffer, {
        filename:    file.name,
        contentType: file.type || "image/jpeg",
      });
      imageAssetIds.push(uploaded._id);
    }

    // ── Build Portable Text body ──────────────────────────────────────────────
    const coverImageRef = imageAssetIds[0]
      ? { _type: "image" as const, asset: { _type: "reference" as const, _ref: imageAssetIds[0] } }
      : undefined;

    const bodyBlocks = [
      {
        _type:    "block",
        _key:     "intro",
        style:    "normal",
        markDefs: [],
        children: [{ _type: "span", _key: "s0", text: story, marks: [] }],
      },
      ...imageAssetIds.slice(1).map((id, i) => ({
        _type: "image",
        _key:  `img${i}`,
        asset: { _type: "reference", _ref: id },
      })),
    ];

    const doc = {
      _type:        "post",
      title,
      slug:         { _type: "slug", current: `${slugify(title) || "prikazna"}-${Date.now().toString(36).slice(-4)}` },
      excerpt:      story.slice(0, 200),
      publishedAt:  new Date().toISOString(),
      isSubmission: true,
      reviewed:     false,
      body:         bodyBlocks,
      ...(coverImageRef && { coverImage: coverImageRef }),
      ...(institution          && { institution }),
      ...(subject              && { subject }),
      ...(videoUrl             && { videoUrl }),
      ...(categories.length    && { categories }),
      submittedBy: {
        name:   submitterName  ?? user.user_metadata?.full_name ?? "",
        email:  submitterEmail ?? user.email ?? "",
        phone:  phone ?? "",
        userId: user.id,
      },
    };

    // Create as a DRAFT — never goes public until an editor publishes it.
    const created = await sanity.create({ ...doc, _id: `drafts.${crypto.randomUUID()}` });

    return NextResponse.json({ ok: true, id: created._id });
  } catch (err) {
    console.error("[positive/submit]", err);
    return NextResponse.json(
      { error: "Не можеме да ја зачуваме приказната во моментов. Обиди се повторно подоцна." },
      { status: 500 },
    );
  }
}
