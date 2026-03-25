# Ideias — Módulo Histórico: Alertas e Insights

> Discussão: 2026-03-22

---

## Contexto

Módulo Histórico atual mostra registros pós-aula por turma/data.
Falta feedback de problemas e padrões — esse é o coração do módulo.

---

## Problemas identificados no estado atual

1. **Turma sem registro recente** — não aparece nenhum aviso visível
2. **Aluno com dificuldade** — `alunoAtencao` existe no dado mas não é surfaçado
3. **Queda de engajamento** — flag `pontoQueda` existe mas não aparece no topo
4. **Padrões positivos** — nenhuma forma de identificar o que funcionou bem

---

## Ideia principal: Painel de alertas no topo

**Formato:** 1–3 frases curtas, escaneáveis, acionáveis. Não um parágrafo.

**Exemplos ideais:**
```
⚡ João apareceu em atenção 3x esta semana (GR3B)
⚡ 2 turmas estão há mais de 10 dias sem registro
⚡ Queda de engajamento em 2 aulas de GR1B
⚡ Atividades em duplas funcionaram em 2 turmas  ← padrão positivo
```

**Regra de ouro:** IA como radar de padrões, não como gerador de texto.

---

## Dois níveis de implementação

### Fase 1 — Regras puras (implementar primeiro)
Sem IA, sem custo, confiabilidade 100%.

| Insight | Fonte no código | Lógica |
|---------|----------------|--------|
| Turma sem registro há X dias | `lacunas` — já existe | já calculado |
| João em atenção recorrente | `alunoAtencao` nos registros | `filter + count` |
| Queda de engajamento em turma | `pontoQueda` flag | `filter + count por turma` |
| N turmas sem registro recente | `lacunas.length` | já existe |

**Formato de exibição:** banner compacto no topo, máximo 3 alertas, dispensável.
Só aparece quando há algo fora do padrão (não mostrar se tudo ok → evitar banner blindness).

### Fase 2 — Síntese IA (botão sob demanda)
Gemini analisa os registros filtrados e retorna 1–2 frases de padrão.

- **Não automático** — botão `✨ Síntese` que o professor aciona quando quer
- **Foco em padrão positivo** — o que funcionou em múltiplas turmas
- **Modelo:** `gemini-2.5-flash-lite` (mais rápido e barato)
- **Prompt type:** detecção de padrão, não análise pedagógica profunda
- **Limite:** 2 frases curtas, sem parágrafos

---

## O que NÃO fazer

- ❌ Parágrafo longo de análise
- ❌ Linguagem robótica tipo relatório
- ❌ Banner sempre visível mesmo sem nada relevante (banner blindness)
- ❌ IA automática sem controle do professor
- ❌ Misturar regras e IA na mesma entrega

---

## Prioridade de alertas (ordem de importância)

1. Aluno recorrente em atenção (dado altamente acionável)
2. Turma sem registro há muitos dias (lacuna)
3. Queda de engajamento recorrente em turma
4. Padrão positivo (reforço do que funcionou)

---

## Implementação técnica — Fase 1

Os dados já existem no componente:
- `lacunas` → array de turmas sem registro (calculado em `useMemo`)
- `registrosFiltrados` → todos os registros do período filtrado
- `filtroAlunoAtencao` → já filtra por aluno, mas não agrega

**Novo cálculo necessário:**
```ts
// Contar menções de cada aluno em alunoAtencao
const atencaoCount = registrosFiltrados.reduce((acc, r) => {
    const a = (r as any).alunoAtencao
    if (a && typeof a === 'string' && a.trim()) {
        acc[a.trim()] = (acc[a.trim()] || 0) + 1
    }
    return acc
}, {} as Record<string, number>)

// Alertas de aluno: só quando >= 2 menções
const alertasAluno = Object.entries(atencaoCount)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)  // máximo 2 alunos

// Contar queda de engajamento por turma
const quedaCount = registrosFiltrados.reduce((acc, r) => {
    if ((r as any).pontoQueda) {
        const key = nomeTurma(r)
        acc[key] = (acc[key] || 0) + 1
    }
    return acc
}, {} as Record<string, number>)

const alertasEngajamento = Object.entries(quedaCount)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 1)
```

**Exibição:** usar o banner de insights já existente no componente,
evoluir para mostrar múltiplos alertas (atualmente mostra 1).

---

## Ideia futura — Resposta por áudio único

> 2026-03-23

