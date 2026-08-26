import { defineField, defineType } from "sanity";

/**
 * Новост од клуб — a short announcement attached to one sportClub.
 *
 * Deliberately tiny: a title, a few lines of plain text, an optional image and
 * an optional link. Clubs post "уписот е отворен", "натпревар во сабота",
 * "сменет термин" — none of that needs rich text, and a small form is a form
 * that actually gets filled in.
 *
 * The same two publication gates as sportClub: a post submitted from the site
 * arrives as an unpublished draft with `isSubmission: true`, and every public
 * query also filters `isSubmission != true || reviewed == true`, so publishing
 * a draft by accident in Studio still does not put it on the site.
 */
export default defineType({
  name: "sportPost",
  title: "Новост од клуб",
  type: "document",
  fields: [
    defineField({
      name: "club",
      title: "Клуб",
      type: "reference",
      to: [{ type: "sportClub" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "title",
      title: "Наслов",
      type: "string",
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: "body",
      title: "Текст",
      type: "text",
      rows: 5,
      validation: (Rule) => Rule.max(2000),
    }),
    defineField({
      name: "image",
      title: "Слика",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "link",
      title: "Линк",
      type: "url",
      description: "Пријава, настан или објава на друго место.",
    }),
    defineField({
      // Set by the API route, not by the clock: a club may post an
      // announcement about something that already has its own date.
      name: "publishedAt",
      title: "Датум",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "pinned",
      title: "Закачено",
      type: "boolean",
      description: "Останува на врв на профилот на клубот.",
      initialValue: false,
    }),
    defineField({
      name: "isSubmission",
      title: "Пристигнато преку сајтот",
      type: "boolean",
      readOnly: true,
      initialValue: false,
    }),
    defineField({
      name: "reviewed",
      title: "Прегледано",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "submittedBy",
      title: "Испратил",
      type: "object",
      readOnly: true,
      fields: [
        defineField({ name: "name", title: "Име", type: "string" }),
        defineField({ name: "email", title: "Меил", type: "string" }),
        defineField({ name: "userId", title: "Корисник", type: "string" }),
      ],
    }),
  ],
  orderings: [
    {
      title: "Најнови први",
      name: "publishedAtDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],
  preview: {
    select: { title: "title", club: "club.name", date: "publishedAt", media: "image" },
    prepare({ title, club, date, media }) {
      const day = date ? new Date(date).toLocaleDateString("mk-MK") : "";
      return { title, subtitle: [club, day].filter(Boolean).join(" · "), media };
    },
  },
});
