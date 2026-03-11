// src/components/ModuloRelatorios.tsx
// Módulo de Relatórios — Passo 5: filtros em cascata (escola → segmento → turma)

import React, { useState, useMemo } from 'react'
import { usePlanosContext } from '../contexts/PlanosContext'
import { useAplicacoesContext } from '../contexts/AplicacoesContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import {
    listarEscolas,
    listarSegmentos,
    listarTurmas,
    buildRelatorioMensal,
    buildRelatorioTurma,
    formatarData,
    type ItemContagem,
    type RelatorioMensalData,
    type RelatorioTurmaData,
} from '../lib/relatorios'

type TipoRelatorio = 'mensal' | 'turma'

export default function ModuloRelatorios() {
    const { planos } = usePlanosContext()
    const { aplicacoes } = useAplicacoesContext()
    const { anosLetivos } = useAnoLetivoContext()

    const [tipoSelecionado, setTipoSelecionado] = useState<TipoRelatorio | null>(null)
    const [periodoInicio, setPeriodoInicio] = useState('')
    const [periodoFim, setPeriodoFim] = useState('')
    const [escolaId, setEscolaId] = useState('')
    const [segmentoId, setSegmentoId] = useState('')
    const [turmaId, setTurmaId] = useState('')
    const [relatorioPronto, setRelatorioPronto] = useState(false)

    // Opções em cascata
    const escolas    = useMemo(() => listarEscolas(anosLetivos), [anosLetivos])
    const segmentos  = useMemo(() => listarSegmentos(anosLetivos, escolaId || undefined), [anosLetivos, escolaId])
    const turmas     = useMemo(() => listarTurmas(anosLetivos, escolaId || undefined, segmentoId || undefined), [anosLetivos, escolaId, segmentoId])

    // Reset em cascata ao mudar escola ou segmento
    function handleEscolaChange(id: string) { setEscolaId(id); setSegmentoId(''); setTurmaId(''); setRelatorioPronto(false) }
    function handleSegmentoChange(id: string) { setSegmentoId(id); setTurmaId(''); setRelatorioPronto(false) }
    function handleTurmaChange(id: string) { setTurmaId(id); setRelatorioPronto(false) }
    function reset() { setRelatorioPronto(false) }

    const podeGerar = tipoSelecionado === 'turma'
        ? !!periodoInicio && !!periodoFim && !!turmaId
        : !!periodoInicio && !!periodoFim

    const filtrosMensal = { inicio: periodoInicio, fim: periodoFim, escolaId: escolaId || undefined, segmentoId: segmentoId || undefined, turmaId: turmaId || undefined }
    const filtrosTurma  = { inicio: periodoInicio, fim: periodoFim, turmaId }

    const relatorioMensal = useMemo<RelatorioMensalData | null>(() => {
        if (!relatorioPronto || tipoSelecionado !== 'mensal' || !periodoInicio || !periodoFim) return null
        return buildRelatorioMensal(aplicacoes, planos, anosLetivos, filtrosMensal)
    }, [relatorioPronto, tipoSelecionado, periodoInicio, periodoFim, escolaId, segmentoId, turmaId, aplicacoes, planos, anosLetivos])

    const relatorioTurma = useMemo<RelatorioTurmaData | null>(() => {
        if (!relatorioPronto || tipoSelecionado !== 'turma' || !periodoInicio || !periodoFim || !turmaId) return null
        return buildRelatorioTurma(aplicacoes, planos, anosLetivos, filtrosTurma)
    }, [relatorioPronto, tipoSelecionado, periodoInicio, periodoFim, turmaId, aplicacoes, planos, anosLetivos])

    const tipos = [
        { value: 'mensal' as TipoRelatorio, label: 'Relatório Mensal Geral', descricao: 'Visão geral de todas as aulas e turmas no período.', icone: '📅' },
        { value: 'turma'  as TipoRelatorio, label: 'Relatório por Turma',    descricao: 'Detalhamento das aulas de uma turma específica.',   icone: '👥' },
    ]

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
                            onClick={() => { setTipoSelecionado(t.value); reset() }}
                            className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
                                tipoSelecionado === t.value
                                    ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
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

            {/* Filtros */}
            {tipoSelecionado && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 space-y-4">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Filtros</label>

                    {/* Período — sempre visível */}
                    <CampoFiltro label="Período" obrigatorio>
                        <div className="flex gap-2 items-center">
                            <input type="date" value={periodoInicio}
                                onChange={e => { setPeriodoInicio(e.target.value); reset() }}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" />
                            <span className="text-slate-400 text-xs shrink-0">até</span>
                            <input type="date" value={periodoFim}
                                onChange={e => { setPeriodoFim(e.target.value); reset() }}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" />
                        </div>
                    </CampoFiltro>

                    {/* Escola */}
                    {escolas.length > 0 && (
                        <CampoFiltro label="Escola" opcional={tipoSelecionado === 'mensal'}>
                            <SelectFiltro
                                value={escolaId}
                                onChange={handleEscolaChange}
                                placeholder="Todas as escolas"
                                opcoes={escolas}
                            />
                        </CampoFiltro>
                    )}

                    {/* Segmento */}
                    {segmentos.length > 0 && (
                        <CampoFiltro label="Segmento" opcional={tipoSelecionado === 'mensal'}>
                            <SelectFiltro
                                value={segmentoId}
                                onChange={handleSegmentoChange}
                                placeholder="Todos os segmentos"
                                opcoes={segmentos}
                            />
                        </CampoFiltro>
                    )}

                    {/* Turma */}
                    {tipoSelecionado === 'turma' ? (
                        <CampoFiltro label="Turma" obrigatorio>
                            {turmas.length === 0
                                ? <p className="text-xs text-slate-400 italic">Nenhuma turma encontrada com esses filtros.</p>
                                : <SelectFiltro value={turmaId} onChange={handleTurmaChange} placeholder="Selecione uma turma..." opcoes={turmas} />
                            }
                        </CampoFiltro>
                    ) : (
                        turmas.length > 0 && (
                            <CampoFiltro label="Turma" opcional>
                                <SelectFiltro value={turmaId} onChange={handleTurmaChange} placeholder="Todas as turmas" opcoes={turmas} />
                            </CampoFiltro>
                        )
                    )}

                    <button type="button" onClick={() => setRelatorioPronto(true)} disabled={!podeGerar}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        Gerar relatório
                    </button>
                </div>
            )}

            {/* Resultados */}
            {relatorioMensal && (
                <RelatorioMensalView data={relatorioMensal} inicio={periodoInicio} fim={periodoFim} onLimpar={reset} />
            )}
            {relatorioTurma && (
                <RelatorioTurmaView data={relatorioTurma} inicio={periodoInicio} fim={periodoFim} onLimpar={reset} />
            )}
        </div>
    )
}

