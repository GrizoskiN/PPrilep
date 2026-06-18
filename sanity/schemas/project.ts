/**
 * Project schema — Наши Проекти
 *
 * Editorial showcase of completed/ongoing civic projects by Мојот Град — Прилеп.
 * Not to be confused with citizen-driven Initiatives (which live in Supabase).
 */

import { defineField, defineType } from "sanity";

const STATUSES = [
  { title: "🔄 Во тек", value: "ongoing" },
  { title: "✅ Завршен", value: "completed" },
  { title: "📋 Планиран", value: "planned" },
];

const CATEGORIES = [
  { title: "🧹 Чистење", value: "cleaning" },
  { title: "🌳 Зазеленување", value: "greening" },
  { title: "🏙️ Урбана опрема", value: "urban" },
  { title: "💻 Дигитализација", value: "digital" },
  { title: "🎓 Едукација", value: "education" },
  { title: "🤝 Заедница", value: "community" },
  { title: "💛 Донација / Фонд", value: "fund" },
  { title: "Друго", value: "other" },
];

export default defineType({
  name: "project",
  title: "Проект",
  type: "document",
  icon: () => "🏗️",
  fields: [
    defineField({
      name: "title",
      title: "Наслов",
      type: "string",
      validation: (r) => r.required().min(3).max(120),
    }),
    defineField({
      name: "slug",
      title: "URL (slug)",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "status",
      title: "Статус",
      type: "string",
      options: { list: STATUSES, layout: "radio" },
      initialValue: "planned",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "category",
      title: "Категорија",
      type: "string",
      options: { list: CATEGORIES, layout: "radio" },
      initialValue: "other",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "coverImage",
      title: "Насловна слика",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Алт текст",
          type: "string",
        }),
      ],
    }),
    defineField({
      name: "excerpt",
      title: "Краток опис (приказ на листа)",
      type: "text",
      rows: 3,
      validation: (r) => r.max(300),
    }),
    defineField({
      name: "body",
      title: "Детален опис",
      type: "array",
      of: [
        { type: "block" },
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({ name: "alt", title: "Алт текст", type: "string" }),
            defineField({ name: "caption", title: "Потпис", type: "string" }),
          ],
        },
      ],
    }),
    defineField({
      name: "location",
      title: "Локација (пр. Точила, Прилеп)",
      type: "string",
    }),
    defineField({
      name: "startDate",
      title: "Датум на почеток",
      type: "date",
      options: { dateFormat: "YYYY-MM-DD" },
    }),
    defineField({
      name: "endDate",
      title: "Датум на завршување",
      type: "date",
      options: { dateFormat: "YYYY-MM-DD" },
    }),
    defineField({
      name: "gallery",
      title: "Галерија (пред/после)",
      type: "array",
      of: [
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({ name: "alt", title: "Алт текст", type: "string" }),
            defineField({ name: "caption", title: "Потпис", type: "string" }),
          ],
        },
      ],
    }),
    defineField({
      name: "beforeAfter",
      title: "Пред / Потоа (лизгач)",
      description:
        "Секоја споредба прикажува лизгач за откривање — повлечи за да видиш пред и потоа.",
      type: "array",
      of: [
        {
          type: "object",
          name: "comparison",
          title: "Споредба",
          fields: [
            defineField({
              name: "before",
              title: "Пред (слика)",
              type: "image",
              options: { hotspot: true },
              validation: (r) => r.required(),
            }),
            defineField({
              name: "after",
              title: "Потоа (слика)",
              type: "image",
              options: { hotspot: true },
              validation: (r) => r.required(),
            }),
            defineField({
              name: "label",
              title: "Опис (опционално)",
              type: "string",
            }),
          ],
          preview: {
            select: { media: "after", title: "label" },
            prepare({ media, title }) {
              return { media, title: title || "Пред / Потоа" };
            },
          },
        },
      ],
    }),
    defineField({
      name: "volunteersCount",
      title: "Број на волонтери",
      type: "number",
    }),
    defineField({
      name: "publishedAt",
      title: "Датум на објава",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
      validation: (r) => r.required(),
    }),
    defineField({
      name: "featured",
      title: "Истакнат проект",
      type: "boolean",
      initialValue: false,
      description: "Истакнатите проекти се прикажуваат прво.",
    }),
  ],

  preview: {
    select: {
      title: "title",
      status: "status",
      category: "category",
      media: "coverImage",
      startDate: "startDate",
    },
    prepare({ title, status, category, media, startDate }) {
      const st = STATUSES.find((s) => s.value === status)?.title ?? status;
      const cat = CATEGORIES.find((c) => c.value === category)?.title ?? category;
      const date = startDate
        ? new Date(startDate).toLocaleDateString("mk-MK", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "";
      return {
        title,
        subtitle: [st, cat, date].filter(Boolean).join(" · "),
        media,
      };
    },
  },

  orderings: [
    {
      title: "Истакнати прво, потоа по датум",
      name: "featuredThenDate",
      by: [
        { field: "featured", direction: "desc" },
        { field: "publishedAt", direction: "desc" },
      ],
    },
    {
      title: "По датум (најнови прво)",
      name: "publishedDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],
});
