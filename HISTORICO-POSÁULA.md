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

## PARTE 2 — TELA DE HISTÓRICO (plano evoluído — 2026-03-21)

---

### Reposicionamento conceitual

O Histórico **não é um dashboard**. Não serve para decidir o que fazer amanhã — isso é papel do módulo Turmas.

O Histórico responde uma pergunta diferente:
> "O que está acontecendo na minha prática ao longo do tempo?"

É um espelho da prática — leve, escaneável, com baixa carga cognitiva. Insights aparecem passivamente: o sistema mostra, o professor não precisa procurar.

**O que NÃO é:**
- Dashboard com métricas e gráficos
- Ferramenta de decisão imediata
- Lista de eventos isolados sem conexão entre si

**O que É:**
- Linha do tempo legível que revela padrões
- Superfície de reflexão passiva
- Registro vivo que conecta aulas entre si ao longo do tempo

---

### Estrutura da tela (decisão final)

```
┌─────────────────────────────────────────────┐
│  [GR2B ▼]  [Todas as decisões ▼]  [Mês ▼]  │  ← filtros, sempre visíveis
├─────────────────────────────────────────────┤
│  ⚡ "Três retomadas seguidas em GR2B.        │  ← insight condicional
│      Vale repensar a abordagem?"            │    (só aparece quando há padrão)
├─────────────────────────────────────────────┤
│  ▾ Segunda, 18 mar                          │  ← data com pills de resumo
│    [✓ 2 avançar]  [↻ 1 retomar]  [⚠ 1]    │
│    ──────────────────────────────────────── │
│    [dot] 1º ANO · GR1A   [✓ Avançar]  [Ver]│  ← linha 1: scan em 1s
│           "Atividade de pulso funcionou..." │  ← linha 2: detalhe muted
│    ──────────────────────────────────────── │
│    [dot] 2º ANO · GR2B   [↻ Retomar]  [Ver]│
│           "Ritmo ainda travando" · 👤 João  │
│                                             │
│  ▸ Sexta, 14 mar   [✓ 1]  [↻ 2]  [⚠ 1]   │  ← data fechada (colapsada)
│  ▸ Terça, 11 mar   [✓ 3]                   │
└─────────────────────────────────────────────┘
```

**O que mudou em relação ao design anterior:**
- ❌ Removido: Bloco Pulso com 3 cards (era dashboard — pertence ao módulo Turmas)
- ❌ Removido: sparklines e gráficos de tendência
- ✓ Mantido: filtros, lista enriquecida, mini-resumo em datas fechadas
- ✓ Mantido: insights automáticos com tom de colega
- ✓ Reforçado: a lista é o protagonista

---

### Princípios de design (consolidados)

1. **Lista como protagonista** — não cards, não gráficos. A linha do tempo é o conteúdo.
2. **Leitura em camadas** — 2s (scan do dot + pill) → 10s (linha 2 + alertas) → 1min (expandir)
3. **Insights passivos** — aparecem automaticamente, nunca exigem busca ativa
4. **Conexão entre aulas** — ciclos visíveis (retomar → avançar), não eventos isolados
5. **Tom neutro** — reflexão, não celebração nem alarme. Pergunta, não sentença.
6. **Mobile-first** — linhas com mínimo 44px, sem scroll horizontal, sem tooltips

---

## PLANO DE IMPLEMENTAÇÃO — 3 FASES

---

### FASE 1 — Fundação legível
**Alto impacto · Baixo esforço · Implementar primeiro**

---

#### F1.1 — Barra lateral de qualidade (substitui ●●●○)

> ✅ **APROVADO** — barra neutra por ora (slate)
> 🟢 **IMPLEMENTADO** — 2026-03-21 · `TelaPosAulaHistorico.tsx`
> ⏸️ **Cor dependente de decisão pendente** — aproveitamento obrigatório ou não
> Campo "aproveitamento da aula" foi implementado recentemente (2026-03-20). Validar uso real antes de tornar obrigatório.
> Quando decidir: se obrigatório → barra com 4 cores. Se opcional → barra neutra permanece.

**Implementado:**
`borderLeft: 4px solid ${c.leftBar}` — `#CBD5E1` light / `#374151` dark. Dots removidos.

**Quando aproveitamento virar obrigatório, atualizar para:**
```
4 → verde forte   #6aab8a
3 → verde suave   #6aab8a opacity .55
2 → âmbar         #908e50 opacity .80
1 → coral         #c4844a opacity .70
```

