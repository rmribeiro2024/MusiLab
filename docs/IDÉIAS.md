# MusiLab — Idéias de Melhorias

> Atualizado em: 2026-03-22
> Legenda: ✅ Feito · ⏸ Pausado · [ ] Pendente

---

## 🃏 Card Hero — Alternativas de abertura *(ideia 2026-03-23)*

> Hoje o Card Hero abre um modal centralizado com scale + backdrop blur. Explorar alternativas mais expressivas baseadas em tendências atuais de apps modernos.

### Opção atual (implementada)
**Modal centralizado** — card do centro da tela cresce com `scale(0.95→1)` + backdrop blur. Simples, funciona, mas desconectado da posição original do card.

---

### Alternativa 1 — Shared Element / Card Expand in Place
**Referência:** iOS App Store, Google Play, Apple Music
O próprio card se expande a partir da sua posição exata na grade — cresce organicamente até preencher (ou ocupar grande parte de) a tela. A continuidade visual entre "card pequeno" e "card expandido" é total: o usuário nunca perde o contexto de onde clicou.
**Efeito técnico:** `getBoundingClientRect()` do card → animar `position/width/height` de origem até destino com `clip-path` ou `transform: scale + translate`.
**Impressão:** premium, fluido, sensação de "abrir" algo real.

---

### Alternativa 2 — Bottom Sheet deslizante
**Referência:** Google Maps, Spotify, Apple Maps, Uber
Ao clicar no card, um painel sobe de baixo com `translateY(100%→0)` com mola (spring easing). O grid da semana fica visível e levemente dimmed acima. Professor pode arrastar para fechar (swipe down).
**Efeito técnico:** `transform: translateY` + `overscroll-behavior` + drag gesture.
**Impressão:** muito natural no celular — gesto de fechar é intuitivo. Ideal para mobile-first.

---

### Alternativa 3 — Side Panel (drawer lateral)
**Referência:** Linear, Jira, GitHub Issues, Notion
O detail panel desliza da direita (`translateX(100%→0%)`), empurrando levemente o grid para a esquerda (ou sobrepondo com shadow). O grid continua visível — professor pode ver outros cards e clicar neles sem fechar o painel.
**Efeito técnico:** `translateX` + resize do grid para `calc(100% - 380px)`.
**Impressão:** produtividade, contexto sempre visível, ideal para navegar entre cards rapidamente (↑↓ dentro do painel).

---

### Alternativa 4 — Popover ancorado ao card
**Referência:** Figma (menus contextuais), Linear (issue preview), Notion (link preview)
Um popover "borbulha" a partir da posição exata do card — aparece colado acima/abaixo/lateral ao card clicado, com uma pequena seta apontando para ele. O restante da tela fica dimmed mas visível.
**Efeito técnico:** `position: absolute` calculado via `getBoundingClientRect()` + `transform-origin` no card de origem.
**Impressão:** leve, contextual, sem "abandonar" a tela. Ótimo para previews rápidos.

---

### Alternativa 5 — Flip 3D do card
**Referência:** apps de flashcard (Anki), dashboards modernos, alguns apps de finanças
O card vira como uma carta — face frontal mostra o resumo (como hoje), face traseira mostra o detalhe (plano + registro). `rotateY(0→180deg)`.
**Efeito técnico:** `transform-style: preserve-3d` + `backface-visibility: hidden` + `perspective`.
**Impressão:** expressivo, memorável — mas pode parecer excessivo dependendo do contexto. Funciona melhor em cards isolados do que em grids densos.

---

### Alternativa 6 — Spotlight Zoom
**Referência:** iOS Spotlight, macOS Quick Look (Espaço)
O background escurece e o card levemente "sobe" (zoom 1.0→1.06 + sombra forte), enquanto um painel de detalhe aparece imediatamente abaixo dele, empurrando os outros cards para baixo. Sem modal separado — tudo in-line.
**Efeito técnico:** `z-index` elevado no card clicado + `box-shadow` intenso + painel inline com `max-height: 0→auto`.
**Impressão:** contextual, sem ruptura de layout. Professor vê o card e o detalhe na mesma região da tela.

---

**Para implementar:** criar preview HTML interativo com as 6 opções (como foi feito para Card Hero e para Importar Registro) antes de decidir.

---

## 🤖 Resumo por IA no Histórico *(ideia 2026-03-22)*

