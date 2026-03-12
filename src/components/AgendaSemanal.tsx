// src/components/AgendaSemanal.tsx
// Visualização semanal — Grade (B) e Lista (D) com:
//   • Filtro por escola (melhoria 4)
//   • Botão + para aplicar plano nos blocos vazios (melhoria 2)
//   • Registro pós-aula + marcar realizada direto do painel (melhoria 1)

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
function getNomeTurma(anoLetivoId: string | undefined, escolaId: string | undefined, segmentoId: string, turmaId: string, anosLetivos: AnoLetivo[]): string {
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
function getNomeEscola(anoLetivoId: string | undefined, escolaId: string | undefined, anosLetivos: AnoLetivo[]): string {
  if (!anoLetivoId || !escolaId) return ''
  // eslint-disable-next-line eqeqeq
  const ano = anosLetivos.find(a => a.id == anoLetivoId)
  // eslint-disable-next-line eqeqeq
  return ano?.escolas.find(e => e.id == escolaId)?.nome ?? ''
}
function stripHTML(html: string): string { return html.replace(/<[^>]*>/g, '').trim() }

// ── Status ────────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  planejada: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', label: 'Planejada' },
  realizada:  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', label: 'Realizada' },
  cancelada:  { bg: 'bg-slate-100', border: 'border-slate-200', text: 'text-slate-500', badge: 'bg-slate-200 text-slate-500', dot: 'bg-slate-300', label: 'Cancelada' },
} as const

// ── Tipos internos ────────────────────────────────────────────────────────────

type ViewMode = 'grade' | 'lista'

interface SlotInfo {
  aulaGrade: AulaGrade
  aplicacao?: AplicacaoAula
  plano?: Plano
  nomeTurma: string
  nomeEscola: string
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
  // Guarda só a chave; o slot ao vivo é derivado de semanaData
  const [painelKey, setPainelKey] = useState<{ aulaGradeId: number; dataStr: string } | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grade')
  const [diaExpandido, setDiaExpandido] = useState<number>(-2)
  const [filtroEscola, setFiltroEscola] = useState<string>('') // '' = todas
  const [selecionandoSlot, setSelecionandoSlot] = useState<SlotInfo | null>(null)

