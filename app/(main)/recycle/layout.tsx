import RecycleLayoutClient from "../../../components/recycle/RecycleLayoutClient";

export default function RecycleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RecycleLayoutClient>{children}</RecycleLayoutClient>;
}
