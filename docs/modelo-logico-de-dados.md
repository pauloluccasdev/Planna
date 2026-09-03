# Modelo lógico de dados

## Objetivo e status

Este documento traduz o domínio para um modelo relacional lógico, sem escolher SGBD, ORM ou framework. Nomes, tipos e restrições ainda poderão ser refinados na modelagem física.

Campos marcados como **a validar** dependem de decisão de negócio pendente e não devem ser tratados como definitivos.

## Convenções

- Chaves primárias são identificadores opacos e não carregam significado de negócio.
- Todas as datas de auditoria usam instante inequívoco; a apresentação ocorre em `America/Sao_Paulo`.
- Durações são inteiros em segundos.
- Campos `created_at` e `updated_at` são omitidos das listas para reduzir repetição, mas existem em entidades mutáveis.
- Entidades acadêmicas carregam `student_id` direta ou indiretamente e nunca podem atravessar proprietários.
- Estados derivados não devem substituir os fatos usados para calculá-los.
- Exclusão lógica e arquivamento são distintos de exclusão física.
- Valores enumerados abaixo são candidatos e devem acompanhar `estados-e-transicoes.md`.

## Diagrama relacional resumido

```text
users
├── auth_sessions
├── password_reset_tokens
├── courses
│   ├── academic_periods
│   └── subjects
│       ├── contents
│       │   └── content_parts
│       └── academic_events ──< academic_event_contents >── contents
├── availability_intervals
├── pomodoro_preferences
├── planning_proposals
│   ├── proposal_courses
│   ├── proposal_subjects
│   ├── proposed_study_blocks ──< proposed_block_parts >── content_parts
│   └── proposal_diagnostics
├── recurrence_series
├── study_blocks ──< study_block_parts >── content_parts
│   ├── study_block_versions
│   ├── study_sessions
│   │   ├── study_session_segments
│   │   └── study_session_completed_parts
│   └── replanning_suggestions
├── push_subscriptions
├── notifications
└── audit_events
```

## Identidade e acesso

### `users`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Identificador do usuário. |
| `username` | Sim | Nome usado no login; deve ser único conforme normalização a definir. |
| `email` | Sim | E-mail para recuperação; deve ser único conforme normalização a definir. |
| `password_hash` | Sim | Hash da senha, nunca a senha original. |
| `role` | Sim | `student` ou `admin`. |
| `status` | Sim | Ao menos `active` ou `blocked`; verificação de e-mail está a validar. |
| `email_verified_at` | Não | Preparação para verificação, caso aprovada. |
| `blocked_at` | Não | Instante do bloqueio. |
| `blocked_by_user_id` | Não | Administrador que bloqueou. |
| `last_login_at` | Não | Última autenticação bem-sucedida. |

Restrições:

- `username` e `email` possuem unicidade case-insensitive ou por valor normalizado.
- `blocked_by_user_id`, quando preenchido, referencia usuário administrador.
- dados acadêmicos nunca são expostos por consultas administrativas desta tabela.

### `auth_sessions`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Sessão de autenticação, não sessão de estudo. |
| `user_id` | Sim | Proprietário. |
| `token_hash` | Sim | Identificador secreto armazenado de forma protegida. |
| `expires_at` | Sim | Expiração. |
| `revoked_at` | Não | Revogação explícita. |
| `last_seen_at` | Não | Último uso conhecido. |
| `user_agent_summary` | Não | Informação mínima para gestão de sessões, sem excesso de rastreamento. |

### `password_reset_tokens`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Solicitação de redefinição. |
| `user_id` | Sim | Conta relacionada. |
| `token_hash` | Sim | Token protegido. |
| `expires_at` | Sim | Expiração curta. |
| `used_at` | Não | Marca uso único. |
| `requested_by_admin_id` | Não | Administrador que iniciou auxílio, quando aplicável. |

## Estrutura acadêmica

### `courses`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Curso. |
| `student_id` | Sim | Proprietário aluno. |
| `name` | Sim | Nome do curso. |
| `description` | Não | Observação. |
| `status` | Sim | `active` ou `archived`. |
| `archived_at` | Não | Instante do arquivamento. |

### `academic_periods`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Período opcional. |
| `course_id` | Sim | Curso ao qual pertence. |
| `name` | Sim | Ex.: “2026.1” ou “3º semestre”. |
| `position` | Não | Ordenação manual. |
| `starts_on` | Não | Início opcional — a validar. |
| `ends_on` | Não | Fim opcional — a validar. |

