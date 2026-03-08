// src/components/modals/ModalAplicarEmTurmas.tsx
// Modal para aplicar um plano em turmas via grade semanal.
// Abre a partir do card do plano (TelaPrincipal).

import React, { useState, useMemo } from 'react'
import { useCalendarioContext } from '../../contexts/CalendarioContext'
import { useAnoLetivoContext, useAplicacoesContext } from '../../contexts'
import type { Plano, AulaGrade, AplicacaoAulaSlot, AnoLetivo } from '../../types'

// ── Helper: montar label legível da turma ──────────────────────────────────────

function getNomeTurma(
  anoLetivoId: string | undefined,
  escolaId: string | undefined,
  segmentoId: string,
  turmaId: string,
  anosLetivos: AnoLetivo[]
): string {
  if (!anoLetivoId || !escolaId) return turmaId
  const ano = anosLetivos.find(a => a.id === anoLetivoId)
  const esc = ano?.escolas.find(e => e.id === escolaId)
  const seg = esc?.segmentos.find(s => s.id === segmentoId)
  const tur = seg?.turmas.find(t => t.id === turmaId)
  return [esc?.nome, seg?.nome, tur?.nome].filter(Boolean).join(' › ') || turmaId
}

function toStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Componente ─────────────────────────────────────────────────────────────────

interface Props {
  plano: Plano
  onClose: () => void
}

export default function ModalAplicarEmTurmas({ plano, onClose }: Props) {
  const { obterTurmasDoDia } = useCalendarioContext()
  const { anosLetivos } = useAnoLetivoContext()
  const { aplicacoes, criarAplicacoes } = useAplicacoesContext()

  const [data, setData] = useState<string>(() => toStr(new Date()))
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set())

  // Turmas para o dia selecionado (da grade semanal)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const turmasDoDia = useMemo(() => obterTurmasDoDia(data), [data])

  function getAplicacaoExistente(aula: AulaGrade) {
    return aplicacoes.find(
      a =>
        String(a.planoId) === String(plano.id) &&
        a.data === data &&
        a.turmaId === aula.turmaId &&
        a.anoLetivoId === (aula.anoLetivoId ?? '')
    )
  }

  function toggle(id: number) {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function confirmar() {
    const slots: AplicacaoAulaSlot[] = turmasDoDia
      .filter(a => selecionados.has(a.id) && !getAplicacaoExistente(a))
      .map(a => ({
        anoLetivoId: a.anoLetivoId ?? '',
        escolaId: a.escolaId ?? '',
        segmentoId: a.segmentoId,
        turmaId: a.turmaId,
        data,
        horario: a.horario,
      }))
    if (slots.length > 0) criarAplicacoes(plano.id, slots)
    onClose()
  }

  // Conta quantas selecionadas ainda não estão agendadas
  const novasParaAgendar = [...selecionados].filter(id => {
    const aula = turmasDoDia.find(a => a.id === id)
    return aula && !getAplicacaoExistente(aula)
  }).length

  const statusLabel: Record<string, string> = {
    planejada: '📅 agendada',
    realizada: '✅ realizada',
    cancelada: '✕ cancelada',
  }
  const statusColor: Record<string, string> = {
    planejada: 'bg-blue-100 text-blue-700',
    realizada: 'bg-emerald-100 text-emerald-700',
    cancelada: 'bg-red-100 text-red-600',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:mx-4 rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[85dvh] sm:max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-base">📅 Aplicar em turmas</h3>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[260px]">{plano.titulo}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            ✕
          </button>
        </div>

        {/* Seletor de data */}
        <div className="px-5 py-3 border-b border-slate-100 shrink-0">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
            Data da aula
          </label>
          <input
            type="date"
            value={data}
            onChange={e => {
              setData(e.target.value)
              setSelecionados(new Set())
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none"
          />
        </div>

        {/* Lista de turmas */}
        <div className="overflow-y-auto flex-1 px-5 py-3">
          {turmasDoDia.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-slate-400 text-sm mb-1">Nenhuma turma para este dia.</p>
              <p className="text-xs text-slate-300">
                Configure a grade semanal em Configurações → Grade Semanal.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {turmasDoDia.map(aula => {
                const ap = getAplicacaoExistente(aula)
                const agendado = !!ap
                const checked = selecionados.has(aula.id)
                const nome = getNomeTurma(
                  aula.anoLetivoId,
                  aula.escolaId,
                  aula.segmentoId,
                  aula.turmaId,
                  anosLetivos
                )

                return (
                  <div
                    key={aula.id}
                    onClick={() => !agendado && toggle(aula.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition
                      ${agendado
                        ? 'opacity-60 cursor-default border-slate-100 bg-slate-50'
                        : checked
                        ? 'border-indigo-300 bg-indigo-50 cursor-pointer'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                      }`}
                  >
                    {/* Checkbox visual */}
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition
                        ${agendado
                          ? 'border-slate-300 bg-slate-200'
                          : checked
                          ? 'border-indigo-500 bg-indigo-500'
                          : 'border-slate-300'
                        }`}
                    >
                      {(checked || agendado) && (
                        <span className="text-white text-xs font-bold leading-none">
                          {agendado ? '–' : '✓'}
                        </span>
                      )}
                    </div>

                    {/* Info da turma */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{nome}</p>
                      {aula.horario && (
                        <p className="text-xs text-slate-400">{aula.horario}</p>
                      )}
                    </div>

                    {/* Badge de status (já agendado) */}
                    {agendado && ap && (
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0
                          ${statusColor[ap.status] || 'bg-slate-100 text-slate-600'}`}
                      >
                        {statusLabel[ap.status] || ap.status}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex gap-2 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={novasParaAgendar === 0}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-default text-white rounded-xl text-sm font-semibold transition"
          >
            Agendar{novasParaAgendar > 0 ? ` (${novasParaAgendar})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
