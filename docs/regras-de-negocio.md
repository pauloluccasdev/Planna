# Regras de negócio confirmadas

Este documento registra somente decisões confirmadas. As identificações devem ser preservadas em requisitos, testes e implementação.

## Identidade e privacidade

- **RN-AUT-001** — O aluno acessa o sistema com nome de usuário e senha.
- **RN-AUT-002** — O e-mail é obrigatório e suporta a recuperação de acesso.
- **RN-PRV-001** — O administrador não pode acessar dados acadêmicos dos alunos.
- **RN-PRV-002** — Senhas nunca podem ser exibidas ao administrador; a recuperação deve usar redefinição segura.

## Estrutura acadêmica

- **RN-ACA-001** — Um aluno pode possuir vários cursos.
- **RN-ACA-002** — Um curso pode possuir várias disciplinas.
- **RN-ACA-003** — A organização por período ou semestre é opcional.
- **RN-ACA-004** — Um conteúdo pertence a uma disciplina e pode possuir várias partes.
- **RN-ACA-005** — A prioridade é obrigatória no cadastro do conteúdo e editável posteriormente.
- **RN-ACA-006** — A prioridade possui cinco níveis: muito baixa, baixa, média, alta e muito alta, internamente representados de 1 a 5.
- **RN-ACA-007** — A estimativa é informada para o conteúdo completo, não para cada parte.
- **RN-ACA-008** — Conteúdos sem estimativa não entram no planejamento automático, mas podem ser planejados manualmente.
- **RN-ACA-009** — Um item com histórico não pode ser excluído definitivamente; deve ser arquivado.
- **RN-ACA-010** — Itens sem planejamento ou sessões vinculadas podem ser excluídos.

## Eventos acadêmicos

- **RN-EVT-001** — Um evento possui tipo, data, horário e disciplina.
- **RN-EVT-002** — O tipo pode ser sugerido pelo sistema ou personalizado pelo aluno.
- **RN-EVT-003** — Os conteúdos relacionados são selecionados pelo aluno.
- **RN-EVT-004** — Se ainda não conhecer os conteúdos, o aluno pode marcar "conteúdos ainda não informados" e completar depois.
- **RN-EVT-005** — Eventos não possuem estimativa própria; a carga vem das estimativas dos conteúdos.
- **RN-EVT-006** — Eventos podem se sobrepor, mas o Planna deve alertar.
- **RN-EVT-007** — O horário de término é opcional. Evento com início e término reserva o intervalo; evento sem término é apenas um marcador e não reserva período na disponibilidade.

## Disponibilidade e conflitos

- **RN-DSP-001** — A disponibilidade é uma grade semanal recorrente com vários intervalos por dia.
- **RN-DSP-002** — O Planna impede a criação ou confirmação de blocos fora da disponibilidade.
- **RN-DSP-003** — Ao tentar criar um bloco fora da grade, o aluno pode ampliar a disponibilidade semanal e então prosseguir.
- **RN-DSP-004** — O Planna impede blocos de estudo sobrepostos.
- **RN-DSP-005** — O Planna impede blocos durante o intervalo de um evento acadêmico que possua horário de término.
- **RN-DSP-006** — Uma disponibilidade não pode ser removida ou reduzida se isso invalidar blocos futuros; estes devem ser tratados primeiro.
- **RN-DSP-007** — Em um intervalo de disponibilidade, o término `00:00` representa o fim do dia selecionado. O aluno pode replicar uma faixa de horário para os demais dias e editar as cópias antes de salvar.

## Planejamento