### `subjects`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Disciplina. |
| `student_id` | Sim | Proprietário redundante para isolamento e integridade. |
| `course_id` | Sim | Curso. |
| `academic_period_id` | Não | Período opcional do mesmo curso. |
| `name` | Sim | Nome. |
| `description` | Não | Observação. |
| `status` | Sim | `active` ou `archived`. |
| `archived_at` | Não | Instante do arquivamento. |

### `contents`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Conteúdo. |
| `student_id` | Sim | Proprietário. |
| `subject_id` | Sim | Disciplina. |
| `name` | Sim | Nome. |
| `description` | Não | Observação. |
| `priority` | Sim | Inteiro de 1 a 5. |
| `estimated_duration_seconds` | Não | Estimativa do conteúdo completo. |
| `status_override` | Não | Não recomendado no MVP; reservado apenas se futura regra exigir. |
| `archived_at` | Não | Arquivamento. |

O estado de progresso deve ser derivado de sessões, partes e blocos, não atualizado manualmente em uma coluna sem histórico.

### `content_parts`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Parte. |
| `student_id` | Sim | Proprietário. |
| `content_id` | Sim | Conteúdo pai. |
| `name` | Sim | Nome. |
| `description` | Não | Observação. |
| `position` | Sim | Ordem exibida ao aluno. |
| `archived_at` | Não | Preserva histórico quando vinculada. |

Não existe estimativa individual por parte.

## Eventos acadêmicos

### `academic_event_types`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Tipo. |
| `student_id` | Não | Nulo para tipo padrão; preenchido para personalizado. |
| `name` | Sim | Prova, teste, trabalho, simulado ou nome personalizado. |
| `is_system` | Sim | Impede edição dos tipos padrão. |
| `archived_at` | Não | Arquivamento de tipo personalizado. |

Unicidade recomendada por `student_id + nome normalizado`, tratando tipos de sistema separadamente.

### `academic_events`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Evento. |
| `student_id` | Sim | Proprietário. |
| `subject_id` | Sim | Disciplina. |
| `event_type_id` | Sim | Tipo permitido ao aluno ou padrão. |
| `title` | Sim | Título. |
| `description` | Não | Observação. |
| `starts_at` | Sim | Data e horário informados. |
| `ends_at` | Não | Término opcional; quando ausente, o evento é marcador e não reserva intervalo. |
| `contents_status` | Sim | `informed` ou `not_informed_yet`. |
| `deleted_at` | Não | Exclusão lógica quando houver referências históricas. |

### `academic_event_contents`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `academic_event_id` | Sim | Evento. |
| `content_id` | Sim | Conteúdo da mesma disciplina e aluno. |

Chave única composta: `academic_event_id + content_id`.

Se `contents_status = not_informed_yet`, esta associação deve estar vazia. Ao selecionar conteúdos, o status passa a `informed`.

## Disponibilidade e Pomodoro

### `availability_intervals`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Intervalo. |
| `student_id` | Sim | Proprietário. |
| `weekday` | Sim | Dia da semana em convenção única. |
| `start_local_time` | Sim | Horário inicial local. |
| `end_local_time` | Sim | Horário final local. |
| `active` | Sim | Participa da grade. |

Restrições:

- início anterior ao fim;
- intervalos ativos do mesmo aluno e dia não se sobrepõem;
- remoção/redução exige validação de blocos futuros na aplicação.

### `pomodoro_preferences`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `student_id` | Sim | Uma preferência padrão por aluno. |
| `focus_seconds` | Sim | Tempo de foco. |
| `break_seconds` | Sim | Tempo de pausa. |

Limites mínimos e máximos estão a validar.

## Propostas de planejamento

### `planning_proposals`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Proposta. |
| `student_id` | Sim | Proprietário. |
| `period_start` | Sim | Início solicitado. |
| `period_end` | Sim | Fim solicitado. |
| `status` | Sim | `processing`, `ready`, `reviewing`, `confirmed`, `discarded` ou `failed`. |
| `algorithm_version` | Sim | Versão reproduzível. |
| `parameters_snapshot` | Sim | Parâmetros/ponderações serializados em formato estruturado. |
| `input_version` | Sim | Versão/fingerprint das entradas relevantes. |
| `requested_at` | Sim | Solicitação. |
| `completed_at` | Não | Fim do processamento. |
| `confirmed_at` | Não | Confirmação do aluno. |
| `failure_code` | Não | Código seguro de falha. |

### `proposal_courses` e `proposal_subjects`

Guardam o escopo escolhido na solicitação. Cada tabela usa chave única `proposal_id + entidade_id` e preserva a intenção mesmo que os cadastros sejam alterados depois.

