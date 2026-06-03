import Link from "next/link";
import LoginForm from "../../../components/auth/LoginForm";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-canvas p-4">
      <div className="w-full max-w-theme-card bg-theme-surface border border-theme rounded-lg p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-bold text-theme-heading">
            Подобар Прилеп
          </h1>
          <p className="text-sm text-theme-muted mt-1">
            Најавете се на вашата сметка
          </p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="text-xs text-theme-muted text-center mt-4">
          Немате сметка?{" "}
          <Link href="/auth/register" className="underline text-theme-heading">
            Регистрирајте се
          </Link>
        </p>
      </div>
    </div>
  );
}
