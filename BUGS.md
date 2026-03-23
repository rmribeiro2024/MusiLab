# MusiLab — Bugs Conhecidos

> Criado em: 2026-03-17
> Legenda: 🔴 Crítico · 🟡 Moderado · 🟢 Baixo · ✅ Resolvido

---

## 🎵 Detecção de Músicas (`src/lib/detectarMusicas.ts`)

### BUG-001 🟡 — Fase 2 detecta palavras entre aspas que não são músicas
**Status:** Aberto
**Reproduzir:** Escrever numa atividade algo como `"O Banho", "Ensaboar", "Enxaguar", "Escorrer"` — listas de etapas, instruções ou itens entre aspas simples/duplas são detectados como títulos de música.
**Causa raiz:** A regex da Fase 2 (`RE_CITACAO`) captura qualquer string entre aspas com 4–60 chars, sem distinguir se é um título de música ou um texto qualquer. Listas de passos, nomes de brincadeiras, receitas, etc. caem no filtro.
**Impacto:** Modal "Músicas detectadas" abre com falsos positivos — frustra o professor.
**Possíveis correções:**
- Aumentar o mínimo de caracteres (ex: 8 ou 10) — elimina palavras curtas tipo "Ensaboar"
- Exigir que a citação contenha pelo menos 2 palavras (ex: não detectar palavras isoladas)
- Adicionar lista de exclusão: palavras-chave que claramente não são músicas ("etapas", "passos", "materiais", "ingredientes"…)
- Usar Gemini na Fase 2 como filtro: "dessas citações, quais parecem títulos de música?"
- Verificar se a citação está precedida de contexto musical (ex: "música", "canção", "cantar", "tocar") dentro do mesmo parágrafo

---

### BUG-002 🟢 — YouTube detecta vídeos que não são músicas
**Status:** Aberto
**Reproduzir:** Inserir link de YouTube de vídeo não musical (notícia, tutorial, documentário) — o título do vídeo aparece no modal como "Nova música detectada".
**Causa raiz:** A Fase 0 trata todos os links YouTube com prefixo `▶` como potenciais músicas, igual ao Spotify. YouTube tem conteúdo de todo tipo.
**Impacto:** Professor vê "TRUMP NA JUSTIÇA" ou "Como dar banho no bebê" como sugestão de música.
**Possíveis correções:**
- YouTube: só sugerir como nova música se o título contiver palavras-chave musicais ("música", "canção", "song", nome de artista conhecido…)
- Ou manter como está mas deixar o professor ignorar facilmente (UX já tem o botão Ignorar)

---

### BUG-003 🟢 — Fase 2 detecta citações que já foram cobertas pela Fase 1, mas com texto ligeiramente diferente
**Status:** A investigar
**Exemplo:** Repertório tem "Parabéns pra você". Plano menciona `"Parabéns a Você"`. Fase 1 pode não pegar (normalização não encontra match), Fase 2 detecta como nova música.
**Possíveis correções:** Adicionar fuzzy matching leve na Fase 1 (distância de edição ≤ 2).

---

## 🤖 Detecção de Conceitos via Gemini

### BUG-004 🟢 — Gemini retorna nomes de categoria em vez de conceito específico
**Status:** Aberto
**Exemplo:** Retorna `"Ritmo e Organização Temporal"` em vez de `"Pulsação"` ou `"Andamento"`.
**Causa raiz:** O prompt não deixa claro que deve retornar o **sub-conceito**, não o nome da categoria.
**Correção sugerida:** Ajustar o prompt para exemplificar: `"Use o sub-conceito específico (ex: Pulsação, não Ritmo e Organização Temporal)"`.

---

## 📝 Notas gerais

- Os bugs de detecção de músicas têm impacto direto na experiência: o modal abrindo com falsos positivos toda vez que o professor salva gera ruído e perda de confiança na feature.
- Prioridade sugerida: BUG-001 > BUG-004 > BUG-002 > BUG-003

---

## ✅ Bugs Resolvidos — Sessão 2026-03-22

### Estratégias — Biblioteca (commit `fcfe26c`)

| # | Descrição | Arquivo(s) |
|---|-----------|------------|
| BUG-005 ✅ | Categorias hardcoded no `SlideInEstrategia` — não usava as do contexto | `CardAtividadeRoteiro.tsx` |
| BUG-006 ✅ | `estrategiasVinculadas` armazenava nome em vez de ID — renomear quebrava vínculos | `FormularioAulaPlena.tsx`, `TelaPrincipal.tsx`, `CardAtividadeRoteiro.tsx`, `PlanosContext.tsx` |
| BUG-007 ✅ | `adicionarEstrategiaRapida()` sem deduplicação — duplicatas silenciosas na biblioteca | `EstrategiasContext.tsx` |

### Módulo Aula por Turma / Visão da Semana (commit `5481ff3`)

| # | Descrição | Arquivo(s) |
|---|-----------|------------|
| BUG-008 ✅ | Modal "adicionar conceitos" disparava a cada save mesmo com conceitos já salvos | `TelaPrincipal.tsx` |
| BUG-009 ✅ | Card de plano salvo exibia conteúdo completo — simplificado para "✓ Aula planejada · ver / editar" | `ModuloPorTurmas.tsx` |
| BUG-010 ✅ | ✓ não aparecia na Visão da Semana após salvar aula — `dataPrevista` não era enviada ao contexto | `ModuloPorTurmas.tsx` |
| BUG-011 ✅ | Filtro "Escola" no banco de aulas não listava escolas das turmas agendadas | `ModuloPorTurmas.tsx` |

### PDF / Preview (commit `5481ff3`)

| # | Descrição | Arquivo(s) |
|---|-----------|------------|
| BUG-012 ✅ | Caracteres ilegíveis no PDF — entidades HTML (`&aacute;`, `&ccedil;`…) não decodificadas | `utils/pdf.ts` |
| BUG-013 ✅ | Google Drive / PDFs não exibiam ícone correto — `detectarTipoRecurso()` não reconhecia `drive.google.com` | `FormularioAulaPlena.tsx` |

### Formulário de Planejamento (commit `5481ff3`)

| # | Descrição | Arquivo(s) |
|---|-----------|------------|
| BUG-014 ✅ | Campos de avaliação só tinham textarea simples — substituídos por TipTapEditor com formatação rica | `FormularioAulaPlena.tsx` |

### Módulo Planejamento por Turma — fluxo salvar (commits anteriores)

| # | Descrição | Arquivo(s) | Commit |
|---|-----------|------------|--------|
| BUG-015 ✅ | Plano salvo via "Adaptar da aula anterior" ficava invisível — `ConteudoTurma` não consumia `planejamentosDaTurma` | `ModuloPorTurmas.tsx` | `3101fb9` |
| BUG-016 ✅ | Ao salvar plano não perguntava se deveria ir para o banco de aulas | `ModuloPorTurmas.tsx` | `17435f6` |

---

## 🟡 Abertos / Em fila

| # | Descrição | Módulo | Prioridade |
|---|-----------|--------|------------|
| BUG-017 | Seletor de escola no Histórico Pós-Aula não permite selecionar múltiplas escolas | `TelaPosAulaHistorico.tsx` | Alta |
