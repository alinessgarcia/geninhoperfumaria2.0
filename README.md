# Geninho Perfumaria • Sistema de Gestão (Codex-ready)

Este repositório contém o aplicativo web de gestão da **Geninho Perfumaria**.

O objetivo deste README é permitir que **qualquer nova sessão do ChatGPT Codex** consiga:
- entender o projeto rapidamente,
- rodar localmente,
- validar mudanças,
- e continuar evoluindo o sistema sem perder contexto.

---

## 1) Visão geral do projeto

Aplicação Next.js (App Router) para gestão de:
- **Produtos/Estoque** (nome, categoria, ml, estoque, custo e preço de venda),
- **Clientes** (novo/antigo, histórico de problema, contato e endereço),
- **Vendas** (forma de pagamento, parcelas, sinal),
- **Resumo** semanal/mensal de faturamento e lucro estimado.

### Estado atual da persistência
Atualmente os dados são persistidos em **`localStorage`** (client-side).
> Isso significa que os dados ficam no navegador local e não em banco remoto.

---

## 2) Stack técnica

- **Framework:** Next.js `16.1.6`
- **UI:** React `19.2.3`
- **Linguagem:** TypeScript
- **Lint:** ESLint
- **Build check customizado:** script que valida existência de `app/` ou `pages/` antes do build

---

## 3) Estrutura importante de pastas

```txt
app/
  globals.css          # tema visual vermelho/dourado e estilos globais
  layout.tsx           # layout raiz + metadata
  page.tsx             # tela principal com CRUD e lógica de negócio
scripts/
  check-next-structure.mjs   # precheck para garantir estrutura Next válida
package.json
README.md
```

---

## 4) Como rodar o projeto localmente

1. Instalar dependências:

```bash
npm install
```

2. Rodar em desenvolvimento:

```bash
npm run dev
```

3. Abrir no navegador:

```txt
http://localhost:3000
```

---

## 5) Como validar antes de subir alteração

Executar:

```bash
npm run lint
npm run build
```

### Observação importante de deploy
O projeto possui `prebuild` com verificação de estrutura:
- se não houver `app/` nem `pages/`, o build falha com mensagem clara.

---

## 5.1) Banco de dados (Supabase)

Este projeto usa Supabase para persistir dados.

1. Crie um projeto no Supabase.
2. No SQL Editor, execute o script `supabase/schema.sql`.
3. Configure variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Para scripts de ingestão, usar:
   - `SUPABASE_SERVICE_ROLE_KEY` (somente servidor, nunca no front-end)

---

## 5.2) Ingestão diária de notícias (para manter atividade)

Objetivo: registrar notícias do mercado de perfumaria no banco para manter o Supabase ativo.

1. Instale dependências do script:

```bash
pip install -r scripts/requirements-news.txt
```

2. Crie `scripts/.env` com:

```txt
SUPABASE_URL=<url-do-projeto>
SUPABASE_SERVICE_ROLE_KEY=<chave-service-role>
NEWS_FEEDS=<rss1,rss2,rss3>
```

3. Rode manualmente:

```bash
python scripts/news_ingest.py
```

4. Agende execução diária no Windows (Task Scheduler) para manter ingestão automática.

---

## 5.3) Ingestão via Vercel Cron (recomendado)

Para rodar no servidor, foi criado o endpoint:
`/api/ingest-news`

No Vercel, configure variáveis:
- `NEWS_FEEDS` (RSS separados por vírgula)
- `SUPABASE_SERVICE_ROLE_KEY` (somente servidor)

O cron está configurado em `vercel.json` para 08:00 BRT
(11:00 UTC).

---

## 5.4) Backup diário para Google Drive (recomendado)

Foi criado o endpoint:
`/api/backup-drive`

Ele gera CSVs das tabelas e envia para uma pasta no Google Drive via
Service Account.

Variáveis necessárias no Vercel (server-side):
- `GDRIVE_SERVICE_ACCOUNT_JSON` (JSON completo do service account)
- `GDRIVE_FOLDER_ID` (ID da pasta do Drive)
- `SUPABASE_SERVICE_ROLE_KEY`

O cron está configurado em `vercel.json` para 02:00 BRT (05:00 UTC).

---

## 6) Como “conectar” o ChatGPT Codex a este projeto

Se você quer continuar desenvolvimento com Codex sem ele “começar do zero”, faça assim:

1. **Abra o Codex no diretório raiz do projeto** (onde está este `README.md`).
2. Garanta que os arquivos principais existem no workspace (`app/`, `package.json`, etc.).
3. No primeiro prompt, peça para o Codex:
   - ler `README.md`,
   - ler `package.json`,
   - rodar `npm run lint` e `npm run build`,
   - e só depois implementar a tarefa.
4. Sempre descreva o objetivo de negócio junto com critérios técnicos (ex.: “baixar estoque ao vender”, “não quebrar build”).
5. Exija no final:
   - resumo do que mudou,
   - comandos de validação executados,
   - commit realizado.

### Prompt base sugerido para iniciar nova sessão Codex

```txt
Leia primeiro README.md e package.json para entender o projeto.
Depois rode npm run lint e npm run build para validar estado atual.
Em seguida implemente: <SUA TAREFA>.
Ao final, faça commit e me entregue resumo + testes executados.
```

---

## 7) Regras de negócio já implementadas

- Cadastro e edição de produtos e clientes.
- Exclusão de produtos/clientes.
- Registro de venda com validação de dados mínimos.
- Bloqueio de venda quando estoque está zerado.
- Baixa automática de estoque ao registrar venda.
- Feedback textual de sucesso/erro na UI.

---

## 8) Próximos passos recomendados (prioridade)

1. **Migrar de localStorage para banco** (ex.: Supabase).
2. Implementar autenticação (admin/vendedor).
3. Criar histórico de movimentação de estoque (entradas/saídas).
4. Dashboard com filtros por período, categoria e cliente.
5. Exportação de relatórios (Excel/PDF).
6. Backup/restauração dos dados.

---

## 9) Convenções para futuros agentes Codex

- Não remover pasta `app/` sem migrar para `pages/`.
- Sempre rodar `lint` e `build` antes de finalizar tarefa.
- Evitar mudanças visuais grandes sem manter legibilidade (botões grandes, fluxo claro).
- Em alterações de UX/UI, gerar screenshot para revisão.

---

## 10) Status

Projeto funcional para operação inicial local.
Pronto para próxima fase: persistência em backend + autenticação + relatórios.
