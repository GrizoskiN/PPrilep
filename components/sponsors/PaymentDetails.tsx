"use client";

import { useState } from "react";
import { Copy, Check, Landmark } from "lucide-react";
import { toast } from "sonner";
import { BANK, DEFAULT_PURPOSE } from "../../lib/payment";

// Reusable bank-account card shown to donors / paying members. Denar account is
// primary (local payers); the devizna сметка (IBAN/SWIFT) sits below for payments
// from abroad. Each number has a one-tap copy button.

function CopyRow({
  label,
  value,
  mono = true,
  strong = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Копирано");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-zinc-400">{label}</p>
        <p
          className={`truncate text-sm ${strong ? "font-bold" : "font-medium"} text-zinc-800 ${
            mono ? "tracking-wide" : ""
          }`}>
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={`Копирај ${label}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50">
        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

export default function PaymentDetails({ purpose = DEFAULT_PURPOSE }: { purpose?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <Landmark size={15} style={{ color: "#2aa99d" }} />
        <p className="text-sm font-semibold text-zinc-900">Детали за уплата</p>
      </div>

      <div className="divide-y divide-zinc-100">
        <CopyRow label="Примач" value={BANK.holder} mono={false} strong />
        <CopyRow label="Банка" value={BANK.bankName} mono={false} />
        <CopyRow label="Денарска сметка" value={BANK.denarAccount} strong />
        <CopyRow label="Цел на дознака" value={purpose} mono={false} />
      </div>

      <details className="mt-3 group">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-zinc-500 [&::-webkit-details-marker]:hidden">
          <span className="transition-transform group-open:rotate-90">▸</span>
          Уплата од странство (девизна сметка)
        </summary>
        <div className="mt-1 divide-y divide-zinc-100 border-t border-zinc-100 pt-1">
          <CopyRow label="Платежна сметка" value={BANK.fxAccount} strong />
          <CopyRow label="IBAN" value={BANK.iban} strong />
          <CopyRow label="SWIFT / BIC" value={BANK.swift} strong />
        </div>
      </details>
    </div>
  );
}
