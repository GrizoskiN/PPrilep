"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "../../lib/utils";
import { LucideIcon } from "lucide-react";

interface Props {
  href: string;
  label: string;
  icon?: LucideIcon;
  iconNode?: ReactNode;
  badge?: string;
  exact?: boolean;
  requireNoSearchParams?: boolean;
}

export default function NavItem({
  href,
  label,
  icon: Icon,
  iconNode,
  badge,
  exact,
  requireNoSearchParams,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hrefPath, hrefQueryString] = href.split("?");
  const hrefQuery = new URLSearchParams(hrefQueryString ?? "");

  const matchesQuery = Array.from(hrefQuery.entries()).every(
    ([key, value]) => searchParams.get(key) === value,
  );

  const active = hrefQueryString
    ? pathname === hrefPath && matchesQuery
    : exact
      ? pathname === hrefPath &&
        (!requireNoSearchParams || Array.from(searchParams.keys()).length === 0)
      : pathname.startsWith(hrefPath);

  return (
    <Link
      href={href}
      className={cn(
        "flex select-none items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-all duration-150 ease-in-out cursor-pointer",
        active
          ? "rounded-r-none rounded-l-lg border-r-[3px] border-primary bg-[#f0fdfa] text-primary font-semibold"
          : "hover:bg-gray-100 hover:text-gray-900",
      )}>
      {iconNode ? (
        <span
          className={cn(
            "w-4 text-center",
            active ? "text-primary" : "text-gray-500",
          )}>
          {iconNode}
        </span>
      ) : Icon ? (
        <Icon size={16} className={active ? "text-primary" : "text-gray-500"} />
      ) : null}
      {label}
      {badge ? (
        <span
          className={cn(
            "ml-auto rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-bold text-gray-600",
            active && "bg-[#ccfbf1] text-primary",
          )}>
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