- [ ] **Resumo com IA por campo + período** — no módulo Histórico, o professor seleciona um campo (ex: "O que aprenderam") e um período (ex: "Este mês"). A IA (Gemini) lê todos os registros daquele campo no período e gera um resumo narrativo do que aconteceu: padrões, evolução, pontos recorrentes. Ex: "Nas últimas 4 semanas, as turmas do Fundamental II demonstraram avanço na leitura rítmica. Houve menção frequente de dificuldades com células sincopadas em 3 turmas distintas." Seria um botão "Resumir com IA" ao lado do seletor de trecho — gera um painel expansível com o resumo gerado.

---

## 📸 Álbum da Turma *(ideia 2026-03-20)*

- [ ] **Álbum da Turma** — cada registro pós-aula permite adicionar fotos/vídeos/áudios como evidência da aula. Esses arquivos formam uma **linha do tempo visual por turma**: você vê todas as aulas com mídia registrada em ordem cronológica, pode navegar por data, e relembrar momentos como danças, performances, produções das crianças. Seria uma galeria viva da evolução pedagógica de cada turma — diferencial único no mercado de apps para professores de música.

---

## 🚀 UX Rápida / Fluxo do Professor

- [x] **Registro Rápido redesenhado** — só a turma clicada + resultado + rubrica + encaminhamentos + nota de voz, sem selects desnecessários
- [x] **Mover aula para próxima semana** — botão 📅 no bloco do calendário com undo por toast (Ctrl+Z)
- [x] **Painel lateral (PainelPlano)** — mostra data, status e ações mesmo sem objetivos/atividades preenchidos
- [ ] **Copiar registro para outras turmas** — dentro do Registro Rápido, selecionar turmas do mesmo dia e replicar resultado/rubrica/encaminhamentos
- [ ] **Nota rápida do dia** — campo sticky note no painel lateral (como LessonPlan) persistido por data no localStorage
- [ ] **Onboarding para novos usuários** — tour guiado de 4 passos: criar ano letivo → grade semanal → primeiro plano → registro

### 🗑️ Campos removidos do pós-aula — reavaliar se sentir falta

| Campo | Pergunta original | Removido em | Motivo |
|-------|-------------------|-------------|--------|
| `vozAluno` | 💬 "O que os alunos disseram sobre a aula?" | 2026-03-20 | Exige recall + escrita criativa — fill rate provavelmente baixo na prática |

---

## 🗓️ Visão da Semana — Mini Dashboard de Preparo *(ideia 2026-03-21)*

- [ ] **Painel de contexto rápido no topo da Visão da Semana** — antes do grid de dias, um bloco compacto mostra o resumo da semana em 2–3 números: quantas aulas novas preciso preparar (e quais séries: 1º, 2º, 3º anos…) + quantas aulas para retomar ou revisar. O professor bate o olho e já sabe: "preciso preparar 4 aulas novas (1º e 3º ano) e revisar 2".

  **Por que é útil:** a Visão da Semana hoje exibe um grid denso com muita informação. O professor precisa varrer coluna por coluna para entender sua carga de preparo. O mini dashboard condensa isso em dados acionáveis: "o que preciso fazer hoje/esta semana antes das aulas".

  **Dados já disponíveis para calcular:**
  - `obterTurmasDoDia()` por cada dia da semana → lista de aulas
  - `aplicacoesPorData` → sabe se tem plano aplicado (logo: aula planejada)
  - `sugerirPlanoParaTurma()` → retorna `undefined` se não há plano sugerido (→ "nova aula") ou plano com `status === 'retomar'`/`'revisar'` (→ "revisar")
  - A sugestão que já aparece nas células ("✓ avançar · nova aula" / "↺ retomar ou revisar") pode ser agregada

  **Layout sugerido:** chips horizontais compactos no topo do módulo, por exemplo:
  ```
  ┌──────────────────────────────────────────────┐
  │  📋 Esta semana   4 novas · 3 revisões · 1 sem plano  │
  │  Novas: 1º ano (seg, qua) · 3º ano (ter, sex)         │
  └──────────────────────────────────────────────┘
  ```
  Ou versão mais discreta: dois números com ícones, clicáveis para filtrar o grid abaixo.

  **Variante útil:** ao clicar em "4 novas", destacar/filtrar só as células que precisam de plano novo — foco instantâneo.

## 🗓️ Visão da Semana — Filtro por Escola / Turma *(ideia 2026-03-21)*

