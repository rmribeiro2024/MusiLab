# Módulo Turmas — Documentação e Melhorias

Criado em: 2026-03-29
Última atualização: 2026-03-30

---

## O que foi construído (sessão 2026-03-29)

### Arquitetura geral

O módulo Turmas (`ModuloPlanejamentoTurma.tsx`) foi refatorado para um sistema de 3 abas dentro do componente `ConteudoTurma`:

| Aba | Conteúdo |
|-----|----------|
| **Turma** | Perfil da turma: Sobre, Objetivo, Resumo automático, Destaques, Alunos |
| **Aulas** | Histórico pedagógico: Timeline, Último registro, Lista de aulas, CTA |
| **Repertório** | `ModuloHistoricoMusical` embutido, filtrado pela turma selecionada |

Novos campos adicionados ao tipo `Turma` (`src/types/index.ts`):
- `observacoes?: string` — texto livre sobre perfil/comportamento da turma
- `objetivo?: string` — objetivo pedagógico do período

Novas funções no contexto `AnoLetivoContext`:
- `turmaSetObservacoes(anoId, escolaId, segmentoId, turmaId, texto)`
- `turmaSetObjetivo(anoId, escolaId, segmentoId, turmaId, texto)`

Novas props no `ModuloHistoricoMusical`:
- `ocultarSeletorTurma?: boolean` — esconde o dropdown de turma quando embutido
- `turmaForcada?: string` — força o filtro para `turmaId-escolaId`

---

## Resumo Automático da Turma — Lógica Detalhada

**Arquivo**: `src/components/ModuloPlanejamentoTurma.tsx`
**Função principal**: `calcResumoTurma(historico, planos): ResumoTurma`
**Localização no arquivo**: logo antes de `// ─── TIMELINE PEDAGÓGICA`

### Interface de retorno

```typescript
interface ResumoTurma {
  participacao: 'alta' | 'média' | 'baixa' | null
  focoRecente: string | null
  tendencia: 'cresceu' | 'estável' | 'caiu' | null
  numAulas: number  // quantas aulas foram usadas no cálculo
}
```

### Amostra usada

- `historicoDaTurma.slice(0, 5)` — últimas 5 aulas
- Filtra registros com `statusAula === 'nao_houve'` (aula não realizada não conta)
- Se `numAulas === 0` → retorna tudo null e mostra "Registre aulas para ver o resumo."

---

### Métrica 1: Participação

**Fonte primária — `chamada` (presença real)**

Condição: registro tem `chamada.length > 0`

```
presença_aula = chamada.filter(c => c.presente).length / chamada.length
media = média de presença_aula entre todas as aulas com chamada
```

Thresholds:
- `media >= 0.80` → "alta"
- `media >= 0.55` → "média"
- `media < 0.55` → "baixa"

**Fonte secundária — `statusAula` como proxy numérico** (quando sem chamada)

Função auxiliar `scoreStatus(registro)`:
```
concluida   = 1.0   (funcionou bem)
bem         = 1.0   (legado)
funcionou   = 1.0   (legado)
revisao     = 0.7   (funcionou, mas precisa revisão)
parcial     = 0.5   (parcialmente concluída)
incompleta  = 0.4   (não concluída)
nao         = 0.4   (legado)
nao_funcionou = 0.4 (legado)
nao_houve   = 0.0   (não ocorreu — já filtrado antes)
```

Thresholds sobre média dos scores:
- `>= 0.75` → "alta"
- `>= 0.45` → "média"
- `< 0.45` → "baixa"

---

### Métrica 2: Foco Recente

**Fonte primária — `orffMeios` do plano pai**

Para cada registro, encontra o plano que contém aquele registro:
```typescript
const plano = planos.find(p => p.registrosPosAula?.some(r => r.id === reg.id))
```

Conta quantas vezes cada meio aparece como `true` entre as aulas da amostra:
```
{ fala: 2, canto: 4, movimento: 1, instrumental: 3 }
→ retorna "canto" (maior contagem)
```

Labels exibidos: "fala", "canto", "movimento", "instrumental"

**Fallback — `vivenciasClassificadas` do plano pai (CLASP)**

Usado quando nenhum plano da amostra tem `orffMeios`. Soma as intensidades (0–3) por dimensão:
```
{ tecnica: 5, performance: 8, apreciacao: 2, criacao: 0, teoria: 1 }
→ retorna "performance"
```

