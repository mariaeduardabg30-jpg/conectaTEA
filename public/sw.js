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
const VERSION = "conectatea-v6";
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

// Telas do app. Guardar todas na instalação faz o app inteiro abrir offline,
// mesmo em páginas que a pessoa ainda não visitou. Os arquivos JS/CSS citados
// em cada HTML também entram no cache.
const APP_ROUTES = [
  "/",
  "/entrar",
  "/recuperar-senha",
  "/redefinir-senha",
  "/dependente",
  "/dependente/rotina",
  "/dependente/sons",
  "/dependente/emocoes",
  "/responsavel",
  "/responsavel/rotina",
  "/responsavel/emocoes",
  "/responsavel/ajuda",
  "/responsavel/dependentes",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Se um arquivo faltar, a instalação continua; os demais ficam em cache.
      await Promise.allSettled(
        PRECACHE.map((url) => cache.add(new Request(url, { cache: "reload" }))),
      );
      await precacheAppShell();
      await self.skipWaiting();
    })(),
  );
});

/**
 * Baixa o HTML de cada tela e os arquivos /_next/static que ele referencia.
 * Assim o app abre offline mesmo antes de a pessoa navegar por todas as telas.
 */
async function precacheAppShell() {
  const pages = await caches.open(PAGES_CACHE);
  const assets = new Set();

  await Promise.allSettled(
    APP_ROUTES.map(async (route) => {
      const path = route === "/" ? `${BASE}/` : `${BASE}${route}/`;
      const plain = path.endsWith("/") ? path.slice(0, -1) : path;
      try {
        const response = await fetch(path, { cache: "reload" });
        if (!response || !response.ok) return;
        // O app usa /rota/ ou /rota dependendo da hospedagem: guarda as duas.
        await pages.put(path, response.clone());
        if (plain && plain !== path) await pages.put(plain, response.clone());
        const html = await response.text();
        for (const match of html.matchAll(/(?:src|href)="([^"]*\/_next\/static\/[^"]+)"/g)) {
          const value = match[1];
          assets.add(value.startsWith("/") ? value : `/${value}`);
        }

        // Payloads de navegação (RSC) que o Next busca ao trocar de tela. Sem
        // eles, trocar de página offline cairia na navegação completa.
        const flightPaths = [
          `${path}index.txt`,
          `${path}__next._full.txt`,
          `${path}__next._tree.txt`,
          `${path}__next.__PAGE__.txt`,
        ];
        if (plain && plain !== path) flightPaths.push(`${plain}.txt`);
        await Promise.allSettled(
          flightPaths.map(async (url) => {
            try {
              const flight = await fetch(url, { cache: "reload" });
              if (flight && flight.ok) await pages.put(url, flight);
            } catch {
              // Payload indisponível nesta hospedagem; ignora.
            }
          }),
        );
      } catch {
        // Rota indisponível agora; o cache de navegação cobre depois.
      }
    }),
  );

  await Promise.allSettled(
    [...assets].map(async (asset) => {
      try {
        const response = await fetch(asset, { cache: "reload" });
        if (response && response.ok) {
          const cache = await caches.open(STATIC_CACHE);
          await cache.put(asset, response);
        }
      } catch {
        // Será buscado na primeira navegação com internet.
      }
    }),
  );
}

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

// A função envia caminhos como /responsavel/ajuda. No GitHub Pages o app vive
// em /conectaTEA, então o caminho precisa ser prefixado com o base path do
// service worker antes de abrir a janela.
function resolveTarget(value) {
  const fallback = `${BASE}/dependente`;
  if (!value || typeof value !== "string") return fallback;
  if (/^https?:\/\//i.test(value)) return value;
  const path = value.startsWith("/") ? value : `/${value}`;
  if (BASE && (path === BASE || path.startsWith(`${BASE}/`))) return path;
  return `${BASE}${path}`;
}

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
    data: { url: resolveTarget(payload.url) },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  const target = resolveTarget(
    event.notification.data && event.notification.data.url,
  );
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
  const cached = await caches.match(request, { ignoreSearch: true });
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
  // `ignoreSearch` importa para os payloads .txt de navegação, que chegam com
  // um parâmetro de cache (_rsc) diferente a cada navegação.
  const cached = await caches.match(request, { ignoreSearch: true });

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
