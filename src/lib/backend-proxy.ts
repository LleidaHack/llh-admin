import { randomUUID } from "node:crypto";

const CONNECT_FAILURES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
]);
const TRANSIENT_FAILURES = new Set([
  ...CONNECT_FAILURES,
  "ECONNRESET",
  "EPIPE",
  "UND_ERR_SOCKET",
]);

// Some legacy GET routes send email, rotate tokens or mutate registrations.
// Retry only known reads once a request might already have reached the backend.
function isReadOnly(method: string, path: string) {
  return (
    method === "GET" &&
    [
      /^\/v1\/auth\/me\/?$/,
      /^\/v1\/(user|hacker|company)\/(all|\d+)\/?$/,
      /^\/v1\/event\/(all|get_hackeps|\d+)\/?$/,
      /^\/v1\/event\/\d+\/(statistics|statistics_participants|hackers_participants_list|hackers_participants_grouped_list|groups|sponsors|get_sizes|food_restrictions|get_approved_hackers|get_approved_hackers_mails|count_unregistered_hackers|status)\/?$/,
      /^\/v1\/event\/\d+\/registration\/\d+\/?$/,
      /^\/v1\/operations\/\d+\/(public|config|audit|scanner|mentors)\/?$/,
    ].some((pattern) => pattern.test(path))
  );
}

function failureCode(error: unknown): string {
  if (!error || typeof error !== "object") return "UNKNOWN";
  const value = error as { code?: unknown; name?: unknown; cause?: unknown };
  if (typeof value.code === "string" && /^[A-Z_]+$/.test(value.code))
    return value.code;
  if (value.cause && value.cause !== error) return failureCode(value.cause);
  return value.name === "TimeoutError" ? "TIMEOUT" : "UNKNOWN";
}

export async function proxyBackend(
  url: string,
  path: string,
  init: RequestInit,
): Promise<Response> {
  const requestId = randomUUID();
  const started = Date.now();
  const method = init.method || "GET";
  // One shared budget includes headers, body consumption and the retry.
  const signal = AbortSignal.timeout(25_000);
  for (let attempt = 1; attempt <= 2; attempt++) {
    let response: Response | undefined;
    try {
      response = await fetch(url, { ...init, cache: "no-store", signal });
      const body = await response.arrayBuffer();
      const headers = new Headers({
        "x-request-id": requestId,
        "cache-control": "no-store",
      });
      const contentType = response.headers.get("content-type");
      if (contentType) headers.set("content-type", contentType);
      return new Response(
        [204, 205, 304].includes(response.status) ? null : body,
        {
          status: response.status,
          headers,
        },
      );
    } catch (error) {
      const code = failureCode(error);
      const retry =
        attempt === 1 &&
        !signal.aborted &&
        ((!response && CONNECT_FAILURES.has(code)) ||
          (isReadOnly(method, path) && TRANSIENT_FAILURES.has(code)));
      // Never log credentials, bodies, full URLs, queries or exception messages.
      console.warn("Backend proxy transport failure", {
        requestId,
        method,
        code,
        attempt,
        retry,
        elapsedMs: Date.now() - started,
      });
      if (retry) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        continue;
      }
      return Response.json(
        { detail: "backend unreachable", request_id: requestId },
        {
          status: signal.aborted ? 504 : 502,
          headers: { "x-request-id": requestId, "cache-control": "no-store" },
        },
      );
    }
  }
  throw new Error("Backend proxy retry budget exhausted");
}
