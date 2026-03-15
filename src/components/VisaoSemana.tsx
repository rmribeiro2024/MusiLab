// src/components/VisaoSemana.tsx
// Etapa 4 — Visão da Semana (Planejamento)
// Mostra o grid SEG–SEX com turmas agendadas. Foco: preparação (não registro).

import React, { useState, useMemo } from 'react'
import { useCalendarioContext } from '../contexts/CalendarioContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import { usePlanosContext } from '../contexts/PlanosContext'
import type { AnoLetivo, RegistroPosAula } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DIAS = [
  { key: 'seg', short: 'Seg' },
  { key: 'ter', short: 'Ter' },
  { key: 'qua', short: 'Qua' },
  { key: 'qui', short: 'Qui' },
  { key: 'sex', short: 'Sex' },
] as const

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

// Para planejamento: domingo já aponta para a semana seguinte
function getSemanaAtualInicio(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const monday = getMondayOf(d)
  return d.getDay() === 0 ? addDays(monday, 7) : monday
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toYMD(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function formatHorario(h: string): string {
  // "08:30" → "08h30" | "08:00" → "08h"
  if (!h) return ''
  const [hh, mm] = h.split(':')
  return mm === '00' ? `${hh}h` : `${hh}h${mm}`
}

// ── Helper de nome de turma (mesmo padrão do AgendaSemanal) ──────────────────
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

// ─── Status da última aula ────────────────────────────────────────────────────

type StatusEfetivo = 'concluida' | 'revisao' | 'incompleta' | 'nao_houve' | null

/** Migra campos legados para o novo statusAula unificado */
function inferStatus(r: RegistroPosAula): StatusEfetivo {
  if (r.statusAula === 'parcial') return 'incompleta'
  if (r.statusAula) return r.statusAula as StatusEfetivo
  // legado: proximaAulaOpcao
  if (r.proximaAulaOpcao === 'nova')         return 'concluida'
  if (r.proximaAulaOpcao === 'revisar-nova') return 'revisao'
  if (r.proximaAulaOpcao === 'revisar')      return 'incompleta'
  // legado: resultadoAula
  if (r.resultadoAula === 'bem' || r.resultadoAula === 'funcionou') return 'concluida'
  if (r.resultadoAula === 'parcial')                                 return 'incompleta'
  if (r.resultadoAula === 'nao' || r.resultadoAula === 'nao_funcionou') return 'incompleta'
  return null
}

const STATUS_CFG: Record<NonNullable<StatusEfetivo>, {
  emoji: string
  label: string
  acao: string
  textClass: string
  borderClass: string   // borda suave ~45% opacidade
}> = {
  // Incompleta = neutro (estado padrão, sem alarme visual)
  incompleta: { emoji: '↩', label: 'Incompleta',         acao: 'Retomar de onde parou',   textClass: 'text-[#6B7280] dark:text-[#9CA3AF]',   borderClass: 'border-[#6B7280]/45 dark:border-[#9CA3AF]/30'  },
  // Estados excepcionais = com cor
  concluida:  { emoji: '✓', label: 'Concluída',          acao: 'Criar nova aula',          textClass: 'text-[#16a34a] dark:text-[#4ade80]',   borderClass: 'border-[#16a34a]/45 dark:border-[#4ade80]/45'  },
  revisao:    { emoji: '↻', label: 'Necessário revisar', acao: 'depois avançar',            textClass: 'text-[#2563eb] dark:text-[#60a5fa]',   borderClass: 'border-[#2563eb]/45 dark:border-[#60a5fa]/45'  },
  nao_houve:  { emoji: '✗', label: 'Não houve',          acao: 'Reaplicar aula anterior',   textClass: 'text-[#64748b] dark:text-[#94a3b8]',   borderClass: 'border-[#64748b]/45 dark:border-[#94a3b8]/40'  },
}

/** Retorna a classe Tailwind de borda esquerda com base no status da última aula */
function getStatusBorderClass(registro: RegistroPosAula | null): string {
  if (!registro) return 'border-[#374151]/60 dark:border-[#374151]/60'
  const status = inferStatus(registro)
  if (!status) return 'border-[#374151]/60 dark:border-[#374151]/60'
  return STATUS_CFG[status].borderClass
}

// ─── Sub-componente: seção "Última aula" ─────────────────────────────────────

function UltimaAulaSection({ registro }: { registro: RegistroPosAula | null }) {
  const status = registro ? inferStatus(registro) : null
  const cfg = status ? STATUS_CFG[status] : null

  return (
    <div className="px-[10px] pb-[8px]">
      <div className="h-px bg-[#E6EAF0] dark:bg-[#3D4F68] mb-[6px]" />
      {cfg ? (
        <div className="flex items-center gap-[4px] flex-wrap">
          <span className={`text-[10.5px] font-semibold ${cfg.textClass}`}>
            {cfg.emoji} {cfg.label}
          </span>
          <span className="text-[9px] text-slate-300 dark:text-[#4B5563]">·</span>
          <span className="text-[10px] text-slate-400 dark:text-[#6B7280]">{cfg.acao}</span>
        </div>
      ) : (
        <span className="text-[10px] text-slate-300 dark:text-[#4B5563]">— sem registro</span>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function VisaoSemana() {
  const { obterTurmasDoDia } = useCalendarioContext()
  const { anosLetivos } = useAnoLetivoContext()
  const { planos } = usePlanosContext()

  // Estado local de navegação — não interfere com AgendaSemanal
  const [semanaInicio, setSemanaInicio] = useState<Date>(() => getSemanaAtualInicio())

  const hoje = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const semanaFim = addDays(semanaInicio, 4) // sexta-feira

  // Datas de cada coluna
  const diasDaSemana = DIAS.map((d, i) => ({
    ...d,
    date: addDays(semanaInicio, i),
    ymd:  toYMD(addDays(semanaInicio, i)),
  }))

  // ── Aulas por dia — usa obterTurmasDoDia (mesmo dado que o AgendaSemanal) ─
  const aulasPorDia = useMemo(() =>
    diasDaSemana.map(({ key, ymd }) => ({
      key,
      aulas: obterTurmasDoDia(ymd)
        .sort((a, b) => (a.horario ?? '').localeCompare(b.horario ?? '')),
    }))
  , [diasDaSemana, obterTurmasDoDia])

  // ── Mapa turmaId → último registro pós-aula ──────────────────────────────
  const ultimoRegistroMap = useMemo(() => {
    const map: Record<string, RegistroPosAula> = {}
    planos.forEach(plano => {
      (plano.registrosPosAula ?? []).forEach(r => {
        const tid = String(r.turma ?? '')
        if (!tid) return
        const atual = map[tid]
        const dataR = r.dataAula ?? r.dataRegistro ?? r.data ?? ''
        const dataA = atual ? (atual.dataAula ?? atual.dataRegistro ?? atual.data ?? '') : ''
        if (!atual || dataR > dataA) map[tid] = r
      })
    })
    return map
  }, [planos])

  // ── Rótulo do intervalo da semana ─────────────────────────────────────────
  const semanaLabel = useMemo(() => {
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
    const d1 = semanaInicio, d2 = semanaFim
    if (d1.getMonth() === d2.getMonth())
      return `${d1.getDate()}–${d2.getDate()} ${meses[d1.getMonth()]} ${d1.getFullYear()}`
    return `${d1.getDate()} ${meses[d1.getMonth()]} – ${d2.getDate()} ${meses[d2.getMonth()]} ${d1.getFullYear()}`
  }, [semanaInicio, semanaFim])

  const isHoje  = (d: Date) => toYMD(d) === toYMD(hoje)
  const isPast  = (d: Date) => d < hoje && !isHoje(d)
  const isSemanaAtual = toYMD(semanaInicio) === toYMD(getSemanaAtualInicio())

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-0">

      {/* ── Cabeçalho: título + navegação de semana ── */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-[17px] font-bold tracking-tight text-slate-800 dark:text-[#E5E7EB]">
            Visão da Semana
          </h1>
          <p className="text-[12.5px] text-slate-500 dark:text-[#9CA3AF] mt-1">
            O que preciso preparar esta semana?
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* ← Anterior */}
          <button
            onClick={() => setSemanaInicio(prev => addDays(prev, -7))}
            title="Semana anterior"
            className="w-[30px] h-[30px] flex items-center justify-center rounded-[7px] border border-[#E6EAF0] dark:border-[#374151] v2-card text-slate-500 dark:text-[#9CA3AF] hover:border-[#5B5FEA]/50 dark:hover:border-[#818cf8]/50 hover:text-[#5B5FEA] dark:hover:text-[#818cf8] transition-all"
          >
            <i className="fas fa-chevron-left text-[10px]" />
          </button>

          {/* Label semana */}
          <span className="px-[14px] py-[5px] text-[13.5px] font-semibold text-slate-800 dark:text-[#E5E7EB] border border-[#E6EAF0] dark:border-[#374151] rounded-[7px] v2-card whitespace-nowrap shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none">
            {semanaLabel}
          </span>

          {/* Próxima → */}
          <button
            onClick={() => setSemanaInicio(prev => addDays(prev, 7))}
            title="Próxima semana"
            className="w-[30px] h-[30px] flex items-center justify-center rounded-[7px] border border-[#E6EAF0] dark:border-[#374151] v2-card text-slate-500 dark:text-[#9CA3AF] hover:border-[#5B5FEA]/50 dark:hover:border-[#818cf8]/50 hover:text-[#5B5FEA] dark:hover:text-[#818cf8] transition-all"
          >
            <i className="fas fa-chevron-right text-[10px]" />
          </button>

          {/* Hoje — só aparece se não for a semana atual */}
          {!isSemanaAtual && (
            <button
              onClick={() => setSemanaInicio(getSemanaAtualInicio())}
              className="px-[12px] py-[5px] text-[12.5px] font-medium text-[#5B5FEA] dark:text-[#818cf8] border border-[#E6EAF0] dark:border-[#374151] rounded-[7px] v2-card hover:bg-[#5B5FEA]/[0.08] dark:hover:bg-[#818cf8]/[0.10] transition-all"
            >
              Hoje
            </button>
          )}
        </div>
      </div>

      {/* ── Grid semanal ── */}
      <div className="grid grid-cols-5 gap-2">
        {diasDaSemana.map(({ key, short, date }, idx) => {
          const aulas = aulasPorDia[idx]?.aulas ?? []
          const past  = isPast(date)
          const today = isHoje(date)

          return (
            <div
              key={key}
              className={`flex flex-col ${today ? 'bg-[#5B5FEA]/[0.04] dark:bg-[#818cf8]/[0.06] rounded-[10px] px-[2px]' : ''}`}
            >
              {/* Header do dia */}
              <div className="flex flex-col items-center pb-3 mb-1.5 border-b border-[#E6EAF0] dark:border-[#2d3748]">
                <span className={`text-[10.5px] font-bold tracking-[.7px] uppercase mb-[5px] ${
                  today ? 'text-[#5B5FEA] dark:text-[#818cf8]' : 'text-slate-400 dark:text-[#6B7280]'
                }`}>
                  {short}
                </span>
                <span className={`w-[30px] h-[30px] flex items-center justify-center rounded-full text-[14px] font-semibold ${
                  today
                    ? 'bg-[#5B5FEA] dark:bg-[#818cf8] text-white'
                    : past
                      ? 'text-slate-300 dark:text-[#4B5563]'
                      : 'text-slate-600 dark:text-[#9CA3AF]'
                }`}>
                  {date.getDate()}
                </span>
              </div>

              {/* Blocos de aula */}
              <div className={`flex flex-col gap-1 ${past ? 'opacity-[0.42]' : ''}`}>
                {aulas.length === 0 ? (
                  <div className="text-center py-5 text-[11.5px] text-slate-300 dark:text-[#374151]">—</div>
                ) : (
                  aulas.map((aula, i) => {
                    const turmaNome  = getNomeTurma(aula.anoLetivoId, aula.escolaId, aula.segmentoId, aula.turmaId, anosLetivos)
                    const escolaNome = getNomeEscola(aula.anoLetivoId, aula.escolaId, anosLetivos)
                    const ultimoReg  = ultimoRegistroMap[String(aula.turmaId)] ?? null
                    const borderClass = getStatusBorderClass(ultimoReg)

                    return (
                      <div
                        key={`${aula.turmaId}-${aula.horario}-${i}`}
                        className={`v2-card border-0 border-l-[4px] ${borderClass} rounded-[8px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)] ${
                          !past
                            ? 'cursor-pointer hover:shadow-[0_4px_12px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_4px_14px_rgba(0,0,0,0.4)] hover:-translate-y-px transition-all duration-150'
                            : 'cursor-default'
                        }`}
                      >
                        {/* card body */}
                        <div className="px-[10px] pt-[8px] pb-[7px]">
                          {aula.horario && (
                            <div className="text-[10.5px] font-semibold text-slate-500 dark:text-[#9CA3AF] mb-[3px]">
                              {formatHorario(aula.horario)}
                            </div>
                          )}
                          <div className="text-[13px] font-bold tracking-tight leading-tight text-slate-800 dark:text-[#E5E7EB]">
                            {turmaNome}
                          </div>
                          {escolaNome && (
                            <div className="text-[10px] text-slate-400 dark:text-[#9CA3AF] mt-[3px] truncate">
                              {escolaNome}
                            </div>
                          )}
                        </div>

                        {/* seção última aula */}
                        <UltimaAulaSection registro={ultimoReg} />
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
