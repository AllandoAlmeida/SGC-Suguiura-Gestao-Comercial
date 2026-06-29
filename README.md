# 🚀 SGC – Suguiura Gestão Comercial

SGC (Suguiura Gestão Comercial) é um sistema CRM desenvolvido para estruturar, organizar e gerenciar o processo comercial com foco em televendas.

O sistema permite controle total do funil de vendas, acompanhamento de leads, execução de follow-ups e gestão da equipe comercial, baseado em um modelo profissional de vendas.

---

# 🎯 Objetivo do Sistema

Transformar o setor comercial de uma operação reativa em uma operação estruturada, previsível e orientada a resultados.

---

# 🧠 Conceito do Sistema

O SGC foi construído com base em três pilares fundamentais:

- **Processo comercial estruturado**
- **Disciplina operacional**
- **Gestão baseada em dados**

O sistema não é apenas um CRM — ele é uma ferramenta de execução de vendas.

---

# 📊 Funcionalidades

## ✅ Gestão de Leads (CRUD)

- Cadastro completo de clientes
- Edição e atualização de dados
- Exclusão de registros
- Listagem e filtragem de leads

### Campos do Lead:
- Nome do cliente
- Telefone
- Origem (WhatsApp, Loja, E-mail, Prospecção)
- Produto
- Valor estimado
- Status
- Atendente responsável
- Data de entrada
- Último contato
- Próximo follow-up
- Observações

---

## ✅ Pipeline Comercial (Kanban)

Visualização do funil de vendas em formato Kanban com colunas:

- Novo
- Qualificado
- Orçamento
- Negociação
- Fechado
- Perdido

### Funcionalidades:
- Drag and drop entre etapas
- Atualização automática de status
- Visualização por atendente
- Filtros por período

---

## ✅ Dashboard Comercial

Indicadores estratégicos:

- Total de leads
- Leads em negociação
- Vendas fechadas
- Taxa de conversão
- Pipeline financeiro

### Visualizações:
- Distribuição por status
- Performance por atendente
- Alertas operacionais

---

## ✅ Follow-up (Crítico)

Sistema de acompanhamento de clientes com foco em conversão.

### Regras:
- Todo cliente deve ter follow-up definido
- Nenhum lead pode ficar sem ação futura

### Funcionalidades:
- Alerta de follow-up atrasado
- Lista de clientes para contato no dia
- Atualização de interações

---

## ✅ Gestão de Equipe

Divisão de funções:

### SDR (Pré-vendas)
- Entrada de leads
- Registro no sistema
- Qualificação
- Encaminhamento

### Closer (Vendas)
- Negociação
- Apresentação de proposta
- Fechamento
- Follow-up

---

## ✅ Histórico de Interações

Cada lead possui:

- Registro de contatos
- Histórico de negociações
- Evolução no funil

---

# 🔴 Regras de Negócio

O sistema segue regras obrigatórias para garantir controle e performance:

- Todo cliente deve ser registrado no sistema
- Não é permitido enviar orçamento sem diagnóstico
- Todo lead deve possuir follow-up
- Leads não podem ficar parados no pipeline
- SDR não realiza fechamento
- Cada lead deve ter um responsável definido

---

# 🔄 Processo Comercial (5 Etapas)

O sistema é baseado no método de vendas:

1. **Abordagem** – início da conversa com controle
2. **Diagnóstico** – entendimento da necessidade
3. **Apresentação** – proposta com valor
4. **Fechamento** – condução para decisão
5. **Follow-up** – recuperação de vendas

---

# 📈 Diferenciais

- Foco em televendas
- Pipeline baseado em comportamento comercial
- Estrutura orientada à conversão
- Integração com rotina de gestão
- Modelo pronto para escalar operação

---

# 🧭 Resultado Esperado

- Aumento da taxa de conversão
- Redução de perda de clientes
- Maior organização do setor
- Previsibilidade de vendas
- Controle total do funil comercial

---

# 🔥 Regra de Ouro

> Se não está no sistema, não existe comercialmente.

---

# 🛠️ Stack Técnica

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** (tema dashboard moderno, cores por status)
- **Prisma ORM** + **PostgreSQL**
- **NextAuth** (login por credenciais, sessão JWT) com papéis SDR / Closer / Admin
- **@dnd-kit** (drag-and-drop do Kanban) e **Recharts** (gráficos do dashboard)

---

# ▶️ Como Rodar (desenvolvimento)

### Pré-requisitos
- Node.js 18+ e npm
- Docker (para o PostgreSQL) — ou um PostgreSQL local

### 1. Instalar dependências
```bash
npm install
```

### 2. Subir o banco PostgreSQL
Com Docker (recomendado):
```bash
docker compose up -d
```
> Isso sobe um Postgres em `localhost:5432` (usuário `sgc`, senha `sgc`, banco `sgc`).
> Se preferir usar um Postgres próprio, ajuste `DATABASE_URL` no arquivo `.env`.

### 3. Configurar variáveis de ambiente
O arquivo `.env` já vem preenchido para desenvolvimento. Para referência, veja `.env.example`.
Em produção, gere um `NEXTAUTH_SECRET` forte.

### 4. Criar as tabelas e popular dados de exemplo
```bash
npm run setup
```
> Executa a migration inicial e o seed. Cria 3 usuários e 8 leads de exemplo.

### 5. Iniciar o servidor
```bash
npm run dev
```
Acesse **http://localhost:3000**

---

## 👤 Usuários de teste (senha: `123456`)

| E-mail | Papel | Permissões |
|--------|-------|------------|
| `admin@sgc.com` | Admin | Tudo |
| `sdr@sgc.com` | SDR | Cria leads e edita até "Qualificado" (não fecha venda) |
| `closer@sgc.com` | Closer | Negocia e fecha leads qualificados |

---

## 📜 Scripts úteis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run setup` | Migration inicial + seed |
| `npm run db:seed` | Repopula dados de exemplo |
| `npm run db:studio` | Abre o Prisma Studio (UI do banco) |
| `npm run lint` | Lint do projeto |

---

## ✅ Regras de negócio implementadas

- **Follow-up obrigatório**: não é possível salvar um lead sem `próximo follow-up` (validado no formulário e no banco).
- **Sem orçamento sem diagnóstico**: não se avança de "Novo" direto para "Orçamento/Negociação/Fechado" — é preciso passar por "Qualificado".
- **SDR não fecha venda**: papel SDR é bloqueado de mover leads além de "Qualificado"; apenas Closer/Admin fecham.
- **Todo lead tem responsável**: campo obrigatório.
- **Histórico automático**: toda mudança de status e cada mensagem/ligação é registrada no histórico do lead.
- **Leads inativos**: sinalizados automaticamente após `LEAD_INACTIVE_DAYS` (padrão 7) dias sem contato.
- **Alertas de follow-up atrasado**: exibidos no dashboard e na página de Follow-ups.
