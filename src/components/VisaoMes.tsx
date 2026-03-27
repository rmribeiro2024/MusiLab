// src/components/VisaoMes.tsx
// Visão mensal do Planejamento — heat-map de densidade, sem listar aulas individuais.
// Clique num dia navega para a Semana focada naquele dia.

import React, { useMemo, useState } from 'react'
import { useCalendarioContext } from '../contexts/CalendarioContext'
import { usePlanosContext } from '../contexts/PlanosContext'
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
  const { planos } = usePlanosContext()

  const isDark = document.documentElement.classList.contains('dark')

  // ── Sets de lookup ──────────────────────────────────────────────────────────
  const turmasComPlano = useMemo(() => {
    const s = new Set<string>()
    planejamentos.forEach(p => { if (p.dataPrevista) s.add(`${p.turmaId}-${p.dataPrevista}`) })
    aplicacoes.forEach(a => { if (a.data && a.status !== 'cancelada') s.add(`${a.turmaId}-${a.data}`) })
    return s
  }, [planejamentos, aplicacoes])

  const turmasRegistradas = useMemo(() => {
    const s = new Set<string>()
    planos.forEach(plano => {
      ;(plano.registrosPosAula ?? []).forEach((r: any) => {
        const data = r.dataAula ?? r.data ?? ''
        const tid = String(r.turma ?? '')
        if (tid && data) s.add(`${tid}-${data}`)
      })
    })
    return s
  }, [planos])

  // ── Grid do mês ─────────────────────────────────────────────────────────────
  const semanas = useMemo<Date[][]>(() => {
    const primeiro = new Date(mesRef.getFullYear(), mesRef.getMonth(), 1)
    const inicio = getMondayOf(primeiro)
    const dias = Array.from({ length: 42 }, (_, i) => addDays(inicio, i))
    const resultado: Date[][] = []
    for (let i = 0; i < 42; i += 7) resultado.push(dias.slice(i, i + 7))
    return resultado.filter(s => s.some(d => d.getMonth() === mesRef.getMonth()))
  }, [mesRef])

  // ── Stats por dia ───────────────────────────────────────────────────────────
  type DiaStats = { total: number; semPlano: number; naoRegistradas: number }
  const stats = useMemo<Record<string, DiaStats>>(() => {
    const map: Record<string, DiaStats> = {}
    semanas.flat().forEach(dia => {
      const ymd = toYMD(dia)
      const aulas = obterTurmasDoDia(ymd)
      const total = aulas.length
      const isPast = dia < hoje
      const semPlano = !isPast
        ? aulas.filter(a => !turmasComPlano.has(`${String(a.turmaId)}-${ymd}`)).length
        : 0
      const naoRegistradas = isPast
        ? aulas.filter(a => !turmasRegistradas.has(`${String(a.turmaId)}-${ymd}`)).length
        : 0
      map[ymd] = { total, semPlano, naoRegistradas }
    })
    return map
  }, [semanas, obterTurmasDoDia, turmasComPlano, turmasRegistradas, hoje])

  // ── Intensidade de fundo por densidade ─────────────────────────────────────
  function densidadeBg(total: number): string {
    if (total === 0) return 'transparent'
    if (isDark) {
      if (total <= 2) return 'rgba(129,140,248,0.08)'
      if (total <= 5) return 'rgba(129,140,248,0.15)'
      return 'rgba(129,140,248,0.25)'
    }
    if (total <= 2) return '#EEF2FF'
    if (total <= 5) return '#E0E7FF'
    return '#C7D2FE'
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
              const stat = stats[ymd] ?? { total: 0, semPlano: 0, naoRegistradas: 0 }
              const bg = doMesAtual ? densidadeBg(stat.total) : 'transparent'
              const isLastRow = si === semanas.length - 1
              const isLastCol = di === 6
              const clickavel = doMesAtual && stat.total > 0

              return (
                <div
                  key={ymd}
                  onClick={() => clickavel && onDiaClick(dia)}
                  style={{ background: bg }}
                  className={[
                    'relative p-2 min-h-[72px] flex flex-col select-none',
                    !isLastRow ? 'border-b border-[#E6EAF0] dark:border-[#374151]' : '',
                    !isLastCol ? 'border-r border-[#E6EAF0] dark:border-[#374151]' : '',
                    clickavel ? 'cursor-pointer hover:brightness-[0.96] dark:hover:brightness-110 transition-[filter] duration-100' : '',
                    !doMesAtual ? 'opacity-25' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {/* Número do dia */}
                  <span className={[
                    'text-[12px] font-semibold leading-none self-start',
                    isHojeFlag
                      ? 'w-[22px] h-[22px] flex items-center justify-center rounded-full bg-[#5B5FEA] dark:bg-[#818cf8] text-white text-[11px]'
                      : isPast
                        ? 'text-slate-300 dark:text-[#4B5563]'
                        : 'text-slate-600 dark:text-[#9CA3AF]',
                  ].filter(Boolean).join(' ')}>
                    {dia.getDate()}
                  </span>

                  {/* Quantidade de aulas */}
                  {doMesAtual && stat.total > 0 && (
                    <span className="text-[11px] font-bold text-slate-400 dark:text-[#6B7280] self-end mt-auto leading-none">
                      {stat.total}
                    </span>
                  )}

                  {/* Dots de status */}
                  {doMesAtual && (stat.semPlano > 0 || stat.naoRegistradas > 0) && (
                    <div className="absolute bottom-[6px] left-[7px] flex gap-[3px] items-center">
                      {stat.semPlano > 0 && (
                        <span
                          className="w-[5px] h-[5px] rounded-full bg-amber-400 dark:bg-amber-400/80"
                          title="Aulas sem plano"
                        />
                      )}
                      {stat.naoRegistradas > 0 && (
                        <span
                          className="w-[5px] h-[5px] rounded-full bg-slate-300 dark:bg-[#4B5563]"
                          title="Aulas não registradas"
                        />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* ── Legenda ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5 mt-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-[5px] h-[5px] rounded-full bg-amber-400 dark:bg-amber-400/80" />
          <span className="text-[11px] text-slate-400 dark:text-[#6B7280]">Aulas sem plano</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-[5px] h-[5px] rounded-full bg-slate-300 dark:bg-[#4B5563]" />
          <span className="text-[11px] text-slate-400 dark:text-[#6B7280]">Não registradas</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="inline-block w-[10px] h-[10px] rounded-[2px]" style={{ background: isDark ? 'rgba(129,140,248,0.08)' : '#EEF2FF' }} />
          <span className="text-[10px] text-slate-300 dark:text-[#4B5563]">1–2</span>
          <span className="inline-block w-[10px] h-[10px] rounded-[2px]" style={{ background: isDark ? 'rgba(129,140,248,0.15)' : '#E0E7FF' }} />
          <span className="text-[10px] text-slate-300 dark:text-[#4B5563]">3–5</span>
          <span className="inline-block w-[10px] h-[10px] rounded-[2px]" style={{ background: isDark ? 'rgba(129,140,248,0.25)' : '#C7D2FE' }} />
          <span className="text-[10px] text-slate-300 dark:text-[#4B5563]">6+</span>
        </div>
      </div>
    </div>
  )
}
