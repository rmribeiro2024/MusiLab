// src/components/ModuloRelatorios.tsx
// Passos 6-9: exportação PDF, síntese IA, visual refinado

import React, { useState, useMemo } from 'react'
import { usePlanosContext } from '../contexts/PlanosContext'
import { useAplicacoesContext } from '../contexts/AplicacoesContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import {
    listarEscolas, listarSegmentos, listarTurmas,
    buildRelatorioMensal, buildRelatorioTurma, buildPainelTendencia, buildPromptTendencia,
    formatarData,
    type ItemContagem, type RelatorioMensalData, type RelatorioTurmaData, type PainelTendenciaData,
} from '../lib/relatorios'
import { exportarRelatorioMensalPDF, exportarRelatorioTurmaPDF } from '../lib/exportarPDF'

type TipoRelatorio = 'mensal' | 'turma' | 'tendencia'

// ─── Gemini ───────────────────────────────────────────────────────────────────

async function chamarGemini(prompt: string): Promise<string> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada.')
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
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

function truncar(texto: string, max = 2000): string {
    if (!texto) return ''
    return texto.length > max ? texto.slice(0, max) + '…' : texto
}

function buildPromptMensal(data: RelatorioMensalData, inicio: string, fim: string): string {
    const conceitos = truncar(data.conceitos.slice(0,5).map(c=>`${JSON.stringify(c.label)}(${c.count}x)`).join(', '))
    const repertorio = truncar(data.repertorio.slice(0,5).map(r=>`${JSON.stringify(r.label)}(${r.count}x)`).join(', '))
    const planos = truncar(data.planosUsados.slice(0,3).map(p=>`${JSON.stringify(p.label)}(${p.count}x)`).join(', '))
    return `Você é um assistente pedagógico especializado em educação musical.
Com base nos dados abaixo, escreva uma síntese pedagógica concisa (máximo 4 parágrafos) sobre o período letivo.
Destaque padrões, conquistas e possíveis pontos de atenção. Seja direto e útil para o professor.

Período: ${formatarData(inicio)} a ${formatarData(fim)}
Aulas realizadas: ${data.totalAulas}
Turmas atendidas: ${data.totalTurmas}
Registros pós-aula: ${data.totalRegistros}
Conceitos mais trabalhados: ${conceitos}
Repertório mais usado: ${repertorio}
Planos mais aplicados: ${planos}

Responda em português. Não use markdown, apenas texto simples.`
}

