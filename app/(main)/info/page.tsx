
export default function InfoPage() {
  return (
      <div className="mx-auto max-w-156 py-4 lg:py-6 px-3 lg:px-3 space-y-4">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">
            📣 Информатор
          </h1>
          <p className="text-sm text-slate-500">
            Корисни информации, упатства и важни известувања за жителите на
            Прилеп.
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Хитни броеви</h2>
          <ul className="text-sm text-slate-700 space-y-1.5">
            <li>🚓 Полиција — <span className="font-mono">192</span></li>
            <li>🚒 Пожарна — <span className="font-mono">193</span></li>
            <li>🚑 Брза помош — <span className="font-mono">194</span></li>
            <li>📞 Општина Прилеп — <span className="font-mono">048 401 700</span></li>
          </ul>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
          <h2 className="text-base font-semibold text-slate-900">
            Како да пријавиш проблем
          </h2>
          <ol className="text-sm text-slate-700 space-y-1.5 list-decimal pl-5 leading-relaxed">
            <li>Кликнете „<span className="font-medium">Пријави проблем</span>“ во горниот дел.</li>
            <li>Опишете го проблемот, изберете населба и категорија.</li>
            <li>Прикачете фотографија (опционално, но многу помага).</li>
            <li>Следете го статусот и поканете соседи да го поддржат.</li>
          </ol>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Прашања и одговори</h2>
          <div className="space-y-2 text-sm text-slate-700">
            <details className="rounded-lg bg-zinc-50 px-3 py-2">
              <summary className="font-medium cursor-pointer">
                Дали моите податоци се сигурни?
              </summary>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Да. Само ние и вие имаме пристап до вашата лична информација.
                Никогаш не споделуваме податоци со трети страни.
              </p>
            </details>
            <details className="rounded-lg bg-zinc-50 px-3 py-2">
              <summary className="font-medium cursor-pointer">
                Што се случува откако ќе пријавам проблем?
              </summary>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Други корисници можат да се пријават како засегнати или да
                понудат помош. Кога проблемот ќе се реши, статусот се менува
                и решавачот добива поени.
              </p>
            </details>
          </div>
        </section>
      </div>
  );
}
