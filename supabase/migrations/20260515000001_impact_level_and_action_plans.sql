-- v1.0: impact_level para Ameaças/Oportunidades na Rodada 2 + Plano de Ação Estratégico

-- Enum de nível de impacto (usado para AM/OP na validação)
do $$ begin
  create type public.impact_level as enum ('alto', 'medio', 'baixo');
exception when duplicate_object then null; end $$;

-- Adiciona coluna impact_level em validation_responses (nullable; preenchida só para AM/OP)
alter table public.validation_responses
  add column if not exists impact_level public.impact_level;

-- Tabela de Plano de Ação Estratégico (produto da Etapa 3)
create table if not exists public.action_plans (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.evaluation_periods(id) on delete cascade,
  code text not null,                          -- A01, A02...
  action text not null default '',             -- Ação estratégica
  goal text not null default '',               -- Meta
  verification_indicator text not null default '', -- Indicador de verificação
  deadline_type text not null default 'curto', -- curto / medio / longo
  deadline_date text not null default '',      -- Data específica (opcional)
  responsible text not null default '',        -- Responsável
  resources text not null default '',          -- Recursos necessários
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_id, code)
);

create index if not exists action_plans_period_idx on public.action_plans(period_id);

alter table public.action_plans enable row level security;

create policy "Gestor manages action plans"
on public.action_plans for all
using (public.has_role(auth.uid(), 'gestor'))
with check (public.has_role(auth.uid(), 'gestor'));

create policy "Approved read action plans"
on public.action_plans for select
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.status = 'approved'
));

create trigger trg_action_plans_updated_at
before update on public.action_plans
for each row execute function public.set_updated_at();
