import { defineField, defineType } from "sanity";

// Shared day fields — reused for each weekday
const DAY_FIELDS = [
  defineField({ name: "breakfast", title: "Појадок",    type: "text",   rows: 2 }),
  defineField({ name: "snack1",    title: "Ужина",      type: "string" }),
  defineField({ name: "lunch",     title: "Ручек",      type: "text",   rows: 2 }),
  defineField({ name: "snack2",    title: "Ужинка 2",   type: "string" }),
];

export default defineType({
  name: "menuPost",
  title: "Неделно мени",
  type: "document",
  fields: [
    defineField({
      name: "institution", title: "Установа (незадолжително — остави празно за сите)",
      type: "reference", to: [{ type: "institution" }],
    }),
    defineField({ name: "weekStart", title: "Прва недела — Понеделник", type: "date", validation: (R) => R.required() }),
    defineField({ name: "weekEnd",   title: "Последна недела — Петок",  type: "date" }),
    defineField({ name: "title",     title: "Наслов",                    type: "string", description: "пр. Мени 18.05 – 29.05.2026" }),
    defineField({ name: "monday",    title: "Понеделник", type: "object", fields: DAY_FIELDS }),
    defineField({ name: "tuesday",   title: "Вторник",    type: "object", fields: DAY_FIELDS }),
    defineField({ name: "wednesday", title: "Среда",      type: "object", fields: DAY_FIELDS }),
    defineField({ name: "thursday",  title: "Четврток",   type: "object", fields: DAY_FIELDS }),
    defineField({ name: "friday",    title: "Петок",      type: "object", fields: DAY_FIELDS }),
  ],
  preview: {
    select: { title: "title", subtitle: "weekStart" },
    prepare: ({ title, subtitle }) => ({ title: title ?? `Мени ${subtitle}`, media: () => "🍽️" }),
  },
  orderings: [{ title: "По датум (најново)", name: "weekDesc", by: [{ field: "weekStart", direction: "desc" }] }],
});
