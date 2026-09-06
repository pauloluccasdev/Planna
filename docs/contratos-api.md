# Contratos da API

## Escopo

Superfície HTTP conceitual do MVP. As rotas podem ser implementadas pelo servidor da aplicação, Edge Functions ou adaptadores equivalentes sem alterar os casos de uso.

Prefixo proposto: `/api/v1`.

## Convenções

### Autenticação e propriedade

- Rotas protegidas recebem token emitido pelo Supabase Auth.
- O servidor deriva o usuário do token; `student_id` nunca é aceito como autoridade no corpo.
- Rotas administrativas exigem papel validado no servidor.

### Formato

- JSON em requisições e respostas.
- Datas completas em ISO 8601 com offset.
- Horários semanais locais em `HH:mm:ss`.
- Durações como inteiros em segundos.
- Identificadores como strings opacas.

### Sucesso

```json
{
  "data": {},
  "meta": { "request_id": "req_..." }
}
```

### Erro

```json
{
  "error": {
    "code": "STUDY_BLOCK_CONFLICT",
    "message": "Não foi possível salvar o bloco porque o horário está ocupado.",
    "fields": {},
    "details": {}
  },
  "meta": { "request_id": "req_..." }
}
```

Mensagens são seguras para o usuário; logs internos podem ter diagnóstico adicional sem segredos.

Toda resposta também envia `x-request-id`. Um identificador recebido é
preservado somente quando é um UUID canônico válido; caso contrário, a API gera
um novo UUID. O navegador pode ler esse cabeçalho via CORS e o mesmo valor
sempre aparece em `meta.request_id`.

### Paginação

Listas extensas usam `?limit=20&cursor=opaque_cursor` e retornam `next_cursor`. A agenda usa janela de datas.

### Concorrência

Recursos críticos retornam `revision`. Alterações enviam a revisão conhecida por `If-Match` ou campo equivalente. Divergência retorna `409 RESOURCE_VERSION_CONFLICT`.

### Idempotência

Comandos críticos aceitam `Idempotency-Key`: cadastro, geração/confirmação de proposta, início/conclusão de sessão, registro retroativo, aceitação de replanejamento e recorrência.

Mesma chave e payload retornam o mesmo recurso resultante; payload diferente
retorna `409 IDEMPOTENCY_KEY_REUSED`. A chave é opcional, possui entre 8 e 128
caracteres alfanuméricos, `_` ou `-` e é isolada por aluno e operação.

## Autenticação

### `POST /auth/register`

Cria conta com `username`, `email` e `password`. Retorna o perfil público e
`emailVerificationRequired`, conforme a configuração de confirmação do provedor.

Erros específicos: `ACCOUNT_ALREADY_EXISTS` (`409`), `INVALID_EMAIL` (`422`),
`EMAIL_RATE_LIMITED` (`429`) e `ACCOUNT_REGISTRATION_FAILED` (`500`). A resposta
de conflito não revela se o nome de usuário, o e-mail ou ambos já existem.

### `POST /auth/login`

Recebe `username` e `password`. Resolve o e-mail somente no servidor e autentica pelo Supabase Auth. Falhas retornam `INVALID_CREDENTIALS` sem revelar qual campo falhou.

### `POST /auth/password-recovery`

Recebe `email` e responde `202` com `{ requested: true }`. A resposta é idêntica
quando a conta não existe, o provedor limita o envio ou ocorre outra falha de
entrega, reduzindo enumeração de contas.

### `POST /auth/password-reset`

Recebe a nova `password` e exige no cabeçalho Bearer o token temporário entregue
no link de recuperação. Em sucesso, registra a alteração, revoga as sessões e
impede a reutilização de token emitido antes da troca.

### Demais operações

```text
POST /auth/logout
POST /auth/refresh
GET  /me
```

O logout exige autenticação, revoga as sessões no provedor e a interface remove
os cookies locais mesmo quando o provedor estiver indisponível.

