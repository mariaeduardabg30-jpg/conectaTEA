// ============================================================================
// ConectaTEA · send-push
//
// Envia notificações push (Web Push) para o destinatário de cada evento:
// responsável e/ou a própria conta do dependente, conforme o tipo. É
// chamada por Database Webhooks do Supabase:
//
//   1) tabela public.notifications  · evento INSERT
//      → destinatário é o próprio recipient_id da linha;
//   2) tabela public.help_requests  · evento INSERT
//      → destinatário é o owner_id do dependente.
//
// Segurança: a função exige o header `x-webhook-secret` com o valor definido
// em WEBHOOK_SECRET (quando configurado). A leitura das inscrições usa a
// service role, então a função só deve ser chamada pelo webhook.
//
// Deploy:
//   supabase functions deploy send-push --no-verify-jwt
//   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... WEBHOOK_SECRET=...
//
// Variáveis opcionais:
//   APP_BASE_URL — base pública do app, usada no destino do clique,
//   ex.: https://mariaeduardabg30-jpg.github.io/conectaTEA
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") ?? "").replace(/\/+$/, "");

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

type Row = Record<string, unknown>;

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Método não suportado." }, 405);
  }

  if (WEBHOOK_SECRET) {
    const secret = request.headers.get("x-webhook-secret") ?? "";
    if (secret !== WEBHOOK_SECRET) {
      return json({ error: "Não autorizado." }, 401);
    }
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return json({ error: "Chaves VAPID não configuradas." }, 500);
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ error: "Credenciais do Supabase não configuradas." }, 500);
  }

  let payload: Row;
  try {
    payload = (await request.json()) as Row;
  } catch {
    return json({ error: "Corpo JSON inválido." }, 400);
  }

  const table = typeof payload.table === "string" ? payload.table : "";
  const record = (payload.record ?? payload) as Row;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Monta destinatários, textos e destino do clique.
  let recipients: string[] = [];
  let title = "ConectaTEA";
  let body = "";
  let notificationType = "";
  let requireInteraction = false;
  let tag = crypto.randomUUID();

  if (table === "notifications" || typeof record.recipient_id === "string") {
    recipients = [String(record.recipient_id)];
    title = typeof record.title === "string" && record.title ? record.title : "ConectaTEA";
    body = typeof record.body === "string" ? record.body : "";
    notificationType = typeof record.type === "string" ? record.type : "";
    requireInteraction = notificationType === "help_request";
    tag = typeof record.id === "string" ? `notif-${record.id}` : tag;
  } else if (table === "help_requests" || typeof record.dependent_id === "string") {
    const dependentId = String(record.dependent_id ?? "");
    const { data: dependent } = await supabase
      .from("dependents")
      .select("name, owner_id")
      .eq("id", dependentId)
      .maybeSingle();

    if (!dependent?.owner_id) {
      return json({ sent: 0, reason: "dependente sem responsável vinculado" });
    }
    recipients = [String(dependent.owner_id)];
    title = "Pedido de ajuda";
    body = `${typeof dependent.name === "string" ? dependent.name : "Seu dependente"} pediu ajuda agora`;
    notificationType = "help_request";
    requireInteraction = true;
    tag = typeof record.id === "string" ? `help-${record.id}` : tag;
  } else {
    return json({ error: "Payload não reconhecido." }, 400);
  }

  const urgent = notificationType === "help_request";

  // O destinatário pode ser o responsável ou a própria conta do dependente
  // (lembretes de tarefa), então o destino do clique depende do papel.
  const [{ data: profiles }, { data: subscriptions, error: subsError }] = await Promise.all([
    supabase.from("profiles").select("id, role").in("id", recipients),
    supabase
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth")
      .in("user_id", recipients),
  ]);

  if (subsError) {
    console.error("Falha ao ler inscrições push", subsError);
    return json({ error: "Falha ao ler inscrições." }, 500);
  }
  if (!subscriptions?.length) {
    return json({ sent: 0, reason: "nenhum dispositivo inscrito" });
  }

  const roleById = new Map<string, string>();
  for (const profile of profiles ?? []) {
    if (typeof profile.id === "string" && typeof profile.role === "string") {
      roleById.set(profile.id, profile.role);
    }
  }

  const pathFor = (userId: string): string => {
    if (notificationType === "help_request") return "/responsavel/ajuda";
    if (roleById.get(userId) === "dependente") return "/dependente";
    return notificationType === "help_acknowledged"
      ? "/responsavel/ajuda"
      : "/responsavel/rotina";
  };

  webpush.setVapidDetails("mailto:suporte@conectatea.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  let sent = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    const userId = String(subscription.user_id ?? "");
    const path = pathFor(userId);
    const url = APP_BASE_URL ? `${APP_BASE_URL}${path}` : path;
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify({ title, body, url, tag, requireInteraction, urgent }),
      );
      sent += 1;
    } catch (cause) {
      failed += 1;
      const status =
        typeof cause === "object" && cause !== null && "statusCode" in cause
          ? Number((cause as { statusCode?: number }).statusCode)
          : 0;
      // Inscrição expirada ou revogada: remove do banco para não insistir.
      if (status === 404 || status === 410) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint);
      } else {
        console.error("Falha no envio push", cause);
      }
    }
  }

  return json({ sent, failed });
});
