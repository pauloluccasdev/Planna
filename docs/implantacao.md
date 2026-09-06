# Implantação

O Planna possui duas imagens independentes e não fica preso a um fornecedor:

- `Dockerfile.api`: API NestJS e trabalhador de notificações;
- `Dockerfile.web`: PWA Next.js.

## Ordem de publicação

1. Criar um ambiente separado do banco de desenvolvimento e configurar o Supabase Auth.
2. Aplicar migrations com `npm run db:migrate:deploy --workspace @planna/api`.
3. Publicar a API e validar `/api/v1/health/live` e `/api/v1/health/ready`.
4. Publicar o frontend com as URLs públicas definitivas embutidas no build.
5. Executar `node apps/api/dist/notifications/notifications.worker.js` periodicamente na imagem da API.
6. Validar cadastro, planejamento, sessão e Web Push em um usuário de homologação.

## Variáveis da API

As variáveis obrigatórias são `DATABASE_URL`, `SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL`,
`PASSWORD_RECOVERY_REDIRECT_URL`, `WEB_ORIGIN`, `WEB_PUSH_PUBLIC_KEY`,
`WEB_PUSH_PRIVATE_KEY` e `WEB_PUSH_SUBJECT`. `PORT`, limites do pool e timeout de
transação possuem padrões documentados em `.env.example`.

O trabalhador utiliza a mesma imagem e as mesmas variáveis da API. O agendador
deve impedir sobreposição e executá-lo a cada cinco minutos; o processamento é
idempotente e recupera uma reivindicação abandonada após quinze minutos.

## Variáveis do frontend

`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY` são
argumentos de build. `API_URL` é configurada na execução do container e permite
que as operações no servidor usem uma rota interna. Valores com prefixo
`NEXT_PUBLIC_` ficam visíveis no navegador e nunca podem receber segredos.

## Construção local das imagens

```bash
docker build -f Dockerfile.api -t planna-api .
docker build -f Dockerfile.web -t planna-web \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1 \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=example \
  --build-arg NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY=example .

docker run --env-file apps/api/.env -p 3001:3001 planna-api
docker run -e API_URL=http://host.docker.internal:3001/api/v1 \
  -p 3000:3000 planna-web
```

Credenciais reais não devem ser incluídas na imagem, no histórico do Git ou nos
logs de build.