A renovação recebe o refresh token somente no servidor, valida novamente o
estado da conta e devolve um novo par rotacionado. Nas rotas privadas, o proxy da
aplicação renova a sessão até 60 segundos antes do vencimento; falhas removem os
cookies e redirecionam ao login.

## Cursos e períodos

```text
GET    /courses
POST   /courses
GET    /courses/{course_id}
PATCH  /courses/{course_id}
POST   /courses/{course_id}/archive
POST   /courses/{course_id}/restore
DELETE /courses/{course_id}

GET    /courses/{course_id}/periods
POST   /courses/{course_id}/periods
PATCH  /periods/{period_id}
DELETE /periods/{period_id}
```

Exclusão retorna `409 ENTITY_HAS_HISTORY` quando houver histórico.

## Disciplinas

```text
GET    /courses/{course_id}/subjects
POST   /courses/{course_id}/subjects
GET    /subjects/{subject_id}
PATCH  /subjects/{subject_id}
POST   /subjects/{subject_id}/archive
POST   /subjects/{subject_id}/restore
DELETE /subjects/{subject_id}
```

Filtros: `status`, `academic_period_id` e cursor.

## Conteúdos e partes

```text
GET    /subjects/{subject_id}/contents
POST   /subjects/{subject_id}/contents
GET    /contents?course_id=&subject_id=&status=
GET    /contents/{content_id}
GET    /contents/{content_id}/progress
PATCH  /contents/{content_id}
POST   /contents/{content_id}/complete
POST   /contents/{content_id}/archive
POST   /contents/{content_id}/restore
DELETE /contents/{content_id}

GET    /contents/{content_id}/parts
POST   /contents/{content_id}/parts
PATCH  /content-parts/{part_id}
DELETE /content-parts/{part_id}
PUT    /contents/{content_id}/parts-order
```

Conteúdo exige `priority`; estimativa é opcional. As listagens retornam um resumo
`progress` calculado em lote, com estado, percentual quando calculável, partes
confirmadas, quantidade de blocos futuros e `needsFuturePlanning`.
`GET /contents/{content_id}/progress` retorna o mesmo diagnóstico detalhado.
`POST /contents/{content_id}/complete` registra a confirmação explícita e somente
é válido quando o conteúdo não possui partes. Conteúdo sem partes não é
finalizado apenas por atingir a estimativa.

## Eventos acadêmicos

```text
GET    /academic-event-types
POST   /academic-event-types
PATCH  /academic-event-types/{type_id}
DELETE /academic-event-types/{type_id}

GET    /academic-events?from=&to=&subject_id=
POST   /academic-events
GET    /academic-events/{event_id}
PATCH  /academic-events/{event_id}
DELETE /academic-events/{event_id}
PUT    /academic-events/{event_id}/contents
```

Criação recebe `starts_at`, `ends_at` opcional, disciplina, tipo e `contents_status`. Término deve ser posterior ao início. Sem término, o evento não reserva intervalo.

Eventos sobrepostos retornam sucesso com `warnings`; conflito com bloco confirmado segue política pendente.

## Disponibilidade

```text
GET  /availability
PUT  /availability
POST /availability/validate
POST /availability/expand
```

`PUT` substitui atomicamente a grade. Se invalidar blocos futuros, retorna `409 AVAILABILITY_HAS_AFFECTED_BLOCKS` com as referências necessárias.

`POST /availability/expand` une os intervalos informados à grade atual de forma
atômica e idempotente. Intervalos sobrepostos ou adjacentes são consolidados. O
comando exige ação explícita do aluno e não cria o bloco que motivou a expansão.

## Preferência de Pomodoro

```text
GET /pomodoro-preference
PUT /pomodoro-preference
```

Recebe `focus_seconds` e `break_seconds`. Limites estão pendentes.

## Propostas de planejamento

### Criar

`POST /planning-proposals`

```json
{
  "period_start": "2026-09-07T00:00:00-03:00",
  "period_end": "2026-10-07T23:59:59-03:00",
  "course_ids": ["..."],
  "subject_ids": ["..."]
}
```

