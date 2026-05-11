import Shell from "../../components/layout/Shell";

export default function EventsPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-156 py-4 lg:py-6 px-3 lg:px-3 space-y-4">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">
            📅 Случувања
          </h1>
          <p className="text-sm text-slate-500">
            Концерти, фестивали, спортски натпревари, изложби и сè што се
            случува во Прилеп.
          </p>
        </header>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
          <p className="text-sm text-rose-900 font-medium">
            🏗️ Оваа страница е во подготовка
          </p>
          <p className="mt-1 text-xs text-rose-800/80 leading-relaxed">
            Наскоро ќе можете да ги следите сите настани и активности во
            нашиот град на едно место. Имате настан што заслужува внимание?
            Контактирајте нè.
          </p>
        </div>

        {/* Preview of future layout */}
        <div className="space-y-3 opacity-60 pointer-events-none">
          {[
            {
              title: "Прилепско културно лето",
              when: "15 јуни – 30 август",
              where: "Стара чаршија",
              kind: "Фестивал",
            },
            {
              title: "Маратон на Прилеп",
              when: "12 септември, 09:00",
              where: "Центар",
              kind: "Спорт",
            },
            {
              title: "Пиво фест",
              when: "5–7 јули",
              where: "Градски парк",
              kind: "Концерт",
            },
          ].map((e) => (
            <div
              key={e.title}
              className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">
                  {e.title}
                </p>
                <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md font-semibold uppercase tracking-wide">
                  {e.kind}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                📅 {e.when} · 📍 {e.where}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
