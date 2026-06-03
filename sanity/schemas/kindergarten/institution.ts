import { defineField, defineType } from "sanity";

export default defineType({
  name: "institution",
  title: "Установа",
  type: "document",
  fields: [
    defineField({ name: "name",        title: "Назив",              type: "string",   validation: (R) => R.required() }),
    defineField({ name: "slug",        title: "Slug (URL)",         type: "slug",     options: { source: "name" }, validation: (R) => R.required() }),
    defineField({ name: "address",     title: "Адреса",             type: "string" }),
    defineField({ name: "phone",       title: "Телефон",            type: "string" }),
    defineField({ name: "closingTime", title: "Затвора во",         type: "string",   description: "пр. 18:00" }),
    defineField({ name: "district",    title: "Населба",            type: "string" }),
    defineField({ name: "description", title: "Опис",               type: "text",     rows: 3 }),
    defineField({ name: "coverImage",  title: "Насловна слика",     type: "image",    options: { hotspot: true } }),
    defineField({ name: "lat",         title: "Географска ширина",  type: "number" }),
    defineField({ name: "lng",         title: "Географска должина", type: "number" }),
  ],
  preview: {
    select: { title: "name", subtitle: "address" },
    prepare: ({ title, subtitle }) => ({ title, subtitle, media: () => "🏫" }),
  },
});
