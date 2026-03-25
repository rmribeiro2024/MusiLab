# PATCH — Aplicar em Turmas: Opções de UX

## Contexto
O professor tem ~28 turmas/semana. Um mesmo plano pode servir para 10+ turmas.
Algumas turmas têm 2 aulas/semana com planos **diferentes** por dia.
Estrutura de grupos: GR1 = 1º ano, GR2 = 2º ano, GR3 = 3º ano, GR5 = 5º ano, Coral, etc.

---

## ✅ OPÇÃO ESCOLHIDA: Ideia B — Grade semanal

Modal exibe a semana inteira dividida por dia. Cada dia lista suas turmas com checkboxes e um botão "Agendar todas (N)".

**Fluxo:**
1. 📅 no card do plano → modal abre na semana atual
2. Cada dia mostra as turmas daquele dia
3. Botão "Agendar todas (N)" por dia para seleção rápida
4. Ou marcar/desmarcar turmas individualmente
5. Navegação ◀ ▶ para semanas anteriores/seguintes
6. Confirmar → cria aplicações

**Vantagens:** simples, visual familiar (semana = como o professor pensa o dia a dia)

**Limitação conhecida:** dias com anos misturados (ex: segunda com GR2 + GR3 + GR5) exigem desmarcar exceções manualmente. Aceitável.

**Preview:** `preview-aplicar-turmas.html` (aba "Ideia B") + `preview-aplicar-grupos.html`

---

## Opções alternativas (caso a B não funcione bem)

### Ideia A — Próxima data automática
Modal abre já na próxima data com turmas na grade, sem precisar escolher data.
Navegação ◀ ▶ entre dias com aulas. Botão "Selecionar todas do dia".
- Bom para: agenda esporádica, 1 turma por vez
- Ruim para: aplicar em muitas turmas de uma vez

### Ideia C — 1 clique (hover)
Botão "Aplicar esta semana" no card agenda direto em todas as turmas dos próximos 7 dias, sem modal.
Toast com "desfazer".
- Bom para: máxima velocidade, sem exceções
- Ruim para: quando precisa de controle sobre quais turmas recebem

### Ideia D — Por grupo de ano (chips)
Modal com chips clicáveis: GR1, GR2, GR3, GR5, Coral.
1 clique no chip seleciona todos os slots daquele ano.
Expand ▸ para ver/desmarcar slots individuais (útil quando turma tem 2 aulas/semana com planos diferentes).
Seletor de período: esta semana / próxima / próximas 2 semanas.
- Bom para: aplicar em lote por ano + semanas múltiplas
- Ruim para: complexidade percebida pelo usuário foi alta

**Preview interativo:** `preview-aplicar-grupos.html`

---

## Arquivo de implementação
- Modal: `src/components/modals/ModalAplicarEmTurmas.tsx`
- Contexto: `src/contexts/AplicacoesContext.tsx`
- Abertura: botão 📅 em `src/components/TelaPrincipal.tsx`