### `proposed_study_blocks`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Bloco dentro da proposta. |
| `proposal_id` | Sim | Proposta. |
| `student_id` | Sim | Proprietário. |
| `content_id` | Sim | Exatamente um conteúdo. |
| `starts_at` | Sim | Início proposto. |
| `ends_at` | Sim | Fim proposto. |
| `planned_duration_seconds` | Sim | Duração preservada. |
| `focus_seconds` | Sim | Configuração copiada para o bloco. |
| `break_seconds` | Sim | Configuração copiada para o bloco. |
| `explanation_factors` | Sim | Motivos estruturados, não apenas texto. |
| `source_overdue_block_id` | Não | Atraso que forçou inclusão, quando aplicável. |
| `removed_at` | Não | Remoção durante revisão. |
| `revision` | Sim | Controle de concorrência da edição. |

### `proposed_block_parts`

Associação `proposed_block_id + content_part_id`. A parte deve pertencer ao conteúdo do bloco. Para conteúdos com partes, a confirmação da proposta exige a política de associação definida no produto.

### `proposal_diagnostics`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Diagnóstico. |
| `proposal_id` | Sim | Proposta. |
| `kind` | Sim | Ex.: `capacity_deficit`, `missing_estimate`, `unknown_event_contents`. |
| `course_id` | Não | Recorte opcional. |
| `subject_id` | Não | Recorte opcional. |
| `content_id` | Não | Recorte opcional. |
| `academic_event_id` | Não | Evento opcional. |
| `required_seconds` | Não | Carga necessária. |
| `available_seconds` | Não | Capacidade. |
| `deficit_seconds` | Não | Déficit. |
| `details` | Não | Fatores estruturados adicionais. |

## Planejamento confirmado

### `recurrence_series`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Série manual. |
| `student_id` | Sim | Proprietário. |
| `frequency` | Sim | `daily` no MVP. |
| `starts_on` | Sim | Primeira data. |
| `ends_on` | Sim | Data final escolhida. |
| `created_from_block_id` | Não | Ocorrência de origem. |

As ocorrências devem ser materializadas como blocos concretos para permitir execução, edição e cancelamento individual.

### `study_blocks`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Bloco confirmado. |
| `student_id` | Sim | Proprietário. |
| `content_id` | Sim | Exatamente um conteúdo. |
| `proposal_id` | Não | Proposta que o originou. |
| `proposed_block_id` | Não | Bloco proposto de origem. |
| `recurrence_series_id` | Não | Série manual, quando aplicável. |
| `source` | Sim | `manual`, `automatic` ou `replanned`. |
| `status` | Sim | Estado operacional do bloco. |
| `starts_at` | Sim | Início planejado atual. |
| `ends_at` | Sim | Fim planejado atual. |
| `planned_duration_seconds` | Sim | Duração planejada preservada. |
| `focus_seconds` | Sim | Pomodoro do bloco. |
| `break_seconds` | Sim | Pomodoro do bloco. |
| `replaces_block_id` | Não | Bloco original substituído. |
| `replaced_by_block_id` | Não | Novo bloco que o substituiu. |
| `cancelled_at` | Não | Cancelamento. |
| `completed_at` | Não | Conclusão. |
| `revision` | Sim | Concorrência otimista. |

Restrições:

- `starts_at < ends_at`;
- `planned_duration_seconds` deve corresponder ao intervalo conforme política de duração;
- um bloco não substitui a si mesmo;
- relação de substituição é consistente nos dois sentidos;
- bloco confirmado não se sobrepõe a outro bloco ativo ou ao intervalo de evento com término;
- somente eventos com `ends_at` reservam intervalo e participam dessa validação;
- bloco cabe na disponibilidade vigente;
- `student_id` é igual ao proprietário do conteúdo e de todos os vínculos.

### `study_block_parts`

Associação única `study_block_id + content_part_id`. A parte deve pertencer ao conteúdo do bloco.

### `study_block_versions`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Versão histórica. |
| `study_block_id` | Sim | Bloco. |
| `version_number` | Sim | Sequência por bloco. |
| `changed_at` | Sim | Momento da alteração. |
| `changed_by_user_id` | Sim | Aluno responsável. |
| `change_reason` | Não | Edição manual, replanejamento etc. |
| `snapshot` | Sim | Valores anteriores suficientes para auditoria. |

Chave única: `study_block_id + version_number`.

## Execução de estudo

