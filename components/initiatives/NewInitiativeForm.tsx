"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { X, Upload, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { createInitiative } from "../../app/actions/initiatives";
import { createClient } from "../../lib/supabase/client";
import { CATEGORY_LABELS_INIT } from "../../lib/initiatives";
import { DISTRICT_LABELS, cn } from "../../lib/utils";
import type { InitiativeCategory, District } from "../../lib/types/database";

const DISTRICTS: District[] = [
  "Center",
  "Varoš",
  "Trizla",
  "Točila",
  "Rid",
  "Tipski",
  "Boncejca",
  "KorzoMaalo",
];

const CATEGORIES = Object.keys(CATEGORY_LABELS_INIT) as InitiativeCategory[];

const STEPS = [
  { n: 1, label: "Основни" },
  { n: 2, label: "Детали" },
  { n: 3, label: "Преглед" },
] as const;

interface State {
  title: string;
  description: string;
  category: InitiativeCategory | "";
  district: District | "";
  street_name: string;
  cover_image: File | null;
  cover_preview: string | null;
  problem_statement: string;
  expected_impact: string;
  open_funding: boolean;
  target_amount: string;
  funding_deadline: string;
}

const EMPTY: State = {
  title: "",
  description: "",
  category: "",
  district: "",
  street_name: "",
  cover_image: null,
  cover_preview: null,
  problem_statement: "",
  expected_impact: "",
  open_funding: false,
  target_amount: "",
  funding_deadline: "",
};