**Quando aproveitamento virar obrigatório, atualizar para:**
```
4 → verde forte   #6aab8a
3 → verde suave   #6aab8a opacity .55
2 → âmbar         #908e50 opacity .80
1 → coral         #c4844a opacity .70
```

**Esforço:** baixo — CSS puro.

---

#### F1.2 — Pill Avançar/Retomar por linha

> ❌ **REJEITADO** — 2026-03-21
> Motivo 1: avançar/retomar é dado orientado à próxima aula — não pertence à leitura do passado.
> Motivo 2: já exibido na VisaoSemana.tsx (statusAula com emoji + label por turma).

---

#### F1.3 — Trecho do registro na linha 2

> ✅ **APROVADO com ajuste** — 2026-03-21
> 🟢 **IMPLEMENTADO** — 2026-03-21 · `TelaPosAulaHistorico.tsx`
> Ajuste 1: cor do trecho no dark mode → `#94a3b8` (slate-400).
> Ajuste 2: seletor global no topo da lista — professor escolhe qual campo aparece como trecho em todos os registros.

**Implementado:**
Seletor `"Mostrar como trecho: [O que aprenderam ▾]"` acima da lista.
Campos: `funcionouBem` · `repetiria` · `naoFuncionou` · `surpresaMusical`.
Trecho aparece em itálico, cor `#94a3b8`. Se vazio → linha 2 não exibida.

**Especificação original:**
Seletor dropdown discreto acima da lista:
```
Mostrar como trecho: [O que funcionou ▾]
```
Opções do dropdown:
- O que os alunos demonstraram aprender
- O que funcionou
- O que faria diferente
- O que fizeram de inesperado

Linha 2 exibe o campo selecionado. Se não preenchido naquele registro → mostra "Não preenchido" em tom mais muted, ou não exibe a linha 2.

Cores do trecho:
- Light: `#94a3b8` (slate-400)
- Dark: `#94a3b8` (slate-400)
- Não preenchido: `#cbd5e1` light / `#4b5563` dark

**Esforço:** baixo-médio — dropdown com estado local, leitura condicional do campo selecionado.

---

#### F1.4 — Alertas inline (aluno + engajamento)

> ✅ **APROVADO com ajuste** — 2026-03-21
> 🟢 **IMPLEMENTADO** — 2026-03-21 · `TelaPosAulaHistorico.tsx`
> Ajuste: marcadores são clicáveis e funcionam como filtro rápido. "Ver" cobre a abertura do registro.

**Implementado:**
Badges `👤 [alunoAtencao]` e `📉 engajamento` na linha 2 quando campos preenchidos.
Clique no badge: ativa filtro e exibe chip ativo no topo com `×` para limpar.

**Especificação:**
Badges discretos na linha 2, apenas quando os campos estão preenchidos:
```
👤 [nome do aluno]     ← campo alunoAtencao preenchido
📉 engajamento         ← campo pontoQueda preenchido
```
Sem cor de alarme — slate muted. Tom neutro.

**Interação ao clicar:**
- `👤 João` → filtra a lista por registros onde João foi mencionado
- `📉 engajamento` → filtra a lista por registros com queda de engajamento
- `[Ver]` → abre o registro completo (comportamento separado, não muda)

**Esforço:** médio — renderização condicional + lógica de filtro por clique no badge.

---

#### F1.5 — Filtros: 3 dropdowns compactos

> ✅ **APROVADO com ajuste** — 2026-03-21
> 🟢 **IMPLEMENTADO** — 2026-03-21 · `TelaPosAulaHistorico.tsx`
> Ajuste: terceiro filtro é Escola (não Decisão). Professores especialistas trabalham em múltiplas escolas — sem esse filtro, turmas de contextos diferentes aparecem misturadas.
> Hierarquia: selecionar escola restringe as turmas disponíveis no segundo dropdown.

**Implementado:**
`[Todas as escolas ▾]  [Todas as turmas ▾]  [Tudo ▾]   limpar`
Escola filtra turmas disponíveis. `limpar` aparece apenas com filtro ativo.
Período: Esta semana · Este mês · Últimos 3 meses · Tudo.

**Especificação:**
```
[Todas as escolas ▾]  [Todas as turmas ▾]  [Este mês ▾]   limpar
```
Posicionados no topo, sempre visíveis (não colapsam).