Retorna `202 Accepted` em processamento assíncrono ou `201 Created` quando finalizada na requisição.

### Consultar, revisar e decidir

```text
GET    /planning-proposals/{proposal_id}
GET    /planning-proposals/{proposal_id}/blocks
PATCH  /planning-proposals/{proposal_id}/blocks/{proposed_block_id}
PUT    /planning-proposals/{proposal_id}/blocks/{proposed_block_id}/parts
DELETE /planning-proposals/{proposal_id}/blocks/{proposed_block_id}
POST   /planning-proposals/{proposal_id}/validate
POST   /planning-proposals/{proposal_id}/confirm
POST   /planning-proposals/{proposal_id}/discard
```

No MVP, o `PATCH` recebe a fotografia completa editável do bloco (`revision`,
`contentId`, `startsAt`, `endsAt`, `focusSeconds`, `breakSeconds` e `partIds`) e
substitui as associações de partes na mesma transação. O `DELETE` remove somente
o bloco da proposta em revisão; nenhum dos dois comandos altera a agenda
confirmada.

Confirmação exige idempotência e revisão atual. É tudo ou nada. Proposta obsoleta
retorna `409 PROPOSAL_STALE` sem criar blocos parciais. Quando um conteúdo possui
partes ativas, cada bloco precisa ter ao menos uma associação salva; caso
contrário, retorna `422 PROPOSAL_PARTS_REQUIRED` com os blocos pendentes.
`POST /planning-proposals/{proposal_id}/confirm` aceita `Idempotency-Key` e uma
repetição com a mesma chave devolve a confirmação original sem recriar blocos ou
auditoria.

## Agenda e blocos

```text
GET   /calendar?from=&to=&course_id=&subject_id=&content_id=
POST  /study-blocks
GET   /study-blocks/{block_id}
PATCH /study-blocks/{block_id}
POST  /study-blocks/{block_id}/cancel
GET   /study-blocks/{block_id}/history
```

`calendar` retorna itens discriminados por `type = study_block | academic_event`.

A consulta individual retorna estado, origem, horários, duração planejada,
configuração de foco e pausa, conteúdo, partes e datas finais aplicáveis. O
histórico versionado fica disponível em `GET /study-blocks/{block_id}/history`
e pode ser consultado mesmo quando o bloco já foi concluído, cancelado ou
replanejado. Edições e cancelamentos preservam a fotografia anterior e geram
auditoria na mesma transação da alteração; no cancelamento de série, isso ocorre
somente para cada bloco ainda ativo e efetivamente cancelado.

### Recorrência diária

```text
POST   /study-blocks/recurring/daily
POST   /study-blocks/series/{series_id}/cancel
PATCH  /study-block-series/{series_id}
DELETE /study-block-series/{series_id}
```

Na criação, o payload do bloco recebe `repeatUntil` no formato `YYYY-MM-DD`. A operação é atômica: todas as ocorrências precisam estar dentro da disponibilidade e sem conflito, ou nenhuma é criada. Uma série diária aceita no máximo 366 blocos. O cancelamento individual usa a rota do bloco; o cancelamento da série altera apenas ocorrências ainda ativas e preserva as concluídas.

`POST /study-blocks` e `POST /study-blocks/recurring/daily` aceitam
`Idempotency-Key`. Repetir o mesmo comando com a mesma chave devolve o bloco ou
a série original, sem recriar itens ou eventos de auditoria.

O cancelamento de um bloco ou série inclui `warnings.uncoveredContents` com os
conteúdos ainda incompletos que ficaram sem blocos futuros. A resposta permite
que a interface cumpra o RF-STS-005 imediatamente, sem transformar o aviso em
uma alteração automática do planejamento.

## Sessões de estudo

### Consultas

```text
GET /study-sessions/active
GET /study-sessions/paused
GET /study-sessions?from=&to=&content_id=&kind=
GET /study-sessions/{session_id}
```

