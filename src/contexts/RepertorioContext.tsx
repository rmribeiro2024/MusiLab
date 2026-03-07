// src/contexts/RepertorioContext.tsx
// Estado e lógica do módulo de Repertório Musical, extraído de BancoPlanos.tsx.
// Gerencia: 25 estados, sync IndexedDB/Supabase, opções musicais customizadas.

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { dbGet, dbSet } from '../lib/db'
import { syncToSupabase, loadFromSupabase } from '../lib/utils'
import type { Musica } from '../types'

// ─── INTERFACE DO CONTEXTO ────────────────────────────────────────────────────

export interface RepertorioContextValue {
  // Navegação global (viewMode controla qual módulo é exibido)
  viewMode: string
  setViewMode: React.Dispatch<React.SetStateAction<string>>
  // Edição de música
  musicaEditando: Musica | null
  setMusicaEditando: React.Dispatch<React.SetStateAction<Musica | null>>
  buscaEstilo: string
  setBuscaEstilo: React.Dispatch<React.SetStateAction<string>>
  accordionAberto: string | null
  setAccordionAberto: React.Dispatch<React.SetStateAction<string | null>>
  editandoElemento: string | null
  setEditandoElemento: React.Dispatch<React.SetStateAction<string | null>>
  // Opções musicais customizadas
  compassosCustomizados: string[]
  setCompassosCustomizados: React.Dispatch<React.SetStateAction<string[]>>
  tonalidadesCustomizadas: string[]
  setTonalidadesCustomizadas: React.Dispatch<React.SetStateAction<string[]>>
  andamentosCustomizados: string[]
  setAndamentosCustomizados: React.Dispatch<React.SetStateAction<string[]>>
  escalasCustomizadas: string[]
  setEscalasCustomizadas: React.Dispatch<React.SetStateAction<string[]>>
  estruturasCustomizadas: string[]
  setEstruturasCustomizadas: React.Dispatch<React.SetStateAction<string[]>>
  dinamicasCustomizadas: string[]
  setDinamicasCustomizadas: React.Dispatch<React.SetStateAction<string[]>>
  energiasCustomizadas: string[]
  setEnergiasCustomizadas: React.Dispatch<React.SetStateAction<string[]>>
  instrumentacaoCustomizada: string[]
  setInstrumentacaoCustomizada: React.Dispatch<React.SetStateAction<string[]>>
  // Repertório
  repertorio: Musica[]
  setRepertorio: React.Dispatch<React.SetStateAction<Musica[]>>
  buscaRepertorio: string
  setBuscaRepertorio: React.Dispatch<React.SetStateAction<string>>
  // Filtros
  filtroOrigem: string
  setFiltroOrigem: React.Dispatch<React.SetStateAction<string>>
  filtroEstilo: string
  setFiltroEstilo: React.Dispatch<React.SetStateAction<string>>
  filtroTonalidade: string
  setFiltroTonalidade: React.Dispatch<React.SetStateAction<string>>
  filtroEscala: string
  setFiltroEscala: React.Dispatch<React.SetStateAction<string>>
  filtroCompasso: string
  setFiltroCompasso: React.Dispatch<React.SetStateAction<string>>
  filtroAndamento: string
  setFiltroAndamento: React.Dispatch<React.SetStateAction<string>>
  filtroEstrutura: string
  setFiltroEstrutura: React.Dispatch<React.SetStateAction<string>>
  filtroEnergia: string
  setFiltroEnergia: React.Dispatch<React.SetStateAction<string>>
  filtroInstrumentacao: string
  setFiltroInstrumentacao: React.Dispatch<React.SetStateAction<string>>
  filtroDinamica: string
  setFiltroDinamica: React.Dispatch<React.SetStateAction<string>>
}

// ─── CONTEXTO ─────────────────────────────────────────────────────────────────

const RepertorioContext = createContext<RepertorioContextValue | null>(null)

