// src/components/AgendaSemanal.tsx
// Visualização semanal de agenda — turmas posicionadas por dia/horário com planos vinculados.
// Etapa 3 do fluxo: Criar aula → Aplicar em turmas → Visualizar na agenda semanal.

import React, { useState, useMemo } from 'react'
import { useCalendarioContext } from '../contexts/CalendarioContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import { useAplicacoesContext } from '../contexts/AplicacoesContext'
import { usePlanosContext } from '../contexts/PlanosContext'
import type { AplicacaoAula, AulaGrade, AnoLetivo, Plano } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function toStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getSegunda(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  return mon
}

const DIAS_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']
const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

function semanaLabel(monday: Date): string {
  const fri = new Date(monday)
  fri.setDate(monday.getDate() + 4)
  const m1 = MESES[monday.getMonth()]
  const m2 = MESES[fri.getMonth()]
  if (m1 === m2) return `${monday.getDate()}–${fri.getDate()} ${m1} ${monday.getFullYear()}`
  return `${monday.getDate()} ${m1} – ${fri.getDate()} ${m2} ${fri.getFullYear()}`
}

function formatarData(dataStr: string): string {
  const [y, m, d] = dataStr.split('-')
  return `${d}/${m}/${y}`
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
  return [seg?.nome, tur?.nome].filter(Boolean).join(' › ') || turmaId
}

