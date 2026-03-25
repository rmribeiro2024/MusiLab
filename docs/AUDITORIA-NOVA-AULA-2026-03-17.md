# Auditoria Pedagógica — Módulo "Nova Aula" — MusiLab
> Data: 2026-03-17 | Baseado em: Tyler, Bloom, Hunter, Libâneo, Vasconcellos, Gandin, Swanwick, Elliott, Wiggins/McTighe

---

## 1. MAPA COMPLETO DO FORMULÁRIO ATUAL

### Campos fixos (fora dos accordions)
| Campo | Obrigatório | Problema |
|-------|-------------|---------|
| Título | Sim | Placeholder genérico sem orientação de granularidade |
| Duração | Não | Posição correta |
| Nível / Faixa Etária | Não | Confunde nível cognitivo com faixa etária — semântica errada |

### Accordion 1 — Roteiro de Atividades (aberto por padrão)
Sub-formulário por atividade: Nome, Duração, Descrição (TipTap), Conceitos (chips+IA), Tags, Músicas vinculadas, Estratégias vinculadas

### Accordion 2 — Materiais
Campo `materiais` — **REDUNDANTE** com `materiaisNecessarios` em Recursos da Aula

### Accordion 3 — Objetivos (oculto no Modo Rápido)
Objetivo Geral (rich text) + Objetivos Específicos (rich text)
**PROBLEMA CRÍTICO: está na 3ª posição, depois do roteiro de atividades**

### Accordion 4 — Classificação Pedagógica (oculto no Modo Rápido)
Status (A Fazer/Em Andamento/Concluído) + Conceitos Musicais (chips) + Tags + Unidades
**PROBLEMA: mistura operacional (Status) com pedagógico (Conceitos) com metadados (Tags)**

### Accordion 5 — BNCC (oculto no Modo Rápido)
Textarea livre para códigos BNCC
**PROBLEMA CRÍTICO: textarea livre para dado estruturado; burocracia misturada com planejamento**

### Accordion 6 — Recursos da Aula (visível em ambos os modos)
URLs digitais (YouTube/Spotify/PDF) + Materiais físicos necessários (`materiaisNecessarios`)
**PROBLEMA: mistura recursos digitais com logística física**

### Accordion 7 — Avaliação / Observações (oculto no Modo Rápido)
Textarea vazio sem estrutura
**PROBLEMA CRÍTICO: textarea vazio não instrumentaliza reflexão (Vasconcellos)**

### Seções fixas finais
- Músicas vinculadas ao plano (busca no repertório) — **POSIÇÃO ERRADA: deveria ser Bloco 1 em ed. musical**
- Adaptações por turma — funcionalidade excelente, posição inadequada

---

## 2. PROBLEMAS IDENTIFICADOS (por severidade)

### 🔴 Críticos
1. **Objetivos depois do roteiro** — contradiz Tyler, Bloom, Hunter, Libâneo, Gandin. O professor monta a aula sem intenção declarada.
2. **Músicas vinculadas no final** — para educação musical, repertório é o objeto de ensino, não suporte. Deveria ser o 2º campo após o título.
3. **Avaliação como textarea vazio** — não instrumentaliza reflexão. Contradiz Libâneo, Vasconcellos e Wiggins/McTighe.
4. **BNCC como textarea livre** — dado inutilizável, burocracia misturada com planejamento real.

### 🟡 Moderados
5. **Dois campos de materiais** (`materiais` e `materiaisNecessarios`) — redundância pura, confunde o professor.
6. **Ausência de fase da atividade** (Início/Desenvolvimento/Fechamento) — todas as atividades parecem equivalentes. Hunter e Swanwick exigem estrutura de aula.
7. **"Nível" confunde nível cognitivo com faixa etária** — campo mal definido semanticamente.
8. **Status dentro de "Classificação Pedagógica"** — operacional (workflow) misturado com pedagógico.

