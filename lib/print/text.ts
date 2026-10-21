/** WinAnsi / PDF standard fonts cannot shape these characters. */
export function needsRaster(value: string) {
  return /[^\x20-\x7e]/.test(value);
}

export function latinText(value: string) {
  return value.replace(/[^\x20-\x7e]/g, " ").replace(/\s+/g, " ").trim();
}
