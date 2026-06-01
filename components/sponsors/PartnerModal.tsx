"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft, X, User, Building2, Mail, Phone, MessageSquare, Send, Check,
} from "lucide-react";
import Image from "next/image";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import { submitMembershipRequest } from "../../app/actions/membership";

type Step = "choose" | "member" | "company";
type MembershipTier = "volunteer" | "monthly" | "yearly";
type CompanyTier = "basic" | "preferred" | "premium";

interface MemberForm {
  name: string; email: string; phone: string; message: string;
  membership: MembershipTier;
}
interface CompanyForm {
  company: string; contact: string; email: string; phone: string; message: string;
  tier: CompanyTier;
}

const EMPTY_MEMBER: MemberForm = { name: "", email: "", phone: "", message: "", membership: "volunteer" };
const EMPTY_COMPANY: CompanyForm = { company: "", contact: "", email: "", phone: "", message: "", tier: "basic" };

const MEMBERSHIP_OPTIONS: { value: MembershipTier; label: string; price: string; desc: string }[] = [
  { value: "volunteer", label: "Волонтер",         price: "Бесплатно",       desc: "Придонесете со своето време и знаење" },
  { value: "monthly",   label: "Месечна членарина", price: "200 ден / мес",   desc: "Редовна финансиска поддршка на акциите" },
  { value: "yearly",    label: "Годишна членарина", price: "1.800 ден / год", desc: "Заштеда од 20% — уплатница на е-пошта" },
];

const COMPANY_TIERS: { value: CompanyTier; label: string; price: string; perks: string[] }[] = [
  { value: "basic",     label: "Основно",      price: "5.000 ден / год",  perks: ["Лого во апликацијата", "Благодарница на социјалните мрежи"] },
  { value: "preferred", label: "Преферирано",  price: "15.000 ден / год", perks: ["Сè од Основно", "Истакнато место на страницата", "Месечен извештај"] },
  { value: "premium",   label: "Премиум",      price: "По договор",       perks: ["Сè од Преферирано", "Брендирани акции", "Партнерски настани"] },
];

interface Props {
  onClose: () => void;
  userId?: string | null;
  prefillName?: string | null;
  prefillEmail?: string | null;
}