- [ ] **Filtros no topo da Visão da Semana** — barra de filtros acima do grid para isolar por escola, turma ou período. Caso de uso principal: professor quer preparar primeiro as aulas do Colégio Andrews — hoje precisa caçar visualmente onde estão no grid denso. Com o filtro ativo, só as células daquela escola aparecem (ou ficam destacadas), o restante fica dimmed.

  **Filtros úteis:**
  - Por escola — mais comum (professor com 2–3 escolas)
  - Por turma — isolar um segmento específico (ex: "só 1º ano")
  - Por status de preparo — mostrar só "sem plano" ou só "revisar"

  **Implementação sugerida:** chips clicáveis no topo (ex: `EMPAC · ANDREWS · Anísio Teixeira`), extraídos automaticamente das escolas presentes na semana. Ao clicar, os dias/aulas que não pertencem àquela escola ficam com opacidade reduzida. Sem filtro = comportamento atual.

  **Alternativa mais simples:** um `select` dropdown "Filtrar por escola" — menos bonito, mas zero esforço de layout.

---

## 📅 Calendário e Agenda

- [x] **Progress bar anual** — % do ano letivo concluído no módulo Hoje
- [x] **Vista Kanban de planos** — 4 colunas por status (rascunho → planejado → em andamento → concluído)
- [x] **Sequential unit planning** — modal em Sequências para criar múltiplos planos encadeados
- [ ] **PDF do dia** — imprimir em 1 página todas as turmas do dia com horário + plano vinculado + campo de notas
- [ ] **Filtro por semana no calendário** — ver somente a semana atual (hoje já tem; expandir para semanas futuras/passadas)
- [ ] **Indicador visual de encaminhamentos pendentes** — badge no bloco da turma se há encaminhamentos não concluídos da aula anterior

---

## 👥 Alunos e Turmas

- [x] **AlunoDestaque expandido** — instrumento + histórico de anotações + marcos pedagógicos
- [x] **Chamada rápida no pós-aula** — lista de presença por turma
- [x] **Tipos de anotação configuráveis por turma** — professor define categorias personalizadas
- [x] **Rubrica configurável por turma** — critérios e escala de avaliação por turma
- [ ] **Relatório de aluno** — PDF individual com histórico de anotações, marcos e presença do ano
- [ ] **Exportar chamada** — exportar frequência do período selecionado em CSV ou PDF

---

## 📊 Análise e Visibilidade

- [x] **Mapa de cobertura pedagógica** — visualização de quais estratégias/habilidades foram trabalhadas
- [x] **Busca Global Ctrl+K** — pesquisa em planos, atividades, estratégias, músicas e sequências
- [x] **Métricas de uso de atividades** — contadorUso, ultimoUso, planosVinculados
- [x] **Uso de músicas no repertório** — "Última: X · N usos" no card + filtros recolhíveis
- [ ] **Gráfico de equilíbrio pedagógico da aula + Abordagens configuráveis** ⭐⭐
  - Ao salvar um plano, a IA já detecta os conceitos de cada atividade (Ritmo, Criação, Apreciação, Performance, Harmonia…).
  - Agregar esses conceitos por categoria e mostrar um mini gráfico de barras ou radar no próprio modal de revisão de conceitos — o professor vê de relance: "esta aula tem 60% Ritmo, 0% Criação".
  - Com o tempo, os dados acumulam: por turma, por mês, por semestre, o professor consegue ver padrões reais ("nunca faço Apreciação com o 7º ano") e ajustar seu planejamento de forma consciente.
  - Isso transforma os conceitos detectados — que hoje são metadata — em **dado pedagógico acionável**, sem precisar de nenhum preenchimento manual a mais.
  - **Dados base já existem**: `atividade.conceitos[]` + `categoriaDoConceito()` — basta agregar e renderizar.
  - Possíveis visualizações: radar (spider chart) no modal, barras horizontais no card do plano (tooltip), ou painel "Meu equilíbrio pedagógico" na aba de análise.

  ### Extensão: Abordagens Pedagógicas Configuráveis
  O professor escolhe sua abordagem nas configurações → a IA analisa e classifica os conceitos usando as **categorias daquela abordagem específica**. O gráfico de equilíbrio passa a usar os eixos certos para aquele referencial.

  **Keith Swanwick — modelo C(L)A(S)P:**
  > O mais importante é o equilíbrio entre os 5 pilares. Swanwick argumenta que a maioria dos professores faz muito pouco Composição e Apreciação e concentra tudo em Skill/Técnica.
  - 🎼 **Composição** — criar, improvisar, arranjar
  - 👂 **Audição/Apreciação** — escuta ativa, análise, repertório
  - ⚙️ **Habilidade Técnica** (Skill) — técnica instrumental/vocal, leitura
  - 🎤 **Performance/Execução** — tocar, cantar, apresentar
  - 📖 **Literatura Musical** (contexto) — história, cultura, contextualização

  **Carl Orff — Orff Schulwerk:**
  > A música elementar: ritmo, voz, movimento e improvisação são inseparáveis. Começa no corpo, não no instrumento.
  - 🥁 **Ritmo Elementar** — pulsação, ostinato, poliritmia, formas elementares
  - 🗣️ **Voz e Fala** — ritmo da fala, canto, recitação, bordão vocal
  - 🕺 **Movimento** — percussão corporal, dança, Eukinética (espaço/peso/fluência)
  - 🎵 **Melodia Elementar** — pentatônica, bordão, canção simples
  - 🎨 **Improvisação e Criação** — inventar, variar, combinar elementos
  - 🎶 **Conjunto / Ensemble** — tocar junto, escuta do grupo, instrumentos Orff

  **Émile Dalcroze — Euritimia:**
  - Ritmo vivenciado no corpo, solfejo melódico, improvisação ao piano/movimento

  **Zoltán Kodály:**
  - Voz como instrumento primário, sol-fá (solfejo relativo), música folclórica, leitura/escrita musical

  **BNCC (Brasil):**
  - Criação, Contextualização, Escuta e Fruição, Performance

  ### Implementação sugerida:
  - Configurações → "Minha abordagem pedagógica" → select ou radio buttons
  - A abordagem escolhida define quais **eixos aparecem no gráfico** e **como o Gemini classifica** os conceitos detectados (o prompt muda conforme a abordagem)
  - Professor pode criar abordagem personalizada (ex: mix Swanwick + Orff)
  - No relatório semestral: "Você aplicou Swanwick C(L)A(S)P — veja seu equilíbrio nos últimos 3 meses"
