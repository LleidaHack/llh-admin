import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ViewerContext } from "@/lib/viewer";
import type { Profile } from "@/lib/api";
import type { UserProfile } from "./user-profile";

vi.mock("@/components/ui/dialog", () => {
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement("div", null, children);
  return Object.fromEntries(
    [
      "Dialog",
      "DialogContent",
      "DialogHeader",
      "DialogTitle",
      "DialogDescription",
      "DialogFooter",
    ].map((name) => [name, Wrapper]),
  );
});
import { UserPasswordReset } from "./user-password-reset";

const user = {
  id: 42,
  name: "Participant de prova",
  nickname: "prova",
  email: "test+participant@example.org",
  type: "hacker",
  is_verified: true,
} as UserProfile;
function render(
  role: Profile["access_role"],
  overrides: Partial<UserProfile> = {},
) {
  return renderToStaticMarkup(
    createElement(
      ViewerContext.Provider,
      {
        value: {
          id: 1,
          name: "Admin",
          email: "admin@example.org",
          type: "lleida_hacker",
          access_role: role,
        },
      },
      createElement(UserPasswordReset, { user: { ...user, ...overrides } }),
    ),
  );
}

describe("password recovery in user management", () => {
  it("allows admins and superadmins to request recovery for verified accounts", () => {
    for (const role of ["admin", "superadmin"] as const) {
      const html = render(role);
      expect(html).toContain("Restablir contrasenya");
      expect(html).toContain(user.email);
      expect(html).not.toContain('disabled=""');
    }
  });
  it("does not offer recovery to viewers without panel access", () => {
    for (const role of ["hacker", "mentor", "lleidahacker"] as const)
      expect(render(role)).toBe("");
  });
  it("explains why recovery cannot be sent to an unverified or missing email", () => {
    for (const verified of [false, undefined]) {
      const html = render("admin", { is_verified: verified });
      expect(html).toContain('disabled=""');
      expect(html).toContain("Cal verificar el compte");
    }
    const html = render("admin", { email: "" });
    expect(html).toContain('disabled=""');
    expect(html).toContain("no té cap correu electrònic");
  });
});
