// src/components/AgendaSemanal.tsx
// Visualização semanal de agenda — dois modos: Grade (B) e Lista (D).
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
const DIAS_LONGOS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']
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

// ── Status ────────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  planejada: {
    bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', label: 'Planejada',
    leftBar: 'bg-blue-500',
  },
  realizada: {
    bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', label: 'Realizada',
    leftBar: 'bg-emerald-500',
  },
  cancelada: {
    bg: 'bg-slate-100', border: 'border-slate-200', text: 'text-slate-500',
    badge: 'bg-slate-200 text-slate-500', dot: 'bg-slate-300', label: 'Cancelada',
    leftBar: 'bg-slate-300',
  },
} as const

// ── Tipos internos ────────────────────────────────────────────────────────────

type ViewMode = 'grade' | 'lista'

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
  const [viewMode, setViewMode] = useState<ViewMode>('grade')
  // lista: índice do dia expandido (-1 = todos fechados, exceto hoje)
  const [diaExpandido, setDiaExpandido] = useState<number>(-2) // -2 = auto (hoje)

  const diasSemana = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => {
      const d = new Date(semana)
      d.setDate(semana.getDate() + i)
      return {
        dataStr: toStr(d),
        label: DIAS_LABELS[i],
        labelLongo: DIAS_LONGOS[i],
        dia: d.getDate(),
        mes: MESES[d.getMonth()],
        isHoje: toStr(d) === toStr(new Date()),
        idx: i,
      }
    }),
  [semana])

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

  const horarios = useMemo(() => {
    const set = new Set<string>()
    semanaData.forEach(d => d.slots.forEach(s => { if (s.aulaGrade.horario) set.add(s.aulaGrade.horario) }))
    return Array.from(set).sort()
  }, [semanaData])

  const totalSlots = semanaData.reduce((acc, d) => acc + d.slots.length, 0)
  const totalComPlano = semanaData.reduce((acc, d) => acc + d.slots.filter(s => s.aplicacao).length, 0)
  const ehSemanaAtual = toStr(semana) === toStr(hoje)

  // Índice do dia atual (para expandir por padrão na lista)
  const idxHoje = diasSemana.findIndex(d => d.isHoje)
  function isDiaAberto(idx: number) {
    if (diaExpandido === -2) return idx === idxHoje || idxHoje === -1 && idx === 0
    return diaExpandido === idx
  }
  function toggleDia(idx: number) {
    setDiaExpandido(prev => (prev === idx || (prev === -2 && idx === idxHoje)) ? -1 : idx)
  }

  function prevSemana() {
    const d = new Date(semana); d.setDate(d.getDate() - 7)
    setSemana(d); setPainel(null); setDiaExpandido(-2)
  }
  function nextSemana() {
    const d = new Date(semana); d.setDate(d.getDate() + 7)
    setSemana(d); setPainel(null); setDiaExpandido(-2)
  }
  function togglePainel(slot: SlotInfo) {
    const mesmo = painel?.aulaGrade.id === slot.aulaGrade.id && painel?.dataStr === slot.dataStr
    setPainel(mesmo ? null : slot)
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Navegação de semana */}
        <div className="flex items-center gap-1">
          <button onClick={prevSemana}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 text-lg font-bold transition">‹</button>
          <div className="text-center min-w-[160px]">
            <p className="font-bold text-slate-800 text-sm">{semanaLabel(semana)}</p>
            {!ehSemanaAtual
              ? <button onClick={() => { setSemana(hoje); setPainel(null); setDiaExpandido(-2) }}
                  className="text-[11px] text-indigo-500 hover:underline">esta semana</button>
              : <p className="text-[11px] text-slate-400">{totalComPlano}/{totalSlots} com plano</p>
            }
          </div>
          <button onClick={nextSemana}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 text-lg font-bold transition">›</button>
        </div>

        {/* Toggle de visualização */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => { setViewMode('grade'); setPainel(null) }}
            title="Visualização em grade (por horário)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'grade'
                ? 'bg-white text-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 3v18M14 3v18" />
            </svg>
            Grade
          </button>
          <button
            onClick={() => setViewMode('lista')}
            title="Visualização em lista (por dia)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'lista'
                ? 'bg-white text-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Lista
          </button>
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
          <span className="w-2 h-2 rounded-full border-2 border-dashed border-slate-300" />
          <span className="text-[11px] text-slate-400">Sem plano</span>
        </div>
      </div>

      {/* ── CONTEÚDO ── */}
      {totalSlots === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <span className="text-4xl mb-3">📅</span>
          <p className="text-sm font-semibold">Nenhuma turma nesta semana</p>
          <p className="text-xs mt-1 text-center max-w-xs text-slate-300">
            Configure a grade semanal em Configurações → Grade Semanal.
          </p>
        </div>
      ) : viewMode === 'grade' ? (
        <ViewGrade
          semanaData={semanaData}
          diasSemana={diasSemana}
          horarios={horarios}
          painel={painel}
          onTogglePainel={togglePainel}
          onClosePanel={() => setPainel(null)}
        />
      ) : (
        <ViewLista
          semanaData={semanaData}
          isDiaAberto={isDiaAberto}
          onToggleDia={toggleDia}
          painel={painel}
          onTogglePainel={togglePainel}
          onClosePanel={() => setPainel(null)}
        />
      )}
    </div>
  )
}

