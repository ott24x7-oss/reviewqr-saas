export const SETUP_KEYS = ["details", "link", "menu", "buttons", "store", "print"] as const;

export type SetupKey = (typeof SETUP_KEYS)[number];

export type SetupStep = { key: SetupKey; done: boolean };

export type SetupInput = {
  hasDetails: boolean;
  hasLink: boolean;
  hasMenu: boolean;
  menuOn: boolean;
  hasButtons: boolean;
  hasHours: boolean;
  hasUpi: boolean;
  printed: boolean;
};

/** Home checklist. The card hides once every step is done. */
export function setupChecklist(input: SetupInput): SetupStep[] {
  return [
    { key: "details", done: input.hasDetails },
    { key: "link", done: input.hasLink },
    { key: "menu", done: !input.menuOn || input.hasMenu },
    { key: "buttons", done: input.hasButtons },
    { key: "store", done: input.hasHours && input.hasUpi },
    { key: "print", done: input.printed }
  ];
}