function stripHTML(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

// ── Configuração visual de status ─────────────────────────────────────────────

const STATUS_CFG = {
  planejada: {
    bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400', label: 'Planejada',
  },
  realizada: {
    bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400', label: 'Realizada',
  },
  cancelada: {
    bg: 'bg-slate-100', border: 'border-slate-200', text: 'text-slate-500',
    badge: 'bg-slate-200 text-slate-500', dot: 'bg-slate-300', label: 'Cancelada',
  },
} as const

// ── Tipos internos ────────────────────────────────────────────────────────────

interface SlotInfo {
  aulaGrade: AulaGrade
  aplicacao?: AplicacaoAula
  plano?: Plano
  nomeTurma: string
  dataStr: string
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function AgendaSemanal() {
  const { obterTurmasDoDia } = useCalendarioContext()
  const { anosLetivos } = useAnoLetivoContext()
  const { aplicacoes } = useAplicacoesContext()
  const { planos } = usePlanosContext()

  const hoje = useMemo(() => getSegunda(new Date()), [])
  const [semana, setSemana] = useState<Date>(hoje)
  const [painel, setPainel] = useState<SlotInfo | null>(null)

  // 5 dias da semana (Seg–Sex)
  const diasSemana = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => {
      const d = new Date(semana)
      d.setDate(semana.getDate() + i)
      return {
        dataStr: toStr(d),
        label: DIAS_LABELS[i],
        dia: d.getDate(),
        mes: MESES[d.getMonth()],
        isHoje: toStr(d) === toStr(new Date()),
      }
    }),
  [semana])

  // Para cada dia: aulas da grade + aplicação + plano vinculado
  const semanaData = useMemo(() =>
    diasSemana.map(diaInfo => {
      const aulas = obterTurmasDoDia(diaInfo.dataStr)
      const slots: SlotInfo[] = aulas.map(aula => {
        const ap = aplicacoes.find(a =>
          a.data === diaInfo.dataStr &&
          a.turmaId === aula.turmaId &&
          a.anoLetivoId === (aula.anoLetivoId ?? '')
        )
        return {
          aulaGrade: aula,
          aplicacao: ap,
          plano: ap ? planos.find(p => String(p.id) === String(ap.planoId)) : undefined,
          nomeTurma: getNomeTurma(aula.anoLetivoId, aula.escolaId, aula.segmentoId, aula.turmaId, anosLetivos),
          dataStr: diaInfo.dataStr,
        }
      })
      return { ...diaInfo, slots }
    }),
  [diasSemana, obterTurmasDoDia, aplicacoes, planos, anosLetivos])

  // Horários únicos ordenados (para as linhas da grade)
  const horarios = useMemo(() => {
    const set = new Set<string>()
    semanaData.forEach(d => d.slots.forEach(s => { if (s.aulaGrade.horario) set.add(s.aulaGrade.horario) }))
    return Array.from(set).sort()
  }, [semanaData])

  const totalSlots = semanaData.reduce((acc, d) => acc + d.slots.length, 0)
  const totalComPlano = semanaData.reduce((acc, d) => acc + d.slots.filter(s => s.aplicacao).length, 0)
  const ehSemanaAtual = toStr(semana) === toStr(hoje)

  function prevSemana() {
    const d = new Date(semana); d.setDate(d.getDate() - 7)
    setSemana(d); setPainel(null)
  }
  function nextSemana() {
    const d = new Date(semana); d.setDate(d.getDate() + 7)
    setSemana(d); setPainel(null)
  }

  function togglePainel(slot: SlotInfo) {
    const mesmoSlot = painel?.aulaGrade.id === slot.aulaGrade.id && painel?.dataStr === slot.dataStr
    setPainel(mesmoSlot ? null : slot)
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Agenda Semanal</h2>
          {totalSlots > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">
              {totalComPlano} de {totalSlots} aula{totalSlots !== 1 ? 's' : ''} com plano vinculado
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevSemana}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 text-lg font-bold transition">‹</button>
          <div className="text-center min-w-[150px]">
            <p className="font-semibold text-slate-700 text-sm">{semanaLabel(semana)}</p>
            {!ehSemanaAtual && (
              <button onClick={() => { setSemana(hoje); setPainel(null) }}
                className="text-[11px] text-indigo-500 hover:underline">esta semana</button>
            )}
          </div>
          <button onClick={nextSemana}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 text-lg font-bold transition">›</button>
        </div>
      </div>

      {/* ── LEGENDA ── */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(STATUS_CFG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            <span className="text-[11px] text-slate-400">{cfg.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full border border-dashed border-slate-300" />
          <span className="text-[11px] text-slate-400">Sem plano</span>
        </div>
      </div>

      {/* ── CONTEÚDO PRINCIPAL ── */}
      {totalSlots === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <span className="text-4xl mb-3">📅</span>
          <p className="text-sm font-semibold">Nenhuma turma nesta semana</p>
          <p className="text-xs mt-1 text-center max-w-xs text-slate-300">
            Configure a grade semanal em Configurações → Grade Semanal.
          </p>
        </div>
      ) : (
        <div className="flex gap-4 items-start">

          {/* ── GRADE ── */}
          <div className="flex-1 min-w-0 overflow-x-auto">
            <div className="min-w-[480px]">

              {/* Cabeçalho com dias */}
              <div className="grid gap-1.5 mb-2" style={{ gridTemplateColumns: `56px repeat(5, 1fr)` }}>
                <div /> {/* coluna de horário */}
                {diasSemana.map(d => (
                  <div key={d.dataStr}
                    className={`text-center py-2.5 rounded-xl ${d.isHoje ? 'bg-indigo-50' : 'bg-slate-50'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${d.isHoje ? 'text-indigo-500' : 'text-slate-400'}`}>
                      {d.label}
                    </p>
                    <p className={`text-xl font-bold leading-tight mt-0.5 ${d.isHoje ? 'text-indigo-600' : 'text-slate-700'}`}>
                      {d.dia}
                    </p>
                    <p className={`text-[10px] ${d.isHoje ? 'text-indigo-400' : 'text-slate-300'}`}>{d.mes}</p>
                  </div>
                ))}
              </div>

              {/* Linhas de horário */}
              <div className="space-y-1.5">
                {horarios.map(horario => (
                  <div key={horario} className="grid gap-1.5 items-start"
                    style={{ gridTemplateColumns: `56px repeat(5, 1fr)` }}>

                    {/* Horário */}
                    <div className="flex items-start justify-end pr-2 pt-3.5">
                      <span className="text-[10px] font-mono text-slate-300 tabular-nums">{horario}</span>
                    </div>

                    {/* Células por dia */}
                    {diasSemana.map(diaInfo => {
                      const dia = semanaData.find(d => d.dataStr === diaInfo.dataStr)!
                      const slots = dia.slots.filter(s => s.aulaGrade.horario === horario)

                      if (slots.length === 0) {
                        return <div key={diaInfo.dataStr} className="min-h-[64px]" />
                      }

                      return (
                        <div key={diaInfo.dataStr} className="space-y-1">
                          {slots.map(slot => {
                            const cfg = slot.aplicacao
                              ? (STATUS_CFG[slot.aplicacao.status] ?? STATUS_CFG.planejada)
                              : null
                            const isSelected = painel?.aulaGrade.id === slot.aulaGrade.id && painel?.dataStr === slot.dataStr

                            return (
                              <button
                                key={slot.aulaGrade.id}
                                type="button"
                                onClick={() => togglePainel(slot)}
                                className={`
                                  w-full text-left rounded-xl px-3 py-2.5 border transition-all duration-150
                                  ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}
                                  ${cfg
                                    ? `${cfg.bg} ${cfg.border} hover:opacity-80 active:scale-[.98]`
                                    : 'bg-white border-dashed border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 active:scale-[.98]'
                                  }
                                `}
                              >
                                <p className={`text-[11px] font-bold truncate leading-tight ${cfg ? cfg.text : 'text-slate-400'}`}>
                                  {slot.nomeTurma}
                                </p>
                                {slot.plano
                                  ? <p className="text-[10px] text-slate-400 truncate mt-0.5 leading-tight">{slot.plano.titulo}</p>
                                  : <p className="text-[10px] text-slate-300 mt-0.5">Sem plano</p>
                                }
                                {cfg && (
                                  <div className="flex items-center gap-1 mt-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                                    <span className={`text-[9px] font-semibold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span>
                                  </div>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* Turmas sem horário definido */}
              {semanaData.some(d => d.slots.some(s => !s.aulaGrade.horario)) && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2 ml-[62px]">
                    Sem horário definido
                  </p>
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: `56px repeat(5, 1fr)` }}>
                    <div />
                    {diasSemana.map(diaInfo => {
                      const dia = semanaData.find(d => d.dataStr === diaInfo.dataStr)!
                      const slots = dia.slots.filter(s => !s.aulaGrade.horario)
                      return (
                        <div key={diaInfo.dataStr} className="space-y-1">
                          {slots.map(slot => {
                            const cfg = slot.aplicacao
                              ? (STATUS_CFG[slot.aplicacao.status] ?? STATUS_CFG.planejada)
                              : null
                            const isSelected = painel?.aulaGrade.id === slot.aulaGrade.id && painel?.dataStr === slot.dataStr
                            return (
                              <button key={slot.aulaGrade.id} type="button"
                                onClick={() => togglePainel(slot)}
                                className={`w-full text-left rounded-xl px-3 py-2.5 border transition-all ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-1' : ''} ${cfg ? `${cfg.bg} ${cfg.border} hover:opacity-80` : 'bg-white border-dashed border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30'}`}>
                                <p className={`text-[11px] font-bold truncate ${cfg ? cfg.text : 'text-slate-400'}`}>{slot.nomeTurma}</p>
                                {slot.plano
                                  ? <p className="text-[10px] text-slate-400 truncate mt-0.5">{slot.plano.titulo}</p>
                                  : <p className="text-[10px] text-slate-300 mt-0.5">Sem plano</p>
                                }
                              </button>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── PAINEL LATERAL (detalhe do plano) ── */}
          {painel && (
            <PainelPlano slot={painel} onClose={() => setPainel(null)} />
          )}
        </div>
      )}
    </div>
  )
}

// ── Painel lateral: detalhe do plano selecionado ──────────────────────────────

function PainelPlano({ slot, onClose }: { slot: SlotInfo; onClose: () => void }) {
  const { plano, aplicacao, nomeTurma, dataStr } = slot
  const cfg = aplicacao ? (STATUS_CFG[aplicacao.status] ?? STATUS_CFG.planejada) : null
  const atividades = plano?.atividadesRoteiro ?? []

  return (
    <div className="w-72 shrink-0 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm self-start sticky top-4">

      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 flex items-start justify-between gap-2 bg-slate-50/60">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">{nomeTurma}</p>
          <p className="text-sm font-bold text-slate-800 mt-0.5 leading-snug">
            {plano?.titulo ?? <span className="text-slate-400 font-normal italic text-sm">Sem plano vinculado</span>}
          </p>
        </div>
        <button onClick={onClose}
          className="text-slate-300 hover:text-slate-500 p-1 rounded-lg shrink-0 transition">✕</button>
      </div>

      {/* Corpo */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Data + status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatarData(dataStr)}
            {slot.aulaGrade.horario && <span className="text-slate-300">· {slot.aulaGrade.horario}</span>}
          </div>
          {cfg
            ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
            : <span className="text-[11px] text-slate-300 italic">Sem agendamento</span>
          }
        </div>

        {plano ? (
          <>
            {/* Objetivo geral */}
            {plano.objetivoGeral && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Objetivo</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {stripHTML(plano.objetivoGeral).slice(0, 220)}
                  {stripHTML(plano.objetivoGeral).length > 220 ? '…' : ''}
                </p>
              </div>
            )}

            {/* Metadados: nível, faixa etária, duração */}
            {(plano.nivel || (plano.faixaEtaria ?? []).length > 0 || plano.duracao) && (
              <div className="flex flex-wrap gap-1.5">
                {plano.nivel && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{plano.nivel}</span>
                )}
                {plano.duracao && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">⏱ {plano.duracao}</span>
                )}
                {(plano.faixaEtaria ?? []).slice(0, 2).map(f => (
                  <span key={f} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{f}</span>
                ))}
              </div>
            )}

            {/* Roteiro resumido */}
            {atividades.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Roteiro · {atividades.length} atividade{atividades.length !== 1 ? 's' : ''}
                </p>
                <div className="space-y-1.5">
                  {atividades.slice(0, 6).map((a, i) => (
                    <div key={a.id ?? i} className="flex items-start gap-2 text-xs text-slate-600">
                      <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 text-[9px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                        {i + 1}
                      </span>
                      <span className="flex-1 truncate">{a.nome || '(sem nome)'}</span>
                      {a.duracao && <span className="text-slate-300 shrink-0 tabular-nums">{a.duracao}</span>}
                    </div>
                  ))}
                  {atividades.length > 6 && (
                    <p className="text-[10px] text-slate-300 pl-6">+{atividades.length - 6} mais…</p>
                  )}
                </div>
              </div>
            )}

            {/* Adaptação local (se houver) */}
            {aplicacao?.adaptacaoTexto && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1">Adaptações desta turma</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  {stripHTML(aplicacao.adaptacaoTexto).slice(0, 150)}
                  {stripHTML(aplicacao.adaptacaoTexto).length > 150 ? '…' : ''}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <span className="text-3xl">📋</span>
            <p className="text-slate-400 text-sm mt-2">Nenhum plano vinculado</p>
            <p className="text-xs text-slate-300 mt-1">
              Aplique um plano a esta turma usando o botão "Aplicar em turmas" no Banco de Planos.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