Labels exibidos: "técnica", "performance", "apreciação", "criação", "teoria"

**Sem dados**: retorna `null` → exibe "—"

**Caveat importante**: `orffMeios` e `vivenciasClassificadas` são gerados por IA (Gemini) ao salvar o plano. Se o professor nunca usou Gemini ou salvou planos antes de ter a feature, esses campos podem ser `undefined`. O fallback final é "—".

---

### Métrica 3: Tendência

**Requer ≥ 3 registros na amostra (após filtrar `nao_houve`).**

Algoritmo:
1. Reverte a amostra para ordem cronológica (amostra vem desc do contexto)
2. Calcula score por aula (presença % se chamada disponível, ou scoreStatus)
3. Divide em duas metades: `primeira = scores.slice(0, meio)`, `segunda = scores.slice(-meio)` onde `meio = ceil(length/2)`
4. Calcula média de cada metade
5. Delta = segunda − primeira:
   - `delta > 0.2` → "cresceu"
   - `delta < -0.2` → "caiu"
   - senão → "estável"

**Exemplo com 4 aulas** (ordem cronológica):
```
[0.5, 0.7, 0.8, 1.0]
meio = ceil(4/2) = 2
primeira = [0.5, 0.7] → média 0.6
segunda  = [0.8, 1.0] → média 0.9
delta = 0.9 - 0.6 = 0.3 > 0.2 → "cresceu"
```

**Menos de 3 registros**: `tendencia = null` → linha não aparece na UI.

---

### UI do bloco

```
┌ - - - - - - - - - - - - - - - - - - ─┐
│  RESUMO DA TURMA                      │  ← dashed, sem bg
│                                       │
│  Participação   alta                  │  ← emerald se alta, amber se média, red se baixa
│  Foco recente   canto                 │  ← slate-600
│  Tendência      estável               │  ← emerald/slate/red conforme valor
│                                       │
│  Baseado nas últimas 4 aulas          │  ← slate-300, text-[10px]
└ - - - - - - - - - - - - - - - - - - ─┘
```

Largura fixa `w-24` no label para alinhamento dos valores.

---

### Como ajustar no futuro

**Mudar os thresholds de participação:**
Buscar `>= 0.80` e `>= 0.55` na função `calcResumoTurma` (thresholds de chamada) e `>= 0.75` e `>= 0.45` (thresholds de statusAula).

**Mudar o threshold de tendência:**
Buscar `0.2` nas duas comparações de delta dentro de `calcResumoTurma`.

**Adicionar `nivelTecnicoMusical` como 4ª métrica:**
Dentro de `calcResumoTurma`, após calcular participação:
```typescript
const niveisPreenchidos = amostra
  .map(r => r.nivelTecnicoMusical)
  .filter((n): n is number => typeof n === 'number' && n > 0)
if (niveisPreenchidos.length > 0) {
  const mediaNivel = niveisPreenchidos.reduce((a,b) => a+b, 0) / niveisPreenchidos.length
  // mediaNivel: 1-5; 3 = esperado; < 3 = abaixo; > 3 = acima
}
```

**Trocar fonte de participação:**
Para usar exclusivamente `statusAula` (ignorar chamada), remover o bloco `if (comChamada.length > 0)` e deixar só o fallback.

**Aumentar amostra de 5 para N aulas:**
Alterar `.slice(0, 5)` no início de `calcResumoTurma`.

---

## Destaques Recentes — Lógica Detalhada

**Função**: `calcDestaquesTurma(historico, planos): string[]`
**Localização**: logo após `calcResumoTurma`, antes de `// ─── TIMELINE PEDAGÓGICA`
**Retorno**: array de até 3 strings, cada uma um insight legível pelo professor

### Amostra usada

Mesma lógica do resumo: `historico.slice(0, 5)` filtrando `nao_houve`. Requer ≥ 2 aulas; se menor, retorna `[]`.

### Pré-processamento

Para cada registro da amostra, encontra o plano pai:
```typescript
const plano = planos.find(p => p.registrosPosAula?.some(r => r.id === reg.id))
```

Agrega `orffMeios` dos planos com dados (`comOrff`), contando ocorrências de cada meio:
```
{ canto: 4, fala: 2, movimento: 0, instrumental: 1 }
```

### Regra 1 — Queda de participação (sempre disponível)

**Condição**: ≥ 3 aulas com score; segunda metade < primeira metade em > 0.2

