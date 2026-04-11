// src/contexts/EventosContext.tsx
// Gerencia eventos escolares (feriados, apresentações, datas comemorativas, etc.)
// Persistência: IndexedDB (cache) + Supabase (fonte de verdade).

import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react'
import { dbGet, dbSet } from '../lib/db'
import { syncToSupabase, loadFromSupabase, gerarIdSeguro } from '../lib/utils'
import type { EventoEscolar } from '../types'

// ─── INTERFACE DO CONTEXTO ────────────────────────────────────────────────────

export interface EventosContextValue {
  eventos: EventoEscolar[]
  adicionarEvento: (evento: Omit<EventoEscolar, 'id'>) => void
  editarEvento: (id: string | number, campos: Partial<EventoEscolar>) => void
  removerEvento: (id: string | number) => void
}

// ─── CONTEXTO ─────────────────────────────────────────────────────────────────

const EventosContext = createContext<EventosContextValue | null>(null)

export function useEventosContext(): EventosContextValue {
  const ctx = useContext(EventosContext)
  if (!ctx) throw new Error('useEventosContext deve ser usado dentro de EventosProvider')
  return ctx
}

// ─── PROVIDER ─────────────────────────────────────────────────────────────────

interface EventosProviderProps {
  children: React.ReactNode
  userId?: string
}

export function EventosProvider({ children, userId }: EventosProviderProps) {
  const [eventos, setEventos] = useState<EventoEscolar[]>(() => {
    const saved = dbGet('eventos_escolares')
    return saved ? JSON.parse(saved) : []
  })

  // ── Carregar do Supabase quando userId disponível ─────────────────────────
  const [carregado, setCarregado] = useState(false)
  useEffect(() => {
    if (!userId) { setCarregado(true); return }
    loadFromSupabase('eventos_escolares', userId)
      .then(data => {
        if (data !== null && data.length > 0) setEventos(data as EventoEscolar[])
      })
      .catch(e => console.error('[EventosContext] Erro ao carregar do Supabase:', e))
      .finally(() => setCarregado(true))
  }, [userId])

  // ── Salvar no IndexedDB quando state muda ────────────────────────────────
  useEffect(() => { dbSet('eventos_escolares', JSON.stringify(eventos)) }, [eventos])

  // ── Sync para Supabase (debounce 2s) ─────────────────────────────────────
  const _prevEventos = useRef<EventoEscolar[] | null>(null)
  const _syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!userId || !carregado) return
    const prev = _prevEventos.current
    _prevEventos.current = eventos
    if (prev === null) return
    if (eventos === prev) return
    if (_syncTimeout.current) clearTimeout(_syncTimeout.current)
    _syncTimeout.current = setTimeout(() => {
      syncToSupabase('eventos_escolares', eventos as unknown as Record<string, unknown>[], userId)
        .catch(e => console.error('[EventosContext] Erro ao sincronizar:', e))
    }, 2000)
  }, [eventos, userId, carregado])

  useEffect(() => {
    return () => { if (_syncTimeout.current) clearTimeout(_syncTimeout.current) }
  }, [])

  // ── CRUD ─────────────────────────────────────────────────────────────────

  function adicionarEvento(evento: Omit<EventoEscolar, 'id'>) {
    const novo: EventoEscolar = { ...evento, id: gerarIdSeguro() }
    setEventos(prev => [...prev, novo])
  }

  function editarEvento(id: string | number, campos: Partial<EventoEscolar>) {
    setEventos(prev => prev.map(e => String(e.id) === String(id) ? { ...e, ...campos } : e))
  }

  function removerEvento(id: string | number) {
    setEventos(prev => prev.filter(e => String(e.id) !== String(id)))
  }

  // ── VALUE ─────────────────────────────────────────────────────────────────

  const value = useMemo<EventosContextValue>(() => ({
    eventos,
    adicionarEvento,
    editarEvento,
    removerEvento,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [eventos])

  return (
    <EventosContext.Provider value={value}>
      {children}
    </EventosContext.Provider>
  )
}
