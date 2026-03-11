// src/components/ModuloRelatorios.tsx
// Módulo de Relatórios — Passo 3: Relatório por Turma

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

interface AulaLinha {
    data: string
    planoTitulo: string
    status: string
}

interface RelatorioTurma {
    turmaNome: string
    totalAulas: number
    linhaDoTempo: AulaLinha[]
    conceitos: { nome: string; count: number }[]
    repertorio: { titulo: string; count: number }[]
    planos: { titulo: string; count: number }[]
}

interface TurmaOpcao { id: string; label: string }

function formatarData(data: string): string {
    if (!data) return ''
    const [y, m, d] = data.split('-')
    return `${d}/${m}/${y}`
}

export default function ModuloRelatorios() {
    const { planos } = usePlanosContext()
    const { aplicacoes } = useAplicacoesContext()
    const { anosLetivos } = useAnoLetivoContext()

    const [tipoSelecionado, setTipoSelecionado] = useState<TipoRelatorio | null>(null)
    const [periodoInicio, setPeriodoInicio] = useState('')
    const [periodoFim, setPeriodoFim] = useState('')
    const [turmaSelecionadaId, setTurmaSelecionadaId] = useState('')
    const [relatorioPronto, setRelatorioPronto] = useState(false)

    // Lista plana de todas as turmas disponíveis
    const turmasDisponiveis = useMemo<TurmaOpcao[]>(() => {
        const lista: TurmaOpcao[] = []
        for (const ano of anosLetivos) {
            for (const escola of ano.escolas || []) {
                for (const seg of escola.segmentos || []) {
                    for (const turma of seg.turmas || []) {
                        lista.push({
                            id: String(turma.id),
                            label: `${turma.nome} — ${seg.nome} (${ano.ano || ano.nome})`,
                        })
                    }
                }
            }
        }
        return lista
    }, [anosLetivos])

    // Helper: nome da turma pelo id
    const getTurmaNome = (turmaId: string): string => {
        const found = turmasDisponiveis.find(t => t.id === String(turmaId))
        return found?.label || turmaId
    }

    // ── Relatório Mensal ──────────────────────────────────────────────────────
    const relatorioMensal = useMemo<RelatorioMensal | null>(() => {
        if (!relatorioPronto || tipoSelecionado !== 'mensal' || !periodoInicio || !periodoFim) return null

        const aplicNoPeriodo = aplicacoes.filter(a =>
            a.status === 'realizada' && a.data >= periodoInicio && a.data <= periodoFim
        )

        const totalAulas = aplicNoPeriodo.length
        const totalTurmas = new Set(aplicNoPeriodo.map(a => a.turmaId)).size
        const totalPlanos = new Set(aplicNoPeriodo.map(a => String(a.planoId))).size

        let totalRegistros = 0
        planos.forEach(p => {
            ;(p.registrosPosAula || []).forEach(r => {
                const d = r.data || r.dataAula || ''
                if (d >= periodoInicio && d <= periodoFim) totalRegistros++
            })
        })

        const contagemPlanos: Record<string, number> = {}
        aplicNoPeriodo.forEach(a => {
            const k = String(a.planoId)
            contagemPlanos[k] = (contagemPlanos[k] || 0) + 1
        })
        const planosUsados = Object.entries(contagemPlanos)
            .map(([id, count]) => ({ titulo: planos.find(p => String(p.id) === id)?.titulo || `Plano ${id}`, count }))
            .sort((a, b) => b.count - a.count).slice(0, 10)

        const contagemConceitos: Record<string, number> = {}
        aplicNoPeriodo.forEach(a => {
            const plano = planos.find(p => String(p.id) === String(a.planoId))
            ;(plano?.conceitos || []).forEach(c => { if (c) contagemConceitos[c] = (contagemConceitos[c] || 0) + 1 })
        })
        const conceitos = Object.entries(contagemConceitos)
            .map(([nome, count]) => ({ nome, count })).sort((a, b) => b.count - a.count).slice(0, 15)

        const contagemRep: Record<string, number> = {}
        aplicNoPeriodo.forEach(a => {
            const plano = planos.find(p => String(p.id) === String(a.planoId))
            ;(plano?.atividadesRoteiro || []).forEach(at => {
                if (at.musicaVinculada?.trim()) contagemRep[at.musicaVinculada.trim()] = (contagemRep[at.musicaVinculada.trim()] || 0) + 1
                ;(at.musicasVinculadas || []).forEach(m => { if (m.titulo?.trim()) contagemRep[m.titulo.trim()] = (contagemRep[m.titulo.trim()] || 0) + 1 })
            })
        })
        const repertorio = Object.entries(contagemRep)
            .map(([titulo, count]) => ({ titulo, count })).sort((a, b) => b.count - a.count).slice(0, 15)

        const contagemTurmas: Record<string, number> = {}
        aplicNoPeriodo.forEach(a => { contagemTurmas[a.turmaId] = (contagemTurmas[a.turmaId] || 0) + 1 })
        const turmas = Object.entries(contagemTurmas)
            .map(([id, count]) => ({ nome: getTurmaNome(id), count })).sort((a, b) => b.count - a.count)

        return { totalAulas, totalTurmas, totalPlanos, totalRegistros, planosUsados, conceitos, repertorio, turmas }
    }, [relatorioPronto, tipoSelecionado, periodoInicio, periodoFim, aplicacoes, planos, turmasDisponiveis])

    // ── Relatório por Turma ───────────────────────────────────────────────────
    const relatorioTurma = useMemo<RelatorioTurma | null>(() => {
        if (!relatorioPronto || tipoSelecionado !== 'turma' || !periodoInicio || !periodoFim || !turmaSelecionadaId) return null

        const aplicDaTurma = aplicacoes.filter(a =>
            a.status === 'realizada' &&
            String(a.turmaId) === turmaSelecionadaId &&
            a.data >= periodoInicio &&
            a.data <= periodoFim
        ).sort((a, b) => a.data.localeCompare(b.data))

        const turmaNome = getTurmaNome(turmaSelecionadaId)
        const totalAulas = aplicDaTurma.length

        // Linha do tempo
        const linhaDoTempo: AulaLinha[] = aplicDaTurma.map(a => ({
            data: a.data,
            planoTitulo: planos.find(p => String(p.id) === String(a.planoId))?.titulo || `Plano ${a.planoId}`,
            status: a.status,
        }))

        // Conceitos
        const contagemConceitos: Record<string, number> = {}
        aplicDaTurma.forEach(a => {
            const plano = planos.find(p => String(p.id) === String(a.planoId))
            ;(plano?.conceitos || []).forEach(c => { if (c) contagemConceitos[c] = (contagemConceitos[c] || 0) + 1 })
        })
        const conceitos = Object.entries(contagemConceitos)
            .map(([nome, count]) => ({ nome, count })).sort((a, b) => b.count - a.count).slice(0, 15)

        // Repertório
        const contagemRep: Record<string, number> = {}
        aplicDaTurma.forEach(a => {
            const plano = planos.find(p => String(p.id) === String(a.planoId))
            ;(plano?.atividadesRoteiro || []).forEach(at => {
                if (at.musicaVinculada?.trim()) contagemRep[at.musicaVinculada.trim()] = (contagemRep[at.musicaVinculada.trim()] || 0) + 1
                ;(at.musicasVinculadas || []).forEach(m => { if (m.titulo?.trim()) contagemRep[m.titulo.trim()] = (contagemRep[m.titulo.trim()] || 0) + 1 })
            })
        })
        const repertorio = Object.entries(contagemRep)
            .map(([titulo, count]) => ({ titulo, count })).sort((a, b) => b.count - a.count).slice(0, 15)

        // Planos aplicados
        const contagemPlanos: Record<string, number> = {}
        aplicDaTurma.forEach(a => {
            const k = String(a.planoId)
            contagemPlanos[k] = (contagemPlanos[k] || 0) + 1
        })
        const planoss = Object.entries(contagemPlanos)
            .map(([id, count]) => ({ titulo: planos.find(p => String(p.id) === id)?.titulo || `Plano ${id}`, count }))
            .sort((a, b) => b.count - a.count)

        return { turmaNome, totalAulas, linhaDoTempo, conceitos, repertorio, planos: planoss }
    }, [relatorioPronto, tipoSelecionado, periodoInicio, periodoFim, turmaSelecionadaId, aplicacoes, planos, turmasDisponiveis])

    const tipos = [
        { value: 'mensal' as TipoRelatorio, label: 'Relatório Mensal Geral', descricao: 'Visão geral de todas as aulas e turmas no período.', icone: '📅' },
        { value: 'turma'  as TipoRelatorio, label: 'Relatório por Turma',    descricao: 'Detalhamento das aulas de uma turma específica.', icone: '👥' },
    ]

    const podeGerarMensal = !!periodoInicio && !!periodoFim
    const podeGerarTurma  = !!periodoInicio && !!periodoFim && !!turmaSelecionadaId

    function handleGerar() { setRelatorioPronto(true) }
    function handleLimpar() { setRelatorioPronto(false) }

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">

            {/* Cabeçalho */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800">📋 Relatórios</h1>
                <p className="text-sm text-slate-500 mt-1">Gere relatórios pedagógicos a partir dos seus dados.</p>
            </div>

            {/* Tipo */}
            <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Tipo de relatório</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tipos.map(t => (
                        <button key={t.value} type="button"
                            onClick={() => { setTipoSelecionado(t.value); setRelatorioPronto(false) }}
                            className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
                                tipoSelecionado === t.value ? 'border-indigo-400 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                            }`}>
                            <span className="text-2xl shrink-0">{t.icone}</span>
                            <div>
                                <p className={`text-sm font-semibold ${tipoSelecionado === t.value ? 'text-indigo-700' : 'text-slate-700'}`}>{t.label}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{t.descricao}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Filtros — Mensal */}
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
                    <button type="button" onClick={handleGerar} disabled={!podeGerarMensal}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        Gerar relatório
                    </button>
                </div>
            )}

            {/* Filtros — Por Turma */}
            {tipoSelecionado === 'turma' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 space-y-4">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Filtros</label>

                    <div>
                        <label className="block text-xs text-slate-500 mb-1.5">Turma</label>
                        {turmasDisponiveis.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">Nenhuma turma cadastrada ainda.</p>
                        ) : (
                            <select value={turmaSelecionadaId}
                                onChange={e => { setTurmaSelecionadaId(e.target.value); setRelatorioPronto(false) }}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white">
                                <option value="">Selecione uma turma...</option>
                                {turmasDisponiveis.map(t => (
                                    <option key={t.id} value={t.id}>{t.label}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs text-slate-500 mb-1.5">Período</label>
                        <div className="flex gap-2 items-center">
                            <input type="date" value={periodoInicio} onChange={e => { setPeriodoInicio(e.target.value); setRelatorioPronto(false) }}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" />
                            <span className="text-slate-400 text-xs shrink-0">até</span>
                            <input type="date" value={periodoFim} onChange={e => { setPeriodoFim(e.target.value); setRelatorioPronto(false) }}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" />
                        </div>
                    </div>

                    <button type="button" onClick={handleGerar} disabled={!podeGerarTurma}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        Gerar relatório
                    </button>
                </div>
            )}

            {/* ══════════ RESULTADO — MENSAL ══════════ */}
            {relatorioMensal && (
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-slate-700">Relatório Mensal Geral</h2>
                            <p className="text-xs text-slate-400">{formatarData(periodoInicio)} → {formatarData(periodoFim)}</p>
                        </div>
                        <button type="button" onClick={handleLimpar} className="text-xs text-slate-400 hover:text-slate-600 underline">Limpar</button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Aulas realizadas',  value: relatorioMensal.totalAulas,     icone: '☀️' },
                            { label: 'Turmas atendidas',  value: relatorioMensal.totalTurmas,    icone: '👥' },
                            { label: 'Planos utilizados', value: relatorioMensal.totalPlanos,    icone: '📚' },
                            { label: 'Registros pós-aula',value: relatorioMensal.totalRegistros, icone: '📝' },
                        ].map(item => (
                            <div key={item.label} className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
                                <div className="text-2xl mb-1">{item.icone}</div>
                                <div className="text-2xl font-bold text-slate-800">{item.value}</div>
                                <div className="text-[11px] text-slate-400 mt-0.5">{item.label}</div>
                            </div>
                        ))}
                    </div>

                    {relatorioMensal.totalAulas === 0 ? (
                        <EmptyState texto="Nenhuma aula realizada encontrada no período selecionado." />
                    ) : (
                        <>
                            {relatorioMensal.planosUsados.length > 0 && (
                                <Section titulo="📚 Planos mais usados">
                                    {relatorioMensal.planosUsados.map((p, i) => (
                                        <ItemBarra key={i} label={p.titulo} count={p.count} max={relatorioMensal.planosUsados[0].count} sufixo="aplicação" />
                                    ))}
                                </Section>
                            )}
                            {relatorioMensal.conceitos.length > 0 && (
                                <Section titulo="🎵 Conceitos musicais trabalhados">
                                    <TagCloud items={relatorioMensal.conceitos} />
                                </Section>
                            )}
                            {relatorioMensal.repertorio.length > 0 && (
                                <Section titulo="🎼 Repertório utilizado">
                                    {relatorioMensal.repertorio.map((r, i) => (
                                        <ItemBarra key={i} label={r.titulo} count={r.count} max={relatorioMensal.repertorio[0].count} sufixo="vez" />
                                    ))}
                                </Section>
                            )}
                            {relatorioMensal.turmas.length > 0 && (
                                <Section titulo="👥 Turmas atendidas">
                                    {relatorioMensal.turmas.map((t, i) => (
                                        <ItemBarra key={i} label={t.nome} count={t.count} max={relatorioMensal.turmas[0].count} sufixo="aula" cor="bg-emerald-400" />
                                    ))}
                                </Section>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ══════════ RESULTADO — TURMA ══════════ */}
            {relatorioTurma && (
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-slate-700">Relatório por Turma</h2>
                            <p className="text-xs text-slate-400">{formatarData(periodoInicio)} → {formatarData(periodoFim)}</p>
                        </div>
                        <button type="button" onClick={handleLimpar} className="text-xs text-slate-400 hover:text-slate-600 underline">Limpar</button>
                    </div>

                    {/* Resumo */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Resumo da Turma</h3>
                        <p className="text-lg font-bold text-slate-800 mb-1">{relatorioTurma.turmaNome}</p>
                        <p className="text-sm text-slate-500">{formatarData(periodoInicio)} → {formatarData(periodoFim)}</p>
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-3xl font-bold text-indigo-600">{relatorioTurma.totalAulas}</span>
                            <span className="text-sm text-slate-500">aula{relatorioTurma.totalAulas !== 1 ? 's' : ''} realizada{relatorioTurma.totalAulas !== 1 ? 's' : ''}</span>
                        </div>
                    </div>

                    {relatorioTurma.totalAulas === 0 ? (
                        <EmptyState texto="Nenhuma aula realizada para esta turma no período selecionado." />
                    ) : (
                        <>
                            {/* Linha do tempo */}
                            <Section titulo="📅 Linha do tempo">
                                <div className="space-y-1.5">
                                    {relatorioTurma.linhaDoTempo.map((aula, i) => (
                                        <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                                            <span className="text-xs font-mono text-slate-400 shrink-0 w-20">{formatarData(aula.data)}</span>
                                            <span className="flex-1 text-sm text-slate-700 truncate">{aula.planoTitulo}</span>
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">✓ realizada</span>
                                        </div>
                                    ))}
                                </div>
                            </Section>

                            {/* Conceitos */}
                            {relatorioTurma.conceitos.length > 0 && (
                                <Section titulo="🎵 Conceitos musicais trabalhados">
                                    <TagCloud items={relatorioTurma.conceitos} />
                                </Section>
                            )}

                            {/* Repertório */}
                            {relatorioTurma.repertorio.length > 0 && (
                                <Section titulo="🎼 Repertório utilizado">
                                    {relatorioTurma.repertorio.map((r, i) => (
                                        <ItemBarra key={i} label={r.titulo} count={r.count} max={relatorioTurma.repertorio[0].count} sufixo="vez" />
                                    ))}
                                </Section>
                            )}

                            {/* Planos aplicados */}
                            {relatorioTurma.planos.length > 0 && (
                                <Section titulo="📚 Planos aplicados">
                                    {relatorioTurma.planos.map((p, i) => (
                                        <ItemBarra key={i} label={p.titulo} count={p.count} max={relatorioTurma.planos[0].count} sufixo="vez" cor="bg-violet-400" />
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

// ── Componentes auxiliares ────────────────────────────────────────────────────

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
                <div className={`${cor} h-2 rounded-full`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-slate-400 shrink-0 w-16 text-right">{count} {count === 1 ? sufixo : sufixo + 's'}</span>
        </div>
    )
}

function TagCloud({ items }: { items: { nome: string; count: number }[] }) {
    return (
        <div className="flex flex-wrap gap-2">
            {items.map((c, i) => (
                <span key={i} className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm">
                    {c.nome}
                    <span className="bg-indigo-200 text-indigo-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{c.count}×</span>
                </span>
            ))}
        </div>
    )
}

function EmptyState({ texto }: { texto: string }) {
    return (
        <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-2xl border border-slate-200">
            {texto}
        </div>
    )
}
