import { describe, expect, it, vi } from "vitest";
import { createSequentialMailBatch } from "./mail-batch";
import { ApiError } from "./api";

describe("sequential mail batch", () => {
  it("identifies a rejected 90th request without replaying it", async () => {
    const recipients = Array.from({ length: 143 }, (_, index) => ({
      name: `User ${index + 1}`,
    }));
    const send = vi.fn(async ({ name }) => {
      if (name === "User 90") throw new ApiError(429, "Massa peticions.");
    });
    const run = createSequentialMailBatch(recipients, send);
    await expect(run(vi.fn())).rejects.toThrow(/89 de 143.*User 90.*HTTP 429/);
    expect(send).toHaveBeenCalledTimes(90);
  });
  it("processes all 38 recipients sequentially and reports progress", async () => {
    const recipients = Array.from({ length: 38 }, (_, id) => ({
      name: `User ${id}`,
    }));
    let active = 0;
    const send = vi.fn(async () => {
      expect(++active).toBe(1);
      await Promise.resolve();
      active--;
    });
    const progress = vi.fn();
    const run = createSequentialMailBatch(recipients, send);
    await Promise.all([run(progress), run(progress)]);
    await run(progress);
    expect(send).toHaveBeenCalledTimes(38);
    expect(progress).toHaveBeenLastCalledWith(38, 38);
  });

  it("stops at an ambiguous failure without replaying or sending remaining recipients", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("504"));
    const run = createSequentialMailBatch(
      [{ name: "A" }, { name: "B" }, { name: "C" }],
      send,
    );
    await expect(run(vi.fn())).rejects.toThrow("1 de 3");
    await expect(run(vi.fn())).rejects.toThrow("B");
    expect(send).toHaveBeenCalledTimes(2);
  });
});
