/**
 * Studio uses its own UI chrome — opt out of any parent layout decoration.
 * This layout is intentionally empty so the Studio gets the full viewport.
 */

export const metadata = {
  title: "Подобар Прилеп — CMS",
  robots: { index: false, follow: false }, // don't index the studio
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
