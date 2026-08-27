"use client";

/**
 * The "Пријави клуб" wizard body — step indicator, scrollable body and footer,
 * but NO modal chrome, so it lives inside SubmitClubModal's shell (mirrors
 * EventSubmitForm). Same fields, same /api/sport/submit call and same Cyrillic
 * warning behaviour as the old full-page /sport/nov, just split across steps.
 */

import { useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ImagePlus, Plus, Trash2, X } from "lucide-react";

import { cn } from "../../lib/utils";
import { AGE_LABEL, DAY_SHORT, KIND_LABEL, PERIOD_LABEL } from "../../lib/sanity/sport";
import {
  AGE_ORDER,
  DAY_ORDER,
  EMPTY_PRICE,
  EMPTY_SLOT,
  Field,
  LATIN,
  Toggle,
  inputCls,
  type Price,
  type Slot,
} from "./FormBits";

const STEPS = ["Основно", "За кого", "Распоред", "Ценовник", "Контакт"] as const;

interface Props {
  /** Step-1 „Назад" returns here — close the modal. */
  onCancel: () => void;
  /** Called after a successful submit (Затвори button). */
  onClose: () => void;
}

export default function ClubSubmitForm({ onCancel, onClose }: Props) {
  const [step, setStep] = useState(0);

  const [name, setName] = useState("");
  const [kind, setKind] = useState("club");
  const [sports, setSports] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [about, setAbout] = useState("");
  const [ageGroups, setAgeGroups] = useState<string[]>([]);
  const [gender, setGender] = useState("mixed");
  const [schedule, setSchedule] = useState<Slot[]>([{ ...EMPTY_SLOT }]);
  const [pricing, setPricing] = useState<Price[]>([{ ...EMPTY_PRICE }]);
  const [freeTrial, setFreeTrial] = useState(false);
  const [acceptingMembers, setAcceptingMembers] = useState(true);
  const [howToJoin, setHowToJoin] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const latinWarning = [name, shortDescription, about, howToJoin, venue, district]
    .concat(schedule.map((s) => s.group))
    .concat(pricing.map((p) => p.label))
    .some((v) => LATIN.test(v));

  const isLast = step === STEPS.length - 1;
  const canAdvance = step !== 0 || (name.trim().length >= 3 && sports.trim().length > 0);
  const canSubmit =
    name.trim().length >= 3 &&
    sports.trim().length > 0 &&
    (phone.trim().length > 0 || email.trim().length > 0) &&
    !submitting;

  function goNext() {
    if (!canAdvance) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    bodyRef.current?.scrollTo({ top: 0 });
  }
  function goBack() {
    if (step === 0) return onCancel();
    setStep((s) => s - 1);
    bodyRef.current?.scrollTo({ top: 0 });
  }

  function pickLogo(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setLogo(file);
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function pickCover(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setCover(file);
    const reader = new FileReader();
    reader.onload = (e) => setCoverPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function updateSlot(i: number, patch: Partial<Slot>) {
    setSchedule((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }
  function updatePrice(i: number, patch: Partial<Price>) {
    setPricing((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  async function handleSubmit() {
    if (honeypot.current?.value) {
      setDone(true);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("name", name);
      form.append("kind", kind);
      form.append("sports", sports);
      form.append("shortDescription", shortDescription);
      form.append("about", about);
      form.append("ageGroups", ageGroups.join(","));
      form.append("gender", gender);
      form.append("freeTrial", String(freeTrial));
      form.append("acceptingMembers", String(acceptingMembers));
      form.append("howToJoin", howToJoin);
      form.append("joinUrl", joinUrl);
      form.append("venue", venue);
      form.append("address", address);
      form.append("district", district);
      form.append("phone", phone);
      form.append("email", email);
      form.append("website", website);
      form.append("facebook", facebook);
      form.append("instagram", instagram);
      form.append(
        "schedule",
        JSON.stringify(schedule.filter((s) => s.group.trim() && s.startTime && s.days.length)),
      );
      form.append(
        "pricing",
        JSON.stringify(pricing.filter((p) => p.label.trim() && p.price !== "")),
      );
      if (logo) form.append("logo", logo);
      if (cover) form.append("cover", cover);

      const res = await fetch("/api/sport/submit", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Грешка при испраќање.");
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Непозната грешка.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50">
          <Check className="h-7 w-7 text-teal-600" />
        </div>
        <h3 className="mt-4 text-base font-bold text-zinc-900">Благодариме!</h3>
        <p className="mt-1 max-w-xs text-sm leading-relaxed text-zinc-500">
          Пријавата е примена. Ќе ја прегледаме и ако е во ред, профилот ќе биде
          објавен во Спорт и Рекреација.
        </p>
        <button
          onClick={onClose}
          className="mt-5 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700">
          Затвори
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <input ref={honeypot} name="nickname" type="text" tabIndex={-1} autoComplete="off" className="hidden" />

      {/* Step indicator — a segmented bar reads cleaner than 5 inline pills. */}
      <div className="shrink-0 border-b border-zinc-100 bg-white px-4 pb-3 pt-4 sm:px-5">
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-teal-600" : "bg-zinc-200")}
            />
          ))}
        </div>
        <p className="mt-2 text-xs font-semibold text-zinc-500">
          Чекор {step + 1} од {STEPS.length} · <span className="text-zinc-800">{STEPS[step]}</span>
        </p>
      </div>

      {/* Body */}
      <div ref={bodyRef} className="desktop-scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        {latinWarning ? (
          <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            Пиши на кирилица за профилот да изгледа исто како другите. (Линковите и
            е-поштата остануваат на латиница — тоа е во ред.)
          </p>
        ) : null}

        {/* ── Step 1: Основно ── */}
        {step === 0 && (
          <div className="space-y-3">
            <Field label="Назив на клубот *">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="пр. ФК Победа" />
            </Field>

            <Field label="Тип">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(KIND_LABEL).map(([value, label]) => (
                  <Toggle key={value} active={kind === value} onClick={() => setKind(value)}>
                    {label}
                  </Toggle>
                ))}
              </div>
            </Field>

            <Field label="Спорт(ови) *" hint="Одвои со запирка: фудбал, футсал">
              <input value={sports} onChange={(e) => setSports(e.target.value)} className={inputCls} placeholder="фудбал" />
            </Field>

            <Field label="Лого">
              {logoPreview ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoPreview} alt="" className="h-16 w-16 rounded-xl object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setLogo(null);
                      setLogoPreview(null);
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-zinc-500">
                    <X className="h-3.5 w-3.5" /> Отстрани
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-3 py-3 text-xs text-zinc-500">
                  <ImagePlus className="h-4 w-4" />
                  Избери слика
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => pickLogo(e.target.files)} />
                </label>
              )}
            </Field>

            <Field label="Насловна слика" hint="Широка слика на врвот на профилот (по избор).">
              {coverPreview ? (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverPreview} alt="" className="h-28 w-full rounded-xl object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setCover(null);
                      setCoverPreview(null);
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-zinc-500">
                    <X className="h-3.5 w-3.5" /> Отстрани
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-3 py-3 text-xs text-zinc-500">
                  <ImagePlus className="h-4 w-4" />
                  Избери слика
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => pickCover(e.target.files)} />
                </label>
              )}
            </Field>

            <Field label="Краток опис" hint="Една-две реченици — се гледа во списокот.">
              <textarea
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value.slice(0, 220))}
                rows={2}
                className={inputCls}
              />
            </Field>

            <Field label="За клубот">
              <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={5} className={inputCls} />
            </Field>
          </div>
        )}

        {/* ── Step 2: За кого ── */}
        {step === 1 && (
          <div className="space-y-3">
            <Field label="Возрасни групи" hint="Најчесто поставеното прашање — избери ги сите што важат.">
              <div className="flex flex-wrap gap-1.5">
                {AGE_ORDER.map((a) => (
                  <Toggle
                    key={a}
                    active={ageGroups.includes(a)}
                    onClick={() =>
                      setAgeGroups((prev) =>
                        prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
                      )
                    }>
                    {AGE_LABEL[a]}
                  </Toggle>
                ))}
              </div>
            </Field>

            <Field label="Пол">
              <div className="flex flex-wrap gap-1.5">
                {[
                  ["mixed", "Мешано"],
                  ["male", "Машки"],
                  ["female", "Женски"],
                ].map(([value, label]) => (
                  <Toggle key={value} active={gender === value} onClick={() => setGender(value)}>
                    {label}
                  </Toggle>
                ))}
              </div>
            </Field>
          </div>
        )}

        {/* ── Step 3: Распоред ── */}
        {step === 2 && (
          <div className="space-y-3">
            {schedule.map((slot, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-zinc-200 bg-white p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={slot.group}
                    onChange={(e) => updateSlot(i, { group: e.target.value })}
                    className={inputCls}
                    placeholder="Група — пр. Деца 7–11"
                  />
                  {schedule.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setSchedule((rows) => rows.filter((_, j) => j !== i))}
                      className="shrink-0 text-zinc-400"
                      aria-label="Избриши ред">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {DAY_ORDER.map((d) => (
                    <Toggle
                      key={d}
                      active={slot.days.includes(d)}
                      onClick={() =>
                        updateSlot(i, {
                          days: slot.days.includes(d)
                            ? slot.days.filter((x) => x !== d)
                            : [...slot.days, d],
                        })
                      }>
                      {DAY_SHORT[Number(d)]}
                    </Toggle>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Од">
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateSlot(i, { startTime: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="До">
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateSlot(i, { endTime: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                </div>

                <input
                  value={slot.venue}
                  onChange={(e) => updateSlot(i, { venue: e.target.value })}
                  className={inputCls}
                  placeholder="Сала/терен (по избор)"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSchedule((rows) => [...rows, { ...EMPTY_SLOT }])}
              className="flex items-center gap-1.5 text-xs font-semibold text-teal-600">
              <Plus className="h-4 w-4" /> Додај група
            </button>
          </div>
        )}

        {/* ── Step 4: Ценовник ── */}
        {step === 3 && (
          <div className="space-y-3">
            {pricing.map((item, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-zinc-200 bg-white p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={item.label}
                    onChange={(e) => updatePrice(i, { label: e.target.value })}
                    className={inputCls}
                    placeholder="Ставка — пр. Членарина"
                  />
                  {pricing.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setPricing((rows) => rows.filter((_, j) => j !== i))}
                      className="shrink-0 text-zinc-400"
                      aria-label="Избриши ред">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={item.price}
                    onChange={(e) => updatePrice(i, { price: e.target.value.replace(/\D/g, "") })}
                    inputMode="numeric"
                    className={inputCls}
                    placeholder="Цена во денари"
                  />
                  <select
                    value={item.period}
                    onChange={(e) => updatePrice(i, { period: e.target.value })}
                    className={inputCls}>
                    {Object.entries(PERIOD_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  value={item.note}
                  onChange={(e) => updatePrice(i, { note: e.target.value })}
                  className={inputCls}
                  placeholder="Забелешка (по избор) — пр. попуст за втор член"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setPricing((rows) => [...rows, { ...EMPTY_PRICE }])}
              className="flex items-center gap-1.5 text-xs font-semibold text-teal-600">
              <Plus className="h-4 w-4" /> Додај ставка
            </button>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <Toggle active={freeTrial} onClick={() => setFreeTrial(!freeTrial)}>
                Прв тренинг бесплатно
              </Toggle>
              <Toggle active={acceptingMembers} onClick={() => setAcceptingMembers(!acceptingMembers)}>
                Примаме нови членови
              </Toggle>
            </div>

            <Field label="Како да се зачлени">
              <textarea value={howToJoin} onChange={(e) => setHowToJoin(e.target.value)} rows={3} className={inputCls} />
            </Field>
            <Field label="Линк за зачленување" hint="Формулар или страница за пријава (по избор).">
              <input value={joinUrl} onChange={(e) => setJoinUrl(e.target.value)} className={inputCls} placeholder="https://" />
            </Field>
          </div>
        )}

        {/* ── Step 5: Контакт ── */}
        {step === 4 && (
          <div className="space-y-3">
            <Field label="Сала/терен" hint="Каде всушност се тренира.">
              <input value={venue} onChange={(e) => setVenue(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Адреса">
              <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Населба">
              <input value={district} onChange={(e) => setDistrict(e.target.value)} className={inputCls} />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Телефон *">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} inputMode="tel" />
              </Field>
              <Field label="Е-пошта *">
                <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} inputMode="email" />
              </Field>
            </div>
            <p className="text-[11px] text-zinc-400">Доволен е барем еден контакт.</p>

            <Field label="Веб страна">
              <input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputCls} placeholder="https://" />
            </Field>
            <Field label="Facebook">
              <input value={facebook} onChange={(e) => setFacebook(e.target.value)} className={inputCls} placeholder="https://facebook.com/…" />
            </Field>
            <Field label="Instagram">
              <input value={instagram} onChange={(e) => setInstagram(e.target.value)} className={inputCls} placeholder="https://instagram.com/…" />
            </Field>

            {error ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>
            ) : null}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-zinc-100 bg-white px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={goBack}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900">
          <ChevronLeft size={14} /> Назад
        </button>

        {!isLast ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canAdvance}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40">
            Продолжи <ChevronRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40">
            {submitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Се испраќа…
              </>
            ) : (
              <>
                <Check size={14} /> Прати за преглед
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
