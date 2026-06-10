import { expect, test } from "@playwright/test";

test("admin can create profile and key, then downstream key can run and read events", async ({ request }) => {
  const login = await request.post("/api/admin/login", {
    data: { email: "admin@example.com", password: "password" }
  });
  expect(login.ok()).toBeTruthy();

  const profile = await request.post("/api/admin/profiles", {
    data: {
      id: "mock-e2e",
      type: "mock",
      name: "Mock E2E",
      cwd: process.cwd(),
      enabled: true
    }
  });
  expect(profile.ok()).toBeTruthy();

  const key = await request.post("/api/admin/api-keys", {
    data: {
      name: "e2e",
      dailyRunLimit: 10,
      rpmLimit: 60,
      maxConcurrentRuns: 2
    }
  });
  expect(key.ok()).toBeTruthy();
  const keyBody = (await key.json()) as { token: string };

  const run = await request.post("/api/runs", {
    headers: { authorization: `Bearer ${keyBody.token}` },
    data: { prompt: "hello e2e", profileId: "mock-e2e" }
  });
  expect(run.ok()).toBeTruthy();
  const runBody = (await run.json()) as { id: string; status: string; output: string };
  expect(runBody.status).toBe("completed");
  expect(runBody.output).toContain("hello e2e");

  const events = await request.get(`/api/runs/${runBody.id}/events`, {
    headers: { authorization: `Bearer ${keyBody.token}` }
  });
  expect(events.ok()).toBeTruthy();
  const eventBody = (await events.json()) as Array<{ type: string }>;
  expect(eventBody.map((event) => event.type)).toContain("run.completed");
});

test("dashboard covers login, profile, API key, run, and event viewing path", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByText("Missing admin session")).toHaveCount(0);

  await page.getByTestId("login-email").fill("admin@example.com");
  await page.getByTestId("login-password").fill("password");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();

  await page.getByTestId("nav-profiles").click();
  await page.getByTestId("profile-id").fill("mock-ui-e2e");
  await page.getByTestId("create-profile").click();
  await expect(page.getByText("mock-ui-e2e")).toBeVisible();

  await page.getByTestId("nav-keys").click();
  await page.getByTestId("key-name").fill("ui-e2e-key");
  await page.getByTestId("create-key").click();
  await expect(page.getByTestId("created-token")).toContainText("c2a_");
  const token = (await page.getByTestId("created-token").textContent())?.trim() ?? "";

  await page.getByTestId("nav-runs").click();
  await page.getByTestId("run-profile").selectOption("mock-ui-e2e");
  await page.getByTestId("run-prompt").fill("hello dashboard e2e");
  await page.getByTestId("run-submit").click();
  const runRow = page.getByTestId("run-row").filter({ hasText: "hello dashboard e2e" });
  await expect(runRow).toContainText("completed");
  await runRow.getByRole("button", { name: "View events" }).click();
  await expect(page.getByTestId("run-events")).toContainText("run.completed");

  const runId = (await runRow.getByTestId("run-id").textContent())?.trim() ?? "";
  const events = await request.get(`/api/runs/${runId}/events`, {
    headers: { authorization: `Bearer ${token}` }
  });
  expect(events.ok()).toBeTruthy();
  const eventBody = (await events.json()) as Array<{ type: string }>;
  expect(eventBody.map((event) => event.type)).toContain("run.completed");

  await page.getByTestId("nav-keys").click();
  const keyRow = page.getByTestId("key-row").filter({ hasText: "ui-e2e-key" });
  await keyRow.getByRole("button", { name: "Revoke" }).click();
  await expect(keyRow).toContainText("disabled");
});