Ao invés de responder campo a campo no formulário pós-aula, o professor gravaria um único áudio respondendo todas as perguntas de uma vez. O sistema transcreveria e distribuiria as respostas nos campos corretos usando IA.

**Referência:** comportamento igual ao WhatsApp (mesmo padrão de gravação).

**Benefício:** muito mais prático para uso logo após a aula, sem precisar digitar.

---

## Ideia futura — Card Hero: alternativas de abertura

> 2026-03-23 — amadurecer antes de implementar

Hoje o Card Hero abre modal centralizado com scale + backdrop blur. Alternativas baseadas em tendências de apps modernos:

**1. Shared Element / Card Expand in Place**
Referência: iOS App Store, Google Play, Apple Music.
O card se expande a partir da sua posição exata na grade até preencher a tela. Continuidade visual total — o usuário nunca perde o contexto de onde clicou.
Técnica: `getBoundingClientRect()` → animar `clip-path` ou `transform: scale + translate` da origem ao destino.
Impressão: premium, fluido, sensação de "abrir" algo real.

**2. Bottom Sheet deslizante**
Referência: Google Maps, Spotify, Apple Maps, Uber.
Painel sobe de baixo com spring easing. Grid da semana fica visível e dimmed acima. Swipe down para fechar.
Técnica: `transform: translateY(100%→0)` + drag gesture.
Impressão: muito natural no celular. Ideal para mobile-first.

**3. Side Panel (drawer lateral)**
Referência: Linear, Jira, GitHub Issues, Notion.
Detail panel desliza da direita, grid comprime levemente para a esquerda. Professor pode ver outros cards e clicar neles sem fechar o painel.
Técnica: `translateX(100%→0%)` + resize do grid para `calc(100% - 380px)`.
Impressão: produtividade, contexto sempre visível, ideal para navegar entre cards com ↑↓.

**4. Popover ancorado ao card**
Referência: Figma, Linear (issue preview), Notion (link preview).
Popover borbulha a partir da posição exata do card, com seta apontando para ele. Restante da tela dimmed mas visível.
Técnica: `position: absolute` calculado via `getBoundingClientRect()` + `transform-origin` no card.
Impressão: leve, contextual, sem abandonar a tela. Ótimo para previews rápidos.

**5. Flip 3D**
Referência: Anki (flashcards), dashboards modernos, apps de finanças.
Card vira como carta — face frontal mostra resumo, face traseira mostra detalhe.
Técnica: `transform-style: preserve-3d` + `backface-visibility: hidden` + `rotateY(0→180deg)`.
Impressão: expressivo, memorável. Funciona melhor em cards isolados do que em grids densos.

**6. Spotlight Zoom**
Referência: iOS Spotlight, macOS Quick Look.
Background escurece, card levemente sobe (zoom 1.0→1.06 + sombra forte), painel de detalhe aparece inline abaixo empurrando outros cards.
Técnica: `z-index` elevado + `box-shadow` intenso + painel inline `max-height: 0→auto`.
Impressão: contextual, sem ruptura de layout. Card e detalhe na mesma região da tela.

**Próximo passo:** criar preview HTML interativo com as 6 opções antes de decidir.

---

## Ideia futura — Card Hero na Visão da Semana

> 2026-03-23

Ao clicar em um card **com aula planejada** na Visão da Semana, em vez de navegar direto para edição, o card "cresce" do centro da tela com animação scale + fade (backdrop blur no fundo). O modal exibe o plano em modo leitura com as ações **Editar** e **Registrar pós-aula**.

**Comportamento diferenciado por tipo de card:**
- Card com plano → abre Card Hero (preview + ações)
- Card vazio → comportamento atual (navega para "Aula por Turma")

**Opção escolhida:** C — Card Hero (scale do centro, blur no fundo, ✕ para fechar ou tap no overlay).

**Preview salvo em:** `preview-visao-semana-card-click.html`

**Comportamento expandido — card com registro pós-aula:**

Quando o card mostra "✓ Aula concluída" (ou seja, tem registro pós-aula), o Card Hero deve incluir uma seção de resumo do que foi registrado. O professor bate o olho e lembra o que aconteceu — útil para preparar a próxima aula com a mesma turma.

