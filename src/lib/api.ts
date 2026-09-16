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
const base = import.meta.env.VITE_API_BASE || "/api";
let accessToken = sessionStorage.getItem("lh-access") || "";
export function clearSession() {
  accessToken = "";
  sessionStorage.removeItem("lh-access");
}
function saveToken(token: string) {
  accessToken = token;
  sessionStorage.setItem("lh-access", token);
}
export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
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
    throw new ApiError(
      response.status,
      message,
      (data as { code?: string })?.code,
    );
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

export async function localVerificationAvailable() {
  if (!["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname))
    return false;
  try {
    const result = await request<{ enabled: boolean }>(
      "/v1/auth/local-verification",
    );
    return result.enabled === true;
  } catch {
    return false;
  }
}
export async function verifyLocalAccount(email: string) {
  return request<{ success: boolean }>("/v1/auth/local-verification", "POST", {
    email,
  });
}
