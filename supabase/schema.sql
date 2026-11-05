-- ============================================================================
-- ConectaTEA · schema do Supabase (v3 · contas, vinculação por código,
-- notificações e push)
-- Execute este arquivo no SQL Editor do seu projeto Supabase.
-- O script é idempotente: pode ser executado mais de uma vez com segurança.
--
-- v3 adiciona:
--   · dependents.link_code — código único de vinculação por dependente
--   · link_dependent_by_code / regenerate_link_code — vínculo pelo app
--   · notifications — notificações para o responsável (criadas pelo banco)
--   · run_task_reminders + pg_cron — lembrete no horário programado
--   · push_subscriptions — inscrições Web Push por dispositivo
--   · pg_net + Vault — disparo do push no plano Free (sem Database Webhooks)
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

-- Fuso horário do dispositivo de cada conta. O app atualiza este campo no
-- login com Intl.DateTimeFormat().resolvedOptions().timeZone para que os
-- lembretes do banco usem o horário local real, sem depender do fuso do
-- servidor. O valor padrão atende bancos antigos e contas que ainda não
-- entraram desde esta atualização.
alter table public.profiles add column if not exists timezone text;
alter table public.profiles alter column timezone set default 'America/Sao_Paulo';
update public.profiles
   set timezone = 'America/Sao_Paulo'
 where timezone is null or trim(timezone) = '';

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

-- ============================================================================
-- CÓDIGO ÚNICO DE VINCULAÇÃO (v3)
-- Cada dependente tem um código (8 caracteres, alfabeto sem letras/números
-- confusos) que o responsável digita no app para vincular a conta.
-- ============================================================================
create or replace function public.generate_link_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text := '';
  index integer;
begin
  for index in 1..8 loop
    candidate := candidate || substr(alphabet, floor(random() * length(alphabet))::integer + 1, 1);
  end loop;
  return candidate;
end;
$$;

alter table public.dependents add column if not exists link_code text;

-- Preenche os códigos dos perfis que ainda não têm um, um a um, garantindo
-- unicidade mesmo dentro da mesma execução.
do $$
declare
  rec record;
  candidate text;
begin
  for rec in select id from public.dependents where link_code is null loop
    loop
      candidate := public.generate_link_code();
      begin
        update public.dependents set link_code = candidate where id = rec.id;
        exit;
      exception
        when unique_violation then
          -- Código repetido: gera outro e tenta de novo.
      end;
    end loop;
  end loop;
end
$$;

create unique index if not exists dependents_link_code_unique
  on public.dependents (link_code);

-- Todo perfil novo recebe um código automaticamente.
create or replace function public.dependents_set_link_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  if new.link_code is not null then
    return new;
  end if;
  loop
    candidate := public.generate_link_code();
    if not exists (
      select 1 from public.dependents d where d.link_code = candidate
    ) then
      new.link_code := candidate;
      return new;
    end if;
  end loop;
end;
$$;

drop trigger if exists dependents_set_link_code on public.dependents;
create trigger dependents_set_link_code
  before insert on public.dependents
  for each row execute function public.dependents_set_link_code();

-- Vincula o dependente ao responsável pelo código. A mensagem de erro vem
-- com o prefixo LINK: para o app exibir o texto sem vazar detalhes internos.
create or replace function public.link_dependent_by_code(target_code text)
returns public.dependents
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized text;
  claimed public.dependents;
begin
  if auth.uid() is null then
    raise exception 'LINK:Entre novamente para continuar.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'responsavel'
  ) then
    raise exception 'LINK:Apenas o responsável pode vincular um dependente.';
  end if;

  normalized := upper(regexp_replace(coalesce(target_code, ''), '[^a-zA-Z0-9]', '', 'g'));
  if length(normalized) <> 8 then
    raise exception 'LINK:Código inválido. Confira o código e tente novamente.';
  end if;

  select * into claimed
  from public.dependents d
  where d.link_code = normalized;

  if not found then
    raise exception 'LINK:Código inválido ou não encontrado. Confira o código e tente novamente.';
  end if;

  -- Já vinculado a esta mesma conta: operação idempotente.
  if claimed.owner_id = auth.uid() then
    return claimed;
  end if;

  if claimed.owner_id is not null then
    raise exception 'LINK:Este dependente já está vinculado a outro responsável.';
  end if;

  -- Reivindica o espaço. Se o dependente tiver criado a conta dele por
  -- e-mail, o gatilho de cadastro já terá mantido user_id apontando para
  -- a conta certa.
  update public.dependents
     set owner_id = auth.uid()
   where id = claimed.id
  returning * into claimed;

  return claimed;
