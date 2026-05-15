-- Fase B: Consolidação + Rodada 2 (validação Likert)

-- Enums
do $$ begin
  create type public.validation_vote as enum ('C','D','N');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.priority_temporal as enum ('curto','medio','longo');
exception when duplicate_object then null; end $$;

-- Tabela de itens consolidados (saída da Comissão na fase de consolidação)
create table if not exists public.consolidated_items (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.evaluation_periods(id) on delete cascade,
  item_code text not null,                  -- PF001, FR001, AM001, OP001...
  category public.swot_category not null,   -- strength|weakness|opportunity|threat
  indicator text not null,                  -- Q1..Q6 ou 'GERAL'
  content text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_id, item_code)
);

create index if not exists consolidated_items_period_idx on public.consolidated_items(period_id);

alter table public.consolidated_items enable row level security;

drop policy if exists "Gestor manages consolidated" on public.consolidated_items;
create policy "Gestor manages consolidated"
on public.consolidated_items for all
using (public.has_role(auth.uid(),'gestor'))
with check (public.has_role(auth.uid(),'gestor'));

drop policy if exists "Approved read consolidated" on public.consolidated_items;
create policy "Approved read consolidated"
on public.consolidated_items for select
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved'));

drop trigger if exists trg_consolidated_updated_at on public.consolidated_items;
create trigger trg_consolidated_updated_at
before update on public.consolidated_items
for each row execute function public.set_updated_at();

-- Respostas de validação (Rodada 2)
create table if not exists public.validation_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  period_id uuid not null references public.evaluation_periods(id) on delete cascade,
  item_id uuid not null references public.consolidated_items(id) on delete cascade,
  vote public.validation_vote not null,
  priority public.priority_temporal,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, item_id)
);

create index if not exists validation_responses_period_idx on public.validation_responses(period_id);
create index if not exists validation_responses_item_idx on public.validation_responses(item_id);

alter table public.validation_responses enable row level security;

drop policy if exists "Gestor reads all validations" on public.validation_responses;
create policy "Gestor reads all validations"
on public.validation_responses for select
using (public.has_role(auth.uid(),'gestor'));

drop policy if exists "Users read own validations" on public.validation_responses;
create policy "Users read own validations"
on public.validation_responses for select
using (auth.uid() = user_id);

drop policy if exists "Users insert own validations in rodada2" on public.validation_responses;
create policy "Users insert own validations in rodada2"
on public.validation_responses for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.evaluation_periods ep
    where ep.id = period_id and ep.is_open and ep.phase = 'rodada2'
  )
  and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved'
  )
);

drop policy if exists "Users update own validations in rodada2" on public.validation_responses;
create policy "Users update own validations in rodada2"
on public.validation_responses for update
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.evaluation_periods ep
    where ep.id = period_id and ep.is_open and ep.phase = 'rodada2'
  )
);

drop policy if exists "Users delete own validations in rodada2" on public.validation_responses;
create policy "Users delete own validations in rodada2"
on public.validation_responses for delete
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.evaluation_periods ep
    where ep.id = period_id and ep.is_open and ep.phase = 'rodada2'
  )
);

drop trigger if exists trg_validation_updated_at on public.validation_responses;
create trigger trg_validation_updated_at
before update on public.validation_responses
for each row execute function public.set_updated_at();