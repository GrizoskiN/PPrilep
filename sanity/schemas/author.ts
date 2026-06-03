import { defineField, defineType } from "sanity";

export default defineType({
  name: "author",
  title: "Автор",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Име",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name", maxLength: 96 },
    }),
    defineField({
      name: "avatar",
      title: "Слика на профил",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "bio",
      title: "Кратко за авторот",
      type: "text",
      rows: 3,
    }),
  ],
  preview: {
    select: { title: "name", media: "avatar" },
  },
});
