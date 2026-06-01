"use client";

import Link from "next/link";
import PromiseTracker from "../ui/PromiseTracker";

export default function RightPanel() {
  return (
    <aside className="mt-2 flex h-auto px-3 lg:px-2 flex-col overflow-y-auto rounded-lg bg-transparent ">
      <PromiseTracker />

      <section className=" px-3  py-6 bg-white mt-5 rounded-lg">
        <p className="text-theme-subtle mb-4 text-[10px] font-bold uppercase tracking-widest">
          Заеднички спонзори
        </p>

        <div className="rounded-xl  p-3 shadow-sm">
          <p className="text-theme-heading text-xl font-semibold tracking-tight">
            Cava Bar
          </p>
          <p className="text-theme-body mt-2 text-xs leading-5">
            Бесплатно кафе за тројцата најактивни локални херои овој месец.
          </p>
          <Link
            href="/communities"
            className="text-theme-accent mt-5 inline-flex font-semibold transition-all duration-150 ease-in-out hover:text-primary/80">
            Стани спонзор
          </Link>
        </div>
      </section>
    </aside>
  );
}
