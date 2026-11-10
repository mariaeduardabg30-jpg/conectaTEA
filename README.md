# ConectaTEA

Plataforma acolhedora para pessoas com Transtorno do Espectro Autista (TEA) e seus responsáveis.
O ConectaTEA reúne rotina, sons calmantes, registro de emoções e pedidos de ajuda em um só lugar,
com uma interface tranquila, previsível e acessível.

O projeto tem **dois tipos de conta** e exige cadastro para usar o app:

- **Responsável** — acompanha a rotina, as emoções, as tarefas e os pedidos de ajuda de todos os
  seus dependentes vinculados.
- **Dependente** — entra com o próprio e-mail e senha e usa apenas o seu espaço.

O responsável também pode abrir a área de um dependente no mesmo dispositivo, o que ajuda no uso
de **tablet ou computador compartilhado**. Quando o dependente tem conta própria, os dois acessos
passam a ver os mesmos dados — tradicionalmente pelo e-mail e agora também por um **código único de
vinculação** exibido na conta do dependente, que o responsável digita em **“Vincular dependente”**.

---

## ✨ Funcionalidades

### Área do dependente

- **Minha rotina** — atividades com horário, duração e dias da semana; cada atividade só pode ser
  concluída a partir do horário definido (com contagem regressiva e liberação automática), usando o
  relógio do próprio dispositivo; visão do dia e progresso semanal.
- **Meu código de vinculação** — código único de 8 caracteres, gerado automaticamente no cadastro,
  com botão para copiar e opção de gerar um novo (o anterior deixa de funcionar). É o que
  conecta a conta do dependente à do responsável.
- **Sons calmantes** — sons sintetizados no navegador (chuva, ondas, vento, ruído branco e outros),
  com play, pausa, parar, volume e timer.
- **Emoções** — escolha visual por emojis, intensidade, campo para explicar o motivo e histórico
  com data e hora.
- **Botão de ajuda** — sempre visível, com confirmação antes do envio para evitar toques
  acidentais; avisa o responsável vinculado na hora.

### Área do responsável

- **Visão geral** — resumo do dia, progresso da rotina, emoções recentes e pedidos de ajuda.
- **Vincular dependente** — campo para digitar o código exibido na conta do dependente; o banco
  valida o código e cria o vínculo, persistindo entre sessões e entre dispositivos (com Supabase
  configurado). Também é possível **adicionar pelo e-mail**, mas somente contas de dependente que
  já existem.
- **Emoções** — registros agrupados por dia, com motivos e resumo semanal.
- **Rotina** — acompanhamento do que foi concluído e do que está pendente, por dependente e por
  semana. O responsável também pode adicionar novas tarefas para o dependente diretamente por aqui.
- **Ajuda** — pedidos pendentes com alerta visual e sonoro em tempo real, identificação de quem
  pediu, horário e ação de reconhecer/acolher.
- **Notificações** — sino no topo com avisos de novas tarefas programadas, lembretes no horário
  programado e tarefas concluídas, com contador de não lidas e opção de ativá-las também em
  segundo plano (Web Push).
- **Dependentes** — adição (somente de contas de dependente que já existem), edição e remoção de
  perfis, com avatar, cor, e-mail e idade. Também podem ser vinculados pelo código de vinculação a
  qualquer momento.
- **Acesso** — somente contas criadas entram no app. Cadastro separado para responsável e
  dependente, recuperação de senha por e-mail (com Supabase) e redirecionamento para a tela de
  cadastro quando não há sessão.

### Acessibilidade e cuidado no design

- Interface em **português do Brasil**, com linguagem simples e acolhedora.
- Tipografia de alta legibilidade (Atkinson Hyperlegible) e títulos amigáveis (Nunito).
- Alvos de toque grandes, contraste adequado e navegação por teclado.
- Respeito a `prefers-reduced-motion` para reduzir animações.
- Paleta suave, em tons claros derivados das cores da logo (azul royal, turquesa, laranja,
  amarelo, vermelho e lilás) para evitar estímulos excessivos.
- Alertas com `role="alert"` e regiões `aria-live` para leitores de tela.

