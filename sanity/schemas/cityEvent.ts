/**
 * City Event schema — Случувања
 *
 * One Sanity document per event. Editors fill these in via the Studio at
 * /studio; the public /events page reads them via GROQ.
 */

import { defineField, defineType } from "sanity";

const CATEGORIES = [
  { title: "Концерт", value: "concert" },
  { title: "Фестивал", value: "festival" },
  { title: "Спорт", value: "sport" },
  { title: "Изложба", value: "exhibition" },
  { title: "Театар", value: "theatre" },
  { title: "Семејно", value: "family" },
  { title: "Друго", value: "other" },
];

export default defineType({
  name: "cityEvent",
  title: "Настан",
  type: "document",
  icon: () => "📅",
  fields: [
    defineField({
      name: "title",
      title: "Наслов",
      type: "string",
      validation: (r) => r.required().min(3).max(140),
    }),
    defineField({
      name: "slug",
      title: "Пократок линк (slug)",
      type: "slug",
      description:
        "За споделлив линк /events/… . Кликни „Generate“ за да се создаде од " +
        "насловот.",
      options: { source: "title", maxLength: 96 },
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
      name: "startDate",
      title: "Датум на почеток",
      type: "date",
      options: { dateFormat: "YYYY-MM-DD" },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "endDate",
      title: "Датум на крај (само за повеќедневни настани)",
      type: "date",
      options: { dateFormat: "YYYY-MM-DD" },
    }),
    defineField({
      name: "time",
      title: "Почеток во (пр. 21:00)",
      type: "string",
      description: "Оставете празно за целодневни / повеќедневни настани.",
    }),
    defineField({
      name: "location",
      title: "Локација",
      type: "string",
      description: "пр. Градски парк, Прилеп",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "description",
      title: "Краток опис",
      type: "text",
      rows: 4,
      validation: (r) => r.max(1000),
    }),
    defineField({
      name: "coverImage",
      title: "Насловна слика",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Алт текст (пристапност)",
          type: "string",
        }),
      ],
    }),
    defineField({
      name: "sourceUrl",
      title: "Надворешен линк (Facebook настан, билети…)",
      type: "url",
    }),
    defineField({
      name: "pinned",
      title: "Закачен настан",
      type: "boolean",
      description:
        "Прикажи го во десната колона (под Ветувања) на почетната. Само еден " +
        "закачен настан се прикажува — ако има повеќе, се зема најскорешниот.",
      initialValue: false,
    }),
  ],

  preview: {
    select: {
      title: "title",
      category: "category",
      media: "coverImage",
      startDate: "startDate",
      location: "location",
    },
    prepare({ title, category, media, startDate, location }) {
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
        subtitle: [cat, date, location].filter(Boolean).join(" · "),
        media,
      };
    },
  },

  orderings: [
    {
      title: "По датум (идни прво)",
      name: "startDateAsc",
      by: [{ field: "startDate", direction: "asc" }],
    },
    {
      title: "По датум (поминати прво)",
      name: "startDateDesc",
      by: [{ field: "startDate", direction: "desc" }],
    },
  ],
});