export function useRepertorioContext(): RepertorioContextValue {
  const ctx = useContext(RepertorioContext)
  if (!ctx) throw new Error('useRepertorioContext deve ser usado dentro de RepertorioProvider')
  return ctx
}

// ─── HELPER ───────────────────────────────────────────────────────────────────

function lerCustom(chave: string): string[] {
  try {
    const saved = dbGet(chave)
    return saved ? JSON.parse(saved) : []
  } catch { return [] }
}

// ─── PROVIDER ─────────────────────────────────────────────────────────────────

interface RepertorioProviderProps {
  children: React.ReactNode
  userId?: string
}

export function RepertorioProvider({ children, userId }: RepertorioProviderProps) {

  // ── Navegação global ───────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState('lista')

  // ── Edição de música ───────────────────────────────────────────────────────
  const [musicaEditando, setMusicaEditando] = useState<Musica | null>(null)
  const [buscaEstilo, setBuscaEstilo] = useState('')
  const [accordionAberto, setAccordionAberto] = useState<string | null>('forma')
  const [editandoElemento, setEditandoElemento] = useState<string | null>(null)

  // ── Opções musicais customizadas ───────────────────────────────────────────
  const [compassosCustomizados, setCompassosCustomizados] = useState<string[]>(() => lerCustom('compassosCustomizados'))
  const [tonalidadesCustomizadas, setTonalidadesCustomizadas] = useState<string[]>(() => lerCustom('tonalidadesCustomizadas'))
  const [andamentosCustomizados, setAndamentosCustomizados] = useState<string[]>(() => lerCustom('andamentosCustomizados'))
  const [escalasCustomizadas, setEscalasCustomizadas] = useState<string[]>(() => lerCustom('escalasCustomizadas'))
  const [estruturasCustomizadas, setEstruturasCustomizadas] = useState<string[]>(() => lerCustom('estruturasCustomizadas'))
  const [dinamicasCustomizadas, setDinamicasCustomizadas] = useState<string[]>(() => lerCustom('dinamicasCustomizadas'))
  const [energiasCustomizadas, setEnergiasCustomizadas] = useState<string[]>(() => lerCustom('energiasCustomizadas'))
  const [instrumentacaoCustomizada, setInstrumentacaoCustomizada] = useState<string[]>(() => lerCustom('instrumentacaoCustomizada'))

  // ── Repertório ─────────────────────────────────────────────────────────────
  const [repertorio, setRepertorio] = useState<Musica[]>(() => {
    try {
      const saved = dbGet('repertorio')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [buscaRepertorio, setBuscaRepertorio] = useState('')

  // ── Filtros ────────────────────────────────────────────────────────────────
  const [filtroOrigem, setFiltroOrigem] = useState('Todas')
  const [filtroEstilo, setFiltroEstilo] = useState('Todos')
  const [filtroTonalidade, setFiltroTonalidade] = useState('Todas')
  const [filtroEscala, setFiltroEscala] = useState('Todas')
  const [filtroCompasso, setFiltroCompasso] = useState('Todos')
  const [filtroAndamento, setFiltroAndamento] = useState('Todos')
  const [filtroEstrutura, setFiltroEstrutura] = useState('Todas')
  const [filtroEnergia, setFiltroEnergia] = useState('Todas')
  const [filtroInstrumentacao, setFiltroInstrumentacao] = useState('Todas')
  const [filtroDinamica, setFiltroDinamica] = useState('Todas')

  // ── Carregar repertório do Supabase ────────────────────────────────────────
  const [carregado, setCarregado] = useState(false)
  useEffect(() => {
    if (!userId) { setCarregado(true); return }
    loadFromSupabase('repertorio', userId)
      .then(data => {
        if (data !== null && data.length > 0) setRepertorio(data as Musica[])
      })
      .catch(e => console.error('[RepertorioContext] Erro ao carregar do Supabase:', e))
      .finally(() => setCarregado(true))
  }, [userId])

  // ── Salvar no IndexedDB quando state muda ─────────────────────────────────
  useEffect(() => { dbSet('repertorio', JSON.stringify(repertorio)) }, [repertorio])
  useEffect(() => { dbSet('compassosCustomizados', JSON.stringify(compassosCustomizados)) }, [compassosCustomizados])
  useEffect(() => { dbSet('tonalidadesCustomizadas', JSON.stringify(tonalidadesCustomizadas)) }, [tonalidadesCustomizadas])
  useEffect(() => { dbSet('andamentosCustomizados', JSON.stringify(andamentosCustomizados)) }, [andamentosCustomizados])
  useEffect(() => { dbSet('escalasCustomizadas', JSON.stringify(escalasCustomizadas)) }, [escalasCustomizadas])
  useEffect(() => { dbSet('estruturasCustomizadas', JSON.stringify(estruturasCustomizadas)) }, [estruturasCustomizadas])
  useEffect(() => { dbSet('dinamicasCustomizadas', JSON.stringify(dinamicasCustomizadas)) }, [dinamicasCustomizadas])
  useEffect(() => { dbSet('energiasCustomizadas', JSON.stringify(energiasCustomizadas)) }, [energiasCustomizadas])
  useEffect(() => { dbSet('instrumentacaoCustomizada', JSON.stringify(instrumentacaoCustomizada)) }, [instrumentacaoCustomizada])

  // ── Sync repertório para Supabase (debounce 2s) ────────────────────────────
  const _prevRepertorio = useRef<Musica[] | null>(null)
  const _syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!userId || !carregado) return
    const prev = _prevRepertorio.current
    _prevRepertorio.current = repertorio
    if (prev === null) return
    if (repertorio === prev) return
    if (_syncTimeout.current) clearTimeout(_syncTimeout.current)
    _syncTimeout.current = setTimeout(() => {
      syncToSupabase('repertorio', repertorio as unknown as Record<string, unknown>[], userId)
        .catch(e => console.error('[RepertorioContext] Erro ao sincronizar:', e))
    }, 2000)
  }, [repertorio, userId, carregado])

  // Cleanup timeout no unmount
  useEffect(() => {
    return () => { if (_syncTimeout.current) clearTimeout(_syncTimeout.current) }
  }, [])

  // ── VALUE ──────────────────────────────────────────────────────────────────
  const value: RepertorioContextValue = {
    viewMode, setViewMode,
    musicaEditando, setMusicaEditando,
    buscaEstilo, setBuscaEstilo,
    accordionAberto, setAccordionAberto,
    editandoElemento, setEditandoElemento,
    compassosCustomizados, setCompassosCustomizados,
    tonalidadesCustomizadas, setTonalidadesCustomizadas,
    andamentosCustomizados, setAndamentosCustomizados,
    escalasCustomizadas, setEscalasCustomizadas,
    estruturasCustomizadas, setEstruturasCustomizadas,
    dinamicasCustomizadas, setDinamicasCustomizadas,
    energiasCustomizadas, setEnergiasCustomizadas,
    instrumentacaoCustomizada, setInstrumentacaoCustomizada,
    repertorio, setRepertorio,
    buscaRepertorio, setBuscaRepertorio,
    filtroOrigem, setFiltroOrigem,
    filtroEstilo, setFiltroEstilo,
    filtroTonalidade, setFiltroTonalidade,
    filtroEscala, setFiltroEscala,
    filtroCompasso, setFiltroCompasso,
    filtroAndamento, setFiltroAndamento,
    filtroEstrutura, setFiltroEstrutura,
    filtroEnergia, setFiltroEnergia,
    filtroInstrumentacao, setFiltroInstrumentacao,
    filtroDinamica, setFiltroDinamica,
  }

  return (
    <RepertorioContext.Provider value={value}>
      {children}
    </RepertorioContext.Provider>
  )
}
