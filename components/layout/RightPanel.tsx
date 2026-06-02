"use client";

import Link from "next/link";
import PromiseTracker from "../ui/PromiseTracker";

export default function RightPanel() {
  return (
    <aside className="flex h-auto flex-col overflow-y-auto rounded-lg bg-transparent lg:p-3 lg:text-sm xl:text-base">
      <PromiseTracker />

      <section className="mt-5 rounded-lg bg-white py-6 lg:px-3">
        <p className="text-theme-subtle mb-4 text-[10px] font-bold uppercase tracking-widest">
          Заеднички спонзори
        </p>

        <div className="rounded-xl  p-3 shadow-sm">
          <p className="text-theme-heading text-base xl:text-xl font-semibold tracking-tight">
            Cava Bar
          </p>
          <p className="text-theme-body mt-2 text-[11px] lg:text-[10px] xl:text-xs leading-5">
            Бесплатно кафе за тројцата најактивни локални херои овој месец.
          </p>
          <Link
            href="/communities"
            className="text-theme-accent mt-5 inline-flex text-[11px] lg:text-[10px] xl:text-sm font-semibold transition-all duration-150 ease-in-out hover:text-primary/80">
            Стани спонзор
          </Link>
        </div>
      </section>
    </aside>
  );
}
