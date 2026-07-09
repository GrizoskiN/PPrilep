import type { Metadata } from "next";
import GlassContainerMap from "../../../components/recycle/GlassContainerMap";
import CollapsibleList from "../../../components/recycle/CollapsibleList";
import {
  IGLU_CONTAINERS,
  STANDARD_CONTAINERS,
  GLASS_CONTAINER_COUNT,
} from "../../../lib/data/glassContainers";

export const metadata: Metadata = {
  title: "Рециклирање — Стаклена амбалажа | Мој Прилеп",
  description:
    "Каде да ја одложиш стаклената амбалажа во Прилеп — мапа со сите 54 локации на контејнери за стакло, вклучувајќи ги новите „Иглу“ контејнери. Собирај, селектирај, рециклирај.",
  alternates: { canonical: "/recycle" },
  openGraph: {
    title: "Рециклирање на стакло во Прилеп",
    description:
      "Мапа со сите 54 локации на контејнери за стаклена амбалажа во Прилеп. Стаклото не смее да завршува на депонија — селектирај го.",
    url: "/recycle",
    type: "article",
  },
};

export default function RecyclePage() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-theme-heading">
          ♻️ Рециклирање на стакло
        </h1>
        <p className="text-sm text-theme-muted">
          Стаклената амбалажа повеќе не смее да се одлага со останатиот отпад. Еве
          каде и зошто да ја селектираш.
        </p>
      </header>

      {/* Why separate glass */}
      <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-800">
          Зошто одвоено стакло?
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-zinc-600">
          <p>
            Покрај постојните 44 локации, <strong>Пакомак</strong> и ЈКП{" "}
            <strong>„Комуналец“</strong> поставија дополнителни 10 „Иглу“
            контејнери за селектирање стаклена амбалажа. Со тоа во градот сега има{" "}
            <strong>{GLASS_CONTAINER_COUNT} локации</strong> — скоро на секоја
            фреквентна улица може да се одложи овој неразградлив отпад.
          </p>
          <p>
            Стаклената амбалажа не смее повеќе да завршува на депонија или
            исфрлена во природа, каде што се распаѓа и по милион години. Наместо
            отпад, стаклото може да стане следен корисен производ.
          </p>
        </div>
      </section>

      {/* Map */}
      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-zinc-800">
            📍 Мапа на контејнери за стакло
          </h2>
          <p className="text-xs text-zinc-500">
            Кликни на сина точка за да ја видиш локацијата. Позициите се
            приближни — најди го најблискиот контејнер до тебе.
          </p>
        </div>
        <GlassContainerMap />
      </section>

      {/* Location lists — collapsible */}
      <div className="space-y-3">
        <CollapsibleList
          title="Нови „Иглу“ контејнери"
          subtitle="Поставени во јули 2026"
          items={IGLU_CONTAINERS}
          accent="blue"
          defaultOpen
        />
        <CollapsibleList
          title="Постојни локации"
          subtitle="Веќе добро познати локации за стакло"
          items={STANDARD_CONTAINERS}
          accent="zinc"
        />
      </div>
    </div>
  );
}
