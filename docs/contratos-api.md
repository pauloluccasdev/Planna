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

### Paginação

Listas extensas usam `?limit=20&cursor=opaque_cursor` e retornam `next_cursor`. A agenda usa janela de datas.

### Concorrência

Recursos críticos retornam `revision`. Alterações enviam a revisão conhecida por `If-Match` ou campo equivalente. Divergência retorna `409 RESOURCE_VERSION_CONFLICT`.

### Idempotência

Comandos críticos aceitam `Idempotency-Key`: cadastro, geração/confirmação de proposta, início/conclusão de sessão, registro retroativo, aceitação de replanejamento e recorrência.

Mesma chave e payload retornam o resultado anterior; payload diferente retorna conflito.

## Autenticação

### `POST /auth/register`

Cria conta com `username`, `email` e `password`. Retorna perfil público e instrução de verificação conforme política pendente.

### `POST /auth/login`

Recebe `username` e `password`. Resolve o e-mail somente no servidor e autentica pelo Supabase Auth. Falhas retornam `INVALID_CREDENTIALS` sem revelar qual campo falhou.

### Demais operações

```text
POST /auth/logout
POST /auth/password-recovery
POST /auth/password-reset
GET  /me
```

Recuperação sempre responde de forma neutra para reduzir enumeração de contas.

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
POST   /contents/{content_id}/archive
POST   /contents/{content_id}/restore
DELETE /contents/{content_id}

GET    /contents/{content_id}/parts
POST   /contents/{content_id}/parts
PATCH  /content-parts/{part_id}
DELETE /content-parts/{part_id}
PUT    /contents/{content_id}/parts-order
```

Conteúdo exige `priority`; estimativa é opcional. `GET /contents/{content_id}/progress` retorna estado derivado, partes confirmadas, percentual quando calculável, quantidade de blocos futuros e a sinalização `needs_future_planning`. O critério de conclusão sem partes permanece pendente e não é inferido silenciosamente.

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
```

`PUT` substitui atomicamente a grade. Se invalidar blocos futuros, retorna `409 AVAILABILITY_HAS_AFFECTED_BLOCKS` com as referências necessárias.

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

Confirmação exige idempotência e revisão atual. É tudo ou nada. Proposta obsoleta retorna `409 PROPOSAL_STALE` sem criar blocos parciais.

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

### Recorrência diária

```text
POST   /study-blocks/recurring/daily
POST   /study-blocks/series/{series_id}/cancel
PATCH  /study-block-series/{series_id}
DELETE /study-block-series/{series_id}
```

Na criação, o payload do bloco recebe `repeatUntil` no formato `YYYY-MM-DD`. A operação é atômica: todas as ocorrências precisam estar dentro da disponibilidade e sem conflito, ou nenhuma é criada. Uma série diária aceita no máximo 366 blocos. O cancelamento individual usa a rota do bloco; o cancelamento da série altera apenas ocorrências ainda ativas e preserva as concluídas.

## Sessões de estudo

### Consultas

```text
GET /study-sessions/active
GET /study-sessions?from=&to=&content_id=&kind=
GET /study-sessions/{session_id}
```

### Comandos

```text
POST /study-blocks/{block_id}/sessions/start
POST /study-sessions/unplanned/start
POST /study-sessions/{session_id}/pause
POST /study-sessions/{session_id}/resume
POST /study-sessions/{session_id}/complete
POST /study-sessions/retroactive
POST /study-sessions/{session_id}/reconcile
```

Início ou retomada concorrente retorna `409 ACTIVE_STUDY_SESSION_EXISTS`.

Na conclusão, o aluno envia partes confirmadas e observação opcional. O servidor calcula durações; totais enviados pelo cliente não são fonte confiável.

## Replanejamento

```text
GET   /replanning-suggestions?status=
GET   /replanning-suggestions/{suggestion_id}
PATCH /replanning-suggestions/{suggestion_id}
POST  /replanning-suggestions/{suggestion_id}/accept
POST  /replanning-suggestions/{suggestion_id}/reject
POST  /study-blocks/{overdue_block_id}/replanning-suggestions
```

Aceitação revalida disponibilidade e conflito. Em sucesso, retorna bloco original atualizado e substituto. Após rejeição, a última rota representa solicitação explícita do aluno.

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
|  422 | `CONTENT_MISSING_ESTIMATE`    | Inelegível à geração.                  |
|  422 | `CONTENT_PART_MISMATCH`       | Parte não pertence ao conteúdo.        |
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

## Pendências antes da implementação

- verificação de e-mail;
- limites de campos;
- localização definitiva da API;
- evento com intervalo criado sobre bloco confirmado;
- sessão retroativa sobreposta;
- conclusão de conteúdo sem partes;
- paginação e limites máximos;
- rate limiting;
- formato de revisão: `ETag`/`If-Match` ou campo no payload.
