# Planna

Planna é uma plataforma de planejamento e acompanhamento adaptativo de estudos para estudantes universitários.

O produto transforma cursos, disciplinas, conteúdos, eventos acadêmicos, prioridades, estimativas e disponibilidade em um planejamento executável. Também registra a execução real, identifica atrasos e propõe replanejamentos que somente são aplicados após confirmação do aluno.

## Estado atual

O projeto possui a especificação do MVP e a fundação técnica inicial em um monorepo:

- `apps/web`: Next.js, TypeScript e PWA instalável, sem suporte offline;
- `apps/api`: NestJS e Prisma;
- banco: PostgreSQL no Supabase;
- autenticação planejada: Supabase Auth, mediada pela API.

## Desenvolvimento local

Requisitos: Node.js 24 e npm 11.

```bash
cp .env.example .env
npm install
npm run db:generate
npm run dev:web
npm run dev:api
```

O frontend utiliza `http://localhost:3000` e a API `http://localhost:3001/api/v1`. As credenciais reais ficam somente no `.env`, que não deve ser versionado.

## Documentação

- [Contexto do produto](docs/contexto-do-produto.md)
- [Escopo do MVP](docs/escopo-mvp.md)
- [Regras de negócio](docs/regras-de-negocio.md)
- [Fluxos principais](docs/fluxos-principais.md)
- [Glossário do domínio](docs/glossario.md)
- [Requisitos funcionais](docs/requisitos-funcionais.md)
- [Requisitos não funcionais](docs/requisitos-nao-funcionais.md)
- [Modelo de domínio](docs/modelo-de-dominio.md)
- [Estados e transições](docs/estados-e-transicoes.md)
- [Casos de uso](docs/casos-de-uso.md)
- [Motor de planejamento](docs/motor-de-planejamento.md)
- [Indicadores e cálculos](docs/indicadores-e-calculos.md)
- [Modelo lógico de dados](docs/modelo-logico-de-dados.md)
- [Arquitetura técnica](docs/arquitetura-tecnica.md)
- [Contratos da API](docs/contratos-api.md)
- [ADR-001 — Supabase e PostgreSQL](docs/decisoes/ADR-001-supabase-postgresql.md)
- [ADR-002 — Next.js, NestJS e Prisma](docs/decisoes/ADR-002-next-nest-prisma.md)
- [Pendências e decisões futuras](docs/pendencias.md)

## Princípios centrais

- O planejamento representa objetivos; as sessões representam o que realmente aconteceu.
- O sistema deve ser útil, explicável e previsível antes de ser sofisticado.
- A urgência calculada pode alterar a ordem sugerida, mas não modifica silenciosamente um plano confirmado.
- O aluno mantém controle sobre alterações e replanejamentos.
- O banco central será a fonte oficial dos dados no MVP.
