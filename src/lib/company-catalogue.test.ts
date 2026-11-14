import { describe, expect, it, vi } from "vitest";
import type { Company } from "./api";
import {
  createCompanyCatalogueLoader,
  needsCompanyCatalogue,
} from "./company-catalogue";

const companies: Company[] = [
  {
    id: 1,
    name: "Empresa",
    description: "",
    website: "",
    tier: 0,
    address: "",
    linkdin: "",
    telephone: "",
  },
];

describe("on-demand company catalogue", () => {
  it("does not request companies for the initial status or unrelated sections", async () => {
    const fetchCompanies = vi.fn().mockResolvedValue(companies);
    const load = createCompanyCatalogueLoader(fetchCompanies);
    for (const section of ["status", "participants", "teams", "settings"]) {
      if (needsCompanyCatalogue(section)) await load();
    }
    expect(fetchCompanies).not.toHaveBeenCalled();
  });

  it("shares the catalogue between sponsors and company access", async () => {
    const fetchCompanies = vi.fn().mockResolvedValue(companies);
    const load = createCompanyCatalogueLoader(fetchCompanies);
    for (const section of ["sponsors", "company-portal", "sponsors"]) {
      expect(needsCompanyCatalogue(section)).toBe(true);
      if (needsCompanyCatalogue(section)) expect(await load()).toBe(companies);
    }
    expect(fetchCompanies).toHaveBeenCalledOnce();
  });

  it("deduplicates concurrent loads including refreshes", async () => {
    let resolveResponse!: (value: Company[]) => void;
    const response = new Promise<Company[]>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchCompanies = vi.fn(() => response);
    const load = createCompanyCatalogueLoader(fetchCompanies);
    const initial = load();
    expect(load()).toBe(initial);
    expect(load(true)).toBe(initial);
    resolveResponse(companies);
    await expect(initial).resolves.toBe(companies);
    expect(fetchCompanies).toHaveBeenCalledOnce();
  });

  it("caches an empty catalogue", async () => {
    const fetchCompanies = vi.fn().mockResolvedValue([]);
    const load = createCompanyCatalogueLoader(fetchCompanies);
    await expect(load()).resolves.toEqual([]);
    await expect(load()).resolves.toEqual([]);
    expect(fetchCompanies).toHaveBeenCalledOnce();
  });

  it("retries a failed initial request", async () => {
    const fetchCompanies = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce(companies);
    const load = createCompanyCatalogueLoader(fetchCompanies);
    await expect(load()).rejects.toThrow("Network unavailable");
    await expect(load()).resolves.toBe(companies);
    expect(fetchCompanies).toHaveBeenCalledTimes(2);
  });

  it("replaces cached results on explicit refresh", async () => {
    const updated = [{ ...companies[0], name: "Empresa actualitzada" }];
    const fetchCompanies = vi
      .fn()
      .mockResolvedValueOnce(companies)
      .mockResolvedValueOnce(updated);
    const load = createCompanyCatalogueLoader(fetchCompanies);
    await load();
    await expect(load(true)).resolves.toBe(updated);
    await expect(load()).resolves.toBe(updated);
    expect(fetchCompanies).toHaveBeenCalledTimes(2);
  });

  it("keeps the previous result after a failed refresh and permits retry", async () => {
    const fetchCompanies = vi
      .fn()
      .mockResolvedValueOnce(companies)
      .mockRejectedValueOnce(new Error("Refresh failed"))
      .mockResolvedValueOnce([]);
    const load = createCompanyCatalogueLoader(fetchCompanies);
    await load();
    await expect(load(true)).rejects.toThrow("Refresh failed");
    await expect(load()).resolves.toBe(companies);
    await expect(load(true)).resolves.toEqual([]);
    expect(fetchCompanies).toHaveBeenCalledTimes(3);
  });

  it("does not share cached data across mounted views or sessions", async () => {
    const fetchCompanies = vi.fn().mockResolvedValue(companies);
    const firstView = createCompanyCatalogueLoader(fetchCompanies);
    const nextView = createCompanyCatalogueLoader(fetchCompanies);
    await firstView();
    await nextView();
    expect(fetchCompanies).toHaveBeenCalledTimes(2);
  });
});
