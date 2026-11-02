export type ReviewRatingSummary = {
  average: string;
  empty: boolean;
};

/** Empty rating sets must not display a fallback or placeholder average. */
export function reviewRatingSummary(average: number | null, count: number): ReviewRatingSummary {
  if (count <= 0) return { average: "—", empty: true };
  return { average: average == null ? "—" : average.toFixed(1), empty: false };
}