export default function PartnerModal({ onClose, prefillName, prefillEmail }: Props) {
  const [step, setStep] = useState<Step>("choose");
  const [memberForm, setMemberForm] = useState<MemberForm>({ ...EMPTY_MEMBER, name: prefillName ?? "", email: prefillEmail ?? "" });
  const [companyForm, setCompanyForm] = useState<CompanyForm>({ ...EMPTY_COMPANY, contact: prefillName ?? "", email: prefillEmail ?? "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [autoApproved, setAutoApproved] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  function back() { setStep("choose"); setDone(false); setAutoApproved(false); }

  async function submitMember(e: React.FormEvent) {
    e.preventDefault();
    if (!memberForm.name || !memberForm.email) return;
    setSubmitting(true);
    const res = await submitMembershipRequest({
      tier:      memberForm.membership as "volunteer" | "monthly" | "yearly",
      full_name: memberForm.name,
      email:     memberForm.email,
      phone:     memberForm.phone || undefined,
      message:   memberForm.message || undefined,
    });
    setSubmitting(false);
    if ("error" in res && res.error) { toast.error(res.error); return; }
    setAutoApproved("approved" in res && !!res.approved);
    setDone(true);
  }

  async function submitCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!companyForm.company || !companyForm.email) return;
    setSubmitting(true);
    const res = await submitMembershipRequest({
      tier:      `company_${companyForm.tier}` as "company_basic" | "company_preferred" | "company_premium",
      full_name: companyForm.contact || companyForm.company,
      company:   companyForm.company,
      email:     companyForm.email,
      phone:     companyForm.phone || undefined,
      message:   companyForm.message || undefined,
    });
    setSubmitting(false);
    if ("error" in res && res.error) { toast.error(res.error); return; }
    setAutoApproved(false);
    setDone(true);
  }

  const stepTitle = step === "member" ? "Станете член" : step === "company" ? "Компанија партнер" : null;

  const modal = (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex w-full flex-col overflow-hidden bg-white shadow-2xl h-[90dvh] rounded-t-2xl sm:h-auto sm:max-h-[88dvh] sm:max-w-lg sm:rounded-2xl">

        {/* Header */}
        <div className="shrink-0 flex items-center gap-2 border-b border-zinc-100 px-5 py-4">
          {step !== "choose" && !done ? (
            <button onClick={back} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-zinc-100 transition-colors">
              <ArrowLeft size={18} className="text-zinc-600" />
            </button>
          ) : (
            <div className="h-8 w-8 shrink-0" />
          )}
          <div className="flex flex-1 items-center gap-3">
            <Image src="/logo/logo-black.svg" alt="Мој Прилеп" width={100} height={28} className="h-7 w-auto" />
            <div className="flex min-w-0 items-baseline gap-1 text-xl leading-none tracking-tight">
              <span className="font-semibold text-slate-900">Мој</span>
              <span className="font-semibold text-primary">Прилеп</span>
            </div>
          </div>
          {stepTitle && <span className="text-sm font-semibold text-zinc-500">{stepTitle}</span>}
          <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-zinc-100 transition-colors">
            <X size={18} className="text-zinc-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto">

          {/* Choose */}
          {step === "choose" && (
            <div className="px-5 py-6 space-y-3">
              <p className="text-sm text-zinc-500 pb-1">Изберете начин на поддршка:</p>
              <ChoiceCard icon={<User size={22} />} title="Станете член" desc="Поединци кои сакаат да придонесат со своето време, знаење или членарина." onClick={() => setStep("member")} />
              <ChoiceCard icon={<Building2 size={22} />} title="Компанија партнер" desc="Бизниси кои сакаат да вложат во заедницата и да добијат видливост." onClick={() => setStep("company")} />
            </div>
          )}

          {/* Member form */}
          {step === "member" && !done && (
            <form id="member-form" onSubmit={submitMember} className="px-5 py-5 space-y-5">
              <Field label="Полно Иme *" icon={<User size={14} />} placeholder="Вашето Иme и Презиме" value={memberForm.name} onChange={(v) => setMemberForm((f) => ({ ...f, name: v }))} required />
              <Field label="Е-пошта *" icon={<Mail size={14} />} type="email" placeholder="вашата@епошта.com" value={memberForm.email} onChange={(v) => setMemberForm((f) => ({ ...f, email: v }))} required />
              <Field label="Телефон" icon={<Phone size={14} />} type="tel" placeholder="+389 7X XXX XXX" value={memberForm.phone} onChange={(v) => setMemberForm((f) => ({ ...f, phone: v }))} />

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-600">Членарина</label>
                <div className="space-y-2">
                  {MEMBERSHIP_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setMemberForm((f) => ({ ...f, membership: opt.value }))}
                      className={cn("flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                        memberForm.membership === opt.value ? "border-primary bg-primary-light" : "border-zinc-200 bg-zinc-50 hover:border-zinc-300")}>
                      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        memberForm.membership === opt.value ? "border-primary bg-primary" : "border-zinc-300 bg-white")}>
                        {memberForm.membership === opt.value && <Check size={11} className="text-white" strokeWidth={3} />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-900">{opt.label}</p>
                        <p className="text-xs text-zinc-500">{opt.desc}</p>
                      </div>
                      <span className="shrink-0 text-xs font-bold" style={{ color: "#2aa99d" }}>{opt.price}</span>
                    </button>
                  ))}
                </div>
                {(memberForm.membership === "monthly" || memberForm.membership === "yearly") && (
                  <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 leading-relaxed">
                    Уплатница и детали за плаќање ќе добиете на вашата е-пошта по потврдата.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
                  <MessageSquare size={13} /> Порака (незадолжително)
                </label>
                <textarea rows={3} placeholder="Вашите вештини, идеи, прашања..." value={memberForm.message}
                  onChange={(e) => setMemberForm((f) => ({ ...f, message: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-400 focus:bg-white resize-none transition-colors" />
              </div>
            </form>
          )}

          {/* Company form */}
          {step === "company" && !done && (
            <form id="company-form" onSubmit={submitCompany} className="px-5 py-5 space-y-5">
              <Field label="Назив на компанијата *" icon={<Building2 size={14} />} placeholder="ДООЕЛ / АД Пример" value={companyForm.company} onChange={(v) => setCompanyForm((f) => ({ ...f, company: v }))} required />
              <Field label="Контакт лице" icon={<User size={14} />} placeholder="Вашето Иme и Презиме" value={companyForm.contact} onChange={(v) => setCompanyForm((f) => ({ ...f, contact: v }))} />
              <Field label="Е-пошта *" icon={<Mail size={14} />} type="email" placeholder="вашата@епошта.com" value={companyForm.email} onChange={(v) => setCompanyForm((f) => ({ ...f, email: v }))} required />
              <Field label="Телефон" icon={<Phone size={14} />} type="tel" placeholder="+389 2 XXX XXX" value={companyForm.phone} onChange={(v) => setCompanyForm((f) => ({ ...f, phone: v }))} />

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-600">Пакет на партнерство</label>
                <div className="space-y-2">
                  {COMPANY_TIERS.map((tier) => (
                    <button key={tier.value} type="button" onClick={() => setCompanyForm((f) => ({ ...f, tier: tier.value }))}
                      className={cn("flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                        companyForm.tier === tier.value ? "border-primary bg-primary-light" : "border-zinc-200 bg-zinc-50 hover:border-zinc-300")}>
                      <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        companyForm.tier === tier.value ? "border-primary bg-primary" : "border-zinc-300 bg-white")}>
                        {companyForm.tier === tier.value && <Check size={11} className="text-white" strokeWidth={3} />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-zinc-900">{tier.label}</p>
                          <span className="text-xs font-bold" style={{ color: "#2aa99d" }}>{tier.price}</span>
                        </div>
                        <ul className="mt-1 space-y-0.5">
                          {tier.perks.map((p) => (
                            <li key={p} className="flex items-center gap-1.5 text-xs text-zinc-500">
                              <Check size={10} style={{ color: "#2aa99d" }} strokeWidth={3} /> {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 leading-relaxed">
                  Фактура и уплатница ќе добиете на е-пошта по потврдата.
                </p>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
                  <MessageSquare size={13} /> Порака (незадолжително)
                </label>
                <textarea rows={3} placeholder="Идеи за соработка, прашања..." value={companyForm.message}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, message: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-400 focus:bg-white resize-none transition-colors" />
              </div>
            </form>
          )}

          {/* Success */}
          {done && (
            <div className="flex flex-col items-center justify-center gap-4 px-5 py-14 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full text-3xl" style={{ background: "#d8f4ef" }}>
                {autoApproved ? "🎉" : "📬"}
              </span>
              <div>
                <p className="text-lg font-bold text-zinc-900">Ви благодариме!</p>
                <p className="mt-1 text-sm text-zinc-500 leading-relaxed max-w-xs">
                  {autoApproved
                    ? "Вашиот волонтерски статус е активен. Проверете ја е-поштата за потврда."
                    : "Вашата апликација е примена. Ќе ве контактираме наскоро со детали за уплата."}
                </p>
              </div>
              <button onClick={onClose} className="mt-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-colors" style={{ background: "#2aa99d" }}>
                Затвори
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === "member" || step === "company") && !done && (
          <div className="shrink-0 border-t border-zinc-100 px-5 py-3.5 flex gap-3">
            <button type="button" onClick={back} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">
              Назад
            </button>
            <button type="submit" form={step === "member" ? "member-form" : "company-form"} disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
              style={{ background: "#2aa99d" }}>
              <Send size={14} />
              {submitting ? "Се испраќа..." : "Испрати барање"}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(modal, document.body);
}

function ChoiceCard({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group flex w-full items-start gap-4 rounded-2xl bg-zinc-100 p-5 text-left transition-colors hover:bg-zinc-200">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-500 shadow-sm group-hover:shadow transition-shadow">{icon}</span>
      <div>
        <p className="font-semibold text-zinc-900">{title}</p>
        <p className="mt-0.5 text-sm text-zinc-500 leading-snug">{desc}</p>
      </div>
    </button>
  );
}

function Field({ label, icon, placeholder, value, onChange, type = "text", required = false }: {
  label: string; icon: React.ReactNode; placeholder?: string;
  value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-zinc-600">{icon} {label}</label>
      <input type={type} required={required} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:bg-white transition-colors" />
    </div>
  );
}
