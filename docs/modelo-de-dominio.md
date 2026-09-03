# Modelo de domínio conceitual

Este modelo descreve conceitos e relações, sem definir tabelas, tipos de banco ou tecnologia.

## Visão geral

```text
Usuário
├── Perfil de aluno
│   ├── Cursos
│   │   └── Períodos opcionais
│   │       └── Disciplinas
│   │           ├── Conteúdos
│   │           │   └── Partes
│   │           └── Eventos acadêmicos ── Conteúdos relacionados
│   ├── Disponibilidades semanais
│   ├── Configuração padrão de Pomodoro
│   ├── Propostas de planejamento
│   │   └── Blocos propostos
│   ├── Blocos confirmados ── Partes planejadas
│   │   ├── Histórico de versões
│   │   └── Sugestões de replanejamento
│   ├── Sessões de estudo ── Partes confirmadas
│   └── Inscrições de notificação
└── Papel administrativo (sem acesso acadêmico)
```

## Agregados e responsabilidades

### Identidade e acesso

**Usuário** representa credenciais, e-mail, papel e estado da conta. Não deve incorporar dados acadêmicos na visão administrativa.

**Sessão de autenticação** representa um acesso autenticado revogável. Não se confunde com sessão de estudo.

### Estrutura acadêmica

**Curso** é a raiz da organização acadêmica de um aluno. Controla seu estado ativo ou arquivado.

**Período acadêmico** é uma organização opcional dentro do curso. Sua forma final e campos temporais ainda precisam ser validados.

**Disciplina** pertence a um curso e pode estar associada a um período.

**Conteúdo** pertence a uma disciplina. Possui prioridade obrigatória, estimativa opcional, descrição e estado derivado da execução.

**Parte de conteúdo** subdivide um conteúdo. Não possui estimativa própria na regra atual. Pode aparecer em mais de um bloco; o comportamento final desse caso permanece a detalhar.

### Calendário e planejamento

**Evento acadêmico** pertence a uma disciplina, possui tipo, data e horário e pode relacionar vários conteúdos. Quando a matéria ainda não é conhecida, guarda essa condição explicitamente.

**Disponibilidade semanal** pertence ao aluno e representa um intervalo recorrente em um dia da semana.

**Proposta de planejamento** agrega blocos ainda não confirmados, parâmetros da solicitação, alertas e déficits. Não altera o planejamento vigente.

**Bloco de estudo** representa intenção confirmada de estudar um conteúdo em um intervalo. Pode associar várias partes do mesmo conteúdo.

**Série recorrente** agrupa ocorrências diárias criadas a partir da mesma instrução, permitindo operação sobre uma ocorrência ou toda a série.

**Versão de bloco** preserva valores anteriores após mudanças em um bloco confirmado.

### Execução

**Sessão de estudo** representa o que aconteceu de fato. Pode ser iniciada a partir de um bloco, ser não planejada ou ser registrada retroativamente.

Uma sessão mantém intervalos de atividade suficientes para derivar:

- tempo de foco;
- tempo de pausa;
- tempo realizado total;
- início e término efetivos.

**Confirmação de parte** registra quais partes o aluno declarou concluídas ao encerrar uma sessão. Deve preservar a origem da confirmação.

**Configuração de Pomodoro** define foco e pausa padrão do aluno. O bloco pode armazenar uma configuração substituta.

### Adaptação

**Sugestão de replanejamento** pertence a um bloco atrasado e descreve uma alternativa ainda não aplicada.

Ao aceitar, o bloco original permanece como replanejado e um novo bloco é criado com vínculo de origem. Ao rejeitar, a sugestão é encerrada sem alteração da agenda.

**Avaliação de risco** é um resultado calculado para um período, conteúdo ou evento. Expõe carga, capacidade, déficit e fatores usados no cálculo; não é alteração de planejamento.

### Comunicação

**Inscrição de notificação** associa um dispositivo/navegador autorizado ao aluno. Pode expirar ou ser revogada sem afetar a conta.

**Notificação** registra intenção e resultado de envio para lembrete, risco ou replanejamento.

## Relações e cardinalidades

- Um usuário aluno possui zero ou muitos cursos.
- Um curso pertence a exatamente um aluno e possui zero ou muitas disciplinas.
- Um curso possui zero ou muitos períodos opcionais.
- Uma disciplina pertence a exatamente um curso e pode pertencer a zero ou um período.
- Um conteúdo pertence a exatamente uma disciplina e possui zero ou muitas partes.
- Um evento pertence a exatamente uma disciplina e relaciona zero ou muitos conteúdos da própria disciplina.
- Um aluno possui zero ou muitos intervalos de disponibilidade.
- Uma proposta pertence a um aluno e possui um ou muitos blocos propostos enquanto válida.
- Um bloco confirmado pertence a um aluno e exatamente um conteúdo.
- Um bloco relaciona zero ou muitas partes do próprio conteúdo.
- Uma série recorrente possui uma ou muitas ocorrências de bloco.
- Um bloco pode possuir muitas versões históricas.
- Uma sessão pertence a exatamente um aluno e exatamente um conteúdo.
- Uma sessão pode referenciar zero ou um bloco planejado.
- Uma sessão confirma zero ou muitas partes do próprio conteúdo.
- Um bloco pode originar zero ou muitas sessões ao considerar pausas e retomadas; a representação física será decidida na modelagem de dados.
- Um bloco atrasado pode possuir várias sugestões ao longo do tempo, mas somente conforme as regras de geração e rejeição.
- Um bloco replanejado referencia o bloco que o substituiu, e o novo bloco referencia sua origem.

## Invariantes do domínio

1. Dados acadêmicos sempre pertencem, direta ou indiretamente, a um aluno.
2. Vínculos nunca podem atravessar proprietários diferentes.
3. Um bloco possui exatamente um conteúdo.
4. Partes de um bloco, sessão ou evento devem pertencer ao conteúdo ou disciplina correspondente.
5. Um aluno possui no máximo uma sessão de estudo em execução.
6. Blocos confirmados não podem se sobrepor entre si ou a eventos.
7. Eventos podem se sobrepor e geram alerta.
8. Blocos confirmados precisam caber na disponibilidade semanal vigente.
9. Propostas e sugestões não alteram a agenda antes de confirmação.
10. Alterações relevantes preservam histórico conforme as regras confirmadas.
11. Itens com histórico não são excluídos definitivamente.
12. Conteúdo sem estimativa não é elegível para geração automática.

## Separações essenciais

| Conceito | Representa | Pode alterar a agenda? |
|---|---|---|
| Conteúdo | O que precisa ser estudado | Não diretamente |
| Evento | Um compromisso acadêmico | Ocupa horário e influencia urgência |
| Proposta | Uma possibilidade de planejamento | Não |
| Bloco | Uma intenção confirmada | Sim, após ação do aluno |
| Sessão | O estudo efetivamente realizado | Não cria planejamento por si só |
| Sugestão | Alternativa para um atraso | Somente após confirmação |
| Avaliação de risco | Diagnóstico de capacidade | Não |

## Pontos para a modelagem lógica

- Não usar o estado visual como única fonte; preservar fatos e derivar estados quando possível.
- Separar datas planejadas de datas efetivas.
- Preservar duração planejada mesmo após execução antecipada ou excedente.
- Tratar recorrência como série mais ocorrências concretas, pois cada bloco pode ser executado, editado ou cancelado separadamente.
- Modelar relacionamentos entre blocos original e substituto sem apagar o original.
- Projetar isolamento por aluno desde todas as chaves e consultas.
