// src/components/ModuloRelatorios.tsx
// Módulo de Relatórios — Passo 2: Relatório Mensal Geral

import React, { useState, useMemo } from 'react'
import { usePlanosContext } from '../contexts/PlanosContext'
import { useAplicacoesContext } from '../contexts/AplicacoesContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'

type TipoRelatorio = 'mensal' | 'turma'

interface RelatorioMensal {
    totalAulas: number
    totalTurmas: number
    totalPlanos: number
    totalRegistros: number
    planosUsados: { titulo: string; count: number }[]
    conceitos: { nome: string; count: number }[]
    repertorio: { titulo: string; count: number }[]
    turmas: { nome: string; count: number }[]
}

export default function ModuloRelatorios() {
    const { planos } = usePlanosContext()
    const { aplicacoes } = useAplicacoesContext()
    const { anosLetivos } = useAnoLetivoContext()

    const [tipoSelecionado, setTipoSelecionado] = useState<TipoRelatorio | null>(null)
    const [periodoInicio, setPeriodoInicio] = useState('')
    const [periodoFim, setPeriodoFim] = useState('')
    const [relatorioPronto, setRelatorioPronto] = useState(false)

    // Helper: busca nome da turma pelo id
    const getTurmaNome = (turmaId: string): string => {
        for (const ano of anosLetivos) {
            for (const escola of ano.escolas || []) {
                for (const seg of escola.segmentos || []) {
                    const turma = (seg.turmas || []).find(t => String(t.id) === String(turmaId))
                    if (turma) return `${turma.nome} (${seg.nome})`
                }
            }
        }
        return turmaId
    }

    const relatorio = useMemo<RelatorioMensal | null>(() => {
        if (!relatorioPronto || !periodoInicio || !periodoFim) return null

        // 1. Filtrar aplicações realizadas no período
        const aplicNoPeriodo = aplicacoes.filter(a =>
            a.status === 'realizada' &&
            a.data >= periodoInicio &&
            a.data <= periodoFim
        )

        // 2. Totais básicos
        const totalAulas = aplicNoPeriodo.length
        const totalTurmas = new Set(aplicNoPeriodo.map(a => a.turmaId)).size
        const planosIds = new Set(aplicNoPeriodo.map(a => String(a.planoId)))
        const totalPlanos = planosIds.size

        // 3. Registros pós-aula no período
        let totalRegistros = 0
        planos.forEach(p => {
            (p.registrosPosAula || []).forEach(r => {
                const dataReg = r.data || r.dataAula || ''
                if (dataReg >= periodoInicio && dataReg <= periodoFim) totalRegistros++
            })
        })

        // 4. Planos mais usados
        const contagemPlanos: Record<string, number> = {}
        aplicNoPeriodo.forEach(a => {
            const key = String(a.planoId)
            contagemPlanos[key] = (contagemPlanos[key] || 0) + 1
        })
        const planosUsados = Object.entries(contagemPlanos)
            .map(([id, count]) => {
                const plano = planos.find(p => String(p.id) === id)
                return { titulo: plano?.titulo || `Plano ${id}`, count }
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)

        // 5. Conceitos musicais
        const contagemConceitos: Record<string, number> = {}
        aplicNoPeriodo.forEach(a => {
            const plano = planos.find(p => String(p.id) === String(a.planoId))
            if (!plano) return
            ;(plano.conceitos || []).forEach(c => {
                if (c) contagemConceitos[c] = (contagemConceitos[c] || 0) + 1
            })
        })
        const conceitos = Object.entries(contagemConceitos)
            .map(([nome, count]) => ({ nome, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 15)

        // 6. Repertório utilizado (via atividadesRoteiro)
        const contagemRepertorio: Record<string, number> = {}
        aplicNoPeriodo.forEach(a => {
            const plano = planos.find(p => String(p.id) === String(a.planoId))
            if (!plano) return
            ;(plano.atividadesRoteiro || []).forEach(at => {
                if (at.musicaVinculada) {
                    const t = at.musicaVinculada.trim()
                    if (t) contagemRepertorio[t] = (contagemRepertorio[t] || 0) + 1
                }
                ;(at.musicasVinculadas || []).forEach(m => {
                    const t = m.titulo?.trim()
                    if (t) contagemRepertorio[t] = (contagemRepertorio[t] || 0) + 1
                })
            })
        })
        const repertorio = Object.entries(contagemRepertorio)
            .map(([titulo, count]) => ({ titulo, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 15)

        // 7. Turmas atendidas
        const contagemTurmas: Record<string, number> = {}
        aplicNoPeriodo.forEach(a => {
            contagemTurmas[a.turmaId] = (contagemTurmas[a.turmaId] || 0) + 1
        })
        const turmas = Object.entries(contagemTurmas)
            .map(([id, count]) => ({ nome: getTurmaNome(id), count }))
            .sort((a, b) => b.count - a.count)

        return { totalAulas, totalTurmas, totalPlanos, totalRegistros, planosUsados, conceitos, repertorio, turmas }
    }, [relatorioPronto, periodoInicio, periodoFim, aplicacoes, planos, anosLetivos])

    const tipos = [
        { value: 'mensal' as TipoRelatorio, label: 'Relatório Mensal Geral', descricao: 'Visão geral de todas as aulas e turmas no período selecionado.', icone: '📅' },
        { value: 'turma'  as TipoRelatorio, label: 'Relatório por Turma',    descricao: 'Detalhamento das aulas, repertório e registros de uma turma específica.', icone: '👥' },
    ]

    const podeGerar = !!periodoInicio && !!periodoFim

    function handleGerar() {
        setRelatorioPronto(true)
    }

    function handleLimpar() {
        setRelatorioPronto(false)
    }

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">

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
                        <button key={t.value} type="button"
                            onClick={() => { setTipoSelecionado(t.value); setRelatorioPronto(false) }}
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

            {/* Filtros */}
            {tipoSelecionado === 'mensal' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Filtros</label>
                    <div className="mb-4">
                        <label className="block text-xs text-slate-500 mb-1.5">Período</label>
                        <div className="flex gap-2 items-center">
                            <input type="date" value={periodoInicio} onChange={e => { setPeriodoInicio(e.target.value); setRelatorioPronto(false) }}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" />
                            <span className="text-slate-400 text-xs shrink-0">até</span>
                            <input type="date" value={periodoFim} onChange={e => { setPeriodoFim(e.target.value); setRelatorioPronto(false) }}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" />
                        </div>
                    </div>
                    <button type="button" onClick={handleGerar} disabled={!podeGerar}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        Gerar relatório
                    </button>
                </div>
            )}

            {tipoSelecionado === 'turma' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 text-center text-sm text-slate-400">
                    🚧 Relatório por turma em breve.
                </div>
            )}

            {/* ══════════ RESULTADO DO RELATÓRIO MENSAL ══════════ */}
            {relatorio && tipoSelecionado === 'mensal' && (
                <div className="space-y-5">

                    {/* Cabeçalho do relatório */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-slate-700">Relatório Mensal Geral</h2>
                            <p className="text-xs text-slate-400">{periodoInicio} → {periodoFim}</p>
                        </div>
                        <button type="button" onClick={handleLimpar} className="text-xs text-slate-400 hover:text-slate-600 underline">Limpar</button>
                    </div>

                    {/* Resumo geral */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Aulas realizadas', value: relatorio.totalAulas,    icone: '☀️' },
                            { label: 'Turmas atendidas', value: relatorio.totalTurmas,   icone: '👥' },
                            { label: 'Planos utilizados', value: relatorio.totalPlanos,  icone: '📚' },
                            { label: 'Registros pós-aula', value: relatorio.totalRegistros, icone: '📝' },
                        ].map(item => (
                            <div key={item.label} className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
                                <div className="text-2xl mb-1">{item.icone}</div>
                                <div className="text-2xl font-bold text-slate-800">{item.value}</div>
                                <div className="text-[11px] text-slate-400 mt-0.5">{item.label}</div>
                            </div>
                        ))}
                    </div>

                    {relatorio.totalAulas === 0 && (
                        <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-2xl border border-slate-200">
                            Nenhuma aula realizada encontrada no período selecionado.
                        </div>
                    )}

                    {relatorio.totalAulas > 0 && (
                        <>
                            {/* Planos mais usados */}
                            {relatorio.planosUsados.length > 0 && (
                                <Section titulo="📚 Planos mais usados">
                                    {relatorio.planosUsados.map((p, i) => (
                                        <ItemBarra key={i} label={p.titulo} count={p.count} max={relatorio.planosUsados[0].count} sufixo="aplicação" />
                                    ))}
                                </Section>
                            )}

                            {/* Conceitos musicais */}
                            {relatorio.conceitos.length > 0 && (
                                <Section titulo="🎵 Conceitos musicais trabalhados">
                                    <div className="flex flex-wrap gap-2">
                                        {relatorio.conceitos.map((c, i) => (
                                            <span key={i} className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm">
                                                {c.nome}
                                                <span className="bg-indigo-200 text-indigo-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{c.count}×</span>
                                            </span>
                                        ))}
                                    </div>
                                </Section>
                            )}

                            {/* Repertório */}
                            {relatorio.repertorio.length > 0 && (
                                <Section titulo="🎼 Repertório utilizado">
                                    {relatorio.repertorio.map((r, i) => (
                                        <ItemBarra key={i} label={r.titulo} count={r.count} max={relatorio.repertorio[0].count} sufixo="vez" />
                                    ))}
                                </Section>
                            )}

                            {/* Turmas */}
                            {relatorio.turmas.length > 0 && (
                                <Section titulo="👥 Turmas atendidas">
                                    {relatorio.turmas.map((t, i) => (
                                        <ItemBarra key={i} label={t.nome} count={t.count} max={relatorio.turmas[0].count} sufixo="aula" cor="bg-emerald-400" />
                                    ))}
                                </Section>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

// ── Componentes auxiliares ──

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">{titulo}</h3>
            <div className="space-y-2">{children}</div>
        </div>
    )
}

function ItemBarra({ label, count, max, sufixo, cor = 'bg-indigo-400' }: {
    label: string; count: number; max: number; sufixo: string; cor?: string
}) {
    const pct = max > 0 ? Math.round((count / max) * 100) : 0
    return (
        <div className="flex items-center gap-3">
            <span className="text-sm text-slate-700 w-48 shrink-0 truncate">{label}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className={`${cor} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-slate-400 shrink-0 w-16 text-right">{count} {count === 1 ? sufixo : sufixo + 's'}</span>
        </div>
    )
}
