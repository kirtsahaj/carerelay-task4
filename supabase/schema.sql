create extension if not exists pgcrypto;

create table if not exists public.handoffs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  visitor_id text not null,
  input text not null,
  output text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  model text not null,
  refused boolean not null default false,
  action_count integer not null default 0,
  request_ms integer
);

create index if not exists handoffs_created_at_idx on public.handoffs (created_at desc);
create index if not exists handoffs_visitor_id_idx on public.handoffs (visitor_id, created_at desc);

alter table public.handoffs enable row level security;

-- No anon/authenticated policies are created.
-- Vercel calls Supabase from the server using SUPABASE_SERVICE_KEY.
-- The stored input/output fields are deliberately redacted metadata, not caregiver text,
-- names, ages, medical details, or other health data.