- **RN-PLN-001** — O aluno pode criar um planejamento manual ou solicitar geração automática.
- **RN-PLN-002** — A geração automática produz uma proposta e nunca altera imediatamente o planejamento vigente.
- **RN-PLN-003** — O aluno pode editar a proposta antes de confirmá-la.
- **RN-PLN-004** — O aluno escolhe o período, os cursos e as disciplinas considerados na geração.
- **RN-PLN-005** — Blocos confirmados são preservados em novas gerações; somente horários livres são utilizados.
- **RN-PLN-006** — Conteúdos com atraso entram automaticamente na proposta, mesmo fora da seleção inicial, mas podem ser removidos durante a revisão.
- **RN-PLN-007** — Um bloco pertence a exatamente um conteúdo e pode estar associado a várias partes desse conteúdo.
- **RN-PLN-008** — Na proposta automática, o Planna define horários e conteúdos; o aluno associa as partes durante a revisão.
- **RN-PLN-008A** — Quando o conteúdo possui partes ativas, cada bloco da proposta deve ter ao menos uma parte associada antes da confirmação.
- **RN-PLN-009** — O Planna determina a duração dos blocos automáticos.
- **RN-PLN-010** — Blocos manuais podem repetir diariamente até uma data escolhida.
- **RN-PLN-010A** — A criação recorrente é atômica: qualquer ocorrência fora da disponibilidade ou em conflito impede a série inteira.
- **RN-PLN-011** — A edição ou exclusão de recorrência pode afetar apenas uma ocorrência ou a série completa.
- **RN-PLN-012** — Alterar a prioridade ou estimativa não altera blocos já confirmados.
- **RN-PLN-013** — Um plano manual abaixo da estimativa é permitido, com alerta de déficit.
- **RN-PLN-014** — Um plano acima da estimativa é permitido, com indicação do excedente.
- **RN-PLN-015** — O planejamento nunca cria blocos fora da disponibilidade; capacidade insuficiente gera alerta de déficit.

## Priorização e risco

- **RN-RSC-001** — Prioridade manual e urgência calculada são conceitos diferentes.
- **RN-RSC-002** — A proximidade de um evento pode fazer conteúdo de baixa prioridade anteceder conteúdo de prioridade alta sem evento próximo.
- **RN-RSC-003** — No MVP, a ordem de priorização automática considera a prioridade definida pelo aluno e a proximidade de provas ou trabalhos relacionados. Carga restante e disponibilidade determinam quanto pode ser alocado, mas não acrescentam peso à prioridade.
- **RN-RSC-004** — O Planna alerta preventivamente quando a disponibilidade é insuficiente para cumprir a carga antes de um evento.
- **RN-RSC-005** — Ao gerar um período curto, o Planna também considera provas e trabalhos futuros dentro do horizonte versionado de urgência, mesmo que ocorram depois do fim do plano solicitado.

## Sessões, blocos e Pomodoro

- **RN-SES-001** — Um aluno pode ter somente uma sessão com cronômetro em execução por vez.
- **RN-SES-002** — Vários blocos podem permanecer pausados enquanto outra sessão é executada.
- **RN-SES-003** — Uma sessão não planejada deve estar vinculada a um conteúdo e, quando aplicável, a partes dele.
- **RN-SES-004** — Uma sessão retroativa pode ser vinculada a um bloco ou registrada como não planejada.
- **RN-SES-005** — Ao interromper antecipadamente, o aluno escolhe entre pausar e concluir o bloco.
- **RN-SES-006** — Concluir antecipadamente conta como cumprimento sem atraso e preserva a duração real.
- **RN-SES-007** — O aluno pode estudar além da duração planejada e registrar o tempo excedente.
- **RN-SES-008** — Pausas do Pomodoro contam na duração realizada do bloco, embora foco e pausa possam ser armazenados separadamente.
- **RN-SES-009** — Há uma configuração padrão de Pomodoro por aluno, editável em cada bloco.
- **RN-SES-010** — Ao concluir um bloco, o aluno confirma quais partes associadas foram efetivamente concluídas.
- **RN-SES-011** — Minimizar a PWA ou bloquear a tela não pausa a sessão.
- **RN-SES-012** — Em fechamento inesperado, o Planna deve solicitar confirmação posterior do horário de interrupção quando não puder detectá-lo com segurança.
- **RN-SES-013** — Se o estudo atual invadir o próximo bloco, o Planna alerta; o aluno decide continuar, pausar ou concluir.
- **RN-SES-014** — O aluno define como organizar sua sequência de estudo, inclusive quantidade de pausas e alternância de conteúdos. Cada bloco continua pertencendo a um único conteúdo; uma sequência com matérias diferentes é representada por blocos consecutivos.
- **RN-SES-015** — Durante a execução, o aluno pode mudar livremente o conteúdo ou as pausas. O Planna registra o que foi efetivamente realizado sem reescrever silenciosamente os blocos confirmados.
- **RN-SES-016** — Ao escolher o próximo bloco em um alerta de conflito, o Planna pausa a sessão atual e inicia ou retoma a sessão do bloco escolhido atomicamente. Se a troca falhar, a sessão atual continua em execução.

