-- ============================================================================
-- ConectaTEA · schema do Supabase (v2 · contas de responsável e dependente)
-- Execute este arquivo no SQL Editor do seu projeto Supabase.
-- O script é idempotente: pode ser executado mais de uma vez com segurança.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Pré-checagem de compatibilidade
-- Se o banco já tiver o modelo antigo (V3/Expo), as colunas são diferentes e
-- o "create table if not exists" passaria em silêncio, deixando o app quebrado.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'routine_items'
      and column_name = 'scheduled_time'
  ) then
    raise exception using
      message = 'public.routine_items existe com o modelo antigo (coluna scheduled_time).',
      hint = 'Use um projeto Supabase novo ou rode supabase/reset.sql antes deste schema.';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'help_requests'
      and column_name = 'urgency'
  ) then
    raise exception using
      message = 'public.help_requests existe com o modelo antigo (coluna urgency).',
      hint = 'Use um projeto Supabase novo ou rode supabase/reset.sql antes deste schema.';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'display_name'
  ) then
    raise exception using
      message = 'public.profiles existe com o modelo antigo (coluna display_name).',
      hint = 'Use um projeto Supabase novo ou rode supabase/reset.sql antes deste schema.';
  end if;
end
$$;

-- ============================================================================
-- Papéis e perfis de acesso
-- ============================================================================
do $$
begin
  create type public.app_role as enum ('responsavel', 'dependente');
exception
  when duplicate_object then null;
end
$$;

-- Um perfil por conta de login. O papel é definido no cadastro e não muda.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'responsavel',
  name text not null check (char_length(trim(name)) between 1 and 80),
  email text not null,
  age smallint check (age between 0 and 130),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

-- ============================================================================
-- Dependentes
-- Cada linha é o espaço de uma pessoa.
--   owner_id → responsável que criou o perfil (null quando o próprio
--              dependente criou a conta)
--   user_id  → conta de login do dependente (auth.users.id), quando existir
-- ============================================================================
create table if not exists public.dependents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  avatar text not null default '🌱',
  color text not null default '#9FD3C2',
  email text,
  age smallint check (age between 0 and 130),
  user_id uuid,
  created_at timestamptz not null default now()
);

-- Migração suave de bancos criados com a versão anterior deste schema.
alter table public.dependents alter column owner_id drop not null;
alter table public.dependents add column if not exists email text;
alter table public.dependents add column if not exists age smallint;
alter table public.dependents add column if not exists user_id uuid;

-- Reaproveita a antiga data de nascimento para estimar a idade, sem apagar
-- a coluna (os dados antigos continuam disponíveis para consulta manual).
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'dependents'
      and column_name = 'birth_date'
  ) then
    execute $sql$
      update public.dependents
         set age = extract(year from age(birth_date))::smallint
       where age is null
         and birth_date is not null
    $sql$;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'dependents_user_id_fkey'
  ) then
    alter table public.dependents
      add constraint dependents_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete cascade;
  end if;
end
$$;

create index if not exists dependents_owner_id_idx on public.dependents (owner_id);
create unique index if not exists dependents_user_id_unique
  on public.dependents (user_id)
  where user_id is not null;
create unique index if not exists dependents_email_unique
  on public.dependents (lower(email))
  where email is not null;

-- ============================================================================
-- Rotina
-- days: 0 = domingo … 6 = sábado
-- ============================================================================
create table if not exists public.routine_items (
  id uuid primary key default gen_random_uuid(),
  dependent_id uuid not null references public.dependents (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 100),
  emoji text not null default '✅',
  start_time time not null default '08:00',
  days smallint[] not null default '{0,1,2,3,4,5,6}',
  duration_min integer not null default 15 check (duration_min between 1 and 600),
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint routine_items_days_valid check (
    days <@ '{0,1,2,3,4,5,6}'::smallint[]
    and coalesce(array_length(days, 1), 0) between 1 and 7
  )
);

create index if not exists routine_items_dependent_id_idx
  on public.routine_items (dependent_id, start_time);

-- ============================================================================
-- Conclusões de atividades
-- O par (routine_item_id, completion_date) é único para permitir upsert.
-- ============================================================================
create table if not exists public.task_completions (
  id uuid primary key default gen_random_uuid(),
  dependent_id uuid not null references public.dependents (id) on delete cascade,
  routine_item_id uuid not null references public.routine_items (id) on delete cascade,
  completion_date date not null,
  completed_at timestamptz not null default now(),
  constraint task_completions_unique unique (routine_item_id, completion_date)
);

