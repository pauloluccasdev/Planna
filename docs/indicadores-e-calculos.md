# Indicadores e cálculos

## Objetivo

Os indicadores devem representar fatos diferentes sem misturá-los:

- **cumprimento:** o aluno concluiu os blocos assumidos?
- **tempo:** quanto foi planejado e quanto foi registrado?
- **adaptação:** quantos blocos atrasaram, foram replanejados ou cancelados?
- **capacidade:** há tempo suficiente para cumprir a carga futura?
- **progresso:** o que foi confirmado como concluído?

Um bloco concluído antes do tempo possui cumprimento integral, mesmo com duração realizada menor que a planejada.

## Unidade e período

- Durações devem ser calculadas internamente em unidade inteira, recomendando-se segundos.
- A exibição pode converter para minutos e horas.
- Datas são apresentadas em `America/Sao_Paulo`.
- O aluno escolhe o intervalo e pode filtrar por curso, disciplina e conteúdo.
- O critério temporal de inclusão deve ser documentado por indicador.

## Universo de blocos

Para um filtro `F`, definir:

- `B(F)`: blocos que pertencem ao aluno, ao recorte acadêmico e ao período.
- `E(F)`: blocos elegíveis ao cumprimento.
- `C(F)`: blocos concluídos de `E(F)`.
- `A(F)`: blocos atualmente atrasados no recorte.
- `R(F)`: blocos originais marcados como replanejados no recorte.
- `X(F)`: blocos cancelados no recorte.

Blocos cancelados e originais substituídos por replanejamento não pertencem a `E(F)`.

**A validar:** se o período de blocos replanejados e cancelados usa a data planejada original ou a data da ação.

## Cumprimento do planejamento

Fórmula confirmada:

```text
cumprimento_percentual =
  se |E(F)| = 0: sem_dados
  senão: 100 * |C(F)| / |E(F)|
```

Propriedades:

- cada bloco elegível possui o mesmo peso, independentemente da duração;
- conclusão antecipada conta como concluída;
- conclusão com tempo excedente conta como concluída;
- cancelado não aumenta nem reduz o percentual;
- original replanejado não aumenta nem reduz o percentual;
- o novo bloco criado pelo replanejamento passa a ser elegível normalmente;
- ausência de blocos não deve ser exibida como 0% ou 100%, mas como “sem dados”.

### Exemplo

```text
Blocos confirmados no período: 10
Cancelados: 1
Substituídos por replanejamento: 1
Elegíveis: 8
Concluídos: 6
Cumprimento: 75%
```

## Tempo planejado × realizado

Fórmula confirmada para blocos concluídos:

```text
tempo_planejado_concluido = soma(duracao_planejada de C(F))
tempo_realizado_concluido = soma(duracao_realizada de C(F))

relacao_tempo_percentual =
  se tempo_planejado_concluido = 0: sem_dados
  senão: 100 * tempo_realizado_concluido / tempo_planejado_concluido
```

Esse percentual pode ser menor, igual ou maior que 100% e não representa cumprimento.

### Exemplo de conclusão antecipada

```text
Planejado: 60 min
Realizado: 30 min
Cumprimento do bloco: concluído
Relação de tempo: 50%
Atraso gerado: não
```

### Exemplo de tempo excedente

```text
Planejado: 60 min
Realizado: 80 min
Cumprimento do bloco: concluído
Relação de tempo: 133,33%
Atraso gerado: não
```

O painel deve exibir também os valores absolutos; um percentual sem horas pode induzir interpretação incorreta.

## Composição do tempo realizado

Conforme a regra atual:

```text
duracao_realizada = tempo_foco + tempo_pausa_pomodoro
```

O sistema deve armazenar e poder apresentar separadamente:

- tempo de foco;
- tempo de pausa;
- tempo total realizado.

Períodos em que a sessão esteve pausada aguardando retomada não são pausas do ciclo Pomodoro e não devem ser contabilizados.

## Sessões não planejadas

Sessões não planejadas não possuem uma duração planejada original e, portanto:

- não entram no cumprimento de blocos;
- não entram diretamente no denominador de tempo planejado;
- devem aparecer como tempo adicional efetivamente estudado.

**A validar:** se o painel principal somará esse tempo ao “realizado total” ao lado do planejado ou o exibirá em indicador separado. Até a decisão, preservar os dois valores separadamente.

## Registro retroativo

- Vinculado a um bloco: contribui como execução desse bloco, respeitando sua conclusão.
- Não planejado: segue a regra de sessão não planejada.
- O sistema deve impedir dupla contagem se mais de uma sessão estiver associada ao mesmo bloco.
- A política de sessões retroativas sobrepostas ainda precisa ser validada.

## Contadores de adaptação

### Atrasos atuais

```text
atrasos_atuais = |A(F)|
```

Conta blocos que permanecem atrasados no instante da consulta. Um bloco posteriormente concluído, cancelado ou replanejado deixa esse contador.