Score por aula: presença % via `chamada` (se disponível) ou `scoreStatus(statusAula)`.
Divide cronologicamente em duas metades (`Math.ceil(n/2)`), compara médias.

**Saída**: "Participação caiu nas últimas aulas"

### Regra 2 — Predomínio excessivo

**Condição**: ≥ 2 aulas com `orffMeios`; um meio aparece em ≥ 80% dessas aulas

```
contagem[meio] / totalOrff >= 0.8
```

**Saída**: "Predomínio de atividades de [meio]"
Ex: "Predomínio de atividades de canto"

### Regra 3 — Mudança de padrão

**Condição**: ≥ 4 aulas com `orffMeios`; meio dominante da primeira metade ≠ meio dominante da segunda metade

Divide `comOrff` cronologicamente em duas metades (`Math.floor(n/2)`), calcula o meio com maior contagem em cada metade.

**Saída**: "Mudança de foco: [anterior] → [recente]"
Ex: "Mudança de foco: movimento → canto"

### Regra 4 — Meio ausente

**Condição**: ≥ 3 aulas com `orffMeios`; algum meio nunca apareceu (`contagem[meio]` ausente ou 0)

Ordem de prioridade para checar ausência: `movimento`, `instrumental`, `fala`, `canto`
(meios mais propensos a serem negligenciados ficam primeiro)

**Saída**: "[meio] foi pouco utilizado nas últimas aulas"
Ex: "movimento foi pouco utilizado nas últimas aulas"

### Notas importantes

- Regras 2, 3 e 4 dependem de `orffMeios` no plano — gerado por IA (Gemini). Se o professor não usa Gemini, só a regra 1 dispara.
- Máximo 3 destaques: cada regra verifica `destaques.length < 3` antes de disparar.
- Prioridade: participação (mais crítico) > predomínio > mudança > ausente.
- Sem dados suficientes → exibe "Registre mais aulas para ver os destaques."

### Como ajustar no futuro

**Mudar threshold de predomínio (regra 2):**
Buscar `>= 0.8` dentro de `calcDestaquesTurma`.

**Mudar o threshold de queda (regra 1):**
Buscar `< -0.2` dentro de `calcDestaquesTurma` (separado do mesmo threshold em `calcResumoTurma`).

**Adicionar nova regra:**
Inserir bloco `if (... && destaques.length < 3) { destaques.push(...) }` após a regra 4, antes do `return`.

**Mudar prioridade dos meios ausentes (regra 4):**
Alterar o array `ausentesPriority = ['movimento', 'instrumental', 'fala', 'canto']`.

**Adicionar regra de baixa variedade:**
```typescript
if (totalOrff >= 3 && destaques.length < 3) {
  const usados = ORFF_KEYS.filter(m => contagem[m] > 0).length
  if (usados <= 2) destaques.push('Pouca variedade de atividades nas últimas aulas')
}
```
*(não incluída agora para evitar redundância com regra 2)*

---

## Melhorias futuras identificadas

### 1. Timeline — indicador visual de data ativa persistente
Ao trocar para a aba Turma ou Repertório e voltar para Aulas, a data selecionada na timeline é preservada corretamente. Mas não há indicador visual no tab "Aulas" de que existe uma seleção ativa. Um badge discreto na aba ("Aulas ·") poderia comunicar isso.

### 2. Dark mode nos cards do módulo
Os cards usam `bg-white` sem variante escura. Coerente com o restante do módulo hoje, mas quando o tema dark for aplicado ao módulo precisará revisão nos tokens de fundo dos blocos "Sobre a turma", "Objetivo da turma", "Última aula" e "Registros anteriores".

### 3. Estado vazio da Aba Repertório
`ModuloHistoricoMusical` tem seu próprio empty state interno, mas pode não estar visualmente alinhado com o padrão dos estados vazios do módulo (texto centralizado, `text-sm text-slate-500`). Vale revisar quando o design do repertório for polido.

### 4. Chamada no histórico — responsividade mobile
A badge `presentes/total` na lista "Registros anteriores" pode competir com o resumo em telas muito estreitas. Adicionar `min-w-0` no container do texto resolveria o caso.

