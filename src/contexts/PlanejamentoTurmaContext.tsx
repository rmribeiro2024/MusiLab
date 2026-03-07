// src/contexts/PlanejamentoTurmaContext.tsx
// Estado do módulo "Planejamento por Turma".
// Gerencia planejamentos operacionais de turma (histórico por turma + próxima aula).

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { PlanejamentoTurma, RegistroPosAula } from '../types'
import { dbGet, dbSet } from '../lib/db'
import { syncToSupabase, loadFromSupabase } from '../lib/utils'
import { usePlanosContext } from './PlanosContext'

// ─── TIPOS LOCAIS ─────────────────────────────────────────────────────────────

export interface TurmaSelecionada {
  anoLetivoId: string
  escolaId: string
  segmentoId: string
  turmaId: string
}

// ─── INTERFACE DO CONTEXTO ────────────────────────────────────────────────────

export interface PlanejamentoTurmaContextValue {
  // Estado principal
  planejamentos: PlanejamentoTurma[]
  turmaSelecionada: TurmaSelecionada | null
  planejamentoEditando: PlanejamentoTurma | null
  formAberto: boolean

  // Computados derivados (de PlanosContext)
  ultimoRegistroDaTurma: RegistroPosAula | null
  historicoDaTurma: RegistroPosAula[]
  planejamentosDaTurma: PlanejamentoTurma[]

  // Ações de seleção de turma
  selecionarTurma: (turma: TurmaSelecionada) => void

  // CRUD de planejamentos
  novoPlanejamento: () => void
  editarPlanejamento: (p: PlanejamentoTurma) => void
  salvarPlanejamento: (dados: Omit<PlanejamentoTurma, 'id' | 'criadoEm' | 'atualizadoEm' | 'anoLetivoId' | 'escolaId' | 'segmentoId' | 'turmaId'>) => void
  excluirPlanejamento: (id: string) => void
  fecharForm: () => void

  // Promoção para banco (retorna dados para o componente pré-preencher o form de plano)
  buildDadosParaBanco: (id: string) => Partial<{
    titulo: string
    objetivoGeral: string
    materiais: string[]
    escola: string
    segmento: string
    turma: string
    data: string
  }>
}

// ─── CONTEXTO ─────────────────────────────────────────────────────────────────

const PlanejamentoTurmaContext = createContext<PlanejamentoTurmaContextValue | null>(null)

