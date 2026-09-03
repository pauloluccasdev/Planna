# Escopo do MVP

## Incluído

### Contas

- Cadastro com nome de usuário, e-mail obrigatório e senha.
- Autenticação por nome de usuário e senha.
- Recuperação segura de senha por e-mail.
- Administração de contas: consulta, bloqueio, desbloqueio e auxílio na recuperação.
- Separação entre aluno e administrador.

### Estrutura acadêmica

- Vários cursos por aluno.
- Disciplinas dentro de cursos.
- Períodos ou semestres opcionais.
- Conteúdos com nome, descrição, prioridade obrigatória e estimativa de duração.
- Partes opcionais dentro de um conteúdo.
- Arquivamento de cursos e disciplinas com preservação do histórico.

### Eventos acadêmicos

- Tipos sugeridos como prova, teste, trabalho e simulado.
- Tipos personalizados.
- Data e horário únicos por evento.
- Vínculo obrigatório com uma disciplina.
- Seleção de conteúdos cobrados ou estado "conteúdos ainda não informados".
- Exibição dos eventos na mesma agenda dos blocos.

### Disponibilidade

- Grade semanal recorrente.
- Vários intervalos por dia.
- Impedimento de blocos fora da disponibilidade.
- Oferta para ampliar a grade quando o aluno tentar criar um bloco fora dela.

### Planejamento

- Criação manual.
- Geração automática.
- Seleção dos cursos e disciplinas considerados na geração.
- Período da geração escolhido pelo aluno, inclusive até um semestre.
- Proposta automática revisável antes da confirmação.
- Edição de dia, horário, duração, conteúdo e partes durante a revisão.
- Preservação dos blocos já confirmados ao gerar novas propostas.
- Blocos manuais com repetição diária e data final.
- Edição ou exclusão de uma ocorrência ou da série completa.

### Execução

- Um bloco pertence a um único conteúdo e pode incluir várias partes dele.
- Pomodoro com configuração padrão do aluno e substituição por bloco.
- Duração dos blocos automáticos definida pelo Planna.
- Uma única sessão com cronômetro em execução por aluno.
- Vários blocos podem permanecer pausados.
- Sessões planejadas, não planejadas e retroativas.
- Registro retroativo vinculável a bloco existente ou como estudo não planejado.
- Observação opcional ao finalizar o bloco.
- Confirmação das partes efetivamente concluídas.

### Acompanhamento e adaptação

- Cumprimento do planejamento.
- Tempo planejado comparado ao realizado.
- Contadores de atrasos, replanejamentos e cancelamentos.
- Filtros por período, curso, disciplina e conteúdo.
- Detecção preventiva de capacidade insuficiente.
- Sugestão automática por bloco atrasado.
- Aceitação, edição ou rejeição da sugestão.
- Histórico de alterações e ligações entre blocos originais e replanejados.

### Notificações

- Notificações pelo navegador/PWA, sujeitas à permissão e ao suporte do dispositivo.
- Antecedências definidas pelo Planna.

## Fora do MVP

- Funcionamento offline e sincronização offline.
- Importação de planejamento por planilha ou PDF.
- Exceções de disponibilidade para datas específicas.
- Exclusão autônoma da conta pelo aluno.
- Fusos horários configuráveis.
- Aplicativos Android e iOS nativos.
- Acesso do administrador aos dados acadêmicos.

## Evoluções candidatas

- Importação por modelos padronizados de planilha e PDF, somente para blocos.
- Disponibilidade excepcional por data.
- Suporte offline seletivo.
- Fuso horário por aluno.
- IA consultiva baseada nos dados reais, com sugestões sem alteração autônoma.