end;
$$;

revoke all on function public.link_dependent_by_code(text) from public;
grant execute on function public.link_dependent_by_code(text) to authenticated;

-- Gera um código novo para o dependente; o código antigo deixa de funcionar.
create or replace function public.regenerate_link_code(target_dependent_id uuid)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target public.dependents;
  candidate text;
begin
  if auth.uid() is null then
    raise exception 'LINK:Entre novamente para continuar.';
  end if;

  select * into target
  from public.dependents d
  where d.id = target_dependent_id;

  if not found then
    raise exception 'LINK:Dependente não encontrado.';
  end if;

  if target.owner_id is distinct from auth.uid()
     and target.user_id is distinct from auth.uid() then
    raise exception 'LINK:Sem permissão para alterar este código.';
  end if;

  loop
    candidate := public.generate_link_code();
    if not exists (
      select 1 from public.dependents d where d.link_code = candidate
    ) then
      update public.dependents set link_code = candidate where id = target.id;
      return candidate;
    end if;
  end loop;
end;
$$;

revoke all on function public.regenerate_link_code(uuid) from public;
grant execute on function public.regenerate_link_code(uuid) to authenticated;

-- ============================================================================
-- NOTIFICAÇÕES (v3)
-- Criadas exclusivamente por triggers/funções do banco; o cliente só lê e
-- marca como lida. Cada notificação vai para um destinatário específico.
-- ============================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  dependent_id uuid not null references public.dependents (id) on delete cascade,
  type text not null check (type in ('help_request', 'help_acknowledged', 'task_created', 'task_reminder', 'task_completed')),
  title text not null check (char_length(trim(title)) between 1 and 140),
  body text not null default '' check (char_length(body) <= 300),
  routine_item_id uuid references public.routine_items (id) on delete cascade,
  scheduled_date date,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);

-- Bancos criados antes da mensagem "ajuda a caminho" precisam aceitar o novo
-- tipo de notificação. Este bloco é idempotente e seguro para rodar de novo.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('help_request', 'help_acknowledged', 'task_created', 'task_reminder', 'task_completed'));