**Estrutura do Card Hero para aula concluída:**
```
┌─────────────────────────────────┐
│  GR3A · EMPAC · 3° ANO          │
│  Seg, 23/03 · 09:50             │
│─────────────────────────────────│
│  📋 PLANO                        │
│  [título e objetivo resumido]    │
│─────────────────────────────────│
│  ✓ ÚLTIMA AULA REGISTRADA        │
│  💡 Aprenderam: "..."            │
│  ⭐ Funcionou: "..."             │
│  🔄 Faria diferente: "..."       │
│  Como foi: Conteúdo concluído    │
│─────────────────────────────────│
│  [Editar plano]  [Nova aula]     │
└─────────────────────────────────┘
```

**Regras de exibição da seção de registro:**
- Mostra apenas se `foiRegistrada = true` (tem registro pós-aula para aquela data específica)
- Campos exibidos: `funcionouBem`, `repetiria`, `fariadiferente`, `statusAula`
- Campos omitidos se vazios (não mostrar linha em branco)
- `comportamento` e `alunoAtencao` omitidos no card (privacidade / dado sensível)
- Texto truncado em 1 linha com `…` — não é leitura completa, é memória rápida

**Por que não fazer um botão separado no card:**
- O card da semana é pequeno — botão extra polui a leitura rápida
- O Card Hero já resolve o clique no card — não precisa de segundo ponto de entrada
- Solução parcial agora seria refeita quando o Card Hero chegar

**Pendências antes de implementar:**
- Definir se o Card Hero abre em read-only ou diretamente editável
- Decidir se usa o `FormularioAulaPlena` existente dentro do modal ou um viewer dedicado
- Definir qual registro mostrar: da data exata do card ou o mais recente da turma
- Testar performance do `backdrop-filter: blur` em Android

---

## Ideia pronta para implementar — Importar campos do registro anterior

> 2026-03-23

**Problema:** professor dá a mesma aula para várias turmas no mesmo dia ou na mesma semana (ex: segunda e sexta). Preencher os mesmos campos 4x é tedioso.

**Fluxo (pull, não push):**
O professor está registrando GR3B → dentro do formulário aparece banner:
`"📋 GR3A registrada hoje com este plano — importar campos? [Importar ↓]"`
Ele puxa de um registro passado para o atual. **Nunca copia para turma futura** (professor não sabe o que vai acontecer ainda).

**Detecção:** mesmo `planoId`, registro feito nos últimos **7 dias** (cobre segunda→sexta da mesma semana; 14 dias para semanas com feriado).

**Campos a importar — confirmados pelo professor:**

| Label no app | Campo interno | Importar? |
|---|---|---|
| O que os alunos demonstraram aprender? | `funcionouBem` | ✅ Sim |
| O que funcionou e você faria de novo? | `repetiria` | ✅ Sim |
| O que faria diferente? | `naoFuncionou` | ✅ Sim | ⚠️ label antigo "O que não funcionou" — não existe mais |
| Comportamento da turma | `comportamento` | ❌ Nunca |
| Aluno com atenção | `alunoAtencao` | ❌ Nunca |
| Engajamento / queda | `pontoQueda` | ❌ Nunca |
| Como foi (status) | `statusAula` | ❌ Nunca |
| Próxima aula | `proximaAula` | ❌ Nunca |

**Após importar:** campos ficam editáveis — professor ajusta o que foi diferente nessa turma e salva normalmente.

**Decisões tomadas:**
- Opção A (Banner passivo) implementada: 1 clique importa os 3 campos, campos ficam editáveis
- Se houver mais de um registro elegível → mostra o mais recente
- Janela: 7 dias (cobre segunda→sexta)

**Layouts alternativos anotados para revisão após uso:**
- B: Pre-fill automático — zero cliques, mais rápido, mas risco de registro genérico
- C: Botão por campo — controle total campo a campo, 1–3 cliques
- D: Drawer comparação — lê o conteúdo antes de importar, máximo controle
- Preview salvo em: `preview-importar-registro.html`

---

## Ideia para amadurecer — Abertura inteligente do módulo Hoje

> 2026-03-23

Problema: professor abre o app antes/durante a primeira aula e já "cai" no pós-aula, quando na verdade quer revisar o plano.

Proposta em discussão: pós-aula só fica acessível no gap entre aulas ou após o horário de todas as aulas do dia (aulas de 50 min, geralmente seguidas).

**Por que ainda não está pronto para implementar:**
- Grade só tem horário de início — duração seria hardcoded (quebraria em escolas com 45/60 min)
- Gap curto entre aulas causaria abertura/fechamento confuso
- Gap longo (ex: 09:50 e 14:30) mantém pós-aula aberto por horas
- Bloqueia professor que quer registrar ainda dentro da sala no final da aula

