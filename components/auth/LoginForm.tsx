"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff, MailCheck } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import GoogleIcon from "./GoogleIcon";
import FacebookIcon from "./FacebookIcon";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { useTurnstile } from "../../lib/hooks/useTurnstile";

const schema = z.object({
  email: z.string().email("Внесете валидна е-пошта"),
  password: z.string().min(6, "Лозинката мора да има барем 6 знаци"),
});
type Fields = z.infer<typeof schema>;

const inputCls =
  "w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm text-theme-ink outline-none transition-colors placeholder:text-zinc-400 focus:border-primary focus:ring-2 focus:ring-primary/20";
const primaryBtn =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60";
const outlineBtn =
  "flex w-full items-center justify-center gap-2.5 rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-semibold text-theme-heading transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60";

export default function LoginForm() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [magicSent, setMagicSent] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");
  const [magicLoading, setMagicLoading] = useState(false);
  // Which provider is mid-redirect, so only that button reads as busy.
  const [oauthLoading, setOauthLoading] = useState<"google" | "facebook" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const captcha = useTurnstile();

  function getAuthRedirectOrigin() {
    const envOrigin = process.env.NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN?.trim();
    if (envOrigin) return envOrigin.replace(/\/$/, "");
    // Use whatever host the browser is actually on — keeps phone-on-LAN
    // (192.168.x.x:3000) and localhost testing on the same origin instead of
    // bouncing to the production Site URL.
    return location.origin;
  }

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: Fields) {
    const { error } = await supabase.auth.signInWithPassword({
      ...values,
      options: { captchaToken: captcha.token ?? undefined },
    });
    if (error) {
      captcha.reset(); // token is single-use — refresh for the next attempt
      toast.error(error.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function sendMagicLink() {
    const email = getValues("email");
    if (!email) {
      toast.error("Прво внесете е-пошта");
      return;
    }
    setMagicLoading(true);
    const authOrigin = getAuthRedirectOrigin();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${authOrigin}/auth/callback`,
        captchaToken: captcha.token ?? undefined,
      },
    });
    setMagicLoading(false);
    if (error) {
      captcha.reset();
      toast.error(error.message);
      return;
    }
    setMagicEmail(email);
    setMagicSent(true);
    toast.success("Магичниот линк е испратен!");
  }

  async function signInWithProvider(provider: "google" | "facebook") {
    setOauthLoading(provider);
    const authOrigin = getAuthRedirectOrigin();
    const redirectTo = `${authOrigin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) {
      setOauthLoading(null);
      toast.error(error.message);
    }
  }

  if (magicSent) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
          <MailCheck size={22} className="text-primary" />
        </span>
        <p className="text-sm font-semibold text-theme-heading">
          Проверете ја вашата е-пошта
        </p>
        <p className="text-xs text-theme-muted">
          Испративме линк за најава на <strong>{magicEmail}</strong>. Ако не го
          гледате, проверете ја и spam папката.
        </p>
        <button
          onClick={() => setMagicSent(false)}
          className="text-xs font-medium text-primary underline">
          Обидете се повторно
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          <p className="mt-1 text-[11px] text-red-500">{errors.email.message}</p>
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
            autoComplete="current-password"
            placeholder="••••••••"
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

      {captcha.widget}

      <button
        type="submit"
        disabled={isSubmitting || !captcha.ready}
        className={primaryBtn}>
        {isSubmitting ? "Се најавувате…" : "Најава"}
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
        onClick={sendMagicLink}
        disabled={magicLoading || !captcha.ready}>
        <Mail size={16} className="text-zinc-500" />
        {magicLoading ? "Се испраќа…" : "Најави се без лозинка"}
      </button>
      <button
        type="button"
        className={outlineBtn}
        onClick={() => signInWithProvider("google")}
        disabled={isSubmitting || oauthLoading !== null}>
        <GoogleIcon size={18} />
        {oauthLoading === "google" ? "Се пренасочува…" : "Најава со Google"}
      </button>
      <button
        type="button"
        className={outlineBtn}
        onClick={() => signInWithProvider("facebook")}
        disabled={isSubmitting || oauthLoading !== null}>
        <FacebookIcon size={18} />
        {oauthLoading === "facebook" ? "Се пренасочува…" : "Најава со Facebook"}
      </button>
    </form>
  );
}
