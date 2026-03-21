# Histórico de Desenvolvimento — Módulo Pós-Aula
**MusiLab · Iniciado em 2026-03-21**

---

## VISÃO GERAL DO MÓDULO

O módulo Pós-aula tem dois sub-módulos:
1. **Registro** — formulário de registro pós-aula (inline, dentro do card de turmas)
2. **Histórico** — painel de leitura pedagógica contínua

---

## PARTE 1 — TELA DE REGISTRO

### Arquitetura da tela (decisão final)

- **Tela única** — tudo em um card. Sem telas intermediárias.
- **Lista colapsável** começa aberta para professor selecionar a turma
- **Formulário aparece inline** após clicar em uma turma — não há tela separada
- Quando a lista está aberta: sub-linha instrucional "Selecione uma turma para registrar o pós-aula"
- Quando turma selecionada: lista fecha, formulário aparece
- Header sempre compacto: `▲/▼ todas · horário · escola · turma · data · ● · ‹ N/M ›`

### Header
- Sem pré-seleção automática de turma
- Formato sempre compacto (nunca o formato grande de data)
- Seta `›` e botão `Salvar` ambos em **ghost style** (borda fina, sem fundo sólido)
- Seta `›`: `border #cbd5e1 dark:#374151 · bg transparent · text slate-500`

### Lista de turmas
- **CSS grid** com colunas fixas: `54px horário · 110px escola truncada · segmento · turma`
- Garante alinhamento independente do comprimento do nome da escola
- Dot colorido: verde (registrada) · âmbar (pendente)

### Formulário inline (ModalRegistroPosAula)
- Props: `inlineMode` · `hideHeader` · `onVoltar` · `saveLabel`
- `saveLabel="Salvar"` (não "Salvar e próxima" — professor decide o fluxo)
- "ver plano" — link discreto no canto superior direito do formulário, só quando turma selecionada
- Turma/escola/data strip: **completamente oculto** em `inlineMode` (já aparece no header)
- "ver plano" sem texto "fechar plano" — X dentro do painel fecha
- Sem auto-pré-seleção de turma

### Seção "E AGORA?" — decisão pedagógica
- **Avançar — seguir em frente**: cor verde sage `#6aab8a` quando selecionado + animação `✓` (checkPop)
- **Retomar ou revisar**: cor canário calibrada por modo:
  - Light: `#8a8418` (mais escuro para contraste no fundo cinza)
  - Dark: `#908e50` (mais suave no fundo escuro)
  - Animação `↻` (spinPop) ao selecionar
- Cores SÓ aparecem quando o item está selecionado — antes permanecem na cor neutra padrão

### Botão Salvar
- Estilo: **ghost** — `border #cbd5e1 dark:#374151 · bg transparent · text #64748b dark:#9CA3AF`
- Hover: borda mais escura + texto mais claro

### Dark mode — estratégia
- Hook `useIsDark()`: MutationObserver em `document.documentElement.classList`
- Função `dk(isDark)` retorna 10 tokens de cor
- Todos os componentes com inline styles usam `c.*` tokens — nunca cores hardcoded
- Componentes atualizados:
  - `AccordionChip` — recebe `isDark` prop
  - `BehaviorChip` — recebe `isDark` prop + call site atualizado
  - Aproveitamento da aula — tokens `c.*`
  - Como a aula aconteceu na prática — tokens `c.*`
  - Chamada rápida — tokens `c.*`
  - Evidência de aula — tokens `c.*`
  - Botão `+ Add` desabilitado — usa `c.border`

### Animações CSS (index.css)
```css
@keyframes checkPop  { /* ✓ aparece/desaparece — Avançar */ }
@keyframes spinPop   { /* ↻ gira e desaparece — Retomar */ }
```
Classes: `.check-pop` · `.spin-pop`

---

## PARTE 2 — TELA DE HISTÓRICO

### Análise pedagógica da tela atual (problema identificado)

A tela atual responde "quando registrei?" — mas o professor precisa de resposta para **"o que está acontecendo nas minhas aulas?"**

O histórico precisa ser um **espelho pedagógico**, não um arquivo.

### Nova estrutura decidida (hierarquia de leitura)

```
┌─────────────────────────────────────┐
│  PULSO  (topo)                      │  ← leitura em 5 segundos
│  3 cards: aproveit. · retomar · aluno│
├─────────────────────────────────────┤
│  INSIGHT automático                 │  ← 1 insight por vez, tom de colega
├─────────────────────────────────────┤
│  FILTROS  (3 dropdowns)             │  ← turma · decisão · período
├─────────────────────────────────────┤
│  LISTA ENRIQUECIDA por data         │
│  Datas abertas: linhas com 2 níveis │
│  Datas fechadas: mini-resumo pills  │
└─────────────────────────────────────┘
```

### Bloco Pulso — 3 cards

| Card | Dado | Fonte |
|------|------|-------|
| Aproveitamento médio | média de `aproveitamentoAula` (1–4) | campo opcional |
| Aulas com retomar | % `statusAula === 'revisao'` | campo principal |
| Aluno em atenção | nome mais repetido em `alunoAtencao` | campo avançado |

Card "Aluno em atenção" mostra:
- Nome + turma (contexto)
- Frequência: `3× esta semana`
- Citação do campo: `"Ainda trava na troca G→D"`
- Recência: `última menção: ontem`

