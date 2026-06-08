import { AlertTriangle, Lightbulb, Users } from "lucide-react";

const FEATURES = [
  { icon: AlertTriangle, text: "Пријави проблем во твојата населба" },
  { icon: Lightbulb, text: "Поддржи граѓански иницијативи" },
  { icon: Users, text: "Биди дел од заедницата на Прилеп" },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-bg min-h-screen w-full lg:grid lg:grid-cols-2">
      {/* ── Brand panel (desktop only) ─────────────────────────────────────── */}
      <div
        className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between"
        style={{
          background:
            "linear-gradient(150deg,#1b837a 0%,#2aa99d 52%,#4fd0c2 100%)",
        }}>
        {/* decorative glows */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-black/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/logo-white.svg" alt="" className="h-11 w-auto" />
          <span className="text-2xl font-extrabold tracking-tight">
            Мој Прилеп
          </span>
        </div>

        <div className="relative max-w-md space-y-6">
          <h2 className="text-4xl font-extrabold leading-tight">
            Граѓанска платформа за подобар град
          </h2>
          <p className="text-base leading-relaxed text-white/85">
            Пријавувај проблеми, поддржувај иницијативи и следи што се случува
            во Прилеп — на едно место.
          </p>
          <ul className="space-y-3 pt-2">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                  <Icon size={17} />
                </span>
                <span className="text-sm font-medium text-white/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/70">
          © Мој Прилеп · Прилеп, Македонија
        </p>
      </div>

      {/* ── Form side ──────────────────────────────────────────────────────── */}
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-6 lg:min-h-0">
        {children}
      </div>
    </div>
  );
}
