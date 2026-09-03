# ADR-001 — Supabase e PostgreSQL como plataforma de dados

- **Status:** aceita
- **Data:** 2026-09-02

## Contexto

O Planna precisa de autenticação, banco relacional, autorização por usuário, operações transacionais, tarefas agendadas e notificações. Um projeto Supabase chamado Planna já foi provisionado para o MVP.

O domínio possui relações e invariantes fortes: isolamento acadêmico por aluno, uma sessão ativa, blocos sem sobreposição, confirmação atômica de propostas e histórico de replanejamento.

## Decisão

Adotar:

- Supabase como plataforma gerenciada do backend do MVP;
- PostgreSQL como banco principal e fonte oficial dos dados;
- Supabase Auth para identidade e credenciais;
- Row Level Security em todas as tabelas acadêmicas expostas;
- migrações SQL versionadas no repositório;
- funções transacionais para comandos que envolvam múltiplas tabelas;
- tarefas agendadas para atrasos, riscos e notificações;
- Edge Functions ou camada de aplicação equivalente para operações privilegiadas e integrações externas.

A escolha do framework da aplicação web e do provedor de hospedagem do frontend permanece aberta.

## Consequências

### Benefícios

- banco relacional adequado ao domínio;
- integração de Auth com RLS por `auth.uid()`;
- migrações e ambiente local pela CLI;
- suporte a funções, extensões e tarefas agendadas;
- menor infraestrutura inicial para o MVP.

### Custos e cuidados

- RLS e grants precisam ser testados, não apenas habilitados;
- a chave com privilégio de serviço nunca pode chegar ao navegador;
- consultas administrativas não podem usar o privilégio de serviço como autorização genérica;
- APIs automáticas não substituem transações de domínio;
- autenticação nativa por senha usa e-mail ou telefone, exigindo adaptação para login por nome de usuário;
- dependências específicas da plataforma devem ficar atrás de limites claros.

## Login por nome de usuário

A interface continuará solicitando nome de usuário e senha. Um endpoint no servidor:

1. normaliza o nome de usuário;
2. localiza internamente a identidade correspondente;
3. autentica a senha pelo Supabase Auth usando o e-mail associado;
4. retorna erro genérico em qualquer falha;
5. aplica limitação de tentativas e auditoria segura.

O endpoint não retorna o e-mail resolvido e não expõe se determinado nome de usuário existe.

## Segurança de dados

- `anon` não recebe acesso a dados acadêmicos.
- `authenticated` recebe somente os grants necessários.
- cada operação possui política RLS explícita.
- colunas usadas por políticas, especialmente `student_id`, devem ser indexadas.
- views e funções devem ser revisadas para não contornar RLS acidentalmente.
- operações com `service_role` ficam exclusivamente no servidor e validam autorização do caso de uso.

## Fluxo de migrações

- alterações são criadas localmente em `supabase/migrations/`;
- migrations e configuração segura são commitadas;
- segredos vêm de variáveis de ambiente ou armazenamento de segredos;
- aplicação remota ocorre primeiro em desenvolvimento/homologação;
- comandos destrutivos contra projeto remoto não fazem parte do fluxo cotidiano.

## Fontes oficiais

- [Supabase Auth com senha](https://supabase.com/docs/guides/auth/passwords)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Fluxo local e migrações](https://supabase.com/docs/guides/local-development/cli-workflows)
- [Supabase Cron](https://supabase.com/docs/guides/cron)
