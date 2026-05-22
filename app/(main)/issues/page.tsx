import IssueList from "../../../components/issues/IssueList";
import type { District } from "../../../lib/types/database";

interface Props {
  searchParams: Promise<{ district?: string }>;
}

const DISTRICTS: District[] = [
  "Center",
  "Varoš",
  "Trizla",
  "Točila",
  "Rid",
  "Tipski",
  "Boncejca",
];

export default async function IssuesPage({ searchParams }: Props) {
  const { district } = await searchParams;
  const defaultDistrict = DISTRICTS.includes(district as District)
    ? (district as District)
    : undefined;

  return (
      <IssueList
        key={defaultDistrict ?? "all"}
        defaultDistrict={defaultDistrict}
      />
  );
}