-- Deduplicação: no máximo uma notificação por tarefa/evento/dia/destinatário.
create unique index if not exists notifications_dedupe_unique
  on public.notifications (recipient_id, type, routine_item_id, scheduled_date)
  where routine_item_id is not null;

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (recipient_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Quem pode ler o quê: só as próprias notificações; e só a coluna read_at
-- pode ser alterada pelo cliente. A criação é exclusiva do banco.
revoke all on public.notifications from public, anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Cria uma notificação para o(s) responsável(is) do dependente, ignorando
-- quem executou a ação. Silenciosamente ignora conflitos de deduplicação.
create or replace function public.notify_responsibles(
  target_dependent_id uuid,
  actor_user_id uuid,
  notification_type text,
  notification_title text,
  notification_body text,
  target_routine_item_id uuid,
  notification_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (
    recipient_id,
    dependent_id,
    type,
    title,
    body,
    routine_item_id,
    scheduled_date
  )
  select
    d.owner_id,
    d.id,
    notification_type,
    left(notification_title, 140),
    left(coalesce(notification_body, ''), 300),
    target_routine_item_id,
    notification_date
  from public.dependents d
  where d.id = target_dependent_id
    and d.owner_id is not null
    and d.owner_id is distinct from actor_user_id
    and (
      -- Sem item associado (ex.: pedido de ajuda), não há deduplicação:
      -- cada evento é um alerta novo.
      target_routine_item_id is null
      or not exists (
        select 1
        from public.notifications n
        where n.recipient_id = d.owner_id
          and n.type = notification_type
          and n.routine_item_id is not distinct from target_routine_item_id
          and n.scheduled_date is not distinct from notification_date
      )
    );
end;
$$;

-- Tarefa criada/programada: avisa o responsável vinculado.
create or replace function public.routine_items_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_responsibles(
    new.dependent_id,
    auth.uid(),
    'task_created',
    'Nova tarefa programada',
    format(
      '%s %s · %s',
      new.emoji,
      new.title,
      to_char(new.start_time, 'HH24:MI')
    ),
    new.id,
    null
  );
  return new;
end;
$$;

drop trigger if exists routine_items_notify_responsible on public.routine_items;
create trigger routine_items_notify_responsible
  after insert on public.routine_items
  for each row execute function public.routine_items_notify();

-- Tarefa concluída: avisa o responsável vinculado.
create or replace function public.task_completions_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
begin
  select r.title, r.emoji
  into item
  from public.routine_items r
  where r.id = new.routine_item_id;

  perform public.notify_responsibles(
    new.dependent_id,
    auth.uid(),
    'task_completed',
    'Tarefa concluída',
    format(
      '%s %s foi concluída',
      coalesce(item.emoji, '✅'),
      coalesce(item.title, 'Atividade')
    ),
    new.routine_item_id,
    new.completion_date
  );
  return new;
end;
$$;

drop trigger if exists task_completions_notify_responsible on public.task_completions;
create trigger task_completions_notify_responsible
  after insert on public.task_completions
  for each row execute function public.task_completions_notify();

-- Pedido de ajuda: avisa o responsável vinculado (deduplicação não se
-- aplica — cada pedido é um alerta novo).
create or replace function public.help_requests_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dependent_name text;
begin
  select d.name
  into dependent_name
  from public.dependents d
  where d.id = new.dependent_id;

  perform public.notify_responsibles(
    new.dependent_id,
    auth.uid(),
    'help_request',
    'Pedido de ajuda',
    format('%s pediu ajuda agora', coalesce(dependent_name, 'Um dependente')),
    null,
    null
  );
  return new;
end;
$$;

drop trigger if exists help_requests_notify_responsible on public.help_requests;
create trigger help_requests_notify_responsible
  after insert on public.help_requests
  for each row execute function public.help_requests_notify();

-- Responsável tocou em "Quero ajudar": avisa a conta do dependente que a
-- ajuda está a caminho. Só dispara na primeira confirmação de cada pedido.
create or replace function public.help_requests_notify_acknowledged()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
  responsible_name text;
begin
  if old.acknowledged_at is not null or new.acknowledged_at is null then
    return new;
  end if;

  select d.user_id
  into recipient
  from public.dependents d
  where d.id = new.dependent_id;

  if recipient is null then
    return new;
  end if;

  responsible_name := coalesce(
    nullif(trim(new.acknowledged_by), ''),
    'Seu responsável'
  );

  insert into public.notifications (
    recipient_id,
    dependent_id,
    type,
    title,
    body
  ) values (
    recipient,
    new.dependent_id,
    'help_acknowledged',
    'Ajuda a caminho',
    left(
      format('%s viu seu pedido e a ajuda está a caminho.', responsible_name),
      300
    )
  );

  return new;
end;
$$;

drop trigger if exists help_requests_notify_acknowledged on public.help_requests;
create trigger help_requests_notify_acknowledged
  after update on public.help_requests
  for each row execute function public.help_requests_notify_acknowledged();

-- Lembrete no horário programado: executado pelo pg_cron a cada minuto.
-- A janela começa 5 minutos antes e termina 2 minutos depois do horário,
-- assim o aviso chega perto do momento certo mesmo quando a tarefa foi criada
-- em cima da hora. Cada destinatário recebe no máximo um lembrete por tarefa
-- e por dia (índice notifications_dedupe_unique).
--
-- O fuso vem de profiles.timezone (sincronizado pelo dispositivo no login).
-- Sem essa informação, usa America/Sao_Paulo como padrão.
create or replace function public.run_task_reminders_for(target_user uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted integer := 0;
begin
  with due as (
    select
      ri.id as routine_item_id,
      ri.dependent_id,
      ri.title,
      ri.emoji,
      ri.start_time,
      d.owner_id,
      d.user_id,
      d.name as dependent_name,
      coalesce(nullif(trim(p.timezone), ''), 'America/Sao_Paulo') as tz,
      (now() at time zone coalesce(nullif(trim(p.timezone), ''), 'America/Sao_Paulo')) as local_now,
      (now() at time zone coalesce(nullif(trim(p.timezone), ''), 'America/Sao_Paulo'))::date as today
    from public.routine_items ri
    join public.dependents d on d.id = ri.dependent_id
    left join public.profiles p on p.id = d.user_id
    where ri.active
      and (d.owner_id is not null or d.user_id is not null)
      and (
        target_user is null
        or d.user_id = target_user
        or d.owner_id = target_user
      )
      and extract(
        dow from (now() at time zone coalesce(nullif(trim(p.timezone), ''), 'America/Sao_Paulo'))
      )::smallint = any(ri.days)
      and (now() at time zone coalesce(nullif(trim(p.timezone), ''), 'America/Sao_Paulo'))
          >= (
            (now() at time zone coalesce(nullif(trim(p.timezone), ''), 'America/Sao_Paulo'))::date
            + ri.start_time
          ) - interval '5 minutes'
      and (now() at time zone coalesce(nullif(trim(p.timezone), ''), 'America/Sao_Paulo'))
          < (
            (now() at time zone coalesce(nullif(trim(p.timezone), ''), 'America/Sao_Paulo'))::date
            + ri.start_time
          ) + interval '2 minutes'
  ),
  recipients as (
    -- Conta do dependente: o lembrete precisa chegar nele, nomeando a
    -- atividade que ele deve realizar.
    select due.*, due.user_id as recipient_id, 'dependente'::text as recipient_role
    from due
    where due.user_id is not null
    union all
    -- Responsável vinculado: continua recebendo o mesmo lembrete, como antes.
    select due.*, due.owner_id as recipient_id, 'responsavel'::text as recipient_role
    from due
    where due.owner_id is not null
      and due.owner_id is distinct from due.user_id
  ),
  ins as (
    insert into public.notifications (
      recipient_id,
      dependent_id,
      type,
      title,
      body,
      routine_item_id,
      scheduled_date
    )
    select
      r.recipient_id,
      r.dependent_id,
      'task_reminder',
      'Hora da tarefa',
      left(
        case
          when r.recipient_role = 'dependente' then
            format(
              '%s %s · %s',
              r.emoji,
              r.title,
              case
                when r.local_now < (r.today + r.start_time)
                  then 'começa às ' || to_char(r.start_time, 'HH24:MI')
                else 'é agora!'
              end
            )
          else
            format('%s %s · %s', r.emoji, r.title, r.dependent_name)
        end,
        300
      ),
      r.routine_item_id,
      r.today
    from recipients r
    where not exists (
      select 1
      from public.notifications n
      where n.recipient_id = r.recipient_id
        and n.type = 'task_reminder'
        and n.routine_item_id = r.routine_item_id
        and n.scheduled_date = r.today
    )
    on conflict do nothing
    returning 1
  )
  select count(*) into inserted from ins;
  return inserted;
end;
$$;

revoke all on function public.run_task_reminders_for(uuid) from public;
revoke all on function public.run_task_reminders_for(uuid) from anon, authenticated;

-- Versão usada pelo pg_cron: percorre todas as contas.
create or replace function public.run_task_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.run_task_reminders_for(null);
end;
$$;

revoke all on function public.run_task_reminders() from public;
revoke all on function public.run_task_reminders() from anon, authenticated;

-- Versão usada pelo app aberto: garante o lembrete mesmo se o pg_cron ainda
-- não estiver ativo, sem permitir que uma conta dispare avisos para outra.
create or replace function public.run_my_task_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    return 0;
  end if;
  return public.run_task_reminders_for(current_user_id);
end;
$$;

revoke all on function public.run_my_task_reminders() from public;
revoke all on function public.run_my_task_reminders() from anon;
grant execute on function public.run_my_task_reminders() to authenticated;

-- Agendamento automático do lembrete. Se o pg_cron não estiver disponível,
-- o restante do schema é aplicado normalmente e os lembretes ficam
-- pendentes de ativação (o app avisa in-app quando aberto).
do $$
begin
  begin
    create extension if not exists pg_cron;
  exception
    when others then
      raise warning 'pg_cron não disponível: lembretes agendados não serão ativados. Dashboard → Database → Extensions → pg_cron.';
  end;

  begin
    perform cron.unschedule('conectatea-task-reminders');
  exception
    when others then null;
  end;

  begin
    perform cron.schedule(
      'conectatea-task-reminders',
      '* * * * *',
      $cron$select public.run_task_reminders()$cron$
    );
  exception
    when others then
      raise warning 'Não foi possível agendar conectatea-task-reminders no pg_cron: %', sqlerrm;
  end;
end
$$;

-- ============================================================================
-- INSCRIÇÕES DE NOTIFICAÇÃO PUSH (v3)
-- Cada dispositivo do responsável guarda sua inscrição Web Push. A função de
-- envio (Edge Function send-push) lê esta tabela com a service role.
-- ============================================================================
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = auth.uid());

revoke all on public.push_subscriptions from public, anon, authenticated;
grant select, insert, delete on public.push_subscriptions to authenticated;

-- ============================================================================
-- ENVIO DE PUSH NO PLANO FREE (pg_net)
-- O plano Free não oferece Database Webhooks. O pg_net faz o mesmo papel:
-- a cada notificação criada pelo banco, chama a Edge Function send-push por
-- HTTP. A URL do projeto e o segredo compartilhado ficam no Vault:
--
--   select vault.create_secret('https://SEU-PROJETO.supabase.co',
--                              'conectatea_project_url');
--   select vault.create_secret('<chave anon pública do projeto>',
--                              'conectatea_anon_key');
--   select vault.create_secret('<mesmo valor de WEBHOOK_SECRET>',
--                              'conectatea_webhook_secret');
--
-- A chave anon é pública e serve apenas para passar pelo gateway da função;
-- quem autoriza o envio é o header x-webhook-secret. Sem esses segredos o
-- trigger não envia nada e o app continua funcionando com o alerta local. O
-- pedido de ajuda (help_request) é ignorado aqui porque o próprio app do
-- dependente chama a função no instante do toque — assim o aviso chega ao
-- responsável mesmo com o app dele fechado.
-- ============================================================================
do $$
begin
  begin
    create schema if not exists extensions;
    create extension if not exists pg_net with schema extensions;
  exception
    when others then
      raise warning 'pg_net não disponível: push agendado não será enviado. Ative em Database → Extensions → pg_net.';
  end;
end
$$;

create or replace function public.dispatch_notification_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_url text;
  anon_key text;
  webhook_secret text;
begin
  if new.type = 'help_request' then
    return new;
  end if;

  begin
    select decrypted_secret
    into project_url
    from vault.decrypted_secrets
    where name = 'conectatea_project_url';

    select decrypted_secret
    into anon_key
    from vault.decrypted_secrets
    where name = 'conectatea_anon_key';

    select decrypted_secret
    into webhook_secret
    from vault.decrypted_secrets
    where name = 'conectatea_webhook_secret';
  exception
    when others then
      return new;
  end;

  if coalesce(project_url, '') = ''
    or coalesce(anon_key, '') = ''
    or coalesce(webhook_secret, '') = '' then
    return new;
  end if;

  perform net.http_post(
    url := project_url || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', anon_key,
      'Authorization', 'Bearer ' || anon_key,
      'x-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'table', 'notifications',
      'record', to_jsonb(new)
    )
  );

  return new;
exception
  when others then
    raise warning 'Falha ao disparar push da notificação %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists notifications_dispatch_push on public.notifications;
create trigger notifications_dispatch_push
  after insert on public.notifications
  for each row execute function public.dispatch_notification_push();

revoke all on function public.dispatch_notification_push() from public;

-- Realtime: o app recebe as notificações na hora em que são criadas.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table public.notifications;
    end if;
  else
    create publication supabase_realtime for table public.help_requests, public.notifications;
  end if;
end
$$;

-- Realtime das telas: emoções, rotina, tarefas concluídas e perfis também
-- chegam sem recarregar a página.
do $$
declare
  target text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach target in array array[
    'emotion_logs',
    'routine_items',
    'task_completions',
    'dependents'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = target
    ) then
      execute format('alter publication supabase_realtime add table public.%I', target);
    end if;
  end loop;
end
$$;