create index if not exists task_completions_dependent_date_idx
  on public.task_completions (dependent_id, completion_date);

-- ============================================================================
-- Registros emocionais
-- intensity: 1 (pouco) … 5 (muito intenso)
-- ============================================================================
create table if not exists public.emotion_logs (
  id uuid primary key default gen_random_uuid(),
  dependent_id uuid not null references public.dependents (id) on delete cascade,
  emotion text not null,
  intensity smallint not null default 3 check (intensity between 1 and 5),
  note text not null default '' check (char_length(note) <= 600),
  created_at timestamptz not null default now()
);

create index if not exists emotion_logs_dependent_created_idx
  on public.emotion_logs (dependent_id, created_at desc);

-- ============================================================================
-- Pedidos de ajuda
-- ============================================================================
create table if not exists public.help_requests (
  id uuid primary key default gen_random_uuid(),
  dependent_id uuid not null references public.dependents (id) on delete cascade,
  message text check (char_length(message) <= 280),
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by text
);

create index if not exists help_requests_dependent_created_idx
  on public.help_requests (dependent_id, created_at desc);

create index if not exists help_requests_pending_idx
  on public.help_requests (created_at desc)
  where acknowledged_at is null;

-- ============================================================================
-- Gatilhos de perfil
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- O papel define o tipo de acesso; não pode ser trocado por UPDATE.
create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'O papel da conta não pode ser alterado.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.prevent_profile_role_change();

-- ============================================================================
-- Cadastro de novas contas
-- O app envia em user_metadata: { name, role, age }.
--   responsável → cria apenas o perfil
--   dependente  → vincula (ou cria) o espaço do dependente
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  meta_name text;
  meta_role public.app_role;
  meta_age smallint;
  normalized_email text;
