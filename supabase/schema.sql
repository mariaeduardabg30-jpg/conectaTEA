-- ============================================================================
-- ConectaTEA · schema do Supabase
-- Execute este arquivo no SQL Editor do seu projeto Supabase.
-- O script é idempotente: pode ser executado mais de uma vez com segurança.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Dependentes
-- Cada linha pertence a um responsável (auth.users.id).
-- ----------------------------------------------------------------------------
create table if not exists public.dependents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  avatar text not null default '🌱',
  color text not null default '#9FD3C2',
  birth_date date,
  created_at timestamptz not null default now()
);

create index if not exists dependents_owner_id_idx on public.dependents (owner_id);

-- ----------------------------------------------------------------------------
-- Rotina
-- days: 0 = domingo … 6 = sábado
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Conclusões de atividades
-- O par (routine_item_id, completion_date) é único para permitir upsert.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Registros emocionais
-- intensity: 1 (pouco) … 5 (muito intenso)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Pedidos de ajuda
-- ----------------------------------------------------------------------------
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
-- Segurança em nível de linha (RLS)
-- O responsável só enxerga e altera dados dos próprios dependentes.
-- ============================================================================

alter table public.dependents enable row level security;
alter table public.routine_items enable row level security;
alter table public.task_completions enable row level security;
alter table public.emotion_logs enable row level security;
alter table public.help_requests enable row level security;

-- Função auxiliar: o dependente pertence ao usuário autenticado?
create or replace function public.is_owner_of_dependent(target_dependent_id uuid)
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
      and d.owner_id = auth.uid()
  );
$$;

revoke all on function public.is_owner_of_dependent(uuid) from public;
grant execute on function public.is_owner_of_dependent(uuid) to authenticated;

-- dependents ---------------------------------------------------------------
drop policy if exists "dependents_select_own" on public.dependents;
create policy "dependents_select_own"
  on public.dependents for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "dependents_insert_own" on public.dependents;
create policy "dependents_insert_own"
  on public.dependents for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "dependents_update_own" on public.dependents;
create policy "dependents_update_own"
  on public.dependents for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "dependents_delete_own" on public.dependents;
create policy "dependents_delete_own"
  on public.dependents for delete
  to authenticated
  using (owner_id = auth.uid());

-- routine_items ------------------------------------------------------------
drop policy if exists "routine_items_select_own" on public.routine_items;
create policy "routine_items_select_own"
  on public.routine_items for select
  to authenticated
  using (public.is_owner_of_dependent(dependent_id));

drop policy if exists "routine_items_insert_own" on public.routine_items;
create policy "routine_items_insert_own"
  on public.routine_items for insert
  to authenticated
  with check (public.is_owner_of_dependent(dependent_id));

drop policy if exists "routine_items_update_own" on public.routine_items;
create policy "routine_items_update_own"
  on public.routine_items for update
  to authenticated
  using (public.is_owner_of_dependent(dependent_id))
  with check (public.is_owner_of_dependent(dependent_id));

drop policy if exists "routine_items_delete_own" on public.routine_items;
create policy "routine_items_delete_own"
  on public.routine_items for delete
  to authenticated
  using (public.is_owner_of_dependent(dependent_id));

-- task_completions ---------------------------------------------------------
drop policy if exists "task_completions_select_own" on public.task_completions;
create policy "task_completions_select_own"
  on public.task_completions for select
  to authenticated
  using (public.is_owner_of_dependent(dependent_id));

drop policy if exists "task_completions_insert_own" on public.task_completions;
create policy "task_completions_insert_own"
  on public.task_completions for insert
  to authenticated
  with check (public.is_owner_of_dependent(dependent_id));

drop policy if exists "task_completions_update_own" on public.task_completions;
create policy "task_completions_update_own"
  on public.task_completions for update
  to authenticated
  using (public.is_owner_of_dependent(dependent_id))
  with check (public.is_owner_of_dependent(dependent_id));

drop policy if exists "task_completions_delete_own" on public.task_completions;
create policy "task_completions_delete_own"
  on public.task_completions for delete
  to authenticated
  using (public.is_owner_of_dependent(dependent_id));

-- emotion_logs -------------------------------------------------------------
drop policy if exists "emotion_logs_select_own" on public.emotion_logs;
create policy "emotion_logs_select_own"
  on public.emotion_logs for select
  to authenticated
  using (public.is_owner_of_dependent(dependent_id));

drop policy if exists "emotion_logs_insert_own" on public.emotion_logs;
create policy "emotion_logs_insert_own"
  on public.emotion_logs for insert
  to authenticated
  with check (public.is_owner_of_dependent(dependent_id));

drop policy if exists "emotion_logs_update_own" on public.emotion_logs;
create policy "emotion_logs_update_own"
  on public.emotion_logs for update
  to authenticated
  using (public.is_owner_of_dependent(dependent_id))
  with check (public.is_owner_of_dependent(dependent_id));

drop policy if exists "emotion_logs_delete_own" on public.emotion_logs;
create policy "emotion_logs_delete_own"
  on public.emotion_logs for delete
  to authenticated
  using (public.is_owner_of_dependent(dependent_id));

-- help_requests ------------------------------------------------------------
drop policy if exists "help_requests_select_own" on public.help_requests;
create policy "help_requests_select_own"
  on public.help_requests for select
  to authenticated
  using (public.is_owner_of_dependent(dependent_id));

drop policy if exists "help_requests_insert_own" on public.help_requests;
create policy "help_requests_insert_own"
  on public.help_requests for insert
  to authenticated
  with check (public.is_owner_of_dependent(dependent_id));

drop policy if exists "help_requests_update_own" on public.help_requests;
create policy "help_requests_update_own"
  on public.help_requests for update
  to authenticated
  using (public.is_owner_of_dependent(dependent_id))
  with check (public.is_owner_of_dependent(dependent_id));

drop policy if exists "help_requests_delete_own" on public.help_requests;
create policy "help_requests_delete_own"
  on public.help_requests for delete
  to authenticated
  using (public.is_owner_of_dependent(dependent_id));

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
