# Requisitos funcionais

## Convenções

- **Ator Aluno:** usuário autenticado que acessa somente os próprios dados acadêmicos.
- **Ator Administrador:** usuário autenticado com acesso restrito à gestão de contas.
- **Sistema:** processos automáticos executados pelo Planna.
- Cada requisito referencia as regras de negócio diretamente relacionadas.

## Conta e autenticação

- **RF-AUT-001 — Cadastrar aluno:** o sistema deve permitir cadastro com nome de usuário, e-mail e senha. Referências: RN-AUT-001, RN-AUT-002.
- **RF-AUT-002 — Autenticar usuário:** o sistema deve autenticar aluno ou administrador com nome de usuário e senha. Referência: RN-AUT-001.
- **RF-AUT-003 — Encerrar sessão:** o usuário deve poder sair da conta e invalidar sua sessão de acesso.
- **RF-AUT-004 — Solicitar recuperação:** o usuário deve poder solicitar recuperação de acesso usando o e-mail cadastrado. Referência: RN-AUT-002.
- **RF-AUT-005 — Redefinir senha:** o sistema deve aceitar uma redefinição segura e temporária sem revelar a senha anterior. Referência: RN-PRV-002.
- **RF-AUT-006 — Bloquear acesso:** uma conta bloqueada pelo administrador não deve conseguir se autenticar.

## Administração

- **RF-ADM-001 — Listar contas:** o administrador deve poder listar e localizar contas sem visualizar dados acadêmicos. Referência: RN-PRV-001.
- **RF-ADM-002 — Consultar estado da conta:** o administrador deve visualizar dados cadastrais e o estado de acesso da conta.
- **RF-ADM-003 — Bloquear e desbloquear:** o administrador deve poder bloquear ou desbloquear uma conta.
- **RF-ADM-004 — Auxiliar recuperação:** o administrador deve poder iniciar um fluxo seguro de recuperação, sem conhecer ou definir diretamente a senha. Referência: RN-PRV-002.
- **RF-ADM-005 — Restringir dados acadêmicos:** toda operação administrativa deve impedir acesso a cursos, disciplinas, conteúdos, agenda, sessões e indicadores do aluno. Referência: RN-PRV-001.

## Cursos, períodos e disciplinas

- **RF-ACA-001 — Gerenciar cursos:** o aluno deve poder criar, consultar, editar, arquivar e, quando permitido, excluir seus cursos. Referências: RN-ACA-001, RN-ACA-009, RN-ACA-010.
- **RF-ACA-002 — Gerenciar períodos:** o aluno deve poder organizar opcionalmente um curso em períodos ou semestres. Referência: RN-ACA-003.
- **RF-ACA-003 — Gerenciar disciplinas:** o aluno deve poder criar, consultar, editar, arquivar e, quando permitido, excluir disciplinas de um curso. Referências: RN-ACA-002, RN-ACA-009, RN-ACA-010.
- **RF-ACA-004 — Associar disciplina a período:** o aluno deve poder vincular ou desvincular uma disciplina de um período opcional.
- **RF-ACA-005 — Preservar histórico arquivado:** cursos e disciplinas arquivados não devem participar de novas gerações, mas devem continuar disponíveis no histórico.
- **RF-ACA-006 — Proteger exclusão com histórico:** o sistema deve impedir exclusão definitiva quando houver planejamento ou sessão vinculada. Referências: RN-ACA-009, RN-ACA-010.

## Conteúdos e partes

- **RF-CON-001 — Gerenciar conteúdo:** o aluno deve poder criar, consultar, editar, arquivar e, quando permitido, excluir conteúdos de uma disciplina.
- **RF-CON-002 — Exigir prioridade:** o cadastro de conteúdo deve exigir um dos cinco níveis de prioridade. Referências: RN-ACA-005, RN-ACA-006.
- **RF-CON-003 — Alterar prioridade:** o aluno deve poder editar a prioridade sem modificar blocos confirmados. Referência: RN-PLN-012.
- **RF-CON-004 — Informar estimativa:** o aluno deve poder informar ou alterar a estimativa do conteúdo completo. Referências: RN-ACA-007, RN-PLN-012.
- **RF-CON-005 — Sinalizar estimativa ausente:** o sistema deve identificar conteúdos sem estimativa e excluí-los da geração automática. Referência: RN-ACA-008.
- **RF-CON-006 — Gerenciar partes:** o aluno deve poder criar, consultar, editar, ordenar e remover partes de um conteúdo, respeitando o histórico associado.
- **RF-CON-007 — Exibir progresso:** o sistema deve apresentar estado e progresso do conteúdo e de suas partes com base nos blocos e confirmações. Referências: RN-STS-003 a RN-STS-006.
- **RF-CON-008 — Sinalizar falta de blocos:** o sistema deve avisar quando um conteúdo pendente ou em andamento não possuir blocos futuros. Referência: RN-STS-006.

