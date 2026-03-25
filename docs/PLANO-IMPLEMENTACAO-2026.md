# MusiLab — Plano de Implementação 2026
**Gerado em:** 2026-03-12
**Baseado em:** ANALISE-COMPETITIVA-2026-03-11.md

---

## Visão geral

O MusiLab já tem o ciclo pedagógico mais completo dos concorrentes analisados. O que falta é **carne no Caderno da Turma** (alunos reais, chamada, rubricas, áudio) e **visibilidade macro do ano** (progress bar, mapa de cobertura, sequential planning).

Este plano divide as melhorias em 3 fases:
- **Fase A — Alunos e Chamada** (alto impacto, mudança cirúrgica)
- **Fase B — Pós-aula estruturado** (alto impacto, aproveita infraestrutura existente)
- **Fase C — Visão anual e produtividade** (médio impacto, novas visualizações)

---

## FASE A — Alunos como objeto e chamada

### A1 — Expandir `AlunoDestaque` em entidade completa

**O que é hoje:** `{ id, nome, flag, nota? }` — um notepad com flag de atenção.
**O que deve ser:** um registro por aluno por turma com histórico real.

**Mudanças no tipo `AlunoDestaque` (retrocompatível):**
```ts
export interface AlunoDestaque {
  id: string
  nome: string
  flag: boolean
  nota?: string          // observação rápida (já existe)
  // novos campos opcionais:
  instrumento?: string   // ex: "flauta", "violão", "voz"
  anotacoes?: AnotacaoAluno[]   // histórico por aula
  marcos?: MarcoAluno[]         // ex: "dominou leitura em clave de sol"
}

export interface AnotacaoAluno {
  id: string
  data: string           // ISO date
  texto: string
  tipo?: string          // livre ou de uma lista configurável
  planoId?: string       // vínculo com o plano da aula
}

export interface MarcoAluno {
  id: string
  data: string
  descricao: string      // ex: "Tocou a peça completa sem partitura"
}
```

**Arquivos a alterar:**
- `src/types/index.ts` — adicionar `AnotacaoAluno`, `MarcoAluno`, expandir `AlunoDestaque`
- `src/contexts/AnoLetivoContext.tsx` — adicionar helpers `alunoAddAnotacao`, `alunoAddMarco`
- `src/components/ModuloPlanejamentoTurma.tsx` — expandir seção Alunos em Destaque com card de aluno expandível (instrumento + últimas anotações + marcos)

**UI proposta:**
- Card compacto por aluno: nome + instrumento (pequeno) + ⚠️ flag + última anotação resumida
- Ao expandir o card: histórico de anotações (data + texto), marcos pedagógicos, botão "+ Anotação" e "+ Marco"
- "+ Anotação" abre mini-form inline: texto livre + tipo (opcional) + data (hoje, editável)

---

### A2 — Chamada rápida no Caderno da Turma

**O que é hoje:** não existe.
**O que deve ser:** grid de alunos, toque = presente/ausente, salva junto ao pós-aula.

**Novo campo em `RegistroPosAula`:**
```ts
chamada?: { alunoId: string; presente: boolean }[]
```

**Arquivos a alterar:**
- `src/types/index.ts` — adicionar campo `chamada` em `RegistroPosAula`
- `src/components/modals/ModalRegistroPosAula.tsx` — nova seção "Chamada" (antes das observações): grid de chips com nome do aluno, clique alterna ✅/❌
- `src/components/ModuloPlanejamentoTurma.tsx` — exibir no histórico: "Presença: 8/10 alunos"

**Detalhes de implementação:**
- Pré-popula com a lista de alunos da turma (de `alunosGetByTurma`)
- Se a turma não tem alunos cadastrados, exibe aviso "Adicione alunos no Caderno da Turma para usar a chamada"
- Persiste no mesmo objeto `RegistroPosAula` — zero novos contexts

---

### A3 — Tipos de observação configuráveis por turma

**O que é hoje:** `AnotacaoAluno.tipo` é campo livre.
**O que deve ser:** lista de tipos reutilizáveis que o professor cria por turma.