Opções:
- **Escola:** Todas · [lista das escolas do professor]
- **Turma:** Todas · [turmas da escola selecionada, ou todas se escola = Todas]
- **Período:** Esta semana · Este mês · Últimos 3 meses · Tudo

Botão `limpar` aparece apenas quando algum filtro está ativo.

**Esforço:** baixo a médio — filtragem local com dependência entre escola e turma.

---

#### F1.6 — Mini-resumo em datas fechadas

> ⏸️ **PENDENTE DE MATURAÇÃO** — 2026-03-21
> A ideia é válida mas o risco de poluição visual é real.
> Questão em aberto: quais indicadores mostrar sem sobrecarregar?
> Candidatos discutidos: 👤 aluno · 📉 engajamento · comportamento da turma · 🎵 inesperado · 📎 evidência
> Retomar quando houver mais clareza sobre o que o professor realmente quer ver de fora.

---

### FASE 2 — Detecção de padrões
**Alto impacto · Médio esforço · Implementar após Fase 1 estável**

---

#### F2.1 — Engine de insights (4 regras locais)

**O que implementar:**
Um banner condicional logo abaixo dos filtros. Aparece apenas quando uma das regras é ativada. Exibe 1 insight por vez (o mais recente/relevante). Tom de colega, não de sistema.

**Regras (em ordem de prioridade):**

| # | Regra | Trigger | Mensagem exemplo | Status |
|---|-------|---------|-----------------|--------|
| R1 | Retomadas consecutivas | 3+ retomadas seguidas na mesma turma | — | ❌ Rejeitado |
| R2 | Aluno recorrente | mesmo nome em `alunoAtencao` 3+ vezes no período | "João apareceu em atenção 3 vezes esta semana em GR2B. Algo que precise de conversa individual?" | ✅ |
| R3 | Turma sem registro | turma sem registro há mais de 10 dias úteis | "GR3C não tem registro há 12 dias. Tudo bem por lá?" | ✅ |
| R4 | Padrão por dia da semana | aproveitamento de um dia ≥ 0.8 abaixo dos demais (mín. 4 amostras) | "Suas sextas-feiras com GR1A têm aproveitamento consistentemente mais baixo." | ⏸️ Depende de aproveitamento obrigatório |
| R5 | Comportamento negativo recorrente | mesma turma com comportamento negativo 3+ aulas seguidas | "GR2B teve comportamento difícil nas últimas 3 aulas. Pode ser hora de mudar a abordagem?" | ✅ |

**Problema que resolve:**
Padrões que o professor não vê sozinho porque exigem cruzamento de registros ao longo do tempo. A engine substitui a análise manual que ninguém faz.

**Impacto:**
Transforma o histórico de arquivo em espelho ativo. É a implementação mais direta de metacognição passiva — o insight aparece sem que o professor procure.

**Esforço:** médio — lógica de detecção local, sem API.

---

#### F2.2 — Lacuna de registro como indicador visual na lista

**O que implementar:**
Quando uma turma não tem registro há mais de N dias (sugestão: 10 dias úteis), exibir um separador visual na lista:
```
─ ─ ─  GR3C · sem registro há 12 dias  ─ ─ ─
```
Linha pontilhada discreta, cor slate muted. Não é alerta vermelho — é lacuna neutra.

O separador aparece na linha do tempo na posição correta da data (onde o registro deveria estar).

**Problema que resolve:**
A ausência não aparece em uma lista — só o que existe fica visível. O separador torna o silêncio visível.

**Impacto:**
O professor vê a lacuna exatamente onde ela deveria estar na linha do tempo. Não é acusação — é informação.

**Esforço:** médio — cálculo de dias úteis, inserção de separador na lista renderizada.

---

#### F2.3 — Categorias pedagógicas no pós-aula → integração no histórico

**O que implementar:**
**No formulário de registro (pós-aula):**
Adicionar campo de seleção múltipla compacto:
```
Foco desta aula (selecione os principais):
☐ Técnica instrumental   ☐ Leitura / escrita
☐ Improvisação           ☐ Apreciação / escuta
☐ Teoria / harmonia      ☐ Performance
☐ Composição             ☐ Repertório
```
Aparece no bloco avançado. Não obrigatório.

**No histórico:**
- Tags das categorias aparecem na linha 2 de cada registro (quando preenchidas)
- Filtro de categorias se torna disponível (Fase 2.5 ou Fase 3)
- Habilita a funcionalidade "Última vez que..." no módulo Turmas

**Problema que resolve:**
Sem categorias, o histórico não consegue responder "há quanto tempo não faço improvisação com o 6º ano?" — que é a pergunta metacognitiva mais importante.

