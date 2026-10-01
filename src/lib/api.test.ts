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
    await expect(request("/v1/event/all")).rejects.toThrow(
      "La sessió ha caducat",
    );
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
      "Nom: Aquest camp és obligatori.",
    );
  });
  it("rejects participant accounts from the organizer panel", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token" })),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ type: "hacker" })));
    await expect(login("hacker@example.test", "password")).rejects.toThrow(
      "organitzador",
    );
    expect(hasSession()).toBe(false);
  });
});

describe("legacy permission errors", () => {
  async function organizerLogin() {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "valid-token" })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1, type: "lleida_hacker" })),
      );
    await login("organizer@example.test", "password");
  }
  it("keeps a valid session when statistics denies admin permissions", async () => {
    await organizerLogin();
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "Not authorized" }), {
          status: 401,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1, type: "lleida_hacker" })),
      );
    await expect(
      request("/v1/event/1/count_unregistered_hackers/"),
    ).rejects.toMatchObject({ status: 403 });
    expect(hasSession()).toBe(true);
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });
  it("expires a genuinely rejected token", async () => {
    await organizerLogin();
    vi.mocked(fetch).mockImplementation(
      async () => new Response("{}", { status: 401 }),
    );
    await expect(
      request("/v1/event/1/count_unregistered_hackers/"),
    ).rejects.toMatchObject({ status: 401 });
    expect(hasSession()).toBe(false);
    expect(window.dispatchEvent).toHaveBeenCalledOnce();
  });
  it("does not log out on a failed identity check", async () => {
    await organizerLogin();
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockRejectedValueOnce(new TypeError("Network error"));
    await expect(
      request("/v1/event/1/count_unregistered_hackers/"),
    ).rejects.toBeInstanceOf(Error);
    expect(hasSession()).toBe(true);
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });
});

describe("organizer participant profiles", () => {
  it("uses event registration fields, including explicit absence of a CV", async () => {
    const { loadParticipantProfile } = await import("./api");
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ cv: null, study_center: "UdL" })),
    );
    expect(await loadParticipantProfile(10, 2)).toEqual({
      cv: null,
      study_center: "UdL",
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/event/10/registration/2"),
      expect.anything(),
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("supports backends without the registration endpoint", async () => {
    const { loadParticipantProfile } = await import("./api");
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("{}", { status: 404 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ cv: "cv.pdf", study_center: "UPC" })),
      );
    expect(await loadParticipantProfile(10, 2)).toEqual({
      cv: "cv.pdf",
      study_center: "UPC",
    });
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain("/v1/hacker/2");
  });
  it("does not mask permission failures or contact admin-only endpoints", async () => {
    const { loadParticipantProfile } = await import("./api");
    vi.mocked(fetch).mockResolvedValueOnce(new Response("{}", { status: 403 }));
    await expect(loadParticipantProfile(10, 2)).rejects.toMatchObject({
      status: 403,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
