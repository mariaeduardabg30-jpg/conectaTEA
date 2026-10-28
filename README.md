# ConectaTEA

Plataforma acolhedora para pessoas com Transtorno do Espectro Autista (TEA) e seus responsáveis.
O ConectaTEA reúne rotina, sons calmantes, registro de emoções e pedidos de ajuda em um só lugar,
com uma interface tranquila, previsível e acessível.

O projeto foi pensado para uso em **dispositivo compartilhado**: o responsável entra uma vez e,
na mesma sessão, cada dependente abre o seu próprio espaço.

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
- **Dependentes** — criação e edição de vários perfis, com avatar, cor e data de nascimento.

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
- Qualquer e-mail e senha com **4 caracteres ou mais** entram no app.
- Também há o botão **“Entrar na demonstração”** na tela de login.
- A base de exemplo já vem com dois dependentes (**Lia** e **Miguel**), rotina, emoções e um
  pedido de ajuda pendente.
- Abra a mesma demonstração em duas abas para ver o alerta de ajuda chegar em tempo real na área
  do responsável (via `BroadcastChannel`).

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

5. Reinicie o servidor de desenvolvimento.

Com as variáveis definidas, o app passa a usar o Supabase automaticamente. O nome exibido do
responsável é lido de `user_metadata.name` (definido no cadastro).

### Modelo de dados

| Tabela              | Conteúdo                                                                 |
| ------------------- | ------------------------------------------------------------------------ |
| `dependents`        | Perfis dos dependentes. `owner_id` referencia `auth.users`.               |
| `routine_items`     | Atividades da rotina, com horário, dias da semana e duração.             |
| `task_completions`  | Conclusões por atividade e data (única por `routine_item_id` + data).    |
| `emotion_logs`      | Registros emocionais com intensidade, motivo e data/hora.                |
| `help_requests`     | Pedidos de ajuda, com data/hora e reconhecimento pelo responsável.       |

A segurança é garantida por **Row Level Security (RLS)**: o responsável só acessa os dados dos
dependentes que lhe pertencem. A função `is_owner_of_dependent(uuid)` concentra essa verificação.

O alerta em tempo real usa a publicação `supabase_realtime` na tabela `help_requests`
(`REPLICA IDENTITY FULL`).

### Deploy

O app pode ser publicado em qualquer plataforma compatível com Next.js (Vercel, Netlify, etc.).
Basta configurar as duas variáveis `NEXT_PUBLIC_SUPABASE_*` no ambiente de produção e rodar o
build.

---

## 🗂️ Estrutura do projeto

```text
src/
├─ app/
│  ├─ (app)/                 # área autenticada (dependente e responsável)
│  ├─ entrar/                # login, cadastro e escolha de perfil
│  ├─ layout.tsx             # fontes, metadados e provider global
│  └─ page.tsx               # landing page
├─ components/               # componentes de interface e formulários
├─ lib/
│  ├─ audio/                 # motor de áudio (Web Audio API) e alertas
│  ├─ data/                  # contratos do backend + adaptadores demo/Supabase
│  ├─ hooks/                 # hooks reutilizáveis
│  ├─ date.ts, emotions.ts   # utilitários de datas e emoções
│  └─ types.ts               # tipos compartilhados
supabase/
└─ schema.sql                # schema completo do banco
```

### Arquitetura do backend

Toda a persistência passa por uma interface `Backend` (`src/lib/data/backend.ts`) com duas
implementações:

- `src/lib/data/demo.ts` — `localStorage` + `BroadcastChannel` (modo demonstração).
- `src/lib/data/supabase.ts` — Postgres, Auth e Realtime.

Os componentes consomem apenas o contexto `AppProvider`, sem saber qual adaptador está ativo.

---

## ⚠️ Limitações conhecidas

- **Dispositivo compartilhado:** o dependente não tem conta própria. O acesso usa a sessão do
  responsável, e a troca de perfil é feita pelo seletor no topo da tela. Para uso em vários
  dispositivos com contas separadas, seria necessário evoluir o modelo de autenticação.
- **Modo demonstração:** os dados ficam apenas no navegador e não são sincronizados entre
  dispositivos (o alerta de ajuda em tempo real funciona entre abas do mesmo navegador).
- **Sons:** são gerados em tempo real pelo navegador; alguns ambientes (por exemplo, navegadores
  sem suporte a Web Audio ou com áudio bloqueado) podem exigir uma interação inicial.
- **Notificações fora da aba:** o alerta do responsável funciona com a aba aberta. Notificações
  push em segundo plano estão fora do escopo atual.

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