**Novo campo em `Turma`:**
```ts
tiposAnotacao?: string[]  // ex: ["dominou peça", "esqueceu instrumento", "liderou grupo"]
```

**Arquivos a alterar:**
- `src/types/index.ts` — adicionar `tiposAnotacao` em `Turma`
- `src/contexts/AnoLetivoContext.tsx` — helper `turmaAddTipoAnotacao`
- `src/components/ModuloPlanejamentoTurma.tsx` — no form de anotação, sugestão de tipos com chips clicáveis + campo livre como fallback

---

## FASE B — Pós-aula estruturado

### B1 — Rubrica configurável no pós-aula

**O que é hoje:** texto livre + estrelinhas + `resultadoAula` (bem/parcial/não).
**O que deve ser:** critérios mensuráveis e comparáveis entre aulas.

**Novos tipos:**
```ts
export interface CriterioRubrica {
  id: string
  nome: string           // ex: "Participação", "Desenvolvimento técnico", "Leitura musical"
  escala: 1 | 3 | 5     // número de pontos na escala
}

export interface ItemRubrica {
  criterioId: string
  valor: number          // pontuação obtida
  observacao?: string
}
```

**Novo campo em `RegistroPosAula`:**
```ts
rubrica?: ItemRubrica[]
```

**Novo campo em `Turma`:**
```ts
rubricas?: CriterioRubrica[]  // critérios configurados para esta turma
```

**Arquivos a alterar:**
- `src/types/index.ts` — adicionar `CriterioRubrica`, `ItemRubrica`
- `src/contexts/AnoLetivoContext.tsx` — helper `turmaSetRubricas`
- `src/components/modals/ModalRegistroPosAula.tsx` — nova seção opcional "Avaliação da Aula" com sliders/botões por critério
- `src/components/ModuloPlanejamentoTurma.tsx` — configurar rubricas por turma (editar critérios)

**Rubrica padrão (se a turma não tem configurada):**
- Participação (1-5)
- Desenvolvimento técnico (1-5)
- Engajamento (1-5)

---

### B2 — Encaminhamentos → pauta da próxima aula

**O que é hoje:** `proximaAula` é campo de texto livre no pós-aula.
**O que deve ser:** lista de checkboxes que pré-populam a próxima aula da mesma turma.

**Novo campo em `RegistroPosAula`:**
```ts
encaminhamentos?: { id: string; texto: string; concluido: boolean }[]
```

**Lógica proposta:**
- Ao criar novo plano para turma X, busca o último pós-aula de X que tenha `encaminhamentos` não concluídos
- Exibe banner: "📌 3 encaminhamentos da última aula — incluir no roteiro?"
- Se aceitar: adiciona como primeiros itens do roteiro

**Arquivos a alterar:**
- `src/types/index.ts` — campo `encaminhamentos` em `RegistroPosAula`
- `src/components/modals/ModalRegistroPosAula.tsx` — seção "Encaminhamentos para próxima aula" (lista editável de items)
- `src/components/TelaPrincipal.tsx` (formulário Nova Aula) — banner com encaminhamentos pendentes

---

### B3 — Gravação de áudio curta (30s) no pós-aula

**O que é hoje:** não existe.
**O que deve ser:** botão "🎙️ Gravar nota de voz" no pós-aula, salvo em IndexedDB.

**Tecnologia:** Web Audio API (MediaRecorder) — sem backend, sem custo.
**Armazenamento:** Blob serializado como base64 no IndexedDB (campo `audioBlob` no pós-aula). Limite suave: alertar se > 2MB por gravação.

**Novos campos em `RegistroPosAula`:**
```ts
audioNotaDeVoz?: string   // base64 do blob de áudio, opcional
audioDuracao?: number     // segundos
audioAlunoId?: string     // vinculação opcional a um aluno
```

**Arquivos a alterar:**
- `src/types/index.ts` — campos de áudio em `RegistroPosAula`
- `src/components/modals/ModalRegistroPosAula.tsx` — novo bloco "Nota de voz" com botão gravar/parar, player de reprodução, botão excluir

