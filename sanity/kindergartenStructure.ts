import type { StructureResolver } from "sanity/structure";

export const kindergartenStructure: StructureResolver = (S) =>
  S.list()
    .title("Наша Иднина — Градинки")
    .items([
      S.listItem()
        .title("🏫 Установи")
        .child(S.documentTypeList("institution").title("Установи")),

      S.divider(),

      S.listItem()
        .title("👩‍🏫 Персонал")
        .child(S.documentTypeList("staffMember").title("Персонал")),

      S.divider(),

      S.listItem()
        .title("🍽️ Неделно мени")
        .child(
          S.documentTypeList("menuPost")
            .title("Мени")
            .defaultOrdering([{ field: "weekStart", direction: "desc" }]),
        ),

      S.listItem()
        .title("📅 Неделна програма")
        .child(
          S.documentTypeList("programmePost")
            .title("Програма")
            .defaultOrdering([{ field: "weekStart", direction: "desc" }]),
        ),

      S.divider(),

      S.listItem()
        .title("📢 Соопштенија")
        .child(
          S.documentTypeList("kindergartenAnnouncement")
            .title("Соопштенија")
            .defaultOrdering([{ field: "publishedAt", direction: "desc" }]),
        ),

      S.divider(),

      S.listItem()
        .title("📄 Документи за запишување")
        .child(
          S.documentTypeList("signupDocument")
            .title("Документи")
            .defaultOrdering([{ field: "order", direction: "asc" }]),
        ),
    ]);