- [ ] **Dashboard unificado** — métricas visuais do mês: aulas realizadas, alunos atendidos, repertório mais usado
- [ ] **Relatório semestral por turma** — resumo automático: planos realizados, estratégias mais usadas, músicas trabalhadas

---

## 🤖 IA / Gemini

- [x] **Resumo para pais via Gemini** — gera texto em linguagem acessível a partir do registro pós-aula
- [ ] **Sugestão de próxima aula** — Gemini analisa histórico de registros e sugere próximo plano ou estratégia
- [ ] **Análise de engajamento por turma** — Gemini interpreta rubricas e encaminhamentos e gera diagnóstico

---

## 🔗 Compartilhamento e Exportação

- [x] **PDF do plano individual** — exportar plano de aula em PDF formatado
- [ ] **PDF do dia** — todas as turmas do dia em uma página (formato agenda)
- [ ] **Link público do plano** — URL compartilhável de um plano sem necessidade de login (via Supabase RLS)
- [ ] **Exportação de atividades em PDF** — banco de atividades exportável para uso offline

---

## ⚙️ Técnico / Performance

- [x] **Sync Supabase com retry e delta** — syncDelta() faz upsert só dos dados alterados
- [x] **IndexedDB como storage principal** — limite 50+ MB (vs. 5 MB do localStorage)
- [x] **Code splitting por módulo** — React.lazy + Suspense, bundle inicial −53%
- [x] **PWA + touch drag** — instalável + arrastar blocos no mobile
- [ ] **Cache IndexedDB-first** — carregar dados do IndexedDB antes de buscar no Supabase (reduz egress ~90%)
- [ ] **Virtualização de listas** — react-window para professores com 150+ planos ou músicas
- [ ] **Context splitting do PlanosContext** — separar em PlanosCRUD + PlanosFilters + PlanosUI para reduzir re-renders
- [ ] **IDs string|number → string** — migração automática com cobertura de testes (S6, alto risco)

---

## ☁️ Migração de Storage: Google Drive → Cloudflare R2 *(futuro, quando escalar)*

> **Contexto:** hoje as evidências de aula (fotos/vídeos) são salvas no Google Drive de cada professor via OAuth. Funciona bem para uso individual, mas tem limitações para um produto multi-usuário.

### Por que migrar para R2 no futuro?

| Fator | Google Drive (atual) | Cloudflare R2 (futuro) |
|-------|---------------------|----------------------|
| Custo egress | Zero (Drive do prof.) | Zero egress entre R2 e Workers |
| Espaço | 15 GB por professor | Ilimitado (pago por uso) |
| Controle | App não controla os arquivos | App controla tudo |
| Thumbnails | Google gera (nem sempre disponível) | App gera via Workers |
| Multi-prof. | Cada um autentica separado | Transparente, uma conta |
| Backup | Dependente do prof. não deletar | Gerenciado centralmente |
| OAuth obrigatório | Sim (popup/redirect a cada sessão) | Não |

### Quando migrar?

Migrar quando houver **professores pagantes** ou necessidade de:
- Compartilhar evidências entre professores da mesma escola
- Álbum da Turma centralizado (não depende do Drive de um professor)
- Controle de retenção/backup dos arquivos do app

