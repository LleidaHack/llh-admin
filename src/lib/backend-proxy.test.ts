import { afterEach, describe, expect, it, vi } from "vitest";
import { proxyBackend } from "./backend-proxy";

const connectionError = (code: string) =>
  Object.assign(new TypeError("sensitive upstream details"), {
    cause: { code },
  });
const run = (path = "/v1/auth/me", method = "GET") =>
  proxyBackend(`https://backend.example${path}`, path, { method });
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("backend proxy transport recovery", () => {
  it("retries login only when connection setup failed before transmission", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(connectionError("ECONNREFUSED"))
      .mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetch);
    expect((await run("/v1/auth/login")).status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("recovers a stale socket on a known read", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(connectionError("UND_ERR_SOCKET"))
      .mockResolvedValueOnce(Response.json({ id: 5 }));
    vi.stubGlobal("fetch", fetch);
    const response = await run("/v1/event/5/hackers_participants_list");
    expect(await response.json()).toEqual({ id: 5 });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it.each([
    ["/v1/auth/login", "GET"],
    ["/v1/event/5/resend-accepted-mails", "GET"],
    ["/v1/event/5", "PUT"],
  ])(
    "does not replay a possibly processed operation: %s %s",
    async (path, method) => {
      const log = vi.spyOn(console, "warn").mockImplementation(() => {});
      const fetch = vi.fn().mockRejectedValue(connectionError("ECONNRESET"));
      vi.stubGlobal("fetch", fetch);
      const response = await run(path, method);
      expect(response.status).toBe(502);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(log.mock.calls)).not.toContain(
        "sensitive upstream details",
      );
      expect((await response.json()).request_id).toBe(
        response.headers.get("x-request-id"),
      );
    },
  );
  it("limits retries and preserves backend HTTP responses", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetch = vi.fn().mockRejectedValue(connectionError("EAI_AGAIN"));
    vi.stubGlobal("fetch", fetch);
    expect((await run()).status).toBe(502);
    expect(fetch).toHaveBeenCalledTimes(2);
    fetch
      .mockReset()
      .mockResolvedValue(Response.json({ detail: "Denied" }, { status: 401 }));
    const response = await run();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ detail: "Denied" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("returns valid empty responses and handles a failed response body", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );
    expect((await run()).status).toBe(204);
    const broken = new Response("partial");
    vi.spyOn(broken, "arrayBuffer").mockRejectedValue(
      new Error("sensitive body"),
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(broken));
    expect((await run()).status).toBe(502);
  });
});