export function usePlanejamentoTurmaContext(): PlanejamentoTurmaContextValue {
  const ctx = useContext(PlanejamentoTurmaContext)
  if (!ctx) throw new Error('usePlanejamentoTurmaContext deve ser usado dentro de PlanejamentoTurmaProvider')
  return ctx
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'planejamento_turma'

function gerarId(): string {
  return `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function agora(): string {
  return new Date().toISOString()
}

function turmaKey(t: TurmaSelecionada): string {
  return `${t.anoLetivoId}|${t.escolaId}|${t.segmentoId}|${t.turmaId}`
}

function matchTurma(p: PlanejamentoTurma, t: TurmaSelecionada): boolean {
  return p.anoLetivoId === t.anoLetivoId &&
    p.escolaId === t.escolaId &&
    p.segmentoId === t.segmentoId &&
    p.turmaId === t.turmaId
}

// Filtra registros pós-aula de um plano que pertencem à turma selecionada
function registrosDaTurma(
  registros: RegistroPosAula[],
  turmaId: string
): RegistroPosAula[] {
  return registros.filter(r => String(r.turma) === turmaId)
}

// ─── PROVIDER ─────────────────────────────────────────────────────────────────

interface PlanejamentoTurmaProviderProps {
  children: React.ReactNode
  userId?: string
}

export function PlanejamentoTurmaProvider({ children, userId }: PlanejamentoTurmaProviderProps) {
  const { planos } = usePlanosContext()

  const [planejamentos, setPlanejamentos] = useState<PlanejamentoTurma[]>(() => {
    try {
      const raw = dbGet(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as PlanejamentoTurma[]) : []
    } catch {
      return []
    }
  })
  const [turmaSelecionada, setTurmaSelecionada] = useState<TurmaSelecionada | null>(null)
  const [planejamentoEditando, setPlanejamentoEditando] = useState<PlanejamentoTurma | null>(null)
  const [formAberto, setFormAberto] = useState(false)
  const [carregado, setCarregado] = useState(false)

  // ── Carregar do Supabase quando userId disponível ────────────────────────
  useEffect(() => {
    if (!userId) { setCarregado(true); return }
    loadFromSupabase('planejamento_turma', userId)
      .then(data => {
        if (data !== null && data.length > 0) {
          setPlanejamentos(data as PlanejamentoTurma[])
        }
      })
      .catch(e => console.error('[PlanejamentoTurmaContext] Erro ao carregar do Supabase:', e))
      .finally(() => setCarregado(true))
  }, [userId])

  // ── Persistir no IndexedDB sempre que planejamentos mudar ────────────────
  useEffect(() => {
    dbSet(STORAGE_KEY, JSON.stringify(planejamentos))
  }, [planejamentos])

  // ── Sync para Supabase (debounce 2s, igual ao padrão dos outros contextos) ─
  const _prevPlanejamentos = useRef<PlanejamentoTurma[] | null>(null)
  const _syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!userId || !carregado) return
    const prev = _prevPlanejamentos.current
    _prevPlanejamentos.current = planejamentos
    if (prev === null) return // primeira execução após carga — não regravar
    if (planejamentos === prev) return
    if (_syncTimeout.current) clearTimeout(_syncTimeout.current)
    _syncTimeout.current = setTimeout(() => {
      syncToSupabase('planejamento_turma', planejamentos as unknown as Record<string, unknown>[], userId)
        .catch(e => console.error('[PlanejamentoTurmaContext] Erro ao sincronizar:', e))
    }, 2000)
  }, [planejamentos, userId, carregado])

  // Cleanup timeout no unmount
  useEffect(() => {
    return () => { if (_syncTimeout.current) clearTimeout(_syncTimeout.current) }
  }, [])

  // ─── Computados ───────────────────────────────────────────────────────────

  const historicoDaTurma = useMemo<RegistroPosAula[]>(() => {
    if (!turmaSelecionada) return []
    const todos: RegistroPosAula[] = []
    for (const plano of planos) {
      const matches = registrosDaTurma(plano.registrosPosAula ?? [], turmaSelecionada.turmaId)
      todos.push(...matches)
    }
    // Ordenar por data desc
    return todos.sort((a, b) => {
      const da = a.dataAula ?? a.data ?? ''
      const db_ = b.dataAula ?? b.data ?? ''
      return db_.localeCompare(da)
    })
  }, [planos, turmaSelecionada])

  const ultimoRegistroDaTurma = useMemo<RegistroPosAula | null>(
    () => historicoDaTurma[0] ?? null,
    [historicoDaTurma]
  )

  const planejamentosDaTurma = useMemo<PlanejamentoTurma[]>(() => {
    if (!turmaSelecionada) return []
    return planejamentos
      .filter(p => matchTurma(p, turmaSelecionada))
      .sort((a, b) => {
        // Desc por dataPrevista, depois por criadoEm
        const da = a.dataPrevista ?? a.criadoEm
        const db_ = b.dataPrevista ?? b.criadoEm
        return db_.localeCompare(da)
      })
  }, [planejamentos, turmaSelecionada])

  // ─── Ações ────────────────────────────────────────────────────────────────

  const selecionarTurma = useCallback((turma: TurmaSelecionada) => {
    setTurmaSelecionada(prev => {
      // Preservar anoLetivoId + escolaId se apenas mudou segmento/turma dentro da mesma escola
      if (prev && prev.anoLetivoId === turma.anoLetivoId && prev.escolaId === turma.escolaId) {
        return turma
      }
      return turma
    })
    setFormAberto(false)
    setPlanejamentoEditando(null)
  }, [])

  const novoPlanejamento = useCallback(() => {
    if (!turmaSelecionada) return
    setPlanejamentoEditando(null)
    setFormAberto(true)
  }, [turmaSelecionada])

  const editarPlanejamento = useCallback((p: PlanejamentoTurma) => {
    setPlanejamentoEditando(p)
    setFormAberto(true)
  }, [])

  const fecharForm = useCallback(() => {
    setFormAberto(false)
    setPlanejamentoEditando(null)
  }, [])

  const salvarPlanejamento = useCallback((
    dados: Omit<PlanejamentoTurma, 'id' | 'criadoEm' | 'atualizadoEm' | 'anoLetivoId' | 'escolaId' | 'segmentoId' | 'turmaId'>
  ) => {
    if (!turmaSelecionada) return
    const ts = agora()

    if (planejamentoEditando) {
      // Atualizar existente
      setPlanejamentos(prev =>
        prev.map(p =>
          p.id === planejamentoEditando.id
            ? { ...p, ...dados, atualizadoEm: ts }
            : p
        )
      )
    } else {
      // Criar novo
      const novo: PlanejamentoTurma = {
        id: gerarId(),
        ...turmaSelecionada,
        ...dados,
        criadoEm: ts,
        atualizadoEm: ts,
      }
      setPlanejamentos(prev => [novo, ...prev])
    }

    setFormAberto(false)
    setPlanejamentoEditando(null)
  }, [turmaSelecionada, planejamentoEditando])

  const excluirPlanejamento = useCallback((id: string) => {
    setPlanejamentos(prev => prev.filter(p => p.id !== id))
  }, [])

  const buildDadosParaBanco = useCallback((id: string) => {
    const p = planejamentos.find(x => x.id === id)
    if (!p || !turmaSelecionada) return {}
    return {
      titulo: `Planejamento ${p.dataPrevista ?? 'sem data'}`,
      objetivoGeral: p.objetivo,
      materiais: p.materiais ?? [],
      escola: turmaSelecionada.escolaId,
      segmento: turmaSelecionada.segmentoId,
      turma: turmaSelecionada.turmaId,
      data: p.dataPrevista,
    }
  }, [planejamentos, turmaSelecionada])

  // ─── Value ────────────────────────────────────────────────────────────────

  const value: PlanejamentoTurmaContextValue = {
    planejamentos,
    turmaSelecionada,
    planejamentoEditando,
    formAberto,
    ultimoRegistroDaTurma,
    historicoDaTurma,
    planejamentosDaTurma,
    selecionarTurma,
    novoPlanejamento,
    editarPlanejamento,
    salvarPlanejamento,
    excluirPlanejamento,
    fecharForm,
    buildDadosParaBanco,
  }

  return (
    <PlanejamentoTurmaContext.Provider value={value}>
      {children}
    </PlanejamentoTurmaContext.Provider>
  )
}

// Exportar turmaKey como utilitário para o componente
export { turmaKey }
