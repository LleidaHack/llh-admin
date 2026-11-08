import { proxyBackend } from "@/lib/backend-proxy";
import { type NextRequest } from "next/server";

// Server-side proxy for the LleidaHack backend. Replaces a next.config rewrite
// because rewrites drop the trailing slash from the captured path, and the
// backend's FastAPI routes require it (e.g. POST /v1/event/). A dropped slash
// makes the backend 307-redirect to its own origin, which then fails CORS in the
// browser ("No es pot connectar amb el servidor"). Proxying here keeps the exact
// path, forwards the method/body/auth, and never leaks a cross-origin redirect.
const target = process.env.API_TARGET || "http://127.0.0.1:8000";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname.replace(/^\/api/, "");
  const url = `${target}${path}${request.nextUrl.search}`;

  const headers = new Headers();
  const auth = request.headers.get("authorization");
  if (auth) headers.set("authorization", auth);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const method = request.method;
  const body =
    method === "GET" || method === "HEAD" ? undefined : await request.text();

  return proxyBackend(url, path, {
    method,
    headers,
    body: body && body.length ? body : undefined,
    redirect: "manual",
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