function buildPromptTurma(data: RelatorioTurmaData, inicio: string, fim: string): string {
    const obsLinhas = truncar(data.registrosResumidos.slice(-5).map(r =>
        [r.funcionouBem && `Funcionou: ${truncar(r.funcionouBem, 200)}`, (r.fariadiferente || (r as any).naoFuncionou) && `Faria diferente: ${truncar(r.fariadiferente || (r as any).naoFuncionou, 200)}`].filter(Boolean).join(' | ')
    ).filter(Boolean).join('\n'))
    const conceitos = truncar(data.conceitos.slice(0,5).map(c=>`${JSON.stringify(c.label)}(${c.count}x)`).join(', '))
    const repertorio = truncar(data.repertorio.slice(0,5).map(r=>`${JSON.stringify(r.label)}(${r.count}x)`).join(', '))
    const planos = truncar(data.planos.slice(0,3).map(p=>`${JSON.stringify(p.label)}(${p.count}x)`).join(', '))
    return `Você é um assistente pedagógico especializado em educação musical.
Com base nos dados abaixo, escreva uma síntese pedagógica concisa (máximo 4 parágrafos) sobre a evolução desta turma.
Inclua: síntese da evolução, o que funcionou bem, dificuldades recorrentes e próximos encaminhamentos sugeridos.

Turma: ${JSON.stringify(data.turmaNome)}
Período: ${formatarData(inicio)} a ${formatarData(fim)}
Aulas realizadas: ${data.totalAulas}
Conceitos trabalhados: ${conceitos}
Repertório usado: ${repertorio}
Planos aplicados: ${planos}
${obsLinhas ? `\nObservações dos últimos registros:\n${obsLinhas}` : ''}

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

    const podeGerar = (tipoSelecionado === 'turma' || tipoSelecionado === 'tendencia')
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

    const painelTendencia = useMemo<PainelTendenciaData | null>(() => {
        if (!relatorioPronto || tipoSelecionado !== 'tendencia' || !periodoInicio || !periodoFim || !turmaId) return null
        const turmaNome = turmas.find(t => t.id === turmaId)?.label ?? turmaId
        return buildPainelTendencia(planos, turmaId, turmaNome, { inicio: periodoInicio, fim: periodoFim })
    }, [relatorioPronto, tipoSelecionado, periodoInicio, periodoFim, turmaId, planos, turmas])

    async function handleGerarIA() {
        if (!relatorioMensal && !relatorioTurma && !painelTendencia) return
        setGerandoIA(true); setErroIA(''); setSinteseIA('')
        try {
            const prompt = relatorioMensal
                ? buildPromptMensal(relatorioMensal, periodoInicio, periodoFim)
                : painelTendencia
                    ? buildPromptTendencia(painelTendencia)
                    : buildPromptTurma(relatorioTurma!, periodoInicio, periodoFim)
            setSinteseIA(await chamarGemini(prompt))
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            setErroIA(`Não foi possível gerar a síntese. Tente reduzir o período selecionado ou tente novamente. (${msg})`)
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

    const temRelatorio = !!(relatorioMensal || relatorioTurma || painelTendencia)

    const tipos = [
        { value: 'mensal'    as TipoRelatorio, label: 'Relatório Mensal Geral',    descricao: 'Visão geral de todas as aulas e turmas no período.',  icone: '📅' },
        { value: 'turma'     as TipoRelatorio, label: 'Relatório por Turma',       descricao: 'Detalhamento das aulas de uma turma específica.',      icone: '👥' },
        { value: 'tendencia' as TipoRelatorio, label: 'Tendência da Turma',        descricao: 'Padrões pedagógicos a partir dos registros pós-aula.', icone: '📈' },
    ]

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">

            {/* Cabeçalho */}
            <div className="mb-8">
                <h1 className="text-[22px] font-bold tracking-[-0.025em] text-slate-900 dark:text-[#E5E7EB]">Relatórios</h1>
                <p className="text-sm text-slate-500 dark:text-[#9CA3AF] mt-1">Gere relatórios pedagógicos a partir dos seus dados.</p>
            </div>

            {/* Tipo */}
            <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-500 dark:text-[#9CA3AF] uppercase tracking-wide mb-3">Tipo de relatório</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tipos.map(t => (
                        <button key={t.value} type="button"
                            onClick={() => { setTipoSelecionado(t.value); resetRelatorio() }}
                            className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
                                tipoSelecionado === t.value
                                    ? 'border border-[#5B5FEA] bg-[#5B5FEA]/8 dark:bg-[#5B5FEA]/15 shadow-sm'
                                    : 'border border-[#E6EAF0] dark:border-[#374151] v2-card hover:border-slate-300 dark:hover:border-slate-500'
                            }`}>
                            <span className="text-2xl shrink-0">{t.icone}</span>
                            <div>
                                <p className={'text-sm font-semibold ' + (tipoSelecionado === t.value ? 'text-[#5B5FEA] dark:text-[#818cf8]' : 'text-slate-700 dark:text-[#E5E7EB]')}>{t.label}</p>
                                <p className="text-xs text-slate-400 dark:text-[#6b7280] mt-0.5">{t.descricao}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Filtros */}
            {tipoSelecionado && (
                <div className="v2-card border border-[#E6EAF0] dark:border-[#374151] rounded-xl p-5 mb-6 space-y-4">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-[#9CA3AF] uppercase tracking-wide">Filtros</label>

                    <CampoFiltro label="Período" obrigatorio>
                        <div className="flex gap-2 items-center">
                            <input type="date" value={periodoInicio} onChange={e => { setPeriodoInicio(e.target.value); resetRelatorio() }}
                                className="flex-1 px-3 py-2 border border-[#E6EAF0] dark:border-[#374151] rounded-xl text-sm focus:border-[#5B5FEA] dark:focus:border-[#818cf8] outline-none bg-white dark:bg-[#111827] text-slate-800 dark:text-[#E5E7EB]" />
                            <span className="text-slate-400 text-xs shrink-0">até</span>
                            <input type="date" value={periodoFim} onChange={e => { setPeriodoFim(e.target.value); resetRelatorio() }}
                                className="flex-1 px-3 py-2 border border-[#E6EAF0] dark:border-[#374151] rounded-xl text-sm focus:border-[#5B5FEA] dark:focus:border-[#818cf8] outline-none bg-white dark:bg-[#111827] text-slate-800 dark:text-[#E5E7EB]" />
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

                    {(tipoSelecionado === 'turma' || tipoSelecionado === 'tendencia') ? (
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
                        className="w-full py-2.5 bg-[#5B5FEA] hover:bg-[#4f53d4] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        Gerar relatório
                    </button>
                </div>
            )}

            {/* Ações do relatório */}
            {temRelatorio && (
                <div className="flex gap-2 mb-5">
                    <button type="button" onClick={handleGerarIA} disabled={gerandoIA}
                        className="flex items-center gap-2 px-4 py-2 bg-[#5B5FEA]/8 dark:bg-[#5B5FEA]/15 hover:bg-[#5B5FEA]/15 dark:hover:bg-[#5B5FEA]/20 border border-[#5B5FEA]/25 text-[#5B5FEA] dark:text-[#818cf8] rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                        {gerandoIA ? '⏳ Gerando síntese...' : '✨ Síntese pedagógica com IA'}
                    </button>
                    <button type="button" onClick={handleExportarPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 border border-[#E6EAF0] dark:border-[#374151] text-slate-600 dark:text-[#9CA3AF] rounded-xl text-sm font-semibold transition-colors">
                        ⬇ Exportar PDF
                    </button>
                    <button type="button" onClick={resetRelatorio} className="ml-auto text-xs text-slate-400 hover:text-slate-600 underline">
                        Limpar
                    </button>
                </div>
            )}

            {/* Síntese IA */}
            {(sinteseIA || erroIA) && (
                <div className={`rounded-xl border p-5 mb-5 ${erroIA ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50' : 'bg-[#5B5FEA]/8 dark:bg-[#5B5FEA]/15 border-[#5B5FEA]/25'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-[#5B5FEA] dark:text-[#818cf8] uppercase tracking-wide">✨ Síntese pedagógica</span>
                        <span className="text-[10px] text-[#5B5FEA] dark:text-[#818cf8] bg-[#5B5FEA]/10 dark:bg-[#5B5FEA]/20 px-2 py-0.5 rounded-full">sugerida por IA — não é dado absoluto</span>
                    </div>
                    {erroIA
                        ? <p className="text-sm text-red-600">{erroIA}</p>
                        : <p className="text-sm text-slate-700 dark:text-[#D1D5DB] leading-relaxed whitespace-pre-line">{sinteseIA}</p>
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

            {/* Resultado — Tendência */}
            {painelTendencia && (
                <PainelTendenciaView data={painelTendencia} />
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

            <div className="v2-card border border-[#5B5FEA]/20 dark:border-[#5B5FEA]/30 rounded-xl p-5">
                <p className="text-[11px] font-bold text-[#5B5FEA] dark:text-[#818cf8] uppercase tracking-wide mb-1">Turma</p>
                <p className="text-xl font-bold text-slate-800 dark:text-[#E5E7EB]">{data.turmaNome}</p>
                <p className="text-sm text-slate-500 mt-0.5">{formatarData(inicio)} → {formatarData(fim)}</p>
                <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-4xl font-bold text-[#5B5FEA] dark:text-[#818cf8]">{data.totalAulas}</span>
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
                                    <span className="flex-1 text-sm text-slate-700 dark:text-[#D1D5DB] truncate">{aula.planoTitulo}</span>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">✓</span>
                                </div>
                            ))}
                        </div>
                    </Section>
                    {data.conceitos.length > 0  && <Section titulo="🎵 Conceitos musicais trabalhados"><TagCloud items={data.conceitos} /></Section>}
                    {data.repertorio.length > 0 && <Section titulo="🎼 Repertório utilizado"><ListaOrdenada items={data.repertorio} sufixo="vez" /></Section>}
                    {data.planos.length > 0     && <Section titulo="📚 Planos aplicados"><ListaOrdenada items={data.planos} sufixo="vez" cor="bg-violet-400" /></Section>}
                    {data.registrosResumidos.length > 0 && (
                        <Section titulo="📋 Observações pós-aula">
                            <div className="divide-y divide-slate-100">
                                {data.registrosResumidos.map((r, i) => (
                                    <div key={i} className="py-3 space-y-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-mono text-slate-400 w-20 shrink-0">{formatarData(r.data)}</span>
                                            {r.urlEvidencia && (
                                                <a href={r.urlEvidencia} target="_blank" rel="noopener noreferrer"
                                                    className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full hover:bg-blue-100 transition">
                                                    📎 Evidência
                                                </a>
                                            )}
                                        </div>
                                        {r.funcionouBem  && <p className="text-xs text-slate-600"><span className="font-semibold text-emerald-600">✅</span> {r.funcionouBem}</p>}
                                        {(r.fariadiferente || (r as any).naoFuncionou) && <p className="text-xs text-slate-600"><span className="font-semibold text-amber-600">⚠️</span> {r.fariadiferente || (r as any).naoFuncionou}</p>}
                                        {r.comportamento && <p className="text-xs text-slate-500 italic"><span className="font-semibold text-slate-400">👥</span> {r.comportamento}</p>}
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}
                </>
            )}
        </div>
    )
}

// ─── Feature 2: Painel de Tendência ──────────────────────────────────────────

function PainelTendenciaView({ data }: { data: PainelTendenciaData }) {
    const RESULTADO_COR: Record<string, string> = {
        bem:     'bg-emerald-100 text-emerald-700 border-emerald-200',
        parcial: 'bg-amber-100 text-amber-700 border-amber-200',
        nao:     'bg-red-100 text-red-700 border-red-200',
    }
    const RESULTADO_LABEL: Record<string, string> = {
        bem: 'Funcionou bem', parcial: 'Parcial', nao: 'Faria diferente',
    }

    return (
        <div className="space-y-4">
            <div className="pb-1 border-b border-[#E6EAF0] dark:border-[#374151]">
                <h2 className="text-lg font-bold text-slate-800 dark:text-[#E5E7EB]">Tendência da Turma</h2>
                <p className="text-xs text-slate-400">{data.turmaNome} · {formatarData(data.periodoInicio)} → {formatarData(data.periodoFim)}</p>
            </div>

            <div className="v2-card border border-[#5B5FEA]/20 dark:border-[#5B5FEA]/30 rounded-xl p-5">
                <p className="text-[11px] font-bold text-[#5B5FEA] dark:text-[#818cf8] uppercase tracking-wide mb-1">Turma</p>
                <p className="text-xl font-bold text-slate-800 dark:text-[#E5E7EB]">{data.turmaNome}</p>
                <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-4xl font-bold text-[#5B5FEA] dark:text-[#818cf8]">{data.totalRegistros}</span>
                    <span className="text-sm text-slate-500">registro{data.totalRegistros !== 1 ? 's' : ''} analisado{data.totalRegistros !== 1 ? 's' : ''}</span>
                </div>
            </div>

            {data.totalRegistros === 0 ? (
                <div className="text-center py-12 text-slate-400">
                    <p className="text-4xl mb-3">📋</p>
                    <p className="text-sm">Nenhum registro pós-aula encontrado para esta turma no período.</p>
                    <p className="text-xs mt-1 text-slate-300">Faça registros pós-aula para ver tendências.</p>
                </div>
            ) : (
                <>
                    {data.humor.length > 0 && (
                        <Section titulo="📊 Resultado das aulas">
                            <div className="flex flex-wrap gap-2">
                                {data.humor.map(h => (
                                    <div key={h.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold ${RESULTADO_COR[h.id] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                        <span>{RESULTADO_LABEL[h.id] ?? h.label}</span>
                                        <span className="text-xs font-bold opacity-70">{h.count}×</span>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {data.funcionouBem.length > 0 && (
                        <Section titulo="✅ O que funcionou bem">
                            <ul className="space-y-2">
                                {data.funcionouBem.map((t, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                        <span className="text-emerald-500 mt-0.5 shrink-0">•</span>{t}
                                    </li>
                                ))}
                            </ul>
                        </Section>
                    )}

                    {data.fariadiferente.length > 0 && (
                        <Section titulo="⚠️ Desafios recorrentes">
                            <ul className="space-y-2">
                                {data.fariadiferente.map((t, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                        <span className="text-amber-500 mt-0.5 shrink-0">•</span>{t}
                                    </li>
                                ))}
                            </ul>
                        </Section>
                    )}

                    {data.comportamentos.length > 0 && (
                        <Section titulo="👥 Comportamento observado">
                            <ul className="space-y-2">
                                {data.comportamentos.map((t, i) => (
                                    <li key={i} className="text-sm text-slate-600 italic">{t}</li>
                                ))}
                            </ul>
                        </Section>
                    )}

                    {data.proximosPassos.length > 0 && (
                        <Section titulo="💡 Ideias para próximas aulas">
                            <ul className="space-y-2">
                                {data.proximosPassos.map((t, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                        <span className="text-indigo-400 mt-0.5 shrink-0">→</span>{t}
                                    </li>
                                ))}
                            </ul>
                        </Section>
                    )}

                    {data.evidencias.length > 0 && (
                        <Section titulo="📎 Evidências de aula">
                            <div className="flex flex-col gap-2">
                                {data.evidencias.map((e, i) => (
                                    <a key={i} href={e.url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700 hover:bg-blue-100 transition">
                                        <span className="shrink-0 text-xs font-mono text-slate-400">{formatarData(e.data)}</span>
                                        <span className="font-semibold">🔗 Abrir evidência</span>
                                    </a>
                                ))}
                            </div>
                        </Section>
                    )}
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
                <label className="block text-xs text-slate-500 dark:text-[#9CA3AF]">{label}</label>
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
            className="w-full px-3 py-2 border border-[#E6EAF0] dark:border-[#374151] rounded-xl text-sm focus:border-[#5B5FEA] dark:focus:border-[#818cf8] outline-none bg-white dark:bg-[#111827] text-slate-800 dark:text-[#E5E7EB]">
            <option value="">{placeholder}</option>
            {opcoes.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
    )
}

// ─── Componentes de UI ────────────────────────────────────────────────────────

function RelatorioCabecalho({ titulo, inicio, fim }: { titulo: string; inicio: string; fim: string }) {
    return (
        <div className="pb-1 border-b border-[#E6EAF0] dark:border-[#374151]">
            <h2 className="text-lg font-bold text-slate-800 dark:text-[#E5E7EB]">{titulo}</h2>
            <p className="text-xs text-slate-400">{formatarData(inicio)} → {formatarData(fim)}</p>
        </div>
    )
}

function CardMetrica({ label, value, icone, cor, bg }: { label: string; value: number; icone: string; cor: string; bg: string }) {
    return (
        <div className={`border rounded-xl p-4 text-center ${bg}`}>
            <div className="text-xl mb-1">{icone}</div>
            <div className={`text-3xl font-bold ${cor}`}>{value}</div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">{label}</div>
        </div>
    )
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
    return (
        <div className="v2-card border border-[#E6EAF0] dark:border-[#374151] rounded-xl p-5">
            <h3 className="text-xs font-bold text-slate-400 dark:text-[#6b7280] uppercase tracking-wide mb-4">{titulo}</h3>
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
                    <div className="flex-1 bg-slate-100 dark:bg-white/10 rounded-full h-2 overflow-hidden">
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
                <span key={i} className="flex items-center gap-1.5 bg-[#5B5FEA]/8 dark:bg-[#5B5FEA]/15 border border-[#5B5FEA]/20 text-[#5B5FEA] dark:text-[#818cf8] px-3 py-1 rounded-full text-sm">
                    {c.label}
                    <span className="bg-[#5B5FEA]/20 dark:bg-[#5B5FEA]/30 text-[#5B5FEA] dark:text-[#818cf8] text-[10px] font-bold px-1.5 py-0.5 rounded-full">{c.count}×</span>
                </span>
            ))}
        </div>
    )
}

function EmptyState({ texto }: { texto: string }) {
    return <div className="text-center py-8 text-slate-400 dark:text-[#9CA3AF] text-sm bg-slate-50 dark:bg-white/5 rounded-xl border border-[#E6EAF0] dark:border-[#374151]">{texto}</div>
}
