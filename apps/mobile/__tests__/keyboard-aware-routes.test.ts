import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const appRoot = path.join(__dirname, "..", "app");
const businessFormPath = path.join(__dirname, "..", "src", "ui", "business-form.tsx");
const bottomSheetPath = path.join(__dirname, "..", "src", "ui", "bits.tsx");

/** Inputs that live only inside BottomSheet are already keyboard-aware: the sheet scrolls with KeyboardAwareScrollView. */
function fieldsAreOnlyInsideBottomSheet(source: string, bottomSheetSource: string) {
  if (!source.includes("<BottomSheet") || !bottomSheetSource.includes("KeyboardAwareScrollView")) return false;
  const outsideSheets = source.replace(/<BottomSheet\b[\s\S]*?<\/BottomSheet>/g, "");
  return !/<(?:TextInput|Field|FilledField|OtpCodeForm)\b/.test(outsideSheets);
}

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [fullPath] : [];
  });
}

describe("keyboard aware input screens", () => {
  const businessForm = readFileSync(businessFormPath, "utf8");
  const bottomSheet = readFileSync(bottomSheetPath, "utf8");

  it("wraps every screen containing an input in a keyboard aware scroll container", () => {
    const inputScreens = routeFiles(appRoot).filter((file) =>
      /<(?:TextInput|Field|FilledField|OtpCodeForm|BusinessForm)\b/.test(readFileSync(file, "utf8"))
    );
    const missing = inputScreens.filter((file) => {
      const source = readFileSync(file, "utf8");
      const routeIsKeyboardAware = source.includes("KeyboardAwareScrollView") || /<Screen\b[^>]*\bkeyboardAware/.test(source);
      const sharedBusinessFormIsKeyboardAware = source.includes("<BusinessForm") && businessForm.includes("KeyboardAwareScrollView");
      const sheetIsKeyboardAware = fieldsAreOnlyInsideBottomSheet(source, bottomSheet);
      return !routeIsKeyboardAware && !sharedBusinessFormIsKeyboardAware && !sheetIsKeyboardAware;
    });

    expect(missing.map((file) => path.relative(appRoot, file))).toEqual([]);
  });

  it("installs KeyboardProvider at the application root", () => {
    const rootLayout = readFileSync(path.join(appRoot, "_layout.tsx"), "utf8");
    expect(rootLayout).toContain("<KeyboardProvider>");
  });
});