  const diasSemana = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => {
      const d = new Date(semana); d.setDate(semana.getDate() + i)
      return { dataStr: toStr(d), label: DIAS_LABELS[i], labelLongo: DIAS_LONGOS[i], dia: d.getDate(), mes: MESES[d.getMonth()], isHoje: toStr(d) === toStr(new Date()), idx: i }
    }), [semana])

  const semanaDataFull = useMemo(() =>
    diasSemana.map(diaInfo => {
      const aulas = obterTurmasDoDia(diaInfo.dataStr)
      const slots: SlotInfo[] = aulas.map(aula => {
        const ap = aplicacoes.find(a => a.data === diaInfo.dataStr && a.turmaId === aula.turmaId && a.anoLetivoId === (aula.anoLetivoId ?? ''))
        return {
          aulaGrade: aula,
          aplicacao: ap,
          plano: ap ? planos.find(p => String(p.id) === String(ap.planoId)) : undefined,
          nomeTurma: getNomeTurma(aula.anoLetivoId, aula.escolaId, aula.segmentoId, aula.turmaId, anosLetivos),
          nomeEscola: getNomeEscola(aula.anoLetivoId, aula.escolaId, anosLetivos),
          dataStr: diaInfo.dataStr,
        }
      })
      return { ...diaInfo, slots }
    }), [diasSemana, obterTurmasDoDia, aplicacoes, planos, anosLetivos])

  // Escolas únicas presentes nesta semana (para o filtro)
  const escolasDisponiveis = useMemo(() => {
    const map = new Map<string, string>()
    semanaDataFull.forEach(d => d.slots.forEach(s => {
      const key = s.aulaGrade.escolaId ?? ''
      if (key && !map.has(key)) map.set(key, s.nomeEscola || key)
    }))
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }))
  }, [semanaDataFull])

  // Dados filtrados por escola
  const semanaData = useMemo(() =>
    filtroEscola
      ? semanaDataFull.map(d => ({ ...d, slots: d.slots.filter(s => (s.aulaGrade.escolaId ?? '') === filtroEscola) }))
      : semanaDataFull,
    [semanaDataFull, filtroEscola])

  const horarios = useMemo(() => {
    const set = new Set<string>()
    semanaData.forEach(d => d.slots.forEach(s => { if (s.aulaGrade.horario) set.add(s.aulaGrade.horario) }))
    return Array.from(set).sort()
  }, [semanaData])

  // Slot ao vivo (sempre atualizado quando aplicacoes/planos mudam)
  const painel = useMemo(() => {
    if (!painelKey) return null
    for (const d of semanaData) {
      const s = d.slots.find(sl => sl.aulaGrade.id === painelKey.aulaGradeId && sl.dataStr === painelKey.dataStr)
      if (s) return s
    }
    return null
  }, [painelKey, semanaData])

  const totalSlots = semanaData.reduce((acc, d) => acc + d.slots.length, 0)
  const totalComPlano = semanaData.reduce((acc, d) => acc + d.slots.filter(s => s.aplicacao).length, 0)
  const ehSemanaAtual = toStr(semana) === toStr(hoje)
  const idxHoje = diasSemana.findIndex(d => d.isHoje)
  function isDiaAberto(idx: number) { return diaExpandido === -2 ? idx === idxHoje || (idxHoje === -1 && idx === 0) : diaExpandido === idx }
  function toggleDia(idx: number) { setDiaExpandido(prev => (prev === idx || (prev === -2 && idx === idxHoje)) ? -1 : idx) }
  function prevSemana() { const d = new Date(semana); d.setDate(d.getDate() - 7); setSemana(d); setPainelKey(null); setDiaExpandido(-2) }
  function nextSemana() { const d = new Date(semana); d.setDate(d.getDate() + 7); setSemana(d); setPainelKey(null); setDiaExpandido(-2) }
  function togglePainel(slot: SlotInfo) {
    const mesmo = painelKey?.aulaGradeId === slot.aulaGrade.id && painelKey?.dataStr === slot.dataStr
    setPainelKey(mesmo ? null : { aulaGradeId: slot.aulaGrade.id, dataStr: slot.dataStr })
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── HEADER: navegação + toggle + filtro ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Navegação de semana */}
          <div className="flex items-center gap-1">
            <button onClick={prevSemana} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 text-lg font-bold transition">‹</button>
            <div className="text-center min-w-[160px]">
              <p className="font-bold text-slate-800 text-sm">{semanaLabel(semana)}</p>
              {!ehSemanaAtual
                ? <button onClick={() => { setSemana(hoje); setPainelKey(null); setDiaExpandido(-2) }} className="text-[11px] text-indigo-500 hover:underline">esta semana</button>
                : <p className="text-[11px] text-slate-400">{totalComPlano}/{totalSlots} com plano</p>
              }
            </div>
            <button onClick={nextSemana} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 text-lg font-bold transition">›</button>
          </div>

          {/* Toggle Grade / Lista */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button onClick={() => { setViewMode('grade'); setPainelKey(null) }} title="Grade por horário"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'grade' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 3v18M14 3v18" />
              </svg>
              Grade
            </button>
            <button onClick={() => setViewMode('lista')} title="Lista por dia"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'lista' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Lista
            </button>
          </div>
        </div>

        {/* ── Filtro por escola ── */}
        {escolasDisponiveis.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Escola:</span>
            <button onClick={() => setFiltroEscola('')}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition ${!filtroEscola ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}>
              Todas
            </button>
            {escolasDisponiveis.map(e => (
              <button key={e.id} onClick={() => setFiltroEscola(e.id)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition ${filtroEscola === e.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}>
                {e.nome}
              </button>
            ))}
          </div>
        )}

        {/* Legenda */}
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
      </div>

      {/* ── CONTEÚDO ── */}
      {totalSlots === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <span className="text-4xl mb-3">📅</span>
          <p className="text-sm font-semibold">{filtroEscola ? 'Nenhuma turma desta escola nesta semana' : 'Nenhuma turma nesta semana'}</p>
          <p className="text-xs mt-1 text-center max-w-xs text-slate-300">Configure a grade semanal em Configurações → Grade Semanal.</p>
        </div>
      ) : viewMode === 'grade' ? (
        <ViewGrade semanaData={semanaData} diasSemana={diasSemana} horarios={horarios} painel={painel} onTogglePainel={togglePainel} onClosePanel={() => setPainelKey(null)} onAplicarPlano={setSelecionandoSlot} />
      ) : (
        <ViewLista semanaData={semanaData} isDiaAberto={isDiaAberto} onToggleDia={toggleDia} painel={painel} onTogglePainel={togglePainel} onClosePanel={() => setPainelKey(null)} onAplicarPlano={setSelecionandoSlot} />
      )}

      {/* ── MODAL SELETOR DE PLANO (melhoria 2) ── */}
      {selecionandoSlot && (
        <SeletorPlano
          slot={selecionandoSlot}
          planos={planos}
          onClose={() => setSelecionandoSlot(null)}
        />
      )}
    </div>
  )
}