## Eventos acadêmicos

- **RF-EVT-001 — Gerenciar evento:** o aluno deve poder criar, consultar, editar e excluir eventos acadêmicos próprios.
- **RF-EVT-002 — Definir tipo:** o aluno deve poder escolher um tipo sugerido ou cadastrar um tipo personalizado. Referência: RN-EVT-002.
- **RF-EVT-003 — Informar data acadêmica:** o evento deve possuir data, horário inicial e disciplina; o horário de término é opcional. Referências: RN-EVT-001, RN-EVT-007.
- **RF-EVT-004 — Relacionar conteúdos:** o aluno deve poder selecionar um ou vários conteúdos da disciplina relacionados ao evento. Referência: RN-EVT-003.
- **RF-EVT-005 — Registrar conteúdo desconhecido:** o aluno deve poder indicar que os conteúdos ainda não foram informados e completar a seleção depois. Referência: RN-EVT-004.
- **RF-EVT-006 — Alertar sobre eventos sobrepostos:** o sistema deve permitir eventos coincidentes e alertar sobre a sobreposição. Referência: RN-EVT-006.
- **RF-EVT-007 — Exibir na agenda:** eventos devem aparecer junto aos blocos, com distinção visual.
- **RF-EVT-008 — Reservar intervalo:** evento com término deve impedir blocos durante seu intervalo; evento sem término deve permanecer apenas como marcador. Referência: RN-EVT-007.

## Disponibilidade

- **RF-DSP-001 — Gerenciar grade semanal:** o aluno deve poder cadastrar vários intervalos recorrentes por dia da semana. Referência: RN-DSP-001.
- **RF-DSP-002 — Validar intervalo:** o sistema deve impedir intervalos inválidos ou sobrepostos dentro da grade do aluno.
- **RF-DSP-003 — Validar blocos afetados:** antes de reduzir ou remover disponibilidade, o sistema deve localizar blocos futuros que seriam invalidados e impedir a alteração. Referência: RN-DSP-006.
- **RF-DSP-004 — Ampliar disponibilidade durante criação:** ao criar bloco fora da grade, o sistema deve oferecer inclusão daquele horário na disponibilidade semanal. Referência: RN-DSP-003.

## Planejamento manual

- **RF-PLM-001 — Criar bloco:** o aluno deve poder criar bloco para um único conteúdo e selecionar várias partes desse conteúdo. Referência: RN-PLN-007.
- **RF-PLM-002 — Validar disponibilidade:** o sistema deve impedir bloco fora da disponibilidade semanal. Referência: RN-DSP-002.
- **RF-PLM-003 — Validar conflitos:** o sistema deve impedir sobreposição com outro bloco ou com o intervalo de evento acadêmico que possua término. Referências: RN-DSP-004, RN-DSP-005.
- **RF-PLM-004 — Editar bloco:** o aluno deve poder editar blocos futuros, preservando versões anteriores de blocos já confirmados. Referência: RN-RPL-007.
- **RF-PLM-005 — Criar recorrência diária:** o aluno deve poder repetir um bloco diariamente até uma data final. Referência: RN-PLN-010.
- **RF-PLM-006 — Alterar recorrência:** o aluno deve poder editar ou excluir somente uma ocorrência ou a série completa. Referência: RN-PLN-011.
- **RF-PLM-007 — Alertar déficit:** o sistema deve comparar a carga planejada com a estimativa e alertar sobre carga insuficiente. Referência: RN-PLN-013.
- **RF-PLM-008 — Indicar excedente:** o sistema deve permitir carga superior à estimativa e informar o excedente. Referência: RN-PLN-014.

## Planejamento automático

