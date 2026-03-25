# Melhorias - Março 2026

## Módulo Turmas — Timeline Pedagógica

| # | Prompt | Status |
|---|--------|--------|
| 1 | Timeline pedagógica: linha + dots coloridos (verde/azul/cinza) | ✅ |
| 2 | Click em ponto → mostrar registro pós-aula + plano vinculado | ✅ |
| 3 | Indicador de progresso: últimas 5 realizadas + próximas 3 + tooltips | ✅ |
| 4 | Sem plano → "Planejar aula desta turma" com 3 botões no form existente | ✅ |
| 5 | Visual: linha horizontal, dots conectados, glow no ponto selecionado | ✅ |

---

### Detalhes técnicos

**Arquivo principal**: `src/components/ModuloPlanejamentoTurma.tsx`

**Componente substituído**: `MiniTimelineTurma` → `TimelinePedagogica`

**Fontes de dados**:
- `AplicacoesContext.aplicacoes` — status por data/turma
- `PlanosContext.planos` — título do plano vinculado
- `PlanejamentoTurmaContext.historicoDaTurma` — registro pós-aula
- `CalendarioContext.obterTurmasDoDia` — datas futuras sem aplicação

**Commits**:
- [ ] feat(turmas): TimelinePedagogica — 5 prompts integrados
