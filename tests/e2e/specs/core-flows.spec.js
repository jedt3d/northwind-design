import { test, expect } from "@playwright/test";

async function login(page, user = "admin", pass = "password") {
  await page.goto("/login");
  await page.locator("#login-identity").fill(user);
  await page.locator("#login-password").fill(pass);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).not.toHaveURL(/login/, { timeout: 10000 });
  const langSelect = page.locator("select").first();
  await expect(langSelect).toBeVisible({ timeout: 10000 });
  await langSelect.selectOption("en"); // deterministic language for all tests
}

/** Open a LookupSelect inside the FormField labeled `label`, search, pick option containing `optionText`. */
async function pickLookup(page, fieldLabel, query, optionText) {
  const field = page.locator(".field", { has: page.locator(".field-label", { hasText: fieldLabel }) }).first();
  await field.locator(".lookup-picker-value").click();
  await field.locator(".lookup-picker-open input").fill(query);
  await page.locator(".lookup-picker-open").getByText(optionText).first().click();
}

/** LookupSelect used inline (add-line row) shows its placeholder text on the closed button. */
async function pickInlineLookup(page, placeholder, query, optionText) {
  await page.locator(".lookup-picker-value", { hasText: placeholder }).first().click();
  await page.locator(".lookup-picker-open input").fill(query);
  await page.locator(".lookup-picker-open").getByText(optionText).first().click();
}

test.describe("F1 auth + i18n", () => {
  test("rejects bad credentials with visible error", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-identity").fill("admin");
    await page.locator("#login-password").fill("wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.locator(".field-error, .nw-toast, [role=alert], .login-error").first()).toBeVisible({ timeout: 8000 });
  });

  test("admin/password logs in and lands on dashboard", async ({ page }) => {
    await login(page);
    await expect(page.locator("body")).toContainText(/dashboard|แดชบอร์ด|ダッシュボード/i);
  });

  test("language switch to Thai and Japanese", async ({ page }) => {
    await login(page);
    const combo = page.locator("select").first();
    await combo.selectOption("en");
    await expect(page.locator("body")).toContainText(/Dashboard/, { timeout: 5000 });
    await combo.selectOption("th");
    await expect(page.locator("body")).toContainText(/แดชบอร์ด|คำสั่งซื้อ|สินค้า/, { timeout: 5000 });
    await combo.selectOption("ja");
    await expect(page.locator("body")).toContainText(/ダッシュボード|注文|商品|製品/, { timeout: 5000 });
    await combo.selectOption("en");
  });
});

test.describe("F3 companies", () => {
  test("directory lists seeded companies, search works", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: /companies/i }).click();
    await expect(page.locator("body")).toContainText("Alfreds Futterkiste", { timeout: 10000 });
    await page.getByPlaceholder(/search/i).fill("Pavlova");
    await expect(page.locator("body")).toContainText("Pavlova", { timeout: 5000 });
    await expect(page.locator("body")).not.toContainText("Alfreds Futterkiste", { timeout: 5000 });
  });
});

test.describe("F5 order lifecycle end-to-end", () => {
  test("create order, allocate, invoice, ship, close", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: /^orders$/i }).click();
    await page.getByRole("button", { name: /new order/i }).click();

    await pickLookup(page, "Customer", "Island", "Island Trading");
    await page.getByRole("button", { name: /^(save|create)/i }).first().click();

    // detail page: add a line (Chang has 100 units seeded)
    await pickInlineLookup(page, "Add line", "Chang", "Chang");
    await page.getByLabel("Qty").fill("3");
    await page.getByRole("button", { name: /^add$/i }).click();
    await expect(page.locator(".status-badge", { hasText: /allocated/i }).first()).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /^invoice$/i }).click();
    await expect(page.locator("body")).toContainText(/invoiced/i, { timeout: 10000 });

    await page.getByRole("button", { name: /^ship$/i }).click();
    await pickLookup(page, "Shipper", "Speedy", "Speedy Express");
    await page.locator("#ship-fee").fill("12.5");
    await page.getByRole("button", { name: /confirm shipment/i }).click();
    await expect(page.locator("body")).toContainText(/shipped/i, { timeout: 10000 });

    await page.getByRole("button", { name: /close order/i }).click();
    await expect(page.locator("body")).toContainText(/closed/i, { timeout: 10000 });
  });
});

test.describe("F6 purchase order approve + receive", () => {
  test("draft PO -> submit -> approve -> receive posts stock", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: /purchase orders/i }).click();
    await page.getByRole("button", { name: /new purchase order/i }).click();

    await pickLookup(page, "Supplier", "Tokyo", "Tokyo Traders");
    await page.getByRole("button", { name: /^(save|create)/i }).first().click();

    await pickInlineLookup(page, "Add line", "Coffee", "Coffee");
    await page.getByLabel("Qty").fill("10");
    await page.getByRole("button", { name: /^add$/i }).click();
    await expect(page.locator("body")).toContainText(/Coffee/, { timeout: 10000 });

    await page.getByRole("button", { name: /^submit$/i }).click();
    await expect(page.locator(".status-badge", { hasText: /submitted/i }).first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /^approve$/i }).click();
    await expect(page.locator(".status-badge", { hasText: /approved/i }).first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /^receive$/i }).first().click();
    await expect(page.locator("body")).toContainText(/received|posted/i, { timeout: 10000 });
  });
});

test.describe("F7 inventory guard", () => {
  test("negative adjustment is rejected with server message", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: /inventory/i }).click();
    await page.getByRole("link", { name: /adjustment/i }).click();

    await pickLookup(page, "Product", "Scones", "Scones");
    await page.getByText(/out|remove|decrease/i).first().click(); // direction radio
    await page.getByLabel(/qty|quantity/i).fill("99999");
    await page.getByLabel(/comment/i).fill("e2e negative test");
    await page.getByRole("button", { name: /post adjustment/i }).click();
    await expect(page.locator("body")).toContainText(/negative|BR-I1/i, { timeout: 10000 });
  });
});

test.describe("mobile @mobile", () => {
  test("login + nav + orders list usable at 360px @mobile", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: /menu/i }).click();
    await page.getByRole("link", { name: /^orders$/i }).click();
    await expect(page.locator("body")).toContainText(/SO-\d+/, { timeout: 10000 });
  });
});
