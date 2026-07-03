/** Self-check for error-message extraction. Run: npx tsx src/utils/apiError.check.ts */
import { apiError } from "./apiError";

let failures = 0;
const eq = (a: unknown, b: unknown, label: string) => {
  if (a !== b) { failures++; console.error(`FAIL ${label}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); }
};

// Fake axios errors — axios's isAxiosError() only checks the `isAxiosError` flag.
const axiosErr = (over: Record<string, unknown>) => ({ isAxiosError: true, ...over });

// 1. Backend body message (string) wins over everything else.
eq(
  apiError(axiosErr({ response: { status: 400, data: { message: "Email already taken" } } })),
  "Email already taken",
  "backend string message",
);

// 1b. Backend body message (array, e.g. class-validator) → first entry.
eq(
  apiError(axiosErr({ response: { status: 422, data: { message: ["Name is required", "Age must be a number"] } } })),
  "Name is required",
  "backend array message",
);

// 1c. Empty message string/array falls through to the status fallback.
eq(
  apiError(axiosErr({ response: { status: 404, data: { message: "" } } })),
  "Not found.",
  "empty message string falls through",
);

// 2. Known status code, no backend message.
eq(apiError(axiosErr({ response: { status: 401, data: {} } })), "Incorrect credentials. Please try again.", "401 fallback");
eq(apiError(axiosErr({ response: { status: 429, data: {} } })), "Too many attempts. Please wait a moment and try again.", "429 fallback");

// Unknown status code, no message → caller fallback.
eq(apiError(axiosErr({ response: { status: 418, data: {} } }), "Teapot"), "Teapot", "unknown status uses caller fallback");

// 3. No response at all → network issue, regardless of caller fallback.
eq(apiError(axiosErr({})), "Can't reach the server. Check your connection.", "no response = network issue");

// Plain (non-axios) Error, message pattern matching.
eq(apiError(new Error("Network Error")), "Can't reach the server. Check your connection.", "network error message pattern");
eq(apiError(new Error("timeout of 5000ms exceeded")), "The server took too long to respond. Try again.", "timeout error message pattern");
eq(apiError(new Error("Something specific broke")), "Something specific broke", "plain error message passthrough");
eq(apiError(new Error("")), "Something went wrong. Try again.", "empty error message uses default fallback");

// Totally unknown thrown value.
eq(apiError("just a string"), "Something went wrong. Try again.", "non-error thrown value uses default fallback");
eq(apiError(null, "Custom fallback"), "Custom fallback", "null uses caller fallback");

if (failures) throw new Error(`${failures} apiError check(s) failed`);
console.log("apiError: all checks passed");