**Notas de implementação:**
- Gravar máx. 60s (cortar automaticamente)
- Testar permissão de microfone antes; se negada, mostrar mensagem clara
- Comprimir com bitrate baixo (16kbps mono) via MediaRecorder options

---

## FASE C — Visão anual e produtividade

### C1 — Progress bar anual no módulo Hoje

**O que é hoje:** sem noção de onde está no ano.
**O que deve ser:** "Semana 18 de 40 — 45% do ano letivo — Turma A: 14 aulas / Turma B: 11 / Turma C: 18"

**Cálculo:**
- Semanas: com base em `dataInicio` e `dataFim` do `AnoLetivo` ativo
- Aulas por turma: contar `registrosPosAula` agrupados por `turma`

**Arquivos a alterar:**
- `src/components/BancoPlanos.tsx` ou `src/components/ResumoDia.tsx` — widget de progress no topo da tela Hoje

---

### C2 — Mapa de cobertura de habilidades por turma

**O que é hoje:** dimensões pedagógicas nas Estratégias — mas sem visualização por turma.
**O que deve ser:** painel no Caderno da Turma: "esta turma teve X aulas de técnica, Y de teoria, Z de repertório este ano"

**Cálculo:**
- Para cada plano vinculado à turma: somar atividades por categoria + estratégias por dimensão
- Exibir como barras horizontais proporcionais

**Arquivos a alterar:**
- `src/components/ModuloPlanejamentoTurma.tsx` — nova aba/seção "Cobertura Anual" no Caderno da Turma

---

### C3 — Vista Kanban de planos

**O que é hoje:** lista linear de planos.
**O que deve ser:** colunas Rascunho / Pronto / Aplicado / Revisado, drag-and-drop.

**Novo campo em `Plano`:**
```ts
status?: 'rascunho' | 'pronto' | 'aplicado' | 'revisado'
```

**Arquivos a alterar:**
- `src/types/index.ts` — campo `status` em `Plano`
- `src/components/TelaPrincipal.tsx` — toggle "Vista Kanban" / "Vista Lista" + renderização por colunas
- `src/contexts/PlanosContext.tsx` — ação `ATUALIZAR_STATUS`

**Implementação:** drag-and-drop com HTML5 nativo (sem biblioteca) ou apenas clique para mover entre colunas (simples, sem drag).

---

### C4 — Sequential unit planning

**O que é hoje:** Sequências Didáticas ficam no banco sem uso no planejamento.
**O que deve ser:** ao vincular uma Sequência a uma turma, o sistema pergunta "Agendar as N aulas automaticamente?"

**Lógica:**
- Pega os próximos N slots daquela turma na grade semanal
- Cria N planos pré-populados com o conteúdo de cada etapa da sequência
- Planos ficam como rascunho; professor ajusta antes de aplicar

**Arquivos a alterar:**
- `src/components/modals/ModalAplicarEmTurmas.tsx` — adicionar fluxo de agendamento automático
- `src/contexts/PlanosContext.tsx` — ação `CRIAR_PLANOS_SEQUENCIA`

---

### C5 — PDF profissional do plano individual

**O que é hoje:** PDF de relatório mensal existe, mas não PDF de plano individual.
**O que deve ser:** botão "Exportar PDF" no plano → layout formatado para impressão/supervisor.

**Conteúdo do PDF:**
- Cabeçalho: escola, professor, turma, data, nível
- Objetivos, roteiro formatado por seção, músicas vinculadas, atividades, recursos
- Rodapé: gerado pelo MusiLab + data de exportação

**Arquivos a alterar:**
- `src/lib/gerarPdfPlano.ts` (novo) — função `gerarPdfPlano(plano, contexto)`
- `src/components/TelaPrincipal.tsx` — botão "📄 PDF" no card do plano (modo visualização)

---

### C6 — "Resumo para pais" via Gemini

**O que é hoje:** pós-aula só para o professor.
**O que deve ser:** botão "Gerar resumo para WhatsApp/e-mail" no pós-aula → Gemini formata texto amigável.

**Prompt Gemini:**
```
Você é assistente de um professor de música. Com base no registro desta aula:
{dados do pós-aula}
Escreva uma mensagem amigável e breve (máx. 5 linhas) para os pais/responsáveis,
em português informal, sobre o que foi trabalhado e o que o aluno pode praticar em casa.
```

