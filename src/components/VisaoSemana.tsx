// src/components/VisaoSemana.tsx
// Etapa 4 — Visão da Semana (Planejamento)
// Mostra o grid SEG–SEX com turmas agendadas. Foco: preparação (não registro).

import React, { useState, useMemo, useCallback } from 'react'
import { useCalendarioContext } from '../contexts/CalendarioContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import { usePlanosContext } from '../contexts/PlanosContext'
import { useRepertorioContext } from '../contexts/RepertorioContext'
import { usePlanejamentoTurmaContext } from '../contexts/PlanejamentoTurmaContext'
import { useAplicacoesContext } from '../contexts/AplicacoesContext'
import type { AnoLetivo, RegistroPosAula } from '../types'
import { showToast } from '../lib/toast'

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
  const day = d.getDay()
  return (day === 0 || day === 6) ? addDays(monday, 7) : monday
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

// Sugestão: texto neutro uniforme para todos os status
const STATUS_CFG: Record<NonNullable<StatusEfetivo>, {
  emoji: string
  label: string
  acao: string
  textClass: string
}> = {
  concluida:  { emoji: '✓', label: 'Concluída', acao: 'avançar',   textClass: 'text-[#6B7280] dark:text-[#9CA3AF]' },
  incompleta: { emoji: '◑', label: 'Parcial',   acao: 'retomar',   textClass: 'text-[#6B7280] dark:text-[#9CA3AF]' },
  revisao:    { emoji: '◑', label: 'Parcial',   acao: 'retomar',   textClass: 'text-[#6B7280] dark:text-[#9CA3AF]' },
  nao_houve:  { emoji: '—', label: 'Não houve', acao: 'reaplicar', textClass: 'text-[#6B7280] dark:text-[#9CA3AF]' },
}

// Paleta de cores por escola — aplicada no nome da escola (tons suaves)
const ESCOLA_COLORS: { light: string; dark: string }[] = [
  { light: '#7c83d4', dark: '#bfc3f5' },  // indigo suave
  { light: '#3b8fc2', dark: '#9dd5f0' },  // sky suave
  { light: '#2a9c70', dark: '#8edbbf' },  // emerald suave
  { light: '#b8860e', dark: '#e6be6a' },  // amber suave
  { light: '#c0527a', dark: '#f0a8c3' },  // pink suave
  { light: '#7a5bbf', dark: '#c8b4f0' },  // violet suave
  { light: '#c94040', dark: '#f0a8a8' },  // red suave
  { light: '#1a9090', dark: '#7dd8d8' },  // teal suave
]

// ─── Sub-componente: seção "Última aula" / "Aula planejada" ──────────────────