`GET /study-sessions/active` sempre retorna primeiro a sessão com cronômetro em
execução. Quando não existe uma sessão em execução, retorna a sessão pausada
mais recentemente atualizada. `GET /study-sessions/paused` retorna todas as
sessões pausadas do aluno para que nenhuma fique oculta ao alternar conteúdos.

### Comandos

```text
POST /study-blocks/{block_id}/sessions/start
POST /study-sessions/unplanned/start
POST /study-sessions/{session_id}/pause
POST /study-sessions/{session_id}/switch-to-block/{block_id}
POST /study-sessions/{session_id}/switch-to-content
POST /study-sessions/{session_id}/resume
POST /study-sessions/{session_id}/complete
POST /study-sessions/retroactive
POST /study-sessions/{session_id}/reconcile
```

`GET /study-blocks?retroactiveEligible=true` lista somente blocos confirmados ou
atrasados que ainda não possuem nenhuma sessão para serem escolhidos no registro
retroativo. Ao informar `studyBlockId`, o bloco precisa pertencer ao conteúdo
selecionado e ainda estar em estado válido; o registro e a conclusão do bloco
acontecem na mesma transação. Blocos em andamento ou pausados não são elegíveis,
evitando duas sessões para o mesmo bloco.

Início ou retomada concorrente retorna `409 ACTIVE_STUDY_SESSION_EXISTS`.

`switch-to-content` recebe `contentId` e observação opcional. Em uma única
transação, encerra o segmento atual, pausa a sessão e o bloco de origem quando
existir, e inicia uma sessão não planejada para o conteúdo escolhido. Se o novo
conteúdo for inválido, a execução atual permanece inalterada.

Na conclusão, o aluno envia partes confirmadas e observação opcional. O servidor calcula durações; totais enviados pelo cliente não são fonte confiável.

Início planejado, início não planejado, conclusão e registro retroativo aceitam
`Idempotency-Key`. A reserva da chave, a mutação, a auditoria e a referência ao
resultado são persistidas na mesma transação e serializadas por aluno. Nenhum
nome de conteúdo ou texto de observação é duplicado no registro idempotente.

As transições críticas de sessão geram eventos de auditoria dentro da mesma
transação. Os metadados registram somente identificadores opacos, tipo de
transição, contagens e durações; nomes de conteúdo e observações não são
copiados para a trilha de auditoria.

## Replanejamento

```text
GET   /replanning-suggestions?status=
GET   /replanning-suggestions/{suggestion_id}
PATCH /replanning-suggestions/{suggestion_id}
POST  /replanning-suggestions/{suggestion_id}/accept
POST  /replanning-suggestions/{suggestion_id}/reject
POST  /study-blocks/{overdue_block_id}/replanning-suggestions
```

Ao consultar a lista, o servidor reconcilia atrasos e cria somente a primeira
sugestão automática de cada bloco elegível. A sugestão preserva a duração ainda
não realizada e pode ser editada sem reservar o horário. Aceitação revalida
disponibilidade e conflitos dentro da operação transacional; em sucesso, retorna
o bloco original como replanejado e o substituto confirmado. Após rejeição, a
última rota representa a solicitação explícita necessária para gerar outra
sugestão. O aceite aceita `Idempotency-Key`; a repetição com a mesma chave
devolve os mesmos blocos original e substituto sem aplicar a troca novamente.

## Indicadores e riscos

```text
GET /metrics/summary?from=&to=&course_id=&subject_id=&content_id=
GET /metrics/time?from=&to=&course_id=&subject_id=&content_id=
GET /metrics/adaptation?from=&to=&course_id=&subject_id=&content_id=
GET /risks?from=&to=&course_id=&subject_id=&content_id=
```

Respostas incluem valores absolutos, percentuais anuláveis quando não houver dados e definição do universo usado.

## Notificações push

```text
POST   /push-subscriptions
DELETE /push-subscriptions/{subscription_id}
GET    /notifications?status=&cursor=
POST   /notifications/{notification_id}/read
```

Endpoint de push é segredo operacional e não deve ser reapresentado integralmente em telas administrativas.

