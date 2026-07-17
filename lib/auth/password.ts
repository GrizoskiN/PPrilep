/**
 * Password rules for the website — the mirror of the mobile app's
 * `src/lib/authValidation.ts`.
 *
 * All three copies must agree: this file, the mobile one, and Supabase →
 * Authentication → Sign In / Providers → Email. Supabase is authoritative (it
 * enforces on signUp AND updateUser); these are UX so the user hears about a
 * problem in Macedonian, before submitting, instead of getting a raw English
 * rejection afterwards. A rule that is LAXER here than in the dashboard is the
 * bug worth watching for — it produces exactly that rejection.
 *
 * The mobile app is a separate repository, so the duplication is unavoidable.
 * Change one, change the other.
 */
import { z } from "zod";

/** Matches "Minimum password length" in the dashboard. */
export const PASSWORD_MIN = 8;

/** Matches "Lowercase, uppercase letters, digits and symbols" in the dashboard. */
export const PASSWORD_RULES: { need: string; test: (p: string) => boolean }[] = [
  { need: `најмалку ${PASSWORD_MIN} знаци`, test: (p) => p.length >= PASSWORD_MIN },
  { need: "мала буква (a–z)", test: (p) => /[a-z]/.test(p) },
  { need: "голема буква (A–Z)", test: (p) => /[A-Z]/.test(p) },
  { need: "бројка (0–9)", test: (p) => /[0-9]/.test(p) },
  // Exactly Supabase's symbol set — a character outside it would pass here and
  // fail server-side.
  { need: "специјален знак (!?@#$…)", test: (p) => /[!@#$%^&*()_+\-=[\]{};'\\:"|<>?,./`~]/.test(p) },
];

/**
 * Passwords that satisfy every rule above and are still the first guess anyone
 * would make. Supabase's leaked-password check (HaveIBeenPwned) is Pro-only and
 * this project is on the free plan — the toggle shows as on but nothing enforces
 * it — so without this "Password1!" is a legal password here.
 */
const COMMON_PASSWORD_CORES = new Set([
  "password", "passwort", "parola", "lozinka", "welcome", "qwerty", "qwertz", "qwertyuiop",
  "asdfgh", "zxcvbn", "qazwsx", "admin", "administrator", "letmein", "iloveyou", "monkey",
  "dragon", "master", "shadow", "sunshine", "princess", "superman", "batman", "football",
  "baseball", "basketball", "soccer", "hello", "freedom", "whatever", "trustno", "starwars",
  "abcdef", "abcdefg", "abcabc", "test", "testing", "secret", "changeme", "temporary",
  "prilep", "mojprilep", "makedonija", "macedonia", "skopje", "vardar", "pobeda", "marko",
  "summer", "winter", "spring", "autumn", "january", "december",
]);

const LEET: Record<string, string> = {
  "@": "a", "4": "a", "0": "o", "1": "i", "!": "i", "3": "e", "5": "s",
  "$": "s", "7": "t", "8": "b", "9": "g", "+": "t",
};

/**
 * Reduce a password to the alphabetic core(s) worth checking. The trailing "1!"
 * people add to satisfy the digit and symbol rules must come off BEFORE leet is
 * undone, or `1`→`i` rewrites "Password1!" into "passwordii" and it matches
 * nothing. Two candidates because undoing leet is only right sometimes:
 * "P@ssw0rd" needs it, "Bicikl7#Vodno" does not.
 */
function passwordCores(p: string): string[] {
  const stripped = p.replace(/^[^A-Za-z@04$31578+]+|[^A-Za-z]+$/g, "");
  const lettersOnly = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const unleet = stripped
    .split("")
    .map((ch) => LEET[ch] ?? ch)
    .join("");
  return [lettersOnly(stripped), lettersOnly(unleet)];
}

/** Macedonian error for a NEW password, or null when it's acceptable. */
export function passwordError(p: string): string | null {
  if (!p) return "Внесете лозинка";
  const failed = PASSWORD_RULES.filter((r) => !r.test(p));
  if (failed.length === PASSWORD_RULES.length) return "Лозинката е преслаба";
  if (failed.length) return `Лозинката треба да има: ${failed.map((r) => r.need).join(", ")}`;
  if (passwordCores(p).some((core) => COMMON_PASSWORD_CORES.has(core))) {
    return "Оваа лозинка е премногу честа и лесна за погодување. Изберете нешто поинакво";
  }
  return null;
}

/**
 * For react-hook-form. Used on REGISTER and password-change only — never on
 * sign-in: accounts predating these rules have weaker passwords that are still
 * valid, and Supabase only applies the rules at signUp/updateUser, not at login.
 * Enforcing them on the login form would lock those users out of their own
 * accounts over a password the server is perfectly happy with.
 */
export const passwordSchema = z.string().superRefine((val, ctx) => {
  const message = passwordError(val);
  if (message) ctx.addIssue({ code: "custom", message });
});