// ── VIEW B: Grade por horário ─────────────────────────────────────────────────

interface ViewGradeProps {
  semanaData: Array<{ dataStr: string; label: string; dia: number; mes: string; isHoje: boolean; slots: SlotInfo[] }>
  diasSemana: Array<{ dataStr: string; label: string; dia: number; mes: string; isHoje: boolean }>
  horarios: string[]
  painel: SlotInfo | null
  onTogglePainel: (s: SlotInfo) => void
  onClosePanel: () => void
}

function ViewGrade({ semanaData, diasSemana, horarios, painel, onTogglePainel, onClosePanel }: ViewGradeProps) {
  const temSemHorario = semanaData.some(d => d.slots.some(s => !s.aulaGrade.horario))

  return (
    <div className="flex gap-4 items-start">
      {/* Grade */}
      <div className="flex-1 min-w-0 overflow-x-auto">
        <div className="min-w-[520px] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">

          {/* Cabeçalho */}
          <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: `64px repeat(5, 1fr)` }}>
            <div className="border-r border-slate-200" />
            {diasSemana.map(d => (
              <div key={d.dataStr}
                className={`text-center py-3 border-r border-slate-200 last:border-r-0 ${d.isHoje ? 'bg-indigo-50' : ''}`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${d.isHoje ? 'text-indigo-500' : 'text-slate-400'}`}>
                  {d.label}
                </p>
                <p className={`text-xl font-bold leading-tight mt-0.5 ${d.isHoje ? 'text-indigo-600' : 'text-slate-700'}`}>
                  {d.dia}
                </p>
                <p className={`text-[10px] ${d.isHoje ? 'text-indigo-400' : 'text-slate-400'}`}>{d.mes}</p>
              </div>
            ))}
          </div>

          {/* Linhas de horário */}
          {horarios.map((horario, rowIdx) => (
            <div key={horario}
              className={`grid border-b border-slate-150 last:border-b-0 ${rowIdx % 2 === 1 ? 'bg-slate-50/50' : ''}`}
              style={{ gridTemplateColumns: `64px repeat(5, 1fr)`, borderBottomColor: '#e8edf2' }}>

              {/* Horário */}
              <div className="flex items-center justify-center border-r py-3"
                style={{ borderColor: '#e8edf2' }}>
                <span className="text-[11px] font-semibold text-slate-500 tabular-nums">{horario}</span>
              </div>

              {/* Células */}
              {diasSemana.map(diaInfo => {
                const dia = semanaData.find(d => d.dataStr === diaInfo.dataStr)!
                const slots = dia.slots.filter(s => s.aulaGrade.horario === horario)

                return (
                  <div key={diaInfo.dataStr}
                    className="border-r last:border-r-0 p-1.5 flex flex-col gap-1"
                    style={{ borderColor: '#e8edf2', minHeight: 68 }}>
                    {slots.map(slot => {
                      const cfg = slot.aplicacao ? (STATUS_CFG[slot.aplicacao.status] ?? STATUS_CFG.planejada) : null
                      const isSelected = painel?.aulaGrade.id === slot.aulaGrade.id && painel?.dataStr === slot.dataStr
                      return (
                        <button key={slot.aulaGrade.id} type="button"
                          onClick={() => onTogglePainel(slot)}
                          className={`
                            w-full text-left rounded-lg px-2.5 py-2 border transition-all duration-150 active:scale-[.98]
                            ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}
                            ${cfg
                              ? `${cfg.bg} ${cfg.border} hover:opacity-80`
                              : 'bg-white border-dashed border-slate-300 hover:border-indigo-300 hover:bg-indigo-50/20'
                            }
                          `}>
                          <p className={`text-[11px] font-semibold truncate leading-tight ${cfg ? cfg.text : 'text-slate-500'}`}>
                            {slot.nomeTurma}
                          </p>
                          {slot.plano
                            ? <p className="text-[10px] text-slate-400 truncate mt-0.5">{slot.plano.titulo}</p>
                            : <p className="text-[10px] text-slate-400 mt-0.5 italic">Sem plano</p>
                          }
                          {cfg && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              <span className={`text-[9px] font-bold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span>
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

          {/* Turmas sem horário */}
          {temSemHorario && (
            <div className="grid border-t-2 border-slate-200" style={{ gridTemplateColumns: `64px repeat(5, 1fr)` }}>
              <div className="flex items-center justify-center p-2 border-r border-slate-200">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide" style={{ writingMode: 'vertical-rl' }}>—</span>
              </div>
              {diasSemana.map(diaInfo => {
                const dia = semanaData.find(d => d.dataStr === diaInfo.dataStr)!
                const slots = dia.slots.filter(s => !s.aulaGrade.horario)
                return (
                  <div key={diaInfo.dataStr} className="border-r last:border-r-0 p-1.5 flex flex-col gap-1" style={{ borderColor: '#e8edf2' }}>
                    {slots.map(slot => {
                      const cfg = slot.aplicacao ? (STATUS_CFG[slot.aplicacao.status] ?? STATUS_CFG.planejada) : null
                      return (
                        <button key={slot.aulaGrade.id} type="button" onClick={() => onTogglePainel(slot)}
                          className={`w-full text-left rounded-lg px-2.5 py-2 border transition-all ${cfg ? `${cfg.bg} ${cfg.border} hover:opacity-80` : 'bg-white border-dashed border-slate-300 hover:border-indigo-300'}`}>
                          <p className={`text-[11px] font-semibold truncate ${cfg ? cfg.text : 'text-slate-500'}`}>{slot.nomeTurma}</p>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Painel lateral */}
      {painel && <PainelPlano slot={painel} onClose={onClosePanel} />}
    </div>
  )
}

// ── VIEW D: Lista accordion por dia ──────────────────────────────────────────

interface ViewListaProps {
  semanaData: Array<{ dataStr: string; labelLongo: string; dia: number; mes: string; isHoje: boolean; idx: number; slots: SlotInfo[] }>
  isDiaAberto: (idx: number) => boolean
  onToggleDia: (idx: number) => void
  painel: SlotInfo | null
  onTogglePainel: (s: SlotInfo) => void
  onClosePanel: () => void
}

function ViewLista({ semanaData, isDiaAberto, onToggleDia, painel, onTogglePainel, onClosePanel }: ViewListaProps) {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {semanaData.map(diaInfo => {
          const aberto = isDiaAberto(diaInfo.idx)
          const comPlano = diaInfo.slots.filter(s => s.aplicacao).length
          const semPlano = diaInfo.slots.filter(s => !s.aplicacao).length

          return (
            <div key={diaInfo.dataStr}
              className={`bg-white rounded-2xl overflow-hidden border transition-all ${
                diaInfo.isHoje
                  ? 'border-indigo-200 shadow-sm shadow-indigo-100'
                  : diaInfo.slots.length === 0
                  ? 'border-slate-100 opacity-50'
                  : 'border-slate-200'
              }`}>

              {/* Cabeçalho do dia */}
              <button
                type="button"
                onClick={() => diaInfo.slots.length > 0 && onToggleDia(diaInfo.idx)}
                className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition ${
                  diaInfo.slots.length > 0 ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'
                } ${diaInfo.isHoje ? 'bg-indigo-50/60' : ''}`}>

                {/* Data */}
                <div className="flex items-center gap-3 min-w-[100px]">
                  <div className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                    diaInfo.isHoje ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <span className="text-[8px] font-bold uppercase leading-none opacity-70">{diaInfo.labelLongo.slice(0,3)}</span>
                    <span className="text-sm font-bold leading-none mt-0.5">{diaInfo.dia}</span>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${diaInfo.isHoje ? 'text-indigo-700' : 'text-slate-700'}`}>
                      {diaInfo.labelLongo}
                    </p>
                    <p className="text-[10px] text-slate-400">{diaInfo.dia} {diaInfo.mes}</p>
                  </div>
                </div>

                {/* Pills de resumo */}
                <div className="flex-1 flex flex-wrap gap-1.5 min-w-0">
                  {diaInfo.slots.length === 0 ? (
                    <span className="text-xs text-slate-300 italic">Sem aulas</span>
                  ) : (
                    <>
                      {comPlano > 0 && (
                        <span className="text-[11px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                          {comPlano} com plano
                        </span>
                      )}
                      {semPlano > 0 && (
                        <span className="text-[11px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                          {semPlano} sem plano
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Chevron */}
                {diaInfo.slots.length > 0 && (
                  <svg className={`w-4 h-4 text-slate-300 flex-shrink-0 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {/* Lista de aulas */}
              {aberto && diaInfo.slots.length > 0 && (
                <div className="border-t border-slate-100">
                  {diaInfo.slots.map((slot, i) => {
                    const cfg = slot.aplicacao ? (STATUS_CFG[slot.aplicacao.status] ?? STATUS_CFG.planejada) : null
                    const isSelected = painel?.aulaGrade.id === slot.aulaGrade.id && painel?.dataStr === slot.dataStr

                    return (
                      <button key={slot.aulaGrade.id} type="button"
                        onClick={() => onTogglePainel(slot)}
                        className={`
                          w-full flex items-center gap-4 px-5 py-3 text-left border-b border-slate-50 last:border-b-0
                          transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}
                        `}>

                        {/* Dot + horário */}
                        <div className="flex items-center gap-2 w-16 flex-shrink-0">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg ? cfg.dot : 'border-2 border-dashed border-slate-300 bg-transparent'}`} />
                          <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                            {slot.aulaGrade.horario || '—'}
                          </span>
                        </div>

                        {/* Turma + plano */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${cfg ? cfg.text : 'text-slate-600'}`}>
                            {slot.nomeTurma}
                          </p>
                          {slot.plano
                            ? <p className="text-xs text-slate-400 truncate mt-0.5">{slot.plano.titulo}</p>
                            : <p className="text-xs text-slate-300 italic mt-0.5">Sem plano vinculado</p>
                          }
                        </div>

                        {/* Badge de status */}
                        {cfg && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                        )}

                        {/* Seta */}
                        <svg className="w-3.5 h-3.5 text-slate-200 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Painel lateral */}
      {painel && <PainelPlano slot={painel} onClose={onClosePanel} />}
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
            {plano.objetivoGeral && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Objetivo</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {stripHTML(plano.objetivoGeral).slice(0, 220)}
                  {stripHTML(plano.objetivoGeral).length > 220 ? '…' : ''}
                </p>
              </div>
            )}

            {(plano.nivel || (plano.faixaEtaria ?? []).length > 0 || plano.duracao) && (
              <div className="flex flex-wrap gap-1.5">
                {plano.nivel && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{plano.nivel}</span>}
                {plano.duracao && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">⏱ {plano.duracao}</span>}
                {(plano.faixaEtaria ?? []).slice(0, 2).map(f => (
                  <span key={f} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{f}</span>
                ))}
              </div>
            )}

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
              Aplique um plano a esta turma usando "Aplicar em turmas" no Banco de Planos.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