## Estados e progresso

- **RN-STS-001** — Um bloco não iniciado torna-se atrasado depois que seu horário programado termina.
- **RN-STS-002** — Um bloco pausado torna-se atrasado quando seu horário programado termina.
- **RN-STS-003** — Concluir um bloco não significa necessariamente concluir o conteúdo.
- **RN-STS-004** — Conteúdo pendente não possui bloco concluído; conteúdo em andamento possui execução e trabalho restante; conteúdo concluído não possui partes ou blocos restantes.
- **RN-STS-005** — Se partes não forem confirmadas ou não houver blocos suficientes, o conteúdo permanece em andamento e demanda novo planejamento.
- **RN-STS-006** — Cancelar o último bloco futuro não conclui o conteúdo; ele fica sinalizado como sem blocos futuros.
- **RN-STS-007** — Um conteúdo sem partes somente é concluído após confirmação manual do aluno; atingir a estimativa ou concluir o último bloco não o conclui automaticamente.

## Replanejamento e histórico

- **RN-RPL-001** — O primeiro atraso de um bloco gera automaticamente uma sugestão individual de replanejamento.
- **RN-RPL-002** — Sugestões de blocos diferentes não são agrupadas.
- **RN-RPL-003** — O aluno pode aceitar, editar ou rejeitar uma sugestão.
- **RN-RPL-004** — Nenhuma sugestão altera o plano antes da confirmação explícita.
- **RN-RPL-005** — Depois de uma rejeição, uma nova sugestão somente é criada mediante solicitação do aluno.
- **RN-RPL-006** — O bloco original permanece no histórico como replanejado e ligado ao novo bloco.
- **RN-RPL-007** — Alterações manuais em blocos confirmados preservam os valores anteriores e o momento da mudança.
- **RN-RPL-008** — Ao replanejar um bloco parcialmente executado, a sugestão usa somente a duração planejada ainda não realizada. Foco e pausas Pomodoro registrados contam como tempo realizado; períodos em que a sessão ficou pausada aguardando retomada não contam.

## Cancelamento e indicadores

- **RN-KPI-001** — Cumprimento e tempo estudado são indicadores distintos.
- **RN-KPI-002** — Cumprimento é a razão entre blocos concluídos e blocos previstos, excluindo cancelados e substituídos por replanejamento.
- **RN-KPI-003** — Tempo compara duração realizada com duração planejada dos blocos concluídos.
- **RN-KPI-004** — O aluno pode filtrar indicadores por período, curso, disciplina e conteúdo.
- **RN-KPI-005** — Atrasos, replanejamentos e cancelamentos são apresentados em contadores separados.
- **RN-KPI-006** — Um bloco pode ser cancelado mesmo depois de atrasado.
- **RN-KPI-007** — Blocos cancelados não contam como não realizados, mas permanecem no contador de cancelamentos.

## Notificações

- **RN-NTF-001** — O MVP usa notificações do navegador/PWA quando houver permissão e suporte.
- **RN-NTF-002** — O Planna lembra blocos de estudo 15 minutos antes e eventos acadêmicos 7 dias e 1 dia antes. Um lembrete cujo horário já passou antes de ser criado não é enviado retroativamente.
- **RN-NTF-003** — Editar, cancelar, concluir, replanejar ou excluir o item relacionado cancela lembretes pendentes que deixaram de corresponder ao horário vigente.
