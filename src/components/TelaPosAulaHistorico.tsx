import React, { useState, useMemo, useEffect } from 'react'
import { usePlanosContext } from '../contexts/PlanosContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import { useCalendarioContext } from '../contexts/CalendarioContext'

function useIsDark() {
    const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
    useEffect(() => {
        const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')))
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        return () => obs.disconnect()
    }, [])
    return dark
}

// F1.3 — campos disponíveis para exibir como trecho na linha 2
const CAMPOS_TRECHO = [
    { value: 'funcionouBem',    label: 'O que aprenderam' },
    { value: 'repetiria',       label: 'O que funcionou' },
    { value: 'naoFuncionou',    label: 'O que faria diferente' },
    { value: 'surpresaMusical', label: 'O que fizeram de inesperado' },
] as const

type CampoTrecho = typeof CAMPOS_TRECHO[number]['value']

export default function TelaPosAulaHistorico() {
    const { planos } = usePlanosContext()
    const { anosLetivos } = useAnoLetivoContext()
    const { setModalRegistro, setRrData, setRrAnoSel, setRrEscolaSel,
        setRrTextos, setRrPlanosSegmento, setRrResultados, setRrRubricas, setRrEncaminhamentos,
        setRrTurmaId, setRrSegmentoId } = useCalendarioContext()

    const isDark = useIsDark()

    const diasSemanaLabel = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const mesesLabel = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

    // F1.3 — campo selecionado para trecho
    const [campoTrecho, setCampoTrecho] = useState<CampoTrecho>('funcionouBem')

    // F1.5 — filtros de escola · turma · período
    const [filtroEscola, setFiltroEscola] = useState('todas')
    const [filtroTurma, setFiltroTurma] = useState('todas')
    const [filtroPeriodo, setFiltroPeriodo] = useState('tudo')

    // F1.4 — filtro rápido por badge (clicável)
    const [filtroAlunoAtencao, setFiltroAlunoAtencao] = useState<string | null>(null)
    const [filtroEngajamento, setFiltroEngajamento] = useState(false)

    const todosRegistros = useMemo(() =>
        planos.flatMap(p =>
            (p.registrosPosAula || []).map(r => ({ ...r, planoTitulo: p.titulo, planoId: p.id }))
        ),
    [planos])

    const nomeEscola = (r: any) => {
        const ano = anosLetivos.find(a => a.id == r.anoLetivo)
        return ano?.escolas.find(e => e.id == r.escola)?.nome || '?'
    }
    const nomeSeg = (r: any) => {
        const ano = anosLetivos.find(a => a.id == r.anoLetivo)
        const esc = ano?.escolas.find(e => e.id == r.escola)
        return esc?.segmentos.find(s => s.id == (r.segmento || r.serie))?.nome || '?'
    }
    const nomeTurma = (r: any) => {
        const ano = anosLetivos.find(a => a.id == r.anoLetivo)
        const esc = ano?.escolas.find(e => e.id == r.escola)
        const seg = esc?.segmentos.find(s => s.id == (r.segmento || r.serie))
        return seg?.turmas.find(t => t.id == r.turma)?.nome || '?'
    }

    // F1.5 — opções de escola (únicas nos registros)
    const escolasUnicas = useMemo(() => {
        const map = new Map<string, string>()
        todosRegistros.forEach(r => { if (r.escola) map.set(String(r.escola), nomeEscola(r)) })
        return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }))
    }, [todosRegistros, anosLetivos])

    // F1.5 — turmas filtradas pela escola selecionada
    const turmasUnicas = useMemo(() => {
        const map = new Map<string, string>()
        todosRegistros.forEach(r => {
            if (filtroEscola !== 'todas' && String(r.escola) !== filtroEscola) return
            if (r.turma) {
                const key = `${r.escola}__${r.turma}__${r.segmento || r.serie}`
                if (!map.has(key)) map.set(key, `${nomeSeg(r)} · ${nomeTurma(r)}`)
            }
        })
        return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }))
    }, [todosRegistros, filtroEscola, anosLetivos])

    // F1.5 — verificação de período
    const isInPeriodo = (dateStr: string, periodo: string) => {
        if (periodo === 'tudo') return true
        const now = new Date()
        const d = new Date(dateStr + 'T12:00:00')
        if (periodo === 'semana') {
            const start = new Date(now)
            start.setDate(now.getDate() - now.getDay())
            start.setHours(0, 0, 0, 0)
            return d >= start
        }
        if (periodo === 'mes') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        if (periodo === '3meses') {
            const start = new Date(now)
            start.setMonth(now.getMonth() - 3)
            return d >= start
        }
        return true
    }

    // Registros filtrados por todos os critérios
    const registrosFiltrados = useMemo(() => todosRegistros.filter(r => {
        if (filtroEscola !== 'todas' && String(r.escola) !== filtroEscola) return false
        if (filtroTurma !== 'todas' && `${r.escola}__${r.turma}__${r.segmento || r.serie}` !== filtroTurma) return false
        if (!isInPeriodo(r.data, filtroPeriodo)) return false
        if (filtroAlunoAtencao && (r as any).alunoAtencao !== filtroAlunoAtencao) return false
        if (filtroEngajamento && !(r as any).pontoQueda) return false
        return true
    }), [todosRegistros, filtroEscola, filtroTurma, filtroPeriodo, filtroAlunoAtencao, filtroEngajamento])

    const porData = registrosFiltrados.reduce<Record<string, typeof registrosFiltrados>>((acc, r) => {
        if (!acc[r.data]) acc[r.data] = []
        acc[r.data].push(r)
        return acc
    }, {})
    const datas = Object.keys(porData).sort((a, b) => b.localeCompare(a))

    const [dataAberta, setDataAberta] = useState<string | null>(null)
    // Mantém data aberta válida; abre a primeira quando muda
    useEffect(() => {
        setDataAberta(prev => {
            if (prev && datas.includes(prev)) return prev
            return datas[0] ?? null
        })
    }, [datas.join(',')])

    const labelData = (ds: string) => {
        const d = new Date(ds + 'T12:00:00')
        return `${diasSemanaLabel[d.getDay()]}, ${d.getDate()} de ${mesesLabel[d.getMonth()]}`
    }

    const abrirRegistro = (r: any) => {
        setRrData(r.data)
        setRrAnoSel(r.anoLetivo)
        setRrEscolaSel(r.escola)
        setRrTextos({})
        setRrPlanosSegmento({})
        setRrResultados({})
        setRrRubricas({})
        setRrEncaminhamentos({})
        setRrTurmaId(String(r.turma))
        setRrSegmentoId(String(r.segmento || r.serie))
        setModalRegistro(true)
    }

    // F1.3 — extrai trecho do campo selecionado
    const getTrecho = (r: any): string | null => {
        const val = (r as any)[campoTrecho]
        return val && typeof val === 'string' && val.trim() ? val.trim() : null
    }

    const filtrosAtivos = filtroEscola !== 'todas' || filtroTurma !== 'todas' || filtroPeriodo !== 'tudo' || !!filtroAlunoAtencao || filtroEngajamento
    const limparFiltros = () => {
        setFiltroEscola('todas'); setFiltroTurma('todas'); setFiltroPeriodo('tudo')
        setFiltroAlunoAtencao(null); setFiltroEngajamento(false)
    }

    // tokens de cor
    const c = {
        border:  isDark ? '#374151' : '#E6EAF0',
        selBg:   isDark ? '#1F2937' : 'transparent',
        selText: isDark ? '#9CA3AF' : '#64748b',
        leftBar: isDark ? '#374151' : '#CBD5E1',
        badgeBdr: isDark ? '#374151' : '#E2E8F0',
        btnText: isDark ? '#9CA3AF' : '#64748b',
    }

    const selStyle: React.CSSProperties = {
        fontSize: '12px', padding: '4px 20px 4px 8px', borderRadius: '6px',
        border: `1px solid ${c.border}`, background: c.selBg, color: c.selText,
        cursor: 'pointer', fontFamily: 'inherit', appearance: 'none',
    }

    return (
        <div className="max-w-2xl mx-auto space-y-3 pb-24">

            {/* ── CABEÇALHO ── */}
            <div>
                <h1 className="text-[17px] font-bold tracking-tight text-slate-800 dark:text-[#E5E7EB]">Histórico</h1>
                <p className="text-[12.5px] text-slate-500 dark:text-[#9CA3AF] mt-0.5">Registros pós-aula anteriores</p>
            </div>

            {/* F1.5 — Filtros: escola · turma · período */}
            <div className="flex items-center gap-2 flex-wrap">
                {([
                    {
                        value: filtroEscola,
                        onChange: (v: string) => { setFiltroEscola(v); setFiltroTurma('todas') },
                        options: [{ value: 'todas', label: 'Todas as escolas' }, ...escolasUnicas.map(e => ({ value: e.id, label: e.nome }))],
                    },
                    {
                        value: filtroTurma,
                        onChange: (v: string) => setFiltroTurma(v),
                        options: [{ value: 'todas', label: 'Todas as turmas' }, ...turmasUnicas.map(t => ({ value: t.id, label: t.nome }))],
                    },
                    {
                        value: filtroPeriodo,
                        onChange: (v: string) => setFiltroPeriodo(v),
                        options: [
                            { value: 'tudo', label: 'Tudo' },
                            { value: 'semana', label: 'Esta semana' },
                            { value: 'mes', label: 'Este mês' },
                            { value: '3meses', label: 'Últimos 3 meses' },
                        ],
                    },
                ] as const).map((sel, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                        <select value={sel.value} onChange={e => (sel.onChange as (v: string) => void)(e.target.value)} style={selStyle}>
                            {sel.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '9px', color: '#94a3b8' }}>▾</span>
                    </div>
                ))}
                {filtrosAtivos && (
                    <button onClick={limparFiltros} style={{ fontSize: '11px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px', fontFamily: 'inherit' }}>
                        limpar
                    </button>
                )}
            </div>

            {/* F1.3 — Seletor de campo para trecho */}
            <div className="flex items-center gap-2">
                <span className="text-[11px]" style={{ color: '#94a3b8' }}>Mostrar como trecho:</span>
                <div style={{ position: 'relative' }}>
                    <select value={campoTrecho} onChange={e => setCampoTrecho(e.target.value as CampoTrecho)} style={selStyle}>
                        {CAMPOS_TRECHO.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '9px', color: '#94a3b8' }}>▾</span>
                </div>
            </div>

            {/* F1.4 — chips de filtro ativo por badge */}
            {(filtroAlunoAtencao || filtroEngajamento) && (
                <div className="flex items-center gap-2 flex-wrap">
                    {filtroAlunoAtencao && (
                        <button onClick={() => setFiltroAlunoAtencao(null)}
                            style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', border: `1px solid ${c.badgeBdr}`, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit' }}>
                            👤 {filtroAlunoAtencao} ×
                        </button>
                    )}
                    {filtroEngajamento && (
                        <button onClick={() => setFiltroEngajamento(false)}
                            style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', border: `1px solid ${c.badgeBdr}`, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit' }}>
                            📉 engajamento ×
                        </button>
                    )}
                </div>
            )}

            {/* ── LISTA ── */}
            {datas.length === 0 ? (
                <div className="v2-card rounded-xl border border-[#E6EAF0] dark:border-[#374151] px-4 py-10 text-center space-y-1">
                    <p className="text-[13px] text-slate-400 dark:text-[#6b7280]">Nenhum registro encontrado.</p>
                    <p className="text-[12px] text-slate-300 dark:text-[#4B5563]">Os registros aparecerão aqui após a primeira aula registrada.</p>
                </div>
            ) : (
                <div className="v2-card rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)] overflow-hidden border border-[#E6EAF0] dark:border-[#374151]">
                    {datas.map((ds, i) => {
                        const regs = porData[ds]
                        const aberto = dataAberta === ds
                        return (
                            <div key={ds} className={i > 0 ? 'border-t border-[#E6EAF0] dark:border-[#374151]' : ''}>
                                <button
                                    onClick={() => setDataAberta(aberto ? null : ds)}
                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition text-left">
                                    <span className="flex-1 text-[13px] font-medium text-slate-700 dark:text-[#E5E7EB]">
                                        {labelData(ds)}
                                    </span>
                                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                                        {regs.length} reg.
                                    </span>
                                    <span className="text-slate-300 dark:text-slate-600 text-xs ml-1">
                                        {aberto ? '▲' : '▼'}
                                    </span>
                                </button>

                                {aberto && (
                                    <div className="border-t border-[#F1F4F8] dark:border-[#374151]/60 divide-y divide-[#F1F4F8] dark:divide-[#374151]/60">
                                        {regs.map((r, j) => {
                                            const trecho = getTrecho(r)
                                            const alunoAtencao = (r as any).alunoAtencao as string | undefined
                                            const pontoQueda = (r as any).pontoQueda as string | undefined
                                            const hasLine2 = trecho || alunoAtencao || pontoQueda
                                            return (
                                                // F1.1 — barra lateral neutra (substitui o dot ●)
                                                <div key={j} className="px-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition"
                                                    style={{ borderLeft: `4px solid ${c.leftBar}` }}>
                                                    <div className="py-2.5 flex items-start gap-3">
                                                        <div className="flex-1 min-w-0 pt-px">
                                                            {/* linha 1 — segmento · turma */}
                                                            <div className="flex items-center">
                                                                <span className="text-[12px] font-medium text-slate-600 dark:text-[#9CA3AF]">{nomeSeg(r)}</span>
                                                                <span className="text-slate-200 dark:text-slate-700 mx-1.5 text-xs">·</span>
                                                                <span className="text-[12px] text-slate-400 dark:text-[#6b7280]">{nomeTurma(r)}</span>
                                                            </div>
                                                            {/* linha 2 — F1.3 trecho + F1.4 badges */}
                                                            {hasLine2 && (
                                                                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                                                    {/* F1.3 — trecho do campo selecionado */}
                                                                    {trecho && (
                                                                        <span className="text-[11px] italic" style={{ color: '#94a3b8', maxWidth: '210px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
                                                                            "{trecho.length > 58 ? trecho.slice(0, 58) + '…' : trecho}"
                                                                        </span>
                                                                    )}
                                                                    {/* F1.4 — badge aluno em atenção */}
                                                                    {alunoAtencao && (
                                                                        <button
                                                                            onClick={e => { e.stopPropagation(); setFiltroAlunoAtencao(filtroAlunoAtencao === alunoAtencao ? null : alunoAtencao) }}
                                                                            style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '999px', border: `1px solid ${c.badgeBdr}`, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                                                                            👤 {alunoAtencao}
                                                                        </button>
                                                                    )}
                                                                    {/* F1.4 — badge queda de engajamento */}
                                                                    {pontoQueda && (
                                                                        <button
                                                                            onClick={e => { e.stopPropagation(); setFiltroEngajamento(!filtroEngajamento) }}
                                                                            style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '999px', border: `1px solid ${c.badgeBdr}`, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                                                                            📉 engajamento
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button onClick={() => abrirRegistro(r)} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', border: `1px solid ${c.border}`, background: 'transparent', color: c.btnText, transition: 'all 120ms ease', flexShrink: 0 }}>
                                                            Ver
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