// ─── Views de resultado ───────────────────────────────────────────────────────

function RelatorioMensalView({ data, inicio, fim, onLimpar }: { data: RelatorioMensalData; inicio: string; fim: string; onLimpar: () => void }) {
    return (
        <div className="space-y-5">
            <RelatorioCabecalho titulo="Relatório Mensal Geral" inicio={inicio} fim={fim} onLimpar={onLimpar} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Aulas realizadas',   value: data.totalAulas,     icone: '☀️' },
                    { label: 'Turmas atendidas',   value: data.totalTurmas,    icone: '👥' },
                    { label: 'Planos utilizados',  value: data.totalPlanos,    icone: '📚' },
                    { label: 'Registros pós-aula', value: data.totalRegistros, icone: '📝' },
                ].map(item => <CardMetrica key={item.label} {...item} />)}
            </div>
            {data.totalAulas === 0 ? <EmptyState texto="Nenhuma aula realizada encontrada no período com os filtros selecionados." /> : (
                <>
                    {data.planosUsados.length > 0  && <Section titulo="📚 Planos mais usados"><ListaBarras items={data.planosUsados} sufixo="aplicação" /></Section>}
                    {data.conceitos.length > 0     && <Section titulo="🎵 Conceitos musicais trabalhados"><TagCloud items={data.conceitos} /></Section>}
                    {data.repertorio.length > 0    && <Section titulo="🎼 Repertório utilizado"><ListaBarras items={data.repertorio} sufixo="vez" /></Section>}
                    {data.turmas.length > 0        && <Section titulo="👥 Turmas atendidas"><ListaBarras items={data.turmas} sufixo="aula" cor="bg-emerald-400" /></Section>}
                </>
            )}
        </div>
    )
}

