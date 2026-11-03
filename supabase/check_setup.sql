-- ============================================================================
-- ConectaTEA · verificação da estrutura do Supabase (v2 · papéis)
-- Somente leitura: não cria, não altera e não apaga nada.
-- Cole tudo no SQL Editor do projeto e rode. Cada consulta devolve "ok" ou
-- "FALTANDO" para você comparar com supabase/schema.sql.
-- ============================================================================

-- 1) Tabelas esperadas pelo app (Next.js) ------------------------------------
with esperadas(nome) as (
  values
    ('profiles'),
    ('dependents'),
    ('routine_items'),
    ('task_completions'),
    ('emotion_logs'),
    ('help_requests')
)
select
  '1. tabela' as verificacao,
  e.nome as objeto,
  case when t.table_name is null then 'FALTANDO' else 'ok' end as status
from esperadas e
left join information_schema.tables t
  on t.table_schema = 'public'
 and t.table_name = e.nome
order by status desc, e.nome;

-- 2) Colunas esperadas em cada tabela ----------------------------------------
with esperadas(tabela, coluna) as (
  values
    ('profiles', 'id'),
    ('profiles', 'role'),
    ('profiles', 'name'),
    ('profiles', 'email'),
    ('profiles', 'age'),
    ('profiles', 'created_at'),
    ('profiles', 'updated_at'),

    ('dependents', 'id'),
    ('dependents', 'owner_id'),
    ('dependents', 'name'),
    ('dependents', 'avatar'),
    ('dependents', 'color'),
    ('dependents', 'email'),
    ('dependents', 'age'),
    ('dependents', 'user_id'),
    ('dependents', 'created_at'),

    ('routine_items', 'id'),
    ('routine_items', 'dependent_id'),
    ('routine_items', 'title'),
    ('routine_items', 'emoji'),
    ('routine_items', 'start_time'),
    ('routine_items', 'days'),
    ('routine_items', 'duration_min'),
    ('routine_items', 'active'),
    ('routine_items', 'position'),
    ('routine_items', 'created_at'),

    ('task_completions', 'id'),
    ('task_completions', 'dependent_id'),
    ('task_completions', 'routine_item_id'),
    ('task_completions', 'completion_date'),
    ('task_completions', 'completed_at'),

    ('emotion_logs', 'id'),
    ('emotion_logs', 'dependent_id'),
    ('emotion_logs', 'emotion'),
    ('emotion_logs', 'intensity'),
    ('emotion_logs', 'note'),
    ('emotion_logs', 'created_at'),

    ('help_requests', 'id'),
    ('help_requests', 'dependent_id'),
    ('help_requests', 'message'),
    ('help_requests', 'created_at'),
    ('help_requests', 'acknowledged_at'),
    ('help_requests', 'acknowledged_by')
)
select
  '2. coluna' as verificacao,
  e.tabela || '.' || e.coluna as objeto,
  case when c.column_name is null then 'FALTANDO' else 'ok' end as status
from esperadas e
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = e.tabela
 and c.column_name = e.coluna
order by status desc, e.tabela, e.coluna;

-- 3) Tipo de papel -----------------------------------------------------------
select
  '3. tipo' as verificacao,
  'public.app_role' as objeto,
  case when exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'app_role'
  ) then 'ok' else 'FALTANDO' end as status;

-- 4) RLS habilitado ----------------------------------------------------------
select
  '4. rls' as verificacao,
  tablename as objeto,
  case when rowsecurity then 'ok' else 'FALTANDO' end as status
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles', 'dependents', 'routine_items',
    'task_completions', 'emotion_logs', 'help_requests'
  )
order by status desc, tablename;

-- 5) Políticas RLS (esperado: 3 em profiles, 4 nas demais) -------------------
select
  '5. politicas' as verificacao,
  tablename as objeto,
  count(*)::text || ' politica(s): ' || string_agg(policyname, ', ' order by policyname) as status
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles', 'dependents', 'routine_items',
    'task_completions', 'emotion_logs', 'help_requests'
  )
group by tablename
order by tablename;

-- 6) Funções de apoio --------------------------------------------------------
select
  '6. funcao' as verificacao,
  p.proname as objeto,
  case
    when p.prosecdef then 'ok (security definer)'
    else 'ATENCAO (deveria ser security definer)'
  end as status
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'can_access_dependent',
    'is_owner_of_dependent',
    'handle_new_user',
    'link_dependent_account',
    'prevent_profile_role_change',
    'touch_updated_at'
  )
order by p.proname;

-- 7) Gatilhos importantes ----------------------------------------------------
select
  '7. gatilho' as verificacao,
  event_object_table || ' · ' || trigger_name as objeto,
  'ok' as status
from information_schema.triggers
where trigger_name in (
  'on_auth_user_created',
  'dependents_link_account',
  'profiles_protect_role',
  'profiles_touch_updated_at'
)
order by event_object_table, trigger_name;

-- 8) Unicidade usada no upsert e nos vínculos --------------------------------
select
  '8. unicidade' as verificacao,
  t.relname || ' · ' || c.conname as objeto,
  pg_get_constraintdef(c.oid) as status
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and c.contype = 'u'
  and t.relname in ('task_completions', 'dependents')
order by t.relname, c.conname;

select
  '8. indice' as verificacao,
  indexname as objeto,
  indexdef as status
from pg_indexes
where schemaname = 'public'
  and indexname in ('dependents_user_id_unique', 'dependents_email_unique')
order by indexname;

-- 9) Realtime para pedidos de ajuda ------------------------------------------
select
  '9. realtime' as verificacao,
  'help_requests' as objeto,
  case when exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'help_requests'
  ) then 'ok' else 'FALTANDO' end as status;

-- 10) Privilégios das roles do Supabase --------------------------------------
select
  '10. grants' as verificacao,
  table_name || ' → ' || grantee as objeto,
  string_agg(privilege_type, ', ' order by privilege_type) as status
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and table_name in (
    'profiles', 'dependents', 'routine_items',
    'task_completions', 'emotion_logs', 'help_requests'
  )
group by table_name, grantee
order by table_name, grantee;

-- 11) Modelo antigo (V3/Expo) que ainda exista -------------------------------
--     Se aparecer alguma tabela aqui, o banco NÃO é o do app novo.
select
  '11. legado' as verificacao,
  tablename as objeto,
  'EXISTE (modelo antigo)' as status
from pg_tables
where schemaname = 'public'
  and tablename in (
    'connections', 'pairing_codes', 'mood_entries',
    'routine_completions', 'relax_sessions', 'sensory_preferences',
    'app_settings', 'notification_devices', 'communication_cards'
  )
order by tablename;

select
  '11. coluna legada' as verificacao,
  table_name || '.' || column_name as objeto,
  'EXISTE (modelo antigo)' as status
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'profiles' and column_name = 'display_name')
    or (table_name = 'routine_items' and column_name = 'scheduled_time')
    or (table_name = 'help_requests' and column_name = 'urgency')
  )
order by table_name, column_name;