### 🟢 Menores
9. **Distinção conceito vs. tag pouco clara** na interface
10. **Painel "Contexto do plano"** excelente mas invisível para quem não sabe que existe
11. **Dois tipos de tags** (plano e atividade) sem distinção clara de propósito

---

## 3. PONTOS FORTES DO FORMULÁRIO ATUAL

1. **Contagem de tempo do roteiro** — responde ao erro documentado de "má gestão do tempo"
2. **Conceitos musicais com detecção IA** — alinhado com taxonomia de Swanwick
3. **Painel "Contexto do plano"** — materializa continuidade pedagógica de Vasconcellos
4. **Adaptações por turma** — flexibilidade real, funcionalidade única no mercado
5. **Modo Rápido** — responde à crítica de formulários longos (carga cognitiva, Sweller 1988)
6. **Banco de atividades/estratégias** — reutilização inteligente

---

## 4. O QUE A TEORIA PEDE QUE ESTÁ AUSENTE

| Elemento teórico | Autor | Status no MusiLab |
|---|---|---|
| Objetivo com verbo de ação (Bloom) | Bloom 1956 | Existe mas sem orientação — texto livre |
| Avaliação com critérios/evidências | Libâneo, Wiggins | Ausente como estrutura |
| Fases da aula (início/dev/fechamento) | Hunter, Libâneo | Ausente |
| Diagnóstico/ponto de partida | Gandin | Ausente no plano |
| Agrupamento da turma | Swanwick | Ausente |
| Connexão com conhecimento prévio | Hunter (anticipatory set) | Ausente |
| Backward design (resultado → evidência → atividade) | Wiggins/McTighe | Inversão: atividade vem antes |

---

## 5. PROPOSTA DE NOVA ESTRUTURA

### Princípios norteadores
1. **Modelo musical antes do modelo burocrático** — repertório é ponto de partida (Elliott)
2. **Intenção antes de operação** — objetivo antes de roteiro (Tyler/Bloom)
3. **Menos campos, mais qualidade** — formulário usado > formulário completo (Vasconcellos)
4. **Estrutura que instrumentaliza reflexão** — campos estruturados > textareas vazios
5. **Metadados separados do planejamento** — BNCC e tags são documentação, não planejamento

---

### NOVA ORDEM PROPOSTA

#### BLOCO 0 — Identidade (sempre visível)
- Título — com placeholder "Ex: Explorando pulsação — 2º ano"
- Duração total
- Turma/Contexto (renomear "Nível")

#### BLOCO 1 — Ponto de partida musical (accordion, 1º visível) ← NOVO
- Músicas da aula (sobe do final para o 1º bloco)
- "O que quero trabalhar com essa música" (1-2 linhas, substitui parte do objetivo geral)

**Justificativa:** Elliott (praxial) — para professores de música, o repertório precede o objetivo abstraído.

#### BLOCO 2 — Intenção pedagógica (accordion)
- Objetivo da aula (campo único, unifica geral + específico)
  - Placeholder com verbos Bloom: "O que o aluno vai conseguir fazer? Ex: Distinguir, Reproduzir, Criar..."
- Continuidade: "Este plano continua qual aula anterior?" (dropdown planos recentes)

**Justificativa:** Tyler/Bloom — objetivo antes de atividade. Unificar geral+específico reduz fricção sem perda pedagógica real.

#### BLOCO 3 — Roteiro (accordion, aberto por padrão)
- Mantém estrutura atual de cards + adição:
  - **NOVO campo por atividade: Fase** (Início / Desenvolvimento / Fechamento)
- Remove: input de conceitos manuais por atividade (IA cuida disso)

**Justificativa:** Hunter (7 passos), Libâneo, Swanwick — estrutura de aula em fases.

#### BLOCO 4 — O que preciso (accordion)
- "O que preciso levar" — unifica `materiais` e `materiaisNecessarios`
- Links e recursos digitais — mantém lógica atual

**Justificativa:** Elimina redundância. Libâneo cita "recursos didáticos" como elemento único.

