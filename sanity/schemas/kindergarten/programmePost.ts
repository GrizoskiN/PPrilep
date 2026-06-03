import { defineField, defineType } from "sanity";

export default defineType({
  name: "programmePost",
  title: "Неделна програма",
  type: "document",
  fields: [
    defineField({ name: "institution", title: "Установа",            type: "reference", to: [{ type: "institution" }], validation: (R) => R.required() }),
    defineField({ name: "weekStart",   title: "Почеток на недела",   type: "date",      validation: (R) => R.required(), description: "Понеделник од таа недела" }),
    defineField({ name: "title",       title: "Наслов / Тема",       type: "string" }),
    defineField({ name: "body",        title: "Содржина",            type: "text",  rows: 6 }),
  ],
  preview: {
    select: { title: "weekStart", subtitle: "institution.name" },
    prepare: ({ title, subtitle }) => ({ title: `📅 Недела ${title}`, subtitle }),
  },
  orderings: [{ title: "По датум (најново)", name: "weekDesc", by: [{ field: "weekStart", direction: "desc" }] }],
});
