import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const appRoot = path.join(__dirname, "..", "app");
const businessFormPath = path.join(__dirname, "..", "src", "ui", "business-form.tsx");

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [fullPath] : [];
  });
}

describe("keyboard aware input screens", () => {
  const businessForm = readFileSync(businessFormPath, "utf8");

  it("wraps every screen containing an input in a keyboard aware scroll container", () => {
    const inputScreens = routeFiles(appRoot).filter((file) =>
      /<(?:TextInput|Field|FilledField|OtpCodeForm|BusinessForm)\b/.test(readFileSync(file, "utf8"))
    );
    const missing = inputScreens.filter((file) => {
      const source = readFileSync(file, "utf8");
      const routeIsKeyboardAware = source.includes("KeyboardAwareScrollView") || /<Screen\b[^>]*\bkeyboardAware/.test(source);
      const sharedBusinessFormIsKeyboardAware = source.includes("<BusinessForm") && businessForm.includes("KeyboardAwareScrollView");
      return !routeIsKeyboardAware && !sharedBusinessFormIsKeyboardAware;
    });

    expect(missing.map((file) => path.relative(appRoot, file))).toEqual([]);
  });

  it("installs KeyboardProvider at the application root", () => {
    const rootLayout = readFileSync(path.join(appRoot, "_layout.tsx"), "utf8");
    expect(rootLayout).toContain("<KeyboardProvider>");
  });
});
