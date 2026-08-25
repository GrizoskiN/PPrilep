import KinoPanelMount from "../../../components/kino/KinoPanelMount";
import { fetchPastScreenings } from "../../../lib/sanity/moviePoll";

export default async function KinoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const screenings = await fetchPastScreenings();
  return <KinoPanelMount screenings={screenings}>{children}</KinoPanelMount>;
}