**Arquivos a alterar:**
- `src/lib/gemini.ts` — função `gerarResumoPais(registroPosAula)`
- `src/components/modals/ModalRegistroPosAula.tsx` — botão "📱 Resumo para pais" com preview do texto + botão copiar

---

## Checklist de implementação

| # | Melhoria | Status | Commit |
|---|----------|--------|--------|
| 1 | A1 — Expandir AlunoDestaque (anotações + marcos) | ✅ | `787b55b` |
| 2 | A2 — Chamada rápida no pós-aula | ✅ | `79a2b57` |
| 3 | B2 — Encaminhamentos → próxima aula | ✅ | `48dffbf` |
| 4 | C1 — Progress bar anual | ✅ | `48dffbf` |
| 5 | B1 — Rubrica configurável | ✅ | `79a2b57` |
| 6 | C6 — Resumo para pais (Gemini) | ✅ | `79a2b57` |
| 7 | C5 — PDF do plano individual | ✅ | já existia em `utils/pdf.ts` |
| 8 | C2 — Mapa de cobertura pedagógica | ✅ | `2d2699c` |
| 9 | A3 — Tipos de anotação configuráveis | ✅ | `2d2699c` |
| 10 | B3 — Gravação de áudio (30s) | ✅ | `99390a2` |
| 11 | C3 — Vista Kanban | ✅ | `982d26b` |
| 12 | C4 — Sequential unit planning | ✅ | `95cb2d4` |

---

## STATUS DA SESSÃO 2026-03-12

**9 de 12 melhorias concluídas ✅**

Último commit: `2d2699c` — feat(cobertura+tipos-anotacao)
Branch: `main` — 9 commits à frente do origin (push pendente)

---

## ITENS RESTANTES — GUIA DETALHADO PARA PRÓXIMA SESSÃO

### ▶ B3 — Gravação de áudio curta (30s) no pós-aula
**Esforço:** Alto (1 sessão completa)
**Dependências:** nenhuma nova — `RegistroPosAula` já existe

#### Passo a passo:

**1. `src/types/index.ts`** — adicionar em `RegistroPosAula`:
```ts
audioNotaDeVoz?: string   // base64 do blob de áudio
audioDuracao?: number     // segundos gravados
audioAlunoId?: string     // vínculo opcional a um aluno
```

**2. Criar `src/lib/audioRecorder.ts`** (novo arquivo):
```ts
// Usa MediaRecorder API — sem dependências externas
let recorder: MediaRecorder | null = null
let chunks: Blob[] = []

export async function startRecording(): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } })
  chunks = []
  recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 16000 })
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
  recorder.start(200)
}

export function stopRecording(): Promise<Blob> {
  return new Promise(resolve => {
    if (!recorder) return resolve(new Blob())
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/webm' }))
    recorder.stop()
    recorder.stream.getTracks().forEach(t => t.stop())
  })
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise(resolve => {
    const r = new FileReader()
    r.onloadend = () => resolve((r.result as string).split(',')[1])
    r.readAsDataURL(blob)
  })
}
```

**3. `src/components/modals/ModalRegistroPosAula.tsx`**:
- Adicionar estados: `gravando: boolean`, `timerGravacao: number`, `audioBase64: string | null`, `audioDuracao: number`
- Parar automaticamente em 60s com `useEffect` + `setInterval`
- UI (bloco colapsável no final do form, antes do botão Salvar):
  - Estado idle: botão "🎙 Gravar nota de voz"
  - Estado gravando: contador regressivo em vermelho "●REC 0:23" + botão "⏹ Parar"
  - Estado com gravação: player `<audio>` com `src=base64` + duração + botão "🗑 Excluir"
- Ao salvar o registro, incluir `audioNotaDeVoz`, `audioDuracao` no objeto

**Nota de implementação:** se `MediaRecorder` não suportar `audio/webm;codecs=opus`, usar fallback `audio/webm` sem codec especificado. Testar permissão com `try/catch` e mostrar mensagem se negada.

---

