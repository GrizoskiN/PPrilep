"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";

interface Props {
  userEmail?: string;
  userName?: string;
  onClose: () => void;
}

const CATEGORIES = [
  "Инфраструктура", "Образование", "Култура", "Спорт",
  "Животна средина", "Здравство", "Бизнис", "Заедница",
];

const STEPS = ["Приказна", "Медиа", "Детали", "Контакт"];

export default function SubmitStoryModal({ userEmail, userName, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");

  // Step 2
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");

  // Step 3
  const [categories, setCategories] = useState<string[]>([]);
  const [institution, setInstitution] = useState("");
  const [subject, setSubject] = useState("");

  // Step 4
  const [submitterName, setSubmitterName] = useState(userName ?? "");
  const [submitterEmail, setSubmitterEmail] = useState(userEmail ?? "");
  const [phone, setPhone] = useState("");
  const honeypotRef = useRef<HTMLInputElement>(null);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function addImages(files: FileList | null) {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5 - images.length);
    setImages((prev) => [...prev, ...newFiles]);
    newFiles.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreviews((prev) => [...prev, e.target?.result as string]);
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

  function canGoNext() {
    if (step === 0) return title.trim().length >= 3 && story.trim().length >= 10;
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">📤 Сподели приказна</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {done ? "Успешно испратено" : `Чекор ${step + 1} од ${STEPS.length} — ${STEPS[step]}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Progress bar */}
        {!done && (
          <div className="h-1 bg-slate-200 shrink-0">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5">
          {done ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Check size={28} className="text-primary" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900">Благодариме!</h3>
              <p className="text-sm text-zinc-500 max-w-xs">
                Приказната е примена. Нашиот уредник ќе ја прегледа и ако е соодветна — ќе ја
                objavi на страницата.
              </p>
              <button
                onClick={onClose}
                className="mt-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
                Затвори
              </button>
            </div>
          ) : (
            <>
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

              {step === 0 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700">
                      Наслов <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value.slice(0, 140))}
                        placeholder="Кратко и јасно наречи ја приказната..."
                        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400">
                        {title.length}/140
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700">
                      Приказна <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={story}
                      onChange={(e) => setStory(e.target.value.slice(0, 6000))}
                      placeholder="Опиши ја настанот, постигнувањето или добрата вест..."
                      rows={7}
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                    <p className="text-[11px] text-zinc-400 text-right">{story.length}/6000</p>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700">
                      Фотографии (до 5)
                    </label>
                    <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 p-5 cursor-pointer hover:border-primary/40 hover:bg-zinc-50 transition-colors">
                      <span className="text-2xl">🖼️</span>
                      <span className="text-xs text-zinc-500">Кликни за да додадеш слики</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => addImages(e.target.files)}
                      />
                    </label>
                    {imagePreviews.length > 0 && (
                      <div className="grid grid-cols-5 gap-2 mt-2">
                        {imagePreviews.map((src, i) => (
                          <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-zinc-100">
                            <img src={src} alt="" className="w-full h-full object-cover" />
                            <button
                              onClick={() => removeImage(i)}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700">Видео линк (YouTube / Vimeo)</label>
                    <input
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                      За поголеми видеа ни испрати порака на mojpprilep@gmail.com
                    </p>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700">Категорија</label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleCategory(c)}
                          className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                            categories.includes(c)
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-zinc-600 border-zinc-200 hover:border-primary/40"
                          }`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-700">Институција</label>
                      <input
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        placeholder="н.п. Општина Прилеп"
                        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-700">Тема / Предмет</label>
                      <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="н.п. Парк, Улица..."
                        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  {/* Summary card */}
                  <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 space-y-1">
                    <p className="text-xs font-semibold text-zinc-800 line-clamp-1">{title}</p>
                    <p className="text-[11px] text-zinc-500 line-clamp-2">{story}</p>
                    {categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {categories.map((c) => (
                          <span key={c} className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5">{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-700">Вашето ime</label>
                      <input
                        value={submitterName}
                        onChange={(e) => setSubmitterName(e.target.value)}
                        placeholder="Ime i prezime"
                        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-700">E-пошта</label>
                      <input
                        type="email"
                        value={submitterEmail}
                        onChange={(e) => setSubmitterEmail(e.target.value)}
                        placeholder="vasa@email.com"
                        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-700">
                        Телефон <span className="text-zinc-400 font-normal">(опционално)</span>
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+389 ..."
                        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  {error && (
                    <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer buttons */}
        {!done && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-100 bg-white shrink-0">
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ArrowLeft size={14} />
              Назад
            </button>

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canGoNext()}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Следно
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {submitting ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Испраќање...
                  </span>
                ) : (
                  <>
                    <Check size={14} />
                    Испрати приказна
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
