"use client";

import { Fragment, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ImagePlus, X } from "lucide-react";
import { cn } from "../../lib/utils";

const CATEGORIES = [
  "Образование", "Спорт", "Животна средина", "Култура",
  "Деца и млади", "Инфраструктура", "Здравство", "Друго",
];

const STEPS = [
  { n: 1, label: "Приказна" },
  { n: 2, label: "Медиа" },
  { n: 3, label: "Контакт" },
] as const;

const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10";

interface Props {
  /** Called from step 1's „Назад" — return to a chooser screen or close. */
  onCancel: () => void;
  /** Called after a successful submit (Затвори button). */
  onClose: () => void;
  userEmail?: string;
  userName?: string;
}

/**
 * Embedded 3-step "share a story" wizard. Renders the step indicator,
 * scrollable body and footer — but NO modal chrome, so it can live inside
 * ActionModal's slide track or a standalone shell (SubmitStoryModal).
 */
export default function StoryForm({ onCancel, onClose, userEmail, userName }: Props) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — story + details
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [institution, setInstitution] = useState("");
  const [subject, setSubject] = useState("");

  // Step 2 — media
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");

  // Step 3 — contact
  const [submitterName, setSubmitterName] = useState(userName ?? "");
  const [submitterEmail, setSubmitterEmail] = useState(userEmail ?? "");
  const [phone, setPhone] = useState("");
  const honeypotRef = useRef<HTMLInputElement>(null);

  function addImages(files: FileList | null) {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5 - images.length);
    setImages((prev) => [...prev, ...newFiles]);
    newFiles.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) =>
        setImagePreviews((prev) => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  }

  function removeImage(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
    setImagePreviews((prev) => prev.filter((_, idx) => idx !== i));
  }

  function toggleCategory(c: string) {
    setCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  }

  function canAdvance() {
    if (step === 1) return title.trim().length >= 3 && story.trim().length >= 10;
    return true;
  }

  async function handleSubmit() {
    if (honeypotRef.current?.value) { setDone(true); return; }
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("title", title);
      form.append("story", story);
      form.append("videoUrl", videoUrl);
      form.append("institution", institution);
      form.append("subject", subject);
      form.append("submitterName", submitterName);
      form.append("submitterEmail", submitterEmail);
      form.append("phone", phone);
      form.append("categories", categories.join(","));
      images.forEach((f) => form.append("images", f));

      const res = await fetch("/api/positive/submit", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Грешка при испраќање.");
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Непозната грешка.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success ───────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <Check size={28} className="text-emerald-600" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-zinc-900">Благодариме!</h3>
        <p className="mt-1 max-w-xs text-sm leading-relaxed text-zinc-500">
          Приказната е примена. Нашиот уредник ќе ја прегледа и ако е соодветна,
          ќе ја објави на страницата.
        </p>
        <button
          onClick={onClose}
          className="mt-5 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
          Затвори
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Honeypot */}
      <input
        ref={honeypotRef}
        name="website"
        type="text"
        tabIndex={-1}
        aria-hidden="true"
        className="absolute opacity-0 pointer-events-none"
        autoComplete="off"
      />

      {/* Step indicator */}
      <div className="flex shrink-0 items-center border-b border-zinc-100 bg-white px-4 pb-3 pt-4 sm:px-5">
        {STEPS.map((s, i) => {
          const active = step === s.n;
          const completed = step > s.n;
          return (
            <Fragment key={s.n}>
              <div
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "bg-slate-900 text-white"
                    : completed
                      ? "bg-slate-100 text-slate-700"
                      : "bg-zinc-100 text-zinc-400",
                )}>
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-bold",
                    active ? "bg-white/20 text-white" : "bg-white text-zinc-500",
                  )}>
                  {completed ? <Check size={12} /> : s.n}
                </span>
                <span>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <span className={cn("mx-2 h-px flex-1", completed ? "bg-slate-900" : "bg-zinc-200")} />
              )}
            </Fragment>
          );
        })}
      </div>

      {/* Body */}
      <div className="desktop-scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        {/* ── Step 1: Story + details ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-end gap-2">
                <label className="text-xs font-medium text-zinc-700">Наслов</label>
                <span className="ml-auto text-[10px] text-zinc-400">{title.length} / 140</span>
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 140))}
                placeholder="Кратко и јасно — за што е приказната?"
                className={inputCls}
              />
            </div>

            <div>
              <div className="mb-1 flex items-end gap-2">
                <label className="text-xs font-medium text-zinc-700">Приказна</label>
                <span className="ml-auto text-[10px] text-zinc-400">{story.length} / 6000</span>
              </div>
              <textarea
                value={story}
                onChange={(e) => setStory(e.target.value.slice(0, 6000))}
                placeholder="Раскажи ни. Што се случи? Кој е вклучен? Зошто е важно за Прилеп?"
                rows={6}
                className={cn(inputCls, "resize-none")}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                Категорија <span className="font-normal text-zinc-400">(незадолжително)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCategory(c)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      categories.includes(c)
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300",
                    )}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Институција</label>
                <input
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="пр. ОУ Кире Гаврилоски"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Тема / Предмет</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="пр. Деца, Паркови…"
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Media ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                Фотографии <span className="font-normal text-zinc-400">(до 5)</span>
              </label>
              {imagePreviews.length > 0 && (
                <div className="mb-2 grid grid-cols-5 gap-2">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="group relative aspect-square overflow-hidden rounded-lg bg-zinc-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {images.length < 5 && (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-zinc-300 py-6 hover:bg-zinc-50">
                  <ImagePlus size={20} className="text-zinc-400" />
                  <span className="text-xs text-zinc-500">Прикачи фотографии (до 8MB)</span>
                  <input type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => addImages(e.target.files)} />
                </label>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">
                Видео линк <span className="font-normal text-zinc-400">(незадолжително)</span>
              </label>
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
                className={inputCls}
              />
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5">
                <span className="mt-px shrink-0 text-sm">📎</span>
                <p className="text-[11px] leading-relaxed text-amber-700">
                  Ако видеото не е на YouTube / Vimeo, испрати го на{" "}
                  <a href="mailto:mojpprilep@gmail.com" className="font-semibold underline">
                    mojpprilep@gmail.com
                  </a>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Contact + preview ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
              <span className="mt-px shrink-0 text-sm">🤝</span>
              <p className="text-[11px] leading-relaxed text-zinc-600">
                Контактот се користи само ако имаме прашања за приказната —{" "}
                <strong className="text-zinc-800">нема да биде јавно прикажан.</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Име</label>
                <input
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  placeholder="Вашето ime"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">E-пошта</label>
                <input
                  type="email"
                  value={submitterEmail}
                  onChange={(e) => setSubmitterEmail(e.target.value)}
                  placeholder="vasa@email.com"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">
                Телефон <span className="font-normal text-zinc-400">(незадолжително)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07X XXX XXX"
                className={inputCls}
              />
            </div>

            <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Преглед на приказната
              </p>
              <p className="line-clamp-1 text-sm font-semibold text-zinc-900">{title || "—"}</p>
              <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500">{story}</p>
              {(categories.length > 0 || imagePreviews.length > 0) && (
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  {categories.map((c) => (
                    <span key={c} className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      {c}
                    </span>
                  ))}
                  {imagePreviews.length > 0 && (
                    <span className="text-[10px] text-zinc-400">📷 {imagePreviews.length}</span>
                  )}
                </div>
              )}
            </div>

            {error && (
              <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-zinc-100 bg-white px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={() => (step > 1 ? setStep((s) => s - 1) : onCancel())}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900">
          <ChevronLeft size={14} /> Назад
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={() => canAdvance() && setStep((s) => s + 1)}
            disabled={!canAdvance()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">
            Продолжи <ChevronRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
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
                <Check size={14} /> Испрати приказна
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
