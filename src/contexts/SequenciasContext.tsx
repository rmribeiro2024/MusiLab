// src/contexts/SequenciasContext.tsx
// Estado e lógica do módulo de Sequências Didáticas, extraído de BancoPlanos.tsx.
// Gerencia: 9 useState + funções CRUD + sync IndexedDB/Supabase.

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { dbGet, dbSet } from '../lib/db'
import { syncToSupabase, loadFromSupabase, gerarIdSeguro } from '../lib/utils'
import { useModalContext } from './ModalContext'
import { showToast } from '../lib/toast'
import type { Sequencia, AnoLetivo } from '../types'

// ─── INTERFACE DO CONTEXTO ────────────────────────────────────────────────────

export interface SequenciasContextValue {
  // Dados
  sequencias: Sequencia[]
  setSequencias: React.Dispatch<React.SetStateAction<Sequencia[]>>
  sequenciaEditando: Sequencia | null
  setSequenciaEditando: React.Dispatch<React.SetStateAction<Sequencia | null>>
  sequenciaDetalhe: Sequencia | null
  setSequenciaDetalhe: React.Dispatch<React.SetStateAction<Sequencia | null>>
  // Filtros
  filtroEscolaSequencias: string
  setFiltroEscolaSequencias: React.Dispatch<React.SetStateAction<string>>
  filtroUnidadeSequencias: string
  setFiltroUnidadeSequencias: React.Dispatch<React.SetStateAction<string>>
  filtroPeriodoSequencias: string
  setFiltroPeriodoSequencias: React.Dispatch<React.SetStateAction<string>>
  buscaProfundaSequencias: string
  setBuscaProfundaSequencias: React.Dispatch<React.SetStateAction<string>>
  // Modal vincular plano
  modalVincularPlano: { sequenciaId: string; slotIndex: number } | null
  setModalVincularPlano: React.Dispatch<React.SetStateAction<{ sequenciaId: string; slotIndex: number } | null>>
  buscaPlanoVinculo: string
  setBuscaPlanoVinculo: React.Dispatch<React.SetStateAction<string>>
  // CRUD
  novaSequencia: (anosLetivos?: unknown[]) => void
  salvarSequencia: () => void
  excluirSequencia: (id: string | number) => void
  vincularPlanoAoSlot: (planoId: string | number) => void
  atualizarRascunhoSlot: (sequenciaId: string | number, slotIndex: number, campo: string, valor: unknown) => void
  desvincularPlano: (sequenciaId: string | number, slotIndex: number) => void
  gerarSlots: (numero: number) => unknown[]
}

// ─── CONTEXTO ─────────────────────────────────────────────────────────────────

const SequenciasContext = createContext<SequenciasContextValue | null>(null)

export function useSequenciasContext(): SequenciasContextValue {
  const ctx = useContext(SequenciasContext)
  if (!ctx) throw new Error('useSequenciasContext deve ser usado dentro de SequenciasProvider')
  return ctx
}

// ─── PROVIDER ─────────────────────────────────────────────────────────────────

interface SequenciasProviderProps {
  children: React.ReactNode
  userId?: string
}

