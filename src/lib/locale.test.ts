import { describe, expect, it } from "vitest";
import { serverError, accountType } from "./locale";
import { dateLabel } from "./events";

describe("Catalan interface", () => {
  it("translates a known backend error", () => {
    expect(serverError("Incorrect password", 401)).toBe(
      "La contrasenya és incorrecta.",
    );
  });
  it("does not display untranslated backend internals", () => {
    const message = serverError("Unexpected database traceback", 500);
    expect(message).toContain("No s'ha pogut completar");
    expect(message).not.toContain("traceback");
  });
  it("translates validation fields without changing API field names", () => {
    expect(
      serverError(
        [
          {
            loc: ["body", "max_participants"],
            type: "int_parsing",
            msg: "Input should be a valid integer",
          },
        ],
        422,
      ),
    ).toBe("Places: Introdueix un nombre enter.");
  });
  it("handles unknown validation fields with a Catalan fallback", () => {
    expect(
      serverError(
        [
          {
            loc: ["body", "future_field"],
            type: "future_type",
            msg: "Unknown English message",
          },
        ],
        422,
      ),
    ).toBe("Camp: El valor no és vàlid.");
  });
  it("formats month names in Catalan", () => {
    expect(dateLabel("2026-01-21T12:00:00")).toContain("gen.");
  });
  it("uses Catalan account labels and fallback", () => {
    expect(accountType("lleida_hacker")).toBe("Organitzador");
    expect(accountType("unknown")).toBe("Compte");
  });
});
