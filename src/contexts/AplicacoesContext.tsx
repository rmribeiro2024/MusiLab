// src/contexts/AplicacoesContext.tsx
// Gerencia as aplicações de aulas (AplicacaoAula) — entidade operacional que
// vincula uma aula-base (Plano) a uma turma específica em uma data específica.
// Não altera o plano base. Suporta adaptações locais por turma.

import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react'
import { dbGet, dbSet } from '../lib/db'
import { syncToSupabase, loadFromSupabase, gerarIdSeguro } from '../lib/utils'
import { useModalContext } from './ModalContext'
import type { AplicacaoAula, AplicacaoAulaSlot } from '../types'

// ─── INTERFACE DO CONTEXTO ────────────────────────────────────────────────────

export interface AplicacoesContextValue {
  aplicacoes: AplicacaoAula[]
  setAplicacoes: React.Dispatch<React.SetStateAction<AplicacaoAula[]>>
  // Mapa computado { [data]: AplicacaoAula[] } para lookup O(1) no calendário
  aplicacoesPorData: Record<string, AplicacaoAula[]>
  // CRUD
  criarAplicacoes: (planoId: string | number, slots: AplicacaoAulaSlot[]) => void
  atualizarStatusAplicacao: (id: string, status: AplicacaoAula['status']) => void
  salvarAdaptacao: (id: string, adaptacaoTexto: string) => void
  excluirAplicacao: (id: string) => void
  // Queries
  getAplicacoesDoDia: (data: string) => AplicacaoAula[]
  getAplicacoesDaSemana: (inicio: string, fim: string) => AplicacaoAula[]
}

// ─── CONTEXT + HOOK ───────────────────────────────────────────────────────────

const AplicacoesContext = createContext<AplicacoesContextValue | null>(null)

export function useAplicacoesContext(): AplicacoesContextValue {
  const ctx = useContext(AplicacoesContext)
  if (!ctx) throw new Error('useAplicacoesContext deve ser usado dentro de AplicacoesProvider')
  return ctx
}

// ─── PROVIDER ─────────────────────────────────────────────────────────────────

interface AplicacoesProviderProps {
  children: React.ReactNode
  userId?: string
}

