/* global chrome */

/**
 * Runs an interactive MV3 web auth flow and resolves with the URL Chrome
 * intercepted. Shared by every provider the popup offers, because the three ways
 * this can fail — no identity API, an interrupted window, a window closed before
 * the redirect — are properties of `chrome.identity`, not of any one provider.
 *
 * `providerLabel` only names the provider in the surfaced copy, so each caller
 * reads naturally without each re-implementing the same error handling.
 */
export function launchWebAuthFlow(
  url: string,
  providerLabel: string,
): Promise<string> {
  // Rejected rather than thrown, so every failure of this function is a rejection
  // regardless of which one it is. A synchronous throw from a Promise-returning
  // function escapes `.catch()`, which would make the one failure that needs no
  // user interaction the only one a caller can miss.
  if (!chrome.identity?.launchWebAuthFlow) {
    return Promise.reject(
      new Error(
        `${providerLabel} sign-in is unavailable because the Chrome identity API is not accessible.`,
      ),
    );
  }

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      {
        interactive: true,
        url,
      },
      (responseUrl) => {
        const runtimeError = chrome.runtime.lastError;

        if (runtimeError) {
          reject(
            new Error(
              runtimeError.message || `${providerLabel} sign-in was interrupted.`,
            ),
          );
          return;
        }

        // No response URL means the user closed the window before the flow
        // reached its redirect destination, which is an abandoned attempt rather
        // than a backend or configuration failure.
        if (!responseUrl) {
          reject(
            new Error(`${providerLabel} sign-in was cancelled before completion.`),
          );
          return;
        }

        resolve(responseUrl);
      },
    );
  });
}
