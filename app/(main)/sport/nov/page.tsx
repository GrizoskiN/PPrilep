"use client";

/**
 * "Пријави го твојот клуб" — the structured submission form.
 *
 * This form IS the section's design: every club fills in the same fields, so
 * every published profile renders identically. Nothing here goes live on its
 * own — the API writes an unpublished draft and an editor reviews it.
 *
 * Cyrillic is enforced as a WARNING, never a block. Latin text is flagged so
 * the club can fix it themselves, but a submission is never refused over it:
 * emails, links and Latin-branded club names are all legitimate, and a club
 * that cannot submit its own name simply does not submit at all.
 */

import { useRef, useState } from "react";
import Link from "next/link";
import { Check, ImagePlus, Plus, Trash2, X } from "lucide-react";

import { useAuth } from "../../../../lib/hooks/useAuth";
import { AGE_LABEL, DAY_SHORT, KIND_LABEL, PERIOD_LABEL } from "../../../../lib/sanity/sport";

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
} from "../../../../components/sport/FormBits";

export default function NewSportClubPage() {
  const { user } = useAuth();

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

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);

  // A single warning line, not one per field: the point is to nudge, and a
  // form covered in red text reads as broken rather than as a suggestion.
  const latinWarning = [name, shortDescription, about, howToJoin, venue, district]
    .concat(schedule.map((s) => s.group))
    .concat(pricing.map((p) => p.label))
    .some((v) => LATIN.test(v));

  const canSubmit =
    name.trim().length >= 3 &&
    sports.trim().length > 0 &&
    (phone.trim().length > 0 || email.trim().length > 0) &&
    !submitting;

  function pickLogo(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setLogo(file);
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
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
      form.append("venue", venue);
      form.append("address", address);
      form.append("district", district);
      form.append("phone", phone);
      form.append("email", email);
      form.append("website", website);
      form.append("facebook", facebook);
      form.append("instagram", instagram);
      // Repeating rows travel as JSON — see the note in the API route.
      form.append(
        "schedule",
        JSON.stringify(schedule.filter((s) => s.group.trim() && s.startTime && s.days.length)),
      );
      form.append(
        "pricing",
        JSON.stringify(pricing.filter((p) => p.label.trim() && p.price !== "")),
      );
      if (logo) form.append("logo", logo);

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
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50">
          <Check className="h-7 w-7 text-teal-600" />
        </div>
        <h1 className="mt-4 text-base font-bold text-zinc-900">Благодариме!</h1>
        <p className="mt-1 max-w-xs text-sm leading-relaxed text-zinc-500">
          Пријавата е примена. Ќе ја прегледаме и ако е во ред, профилот ќе биде
          објавен во Спорт и Рекреација.
        </p>
        <Link
          href="/sport"
          className="mt-5 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white"
        >
          Назад кон клубовите
        </Link>
      </div>
    );
  }

  // ── Signed out ────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="space-y-4 px-1 py-8 text-center">
        <h1 className="text-base font-bold text-zinc-900">Пријави го твојот клуб</h1>
        <p className="text-sm text-zinc-500">
          Мора да си најавен за да пратиш профил — така знаеме со кого да
          контактираме ако нешто треба да се дополни.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white"
        >
          Најави се
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <Link href="/sport" className="text-xs font-semibold text-teal-600">
          ← Спорт и Рекреација
        </Link>
        <h1 className="mt-2 text-base font-bold text-zinc-900">Пријави го твојот клуб</h1>
        <p className="text-xs text-zinc-500">
          Профилот е бесплатен. Пополни колку што можеш — можеш да дополниш и подоцна.
        </p>
      </div>

      <input ref={honeypot} name="nickname" type="text" tabIndex={-1} autoComplete="off" className="hidden" />

      {latinWarning ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
          Пиши на кирилица за профилот да изгледа исто како другите. (Линковите и
          е-поштата остануваат на латиница — тоа е во ред.)
        </p>
      ) : null}

      {/* ── Основно ────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">Основно</h2>

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
                className="flex items-center gap-1 text-xs font-semibold text-zinc-500"
              >
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
      </section>

      {/* ── За кого ────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">За кого</h2>

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
                }
              >
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
      </section>

      {/* ── Распоред ───────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">Распоред на тренинзи</h2>
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
                  aria-label="Избриши ред"
                >
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
                  }
                >
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
          className="flex items-center gap-1.5 text-xs font-semibold text-teal-600"
        >
          <Plus className="h-4 w-4" /> Додај група
        </button>
      </section>

      {/* ── Ценовник ───────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">Ценовник</h2>
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
                  aria-label="Избриши ред"
                >
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
                className={inputCls}
              >
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
          className="flex items-center gap-1.5 text-xs font-semibold text-teal-600"
        >
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
      </section>

      {/* ── Локација и контакт ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">Локација и контакт</h2>

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
      </section>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>
      ) : null}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="w-full rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white disabled:bg-zinc-300"
      >
        {submitting ? "Се испраќа…" : "Прати за преглед"}
      </button>
      <p className="text-center text-[11px] text-zinc-400">
        Профилот не се објавува веднаш — прво го прегледува редакцијата.
      </p>
    </div>
  );
}
