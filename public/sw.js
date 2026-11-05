/*
 * Service worker do ConectaTEA.
 *
 * Estratégias:
 *  - Navegação (abrir/trocar de página): rede primeiro, com cache e página
 *    offline como reserva.
 *  - Arquivos com hash em /_next/static: cache primeiro (nunca mudam).
 *  - Demais arquivos do próprio site: cache com revalidação em segundo plano.
 *  - Requisições de outros domínios (Supabase, por exemplo) não são tocadas.
 *  - Push Web: exibe a notificação enviada pelo servidor e abre o app
 *    quando a pessoa toca nela.
 *
 * Ao mudar as estratégias de cache, aumente a VERSION para limpar o cache
 * antigo de quem já instalou o app.
 */
const VERSION = "conectatea-v4";
const CACHE_PREFIX = "conectatea-";
const STATIC_CACHE = `${CACHE_PREFIX}static-${VERSION}`;
const PAGES_CACHE = `${CACHE_PREFIX}pages-${VERSION}`;

// O service worker fica em <basePath>/sw.js. No GitHub Pages o basePath é
// /conectaTEA; em Vercel/local é vazio. O escopo é derivado da própria URL.
const BASE = new URL(self.location.href).pathname.replace(/\/sw\.js$/, "");
const OFFLINE_URL = `${BASE}/offline.html`;

const PRECACHE = [
  OFFLINE_URL,
  `${BASE}/manifest.json`,
  `${BASE}/mascote.jpeg`,
  `${BASE}/icons/icon-192.png`,
  `${BASE}/icons/icon-512.png`,
  `${BASE}/icons/icon-maskable-192.png`,
  `${BASE}/icons/icon-maskable-512.png`,
  `${BASE}/icons/apple-touch-icon.png`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Se um arquivo faltar, a instalação continua; os demais ficam em cache.
      await Promise.allSettled(
        PRECACHE.map((url) => cache.add(new Request(url, { cache: "reload" }))),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      // Remove apenas caches antigos deste app (a origem do GitHub Pages é
      // compartilhada com outros projetos).
      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith(CACHE_PREFIX) &&
              key !== STATIC_CACHE &&
              key !== PAGES_CACHE,
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

/*
 * Push Web (notificações com o app fechado):
 *  - "push" mostra a notificação vinda do servidor (Edge Function send-push).
 *  - "notificationclick" abre ou foca o app no destino indicado.
 */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "ConectaTEA", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "ConectaTEA";
  const urgent = Boolean(payload.urgent);
  const options = {
    body: payload.body || "",
    icon: `${BASE}/icons/icon-192.png`,
    badge: `${BASE}/icons/icon-192.png`,
    tag: payload.tag || "conectatea",
    requireInteraction: Boolean(payload.requireInteraction),
    renotify: Boolean(payload.tag),
    vibrate: urgent ? [400, 150, 400, 150, 800] : [150, 80, 150],
    silent: false,
    data: { url: payload.url || `${BASE}/dependente` },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  const target =
    (event.notification.data && event.notification.data.url) || `${BASE}/dependente`;
  event.notification.close();
  event.waitUntil(
    (async () => {
      const clientsArr = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clientsArr) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          await client.focus();
          if ("navigate" in client && client.url !== target) {
            try {
              await client.navigate(target);
            } catch {
              // Navegação não permitida neste cliente; a aba em foco já basta.
            }
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});

function inAppScope(url) {
  return url.pathname === BASE || url.pathname.startsWith(`${BASE}/`);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Só mexe no próprio site: chamadas ao Supabase (outro domínio) passam direto.
  if (url.origin !== self.location.origin) return;
  if (!inAppScope(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (url.pathname.startsWith(`${BASE}/_next/static/`)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES_CACHE);

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    // Alguns servidores usam /rota e outros /rota/; tenta a outra forma.
    const alternate = new URL(request.url);
    if (alternate.pathname.endsWith("/")) {
      alternate.pathname = alternate.pathname.slice(0, -1);
    } else {
      alternate.pathname = `${alternate.pathname}/`;
    }
    const alternateCached = await cache.match(alternate.toString(), {
      ignoreSearch: true,
    });
    if (alternateCached) return alternateCached;

    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;

    return new Response(
      "Você está offline. Conecte-se à internet e tente novamente.",
      {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      },
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) return cached;

  const response = await network;
  if (response) return response;

  return new Response(
    "Você está offline. Conecte-se à internet e tente novamente.",
    {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    },
  );
}