begin
  meta_name := nullif(trim(new.raw_user_meta_data ->> 'name'), '');
  normalized_email := lower(coalesce(new.email, ''));
  meta_role := case
    when new.raw_user_meta_data ->> 'role' = 'dependente'
      then 'dependente'::public.app_role
    else 'responsavel'::public.app_role
  end;
  meta_age := case
    when new.raw_user_meta_data ->> 'age' ~ '^[0-9]{1,3}$'
      then (new.raw_user_meta_data ->> 'age')::smallint
    else null
  end;

  insert into public.profiles (id, role, name, email, age)
  values (
    new.id,
    meta_role,
    coalesce(meta_name, split_part(normalized_email, '@', 1), 'Usuário'),
    normalized_email,
    case when meta_role = 'dependente' then meta_age else null end
  )
  on conflict (id) do update
    set name = excluded.name,
        email = excluded.email,
        age = excluded.age;

  if meta_role = 'dependente' then
    -- Se o responsável já criou um perfil com este e-mail, vinculamos a conta.
    update public.dependents
       set user_id = new.id
     where id = (
       select d.id
       from public.dependents d
       where d.user_id is null
         and d.email is not null
         and lower(d.email) = normalized_email
       order by d.created_at
       limit 1
     );

    if not found then
      insert into public.dependents (owner_id, name, email, age, user_id)
      values (
        null,
        coalesce(meta_name, 'Dependente'),
        normalized_email,
        meta_age,
        new.id
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Se o perfil do dependente for criado depois da conta, o e-mail faz o vínculo.
create or replace function public.link_dependent_account()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.user_id is null and new.email is not null then
    select u.id
      into new.user_id
      from auth.users u
     where lower(u.email) = lower(new.email)
     limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists dependents_link_account on public.dependents;
create trigger dependents_link_account
  before insert or update of email on public.dependents
  for each row execute function public.link_dependent_account();

-- ============================================================================
-- Segurança em nível de linha (RLS)
-- O responsável acessa os dependentes que criou; o dependente acessa o
-- próprio espaço. Nenhum dos dois enxerga os dados de outra família.
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.dependents enable row level security;
alter table public.routine_items enable row level security;
alter table public.task_completions enable row level security;
alter table public.emotion_logs enable row level security;
alter table public.help_requests enable row level security;

-- Função auxiliar: o usuário autenticado pode acessar este dependente?
create or replace function public.can_access_dependent(target_dependent_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.dependents d
    where d.id = target_dependent_id
      and (d.owner_id = auth.uid() or d.user_id = auth.uid())
  );
$$;

-- Mantém o nome antigo funcionando para quem já usa o schema.
create or replace function public.is_owner_of_dependent(target_dependent_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_access_dependent(target_dependent_id);
$$;

revoke all on function public.can_access_dependent(uuid) from public;
revoke all on function public.is_owner_of_dependent(uuid) from public;
grant execute on function public.can_access_dependent(uuid) to authenticated;
grant execute on function public.is_owner_of_dependent(uuid) to authenticated;

-- Vincula ao responsável um perfil que o próprio dependente criou.
-- A linha começa com owner_id nulo (o dependente se cadastrou sozinho) e só
-- pode ser reivindicada uma vez, pelo e-mail, por uma conta de responsável.
create or replace function public.claim_dependent_by_email(target_email text)
returns public.dependents
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  claimed public.dependents;
begin
  if auth.uid() is null then
    raise exception 'Entre novamente para continuar.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'responsavel'
  ) then
    raise exception 'Apenas o responsável pode vincular um perfil.';
  end if;

  update public.dependents d
     set owner_id = auth.uid()
   where d.id = (
     select d2.id
     from public.dependents d2
     where d2.owner_id is null
       and d2.email is not null
       and lower(d2.email) = lower(trim(target_email))
     order by d2.created_at
     limit 1
   )
   returning * into claimed;

  return claimed;
end;
$$;

revoke all on function public.claim_dependent_by_email(text) from public;
grant execute on function public.claim_dependent_by_email(text) to authenticated;

-- profiles ------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- dependents ----------------------------------------------------------------
drop policy if exists "dependents_select_own" on public.dependents;
create policy "dependents_select_own"
  on public.dependents for select
  to authenticated
  using (owner_id = auth.uid() or user_id = auth.uid());

drop policy if exists "dependents_insert_own" on public.dependents;
create policy "dependents_insert_own"
  on public.dependents for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "dependents_update_own" on public.dependents;
create policy "dependents_update_own"
  on public.dependents for update
  to authenticated
  using (owner_id = auth.uid() or user_id = auth.uid())
  with check (owner_id = auth.uid() or user_id = auth.uid());

drop policy if exists "dependents_delete_own" on public.dependents;
create policy "dependents_delete_own"
  on public.dependents for delete
  to authenticated
  using (owner_id = auth.uid() or user_id = auth.uid());

-- routine_items -------------------------------------------------------------
drop policy if exists "routine_items_select_own" on public.routine_items;
create policy "routine_items_select_own"
  on public.routine_items for select
  to authenticated
  using (public.can_access_dependent(dependent_id));

drop policy if exists "routine_items_insert_own" on public.routine_items;
create policy "routine_items_insert_own"
  on public.routine_items for insert
  to authenticated
  with check (public.can_access_dependent(dependent_id));

drop policy if exists "routine_items_update_own" on public.routine_items;
create policy "routine_items_update_own"
  on public.routine_items for update
  to authenticated
  using (public.can_access_dependent(dependent_id))
  with check (public.can_access_dependent(dependent_id));

drop policy if exists "routine_items_delete_own" on public.routine_items;
create policy "routine_items_delete_own"
  on public.routine_items for delete
  to authenticated
  using (public.can_access_dependent(dependent_id));

-- task_completions ---------------------------------------------------------
drop policy if exists "task_completions_select_own" on public.task_completions;
create policy "task_completions_select_own"
  on public.task_completions for select
  to authenticated
  using (public.can_access_dependent(dependent_id));

drop policy if exists "task_completions_insert_own" on public.task_completions;
create policy "task_completions_insert_own"
  on public.task_completions for insert
  to authenticated
  with check (public.can_access_dependent(dependent_id));

drop policy if exists "task_completions_update_own" on public.task_completions;
create policy "task_completions_update_own"
  on public.task_completions for update
  to authenticated
  using (public.can_access_dependent(dependent_id))
  with check (public.can_access_dependent(dependent_id));

drop policy if exists "task_completions_delete_own" on public.task_completions;
create policy "task_completions_delete_own"
  on public.task_completions for delete
  to authenticated
  using (public.can_access_dependent(dependent_id));

-- emotion_logs -------------------------------------------------------------
drop policy if exists "emotion_logs_select_own" on public.emotion_logs;
create policy "emotion_logs_select_own"
  on public.emotion_logs for select
  to authenticated
  using (public.can_access_dependent(dependent_id));

drop policy if exists "emotion_logs_insert_own" on public.emotion_logs;
create policy "emotion_logs_insert_own"
  on public.emotion_logs for insert
  to authenticated
  with check (public.can_access_dependent(dependent_id));

drop policy if exists "emotion_logs_update_own" on public.emotion_logs;
create policy "emotion_logs_update_own"
  on public.emotion_logs for update
  to authenticated
  using (public.can_access_dependent(dependent_id))
  with check (public.can_access_dependent(dependent_id));

drop policy if exists "emotion_logs_delete_own" on public.emotion_logs;
create policy "emotion_logs_delete_own"
  on public.emotion_logs for delete
  to authenticated
  using (public.can_access_dependent(dependent_id));

-- help_requests ------------------------------------------------------------
drop policy if exists "help_requests_select_own" on public.help_requests;
create policy "help_requests_select_own"
  on public.help_requests for select
  to authenticated
  using (public.can_access_dependent(dependent_id));

drop policy if exists "help_requests_insert_own" on public.help_requests;
create policy "help_requests_insert_own"
  on public.help_requests for insert
  to authenticated
  with check (public.can_access_dependent(dependent_id));

drop policy if exists "help_requests_update_own" on public.help_requests;
create policy "help_requests_update_own"
  on public.help_requests for update
  to authenticated
  using (public.can_access_dependent(dependent_id))
  with check (public.can_access_dependent(dependent_id));

drop policy if exists "help_requests_delete_own" on public.help_requests;
create policy "help_requests_delete_own"
  on public.help_requests for delete
  to authenticated
  using (public.can_access_dependent(dependent_id));

-- ============================================================================
-- Realtime
-- Necessário para o alerta imediato ao responsável quando chega um pedido.
-- ============================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'help_requests'
    ) then
      alter publication supabase_realtime add table public.help_requests;
    end if;
  else
    create publication supabase_realtime for table public.help_requests;
  end if;