### ▶ C3 — Vista Kanban de planos
**Esforço:** Médio (meio período)
**Dependências:** nenhuma

#### Passo a passo:

**1. `src/types/index.ts`** — adicionar em `Plano`:
```ts
kanbanStatus?: 'rascunho' | 'pronto' | 'aplicado' | 'revisado'
```
(Usar `kanbanStatus` e não `status` para não colidir com `statusPlanejamento` existente)

**2. `src/contexts/PlanosContext.tsx`** — adicionar ação:
```ts
// No reducer, novo case:
case 'ATUALIZAR_KANBAN_STATUS':
  return { ...state, planos: state.planos.map(p =>
    p.id === action.id ? { ...p, kanbanStatus: action.status } : p
  )}

// Na interface/contexto:
atualizarKanbanStatus: (id: string | number, status: Plano['kanbanStatus']) => void
```

**3. `src/components/TelaPrincipal.tsx`**:
- Adicionar toggle no header da listagem: botão "☰ Lista" / "⠿ Kanban"
- Estado `vistaKanban: boolean` no componente
- Quando `vistaKanban = true`, renderizar 4 colunas com `grid-cols-4`:
  ```
  Rascunho | Pronto | Aplicado | Revisado
  ```
- Cada coluna: título + badge de contagem + lista de `LinhaPlano` (ou card menor)
- Cada card tem setas ← → para mover de coluna (simples, sem drag-and-drop)
- Planos sem `kanbanStatus` aparecem em "Rascunho" por padrão

**Nota:** Não implementar drag-and-drop nativo — as setas de mover coluna são suficientes para a primeira versão.

---

### ▶ C4 — Sequential unit planning
**Esforço:** Alto (1 sessão completa)
**Dependências:** Sequências já existem (`src/contexts/SequenciasContext.tsx`)

#### Passo a passo:

**1. Verificar estrutura atual de `Sequencia`** (em `src/types/index.ts`):
- Deve ter `slots: SequenciaSlot[]` onde cada slot é uma aula da sequência
- Verificar se existe `SequenciaSlot.rascunho` (título + objetivos pré-preenchidos)

**2. `src/contexts/PlanosContext.tsx`** — nova função:
```ts
function criarPlanosDeSequencia(
  sequencia: Sequencia,
  turmaId: string,
  dataInicio: string,   // ISO date da primeira aula
  diasSemana: number[]  // [1,4] = segunda e quinta
): Plano[] {
  // Para cada slot da sequência, calcular a próxima data disponível
  // e criar um Plano com statusPlanejamento: 'A Fazer', kanbanStatus: 'rascunho'
  // Título = sequencia.titulo + " — Aula N"
  // objetivoGeral = slot.rascunho?.objetivoGeral ?? ''
}
```

**3. `src/components/ModuloSequencias.tsx`** — botão "Aplicar em turma" em cada card de sequência:
- Abre um mini-modal (ou bottom sheet mobile) com:
  - Select de turma (de `useAnoLetivoContext`)
  - Input de data de início (date picker)
  - Exibição das N datas calculadas ("Aula 1: 15/mar · Aula 2: 22/mar · ...")
  - Botão Confirmar → chama `criarPlanosDeSequencia` → toast "N planos criados como rascunho"

**4. `src/components/TelaPrincipal.tsx`** — planos gerados pela sequência ganham badge:
- Se `plano.origemSequenciaId` existir, mostrar `Seq: [nome]` em azul claro no card

---

## Regras para implementação

- Todos os campos novos são `optional` (retrocompatível)
- `npx tsc --noEmit && npm run build && npm test -- --run` deve passar antes de qualquer commit
- Commits atômicos por melhoria
- `.env` nunca vai para o git
- Mobile-first: testar em viewport 375px antes de commitar
- Ao iniciar a sessão: `git pull origin main` primeiro (há 9 commits para fazer push)

---

*Plano gerado com base na análise competitiva de 5 apps (Planboard, PlanbookEdu, TeacherKit, iDoceo, Notion for Education) vs. MusiLab — ver ANALISE-COMPETITIVA-2026-03-11.md para detalhes completos.*
