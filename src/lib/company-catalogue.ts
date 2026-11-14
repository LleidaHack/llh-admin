import type { Company } from "./api";

export function needsCompanyCatalogue(section: string) {
  return section === "sponsors" || section === "company-portal";
}

export function createCompanyCatalogueLoader(
  fetchCompanies: () => Promise<Company[]>,
) {
  let cached: Company[] | undefined;
  let pending: Promise<Company[]> | undefined;

  return (refresh = false): Promise<Company[]> => {
    if (pending) return pending;
    if (!refresh && cached) return Promise.resolve(cached);

    pending = fetchCompanies()
      .then((companies) => {
        cached = companies;
        return companies;
      })
      .finally(() => {
        pending = undefined;
      });
    return pending;
  };
}
