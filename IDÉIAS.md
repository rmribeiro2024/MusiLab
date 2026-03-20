# MusiLab — Idéias de Melhorias

> Atualizado em: 2026-03-20
> Legenda: ✅ Feito · ⏸ Pausado · [ ] Pendente

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
