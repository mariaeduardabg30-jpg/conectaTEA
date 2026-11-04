# ConectaTEA

Plataforma acolhedora para pessoas com Transtorno do Espectro Autista (TEA) e seus responsáveis.
O ConectaTEA reúne rotina, sons calmantes, registro de emoções e pedidos de ajuda em um só lugar,
com uma interface tranquila, previsível e acessível.

O projeto tem **dois tipos de conta**:

- **Responsável** — acompanha a rotina, as emoções e os pedidos de ajuda de todos os seus
  dependentes.
- **Dependente** — entra com o próprio e-mail e senha e usa apenas o seu espaço.

O responsável também pode abrir a área de um dependente no mesmo dispositivo, o que ajuda no uso
de **tablet ou computador compartilhado**. Quando o dependente tem conta própria, o perfil é
vinculado pelo e-mail e os dois acessos veem os mesmos dados.

---

## ✨ Funcionalidades

### Área do dependente

- **Minha rotina** — atividades com horário, duração e dias da semana; marcação de concluído com
  um toque; visão do dia e progresso semanal.
- **Sons calmantes** — sons sintetizados no navegador (chuva, ondas, vento, ruído branco e outros),
  com play, pausa, parar, volume e timer.
- **Emoções** — escolha visual por emojis, intensidade, campo para explicar o motivo e histórico
  com data e hora.
- **Botão de ajuda** — sempre visível, com confirmação antes do envio para evitar toques
  acidentais.

### Área do responsável

- **Visão geral** — resumo do dia, progresso da rotina, emoções recentes e pedidos de ajuda.
- **Emoções** — registros agrupados por dia, com motivos e resumo semanal.
- **Rotina** — acompanhamento do que foi concluído e do que está pendente, por dependente e por
  semana.
- **Ajuda** — pedidos pendentes com alerta visual e sonoro em tempo real, identificação de quem
  pediu, horário e ação de reconhecer/acolher.
- **Dependentes** — criação e edição de vários perfis, com avatar, cor, e-mail e idade. O e-mail é
  o que vincula o perfil à conta do dependente.
- **Acesso** — login separado para responsável e dependente, cadastro com os dados de cada papel e
  recuperação de senha por e-mail (com Supabase).

### Acessibilidade e cuidado no design

- Interface em **português do Brasil**, com linguagem simples e acolhedora.
- Tipografia de alta legibilidade (Atkinson Hyperlegible) e títulos amigáveis (Nunito).
- Alvos de toque grandes, contraste adequado e navegação por teclado.
- Respeito a `prefers-reduced-motion` para reduzir animações.
- Paleta suave (creme, verde-azulado e terracota) para evitar estímulos excessivos.
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
- A tela de entrada tem abas separadas: **Sou responsável** e **Sou dependente**.
- Qualquer e-mail e senha com **4 caracteres ou mais** entram no app (o cadastro do dependente
  pede também a idade).
- Também há o botão **“Entrar com dados de exemplo”** em cada aba.
- A base de exemplo já vem com dois dependentes (**Lia** e **Miguel**), rotina, emoções e um
  pedido de ajuda pendente.
- Contas de exemplo (senha `demo` em todas):

  | Papel       | E-mail                  |
  | ----------- | ----------------------- |
  | Responsável | `familia@conectatea.app` |
  | Dependente  | `lia@conectatea.app`     |
  | Dependente  | `miguel@conectatea.app`  |

- Abra a demonstração em duas abas (uma como responsável, outra como dependente) para ver o alerta
  de ajuda chegar em tempo real na área do responsável (via `BroadcastChannel`).

Para começar do zero, limpe os dados do site no navegador (ou remova as chaves
`conectatea.demo.*` do `localStorage`).

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

- A **tela de abertura da última página visitada** abre pelo cache.
- Rotas ainda não visitadas mostram a página **“Você está sem conexão”**, com botão para tentar
  novamente.
- Ícones, logo e arquivos estáticos ficam em cache para o app abrir rápido.
- **Os dados** (rotina, emoções, ajuda) continuam precisando de internet, porque ficam no Supabase
  ou são sincronizados entre abas. Nenhum dado é apagado quando a conexão cai.

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

---

## 🗄️ Configuração com Supabase

1. Crie um projeto em [supabase.com](https://supabase.com/).
2. No **SQL Editor**, execute o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql).
   O script cria tabelas, índices, políticas de RLS e habilita o Realtime para pedidos de ajuda.
3. Em **Authentication → Providers → Email**, mantenha o login por e-mail e senha habilitado.
   Para testes rápidos, você pode desativar a confirmação de e-mail.
