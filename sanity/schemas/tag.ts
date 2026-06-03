import { defineField, defineType } from "sanity";

export default defineType({
  name: "tag",
  title: "Категорија",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Наслов",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (r) => r.required(),
    }),
  ],
  preview: { select: { title: "title", subtitle: "slug.current" } },
});
