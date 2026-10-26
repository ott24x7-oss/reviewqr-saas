export function commissionSplit(poolPaise: number, sharePercent: number) {
  const safePool = Math.max(0, Math.round(poolPaise));
  const safePercent = Math.max(0, Math.min(100, sharePercent));
  const memberPaise = Math.round((safePool * safePercent) / 100);
  return { memberPaise, leaderPaise: safePool - memberPaise };
}
