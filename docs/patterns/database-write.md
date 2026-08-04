# Padrão Oficial de Escrita no Banco (obrigatório)

> Documento normativo. Vale para **todo** código novo e para qualquer refatoração de código existente.
> Origem: bug da Etapa 1.26.00 (UPDATE filtrado pela RLS, 0 linhas afetadas, `error === null`,
> UI exibindo "salvo com sucesso"). Endurecimento aplicado na Etapa 1.26.07.

---

## 1. Por que este padrão existe

Com RLS habilitada, uma operação **não autorizada não gera erro**. O Postgres simplesmente não encontra
linhas para afetar. O cliente recebe:

```
error === null      // nenhuma exceção
data === []         // zero linhas
```

Se a UI decidir sucesso apenas por `error === null`, ela **mente para o usuário**: o dado não foi gravado,
mas a tela diz que foi. Esse é o pior tipo de bug — silencioso, não reproduzível por log e destrutivo
para a confiança no produto.

---

## 2. Padrão oficial

```
insert() / update() / delete()
        ↓
.select()                       ← SEMPRE encadear
        ↓
validar error                   ← erro real → falha
        ↓
validar data.length             ← 0 linhas → operação NÃO aplicada → falha
        ↓
somente então emitir sucesso    ← toast, fechar modal, atualizar estado
```

**Detalhamento**

1. **`.select()` é obrigatório em toda escrita.** Sem ele o cliente não recebe as linhas afetadas e é
   impossível distinguir "gravou" de "a RLS bloqueou". É a única forma de saber a verdade.
2. **`error`** cobre falhas técnicas: violação de constraint, coluna inexistente, timeout, rede.
   Deve ser tratado primeiro e nunca exposto cru ao usuário (mensagem sanitizada).
3. **`data.length`** cobre falhas de autorização e de filtro: RLS negou, o `id` do `.eq()` não existe,
   o registro pertence a outro evento. Zero linhas = **falha**, não sucesso.
4. **Sucesso** significa: `error` nulo **E** ao menos uma linha retornada. Só nesse ponto pode haver
   toast de confirmação, fechamento de diálogo, atualização de estado local ou log de auditoria.
5. **Nunca fazer UI otimista** em gerenciadores de dados: atualize o estado depois da confirmação.

### Exemplo de referência

```ts
const { data, error } = await supabase
  .from("wedding_details")
  .update(payload)
  .eq("id", weddingId)
  .select();

if (error) {
  toast({ title: "Não foi possível salvar.", variant: "destructive" });
  return;
}

if (!Array.isArray(data) || data.length === 0) {
  toast({
    title: "Nenhuma alteração foi aplicada.",
    description: "Verifique suas permissões e tente novamente.",
    variant: "destructive",
  });
  return;
}

toast({ title: "Alterações salvas." });
```

---

## 3. Nunca utilizar

| Proibido | Motivo |
|---|---|
| `.single()` em escrita | lança erro quando há 0 ou >1 linhas, transformando bloqueio de RLS em erro técnico confuso |
| `.maybeSingle()` em escrita | devolve `null` silenciosamente em 0 linhas — mascara exatamente o bug 1.26.00 |
| toast de sucesso baseado só em `error` | ignora as linhas afetadas |
| assumir sucesso sem `.select()` | impossível verificar o resultado |
| ignorar `data.length` | mesma classe de erro |
| UI otimista antes da confirmação | mostra estado que não existe no banco |

`.single()` / `.maybeSingle()` continuam **permitidos em leituras** (`select()` de um registro conhecido),
onde o significado de "nenhuma linha" é legítimo.

---

## 4. Operações válidas com zero linhas (exceções explícitas)

Zero linhas é resultado aceitável — e deve ser **comentado no código** — quando a operação é
intencionalmente idempotente ou de limpeza:

- **limpezas / cleanup:** apagar registros que talvez já não existam
  (ex.: `deleteRolePermissions` em `src/lib/permissions.ts`);
- **deleções idempotentes:** "garantir que não exista" — repetir a chamada não deve falhar;
- **sincronizações:** fila offline reenviada, em que o item já foi aplicado antes
  (ex.: sincronização de check-in);
- **desmarcações em lote:** limpar uma flag que talvez já esteja limpa.

Nesses casos, validar `error` continua obrigatório; apenas a checagem de `data.length` é dispensada,
com comentário justificando (`// cleanup: zero rows is a valid outcome`).

---

## 5. Fluxo obrigatório

```
                 UPDATE / INSERT / DELETE
                            │
                            ▼
                        .select()
                            │
                            ▼
                        error ?
                    ┌───────┴───────┐
                  sim              não
                    │               │
                    ▼               ▼
             mostrar erro     data.length == 0 ?
             (sanitizado)    ┌───────┴───────┐
                           sim              não
                            │               │
                            ▼               ▼
                 "Operação não aplicada"  SUCESSO
                 (permissão / registro    (toast, fechar modal,
                  inexistente)             atualizar estado, log)
```

Exceção única: operações da seção 4, que podem seguir para SUCESSO com `data.length == 0`,
desde que isso esteja explicitamente comentado no código.

---

## 6. Checklist de revisão (PR / etapa)

- [ ] Toda escrita encadeia `.select()`.
- [ ] `error` é verificado antes de qualquer coisa.
- [ ] `data.length === 0` é tratado como falha (ou documentado como exceção da seção 4).
- [ ] Nenhuma escrita usa `.single()` ou `.maybeSingle()`.
- [ ] Nenhum toast de sucesso antes da confirmação.
- [ ] Nenhuma atualização otimista de estado.
- [ ] Mensagens de erro sanitizadas (sem detalhes técnicos de SQL/RLS).