**Hipótese alternativa (mais simples):**
O problema real não é o timing — é que revisar o plano antes da aula é difícil. Botão `📋 Ver plano` direto no card do Hoje (ligado ao Card Hero) pode resolver sem lógica de tempo.

**O que precisa ser resolvido antes:**
- Testar se o botão `📋 Ver plano` de fato satisfaz o "professor chegou atrasado"
- Decidir se aulas têm duração configurável na grade semanal
- Entender se o professor quer um BLOQUEIO ou apenas um ATALHO melhor

---

---

## Ideia para amadurecer — IA no plano de aulas: sugestões e análise crítica

> 2026-03-23

**Problema:** professor cria o plano de aula mas não tem referência rápida de abordagens pedagógicas, atividades criativas ou análise crítica da proposta.

**Proposta:** campo de IA dentro do formulário de plano de aula com 3 funções principais:

### 1. Sugestão de atividades
Com base no conteúdo/objetivo da aula, a IA sugere atividades adaptadas a abordagens pedagógicas musicais:
- Orff (instrumental, percussão corporal)
- Dalcroze (movimento, euritmia)
- Keith Swanwick (espiral de desenvolvimento musical)
- Kodály, Gordon, etc.
- Professor pode **escolher a abordagem** antes de pedir sugestões → prompt mais focado

### 2. Idéias de criação e movimento
Sugestões específicas de atividades criativas: improvisação, criação coletiva, movimento, jogos musicais — contextualizadas ao tema/objetivo do plano.

### 3. Análise crítica da aula
Professor submente o plano e recebe análise crítica: pontos fortes, lacunas, sugestões de melhoria, alinhamento com objetivos pedagógicos.

### Professor cria o próprio prompt
Campo livre onde o professor escreve sua pergunta específica → a IA responde no contexto do plano. Máxima flexibilidade sem depender de templates fixos.

**Modelo sugerido:** Gemini Flash (custo baixo, resposta rápida) ou Claude Haiku.

**Posicionamento no UI:** botão `✨ Sugestões IA` dentro do `FormularioAulaPlena`, expansível (não ocupa espaço por padrão).

**O que NÃO fazer:**
- ❌ IA que sobrescreve o plano do professor automaticamente
- ❌ Análise longa tipo relatório acadêmico
- ❌ Sugestões genéricas sem contexto do plano

**Pendências antes de implementar:**
- Definir quais campos do plano são enviados como contexto para a IA
- Decidir se o professor seleciona a abordagem em chips ou campo livre
- Avaliar custo por chamada e se precisa de chave de API configurável pelo usuário

---

---

## Decisão estratégica — App nativo (React Native / Expo)

> 2026-03-23

**Decisão:** transformar o MusiLab de PWA (browser) para app nativo publicado na App Store e Play Store.

**Motivação principal:** transcrição de áudio com Whisper local — offline, tempo real, alta precisão, aceita vocabulário customizado. Resolve definitivamente o problema de erros de transcrição (ex: "turma" → "macumba").

**Outras vantagens do app nativo:**
- Whisper rodando localmente → offline completo + privacidade total do áudio
- Notificações push (lembrar de registrar pós-aula, próxima aula se aproximando)
- Ícone na tela inicial, abertura mais rápida
- Acesso ao microfone de melhor qualidade
- Experiência mais fluida no celular (sem barra de browser, sem reload)

**Transição recomendada:** React Native + Expo — aproveita o conhecimento React existente, código compartilhado com a web, publicação simplificada nas lojas.

**O que fazer até lá (no PWA atual):**
- Transcrição de áudio: híbrido Web Speech API (tempo real) + correção Gemini (pós-processamento)
- Isso é o teto do que é possível no browser

**Estratégia decidida:**
- Pular Capacitor — ir direto para React Native + Expo quando for a hora
- Claude Code faz o código, professor testa no dispositivo e publica nas lojas

**Quando migrar:**
- Quando o produto web estiver estável e validado no uso diário
- Todas as funcionalidades principais implementadas e sem bugs críticos
- Fluxo completo funcionando: planejamento → aula → pós-aula → histórico
- Sinal prático: "está bom, só falta estar no celular"
- Motivo: reescrever para RN congela features por semanas — melhor iterar rápido no web primeiro

