import { AdvisorCard } from "./AdvisorCard";
import type { FixtureCatalogEntry } from "../../data/fixtures/catalog";

interface AdvisorCardListProps {
  fixtures: FixtureCatalogEntry[];
  advisorCount: number;
}

export function AdvisorCardList({ fixtures, advisorCount }: AdvisorCardListProps) {
  // Build a list of all advisor slots
  const slots: { index: number; dataStatus: "loaded" | "fixture_pending"; forecasterLabel?: string; receiptDigest?: string }[] = [];

  for (let i = 0; i < advisorCount; i++) {
    const fixture = fixtures[i];
    if (fixture && fixture.dataStatus === "loaded") {
      slots.push({
        index: i,
        dataStatus: "loaded",
        forecasterLabel: fixture.forecasterLabel,
        receiptDigest: fixture.receiptDigest,
      });
    } else {
      slots.push({
        index: i,
        dataStatus: "fixture_pending",
      });
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {slots.map((slot) => (
        <AdvisorCard
          key={slot.index}
          index={slot.index}
          dataStatus={slot.dataStatus}
          forecasterLabel={slot.forecasterLabel}
          receiptDigest={slot.receiptDigest}
        />
      ))}
    </div>
  );
}
