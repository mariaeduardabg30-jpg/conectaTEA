-- ============================================================================
-- ConectaTEA · reset do schema do app novo (Next.js · v2 com papéis)
--
-- ██  ATENÇÃO: APAGA DADOS  ██
-- Remove as tabelas do app novo e recria do zero quando você rodar
-- supabase/schema.sql em seguida. Use apenas em projeto de teste ou quando
-- você tem certeza de que não precisa dos dados atuais.
--
-- NÃO apaga usuários do Auth (auth.users). Se quiser apagar também, faça
-- pelo Dashboard → Authentication.
-- ============================================================================

-- Tabelas do app novo ---------------------------------------------------------
drop table if exists public.task_completions cascade;
drop table if exists public.emotion_logs cascade;
drop table if exists public.help_requests cascade;
drop table if exists public.routine_items cascade;
drop table if exists public.dependents cascade;
drop table if exists public.profiles cascade;

-- Gatilho em auth.users -------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;

-- Funções de apoio ------------------------------------------------------------
drop function if exists public.can_access_dependent(uuid);
drop function if exists public.is_owner_of_dependent(uuid);
drop function if exists public.handle_new_user();
drop function if exists public.link_dependent_account();
drop function if exists public.prevent_profile_role_change();
drop function if exists public.touch_updated_at();

-- Tipo de papel ---------------------------------------------------------------
drop type if exists public.app_role;

-- ----------------------------------------------------------------------------
-- Tabelas do modelo antigo (V3/Expo)
-- Descomente só se este banco for o mesmo projeto da versão antiga e você
-- quiser descartar aquele modelo por completo.
-- ----------------------------------------------------------------------------
-- drop table if exists public.communication_cards cascade;
-- drop table if exists public.notification_devices cascade;
-- drop table if exists public.app_settings cascade;
-- drop table if exists public.sensory_preferences cascade;
-- drop table if exists public.relax_sessions cascade;
-- drop table if exists public.routine_completions cascade;
-- drop table if exists public.mood_entries cascade;
-- drop table if exists public.pairing_codes cascade;
-- drop table if exists public.connections cascade;
-- drop function if exists public.is_linked_guardian(uuid);
-- drop function if exists public.is_linked_dependent(uuid);
-- drop function if exists public.handle_new_user();
-- drop function if exists public.prevent_profile_role_change();
-- drop function if exists public.touch_updated_at();
-- drop function if exists public.validate_routine_completion_owner();
-- drop function if exists public.create_pairing_code();
-- drop function if exists public.claim_pairing_code(text);
-- drop function if exists public.acknowledge_help_request(uuid);
-- drop function if exists public.resolve_help_request(uuid);
-- drop type if exists public.help_urgency;
-- drop type if exists public.help_status;
-- drop type if exists public.user_role;
