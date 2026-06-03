import { defineField, defineType } from "sanity";

export default defineType({
  name: "kindergartenAnnouncement",
  title: "Соопштение",
  type: "document",
  fields: [
    defineField({ name: "institution", title: "Установа (остави празно = за сите)", type: "reference", to: [{ type: "institution" }] }),
    defineField({ name: "title",       title: "Наслов",      type: "string",    validation: (R) => R.required() }),
    defineField({ name: "body",        title: "Содржина",    type: "text",  rows: 6 }),
    defineField({ name: "coverImage",  title: "Слика",                    type: "image",    options: { hotspot: true } }),
    defineField({ name: "video",       title: "Видео (прикачи директно)", type: "file",     options: { accept: "video/*" } }),
    defineField({ name: "videoUrl",    title: "Видео линк (YouTube / Vimeo)", type: "url",  description: "Алтернатива на директно прикачување" }),
    defineField({ name: "publishedAt", title: "Објавено на",              type: "datetime", validation: (R) => R.required() }),
  ],
  preview: {
    select: { title: "title", subtitle: "institution.name", media: "coverImage" },
  },
  orderings: [{ title: "По датум (најново)", name: "publishedDesc", by: [{ field: "publishedAt", direction: "desc" }] }],
});
