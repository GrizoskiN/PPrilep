import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-theme-page py-4 lg:py-6 px-3 lg:px-3 space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-theme-heading">
          🏛️ Мој Прилеп
        </h1>
        <p className="text-sm text-theme-muted">
          За нас, нашата мисија и како се трошат средствата.
        </p>
      </header>

      <section className="rounded-2xl border border-theme bg-theme-surface p-5 space-y-3">
        <h2 className="text-base font-semibold text-theme-heading">
          Кои сме ние
        </h2>
        <p className="text-sm text-theme-body leading-relaxed">
          Мој Прилеп е граѓанска иницијатива која дава глас на жителите на
          Прилеп. Преку оваа платформа собираме пријави за проблеми во градот,
          координираме доброволни акции и ги следиме општинските ветувања.
        </p>
      </section>

      <section className="rounded-2xl border border-theme bg-theme-surface p-5 space-y-3">
        <h2 className="text-base font-semibold text-theme-heading">
          Што правиме
        </h2>
        <ul className="text-sm text-theme-body space-y-2 list-disc pl-5">
          <li>Документираме проблеми со фотографии и локација.</li>
          <li>Организираме доброволни поправки и акции.</li>
          <li>Ги следиме општинските проекти и нивните рокови.</li>
          <li>Ги наградуваме локалните херои кои го подобруваат градот.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-theme bg-theme-surface p-5 space-y-3">
        <h2 className="text-base font-semibold text-theme-heading">
          Како се трошат средствата
        </h2>
        <p className="text-sm text-theme-body leading-relaxed">
          Сите донации преку нашиот{" "}
          <Link
            href="/fund"
            className="text-theme-accent font-medium hover:underline">
            Фонд
          </Link>{" "}
          одат директно во спроведување на конкретни проекти. Ажурираме јавно
          извештај за секоја кампања — кој ги собрал средствата, кога се
          потрошени и што е направено.
        </p>
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mt-2">
          <p className="text-xs text-amber-800">
            📋 Детален финансиски извештај ќе биде објавен квартално.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-theme bg-theme-surface p-5 space-y-2">
        <h2 className="text-base font-semibold text-theme-heading">Контакт</h2>
        <p className="text-sm text-theme-body">
          mojpprilep@gmail.com · Прилеп, Македонија
        </p>
      </section>
    </div>
  );
}
