"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Send, Trash2, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "../../lib/supabase/client";
import { DISTRICT_LABELS } from "../../lib/utils";
import StreetAutocomplete from "../issues/StreetAutocomplete";
import { submitKomunalecRequest } from "../../app/actions/komunalec";
import type {
  District,
  KomunalecRequestType,
} from "../../lib/types/database";

const DISTRICTS: District[] = [
  "Center",
  "Varoš",
  "Trizla",
  "Točila",
  "Rid",
  "Tipski",
  "Boncejca",
  "KorzoMaalo",
];

const REQUEST_TYPES: [KomunalecRequestType, string][] = [
  ["complaint", "Поплака"],
  ["container", "Нарачај контејнер"],
  ["tractor", "Нарачај трактор"],
];

/** Tomorrow at 09:00, in the `datetime-local` value format (local time). */
function nextDayDefault(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

interface Props {
  loggedIn: boolean;
  defaultName?: string;
  defaultDistrict?: District;
  defaultStreet?: string;
}

/**
 * Lets a logged-in resident send Комуналец a complaint or order a container /
 * tractor. Mirrors the AgencyAlertComposer form pattern. Not-logged-in visitors
 * see a prompt to sign in (the chat buttons remain available above this).
 */
export default function KomunalecContactForm({
  loggedIn,
  defaultName,
  defaultDistrict,
  defaultStreet,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [type, setType] = useState<KomunalecRequestType>("complaint");
  const [scheduledAt, setScheduledAt] = useState(nextDayDefault);
  const [name, setName] = useState(defaultName ?? "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState(defaultStreet ?? "");
  const [district, setDistrict] = useState<District>(
    defaultDistrict ?? "Center",
  );
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function reset() {
    setType("complaint");
    setScheduledAt(nextDayDefault());
    setPhone("");
    setMessage("");
    setFile(null);
    setPreview(null);
  }

  async function submit() {
    if (!loggedIn) {
      toast.error("Најавете се за да испратите барање");
      router.push("/login");
      return;
    }
    if (!name.trim() || !phone.trim()) {
      toast.error("Внесете име и телефон");
      return;
    }
    setSubmitting(true);

    // Optional photo → issue-photos/komunalec/<userId>/...
    let photoUrl: string | null = null;
    if (file) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `komunalec/${user.id}/${Date.now()}.${ext}`;
        const { data, error } = await supabase.storage
          .from("issue-photos")
          .upload(path, file, { contentType: file.type });
        if (error) {
          setSubmitting(false);
          toast.error(`Грешка при прикачување слика: ${error.message}`);
          return;
        }
        photoUrl = supabase.storage
          .from("issue-photos")
          .getPublicUrl(data.path).data.publicUrl;
      }
    }

    const res = await submitKomunalecRequest({
      request_type: type,
      category: null,
      full_name: name,
      phone,
      address: address || null,
      district,
      message: message || null,
      photo_url: photoUrl,
      scheduled_at:
        type !== "complaint" && scheduledAt
          ? new Date(scheduledAt).toISOString()
          : null,
    });
    setSubmitting(false);

    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Барањето е испратено до Комуналец");
    reset();
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-4 border-b border-zinc-100 pb-3">
        <h3 className="flex items-center gap-2 text-lg font-extrabold leading-tight text-theme-heading sm:text-xl">
          <Send size={18} className="text-primary" />
          Испрати барање до Комуналец
        </h3>
        <p className="mt-1 text-xs text-theme-muted">
          Поплака, нарачка на контејнер или трактор за собирање ѓубре.
        </p>
      </div>

      {/* Request type — dropdown on mobile, pills on sm+ */}
      <select
        value={type}
        onChange={(e) => setType(e.target.value as KomunalecRequestType)}
        className="mb-3 block w-full min-w-0 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-primary sm:hidden">
        {REQUEST_TYPES.map(([val, label]) => (
          <option key={val} value={val}>
            {label}
          </option>
        ))}
      </select>
      <div className="mb-3 hidden flex-wrap gap-1.5 sm:flex">
        {REQUEST_TYPES.map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => setType(val)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              type === val
                ? "border-primary bg-primary text-white"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-primary/50"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Preferred date/time — only for container/tractor orders */}
      {type !== "complaint" && (
        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-theme-muted">
            Сакан термин (датум и време)
          </span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="box-border block w-full min-w-0 max-w-full appearance-none rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
          />
        </label>
      )}

      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Име и презиме"
          className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          placeholder="Телефон за контакт"
          className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
        />
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <StreetAutocomplete
          value={address}
          onChange={setAddress}
          placeholder="Адреса / улица"
        />
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value as District)}
          className="w-full min-w-0 rounded-xl border border-zinc-200 px-3 py-3 text-sm outline-none focus:border-primary">
          {DISTRICTS.map((d) => (
            <option key={d} value={d}>
              {DISTRICT_LABELS[d] ?? d}
            </option>
          ))}
        </select>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder={
          type === "complaint"
            ? "Опис на поплаката (опционално)"
            : "Детали — локација, количина, термин (опционално)"
        }
        className="mb-3 w-full resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
      />

      {/* Optional photo */}
      <div className="mb-3">
        {preview ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Преглед"
              className="h-24 w-24 rounded-lg object-cover"
            />
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
              className="absolute -right-2 -top-2 rounded-full bg-white p-1 text-red-500 shadow">
              <Trash2 size={14} />
            </button>
          </div>
        ) : (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-500 hover:border-primary/50">
            <ImagePlus size={14} /> Додај слика (опционално)
            <input
              type="file"
              accept="image/*"
              onChange={pickFile}
              className="hidden"
            />
          </label>
        )}
      </div>

      <button
        onClick={submit}
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60">
        {submitting ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Се испраќа…
          </>
        ) : (
          <>
            <Send size={16} /> Испрати барање
          </>
        )}
      </button>

      {!loggedIn && (
        <p className="mt-2 text-center text-xs text-theme-muted">
          <Link href="/login" className="font-semibold text-primary underline">
            Најавете се
          </Link>{" "}
          за да го испратите барањето.
        </p>
      )}
    </div>
  );
}
