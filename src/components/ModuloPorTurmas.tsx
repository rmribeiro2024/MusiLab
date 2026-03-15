// src/components/ModuloPorTurmas.tsx
// Etapa 6 — Planejar por Turma
// Foco: "O que vou dar para esta turma na próxima aula?"

import React, { useState, useMemo } from 'react'
import { useCalendarioContext } from '../contexts/CalendarioContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import { usePlanejamentoTurmaContext } from '../contexts/PlanejamentoTurmaContext'
import type { TurmaSelecionada } from '../contexts/PlanejamentoTurmaContext'
import type { AnoLetivo } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMondayOf(date: Date): Date {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const day = d.getDay()
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
    return d
}

function addDays(date: Date, n: number): Date {
    const d = new Date(date)
    d.setDate(d.getDate() + n)
    return d
}

function toYMD(date: Date): string {
    return date.toISOString().slice(0, 10)
}

function formatDataCurta(ymd: string): string {
    const [, mm, dd] = ymd.split('-')
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
    return `${parseInt(dd)} ${meses[parseInt(mm) - 1]}`
}

function getDiaSemana(date: Date): string {
    const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
    return dias[date.getDay()]
}

// Avança apenas para dias úteis (Seg–Sex)
function stepDiaUtil(date: Date, dir: 1 | -1): Date {
    let d = addDays(date, dir)
    while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, dir)
    return d
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

function getNomeEscola(
    anoLetivoId: string | undefined,
    escolaId: string | undefined,
    anosLetivos: AnoLetivo[]
): string {
    if (!anoLetivoId || !escolaId) return ''
    // eslint-disable-next-line eqeqeq
    const ano = anosLetivos.find(a => a.id == anoLetivoId)
    // eslint-disable-next-line eqeqeq
    return ano?.escolas.find(e => e.id == escolaId)?.nome ?? ''
}

// ─── Sub-componente: Seletor de turma (sidebar compacta) ─────────────────────

interface SeletorProps {
    dataSelecionada: Date
    onDataChange: (d: Date) => void
    turmaSelecionada: TurmaSelecionada | null
    onSelecionarTurma: (t: TurmaSelecionada) => void
}

