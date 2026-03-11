// src/components/ModuloRelatorios.tsx
// Passos 6-9: exportação PDF, síntese IA, visual refinado

import React, { useState, useMemo } from 'react'
import { usePlanosContext } from '../contexts/PlanosContext'
import { useAplicacoesContext } from '../contexts/AplicacoesContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import {
    listarEscolas, listarSegmentos, listarTurmas,
    buildRelatorioMensal, buildRelatorioTurma,
    formatarData,
    type ItemContagem, type RelatorioMensalData, type RelatorioTurmaData,
} from '../lib/relatorios'
import { exportarRelatorioMensalPDF, exportarRelatorioTurmaPDF } from '../lib/exportarPDF'

type TipoRelatorio = 'mensal' | 'turma'

// ─── Gemini ───────────────────────────────────────────────────────────────────

async function chamarGemini(prompt: string): Promise<string> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada.')
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
    )
    if (!res.ok) throw new Error(`Gemini error ${res.status}`)
    const json = await res.json()
    return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

function buildPromptMensal(data: RelatorioMensalData, inicio: string, fim: string): string {
    return `Você é um assistente pedagógico especializado em educação musical.
Com base nos dados abaixo, escreva uma síntese pedagógica concisa (máximo 4 parágrafos) sobre o período letivo.
Destaque padrões, conquistas e possíveis pontos de atenção. Seja direto e útil para o professor.

Período: ${formatarData(inicio)} a ${formatarData(fim)}
Aulas realizadas: ${data.totalAulas}
Turmas atendidas: ${data.totalTurmas}
Registros pós-aula: ${data.totalRegistros}
Conceitos mais trabalhados: ${data.conceitos.slice(0,5).map(c=>`${c.label}(${c.count}x)`).join(', ')}
Repertório mais usado: ${data.repertorio.slice(0,5).map(r=>`${r.label}(${r.count}x)`).join(', ')}
Planos mais aplicados: ${data.planosUsados.slice(0,3).map(p=>`${p.label}(${p.count}x)`).join(', ')}

Responda em português. Não use markdown, apenas texto simples.`
}

function buildPromptTurma(data: RelatorioTurmaData, inicio: string, fim: string): string {
    return `Você é um assistente pedagógico especializado em educação musical.
Com base nos dados abaixo, escreva uma síntese pedagógica concisa (máximo 4 parágrafos) sobre a evolução desta turma.
Inclua: síntese da evolução, o que funcionou bem, dificuldades recorrentes e próximos encaminhamentos sugeridos.

Turma: ${data.turmaNome}
Período: ${formatarData(inicio)} a ${formatarData(fim)}
Aulas realizadas: ${data.totalAulas}
Conceitos trabalhados: ${data.conceitos.slice(0,5).map(c=>`${c.label}(${c.count}x)`).join(', ')}
Repertório usado: ${data.repertorio.slice(0,5).map(r=>`${r.label}(${r.count}x)`).join(', ')}
Planos aplicados: ${data.planos.slice(0,3).map(p=>`${p.label}(${p.count}x)`).join(', ')}

Responda em português. Não use markdown, apenas texto simples.`
}

