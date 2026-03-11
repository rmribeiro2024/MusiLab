// src/components/ModuloRelatorios.tsx
// Módulo de Relatórios — Passo 1: estrutura e navegação

import React, { useState } from 'react'

type TipoRelatorio = 'mensal' | 'turma'

export default function ModuloRelatorios() {
    const [tipoSelecionado, setTipoSelecionado] = useState<TipoRelatorio | null>(null)
    const [periodoInicio, setPeriodoInicio] = useState('')
    const [periodoFim, setPeriodoFim] = useState('')
    const [turmaSelecionada, setTurmaSelecionada] = useState('')

    const tipos = [
        {
            value: 'mensal' as TipoRelatorio,
            label: 'Relatório Mensal Geral',
            descricao: 'Visão geral de todas as aulas e turmas no período selecionado.',
            icone: '📅',
        },
        {
            value: 'turma' as TipoRelatorio,
            label: 'Relatório por Turma',
            descricao: 'Detalhamento das aulas, repertório e registros de uma turma específica.',
            icone: '👥',
        },
    ]

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">

            {/* Cabeçalho */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800">📋 Relatórios</h1>
                <p className="text-sm text-slate-500 mt-1">Gere relatórios pedagógicos a partir dos seus dados.</p>
            </div>

            {/* Tipo de relatório */}
            <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Tipo de relatório</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tipos.map(t => (
                        <button
                            key={t.value}
                            type="button"
                            onClick={() => setTipoSelecionado(t.value)}
                            className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
                                tipoSelecionado === t.value
                                    ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            <span className="text-2xl shrink-0">{t.icone}</span>
                            <div>
                                <p className={`text-sm font-semibold ${tipoSelecionado === t.value ? 'text-indigo-700' : 'text-slate-700'}`}>{t.label}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{t.descricao}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Filtros básicos */}
            {tipoSelecionado && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Filtros</label>

                    {/* Período */}
                    <div>
                        <label className="block text-xs text-slate-500 mb-1.5">Período</label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="date"
                                value={periodoInicio}
                                onChange={e => setPeriodoInicio(e.target.value)}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none"
                            />
                            <span className="text-slate-400 text-xs">até</span>
                            <input
                                type="date"
                                value={periodoFim}
                                onChange={e => setPeriodoFim(e.target.value)}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none"
                            />
                        </div>
                    </div>

                    {/* Turma — só aparece no relatório por turma */}
                    {tipoSelecionado === 'turma' && (
                        <div>
                            <label className="block text-xs text-slate-500 mb-1.5">Turma</label>
                            <input
                                type="text"
                                placeholder="Nome da turma..."
                                value={turmaSelecionada}
                                onChange={e => setTurmaSelecionada(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none"
                            />
                        </div>
                    )}

                    {/* Botão gerar (placeholder) */}
                    <button
                        type="button"
                        disabled={!periodoInicio || !periodoFim || (tipoSelecionado === 'turma' && !turmaSelecionada)}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Gerar relatório
                    </button>
                </div>
            )}

        </div>
    )
}
