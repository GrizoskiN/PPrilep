import { fetchCityEvents } from "../../../lib/sanity/queries";
import EventsExplorer from "../../../components/events/EventsExplorer";

export default async function EventsPage() {
  const events = await fetchCityEvents();

  return (
    <div className="py-4 lg:py-6 px-3 lg:px-4 space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-theme-heading">
          📅 Случувања
        </h1>
        <p className="text-sm text-theme-muted">
          Концерти, фестивали, спортски натпревари, изложби и сè што се случува
          во Прилеп.
        </p>
      </header>

      <EventsExplorer events={events} />
    </div>
  );
}
