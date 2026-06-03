"use client";

import { useState } from "react";
import { toast } from "sonner";

const SUBJECTS = [
  { value: "", label: "Избери тема..." },
  { value: "sorabotka", label: "🤝 Соработка / Партнерство" },
  { value: "media", label: "📰 Медиуми и новинари" },
  { value: "donacija", label: "💛 Донација" },
  { value: "volonter", label: "🌱 Сакам да волонтирам" },
  { value: "predlog", label: "💡 Предлог или идеја" },
  { value: "tehnicko", label: "🛠️ Техничко прашање" },
  { value: "drugo", label: "💬 Друго" },
];

export default function ContactForm() {
  const [subject, setSubject] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject) { toast.error("Избери тема за пораката."); return; }
    if (!email.trim()) { toast.error("Внеси е-пошта."); return; }
    if (!message.trim()) { toast.error("Внеси порака."); return; }

    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, name, email, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Грешка при испраќање.");
        return;
      }
      toast.success("Пораката е испратена! Ќе ти одговориме наскоро. 📬");
      setSubject("");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      toast.error("Нема конекција. Обиди се повторно.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Subject dropdown */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-theme-muted">
          Тема <span className="text-red-500">*</span>
        </label>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-xl border border-theme bg-theme-surface px-3 py-2.5 text-sm text-theme-body outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all">
          {SUBJECTS.map((s) => (
            <option key={s.value} value={s.value} disabled={s.value === ""}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Name + Email row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-theme-muted">
            Име
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Твоето име"
            className="w-full rounded-xl border border-theme bg-theme-surface px-3 py-2.5 text-sm text-theme-body placeholder:text-slate-300 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-theme-muted">
            Е-пошта <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ime@primer.com"
            required
            className="w-full rounded-xl border border-theme bg-theme-surface px-3 py-2.5 text-sm text-theme-body placeholder:text-slate-300 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-theme-muted">
          Порака <span className="text-red-500">*</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Напишете ја вашата порака овде..."
          className="w-full resize-none rounded-xl border border-theme bg-theme-surface px-3 py-2.5 text-sm text-theme-body placeholder:text-slate-300 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60">
        {sending ? "Се испраќа..." : "Испрати порака →"}
      </button>
    </form>
  );
}
