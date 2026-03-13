// src/contexts/HistoricoContext.tsx
// Estado do módulo de Histórico Musical, extraído de BancoPlanos.tsx.
// Gerencia: 5 estados de filtro/modal do ModuloHistoricoMusical.

import React, { createContext, useContext, useState, useMemo } from 'react'
import type { Musica } from '../types'

// ─── INTERFACE DO CONTEXTO ────────────────────────────────────────────────────

export interface HistoricoContextValue {
  hmFiltroTurma: string
  setHmFiltroTurma: React.Dispatch<React.SetStateAction<string>>
  hmFiltroInicio: string
  setHmFiltroInicio: React.Dispatch<React.SetStateAction<string>>
  hmFiltroFim: string
  setHmFiltroFim: React.Dispatch<React.SetStateAction<string>>
  hmFiltroBusca: string
  setHmFiltroBusca: React.Dispatch<React.SetStateAction<string>>
  hmModalMusica: Musica | null
  setHmModalMusica: React.Dispatch<React.SetStateAction<Musica | null>>
}

// ─── CONTEXTO ─────────────────────────────────────────────────────────────────

const HistoricoContext = createContext<HistoricoContextValue | null>(null)

export function useHistoricoContext(): HistoricoContextValue {
  const ctx = useContext(HistoricoContext)
  if (!ctx) throw new Error('useHistoricoContext deve ser usado dentro de HistoricoProvider')
  return ctx
}

// ─── PROVIDER ─────────────────────────────────────────────────────────────────

interface HistoricoProviderProps {
  children: React.ReactNode
}

export function HistoricoProvider({ children }: HistoricoProviderProps) {
  const [hmFiltroTurma, setHmFiltroTurma] = useState('')
  const [hmFiltroInicio, setHmFiltroInicio] = useState('')
  const [hmFiltroFim, setHmFiltroFim] = useState('')
  const [hmFiltroBusca, setHmFiltroBusca] = useState('')
  const [hmModalMusica, setHmModalMusica] = useState<Musica | null>(null)

  const value = useMemo<HistoricoContextValue>(() => ({
    hmFiltroTurma, setHmFiltroTurma,
    hmFiltroInicio, setHmFiltroInicio,
    hmFiltroFim, setHmFiltroFim,
    hmFiltroBusca, setHmFiltroBusca,
    hmModalMusica, setHmModalMusica,
  }), [hmFiltroTurma, hmFiltroInicio, hmFiltroFim, hmFiltroBusca, hmModalMusica])

  return (
    <HistoricoContext.Provider value={value}>
      {children}
    </HistoricoContext.Provider>
  )
}
