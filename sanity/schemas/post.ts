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
      name: "gallery",
      title: "Галерија со слики",
      type: "array",
      description: "Дополнителни фотографии — се прикажуваат како галерија под содржината.",
      of: [
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({
              name: "alt",
              title: "Алт текст (за пристапност)",
              type: "string",
            }),
            defineField({
              name: "caption",
              title: "Опис под слика",
              type: "string",
            }),
          ],
        },
      ],
      options: { layout: "grid" },
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
      name: "institution",
      title: "Институција",
      type: "string",
      description: "пр. ОУ Кире Гаврилоски, Општина Прилеп, ЈКП Комуналец...",
    }),
    defineField({
      name: "subject",
      title: "Тема / Предмет",
      type: "string",
      description: "пр. Образование, Паркови, Деца, Спорт...",
    }),
    defineField({
      name: "videoUrl",
      title: "Видео линк (YouTube / Vimeo)",
      type: "url",
    }),
    defineField({
      name: "categories",
      title: "Категории",
      type: "array",
      of: [{ type: "string" }],
      description: "Тематски категории — infrastructure, education, culture…",
      options: {
        list: [
          { title: "Инфраструктура",   value: "infrastructure" },
          { title: "Образование",      value: "education" },
          { title: "Култура",          value: "culture" },
          { title: "Спорт",            value: "sport" },
          { title: "Животна средина",  value: "environment" },
          { title: "Здравство",        value: "health" },
          { title: "Бизнис",           value: "business" },
          { title: "Заедница",         value: "community" },
        ],
        layout: "tags",
      },
    }),
    defineField({
      name: "isSubmission",
      title: "Пратено од граѓанин",
      type: "boolean",
      initialValue: false,
      description: "Означува дека приказната е пратена преку формата, не напишана од редакција.",
    }),
    defineField({
      name: "reviewed",
      title: "Прегледано",
      type: "boolean",
      initialValue: false,
      hidden: ({ document }) => !document?.isSubmission,
      description: "Означи кога ќе ја прегледаш приказната — ја вади од редот за преглед.",
    }),
    defineField({
      name: "submittedBy",
      title: "Испратено од",
      type: "object",
      hidden: ({ document }) => !document?.isSubmission,
      fields: [
        defineField({ name: "name", title: "Ime", type: "string" }),
        defineField({ name: "email", title: "Е-пошта", type: "string" }),
        defineField({ name: "phone", title: "Телефон", type: "string" }),
        defineField({ name: "userId", title: "User ID (Supabase)", type: "string", readOnly: true }),
      ],
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
