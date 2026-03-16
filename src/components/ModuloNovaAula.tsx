// ModuloNovaAula.tsx
// Passo 1 do fluxo Nova Aula — renderizado inline no content area (sem modal/overlay).
// Substitui ModalContextoNovaAula que era um popup.

import React, { useState, useEffect, useMemo } from 'react'
import { useCalendarioContext } from '../contexts'
import { useAnoLetivoContext } from '../contexts'
import type { AplicacaoAulaSlot, AulaGrade, AnoLetivo } from '../types'

interface Props {
    preData?: string
    onConfirmar: (slots: AplicacaoAulaSlot[]) => void
    onSemProgramar: () => void
    onCancelar: () => void
}

function getNomeTurma(a: AulaGrade, anosLetivos: AnoLetivo[]): string {
    const ano = anosLetivos.find(al => String(al.id) === String(a.anoLetivoId))
    const esc = ano?.escolas.find(e => String(e.id) === String(a.escolaId))
    const seg = esc?.segmentos.find(s => String(s.id) === String(a.segmentoId))
    const tur = seg?.turmas.find(t => String(t.id) === String(a.turmaId))
    return [seg?.nome, tur?.nome].filter(Boolean).join(' › ') || String(a.turmaId)
}

function getNomeEscola(a: AulaGrade, anosLetivos: AnoLetivo[]): string {
    const ano = anosLetivos.find(al => String(al.id) === String(a.anoLetivoId))
    return ano?.escolas.find(e => String(e.id) === String(a.escolaId))?.nome ?? ''
}

function hoje(): string {
    return new Date().toISOString().slice(0, 10)
}

export default function ModuloNovaAula({ preData, onConfirmar, onSemProgramar, onCancelar }: Props) {
    const { obterTurmasDoDia } = useCalendarioContext()
    const { anosLetivos } = useAnoLetivoContext()

    const [dataSel, setDataSel] = useState<string>(preData ?? hoje())
    const [selecionados, setSelecionados] = useState<Set<string>>(new Set())

    useEffect(() => {
        setSelecionados(new Set())
    }, [dataSel])

    const aulasDoDia = useMemo(() => obterTurmasDoDia(dataSel), [dataSel, obterTurmasDoDia])

    const toggle = (id: string) =>
        setSelecionados(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })

    const toSlot = (a: AulaGrade): AplicacaoAulaSlot => ({
        anoLetivoId: a.anoLetivoId ?? '',
        escolaId: a.escolaId ?? '',
        segmentoId: a.segmentoId,
        turmaId: a.turmaId,
        data: dataSel,
        horario: a.horario,
    })

    const confirmar = () => {
        const slots = aulasDoDia
            .filter(a => selecionados.has(String(a.id)))
            .map(toSlot)
        onConfirmar(slots)
    }

    return (
        <div className="max-w-lg mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-xl font-bold text-slate-800 dark:text-white">Nova Aula</h1>
                <p className="text-sm text-slate-400 dark:text-[#9CA3AF] mt-1">
                    Defina o contexto antes de abrir o editor
                </p>
            </div>

            <div className="v2-card rounded-2xl border border-slate-200 dark:border-[#374151] overflow-hidden">
                <div className="px-6 py-5 space-y-5">

                    {/* Data */}
                    <div>
                        <label className="text-[11px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-widest block mb-2">
                            Data da aula
                        </label>
                        <input
                            type="date"
                            value={dataSel}
                            onChange={e => setDataSel(e.target.value)}
                            style={{ fontSize: 16 }}
                            className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#374151] rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white dark:bg-[#1F2937] text-slate-800 dark:text-white"
                        />
                    </div>

                    {/* Turmas */}
                    <div>
                        <label className="text-[11px] font-bold text-slate-400 dark:text-[#6B7280] uppercase tracking-widest block mb-2">
                            Turmas do dia
                        </label>

                        {aulasDoDia.length === 0 ? (
                            <div className="flex items-start gap-3 py-4 px-4 bg-slate-50 dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-[#374151]">
                                <span className="text-xl mt-0.5">📭</span>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-[#9CA3AF]">
                                        Nenhuma aula agendada para este dia.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={onSemProgramar}
                                        className="text-sm text-indigo-500 hover:underline mt-0.5"
                                    >
                                        Criar sem programar →
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {aulasDoDia.map(aula => {
                                    const id = String(aula.id)
                                    const checked = selecionados.has(id)
                                    const nome = getNomeTurma(aula, anosLetivos)
                                    const escola = getNomeEscola(aula, anosLetivos)
                                    return (
                                        <button key={id} type="button"
                                            onClick={() => toggle(id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left min-h-[44px]
                                                ${checked
                                                    ? 'border-indigo-300 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                                    : 'border-slate-200 dark:border-[#374151] bg-white dark:bg-[#111827] hover:border-slate-300 dark:hover:border-[#4B5563]'}`}>
                                            <span className={`w-5 h-5 rounded-md flex items-center justify-center border-2 shrink-0 transition-all
                                                ${checked ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 dark:border-[#4B5563]'}`}>
                                                {checked && (
                                                    <svg className="w-3 h-3 text-white" viewBox="0 0 10 10" fill="none">
                                                        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                )}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-semibold truncate ${checked ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-[#E5E7EB]'}`}>
                                                    {nome}
                                                </p>
                                                {escola && (
                                                    <p className="text-[12px] text-slate-400 dark:text-[#6B7280] truncate mt-0.5">{escola}</p>
                                                )}
                                            </div>
                                            {aula.horario && (
                                                <span className="text-[12px] text-slate-400 dark:text-[#6B7280] font-medium shrink-0">{aula.horario}</span>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-2 px-6 py-4 border-t border-slate-100 dark:border-[#374151]">
                    <button type="button" onClick={onCancelar}
                        className="py-2.5 px-4 text-sm font-medium text-slate-500 dark:text-[#9CA3AF] hover:text-slate-700 dark:hover:text-white transition">
                        Cancelar
                    </button>
                    <div className="flex-1" />
                    {aulasDoDia.length > 0 && (
                        <button type="button" onClick={onSemProgramar}
                            className="py-2.5 px-4 text-sm font-semibold text-slate-600 dark:text-[#D1D5DB] bg-white dark:bg-[#1F2937] border border-slate-200 dark:border-[#374151] rounded-xl hover:bg-slate-50 dark:hover:bg-[#374151] transition">
                            Sem turma
                        </button>
                    )}
                    <button type="button" onClick={confirmar}
                        disabled={selecionados.size === 0 && aulasDoDia.length > 0}
                        className="py-2.5 px-5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed">
                        Continuar →
                    </button>
                </div>
            </div>
        </div>
    )
}
