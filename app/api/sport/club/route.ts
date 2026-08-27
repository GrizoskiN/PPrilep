/**
 * PATCH /api/sport/club — a club updates its own profile.
 *
 * Edits go straight to the published document: the account is bound to the club
 * by an admin, and a schedule change that waits for review is a schedule change
 * that is wrong for as long as it waits.
 *
 * What a club may NOT change about itself is as important as what it may:
 * `slug`, `verified` and the ownership fields are omitted from the patch
 * entirely. A club renaming its own slug would break its URL and orphan its
 * Postgres binding; `verified` is our statement about them, not theirs. The
 * `name` is theirs to correct.
 *
 * Requires SANITY_WRITE_TOKEN with content-create permission.
 */

import { NextResponse } from "next/server";
import { createClient } from "next-sanity";
import { getRequestUser } from "../../../../lib/supabase/request-user";
import { canWriteClub } from "../../../../lib/sport/owner";
import {
  AGE_GROUPS,
  GENDERS,
  LEVELS,
  cleanEnumList,
  cleanPricing,
  cleanSchedule,
  cleanSports,
  cleanUrl,
  parseRows,
} from "../../../../lib/sport/clean";

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
const WRITE_TOKEN = process.env.SANITY_WRITE_TOKEN;

const MAX_SHORT = 220;
const MAX_ABOUT = 4000;
const MAX_IMG_BYTES = 8 * 1024 * 1024; // 8 MB

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > RATE_MAX;
}

function str(form: FormData, key: string, max = 200): string {
  return ((form.get(key) as string) ?? "").trim().slice(0, max);
}

export async function PATCH(req: Request) {
  try {
    if (!WRITE_TOKEN) {
      return NextResponse.json({ error: "Серверот не е конфигуриран." }, { status: 503 });
    }

    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "Мора да сте најавени." }, { status: 401 });
    }
    if (rateLimited(user.id)) {
      return NextResponse.json(
        { error: "Премногу промени одеднаш. Почекај една минута." },
        { status: 429 },
      );
    }

    const form = await req.formData();
    const slug = str(form, "slug", 200);

    if (!(await canWriteClub(user.id, slug))) {
      return NextResponse.json({ error: "Немаш пристап до овој клуб." }, { status: 403 });
    }

    const sanity = createClient({
      projectId: PROJECT_ID,
      dataset: DATASET,
      apiVersion: "2024-01-01",
      useCdn: false,
      token: WRITE_TOKEN,
    });

    const club = await sanity.fetch<{ _id: string } | null>(
      `*[_type == "sportClub" && slug.current == $slug && !(_id in path("drafts.**"))][0]{ _id }`,
      { slug },
    );
    if (!club) {
      return NextResponse.json({ error: "Клубот не е објавен." }, { status: 404 });
    }

    const sports = cleanSports(form.get("sports") as string);
    if (sports.length === 0) {
      return NextResponse.json(
        { error: "Треба барем еден спорт." },
        { status: 400 },
      );
    }

    const phone = str(form, "phone", 40);
    const email = str(form, "email");
    if (!phone && !email) {
      return NextResponse.json(
        { error: "Треба барем еден контакт — телефон или е-пошта." },
        { status: 400 },
      );
    }

    const name = str(form, "name", 120);
    if (!name) {
      return NextResponse.json(
        { error: "Името на клубот не смее да биде празно." },
        { status: 400 },
      );
    }

    const genderRaw = str(form, "gender", 20);

    // Every editable field is written on every save, blanks included: the form
    // shows the club its current values, so an emptied field is a deletion the
    // club asked for, not a field it forgot to send.
    const patch: Record<string, unknown> = {
      // The name is theirs to correct; the slug is not — renaming the slug would
      // break the club's URL and orphan its Postgres binding, so it is frozen.
      name,
      sports,
      shortDescription: str(form, "shortDescription", MAX_SHORT) || null,
      about: str(form, "about", MAX_ABOUT) || null,
      howToJoin: str(form, "howToJoin", MAX_ABOUT) || null,
      joinUrl: cleanUrl(form.get("joinUrl") as string) ?? null,
      ageGroups: cleanEnumList(form.get("ageGroups") as string, AGE_GROUPS),
      level: cleanEnumList(form.get("level") as string, LEVELS),
      gender: GENDERS.has(genderRaw) ? genderRaw : "mixed",
      schedule: cleanSchedule(parseRows(form.get("schedule") as string)),
      pricing: cleanPricing(parseRows(form.get("pricing") as string)),
      acceptingMembers: form.get("acceptingMembers") === "true",
      freeTrial: form.get("freeTrial") === "true",
      venue: str(form, "venue") || null,
      address: str(form, "address") || null,
      district: str(form, "district") || null,
      phone: phone || null,
      email: email || null,
      website: cleanUrl(form.get("website") as string) ?? null,
      facebook: cleanUrl(form.get("facebook") as string) ?? null,
      instagram: cleanUrl(form.get("instagram") as string) ?? null,
      tiktok: cleanUrl(form.get("tiktok") as string) ?? null,
      youtube: cleanUrl(form.get("youtube") as string) ?? null,
      // The freshness stamp under the profile is the point of self-service:
      // it is only honest if a club's own save is what sets it.
      updatedAt: new Date().toISOString(),
    };

    // ── Optional new logo ────────────────────────────────────────────────────
    const file = form.get("logo");
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_IMG_BYTES) {
        return NextResponse.json(
          { error: "Логото е преголемо (макс. 8 MB)." },
          { status: 400 },
        );
      }
      const asset = await sanity.assets.upload(
        "image",
        Buffer.from(await file.arrayBuffer()),
        { filename: file.name || "logo.jpg" },
      );
      patch.logo = { _type: "image", asset: { _type: "reference", _ref: asset._id } };
    }

    // ── Optional new cover image ──────────────────────────────────────────────
    const coverFile = form.get("cover");
    if (coverFile instanceof File && coverFile.size > 0) {
      if (coverFile.size > MAX_IMG_BYTES) {
        return NextResponse.json(
          { error: "Насловната слика е преголема (макс. 8 MB)." },
          { status: 400 },
        );
      }
      const asset = await sanity.assets.upload(
        "image",
        Buffer.from(await coverFile.arrayBuffer()),
        { filename: coverFile.name || "cover.jpg" },
      );
      patch.coverImage = { _type: "image", asset: { _type: "reference", _ref: asset._id } };
    }

    await sanity.patch(club._id).set(patch).commit();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[sport/club] PATCH", err);
    return NextResponse.json({ error: "Нешто тргна наопаку." }, { status: 500 });
  }
}
