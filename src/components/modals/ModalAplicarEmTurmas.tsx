// src/components/modals/ModalAplicarEmTurmas.tsx
// Modal para aplicar um plano em turmas — Ideia B: grade semanal.
// Mostra Seg–Sex com "Agendar todas (N)" por dia + checkboxes individuais.

import React, { useState, useMemo } from 'react'
import { useCalendarioContext } from '../../contexts/CalendarioContext'
import { useAnoLetivoContext, useAplicacoesContext } from '../../contexts'
import type { Plano, AulaGrade, AplicacaoAulaSlot, AnoLetivo } from '../../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function toStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMondayOf(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setHours(0, 0, 0, 0)
  mon.setDate(d.getDate() + diff)
  return mon
}

// Mesma lógica do VisaoSemana.getSemanaAtualInicio():
// Sábado/Domingo → avança para a próxima segunda (semana de planejamento)
function getSemanaAtualInicio(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const monday = getMondayOf(d)
  const day = d.getDay()
  return (day === 0 || day === 6) ? (() => { const n = new Date(monday); n.setDate(monday.getDate() + 7); return n })() : monday
}

function makeKey(dataStr: string, aulaId: number): string {
  return `${dataStr}:${aulaId}`
}

const DIAS_LONGOS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira']
const MESES_ABREV = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

function getWeekDays(monday: Date) {
  return DIAS_LONGOS.map((labelLongo, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return {
      dataStr: toStr(d),
      labelLongo,
      dia: d.getDate(),
      mes: MESES_ABREV[d.getMonth()],
    }
  })
}

function semanaLabel(monday: Date): string {
  const fri = new Date(monday)
  fri.setDate(monday.getDate() + 4)
  const m1 = MESES_ABREV[monday.getMonth()]
  const m2 = MESES_ABREV[fri.getMonth()]
  if (m1 === m2) return `${monday.getDate()}–${fri.getDate()} ${m1}`
  return `${monday.getDate()} ${m1} – ${fri.getDate()} ${m2}`
}

function getNomeTurma(
  anoLetivoId: string | undefined,
  escolaId: string | undefined,
  segmentoId: string,
  turmaId: string,
  anosLetivos: AnoLetivo[]
): string {
  if (!anoLetivoId || !escolaId) return turmaId
  // eslint-disable-next-line eqeqeq
  const ano = anosLetivos.find(a => a.id == anoLetivoId)
  // eslint-disable-next-line eqeqeq
  const esc = ano?.escolas.find(e => e.id == escolaId)
  // eslint-disable-next-line eqeqeq
  const seg = esc?.segmentos.find(s => s.id == segmentoId)
  // eslint-disable-next-line eqeqeq
  const tur = seg?.turmas.find(t => t.id == turmaId)
  return [esc?.nome, seg?.nome, tur?.nome].filter(Boolean).join(' › ') || turmaId
}

const STATUS_LABEL: Record<string, string> = {
  planejada: '📅 agendada',
  realizada: '✅ realizada',
  cancelada: '✕ cancelada',
}
const STATUS_COLOR: Record<string, string> = {
  planejada: 'bg-blue-100 text-blue-700',
  realizada: 'bg-emerald-100 text-emerald-700',
  cancelada: 'bg-red-100 text-red-600',
}

// ── Componente ────────────────────────────────────────────────────────────────

interface Props {
  plano: Plano
  onClose: () => void
}