function SeletorTurma({ dataSelecionada, onDataChange, turmaSelecionada, onSelecionarTurma }: SeletorProps) {
    const { obterTurmasDoDia } = useCalendarioContext()
    const { anosLetivos } = useAnoLetivoContext()

    const ymd = toYMD(dataSelecionada)
    const aulasDoDia = useMemo(
        () => obterTurmasDoDia(ymd).sort((a, b) => (a.horario ?? '').localeCompare(b.horario ?? '')),
        [ymd, obterTurmasDoDia]
    )

    const diaNome  = getDiaSemana(dataSelecionada)
    const diaNum   = dataSelecionada.getDate()
    const mesNomes = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
    const mesNome  = mesNomes[dataSelecionada.getMonth()]

    return (
        <aside className="w-52 flex-shrink-0 flex flex-col gap-3">

            {/* ── Navegação de data ── */}
            <div className="v2-card rounded-[10px] border border-[#E6EAF0] dark:border-[#374151] overflow-hidden">
                {/* Cabeçalho data */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#E6EAF0] dark:border-[#374151]">
                    <button
                        onClick={() => onDataChange(stepDiaUtil(dataSelecionada, -1))}
                        className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#374151] transition text-sm"
                    >‹</button>

                    <div className="text-center">
                        <div className="text-[10px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#6B7280]">
                            {diaNome}
                        </div>
                        <div className="text-[18px] font-bold leading-tight text-slate-800 dark:text-[#E5E7EB]">
                            {diaNum}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-[#6B7280]">{mesNome}</div>
                    </div>

                    <button
                        onClick={() => onDataChange(stepDiaUtil(dataSelecionada, 1))}
                        className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#374151] transition text-sm"
                    >›</button>
                </div>

                {/* Lista de turmas do dia */}
                <div className="py-1">
                    {aulasDoDia.length === 0 ? (
                        <div className="px-3 py-4 text-center text-[11px] text-slate-400 dark:text-[#6B7280]">
                            Nenhuma turma neste dia
                        </div>
                    ) : (
                        aulasDoDia.map((aula, i) => {
                            const nome   = getNomeTurma(aula.anoLetivoId, aula.escolaId, aula.segmentoId, aula.turmaId, anosLetivos)
                            const escola = getNomeEscola(aula.anoLetivoId, aula.escolaId, anosLetivos)
                            const isAtiva = turmaSelecionada
                                // eslint-disable-next-line eqeqeq
                                ? String(turmaSelecionada.turmaId) == String(aula.turmaId)
                                : false

                            return (
                                <button
                                    key={`${aula.turmaId}-${i}`}
                                    onClick={() => onSelecionarTurma({
                                        anoLetivoId: String(aula.anoLetivoId ?? ''),
                                        escolaId:    String(aula.escolaId ?? ''),
                                        segmentoId:  String(aula.segmentoId),
                                        turmaId:     String(aula.turmaId),
                                    })}
                                    className={`w-full text-left px-3 py-2 flex items-start gap-2 transition-all ${
                                        isAtiva
                                            ? 'bg-indigo-50 dark:bg-indigo-950/40'
                                            : 'hover:bg-slate-50 dark:hover:bg-[#273344]'
                                    }`}
                                >
                                    {/* Indicador lateral */}
                                    <span className={`mt-[3px] w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                        isAtiva ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-[#4B5563]'
                                    }`} />
                                    <div className="min-w-0">
                                        <div className={`text-[12.5px] font-semibold leading-tight truncate ${
                                            isAtiva
                                                ? 'text-indigo-700 dark:text-indigo-400'
                                                : 'text-slate-700 dark:text-[#D1D5DB]'
                                        }`}>
                                            {nome}
                                        </div>
                                        {escola && (
                                            <div className="text-[10px] text-slate-400 dark:text-[#6B7280] truncate mt-[1px]">
                                                {escola}
                                            </div>
                                        )}
                                        {aula.horario && (
                                            <div className="text-[10px] text-slate-400 dark:text-[#6B7280] mt-[1px]">
                                                {aula.horario.replace(':','h').replace(/h00$/, 'h')}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            )
                        })
                    )}
                </div>
            </div>

            {/* ── Atalho: semana atual ── */}
            <button
                onClick={() => {
                    const seg = getMondayOf(new Date())
                    const hoje = new Date(); hoje.setHours(0,0,0,0)
                    // Se hoje for útil, vai para hoje; senão vai para segunda
                    const target = (hoje.getDay() >= 1 && hoje.getDay() <= 5) ? hoje : seg
                    onDataChange(target)
                }}
                className="text-[11px] text-center text-slate-400 dark:text-[#6B7280] hover:text-indigo-500 dark:hover:text-indigo-400 transition"
            >
                ir para hoje
            </button>
        </aside>
    )
}

// ─── Sub-componente: Estado vazio ─────────────────────────────────────────────

function EstadoVazio({ dataYmd }: { dataYmd: string }) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <div className="text-4xl mb-4">👈</div>
            <p className="text-[14px] font-semibold text-slate-600 dark:text-[#9CA3AF] mb-1">
                Selecione uma turma
            </p>
            <p className="text-[12px] text-slate-400 dark:text-[#6B7280]">
                {formatDataCurta(dataYmd)} · escolha uma turma ao lado para planejar
            </p>
        </div>
    )
}

// ─── Sub-componente: Conteúdo (placeholder da etapa 6C em diante) ─────────────

function ConteudoTurma({ turmaSelecionada }: { turmaSelecionada: TurmaSelecionada }) {
    const { anosLetivos } = useAnoLetivoContext()
    const nome   = getNomeTurma(turmaSelecionada.anoLetivoId, turmaSelecionada.escolaId, turmaSelecionada.segmentoId, turmaSelecionada.turmaId, anosLetivos)
    const escola = getNomeEscola(turmaSelecionada.anoLetivoId, turmaSelecionada.escolaId, anosLetivos)

    return (
        <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* Header da turma */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-[17px] font-bold tracking-tight text-slate-800 dark:text-[#E5E7EB] leading-tight">
                        {nome}
                    </h2>
                    {escola && (
                        <p className="text-[12px] text-slate-400 dark:text-[#6B7280] mt-0.5">{escola}</p>
                    )}
                </div>
            </div>

            {/* ── Placeholder — será substituído na etapa 6C ── */}
            <div className="v2-card rounded-[10px] border border-[#E6EAF0] dark:border-[#374151] p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#6B7280]">
                        Aula anterior
                    </span>
                </div>
                <p className="text-[12px] text-slate-400 dark:text-[#6B7280] italic">
                    — em construção · etapa 6C —
                </p>
            </div>

            <div className="v2-card rounded-[10px] border border-[#E6EAF0] dark:border-[#374151] p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#6B7280]">
                        O que fazer agora?
                    </span>
                </div>
                <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-[#E6EAF0] dark:border-[#374151] text-slate-500 dark:text-[#9CA3AF] hover:bg-slate-50 dark:hover:bg-[#273344] transition">
                        🔄 Adaptar
                    </button>
                    <button className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-[#E6EAF0] dark:border-[#374151] text-slate-500 dark:text-[#9CA3AF] hover:bg-slate-50 dark:hover:bg-[#273344] transition">
                        🏛 Importar
                    </button>
                    <button className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-[#E6EAF0] dark:border-[#374151] text-slate-500 dark:text-[#9CA3AF] hover:bg-slate-50 dark:hover:bg-[#273344] transition">
                        ✏️ Novo
                    </button>
                </div>
                <p className="text-[12px] text-slate-400 dark:text-[#6B7280] italic">
                    — formulário · etapa 6D —
                </p>
            </div>

        </div>
    )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ModuloPorTurmas() {
    const { selecionarTurma, turmaSelecionada } = usePlanejamentoTurmaContext()

    // Data local — independente do AgendaSemanal e VisaoSemana
    const [dataSelecionada, setDataSelecionada] = useState<Date>(() => {
        const d = new Date(); d.setHours(0,0,0,0)
        // Se fim de semana, avança para segunda
        if (d.getDay() === 0) return addDays(d, 1)
        if (d.getDay() === 6) return addDays(d, 2)
        return d
    })

    const ymd = toYMD(dataSelecionada)

    return (
        <div className="flex flex-col gap-6">

            {/* Cabeçalho */}
            <div>
                <h1 className="text-[17px] font-bold tracking-tight text-slate-800 dark:text-[#E5E7EB]">
                    Planejar por Turma
                </h1>
                <p className="text-[12.5px] text-slate-500 dark:text-[#9CA3AF] mt-1">
                    O que vou dar para esta turma na próxima aula?
                </p>
            </div>

            {/* Layout: sidebar + conteúdo */}
            <div className="flex gap-5 items-start">
                <SeletorTurma
                    dataSelecionada={dataSelecionada}
                    onDataChange={setDataSelecionada}
                    turmaSelecionada={turmaSelecionada}
                    onSelecionarTurma={selecionarTurma}
                />

                {turmaSelecionada
                    ? <ConteudoTurma turmaSelecionada={turmaSelecionada} />
                    : <EstadoVazio dataYmd={ymd} />
                }
            </div>

        </div>
    )
}
