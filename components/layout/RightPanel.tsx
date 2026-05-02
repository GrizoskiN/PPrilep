"use client";

import Link from "next/link";
import PromiseTracker from "../ui/PromiseTracker";

export default function RightPanel() {
  return (
    <aside className="flex h-auto flex-col overflow-y-auto bg-white p-4">
      <PromiseTracker />

      <section className="mt-auto  py-6">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Заеднички спонзори
        </p>

        <div className="rounded-xl border border-[#bff4e6] bg-[linear-gradient(180deg,#f8fffd,#eff9f7)] px-4 py-5 shadow-sm">
          <p className="text-xl font-semibold tracking-tight text-gray-800">
            Cava Bar
          </p>
          <p className="mt-2  leading-5 text-xs text-gray-600">
            Бесплатно кафе за тројцата најактивни локални херои овој месец.
          </p>
          <Link
            href="/communities"
            className="mt-5 inline-flex font-semibold text-primary transition-all duration-150 ease-in-out hover:text-primary/80">
            Стани спонзор
          </Link>
        </div>
      </section>
    </aside>
  );
}
