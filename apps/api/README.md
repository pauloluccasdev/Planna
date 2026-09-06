# Planna API

API do Planna em NestJS, responsável pelas regras de negócio, autorização, planejamento e acesso ao PostgreSQL via Prisma.

```bash
npm run db:generate
npm run dev:api
```

O endpoint de saúde é `GET /api/v1/health`. Consulte o `.env.example` na raiz para configurar o ambiente local.

Com a API compilada e em execução, `npm run test:smoke:live` valida o fluxo
integrado no projeto Supabase configurado. O teste usa dados descartáveis e
também comprova que as funções acadêmicas não podem ser acessadas diretamente
pelo Data API com a chave pública, mesmo por um aluno autenticado.
