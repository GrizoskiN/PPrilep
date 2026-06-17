import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "Мој Прилеп <no-reply@mojprilep.mk>";
const ADMIN = process.env.ADMIN_EMAIL ?? "ngrizo@gmail.com";

const TIER_LABELS: Record<string, string> = {
  volunteer:         "Волонтер",
  monthly:           "Месечна членарина (200 ден/мес)",
  yearly:            "Годишна членарина (1.800 ден/год)",
  company_basic:     "Партнер — Основно (5.000 ден/год)",
  company_preferred: "Партнер — Преферирано (15.000 ден/год)",
  company_premium:   "Партнер — Премиум (по договор)",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function base(content: string) {
  return `<!DOCTYPE html>
<html lang="mk">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,sans-serif">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
    <div style="background:#2aa99d;padding:24px 32px">
      <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-.5px">Мој <span style="color:#d8f4ef">Прилеп</span></span>
    </div>
    <div style="padding:28px 32px;color:#1e293b;font-size:15px;line-height:1.6">
      ${content}
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">
      Мој Прилеп · Прилеп, Македонија · <a href="https://mojprilep.mk" style="color:#2aa99d">mojprilep.mk</a>
    </div>
  </div>
</body></html>`;
}

function btn(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#2aa99d;color:#fff;border-radius:10px;font-weight:700;text-decoration:none;font-size:14px">${label}</a>`;
}

// ── Email: volunteer welcome (auto-approved) ──────────────────────────────────

export async function sendVolunteerWelcome(to: string, name: string) {
  return resend.emails.send({
    from: FROM, to,
    subject: "Добредојдовте во Мој Прилеп! 🤝",
    html: base(`
      <p>Здраво <strong>${name}</strong>,</p>
      <p>Вашата регистрација како <strong>Волонтер</strong> е потврдена! 🎉</p>
      <p>Сега имате волонтерски значка на вашиот профил. Ви благодариме што сакате да придонесете со своето време и знаење за подобар Прилеп.</p>
      <p>Следете ги иницијативите и пријавете проблеми кои ви се важни.</p>
      ${btn("https://mojprilep.mk", "Посетете ја платформата →")}
    `),
  });
}

// ── Email: paid request received (pending) ────────────────────────────────────

export async function sendRequestReceived(to: string, name: string, tier: string) {
  return resend.emails.send({
    from: FROM, to,
    subject: "Вашата апликација е примена — Мој Прилеп",
    html: base(`
      <p>Здраво <strong>${name}</strong>,</p>
      <p>Ја примивме вашата апликација за <strong>${TIER_LABELS[tier] ?? tier}</strong>.</p>
      <p>Наш тим ќе ве контактира наскоро со детали за уплата и потврда на членарината.</p>
      <p style="color:#64748b;font-size:13px">Ако имате прашања, одговорете на оваа порака или пишете на <a href="mailto:${ADMIN}" style="color:#2aa99d">${ADMIN}</a>.</p>
    `),
  });
}

// ── Email: admin notification for new paid request ────────────────────────────

export async function sendAdminNotification(
  name: string, email: string, phone: string | null,
  tier: string, message: string | null, requestId: number,
) {
  return resend.emails.send({
    from: FROM, to: ADMIN,
    subject: `🔔 Нова апликација: ${name} — ${TIER_LABELS[tier] ?? tier}`,
    html: base(`
      <p>Нова апликација за членарина/партнерство:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <tr><td style="padding:6px 0;color:#64748b;width:120px">Ime</td><td><strong>${name}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Е-пошта</td><td><a href="mailto:${email}" style="color:#2aa99d">${email}</a></td></tr>
        ${phone ? `<tr><td style="padding:6px 0;color:#64748b">Телефон</td><td>${phone}</td></tr>` : ""}
        <tr><td style="padding:6px 0;color:#64748b">Пакет</td><td><strong>${TIER_LABELS[tier] ?? tier}</strong></td></tr>
        ${message ? `<tr><td style="padding:6px 0;color:#64748b">Порака</td><td>${message}</td></tr>` : ""}
      </table>
      ${btn(`https://mojprilep.mk/sponsors?approve=${requestId}`, "Одобри во Admin панел →")}
    `),
  });
}

// ── Email: approval confirmation ──────────────────────────────────────────────

export async function sendApprovalConfirmation(to: string, name: string, tier: string) {
  const isCompany = tier.startsWith("company_");
  return resend.emails.send({
    from: FROM, to,
    subject: "Вашата членарина е одобрена! ✅",
    html: base(`
      <p>Здраво <strong>${name}</strong>,</p>
      <p>Вашата <strong>${TIER_LABELS[tier] ?? tier}</strong> е потврдена и активна! 🎉</p>
      <p>${isCompany
        ? "Вашето лого и линк ќе бидат додадени на страницата на партнерите наскоро."
        : "Значката за членарина е видлива на вашиот профил."
      }</p>
      <p>Ви благодариме за поддршката на Мој Прилеп и заедницата на Прилеп!</p>
      ${btn("https://mojprilep.mk/sponsors", "Видете ја страницата на партнери →")}
    `),
  });
}

// ── Email: new Комуналец request (operator only) ──────────────────────────────
// One email per submission to the Комуналец operator(s). No citizen-facing
// confirmation email — the citizen gets a free in-app notification + a toast,
// which keeps Resend usage to a single message per request.

const KOMUNALEC_REQUEST_LABELS: Record<string, string> = {
  complaint: "Поплака",
  container: "Нарачка на контејнер",
  tractor:   "Нарачка на трактор (собирање ѓубре)",
};

const KOMUNALEC_CATEGORY_LABELS: Record<string, string> = {
  garbage: "Ѓубре",
  park:    "Парк / зеленило",
};

export async function sendKomunalecRequest(
  to: string | string[],
  data: {
    requestType: string;
    category: string | null;
    fullName: string;
    phone: string;
    address: string | null;
    district: string | null;
    message: string | null;
    scheduledAt?: string | null;
  },
) {
  const typeLabel = KOMUNALEC_REQUEST_LABELS[data.requestType] ?? data.requestType;
  const catLabel = data.category
    ? KOMUNALEC_CATEGORY_LABELS[data.category] ?? data.category
    : null;
  const scheduledLabel = data.scheduledAt
    ? new Date(data.scheduledAt).toLocaleString("mk-MK", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;
  return resend.emails.send({
    from: FROM, to,
    subject: `🗑️ Ново барање — Комуналец: ${typeLabel}`,
    html: base(`
      <p>Ново барање преку <strong>Мој Прилеп</strong> за <strong>Комуналец</strong>:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <tr><td style="padding:6px 0;color:#64748b;width:120px">Тип</td><td><strong>${typeLabel}</strong></td></tr>
        ${catLabel ? `<tr><td style="padding:6px 0;color:#64748b">Категорија</td><td>${catLabel}</td></tr>` : ""}
        <tr><td style="padding:6px 0;color:#64748b">Име</td><td><strong>${data.fullName}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Телефон</td><td>${data.phone}</td></tr>
        ${data.address ? `<tr><td style="padding:6px 0;color:#64748b">Адреса</td><td>${data.address}</td></tr>` : ""}
        ${data.district ? `<tr><td style="padding:6px 0;color:#64748b">Населба</td><td>${data.district}</td></tr>` : ""}
        ${scheduledLabel ? `<tr><td style="padding:6px 0;color:#64748b">Термин</td><td><strong>${scheduledLabel}</strong></td></tr>` : ""}
        ${data.message ? `<tr><td style="padding:6px 0;color:#64748b">Порака</td><td>${data.message}</td></tr>` : ""}
      </table>
      ${btn("https://mojprilep.mk/agency/komunalec", "Отвори ги барањата →")}
    `),
  });
}

// ── Email: rejection ──────────────────────────────────────────────────────────

export async function sendRejectionNotice(to: string, name: string) {
  return resend.emails.send({
    from: FROM, to,
    subject: "Мој Прилеп — Информација за вашата апликација",
    html: base(`
      <p>Здраво <strong>${name}</strong>,</p>
      <p>За жал, не успеавме да ја потврдиме вашата апликација во овој момент.</p>
      <p>Доколку имате прашања или сакате да обновите, контактирајте нè на <a href="mailto:${ADMIN}" style="color:#2aa99d">${ADMIN}</a>.</p>
    `),
  });
}
