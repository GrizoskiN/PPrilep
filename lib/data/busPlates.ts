// Vehicle registration plates, keyed by the bus's number (from its label
// "Автобус N"). Private fleet data: only the owner, site admins, and the
// Јавен превоз operator see these — served by the gated /api/buses/plates
// route and deliberately kept OUT of the public /api/buses/positions payload.
export const BUS_PLATES: Record<number, string> = {
  1: "PP 6052 AH",
  2: "PP 6053 AH",
  3: "PP 6054 AH",
  4: "PP 6051 AH",
};

// Pull the bus number out of a label like "Автобус 3" / "Avtobus 3" and map it
// to its plate. Returns null when there's no plate on record.
export function plateForLabel(label: string): string | null {
  const m = label.match(/\d+/);
  if (!m) return null;
  return BUS_PLATES[Number(m[0])] ?? null;
}
