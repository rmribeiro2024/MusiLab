# MusiLab — Contexto do Projeto

## Caminho local (Windows)
```
C:\Users\rodri\Documents\MusiLab
```
Para sincronizar mudanças para a máquina local:
```bash
git pull origin main
```

## Branch de desenvolvimento
Trabalhar direto no `main`. Dev solo, sem branches de feature.

## Repositório
`rmribeiro2024/musilab`

---

## Regras fundamentais

NUNCA faça mudanças além do que foi explicitamente solicitado. Se o usuário pedir uma funcionalidade, toque apenas nos arquivos relacionados a ela. Pergunte antes de expandir o escopo.

Antes de fazer qualquer edição, confirme em voz alta qual arquivo será modificado e o que mudará. Aguarde aprovação implícita (o usuário continuar a conversa) antes de prosseguir em casos de dúvida.

---

## Visão geral do projeto

Este é um projeto TypeScript (MusiLab — PWA de educação musical para professores). Padrões principais:
- Backend: **Supabase**
- Estilo: **Tailwind CSS** + design system v2 (tokens em `docs/layout.md`)
- Suporte a **modo escuro** obrigatório em todo componente novo
- **Mobile-first PWA** — testar mental mente em telas pequenas antes de implementar
- Componentes com nomes parecidos existem — verificar o arquivo correto antes de editar (ex.: `ModuloPlanejamentoTurma` ≠ `ModuloPorTurmas`)

---

## UI e Design

- Para tarefas de UI/estilo: começar **minimalista e conservador**
- NÃO adicionar elementos extras (badges, pontos, labels, subtítulos, ícones decorativos) a menos que seja explicitamente solicitado
- Na dúvida sobre adicionar algo visual, **não adicione**
- Sem emojis no código — nunca (a menos que o usuário peça)
- Dark mode: usar hex explícito (`#E5E7EB`, `#9CA3AF`, `#4B5563`, `#374151`) — não Tailwind `dark:` variants
- **Sempre ler `docs/layout.md`** antes de qualquer UI nova — não inventar cores, medidas ou padrões
- Previews HTML sempre em `/preview/`

---

## Git e Deploy

Após fazer commits, **SEMPRE enviar para o repositório remoto** com `git push origin main`.

Antes de encerrar qualquer sessão, verificar:
```bash
git status
git log --oneline origin/main..HEAD
```
Se houver commits não enviados, fazer o push imediatamente.

---

## Validação e Build

Sempre executar `npm run build` após edições para detectar:
- Incompatibilidades de nomes de campos
- Erros de TypeScript
- Regressões de importação

Nunca commitar código que não passou no build.
