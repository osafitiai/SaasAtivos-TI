# Gestão de Ativos OSAFI

SaaS web responsivo para controle completo do ciclo de vida dos ativos corporativos da OSAFI —
substitui a planilha de controle por uma aplicação centralizada, segura, auditável e escalável.

Construído a partir do documento `SRS_SaaS_Gestao_de_Ativos_OSAFI.md`.

- **Idioma:** Português do Brasil
- **Moeda:** Real (BRL)
- **Fuso horário:** America/Sao_Paulo

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend/Backend | Next.js 15 (App Router) + React 19 + TypeScript |
| Estilo | Tailwind CSS 3 (tema claro/escuro) |
| Banco de dados | PostgreSQL 16 (via Docker) |
| Autenticação | Própria — senha (bcrypt) + sessão JWT (jose) em cookie httpOnly |
| Gráficos | Recharts |
| Planilhas | SheetJS (xlsx) — importação e exportação |
| Armazenamento de anexos | Filesystem local (`./storage`) |

---

## Pré-requisitos

- **Node.js 20+**
- **Docker** e **Docker Compose** (para o PostgreSQL)

---

## Instalação e execução

```bash
# 1. Instalar dependências
npm install

# 2. Copiar variáveis de ambiente (ajuste se necessário)
cp .env.example .env

# 3. Subir o banco, aplicar migrations e popular dados de demonstração
#    (equivale a: docker compose up -d + migrate + seed)
npm run setup

# 4. Rodar em desenvolvimento
npm run dev
```

Acesse **http://localhost:3000**.

### Credenciais de demonstração

| Usuário | E-mail | Perfil |
|---|---|---|
| Administrador | `admin@osafi.com.br` | Administrador do tenant |
| Gestor de TI | `ti@osafi.com.br` | Gestor de TI |
| Técnico | `tecnico@osafi.com.br` | Técnico de TI |
| Financeiro | `financeiro@osafi.com.br` | Financeiro / Controladoria |
| Auditor | `auditor@osafi.com.br` | Auditor (somente leitura) |

**Senha para todos:** `osafi123`

> Os perfis financeiros veem valores; auditor é somente leitura; técnico não acessa configurações críticas (RBAC — SRS seção 18).

---

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run db:up` / `db:down` | Sobe/derruba o PostgreSQL (Docker) |
| `npm run db:migrate` | Aplica as migrations SQL |
| `npm run db:seed` | Popula dados de demonstração |
| `npm run db:reset` | Recria o schema e repopula (**destrutivo** — ver aviso abaixo) |
| `npm run setup` | Faz tudo: sobe DB + migrate + seed |

> ⚠️ **Proteção contra perda de dados:** `db:seed` e `db:reset` **apagam** o tenant/schema.
> Ambos abortam automaticamente se o banco já contiver dados. Para forçar (apenas em teste):
>
> ```bash
> # PowerShell
> $env:MIGRATE_FORCE="true"; $env:SEED_FORCE="true"; npm run db:reset
> # Bash
> MIGRATE_FORCE=true SEED_FORCE=true npm run db:reset
> ```
>
> **Nunca** rode `db:reset` / `db:seed` em produção.

---

## Estrutura

```
db/migrations/        Migrations SQL (schema, índices, constraints)
scripts/              migrate, seed, wait-db (TypeScript via tsx)
src/
  app/
    (app)/            Rotas autenticadas (dashboard, ativos, colaboradores, ...)
    api/              Route handlers (import, export, reports, documents, jobs)
    login/ logout/    Autenticação
  components/         Componentes reutilizáveis (tabelas, modais, gráficos, badges)
  lib/                db, auth, rbac, audit, notifications, alerts, format, constants
storage/              Anexos enviados (criado em runtime)
```

---

## Módulos implementados (MVP completo do SRS)

- **Autenticação** e sessão segura (logout em todos os dispositivos, bloqueio de usuário)
- **Multiempresa** — todo registro possui `tenant_id`
- **Administração** — empresas, filiais, departamentos, localizações, categorias, usuários/RBAC
- **Colaboradores** — cadastro + tela de detalhe (ativos vinculados, histórico, pendências)
- **Ativos** — CRUD em etapas, dados técnicos, filtros, busca, paginação, exportação, detalhe com abas
- **Movimentações** — entrega/devolução/transferência **transacional** com histórico imutável
- **Manutenções** — ordens de serviço, custo acumulado, alerta de custo elevado
- **Inventários** — campanhas de conferência física com divergências
- **Licenças de software**, **Fornecedores**, **Documentos/anexos**
- **Aprovações** — fluxo de baixa patrimonial (solicitação → aprovação → bloqueio)
- **Dashboard** — indicadores, gráficos e alertas
- **Relatórios** — 13 relatórios exportáveis (XLSX/CSV)
- **Importação** — assistente XLSX da planilha OSAFI (com pré-visualização e detecção de duplicidades)
- **Notificações** — central + rotina diária de alertas
- **Auditoria** — trilha completa de ações (não editável por usuários comuns)

---

## Regras de negócio críticas (implementadas)

- Número de série e patrimônio únicos por tenant (constraint parcial no banco)
- Um ativo físico possui **apenas uma atribuição principal aberta** (índice único parcial)
- Transferência encerra o vínculo anterior e cria um novo (transação)
- Previsão de substituição calculada por `data_aquisicao + vida_util`
- Histórico nunca é sobrescrito; baixas preservam o histórico
- Ativo baixado não pode ser entregue nem enviado para manutenção
- Colaborador desligado não recebe novos ativos e gera alerta se tiver pendências
- Valores financeiros restritos a perfis autorizados
- Toda ação importante gera log de auditoria

---

## Automação de alertas

A rotina diária (SRS seção 28) pode ser disparada por um agendador:

```bash
# Com um administrador autenticado, ou via CRON_SECRET
curl -X POST http://localhost:3000/api/jobs/alerts \
  -H "Authorization: Bearer $CRON_SECRET"
```

Gera notificações para: substituições vencidas/próximas, garantias e licenças a vencer,
empréstimos e manutenções atrasados, e colaboradores desligados com ativos.
Usa `alert_dispatch_log` para evitar envio repetitivo.

---

## Importar a planilha OSAFI

1. Acesse **Administração → Importação da planilha**
2. Selecione o arquivo `.xlsx`
3. Clique em **Pré-visualizar** (nada é gravado — mostra o que será criado e duplicidades)
4. Clique em **Confirmar importação**

As abas *Colaboradores*, *Cadastro de Ativos* e *Histórico de Manutenção* são reconhecidas
automaticamente. Categorias, departamentos e localizações ausentes são criados.

---

## Segurança

- Isolamento por `tenant_id` em todas as consultas
- Senhas com hash bcrypt; sessão JWT assinada em cookie `httpOnly`
- RBAC por perfil (SRS seção 18)
- Validação no backend; exclusão lógica em registros críticos
- Upload valida extensão/tamanho; download exige sessão e registra auditoria
- Trilha de auditoria com IP e user-agent

> **Produção:** troque `AUTH_SECRET` por um valor aleatório longo, use HTTPS, e considere
> mover o armazenamento de anexos para S3 e habilitar backups do PostgreSQL.
