export type UserLookupKind = "email" | "phone" | "nickname";

export function userLookupPaths(value: string, kind: UserLookupKind) {
  const raw = value.trim();
  if (!raw) return [];
  let values = [raw];
  if (kind === "phone") {
    if (!/^\+?[\d\s().-]+$/.test(raw)) return [];
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 17) return [];
    const international = digits.startsWith("00") ? digits.slice(2) : digits;
    const spanish = /^[6789]\d{8}$/.test(international)
      ? international
      : /^34[6789]\d{8}$/.test(international)
        ? international.slice(2)
        : null;
    values = [raw, digits, `+${international}`, international];
    if (spanish)
      values.push(spanish, `34${spanish}`, `+34${spanish}`, `0034${spanish}`);
  }
  return [...new Set(values)].map(
    (candidate) => `/v1/user/${kind}/${encodeURIComponent(candidate)}`,
  );
}

export async function lookupUser<T>(
  value: string,
  kind: UserLookupKind,
  fetchUser: (path: string) => Promise<T>,
) {
  const paths = userLookupPaths(value, kind);
  if (!paths.length) throw new Error("Introdueix un valor vàlid per cercar.");
  for (const [index, path] of paths.entries()) {
    try {
      return await fetchUser(path);
    } catch (error) {
      if (
        index === paths.length - 1 ||
        !(
          error &&
          typeof error === "object" &&
          "status" in error &&
          error.status === 404
        )
      )
        throw error;
    }
  }
  throw new Error("No s’ha trobat cap compte.");
}
