import React, { memo, useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import TipTapEditor from './TipTapEditor'
import { showToast } from '../lib/toast'
import { gerarIdSeguro } from '../lib/utils'
import { agruparPorCategoria } from '../lib/taxonomia'
import { useEstrategiasContext } from '../contexts'
import type { AtividadeRoteiro, Plano, Atividade } from '../types'

// ── Tipos locais ─────────────────────────────────────────────────────────────

export interface HashDropdown {
  query: string
  pos: { top: number; left: number }
  atividadeId: string
}

export interface CardAtividadeRoteiroProps {
  atividade: AtividadeRoteiro
  index: number
  isOpen: boolean
  atividadesCount: number

  // Drag-and-drop
  dragActiveIndex: number | null
  dragOverIndex: number | null
  dragFromHandle: React.MutableRefObject<boolean>
  onDragStart: (index: number) => void
  onDragEnter: (index: number) => void
  onDragEnd: () => void

  // Ações da atividade
  onToggle: (id: string | number) => void
  onFieldChange: (id: string | number, field: string, value: string) => void
  onRemove: (id: string | number) => void
  onMoveUp: () => void
  onMoveDown: () => void

  // Estado do plano (necessário para mutações internas do array)
  planoEditando: Plano
  setPlanoEditando: (p: Plano) => void

  // Autocomplete # de tags
  hashDropdown: HashDropdown | null
  setHashDropdown: (v: HashDropdown | null) => void
  todasAsTags: string[]

  // Callbacks externos
  onSaveAsStrategy: (text: string) => void
  onVincularMusica: (atividadeId: string | number) => void

  // Banco de atividades (para "salvar na biblioteca")
  bancoAtividades: Atividade[]
  setBancoAtividades: (v: Atividade[]) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setModalConfirm: (v: any) => void
}

// ── Helper: remove HTML tags ─────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

// ── Taxonomia C completa (usada no prompt Gemini) ────────────────────────────

const TAXONOMIA_PROMPT = `
1. Parâmetros Físicos do Som: Altura, Duração, Intensidade, Timbre
2. Ritmo e Organização Temporal: Pulsação, Andamento, Métrica, Células Rítmicas, Síncope, Ostinato
3. Melodia e Alturas: Fraseado, Contorno, Escalas, Intervalos, Tonalidade
4. Harmonia e Textura: Acordes, Campo Harmônico, Consonância, Textura, Densidade
5. Estrutura e Forma: Motivo, Frase, Período, Formas (AB, ABA, Rondó, Sonata)
6. Dinâmica e Expressividade: Crescendo, Articulação, Caráter
7. Processos Criativos e Ações: Criação, Execução, Apreciação, Escuta ativa
8. Movimento e Corpo: Espaço, Peso, Fluência, Percussão Corporal, Coordenação Motora
9. Contexto e Cultura: Gêneros, História, Etnomusicologia
10. Tecnologia Musical: Áudio, MIDI, Software`.trim()

// ── Modal de salvar na biblioteca ────────────────────────────────────────────

interface ModalSalvarProps {
  nome: string
  chips: string[]
  isLoading: boolean
  onChipRemove: (chip: string) => void
  onChipAdd: (chip: string) => void
  onSave: () => void
  onCancel: () => void
}

function ModalSalvarNaBiblioteca({ nome, chips, isLoading, onChipRemove, onChipAdd, onSave, onCancel }: ModalSalvarProps) {
  const [novoConceito, setNovoConceito] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Fecha com Esc
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  const handleAdd = () => {
    const val = novoConceito.trim()
    if (val && !chips.includes(val)) { onChipAdd(val); setNovoConceito('') }
  }

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-[#1F2937] rounded-2xl shadow-2xl max-w-sm w-full flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#374151]">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Salvar na biblioteca</p>
            {nome && <p className="text-[11px] text-slate-400 dark:text-[#9CA3AF] truncate mt-0.5">{nome}</p>}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-base leading-none ml-3 flex-shrink-0 transition-colors"
          >×</button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">

          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Conceitos identificados
          </p>

          {/* Shimmer enquanto IA analisa */}
          {isLoading ? (
            <div className="flex flex-wrap gap-1.5 min-h-[32px]">
              {[72, 88, 60, 80].map(w => (
                <div
                  key={w}
                  className="h-[26px] rounded-lg bg-slate-200 dark:bg-white/[0.08] animate-pulse"
                  style={{ width: w }}
                />
              ))}
            </div>
          ) : chips.length === 0 ? (
            <p className="text-[11px] text-slate-400 dark:text-[#4B5563] italic">
              Nenhum conceito identificado — adicione manualmente.
            </p>
          ) : (
            /* Chips agrupados por categoria */
            <div className="space-y-2">
              {Object.entries(agruparPorCategoria(chips)).map(([cat, cs]) => (
                <div key={cat}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-[#4B5563] mb-1">{cat}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cs.map(chip => (
                      <span
                        key={chip}
                        className="inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-400/10 text-purple-600 dark:text-purple-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                      >
                        {chip}
                        <button
                          type="button"
                          onClick={() => onChipRemove(chip)}
                          className="hover:text-rose-500 ml-0.5 leading-none transition-colors"
                        >×</button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Input para adicionar */}
          {!isLoading && (
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={novoConceito}
                onChange={e => setNovoConceito(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
                placeholder="+ Adicionar conceito..."
                className="flex-1 border border-slate-200 dark:border-[#374151] rounded-lg px-2.5 py-1.5 text-[11px] bg-white dark:bg-[var(--v2-card)] dark:text-white focus:border-indigo-400 outline-none transition-colors"
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={!novoConceito.trim()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.10] text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
              >
                + Add
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-[#374151] flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 text-sm border border-slate-200 dark:border-[#374151] rounded-xl px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isLoading}
            className="flex-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3 py-2 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isLoading ? 'Analisando...' : '✓ Salvar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Panel slide-in de salvar estratégia ─────────────────────────────────────

const CATEGORIAS_ESTRATEGIA_PADRAO = ['Engajamento', 'Avaliação', 'Criação', 'Apreciação']

interface SlideInEstrategiaProps {
  textoCapturado: string
  onSalvar: (nome: string, categoria: string) => void
  onCancelar: () => void
}

function SlideInEstrategia({ textoCapturado, onSalvar, onCancelar }: SlideInEstrategiaProps) {
  const { categoriasEstrategia } = useEstrategiasContext()
  const categorias = categoriasEstrategia.length > 0 ? categoriasEstrategia : CATEGORIAS_ESTRATEGIA_PADRAO
  const [nome, setNome] = useState(textoCapturado.slice(0, 80))
  const [categoria, setCategoria] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancelar() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancelar])

  return ReactDOM.createPortal(
    <>
      {/* Backdrop — visível só no mobile */}
      <div className="fixed inset-0 z-[59] bg-black/20 sm:bg-transparent" onClick={onCancelar} />

      {/* Panel — desktop: drawer lateral direito | mobile: bottom sheet */}
      <div className="fixed z-[60] flex flex-col bg-white dark:bg-[#1F2937] overflow-hidden
        bottom-0 left-0 right-0 rounded-t-2xl max-h-[65vh]
        sm:bottom-0 sm:top-0 sm:left-auto sm:right-0 sm:rounded-none sm:max-h-full sm:w-72
        border-t border-slate-200 dark:border-[#374151]
        sm:border-t-0 sm:border-l
        shadow-[0_-4px_24px_rgba(0,0,0,0.10)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.35)]
        sm:shadow-[-8px_0_24px_rgba(0,0,0,0.08)] dark:sm:shadow-[-8px_0_24px_rgba(0,0,0,0.3)]">

        {/* Handle mobile */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div className="w-8 h-1 rounded-full bg-slate-200 dark:bg-white/[0.12]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#374151] flex-shrink-0">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">💡 Salvar estratégia</p>
          <button
            type="button"
            onClick={onCancelar}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-base leading-none transition-colors"
          >×</button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">

          {/* Texto capturado */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-1.5">
              Texto capturado
            </p>
            <p className="text-[12px] text-slate-500 dark:text-[#9CA3AF] bg-slate-50 dark:bg-white/[0.03] rounded-lg px-3 py-2 leading-relaxed line-clamp-3 border border-slate-100 dark:border-[#374151]">
              {textoCapturado || '—'}
            </p>
          </div>

          {/* Nome */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-1.5">
              Nome da estratégia
            </p>
            <input
              ref={inputRef}
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && nome.trim()) { e.preventDefault(); onSalvar(nome.trim(), categoria) } }}
              placeholder="Ex: Escuta ativa com perguntas..."
              className="w-full border border-slate-200 dark:border-[#374151] rounded-xl px-3 py-2 text-sm bg-white dark:bg-[var(--v2-card)] dark:text-white focus:border-indigo-400 outline-none transition-colors"
            />
          </div>

          {/* Categoria */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-1.5">
              Categoria
            </p>
            <div className="flex flex-wrap gap-1.5">
              {categorias.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoria(v => v === cat ? '' : cat)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                    categoria === cat
                      ? 'bg-violet-600 text-white'
                      : 'bg-violet-50 dark:bg-violet-400/10 text-violet-600 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-400/20'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-[#374151] flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 text-sm border border-slate-200 dark:border-[#374151] rounded-xl px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => { if (nome.trim()) onSalvar(nome.trim(), categoria) }}
            disabled={!nome.trim()}
            className="flex-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3 py-2 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Salvar
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

const CardAtividadeRoteiro = memo(function CardAtividadeRoteiro({
  atividade,
  index,
  isOpen,
  atividadesCount,
  dragActiveIndex,
  dragOverIndex,
  dragFromHandle,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onToggle,
  onFieldChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  planoEditando,
  setPlanoEditando,
  hashDropdown,
  setHashDropdown,
  todasAsTags,
  onSaveAsStrategy,
  onVincularMusica,
  bancoAtividades,
  setBancoAtividades,
  setModalConfirm,
}: CardAtividadeRoteiroProps) {

  // ── Contextos ────────────────────────────────────────────────
  const { adicionarEstrategiaRapida, estrategias } = useEstrategiasContext()

  // ── Estado local ─────────────────────────────────────────────
  const [menuOpen, setMenuOpen] = useState(false)
  const [showSalvarModal, setShowSalvarModal] = useState(false)
  const [chipsModal, setChipsModal] = useState<string[]>([])
  const [isGeminiLoading, setIsGeminiLoading] = useState(false)
  const [panelEstrategia, setPanelEstrategia] = useState<{ texto: string } | null>(null)

  // ── Refs ─────────────────────────────────────────────────────
  const menuRef = useRef<HTMLDivElement>(null)
  // Cache e in-flight por instância do card (sobrevive a re-renders)
  const geminiCacheRef = useRef<Map<string, string[]>>(new Map())
  const geminiInFlightRef = useRef<Set<string>>(new Set())
  // Cache de fase detectada (dado silencioso para F3.5)
  const faseCacheRef = useRef<Map<string, string>>(new Map())

  // ── Fechar menu ao clicar fora ────────────────────────────────
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  // ── Helper: mutação imutável do array de atividades ──────────
  const updateArr = (updater: (arr: AtividadeRoteiro[]) => AtividadeRoteiro[]) => {
    const arr = updater([...(planoEditando.atividadesRoteiro || [])])
    setPlanoEditando({ ...planoEditando, atividadesRoteiro: arr })
  }

  // ── Chamar Gemini para análise de conceitos ──────────────────
  const analisarConceitos = async (atividadeId: string): Promise<string[]> => {
    const cacheKey = `${atividadeId}-${(atividade.descricao || '').length}`

    // Retorna cache se existir
    if (geminiCacheRef.current.has(cacheKey)) {
      return geminiCacheRef.current.get(cacheKey)!
    }

    const texto = stripHtml(atividade.descricao || '')
    if (!texto || texto.length < 10) return []

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) return []

    const prompt = `Você é um especialista em pedagogia musical. Analise a atividade abaixo e identifique os conceitos musicais pedagógicos presentes.

Atividade: "${atividade.nome}"
Descrição: "${texto}"

Use APENAS conceitos da seguinte taxonomia pedagógica musical:
${TAXONOMIA_PROMPT}

Retorne apenas os conceitos claramente identificados (máximo 6), usando os nomes exatos da taxonomia.
Responda APENAS com JSON válido: {"conceitos": ["conceito1", "conceito2"]}
Se não identificar nenhum conceito, retorne: {"conceitos": []}`

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      )
      if (!res.ok) {
        console.error('[Gemini conceitos] HTTP', res.status, await res.text())
        return []
      }
      const json = await res.json()
      const rawText: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      console.log('[Gemini conceitos] raw:', rawText)
      // Extrai JSON: aceita tanto ```json ... ``` quanto { ... } solto
      const match = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || rawText.match(/(\{[\s\S]*\})/)
      if (!match) { console.warn('[Gemini conceitos] sem JSON na resposta'); return [] }
      const result = JSON.parse(match[1] || match[0])
      const conceitos: string[] = Array.isArray(result.conceitos) ? result.conceitos : []
      geminiCacheRef.current.set(cacheKey, conceitos)
      return conceitos
    } catch (e) {
      console.error('[Gemini conceitos] erro:', e)
      return []
    }
  }

  // ── Detectar fase da atividade via IA (dado silencioso para F3.5) ──
  const detectarFaseIA = async (id: string) => {
    const texto = stripHtml(atividade.descricao || '')
    const cacheKey = `fase-${id}-${(atividade.descricao || '').length}`
    if (faseCacheRef.current.has(cacheKey)) return
    if (!texto || texto.length < 15) return

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) return

    const prompt = `Classifique esta atividade de aula de música em UMA fase pedagógica. Responda APENAS com uma das palavras abaixo, sem pontuação:

aquecimento — início da aula, prepara, aquece, engaja, jogos introdutórios
desenvolvimento — conteúdo principal, ensino direto, prática com suporte
pratica_guiada — exercícios orientados, repetição, consolidação técnica
criacao — criação livre, improvisação, composição autônoma
fechamento — encerramento, reflexão, síntese, avaliação formativa, despedida

Atividade: "${atividade.nome || ''}"
Descrição: "${texto.slice(0, 400)}"

Responda com uma palavra apenas.`

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      )
      if (!res.ok) return
      const json = await res.json()
      const raw: string = (json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim().toLowerCase()
      const fases = ['aquecimento', 'desenvolvimento', 'pratica_guiada', 'criacao', 'fechamento']
      const fase = fases.find(f => raw.includes(f))
      if (!fase) return

      faseCacheRef.current.set(cacheKey, fase)

      // Só grava se o professor ainda não definiu manualmente
      if (!atividade.tipoFase) {
        updateArr(arr => {
          arr[index] = { ...arr[index], tipoFase: fase as AtividadeRoteiro['tipoFase'] }
          return arr
        })
      }
    } catch {
      // silencioso — falha não incomoda o professor
    }
  }

  // ── onBlur do editor: dispara análises IA em background ──────
  const handleEditorBlur = () => {
    const id = String(atividade.id)
    const texto = stripHtml(atividade.descricao || '')
    if (texto.length < 15) return

    // Conceitos musicais
    const cacheKey = `${id}-${(atividade.descricao || '').length}`
    if (!geminiCacheRef.current.has(cacheKey) && !geminiInFlightRef.current.has(id)) {
      geminiInFlightRef.current.add(id)
      analisarConceitos(id).finally(() => geminiInFlightRef.current.delete(id))
    }

    // Fase pedagógica (silenciosa)
    detectarFaseIA(id)
  }

  // ── Abrir modal de salvar na biblioteca ─────────────────────
  const abrirModalSalvar = () => {
    setMenuOpen(false)
    if (!atividade.nome?.trim()) { showToast('Adicione um nome à atividade antes de salvar.', 'error'); return }

    const id = String(atividade.id)
    const cacheKey = `${id}-${(atividade.descricao || '').length}`
    const cached = geminiCacheRef.current.get(cacheKey)

    if (cached) {
      const merged = [...new Set([...(atividade.conceitos || []), ...cached])]
      setChipsModal(merged)
      setIsGeminiLoading(false)
    } else {
      // Abre o modal imediatamente com shimmer, dispara Gemini em paralelo
      setChipsModal(atividade.conceitos || [])
      setIsGeminiLoading(true)
      analisarConceitos(id).then(conceitos => {
        const merged = [...new Set([...(atividade.conceitos || []), ...conceitos])]
        setChipsModal(merged)
        setIsGeminiLoading(false)
      })
    }

    setShowSalvarModal(true)
  }

  // ── Salvar atividade na biblioteca ───────────────────────────
  const confirmarSalvarNaBiblioteca = () => {
    const existe = bancoAtividades.find(
      a => a.nome.toLowerCase().trim() === atividade.nome.toLowerCase().trim()
    )

    const doSave = (bibliotecaId: string | number) => {
      // Atualiza o card com os conceitos do modal + marca como salva
      updateArr(arr => {
        arr[index] = { ...arr[index], conceitos: chipsModal, bibliotecaId }
        return arr
      })
      setShowSalvarModal(false)
      showToast(`"${atividade.nome}" salva na biblioteca`, 'success')
    }

    if (existe) {
      setShowSalvarModal(false)
      setModalConfirm({
        titulo: 'Atividade já existe',
        conteudo: `"${atividade.nome}" já existe na biblioteca.\n\nAtualizar com estes dados?`,
        labelConfirm: 'Atualizar',
        onConfirm: () => {
          const atualizada: Atividade = {
            ...existe,
            descricao: stripHtml(atividade.descricao || '') || existe.descricao,
            duracao: atividade.duracao || existe.duracao,
            conceitos: chipsModal.length > 0 ? chipsModal : existe.conceitos,
            tags: [...new Set([...(existe.tags || []), ...(atividade.tags || [])])],
          }
          setBancoAtividades(bancoAtividades.map(a => a.id === existe.id ? atualizada : a))
          doSave(existe.id)
        },
      })
    } else {
      const novaId = gerarIdSeguro()
      const nova: Atividade = {
        id: novaId,
        nome: atividade.nome,
        descricao: stripHtml(atividade.descricao || ''),
        duracao: atividade.duracao || '',
        conceitos: chipsModal,
        tags: atividade.tags || [],
        recursos: atividade.recursos || [],
        materiais: [],
        faixaEtaria: planoEditando.faixaEtaria || [],
        escola: planoEditando.escola || '',
        unidade: planoEditando.unidades?.[0] || '',
        createdAt: new Date().toISOString(),
      }
      setBancoAtividades([...bancoAtividades, nova])
      doSave(novaId)
    }
  }

  // ── Duplicar atividade no plano ──────────────────────────────
  const duplicar = () => {
    setMenuOpen(false)
    const copia: AtividadeRoteiro = {
      ...atividade,
      id: gerarIdSeguro(),
      nome: `${atividade.nome} (cópia)`,
      bibliotecaId: undefined,
    }
    const arr = [...(planoEditando.atividadesRoteiro || [])]
    arr.splice(index + 1, 0, copia)
    setPlanoEditando({ ...planoEditando, atividadesRoteiro: arr })
    showToast('Atividade duplicada', 'success')
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      <div
        data-activity-id={atividade.id}
        draggable
        onDragStart={(e) => {
          if (!dragFromHandle.current) { e.preventDefault(); return }
          onDragStart(index)
        }}
        onDragEnter={() => onDragEnter(index)}
        onDragEnd={() => { dragFromHandle.current = false; onDragEnd() }}
        onDragOver={e => e.preventDefault()}
        className={`rounded-2xl border overflow-visible transition-all
          ${isOpen ? 'border-indigo-200 dark:border-indigo-500/30' : 'border-slate-200 dark:border-[#374151]'}
          ${dragActiveIndex === index ? 'opacity-50' : ''}
          ${dragOverIndex === index && dragActiveIndex !== index ? 'border-indigo-400 dark:border-indigo-400' : ''}
          bg-white dark:bg-[var(--v2-card)]`}
      >

        {/* ── Header row (sempre visível) ── */}
        <div
          className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none
            ${isOpen ? 'border-b border-slate-100 dark:border-[#374151] rounded-t-2xl' : 'rounded-2xl hover:bg-slate-50 dark:hover:bg-white/[0.02]'}`}
          onClick={() => onToggle(atividade.id)}
        >

          {/* Drag handle desktop */}
          <span
            className="hidden sm:inline text-slate-300 dark:text-[#374151] hover:text-indigo-400 text-lg cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
            onPointerDown={e => { e.stopPropagation(); dragFromHandle.current = true }}
          >⠿</span>

          {/* Reordenação mobile */}
          <div className="flex sm:hidden gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              disabled={index === 0}
              onClick={onMoveUp}
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-indigo-600 disabled:opacity-20 rounded-lg transition"
            >↑</button>
            <button
              type="button"
              disabled={index === atividadesCount - 1}
              onClick={onMoveDown}
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-indigo-600 disabled:opacity-20 rounded-lg transition"
            >↓</button>
          </div>

          {/* Nome inline */}
          <input
            type="text"
            value={atividade.nome}
            onChange={e => onFieldChange(atividade.id, 'nome', e.target.value)}
            onClick={e => e.stopPropagation()}
            placeholder="Nome da atividade..."
            className={`flex-1 min-w-0 bg-transparent border-none outline-none text-sm font-semibold placeholder:font-normal cursor-text
              ${isOpen
                ? 'text-slate-800 dark:text-white placeholder:text-slate-400/60'
                : 'text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#4B5563]'}`}
          />

          {/* Badge "Na biblioteca" */}
          {atividade.bibliotecaId && (
            <span
              onClick={e => e.stopPropagation()}
              className="shrink-0 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-100 dark:border-emerald-500/25 rounded-full px-1.5 py-px leading-tight"
              title="Salva na biblioteca"
            >
              📚
            </span>
          )}

          {/* Duração inline */}
          <div className="flex items-center gap-1 flex-shrink-0 px-2 py-1 rounded-lg border border-slate-200 dark:border-[#374151] hover:border-indigo-300 dark:hover:border-indigo-500/50 bg-white dark:bg-white/[0.04] cursor-text transition-colors"
            title="Duração (minutos)"
            onClick={e => { e.stopPropagation(); (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus() }}>
            <svg className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 6v6l4 2"/></svg>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={(atividade.duracao || '').toString().replace(/[^\d]/g, '')}
              onChange={e => onFieldChange(atividade.id, 'duracao', e.target.value.replace(/[^\d]/g, ''))}
              placeholder="0"
              className="w-[24px] text-center bg-transparent border-none outline-none text-xs font-semibold cursor-text text-slate-600 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
            <span className="text-xs text-slate-400 dark:text-slate-400 flex-shrink-0">min</span>
          </div>

          {/* Menu ··· */}
          <div
            ref={menuRef}
            className="relative flex-shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              title="Opções"
              onClick={() => setMenuOpen(v => !v)}
              className="w-7 h-7 flex items-center justify-center text-slate-500 dark:text-[#4B5563] hover:text-slate-800 dark:hover:text-[#9CA3AF] transition-colors rounded-lg"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><circle cx="4" cy="10" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/></svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#1F2937] border border-slate-200 dark:border-[#374151] rounded-xl shadow-xl py-1 min-w-[172px] z-[100]">
                <button
                  type="button"
                  onClick={abrirModalSalvar}
                  className="w-full text-left px-3 py-2 flex items-center gap-2 text-[12px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
                >
                  <span>📚</span>
                  <span>{atividade.bibliotecaId ? 'Atualizar na biblioteca' : 'Salvar na biblioteca'}</span>
                </button>
                <button
                  type="button"
                  onClick={duplicar}
                  className="w-full text-left px-3 py-2 flex items-center gap-2 text-[12px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
                >
                  <span>📋</span>
                  <span>Duplicar</span>
                </button>
                <div className="my-1 border-t border-slate-100 dark:border-[#374151]" />
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onRemove(atividade.id) }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2 text-[12px] font-semibold text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                >
                  <span>🗑</span>
                  <span>Remover</span>
                </button>
              </div>
            )}
          </div>

          {/* Chevron */}
          <svg
            className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-slate-400' : 'text-slate-300 dark:text-[#374151]'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          ><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>

        </div>

        {/* ── Corpo expandido ── */}
        {isOpen && (
          <div className="px-4 pt-4 pb-5 space-y-4">

            {/* Rich text + autocomplete # */}
            <div className="relative">
              <TipTapEditor
                value={atividade.descricao}
                onChange={val => onFieldChange(atividade.id, 'descricao', val)}
                placeholder="Descreva como realizar esta atividade... (digite # para tags)"
                onHashTrigger={(query, pos) =>
                  setHashDropdown({ query, pos, atividadeId: String(atividade.id) })
                }
                onHashCancel={() => setHashDropdown(null)}
                onSaveAsStrategy={texto => setPanelEstrategia({ texto })}
                onEditorBlur={handleEditorBlur}
              />
              {/* Dropdown de tags ao digitar # */}
              {hashDropdown && hashDropdown.atividadeId === String(atividade.id) && (() => {
                const q = hashDropdown.query.toLowerCase()
                const filtradas = todasAsTags.filter(t => !q || t.toLowerCase().startsWith(q))
                const podeNovaTag = hashDropdown.query.trim() && !todasAsTags.includes(hashDropdown.query.trim())
                if (filtradas.length === 0 && !podeNovaTag) return null
                const addTag = (tag: string) => {
                  const curr = planoEditando.atividadesRoteiro[index]
                  if (!(curr.tags || []).includes(tag)) {
                    updateArr(arr => { arr[index] = { ...arr[index], tags: [...(arr[index].tags || []), tag] }; return arr })
                  }
                  setHashDropdown(null)
                }
                return (
                  <div
                    style={{ position: 'fixed', top: hashDropdown.pos.top + 4, left: hashDropdown.pos.left, zIndex: 9999 }}
                    className="bg-white dark:bg-[#1F2937] border border-amber-200 dark:border-amber-500/30 rounded-xl shadow-xl py-1 min-w-[140px]"
                  >
                    {filtradas.slice(0, 8).map(tag => (
                      <button key={tag} type="button" onMouseDown={e => { e.preventDefault(); addTag(tag) }}
                        className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-400/10 transition-colors">
                        #{tag}
                      </button>
                    ))}
                    {podeNovaTag && (
                      <button type="button" onMouseDown={e => { e.preventDefault(); addTag(hashDropdown.query.trim()) }}
                        className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-400/10 transition-colors border-t border-slate-100 dark:border-white/[0.06]">
                        + criar #{hashDropdown.query.trim()}
                      </button>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* ── Meta row ── */}
            <div className="space-y-2.5">
              {/* Chips existentes */}
              {(
                (atividade.musicasVinculadas || []).length > 0 ||
                (atividade.estrategiasVinculadas || []).length > 0 ||
                (atividade.conceitos || []).length > 0 ||
                (atividade.tags || []).length > 0
              ) && (
                <div className="flex flex-wrap gap-1.5">
                  {(atividade.musicasVinculadas || []).map((m, mi) => (
                    <span key={mi} className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-400/10 text-blue-600 dark:text-blue-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                      🎵 {m.titulo}
                      <button
                        type="button"
                        onClick={() => updateArr(arr => {
                          arr[index] = { ...arr[index], musicasVinculadas: (arr[index].musicasVinculadas || []).filter((_, i) => i !== mi) }
                          return arr
                        })}
                        className="hover:text-rose-500 ml-0.5 leading-none"
                      >×</button>
                    </span>
                  ))}
                  {(atividade.estrategiasVinculadas || []).map((idOrNome, ei) => {
                    // Resolve ID → nome (compatível com dados legados que guardavam nome direto)
                    const nomeExibido = estrategias.find(e => e.id === idOrNome)?.nome ?? idOrNome
                    return (
                    <span key={ei} className="inline-flex items-center gap-1 bg-violet-50 dark:bg-violet-400/10 text-violet-600 dark:text-violet-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                      🧩 {nomeExibido}
                      <button
                        type="button"
                        onClick={() => updateArr(arr => {
                          arr[index] = { ...arr[index], estrategiasVinculadas: (arr[index].estrategiasVinculadas || []).filter((_, i) => i !== ei) }
                          return arr
                        })}
                        className="hover:text-rose-500 ml-0.5 leading-none"
                      >×</button>
                    </span>
                    )
                  })}
                  {(atividade.conceitos || []).map((c, ci) => (
                    <span key={ci} className="inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-400/10 text-purple-600 dark:text-purple-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                      🎓 {c}
                      <button
                        type="button"
                        onClick={() => updateArr(arr => {
                          arr[index] = { ...arr[index], conceitos: (arr[index].conceitos || []).filter((_, i) => i !== ci) }
                          return arr
                        })}
                        className="hover:text-rose-500 ml-0.5 leading-none"
                      >×</button>
                    </span>
                  ))}
                  {(atividade.tags || []).map((t, ti) => (
                    <span key={ti} className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-400/10 text-amber-600 dark:text-amber-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                      #{t}
                      <button
                        type="button"
                        onClick={() => updateArr(arr => {
                          arr[index] = { ...arr[index], tags: (arr[index].tags || []).filter((_, i) => i !== ti) }
                          return arr
                        })}
                        className="hover:text-rose-500 ml-0.5 leading-none"
                      >×</button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal de salvar na biblioteca ── */}
      {showSalvarModal && (
        <ModalSalvarNaBiblioteca
          nome={atividade.nome}
          chips={chipsModal}
          isLoading={isGeminiLoading}
          onChipRemove={chip => setChipsModal(prev => prev.filter(c => c !== chip))}
          onChipAdd={chip => setChipsModal(prev => [...prev, chip])}
          onSave={confirmarSalvarNaBiblioteca}
          onCancel={() => setShowSalvarModal(false)}
        />
      )}

      {/* ── Slide-in panel de salvar estratégia ── */}
      {panelEstrategia && (
        <SlideInEstrategia
          textoCapturado={panelEstrategia.texto}
          onSalvar={(nome, categoria) => {
            adicionarEstrategiaRapida(nome, categoria)
            setPanelEstrategia(null)
          }}
          onCancelar={() => setPanelEstrategia(null)}
        />
      )}
    </>
  )
})

export default CardAtividadeRoteiro
