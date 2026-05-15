
-- Enums
create type public.app_role as enum ('gestor', 'professor');
create type public.profile_status as enum ('pending', 'approved', 'rejected');
create type public.swot_category as enum ('strength', 'weakness', 'opportunity', 'threat');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  status profile_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
alter table public.user_roles enable row level security;

-- has_role helper
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Evaluation periods
create table public.evaluation_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year integer not null,
  is_open boolean not null default true,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.evaluation_periods enable row level security;

-- SWOT entries
create table public.swot_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_id uuid not null references public.evaluation_periods(id) on delete cascade,
  item_code text not null,
  category swot_category not null,
  content text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.swot_entries enable row level security;
create index swot_entries_lookup on public.swot_entries(user_id, period_id, item_code, category);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();
create trigger swot_entries_updated before update on public.swot_entries
for each row execute function public.set_updated_at();

-- Auto-create profile + first user becomes gestor
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_count int;
  is_first boolean;
begin
  select count(*) into user_count from public.profiles;
  is_first := user_count = 0;

  insert into public.profiles (id, full_name, email, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    case when is_first then 'approved'::profile_status else 'pending'::profile_status end
  );

  if is_first then
    insert into public.user_roles (user_id, role) values (new.id, 'gestor');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'professor');
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Helper: is current period open?
create or replace function public.is_period_open(_period_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_open from public.evaluation_periods where id = _period_id), false)
$$;

-- RLS: profiles
create policy "Users read own profile" on public.profiles
for select using (auth.uid() = id);
create policy "Gestor reads all profiles" on public.profiles
for select using (public.has_role(auth.uid(), 'gestor'));
create policy "Users update own profile basic" on public.profiles
for update using (auth.uid() = id);
create policy "Gestor updates any profile" on public.profiles
for update using (public.has_role(auth.uid(), 'gestor'));

-- RLS: user_roles
create policy "Users read own roles" on public.user_roles
for select using (auth.uid() = user_id);
create policy "Gestor reads all roles" on public.user_roles
for select using (public.has_role(auth.uid(), 'gestor'));
create policy "Gestor manages roles" on public.user_roles
for all using (public.has_role(auth.uid(), 'gestor'))
with check (public.has_role(auth.uid(), 'gestor'));

-- RLS: evaluation_periods
create policy "Approved users read periods" on public.evaluation_periods
for select using (
  exists (select 1 from public.profiles where id = auth.uid() and status = 'approved')
);
create policy "Gestor manages periods" on public.evaluation_periods
for all using (public.has_role(auth.uid(), 'gestor'))
with check (public.has_role(auth.uid(), 'gestor'));

-- RLS: swot_entries
create policy "Users read own entries" on public.swot_entries
for select using (auth.uid() = user_id);
create policy "Gestor reads all entries" on public.swot_entries
for select using (public.has_role(auth.uid(), 'gestor'));
create policy "Users insert own entries when period open" on public.swot_entries
for insert with check (
  auth.uid() = user_id
  and public.is_period_open(period_id)
  and exists (select 1 from public.profiles where id = auth.uid() and status = 'approved')
);
create policy "Users update own entries when period open" on public.swot_entries
for update using (
  auth.uid() = user_id and public.is_period_open(period_id)
);
create policy "Users delete own entries when period open" on public.swot_entries
for delete using (
  auth.uid() = user_id and public.is_period_open(period_id)
);
