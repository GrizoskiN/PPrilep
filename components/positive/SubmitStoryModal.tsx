"use client";

import { useEffect, useRef, useState } from "react";
import { X, Upload, ArrowLeft, ArrowRight, Check, ImagePlus, Sparkles } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "Образование", "Спорт", "Животна средина", "Култура",
  "Деца и млади", "Инфраструктура", "Здравство", "Друго",
];

const STEPS = [
  { label: "Приказна", emoji: "✍️" },
  { label: "Медиа",    emoji: "📷" },
  { label: "Детали",   emoji: "🏷️" },
  { label: "Контакт",  emoji: "📞" },
];
const TOTAL_STEPS = STEPS.length;

interface Props {
  onClose: () => void;
  userEmail?: string | null;
  userName?: string | null;
}

export default function SubmitStoryModal({ onClose, userEmail, userName }: Props) {
  const [step, setStep] = useState(1);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  // Fields
  const [title, setTitle]               = useState("");
  const [story, setStory]               = useState("");
  const [images, setImages]             = useState<File[]>([]);
  const [previews, setPreviews]         = useState<string[]>([]);
  const [videoUrl, setVideoUrl]         = useState("");
  const [category, setCategory]         = useState("");
  const [institution, setInstitution]   = useState("");
  const [subject, setSubject]           = useState("");
  const [submitterName, setName]        = useState(userName ?? "");
  const [submitterEmail, setEmail]      = useState(userEmail ?? "");
  const [phone, setPhone]               = useState("");
  const [website, setWebsite]           = useState(""); // honeypot
  const fileRef = useRef<HTMLInputElement>(null);

  // Keep prefilled contact in sync if auth resolves after mount
  useEffect(() => { if (userName)  setName((v) => v || userName); }, [userName]);
  useEffect(() => { if (userEmail) setEmail((v) => v || userEmail); }, [userEmail]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function canProceed() {
    if (step === 1) return title.trim().length > 2 && story.trim().length > 10;
    return true;
  }
  function next() { if (canProceed()) setStep((s) => Math.min(s + 1, TOTAL_STEPS)); }
  function back() { setStep((s) => Math.max(s - 1, 1)); }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5 - images.length);
    setImages((p) => [...p, ...newFiles].slice(0, 5));
    setPreviews((p) => [...p, ...newFiles.map((f) => URL.createObjectURL(f))].slice(0, 5));
  }
  function removeImage(i: number) {
    setImages((p) => p.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("story", story);
      if (institution) fd.append("institution", institution);
      if (subject)     fd.append("subject", subject);
      if (category)    fd.append("category", category);
      if (videoUrl)    fd.append("videoUrl", videoUrl);
      if (submitterName)  fd.append("submitterName", submitterName);
      if (submitterEmail) fd.append("submitterEmail", submitterEmail);
      if (phone)          fd.append("phone", phone);
      fd.append("website", website);
      images.forEach((img) => fd.append("images", img));

      const res = await fetch("/api/positive/submit", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Грешка при испраќање."); return; }
      setDone(true);
    } catch {
      toast.error("Нема конекција. Обиди се повторно.");
    } finally {
      setSending(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-800 placeholder:text-slate-300 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all";
  const labelCls = "mb-2 block text-sm font-semibold text-slate-700";
  const progressPct = done ? 100 : ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" onClick={onClose} />

      <div className="relative z-10 flex w-full max-w-2xl flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl max-h-[94vh] sm:max-h-[88vh]">

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="relative shrink-0 rounded-t-3xl border-b border-slate-100 bg-slate-50 px-6 pt-6 pb-5 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl ring-1 ring-slate-200">
              ☀️
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 sm:text-xl">Сподели ја твојата вест</h2>
              <p className="text-[13px] text-slate-500">
                Позитивна приказна од Прилеп — ние ќе ја раскажеме.
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between">
              {STEPS.map((s, i) => {
                const n = i + 1;
                const active = n === step && !done;
                const complete = n < step || done;
                return (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => !done && n < step && setStep(n)}
                    className={`flex items-center gap-1.5 text-[12px] font-medium transition-colors ${
                      active ? "text-slate-800" : complete ? "text-primary" : "text-slate-400"
                    }`}>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                      complete ? "bg-primary text-white"
                      : active ? "bg-white text-slate-700 ring-1 ring-slate-300"
                      : "bg-slate-200 text-slate-400"
                    }`}>
                      {complete ? <Check size={11} /> : n}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Honeypot */}
        <input
          type="text" name="website" tabIndex={-1} autoComplete="off"
          value={website} onChange={(e) => setWebsite(e.target.value)} aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        />

        {/* ── Content ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          {done ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-4xl">
                🎉
              </div>
              <h3 className="mt-5 text-xl font-bold text-slate-800">Благодариме!</h3>
              <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-slate-500">
                Твојата приказна е испратена за преглед. Редакцијата ќе ја прегледа
                и ќе ја објави наскоро. Ако треба, ќе те контактираме.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
                Затвори
              </button>
            </div>
          ) : step === 1 ? (
            <div className="space-y-5">
              <div>
                <label className={labelCls}>Наслов <span className="text-primary">*</span></label>
                <input
                  type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="Кратко и јасно — за што е приказната?"
                  maxLength={140} autoFocus className={inputCls}
                />
                <p className="mt-1.5 text-right text-[11px] text-slate-300">{title.length}/140</p>
              </div>
              <div>
                <label className={labelCls}>Приказна <span className="text-primary">*</span></label>
                <textarea
                  value={story} onChange={(e) => setStory(e.target.value)} rows={7}
                  placeholder="Раскажи ни. Што се случи? Кој е вклучен? Зошто е важно за Прилеп?"
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
          ) : step === 2 ? (
            <div className="space-y-5">
              <div>
                <label className={labelCls}>Фотографии <span className="font-normal text-slate-400">(до 5)</span></label>
                {previews.length > 0 && (
                  <div className="mb-3 grid grid-cols-4 gap-2.5 sm:grid-cols-5">
                    {previews.map((src, i) => (
                      <div key={i} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="h-full w-full object-cover" />
                        <button type="button" onClick={() => removeImage(i)}
                          className="absolute right-1 top-1 rounded-full bg-slate-900/70 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {images.length < 5 && (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-8 text-slate-400 hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors">
                    <ImagePlus size={28} strokeWidth={1.5} />
                    <span className="text-sm font-medium">
                      {images.length === 0 ? "Кликни за да додадеш фотографии" : `Додади уште (${images.length}/5)`}
                    </span>
                    <span className="text-[11px] text-slate-300">JPG, PNG · до 8 MB</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => handleFiles(e.target.files)} />
              </div>

              <div>
                <label className={labelCls}>Видео линк <span className="font-normal text-slate-400">(незадолжително)</span></label>
                <input
                  type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..." className={inputCls}
                />
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3.5">
                <span className="mt-0.5 shrink-0 text-base">📎</span>
                <p className="text-[13px] leading-relaxed text-amber-800">
                  Ако видеото не е на YouTube / Vimeo, испрати го на{" "}
                  <a href="mailto:mojpprilep@gmail.com" className="font-semibold underline underline-offset-2">
                    mojpprilep@gmail.com
                  </a>.
                </p>
              </div>
            </div>
          ) : step === 3 ? (
            <div className="space-y-5">
              <p className="text-[13px] text-slate-400">
                Овие информации ни помагаат подобро да ја категоризираме приказната. Сите се незадолжителни.
              </p>
              <div>
                <label className={labelCls}>Категорија</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c} type="button"
                      onClick={() => setCategory(category === c ? "" : c)}
                      className={`rounded-full border px-3.5 py-2 text-[13px] font-medium transition-all ${
                        category === c
                          ? "border-primary bg-primary text-white shadow-sm"
                          : "border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary"
                      }`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Институција</label>
                  <input
                    type="text" value={institution} onChange={(e) => setInstitution(e.target.value)}
                    placeholder="пр. ОУ Кире Гаврилоски" className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Тема / Предмет</label>
                  <input
                    type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                    placeholder="пр. Деца, Паркови, Награда..." className={inputCls}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3.5">
                <Sparkles size={18} className="mt-0.5 shrink-0 text-primary" />
                <p className="text-[13px] leading-relaxed text-slate-600">
                  Контактот се користи само ако имаме прашања за приказната —
                  <span className="font-semibold"> нема да биде јавно прикажан.</span>
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Име</label>
                  <input
                    type="text" value={submitterName} onChange={(e) => setName(e.target.value)}
                    placeholder="Твоето Име" className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Е-пошта</label>
                  <input
                    type="email" value={submitterEmail} onChange={(e) => setEmail(e.target.value)}
                    placeholder="ime@primer.com" className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Телефон <span className="font-normal text-slate-400">(незадолжително)</span></label>
                <input
                  type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="07X XXX XXX" className={inputCls}
                />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  За побрз контакт доколку приказната бара дополнителни детали.
                </p>
              </div>

              {/* Summary */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Преглед на приказната</p>
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-slate-800">{title || "—"}</p>
                  <p className="line-clamp-2 text-[13px] text-slate-500">{story || "—"}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {category && <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">{category}</span>}
                    {institution && <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">{institution}</span>}
                    {images.length > 0 && <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">📷 {images.length}</span>}
                    {videoUrl && <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">🎥 видео</span>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        {!done && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 sm:px-8 shrink-0">
            {step > 1 ? (
              <button type="button" onClick={back}
                className="flex items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors">
                <ArrowLeft size={15} /> Назад
              </button>
            ) : <div />}

            {step < TOTAL_STEPS ? (
              <button
                type="button" onClick={next} disabled={!canProceed()}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-40 transition-all">
                Следно <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="button" onClick={handleSubmit} disabled={sending}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-all">
                {sending ? "Се испраќа..." : <><Check size={15} /> Испрати приказна</>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
