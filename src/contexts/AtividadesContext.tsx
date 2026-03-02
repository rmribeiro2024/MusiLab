// src/contexts/AtividadesContext.tsx
// Estado e lógica do módulo de Atividades Pedagógicas, extraído de BancoPlanos.tsx.
// Gerencia: 14 useState + funções CRUD + sync IndexedDB/Supabase.

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { dbGet, dbSet } from '../lib/db'
import { syncToSupabase, loadFromSupabase, gerarIdSeguro } from '../lib/utils'
import { useModalContext } from './ModalContext'
import type { Atividade } from '../types'

// ─── INTERFACE DO CONTEXTO ────────────────────────────────────────────────────

export interface AtividadesContextValue {
  // Dados
  atividades: Atividade[]
  setAtividades: React.Dispatch<React.SetStateAction<Atividade[]>>
  atividadeEditando: Atividade | null
  setAtividadeEditando: React.Dispatch<React.SetStateAction<Atividade | null>>
  // Recursos
  novoRecursoUrlAtiv: string
  setNovoRecursoUrlAtiv: React.Dispatch<React.SetStateAction<string>>
  novoRecursoTipoAtiv: string
  setNovoRecursoTipoAtiv: React.Dispatch<React.SetStateAction<string>>
  // Filtros
  filtroTagAtividade: string
  setFiltroTagAtividade: React.Dispatch<React.SetStateAction<string>>
  filtroFaixaAtividade: string
  setFiltroFaixaAtividade: React.Dispatch<React.SetStateAction<string>>
  filtroConceitoAtividade: string
  setFiltroConceitoAtividade: React.Dispatch<React.SetStateAction<string>>
  buscaAtividade: string
  setBuscaAtividade: React.Dispatch<React.SetStateAction<string>>
  // Modais
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modalAdicionarAoPlano: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setModalAdicionarAoPlano: React.Dispatch<React.SetStateAction<any>>
  // Visualização
  modoVisAtividades: string
  setModoVisAtividades: React.Dispatch<React.SetStateAction<string>>
  // Vínculos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  atividadeVinculandoMusica: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setAtividadeVinculandoMusica: React.Dispatch<React.SetStateAction<any>>
  pendingAtividadeId: string | number | null
  setPendingAtividadeId: React.Dispatch<React.SetStateAction<string | number | null>>
  // Nova música inline
  modalNovaMusicaInline: boolean
  setModalNovaMusicaInline: React.Dispatch<React.SetStateAction<boolean>>
  novaMusicaInline: { titulo: string; autor: string; origem: string; observacoes: string }
  setNovaMusicaInline: React.Dispatch<React.SetStateAction<{ titulo: string; autor: string; origem: string; observacoes: string }>>
  // CRUD
  novaAtividade: () => void
  salvarAtividade: () => void
  excluirAtividade: (id: string | number) => void
  adicionarRecursoAtiv: () => void
  removerRecursoAtiv: (idx: number) => void
}

// ─── CONTEXTO ─────────────────────────────────────────────────────────────────

const AtividadesContext = createContext<AtividadesContextValue | null>(null)

export function useAtividadesContext(): AtividadesContextValue {
  const ctx = useContext(AtividadesContext)
  if (!ctx) throw new Error('useAtividadesContext deve ser usado dentro de AtividadesProvider')
  return ctx
}

// ─── PROVIDER ─────────────────────────────────────────────────────────────────

interface AtividadesProviderProps {
  children: React.ReactNode
  userId?: string
}

