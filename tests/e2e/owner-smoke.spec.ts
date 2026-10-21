import { expect, test } from "@playwright/test";

test("owner registers, collects a private review, and sees UPI checkout", async ({ page }) => {
  test.setTimeout(150_000);
  const email = `smoke-${Date.now()}@example.com`;
  const message = "The tea was cold and the wait was long";

  await page.goto("/register");
  await page.getByLabel("Your name").fill("Smoke Owner");
  await page.getByLabel("Business name").fill("Smoke Cafe");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("SmokeTest1");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/dashboard**");

  await page.goto("/dashboard/businesses");
  await page.getByRole("link", { name: "Manage", exact: true }).click();
  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Google review URL").fill("https://search.google.com/local/writereview?placeid=smoke");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved")).toBeVisible();
  await page.goBack();
  const reviewHref = await page.getByRole("link", { name: "View page" }).getAttribute("href");
  const reviewPath = new URL(reviewHref || "http://localhost/r/missing").pathname;
  await page.goto(reviewPath);
  await page.getByRole("button", { name: "2 stars" }).click();
  await expect(page.getByRole("heading", { name: "Leave a public review" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tell the owner privately" })).toBeVisible();
  const publicBox = await page.getByRole("heading", { name: "Leave a public review" }).boundingBox();
  const privateBox = await page.getByRole("heading", { name: "Tell the owner privately" }).boundingBox();
  expect(publicBox && privateBox && publicBox.y < privateBox.y).toBeTruthy();
  await page.getByRole("button", { name: "5 stars" }).click();
  await expect(page.getByRole("heading", { name: "Leave a public review" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tell the owner privately" })).toBeVisible();
  await page.goBack();
  await page.getByRole("main").getByRole("link", { name: /^QR codes/ }).click();
  await page.getByLabel("Label").fill("Front counter");
  await page.getByRole("button", { name: "Create QR code" }).click();
  await expect(page.getByText("Short URL")).toBeVisible();
  const shortUrl = await page.locator("code").first().innerText();
  const code = shortUrl.match(/\/q\/([^/?#\s]+)/)?.[1];
  expect(code, shortUrl).toBeTruthy();

  await page.goto(`/q/${code}`);
  await expect(page.getByRole("heading", { name: "Smoke Cafe" })).toBeVisible();
  await page.getByRole("button", { name: "Give Feedback" }).click();
  await expect(page.getByRole("link", { name: "Review on Google" }).first()).toBeVisible();
  await page.getByRole("button", { name: "2 stars" }).click();
  await expect(page.getByRole("link", { name: "Review on Google" }).first()).toBeVisible();
  await page.getByLabel("What could we have done better?").fill(message);
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByText("Thank you for your feedback")).toBeVisible();

  await page.goto("/dashboard/feedback");
  await expect(page.getByText(message)).toBeVisible();

  await page.setViewportSize({ width: 360, height: 800 });
  await page.route(/https:\/\/wa\.me\//, (route) => route.abort());
  await page.goto("/dashboard/businesses");
  await page.getByRole("link", { name: "Manage", exact: true }).click();
  await page.getByRole("link", { name: "Store settings" }).click();
  await expect(page.getByLabel("Store layout"), page.url()).toBeVisible();
  await page.getByLabel("Store layout").selectOption("FOOD");
  await page.getByRole("button", { name: "Save store settings" }).click();
  await expect(page.getByText("Store settings saved")).toBeVisible();
  await page.goBack();
  await page.getByRole("link", { name: /^Menu/ }).click();
  await page.getByLabel("Item name").fill("Smoke Coffee");
  await page.getByLabel("Price in rupees").fill("80");
  await page.getByRole("button", { name: "Add item" }).click();
  await expect(page.getByText("Smoke Coffee").first()).toBeVisible();

  await page.goto(`/q/${code}/menu`);
  await page.getByRole("button", { name: "Add Smoke Coffee" }).click();
  await page.getByRole("button", { name: "View cart" }).click();
  await page.getByRole("button", { name: "Order on WhatsApp" }).click();
  await page.waitForURL(/\/o\//);
  const foodNumber = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
  expect(foodNumber).toBeTruthy();
  await expect(page.getByRole("listitem").filter({ hasText: "New" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reorder" })).toBeVisible();

  await page.goto("/dashboard/businesses");
  await page.getByRole("link", { name: "Manage", exact: true }).click();
  await page.getByRole("link", { name: "Store settings" }).click();
  await page.getByLabel("Store layout").selectOption("SHOP");
  await page.getByRole("button", { name: "Save store settings" }).click();
  await expect(page.getByText("Store settings saved")).toBeVisible();
  await page.goto(`/q/${code}/menu`);
  await page.getByRole("button", { name: "Smoke Coffee" }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("button", { name: "View cart" }).click();
  await page.getByRole("button", { name: "Buy on WhatsApp" }).click();
  await page.waitForURL(/\/o\//);
  const shopNumber = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
  expect(shopNumber).not.toBe(foodNumber);

  await page.goto("/dashboard/orders");
  await expect(page.getByText(foodNumber, { exact: true })).toBeVisible();
  await expect(page.getByText(shopNumber, { exact: true })).toBeVisible();
  const foodCard = page.getByText(foodNumber, { exact: true }).locator("xpath=ancestor::*[.//a[normalize-space()='Bill 58mm']][1]");
  const popupPromise = page.waitForEvent("popup");
  await foodCard.getByRole("link", { name: "Bill 58mm" }).click();
  const bill = await popupPromise;
  await expect(bill.getByText(`BILL ${foodNumber}`)).toBeVisible();
  await expect(bill.getByText("Smoke Coffee")).toBeVisible();
  await expect(bill.getByText("Total", { exact: true })).toBeVisible();
  await expect(bill.getByRole("button", { name: "Print" })).toBeVisible();
  await expect(bill.getByRole("link", { name: "80mm" })).toBeVisible();
  const pageCss = await bill.locator("style").evaluateAll((nodes) => nodes.map((node) => node.textContent || "").join("\n"));
  expect(pageCss).toContain("size: 58mm");

  await page.goto("/dashboard/businesses");
  await page.getByRole("link", { name: "Manage", exact: true }).click();
  await page.getByRole("link", { name: /^Menu/ }).click();
  await page.getByLabel("Quick add name").fill("Smoke Bun");
  await page.getByLabel("Quick add price").fill("40");
  await page.getByLabel("Quick add price").press("Enter");
  await expect(page.getByText("Smoke Bun").first()).toBeVisible();
  await page.getByLabel("Paste items").fill("Smoke Toast 45");
  await page.getByRole("button", { name: "Add these lines" }).click();
  await expect(page.getByLabel("Draft name 1")).toHaveValue("Smoke Toast");
  await expect(page.getByLabel("Draft price 1")).toHaveValue("45");

  await page.goto("/dashboard/billing");
  await page.getByRole("button", { name: "Upgrade" }).first().click();
  await expect(page.getByText(/Pay with UPI|GPay, PhonePe/)).toBeVisible();
});
