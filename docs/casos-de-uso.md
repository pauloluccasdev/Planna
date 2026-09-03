# Casos de uso

## Modelo de descrição

Cada caso apresenta ator, objetivo, pré-condições, fluxo principal, alternativas, resultado e regras relacionadas. Critérios detalhados de interface serão adicionados nos wireframes.

## UC-001 — Cadastrar aluno

- **Ator:** visitante.
- **Objetivo:** criar uma conta de aluno.
- **Pré-condições:** nome de usuário e e-mail ainda disponíveis; política de senha atendida, quando definida.
- **Fluxo principal:** informa nome de usuário, e-mail e senha; o sistema valida, cria a conta e inicia ou encaminha o acesso conforme a política de verificação a validar.
- **Alternativas:** dados inválidos ou já utilizados são rejeitados sem revelar informações desnecessárias.
- **Resultado:** conta criada com papel de aluno.
- **Requisitos:** RF-AUT-001.

## UC-002 — Recuperar acesso

- **Ator:** usuário não autenticado.
- **Objetivo:** definir nova senha.
- **Fluxo principal:** solicita recuperação; recebe instrução temporária no e-mail; valida o token; define nova senha; tokens anteriores são invalidados.
- **Alternativas:** solicitação inválida ou expirada não altera a conta.
- **Resultado:** senha redefinida com segurança.
- **Requisitos:** RF-AUT-004, RF-AUT-005.

## UC-003 — Configurar estrutura acadêmica

- **Ator:** aluno.
- **Objetivo:** cadastrar a hierarquia usada no planejamento.
- **Pré-condições:** aluno autenticado.
- **Fluxo principal:** cria curso; opcionalmente cria período; cria disciplina; cria conteúdos com prioridade; adiciona estimativa e partes quando aplicável.
- **Alternativas:** conteúdo sem estimativa é salvo, mas sinalizado como inelegível à geração automática.
- **Resultado:** estrutura disponível para eventos e planejamento.
- **Requisitos:** RF-ACA-001 a RF-CON-008.

## UC-004 — Cadastrar evento acadêmico

- **Ator:** aluno.
- **Objetivo:** registrar uma prova, trabalho ou outro compromisso.
- **Pré-condições:** disciplina ativa existente.
- **Fluxo principal:** escolhe ou cria tipo; informa data e horário; seleciona disciplina e conteúdos; salva.
- **Alternativas:** indica conteúdos ainda não informados; se coincidir com outro evento, recebe alerta e pode manter ambos.
- **Resultado:** evento aparece na agenda e influencia urgência e risco.
- **Requisitos:** RF-EVT-001 a RF-EVT-007.

## UC-005 — Configurar disponibilidade

- **Ator:** aluno.
- **Objetivo:** definir horários semanais de estudo.
- **Fluxo principal:** seleciona dia; adiciona um ou vários intervalos; o sistema valida; confirma a grade.
- **Alternativas:** intervalos inválidos são rejeitados; redução com blocos futuros é impedida e os blocos afetados são apresentados.
- **Resultado:** grade passa a restringir blocos manuais e automáticos.
- **Requisitos:** RF-DSP-001 a RF-DSP-004.

## UC-006 — Criar planejamento manual

- **Ator:** aluno.
- **Objetivo:** adicionar bloco diretamente à agenda.
- **Pré-condições:** conteúdo existente e horário livre.
- **Fluxo principal:** escolhe data, horário, conteúdo, partes e Pomodoro; o sistema valida disponibilidade e conflitos; o aluno confirma.
- **Alternativas:** fora da grade, pode ampliá-la; conflito com bloco ou intervalo de evento com término impede confirmação; pode configurar repetição diária com data final.
- **Resultado:** um ou vários blocos confirmados são criados.
- **Requisitos:** RF-PLM-001 a RF-PLM-008.

## UC-007 — Gerar planejamento automático

- **Ator:** aluno.
- **Objetivo:** receber uma proposta executável.
- **Pré-condições:** disponibilidade cadastrada e ao menos um conteúdo elegível ou atrasado.
- **Fluxo principal:** escolhe período, cursos e disciplinas; o Planna reúne entradas; calcula urgência e capacidade; aloca horários livres; apresenta proposta, riscos e déficits.
- **Alternativas:** conteúdos sem estimativa são sinalizados; falta de capacidade não cria blocos fora da grade; falha de processamento não altera a agenda.
- **Resultado:** proposta pronta para revisão, sem mudança no planejamento vigente.
- **Requisitos:** RF-PLA-001 a RF-PLA-008.

## UC-008 — Revisar e confirmar proposta

- **Ator:** aluno.
- **Objetivo:** transformar uma proposta em plano vigente.
- **Pré-condições:** proposta pronta.
- **Fluxo principal:** consulta justificativas; edita blocos; associa partes; remove itens indesejados; solicita confirmação; o sistema revalida e confirma atomicamente.
- **Alternativas:** conflitos recentes impedem confirmação e exigem revisão; o aluno pode descartar tudo.
- **Resultado:** blocos confirmados aparecem na agenda ou a proposta é descartada sem efeito.
- **Requisitos:** RF-PLA-009 a RF-PLA-012.

## UC-009 — Executar bloco planejado

- **Ator:** aluno.
- **Objetivo:** registrar estudo de um bloco.
- **Pré-condições:** nenhuma outra sessão em execução.
- **Fluxo principal:** inicia; usa ciclos de foco e pausa; conclui; confirma partes; adiciona observação opcional; o sistema registra tempos e recalcula progresso.
- **Alternativas:** pausa e retoma; conclui antecipadamente; continua além do previsto; recebe alerta ao invadir o próximo bloco.
- **Resultado:** sessão concluída e bloco atualizado.
- **Requisitos:** RF-SES-003, RF-SES-005 a RF-SES-013.