---

## 🧱 Stack

- [Next.js 16](https://nextjs.org/) (App Router) + React 19
- TypeScript
- Tailwind CSS v4
- [lucide-react](https://lucide.dev/) para ícones
- [Supabase](https://supabase.com/) (Postgres + Auth + Realtime) como backend de produção
- Web Audio API para sons e alertas (sem arquivos de áudio externos)

---

## 🚀 Como rodar

Requisitos: **Node.js 20+** e npm.

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Modo demonstração (sem configuração)

Se as variáveis do Supabase **não** estiverem definidas, o app inicia automaticamente em
**modo demonstração**:

- Os dados ficam no `localStorage` do navegador.
- A tela de entrada abre em **Criar conta** (para quem ainda não tem acesso); quem já tem conta
  troca para a aba **Entrar**.
- É preciso criar uma conta para usar o app: não existe entrada com um clique. As contas de
  exemplo abaixo existem para avaliação e também exigem digitar e-mail e senha na aba **Entrar**
  (senha `demo` em todas):

  | Papel       | E-mail                  |
  | ----------- | ----------------------- |
  | Responsável | `familia@conectatea.app` |
  | Dependente  | `lia@conectatea.app`     |
  | Dependente  | `miguel@conectatea.app`  |

- A base de exemplo já vem com dois dependentes (**Lia** e **Miguel**), rotina, emoções e um
  pedido de ajuda pendente. Apagar os dados do site (ou remover as chaves `conectatea.demo.*`)
  devolve a base ao estado inicial.
- Abra a demonstração em duas abas (uma como responsável, outra como dependente) para ver as
  notificações e o alerta de ajuda chegarem em tempo real na área do responsável
  (via `BroadcastChannel`). O código de vinculação de cada dependente aparece em
  **Meu dia → Meu código de vinculação**; digite-o em **Dependentes → Vincular dependente** na
  conta do responsável para criar o vínculo.
- **O código de vinculação só funciona no mesmo navegador.** O modo demonstração não tem banco
  compartilhado, então contas criadas em celulares, computadores ou navegadores diferentes não se
  enxergam. Para vincular de verdade entre aparelhos, configure o Supabase (veja
  [Configuração com Supabase](#️-configuração-com-supabase)).
- O lembrete de tarefa no horário programado é gerado pelo próprio app aberto (o modo
  demonstração não tem banco). Com o Supabase configurado, o lembrete é gerado pelo banco mesmo
  com o app fechado.

> O modo demonstração é apenas para avaliação. Ele **não** substitui autenticação real e não deve
> ser usado com dados sensíveis.

### Scripts

```bash
npm run dev     # servidor de desenvolvimento
npm run build   # build de produção
npm run start   # servir o build
npm run lint    # análise estática (ESLint)
```

---

## 📱 PWA (instalável e offline)

O ConectaTEA é uma **Progressive Web App**: pode ser instalado na tela inicial do celular, no
computador ou aberto como um app, sem loja de aplicativos.

- **Instalar no Android/Chrome:** abra o site e toque em **⋮ → Instalar app** (ou no aviso
  “Adicionar à tela inicial”).
- **Instalar no iPhone/iPad (Safari):** toque em **Compartilhar → Adicionar à Tela de Início**.
- **Instalar no computador (Chrome/Edge):** clique no ícone de instalação na barra de endereço.

### O que funciona offline

- **Todas as telas** do app abrem pelo cache, inclusive as que ainda não foram visitadas.
- **Rotina, emoções, pedidos de ajuda, notificações e perfis** aparecem com a última cópia
  salva no dispositivo.
- **Concluir atividades, registrar emoções, pedir ajuda e marcar notificações** continuam
  funcionando sem conexão. As ações entram em uma fila local e são enviadas automaticamente
  quando a internet volta.
- A sessão salva é restaurada sem internet, então o app abre já na conta da pessoa.
- Um aviso discreto informa quando o app está offline e quantas alterações aguardam envio.
- Entrar, criar conta, editar a rotina/perfis e gerar códigos de vínculo ainda precisam de
  internet (o app explica isso em vez de mostrar um erro técnico).

### Arquivos e funcionamento

| Arquivo | Função |
| --- | --- |
| `public/manifest.json` | Nome, cores, ícones, atalhos e modo `standalone`. |
| `public/sw.js` | Service worker: cache das páginas, arquivos estáticos e fallback offline. |
| `public/offline.html` | Tela exibida quando não há conexão nem cache da rota. |
| `public/icons/` | Ícones 192/512, maskable e Apple Touch. |
| `src/components/service-worker-register.tsx` | Registra o service worker respeitando o `basePath`. |

O service worker é registrado **apenas no build de produção** (não no `npm run dev`), para evitar
cache de arquivos antigos durante o desenvolvimento. Para testar:

```bash
npm run build
npm run start
```

Depois abra `http://localhost:3000`, navegue por algumas telas, desligue a internet (ou use
DevTools → Network → Offline) e recarregue. Para limpar o cache durante testes, use
DevTools → Application → Service Workers → **Unregister** e apague os caches
`conectatea-*`.

> No GitHub Pages, o app fica em `/conectaTEA/`; o manifesto, os ícones e o service worker usam
> esse caminho automaticamente. O cache do service worker só limpa entradas com o prefixo
> `conectatea-`, sem afetar outros projetos publicados na mesma origem.

### Se o app instalado não abrir

Se aparecer **“não foi possível abrir o aplicativo”** ao tocar no ícone:

1. Apague o ícone antigo do ConectaTEA (desinstale o app).
2. Abra `https://mariaeduardabg30-jpg.github.io/conectaTEA/` no Chrome/Safari.
3. Instale de novo pelo botão **Instalar app** (no topo do site) ou pelo menu do navegador.

Instalações antigas apontavam para `conecatea.com`, domínio que não existe mais; por isso o ícone
salvo antes da mudança não consegue abrir. Reinstalar pelo endereço atual corrige.

---

## 🗄️ Configuração com Supabase

1. Crie um projeto em [supabase.com](https://supabase.com/).
2. No **SQL Editor**, execute o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql).
   O script cria tabelas, índices, políticas de RLS, o código único de vinculação, as
   notificações para o responsável, o lembrete agendado (pg_cron) e o Realtime.
3. Em **Authentication → Providers → Email**, mantenha o login por e-mail e senha habilitado.
   Para testes rápidos, você pode desativar a confirmação de e-mail.
4. Copie `.env.local.example` para `.env.local` e preencha:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-publica
   # Opcional, para notificações push (ver "Notificações" abaixo):
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=sua-chave-publica-vapid
   ```

5. Em **Authentication → URL Configuration**, defina a **Site URL** com o endereço principal do
   app e cadastre as URLs de retorno em **Redirect URLs**:

   ```text
   Site URL (produção): https://mariaeduardabg30-jpg.github.io/conectaTEA/
   Redirect URLs:
   http://localhost:3000/redefinir-senha
   https://mariaeduardabg30-jpg.github.io/conectaTEA/redefinir-senha
   https://mariaeduardabg30-jpg.github.io/conectaTEA/redefinir-senha/
   ```

   O Supabase só aceita um `redirectTo` que esteja nessa lista. Se ele não bater, o link do
   e-mail cai na **Site URL** — por isso, com a Site URL em `http://localhost:3000`, o link de
   recuperação abre o localhost no celular e parece “quebrado”. Para testar em produção, a Site
   URL precisa ser a URL publicada no GitHub Pages.

6. Reinicie o servidor de desenvolvimento.

> No deploy do GitHub Pages, os valores de produção ficam em `.env.production` (versionado).

Com as variáveis definidas, o app passa a usar o Supabase automaticamente. O nome, o papel
(`responsavel` ou `dependente`) e a idade são enviados no cadastro via `user_metadata`; o gatilho
`handle_new_user` cria o perfil e, no caso do dependente, o espaço dele no banco.

Para conferir se o schema foi aplicado corretamente, rode
[`supabase/check_setup.sql`](./supabase/check_setup.sql) — ele é somente leitura e mostra `ok` ou
`FALTANDO` para cada item esperado. Se precisar recomeçar em um projeto de teste, use
[`supabase/reset.sql`](./supabase/reset.sql) (apaga os dados do app, não os usuários do Auth).

### Modelo de dados

| Tabela               | Conteúdo                                                                 |
| -------------------- | ------------------------------------------------------------------------ |
| `profiles`           | Uma linha por conta de login: `role`, nome, e-mail e idade.              |
| `dependents`         | Espaço de cada dependente. `owner_id` é o responsável; `user_id` é a conta de login do dependente (quando existe); `link_code` é o código único de vinculação. |
| `routine_items`      | Atividades da rotina, com horário, dias da semana e duração.             |
| `task_completions`   | Conclusões por atividade e data (única por `routine_item_id` + data).   |
| `emotion_logs`       | Registros emocionais com intensidade, motivo e data/hora.               |
| `help_requests`      | Pedidos de ajuda, com data/hora e reconhecimento pelo responsável.      |
| `notifications`      | Notificações do responsável (tarefas, lembretes e conclusões). Criadas exclusivamente pelo banco (triggers e `run_task_reminders`); o cliente apenas lê e marca como lida. |
| `push_subscriptions` | Inscrições Web Push por dispositivo, usadas pela Edge Function `send-push`. |

### Vinculação por código (como funciona)

1. Ao cadastrar o dependente (pelo próprio dependente ou pelo responsável), o banco gera um
   `link_code` único (8 caracteres, alfabeto sem letras/números ambíguos) — exibido no app como
   `XXXX-XXXX`.
2. O dependente vê o código em **Meu dia → Meu código de vinculação**, com botão de copiar e
   opção de gerar um código novo (o antigo passa a ser recusado).
3. O responsável abre **Dependentes → Vincular dependente**, digita o código e confirma. A
   função `link_dependent_by_code(code)` valida no banco:
   - código inexistente ou malformado → “Código inválido ou não encontrado…”;
   - código de um dependente já vinculado a outro responsável → “Este dependente já está
     vinculado a outro responsável.”;
   - código válido → o espaço do dependente passa a pertencer ao responsável, com persistência
     garantida pelo banco (sai e entra e o vínculo continua). Com o Supabase configurado, o código
     funciona mesmo quando a conta do dependente foi criada em outro dispositivo ou navegador.
4. Perfis já vinculados pelo e-mail continuam funcionando como antes; a vinculação por código é
   um caminho adicional, não substitui a anterior.

### Notificações

Quando o dependente **cria/programa uma tarefa**, **conclui uma tarefa** ou **pede ajuda**, o
banco insere uma linha em `notifications` para cada responsável vinculado daquele dependente, com
deduplicação por (destinatário, tipo, tarefa, data) — não há alertas repetidos para o mesmo evento.
Além disso, `run_task_reminders()` é executada a cada minuto pelo **pg_cron** e cria o lembrete
**para o dependente e para o responsável**, nomeando a atividade, **mesmo com o app fechado**. A
janela do lembrete começa 5 minutos antes do horário e termina 2 minutos depois, para não perder o
aviso de uma tarefa criada em cima da hora.

O fuso usado é o do dispositivo de cada conta: no login, o app grava
`Intl.DateTimeFormat().resolvedOptions().timeZone` em `profiles.timezone`, e o banco converte
`now()` para esse fuso antes de comparar com o horário da atividade. Assim o alarme não depende do
fuso do servidor. A conclusão de cada atividade também usa o relógio local do aparelho: o botão
fica bloqueado com a contagem “Libera em X min” e é liberado sozinho no horário, sem recarregar.

No app, o sino no topo mostra as não lidas (para os dois papéis), toca um tom suave (quando o app
está aberto), o relógio do dispositivo fica visível no cabeçalho e um aviso de **Hora da tarefa**
aparece em qualquer página até ser dispensado. Com a permissão de notificações concedida, também
dispara um aviso do navegador quando a aba está em segundo plano. Com o **Web Push** ativado, o
aviso chega até com o app fechado:

1. Gere um par de chaves VAPID:

   ```bash
   npx web-push generate-vapid-keys
   ```

2. No **SQL Editor**, confirme que o `schema.sql` rodou até o fim (ele cria
   `push_subscriptions` e agenda o lembrete). Se o `pg_cron` ou o `pg_net` não estiverem
   disponíveis, o script mostra um `WARNING` e todo o restante é aplicado normalmente — basta
   ativar as extensões em **Database → Extensions** e rodar de novo.

3. Faça o deploy da Edge Function [`supabase/functions/send-push`](./supabase/functions/send-push/index.ts):

   ```bash
   supabase functions deploy send-push --no-verify-jwt
   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... WEBHOOK_SECRET=escolha-um-segredo-longo
   ```

4. **Plano Free (sem Database Webhooks):** o `schema.sql` instala o `pg_net` e cria o trigger
   `notifications_dispatch_push`, que chama a função a cada notificação criada pelo banco — o
   mesmo papel de um webhook, sem precisar do plano Pro. Guarde no **Vault** a URL do projeto e
   o mesmo valor de `WEBHOOK_SECRET`:

   ```sql
   select vault.create_secret('https://SEU-PROJETO.supabase.co', 'conectatea_project_url');
   select vault.create_secret('sua-chave-anon-publica', 'conectatea_anon_key');
   select vault.create_secret('escolha-um-segredo-longo', 'conectatea_webhook_secret');
   ```

   A chave anon é pública e só serve para passar pelo gateway da função; a autorização do envio
   usa o `WEBHOOK_SECRET`. Sem esses segredos o trigger não envia nada (e não quebra o app). O
   pedido de ajuda é a exceção: o próprio app do dependente chama a função no instante do toque,
   então ele chega ao responsável mesmo com o app deste fechado. O trigger ignora `help_request`
   para não duplicar o aviso.

5. **Plano Pro (opcional):** em **Database → Webhooks**, você pode apontar um webhook de
   **INSERT** na tabela `public.notifications` para a função, com o header
   `x-webhook-secret: <WEBHOOK_SECRET>`. Nesse caso, não crie webhook em `help_requests` e
   mantenha o `pg_net` desativado para não receber o mesmo aviso duas vezes.

6. No build do site, defina `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (a chave **pública** gerada no passo 1)
   — na Vercel/Node como variável de ambiente; no GitHub Pages, em
   **Settings → Secrets and variables → Actions → Variables**.
7. No app, o aviso global de **Notificações no aparelho** aparece no topo (ou toque no sino →
   **Ativar notificações**). Ele pergunta a permissão para notificações neste dispositivo e,
   quando o push está configurado, já cria a inscrição. Vale para as duas contas: o responsável
   recebe pedidos de ajuda e novidades da rotina; o dependente recebe os lembretes das próprias
   atividades. Cada dispositivo da família faz a inscrição uma vez; as inscrições ficam em
   `push_subscriptions` (o próprio titular gerencia os dispositivos dele).

Se a push não for configurada, tudo funciona normalmente com o app aberto (sino, som e alertas);
apenas o envio com o app fechado deixa de existir.

A segurança é garantida por **Row Level Security (RLS)**:

- `profiles`: cada conta lê e edita apenas o próprio perfil.
- `dependents`: o responsável acessa os perfis que criou ou vinculou (`owner_id`) e o dependente
  acessa o próprio espaço (`user_id`). O `link_code` só é visível para quem já acessa o espaço.
- Demais tabelas: o acesso é liberado pela função `can_access_dependent(uuid)`, que aplica a mesma
  regra. O nome antigo `is_owner_of_dependent(uuid)` continua existindo como alias.
- `notifications`: cada conta lê apenas as próprias notificações e só pode alterar a coluna
  `read_at`. Inserir/apagar é inacessível pelo cliente — só o banco cria notificações, sempre para
  o destinatário do evento (responsável e/ou a própria conta do dependente).
- `push_subscriptions`: cada conta gerencia apenas as próprias inscrições.

O vínculo entre o perfil criado pelo responsável e a conta do dependente pode ser feito pelo
e-mail ou pelo **código de vinculação**:

- **Por e-mail:** ao criar a conta, o gatilho `handle_new_user` procura um `dependents` sem
  `user_id` com o mesmo e-mail e o vincula. Se o perfil for criado depois, o gatilho
  `link_dependent_account` faz o caminho inverso. Quando o dependente cria a conta antes, o
  responsável pode cadastrar o perfil com o mesmo e-mail: a função `claim_dependent_by_email`
  reivindica o espaço existente (sem duplicar). Tanto a função quanto o gatilho
  `validate_dependent_email` conferem a conta em `profiles`/`auth.users`: e-mail sem conta de
  dependente é recusado, inclusive na edição de um perfil.
- **Por código:** a função `link_dependent_by_code(code)` reivindica o espaço do dependente a
  partir do código de 8 caracteres exibido na conta dele. Se o código estiver livre e a conta do
  responsável for de responsável, o espaço passa a pertencer a ele — sem precisar conhecer o
  e-mail do dependente.

O alerta em tempo real usa a publicação `supabase_realtime` nas tabelas `help_requests` e
`notifications`.

### Deploy

O app é 100% cliente (a sessão e os dados ficam no Supabase), então roda tanto em servidor Node
(Vercel, Netlify etc.) quanto como site estático no GitHub Pages.

#### GitHub Pages

O workflow [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) gera a
exportação estática e publica em:

```text
https://mariaeduardabg30-jpg.github.io/conectaTEA/
```

Antes do primeiro deploy, no GitHub:

1. Em **Settings → Pages → Build and deployment → Source**, escolha **GitHub Actions**.
2. Ainda em **Settings → Pages → Custom domain**, remova `conecatea.com` se ele aparecer ali.
   O domínio não está registrado e o redirecionamento para ele impede o site de abrir.
3. As chaves do Supabase ficam no arquivo [`.env.production`](./.env.production) versionado neste
   repositório. A chave **anon** é pública por design; a proteção dos dados vem das políticas RLS.
   Nunca coloque a chave `service_role` no repositório. Para trocar de projeto, edite esse arquivo.
4. Se quiser notificações push, crie a Variable `NEXT_PUBLIC_VAPID_PUBLIC_KEY` em
   **Settings → Secrets and variables → Actions → Variables** (veja “Notificações”).
5. Rode o workflow **Deploy no GitHub Pages** (Actions → Run workflow) ou faça um push na `main`.
6. No Supabase, em **Authentication → URL Configuration**, coloque a URL publicada em **Site URL**
   e adicione as variantes com e sem barra final em **Redirect URLs**, com o caminho
   `/redefinir-senha`. Sem isso, o link do e-mail de recuperação é redirecionado para a Site URL
   (normalmente `http://localhost:3000`) e não abre no celular.

> **Por que o site não abria:** o arquivo `CNAME` apontava para `conecatea.com`, mas esse domínio
> não está registrado (o DNS não resolve). O GitHub Pages redirecionava o endereço válido do
> `github.io` para `http://conecatea.com`, que não existe — por isso o navegador exibia aviso de
> site inseguro/risco. O `CNAME` foi removido e o site volta a ser publicado no endereço do
> `github.io`. Se o domínio for registrado depois, configure-o em **Settings → Pages → Custom
> domain**, crie o `CNAME` novamente e adicione a URL do domínio nas Redirect URLs do Supabase.

#### Outras plataformas

Na Vercel/Netlify, importe o repositório, configure as duas variáveis `NEXT_PUBLIC_SUPABASE_*` e
use o build padrão (`npm run build`). O build normal continua como servidor Next.js; a exportação
estática só é ativada quando `GITHUB_PAGES=true`.

---

## 🗂️ Estrutura do projeto

```text
src/
├─ app/
│  ├─ (app)/                 # área autenticada (dependente e responsável)
│  ├─ entrar/                # login, cadastro e escolha de perfil
│  ├─ recuperar-senha/       # pedido de link de recuperação
│  ├─ redefinir-senha/       # definição da nova senha após o link
│  ├─ layout.tsx             # fontes, metadados e provider global
│  └─ page.tsx               # landing page
├─ components/               # componentes de interface e formulários
├─ lib/
│  ├─ audio/                 # motor de áudio (Web Audio API) e alertas
│  ├─ data/                  # contratos do backend + adaptadores demo/Supabase
│  ├─ hooks/                 # hooks reutilizáveis
│  ├─ date.ts, emotions.ts   # utilitários de datas e emoções
│  ├─ link-code.ts           # geração e formatação do código de vinculação
│  ├─ push.ts                # inscrição em notificações Web Push
│  └─ types.ts               # tipos compartilhados
public/
├─ manifest.json             # manifesto PWA
├─ sw.js                     # service worker (cache, offline e push)
├─ offline.html              # tela sem conexão
├─ icons/                    # ícones do app instalado
└─ mascote.jpeg              # logo oficial do ConectaTEA
supabase/
├─ schema.sql                # schema completo do banco (v3)
├─ check_setup.sql           # verificação somente leitura da estrutura
├─ reset.sql                 # reset destrutivo para projetos de teste
└─ functions/send-push/      # Edge Function que envia as notificações push
```

### Arquitetura do backend

Toda a persistência passa por uma interface `Backend` (`src/lib/data/backend.ts`) com duas
implementações:

- `src/lib/data/demo.ts` — `localStorage` + `BroadcastChannel` (modo demonstração).
- `src/lib/data/supabase.ts` — Postgres, Auth e Realtime.

Os componentes consomem apenas o contexto `AppProvider`, sem saber qual adaptador está ativo.

---

## ⚠️ Limitações conhecidas

- **Dois tipos de conta:** responsável e dependente têm cadastros e telas separadas. O dependente
  usa apenas o próprio espaço; o responsável acompanha os dependentes que criou. Cada conta vê
  somente os dados permitidos pelo RLS.
- **Adicionar dependente:** só é possível adicionar uma conta de dependente que **já existe**. O
  responsável informa o e-mail usado no cadastro do dependente; se não houver conta com esse
  e-mail, a adição é recusada. Isso garante que o responsável consiga acompanhar e criar tarefas
  para o dependente de verdade.
- **Modo demonstração:** os dados ficam apenas no navegador e não são sincronizados entre
  dispositivos (as notificações em tempo real funcionam entre abas do mesmo navegador). O lembrete
  de tarefa no horário é gerado pelo app aberto; sem Supabase não há envio com o app fechado.
- **Notificações push:** o envio em segundo plano exige Supabase configurado, a Edge Function
  `send-push` publicada, os dois Database Webhooks e as chaves VAPID (veja “Notificações”). Sem
  eles, os avisos funcionam apenas com o app aberto. Em iPhone/iPad, push exige o app instalado
  na tela de início (iOS 16.4+).
- **Sons:** são gerados em tempo real pelo navegador; alguns ambientes (por exemplo, navegadores
  sem suporte a Web Audio ou com áudio bloqueado) podem exigir uma interação inicial. O alerta de
  ajuda toca em sequência e se repete por até 30 segundos (ou até ser acolhido/dispensado) enquanto
  o app está aberto. Com o app fechado, quem toca o som é o sistema operacional, conforme as
  permissões e o modo silencioso do aparelho — em iPhone/iPad o push exige o app instalado na tela
  de início e o som pode ser suprimido pelo sistema.

- **Offline:** as telas abrem pelo cache e mostram a última cópia salva de rotina, emoções e
  pedidos de ajuda. Ações feitas sem conexão ficam em uma fila no dispositivo e são enviadas
  automaticamente quando a internet volta. Só entram/criam conta, edições de rotina/perfis e
  geração de códigos de vínculo exigem conexão.

---

## 🧪 Qualidade

```bash
npm run lint
npm run build
```

O projeto mantém build de produção e análise estática sem erros.

---

## 💚 Propósito

O ConectaTEA nasceu para tornar o dia a dia mais previsível e acolhedor para pessoas autistas e
para quem cuida delas. Cada detalhe — das cores aos tempos de resposta — foi pensado para reduzir
ansiedade e favorecer a comunicação.
