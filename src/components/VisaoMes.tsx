// src/components/VisaoMes.tsx
// Visão mensal — radar de planejamento. CRITICO = aulas sem plano. Dias OK desaparecem.

import React, { useMemo, useState } from 'react'
import { useCalendarioContext } from '../contexts/CalendarioContext'
import { usePlanejamentoTurmaContext } from '../contexts/PlanejamentoTurmaContext'
import { useAplicacoesContext } from '../contexts/AplicacoesContext'

// ── Helpers ───────────────────────────────────────────────────────────────────

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function getMondayOf(d: Date): Date {
  const r = new Date(d); r.setHours(0, 0, 0, 0)
  const day = r.getDay()
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day))
  return r
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEMANA = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']

type EstadoDia = 'critico' | 'ok' | 'vazio'

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onDiaClick: (date: Date) => void
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function VisaoMes({ onDiaClick }: Props) {
  const hoje = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])

  const [mesRef, setMesRef] = useState<Date>(() => {
    const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d
  })

  const { obterTurmasDoDia } = useCalendarioContext()
  const { planejamentos } = usePlanejamentoTurmaContext()
  const { aplicacoes } = useAplicacoesContext()

  const isDark = document.documentElement.classList.contains('dark')

  // ── Set de lookup — turmas com plano ────────────────────────────────────────
  const turmasComPlano = useMemo(() => {
    const s = new Set<string>()
    planejamentos.forEach(p => { if (p.dataPrevista) s.add(`${p.turmaId}-${p.dataPrevista}`) })
    aplicacoes.forEach(a => { if (a.data && a.status !== 'cancelada') s.add(`${a.turmaId}-${a.data}`) })
    return s
  }, [planejamentos, aplicacoes])

  // ── Grid do mês ─────────────────────────────────────────────────────────────
  const semanas = useMemo<Date[][]>(() => {
    const primeiro = new Date(mesRef.getFullYear(), mesRef.getMonth(), 1)
    const inicio = getMondayOf(primeiro)
    const dias = Array.from({ length: 42 }, (_, i) => addDays(inicio, i))
    const resultado: Date[][] = []
    for (let i = 0; i < 42; i += 7) resultado.push(dias.slice(i, i + 7))
    return resultado.filter(s => s.some(d => d.getMonth() === mesRef.getMonth()))
  }, [mesRef])

  // ── Stats por dia ────────────────────────────────────────────────────────────
  type DiaStats = { total: number; semPlano: number; estado: EstadoDia }

  const stats = useMemo<Record<string, DiaStats>>(() => {
    const map: Record<string, DiaStats> = {}
    semanas.flat().forEach(dia => {
      const ymd = toYMD(dia)
      const aulas = obterTurmasDoDia(ymd)
      const total = aulas.length
      const isPast = dia < hoje
      // Dias passados nunca são CRITICO — planejamento é orientado ao futuro
      const semPlano = isPast
        ? 0
        : aulas.filter(a => !turmasComPlano.has(`${String(a.turmaId)}-${ymd}`)).length
      let estado: EstadoDia
      if (total === 0) estado = 'vazio'
      else if (semPlano > 0) estado = 'critico'
      else estado = 'ok'
      map[ymd] = { total, semPlano, estado }
    })
    return map
  }, [semanas, obterTurmasDoDia, turmasComPlano, hoje])

  // ── Estilo da célula por estado ──────────────────────────────────────────────
  function cellStyle(estado: EstadoDia, doMesAtual: boolean): React.CSSProperties {
    if (!doMesAtual || estado !== 'critico') return {}
    return isDark
      ? { background: 'rgba(245,158,11,0.11)', borderLeft: '3px solid rgba(245,158,11,0.70)' }
      : { background: '#FFFBEB', borderLeft: '3px solid #F59E0B' }
  }

  const mesAnterior = () => setMesRef(m => { const d = new Date(m); d.setMonth(d.getMonth() - 1); return d })
  const mesSeguinte = () => setMesRef(m => { const d = new Date(m); d.setMonth(d.getMonth() + 1); return d })
  const irParaHoje  = () => setMesRef(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d })

  const hojeNoMesAtual = hoje.getFullYear() === mesRef.getFullYear() && hoje.getMonth() === mesRef.getMonth()
  const hojeYmd = toYMD(hoje)

  return (
    <div>
      {/* ── Navegação de mês ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={mesAnterior}
          className="w-[30px] h-[30px] flex items-center justify-center rounded-[7px] border border-[#E6EAF0] dark:border-[#374151] v2-card text-slate-500 dark:text-[#9CA3AF] hover:text-[#5B5FEA] dark:hover:text-[#818cf8] transition-all"
        >
          <i className="fas fa-chevron-left text-[10px]" />
        </button>

        <span className="px-[14px] py-[5px] text-[13.5px] font-semibold text-slate-800 dark:text-[#E5E7EB] border border-[#E6EAF0] dark:border-[#374151] rounded-[7px] v2-card whitespace-nowrap shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none min-w-[164px] text-center">
          {MESES[mesRef.getMonth()]} {mesRef.getFullYear()}
        </span>

        <button
          onClick={mesSeguinte}
          className="w-[30px] h-[30px] flex items-center justify-center rounded-[7px] border border-[#E6EAF0] dark:border-[#374151] v2-card text-slate-500 dark:text-[#9CA3AF] hover:text-[#5B5FEA] dark:hover:text-[#818cf8] transition-all"
        >
          <i className="fas fa-chevron-right text-[10px]" />
        </button>

        {!hojeNoMesAtual && (
          <button
            onClick={irParaHoje}
            className="px-[12px] py-[5px] text-[12.5px] font-medium text-[#5B5FEA] dark:text-[#818cf8] border border-[#E6EAF0] dark:border-[#374151] rounded-[7px] v2-card hover:bg-[#5B5FEA]/[0.08] dark:hover:bg-[#818cf8]/[0.10] transition-all"
          >
            Hoje
          </button>
        )}
      </div>

      {/* ── Grid do calendário ───────────────────────────────────────────────── */}
      <div className="rounded-[10px] border border-[#E6EAF0] dark:border-[#374151] overflow-hidden">

        {/* Cabeçalho — dias da semana */}
        <div className="grid grid-cols-7 border-b border-[#E6EAF0] dark:border-[#374151] bg-[#F6F8FB] dark:bg-[#1F2937]">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-bold tracking-[.7px] uppercase text-slate-400 dark:text-[#6B7280]">
              {d}
            </div>
          ))}
        </div>

        {/* Linhas de semana */}
        {semanas.map((semana, si) => (
          <div key={si} className="grid grid-cols-7">
            {semana.map((dia, di) => {
              const ymd = toYMD(dia)
              const doMesAtual = dia.getMonth() === mesRef.getMonth()
              const isHojeFlag = ymd === hojeYmd
              const isPast = dia < hoje && !isHojeFlag
              const stat = stats[ymd] ?? { total: 0, semPlano: 0, estado: 'vazio' as EstadoDia }
              const isLastRow = si === semanas.length - 1
              const isLastCol = di === 6
              const clickavel = doMesAtual && stat.total > 0

              return (
                <div
                  key={ymd}
                  onClick={() => clickavel && onDiaClick(dia)}
                  style={cellStyle(stat.estado, doMesAtual)}
                  className={[
                    'relative p-2 min-h-[76px] flex flex-col select-none',
                    !isLastRow ? 'border-b border-[#E6EAF0] dark:border-[#374151]' : '',
                    !isLastCol ? 'border-r border-[#E6EAF0] dark:border-[#374151]' : '',
                    clickavel ? 'cursor-pointer hover:brightness-[0.94] dark:hover:brightness-[1.18] transition-[filter] duration-100' : '',
                    !doMesAtual ? 'opacity-[0.15]' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {/* Número do dia */}
                  <span className={[
                    'text-[12px] font-semibold leading-none self-start',
                    isHojeFlag
                      ? 'w-[22px] h-[22px] flex items-center justify-center rounded-full bg-[#5B5FEA] dark:bg-[#818cf8] text-white text-[11px]'
                      : doMesAtual && stat.estado === 'critico'
                        ? 'text-slate-700 dark:text-[#E5E7EB]'
                        : isPast
                          ? 'text-slate-300 dark:text-[#4B5563]'
                          : 'text-slate-400 dark:text-[#6B7280]',
                  ].filter(Boolean).join(' ')}>
                    {dia.getDate()}
                  </span>

                  {/* Indicador de estado — apenas dias com aulas no presente/futuro */}
                  {doMesAtual && !isPast && stat.total > 0 && (
                    <div className="mt-auto">
                      {stat.estado === 'critico' ? (
                        <span
                          className="text-[11px] font-bold leading-none"
                          style={{ color: isDark ? '#FCD34D' : '#B45309' }}
                        >
                          {stat.semPlano} sem plano
                        </span>
                      ) : (
                        <span className="text-[10px] leading-none text-slate-400 dark:text-[#6B7280]">
                          {stat.total} {stat.total === 1 ? 'aula' : 'aulas'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