function RelatorioTurmaView({ data, inicio, fim, onLimpar }: { data: RelatorioTurmaData; inicio: string; fim: string; onLimpar: () => void }) {
    return (
        <div className="space-y-5">
            <RelatorioCabecalho titulo="Relatório por Turma" inicio={inicio} fim={fim} onLimpar={onLimpar} />
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Resumo da Turma</h3>
                <p className="text-lg font-bold text-slate-800 mb-1">{data.turmaNome}</p>
                <p className="text-sm text-slate-500">{formatarData(inicio)} → {formatarData(fim)}</p>
                <div className="mt-3 flex items-center gap-2">
                    <span className="text-3xl font-bold text-indigo-600">{data.totalAulas}</span>
                    <span className="text-sm text-slate-500">aula{data.totalAulas !== 1 ? 's' : ''} realizada{data.totalAulas !== 1 ? 's' : ''}</span>
                </div>
            </div>
            {data.totalAulas === 0 ? <EmptyState texto="Nenhuma aula realizada para esta turma no período." /> : (
                <>
                    <Section titulo="📅 Linha do tempo">
                        <div className="space-y-1.5">
                            {data.linhaDoTempo.map((aula, i) => (
                                <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                                    <span className="text-xs font-mono text-slate-400 shrink-0 w-20">{formatarData(aula.data)}</span>
                                    <span className="flex-1 text-sm text-slate-700 truncate">{aula.planoTitulo}</span>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">✓ realizada</span>
                                </div>
                            ))}
                        </div>
                    </Section>
                    {data.conceitos.length > 0  && <Section titulo="🎵 Conceitos musicais trabalhados"><TagCloud items={data.conceitos} /></Section>}
                    {data.repertorio.length > 0 && <Section titulo="🎼 Repertório utilizado"><ListaBarras items={data.repertorio} sufixo="vez" /></Section>}
                    {data.planos.length > 0     && <Section titulo="📚 Planos aplicados"><ListaBarras items={data.planos} sufixo="vez" cor="bg-violet-400" /></Section>}
                </>
            )}
        </div>
    )
}

// ─── Componentes de filtro ────────────────────────────────────────────────────

function CampoFiltro({ label, obrigatorio, opcional, children }: {
    label: string; obrigatorio?: boolean; opcional?: boolean; children: React.ReactNode
}) {
    return (
        <div>
            <div className="flex items-center gap-1.5 mb-1.5">
                <label className="block text-xs text-slate-500">{label}</label>
                {obrigatorio && <span className="text-[10px] text-red-400 font-semibold">obrigatório</span>}
                {opcional    && <span className="text-[10px] text-slate-300">opcional</span>}
            </div>
            {children}
        </div>
    )
}

function SelectFiltro({ value, onChange, placeholder, opcoes }: {
    value: string; onChange: (v: string) => void; placeholder: string; opcoes: { id: string; label: string }[]
}) {
    return (
        <select value={value} onChange={e => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white">
            <option value="">{placeholder}</option>
            {opcoes.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
    )
}

// ─── Componentes de UI ────────────────────────────────────────────────────────

function RelatorioCabecalho({ titulo, inicio, fim, onLimpar }: { titulo: string; inicio: string; fim: string; onLimpar: () => void }) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-base font-bold text-slate-700">{titulo}</h2>
                <p className="text-xs text-slate-400">{formatarData(inicio)} → {formatarData(fim)}</p>
            </div>
            <button type="button" onClick={onLimpar} className="text-xs text-slate-400 hover:text-slate-600 underline">Limpar</button>
        </div>
    )
}

function CardMetrica({ label, value, icone }: { label: string; value: number; icone: string }) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
            <div className="text-2xl mb-1">{icone}</div>
            <div className="text-2xl font-bold text-slate-800">{value}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{label}</div>
        </div>
    )
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">{titulo}</h3>
            <div className="space-y-2">{children}</div>
        </div>
    )
}

function ListaBarras({ items, sufixo, cor = 'bg-indigo-400' }: { items: ItemContagem[]; sufixo: string; cor?: string }) {
    const max = items[0]?.count ?? 1
    return (
        <>
            {items.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-slate-700 w-48 shrink-0 truncate">{item.label}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className={`${cor} h-2 rounded-full`} style={{ width: `${Math.round((item.count / max) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 shrink-0 w-20 text-right">{item.count} {item.count === 1 ? sufixo : sufixo + 's'}</span>
                </div>
            ))}
        </>
    )
}

function TagCloud({ items }: { items: ItemContagem[] }) {
    return (
        <div className="flex flex-wrap gap-2">
            {items.map((c, i) => (
                <span key={i} className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm">
                    {c.label}
                    <span className="bg-indigo-200 text-indigo-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{c.count}×</span>
                </span>
            ))}
        </div>
    )
}

function EmptyState({ texto }: { texto: string }) {
    return (
        <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-2xl border border-slate-200">{texto}</div>
    )
}
