# Ideias Futuras — MusiLab

## Renomeações de módulos (UX/nomenclatura)
- Módulo **"Biblioteca"** → renomear para **"Meu Repertório"**
- Item na sidebar **"Repertório"** → renomear para **"Músicas"**

---

## Módulo Hoje — Insights automáticos por turma
- Mostrar na tela "Hoje" lembretes/insights importantes sobre cada turma
- Exemplo: "Prestar atenção no aluno X" · "GR2B pedindo retomada 3 aulas seguidas"
- Baseado no histórico pós-aula: alunoAtencao · statusAula · aproveitamentoAula
- Mesma engine de insights do Histórico (regras locais, sem API)

---

## Editor de Notação Musical inline — madura, implementar depois
**Data da discussão:** 2026-03-25

### Ideia
Adicionar um editor de notação musical diretamente dentro de cada atividade do roteiro (`CardAtividadeRoteiro`), permitindo ao professor escrever fragmentos rítmicos ou melódicos durante o planejamento da aula.

### Onde fica no app
Dentro do card expandido de cada `AtividadeRoteiro`, abaixo da descrição rica (TipTap), antes dos chips de músicas/estratégias/conceitos. Exibição:
- Bloco visual da notação (SVG renderizado)
- Botão `[ + Notação ]` para adicionar/editar
- Clique no bloco abre editor inline ou modal

### Estrutura de dados sugerida
Novo campo em `AtividadeRoteiro` (já definido em `src/types/index.ts`):
```typescript
notacao?: {
  svg: string   // SVG renderizado para exibição
  json: string  // Estrutura interna para edição posterior
}
```

### Motivação
O professor escreve o trecho musical **no contexto da atividade** onde vai usá-lo — mais natural do que um módulo separado de partituras. Cada atividade pode ter seu próprio fragmento de notação (célula rítmica, melodia curta, etc.).

### Alternativas descartadas
- Nível do plano inteiro: menos contextual
- Módulo separado "Partituras": mais isolado, menos prático no fluxo de planejamento

### Próximos passos (quando implementar)
1. Escolher/avaliar biblioteca de notação (VexFlow, OSMD, abc.js, ou similar)
2. Criar componente `EditorNotacaoInline`
3. Adicionar campo `notacao?` ao tipo `AtividadeRoteiro`
4. Integrar no `CardAtividadeRoteiro` (seção expandida)
5. Persistência via campo JSON no plano

---

## Features pedagógicas (Nova Aula) — adiadas de 2026-03-17
1. "Sugerir objetivo" via Gemini — passa atividades, gera objetivo automaticamente
2. Alerta de tempo — roteiro > duração da aula, IA sugere cortes
3. Modo leitura — desativa inputs para apresentar no projetor
4. Preview PDF antes de baixar
5. Timestamp nas notas de adaptação
6. Vinculação automática de música ao importar atividade do banco
