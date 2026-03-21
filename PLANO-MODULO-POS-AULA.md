# Plano de Implementação — Módulo "Pós-aula"
**Criado em:** 2026-03-20
**Status geral:** 🔄 Em andamento

---

## Contexto

O registro pós-aula hoje vive dentro do módulo "Hoje" (Agenda), sem destino próprio.
Decisão: criar módulo dedicado "Pós-aula" com responsabilidade única — registrar o que aconteceu na aula.

**"Hoje"** → agenda pura (turmas + horários + materiais do dia)
**"Pós-aula"** → ação pós-aula (registrar por turma, ver histórico recente)

---

## Etapa 1 — Limpar o "Hoje"

- [x] 1.1 Remover bloco `renderRegistrosDia` da `TelaResumoDia` (`TelaCalendario.tsx`) — elimina lista "Sem resumo registrado"
- [x] 1.2 Remover botão "+ Registro Rápido" do header do "Hoje"
- [x] 1.3 Verificar estados/props órfãos e limpar
- [x] 1.4 Build + teste visual

---

## Etapa 2 — Criar componente `TelaPosAula.tsx`

- [x] 2.1 Criar `src/components/TelaPosAula.tsx`
- [x] 2.2 Seletor de data (padrão: hoje) com navegação para outras datas
- [x] 2.3 Listar turmas do dia com: horário, turma, escola, status ✅ Registrada / 🟡 Pendente
- [x] 2.4 Botão "Registrar" por turma → aciona `ModalRegistroRapido` com turma e data pré-selecionadas
- [x] 2.5 Histórico de registros recentes (últimos 14 dias) em lista compacta abaixo das turmas
- [x] 2.6 Estado vazio: mensagem neutra

---

## Etapa 3 — Conectar ao roteamento do app

- [x] 3.1 Adicionar `viewMode = 'posAula'` ao mapa de rotas em `BancoPlanos.tsx`
- [x] 3.2 Adicionar lazy import do `TelaPosAula` em `BancoPlanos.tsx`
- [x] 3.3 Adicionar renderização condicional `{viewMode === 'posAula' && <TelaPosAula />}`
- [x] 3.4 Mapear `posAula` no objeto de grupos de navegação

---

## Etapa 4 — Sidebar e bottom nav

- [x] 4.1 Adicionar "Pós-aula" ao sidebar (primeiro item, antes de Agenda)
- [x] 4.2 Ícone: 📝 — label: "Pós-aula" — mode: `posAula`
- [ ] 4.3 Verificar bottom nav mobile — 1 toque para acessar
- [ ] 4.4 Badge numérico de turmas pendentes (opcional — avaliar na hora)

---

## Etapa 5 — Tela inicial do app

- [ ] 5.1 Decidir: manter `resumoDia` como inicial ou mudar para `posAula`
- [ ] 5.2 Avaliar abertura por horário (manhã = Hoje / tarde = Pós-aula) — complexidade extra, decidir se vale

---

## Etapa 6 — Refatorar `ModalRegistroPosAula` *(etapa futura — não bloqueia lançamento)*

- [ ] 6.1 Avaliar se janela flutuante redimensionável ainda faz sentido
- [ ] 6.2 Migrar fluxo para: Rápido (bottom sheet) → expandir para completo dentro do mesmo sheet
- [ ] 6.3 Remover resize/drag do modal completo

---

## Etapa 7 — Build, testes e deploy

- [ ] 7.1 `npx tsc --noEmit` — zero erros
- [ ] 7.2 `npm run build` — deve passar
- [ ] 7.3 Teste manual mobile: registrar turma via "Pós-aula", verificar status atualiza
- [ ] 7.4 Commit + push → deploy automático

---

## Ordem de execução

**Prioritário:** Etapas 1 → 2 → 3 → 4 → 7
**Posterior:** Etapa 5 (decisão de tela inicial)
**Futuro:** Etapa 6 (refatoração modal completo)

---

## Histórico de alterações

| Data | Etapa | O que foi feito |
|------|-------|-----------------|
| 2026-03-20 | — | Plano criado |
| 2026-03-20 | Etapa 1 | Limpeza do "Hoje" concluída — commit `446f11d` |
| 2026-03-20 | Etapas 2+3+4 | TelaPosAula criada + roteamento + sidebar — commit `723f9f7` |