**Impacto:**
Desbloqueia toda a camada de análise temática. É o dado que transforma o histórico de "lista de notas" em "espelho pedagógico".

**Esforço:** médio — novo campo no modelo de dados, UI simples no formulário, renderização no histórico.

---

#### F2.4 — Vista por turma (modo alternativo)

**O que implementar:**
Toggle discreto no topo: `[Por data]  [Por turma]`

Modo "Por turma": lista de turmas, cada uma colapsável, mostrando seus registros em ordem cronológica dentro.
```
▾ GR2B — 7 registros
   18 mar · [↻ Retomar] · "Ritmo ainda travando" · 👤 João
   14 mar · [↻ Retomar] · "Tentou improvisar, travou no compasso"
   11 mar · [✓ Avançar] · "Leitura melhorou bastante"

▸ GR1A — 9 registros
▸ GR3C — 4 registros  (sem registro há 8 dias)
```

**Problema que resolve:**
O modo "Por data" mistura turmas — bom para visão geral do professor. O modo "Por turma" foca em uma turma específica — bom para acompanhar evolução de uma turma ao longo do tempo.

**Impacto:**
Permite leitura de continuidade por turma sem filtrar manualmente. O professor vê a trajetória da GR2B em 30 segundos.

**Esforço:** médio — agrupamento alternativo, toggle simples.

---

### FASE 3 — Conexão entre aulas e evolução pedagógica
**Impacto alto · Esforço médio-alto · Implementar após módulo Turmas estável**

---

#### F3.1 — Contexto da aula anterior ao registrar

**O que implementar:**
No formulário de registro (pós-aula), antes dos campos principais, exibir um bloco colapsável discreto:
```
┌─ Última aula com GR2B · 14 mar ────────────────┐
│ Decisão: ↻ Retomar                              │
│ Lembrete: "Trazer exercício de pulso — João..."  │
│ O que funcionou: "Separar em duplas ajudou"     │
└─────────────────────────────────────────────────┘
```
Colapsado por padrão, abre com um toque. Aparece só quando há registro anterior para essa turma.

**Problema que resolve:**
O professor começa cada registro do zero, sem memória do que aconteceu antes. Isso quebra o ciclo de reflexão de Zeichner — a observação nova não dialoga com a anterior.

**Impacto:**
Fecha o loop: o professor vê o que planejou fazer diferente, e registra se fez. Transforma o histórico em ciclo, não em lista.

**Esforço:** médio — leitura do último registro por turma, renderização colapsável no formulário.

---

#### F3.2 — Ciclo retomar → avançar visível na lista

**O que implementar:**
Quando um registro "Avançar" sucede uma sequência de "Retomar" na mesma turma, exibir um conector visual discreto:
```
   14 mar · GR2B · [↻ Retomar]
   18 mar · GR2B · [↻ Retomar]
   21 mar · GR2B · [✓ Avançar]  ← "ciclo resolvido"
            └─ ✓ após 2 retomadas
```
O conector é uma linha vertical discreta (2px, cor verde suave) ligando os três itens, com um pequeno badge "resolvido" no Avançar.

**Problema que resolve:**
O histórico hoje é uma lista de pontos. A conexão visual mostra ciclos pedagógicos reais — o professor vê que a retomada funcionou, que levou 3 aulas para resolver, que o esforço valeu.

**Impacto:**
Transforma eventos isolados em narrativa de evolução. É a implementação visual mais direta do ciclo de Zeichner.

**Esforço:** alto — lógica de detecção de sequência + renderização com conectores visuais.

---

#### F3.3 — Lembrete como dado histórico

**O que implementar:**
O campo "lembrete para próxima aula" hoje desaparece após ser usado (ou nunca é exibido no histórico). Passar a exibi-lo no registro expandido como contexto histórico:
```
┌─ Registro expandido · 14 mar · GR2B ─────────┐
│ ...campos do registro...                      │
│                                               │
│ Lembrete que foi passado para a próxima aula: │
│ "Trazer exercício de pulso · João travou"     │
└───────────────────────────────────────────────┘
```
Exibido apenas na visão expandida, não na linha compacta.

**Problema que resolve:**
O lembrete é o dado mais acionável do pós-aula — e some depois de usado. Como histórico, ele revela o que o professor considerava importante em cada momento.

