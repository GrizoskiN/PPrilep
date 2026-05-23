/**
 * Позитива post schema.
 *
 * One Sanity document per blog post. Editors fill these in via the Studio
 * at /studio; the public /positive page reads them via GROQ.
 */

import { defineField, defineType } from "sanity";

export default defineType({
  name: "post",
  title: "Позитива пост",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Наслов",
      type: "string",
      validation: (r) => r.required().min(3).max(140),
    }),
    defineField({
      name: "slug",
      title: "URL slug",
      type: "slug",
      description: "Се генерира автоматски од насловот",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "excerpt",
      title: "Краток опис",
      type: "text",
      rows: 3,
      description: "1-2 реченици — се прикажува на картичките и во SEO meta",
      validation: (r) => r.max(280),
    }),
    defineField({
      name: "coverImage",
      title: "Главна слика",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Алт текст (за пристапност)",
          type: "string",
        }),
      ],
    }),
    defineField({
      name: "publishedAt",
      title: "Датум на објавување",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
      validation: (r) => r.required(),
    }),
    defineField({
      name: "author",
      title: "Автор",
      type: "reference",
      to: [{ type: "author" }],
    }),
    defineField({
      name: "tags",
      title: "Категории",
      type: "array",
      of: [{ type: "reference", to: [{ type: "tag" }] }],
      options: { layout: "tags" },
    }),
    defineField({
      name: "body",
      title: "Содржина",
      type: "array",
      of: [
        {
          type: "block",
          styles: [
            { title: "Параграф", value: "normal" },
            { title: "Наслов 2", value: "h2" },
            { title: "Наслов 3", value: "h3" },
            { title: "Цитат", value: "blockquote" },
          ],
          lists: [
            { title: "Точкеста листа", value: "bullet" },
            { title: "Нумерирана листа", value: "number" },
          ],
          marks: {
            decorators: [
              { title: "Болд", value: "strong" },
              { title: "Италик", value: "em" },
            ],
            annotations: [
              {
                name: "link",
                type: "object",
                title: "Линк",
                fields: [
                  { name: "href", type: "url", title: "URL" },
                ],
              },
            ],
          },
        },
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            { name: "alt", title: "Алт текст", type: "string" },
            { name: "caption", title: "Опис под слика", type: "string" },
          ],
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: "title",
      author: "author.name",
      media: "coverImage",
      date: "publishedAt",
    },
    prepare({ title, author, media, date }) {
      const d = date ? new Date(date).toLocaleDateString("mk-MK") : "";
      return {
        title,
        subtitle: [author, d].filter(Boolean).join(" · "),
        media,
      };
    },
  },
  orderings: [
    {
      title: "Најнови прво",
      name: "publishedAtDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],
});