function UltimaAulaSection({ registro, temPlano, foiRegistrada }: { registro: RegistroPosAula | null; temPlano?: boolean; foiRegistrada?: boolean }) {
  const status = registro ? inferStatus(registro) : null
  const cfg = status ? STATUS_CFG[status] : null

  // Quando há plano para esta data: mostra confirmação, não a sugestão
  if (temPlano) {
    return (
      <div className="px-[10px] pt-[5px] pb-[8px] border-t border-emerald-100 dark:border-emerald-500/20">
        <div className="flex items-center gap-[5px]">
          {foiRegistrada ? (
            <span className="text-[10.5px] text-slate-400 dark:text-slate-500">✓ Aula concluída</span>
          ) : (
            <span className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">✓ Aula planejada</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="px-[10px] pt-[5px] pb-[8px] border-t border-[#E6EAF0] dark:border-[#2D3748]">
      {cfg ? (
        <div className="flex items-center gap-[5px]">
          <span className="text-[9px] font-semibold uppercase tracking-[.6px] text-[#94A3B8] dark:text-[#8E99A8] shrink-0">
            Sugestão:
          </span>
          <span className="text-[10.5px] font-medium text-[#6B7280] dark:text-[#9CA3AF]">
            {cfg.emoji} {cfg.acao}
          </span>
        </div>
      ) : (
        <span className="text-[10px] text-slate-400 dark:text-[#6B7280]">sem último registro</span>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function VisaoSemana() {
  const { obterTurmasDoDia } = useCalendarioContext()
  const { anosLetivos } = useAnoLetivoContext()
  const { planos } = usePlanosContext()
  const { setViewMode } = useRepertorioContext()
  const { selecionarTurma, setDataNavegacao, planejamentos, copiarPlanejamento } = usePlanejamentoTurmaContext()
  const { aplicacoes } = useAplicacoesContext()

  // ── Drag-drop entre cards ──────────────────────────────────────────────────
  const [dragSrcId, setDragSrcId] = useState<string | null>(null)   // "${turmaId}-${ymd}"
  const [dragOverId, setDragOverId] = useState<string | null>(null) // "${turmaId}-${ymd}"
  type CopyConfirm = { srcPlanoId: string; srcNome: string; dst: { anoLetivoId: string; escolaId: string; segmentoId: string; turmaId: string }; dstNome: string; dataPrevista: string }
  const [copyConfirm, setCopyConfirm] = useState<CopyConfirm | null>(null)

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

  // ── Mapa escolaId → par de cores { light, dark } ─────────────────────────
  const escolaColorMap = useMemo(() => {
    const map: Record<string, { light: string; dark: string }> = {}
    let idx = 0
    anosLetivos.forEach(ano => {
      ano.escolas.forEach(esc => {
        const key = String(esc.id)
        if (!map[key]) {
          map[key] = ESCOLA_COLORS[idx % ESCOLA_COLORS.length]
          idx++
        }
      })
    })
    return map
  }, [anosLetivos])

  // Set de "turmaId-ymd" para badge ✓ (dia-específico)
  // Inclui: planejamentos do módulo "Aula por Turma" + aplicações do banco de planos
  const turmasComPlano = useMemo(() => {
    const s = new Set<string>()
    planejamentos.forEach(p => {
      if (p.dataPrevista) s.add(`${p.turmaId}-${p.dataPrevista}`)
    })
    // Aplicações criadas via "Agendar" no banco de planos
    aplicacoes.forEach(a => {
      if (a.data && a.status !== 'cancelada') s.add(`${a.turmaId}-${a.data}`)
    })
    return s
  }, [planejamentos, aplicacoes])

  // Set de turmaId para arrastar (qualquer plano da turma, independente de data)
  const turmasArrastaveis = useMemo(() => {
    const s = new Set<string>()
    planejamentos.forEach(p => s.add(String(p.turmaId)))
    return s
  }, [planejamentos])

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

  // Set de "turmaId-ymd" de turmas que têm registro pós-aula naquele dia específico
  const turmasRegistradas = useMemo(() => {
    const s = new Set<string>()
    planos.forEach(plano => {
      (plano.registrosPosAula ?? []).forEach(r => {
        const data = (r as any).dataAula ?? (r as any).data ?? ''
        const tid = String((r as any).turma ?? '')
        if (tid && data) s.add(`${tid}-${data}`)
      })
    })
    return s
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
  const todayYmd = toYMD(hoje)
  const agoraMin = (() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes() })()


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
        {diasDaSemana.map(({ key, short, date, ymd }, idx) => {
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
                    const escolaCor  = aula.escolaId ? (escolaColorMap[String(aula.escolaId)] ?? null) : null
                    const tidStr      = String(aula.turmaId)
                    const tidYmd      = `${tidStr}-${ymd}`
                    const temPlano    = !past && turmasComPlano.has(tidYmd)    // badge ✓ (dia-específico)
                    const eArrastavel = !past && turmasArrastaveis.has(tidStr) // arrastar (qualquer plano)
                    const isDragSrc   = dragSrcId === tidYmd
                    const isDragOver  = dragOverId === tidYmd && dragSrcId !== tidYmd
                    // Aula "ao vivo": hoje, dentro da janela de 50min a partir do horário
                    const match = aula.horario?.match(/^(\d{1,2}):(\d{2})/)
                    const minInicio = match ? parseInt(match[1]) * 60 + parseInt(match[2]) : null
                    const aoVivo = ymd === todayYmd && minInicio !== null && agoraMin >= minInicio && agoraMin <= minInicio + 50
                    // Aula concluída neste dia: opacidade reduzida
                    const foiRegistrada = turmasRegistradas.has(tidYmd)
                    const cardStyle  = escolaCor
                      ? { '--escola-l': escolaCor.light, '--escola-d': escolaCor.dark } as React.CSSProperties
                      : undefined

                    return (
                      <div
                        key={`${aula.turmaId}-${aula.horario}-${i}`}
                        style={cardStyle}
                        draggable={eArrastavel}
                        onClick={!past ? () => {
                          selecionarTurma({
                            anoLetivoId: String(aula.anoLetivoId ?? ''),
                            escolaId:    String(aula.escolaId ?? ''),
                            segmentoId:  String(aula.segmentoId),
                            turmaId:     tidStr,
                          })
                          setDataNavegacao(date)
                          setViewMode('porTurmas')
                        } : undefined}
                        onDragStart={e => { e.dataTransfer.effectAllowed = 'copy'; setDragSrcId(tidYmd) }}
                        onDragOver={e => { if (dragSrcId && dragSrcId !== tidYmd) { e.preventDefault(); setDragOverId(tidYmd) } }}
                        onDragLeave={() => setDragOverId(null)}
                        onDrop={e => {
                          e.preventDefault()
                          if (!dragSrcId || dragSrcId === tidYmd) { setDragOverId(null); return }
                          // dragSrcId = "${srcTurmaId}-${srcYmd}"
                          const srcYmd = dragSrcId.match(/(\d{4}-\d{2}-\d{2})$/)?.[1] ?? ''
                          const srcTidStr = dragSrcId.replace(/-\d{4}-\d{2}-\d{2}$/, '')
                          // busca plano mais recente da turma de origem (independente de data)
                          const srcPlanos = planejamentos
                            .filter(p => String(p.turmaId) === srcTidStr)
                            .sort((a, b) => (b.atualizadoEm ?? b.criadoEm ?? '').localeCompare(a.atualizadoEm ?? a.criadoEm ?? ''))
                          if (!srcPlanos.length) { setDragSrcId(null); setDragOverId(null); return }
                          // encontra nome da turma de origem
                          let srcNome = srcTidStr
                          obterTurmasDoDia(srcYmd || ymd).forEach(a => {
                            if (String(a.turmaId) === srcTidStr)
                              srcNome = getNomeTurma(a.anoLetivoId, a.escolaId, a.segmentoId, a.turmaId, anosLetivos)
                          })
                          setCopyConfirm({
                            srcPlanoId: srcPlanos[0].id,
                            srcNome,
                            dst: { anoLetivoId: String(aula.anoLetivoId ?? ''), escolaId: String(aula.escolaId ?? ''), segmentoId: String(aula.segmentoId), turmaId: tidStr },
                            dstNome: turmaNome,
                            dataPrevista: ymd,
                          })
                          setDragSrcId(null); setDragOverId(null)
                        }}
                        onDragEnd={() => { setDragSrcId(null); setDragOverId(null) }}
                        className={`v2-card rounded-[8px] overflow-hidden transition-all duration-150 ${
                          isDragOver
                            ? 'ring-2 ring-indigo-400 dark:ring-indigo-500 shadow-[0_4px_16px_rgba(91,95,234,0.25)]'
                            : isDragSrc
                            ? 'opacity-50 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                            : !past
                            ? 'shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)] cursor-pointer hover:shadow-[0_4px_12px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_4px_14px_rgba(0,0,0,0.4)] hover:-translate-y-px hover:opacity-100'
                            : 'shadow-[0_1px_3px_rgba(0,0,0,0.06)] cursor-default'
                        } ${foiRegistrada && !isDragSrc ? 'opacity-[0.72]' : ''}`}
                      >
                        {/* card body */}
                        <div className="px-[10px] pt-[8px] pb-[7px]">
                          {aula.horario && (
                            <div className="text-[10.5px] font-semibold text-slate-500 dark:text-[#9CA3AF] mb-[3px] flex items-center gap-1.5">
                              {formatHorario(aula.horario)}
                              {aoVivo && (
                                <span className="inline-flex items-center gap-[3px]">
                                  <span className="w-[5px] h-[5px] rounded-full bg-red-500 animate-pulse" />
                                  <span className="text-[9px] font-bold text-red-500 tracking-wide">AO VIVO</span>
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-1">
                            <div className="text-[13px] font-bold tracking-tight leading-tight text-slate-800 dark:text-[#E5E7EB]">
                              {turmaNome}
                            </div>
                          </div>
                          {escolaNome && (
                            <div className="escola-label text-[10px] font-medium mt-[3px] truncate">
                              {escolaNome}
                            </div>
                          )}
                        </div>

                        {/* seção última aula / aula planejada */}
                        <UltimaAulaSection registro={ultimoReg} temPlano={temPlano} foiRegistrada={foiRegistrada} />
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Modal: confirmar cópia de planejamento ─────────────────────────── */}
      {copyConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setCopyConfirm(null)}>
          <div className="bg-white dark:bg-[#1F2937] rounded-2xl shadow-2xl p-5 max-w-xs w-full" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Copiar planejamento?</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Copiar o planejamento de <strong className="text-slate-700 dark:text-slate-200">{copyConfirm.srcNome}</strong> para <strong className="text-slate-700 dark:text-slate-200">{copyConfirm.dstNome}</strong>?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCopyConfirm(null)}
                className="flex-1 text-sm border border-slate-200 dark:border-[#374151] rounded-xl px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition"
              >Cancelar</button>
              <button
                onClick={() => {
                  copiarPlanejamento(copyConfirm.srcPlanoId, copyConfirm.dst, copyConfirm.dataPrevista)
                  showToast(`Planejamento copiado para ${copyConfirm.dstNome} ✅`)
                  setCopyConfirm(null)
                }}
                className="flex-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3 py-2 font-medium transition"
              >Copiar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
