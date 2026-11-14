import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

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

import { ConfirmDialog } from "./shared";

describe("destructive confirmation", () => {
  it("requires the account alias before enabling permanent deletion", () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        title: "Eliminar compte",
        description: "No es pot desfer.",
        confirmationText: "participant",
        confirmLabel: "Eliminar definitivament",
        onConfirm: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    expect(html).toContain("participant");
    expect(html).toMatch(
      /<button[^>]*disabled=""[^>]*>Eliminar definitivament<\/button>/,
    );
    expect(html).toContain("Cancel·lar");
    expect(html).toContain('autoComplete="off"');
  });

  it("preserves existing confirmations without a required phrase", () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        title: "Confirmar",
        description: "Operació existent",
        onConfirm: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    expect(html).not.toContain("disabled=");
    expect(html).not.toContain("<input");
  });
});
