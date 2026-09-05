# Fluxos principais

## Primeiro planejamento

1. O aluno cria a conta e autentica-se.
2. Cadastra ao menos um curso, uma disciplina e conteúdos.
3. Define prioridade e estimativa de cada conteúdo que entrará na geração automática.
4. Cadastra eventos acadêmicos e relaciona conteúdos conhecidos.
5. Informa um ou mais intervalos de disponibilidade semanal.
6. Escolhe o período, os cursos e as disciplinas da geração.
7. O Planna avalia carga, prioridade, urgência, eventos, disponibilidade e blocos existentes.
8. O sistema apresenta uma proposta sem alterar a agenda vigente.
9. O aluno edita os blocos e associa as partes dos conteúdos.
10. O sistema valida disponibilidade e conflitos.
11. O aluno confirma a proposta.

## Criação de bloco fora da disponibilidade

1. O aluno preenche o bloco e tenta confirmá-lo.
2. O Planna impede a criação e explica que o horário está fora da grade semanal.
3. O aluno escolhe explicitamente adicionar o horário à disponibilidade.
4. O Planna une o horário à grade atual e preserva os dados preenchidos.
5. Em uma série diária, somente os dias da semana abrangidos são incluídos.
6. Nenhum bloco é criado durante a ampliação da grade.
7. O aluno confirma novamente e o Planna revalida disponibilidade e conflitos antes de criar o bloco ou a série.

## Execução de um bloco

1. O aluno abre um bloco e inicia a sessão.
2. O Planna garante que não exista outro cronômetro em execução.
3. O Pomodoro usa a configuração do bloco ou o padrão do aluno.
4. Se o tempo planejado terminar, o aluno pode continuar estudando.
5. Se interromper antes, escolhe entre pausar ou concluir antecipadamente.
6. Ao concluir, informa quais partes foram finalizadas e pode registrar uma observação.
7. O Planna salva tempos planejado, realizado, foco e pausa separadamente.
8. Estados do bloco, partes e conteúdo são recalculados.

Quando o estudo invade o próximo bloco, o aluno pode continuar, concluir ou
trocar. Na troca, o Planna encerra o segmento em execução, mantém a sessão atual
pausada e inicia ou retoma o próximo bloco em uma única transação. Uma falha não
interrompe a sessão atual.

## Atraso e replanejamento

1. O horário completo do bloco termina sem conclusão.
2. O bloco assume o estado atrasado.
3. O Planna gera uma sugestão individual usando horários futuros livres.
4. O aluno aceita, edita ou rejeita.
5. Em aceitação, o bloco original é preservado como replanejado e o novo é confirmado.
6. Em rejeição, nada muda; nova sugestão depende de solicitação do aluno.

## Registro retroativo

1. O aluno informa data, início, fim, conteúdo e partes.
2. Escolhe vincular a um bloco existente/atrasado ou registrar como não planejado.
3. O Planna valida duração e conflitos de sessão.
4. O aluno confirma partes concluídas e observação opcional.
5. Indicadores e progresso são recalculados.

## Alteração da disponibilidade

1. O aluno altera um intervalo recorrente.
2. O Planna verifica blocos futuros afetados.
3. Se houver impacto, impede a mudança e identifica os blocos.
4. O aluno move, replaneja ou cancela os blocos.
5. Após eliminar conflitos, confirma a nova disponibilidade.

## Recuperação de senha

1. O aluno informa o e-mail utilizado no cadastro.
2. O Planna responde de forma neutra, exista ou não uma conta para o endereço.
3. Quando aplicável, o Supabase envia um link temporário para o e-mail.
4. O aluno abre o link e informa e confirma uma nova senha.
5. A API valida o token, altera a credencial e registra a conclusão sem guardar o token.
6. O token anterior não pode concluir outra redefinição e as sessões existentes são revogadas.
