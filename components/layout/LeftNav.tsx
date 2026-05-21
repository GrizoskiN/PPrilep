"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  faHouse,
  faTriangleExclamation,
  faMedal,
  faHandHoldingHeart,
  faLightbulb,
  faUsers,
  faDroplet,
  faTrashCan,
  faPlug,
  faSun,
  faAddressCard,
  faHandshake,
  faDiagramProject,
  faBus,
  faSquareParking,
  faCalendarDays,
  faChildren,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Map } from "lucide-react";
import NavItem from "../ui/NavItem";
import { cn } from "../../lib/utils";
import { createClient } from "../../lib/supabase/client";

const districts = [
  { value: "all", label: "Прилеп" },
  { value: "Center", label: "Центар" },
  { value: "Varoš", label: "Варош" },
  { value: "Trizla", label: "Тризла" },
  { value: "Točila", label: "Точила" },
  { value: "Rid", label: "Рид" },
  { value: "Tipski", label: "Типски" },
  { value: "Boncejca", label: "Бончејца" },
] as const;

export default function LeftNav() {
  const searchParams = useSearchParams();
  const activeDistrict = searchParams.get("district") ?? "all";
  const [activeIssuesCount, setActiveIssuesCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    async function loadActiveIssuesCount() {
      const { count } = await supabase
        .from("issues")
        .select("id", { count: "exact", head: true })
        .neq("status", "resolved");

      if (mounted) setActiveIssuesCount(count ?? 0);
    }

    loadActiveIssuesCount();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <nav className="scrollbar-hidden flex h-full min-h-0 flex-col gap-5 overflow-y-auto px-4 py-4">
      <section>
        <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Платформа
        </p>
        <div className="flex flex-col gap-1 ">
          <NavItem
            href="/"
            label="Почетна"
            iconNode={<FontAwesomeIcon icon={faHouse} className="h-4 w-4 " />}
            exact
          />
          <NavItem
            href="/issues"
            label="Пријави"
            badge={String(activeIssuesCount)}
            iconNode={
              <FontAwesomeIcon
                icon={faTriangleExclamation}
                className="h-4 w-4"
              />
            }
          />
          <NavItem
            href="/map"
            label="Мапа"
            iconNode={<Map className="h-4 w-4" />}
          />
          <NavItem
            href="/heroes"
            label="Херои"
            iconNode={<FontAwesomeIcon icon={faMedal} className="h-4 w-4" />}
          />
          <NavItem
            href="/fund"
            label="Фонд"
            iconNode={
              <FontAwesomeIcon icon={faHandHoldingHeart} className="h-4 w-4" />
            }
          />
          <NavItem
            href="/ideas"
            label="Идеи"
            iconNode={
              <FontAwesomeIcon icon={faLightbulb} className="h-4 w-4" />
            }
          />
          <NavItem
            href="/communities"
            label="Населби"
            iconNode={<FontAwesomeIcon icon={faUsers} className="h-4 w-4" />}
          />
          <NavItem
            href="/about"
            label="Мој Прилеп"
            iconNode={
              <FontAwesomeIcon
                icon={faAddressCard}
                className="h-4 w-4 text-primary"
              />
            }
          />
          <NavItem
            href="/projects"
            label="Наши Проекти"
            iconNode={
              <FontAwesomeIcon
                icon={faDiagramProject}
                className="h-4 w-4 text-indigo-500"
              />
            }
          />
          <NavItem
            href="/sponsors"
            label="Партнери"
            iconNode={
              <FontAwesomeIcon
                icon={faHandshake}
                className="h-4 w-4 text-emerald-600"
              />
            }
          />
        </div>
      </section>

      <section>
        <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Информации
        </p>
        <div className="flex flex-col gap-1">
          <NavItem
            href="/positive"
            label="Позитива"
            iconNode={
              <FontAwesomeIcon
                icon={faSun}
                className="h-4 w-4 text-amber-500"
              />
            }
          />
          <NavItem
            href="/events"
            label="Случувања"
            iconNode={
              <FontAwesomeIcon
                icon={faCalendarDays}
                className="h-4 w-4 text-rose-500"
              />
            }
          />
        </div>
      </section>

      <section>
        <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Претпријатие
        </p>
        <div className="flex flex-col gap-1">
          <NavItem
            href="/utility/water"
            label="Водовод"
            iconNode={
              <FontAwesomeIcon
                icon={faDroplet}
                className="h-4 w-4 text-blue-500"
              />
            }
          />
          <NavItem
            href="/utility/garbage"
            label="Комуналец"
            iconNode={
              <FontAwesomeIcon
                icon={faTrashCan}
                className="h-4 w-4 text-slate-500"
              />
            }
          />
          <NavItem
            href="/utility/power"
            label="Осветлување"
            iconNode={
              <FontAwesomeIcon
                icon={faPlug}
                className="h-4 w-4 text-amber-500"
              />
            }
          />
          <NavItem
            href="/utility/transport"
            label="Градски превоз"
            iconNode={
              <FontAwesomeIcon
                icon={faBus}
                className="h-4 w-4 text-orange-500"
              />
            }
          />
          <NavItem
            href="/utility/parking"
            label="Паркинзи"
            iconNode={
              <FontAwesomeIcon
                icon={faSquareParking}
                className="h-4 w-4 text-blue-700"
              />
            }
          />
          <NavItem
            href="/kindergarten"
            label="Градинки — Наша Иднина"
            iconNode={
              <FontAwesomeIcon
                icon={faChildren}
                className="h-4 w-4 text-rose-400"
              />
            }
          />
        </div>
      </section>
      {/* 
      <section>
        <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Населби
        </p>
        <div className="flex flex-col gap-1">
          {districts.map((d) => (
            <NavItem
              key={d.value}
              href={
                d.value === "all" ? "/issues" : `/issues?district=${d.value}`
              }
              label={d.label}
              exact={d.value === "all"}
              requireNoSearchParams={d.value === "all"}
            />
          ))}
        </div>
      </section> */}

      <section className=" rounded-3xl p-3 ">
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Филтер по мапа
          </p>
          <Link
            href="/issues"
            className="text-[9px] font-semibold text-primary hover:text-primary/80">
            Ресет
          </Link>
        </div>

        <div className="">
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-semibold text-slate-500">
            {districts.map((d) => (
              <Link
                key={d.value}
                href={
                  d.value === "all"
                    ? "/issues"
                    : `/issues?district=${encodeURIComponent(d.value)}`
                }
                className={cn(
                  "rounded-xl border px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-colors",
                  activeDistrict === d.value
                    ? "border-[#bfe3db] bg-[#eef8f5] text-primary"
                    : "border-[#dde7e3] bg-white hover:border-[#cfe0da] hover:bg-[#fcfefd]",
                )}>
                {d.label}
              </Link>
            ))}
          </div>
        </div>

        {/* <div className="mt-3">
          <p className="mb-2 px-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Активен избор
          </p>
          <div className="rounded-2xl border border-[#dde7e3] bg-[#fcfefd] px-3 py-2 text-sm font-medium text-slate-600">
            {districts.find((district) => district.value === activeDistrict)
              ?.label ?? "Прилеп"}
          </div>
        </div> */}
      </section>
    </nav>
  );
}