#### BLOCO 5 — Como vou avaliar (accordion, oculto por padrão) ← REDESENHO
- "O aluno consegue...?" — lista simples de 3-5 critérios (não rich text)
- Estratégia de avaliação — selector: Observação / Escuta dirigida / Autoavaliação / Produto / Rubrica

**Justificativa:** Vasconcellos (2012) — avaliação como reflexão estruturada. Wiggins/McTighe — evidências antes das atividades.

#### BLOCO 6 — Documentação (accordion, nomeado explicitamente assim)
- Conceitos musicais (chips da taxonomia)
- Unidades/Sequências
- Status (A Fazer/Em Andamento/Concluído)
- BNCC (redesenhar para chips pré-definidos, não textarea)
- Tags livres

**Justificativa:** Separar documentação de planejamento elimina poluição burocrática (Libâneo).

#### BLOCO 7 — Adaptações por turma
Mantém exatamente como está. Funcionalidade sólida.

---

### MODO RÁPIDO (campos visíveis)
Título · Duração · Turma · Músicas da aula · Objetivo (campo único) · Roteiro com fase · O que preciso levar

**Objetivo:** o professor sai em 5 minutos com tudo para ir à sala de aula.

### MODO COMPLETO (adiciona ao Modo Rápido)
Como vou avaliar (estruturado) · Conceitos musicais · Unidades/Sequências · BNCC (chips) · Tags · Adaptações por turma · Continuidade com aula anterior

---

## 6. O QUE REMOVER COMPLETAMENTE

| Campo | Motivo |
|-------|--------|
| `materiais` (accordion próprio) | Substituído pela unificação no Bloco 4 |
| `escola` no tipo Plano | Sem UI, sem utilidade no plano individual |
| `metodologia` no tipo Plano | Campo fantasma, nunca implementado |
| Objetivo geral + objetivos específicos como dois campos | Unificar em um |
| Avaliação/Observações (textarea vazio atual) | Substituído pelo Bloco 5 estruturado |
| Input de conceitos manuais por atividade | IA + chips globais são suficientes |

---

## 7. A TENSÃO TEÓRICA CENTRAL

Há conflito real entre:
- **Tyler/Bloom/Hunter:** objetivos primeiro, atividades derivadas
- **Elliott (praxial):** ações musicais primeiro, objetivos emergem do fazer

O MusiLab atualmente segue Elliott **implicitamente** (roteiro primeiro) mas tenta parecer Tyler (campo "objetivo geral *"). Isso cria incoerência.

**Recomendação:** tornar o modelo musical (Elliott) o padrão — ponto de partida é o repertório. O modelo formal (Tyler) disponível via Modo Completo. Isso é coerente com o público-alvo (professores de música) e com o diferencial do app.

---

## 8. REFERÊNCIAS

- Libâneo, J.C. (1994). *Didática*. São Paulo: Cortez.
- Vasconcellos, C.S. (1995, 2000, 2012). *Planejamento: projeto político pedagógico e plano de ensino*. São Paulo: Libertad.
- Gandin, D. (2002). *Planejamento como prática educativa*. São Paulo: Loyola.
- Tyler, R.W. (1949). *Basic Principles of Curriculum and Instruction*. Chicago: University of Chicago Press.
- Bloom, B.S. (1956). *Taxonomy of Educational Objectives*. New York: Longmans.
- Hunter, M. (1982). *Mastery Teaching*. TIP Publications.
- Wiggins, G. & McTighe, J. (1998). *Understanding by Design*. ASCD.
- Swanwick, K. (1979). *A Basis for Music Education*. NFER.
- Swanwick, K. (1999). *Teaching Music Musically*. Routledge.
- Elliott, D.J. (1995). *Music Matters: A New Philosophy of Music Education*. Oxford University Press.
- Sweller, J. (1988). Cognitive load during problem solving. *Cognitive Science*, 12(2), 257–285.
