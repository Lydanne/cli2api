import { describe, expect, it } from "vitest";
import { createSetupProgressState, summarizeOverview, type SetupProgressStep } from "./overview";

describe("summarizeOverview", () => {
  it("builds operational counts from profiles, keys, and runs", () => {
    expect(
      summarizeOverview({
        profiles: [
          { id: "mock", enabled: true, type: "mock" },
          { id: "codex", enabled: false, type: "codex" }
        ],
        apiKeys: [{ enabled: 1 }, { enabled: 0 }],
        runs: [{ status: "completed" }, { status: "failed" }, { status: "running" }]
      })
    ).toEqual({
      enabledProfiles: 1,
      activeApiKeys: 1,
      runningRuns: 1,
      failedRuns: 1,
      completedRuns: 1
    });
  });
});

describe("createSetupProgressState", () => {
  const incompleteSteps: SetupProgressStep[] = [
    { key: "account", label: "认证上游账号", count: 1, done: true, route: "accounts" },
    { key: "instance", label: "创建执行实例", count: 0, done: false, route: "instances" },
    { key: "run", label: "发起测试调用", count: 0, done: false, route: "runs" }
  ];

  it("keeps setup progress visible and routes to the first incomplete step", () => {
    expect(createSetupProgressState(incompleteSteps)).toEqual({
      steps: incompleteSteps,
      nextStep: incompleteSteps[1],
      completedSteps: 1,
      progressPercent: "33.33333333333333%",
      visible: true
    });
  });

  it("hides setup progress after every setup step is done", () => {
    const completedSteps = incompleteSteps.map((step) => ({ ...step, count: 1, done: true }));

    expect(createSetupProgressState(completedSteps)).toEqual({
      steps: completedSteps,
      nextStep: undefined,
      completedSteps: 3,
      progressPercent: "100%",
      visible: false
    });
  });
});
