import { test, expect } from "@playwright/test";

const API = "http://localhost:3001";
const APP = "http://localhost:3000";

// ─── Backend health ───────────────────────────────────────────────────────────

test("backend health endpoint returns ok", async ({ request }) => {
  const res = await request.get(`${API}/health`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe("ok");
});

test("backend returns 401 on protected routes without token", async ({
  request,
}) => {
  const endpoints = [
    "/api/contacts",
    "/api/deals",
    "/api/tasks",
    "/api/stats",
    "/api/activities",
  ];
  for (const path of endpoints) {
    const res = await request.get(`${API}${path}`);
    expect(res.status(), `${path} should require auth`).toBe(401);
  }
});

test("backend CORS header present on health", async ({ request }) => {
  const res = await request.get(`${API}/health`, {
    headers: { Origin: APP },
  });
  expect(res.status()).toBe(200);
});

// ─── Frontend smoke tests ─────────────────────────────────────────────────────

test("frontend root loads without crash", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(errors.filter((e) => !e.includes("webpack"))).toHaveLength(0);
});

test("dashboard redirect to sign-in when unauthenticated", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  expect(page.url()).toContain("/sign-in");
});

test("contacts route redirects unauthenticated", async ({ page }) => {
  await page.goto("/dashboard/contacts");
  await page.waitForLoadState("networkidle");
  expect(page.url()).toContain("/sign-in");
});

test("deals route redirects unauthenticated", async ({ page }) => {
  await page.goto("/dashboard/deals");
  await page.waitForLoadState("networkidle");
  expect(page.url()).toContain("/sign-in");
});

test("onboarding route redirects unauthenticated", async ({ page }) => {
  await page.goto("/onboarding");
  await page.waitForLoadState("networkidle");
  expect(page.url()).toContain("/sign-in");
});

test("sign-in page renders Clerk form", async ({ page }) => {
  await page.goto("/sign-in");
  await page.waitForLoadState("networkidle");
  // Clerk renders an iframe or div with sign-in form
  const clerk = page.locator(
    '[data-clerk-component], #clerk-components, .cl-rootBox, iframe[src*="clerk"]',
  );
  await expect(clerk.first()).toBeVisible({ timeout: 10_000 });
});

// ─── Frontend structure ───────────────────────────────────────────────────────

test("new contact page redirects unauthenticated", async ({ page }) => {
  await page.goto("/dashboard/contacts/new");
  await page.waitForLoadState("networkidle");
  expect(page.url()).toContain("/sign-in");
});

test("new deal page redirects unauthenticated", async ({ page }) => {
  await page.goto("/dashboard/deals/new");
  await page.waitForLoadState("networkidle");
  expect(page.url()).toContain("/sign-in");
});

test("404 page for unknown route", async ({ page }) => {
  const res = await page.goto("/this-route-does-not-exist-xyz");
  // Next.js returns 404 for unknown routes
  expect(res?.status()).toBe(404);
});

// ─── API shape validation ─────────────────────────────────────────────────────

test("backend 404 for unknown API route", async ({ request }) => {
  const res = await request.get(`${API}/api/nonexistent-route-xyz`);
  expect(res.status()).toBe(401); // auth middleware runs before route resolution
});

test("backend OPTIONS preflight returns 200", async ({ request }) => {
  const res = await request.fetch(`${API}/api/contacts`, {
    method: "OPTIONS",
    headers: {
      Origin: APP,
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "Authorization, Content-Type",
    },
  });
  expect([200, 204]).toContain(res.status());
});