### 5. Resumo da turma — `nivelTecnicoMusical` como 4ª métrica
O campo existe (`RegistroPosAula.nivelTecnicoMusical`, escala 1–5). Já preenchido nos registros v2. Poderia aparecer como "Nível técnico: dentro do esperado" com a média dos últimos registros.
Ver instruções de implementação acima em "Como ajustar no futuro".

### 6. Resumo da turma — ratio `fariadiferente` vs `funcionouBem`
Contar registros com `fariadiferente` preenchido. Se maioria (> 60%) tem esse campo, exibir "Professor anotou pontos de revisão recentes". Sinal qualitativo útil para auto-reflexão.

### 7. Resumo da turma — assinatura temporal
Mostrar o intervalo de datas usadas no cálculo: "Baseado nas últimas 4 aulas (04/mar – 25/mar)". Já está disponível em `r.dataAula ?? r.data`.

### 8. Destaques recentes — ainda placeholder
O bloco "Destaques recentes" continua como placeholder. Candidatos para preencher:
- Alunos com `flag = true` que não aparecem no painel de alunos
- Encaminhamentos pendentes (`encaminhamentos.filter(e => !e.concluido)`) das últimas aulas
- Estratégias que funcionaram (`estrategiasQueFunc[]`) mais mencionadas recentemente

### 9. Objetivo da turma — sugestão automática via IA
Passar o histórico de aulas + repertório da turma para o Gemini gerar uma sugestão de objetivo pedagógico para o período. Similar ao "Sugerir objetivo" do módulo Nova Aula.

### 10. Registro da última aula — link para editar
O card "Última aula" exibe o conteúdo mas não tem ação para abrir o formulário de edição do pós-aula. Um botão discreto "Editar →" no header poderia abrir o formulário diretamente.

---

## Presença Média — Lógica Detalhada (adicionada 2026-03-30)

**Campo**: `presencaMedia: number | null` na interface `ResumoTurma`
**Calculada em**: `calcResumoTurma`, junto com a métrica de participação

### Cálculo

```
presença_aula = alunos presentes ÷ total da chamada
presencaMedia = média de presença_aula entre as aulas com chamada preenchida
```

Só é calculada quando ao menos 1 aula da amostra tem `chamada.length > 0`. Retorna `null` caso contrário.

### UI

- Exibe "Presença 83%" com mesmas cores da participação (emerald / amber / red, thresholds 80% / 55%)
- Quando `presencaMedia != null`: mostra a linha "Presença X%"
- Quando `presencaMedia == null`: mostra "Participação alta/média/baixa" derivada do `statusAula`
- As duas linhas nunca aparecem juntas — presença real tem prioridade

### Como ajustar no futuro

**Mudar thresholds de cor:**
Buscar `>= 0.80` e `>= 0.55` no JSX do bloco "Resumo da turma" (dentro do `{resumoTurma.presencaMedia != null && ...}`).

---

## Alunos em Destaque — Lógica Detalhada (adicionada 2026-03-30)

**Função**: `calcAlunosDestaque(historico, alunos): AlunoDestaqueResumo[]`
**Localização**: após `calcDestaquesTurma`, antes de `// ─── TIMELINE PEDAGÓGICA`

### Interface de retorno

```typescript
interface AlunoDestaqueResumo {
  nome: string
  label: string
  nivel: 'positivo' | 'negativo'
}
```

### Requisitos mínimos

- Turma com ≥ 2 alunos cadastrados
- ≥ 2 aulas com `chamada` preenchida
- ≥ 2 alunos com ≥ 2 aparições nos registros de chamada

Se algum critério não for atendido, retorna `[]` e o bloco não aparece.

### Amostra

Usa `historico.slice(0, 10)` (10 aulas, não 5) para ter dados mais estáveis por aluno. Filtra apenas aulas com `chamada.length > 0`.

### Algoritmo

1. Agrega por `alunoId`: conta total de aparições e total de presenças
2. Cruza com `turmaData.alunos` para obter o nome
3. Filtra alunos com `total < 2` (dados insuficientes)
4. Ordena por `presença% desc`

### Regras de exibição

| Label | Condição |
|---|---|
| ★ alta participação | aluno com maior % e esse % ≥ 80% |
| ! baixa participação | aluno com menor % e esse % < 60% |
| ↓ faltas recorrentes | aluno com menor % e esse % < 40% |

"Faltas recorrentes" e "baixa participação" são mutuamente exclusivos — o label varia pela gravidade do mesmo aluno (o pior da turma).

### Por que 10 aulas e não 5?

