// ── Desktop column layout per route ──────────────────────────────────────────
//
// The app shell renders either:
//   • 3 columns → left nav + centered main + right info panel
//   • 2 columns → left nav + a single wide main (right panel hidden, content
//     spans the combined width)
//
// To switch a section between layouts, just add/remove its base path here.
// "/" is matched exactly; every other entry matches the path and its children
// (e.g. "/issues" also covers "/issues/123").

export const THREE_COLUMN_ROUTES: readonly string[] = [
  "/", // Почетна (home)
  "/issues", // Пријави
  "/heroes", // Херои
  "/communities", // Населби
  "/sponsors", // Партнери
  "/kindergarten", // Наша Иднина — Градинки
];

/** True when the given pathname should use the 3-column layout. */
export function usesThreeColumns(pathname: string): boolean {
  return THREE_COLUMN_ROUTES.some((route) =>
    route === "/"
      ? pathname === "/"
      : pathname === route || pathname.startsWith(`${route}/`),
  );
}
