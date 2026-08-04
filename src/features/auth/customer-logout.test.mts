import assert from "node:assert/strict";
import test from "node:test";
import { createCustomerLogoutCoordinator } from "./customer-logout.ts";

test("logout coordinator invokes the shared sign-out action only once while pending", async () => {
  let callCount = 0;
  let completeSignOut: (() => void) | undefined;
  const coordinator = createCustomerLogoutCoordinator(
    () => new Promise<void>((resolve) => {
      callCount += 1;
      completeSignOut = resolve;
    }),
  );

  const first = coordinator.run();
  const second = coordinator.run();
  await Promise.resolve();

  assert.equal(first, second);
  assert.equal(callCount, 1);
  assert.equal(coordinator.isRunning(), true);
  completeSignOut?.();
  await Promise.all([first, second]);
  assert.equal(coordinator.isRunning(), false);
});

test("logout coordinator releases its lock after failure so the user can retry", async () => {
  let callCount = 0;
  const coordinator = createCustomerLogoutCoordinator(async () => {
    callCount += 1;
    if (callCount === 1) throw new Error("network unavailable");
  });

  await assert.rejects(coordinator.run(), /network unavailable/);
  assert.equal(coordinator.isRunning(), false);
  await coordinator.run();
  assert.equal(callCount, 2);
});