export default function NewInitiativeForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState(1);
  const [state, setState] = useState<State>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function set<K extends keyof State>(key: K, value: State[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function pickImage(file: File | null) {
    if (state.cover_preview) URL.revokeObjectURL(state.cover_preview);
    if (!file) {
      setState((s) => ({ ...s, cover_image: null, cover_preview: null }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Сликата е поголема од 5MB");
      return;
    }
    const url = URL.createObjectURL(file);
    setState((s) => ({ ...s, cover_image: file, cover_preview: url }));
  }

  // ── Step validation ───────────────────────────────────────────────
  function validateStep1(): boolean {
    const e: Record<string, string> = {};
    if (state.title.trim().length < 10) e.title = "Минимум 10 знаци";
    else if (state.title.trim().length > 120) e.title = "Максимум 120 знаци";
    if (state.description.trim().length < 50) e.description = "Минимум 50 знаци";
    else if (state.description.trim().length > 2000) e.description = "Максимум 2000 знаци";
    if (!state.category) e.category = "Изберете категорија";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2(): boolean {
    const e: Record<string, string> = {};
    if (state.problem_statement.length > 500) e.problem_statement = "Максимум 500 знаци";
    if (state.expected_impact.length > 500) e.expected_impact = "Максимум 500 знаци";
    if (state.open_funding) {
      const n = Number(state.target_amount);
      if (!state.target_amount || isNaN(n) || n <= 0)
        e.target_amount = "Внесете позитивен износ";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => Math.min(3, s + 1));
  }

  function back() {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
  }

  function submit() {
    if (!validateStep1() || !validateStep2()) {
      setStep(Object.keys(errors).some((k) => ["title", "description", "category"].includes(k)) ? 1 : 2);
      return;
    }

    startTransition(async () => {
      // 1) Client-side image upload (avoids server action body limits)
      let coverUrl: string | null = null;
      if (state.cover_image) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Сесијата истече, најавете се повторно");
          router.push("/auth/login?next=/initiatives/new");
          return;
        }
        const ext = state.cover_image.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("initiative-images")
          .upload(path, state.cover_image, { cacheControl: "3600", upsert: false });
        if (upErr) {
          toast.error(`Грешка при прикачување слика: ${upErr.message}`);
          return;
        }
        coverUrl = supabase.storage.from("initiative-images").getPublicUrl(path).data.publicUrl;
      }

      // 2) Submit text fields + uploaded URL via FormData
      const fd = new FormData();
      fd.set("title", state.title.trim());
      fd.set("description", state.description.trim());
      fd.set("category", state.category);
      if (state.district) fd.set("district", state.district);
      if (state.street_name.trim()) fd.set("street_name", state.street_name.trim());
      if (state.problem_statement.trim()) fd.set("problem_statement", state.problem_statement.trim());
      if (state.expected_impact.trim()) fd.set("expected_impact", state.expected_impact.trim());
      if (state.open_funding && state.target_amount) {
        fd.set("target_amount", state.target_amount);
        if (state.funding_deadline) {
          fd.set("funding_deadline", new Date(state.funding_deadline).toISOString());
        }
      }
      if (coverUrl) fd.set("cover_image_url", coverUrl);

      const res = await createInitiative(fd);
      if (!res.success) {
        toast.error(res.error);
        if (res.fieldErrors) {
          const e: Record<string, string> = {};
          for (const [k, msgs] of Object.entries(res.fieldErrors)) {
            if (msgs?.[0]) e[k] = msgs[0];
          }
          setErrors(e);
        }
        return;
      }
      toast.success("Иницијативата е поднесена!");
      router.push("/initiatives?stage=idea");
    });
  }

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s.n} className="flex items-center gap-2 flex-1">
            <span
              className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold border",
                step >= s.n
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-theme-muted border-zinc-300",
              )}>
              {step > s.n ? <Check size={12} /> : s.n}
            </span>
            <span
              className={cn(
                "text-[11px]",
                step === s.n ? "font-semibold text-theme-ink" : "text-theme-muted",
              )}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className={cn("flex-1 h-px", step > s.n ? "bg-slate-900" : "bg-zinc-200")} />
            )}
          </li>
        ))}
      </ol>

      <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-4">
        {step === 1 && (
          <Step1
            state={state}
            errors={errors}
            set={set}
            pickImage={pickImage}
          />
        )}
        {step === 2 && <Step2 state={state} errors={errors} set={set} />}
        {step === 3 && <Step3 state={state} />}
      </div>

      <div className="flex items-center justify-between gap-2">
        {step > 1 ? (
          <button
            type="button"
            onClick={back}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-sm text-theme-muted hover:text-theme-ink px-3 py-2">
            <ChevronLeft size={14} /> Назад
          </button>
        ) : <span />}

        {step < 3 ? (
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-xl">
            Продолжи <ChevronRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-60">
            {pending ? "Се поднесува…" : "Поднеси иницијатива"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Steps ──────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-[11px] text-red-600 mt-1">{msg}</p>;
}

function CharCount({ value, max }: { value: string; max: number }) {
  return (
    <span className="text-[10px] text-theme-subtle ml-auto">
      {value.length} / {max}
    </span>
  );
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-theme-ink mb-1">
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10";

function Step1({
  state,
  errors,
  set,
  pickImage,
}: {
  state: State;
  errors: Record<string, string>;
  set: <K extends keyof State>(k: K, v: State[K]) => void;
  pickImage: (f: File | null) => void;
}) {
  return (
    <>
      <div>
        <div className="flex items-end gap-2">
          <Label htmlFor="title">Наслов</Label>
          <CharCount value={state.title} max={120} />
        </div>
        <input
          id="title"
          className={inputCls}
          value={state.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Кратко и јасно"
        />
        <FieldError msg={errors.title} />
      </div>

      <div>
        <div className="flex items-end gap-2">
          <Label htmlFor="description">Опис</Label>
          <CharCount value={state.description} max={2000} />
        </div>
        <textarea
          id="description"
          rows={5}
          className={inputCls}
          value={state.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Опишете ја идејата детално…"
        />
        <FieldError msg={errors.description} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="category">Категорија</Label>
          <select
            id="category"
            className={inputCls}
            value={state.category}
            onChange={(e) => set("category", e.target.value as InitiativeCategory)}>
            <option value="">— Избери —</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS_INIT[c]}</option>
            ))}
          </select>
          <FieldError msg={errors.category} />
        </div>
        <div>
          <Label htmlFor="district">Населба</Label>
          <select
            id="district"
            className={inputCls}
            value={state.district}
            onChange={(e) => set("district", e.target.value as District)}>
            <option value="">— По избор —</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>{DISTRICT_LABELS[d] ?? d}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="street">Улица (опционално)</Label>
        <input
          id="street"
          className={inputCls}
          value={state.street_name}
          onChange={(e) => set("street_name", e.target.value)}
        />
      </div>

      <div>
        <Label>Слика на насловница</Label>
        {state.cover_preview ? (
          <div className="relative w-full h-40 rounded-lg overflow-hidden bg-zinc-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={state.cover_preview} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => pickImage(null)}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1">
              <X size={14} />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-zinc-300 rounded-lg py-6 cursor-pointer hover:bg-zinc-50">
            <Upload size={18} className="text-theme-muted" />
            <span className="text-xs text-theme-muted">Прикачи слика (до 5MB)</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickImage(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
      </div>
    </>
  );
}

function Step2({
  state,
  errors,
  set,
}: {
  state: State;
  errors: Record<string, string>;
  set: <K extends keyof State>(k: K, v: State[K]) => void;
}) {
  return (
    <>
      <div>
        <div className="flex items-end gap-2">
          <Label htmlFor="problem">Кој проблем го решава?</Label>
          <CharCount value={state.problem_statement} max={500} />
        </div>
        <textarea
          id="problem"
          rows={3}
          className={inputCls}
          value={state.problem_statement}
          onChange={(e) => set("problem_statement", e.target.value)}
        />
        <FieldError msg={errors.problem_statement} />
      </div>

      <div>
        <div className="flex items-end gap-2">
          <Label htmlFor="impact">Очекуван ефект</Label>
          <CharCount value={state.expected_impact} max={500} />
        </div>
        <textarea
          id="impact"
          rows={3}
          className={inputCls}
          value={state.expected_impact}
          onChange={(e) => set("expected_impact", e.target.value)}
        />
        <FieldError msg={errors.expected_impact} />
      </div>

      <label className="flex items-start gap-2 cursor-pointer pt-2">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={state.open_funding}
          onChange={(e) => set("open_funding", e.target.checked)}
        />
        <span className="text-sm text-theme-ink">
          Сакам да отворам фонд кампања кога ќе се достигне прагот
        </span>
      </label>

      {state.open_funding && (
        <div className="grid grid-cols-2 gap-3 pl-6">
          <div>
            <Label htmlFor="target">Цел за финансирање (ден.)</Label>
            <input
              id="target"
              type="number"
              min={1}
              className={inputCls}
              value={state.target_amount}
              onChange={(e) => set("target_amount", e.target.value)}
            />
            <FieldError msg={errors.target_amount} />
          </div>
          <div>
            <Label htmlFor="deadline">Рок за финансирање</Label>
            <input
              id="deadline"
              type="date"
              className={inputCls}
              value={state.funding_deadline}
              onChange={(e) => set("funding_deadline", e.target.value)}
            />
          </div>
        </div>
      )}
    </>
  );
}

function Step3({ state }: { state: State }) {
  const items: { label: string; value: string }[] = [
    { label: "Наслов", value: state.title || "—" },
    { label: "Категорија", value: state.category ? CATEGORY_LABELS_INIT[state.category as InitiativeCategory] : "—" },
    { label: "Населба", value: state.district ? DISTRICT_LABELS[state.district] ?? state.district : "—" },
    { label: "Улица", value: state.street_name || "—" },
    { label: "Опис", value: state.description },
    { label: "Проблем", value: state.problem_statement || "—" },
    { label: "Ефект", value: state.expected_impact || "—" },
  ];

  if (state.open_funding) {
    items.push(
      { label: "Цел (ден.)", value: state.target_amount || "—" },
      { label: "Рок", value: state.funding_deadline || "—" },
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-theme-ink">Преглед</h3>
      {state.cover_preview && (
        <div className="relative w-full h-40 rounded-lg overflow-hidden bg-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={state.cover_preview} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <dl className="grid grid-cols-1 sm:grid-cols-[140px,1fr] gap-y-2 gap-x-3 text-sm">
        {items.map((it) => (
          <div key={it.label} className="contents">
            <dt className="text-xs text-theme-muted">{it.label}</dt>
            <dd className="text-theme-ink whitespace-pre-wrap wrap-break-word">{it.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
