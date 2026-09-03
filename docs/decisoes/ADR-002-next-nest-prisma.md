# ADR-002 — Next.js, NestJS e Prisma

## Status

Aceita em 2 de setembro de 2026.

## Contexto

O MVP precisa funcionar bem no celular, ser instalável e permitir evolução rápida sem misturar interface, regras de planejamento e persistência. O funcionamento offline foi retirado do escopo atual.

## Decisão

- **Frontend:** Next.js com App Router, TypeScript e manifesto de PWA.
- **Backend:** NestJS em monólito modular, expondo a API versionada em `/api/v1`.
- **Persistência:** PostgreSQL do Supabase acessado somente pelo backend com Prisma.
- **Schema:** migrations do Prisma versionadas no repositório, complementadas por SQL para constraints, índices parciais, RLS e grants.
- **Notificações:** service worker dedicado a Web Push, sem cache offline no MVP.

O navegador usa o Supabase Auth para estabelecer a identidade, mas dados acadêmicos passam pela API NestJS. O backend valida o token e aplica autorização por usuário antes de consultar o banco.

## Consequências

- Interface e API podem ser implantadas e escaladas separadamente.
- O motor de planejamento permanece isolado do framework e testável como domínio puro.
- Toda operação precisa de autorização explícita no NestJS; o papel de banco usado pelo Prisma não substitui essa validação.
- A instalação como PWA não implica suporte offline.
- A migration inicial precisa ser aplicada a um projeto Supabase antes dos testes de integração.
