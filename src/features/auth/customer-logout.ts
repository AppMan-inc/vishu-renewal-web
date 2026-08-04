export type CustomerLogoutCoordinator = {
  isRunning: () => boolean;
  run: () => Promise<void>;
};

export function createCustomerLogoutCoordinator(
  signOutAction: () => Promise<void>,
): CustomerLogoutCoordinator {
  let inFlight: Promise<void> | null = null;

  return {
    isRunning: () => inFlight !== null,
    run: () => {
      if (inFlight) return inFlight;

      const request = Promise.resolve().then(signOutAction);
      const trackedRequest = request.finally(() => {
        if (inFlight === trackedRequest) inFlight = null;
      });
      inFlight = trackedRequest;
      return inFlight;
    },
  };
}
