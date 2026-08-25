/**
 * Одгледан филм — a screening that already happened.
 *
 * Purely an archive: these are added by hand after a screening and shown in the
 * right panel on /kino, so the poll page carries some history instead of only
 * the current vote. Nothing here feeds the poll.
 */

import { defineField, defineType } from "sanity";

export default defineType({
  name: "pastScreening",
  title: "Одгледан филм",
  type: "document",
  icon: () => "🍿",
  fields: [
    defineField({
      name: "title",
      title: "Филм",
      type: "string",
      validation: (r) => r.required().min(1).max(140),
    }),
    defineField({
      name: "screenedAt",
      title: "Датум на прикажување",
      type: "date",
      options: { dateFormat: "DD.MM.YYYY" },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "poster",
      title: "Слика",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "note",
      title: "Белешка",
      type: "text",
      rows: 2,
      description: "На пр. локација, или колку луѓе дојдоа. Опционално.",
      validation: (r) => r.max(200),
    }),
  ],

  orderings: [
    {
      title: "Најнови први",
      name: "screenedAtDesc",
      by: [{ field: "screenedAt", direction: "desc" }],
    },
  ],

  preview: {
    select: { title: "title", media: "poster", screenedAt: "screenedAt" },
    prepare({ title, media, screenedAt }) {
      return {
        title,
        media,
        subtitle: screenedAt
          ? new Date(screenedAt).toLocaleDateString("mk-MK", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "Без датум",
      };
    },
  },
});
