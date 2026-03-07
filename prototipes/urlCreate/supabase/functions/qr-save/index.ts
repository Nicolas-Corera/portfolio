// supabase/functions/qr-save/index.ts
// Guarda un QR nuevo para una sesión anónima.
// Variables de entorno requeridas (en Supabase Dashboard > Edge Functions > Secrets):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Constantes ────────────────────────────────────────────
const ALLOWED_TYPES = ["url", "text", "wifi", "vcard", "email", "sms", "geo"];
const MAX_TEXT_LEN = 4096;
const MAX_NAME_LEN = 120;
const MAX_LABEL_LEN = 20;
const MAX_PER_SESSION = 50; // máximo de QRs almacenados por sesión
const RATE_WINDOW_MS = 60_000; // ventana de rate limit: 1 minuto
const RATE_MAX_REQS = 10; // máximo 10 guardados por minuto por sesión

// ─── Rate limiter in-memory (por instancia de la función) ──
// Supabase Edge Functions pueden tener múltiples instancias;
// esto limita dentro de cada instancia. Para producción de alta escala
// usar una tabla de Postgres o Redis.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(sessionId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(sessionId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(sessionId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_MAX_REQS) return true;

  entry.count++;
  return false;
}

// ─── Sanitización ──────────────────────────────────────────
function sanitizeString(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  // Quitar caracteres de control (excepto saltos de línea y tab)
  const clean = value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
    .slice(0, maxLen);
  return clean;
}

function sanitizeUUID(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return UUID_RE.test(value.trim()) ? value.trim().toLowerCase() : null;
}

// ─── CORS headers ──────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Handler principal ─────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // ── Parsear body ──────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // ── Validar y sanitizar campos ────────────────────────────
  const sessionId = sanitizeUUID(body.session_id);
  if (!sessionId) {
    return new Response(JSON.stringify({ error: "session_id inválido" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const type = sanitizeString(body.type, 20);
  if (!type || !ALLOWED_TYPES.includes(type)) {
    return new Response(JSON.stringify({ error: "type inválido" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const text = sanitizeString(body.text, MAX_TEXT_LEN);
  if (!text || text.length === 0) {
    return new Response(JSON.stringify({ error: "text requerido" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const name = sanitizeString(body.name ?? "", MAX_NAME_LEN) ?? "";
  const date_label = sanitizeString(body.date_label ?? "", MAX_LABEL_LEN) ?? "";

  // ── Rate limiting ─────────────────────────────────────────
  if (isRateLimited(sessionId)) {
    return new Response(
      JSON.stringify({ error: "Demasiadas solicitudes. Esperá un minuto." }),
      {
        status: 429,
        headers: {
          ...CORS,
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      },
    );
  }

  // ── Conectar a Supabase con service_role (desde .env) ─────
  const supabase = createClient(
    Deno.env.get("DB_URL")!,
    Deno.env.get("DB_SERVICE_KEY")!,
  );

  // ── Verificar límite de QRs por sesión ────────────────────
  const { count, error: countErr } = await supabase
    .from("qr_codes")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId);

  if (countErr) {
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  if ((count ?? 0) >= MAX_PER_SESSION) {
    // Borrar el más viejo para hacer lugar (FIFO)
    const { data: oldest } = await supabase
      .from("qr_codes")
      .select("id")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(1);

    if (oldest && oldest.length > 0) {
      await supabase.from("qr_codes").delete().eq("id", oldest[0].id);
    }
  }

  // ── Insertar ──────────────────────────────────────────────
  const { data, error } = await supabase
    .from("qr_codes")
    .insert({ session_id: sessionId, type, text, name, date_label })
    .select("id, type, text, name, date_label, created_at")
    .single();

  if (error) {
    console.error("Insert error:", error);
    return new Response(JSON.stringify({ error: "Error al guardar" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, qr: data }), {
    status: 201,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
