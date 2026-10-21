import { expect, test } from "@playwright/test";

test("owner registers, collects a private review, and sees UPI checkout", async ({ page }) => {
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
  await page.getByRole("link", { name: "Manage" }).click();
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

  await page.goto("/dashboard/billing");
  await page.getByRole("button", { name: "Upgrade" }).first().click();
  await expect(page.getByText(/Pay with UPI|GPay, PhonePe/)).toBeVisible();
});
