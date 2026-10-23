/** Show the one-time question only while both channels are still off. */
export function showReportPrompt(input: { dismissed: boolean; emailOptIn: boolean; whatsappOptIn: boolean }) {
  if (input.dismissed) return false;
  return !input.emailOptIn && !input.whatsappOptIn;
}