// ─── Componente principal ─────────────────────────────────────────────────────

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
    const [sinteseIA, setSinteseIA] = useState('')
    const [gerandoIA, setGerandoIA] = useState(false)
    const [erroIA, setErroIA] = useState('')

    const escolas   = useMemo(() => listarEscolas(anosLetivos), [anosLetivos])
    const segmentos = useMemo(() => listarSegmentos(anosLetivos, escolaId || undefined), [anosLetivos, escolaId])
    const turmas    = useMemo(() => listarTurmas(anosLetivos, escolaId || undefined, segmentoId || undefined), [anosLetivos, escolaId, segmentoId])

    function handleEscolaChange(id: string)   { setEscolaId(id); setSegmentoId(''); setTurmaId(''); resetRelatorio() }
    function handleSegmentoChange(id: string) { setSegmentoId(id); setTurmaId(''); resetRelatorio() }
    function handleTurmaChange(id: string)    { setTurmaId(id); resetRelatorio() }
    function resetRelatorio()                 { setRelatorioPronto(false); setSinteseIA(''); setErroIA('') }

    const podeGerar = tipoSelecionado === 'turma'
        ? !!periodoInicio && !!periodoFim && !!turmaId
        : !!periodoInicio && !!periodoFim

    const relatorioMensal = useMemo<RelatorioMensalData | null>(() => {
        if (!relatorioPronto || tipoSelecionado !== 'mensal' || !periodoInicio || !periodoFim) return null
        return buildRelatorioMensal(aplicacoes, planos, anosLetivos,
            { inicio: periodoInicio, fim: periodoFim, escolaId: escolaId || undefined, segmentoId: segmentoId || undefined, turmaId: turmaId || undefined })
    }, [relatorioPronto, tipoSelecionado, periodoInicio, periodoFim, escolaId, segmentoId, turmaId, aplicacoes, planos, anosLetivos])

    const relatorioTurma = useMemo<RelatorioTurmaData | null>(() => {
        if (!relatorioPronto || tipoSelecionado !== 'turma' || !periodoInicio || !periodoFim || !turmaId) return null
        return buildRelatorioTurma(aplicacoes, planos, anosLetivos,
            { inicio: periodoInicio, fim: periodoFim, turmaId })
    }, [relatorioPronto, tipoSelecionado, periodoInicio, periodoFim, turmaId, aplicacoes, planos, anosLetivos])

    async function handleGerarIA() {
        if (!relatorioMensal && !relatorioTurma) return
        setGerandoIA(true); setErroIA(''); setSinteseIA('')
        try {
            const prompt = relatorioMensal
                ? buildPromptMensal(relatorioMensal, periodoInicio, periodoFim)
                : buildPromptTurma(relatorioTurma!, periodoInicio, periodoFim)
            setSinteseIA(await chamarGemini(prompt))
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            setErroIA(`Não foi possível gerar a síntese. ${msg}`)
        } finally {
            setGerandoIA(false)
        }
    }

    function handleExportarPDF() {
        if (relatorioMensal) {
            const turmaNome = turmaId ? turmas.find(t => t.id === turmaId)?.label : undefined
            exportarRelatorioMensalPDF(relatorioMensal, { inicio: periodoInicio, fim: periodoFim, turmaNome }, sinteseIA || undefined)
        } else if (relatorioTurma) {
            exportarRelatorioTurmaPDF(relatorioTurma, { inicio: periodoInicio, fim: periodoFim }, sinteseIA || undefined)
        }
    }

    const temRelatorio = !!(relatorioMensal || relatorioTurma)

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
                            onClick={() => { setTipoSelecionado(t.value); resetRelatorio() }}
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

                    <CampoFiltro label="Período" obrigatorio>
                        <div className="flex gap-2 items-center">
                            <input type="date" value={periodoInicio} onChange={e => { setPeriodoInicio(e.target.value); resetRelatorio() }}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" />
                            <span className="text-slate-400 text-xs shrink-0">até</span>
                            <input type="date" value={periodoFim} onChange={e => { setPeriodoFim(e.target.value); resetRelatorio() }}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" />
                        </div>
                    </CampoFiltro>

                    {escolas.length > 0 && (
                        <CampoFiltro label="Escola" opcional={tipoSelecionado === 'mensal'}>
                            <SelectFiltro value={escolaId} onChange={handleEscolaChange} placeholder="Todas as escolas" opcoes={escolas} />
                        </CampoFiltro>
                    )}

                    {segmentos.length > 0 && (
                        <CampoFiltro label="Segmento" opcional={tipoSelecionado === 'mensal'}>
                            <SelectFiltro value={segmentoId} onChange={handleSegmentoChange} placeholder="Todos os segmentos" opcoes={segmentos} />
                        </CampoFiltro>
                    )}

                    {tipoSelecionado === 'turma' ? (
                        <CampoFiltro label="Turma" obrigatorio>
                            {turmas.length === 0
                                ? <p className="text-xs text-slate-400 italic">Nenhuma turma encontrada com esses filtros.</p>
                                : <SelectFiltro value={turmaId} onChange={handleTurmaChange} placeholder="Selecione uma turma..." opcoes={turmas} />
                            }
                        </CampoFiltro>
                    ) : turmas.length > 0 && (
                        <CampoFiltro label="Turma" opcional>
                            <SelectFiltro value={turmaId} onChange={handleTurmaChange} placeholder="Todas as turmas" opcoes={turmas} />
                        </CampoFiltro>
                    )}

                    <button type="button" onClick={() => setRelatorioPronto(true)} disabled={!podeGerar}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        Gerar relatório
                    </button>
                </div>
            )}

            {/* Ações do relatório */}
            {temRelatorio && (
                <div className="flex gap-2 mb-5">
                    <button type="button" onClick={handleGerarIA} disabled={gerandoIA}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                        {gerandoIA ? '⏳ Gerando síntese...' : '✨ Síntese pedagógica com IA'}
                    </button>
                    <button type="button" onClick={handleExportarPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold transition-colors">
                        ⬇ Exportar PDF
                    </button>
                    <button type="button" onClick={resetRelatorio} className="ml-auto text-xs text-slate-400 hover:text-slate-600 underline">
                        Limpar
                    </button>
                </div>
            )}

            {/* Síntese IA */}
            {(sinteseIA || erroIA) && (
                <div className={`rounded-2xl border p-5 mb-5 ${erroIA ? 'bg-red-50 border-red-200' : 'bg-violet-50 border-violet-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-violet-600 uppercase tracking-wide">✨ Síntese pedagógica</span>
                        <span className="text-[10px] text-violet-400 bg-violet-100 px-2 py-0.5 rounded-full">sugerida por IA — não é dado absoluto</span>
                    </div>
                    {erroIA
                        ? <p className="text-sm text-red-600">{erroIA}</p>
                        : <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{sinteseIA}</p>
                    }
                </div>
            )}

            {/* Resultado — Mensal */}
            {relatorioMensal && (
                <RelatorioMensalView data={relatorioMensal} inicio={periodoInicio} fim={periodoFim} />
            )}

            {/* Resultado — Turma */}
            {relatorioTurma && (
                <RelatorioTurmaView data={relatorioTurma} inicio={periodoInicio} fim={periodoFim} />
            )}
        </div>
    )
}

// ─── Views de resultado ───────────────────────────────────────────────────────

function RelatorioMensalView({ data, inicio, fim }: { data: RelatorioMensalData; inicio: string; fim: string }) {
    return (
        <div className="space-y-4">
            <RelatorioCabecalho titulo="Relatório Mensal Geral" inicio={inicio} fim={fim} />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Aulas realizadas',   value: data.totalAulas,     icone: '☀️', cor: 'text-amber-600',  bg: 'bg-amber-50  border-amber-100'  },
                    { label: 'Turmas atendidas',   value: data.totalTurmas,    icone: '👥', cor: 'text-emerald-600',bg: 'bg-emerald-50 border-emerald-100' },
                    { label: 'Planos utilizados',  value: data.totalPlanos,    icone: '📚', cor: 'text-indigo-600', bg: 'bg-indigo-50  border-indigo-100'  },
                    { label: 'Registros pós-aula', value: data.totalRegistros, icone: '📝', cor: 'text-violet-600', bg: 'bg-violet-50  border-violet-100'  },
                ].map(item => <CardMetrica key={item.label} {...item} />)}
            </div>

            {data.totalAulas === 0 ? <EmptyState texto="Nenhuma aula realizada com os filtros selecionados." /> : (
                <>
                    {data.planosUsados.length > 0  && <Section titulo="📚 Planos mais usados"><ListaOrdenada items={data.planosUsados} sufixo="aplicação" /></Section>}
                    {data.conceitos.length > 0     && <Section titulo="🎵 Conceitos musicais trabalhados"><TagCloud items={data.conceitos} /></Section>}
                    {data.repertorio.length > 0    && <Section titulo="🎼 Repertório utilizado"><ListaOrdenada items={data.repertorio} sufixo="vez" cor="bg-teal-400" /></Section>}
                    {data.turmas.length > 0        && <Section titulo="👥 Turmas atendidas"><ListaOrdenada items={data.turmas} sufixo="aula" cor="bg-emerald-400" /></Section>}
                </>
            )}
        </div>
    )
}

function RelatorioTurmaView({ data, inicio, fim }: { data: RelatorioTurmaData; inicio: string; fim: string }) {
    return (
        <div className="space-y-4">
            <RelatorioCabecalho titulo="Relatório por Turma" inicio={inicio} fim={fim} />

            <div className="bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 rounded-2xl p-5">
                <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wide mb-1">Turma</p>
                <p className="text-xl font-bold text-slate-800">{data.turmaNome}</p>
                <p className="text-sm text-slate-500 mt-0.5">{formatarData(inicio)} → {formatarData(fim)}</p>
                <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-4xl font-bold text-indigo-600">{data.totalAulas}</span>
                    <span className="text-sm text-slate-500">aula{data.totalAulas !== 1 ? 's' : ''} realizada{data.totalAulas !== 1 ? 's' : ''}</span>
                </div>
            </div>

            {data.totalAulas === 0 ? <EmptyState texto="Nenhuma aula realizada para esta turma no período." /> : (
                <>
                    <Section titulo="📅 Linha do tempo">
                        <div className="divide-y divide-slate-100">
                            {data.linhaDoTempo.map((aula, i) => (
                                <div key={i} className="flex items-center gap-3 py-2.5">
                                    <span className="text-xs font-mono text-slate-400 shrink-0 w-20">{formatarData(aula.data)}</span>
                                    <span className="flex-1 text-sm text-slate-700 truncate">{aula.planoTitulo}</span>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">✓</span>
                                </div>
                            ))}
                        </div>
                    </Section>
                    {data.conceitos.length > 0  && <Section titulo="🎵 Conceitos musicais trabalhados"><TagCloud items={data.conceitos} /></Section>}
                    {data.repertorio.length > 0 && <Section titulo="🎼 Repertório utilizado"><ListaOrdenada items={data.repertorio} sufixo="vez" /></Section>}
                    {data.planos.length > 0     && <Section titulo="📚 Planos aplicados"><ListaOrdenada items={data.planos} sufixo="vez" cor="bg-violet-400" /></Section>}
                </>
            )}
        </div>
    )
}

// ─── Componentes de filtro ────────────────────────────────────────────────────

function CampoFiltro({ label, obrigatorio, opcional, children }: { label: string; obrigatorio?: boolean; opcional?: boolean; children: React.ReactNode }) {
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

function SelectFiltro({ value, onChange, placeholder, opcoes }: { value: string; onChange: (v: string) => void; placeholder: string; opcoes: { id: string; label: string }[] }) {
    return (
        <select value={value} onChange={e => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white">
            <option value="">{placeholder}</option>
            {opcoes.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
    )
}

// ─── Componentes de UI ────────────────────────────────────────────────────────

function RelatorioCabecalho({ titulo, inicio, fim }: { titulo: string; inicio: string; fim: string }) {
    return (
        <div className="pb-1 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">{titulo}</h2>
            <p className="text-xs text-slate-400">{formatarData(inicio)} → {formatarData(fim)}</p>
        </div>
    )
}

function CardMetrica({ label, value, icone, cor, bg }: { label: string; value: number; icone: string; cor: string; bg: string }) {
    return (
        <div className={`border rounded-2xl p-4 text-center ${bg}`}>
            <div className="text-xl mb-1">{icone}</div>
            <div className={`text-3xl font-bold ${cor}`}>{value}</div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">{label}</div>
        </div>
    )
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">{titulo}</h3>
            {children}
        </div>
    )
}

function ListaOrdenada({ items, sufixo, cor = 'bg-indigo-400' }: { items: ItemContagem[]; sufixo: string; cor?: string }) {
    const max = items[0]?.count ?? 1
    return (
        <div className="space-y-2.5">
            {items.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-300 w-5 shrink-0 text-right">{i + 1}</span>
                    <span className="text-sm text-slate-700 w-44 shrink-0 truncate">{item.label}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className={`${cor} h-2 rounded-full transition-all`} style={{ width: `${Math.round((item.count / max) * 100)}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 shrink-0 w-20 text-right">{item.count} {item.count === 1 ? sufixo : sufixo + 's'}</span>
                </div>
            ))}
        </div>
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
    return <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-2xl border border-slate-200">{texto}</div>
}