### `study_sessions`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Sessão realizada. |
| `student_id` | Sim | Proprietário. |
| `content_id` | Sim | Conteúdo estudado. |
| `study_block_id` | Não | Bloco relacionado, se planejada/retroativa vinculada. |
| `kind` | Sim | `planned`, `unplanned` ou `retroactive`. |
| `status` | Sim | `running`, `paused`, `completed` ou `needs_reconciliation`. |
| `started_at` | Sim | Início efetivo ou informado. |
| `ended_at` | Não | Término efetivo. |
| `focus_duration_seconds` | Não | Total derivado ou materializado. |
| `pomodoro_break_duration_seconds` | Não | Pausas que contam no realizado. |
| `realized_duration_seconds` | Não | Soma contabilizada conforme regra. |
| `note` | Não | Observação do aluno. |
| `reconciled_at` | Não | Correção após interrupção. |
| `revision` | Sim | Concorrência otimista. |

Uma sessão vinculada deve ter o mesmo conteúdo do bloco.

### `study_session_segments`

Representação técnica candidata para reconstruir o tempo sem confiar no contador visual:

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Segmento. |
| `study_session_id` | Sim | Sessão. |
| `kind` | Sim | `focus` ou `pomodoro_break`. |
| `started_at` | Sim | Início. |
| `ended_at` | Não | Fim; no máximo um segmento aberto na sessão. |
| `sequence` | Sim | Ordem. |

Tempo aguardando retomada não gera segmento e não é contabilizado.

### `study_session_completed_parts`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `study_session_id` | Sim | Sessão concluída. |
| `content_part_id` | Sim | Parte confirmada. |
| `confirmed_at` | Sim | Momento da confirmação. |

A parte deve pertencer ao conteúdo da sessão. A associação preserva o fato mesmo se a parte for arquivada depois.

### Garantia de uma sessão em execução

O modelo físico deve impor, no banco ou por mecanismo transacional equivalente, no máximo uma linha `running` por `student_id`. Validação somente na interface é insuficiente.

Pausadas não participam dessa exclusividade.

## Replanejamento

### `replanning_suggestions`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Sugestão. |
| `student_id` | Sim | Proprietário. |
| `overdue_block_id` | Sim | Bloco atrasado original. |
| `status` | Sim | `generated`, `editing`, `accepted` ou `rejected`; expiração a validar. |
| `generation_kind` | Sim | `automatic_first` ou `student_requested`. |
| `suggested_starts_at` | Sim | Novo início. |
| `suggested_ends_at` | Sim | Novo fim. |
| `suggested_duration_seconds` | Sim | Duração sugerida. |
| `explanation_factors` | Sim | Motivos estruturados. |
| `edited_at` | Não | Edição pelo aluno. |
| `decided_at` | Não | Aceitação ou rejeição. |
| `created_block_id` | Não | Bloco criado após aceitação. |
| `revision` | Sim | Concorrência otimista. |

Aceitação deve ocorrer em transação que revalida o horário, cria o substituto, liga os blocos e encerra a sugestão.

## Notificações

### `push_subscriptions`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Inscrição de navegador/dispositivo. |
| `student_id` | Sim | Proprietário. |
| `endpoint` | Sim | Endpoint único de push. |
| `public_key` | Sim | Chave necessária ao protocolo. |
| `auth_secret` | Sim | Segredo protegido. |
| `expires_at` | Não | Expiração quando fornecida. |
| `revoked_at` | Não | Revogação ou falha definitiva. |
| `last_success_at` | Não | Última entrega aceita. |

### `notifications`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Notificação lógica. |
| `student_id` | Sim | Destinatário. |
| `kind` | Sim | Lembrete, risco, atraso ou sugestão. |
| `related_type` | Não | Tipo seguro do objeto relacionado. |
| `related_id` | Não | Identificador do contexto. |
| `scheduled_for` | Sim | Horário planejado. |
| `status` | Sim | `scheduled`, `sent`, `failed` ou `cancelled`. |
| `sent_at` | Não | Envio. |
| `failure_code` | Não | Falha sem segredo. |

Uma tabela complementar de entregas por inscrição pode ser necessária se o aluno tiver vários dispositivos; decisão física posterior.

## Diagnóstico e auditoria

### `risk_assessments`

Persistência é opcional; o cálculo pode ser sob demanda. Se necessário para explicabilidade:

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Avaliação. |
| `student_id` | Sim | Proprietário. |
| `scope_type` | Sim | Conteúdo, disciplina, curso ou evento. |
| `scope_id` | Sim | Objeto avaliado. |
| `required_seconds` | Sim | Carga. |
| `available_seconds` | Sim | Capacidade. |
| `deficit_seconds` | Sim | Déficit. |
| `pressure_value` | Não | Pressão calculada. |
| `factors` | Sim | Entradas explicáveis. |
| `algorithm_version` | Sim | Versão. |
| `calculated_at` | Sim | Momento. |

