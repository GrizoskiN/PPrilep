/**
 * POST /api/sport/submit
 *
 * Club profiles submitted through /sport/nov go to Sanity as UNPUBLISHED
 * drafts (isSubmission: true). Editors review + publish from the
 * "📥 Клубови за преглед" queue in Studio. Same shape and same guards as
 * /api/events/submit — read that route first if you are changing this one.
 *
 * The structured parts (распоред, ценовник) arrive as JSON strings inside the
 * multipart body: they are repeating rows, and a flat form encoding would turn
 * them into `schedule[0][days][2]`-style keys that both sides have to parse by
 * hand. They are re-validated here field by field — the client is not trusted
 * to have kept its own inputs honest.
 *
 * Requires SANITY_WRITE_TOKEN with content-create permission.
 */

import { NextResponse } from "next/server";
import { createClient } from "next-sanity";
import { getRequestUser } from "../../../../lib/supabase/request-user";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { slugify } from "../../../../lib/utils";
import {
  AGE_GROUPS,
  GENDERS,
  KINDS,
  LEVELS,
  MAX_FIELD,
  MAX_ROWS,
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

function getSanityClient() {
  return createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: "2024-01-01",
    useCdn: false,
    token: WRITE_TOKEN,
  });
}

// The enums, row cleaners and length caps live in lib/sport/clean.ts so this
// route and /api/sport/club validate identically.
// ── Abuse guards ──────────────────────────────────────────────────────────────
const MAX_NAME = 120;
const MAX_SHORT = 220;
const MAX_ABOUT = 4000;
const MAX_IMG_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_PENDING_DRAFTS = 3;

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 3;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > RATE_MAX;
}

/** cleanUrl() against a form field, keeping the call sites below short. */
function url(form: FormData, key: string): string | undefined {
  return cleanUrl(form.get(key) as string | null);
}

function str(form: FormData, key: string, max = MAX_FIELD): string | null {
  const value = (form.get(key) as string)?.trim().slice(0, max);
  return value || null;
}

async function notifyAdmins(actorUserId: string, name: string) {
  const admin = createAdminClient();
  const { data: admins } = await admin
    .from("profiles")
    .select("id")
    .eq("is_admin", true);
  if (!admins?.length) return;
  const rows = admins.map((a: { id: string }) => ({
    recipient_user_id: a.id,
    actor_user_id: actorUserId,
    type: "sport_submission",
    title: name,
    body: "пријави спортски клуб за преглед",
    link: "/studio",
  }));
  const { error } = await admin.from("notifications").insert(rows);
  if (error) console.error("[sport/submit] notify insert", error.message);
}

