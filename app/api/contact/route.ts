import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const IS_DEV = process.env.NODE_ENV === "development";
// Resend only allows sending from verified domains in production.
// In dev, use their built-in test address so the API call succeeds.
const FROM_CONTACT = IS_DEV
  ? "МојПрилеп Контакт <onboarding@resend.dev>"
  : "Мој Прилеп — Контакт <noreply@mojprilep.mk>";
const FROM_AUTOREPLY = IS_DEV
  ? "МојПрилеп <onboarding@resend.dev>"
  : "Мој Прилеп <noreply@mojprilep.mk>";
// In dev, Resend only delivers to your own verified email — redirect there
const TO_CONTACT = ["mojpprilep@gmail.com"];

const SUBJECT_LABELS: Record<string, string> = {
  sorabotka: "🤝 Соработка / Партнерство",
  media:     "📰 Медиуми и новинари",
  donacija:  "💛 Донација",
  volonter:  "🌱 Сакам да волонтирам",
  predlog:   "💡 Предлог или идеја",
  tehnicko:  "🛠️ Техничко прашање",
  drugo:     "💬 Друго",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subject, name, email, message } = body as {
      subject: string;
      name?: string;
      email: string;
      message: string;
    };

    // Basic validation
    if (!subject || !email || !message?.trim()) {
      return NextResponse.json({ error: "Недостасуваат задолжителни полиња." }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Невалидна е-пошта." }, { status: 400 });
    }

    const subjectLabel = SUBJECT_LABELS[subject] ?? subject;
    const senderName = name?.trim() || "Анонимен посетител";

    await resend.emails.send({
      from: FROM_CONTACT,
      to: TO_CONTACT,
      replyTo: email,
      subject: `[МојПрилеп] ${subjectLabel} — ${senderName}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
          <div style="background:#f0faf7;border-radius:12px;padding:20px 24px;margin-bottom:24px">
            <h2 style="margin:0 0 4px;font-size:18px;color:#0f7b5b">Нова порака преку контакт форма</h2>
            <p style="margin:0;font-size:13px;color:#6b7280">МојПрилеп — За нас</p>
          </div>

          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#6b7280;width:120px;vertical-align:top">Тема</td>
              <td style="padding:8px 0;font-size:14px;font-weight:600;color:#1a1a1a">${subjectLabel}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#6b7280;vertical-align:top">Од</td>
              <td style="padding:8px 0;font-size:14px;color:#1a1a1a">${senderName}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#6b7280;vertical-align:top">Е-пошта</td>
              <td style="padding:8px 0;font-size:14px;color:#0f7b5b">
                <a href="mailto:${email}" style="color:#0f7b5b">${email}</a>
              </td>
            </tr>
          </table>

          <div style="background:#f8f9fa;border-radius:10px;padding:16px 20px;margin-bottom:24px">
            <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Порака</p>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#1a1a1a;white-space:pre-wrap">${message.trim()}</p>
          </div>

          <p style="font-size:12px;color:#9ca3af;margin:0">
            Одговори директно на оваа порака за да го контактираш испраќачот.<br/>
            МојПрилеп · Прилеп, Северна Македонија
          </p>
        </div>
      `,
    });

    // Auto-reply to the sender
    await resend.emails.send({
      from: FROM_AUTOREPLY,
      to: IS_DEV ? TO_CONTACT : [email],
      subject: "Ја примивме твојата порака ✅",
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
          <div style="background:#f0faf7;border-radius:12px;padding:20px 24px;margin-bottom:24px">
            <h2 style="margin:0 0 4px;font-size:18px;color:#0f7b5b">Благодариме, ${senderName}!</h2>
            <p style="margin:0;font-size:13px;color:#6b7280">Ја примивме твојата порака.</p>
          </div>
          <p style="font-size:14px;line-height:1.7;color:#374151">
            Ќе ти одговориме во рок од <strong>1–2 работни дена</strong>.
          </p>
          <p style="font-size:14px;line-height:1.7;color:#374151">
            Твојата тема: <strong>${subjectLabel}</strong>
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
          <p style="font-size:12px;color:#9ca3af;margin:0">
            Мојот Град — Прилеп · <a href="https://mojprilep.mk" style="color:#0f7b5b">mojprilep.mk</a>
          </p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact]", err);
    return NextResponse.json({ error: "Серверска грешка. Обиди се повторно." }, { status: 500 });
  }
}
