import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { NextResponse } from "next/server";

// Vercel Cron calls this daily at 18:00 UTC (20:00 Skopje time).
// Set CRON_SECRET in Vercel env vars and vercel.json headers for security.

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Мој Прилеп <noreply@mojprilep.mk>";
const APP_URL = (
  process.env.NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN ?? "https://mojprilep.mk"
).replace("http://localhost:3000", "https://mojprilep.mk");

// ── HTML helpers ──────────────────────────────────────────────────────────────

function emailWrap(body: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f7;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <tr>
        <td style="background:linear-gradient(135deg,#2aa99d,#38c4b7);padding:20px 28px;">
          <h1 style="margin:0;color:#fff;font-size:19px;font-weight:700;">Мој Прилеп</h1>
        </td>
      </tr>
      ${body}
      <tr>
        <td style="padding:14px 28px;border-top:1px solid #f0f4f2;">
          <p style="margin:0;color:#8b96a3;font-size:11px;text-align:center;">
            Управувај со е-маил известувањата во
            <a href="${APP_URL}/account" style="color:#2aa99d;">твојот профил</a>.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function sectionHeader(title: string, emoji: string) {
  return `<tr><td style="padding:20px 28px 4px;">
    <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#8b96a3;">${emoji} ${title}</p>
  </td></tr>`;
}

function notifRow(title: string, body: string, link: string) {
  return `<tr><td style="padding:6px 28px;border-bottom:1px solid #f5f7f6;">
    <a href="${APP_URL}${link}" style="display:block;text-decoration:none;">
      <p style="margin:0;font-size:13px;font-weight:600;color:#2aa99d;">${title}</p>
      <p style="margin:2px 0 0;font-size:12px;color:#627188;">${body}</p>
    </a>
  </td></tr>`;
}

function issueRow(title: string, district: string | null, status: string, link: string) {
  const statusColors: Record<string, string> = {
    resolved: "#2aa99d",
    progress: "#f59e0b",
    open: "#8b96a3",
  };
  const statusLabels: Record<string, string> = {
    resolved: "Решено ✓",
    progress: "Во тек",
    open: "Отворено",
  };
  const color = statusColors[status] ?? "#8b96a3";
  const label = statusLabels[status] ?? status;
  return `<tr><td style="padding:6px 28px;border-bottom:1px solid #f5f7f6;">
    <a href="${APP_URL}${link}" style="display:block;text-decoration:none;">
      <p style="margin:0;font-size:13px;font-weight:600;color:#0f172b;">${title}</p>
      <p style="margin:2px 0 0;font-size:11px;color:#8b96a3;">
        ${district ?? "Прилеп"} · <span style="color:${color};font-weight:600;">${label}</span>
      </p>
    </a>
  </td></tr>`;
}

function ctaButton(label: string, href: string) {
  return `<tr><td style="padding:20px 28px;">
    <a href="${href}" style="display:inline-block;background:#2aa99d;color:#fff;font-weight:600;font-size:13px;text-decoration:none;border-radius:999px;padding:10px 28px;">${label}</a>
  </td></tr>`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // ── 1. Notifications digest ───────────────────────────────────────────────
  const { data: rawNotifs } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, created_at, recipient_user_id")
    .is("read_at", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  // Group by user
  const notifsByUser = new Map<string, typeof rawNotifs>();
  for (const n of rawNotifs ?? []) {
    const uid = n.recipient_user_id as string;
    if (!notifsByUser.has(uid)) notifsByUser.set(uid, []);
    notifsByUser.get(uid)!.push(n);
  }

  // ── 2. City newsletter — new + resolved issues in last 24h ────────────────
  const [{ data: newIssues }, { data: resolvedIssues }] = await Promise.all([
    supabase
      .from("issues")
      .select("id, title, district, status, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("issues")
      .select("id, title, district, status, updated_at")
      .eq("status", "resolved")
      .gte("updated_at", since)
      .order("updated_at", { ascending: false })
      .limit(6),
  ]);

  const hasNewsletterContent =
    (newIssues?.length ?? 0) > 0 || (resolvedIssues?.length ?? 0) > 0;

  // ── 3. Fetch all relevant profiles ───────────────────────────────────────
  const digestUserIds = [...notifsByUser.keys()];
  // Newsletter subscribers: separate query (may overlap with digest users)
  const { data: newsletterProfiles } = await supabase
    .from("profiles")
    .select("id, username, full_name, email_digest, email_newsletter")
    .eq("email_newsletter", true);

  // Digest users: fetch their preferences
  const { data: digestProfiles } =
    digestUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, username, full_name, email_digest, email_newsletter")
          .in("id", digestUserIds)
      : { data: [] };

  // Merge into a map of userId → profile
  type ProfileRow = { id: string; username: string | null; full_name: string | null; email_digest: boolean | null; email_newsletter: boolean | null };
  const profileMap = new Map<string, ProfileRow>();
  for (const p of [...(digestProfiles ?? []), ...(newsletterProfiles ?? [])]) {
    profileMap.set((p as ProfileRow).id, p as ProfileRow);
  }

  // ── 4. Get emails from auth ───────────────────────────────────────────────
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const emailMap = new Map<string, string>();
  for (const u of authUsers?.users ?? []) {
    if (u.email) emailMap.set(u.id, u.email);
  }

  // ── 5. Build the set of users to email ───────────────────────────────────
  const toEmail = new Set<string>();
  // Digest: users with unread notifs who have email_digest enabled (default true)
  for (const uid of notifsByUser.keys()) {
    const p = profileMap.get(uid);
    if (!p || p.email_digest !== false) toEmail.add(uid);
  }
  // Newsletter: all subscribers (if there's content today)
  if (hasNewsletterContent) {
    for (const p of newsletterProfiles ?? []) {
      toEmail.add((p as ProfileRow).id);
    }
  }

  // ── 6. Send emails ────────────────────────────────────────────────────────
  let sent = 0;
  const errors: string[] = [];

  for (const uid of toEmail) {
    const email = emailMap.get(uid);
    if (!email) continue;

    const profile = profileMap.get(uid);
    const name = profile?.full_name ?? profile?.username ?? "Корисник";
    const userNotifs = notifsByUser.get(uid) ?? [];
    const wantsDigest = !profile || profile.email_digest !== false;
    const wantsNewsletter = profile?.email_newsletter === true;

    // Build email body sections
    let bodyContent = `<tr><td style="padding:20px 28px 8px;">
      <p style="margin:0;font-size:14px;color:#314155;">Здраво <strong>${name}</strong>,</p>
    </td></tr>`;

    // Section A: personal unread notifications
    if (wantsDigest && userNotifs.length > 0) {
      const count = userNotifs.length;
      bodyContent += sectionHeader(
        `${count} непрочитан${count === 1 ? "о известување" : "и известувања"}`,
        "🔔",
      );
      bodyContent += userNotifs
        .slice(0, 6)
        .map((n) => notifRow(String(n.title), String(n.body), String(n.link)))
        .join("");
      if (count > 6) {
        bodyContent += `<tr><td style="padding:4px 28px 0;"><p style="margin:0;font-size:11px;color:#8b96a3;">и уште ${count - 6} повеќе…</p></td></tr>`;
      }
    }

    // Section B: city newsletter
    if (wantsNewsletter && hasNewsletterContent) {
      if ((newIssues?.length ?? 0) > 0) {
        bodyContent += sectionHeader("Нови пријави денес", "🆕");
        bodyContent += (newIssues ?? [])
          .map((i) => {
            const slug = String(i.title).toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "").slice(0, 60);
            return issueRow(String(i.title), i.district as string | null, String(i.status), `/issues/${i.id}-${slug}`);
          })
          .join("");
      }
      if ((resolvedIssues?.length ?? 0) > 0) {
        bodyContent += sectionHeader("Решени проблеми денес", "✅");
        bodyContent += (resolvedIssues ?? [])
          .map((i) => {
            const slug = String(i.title).toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "").slice(0, 60);
            return issueRow(String(i.title), i.district as string | null, "resolved", `/issues/${i.id}-${slug}`);
          })
          .join("");
      }
    }

    bodyContent += ctaButton("Отвори Мој Прилеп", APP_URL);

    // Subject line
    const parts: string[] = [];
    if (wantsDigest && userNotifs.length > 0) {
      parts.push(`${userNotifs.length} известувањ${userNotifs.length === 1 ? "е" : "а"}`);
    }
    if (wantsNewsletter && hasNewsletterContent) {
      const total = (newIssues?.length ?? 0) + (resolvedIssues?.length ?? 0);
      parts.push(`${total} нов${total === 1 ? "а" : "и"} активност${total === 1 ? "" : "и"} во Прилеп`);
    }
    if (parts.length === 0) continue;
    const subject = parts.join(" · ") + " — Мој Прилеп";

    const { error: sendErr } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html: emailWrap(bodyContent),
    });

    if (sendErr) {
      errors.push(`${uid}: ${sendErr.message}`);
    } else {
      sent++;
    }
  }

  console.info(`[daily-digest] sent=${sent} errors=${errors.length}`);
  return NextResponse.json({ sent, errors: errors.length > 0 ? errors : undefined });
}
