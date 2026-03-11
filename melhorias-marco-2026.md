# Melhorias — Março 2026

Registro das mudanças implementadas no MusiLab durante o mês de março de 2026.

---

## 1. Correção do modelo Gemini (HTTP 400)

**Arquivo:** `src/contexts/PlanosContext.tsx`

**Problema:** A API do Google Gemini retornava HTTP 400 porque o modelo `gemini-2.0-flash-lite` não estava disponível para a chave de API utilizada.

**Solução:** Substituído o modelo por `gemini-1.5-flash` nas duas chamadas à API — função `gerarObjetivosComIA()` e `sugerirBNCC()`. O endpoint atualizado ficou:
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=...
```

---

## 2. Botão "Registrar pós-aula" na aba Hoje abrindo modal correto

**Arquivo:** `src/components/TelaCalendario.tsx` (componente `TelaResumoDia`)

**Problema:** O botão "Registrar pós-aula" na aba "Hoje" abria o modal de Registro Rápido ao invés do modal completo de Registro Pós-Aula.

**Causa:** O contexto de calendário possui dois modais distintos:
- `setModalRegistroRapido(true)` → abre o Registro Rápido (simplificado)
- `setModalRegistro(true)` → abre o Registro Pós-Aula completo (com campos detalhados)

O botão estava chamando o modal errado.

**Solução:** Corrigido para chamar `setModalRegistro(true)` junto com `setPlanoParaRegistro(plano)` e todos os setters necessários (`setRegAnoSel`, `setRegEscolaSel`, `setRegSegmentoSel`, `setRegTurmaSel`, `setVerRegistros`, `setRegistroEditando`, `setNovoRegistro`) para inicializar corretamente o modal completo de registro.

---

## 3. Cards de turma expandíveis na aba Hoje

**Arquivo:** `src/components/TelaCalendario.tsx` (componente `TelaResumoDia`)

**Melhoria:** A seção "Minhas Turmas de Hoje" exibia apenas linhas planas e leitura. Agora cada turma é um card clicável e expansível que revela três ações rápidas:

1. **🗺 Ver plano de aula** — abre o plano vinculado para visualização
2. **📝 Registrar pós-aula** — abre o modal completo de Registro Pós-Aula pré-preenchido com os dados da turma
3. **👥 Abrir planejamento da turma** — navega para a view `'turmas'` no Banco de Aulas

Botões ficam desabilitados (cinza) quando não há plano de aula vinculado à turma/slot.

Estado local `aulaExpandida` controla qual card está aberto (apenas um por vez).

---

## 4. Botão "Inserir em Sequência" no Banco de Aulas

**Arquivos:**
- `src/components/modals/ModalInserirEmSequencia.tsx` (novo arquivo)
- `src/components/TelaPrincipal.tsx`
- `src/components/ModuloLista.tsx`

**Melhoria:** Adicionado botão com ícone de lista de sequências nos cards de plano no Banco de Aulas (tanto no modo grade/cards quanto no modo lista compacto).

**Funcionamento do modal `ModalInserirEmSequencia`:**
- Exibe todas as sequências didáticas cadastradas
- Cada sequência é expansível para mostrar seus slots (aulas)
- Slots vazios são clicáveis para inserir o plano naquela posição
- Sequências que já contêm o plano exibem o badge "✓ Já consta"
- Sequências com todos os slots preenchidos exibem o badge "Cheio"
- Botão "Criar nova sequência" no rodapé cria uma nova sequência e navega automaticamente para a view de sequências

**Implementação técnica:**
- O plano é inserido chamando `setSequencias` diretamente para atualizar o `planoVinculado` do slot específico
- Animação de sucesso "✓ Inserido!" antes de fechar o modal (900ms)
- O modal recebe `{ plano: Plano, onClose: () => void }` como props

---

## 5. Recursos Externos com Detecção Automática e Previews Ricos

**Arquivo:** `src/components/TelaPrincipal.tsx`

**Melhoria:** O campo de recursos externos no formulário de novo plano (seção "Avaliação / Recursos") foi completamente reformulado para ser mais moderno e intuitivo.

### O que mudou:

**Antes:**
- Campo de texto + dropdown manual para selecionar "Link" ou "Imagem"
- Cards simples com ícone e URL

**Agora:**
- Somente o campo de URL — o tipo é **detectado automaticamente** pelo padrão da URL
- Indicador visual dinâmico no campo mostra o ícone do tipo detectado em tempo real
- Cards de preview ricos com identidade visual por plataforma:
  - **YouTube** → thumbnail do vídeo carregada de `img.youtube.com/vi/VIDEO_ID/mqdefault.jpg`
  - **Spotify** → badge verde com tipo (Faixa / Playlist / Álbum / Artista)
  - **Google Drive** → badge azul com ícone de pasta
  - **PDF** → badge laranja com ícone de documento
  - **Imagem** → badge violeta
  - **Link genérico** → badge cinza

### Funções auxiliares adicionadas em `TelaPrincipal.tsx`:
- `detectarTipoRecurso(url)` — identifica o tipo baseado em padrões regex na URL
- `getYoutubeId(url)` — extrai o ID do vídeo do YouTube de qualquer formato de URL (watch, shorts, embed, youtu.be)
- `getSpotifyType(url)` — identifica o subtipo Spotify (track, playlist, album, artist)

---

## Resumo das Alterações por Arquivo

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/contexts/PlanosContext.tsx` | Fix | Modelo Gemini: `gemini-2.0-flash-lite` → `gemini-1.5-flash` |
| `src/components/TelaCalendario.tsx` | Fix + Feature | Modal correto + cards expansíveis na aba Hoje |
| `src/components/modals/ModalInserirEmSequencia.tsx` | New | Modal para inserir plano em sequência |
| `src/components/TelaPrincipal.tsx` | Feature | Botão sequência nos cards + recursos externos com preview |
| `src/components/ModuloLista.tsx` | Feature | Botão sequência no modo lista compacto |
