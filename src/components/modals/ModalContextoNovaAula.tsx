// ModalContextoNovaAula.tsx
// Passo 1 do novo fluxo de Nova Aula: escolher data + turma(s) antes de abrir o editor.
// Se confirmar → os slots são armazenados em PlanosContext e aplicados automaticamente ao salvar.

import React, { useState, useEffect, useMemo } from 'react'
import { useCalendarioContext } from '../../contexts'
import { useAnoLetivoContext } from '../../contexts'
import type { AplicacaoAulaSlot, AulaGrade, AnoLetivo } from '../../types'

interface Props {
    isOpen: boolean
    preData?: string   // data pré-selecionada (vem do contexto Hoje/Semana)
    onConfirmar: (slots: AplicacaoAulaSlot[]) => void
    onSemProgramar: () => void
    onFechar: () => void
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

export default function ModalContextoNovaAula({ isOpen, preData, onConfirmar, onSemProgramar, onFechar }: Props) {
    const { obterTurmasDoDia } = useCalendarioContext()
    const { anosLetivos } = useAnoLetivoContext()

    const [dataSel, setDataSel] = useState<string>(preData ?? hoje())
    const [selecionados, setSelecionados] = useState<Set<string>>(new Set())

    // Sincronizar data quando a prop mudar (ex: usuário abre de Hoje vs Semana)
    useEffect(() => {
        if (isOpen) {
            setDataSel(preData ?? hoje())
            setSelecionados(new Set())
        }
    }, [isOpen, preData])

    // Resetar seleção quando a data muda
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

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
            onClick={onFechar}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-xl overflow-hidden"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
                    <div>
                        <h2 className="text-base font-semibold text-slate-800">Nova Aula</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Onde esta aula será usada?</p>
                    </div>
                    <button onClick={onFechar}
                        className="text-slate-300 hover:text-slate-500 text-xl leading-none transition">×</button>
                </div>

                {/* Body */}
                <div className="px-5 pt-4 pb-5 space-y-4">

                    {/* Data */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                            Data
                        </label>
                        <input
                            type="date"
                            value={dataSel}
                            onChange={e => setDataSel(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white"
                        />
                    </div>

                    {/* Turmas */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                            Turmas do dia
                        </label>

                        {aulasDoDia.length === 0 ? (
                            <div className="flex items-center gap-2 py-3 px-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-slate-400 text-sm">📭</span>
                                <p className="text-xs text-slate-400">Nenhuma aula agendada para este dia.<br/>
                                    <span className="text-indigo-500 cursor-pointer hover:underline"
                                        onClick={onSemProgramar}>
                                        Configure a Grade Semanal em Configurações.
                                    </span>
                                </p>
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
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left
                                                ${checked
                                                    ? 'border-indigo-300 bg-indigo-50'
                                                    : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                            <span className={`w-4 h-4 rounded flex items-center justify-center border-2 shrink-0 transition-all
                                                ${checked ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>
                                                {checked && (
                                                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                                                        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                )}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-semibold truncate ${checked ? 'text-indigo-700' : 'text-slate-700'}`}>
                                                    {nome}
                                                </p>
                                                {escola && (
                                                    <p className="text-[11px] text-slate-400 truncate">{escola}</p>
                                                )}
                                            </div>
                                            {aula.horario && (
                                                <span className="text-[11px] text-slate-400 font-medium shrink-0">{aula.horario}</span>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-2 px-5 pb-5 pt-1">
                    <button type="button" onClick={onSemProgramar}
                        className="flex-1 py-2.5 text-sm font-semibold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">
                        Criar sem programar
                    </button>
                    <button type="button" onClick={confirmar}
                        disabled={selecionados.size === 0 || aulasDoDia.length === 0}
                        className="flex-1 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed">
                        Continuar →
                    </button>
                </div>
            </div>
        </div>
    )
}