**Pendências antes de iniciar a migração:**
- Definir quais funcionalidades são mobile-first vs desktop
- Avaliar se mantém versão web em paralelo (professores que usam no computador)
- Planejar estratégia de migração de dados (IndexedDB → SQLite local ou Supabase)

---

---

## Redesign completo do Módulo Nova Aula

> Spec gerada em 2026-03-18 — baseada em auditoria pedagógica consolidada (Yinger, Elliott, Sweller, Wiliam, Wiggins & McTighe). Não implementada.

### Princípios norteadores (filtro de toda decisão)

1. **Atividade é a unidade central** — professor pensa "o que faremos", não "qual objetivo". Roteiro de atividades é o coração.
2. **Repertório é ponto de partida** — músicas sobem para o topo, não são apêndice.
3. **Um campo, uma função** — sem duplicações. Duplicação = carga cognitiva sem valor.
4. **Formulário promove reflexão, não documentação** — cada campo obriga a uma decisão pedagógica real.
5. **Três camadas, não duas** — Modo Rápido → Profissional → Documentação. Salto abrupto era o problema.
6. **Avaliação é planejada antes** — segunda coisa a definir, não a última.
7. **Burocracia separada de planejamento** — BNCC, status, tags: bloco colapsado "Documentação".

### Nova arquitetura — 3 camadas

| Camada | Nome | Tempo | Para quem |
|--------|------|-------|-----------|
| 1 | Modo Rápido | 2–3 min | Professor experiente, aula rotineira |
| 2 | Modo Profissional | 10–15 min | Plano completo, reflexão real |
| 3 | Modo Documentação | +5–10 min | Registro formal, portfólio, escola |

### Mudanças por bloco

**Header fixo (sempre visível):**
- Título + Duração (alimenta contador do roteiro)
- Toggle 3 estados: ⚡ Rápido / 📋 Profissional / 📁 Documentação
- Faixa etária + Nível musical — dois campos separados (hoje são um só e confundem)

**Bloco A — Contexto (colapsado, condicional):**
- Exibe último pós-aula (readonly)
- Novo campo ativo: "Como esta aula continua a anterior?" (1 linha)

**Bloco B — Músicas (sobe para o topo):**
- Campo de busca no repertório + chips selecionáveis
- Link rápido para adicionar música nova sem sair do form

**Bloco C — Roteiro de atividades (coração):**
- Sem mudança estrutural — já funciona bem

**Bloco D — Avaliação (reestruturado):**
- 3 campos de 1 linha orientados (não textarea genérico):
  - "O que observarei para saber se funcionou?"
  - "Como verificarei a compreensão?" (pergunta, gesto, etc.)
  - "Se não funcionar, o que farei?" (contingência)

**Bloco E — BNCC (reformulado, Documentação):**
- Picker com busca por código ou palavra-chave (não digitação livre)
- "✨ Sugerir com IA" — Gemini sugere a partir do roteiro e objetivos

### Status
- [ ] Não implementado — aguarda produto web estável para priorizar

---

---

## Mobile UX — Feedback em campo (2026-03-24)

> Testado diretamente no mobile após deploy. Itens prioritários identificados pelo professor em uso real.

---

### Card Hero (Bottom Sheet — opção 2)
- ✅ É o melhor estilo
- [ ] Precisa de scroll interno embutido quando o conteúdo excede a tela
- [ ] Drag para baixo com o dedo deve fechar o modal (gesto nativo mobile)

### Visão da Semana
- [ ] Swipe horizontal com o dedo para navegar entre semanas (esquerda/direita)
- [ ] Ícone de "próxima semana" não é prático nem intuitivo — substituir por swipe
- [ ] Card ainda tem muita informação — avaliar o que pode ser removido/minimizado
- [ ] **Modo mobile dedicado**: mostrar só DayView com scroll horizontal para dia anterior/seguinte
- [ ] Pull-to-refresh dispara acidentalmente ao scrollar para cima — desativar ou bloquear o gesto

### Registro Pós-Aula
- [ ] Modal abre com primeiro campo de texto já focado/aberto → teclado aparece automaticamente. No mobile isso é ruim: professor normalmente quer **gravar áudio**, não digitar. Não abrir campo automaticamente.
- [ ] A mensagem de "Atenção especial" sobre comportamento de aluno que aparece em certas turmas não faz sentido dentro do formulário de registro — revisar onde/como surfaçar isso
- [ ] Ao **importar campos** de outra turma: layout atual cria scroll interno em cada bloco de perguntas (para conferir contexto) — pouco prático no mobile. Melhor: aumentar a altura visível dos campos para evitar scroll interno
- [ ] Na tela de importar campos: nome da turma aparece cortado no topo
- [ ] Na tela de importar campos: setas ↑↓ para troca de turma tomam espaço do nome da turma — remover (já existe navegação ←→ por setas horizontais)

