
export default function ProjectsPage() {
  return (
      <div className="mx-auto max-w-156 py-4 lg:py-6 px-3 lg:px-3 space-y-4">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">
            🛠️ Наши Проекти
          </h1>
          <p className="text-sm text-slate-500">
            Иницијативи во кои Мој Прилеп активно учествува или координира.
          </p>
        </header>

        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
          <p className="text-sm text-indigo-900 font-medium">
            🏗️ Оваа страница е во подготовка
          </p>
          <p className="mt-1 text-xs text-indigo-800/80 leading-relaxed">
            Наскоро ќе можете да ги следите сите наши тековни и завршени
            проекти — со фотографии, временска линија и буџети.
          </p>
        </div>

        {/* Future structure preview */}
        <div className="space-y-3 opacity-50 pointer-events-none">
          {[
            { title: "Чистење на градскиот парк", status: "Во тек" },
            { title: "Поправка на тротоари во Точила", status: "Завршен" },
            { title: "Нов дрворед на улица Гоце Делчев", status: "Планиран" },
          ].map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">{p.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">{p.status}</p>
            </div>
          ))}
        </div>
      </div>
  );
}
