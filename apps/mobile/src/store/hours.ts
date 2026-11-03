export function formatStoreTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return value;
  const suffix = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function formatHoursLabels(open: string, close: string, labels: { opens: string; closes: string }) {
  return `${labels.opens} ${formatStoreTime(open)} · ${labels.closes} ${formatStoreTime(close)}`;
}

