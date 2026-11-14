import { describe, expect, it, vi } from "vitest";
import { lookupUser, userLookupPaths } from "./user-lookup";

describe("user account lookup", () => {
  it("encodes and trims email and nickname without changing them", () => {
    expect(userLookupPaths(" person+test@example.com ", "email")).toEqual([
      "/v1/user/email/person%2Btest%40example.com",
    ]);
    expect(userLookupPaths(" name/alias ", "nickname")).toEqual([
      "/v1/user/nickname/name%2Falias",
    ]);
  });

  it.each(["34 600000001", "+34 600 000 001", "0034 600000001", "600-000-001"])(
    "tries common Spanish storage formats for %s",
    (phone) => {
      const paths = userLookupPaths(phone, "phone");
      expect(paths).toEqual(
        expect.arrayContaining([
          "/v1/user/phone/600000001",
          "/v1/user/phone/34600000001",
          "/v1/user/phone/%2B34600000001",
          "/v1/user/phone/0034600000001",
        ]),
      );
      expect(new Set(paths).size).toBe(paths.length);
    },
  );

  it("preserves foreign country prefixes", () => {
    const paths = userLookupPaths("+44 7700 900123", "phone");
    expect(paths).toContain("/v1/user/phone/%2B447700900123");
    expect(paths).not.toContain("/v1/user/phone/7700900123");
  });

  it.each(["", "123", "not a phone", "600000001@example.com"])(
    "rejects invalid phones without a request: %s",
    async (phone) => {
      const fetchUser = vi.fn();
      await expect(lookupUser(phone, "phone", fetchUser)).rejects.toThrow();
      expect(fetchUser).not.toHaveBeenCalled();
    },
  );

  it("only falls back after not found and stops at the first match", async () => {
    const user = { nickname: "participant", email: "person@example.com" };
    const fetchUser = vi
      .fn()
      .mockRejectedValueOnce({ status: 404 })
      .mockResolvedValueOnce(user);
    expect(await lookupUser("34 600000001", "phone", fetchUser)).toBe(user);
    expect(fetchUser).toHaveBeenCalledTimes(2);
  });

  it.each([401, 403, 500])(
    "does not retry errors with status %s",
    async (status) => {
      const error = { status };
      const fetchUser = vi.fn().mockRejectedValue(error);
      await expect(lookupUser("34 600000001", "phone", fetchUser)).rejects.toBe(
        error,
      );
      expect(fetchUser).toHaveBeenCalledTimes(1);
    },
  );

  it("reports no match after exhausting phone variants", async () => {
    const error = { status: 404 };
    const fetchUser = vi.fn().mockRejectedValue(error);
    await expect(lookupUser("600000001", "phone", fetchUser)).rejects.toBe(
      error,
    );
    expect(fetchUser).toHaveBeenCalledTimes(
      userLookupPaths("600000001", "phone").length,
    );
  });
});
