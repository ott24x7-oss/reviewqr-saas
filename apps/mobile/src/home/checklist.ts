export type HomeChecklistData = {
  hasLogo: boolean;
  itemCount: number;
  hasStandOrder: boolean;
  hasReview: boolean;
};

export type HomeChecklistKey = "logo" | "items" | "stand" | "review";
export type HomeChecklistStep = { key: HomeChecklistKey; done: boolean };

export function homeChecklist(data: HomeChecklistData): HomeChecklistStep[] {
  return [
    { key: "logo", done: data.hasLogo },
    { key: "items", done: data.itemCount >= 3 },
    { key: "stand", done: data.hasStandOrder },
    { key: "review", done: data.hasReview }
  ];
}

export function homePromoIndex(date: Date) {
  const year = date.getFullYear();
  const start = new Date(year, 0, 1).getTime();
  const localDay = new Date(year, date.getMonth(), date.getDate()).getTime();
  const day = Math.floor((localDay - start) / 86_400_000);
  return day % 3;
}

