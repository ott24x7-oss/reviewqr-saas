export type CartLine = { qty: number; unitPaise: number };
export type UnbrandedQuoteLine = { unbranded: boolean; netPaise: number };

export function toggleUnbrandedSwitch(selected: boolean) {
  return !selected;
}

export function unbrandedQuoteDisplay(lines: UnbrandedQuoteLine[], label: string) {
  const selected = lines.filter((line) => line.unbranded);
  if (!selected.length) return null;
  return { label, amountPaise: selected.reduce((sum, line) => sum + Math.max(0, Math.floor(line.netPaise)), 0) };
}

/** Display total for the lines the owner has picked. The server quote is what gets charged. */
export function linePaise(qty: number, unitPaise: number) {
  const units = Number.isFinite(qty) ? Math.max(0, Math.round(qty)) : 0;
  const price = Number.isFinite(unitPaise) ? Math.max(0, Math.round(unitPaise)) : 0;
  return units * price;
}

export function cartPaise(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + linePaise(line.qty, line.unitPaise), 0);
}