4. Copie `.env.local.example` para `.env.local` e preencha:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-publica
   ```

5. Em **Authentication → URL Configuration**, adicione a URL de retorno da recuperação de senha
   em **Redirect URLs**, por exemplo:

   ```text
   http://localhost:3000/redefinir-senha
   https://mariaeduardabg30-jpg.github.io/conectaTEA/redefinir-senha
   ```

6. Reinicie o servidor de desenvolvimento.

Com as variáveis definidas, o app passa a usar o Supabase automaticamente. O nome, o papel
(`responsavel` ou `dependente`) e a idade são enviados no cadastro via `user_metadata`; o gatilho
`handle_new_user` cria o perfil e, no caso do dependente, o espaço dele no banco.

Para conferir se o schema foi aplicado corretamente, rode
[`supabase/check_setup.sql`](./supabase/check_setup.sql) — ele é somente leitura e mostra `ok` ou
`FALTANDO` para cada item esperado. Se precisar recomeçar em um projeto de teste, use
[`supabase/reset.sql`](./supabase/reset.sql) (apaga os dados do app, não os usuários do Auth).

### Modelo de dados

| Tabela              | Conteúdo                                                                 |
| ------------------- | ------------------------------------------------------------------------ |
| `profiles`          | Uma linha por conta de login: `role`, nome, e-mail e idade.               |
| `dependents`        | Espaço de cada dependente. `owner_id` é o responsável; `user_id` é a conta de login do dependente (quando existe). |
| `routine_items`     | Atividades da rotina, com horário, dias da semana e duração.             |
| `task_completions`  | Conclusões por atividade e data (única por `routine_item_id` + data).    |
| `emotion_logs`      | Registros emocionais com intensidade, motivo e data/hora.                |
| `help_requests`     | Pedidos de ajuda, com data/hora e reconhecimento pelo responsável.       |

A segurança é garantida por **Row Level Security (RLS)**:

- `profiles`: cada conta lê e edita apenas o próprio perfil.
- `dependents`: o responsável acessa os perfis que criou (`owner_id`) e o dependente acessa o
  próprio espaço (`user_id`).
- Demais tabelas: o acesso é liberado pela função `can_access_dependent(uuid)`, que aplica a mesma
  regra. O nome antigo `is_owner_of_dependent(uuid)` continua existindo como alias.

O vínculo entre o perfil criado pelo responsável e a conta do dependente é feito pelo e-mail:
ao criar a conta, o gatilho `handle_new_user` procura um `dependents` sem `user_id` com o mesmo
e-mail e o vincula. Se o perfil for criado depois, o gatilho `link_dependent_account` faz o
caminho inverso. Quando o dependente cria a conta antes, o responsável pode cadastrar o perfil com
o mesmo e-mail: a função `claim_dependent_by_email` reivindica o espaço existente (sem duplicar)
e os dois passam a ver a mesma rotina, emoções e pedidos de ajuda.

O alerta em tempo real usa a publicação `supabase_realtime` na tabela `help_requests`
(`REPLICA IDENTITY FULL`).

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
3. Em **Settings → Secrets and variables → Actions → Variables**, crie (opcional, para usar o
   Supabase em produção):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   Sem elas o site publicado abre em modo demonstração.
4. Rode o workflow **Deploy no GitHub Pages** (Actions → Run workflow) ou faça um push na `main`.
5. No Supabase, adicione a URL publicada em **Authentication → URL Configuration → Redirect URLs**,
   incluindo o caminho `/redefinir-senha`.

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
│  └─ types.ts               # tipos compartilhados
public/
├─ manifest.json             # manifesto PWA
├─ sw.js                     # service worker (cache e offline)
├─ offline.html              # tela sem conexão
├─ icons/                    # ícones do app instalado
└─ mascote.jpeg              # logo/mascote
supabase/
├─ schema.sql                # schema completo do banco (v2, com papéis)
├─ check_setup.sql           # verificação somente leitura da estrutura
└─ reset.sql                 # reset destrutivo para projetos de teste
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
- **Perfis sem conta:** o responsável pode criar um perfil de dependente antes de o dependente ter
  login. Enquanto isso, ele abre esse espaço pelo seletor de perfil. Depois, basta cadastrar a
  conta com o mesmo e-mail para vincular.
- **Modo demonstração:** os dados ficam apenas no navegador e não são sincronizados entre
  dispositivos (o alerta de ajuda em tempo real funciona entre abas do mesmo navegador).
- **Sons:** são gerados em tempo real pelo navegador; alguns ambientes (por exemplo, navegadores
  sem suporte a Web Audio ou com áudio bloqueado) podem exigir uma interação inicial.
- **Notificações fora da aba:** o alerta do responsável funciona com a aba aberta. Notificações
  push em segundo plano estão fora do escopo atual.
- **Offline:** a interface instalada abre pelo cache, mas o carregamento de rotina, emoções e
  pedidos de ajuda depende de conexão com o Supabase. As telas visitadas continuam acessíveis e a
  página “Sem conexão” orienta a tentar novamente.

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