Para análise histórica, recomenda-se também preservar “atrasos ocorridos”, mas sua entrada no MVP ainda precisa de validação.

### Replanejamentos

```text
replanejamentos = |R(F)|
```

Conta blocos originais efetivamente substituídos após confirmação. Sugestão apenas gerada, editada ou rejeitada não conta.

### Cancelamentos

```text
cancelamentos = |X(F)|
```

Conta cancelamentos sem incluí-los como não realizados. O registro técnico deve permitir transparência sem recolocar o item no cumprimento.

## Progresso de conteúdo

O estado não pode ser derivado somente de horas, pois o aluno confirma partes e pode concluir um bloco antecipadamente.

### Com partes

Modelo confirmado em alto nível:

- pendente: nenhum bloco concluído e nenhuma parte confirmada;
- em andamento: existe execução ou parte confirmada, mas ainda resta trabalho;
- concluído: não restam partes nem blocos necessários segundo as confirmações;
- sem blocos futuros: sinalização adicional quando ainda há trabalho, mas nada está agendado.

### Sem partes

O critério exato de conclusão ainda está pendente. O sistema deve preservar fatos suficientes para aplicar a decisão posterior sem migração destrutiva.

## Carga planejada de conteúdo

Para um conteúdo:

```text
carga_futura_confirmada = soma(duracao_planejada dos blocos futuros válidos)
saldo_de_planejamento = carga_estimada_restante - carga_futura_confirmada
```

- saldo positivo: horas ainda sem planejamento;
- saldo zero: estimativa coberta;
- saldo negativo: planejamento excedente permitido.

O cálculo de `carga_estimada_restante` depende da regra pendente de carga cumprida.

## Risco de capacidade

Para conteúdo ou conjunto relacionado a um evento:

```text
carga_necessaria = carga_estimada_restante - carga_futura_confirmada_antes_do_evento
capacidade_livre = soma(intervalos livres válidos antes do evento)
deficit = max(0, carga_necessaria - capacidade_livre)

pressao_capacidade =
  se capacidade_livre = 0 e carga_necessaria > 0: infinita
  se capacidade_livre = 0 e carga_necessaria <= 0: 0
  senão: carga_necessaria / capacidade_livre
```

Interpretação candidata:

- `0`: nenhuma carga adicional necessária;
- entre `0` e `1`: cabe na capacidade disponível;
- `1`: consome toda a capacidade disponível;
- acima de `1`: existe déficit.

Faixas visuais de risco ainda precisam ser aprovadas.

## Indicadores por filtro

Filtros devem ser aplicados por propriedade do conteúdo:

```text
Aluno
  -> Curso
    -> Disciplina
      -> Conteúdo
        -> Bloco/Sessão
```

Um evento relacionado pode aparecer no diagnóstico, mas não deve atribuir a mesma hora a múltiplos conteúdos.

## Arredondamento

- Somar durações inteiras antes de converter para percentual.
- Arredondar apenas para apresentação.
- Proposta inicial: uma casa decimal para percentuais; a validar no design.
- Nunca usar valor arredondado para alimentar outro cálculo.

## Recalculo e consistência

Indicadores precisam ser recalculados ou invalidados após:

- conclusão, pausa reconciliada ou edição de sessão;
- registro retroativo;
- cancelamento;
- replanejamento confirmado;
- edição de bloco confirmado;
- alteração de filtros;
- confirmação de partes;
- arquivamento quando aplicável ao filtro.

O mesmo conjunto de fatos deve produzir o mesmo resultado no painel, exportações futuras e ferramentas de IA.

## Exemplos combinados

### Semana com cancelamento e replanejamento

```text
Blocos originais: 6
Cancelado: 1
Replanejado: 1 original + 1 substituto
Elegíveis finais: 5
Concluídos: 4

Cumprimento: 4 / 5 = 80%
Replanejamentos: 1
Cancelamentos: 1
```

O original replanejado é excluído, mas o substituto é incluído.

### Sessão não planejada

```text
Planejado concluído: 120 min
Realizado nos blocos concluídos: 100 min
Estudo não planejado: 40 min

Relação dos blocos: 100 / 120 = 83,3%
Tempo adicional não planejado: 40 min
Tempo total registrado: 140 min
```

Não somar os 40 minutos ao numerador de 100 sem comunicar a mudança de significado.

## Decisões pendentes específicas

1. Como conclusão antecipada reduz a estimativa restante.
2. Como tempo excedente reduz a estimativa restante.
3. Como estudo não planejado reduz a estimativa restante.
4. Como determinar conclusão de conteúdo sem partes.
5. Qual data atribui cancelamento e replanejamento a um período histórico.
6. Se o painel principal combina ou separa tempo não planejado.
7. Se “atrasos ocorridos” entra no MVP além de “atrasos atuais”.
8. Faixas visuais de pressão/risco.
9. Regra de sobreposição e múltiplas sessões retroativas vinculadas ao mesmo bloco.
