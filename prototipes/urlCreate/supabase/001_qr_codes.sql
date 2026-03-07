-- ============================================================
-- QRFT — tabla qr_codes
-- Sin autenticación: se usa session_id anónimo (UUID generado
-- en el cliente y guardado en localStorage).
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists public.qr_codes (
  id          bigserial primary key,
  session_id  uuid        not null,          -- identifica al "usuario" anónimo
  type        text        not null check (char_length(type) <= 20),
  text        text        not null check (char_length(text) <= 4096),
  name        text        not null default '' check (char_length(name) <= 120),
  date_label  text        not null check (char_length(date_label) <= 20),
  created_at  timestamptz not null default now()
);

-- Índice para listar los QRs de una sesión rápido
create index if not exists qr_codes_session_idx on public.qr_codes (session_id, created_at desc);

-- RLS: la tabla está en el esquema público pero el acceso
-- real pasa sólo por las Edge Functions (service_role key).
-- Desde el cliente NO hay acceso directo a la tabla.
alter table public.qr_codes enable row level security;

-- Nadie puede leer/escribir directo desde el client (anon / authenticated)
create policy "deny_direct_client_access" on public.qr_codes
  as restrictive
  for all
  using (false);