---

## Backlog Consolidado — Todas as Ideias Pendentes

> Consolidado em 2026-03-23 a partir de: IDÉIAS.md · IDEIAS-FUTURAS.md · PLANO-IMPLEMENTACAO-2026.md · PLANO-MELHORIAS-NOVA-AULA.md · melhoriasmar26.md · BUGS-E-MELHORIAS.md

---

### 🐛 Bugs abertos

| # | Descrição | Módulo | Prioridade |
|---|-----------|--------|------------|
| BUG-017 | Seletor de escola no Histórico não permite selecionar múltiplas escolas | `TelaPosAulaHistorico.tsx` | 🔴 Alta |
| BUG-001 | Fase 2 detecta palavras entre aspas que não são músicas (listas de passos, instruções) | `detectarMusicas.ts` | 🟡 Moderada |
| BUG-004 | Gemini retorna nome de categoria em vez de sub-conceito (ex: "Ritmo" em vez de "Pulsação") | `PlanosContext.tsx` | 🟢 Baixa |
| BUG-002 | YouTube detecta vídeos não musicais como nova música | `detectarMusicas.ts` | 🟢 Baixa |
| BUG-003 | Fase 2 detecta citações já cobertas pela Fase 1 com texto ligeiramente diferente | `detectarMusicas.ts` | 🟢 A investigar |

---

### 🔴 Alta prioridade — impacto direto no fluxo diário

| Ideia | Origem | Notas |
|-------|--------|-------|
| Alertas no Histórico — regras puras (turma sem registro, aluno recorrente, queda de engajamento) | ideias_historico | Fase 1 — sem IA, zero custo |
| Síntese IA no Histórico — botão sob demanda | ideias_historico | Fase 2 — Gemini, 2 frases curtas |
| Resumo IA por campo + período no Histórico | IDÉIAS.md | Seleciona campo + período → Gemini gera narrativa de padrões |
| Visão da Semana — Mini Dashboard de preparo | IDÉIAS.md | Chips: "4 novas · 3 revisões · 1 sem plano" acima do grid |
| Visão da Semana — Filtro por escola/turma/status | IDÉIAS.md | Chips clicáveis → dimm das aulas fora do filtro |
| Módulo Hoje — Insights automáticos por turma | IDEIAS-FUTURAS.md | "Prestar atenção no aluno X · GR2B pedindo retomada 3x" |
| Redesign Nova Aula — 3 camadas + avaliação + BNCC IA | PLANO-MELHORIAS-NOVA-AULA.md | Spec completa já documentada neste arquivo |
| Gráfico de equilíbrio pedagógico ⭐⭐ | IDÉIAS.md | Agrega conceitos das atividades → radar/barras. Abordagens: Swanwick C(L)A(S)P, Orff, Dalcroze, Kodály, BNCC |
| IA no plano — sugestões por abordagem + análise crítica | ideias_historico | Fase 7 — Gemini dentro do FormularioAulaPlena |

---

### 🟡 Média prioridade — melhoria de UX importante

