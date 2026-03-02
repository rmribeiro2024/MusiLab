// src/contexts/HistoricoContext.tsx
// Estado do módulo de Histórico Musical, extraído de BancoPlanos.tsx.
// Gerencia: 5 estados de filtro/modal do ModuloHistoricoMusical.

import React, { createContext, useContext, useState } from 'react'

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hmModalMusica: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setHmModalMusica: React.Dispatch<React.SetStateAction<any>>
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [hmModalMusica, setHmModalMusica] = useState<any>(null)

  const value: HistoricoContextValue = {
    hmFiltroTurma, setHmFiltroTurma,
    hmFiltroInicio, setHmFiltroInicio,
    hmFiltroFim, setHmFiltroFim,
    hmFiltroBusca, setHmFiltroBusca,
    hmModalMusica, setHmModalMusica,
  }

  return (
    <HistoricoContext.Provider value={value}>
      {children}
    </HistoricoContext.Provider>
  )
}
