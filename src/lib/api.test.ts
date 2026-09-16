import { beforeEach, describe, expect, it, vi } from "vitest";
const storage = new Map<string, string>();
vi.stubGlobal("sessionStorage", {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, v),
  removeItem: (k: string) => storage.delete(k),
});
vi.stubGlobal("window", { dispatchEvent: vi.fn() });
const { request, login, hasSession, clearSession } = await import("./api");
beforeEach(() => {
  clearSession();
  vi.stubGlobal("fetch", vi.fn());
  vi.mocked(window.dispatchEvent).mockClear();
});
describe("API session", () => {
  it("logs in using HTTP Basic and sends subsequent Bearer requests", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "local-token" })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1, type: "lleida_hacker" })),
      );
    await login("test@example.test", "password");
    expect(vi.mocked(fetch).mock.calls[0][1]?.headers).toMatchObject({
      Authorization: `Basic ${btoa("test@example.test:password")}`,
    });
    expect(vi.mocked(fetch).mock.calls[1][1]?.headers).toMatchObject({
      Authorization: "Bearer local-token",
    });
    expect(hasSession()).toBe(true);
  });
  it("clears session and signals expiry on 401", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ detail: "Expired" }), { status: 401 }),
    );
    await expect(request("/v1/event/all")).rejects.toThrow("Expired");
    expect(hasSession()).toBe(false);
    expect(window.dispatchEvent).toHaveBeenCalledOnce();
  });
  it("preserves backend field validation details", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: [{ loc: ["body", "name"], msg: "Field required" }],
        }),
        { status: 422 },
      ),
    );
    await expect(request("/v1/event/", "POST", {})).rejects.toThrow(
      "name: Field required",
    );
  });
  it("rejects participant accounts from the organizer panel", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token" })),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ type: "hacker" })));
    await expect(login("hacker@example.test", "password")).rejects.toThrow(
      "organizador",
    );
    expect(hasSession()).toBe(false);
  });
});
