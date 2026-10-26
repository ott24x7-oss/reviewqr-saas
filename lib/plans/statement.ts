function cell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export type StatementRow = {
  paidAt: Date;
  grossPaise: number;
  tdsPaise: number;
  netPaise: number;
  amountPaise: number;
  utr: string;
};

/** Gross, TDS and net for one agent. Older rows that predate TDS use the amount that was sent. */
export function payoutStatementCsv(rows: StatementRow[]) {
  const lines = ["paidAt,grossPaise,tdsPaise,netPaise,utr"];
  for (const row of rows) {
    const gross = row.grossPaise || row.amountPaise;
    const net = row.netPaise || row.amountPaise;
    lines.push([row.paidAt.toISOString(), String(gross), String(row.tdsPaise), String(net), cell(row.utr)].join(","));
  }
  return lines.join("\n");
}