## UC-010 — Executar estudo não planejado

- **Ator:** aluno.
- **Objetivo:** registrar estudo que não estava na agenda.
- **Pré-condições:** conteúdo existente e nenhuma sessão em execução.
- **Fluxo principal:** escolhe conteúdo e partes; inicia a sessão; executa e conclui como no bloco planejado.
- **Resultado:** sessão classificada como não planejada atualiza progresso e tempo, sem inventar um bloco planejado anterior.
- **Requisitos:** RF-SES-004 a RF-SES-013.

## UC-011 — Registrar estudo retroativo

- **Ator:** aluno.
- **Objetivo:** registrar estudo realizado no passado.
- **Fluxo principal:** informa data, início, fim, conteúdo e partes; escolhe vínculo com bloco ou classificação não planejada; confirma partes e observação; o sistema valida e salva.
- **Alternativas:** conflito temporal segue política ainda a validar; dados inconsistentes são rejeitados.
- **Resultado:** sessão concluída atualiza progresso e indicadores.
- **Requisitos:** RF-SES-015, RF-SES-016.

## UC-012 — Reconciliar sessão interrompida

- **Ator:** aluno.
- **Objetivo:** corrigir uma sessão cujo fechamento não foi detectado com precisão.
- **Pré-condições:** sessão marcada como interrupção sem horário confiável.
- **Fluxo principal:** no próximo acesso, o sistema explica a situação; o aluno informa ou confirma o horário em que parou; o sistema recalcula duração e encerra ou mantém pausada conforme política a validar.
- **Resultado:** nenhum período indefinido é contabilizado silenciosamente.
- **Requisitos:** RF-SES-014.

## UC-013 — Tratar bloco atrasado

- **Atores:** sistema e aluno.
- **Objetivo:** reconhecer atraso e oferecer nova alocação.
- **Pré-condições:** fim do bloco ultrapassado sem conclusão.
- **Fluxo principal:** sistema marca atraso; cria sugestão individual; aluno consulta; aceita ou edita e confirma; sistema preserva original e cria substituto.
- **Alternativas:** aluno rejeita; uma nova sugestão somente surge se ele solicitar; aluno pode executar ou cancelar o bloco atrasado.
- **Resultado:** atraso permanece, é cumprido, cancelado ou replanejado com histórico.
- **Requisitos:** RF-STS-001, RF-RPL-001 a RF-RPL-006.

## UC-014 — Cancelar bloco

- **Ator:** aluno.
- **Objetivo:** retirar um bloco futuro, pausado ou atrasado do plano ativo.
- **Fluxo principal:** seleciona cancelar; confirma a consequência; sistema muda o estado, remove do cumprimento e incrementa cancelamentos.
- **Alternativas:** em série recorrente, escolhe ocorrência ou série; se o conteúdo ficar sem blocos futuros, o sistema alerta.
- **Resultado:** bloco cancelado preservado para o contador e auditoria, sem contar como não realizado.
- **Requisitos:** RF-STS-003 a RF-STS-005.

## UC-015 — Consultar indicadores

- **Ator:** aluno.
- **Objetivo:** avaliar execução e capacidade.
- **Fluxo principal:** escolhe período e filtros opcionais; consulta cumprimento, tempo, atrasos, replanejamentos, cancelamentos e riscos.
- **Alternativas:** ausência de dados deve produzir estado vazio explicativo, não divisão inválida.
- **Resultado:** visão coerente do planejado e realizado.
- **Requisitos:** RF-KPI-001 a RF-KPI-006.

## UC-016 — Administrar conta

- **Ator:** administrador.
- **Objetivo:** consultar estado, bloquear, desbloquear ou iniciar recuperação.
- **Pré-condições:** administrador autenticado e autorizado.
- **Fluxo principal:** localiza conta; consulta somente dados permitidos; executa ação; sistema registra auditoria.
- **Alternativas:** tentativa de acessar dados acadêmicos é negada; administrador não visualiza ou define senha conhecida.
- **Resultado:** estado de acesso atualizado ou recuperação iniciada.
- **Requisitos:** RF-ADM-001 a RF-ADM-005.

## UC-017 — Receber notificação

- **Atores:** aluno e sistema.
- **Objetivo:** lembrar bloco ou evento e comunicar situação relevante.
- **Pré-condições:** navegador compatível, permissão concedida e inscrição válida.
- **Fluxo principal:** aluno concede permissão; sistema registra inscrição; agenda e envia notificações conforme regras do Planna; toque direciona ao contexto correspondente.
- **Alternativas:** recusa, expiração ou falha de push não bloqueiam o aplicativo.
- **Resultado:** lembrete entregue quando o canal estiver disponível.
- **Requisitos:** RF-NTF-001 a RF-NTF-004.

## Edge cases prioritários para testes

1. Duas abas tentam iniciar sessões simultaneamente.
2. Dois dispositivos tentam confirmar propostas conflitantes.
3. Um evento é criado sobre um bloco já existente.
4. A disponibilidade muda enquanto uma proposta está em revisão.
5. Um bloco termina enquanto a sessão está pausada.
6. Uma sessão excede o próximo bloco.
7. Um conteúdo perde seu último bloco por cancelamento.
8. Uma parte aparece em vários blocos e é concluída no primeiro.
9. Um registro retroativo coincide com outra sessão.
10. Um bloco replanejado é cancelado.
11. O aluno conclui antecipadamente com partes não concluídas.
12. O período filtrado não possui blocos elegíveis para o KPI.
13. Uma série diária cruza o fim da disponibilidade ou um evento futuro.
14. Um conteúdo ou disciplina é arquivado enquanto possui blocos futuros.
15. O navegador fecha sem entregar evento de encerramento da sessão.
