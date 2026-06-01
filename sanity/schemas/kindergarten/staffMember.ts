import { defineField, defineType } from "sanity";

export default defineType({
  name: "staffMember",
  title: "Вработен",
  type: "document",
  fields: [
    defineField({ name: "name",        title: "Полно Име",  type: "string",    validation: (R) => R.required() }),
    defineField({ name: "role",        title: "Улога",      type: "string",    description: "пр. Директор, Воспитувач, Педагог" }),
    defineField({ name: "photo",       title: "Фотографија",type: "image",     options: { hotspot: true } }),
    defineField({ name: "institution", title: "Установа",   type: "reference", to: [{ type: "institution" }], validation: (R) => R.required() }),
    defineField({ name: "order",       title: "Редослед",   type: "number",    description: "Помал број = прикажан прв" }),
  ],
  preview: {
    select: { title: "name", subtitle: "role", media: "photo" },
  },
  orderings: [{ title: "По редослед", name: "orderAsc", by: [{ field: "order", direction: "asc" }] }],
});
