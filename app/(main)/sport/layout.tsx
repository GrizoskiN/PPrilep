import SportPanelInjector from "../../../components/sport/SportPanelInjector";
import { fetchDaySchedule, fetchSportNews, todayInPrilep } from "../../../lib/sanity/sport";

// Server component — the panel data is fetched here so the client injector has
// it on mount and the panel never renders empty then fills in.
// Fifteen minutes: "тренинзи денес" is computed from the clock at render time,
// so the panel must not be baked into a page cached for an hour.
export const revalidate = 900;

export default async function SportLayout({ children }: { children: React.ReactNode }) {
  const day = todayInPrilep();
  const [slots, news] = await Promise.all([
    fetchDaySchedule(day).catch(() => []),
    fetchSportNews(6).catch(() => []),
  ]);

  return (
    <>
      <SportPanelInjector day={day} slots={slots} news={news} />
      {children}
    </>
  );
}