export async function POST(req: Request) {
  try {
    if (!WRITE_TOKEN) {
      return NextResponse.json(
        { error: "Серверот не е конфигуриран. Контактирај не на mojpprilep@gmail.com." },
        { status: 503 },
      );
    }

    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Мора да сте најавени за да пријавите клуб." },
        { status: 401 },
      );
    }

    if (rateLimited(user.id)) {
      return NextResponse.json(
        { error: "Премногу пораки. Почекај една минута и обиди се повторно." },
        { status: 429 },
      );
    }

    const sanity = getSanityClient();

    try {
      const pending: number = await sanity.fetch(
        `count(*[_type == "sportClub" && submittedBy.userId == $uid && isSubmission == true && reviewed != true && _id in path("drafts.**")])`,
        { uid: user.id },
      );
      if (typeof pending === "number" && pending >= MAX_PENDING_DRAFTS) {
        return NextResponse.json(
          {
            error:
              "Имаш премногу пријави кои чекаат преглед. Почекај да бидат одобрени пред да пратиш нова.",
          },
          { status: 429 },
        );
      }
    } catch {
      // Count failed — the per-user rate limit above still applies.
    }

    const form = await req.formData();

    // Honeypot — real users never fill this. Note it is NOT the club's website
    // field (that one is `website`); this is a hidden input named `nickname`.
    if ((form.get("nickname") as string)?.trim()) {
      return NextResponse.json({ ok: true });
    }

    const name = str(form, "name", MAX_NAME);
    const kindRaw = (form.get("kind") as string)?.trim() ?? "";
    const kind = KINDS.has(kindRaw) ? kindRaw : "club";
    const sports = cleanSports(form.get("sports") as string);

    if (!name || sports.length === 0) {
      return NextResponse.json(
        { error: "Називот и барем еден спорт се задолжителни." },
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

    const genderRaw = (form.get("gender") as string)?.trim() ?? "";
    const ageGroups = cleanEnumList(form.get("ageGroups") as string, AGE_GROUPS);
    const level = cleanEnumList(form.get("level") as string, LEVELS);

    const schedule = cleanSchedule(parseRows(form.get("schedule") as string));
    const pricing = cleanPricing(parseRows(form.get("pricing") as string));

    // ── Optional logo ────────────────────────────────────────────────────────
    let logoRef:
      | { _type: "image"; asset: { _type: "reference"; _ref: string }; alt: string }
      | undefined;

    const file = form.get("logo") as File | null;
    if (file && file.size > 0) {
      if (file.size > MAX_IMG_BYTES) {
        return NextResponse.json(
          { error: "Логото смее да биде најмногу 8 MB." },
          { status: 413 },
        );
      }
      if (file.type.startsWith("image/")) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploaded = await sanity.assets.upload("image", buffer, {
          filename: file.name,
          contentType: file.type || "image/jpeg",
        });
        logoRef = {
          _type: "image",
          asset: { _type: "reference", _ref: uploaded._id },
          alt: name,
        };
      }
    }

    const doc = {
      _type: "sportClub",
      name,
      slug: {
        _type: "slug",
        current: `${slugify(name) || "klub"}-${Date.now().toString(36).slice(-4)}`,
      },
      kind,
      sports,
      isSubmission: true,
      reviewed: false,
      verified: false,
      updatedAt: new Date().toISOString(),
      acceptingMembers: (form.get("acceptingMembers") as string) !== "false",
      freeTrial: (form.get("freeTrial") as string) === "true",
      ...(GENDERS.has(genderRaw) && { gender: genderRaw }),
      ...(ageGroups.length && { ageGroups }),
      ...(level.length && { level }),
      ...(schedule.length && { schedule }),
      ...(pricing.length && { pricing }),
      ...(logoRef && { logo: logoRef }),
      ...(str(form, "shortDescription", MAX_SHORT) && {
        shortDescription: str(form, "shortDescription", MAX_SHORT),
      }),
      ...(str(form, "about", MAX_ABOUT) && { about: str(form, "about", MAX_ABOUT) }),
      ...(str(form, "howToJoin", MAX_ABOUT) && {
        howToJoin: str(form, "howToJoin", MAX_ABOUT),
      }),
      ...(str(form, "venue") && { venue: str(form, "venue") }),
      ...(str(form, "address") && { address: str(form, "address") }),
      ...(str(form, "district") && { district: str(form, "district") }),
      ...(phone && { phone }),
      ...(email && { email }),
      ...(url(form, "website") && { website: url(form, "website") }),
      ...(url(form, "facebook") && { facebook: url(form, "facebook") }),
      ...(url(form, "instagram") && { instagram: url(form, "instagram") }),
      ...(url(form, "tiktok") && { tiktok: url(form, "tiktok") }),
      ...(url(form, "youtube") && { youtube: url(form, "youtube") }),
      submittedBy: {
        name: str(form, "submitterName") ?? user.user_metadata?.full_name ?? "",
        email: str(form, "submitterEmail") ?? user.email ?? "",
        phone: phone ?? "",
        userId: user.id,
      },
    };

    // Create as a DRAFT — never public until an editor publishes it.
    const created = await sanity.create({ ...doc, _id: `drafts.${crypto.randomUUID()}` });

    notifyAdmins(user.id, name).catch((e) =>
      console.error("[sport/submit] notify failed", e),
    );

    return NextResponse.json({ ok: true, id: created._id });
  } catch (err) {
    console.error("[sport/submit]", err);
    return NextResponse.json(
      { error: "Не можеме да ја зачуваме пријавата во моментов. Обиди се повторно подоцна." },
      { status: 500 },
    );
  }
}
