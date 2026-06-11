import { expect, test, type Page } from "@playwright/test";

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
  const profileBody = (await profile.json()) as { cwd: string; sandbox: string; approvalPolicy: string };
  expect(profileBody.cwd).toContain("runtime-workspaces");
  expect(profileBody.cwd).not.toBe(process.cwd());
  expect(profileBody.sandbox).toBe("read-only");
  expect(profileBody.approvalPolicy).toBe("never");

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

test("dashboard covers Chinese account pool, profile, API key, run, and events", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByText("Missing admin session")).toHaveCount(0);

  await page.getByTestId("login-email").fill("admin@example.com");
  await page.getByTestId("login-password").fill("password");
  await page.getByTestId("login-submit").click();
  await expect(page.getByRole("heading", { name: "概览" })).toBeVisible();
  await page.getByTestId("theme-switch").click();
  await page.getByRole("option", { name: "暗色" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/u);
  await page.getByTestId("theme-switch").click();
  await page.getByRole("option", { name: "亮色" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/u);
  await page.getByTestId("locale-switch").click();
  await page.getByRole("option", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await page.getByTestId("locale-switch").click();
  await page.getByRole("option", { name: "中文" }).click();
  await expect(page.getByRole("heading", { name: "概览" })).toBeVisible();

  await page.getByTestId("nav-accounts").click();
  await expect(page.getByRole("heading", { name: "上游账号" })).toBeVisible();
  await openCreateDialog(page, "create-account", "account-id");
  await page.getByTestId("account-id").fill("codex-ui-e2e");
  await page.getByTestId("account-name").fill("UI Codex 账号");
  await page.getByTestId("create-account").click();
  await expect(page.getByTestId("account-id")).toBeHidden();
  await expect(page.getByText("codex-ui-e2e", { exact: true })).toBeVisible();
  await expect(page.getByText("待认证")).toBeVisible();
  await page.getByTestId("auth-codex-ui-e2e").click();
  await expect(page.getByText("E2E-1234")).toBeVisible();
  await page.getByTestId("poll-codex-ui-e2e").click();
  await expect(page.getByText("已认证")).toBeVisible();
  await openCreateDialog(page, "create-account", "account-id");
  await page.getByTestId("account-id").fill("codex-delete-e2e");
  await page.getByTestId("account-name").fill("待删账号");
  await page.getByTestId("create-account").click();
  await expect(page.getByText("codex-delete-e2e", { exact: true })).toBeVisible();
  await page.getByTestId("delete-account-codex-delete-e2e").click();
  await expect(page.getByText("codex-delete-e2e", { exact: true })).toHaveCount(0);

  await page.getByTestId("nav-instances").click();
  await expect(page.getByRole("heading", { name: "执行实例" })).toBeVisible();
  await openCreateDialog(page, "create-instance", "instance-id");
  await page.getByTestId("instance-account").click();
  await page.getByRole("option", { name: "UI Codex 账号" }).click();
  await page.getByTestId("instance-id").fill("mock-ui-inst");
  await page.getByTestId("instance-name").fill("UI Mock 实例");
  await page.getByTestId("instance-concurrency").fill("2");
  await page.getByTestId("create-instance").click();
  await expect(page.getByText("mock-ui-inst")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "mock-ui-inst" }).filter({ hasText: "健康" })).toBeVisible();

  await page.getByTestId("nav-profiles").click();
  await expect(page.getByRole("heading", { name: "模型配置" })).toBeVisible();
  await openCreateDialog(page, "create-profile", "profile-id");
  await page.getByTestId("profile-id").fill("mock-ui-e2e");
  await page.getByTestId("create-profile").click();
  await expect(page.getByRole("row").filter({ hasText: "mock-ui-e2e" }).first()).toBeVisible();
  await page.getByTestId("import-agent-models").click();
  await expect(page.getByRole("row").filter({ hasText: "gpt-5.5" }).filter({ hasText: "GPT-5.5" })).toBeVisible();
  await openCreateDialog(page, "create-profile", "profile-id");
  await page.getByTestId("profile-id").fill("mock-delete-e2e");
  await page.getByTestId("create-profile").click();
  await expect(page.getByRole("row").filter({ hasText: "mock-delete-e2e" }).first()).toBeVisible();
  await page.getByTestId("delete-profile-mock-delete-e2e").click();
  await expect(page.getByRole("row").filter({ hasText: "mock-delete-e2e" })).toHaveCount(0);

  await page.goto("/#/route-bindings");
  await expect(page).toHaveURL(/#\/sessions$/u);
  await page.reload();
  await expect(page.getByRole("heading", { name: "会话管理" })).toBeVisible();

  await page.getByTestId("nav-keys").click();
  await expect(page.getByRole("heading", { name: "调用密钥" })).toBeVisible();
  await expect(page.getByTestId("client-base-url")).toHaveText("http://127.0.0.1:4517/v1");
  await page.getByTestId("copy-client-base-url").click();
  await expect(page.getByText("已复制", { exact: true })).toBeVisible();
  await openCreateDialog(page, "create-key", "key-name");
  await page.getByTestId("key-name").fill("ui-e2e-key");
  await page.getByTestId("create-key").click();
  await expect(page.getByTestId("key-name")).toBeHidden();
  await expect(page.getByTestId("created-token")).toContainText("c2a_");
  const token = (await page.getByTestId("created-token").textContent())?.trim() ?? "";

  await page.getByTestId("nav-runs").click();
  await expect(page.getByRole("heading", { name: "调用记录" })).toBeVisible();
  await openCreateDialog(page, "run-submit", "run-prompt");
  await page.getByTestId("run-profile").click();
  await page.getByRole("option", { name: "mock-ui-e2e" }).click();
  await page.getByTestId("run-prompt").fill("hello dashboard e2e");
  await page.getByTestId("run-submit").click();
  await expect(page.getByRole("cell", { name: "hello dashboard e2e", exact: true })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "hello dashboard e2e" }).getByText("完成")).toBeVisible();
  await expect(page.getByText("mock-ui-inst")).toBeVisible();
  await page.getByRole("button", { name: "查看事件" }).last().click();
  await expect(page.getByTestId("run-events")).toContainText("run.completed");
  const runId = (await page.getByTestId("run-id").last().textContent())?.trim() ?? "";

  await page.getByTestId("nav-overview").click();
  await expect(page.getByRole("heading", { name: "概览" })).toBeVisible();
  await expect(page.getByText("接入进度", { exact: true })).toHaveCount(0);
  await expect(page.getByText("启用模型", { exact: true })).toBeVisible();

  await page.getByTestId("nav-sessions").click();
  await expect(page.getByRole("heading", { name: "会话管理" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "default" }).filter({ hasText: "UI Mock 实例" })).toBeVisible();
  await page.getByRole("button", { name: "重置会话" }).click();
  await expect(page.getByRole("row").filter({ hasText: "default" }).filter({ hasText: "UI Mock 实例" })).toHaveCount(0);

  const events = await request.get(`/api/runs/${runId}/events`, {
    headers: { authorization: `Bearer ${token}` }
  });
  expect(events.ok()).toBeTruthy();
  const eventBody = (await events.json()) as Array<{ type: string }>;
  expect(eventBody.map((event) => event.type)).toContain("run.completed");

  await page.getByTestId("nav-keys").click();
  await page.getByTestId("revoke-key-ui-e2e-key").click();
  await expect(page.getByText("停用")).toBeVisible();
  await page.getByTestId("hard-delete-key-ui-e2e-key").click();
  await expect(page.getByRole("row").filter({ hasText: "ui-e2e-key" })).toHaveCount(0);

  await page.getByTestId("nav-users").click();
  await expect(page.getByRole("heading", { name: "用户" })).toBeVisible();
  await openCreateDialog(page, "create-user", "user-email");
  await page.getByTestId("user-email").fill("ops-e2e@example.com");
  await page.getByTestId("user-password").fill("change-me");
  await page.getByTestId("create-user").click();
  await expect(page.getByText("ops-e2e@example.com")).toBeVisible();
  await page.getByTestId("delete-user-ops-e2e@example.com").click();
  await expect(page.getByText("ops-e2e@example.com")).toHaveCount(0);

  await page.getByTestId("nav-instances").click();
  await page.getByTestId("disable-instance-mock-ui-inst").click();
  await expect(page.getByText("停用")).toBeVisible();
});

async function openCreateDialog(page: Page, actionTestId: string, fieldTestId: string): Promise<void> {
  await expect(page.getByTestId(fieldTestId)).toBeHidden();
  await page.getByTestId(actionTestId).click();
  await expect(page.getByTestId(fieldTestId)).toBeVisible();
}