Com 5 aulas e uma turma de 15 alunos, muitos alunos terão apenas 1–2 aparições na chamada — dado instável demais para exibir. 10 aulas dá base mais sólida sem perder atualidade.

### Como ajustar no futuro

**Mudar thresholds:**
Buscar `>= 0.80`, `< 0.60` e `< 0.40` dentro de `calcAlunosDestaque`.

**Aumentar amostra:**
Alterar `.slice(0, 10)` no início da função.

**Mostrar mais de 1 aluno em cada extremo:**
O array `ranked` já está ordenado — basta iterar os primeiros N e os últimos N em vez de pegar só `ranked[0]` e `ranked[ranked.length - 1]`.

---

## Continuidade Pedagógica — Lógica Detalhada (adicionada 2026-03-30)

**Função**: `calcContinuidade(historico): Continuidade | null`
**Localização**: antes de `// ─── ALUNOS EM DESTAQUE`

### Interface de retorno

```typescript
interface Continuidade {
  data: string
  ondeParamos: string | null
  dificuldade: string | null
  sugestao: string | null
}
```

### Algoritmo

Pega o **primeiro registro** do histórico (mais recente) que não seja `nao_houve`.

```typescript
const ultima = historico.find(r => (r.statusAula ?? r.resultadoAula) !== 'nao_houve')
```

Extrai 3 campos com fallbacks:

| Campo | Fonte primária | Fallback 1 | Fallback 2 |
|---|---|---|---|
| `ondeParamos` | `resumoAula` | `resumo` | — |
| `dificuldade` | `fariadiferente` | `naoFuncionou` | `poderiaMelhorar` |
| `sugestao` | `proximaAula` | — | — |

Retorna `null` se nenhum dos 3 campos tiver conteúdo (mesmo com registro existente) ou se não houver registros.

### UI

```
CONTINUIDADE                      28/03
Trabalhamos pulsação com palmas        ← ondeParamos (slate-600, 13px)
! Dificuldade em manter tempo coletivo ← dificuldade (amber-700, 12px)
→ Retomar com movimento corporal       ← sugestao (indigo-600, 12px)
```

- Borda sólida (não dashed) — é o bloco mais acionável, merece mais peso visual
- Data da aula exibida no canto direito do header
- Cada linha só aparece se o campo correspondente tiver conteúdo
- O bloco inteiro só aparece quando `continuidade != null`

### Posicionamento na aba Turma

Primeiro bloco da seção terciária — antes do Resumo, Destaques e Alunos em destaque. Justificativa: é o dado mais imediato para o professor que vai entrar em sala.

### Por que sem IA?

O professor já registra "próxima aula" e "o que faria diferente" no formulário pós-aula, no momento em que o pensamento ainda está fresco. Reutilizar esses campos é mais confiável do que gerar texto depois.

### Como ajustar no futuro

**Adicionar campo extra (ex: `funcionouBem`):**
Incluir como 4ª linha com ícone diferente (ex: ✓ em emerald) no JSX do bloco.

**Mostrar mais de uma aula:**
Substituir `.find(...)` por `.filter(...).slice(0, N)` e mapear o array no JSX.

**Adicionar sugestão automática quando `proximaAula` está vazio:**
Derivar do `fariadiferente` usando um mapa simples de palavras-chave → ações sugeridas (sem IA).

---

## Ordem dos blocos na Aba Turma (seção terciária)

1. **Continuidade pedagógica** — acionável, baseado na última aula
2. **Resumo da turma** — agregado das últimas 5 aulas
3. **Destaques recentes** — insights sobre padrões pedagógicos
4. **Alunos em destaque** — presença individual (só quando há chamada)

---

## Dependências de dados — visão geral

| Bloco | Campo necessário no pós-aula |
|---|---|
| Continuidade — Onde paramos | `resumoAula` |
| Continuidade — Dificuldade | `fariadiferente` |
| Continuidade — Sugestão | `proximaAula` |
| Presença % | `chamada` preenchida |
| Participação (fallback) | `statusAula` |
| Foco recente | `orffMeios` no plano (gerado pelo Gemini) |
| Tendência | ≥ 3 aulas com dados |
| Destaques (variação de participação) | ≥ 3 aulas com dados |
| Destaques (Orff) | `orffMeios` no plano (gerado pelo Gemini) |
| Alunos em destaque | `chamada` + alunos cadastrados na turma |