**Impacto:**
O professor pode ver, semanas depois, o que decidiu priorizar em cada aula. Padrão de lembretes repetidos revela o que cronicamente não está sendo resolvido.

**Esforço:** baixo — o campo já existe, é só renderizá-lo no expandido.

---

#### F3.4 — Marcador de marco pedagógico

**O que implementar:**
Botão discreto no registro expandido: `[⭐ Marcar como marco]`

Quando marcado, o registro recebe um indicador visual na lista:
```
[dot] 1º ANO · GR1A   [✓ Avançar]   ⭐   [Ver]
      "Primeira vez que tocaram uma música completa"
```
Filtro adicional: `[Marcos ▼]` mostra só os registros marcados.

**Problema que resolve:**
Momentos pedagógicos significativos (primeira performance, aluno que desbloqueou uma habilidade, aula que virou ponto de virada) se perdem no fluxo da lista.

**Impacto:**
O professor pode criar uma linha do tempo de conquistas — sua e da turma. Pedagogicamente, é o equivalente de um diário de aula curado.

**Esforço:** médio — campo booleano no modelo, indicador visual, filtro adicional.

---

#### F3.5 — Filtro por aluno

**O que implementar:**
Quarto dropdown nos filtros (aparece na Fase 3):
```
[GR2B ▼]  [Todas as decisões ▼]  [Este mês ▼]  [Todos os alunos ▼]
```
Opções: "Todos os alunos" + lista dos nomes que aparecem em `alunoAtencao` nos registros do período atual.

Quando um aluno é selecionado, a lista mostra apenas os registros onde ele foi mencionado, com o trecho relevante destacado.

**Problema que resolve:**
Um professor que quer acompanhar a evolução de João ao longo do semestre precisa abrir cada registro. O filtro traz os registros relevantes de uma vez.

**Impacto:**
Transforma o histórico em ferramenta de acompanhamento individual — sem criar um módulo separado de aluno.

**Esforço:** médio — parsing de nomes em campo texto, filtro adicional.

---

## ITENS ARQUIVADOS (descartados ou adiados indefinidamente)

Os itens abaixo foram avaliados e **não serão implementados** por conflitar com o reposicionamento do Histórico (não é dashboard) ou por esforço desproporcional ao impacto:

| Item | Motivo do descarte |
|------|-------------------|
| Bloco Pulso com 3 cards | Dashboard — pertence ao módulo Turmas |
| Sparkline de tendência (recharts) | Gráfico no histórico = dashboard. Tendência deve ser lida pela lista |
| Comparativo de turmas no Pulso | Dashboard. Se necessário, pertence a um relatório separado |
| Modo comparativo mês a mês | Complexidade alta, baixo uso real |
| Aluno recorrente com contagem cruzada entre turmas | Complexidade alta, caso de uso marginal |
| Insights via Gemini (Histórico) | Fase futura separada — regras locais resolvem o essencial |
| Export PDF do histórico | Útil mas fora do escopo atual — reavaliar ao final da Fase 3 |

---

## BANCO DE IDEIAS (válidas, sem fase definida)

Ideias que fazem sentido mas dependem de outros módulos ou têm timing incerto:

### R6 — Detecção de padrão de conteúdo CLASP (ideia futura)
Detectar automaticamente o equilíbrio de categorias pedagógicas nas aulas ao longo do tempo, com base no modelo CLASP de Keith Swanwick:
- **C** — Composição / Criação
- **L** — Literatura musical
- **A** — Audição / Percepção
- **S** — Skill / Técnica
- **P** — Performance

**Como funcionaria:** IA analisa os planos de aula vinculados e detecta automaticamente quais categorias estão sendo trabalhadas — sem o professor precisar marcar nada.
**Insight gerado:** "Nas últimas 6 semanas com GR2B você não trabalhou Composição. Vale incluir?"
**Dependência:** integração com módulo de Planos + IA (Gemini) para classificação automática.

- **Encaminhamento → próxima aula automático** (F3.1 já cobre parcialmente) — integração com módulo de Planos
- **Aluno em atenção → sugerir AlunoDestaque** — integração com módulo de Turmas
- **Badge "último registro" no card de turma** — integração com módulo Hoje/Planos
- **Tela Hoje — insights do histórico** — integração cross-módulo, mesma engine de insights da F2.1
- **Registro rápido** (modo ultra-compacto só com "E agora?") — pertence à PARTE 1, avaliar separado

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

*Última atualização: 2026-03-21 (v2 — reposicionamento conceitual + plano em 3 fases)*
