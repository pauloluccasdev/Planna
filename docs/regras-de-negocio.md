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

## Disponibilidade e conflitos

- **RN-DSP-001** — A disponibilidade é uma grade semanal recorrente com vários intervalos por dia.
- **RN-DSP-002** — O Planna impede a criação ou confirmação de blocos fora da disponibilidade.
- **RN-DSP-003** — Ao tentar criar um bloco fora da grade, o aluno pode ampliar a disponibilidade semanal e então prosseguir.
- **RN-DSP-004** — O Planna impede blocos de estudo sobrepostos.
- **RN-DSP-005** — O Planna impede blocos durante um evento acadêmico.
- **RN-DSP-006** — Uma disponibilidade não pode ser removida ou reduzida se isso invalidar blocos futuros; estes devem ser tratados primeiro.

## Planejamento

- **RN-PLN-001** — O aluno pode criar um planejamento manual ou solicitar geração automática.
- **RN-PLN-002** — A geração automática produz uma proposta e nunca altera imediatamente o planejamento vigente.
- **RN-PLN-003** — O aluno pode editar a proposta antes de confirmá-la.
- **RN-PLN-004** — O aluno escolhe o período, os cursos e as disciplinas considerados na geração.
- **RN-PLN-005** — Blocos confirmados são preservados em novas gerações; somente horários livres são utilizados.
- **RN-PLN-006** — Conteúdos com atraso entram automaticamente na proposta, mesmo fora da seleção inicial, mas podem ser removidos durante a revisão.
- **RN-PLN-007** — Um bloco pertence a exatamente um conteúdo e pode estar associado a várias partes desse conteúdo.
- **RN-PLN-008** — Na proposta automática, o Planna define horários e conteúdos; o aluno associa as partes durante a revisão.
- **RN-PLN-009** — O Planna determina a duração dos blocos automáticos.
- **RN-PLN-010** — Blocos manuais podem repetir diariamente até uma data escolhida.
- **RN-PLN-011** — A edição ou exclusão de recorrência pode afetar apenas uma ocorrência ou a série completa.
- **RN-PLN-012** — Alterar a prioridade ou estimativa não altera blocos já confirmados.
- **RN-PLN-013** — Um plano manual abaixo da estimativa é permitido, com alerta de déficit.
- **RN-PLN-014** — Um plano acima da estimativa é permitido, com indicação do excedente.
- **RN-PLN-015** — O planejamento nunca cria blocos fora da disponibilidade; capacidade insuficiente gera alerta de déficit.

## Priorização e risco

- **RN-RSC-001** — Prioridade manual e urgência calculada são conceitos diferentes.
- **RN-RSC-002** — A proximidade de um evento pode fazer conteúdo de baixa prioridade anteceder conteúdo de prioridade alta sem evento próximo.
- **RN-RSC-003** — O cálculo considera prioridade, proximidade de eventos, carga restante, progresso, atrasos e disponibilidade.
- **RN-RSC-004** — O Planna alerta preventivamente quando a disponibilidade é insuficiente para cumprir a carga antes de um evento.

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

## Estados e progresso

- **RN-STS-001** — Um bloco não iniciado torna-se atrasado depois que seu horário programado termina.
- **RN-STS-002** — Um bloco pausado torna-se atrasado quando seu horário programado termina.
- **RN-STS-003** — Concluir um bloco não significa necessariamente concluir o conteúdo.
- **RN-STS-004** — Conteúdo pendente não possui bloco concluído; conteúdo em andamento possui execução e trabalho restante; conteúdo concluído não possui partes ou blocos restantes.
- **RN-STS-005** — Se partes não forem confirmadas ou não houver blocos suficientes, o conteúdo permanece em andamento e demanda novo planejamento.
- **RN-STS-006** — Cancelar o último bloco futuro não conclui o conteúdo; ele fica sinalizado como sem blocos futuros.

## Replanejamento e histórico

- **RN-RPL-001** — O primeiro atraso de um bloco gera automaticamente uma sugestão individual de replanejamento.
- **RN-RPL-002** — Sugestões de blocos diferentes não são agrupadas.
- **RN-RPL-003** — O aluno pode aceitar, editar ou rejeitar uma sugestão.
- **RN-RPL-004** — Nenhuma sugestão altera o plano antes da confirmação explícita.
- **RN-RPL-005** — Depois de uma rejeição, uma nova sugestão somente é criada mediante solicitação do aluno.
- **RN-RPL-006** — O bloco original permanece no histórico como replanejado e ligado ao novo bloco.
- **RN-RPL-007** — Alterações manuais em blocos confirmados preservam os valores anteriores e o momento da mudança.

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
- **RN-NTF-002** — O Planna define as antecedências padrão das notificações.
