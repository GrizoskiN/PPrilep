/**
 * Movie poll schema — Кино анкета
 *
 * The poll itself is authored HERE and only here. Nothing in the app or the
 * database can create one: Supabase stores only the suggested films and the
 * votes, keyed by this document's `_id`. That is the whole point of the design
 * — an open poll where anyone could also open a *new* poll would be a spam
 * surface, so poll creation stays behind the Studio login.
 *
 * Suggestions and votes live in Supabase (supabase/add_movie_polls.sql),
 * exactly like the cityEvent poll.
 */

import { defineField, defineType } from "sanity";

export default defineType({
  name: "moviePoll",
  title: "Кино анкета",
  type: "document",
  icon: () => "🎬",
  fields: [
    defineField({
      name: "title",
      title: "Прашање",
      type: "string",
      description: "На пр. „Кој филм да го гледаме во август?“",
      validation: (r) => r.required().min(3).max(140),
    }),
    defineField({
      name: "description",
      title: "Опис",
      type: "text",
      rows: 2,
      validation: (r) => r.max(300),
    }),
    defineField({
      name: "poster",
      title: "Слика",
      type: "image",
      description:
        "Банер над прашањето. Се користи и како слика при споделување на " +
        "линкот. Хоризонтална слика изгледа најдобро.",
      options: { hotspot: true },
    }),
    defineField({
      name: "isOpen",
      title: "Анкетата е отворена",
      type: "boolean",
      description:
        "Исклучи за да ја затвориш анкетата. Затворената анкета сè уште се " +
        "гледа со резултатите, но не прима нови гласови ниту предлози.",
      initialValue: true,
    }),
    defineField({
      name: "allowSuggestions",
      title: "Дозволи предлози од корисници",
      type: "boolean",
      description:
        "Исклучи за да ја замрзнеш листата — гласањето продолжува, но никој " +
        "не може да додаде нов филм.",
      initialValue: true,
    }),
    defineField({
      name: "maxSuggestions",
      title: "Максимум филмови во листата",
      type: "number",
      description:
        "Вкупен број предлози што ги прима анкетата. Кога ќе се наполни, " +
        "гласањето продолжува но нема повеќе додавања.",
      initialValue: 30,
      validation: (r) => r.required().integer().min(2).max(200),
    }),
    defineField({
      name: "maxPerUser",
      title: "Максимум предлози по корисник",
      type: "number",
      description: "Колку филмови смее да предложи еден корисник.",
      initialValue: 2,
      validation: (r) => r.required().integer().min(1).max(20),
    }),
    defineField({
      name: "screeningAt",
      title: "Проекција",
      type: "datetime",
      description:
        "Кога се прикажува филмот. Ова е датумот што го гледаат корисниците — " +
        "не мешај го со „Почнува“ и „Завршува“, кои го одредуваат само " +
        "времето на гласањето.",
    }),
    defineField({
      name: "startsAt",
      title: "Гласањето почнува (опционално)",
      type: "datetime",
      description: "Остави празно за гласањето да почне веднаш.",
    }),
    defineField({
      name: "closesAt",
      title: "Гласањето завршува (опционално)",
      type: "datetime",
      description:
        "По овој момент анкетата се затвора автоматски, без да мора рачно " +
        "да ја исклучиш.",
    }),
  ],

  preview: {
    select: { title: "title", media: "poster", isOpen: "isOpen", closesAt: "closesAt" },
    prepare({ title, isOpen, closesAt }) {
      const closed = !isOpen || (closesAt && new Date(closesAt) < new Date());
      return {
        title,
        subtitle: closed ? "Затворена" : "Отворена",
      };
    },
  },
});
