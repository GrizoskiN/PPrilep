import { fetchCityEvents } from "../../../lib/sanity/queries";
import EventsExplorer from "../../../components/events/EventsExplorer";
import SubmitEventButton from "../../../components/events/SubmitEventButton";

export default async function EventsPage() {
  const events = await fetchCityEvents();

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-theme-heading">
            📅 Случувања
          </h1>
          <p className="text-sm text-theme-muted">
            Концерти, фестивали, спортски натпревари, изложби и сè што се случува
            во Прилеп.
          </p>
        </div>
        <SubmitEventButton />
      </header>

      <EventsExplorer events={events} />
    </div>
  );
}