// ── VIEW B: Grade ─────────────────────────────────────────────────────────────

interface ViewGradeProps {
  semanaData: Array<{ dataStr: string; label: string; dia: number; mes: string; isHoje: boolean; slots: SlotInfo[] }>
  diasSemana: Array<{ dataStr: string; label: string; dia: number; mes: string; isHoje: boolean }>
  horarios: string[]
  painel: SlotInfo | null
  onTogglePainel: (s: SlotInfo) => void
  onClosePanel: () => void
  onAplicarPlano: (s: SlotInfo) => void
}

function ViewGrade({ semanaData, diasSemana, horarios, painel, onTogglePainel, onClosePanel, onAplicarPlano }: ViewGradeProps) {
  const temSemHorario = semanaData.some(d => d.slots.some(s => !s.aulaGrade.horario))
  const borderColor = '#dde3ea'

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 min-w-0 overflow-x-auto">
        <div className="min-w-[520px] bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor }}>
          {/* Cabeçalho */}
          <div className="grid border-b" style={{ gridTemplateColumns: `64px repeat(5, 1fr)`, borderColor }}>
            <div className="border-r" style={{ borderColor }} />
            {diasSemana.map(d => (
              <div key={d.dataStr} className={`text-center py-3 border-r last:border-r-0 ${d.isHoje ? 'bg-indigo-50' : ''}`} style={{ borderColor }}>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${d.isHoje ? 'text-indigo-500' : 'text-slate-400'}`}>{d.label}</p>
                <p className={`text-xl font-bold leading-tight mt-0.5 ${d.isHoje ? 'text-indigo-600' : 'text-slate-700'}`}>{d.dia}</p>
                <p className={`text-[10px] ${d.isHoje ? 'text-indigo-400' : 'text-slate-400'}`}>{d.mes}</p>
              </div>
            ))}
          </div>

          {/* Linhas */}
          {horarios.map((horario, rowIdx) => (
            <div key={horario} className={`grid border-b last:border-b-0 ${rowIdx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}
              style={{ gridTemplateColumns: `64px repeat(5, 1fr)`, borderColor }}>
              {/* Horário */}
              <div className="flex items-center justify-center border-r py-3" style={{ borderColor }}>
                <span className="text-[11px] font-bold text-slate-500 tabular-nums">{horario}</span>
              </div>
              {/* Células */}
              {diasSemana.map(diaInfo => {
                const dia = semanaData.find(d => d.dataStr === diaInfo.dataStr)!
                const slots = dia.slots.filter(s => s.aulaGrade.horario === horario)
                return (
                  <div key={diaInfo.dataStr} className="border-r last:border-r-0 p-1.5 flex flex-col gap-1" style={{ borderColor, minHeight: 72 }}>
                    {slots.map(slot => <BlocoSlot key={slot.aulaGrade.id} slot={slot} painel={painel} onTogglePainel={onTogglePainel} onAplicarPlano={onAplicarPlano} />)}
                  </div>
                )
              })}
            </div>
          ))}

          {/* Sem horário */}
          {temSemHorario && (
            <div className="grid border-t-2" style={{ gridTemplateColumns: `64px repeat(5, 1fr)`, borderColor }}>
              <div className="flex items-center justify-center p-2 border-r" style={{ borderColor }}>
                <span className="text-[10px] text-slate-300 font-bold">—</span>
              </div>
              {diasSemana.map(diaInfo => {
                const dia = semanaData.find(d => d.dataStr === diaInfo.dataStr)!
                return (
                  <div key={diaInfo.dataStr} className="border-r last:border-r-0 p-1.5 flex flex-col gap-1" style={{ borderColor }}>
                    {dia.slots.filter(s => !s.aulaGrade.horario).map(slot =>
                      <BlocoSlot key={slot.aulaGrade.id} slot={slot} painel={painel} onTogglePainel={onTogglePainel} onAplicarPlano={onAplicarPlano} />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      {painel && <PainelPlano slot={painel} onClose={onClosePanel} />}
    </div>
  )
}

// ── VIEW D: Lista accordion ───────────────────────────────────────────────────

interface ViewListaProps {
  semanaData: Array<{ dataStr: string; labelLongo: string; dia: number; mes: string; isHoje: boolean; idx: number; slots: SlotInfo[] }>
  isDiaAberto: (idx: number) => boolean
  onToggleDia: (idx: number) => void
  painel: SlotInfo | null
  onTogglePainel: (s: SlotInfo) => void
  onClosePanel: () => void
  onAplicarPlano: (s: SlotInfo) => void
}

function ViewLista({ semanaData, isDiaAberto, onToggleDia, painel, onTogglePainel, onClosePanel, onAplicarPlano }: ViewListaProps) {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {semanaData.map(diaInfo => {
          const aberto = isDiaAberto(diaInfo.idx)
          const comPlano = diaInfo.slots.filter(s => s.aplicacao).length
          const semPlano = diaInfo.slots.filter(s => !s.aplicacao).length
          return (
            <div key={diaInfo.dataStr}
              className={`bg-white rounded-2xl overflow-hidden border transition-all ${diaInfo.isHoje ? 'border-indigo-200 shadow-sm' : diaInfo.slots.length === 0 ? 'border-slate-100 opacity-50' : 'border-slate-200'}`}>
              <button type="button" onClick={() => diaInfo.slots.length > 0 && onToggleDia(diaInfo.idx)}
                className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition ${diaInfo.slots.length > 0 ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'} ${diaInfo.isHoje ? 'bg-indigo-50/60' : ''}`}>
                <div className="flex items-center gap-3 min-w-[100px]">
                  <div className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${diaInfo.isHoje ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <span className="text-[8px] font-bold uppercase leading-none opacity-70">{diaInfo.labelLongo.slice(0,3)}</span>
                    <span className="text-sm font-bold leading-none mt-0.5">{diaInfo.dia}</span>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${diaInfo.isHoje ? 'text-indigo-700' : 'text-slate-700'}`}>{diaInfo.labelLongo}</p>
                    <p className="text-[10px] text-slate-400">{diaInfo.dia} {diaInfo.mes}</p>
                  </div>
                </div>
                <div className="flex-1 flex flex-wrap gap-1.5 min-w-0">
                  {diaInfo.slots.length === 0
                    ? <span className="text-xs text-slate-300 italic">Sem aulas</span>
                    : <>
                        {comPlano > 0 && <span className="text-[11px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{comPlano} com plano</span>}
                        {semPlano > 0 && <span className="text-[11px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{semPlano} sem plano</span>}
                      </>
                  }
                </div>
                {diaInfo.slots.length > 0 && (
                  <svg className={`w-4 h-4 text-slate-300 flex-shrink-0 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              {aberto && diaInfo.slots.length > 0 && (
                <div className="border-t border-slate-100">
                  {diaInfo.slots.map(slot => {
                    const cfg = slot.aplicacao ? (STATUS_CFG[slot.aplicacao.status] ?? STATUS_CFG.planejada) : null
                    const isSelected = painel?.aulaGrade.id === slot.aulaGrade.id && painel?.dataStr === slot.dataStr
                    return (
                      <div key={slot.aulaGrade.id}
                        className={`flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-b-0 transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg ? cfg.dot : 'border-2 border-dashed border-slate-300 bg-transparent'}`} />
                        <span className="text-[11px] font-semibold text-slate-500 tabular-nums w-10 flex-shrink-0">{slot.aulaGrade.horario || '—'}</span>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onTogglePainel(slot)}>
                          <p className={`text-sm font-semibold truncate ${cfg ? cfg.text : 'text-slate-600'}`}>{slot.nomeTurma}</p>
                          {slot.plano
                            ? <p className="text-xs text-slate-400 truncate mt-0.5">{slot.plano.titulo}</p>
                            : <p className="text-xs text-slate-300 italic mt-0.5">Sem plano vinculado</p>
                          }
                        </div>
                        {/* Botão + quando sem plano */}
                        {!slot.aplicacao && (
                          <button onClick={() => onAplicarPlano(slot)} title="Aplicar plano nesta turma"
                            className="w-7 h-7 flex items-center justify-center rounded-lg border-2 border-dashed border-indigo-300 text-indigo-400 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 flex-shrink-0 transition font-bold text-sm">
                            +
                          </button>
                        )}
                        {cfg && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.badge}`}>{cfg.label}</span>}
                        <svg className="w-3.5 h-3.5 text-slate-200 flex-shrink-0 cursor-pointer" onClick={() => onTogglePainel(slot)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {painel && <PainelPlano slot={painel} onClose={onClosePanel} />}
    </div>
  )
}

// ── Bloco de slot (compartilhado pela grade) ──────────────────────────────────

function BlocoSlot({ slot, painel, onTogglePainel, onAplicarPlano }: { slot: SlotInfo; painel: SlotInfo | null; onTogglePainel: (s: SlotInfo) => void; onAplicarPlano: (s: SlotInfo) => void }) {
  const cfg = slot.aplicacao ? (STATUS_CFG[slot.aplicacao.status] ?? STATUS_CFG.planejada) : null
  const isSelected = painel?.aulaGrade.id === slot.aulaGrade.id && painel?.dataStr === slot.dataStr
  return (
    <div className={`relative group rounded-lg border transition-all duration-150 ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-1' : ''} ${cfg ? `${cfg.bg} ${cfg.border}` : 'bg-white border-dashed border-slate-300 hover:border-indigo-300 hover:bg-indigo-50/20'}`}>
      <button type="button" onClick={() => onTogglePainel(slot)} className="w-full text-left px-2.5 py-2 active:scale-[.98]">
        <p className={`text-[11px] font-semibold truncate leading-tight ${cfg ? cfg.text : 'text-slate-500'}`}>{slot.nomeTurma}</p>
        {slot.plano
          ? <p className="text-[10px] text-slate-400 truncate mt-0.5">{slot.plano.titulo}</p>
          : <p className="text-[10px] text-slate-400 mt-0.5 italic">Sem plano</p>
        }
        {cfg && <div className="flex items-center gap-1 mt-1"><span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /><span className={`text-[9px] font-bold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span></div>}
      </button>
      {/* Botão + quando sem plano — aparece no hover */}
      {!slot.aplicacao && (
        <button onClick={() => onAplicarPlano(slot)} title="Aplicar plano"
          className="absolute top-1 right-1 w-5 h-5 rounded-md border border-dashed border-indigo-300 text-indigo-400 hover:bg-indigo-50 hover:border-indigo-500 hover:text-indigo-600 flex items-center justify-center text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
          +
        </button>
      )}
    </div>
  )
}

// ── Modal seletor de plano (melhoria 2) ───────────────────────────────────────

function SeletorPlano({ slot, planos, onClose }: { slot: SlotInfo; planos: Plano[]; onClose: () => void }) {
  const { criarAplicacoes } = useAplicacoesContext()
  const [busca, setBusca] = useState('')

  const planosFiltered = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return q ? planos.filter(p => p.titulo?.toLowerCase().includes(q) || (p.faixaEtaria ?? []).some(f => f.toLowerCase().includes(q))) : planos
  }, [planos, busca])

  function aplicar(plano: Plano) {
    criarAplicacoes(plano.id, [{
      anoLetivoId: slot.aulaGrade.anoLetivoId ?? '',
      escolaId: slot.aulaGrade.escolaId ?? '',
      segmentoId: slot.aulaGrade.segmentoId,
      turmaId: slot.aulaGrade.turmaId,
      data: slot.dataStr,
      horario: slot.aulaGrade.horario,
    }])
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-sm sm:mx-4 rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[80dvh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Aplicar plano</h3>
            <p className="text-xs text-slate-400 mt-0.5">{slot.nomeTurma} · {formatarData(slot.dataStr)}{slot.aulaGrade.horario ? ` · ${slot.aulaGrade.horario}` : ''}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition">✕</button>
        </div>
        <div className="px-4 py-3 border-b border-slate-100 shrink-0">
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar plano..." autoFocus
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" />
        </div>
        <div className="overflow-y-auto flex-1">
          {planosFiltered.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">Nenhum plano encontrado</div>
          ) : (
            planosFiltered.map(p => (
              <button key={p.id} type="button" onClick={() => aplicar(p)}
                className="w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-indigo-50 border-b border-slate-50 last:border-b-0 transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-indigo-700">{p.titulo || '(sem título)'}</p>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    {p.nivel && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{p.nivel}</span>}
                    {(p.faixaEtaria ?? []).slice(0,2).map(f => <span key={f} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{f}</span>)}
                  </div>
                </div>
                <svg className="w-4 h-4 text-slate-200 group-hover:text-indigo-400 mt-1 flex-shrink-0 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Painel lateral ────────────────────────────────────────────────────────────

function PainelPlano({ slot, onClose }: { slot: SlotInfo; onClose: () => void }) {
  const { aplicacao, plano, nomeTurma, dataStr } = slot
  const {
    setModalRegistro, setPlanoParaRegistro,
    setRegAnoSel, setRegEscolaSel, setRegSegmentoSel, setRegTurmaSel,
    setVerRegistros, setRegistroEditando, setNovoRegistro,
    setFiltroRegAno, setFiltroRegEscola, setFiltroRegSegmento, setFiltroRegTurma, setFiltroRegData,
  } = useCalendarioContext()
  const { editarPlano } = usePlanosContext()
  const cfg = aplicacao ? (STATUS_CFG[aplicacao.status] ?? STATUS_CFG.planejada) : null
  const atividades = plano?.atividadesRoteiro ?? []

  function abrirRegistro() {
    if (!plano) return
    setPlanoParaRegistro(plano)
    setRegAnoSel(slot.aulaGrade.anoLetivoId ?? '')
    setRegEscolaSel(slot.aulaGrade.escolaId ?? '')
    setRegSegmentoSel(slot.aulaGrade.segmentoId)
    setRegTurmaSel(slot.aulaGrade.turmaId)
    const realizada = aplicacao?.status === 'realizada'
    setVerRegistros(realizada)
    if (realizada) {
      // Filtra por dia — mostra TODAS as turmas/escolas daquele dia
      setFiltroRegAno('')
      setFiltroRegEscola('')
      setFiltroRegSegmento('')
      setFiltroRegTurma(slot.aulaGrade.turmaId) // apenas para auto-expandir
      setFiltroRegData(dataStr)
    } else {
      setFiltroRegAno('')
      setFiltroRegEscola('')
      setFiltroRegSegmento('')
      setFiltroRegTurma('')
      setFiltroRegData('')
    }
    setRegistroEditando(null)
    setNovoRegistro({ dataAula: new Date().toISOString().split('T')[0], resumoAula: '', funcionouBem: '', naoFuncionou: '', proximaAula: '', comportamento: '', poderiaMelhorar: '', resultadoAula: '', anotacoesGerais: '', proximaAulaOpcao: '', urlEvidencia: '' })
    setModalRegistro(true)
  }

  return (
    <div className="w-72 shrink-0 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm self-start sticky top-4">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 flex items-start justify-between gap-2 bg-slate-50/60">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">{nomeTurma}</p>
          {plano ? (
            <button
              type="button"
              onClick={() => { editarPlano(plano); onClose() }}
              className="text-sm font-bold text-slate-800 mt-0.5 leading-snug text-left hover:text-indigo-600 hover:underline underline-offset-2 transition-colors w-full truncate"
              title="Abrir plano"
            >
              {plano.titulo}
            </button>
          ) : (
            <p className="text-slate-400 font-normal italic text-sm mt-0.5">Sem plano vinculado</p>
          )}
        </div>
        <button onClick={onClose} className="text-slate-300 hover:text-slate-500 p-1 rounded-lg shrink-0 transition">✕</button>
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
            {/* Registrar pós-aula */}
            {aplicacao && (
              <button onClick={abrirRegistro}
                className="w-full py-2 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition">
                📝 {aplicacao.status === 'realizada' ? 'Ver / editar registro' : 'Registrar pós-aula'}
              </button>
            )}

            {plano.objetivoGeral && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Objetivo</p>
                <p className="text-xs text-slate-600 leading-relaxed">{stripHTML(plano.objetivoGeral).slice(0, 220)}{stripHTML(plano.objetivoGeral).length > 220 ? '…' : ''}</p>
              </div>
            )}

            {(plano.nivel || (plano.faixaEtaria ?? []).length > 0 || plano.duracao) && (
              <div className="flex flex-wrap gap-1.5">
                {plano.nivel && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{plano.nivel}</span>}
                {plano.duracao && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">⏱ {plano.duracao}</span>}
                {(plano.faixaEtaria ?? []).slice(0, 2).map(f => <span key={f} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{f}</span>)}
              </div>
            )}

            {atividades.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Roteiro · {atividades.length} atividade{atividades.length !== 1 ? 's' : ''}</p>
                <div className="space-y-1.5">
                  {atividades.slice(0, 6).map((a, i) => (
                    <div key={a.id ?? i} className="flex items-start gap-2 text-xs text-slate-600">
                      <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 text-[9px] flex items-center justify-center shrink-0 mt-0.5 font-bold">{i + 1}</span>
                      <span className="flex-1 truncate">{a.nome || '(sem nome)'}</span>
                      {a.duracao && <span className="text-slate-300 shrink-0 tabular-nums">{a.duracao}</span>}
                    </div>
                  ))}
                  {atividades.length > 6 && <p className="text-[10px] text-slate-300 pl-6">+{atividades.length - 6} mais…</p>}
                </div>
              </div>
            )}

            {aplicacao?.adaptacaoTexto && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1">Adaptações desta turma</p>
                <p className="text-xs text-amber-700 leading-relaxed">{stripHTML(aplicacao.adaptacaoTexto).slice(0, 150)}{stripHTML(aplicacao.adaptacaoTexto).length > 150 ? '…' : ''}</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <span className="text-3xl">📋</span>
            <p className="text-slate-400 text-sm mt-2">Nenhum plano vinculado</p>
            <p className="text-xs text-slate-300 mt-1">Aplique um plano a esta turma usando o botão + na grade.</p>
          </div>
        )}
      </div>
    </div>
  )
}
