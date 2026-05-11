import Shell from "../../components/layout/Shell";

export default function SponsorsPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-156 py-4 lg:py-6 px-3 lg:px-3 space-y-4">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">
            🤝 Партнери
          </h1>
          <p className="text-sm text-slate-500">
            Локални компании и поединци кои ја поддржуваат нашата заедница.
          </p>
        </header>

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
          <h2 className="text-base font-semibold text-emerald-900">
            Станете партнер
          </h2>
          <p className="mt-1 text-sm text-emerald-800/80 leading-relaxed">
            Поддржете локални акции, добијте видливост во рамките на нашата
            заедница и бидете дел од подобрувањето на Прилеп.
          </p>
          <a
            href="mailto:mojpprilep@gmail.com?subject=Партнерство%20-%20Мој%20Прилеп"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors">
            Контактирајте нè →
          </a>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Тековни партнери
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Placeholder cards — replace with real sponsor data */}
            {[
              { name: "Cava Bar", desc: "Бесплатно кафе за тројцата најактивни локални херои овој месец." },
            ].map((s) => (
              <div
                key={s.name}
                className="rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="text-base font-semibold text-slate-900">
                  {s.name}
                </p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 p-4 flex items-center justify-center">
              <p className="text-xs text-slate-400 text-center">
                + Слободно место
                <br />
                за нов партнер
              </p>
            </div>
          </div>
        </section>
      </div>
    </Shell>
  );
}
