export const MAX_BATCH = 100;

export function batchSizeError(count: number) {
  if (!Number.isInteger(count) || count < 1 || count > MAX_BATCH) return "Choose between 1 and 100 codes";
  return null;
}

export function tableLabels(count: number) {
  return Array.from({ length: count }, (_, index) => `Table ${index + 1}`);
}
