"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "../../../lib/supabase/client";
import Button from "../../../components/ui/Button";
import { toast } from "sonner";
import { useMemo, useState } from "react";

const schema = z.object({
  full_name: z.string().min(2, "Внесете го вашето целосно име"),
  email: z.string().email("Внесете валидна е-пошта"),
  password: z.string().min(6, "Барем 6 знаци"),
});
type Fields = z.infer<typeof schema>;

export default function RegisterPage() {
  const supabase = useMemo(() => createClient(), []);
  const [done, setDone] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [existingEmail, setExistingEmail] = useState<string | null>(null);
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null);

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
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error(error.message);
      return;
    }

    // Supabase returns success but with empty identities[] when the email
    // is already registered — it silently skips sending to prevent email
    // enumeration. Detect this and offer the user a recovery path.
    if (
      data.user &&
      data.user.identities &&
      data.user.identities.length === 0
    ) {
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
    if (error) {
      setOauthLoading(false);
      toast.error(error.message);
    }
  }

  // After magic link sent (from recovery flow)
  if (linkSentTo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-canvas p-4">
        <div className="w-full max-w-theme-card bg-theme-surface border border-theme rounded-lg p-6 shadow-sm text-center space-y-2">
          <p className="font-medium text-theme-heading">Линкот е испратен</p>
          <p className="text-sm text-theme-muted">
            Испративме линк за најава на <strong>{linkSentTo}</strong>.
            Проверете го вашиот сандак (и spam папка).
          </p>
          <Link
            href="/auth/login"
            className="text-xs underline text-theme-muted">
            Назад кон најава
          </Link>
        </div>
      </div>
    );
  }

  // After successful signup
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-canvas p-4">
        <div className="w-full max-w-theme-card bg-theme-surface border border-theme rounded-lg p-6 shadow-sm text-center space-y-2">
          <p className="font-medium text-theme-heading">
            Проверете ја вашата е-пошта
          </p>
          <p className="text-sm text-theme-muted">
            Испративме потврден линк. Кликнете на него за да ја активирате
            сметката.
          </p>
          <Link
            href="/auth/login"
            className="text-xs underline text-theme-muted">
            Назад кон најава
          </Link>
        </div>
      </div>
    );
  }

  // Recovery UI when email already exists
  if (existingEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-canvas p-4">
        <div className="w-full max-w-theme-card bg-theme-surface border border-theme rounded-lg p-6 shadow-sm space-y-4">
          <div className="text-center">
            <p className="font-medium text-theme-heading">
              Оваа е-пошта е веќе регистрирана
            </p>
            <p className="text-sm text-theme-muted mt-1">
              Веќе постои сметка со <strong>{existingEmail}</strong>.
            </p>
          </div>
          <div className="space-y-2">
            <Button
              type="button"
              className="w-full"
              disabled={sendingLink}
              onClick={() => sendMagicLink(existingEmail)}>
              {sendingLink ? "Се испраќа…" : "Испрати ми линк за најава"}
            </Button>
            <Link href="/auth/login" className="block">
              <Button type="button" variant="outline" className="w-full">
                Најави се со лозинка
              </Button>
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setExistingEmail(null)}
            className="block w-full text-xs text-theme-muted underline">
            Назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-canvas p-4">
      <div className="w-full max-w-theme-card bg-theme-surface border border-theme rounded-lg p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-bold text-theme-heading">
            Подобар Прилеп
          </h1>
          <p className="text-sm text-theme-muted mt-1">Создадете сметка</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-theme-body">
              Целосно име
            </label>
            <input
              {...register("full_name")}
              className="mt-1 w-full border border-theme rounded px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {errors.full_name && (
              <p className="text-[11px] text-red-500 mt-1">
                {errors.full_name.message}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-theme-body">
              Е-пошта
            </label>
            <input
              {...register("email")}
              type="email"
              className="mt-1 w-full border border-theme rounded px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {errors.email && (
              <p className="text-[11px] text-red-500 mt-1">
                {errors.email.message}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-theme-body">
              Лозинка
            </label>
            <input
              {...register("password")}
              type="password"
              className="mt-1 w-full border border-theme rounded px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {errors.password && (
              <p className="text-[11px] text-red-500 mt-1">
                {errors.password.message}
              </p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Се создава…" : "Создај сметка"}
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-theme" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-theme-surface px-2 text-[11px] text-theme-subtle">
                или
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={signUpWithGoogle}
            disabled={isSubmitting || oauthLoading}>
            {oauthLoading ? "Се пренасочува…" : "Продолжи со Google"}
          </Button>
        </form>
        <p className="text-xs text-theme-muted text-center mt-4">
          Веќе имате сметка?{" "}
          <Link href="/auth/login" className="underline text-theme-heading">
            Најавете се
          </Link>
        </p>
      </div>
    </div>
  );
}
