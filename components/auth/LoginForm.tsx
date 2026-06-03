"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "../../lib/supabase/client";
import Button from "../ui/Button";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

const schema = z.object({
  email: z.string().email("Внесете валидна е-пошта"),
  password: z.string().min(6, "Лозинката мора да има барем 6 знаци"),
});
type Fields = z.infer<typeof schema>;

export default function LoginForm() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [magicSent, setMagicSent] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");
  const [oauthLoading, setOauthLoading] = useState(false);

  function getAuthRedirectOrigin() {
    const envOrigin = process.env.NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN?.trim();
    if (envOrigin) return envOrigin.replace(/\/$/, "");
    if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
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
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
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
    const authOrigin = getAuthRedirectOrigin();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${authOrigin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setMagicEmail(email);
    setMagicSent(true);
    toast.success("Магичниот линк е испратен!");
  }

  async function signInWithGoogle() {
    setOauthLoading(true);
    const authOrigin = getAuthRedirectOrigin();
    const redirectTo = `${authOrigin}/auth/callback?next=${encodeURIComponent(next)}`;
    if (process.env.NODE_ENV !== "production") {
      console.info("[auth] Google OAuth redirectTo", {
        redirectTo,
        origin: location.origin,
        authOrigin,
        next,
      });
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (process.env.NODE_ENV !== "production") {
      console.info("[auth] Google OAuth provider URL", data?.url);
    }
    if (error) {
      setOauthLoading(false);
      toast.error(error.message);
    }
  }

  if (magicSent) {
    return (
      <div className="text-center space-y-2">
        <p className="text-sm font-medium">Проверете ја вашата е-пошта</p>
        <p className="text-xs text-zinc-500">
          Испративме линк на <strong>{magicEmail}</strong>
        </p>
        <button
          onClick={() => setMagicSent(false)}
          className="text-xs underline text-zinc-400">
          Обидете се повторно
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <label className="text-xs font-medium text-zinc-700">Е-пошта</label>
        <input
          {...register("email")}
          type="email"
          placeholder="vие@primer.mk"
          className="mt-1 w-full border border-zinc-200 rounded px-3 py-2 text-sm outline-none focus:border-black"
        />
        {errors.email && (
          <p className="text-[11px] text-red-500 mt-1">
            {errors.email.message}
          </p>
        )}
      </div>
      <div>
        <label className="text-xs font-medium text-zinc-700">Лозинка</label>
        <input
          {...register("password")}
          type="password"
          placeholder="••••••••"
          className="mt-1 w-full border border-zinc-200 rounded px-3 py-2 text-sm outline-none focus:border-black"
        />
        {errors.password && (
          <p className="text-[11px] text-red-500 mt-1">
            {errors.password.message}
          </p>
        )}
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Се најавувате…" : "Најава"}
      </Button>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-100" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-2 text-[11px] text-zinc-400">или</span>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={sendMagicLink}>
        Испрати магичен линк
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={signInWithGoogle}
        disabled={isSubmitting || oauthLoading}>
        {oauthLoading ? "Се пренасочува…" : "Најава со Google"}
      </Button>
    </form>
  );
}
