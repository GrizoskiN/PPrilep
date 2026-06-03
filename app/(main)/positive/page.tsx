import { fetchPositivePosts } from "../../../lib/sanity/queries";
import PositiveFeed from "../../../components/positive/PositiveFeed";

export const metadata = {
  title: "Позитива — Подобар Прилеп",
  description:
    "Добри вести од Прилеп — нови проекти, освоени награди, локални херои и сè што нè прави горди на нашиот град.",
};

export const revalidate = 86400; // webhook at /api/revalidate handles instant purge

export default async function PositivePage() {
  const posts = await fetchPositivePosts();

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">☀️ Позитива</h1>
        <p className="text-sm text-slate-500">
          Добри вести од Прилеп — нови проекти, освоени награди, локални
          херои и сè што нè прави горди на нашиот град.
        </p>
      </header>

      <PositiveFeed posts={posts} />
    </div>
  );
}
