-- ============================================================
-- QRFT — agrega ip_address a qr_codes
-- Correr en Supabase SQL Editor
-- ============================================================

alter table public.qr_codes
  add column if not exists ip_address text not null default 'unknown'
    check (char_length(ip_address) <= 45);  -- máx IPv6

-- Índice para buscar por IP (útil para recuperar sesión por IP)
create index if not exists qr_codes_ip_idx on public.qr_codes (ip_address);
