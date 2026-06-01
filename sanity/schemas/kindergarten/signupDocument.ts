import { defineField, defineType } from "sanity";

export default defineType({
  name: "signupDocument",
  title: "Документ за запишување",
  type: "document",
  fields: [
    defineField({ name: "title",       title: "Назив на документот", type: "string",    validation: (R) => R.required() }),
    defineField({ name: "file",        title: "PDF / Датотека",      type: "file",      validation: (R) => R.required() }),
    defineField({ name: "institution", title: "Установа (незадолжително — остави празно за сите)", type: "reference", to: [{ type: "institution" }] }),
    defineField({ name: "order",       title: "Редослед",            type: "number" }),
  ],
  preview: {
    select: { title: "title", subtitle: "institution.name" },
    prepare: ({ title, subtitle }) => ({ title, subtitle: subtitle ?? "Сите установи", media: () => "📄" }),
  },
  orderings: [{ title: "По редослед", name: "orderAsc", by: [{ field: "order", direction: "asc" }] }],
});
