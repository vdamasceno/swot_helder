
-- Tipo de participante
create type public.participant_type as enum ('docente', 'discente', 'tecnico');

alter table public.profiles
  add column participant_type public.participant_type not null default 'docente';

-- Fase do ciclo + parâmetros
create type public.cycle_phase as enum ('rodada1', 'consolidacao', 'rodada2', 'encerrado');

alter table public.evaluation_periods
  add column phase public.cycle_phase not null default 'rodada1',
  add column concord_threshold integer not null default 70,
  add column response_days integer not null default 7;

-- Atualiza trigger de novo usuário para capturar participant_type do metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_count int;
  is_first boolean;
  pt public.participant_type;
begin
  select count(*) into user_count from public.profiles;
  is_first := user_count = 0;

  pt := coalesce(
    nullif(new.raw_user_meta_data->>'participant_type','')::public.participant_type,
    'docente'::public.participant_type
  );

  insert into public.profiles (id, full_name, email, status, participant_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    case when is_first then 'approved'::profile_status else 'pending'::profile_status end,
    pt
  );

  if is_first then
    insert into public.user_roles (user_id, role) values (new.id, 'gestor');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'professor');
  end if;

  return new;
end;
$$;

-- Trigger se ainda não existir
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end$$;
