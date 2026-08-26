import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * A sport club, federation, gym or recreation organisation in Prilep.
 *
 * Every profile is free and every profile has the SAME shape — that is the
 * point of the section. Clubs never type into Studio: they fill in the public
 * form (`/sport/nov` → `app/api/sport/submit/route.ts`), which writes an
 * unpublished draft with `isSubmission: true` for editor review, exactly as
 * cityEvent and post already do.
 *
 * `ownerId` is here from day one even though nothing writes it yet: phase 2
 * gives an approved club its own login with edit rights over its own profile,
 * and a field added later would mean backfilling every document by hand.
 */
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export default defineType({
  name: "sportClub",
  title: "Спортски клуб",
  type: "document",
  groups: [
    { name: "identity", title: "Основно", default: true },
    { name: "offer", title: "Понуда" },
    { name: "schedule", title: "Распоред и цени" },
    { name: "where", title: "Локација" },
    { name: "contact", title: "Контакт" },
    { name: "admin", title: "Администрација" },
  ],
  fields: [
    // ── Identity ─────────────────────────────────────────────────────────────
    defineField({
      name: "name",
      title: "Назив",
      type: "string",
      group: "identity",
      description: "Полното име на клубот, на кирилица.",
      validation: (R) => R.required().max(120),
    }),
    defineField({
      name: "slug",
      title: "Slug (URL)",
      type: "slug",
      group: "identity",
      options: { source: "name", maxLength: 96 },
      validation: (R) => R.required(),
    }),
    defineField({
      name: "kind",
      title: "Тип",
      type: "string",
      group: "identity",
      options: {
        list: [
          { title: "Спортски клуб", value: "club" },
          { title: "Сојуз/федерација", value: "federation" },
          { title: "Фитнес центар", value: "gym" },
          { title: "Спортски центар", value: "centre" },
          { title: "Школа", value: "school" },
          { title: "Рекреативна група", value: "recreation" },
        ],
        layout: "radio",
      },
      initialValue: "club",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "sports",
      title: "Спорт(ови)",
      type: "array",
      group: "identity",
      of: [defineArrayMember({ type: "string" })],
      options: { layout: "tags" },
      description: "пр. фудбал, кошарка, карате. На кирилица, мали букви.",
      validation: (R) => R.required().min(1),
    }),
    defineField({
      name: "logo",
      title: "Лого",
      type: "image",
      group: "identity",
      options: { hotspot: true },
    }),
    defineField({
      name: "coverImage",
      title: "Насловна слика",
      type: "image",
      group: "identity",
      options: { hotspot: true },
      description: "Слика од салата, теренот или екипата.",
    }),
    defineField({
      name: "foundedYear",
      title: "Година на основање",
      type: "number",
      group: "identity",
      validation: (R) => R.min(1850).max(new Date().getFullYear()),
    }),

    // ── Offer ────────────────────────────────────────────────────────────────
    defineField({
      name: "shortDescription",
      title: "Краток опис",
      type: "text",
      rows: 2,
      group: "offer",
      description: "Една-две реченици — се прикажува во списокот.",
      validation: (R) => R.max(220),
    }),
    defineField({
      name: "about",
      title: "За клубот",
      type: "text",
      rows: 6,
      group: "offer",
    }),
    defineField({
      name: "ageGroups",
      title: "Возрасни групи",
      type: "array",
      group: "offer",
      of: [defineArrayMember({ type: "string" })],
      options: {
        layout: "grid",
        list: [
          { title: "Предучилишна (4–6)", value: "4-6" },
          { title: "Деца (7–11)", value: "7-11" },
          { title: "Кадети (12–15)", value: "12-15" },
          { title: "Јуниори (16–18)", value: "16-18" },
          { title: "Сениори (18+)", value: "18+" },
          { title: "Рекреативци", value: "recreation" },
          { title: "Ветерани", value: "veterans" },
        ],
      },
      description: "Најчесто поставеното прашање — за која возраст примате.",
    }),
    defineField({
      name: "gender",
      title: "Пол",
      type: "string",
      group: "offer",
      options: {
        list: [
          { title: "Мешано", value: "mixed" },
          { title: "Машки", value: "male" },
          { title: "Женски", value: "female" },
        ],
        layout: "radio",
      },
      initialValue: "mixed",
    }),
    defineField({
      name: "level",
      title: "Ниво",
      type: "array",
      group: "offer",
      of: [defineArrayMember({ type: "string" })],
      options: {
        layout: "grid",
        list: [
          { title: "Почетници", value: "beginner" },
          { title: "Напредни", value: "advanced" },
          { title: "Натпреварувачки", value: "competitive" },
          { title: "Рекреативно", value: "recreational" },
        ],
      },
    }),

    // ── Schedule + prices ────────────────────────────────────────────────────
    defineField({
      name: "schedule",
      title: "Распоред",
      type: "array",
      group: "schedule",
      description:
        "Еден ред по група. Ако сите групи тренираат заедно, доволен е еден ред.",
      of: [
        defineArrayMember({
          type: "object",
          name: "trainingSlot",
          fields: [
            defineField({
              name: "group",
              title: "Група",
              type: "string",
              description: "пр. Деца 7–11, Сениори, Женска екипа",
              validation: (R) => R.required(),
            }),
            defineField({
              name: "days",
              title: "Денови",
              type: "array",
              of: [defineArrayMember({ type: "string" })],
              options: {
                layout: "grid",
                list: [
                  { title: "Пон", value: "1" },
                  { title: "Вто", value: "2" },
                  { title: "Сре", value: "3" },
                  { title: "Чет", value: "4" },
                  { title: "Пет", value: "5" },
                  { title: "Саб", value: "6" },
                  { title: "Нед", value: "0" },
                ],
              },
              validation: (R) => R.required().min(1),
            }),
            defineField({
              name: "startTime",
              title: "Од",
              type: "string",
              description: "пр. 18:00",
              validation: (R) =>
                R.required()
                  .regex(TIME, { name: "време" })
                  .error("Форматот е ЧЧ:ММ, пр. 18:00"),
            }),
            defineField({
              name: "endTime",
              title: "До",
              type: "string",
              validation: (R) =>
                R.regex(TIME, { name: "време" }).error(
                  "Форматот е ЧЧ:ММ, пр. 19:30",
                ),
            }),
            defineField({ name: "venue", title: "Сала/терен", type: "string" }),
          ],
          preview: {
            select: {
              group: "group",
              startTime: "startTime",
              endTime: "endTime",
              days: "days",
            },
            prepare: ({ group, startTime, endTime, days }) => ({
              title: group,
              subtitle:
                `${(days ?? []).length} дена · ${startTime ?? ""}` +
                (endTime ? `–${endTime}` : ""),
            }),
          },
        }),
      ],
    }),
    defineField({
      name: "pricing",
      title: "Ценовник",
      type: "array",
      group: "schedule",
      description:
        "Секоја ставка со своја цена — така секој профил изгледа исто.",
      of: [
        defineArrayMember({
          type: "object",
          name: "priceItem",
          fields: [
            defineField({
              name: "label",
              title: "Ставка",
              type: "string",
              description: "пр. Членарина, Деца до 12 години, Годишна",
              validation: (R) => R.required(),
            }),
            defineField({
              name: "price",
              title: "Цена (ден.)",
              type: "number",
              validation: (R) => R.required().min(0),
            }),
            defineField({
              name: "period",
              title: "Период",
              type: "string",
              options: {
                list: [
                  { title: "месечно", value: "month" },
                  { title: "годишно", value: "year" },
                  { title: "по термин", value: "session" },
                  { title: "еднократно", value: "once" },
                ],
                layout: "radio",
              },
              initialValue: "month",
              validation: (R) => R.required(),
            }),
            defineField({ name: "note", title: "Забелешка", type: "string" }),
          ],
          preview: {
            select: { label: "label", price: "price", period: "period" },
            prepare: ({ label, price, period }) => ({
              title: label,
              subtitle: `${price} ден. / ${period}`,
            }),
          },
        }),
      ],
    }),
    defineField({
      name: "freeTrial",
      title: "Прв тренинг бесплатно",
      type: "boolean",
      group: "schedule",
      initialValue: false,
      description: "Повеќето клубови го нудат, а речиси никој не го објавува.",
    }),
    defineField({
      name: "acceptingMembers",
      title: "Прима нови членови",
      type: "boolean",
      group: "schedule",
      initialValue: true,
      description:
        "Исклучи кога уписот е затворен — инаку луѓето ѕвонат без причина.",
    }),
    defineField({
      name: "howToJoin",
      title: "Како да се зачлениш",
      type: "text",
      rows: 3,
      group: "schedule",
    }),

    // ── Where ────────────────────────────────────────────────────────────────
    defineField({
      name: "venue",
      title: "Сала/терен",
      type: "string",
      group: "where",
      description:
        "Каде всушност се тренира — често не е на адресата на клубот.",
    }),
    defineField({ name: "address", title: "Адреса", type: "string", group: "where" }),
    defineField({ name: "district", title: "Населба", type: "string", group: "where" }),
    defineField({ name: "lat", title: "Географска ширина", type: "number", group: "where" }),
    defineField({ name: "lng", title: "Географска должина", type: "number", group: "where" }),

    // ── People + contact ─────────────────────────────────────────────────────
    defineField({
      name: "coaches",
      title: "Тренери",
      type: "array",
      group: "contact",
      of: [
        defineArrayMember({
          type: "object",
          name: "coach",
          fields: [
            defineField({
              name: "name",
              title: "Име и презиме",
              type: "string",
              validation: (R) => R.required(),
            }),
            defineField({
              name: "role",
              title: "Улога",
              type: "string",
              description: "пр. Главен тренер",
            }),
            defineField({
              name: "photo",
              title: "Фотографија",
              type: "image",
              options: { hotspot: true },
            }),
          ],
          preview: { select: { title: "name", subtitle: "role", media: "photo" } },
        }),
      ],
    }),
    defineField({ name: "phone", title: "Телефон", type: "string", group: "contact" }),
    defineField({ name: "email", title: "Е-пошта", type: "string", group: "contact" }),
    defineField({ name: "website", title: "Веб страна", type: "url", group: "contact" }),
    defineField({ name: "facebook", title: "Facebook", type: "url", group: "contact" }),
    defineField({ name: "instagram", title: "Instagram", type: "url", group: "contact" }),
    defineField({ name: "tiktok", title: "TikTok", type: "url", group: "contact" }),
    defineField({ name: "youtube", title: "YouTube", type: "url", group: "contact" }),

    // ── Admin ────────────────────────────────────────────────────────────────
    defineField({
      name: "updatedAt",
      title: "Последно ажурирано",
      type: "datetime",
      group: "admin",
      description:
        "Се прикажува на профилот — застарен распоред е полош од никаков, па " +
        "читателот треба да види колку е свеж.",
    }),
    defineField({
      name: "verified",
      title: "Потврдено од редакција",
      type: "boolean",
      group: "admin",
      initialValue: false,
    }),
    defineField({
      name: "ownerId",
      title: "Сопственик (Supabase user ID)",
      type: "string",
      group: "admin",
      readOnly: true,
      description:
        "Кој смее сам да го уредува овој профил. Се пополнува кога клубот ќе " +
        "добие сопствена најава.",
    }),
    defineField({
      name: "isSubmission",
      title: "Пратено преку форма",
      type: "boolean",
      group: "admin",
      initialValue: false,
      description:
        "Означува дека профилот е пратен преку формата, не внесен од редакција.",
    }),
    defineField({
      name: "reviewed",
      title: "Прегледано",
      type: "boolean",
      group: "admin",
      initialValue: false,
      hidden: ({ document }) => !document?.isSubmission,
      description: "Означи кога ќе го прегледаш — го вади од редот за преглед.",
    }),
    defineField({
      name: "submittedBy",
      title: "Испратено од",
      type: "object",
      group: "admin",
      hidden: ({ document }) => !document?.isSubmission,
      fields: [
        defineField({ name: "name", title: "Име", type: "string" }),
        defineField({ name: "email", title: "Е-пошта", type: "string" }),
        defineField({ name: "phone", title: "Телефон", type: "string" }),
        defineField({
          name: "userId",
          title: "User ID (Supabase)",
          type: "string",
          readOnly: true,
        }),
      ],
    }),
  ],
  preview: {
    select: { title: "name", sports: "sports", media: "logo", kind: "kind" },
    prepare: ({ title, sports, media, kind }) => ({
      title,
      subtitle: (sports ?? []).join(", ") || kind,
      media,
    }),
  },
});
