import { serverError } from "./locale";
export type EventRecord = {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  archived: boolean;
  is_open: boolean;
  price: number;
  max_participants: number;
  max_group_size: number;
  max_sponsors: number;
};
export type Profile = { id: number; name: string; email: string; type: string };
export type Company = {
  id: number;
  name: string;
  description: string;
  website: string;
  tier: number;
  address: string;
  linkdin: string;
  telephone: string;
};
export type Participant = {
  id: number;
  name: string;
  email: string;
  status: string;
  nickname: string;
  // Optional application fields the backend may include in the participants list.
  description?: string | null;
  cv?: string | null;
};
// Full hacker profile from GET /v1/hacker/{hackerId} (HackerGetAll). All optional
// because visibility depends on the caller's permissions and the account's data.
export type HackerProfile = {
  id?: number;
  name?: string;
  nickname?: string;
  email?: string;
  telephone?: string;
  cv?: string | null;
  github?: string | null;
  linkedin?: string | null;
  studies?: string | null;
  study_center?: string | null;
  location?: string | null;
  how_did_you_meet_us?: string | null;
  food_restrictions?: string | null;
  shirt_size?: string | null;
  description?: string | null;
};
export type Team = {
  id: number;
  name: string;
  description: string;
  members: { name: string; nickname: string }[];
};
export type Meal = {
  id: number;
  name: string;
  description: string;
  event_id: number;
};
const base = process.env.NEXT_PUBLIC_API_BASE || "/api";
const sessionKey = `lh-access:${process.env.NEXT_PUBLIC_API_ORIGIN || base}`;
// sessionStorage is browser-only; guard so this module is safe to import on the server.
let accessToken =
  typeof sessionStorage !== "undefined"
    ? sessionStorage.getItem(sessionKey) || ""
    : "";
export function clearSession() {
  accessToken = "";
  sessionStorage.removeItem(sessionKey);
}
function saveToken(token: string) {
  accessToken = token;
  sessionStorage.setItem(sessionKey, token);
}
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  authorization?: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(authorization || accessToken
          ? { Authorization: authorization || `Bearer ${accessToken}` }
          : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      "No es pot connectar amb el servidor. Comprova que estigui en marxa.",
    );
  }
  const raw = await response.text();
  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    if (response.status === 401 && !authorization) {
      clearSession();
      window.dispatchEvent(new Event("session-expired"));
    }
    const detail =
      (data as { detail?: unknown; message?: unknown })?.detail ??
      (data as { message?: unknown })?.message;
    const message = serverError(detail, response.status);
    throw new ApiError(response.status, message);
  }
  if (data === null && raw)
    throw new ApiError(
      response.status,
      "El servidor ha retornat una resposta no vàlida.",
    );
  return data as T;
}
export async function login(email: string, password: string) {
  const bytes = new TextEncoder().encode(`${email}:${password}`);
  const basic = btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
  const tokens = await request<{ access_token: string }>(
    "/v1/auth/login",
    "GET",
    undefined,
    `Basic ${basic}`,
  );
  saveToken(tokens.access_token);
  try {
    const user = await request<Profile>("/v1/auth/me");
    if (user.type !== "lleida_hacker")
      throw new Error("Aquest panell requereix un compte d'organitzador.");
    return user;
  } catch (error) {
    clearSession();
    throw error;
  }
}
export const hasSession = () => Boolean(accessToken);
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "S'ha produït un error inesperat.";