| Ideia | Origem | Notas |
|-------|--------|-------|
| Álbum da Turma — fotos/vídeos/áudios por aula | IDÉIAS.md | Linha do tempo visual por turma — diferencial de mercado |
| Copiar registro pós-aula para outras turmas | IDÉIAS.md | Dentro do Registro Rápido, replicar resultado/rubrica |
| Indicador visual de encaminhamentos pendentes | IDÉIAS.md | Badge no bloco da turma se há encaminhamentos não concluídos |
| PDF do dia — todas as turmas em 1 página | IDÉIAS.md | Horário + plano vinculado + campo de notas |
| Relatório de aluno — PDF individual | IDÉIAS.md | Histórico de anotações, marcos e presença do ano |
| Exportar chamada — CSV ou PDF | IDÉIAS.md | Frequência do período selecionado |
| Dashboard unificado — métricas visuais do mês | IDÉIAS.md | Aulas realizadas, alunos atendidos, repertório mais usado |
| Relatório semestral por turma | IDÉIAS.md | Planos realizados, estratégias mais usadas, músicas trabalhadas |
| Nota rápida do dia — sticky note por data | IDÉIAS.md | Persistido no localStorage, no painel lateral |
| Onboarding para novos usuários | IDÉIAS.md | Tour 4 passos: ano letivo → grade → primeiro plano → registro |
| Renomear "Biblioteca" → "Meu Repertório" / "Repertório" → "Músicas" | IDEIAS-FUTURAS.md | UX/nomenclatura — simples de implementar |
| Sugerir objetivo via Gemini no Nova Aula | IDEIAS-FUTURAS.md | Passa atividades → Gemini gera objetivo automaticamente |
| Alerta de tempo no Nova Aula | IDEIAS-FUTURAS.md | Roteiro > duração da aula → IA sugere cortes |
| Modo leitura/apresentação no Nova Aula | IDEIAS-FUTURAS.md | Desativa inputs para apresentar no projetor |
| Sugestão de próxima aula via Gemini | IDÉIAS.md | Analisa histórico de registros e sugere próximo plano |
| Análise de engajamento por turma via Gemini | IDÉIAS.md | Interpreta rubricas e encaminhamentos → diagnóstico |

---

### 🟢 Baixa prioridade — melhorias incrementais

| Ideia | Origem | Notas |
|-------|--------|-------|
| Ordem personalizável dos accordions no Nova Aula | IDÉIAS.md | Só após usar a ordem padrão por semanas |
| Preview PDF antes de baixar | IDEIAS-FUTURAS.md | Modal de preview antes do download |
| Timestamp nas notas de adaptação | IDEIAS-FUTURAS.md | Data/hora automática ao criar nota |
| Vinculação automática de música ao importar atividade | IDEIAS-FUTURAS.md | Se atividade tem música → vincula ao plano |
| Link público do plano | IDÉIAS.md | URL compartilhável sem login (Supabase RLS) |
| Exportação de atividades em PDF | IDÉIAS.md | Banco de atividades offline |
| Modo apresentação — tela cheia no projetor | IDÉIAS.md | Plano em fullscreen durante a aula |
| Template de plano por turma | IDÉIAS.md | Cada turma com atividades padrão configuradas |
| Sequência de aulas em arrastar — reordenar slots | IDÉIAS.md | Drag-and-drop dentro de uma sequência |
| Histórico de versões do plano | IDÉIAS.md | Ver o que mudou entre edições |
| Comentários colaborativos no plano | IDÉIAS.md | Para coordenadores/supervisores |

---

### 🔧 Débito técnico

| Ideia | Origem | Notas |
|-------|--------|-------|
| Cache IndexedDB-first | IDÉIAS.md | Carregar do IndexedDB antes do Supabase → −90% egress |
| Virtualização de listas | IDÉIAS.md | react-window para 150+ planos/músicas |
| Context splitting do PlanosContext | IDÉIAS.md | Separar em CRUD + Filters + UI → menos re-renders |
| IDs string\|number → string | IDÉIAS.md | Migração automática com testes (S6, alto risco) |

---

### 🌐 Futuro / SaaS / Infraestrutura

| Ideia | Origem | Notas |
|-------|--------|-------|
| Migração Google Drive → Cloudflare R2 | IDÉIAS.md | Quando houver professores pagantes. $0.015/GB/mês. Plano de 4 etapas documentado no IDÉIAS.md |
| Google Drive — conexão permanente via Supabase Edge Functions | IDÉIAS.md | refresh_token salvo → professor conecta 1x para sempre |
| Google Classroom — enviar plano direto | IDÉIAS.md | OAuth + API Classroom |
| Push notifications | IDÉIAS.md | Lembrete de encaminhamentos antes da próxima aula |
| Calendário .ics | IDÉIAS.md | Exportar agenda em formato Apple/Google Calendar |
| App nativo React Native + Expo | ideias_historico | Quando produto web estiver estável. Whisper local, lojas, notificações |

---

## Status de fases

- [ ] Fase 1: alertas baseados em regras
- [ ] Fase 2: botão Síntese IA (sob demanda)
- [ ] Fase 3 (futura): gravação de áudio único → distribuição automática nos campos
- [ ] Redesign Nova Aula (3 camadas + avaliação + BNCC com IA)
- [x] Fase 4 (concluída 2026-03-23): Card Hero na Visão da Semana
- [ ] Fase 5 (amadurecer): Abertura inteligente do módulo Hoje por horário
- [x] Fase 6 (concluída 2026-03-23): Importar campos do registro anterior — mesma aula, outra turma
- [ ] Fase 7 (amadurecer): IA no plano de aulas — sugestões de atividades, abordagens pedagógicas, análise crítica, prompt livre
- [x] Transcrição híbrida (concluída 2026-03-23): Web Speech API em tempo real + correção Gemini ao finalizar

