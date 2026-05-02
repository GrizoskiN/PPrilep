"use client";

import { useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, ImagePlus } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import Button from "../ui/Button";
import StreetAutocomplete from "./StreetAutocomplete";
import { toast } from "sonner";

const DISTRICTS = [
  "Center",
  "Varoš",
  "Trizla",
  "Točila",
  "Rid",
  "Tri Bari",
] as const;
const CATEGORIES = [
  "road",
  "water",
  "power",
  "garbage",
  "park",
  "other",
] as const;

const DISTRICT_MK: Record<string, string> = {
  Center: "Центар",
  Varoš: "Варош",
  Trizla: "Тризла",
  Točila: "Точила",
  Rid: "Рид",
  "Tri Bari": "Три Бари",
};
const CATEGORY_MK: Record<string, string> = {
  road: "Патишта",
  water: "Вода",
  power: "Струја",
  garbage: "Ѓубре",
  park: "Парк",
  other: "Друго",
};

const schema = z.object({
  title: z.string().min(5, "Насловот мора да има барем 5 знаци"),
  description: z.string().optional(),
  street_name: z.string().optional(),
  district: z.enum(DISTRICTS),
  category: z.enum(CATEGORIES),
});
type Fields = z.infer<typeof schema>;

interface Props {
  userId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReportModal({ userId, onClose, onSuccess }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { district: "Center", category: "road" },
  });

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function onSubmit(values: Fields) {
    if (!userId) {
      toast.error("Мора да сте најавени");
      return;
    }

    let photoUrl: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { data, error } = await supabase.storage
        .from("issue-photos")
        .upload(path, file, { contentType: file.type });
      if (error) {
        toast.error("Грешка при прикачување на фотографијата");
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("issue-photos").getPublicUrl(data.path);
      photoUrl = publicUrl;
    }

    const { error } = await supabase.from("issues").insert({
      ...values,
      street_name: values.street_name?.trim() || null,
      reported_by: userId,
      photo_url: photoUrl,
    });

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Проблемот е пријавен!");
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 sticky top-0 bg-white z-10">
          <h2 className="text-sm font-semibold">Пријави проблем</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-700">
              Наслов *
            </label>
            <input
              {...register("title")}
              placeholder="Кратко опишете го проблемот"
              className="mt-1 w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 transition-colors"
            />
            {errors.title && (
              <p className="text-[11px] text-red-500 mt-1">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-700">Опис</label>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="Додајте повеќе детали…"
              className="mt-1 w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 resize-none transition-colors"
            />
          </div>

          {/* Street name with Nominatim geocoding */}
          <div>
            <label className="text-xs font-medium text-zinc-700">
              Улица / локација
            </label>
            <p className="text-[10px] text-zinc-400 mb-1">
              Напишете за автоматско пребарување на OpenStreetMap
            </p>
            <Controller
              name="street_name"
              control={control}
              render={({ field }) => (
                <StreetAutocomplete
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="пр. ул. Партизанска"
                />
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-700">
                Населба *
              </label>
              <select
                {...register("district")}
                className="mt-1 w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white cursor-pointer focus:border-teal-500 outline-none">
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {DISTRICT_MK[d]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-700">
                Категорија *
              </label>
              <select
                {...register("category")}
                className="mt-1 w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white cursor-pointer focus:border-teal-500 outline-none">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_MK[c]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-700">
              Фотографија{" "}
              <span className="text-zinc-400">(незадолжително)</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={pickFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-1 w-full border border-dashed border-zinc-300 rounded-lg px-3 py-3 text-xs text-zinc-500 hover:border-teal-400 hover:text-teal-600 flex items-center justify-center gap-2 transition-colors cursor-pointer">
              <ImagePlus size={14} />
              {file ? file.name : "Кликнете за да додадете фотографија"}
            </button>
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Преглед"
                className="mt-2 rounded-lg w-full max-h-32 object-cover border border-zinc-200"
              />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <Button type="button" variant="ghost" onClick={onClose}>
              Откажи
            </Button>
            <Button type="submit" variant="teal" disabled={isSubmitting}>
              {isSubmitting ? "Се испраќа…" : "Пријави"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