- **RF-PLA-001 — Solicitar geração:** o aluno deve escolher período, cursos e disciplinas para solicitar uma proposta. Referência: RN-PLN-004.
- **RF-PLA-002 — Validar elegibilidade:** o sistema deve sinalizar e não alocar conteúdo sem estimativa. Referência: RN-ACA-008.
- **RF-PLA-003 — Preservar compromissos:** a geração deve considerar blocos confirmados e intervalos de eventos com término como horários indisponíveis. Referências: RN-PLN-005, RN-DSP-005.
- **RF-PLA-004 — Incluir atrasos:** a proposta deve incluir conteúdos com blocos atrasados, ainda que fora da seleção inicial. Referência: RN-PLN-006.
- **RF-PLA-005 — Priorizar conteúdos:** o sistema deve ordenar a alocação considerando prioridade, urgência, carga, progresso, atraso e disponibilidade. Referências: RN-RSC-001 a RN-RSC-003.
- **RF-PLA-006 — Gerar blocos:** o sistema deve determinar duração e horário de blocos somente dentro da disponibilidade. Referências: RN-PLN-009, RN-PLN-015.
- **RF-PLA-007 — Informar capacidade insuficiente:** a proposta deve informar horas não alocadas e itens em risco. Referências: RN-PLN-015, RN-RSC-004.
- **RF-PLA-008 — Manter como proposta:** a geração não deve alterar o planejamento vigente. Referência: RN-PLN-002.
- **RF-PLA-009 — Revisar proposta:** o aluno deve poder alterar dia, horário, duração e conteúdo, remover blocos e associar partes. Referências: RN-PLN-003, RN-PLN-008.
- **RF-PLA-010 — Validar proposta:** o sistema deve validar disponibilidade, conflitos, vínculos e carga antes da confirmação.
- **RF-PLA-011 — Confirmar proposta:** somente uma ação explícita do aluno deve transformar a proposta válida em planejamento vigente. Referência: RN-PLN-002.
- **RF-PLA-012 — Descartar proposta:** o aluno deve poder rejeitar a proposta sem afetar o planejamento atual.

## Agenda

- **RF-AGE-001 — Visualizar agenda:** o aluno deve visualizar blocos e eventos dentro de um período escolhido.
- **RF-AGE-002 — Diferenciar itens e estados:** a agenda deve distinguir visualmente eventos, blocos e estados de execução.
- **RF-AGE-003 — Consultar detalhes:** o aluno deve acessar conteúdo, partes, duração, Pomodoro, histórico e estado de cada bloco.
- **RF-AGE-004 — Alertar conflito durante execução:** se uma sessão ultrapassar o próximo bloco, o sistema deve alertar sem alterar automaticamente a agenda. Referência: RN-SES-013.

## Sessões e Pomodoro

- **RF-SES-001 — Configurar Pomodoro padrão:** o aluno deve definir tempos padrão de foco e pausa. Referência: RN-SES-009.
- **RF-SES-002 — Configurar Pomodoro do bloco:** o aluno deve poder substituir a configuração padrão em um bloco. Referência: RN-SES-009.
- **RF-SES-003 — Iniciar bloco planejado:** o aluno deve poder iniciar uma sessão vinculada a um bloco.
- **RF-SES-004 — Iniciar estudo não planejado:** o aluno deve poder iniciar uma sessão escolhendo conteúdo e partes. Referência: RN-SES-003.
- **RF-SES-005 — Garantir sessão única:** o sistema deve impedir dois cronômetros simultâneos para o mesmo aluno. Referência: RN-SES-001.
- **RF-SES-006 — Pausar sessão:** o aluno deve poder pausar e manter o bloco disponível para retomada. Referência: RN-SES-002.
- **RF-SES-007 — Retomar sessão:** o aluno deve poder retomar um bloco pausado quando não houver outro cronômetro em execução.
- **RF-SES-008 — Continuar além do previsto:** o cronômetro deve permitir duração superior à planejada. Referência: RN-SES-007.
- **RF-SES-009 — Concluir antecipadamente:** o aluno deve poder concluir antes do tempo sem gerar atraso. Referência: RN-SES-006.
- **RF-SES-010 — Confirmar partes:** na conclusão, o sistema deve solicitar confirmação das partes efetivamente finalizadas. Referência: RN-SES-010.
- **RF-SES-011 — Registrar observação:** na conclusão, o aluno deve poder adicionar observação opcional.
- **RF-SES-012 — Registrar tempos:** o sistema deve preservar separadamente duração planejada, realizada, foco e pausa; foco mais pausa compõe o realizado. Referência: RN-SES-008.
- **RF-SES-013 — Manter em segundo plano:** minimizar a PWA ou bloquear a tela não deve encerrar a sessão. Referência: RN-SES-011.
- **RF-SES-014 — Reconciliar interrupção:** ao detectar encerramento inesperado sem horário confiável, o sistema deve pedir confirmação no próximo acesso. Referência: RN-SES-012.
- **RF-SES-015 — Registrar retroativamente:** o aluno deve informar data, início, fim, conteúdo, partes e observação opcional de uma sessão anterior. Referência: RN-SES-004.
- **RF-SES-016 — Classificar retroativo:** o aluno deve vincular o registro a um bloco ou classificá-lo como não planejado. Referência: RN-SES-004.

