import VoteSimulator from "../../../../components/initiatives/VoteSimulator";

export const metadata = {
  title: "Преглед на гласови",
};

export default function InitiativesPreviewPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-base font-semibold text-theme-heading">
          Преглед на гласови
        </h1>
        <p className="text-xs text-theme-muted">
          Лизгајте за да видите како се менуваат фазата и сегментираниот напредок.
        </p>
      </header>

      <VoteSimulator initial={10} />
    </div>
  );
}
