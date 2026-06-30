// Single source of truth for the association's bank accounts. Used both in the
// UI (PaymentDetails component) and in outgoing emails so the numbers can never
// drift between the two. Domestic payers use the denar account; payments from
// abroad use the IBAN + SWIFT (devizna сметка).

export const BANK = {
  holder: "МОЈОТ ГРАД Прилеп",
  bankName: "Комерцијална банка АД Скопје",
  denarAccount: "300020000663418",
  fxAccount: "0270100442377", // девизна платежна сметка (foreign-currency account)
  iban: "MK07300701004423749",
  swift: "KOBSMK2X",
} as const;

/** Default purpose-of-payment text shown when a caller doesn't pass its own. */
export const DEFAULT_PURPOSE = "Донација — Мој Прилеп";

// ── Email rendering ────────────────────────────────────────────────────────────

const ROW = (label: string, value: string, strong = false) =>
  `<tr><td style="padding:5px 0;color:#64748b;width:140px;font-size:13px">${label}</td><td style="font-size:13px">${
    strong ? `<strong>${value}</strong>` : value
  }</td></tr>`;

/** Bank-account block matching the email template styling (see lib/email.ts). */
export function paymentBlockHtml(purpose: string = DEFAULT_PURPOSE): string {
  return `
    <div style="margin:20px 0;padding:16px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">
      <p style="margin:0 0 10px;font-weight:700;color:#1e293b;font-size:14px">💳 Детали за уплата</p>
      <table style="width:100%;border-collapse:collapse">
        ${ROW("Примач", BANK.holder, true)}
        ${ROW("Банка", BANK.bankName)}
        ${ROW("Денарска сметка", BANK.denarAccount, true)}
        ${ROW("Цел на дознака", purpose)}
      </table>
      <p style="margin:14px 0 6px;font-size:12px;color:#94a3b8">Уплати од странство (девизна сметка):</p>
      <table style="width:100%;border-collapse:collapse">
        ${ROW("Платежна сметка", BANK.fxAccount, true)}
        ${ROW("IBAN", BANK.iban, true)}
        ${ROW("SWIFT / BIC", BANK.swift, true)}
      </table>
    </div>`;
}
