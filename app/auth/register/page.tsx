"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Mail, Lock, Eye, EyeOff, MailCheck, AlertCircle } from "lucide-react";
import { createClient } from "../../../lib/supabase/client";
import GoogleIcon from "../../../components/auth/GoogleIcon";
import { toast } from "sonner";
import { useMemo, useState } from "react";

const schema = z.object({
  full_name: z.string().min(2, "Внесете го вашето целосно име"),
  email: z.string().email("Внесете валидна е-пошта"),
  password: z.string().min(6, "Барем 6 знаци"),
});
type Fields = z.infer<typeof schema>;

const inputCls =
  "w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm text-theme-ink outline-none transition-colors placeholder:text-zinc-400 focus:border-primary focus:ring-2 focus:ring-primary/20";
const primaryBtn =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60";
const outlineBtn =
  "flex w-full items-center justify-center gap-2.5 rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-semibold text-theme-heading transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60";

/** Card shell — keeps every state visually consistent under the auth layout. */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex flex-col items-center gap-2 lg:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/logo-white.svg" alt="" className="h-12 w-auto" />
        <span className="text-lg font-extrabold tracking-tight text-white">
          Мој Прилеп
        </span>
      </div>
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xl shadow-zinc-200/40 sm:p-8">
        {children}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const supabase = useMemo(() => createClient(), []);
  const [done, setDone] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [existingEmail, setExistingEmail] = useState<string | null>(null);
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: Fields) {
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.full_name },
        // New signups land on their profile so the onboarding tour kicks in.
        emailRedirectTo: `${location.origin}/auth/callback?next=/account`,
      },
    });
    if (error) {
      toast.error(error.message);
      return;
    }

    // Supabase returns success but with empty identities[] when the email
    // is already registered — it silently skips sending to prevent email
    // enumeration. Detect this and offer the user a recovery path.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setExistingEmail(values.email);
      return;
    }

    setDone(true);
  }

  async function sendMagicLink(email: string) {
    setSendingLink(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setSendingLink(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLinkSentTo(email);
  }

  async function signUpWithGoogle() {
    setOauthLoading(true);
    // Survives the OAuth round-trip; PostAuthRedirect sends them to /account
    // even if Supabase drops the `next` param.
    try {
      localStorage.setItem("pp_signup_redirect", String(Date.now()));
    } catch {
      /* ignore */
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=/account` },
    });
    if (error) {
      setOauthLoading(false);
      toast.error(error.message);
    }
  }

  // After magic link sent (from recovery flow)
  if (linkSentTo) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
            <MailCheck size={22} className="text-primary" />
          </span>
          <p className="text-base font-semibold text-theme-heading">
            Линкот е испратен
          </p>
          <p className="text-sm text-theme-muted">
            Испративме линк за најава на <strong>{linkSentTo}</strong>. Проверете
            го вашиот сандак (и spam папка).
          </p>
          <Link
            href="/auth/login"
            className="mt-1 text-xs font-medium text-primary underline">
            Назад кон најава
          </Link>
        </div>
      </Card>
    );
  }

  // After successful signup
  if (done) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
            <MailCheck size={22} className="text-primary" />
          </span>
          <p className="text-base font-semibold text-theme-heading">
            Проверете ја вашата е-пошта
          </p>
          <p className="text-sm text-theme-muted">
            Испративме потврден линк. Кликнете на него за да ја активирате
            сметката. Ако не го гледате, проверете ја и spam папката.
          </p>
          <Link
            href="/auth/login"
            className="mt-1 text-xs font-medium text-primary underline">
            Назад кон најава
          </Link>
        </div>
      </Card>
    );
  }

  // Recovery UI when email already exists
  if (existingEmail) {
    return (
      <Card>
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
              <AlertCircle size={22} className="text-amber-500" />
            </span>
            <div>
              <p className="text-base font-semibold text-theme-heading">
                Оваа е-пошта е веќе регистрирана
              </p>
              <p className="mt-1 text-sm text-theme-muted">
                Веќе постои сметка со <strong>{existingEmail}</strong>.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <button
              type="button"
              className={primaryBtn}
              disabled={sendingLink}
              onClick={() => sendMagicLink(existingEmail)}>
              {sendingLink ? "Се испраќа…" : "Испрати ми линк за најава"}
            </button>
            <Link href="/auth/login" className="block">
              <span className={outlineBtn}>Најави се со лозинка</span>
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setExistingEmail(null)}
            className="block w-full text-xs text-theme-muted underline">
            Назад
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold text-theme-heading">Создадете сметка</h1>
        <p className="mt-1 text-sm text-theme-muted">
          Приклучи се на заедницата на Прилеп
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-theme-body">
            Целосно име
          </label>
          <div className="relative">
            <User
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              {...register("full_name")}
              autoComplete="name"
              placeholder="Име и презиме"
              className={inputCls}
            />
          </div>
          {errors.full_name && (
            <p className="mt-1 text-[11px] text-red-500">
              {errors.full_name.message}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-theme-body">
            Е-пошта
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="вие@primer.mk"
              className={inputCls}
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-[11px] text-red-500">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-theme-body">
            Лозинка
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Барем 6 знаци"
              className={`${inputCls} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Сокриј лозинка" : "Прикажи лозинка"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 hover:text-zinc-600">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-[11px] text-red-500">
              {errors.password.message}
            </p>
          )}
        </div>

        <button type="submit" disabled={isSubmitting} className={primaryBtn}>
          {isSubmitting ? "Се создава…" : "Создај сметка"}
        </button>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-100" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-zinc-400">
              или
            </span>
          </div>
        </div>

        <button
          type="button"
          className={outlineBtn}
          onClick={signUpWithGoogle}
          disabled={isSubmitting || oauthLoading}>
          <GoogleIcon size={18} />
          {oauthLoading ? "Се пренасочува…" : "Продолжи со Google"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-theme-muted">
        Веќе имате сметка?{" "}
        <Link
          href="/auth/login"
          className="font-semibold text-primary hover:underline">
          Најавете се
        </Link>
      </p>
    </Card>
  );
}
