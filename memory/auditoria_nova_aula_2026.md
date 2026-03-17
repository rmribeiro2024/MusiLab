# Auditoria — Módulo Nova Aula (2026-03-17)

**4.006 linhas auditadas:** TelaPrincipal.tsx (2031) + PlanosContext.tsx (1613) + TipTapEditor.tsx (362)

---

## BUGS CRÍTICOS

| # | Severidade | Problema | Arquivo:Linha |
|---|-----------|----------|---------------|
| 1 | 🔴 Crítico | `planoAtual` lido do ctx global pode estar desatualizado vs. `planoEditando` → perda silenciosa de `notasAdaptacao` | TelaPrincipal:1429 |
| 2 | 🟡 Médio | `planoOriginalRef` declarado e atribuído mas nunca lido para comparação | TelaPrincipal:344 |
| 3 | 🟡 Médio | Reordenação mobile com double-tap rápido pode causar swap duplo (sem debounce) | TelaPrincipal:654 |
| 4 | 🟡 Médio | `objetivosEspecificos` salvo como array de 1 HTML string → perde múltiplos objetivos em fluxos legados | TelaPrincipal:985 |
| 5 | 🟡 Médio | `setEstadoSalvar('salvo')` dispara em 400ms fixo mesmo que `salvarPlano()` ainda esteja em andamento | TelaPrincipal:187 |
| 6 | 🟡 Médio | TipTapEditor captura `onHashTrigger`/`onHashCancel` em stale closure do `useEditor` | TipTapEditor:232 |

---

## QUICK WINS

| Fix | Arquivo | Impacto |
|-----|---------|---------|
| Placeholder `"-- min"` → `"Ex: 10 min"` | TelaPrincipal:673 | UX |
| Banco lateral mantém aberto ao importar atividade | TelaPrincipal:812 | UX fluida |
| `planoEditando` como dep de `todasAsTags` → limitar a `.atividadesRoteiro` | TelaPrincipal:256 | Performance |
| Dropdown "Restaurar versão" sem `max-h` → `max-h-[300px] overflow-y-auto` | TelaPrincipal:1489 | Mobile |
| Checkmark status `text-slate-300` invisível light mode → `text-slate-500 dark:text-slate-300` | TelaPrincipal:1755 | Visual |
| Autocomplete `#` sem `onBlur` → dropdown pode ficar preso em mobile | TipTapEditor | Bug mobile |
| Scroll automático até nova atividade adicionada | TelaPrincipal:238 | UX |
| Busca do painel Banco limpar ao fechar | TelaPrincipal:562 | UX (já corrigido via useBancoPainel hook) |

---

## UX ISSUES (ordenados por impacto)

1. Sem feedback "carregando" no painel Contexto da Turma — dados podem vir do Supabase
2. Banco lateral fecha ao adicionar atividade — usuário quer encadear múltiplas adições
3. Duração inválida silenciosa — "abc min" aceito, contador ignora sem aviso
4. Atividade sem nome oculta botão "Salvar no Banco" — sem hint explicativo
5. Sem scroll automático até atividade recém criada
6. Painel Banco não limpa busca ao fechar (corrigido via hook)
7. Painel Banco não fecha ao mudar de seção do accordion

---

## INCONSISTÊNCIAS VISUAIS

- Input duração pode ter bg diferente do TipTap em dark mode
- Checkmark status invisível em light mode (ver quick wins)
- Divisor `·` nos cards sem espaçamento quando valores curtos
- `bg-indigo-100` no botão "Banco ativo" muito agressivo visualmente

---

## SUGESTÕES DE FEATURES PEDAGÓGICAS

1. **"Sugerir objetivo" via Gemini** — passa atividades do roteiro, gera objetivo geral automaticamente
2. **Alerta de tempo realista** — roteiro > duração da aula: IA sugere 3 atividades para cortar
3. **Modo leitura** — botão que desativa todos inputs para apresentar no projetor
4. **Preview PDF antes de baixar** — modal de confirmação antes do export
5. **Timestamp nas notas de adaptação** — "Criada 15 mar · Editada 16 mar"
6. **Vinculação automática de música** ao importar atividade do banco que já tem música

---

## REFATORAÇÕES EXECUTADAS (2026-03-17)

- [x] Extraído `CardAtividadeRoteiro` → `src/components/CardAtividadeRoteiro.tsx`
- [x] Criado `useBancoPainel()` → `src/hooks/useBancoPainel.ts`
- [x] `useCallback` nos handlers de reordenação (`handleMoveUp`, `handleMoveDown`)
- [x] Fix TipTapEditor: refs para callbacks evitar stale closure no `useEditor`
- [x] `todasAsTags` dependency otimizada → `planoEditando?.atividadesRoteiro` only

---

## REFATORAÇÕES FUTURAS RECOMENDADAS

- Converter `planoEditando` snapshot-based para sync com contexto
- Adicionar `data-testid` a inputs críticos para testes E2E
- Testes unitários para reordenação de atividades (race condition)
- Integração com react-hook-form para validação centralizada