`POST /push-subscriptions` recebe o `endpoint`, `expirationTime` opcional e as
chaves `p256dh` e `auth` produzidas pelo navegador. A resposta contém somente o
identificador e metadados de estado; endpoint e chaves não são devolvidos.
Reenviar a mesma inscrição para o mesmo aluno a reativa, mas ela nunca é
transferida entre contas. `DELETE` faz revogação lógica.

`GET /notifications` retorna `{ items, nextCursor }`, sempre limitado ao aluno
autenticado. Marcar como lida é idempotente. A entrega não é exposta como
endpoint público: o trabalhador operacional consome até 100 notificações
vencidas por execução e usa credenciais VAPID mantidas somente no backend. O
payload contém uma mensagem genérica e uma rota interna, sem texto acadêmico
privado. A criação das mensagens continua dependente das antecedências ainda
registradas como pendência.

## Administração

```text
GET  /admin/users?query=&status=&cursor=
GET  /admin/users/{user_id}
POST /admin/users/{user_id}/block
POST /admin/users/{user_id}/unblock
POST /admin/users/{user_id}/password-recovery
```

Respostas não incluem identificadores ou resumos acadêmicos.

## Códigos de erro iniciais

| HTTP | Código                        | Uso                                    |
| ---: | ----------------------------- | -------------------------------------- |
|  400 | `VALIDATION_ERROR`            | Campo ou combinação inválida.          |
|  401 | `INVALID_CREDENTIALS`         | Login inválido sem revelar qual campo. |
|  401 | `AUTHENTICATION_REQUIRED`     | Token ausente ou inválido.             |
|  403 | `ACCOUNT_BLOCKED`             | Conta bloqueada.                       |
|  403 | `FORBIDDEN`                   | Papel ou propriedade insuficiente.     |
|  404 | `RESOURCE_NOT_FOUND`          | Recurso ausente ou invisível ao ator.  |
|  409 | `RESOURCE_VERSION_CONFLICT`   | Revisão desatualizada.                 |
|  409 | `STUDY_BLOCK_CONFLICT`        | Horário ocupado.                       |
|  409 | `OUTSIDE_AVAILABILITY`        | Fora da grade.                         |
|  409 | `ACTIVE_STUDY_SESSION_EXISTS` | Cronômetro já em execução.             |
|  409 | `ENTITY_HAS_HISTORY`          | Exclusão física não permitida.         |
|  409 | `PROPOSAL_STALE`              | Entradas mudaram.                      |
|  409 | `IDEMPOTENCY_KEY_REUSED`      | Chave repetida com payload diferente.  |
|  422 | `CONTENT_MISSING_ESTIMATE`    | Inelegível à geração.                  |
|  422 | `CONTENT_PART_MISMATCH`       | Parte não pertence ao conteúdo.        |
|  422 | `PROPOSAL_PARTS_REQUIRED`     | Bloco proposto ainda sem partes.       |
|  422 | `INVALID_IDEMPOTENCY_KEY`     | Chave idempotente fora do formato.     |
|  429 | `RATE_LIMITED`                | Limite excedido.                       |
|  500 | `INTERNAL_ERROR`              | Falha inesperada com `request_id`.     |

## Operações automáticas internas

Jobs não precisam ser públicos. Contratos internos idempotentes:

- detectar blocos vencidos;
- criar primeira sugestão por atraso;
- agendar e entregar notificações;
- recalcular ou invalidar riscos;
- limpar artefatos temporários.

Cada execução registra janela, resultado, quantidade processada e falhas recuperáveis.

No MVP atual, a reconciliação idempotente de atraso também é executada antes das consultas autenticadas de agenda, blocos e indicadores. Assim, o aluno recebe o estado correto ao abrir o Planna mesmo antes da ativação do job periódico.

## Pendências antes da implementação

- verificação de e-mail;
- limites de campos;
- localização definitiva da API;
- evento com intervalo criado sobre bloco confirmado;
- sessão retroativa sobreposta;
- paginação e limites máximos;
- rate limiting;
- formato de revisão: `ETag`/`If-Match` ou campo no payload.
