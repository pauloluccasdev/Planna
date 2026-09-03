# Estados e transições

Os estados abaixo formam um modelo candidato derivado das regras confirmadas. Itens marcados como **a validar** não devem ser implementados como decisão definitiva sem aprovação.

## Conta

```text
Pendente de verificação (a validar)
        -> Ativa
Ativa  -> Bloqueada
Bloqueada -> Ativa
Ativa/Bloqueada -> Encerrada administrativamente (a validar)
```

O cadastro exige e-mail, mas a obrigatoriedade de verificar o endereço antes do primeiro acesso ainda não foi definida.

## Curso e disciplina

```text
Ativo -> Arquivado -> Ativo
Ativo -> Excluído, somente sem histórico
```

Arquivamento preserva histórico e remove o item de novas gerações. Exclusão não é permitida quando houver bloco ou sessão vinculada.

## Conteúdo

Estados de execução derivados:

```text
Pendente -> Em andamento -> Concluído
Concluído -> Em andamento, se surgir trabalho restante ou novo bloco
```

- **Pendente:** nenhum bloco do conteúdo foi concluído.
- **Em andamento:** existe execução concluída e ainda há partes ou blocos restantes.
- **Concluído:** não há partes ou blocos restantes segundo os fatos confirmados.

Sinalizações independentes do estado:

- sem estimativa;
- sem blocos futuros;
- em risco;
- arquivado.

**A validar:** critério exato de conclusão para conteúdo sem partes.

## Parte de conteúdo

Modelo candidato:

```text
Pendente -> Concluída
Concluída -> Pendente/Em revisão (a validar)
```

A parte somente é concluída após confirmação do aluno no encerramento de uma sessão. O significado de associar uma parte concluída a novos blocos precisa ser definido.

## Proposta de planejamento

```text
Processando -> Pronta
Processando -> Falhou
Pronta -> Em revisão
Pronta/Em revisão -> Confirmada
Pronta/Em revisão -> Descartada
```

- Confirmar cria ou confirma os blocos de forma atômica.
- Descartar não altera a agenda.
- Uma proposta inválida por mudança concorrente deve voltar à revisão ou ser regenerada; comportamento exato a validar.

## Bloco de estudo

Estados principais:

```text
Proposto -> Confirmado
Proposto -> Removido da proposta

Confirmado -> Em execução -> Pausado -> Em execução
Confirmado -> Em execução -> Concluído
Confirmado -> Concluído antecipadamente

Confirmado/Pausado -> Atrasado, após o horário final
Atrasado -> Em execução -> Concluído
Atrasado -> Replanejado

Confirmado/Pausado/Atrasado -> Cancelado
```

Observações:

- “Concluído antecipadamente” pode ser armazenado como conclusão com uma característica derivada, não necessariamente como estado físico separado.
- Um bloco pausado pode coexistir com outros pausados, mas somente um pode estar em execução.
- Cancelado sai do denominador de cumprimento e entra no contador de cancelamentos.
- Replanejado preserva o original e aponta para um novo bloco confirmado.
- Editar um confirmado cria versão histórica, mas pode manter o mesmo estado operacional.

## Sessão de estudo

Modelo candidato:

```text
Em execução -> Pausada -> Em execução
Em execução/Pausada -> Concluída
Em execução -> Interrompida sem horário confiável
Interrompida sem horário confiável -> Concluída após reconciliação
```

Uma sessão retroativa nasce diretamente como concluída após validação.

**A validar:** se pausa e retomada serão uma sessão com segmentos ou várias sessões ligadas ao mesmo bloco.

## Sugestão de replanejamento

```text
Gerada -> Em edição -> Aceita
Gerada/Em edição -> Rejeitada
Gerada -> Expirada (a validar)
```

- Aceita cria novo bloco e torna o original replanejado.
- Rejeitada não altera a agenda.
- Depois da rejeição, outra sugestão depende de solicitação do aluno.

## Evento acadêmico

Eventos não precisam de ciclo de execução no MVP confirmado. Possíveis estados temporais como futuro e passado devem ser derivados da data.

Sinalizações:

- conteúdos informados;
- conteúdos ainda não informados;
- conflito com outro evento;
- risco de preparação insuficiente.

## Matriz resumida de ações

| Estado do bloco | Iniciar | Pausar | Concluir | Cancelar | Replanejar |
|---|---:|---:|---:|---:|---:|
| Confirmado | Sim | Não | Sim | Sim | A validar |
| Em execução | Já ativo | Sim | Sim | A validar | Não |
| Pausado | Retomar | Já pausado | Sim | Sim | Após atraso |
| Atrasado | Sim | Não | Sim | Sim | Sim |
| Concluído | Não | Não | Já concluído | Não | Não |
| Cancelado | Não | Não | Não | Já cancelado | Não |
| Replanejado | Não | Não | Não | Não | Já replanejado |