export function SequenciasProvider({ children, userId }: SequenciasProviderProps) {
  const { setModalConfirm } = useModalContext()

  // ── Dados ─────────────────────────────────────────────────────────────────
  const [sequencias, setSequencias] = useState<Sequencia[]>(() => {
    try {
      const saved = dbGet('sequenciasDidaticas')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [sequenciaEditando, setSequenciaEditando] = useState<Sequencia | null>(null)
  const [sequenciaDetalhe, setSequenciaDetalhe] = useState<Sequencia | null>(null)

  // ── Filtros ───────────────────────────────────────────────────────────────
  const [filtroEscolaSequencias, setFiltroEscolaSequencias] = useState('Todas')
  const [filtroUnidadeSequencias, setFiltroUnidadeSequencias] = useState('Todas')
  const [filtroPeriodoSequencias, setFiltroPeriodoSequencias] = useState('Todos')
  const [buscaProfundaSequencias, setBuscaProfundaSequencias] = useState('')

  // ── Modal vincular plano ──────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [modalVincularPlano, setModalVincularPlano] = useState<any>(null)
  const [buscaPlanoVinculo, setBuscaPlanoVinculo] = useState('')

  // ── Carregar sequencias do Supabase ───────────────────────────────────────
  const [carregado, setCarregado] = useState(false)
  useEffect(() => {
    if (!userId) { setCarregado(true); return }
    loadFromSupabase('sequencias', userId)
      .then(data => {
        if (data !== null && data.length > 0) setSequencias(data as Sequencia[])
      })
      .catch(e => console.error('[SequenciasContext] Erro ao carregar do Supabase:', e))
      .finally(() => setCarregado(true))
  }, [userId])

  // ── Salvar no IndexedDB quando state muda ─────────────────────────────────
  useEffect(() => { dbSet('sequenciasDidaticas', JSON.stringify(sequencias)) }, [sequencias])

  // ── Sync para Supabase (debounce 2s) ──────────────────────────────────────
  const _prevSequencias = useRef<Sequencia[] | null>(null)
  const _syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!userId || !carregado) return
    const prev = _prevSequencias.current
    _prevSequencias.current = sequencias
    if (prev === null) return
    if (sequencias === prev) return
    if (_syncTimeout.current) clearTimeout(_syncTimeout.current)
    _syncTimeout.current = setTimeout(() => {
      syncToSupabase('sequencias', sequencias as unknown as Record<string, unknown>[], userId)
        .catch(e => console.error('[SequenciasContext] Erro ao sincronizar:', e))
    }, 2000)
  }, [sequencias, userId, carregado])

  useEffect(() => {
    return () => { if (_syncTimeout.current) clearTimeout(_syncTimeout.current) }
  }, [])

  // ── Helpers internos ──────────────────────────────────────────────────────

  function gerarSlots(numero: number) {
    const slots = []
    for (let i = 0; i < numero; i++) {
      slots.push({
        id: Date.now() + i,
        ordem: i + 1,
        planoVinculado: null,
        rascunho: { titulo: '', setlist: [], materiais: [] }
      })
    }
    return slots
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  function novaSequencia(anosLetivos: unknown[] = []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anos = anosLetivos as AnoLetivo[]
    const anoAtivo = anos.find((a) => a.status === 'ativo')
    const anoId = anoAtivo ? anoAtivo.id : (anos[0]?.id || '')
    setSequenciaEditando({
      id: gerarIdSeguro() as unknown as string,
      titulo: '',
      escolaId: '',
      anoLetivoId: anoId,
      segmentos: [],
      turmaEspecifica: '',
      unidadePredominante: '',
      duracao: 'mensal',
      numeroSlots: 4,
      dataInicio: '',
      dataFim: '',
      slots: []
    })
  }

  function salvarSequencia() {
    if (!sequenciaEditando?.titulo?.trim()) {
      showToast('Preencha o título da sequência!', 'error')
      return
    }
    if (!sequenciaEditando.escolaId) {
      showToast('Selecione uma escola!', 'error')
      return
    }
    if (!sequenciaEditando.segmentos || sequenciaEditando.segmentos.length === 0) {
      showToast('Selecione pelo menos um segmento!', 'error')
      return
    }
    // Gerar slots se ainda não foram gerados
    if (!sequenciaEditando.slots || sequenciaEditando.slots.length === 0) {
      sequenciaEditando.slots = gerarSlots(sequenciaEditando.numeroSlots || 4)
    }
    const existe = sequencias.find(s => s.id === sequenciaEditando.id)
    if (existe) {
      setSequencias(sequencias.map(s => s.id === sequenciaEditando.id ? sequenciaEditando : s))
    } else {
      setSequencias([...sequencias, sequenciaEditando])
    }
    setSequenciaEditando(null)
  }

  function excluirSequencia(id: string | number) {
    setModalConfirm({
      titulo: 'Excluir sequência?',
      conteudo: 'Esta ação não pode ser desfeita.',
      labelConfirm: 'Excluir',
      perigo: true,
      onConfirm: () => setSequencias(prev => prev.filter(s => s.id !== id)),
    })
  }

  function vincularPlanoAoSlot(planoId: string | number) {
    if (!modalVincularPlano) return
    const { sequenciaId, slotIndex } = modalVincularPlano
    const novasSequencias = sequencias.map(seq => {
      if (seq.id === sequenciaId) {
        const novosSlots = [...seq.slots]
        novosSlots[slotIndex] = {
          ...novosSlots[slotIndex],
          planoVinculado: String(planoId),
          rascunho: { titulo: '', setlist: [], materiais: [] }
        }
        return { ...seq, slots: novosSlots }
      }
      return seq
    })
    setSequencias(novasSequencias)
    if (sequenciaDetalhe && sequenciaDetalhe.id === sequenciaId) {
      setSequenciaDetalhe(novasSequencias.find(s => s.id === sequenciaId) || null)
    }
    setModalVincularPlano(null)
    setBuscaPlanoVinculo('')
  }

  function atualizarRascunhoSlot(sequenciaId: string | number, slotIndex: number, campo: string, valor: unknown) {
    const novasSequencias = sequencias.map(seq => {
      if (seq.id === sequenciaId) {
        const novosSlots = [...seq.slots]
        novosSlots[slotIndex] = {
          ...novosSlots[slotIndex],
          planoVinculado: null,
          rascunho: { ...novosSlots[slotIndex].rascunho, [campo]: valor }
        }
        return { ...seq, slots: novosSlots }
      }
      return seq
    })
    setSequencias(novasSequencias)
    if (sequenciaDetalhe && sequenciaDetalhe.id === sequenciaId) {
      setSequenciaDetalhe(novasSequencias.find(s => s.id === sequenciaId) || null)
    }
  }

  function desvincularPlano(sequenciaId: string | number, slotIndex: number) {
    const novasSequencias = sequencias.map(seq => {
      if (seq.id === sequenciaId) {
        const novosSlots = [...seq.slots]
        novosSlots[slotIndex] = {
          ...novosSlots[slotIndex],
          planoVinculado: null,
          rascunho: { titulo: '', setlist: [], materiais: [] }
        }
        return { ...seq, slots: novosSlots }
      }
      return seq
    })
    setSequencias(novasSequencias)
    if (sequenciaDetalhe && sequenciaDetalhe.id === sequenciaId) {
      setSequenciaDetalhe(novasSequencias.find(s => s.id === sequenciaId) || null)
    }
  }

  // ── VALUE ──────────────────────────────────────────────────────────────────
  const value: SequenciasContextValue = {
    sequencias, setSequencias,
    sequenciaEditando, setSequenciaEditando,
    sequenciaDetalhe, setSequenciaDetalhe,
    filtroEscolaSequencias, setFiltroEscolaSequencias,
    filtroUnidadeSequencias, setFiltroUnidadeSequencias,
    filtroPeriodoSequencias, setFiltroPeriodoSequencias,
    buscaProfundaSequencias, setBuscaProfundaSequencias,
    modalVincularPlano, setModalVincularPlano,
    buscaPlanoVinculo, setBuscaPlanoVinculo,
    novaSequencia, salvarSequencia, excluirSequencia,
    vincularPlanoAoSlot, atualizarRascunhoSlot, desvincularPlano,
    gerarSlots,
  }

  return (
    <SequenciasContext.Provider value={value}>
      {children}
    </SequenciasContext.Provider>
  )
}
