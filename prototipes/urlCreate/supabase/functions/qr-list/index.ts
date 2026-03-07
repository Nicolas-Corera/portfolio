// supabase/functions/qr-list/index.ts
// Lista QRs por session_id. Si no encuentra nada, intenta recuperar por IP.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQS  = 30;
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

function getClientIP(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  ).slice(0, 45);
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const url       = new URL(req.url);
  const sessionId = sanitizeUUID(url.searchParams.get("session_id"));

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

  const supabase = createClient(Deno.env.get("DB_URL")!, Deno.env.get("DB_SERVICE_KEY")!);

  // 1. Buscar por session_id (caso normal)
  const { data, error } = await supabase
    .from("qr_codes")
    .select("id, type, text, name, date_label, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("List error:", error);
    return new Response(JSON.stringify({ error: "Error al listar" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // 2. Si no hay resultados, intentar recuperar por IP (fallback para caché borrada)
  if (!data || data.length === 0) {
    const ip = getClientIP(req);
    if (ip !== "unknown") {
      const { data: byIP } = await supabase
        .from("qr_codes")
        .select("id, session_id, type, text, name, date_label, created_at")
        .eq("ip_address", ip)
        .order("created_at", { ascending: false })
        .limit(50);

      if (byIP && byIP.length > 0) {
        // Devolver los QRs y el session_id original para que el cliente lo restaure
        return new Response(
          JSON.stringify({ ok: true, qrs: byIP, recovered_session_id: byIP[0].session_id }),
          { status: 200, headers: { ...CORS, "Content-Type": "application/json" } },
        );
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, qrs: data ?? [] }), {
    status: 200, headers: { ...CORS, "Content-Type": "application/json" },
  });
});