---

## Documentação técnica — Gravação de voz nos campos do pós-aula

> 2026-03-23

### Como funciona hoje

**Componente:** `AccordionChip` em `src/components/modals/ModalRegistroPosAula.tsx` (linha ~36)

Cada campo de texto do formulário pós-aula (O que os alunos aprenderam, O que funcionou, O que faria diferente) tem um botão 🎙 que ativa gravação de voz.

### Arquitetura: híbrido Web Speech API + Gemini

**Passo 1 — Gravação em tempo real (Web Speech API)**
- API: `window.SpeechRecognition` / `window.webkitSpeechRecognition` (nativa do browser)
- `lang: 'pt-BR'`, `continuous: true`, `interimResults: true`
- Enquanto o professor fala, os resultados **interim** (não finais) aparecem no campo em cinza claro — feedback em tempo real
- Resultados **finais** (`isFinal: true`) são acumulados em `finalTranscriptRef`
- Borda do campo fica laranja durante a gravação

**Passo 2 — Correção por IA (Gemini)**
- Ao parar de falar (`onend`), o texto final acumulado é enviado ao Gemini
- Modelo: `gemini-2.5-flash-lite` (mais rápido e barato)
- API key: `VITE_GEMINI_API_KEY` no `.env`
- Prompt: correção de erros de transcrição com contexto de vocabulário musical (turma, escola, ritmo, melodia, etc.)
- Temperature: `0.1` (mínima criatividade — só corrige, não reescreve)
- Enquanto processa: borda roxa + "Revisando transcrição..."
- Resultado corrigido substitui o texto no campo

**Fallback:** se Gemini indisponível ou sem API key, o texto da Web Speech é mantido sem correção — nunca trava o fluxo.

### Estados visuais do campo durante gravação
| Estado | Borda | Texto | Indicador |
|--------|-------|-------|-----------|
| Ouvindo (speech ativo) | Vermelha | Cinza (interim) | 🔴 Ouvindo... |
| Pausado (aguardando) | Laranja | Cinza (interim) | ⚪ Aguardando... |
| Revisando (Gemini) | Roxa | Normal | 🟣 Revisando transcrição... |
| Concluído | Normal | Normal | — |

### Como mudar no futuro

**Trocar Web Speech por outro motor em tempo real:**
- Substituir o bloco `const rec = new SR()` dentro de `toggleVoz`
- Manter a mesma interface: popular `finalTranscriptRef.current` com o texto final e chamar `setInterimText()` para o preview

**Trocar Gemini por outro modelo de correção:**
- Substituir a função `corrigirComGemini()` (~15 linhas)
- Entrada: string com o texto bruto
- Saída: Promise<string> com o texto corrigido
- Alterar o endpoint, modelo e estrutura do body conforme a API escolhida

**Trocar tudo por Whisper (quando virar app nativo):**
- Remover Web Speech API e Gemini completamente
- `audioRecorder.ts` já grava e converte para base64 — reutilizável
- Whisper local via react-native-whisper (Expo) substitui os dois passos em um
- Aceita `initialPrompt` com vocabulário → sem erros de "macumba"

### Custos Gemini (transcrição de voz)

**Uso individual (só o professor):**
- ~20 gravações/dia × 200 tokens = 4.000 tokens/dia
- Custo: < R$0,002/dia — irrelevante

**SaaS com usuários centralizados:**
| Usuários ativos | Custo/mês |
|----------------|-----------|
| 100 | ~R$5 |
| 1.000 | ~R$50 |
| 10.000 | ~R$500 |

**Decisão:** centralizar a chave Gemini no backend — custo absorvível no preço do plano SaaS. Não exigir chave do usuário (gera fricção no onboarding).

### Arquivos envolvidos
- `src/components/modals/ModalRegistroPosAula.tsx` — componente AccordionChip com toda a lógica
- `src/lib/audioRecorder.ts` — gravação de áudio via MediaRecorder (usado para notas de voz, não para transcrição)
- `.env` — `VITE_GEMINI_API_KEY` necessária para a correção funcionar