end
$$;

-- REPLICA IDENTITY FULL permite receber o registro completo no payload.
alter table public.help_requests replica identity full;

-- ============================================================================
-- Privilégios explícitos
-- A RLS continua sendo a barreira principal; isto só deixa o acesso
-- previsível mesmo se os privilégios padrão do projeto forem diferentes.
-- ============================================================================
grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.profiles,
  public.dependents,
  public.routine_items,
  public.task_completions,
  public.emotion_logs,
  public.help_requests
to authenticated;

-- A role anônima não precisa de acesso direto: o app sempre está logado.
revoke all on
  public.profiles,
  public.dependents,
  public.routine_items,
  public.task_completions,
  public.emotion_logs,
  public.help_requests
from anon;

-- ============================================================================
-- Preenchimento para bancos que já tinham contas no Auth
-- ============================================================================
insert into public.profiles (id, role, name, email, age)
select
  u.id,
  case
    when u.raw_user_meta_data ->> 'role' = 'dependente'
      then 'dependente'::public.app_role
    else 'responsavel'::public.app_role
  end,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    split_part(lower(coalesce(u.email, '')), '@', 1),
    'Usuário'
  ),
  lower(coalesce(u.email, '')),
  case
    when u.raw_user_meta_data ->> 'age' ~ '^[0-9]{1,3}$'
      then (u.raw_user_meta_data ->> 'age')::smallint
    else null
  end
from auth.users u
on conflict (id) do nothing;

-- Contas de dependentes que ainda não têm um espaço criado.
insert into public.dependents (owner_id, name, email, age, user_id)
select
  null,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    split_part(lower(coalesce(u.email, '')), '@', 1),
    'Dependente'
  ),
  lower(u.email),
  case
    when u.raw_user_meta_data ->> 'age' ~ '^[0-9]{1,3}$'
      then (u.raw_user_meta_data ->> 'age')::smallint
    else null
  end,
  u.id
from auth.users u
where u.raw_user_meta_data ->> 'role' = 'dependente'
  and u.email is not null
  and not exists (
    select 1 from public.dependents d where d.user_id = u.id
  )
  and not exists (
    select 1
    from public.dependents d
    where d.email is not null and lower(d.email) = lower(u.email)
  );