## Estados, atraso e cancelamento

- **RF-STS-001 — Detectar atraso:** depois do fim programado, o sistema deve marcar como atrasado bloco não concluído, inclusive pausado. Referências: RN-STS-001, RN-STS-002.
- **RF-STS-002 — Recalcular progresso:** após execução, edição, cancelamento ou replanejamento, o sistema deve recalcular os estados derivados de partes e conteúdos.
- **RF-STS-003 — Cancelar bloco:** o aluno deve poder cancelar bloco futuro ou atrasado. Referência: RN-KPI-006.
- **RF-STS-004 — Preservar cancelamento:** o sistema deve excluir o cancelado do cumprimento e incluí-lo no contador específico. Referência: RN-KPI-007.
- **RF-STS-005 — Detectar conteúdo descoberto:** após cancelamento, o sistema deve sinalizar conteúdo ainda incompleto e sem blocos futuros. Referência: RN-STS-006.

## Replanejamento

- **RF-RPL-001 — Gerar primeira sugestão:** ao detectar o primeiro atraso, o sistema deve criar uma sugestão individual para o bloco. Referências: RN-RPL-001, RN-RPL-002.
- **RF-RPL-002 — Consultar sugestão:** o aluno deve visualizar o bloco original, a alternativa e a justificativa.
- **RF-RPL-003 — Editar sugestão:** o aluno deve poder alterar a alternativa antes de confirmar. Referência: RN-RPL-003.
- **RF-RPL-004 — Aceitar sugestão:** após confirmação, o sistema deve preservar o original como replanejado e criar o novo bloco ligado a ele. Referências: RN-RPL-004, RN-RPL-006.
- **RF-RPL-005 — Rejeitar sugestão:** a rejeição não deve alterar a agenda. Referência: RN-RPL-004.
- **RF-RPL-006 — Solicitar nova sugestão:** após rejeição, somente solicitação do aluno deve produzir nova sugestão. Referência: RN-RPL-005.

## Indicadores e riscos

- **RF-KPI-001 — Calcular cumprimento:** o sistema deve calcular blocos concluídos sobre blocos elegíveis previstos, excluindo cancelados e substituídos. Referência: RN-KPI-002.
- **RF-KPI-002 — Comparar tempo:** o sistema deve comparar duração realizada e planejada dos blocos concluídos. Referência: RN-KPI-003.
- **RF-KPI-003 — Contabilizar ocorrências:** o sistema deve apresentar atrasos atuais, replanejamentos e cancelamentos separadamente. Referência: RN-KPI-005.
- **RF-KPI-004 — Filtrar indicadores:** o aluno deve filtrar por período, curso, disciplina e conteúdo. Referência: RN-KPI-004.
- **RF-KPI-005 — Detectar risco:** o sistema deve comparar carga restante e disponibilidade anterior ao evento. Referência: RN-RSC-004.
- **RF-KPI-006 — Explicar risco:** o sistema deve mostrar déficit de horas e conteúdos ou eventos afetados.

## Notificações

- **RF-NTF-001 — Solicitar permissão:** a PWA deve solicitar permissão em contexto compreensível e iniciado pelo aluno.
- **RF-NTF-002 — Registrar dispositivo:** o sistema deve associar a inscrição de notificação ao aluno autenticado.
- **RF-NTF-003 — Notificar:** o sistema deve emitir lembretes conforme regras de antecedência definidas para o Planna. Referências: RN-NTF-001, RN-NTF-002.
- **RF-NTF-004 — Respeitar indisponibilidade:** a ausência de permissão ou suporte não deve impedir as demais funções da plataforma.