export function AplicacoesProvider({ children, userId }: AplicacoesProviderProps) {
  const { setModalConfirm } = useModalContext()

  // ── Estado principal ──
  const [aplicacoes, setAplicacoes] = useState<AplicacaoAula[]>(() => {
    const saved = dbGet('aplicacoes')
    return saved ? JSON.parse(saved) : []
  })
  const [carregado, setCarregado] = useState(false)

  // ── Carregar do Supabase ──
  useEffect(() => {
    if (!userId) { setCarregado(true); return }
    loadFromSupabase('aplicacoes_aula', userId)
      .then(data => {
        if (data !== null && data.length > 0) setAplicacoes(data as AplicacaoAula[])
      })
      .catch(e => console.error('[AplicacoesContext] Erro ao carregar do Supabase:', e))
      .finally(() => setCarregado(true))
  }, [userId])

  // ── Persistir no IndexedDB ──
  useEffect(() => {
    dbSet('aplicacoes', JSON.stringify(aplicacoes))
  }, [aplicacoes])

  // ── Sync com Supabase (debounce 3s — consistente com commit 4431fa1) ──
  const _prevAplicacoes = useRef<AplicacaoAula[] | null>(null)
  const _syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!userId || !carregado) return
    const prev = _prevAplicacoes.current
    _prevAplicacoes.current = aplicacoes
    if (prev === null) return // primeira execução após carga — não regravar
    if (aplicacoes === prev) return
    if (_syncTimeout.current) clearTimeout(_syncTimeout.current)
    _syncTimeout.current = setTimeout(() => {
      syncToSupabase('aplicacoes_aula', aplicacoes as unknown as Record<string, unknown>[], userId)
        .catch(e => console.error('[AplicacoesContext] Erro ao sincronizar:', e))
    }, 3000)
  }, [aplicacoes, userId, carregado])

  useEffect(() => {
    return () => { if (_syncTimeout.current) clearTimeout(_syncTimeout.current) }
  }, [])

  // ── Mapa computado para lookup O(1) ──
  const aplicacoesPorData = useMemo<Record<string, AplicacaoAula[]>>(() => {
    const mapa: Record<string, AplicacaoAula[]> = {}
    aplicacoes.forEach(a => {
      if (!mapa[a.data]) mapa[a.data] = []
      mapa[a.data].push(a)
    })
    // Ordenar por horário dentro de cada dia
    Object.keys(mapa).forEach(data => {
      mapa[data].sort((a, b) => (a.horario ?? '').localeCompare(b.horario ?? ''))
    })
    return mapa
  }, [aplicacoes])

  // ── CRUD ──────────────────────────────────────────────────────────────────

  function criarAplicacoes(planoId: string | number, slots: AplicacaoAulaSlot[]) {
    if (!slots.length) return
    const agora = new Date().toISOString()
    const novas: AplicacaoAula[] = slots.map(slot => ({
      id: gerarIdSeguro(),
      planoId,
      anoLetivoId: slot.anoLetivoId,
      escolaId: slot.escolaId,
      segmentoId: slot.segmentoId,
      turmaId: slot.turmaId,
      data: slot.data,
      horario: slot.horario,
      status: 'planejada',
      _updatedAt: agora,
    }))
    setAplicacoes(prev => [...prev, ...novas])
    window.dispatchEvent(new CustomEvent('musilab:toast', {
      detail: { msg: `📅 ${novas.length} aula(s) agendada(s)!`, type: 'success' }
    }))
  }

  function atualizarStatusAplicacao(id: string, status: AplicacaoAula['status']) {
    const agora = new Date().toISOString()
    setAplicacoes(prev => prev.map(a =>
      a.id === id ? { ...a, status, _updatedAt: agora } : a
    ))
    // Compat. retroativa: ao realizar, notifica BancoPlanos para atualizar historicoDatas
    if (status === 'realizada') {
      const aplicacao = aplicacoes.find(a => a.id === id)
      if (aplicacao) {
        window.dispatchEvent(new CustomEvent('musilab:aplicacaoRealizada', {
          detail: { planoId: aplicacao.planoId, data: aplicacao.data, segmentoId: aplicacao.segmentoId, anoLetivoId: aplicacao.anoLetivoId, escolaId: aplicacao.escolaId }
        }))
      }
    }
  }

  function salvarAdaptacao(id: string, adaptacaoTexto: string) {
    const agora = new Date().toISOString()
    setAplicacoes(prev => prev.map(a =>
      a.id === id ? { ...a, adaptacaoTexto, _updatedAt: agora } : a
    ))
  }

  function excluirAplicacao(id: string) {
    setModalConfirm({
      titulo: 'Excluir agendamento?',
      conteudo: 'O plano base não será afetado. Apenas este agendamento será removido.',
      labelConfirm: 'Excluir',
      perigo: true,
      onConfirm: () => setAplicacoes(prev => prev.filter(a => a.id !== id)),
    })
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  function getAplicacoesDoDia(data: string): AplicacaoAula[] {
    return aplicacoesPorData[data] ?? []
  }

  function getAplicacoesDaSemana(inicio: string, fim: string): AplicacaoAula[] {
    return aplicacoes.filter(a => a.data >= inicio && a.data <= fim)
      .sort((a, b) => a.data.localeCompare(b.data) || (a.horario ?? '').localeCompare(b.horario ?? ''))
  }

  // ── Provider value ────────────────────────────────────────────────────────

  const value: AplicacoesContextValue = {
    aplicacoes,
    setAplicacoes,
    aplicacoesPorData,
    criarAplicacoes,
    atualizarStatusAplicacao,
    salvarAdaptacao,
    excluirAplicacao,
    getAplicacoesDoDia,
    getAplicacoesDaSemana,
  }

  return (
    <AplicacoesContext.Provider value={value}>
      {children}
    </AplicacoesContext.Provider>
  )
}
