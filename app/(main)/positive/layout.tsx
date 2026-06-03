import { fetchPositivePosts } from "../../../lib/sanity/queries";
import PositiveLayoutClient from "./LayoutClient";

export default async function PositiveLayout({ children }: { children: React.ReactNode }) {
  const allPosts = await fetchPositivePosts();
  const recentPosts = allPosts.slice(0, 5);
  return <PositiveLayoutClient recentPosts={recentPosts}>{children}</PositiveLayoutClient>;
}