### Insights automáticos — tom e regras

**Tom:** colega pedagógico, não sistema. Usa pergunta retórica, não assertiva técnica.

✗ Errado: *"GR2B teve retomar em 3 das últimas 4 aulas — algo na sequência pode precisar de revisão."*
✓ Certo: *"Três aulas seguidas com retomar em GR2B. Vale pausar e repensar a abordagem com essa turma?"*

Regras de geração (locais, sem API):
- 3+ retomar seguidos na mesma turma → alerta de sequência
- Mesmo aluno 3+ vezes em `alunoAtencao` → alerta individual
- Aproveitamento por dia da semana muito baixo → padrão temporal
- Turma sem registro há X dias → alerta de lacuna

### Filtros — 3 dropdowns compactos

```
[GR2B ▼]  [Todas as decisões ▼]  [Esta semana ▼]   limpar
```

Categorias separadas:
- Turma: todas · GR1A · GR2B · GR3C...
- Decisão: todas · Avançar · Retomar
- Período: esta semana · este mês · tudo

### Lista enriquecida — estrutura da linha

**Dot lateral** encode qualidade (substitui dots ●●●○):
- Verde forte `#6aab8a` = ótima (4/4)
- Verde suave `#6aab8a opacity .55` = boa (3/4)
- Amarelo `#908e50 opacity .8` = média (2/4)
- Coral `#c4844a opacity .7` = difícil (1/4)

**Linha 1 (escaneável — 1 segundo):**
```
[dot] 1º ANO · GR1A          [✓ Avançar]   [Ver]
```

**Linha 2 (detalhe — muted):**
```
      "Trecho do registro..."           · 👤 aluno · 📉 engajamento
```

**Datas fechadas** mostram mini-resumo em pills:
```
[✓ 3 avançar]  [↻ 1 retomar]  [média 3.2]  [⚠ 1 alerta]
```

### Métricas calculadas localmente

| Métrica | Campo fonte | Uso |
|---------|-------------|-----|
| Aproveitamento médio | `aproveitamentoAula` (1–4) | Card pulso + média por data |
| Taxa de retomar | `statusAula === 'revisao'` | Card pulso + pill fechado |
| Aluno recorrente | `alunoAtencao` (texto) | Card aluno + insight |
| Queda de engajamento | `pontoQueda` (preenchido?) | Alert na linha |
| Clima da turma | `comportamento` | Futuramente |

### Princípios de design para o Histórico

1. **Leitura em camadas**: 5s pulso → 30s alertas → 2min detalhes
2. **Nada que precise de legenda**: autoexplicativo
3. **Zero matemática visível**: sistema calcula, professor só lê
4. **Mobile-first**: pulso em scroll horizontal, linhas com 44px+
5. **Neutral tone**: reflexão, não celebração nem alarme

---

## ROADMAP — MVP vs. Avançado

### ✅ MVP (implementar agora)

- [ ] Dark mode do botão "Ver" no TelaPosAulaHistorico
- [ ] Dot lateral com cor de qualidade (substitui ●●●○)
- [ ] Pill Avançar/Retomar em cada linha
- [ ] Trecho do primeiro campo preenchido (linha 2)
- [ ] Alertas inline (aluno + engajamento) quando presentes
- [ ] Bloco pulso: aproveitamento médio + % retomar
- [ ] Card aluno com contexto completo
- [ ] Filtros: 3 dropdowns (turma · decisão · período)
- [ ] Mini-resumo em datas fechadas
- [ ] Insight automático por regra simples

### 🔭 Avançado (futuro)

- [ ] Insights via Gemini (API key já configurada)
- [ ] Sparkline de tendência por turma (recharts)
- [ ] Aluno recorrente com contagem cruzada de registros
- [ ] Export PDF do histórico por turma (jsPDF já no projeto)
- [ ] Padrão por dia da semana
- [ ] Turma sem registro há X dias

---

## IDEIAS REGISTRADAS (não implementar ainda)

- Renomear módulo "Biblioteca" → **"Meu Repertório"**
- Renomear "Repertório" na sidebar → **"Músicas"**
- Ver arquivo `IDEIAS-FUTURAS.md` para lista completa

---

## COMMITS DESTA SESSÃO

| Commit | O que fez |
|--------|-----------|
| `4282400` | Dark mode completo pós-aula + botão salvar + alinhamento lista turmas |
| `fe7cfd4` | Avançar — verde apenas quando selecionado |
| `4473049` | Botão Salvar + seta › — slate sólido (removido roxo) |
| `bd7ed49` | Botão Salvar ghost + âmbar para Retomar |
| `dbfa354` | Seta › ghost style |
| `f333e98` | Avançar/Retomar — toque levíssimo de cor (dessaturado) |
| `449a542` | Retomar — terra-cotta suave + animação ↻ |
| `1521687` | Retomar — canário pálido (#d8d272) |
| `44f65f3` | Retomar — cor calibrada por modo |
| `4efd7c2` | Retomar light — contraste no fundo cinza (#8a8418) |
| `51b0b61` | Retomar dark — mais sutil (#7a7848) |
| `5a8770b` | Retomar dark — meio-termo (#908e50) |
| `efce790` | Retomar light — amarelo clarinho (#c4bc40) |

---

*Última atualização: 2026-03-21*
