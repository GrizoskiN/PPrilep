import { fetchPositivePosts } from "../../../lib/sanity/queries";
import PositiveLayoutClient from "./LayoutClient";

export default async function PositiveLayout({ children }: { children: React.ReactNode }) {
  // Fetch last 5 posts for the right panel sidebar
  const allPosts = await fetchPositivePosts();
  const recentPosts = allPosts.slice(0, 5);

  return (
    <PositiveLayoutClient recentPosts={recentPosts}>
      {children}
    </PositiveLayoutClient>
  );
}