### Plano de migração (4 etapas)

**Etapa 1 — Infraestrutura R2**
- Criar bucket `musilab-evidencias` no Cloudflare R2
- Criar Cloudflare Worker como proxy de upload (evita expor credenciais no client)
- Worker recebe o arquivo + JWT do usuário → valida → faz upload para R2 → retorna URL pública

**Etapa 2 — Backend (Supabase Functions ou Worker)**
- Endpoint `POST /upload-evidencia` — recebe multipart, retorna `{ url, thumbnailUrl }`
- Thumbnail gerado server-side (Sharp ou Cloudflare Image Resizing)
- Metadados salvos no Supabase: `evidencias` table com `turmaId`, `planoId`, `data`, `url`, `thumbnailUrl`

**Etapa 3 — Frontend**
- Substituir `src/lib/googleDrive.ts` por `src/lib/storage.ts`
- Remover OAuth Google Drive (manter apenas OAuth Google Sign In do Supabase)
- Upload direto para o Worker: `fetch('/api/upload-evidencia', { method: 'POST', body: formData })`

**Etapa 4 — Migração de dados existentes**
- Script one-shot: para cada registro com `urlEvidencia` (Drive), baixar e re-upload para R2
- Manter retrocompatibilidade: se URL começa com `drive.google.com`, renderiza como link externo

### Custo estimado R2
- **Armazenamento:** $0.015/GB/mês — 100 professores × 5 GB = ~$7.50/mês
- **Operações:** 10M requisições grátis/mês — suficiente para uso educacional
- **Egress:** $0 (Cloudflare não cobra saída para internet)

---

## 🔐 Google Drive — Conexão Permanente via Supabase Edge Functions *(futuro)*

> **Contexto:** hoje o token Google Drive dura 1h. No PC renova silenciosamente, no celular pede reconexão. Com backend, professor conecta uma única vez para sempre.

### Como funciona
1. Frontend usa `response_type=code` + PKCE (em vez do token implícito atual)
2. Google redireciona com `code` temporário
3. Frontend envia `code` para Supabase Edge Function `exchange-drive-code`
4. Edge Function troca o code por `access_token` + `refresh_token` (usando client_secret)
5. `refresh_token` salvo na tabela `drive_tokens` (por usuário, criptografado)
6. Quando `access_token` expira → Edge Function `refresh-drive-token` usa o refresh_token salvo → retorna novo access_token → transparente para o professor

### O que precisa implementar
- [ ] Tabela Supabase: `drive_tokens (user_id, refresh_token, updated_at)`
- [ ] Edge Function: `exchange-drive-code` — recebe code+code_verifier, troca com Google, salva refresh_token
- [ ] Edge Function: `refresh-drive-token` — usa refresh_token salvo, retorna novo access_token
- [ ] Frontend: mudar `googleDrive.ts` de implicit flow para PKCE + chamadas às Edge Functions

### Custo
- Supabase Edge Functions: gratuito até 500k invocações/mês
- Sem servidor separado — usa infraestrutura já existente

### Resultado
Professor conecta **uma única vez**. Nunca mais vê o botão "Conectar Google Drive".

---

## 🌐 Integrações Externas

- [ ] **Google Classroom** — enviar plano de aula direto para uma turma do Classroom (OAuth + API)
- [ ] **Push notifications** — lembrete de encaminhamentos pendentes antes da próxima aula (Service Worker)
- [ ] **Calendário do sistema** — exportar agenda de aulas em formato .ics (Google Agenda, Apple Calendar)

---

## 💡 Ideias Brutas (avaliar viabilidade)

- [ ] **Ordem personalizável dos accordions no Nova Aula** — professor pode reordenar as seções (Músicas, Roteiro, Objetivos, Avaliação, Recursos, BNCC) via ↑ ↓ ou drag-and-drop; ordem salva no localStorage. Útil para experimentar qual sequência de preenchimento funciona melhor pedagogicamente para cada professor. Implementar só após usar a ordem padrão por algumas semanas e identificar o que realmente incomoda.

- [ ] **Modo apresentação** — exibir o plano da aula em tela cheia para projetor durante a aula
- [ ] **Sequência de aulas em arrastar** — reordenar planos dentro de uma sequência via drag-and-drop
- [ ] **Template de plano por turma** — cada turma pode ter seu template padrão de atividades
- [ ] **Histórico de versões do plano** — ver o que foi alterado entre edições *(removido em S4; reavaliar)*
- [ ] **Comentários colaborativos no plano** — para coordenadores/supervisores deixarem feedback
