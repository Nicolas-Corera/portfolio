// supabase/functions/qr-delete/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQS  = 20;
const rateLimitMap   = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_MAX_REQS) return true;
  entry.count++;
  return false;
}

function sanitizeUUID(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return UUID_RE.test(value.trim()) ? value.trim().toLowerCase() : null;
}

function sanitizeId(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "DELETE") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const sessionId = sanitizeUUID(body.session_id);
  if (!sessionId) {
    return new Response(JSON.stringify({ error: "session_id inválido" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  if (isRateLimited(sessionId)) {
    return new Response(JSON.stringify({ error: "Demasiadas solicitudes." }), {
      status: 429, headers: { ...CORS, "Content-Type": "application/json", "Retry-After": "60" },
    });
  }

  const recordId = sanitizeId(body.id);
  const supabase = createClient(Deno.env.get("DB_URL")!, Deno.env.get("DB_SERVICE_KEY")!);

  let query = supabase.from("qr_codes").delete().eq("session_id", sessionId);
  if (recordId !== null) query = query.eq("id", recordId);

  const { error } = await query;
  if (error) {
    console.error("Delete error:", error);
    return new Response(JSON.stringify({ error: "Error al eliminar" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { ...CORS, "Content-Type": "application/json" },
  });
});