export function AtividadesProvider({ children, userId }: AtividadesProviderProps) {
  const { setModalConfirm } = useModalContext()

  // ── Dados ─────────────────────────────────────────────────────────────────
  const [atividades, setAtividades] = useState<Atividade[]>(() => {
    try {
      const saved = dbGet('atividades')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [atividadeEditando, setAtividadeEditando] = useState<Atividade | null>(null)

  // ── Recursos ──────────────────────────────────────────────────────────────
  const [novoRecursoUrlAtiv, setNovoRecursoUrlAtiv] = useState('')
  const [novoRecursoTipoAtiv, setNovoRecursoTipoAtiv] = useState('link')

  // ── Filtros ───────────────────────────────────────────────────────────────
  const [filtroTagAtividade, setFiltroTagAtividade] = useState('Todas')
  const [filtroFaixaAtividade, setFiltroFaixaAtividade] = useState('Todas')
  const [filtroConceitoAtividade, setFiltroConceitoAtividade] = useState('Todos')
  const [buscaAtividade, setBuscaAtividade] = useState('')

  // ── Modais ────────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [modalAdicionarAoPlano, setModalAdicionarAoPlano] = useState<any>(null)
  const [modoVisAtividades, setModoVisAtividades] = useState('grade')

  // ── Vínculos ──────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [atividadeVinculandoMusica, setAtividadeVinculandoMusica] = useState<any>(null)
  const [pendingAtividadeId, setPendingAtividadeId] = useState<string | number | null>(null)

  // ── Nova música inline ────────────────────────────────────────────────────
  const [modalNovaMusicaInline, setModalNovaMusicaInline] = useState(false)
  const [novaMusicaInline, setNovaMusicaInline] = useState({ titulo: '', autor: '', origem: '', observacoes: '' })

  // ── Carregar atividades do Supabase ───────────────────────────────────────
  const [carregado, setCarregado] = useState(false)
  useEffect(() => {
    if (!userId) { setCarregado(true); return }
    loadFromSupabase('atividades', userId)
      .then(data => {
        if (data !== null) setAtividades(data.length > 0 ? data as Atividade[] : [])
      })
      .catch(e => console.error('[AtividadesContext] Erro ao carregar do Supabase:', e))
      .finally(() => setCarregado(true))
  }, [userId])

  // ── Salvar no IndexedDB quando state muda ─────────────────────────────────
  useEffect(() => { dbSet('atividades', JSON.stringify(atividades)) }, [atividades])

  // ── Sync para Supabase (debounce 2s) ──────────────────────────────────────
  const _prevAtividades = useRef<Atividade[] | null>(null)
  const _syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!userId || !carregado) return
    const prev = _prevAtividades.current
    _prevAtividades.current = atividades
    if (prev === null) return
    if (atividades === prev) return
    if (_syncTimeout.current) clearTimeout(_syncTimeout.current)
    _syncTimeout.current = setTimeout(() => {
      syncToSupabase('atividades', atividades as unknown as Record<string, unknown>[], userId)
        .catch(e => console.error('[AtividadesContext] Erro ao sincronizar:', e))
    }, 2000)
  }, [atividades, userId, carregado])

  useEffect(() => {
    return () => { if (_syncTimeout.current) clearTimeout(_syncTimeout.current) }
  }, [])

  // ── CRUD ──────────────────────────────────────────────────────────────────

  function novaAtividade() {
    setAtividadeEditando({
      id: gerarIdSeguro() as unknown as string,
      nome: '',
      descricao: '',
      faixaEtaria: [],
      duracao: '',
      materiais: [],
      conceitos: [],
      tags: [],
      unidade: '',
      observacao: '',
      recursos: [],
      musicasVinculadas: [],
    })
  }

  function salvarAtividade() {
    if (!atividadeEditando?.nome?.trim()) {
      setModalConfirm({ conteudo: '⚠️ Preencha o nome da atividade!', somenteOk: true, labelConfirm: 'OK' })
      return
    }
    const existe = atividades.find(a => a.id === atividadeEditando.id)
    if (existe) {
      setAtividades(atividades.map(a => a.id === atividadeEditando.id ? atividadeEditando : a))
    } else {
      setAtividades([...atividades, atividadeEditando])
    }
    setAtividadeEditando(null)
    setModalConfirm({ conteudo: '✅ Atividade salva!', somenteOk: true, labelConfirm: 'OK' })
  }

  function excluirAtividade(id: string | number) {
    setModalConfirm({
      titulo: 'Excluir atividade?',
      conteudo: 'Esta ação não pode ser desfeita.',
      labelConfirm: 'Excluir',
      perigo: true,
      onConfirm: () => setAtividades(prev => prev.filter(a => a.id !== id)),
    })
  }

  function adicionarRecursoAtiv() {
    if (!novoRecursoUrlAtiv.trim() || !atividadeEditando) return
    setAtividadeEditando({
      ...atividadeEditando,
      recursos: [...(atividadeEditando.recursos || []), { url: novoRecursoUrlAtiv.trim(), tipo: novoRecursoTipoAtiv }],
    })
    setNovoRecursoUrlAtiv('')
  }

  function removerRecursoAtiv(idx: number) {
    if (!atividadeEditando) return
    const n = [...(atividadeEditando.recursos || [])]
    n.splice(idx, 1)
    setAtividadeEditando({ ...atividadeEditando, recursos: n })
  }

  // ── VALUE ──────────────────────────────────────────────────────────────────
  const value: AtividadesContextValue = {
    atividades, setAtividades,
    atividadeEditando, setAtividadeEditando,
    novoRecursoUrlAtiv, setNovoRecursoUrlAtiv,
    novoRecursoTipoAtiv, setNovoRecursoTipoAtiv,
    filtroTagAtividade, setFiltroTagAtividade,
    filtroFaixaAtividade, setFiltroFaixaAtividade,
    filtroConceitoAtividade, setFiltroConceitoAtividade,
    buscaAtividade, setBuscaAtividade,
    modalAdicionarAoPlano, setModalAdicionarAoPlano,
    modoVisAtividades, setModoVisAtividades,
    atividadeVinculandoMusica, setAtividadeVinculandoMusica,
    pendingAtividadeId, setPendingAtividadeId,
    modalNovaMusicaInline, setModalNovaMusicaInline,
    novaMusicaInline, setNovaMusicaInline,
    novaAtividade, salvarAtividade, excluirAtividade,
    adicionarRecursoAtiv, removerRecursoAtiv,
  }

  return (
    <AtividadesContext.Provider value={value}>
      {children}
    </AtividadesContext.Provider>
  )
}