export default function ModalAplicarEmTurmas({ plano, onClose }: Props) {
  const { obterTurmasDoDia } = useCalendarioContext()
  const { anosLetivos } = useAnoLetivoContext()
  const { aplicacoes, criarAplicacoes } = useAplicacoesContext()

  const hoje = useMemo(() => getSemanaAtualInicio(), [])
  const [semana, setSemana] = useState<Date>(hoje)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  // key = `${dataStr}:${aulaId}` — identifica unicamente turma+dia

  const diasSemana = useMemo(() => getWeekDays(semana), [semana])
  const hojeStr = useMemo(() => toStr(new Date()), [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const semanaData = useMemo(
    () => diasSemana
      .map(d => ({ ...d, aulas: obterTurmasDoDia(d.dataStr) }))
      .filter(d => d.aulas.length > 0 && d.dataStr >= hojeStr),
    [diasSemana, hojeStr]
  )

  const ehSemanaAtual = toStr(semana) === toStr(hoje)

  function getAplicacaoExistente(aula: AulaGrade, dataStr: string) {
    return aplicacoes.find(
      a =>
        String(a.planoId) === String(plano.id) &&
        a.data === dataStr &&
        String(a.turmaId) === String(aula.turmaId) &&
        String(a.anoLetivoId) === String(aula.anoLetivoId ?? '')
    )
  }

  function getOutroPlanoNoDia(aula: AulaGrade, dataStr: string) {
    return aplicacoes.find(
      a =>
        String(a.planoId) !== String(plano.id) &&
        a.data === dataStr &&
        String(a.turmaId) === String(aula.turmaId) &&
        String(a.anoLetivoId) === String(aula.anoLetivoId ?? '')
    )
  }

  function toggleAula(dataStr: string, aulaId: number) {
    const key = makeKey(dataStr, aulaId)
    setSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleDia(dataStr: string, aulas: AulaGrade[]) {
    const disponíveis = aulas.filter(a => !getAplicacaoExistente(a, dataStr))
    const keys = disponíveis.map(a => makeKey(dataStr, a.id))
    const todasOn = keys.length > 0 && keys.every(k => selecionados.has(k))
    setSelecionados(prev => {
      const next = new Set(prev)
      if (todasOn) keys.forEach(k => next.delete(k))
      else keys.forEach(k => next.add(k))
      return next
    })
  }

  function prevSemana() {
    const d = new Date(semana)
    d.setDate(d.getDate() - 7)
    setSemana(d)
    setSelecionados(new Set())
  }

  function nextSemana() {
    const d = new Date(semana)
    d.setDate(d.getDate() + 7)
    setSemana(d)
    setSelecionados(new Set())
  }

  function confirmar() {
    const slots: AplicacaoAulaSlot[] = []
    semanaData.forEach(({ dataStr, aulas }) => {
      aulas.forEach(aula => {
        if (selecionados.has(makeKey(dataStr, aula.id)) && !getAplicacaoExistente(aula, dataStr)) {
          slots.push({
            anoLetivoId: aula.anoLetivoId ?? '',
            escolaId: aula.escolaId ?? '',
            segmentoId: aula.segmentoId,
            turmaId: aula.turmaId,
            data: dataStr,
            horario: aula.horario,
          })
        }
      })
    })
    if (slots.length > 0) criarAplicacoes(plano.id, slots)
    onClose()
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const totalNovos = useMemo(() => {
    let count = 0
    semanaData.forEach(({ dataStr, aulas }) => {
      aulas.forEach(aula => {
        if (selecionados.has(makeKey(dataStr, aula.id)) && !getAplicacaoExistente(aula, dataStr))
          count++
      })
    })
    return count
  }, [selecionados, semanaData, aplicacoes]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:mx-4 rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[90dvh] sm:max-h-[92vh] flex flex-col"
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
          >✕</button>
        </div>

        {/* Navegação de semana */}
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <button
            onClick={prevSemana}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 font-bold text-lg transition"
          >‹</button>
          <div className="text-center">
            <p className="font-semibold text-slate-700 text-sm">{semanaLabel(semana)}</p>
            {!ehSemanaAtual && (
              <button
                onClick={() => { setSemana(hoje); setSelecionados(new Set()) }}
                className="text-[11px] text-indigo-500 hover:underline"
              >esta semana</button>
            )}
          </div>
          <button
            onClick={nextSemana}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 font-bold text-lg transition"
          >›</button>
        </div>

        {/* Dias da semana */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
          {semanaData.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-slate-400 text-sm mb-1">Nenhuma turma nesta semana.</p>
              <p className="text-xs text-slate-300">
                Configure a grade semanal em Configurações → Grade Semanal.
              </p>
            </div>
          ) : (
            semanaData.map(({ dataStr, labelLongo, dia, mes, aulas }) => {
              const disponíveis = aulas.filter(a => !getAplicacaoExistente(a, dataStr))
              const keys = disponíveis.map(a => makeKey(dataStr, a.id))
              const todasOn = keys.length > 0 && keys.every(k => selecionados.has(k))
              const algunsOn = !todasOn && keys.some(k => selecionados.has(k))

              return (
                <div key={dataStr} className="border border-slate-200 rounded-xl overflow-hidden">

                  {/* Cabeçalho do dia */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                    <div>
                      <span className="font-semibold text-slate-700 text-sm">{labelLongo}</span>
                      <span className="text-xs text-slate-400 ml-2">{dia} {mes}</span>
                    </div>
                    {disponíveis.length > 0 && (
                      <button
                        onClick={() => toggleDia(dataStr, aulas)}
                        className={`text-xs font-semibold px-3 py-1 rounded-lg border transition
                          ${todasOn
                            ? 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200'
                            : algunsOn
                            ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                          }`}
                      >
                        {todasOn ? '✓ Todas' : `Agendar todas (${disponíveis.length})`}
                      </button>
                    )}
                  </div>

                  {/* Turmas do dia */}
                  <div className="divide-y divide-slate-50">
                    {aulas.map(aula => {
                      const ap = getAplicacaoExistente(aula, dataStr)
                      const agendado = !!ap
                      const outroPlano = !agendado && !!getOutroPlanoNoDia(aula, dataStr)
                      const key = makeKey(dataStr, aula.id)
                      const checked = selecionados.has(key)
                      const nome = getNomeTurma(
                        aula.anoLetivoId, aula.escolaId,
                        aula.segmentoId, aula.turmaId, anosLetivos
                      )

                      return (
                        <div
                          key={key}
                          onClick={() => !agendado && toggleAula(dataStr, aula.id)}
                          className={`flex items-center gap-3 px-4 py-2.5 transition
                            ${agendado
                              ? 'opacity-50 cursor-default'
                              : checked
                              ? 'bg-indigo-50 cursor-pointer'
                              : 'hover:bg-slate-50 cursor-pointer'
                            }`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition
                            ${agendado
                              ? 'border-slate-300 bg-slate-200'
                              : checked
                              ? 'border-indigo-500 bg-indigo-500'
                              : 'border-slate-300'
                            }`}
                          >
                            {(checked || agendado) && (
                              <span className="text-white text-[9px] font-bold leading-none">
                                {agendado ? '–' : '✓'}
                              </span>
                            )}
                          </div>

                          <p className="flex-1 text-xs font-semibold text-slate-700 truncate">{nome}</p>

                          <div className="shrink-0 flex items-center gap-1.5">
                            {aula.horario && (
                              <span className="text-[10px] text-slate-400">{aula.horario}</span>
                            )}
                            {agendado && ap && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                                ${STATUS_COLOR[ap.status] || 'bg-slate-100 text-slate-600'}`}
                              >
                                {STATUS_LABEL[ap.status] || ap.status}
                              </span>
                            )}
                            {outroPlano && !checked && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                · já planejada
                              </span>
                            )}
                            {outroPlano && checked && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                                substituirá aula atual
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex gap-2 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >Cancelar</button>
          <button
            onClick={confirmar}
            disabled={totalNovos === 0}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-default text-white rounded-xl text-sm font-semibold transition"
          >
            Agendar{totalNovos > 0 ? ` (${totalNovos})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
