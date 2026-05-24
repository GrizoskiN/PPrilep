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
  const ACTIVE_CACHE_KEY = "nav_active_issues_count";
  const TOTAL_CACHE_KEY = "nav_total_issues_count";

  const [activeIssuesCount, setActiveIssuesCount] = useState(0);
  const [totalIssuesCount, setTotalIssuesCount] = useState(0);

  useEffect(() => {
    // Seed from cache after hydration — avoids SSR mismatch
    const cachedActive = localStorage.getItem(ACTIVE_CACHE_KEY);
    const cachedTotal = localStorage.getItem(TOTAL_CACHE_KEY);
    const seedId = setTimeout(() => {
      if (cachedActive) setActiveIssuesCount(parseInt(cachedActive, 10));
      if (cachedTotal) setTotalIssuesCount(parseInt(cachedTotal, 10));
    }, 0);

    let mounted = true;
    const supabase = createClient();

    async function loadActiveIssuesCount() {
      const [{ count: active }, { count: total }] = await Promise.all([
        supabase
          .from("issues")
          .select("id", { count: "exact", head: true })
          .neq("status", "resolved"),
        supabase.from("issues").select("id", { count: "exact", head: true }),
      ]);

      if (mounted) {
        const a = active ?? 0;
        const t = total ?? 0;
        setActiveIssuesCount(a);
        setTotalIssuesCount(t);
        localStorage.setItem(ACTIVE_CACHE_KEY, String(a));
        localStorage.setItem(TOTAL_CACHE_KEY, String(t));
      }
    }

    loadActiveIssuesCount();

    return () => {
      clearTimeout(seedId);
      mounted = false;
    };
  }, []);

  return (
    <nav className="scrollbar-hidden flex h-full min-h-0 flex-col gap-5 overflow-y-auto  py-4">
      <section>
        <p className="text-nav-section mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.18em]">
          Платформа
        </p>
        <div className="flex flex-col gap-1 ">
          <NavItem
            href="/"
            label="Почетна"
            iconNode={
              <FontAwesomeIcon
                icon={faHouse}
                className="theme-ink-icons h-4 w-4"
              />
            }
            exact
          />
          <NavItem
            href="/issues"
            label="Пријави"
            badge={`${activeIssuesCount}/${totalIssuesCount}`}
            iconNode={
              <FontAwesomeIcon
                icon={faTriangleExclamation}
                className="theme-ink-icons h-4 w-4"
              />
            }
          />
          <NavItem
            href="/map"
            label="Мапа"
            iconNode={<Map className="theme-ink-icons h-4 w-4" />}
          />
          <NavItem
            href="/heroes"
            label="Херои"
            iconNode={
              <FontAwesomeIcon
                icon={faMedal}
                className="theme-ink-icons h-4 w-4"
              />
            }
          />
          <NavItem
            href="/fund"
            label="Фонд"
            iconNode={
              <FontAwesomeIcon
                icon={faHandHoldingHeart}
                className="theme-ink-icons h-4 w-4"
              />
            }
          />
          <NavItem
            href="/ideas"
            label="Идеи"
            iconNode={
              <FontAwesomeIcon
                icon={faLightbulb}
                className="theme-ink-icons h-4 w-4"
              />
            }
          />
          <NavItem
            href="/communities"
            label="Населби"
            iconNode={
              <FontAwesomeIcon
                icon={faUsers}
                className="theme-ink-icons h-4 w-4"
              />
            }
          />
          <NavItem
            href="/about"
            label="Мој Прилеп"
            iconNode={
              <FontAwesomeIcon
                icon={faAddressCard}
                className="theme-ink-icons h-4 w-4"
              />
            }
          />
          <NavItem
            href="/projects"
            label="Наши Проекти"
            iconNode={
              <FontAwesomeIcon
                icon={faDiagramProject}
                className="theme-ink-icons h-4 w-4"
              />
            }
          />
          <NavItem
            href="/sponsors"
            label="Партнери"
            iconNode={
              <FontAwesomeIcon
                icon={faHandshake}
                className="theme-ink-icons h-4 w-4"
              />
            }
          />
        </div>
      </section>

      <section>
        <p className="text-nav-section mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.18em]">
          Информации
        </p>
        <div className="flex flex-col gap-1">
          <NavItem
            href="/positive"
            label="Позитива"
            iconNode={
              <FontAwesomeIcon
                icon={faSun}
                className="theme-ink-icons h-4 w-4"
              />
            }
          />
          <NavItem
            href="/events"
            label="Случувања"
            iconNode={
              <FontAwesomeIcon
                icon={faCalendarDays}
                className="theme-ink-icons h-4 w-4"
              />
            }
          />
        </div>
      </section>

      <section>
        <p className="text-nav-section mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.18em]">
          Претпријатие
        </p>
        <div className="flex flex-col gap-1">
          <NavItem
            href="/utility/water"
            label="Водовод"
            iconNode={
              <FontAwesomeIcon
                icon={faDroplet}
                className="theme-ink-icons h-4 w-4"
              />
            }
          />
          <NavItem
            href="/utility/garbage"
            label="Комуналец"
            iconNode={
              <FontAwesomeIcon
                icon={faTrashCan}
                className="theme-ink-icons h-4 w-4"
              />
            }
          />
          <NavItem
            href="/utility/power"
            label="Осветлување"
            iconNode={
              <FontAwesomeIcon
                icon={faPlug}
                className="theme-ink-icons h-4 w-4"
              />
            }
          />
          <NavItem
            href="/utility/transport"
            label="Градски превоз"
            iconNode={
              <FontAwesomeIcon
                icon={faBus}
                className="theme-ink-icons h-4 w-4"
              />
            }
          />
          <NavItem
            href="/utility/parking"
            label="Паркинзи"
            iconNode={
              <FontAwesomeIcon
                icon={faSquareParking}
                className="theme-ink-icons h-4 w-4"
              />
            }
          />
          <NavItem
            href="/kindergarten"
            label="Градинки — Наша Иднина"
            iconNode={
              <FontAwesomeIcon
                icon={faChildren}
                className="theme-ink-icons h-4 w-4"
              />
            }
          />
        </div>
      </section>

      <section className=" rounded-3xl p-3 ">
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="text-nav-section text-[9px] font-semibold uppercase tracking-[0.18em]">
            Филтер по мапа
          </p>
          <Link
            href="/issues"
            className="text-nav-reset text-[9px] font-semibold">
            Ресет
          </Link>
        </div>

        <div className="">
          <div className="text-nav-district-grid grid grid-cols-3 gap-2 text-center text-[10px] font-semibold">
            {districts.map((d) => (
              <Link
                key={d.value}
                href={
                  d.value === "all"
                    ? "/issues"
                    : `/issues?district=${encodeURIComponent(d.value)}`
                }
                className={cn(
                  "nav-district-btn rounded-xl border px-2 py-2 transition-colors",
                  activeDistrict === d.value
                    ? "nav-district-btn-active"
                    : "nav-district-btn-idle",
                )}>
                {d.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </nav>
  );
}