### `audit_events`

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Evento de auditoria. |
| `actor_user_id` | Não | Usuário responsável; nulo para processo de sistema. |
| `student_scope_id` | Não | Proprietário acadêmico afetado, sem expor conteúdo ao admin. |
| `action` | Sim | Código estável da ação. |
| `entity_type` | Sim | Tipo da entidade. |
| `entity_id` | Sim | Identificador. |
| `occurred_at` | Sim | Momento. |
| `metadata` | Não | Dados mínimos e não sensíveis. |

Auditoria administrativa deve registrar bloqueio, desbloqueio e recuperação. O conteúdo do evento não pode transformar auditoria em canal de acesso acadêmico para administradores.

## Exclusão, arquivamento e retenção

- Cursos, disciplinas, conteúdos e partes com histórico são arquivados.
- Sem histórico, podem ser fisicamente excluídos em transação segura.
- Blocos cancelados permanecem para contador e auditoria.
- Blocos replanejados permanecem ligados ao substituto.
- Sessões concluídas preservam duração e confirmações.
- Propostas descartadas podem ter retenção limitada; política a validar.
- Tokens expirados e inscrições inválidas podem ser removidos conforme política operacional.
- Exclusão de conta pelo aplicativo está fora do MVP, mas o modelo não deve impedir atendimento legal/administrativo futuro.

## Índices lógicos recomendados

Os índices exatos dependem do SGBD, mas as consultas principais exigem suporte para:

- `users(username_normalized)` único;
- `users(email_normalized)` único;
- `courses(student_id, status)`;
- `subjects(student_id, course_id, status)`;
- `contents(student_id, subject_id, archived_at)`;
- `content_parts(content_id, position)`;
- `academic_events(student_id, starts_at)`;
- `availability_intervals(student_id, weekday, start_local_time)`;
- `planning_proposals(student_id, status, requested_at)`;
- `proposed_study_blocks(proposal_id, starts_at)`;
- `study_blocks(student_id, starts_at, ends_at, status)`;
- `study_blocks(content_id, status, starts_at)`;
- `study_sessions(student_id, status)`;
- `study_sessions(content_id, started_at)`;
- `study_sessions(study_block_id)`;
- `replanning_suggestions(overdue_block_id, status)`;
- `notifications(student_id, status, scheduled_for)`;
- `push_subscriptions(student_id, revoked_at)`.

## Restrições que exigem validação transacional

Nem toda regra cabe em chave estrangeira simples. As seguintes operações devem revalidar estado e propriedade na mesma transação:

1. confirmar uma proposta inteira;
2. iniciar ou retomar sessão garantindo exclusividade;
3. aceitar replanejamento;
4. editar horários de bloco;
5. alterar disponibilidade;
6. criar recorrência e todas as ocorrências;
7. vincular partes a bloco/sessão;
8. arquivar ou excluir item com dependências;
9. registrar sessão retroativa;
10. criar evento que possa afetar blocos confirmados.

## Concorrência

- Entidades editáveis críticas usam campo `revision` ou mecanismo equivalente.
- Cliente envia a revisão conhecida; divergência retorna conflito e o estado atual.
- Confirmação de proposta é tudo ou nada.
- Aceitação de sugestão não reserva horário antes da confirmação; portanto revalida conflitos.
- Uma restrição física ou bloqueio transacional garante uma sessão `running` por aluno.
- Processos automáticos de atraso e notificação precisam ser idempotentes.

## Consultas principais previstas

1. Agenda por aluno e intervalo, unindo blocos e eventos sem misturar suas entidades.
2. Conteúdos elegíveis com prioridade, carga e próximo evento relacionado.
3. Horários livres após subtrair ocupações.
4. Blocos atrasados sem primeira sugestão automática.
5. Sessão atualmente em execução.
6. Progresso e carga futura por conteúdo.
7. Cumprimento e tempo por filtros acadêmicos e período.
8. Contadores de cancelamento e replanejamento.
9. Diagnósticos de capacidade até um evento.
10. Proposta com blocos, partes e justificativas.

## Decisões bloqueantes antes da modelagem física

1. Critério de conclusão de conteúdo sem partes.
2. Semântica de parte concluída reutilizada em outro bloco.
3. Regra de carga cumprida para estimativa restante.
4. Política de sobreposição de sessões retroativas.
5. Estados finais e transições ainda marcados como candidatos.
6. Política de criação de evento com intervalo sobre bloco confirmado.
7. Limites de campos, durações, recorrências e horizonte.
8. Verificação obrigatória ou não do e-mail.
9. Retenção de propostas, auditoria e dados cancelados.
