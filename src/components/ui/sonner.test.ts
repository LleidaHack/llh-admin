import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Toaster } from "./sonner";

vi.mock("sonner", () => ({
  Toaster: ({ theme, position }: { theme: string; position?: string }) =>
    createElement("aside", {
      "data-theme": theme,
      "data-position": position,
    }),
}));

describe("notification theme", () => {
  it("defaults to the panel's light theme without a theme provider", () => {
    const markup = renderToStaticMarkup(createElement(Toaster));
    expect(markup).toContain('data-theme="light"');
  });

  it("preserves explicit theme overrides", () => {
    const markup = renderToStaticMarkup(
      createElement(Toaster, { theme: "dark" }),
    );
    expect(markup).toContain('data-theme="dark"');
  });

  it("forwards notification placement independently of the default theme", () => {
    const markup = renderToStaticMarkup(
      createElement(Toaster, { position: "bottom-right", richColors: true }),
    );
    expect(markup).toContain('data-theme="light"');
    expect(markup).toContain('data-position="bottom-right"');
  });
});
