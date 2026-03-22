import React, { useState, useMemo, useEffect } from 'react'
import { usePlanosContext } from '../contexts/PlanosContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import { useCalendarioContext } from '../contexts/CalendarioContext'

const TURMA_COLORS = ['#5B5FEA', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

const CAMPOS_INLINE = [
    { icon: '📋', label: 'Realizado',               key: 'resumoAula' },
    { icon: '✅', label: 'O que aprenderam',         key: 'funcionouBem' },
    { icon: '⭐', label: 'O que faria de novo',      key: 'repetiria' },
    { icon: '💭', label: 'O que faria diferente',   key: 'naoFuncionou' },
    { icon: '🔧', label: 'Poderia ter sido melhor', key: 'poderiaMelhorar' },
    { icon: '💡', label: 'Próxima aula',             key: 'proximaAula' },
    { icon: '👥', label: 'Comportamento',            key: 'comportamento' },
    { icon: '📝', label: 'Anotações gerais',         key: 'anotacoesGerais' },
] as const

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

// F2.1 — calcula dias úteis entre duas datas
function diasUteis(from: Date, to: Date): number {
    let count = 0
    const d = new Date(from)
    d.setHours(0, 0, 0, 0)
    const end = new Date(to)
    end.setHours(0, 0, 0, 0)
    while (d < end) {
        d.setDate(d.getDate() + 1)
        const day = d.getDay()
        if (day !== 0 && day !== 6) count++
    }
    return count
}

export default function TelaPosAulaHistorico() {
    const { planos, editarRegistro } = usePlanosContext()
    const { anosLetivos } = useAnoLetivoContext()
    const { setModalRegistro, setPlanoParaRegistro } = useCalendarioContext()

    // expansão inline por id do registro
    const [expandedId, setExpandedId] = useState<string | number | null>(null)

    const isDark = useIsDark()

    const diasSemanaLabel = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const mesesLabel = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

    // F1.3
    const [campoTrecho, setCampoTrecho] = useState<CampoTrecho>('funcionouBem')

    // F1.5 — filtros
    const [filtroEscola, setFiltroEscola] = useState('todas')
    const [filtroTurma, setFiltroTurma] = useState('todas')
    const [filtroPeriodo, setFiltroPeriodo] = useState('tudo')

    // F1.4 — filtro por badge
    const [filtroAlunoAtencao, setFiltroAlunoAtencao] = useState<string | null>(null)
    const [filtroEngajamento, setFiltroEngajamento] = useState(false)

    // F2.1 — insight dispensado
    const [insightDismissed, setInsightDismissed] = useState(false)

    // F2.4 — modo de vista (V3: padrão é 'turma')
    const [modoVista, setModoVista] = useState<'data' | 'turma'>('turma')
    const [filtroEscolaTurma, setFiltroEscolaTurma] = useState('todas')
    const [turmasAbertas, setTurmasAbertas] = useState<Set<string>>(new Set())

    const toggleTurma = (key: string) => setTurmasAbertas(prev => {
        const next = new Set(prev)
        next.has(key) ? next.delete(key) : next.add(key)
        return next
    })

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

    // F1.5 — escolas únicas
    const escolasUnicas = useMemo(() => {
        const map = new Map<string, string>()
        todosRegistros.forEach(r => { if (r.escola) map.set(String(r.escola), nomeEscola(r)) })
        return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }))
    }, [todosRegistros, anosLetivos])

    // F1.5 — turmas filtradas por escola
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

    // F1.5 — período
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

    const registrosFiltrados = useMemo(() => todosRegistros.filter(r => {
        if (filtroEscola !== 'todas' && String(r.escola) !== filtroEscola) return false
        if (filtroTurma !== 'todas' && `${r.escola}__${r.turma}__${r.segmento || r.serie}` !== filtroTurma) return false
        if (!isInPeriodo(r.data, filtroPeriodo)) return false
        if (filtroAlunoAtencao && (r as any).alunoAtencao !== filtroAlunoAtencao) return false
        if (filtroEngajamento && !(r as any).pontoQueda) return false
        return true
    }), [todosRegistros, filtroEscola, filtroTurma, filtroPeriodo, filtroAlunoAtencao, filtroEngajamento])

    // F2.1 — engine de insights (R2, R3, R5)
    const insight = useMemo((): string | null => {
        if (insightDismissed) return null
        const now = new Date()

        // R2 — mesmo alunoAtencao 3+ vezes no período filtrado
        const alunoCount = new Map<string, { count: number; turma: string }>()
        registrosFiltrados.forEach(r => {
            const aluno = (r as any).alunoAtencao as string | undefined
            if (aluno && aluno.trim()) {
                const key = aluno.trim()
                const prev = alunoCount.get(key)
                alunoCount.set(key, { count: (prev?.count || 0) + 1, turma: `${nomeSeg(r)} · ${nomeTurma(r)}` })
            }
        })
        for (const [nome, { count, turma }] of alunoCount.entries()) {
            if (count >= 3) {
                return `${nome} apareceu em atenção ${count} vezes em ${turma}. Vale uma conversa individual?`
            }
        }

        // R3 — turma sem registro há 10+ dias úteis (usa todos os registros, não só filtrados)
        const ultimoPorTurma = new Map<string, { data: string; r: any }>()
        todosRegistros.forEach(r => {
            const key = `${r.escola}__${r.turma}__${r.segmento || r.serie}`
            const prev = ultimoPorTurma.get(key)
            if (!prev || r.data > prev.data) ultimoPorTurma.set(key, { data: r.data, r })
        })
        for (const [, { data, r }] of ultimoPorTurma.entries()) {
            const d = new Date(data + 'T12:00:00')
            const dias = diasUteis(d, now)
            if (dias >= 10) {
                return `${nomeSeg(r)} · ${nomeTurma(r)} não tem registro há ${dias} dias. Tudo bem por lá?`
            }
        }

        // R5 — comportamento difícil em 3+ aulas consecutivas na mesma turma
        const porTurma = new Map<string, typeof registrosFiltrados>()
        registrosFiltrados.forEach(r => {
            const key = `${r.escola}__${r.turma}__${r.segmento || r.serie}`
            if (!porTurma.has(key)) porTurma.set(key, [])
            porTurma.get(key)!.push(r)
        })
        for (const [, regs] of porTurma.entries()) {
            const sorted = [...regs].sort((a, b) => b.data.localeCompare(a.data))
            let consecutivos = 0
            for (const r of sorted) {
                if ((r as any).comportamento && String((r as any).comportamento).trim()) {
                    consecutivos++
                } else {
                    break
                }
            }
            if (consecutivos >= 3) {
                const r = sorted[0]
                return `${nomeSeg(r)} · ${nomeTurma(r)} teve comportamento difícil nas últimas ${consecutivos} aulas. Pode ser hora de mudar a abordagem?`
            }
        }

        return null
    }, [registrosFiltrados, todosRegistros, insightDismissed, anosLetivos])

    // F2.2 — lacunas (turmas sem registro há 10+ dias úteis)
    const lacunas = useMemo(() => {
        const now = new Date()
        const result: { key: string; label: string; dias: number }[] = []
        const ultimoPorTurma = new Map<string, { data: string; r: any }>()
        todosRegistros.forEach(r => {
            const key = `${r.escola}__${r.turma}__${r.segmento || r.serie}`
            const prev = ultimoPorTurma.get(key)
            if (!prev || r.data > prev.data) ultimoPorTurma.set(key, { data: r.data, r })
        })
        for (const [key, { data, r }] of ultimoPorTurma.entries()) {
            if (filtroEscola !== 'todas' && String(r.escola) !== filtroEscola) continue
            if (filtroTurma !== 'todas' && key !== filtroTurma) continue
            const d = new Date(data + 'T12:00:00')
            const dias = diasUteis(d, now)
            if (dias >= 10) {
                result.push({ key, label: `${nomeSeg(r)} · ${nomeTurma(r)}`, dias })
            }
        }
        return result.sort((a, b) => b.dias - a.dias)
    }, [todosRegistros, filtroEscola, filtroTurma, anosLetivos])

    const porData = registrosFiltrados.reduce<Record<string, typeof registrosFiltrados>>((acc, r) => {
        if (!acc[r.data]) acc[r.data] = []
        acc[r.data].push(r)
        return acc
    }, {})
    const datas = Object.keys(porData).sort((a, b) => b.localeCompare(a))

    const [dataAberta, setDataAberta] = useState<string | null>(null)
    useEffect(() => {
        setDataAberta(prev => {
            if (prev && datas.includes(prev)) return prev
            return datas[0] ?? null
        })
    }, [datas.join(',')])

    // F2.4 — agrupamento por turma
    const escolasParaVistaTurma = useMemo(() => {
        const map = new Map<string, string>()
        todosRegistros.forEach(r => { if (r.escola) map.set(String(r.escola), nomeEscola(r)) })
        return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }))
    }, [todosRegistros, anosLetivos])

    const turmasAgrupadas = useMemo(() => {
        if (modoVista !== 'turma') return []
        const map = new Map<string, { label: string; escola: string; regs: typeof todosRegistros }>()
        todosRegistros.forEach(r => {
            if (filtroEscolaTurma !== 'todas' && String(r.escola) !== filtroEscolaTurma) return
            const key = `${r.escola}__${r.turma}__${r.segmento || r.serie}`
            if (!map.has(key)) {
                map.set(key, { label: `${nomeSeg(r)} · ${nomeTurma(r)}`, escola: nomeEscola(r), regs: [] })
            }
            map.get(key)!.regs.push(r)
        })
        return Array.from(map.entries())
            .map(([key, val]) => ({ key, ...val, regs: val.regs.sort((a, b) => b.data.localeCompare(a.data)) }))
            .sort((a, b) => (b.regs[0]?.data || '').localeCompare(a.regs[0]?.data || ''))
    }, [modoVista, todosRegistros, filtroEscolaTurma, anosLetivos])

    const labelData = (ds: string) => {
        const d = new Date(ds + 'T12:00:00')
        return `${diasSemanaLabel[d.getDay()]}, ${d.getDate()} de ${mesesLabel[d.getMonth()]}`
    }

    const abrirEditar = (r: any) => {
        const plano = planos.find(p => p.id == r.planoId)
        if (plano) setPlanoParaRegistro(plano)
        editarRegistro(r)
        setModalRegistro(true)
    }

    const getTrecho = (r: any): string | null => {
        const val = (r as any)[campoTrecho]
        return val && typeof val === 'string' && val.trim() ? val.trim() : null
    }

    const filtrosAtivos = filtroEscola !== 'todas' || filtroTurma !== 'todas' || filtroPeriodo !== 'tudo' || !!filtroAlunoAtencao || filtroEngajamento
    const limparFiltros = () => {
        setFiltroEscola('todas'); setFiltroTurma('todas'); setFiltroPeriodo('tudo')
        setFiltroAlunoAtencao(null); setFiltroEngajamento(false)
    }

    const c = {
        border:         isDark ? '#374151' : '#E6EAF0',
        selBg:          isDark ? '#1F2937' : 'transparent',
        selText:        isDark ? '#9CA3AF' : '#64748b',
        leftBar:        isDark ? '#374151' : '#CBD5E1',
        badgeBdr:       isDark ? '#374151' : '#E2E8F0',
        btnText:        isDark ? '#9CA3AF' : '#64748b',
        insightBg:      isDark ? '#1F2937' : '#F8FAFC',
        lacunaBdr:      isDark ? '#374151' : '#CBD5E1',
        lacunaText:     isDark ? '#4B5563' : '#94a3b8',
        toggleActive:   isDark ? '#E5E7EB' : '#1e293b',
        toggleInactive: isDark ? '#4B5563' : '#94a3b8',
    }

    const selStyle: React.CSSProperties = {
        fontSize: '12px', padding: '4px 20px 4px 8px', borderRadius: '6px',
        border: `1px solid ${c.border}`, background: c.selBg, color: c.selText,
        cursor: 'pointer', fontFamily: 'inherit', appearance: 'none',
    }

    const renderRegistroRow = (r: any, j: number, showDate = false) => {
        const trecho = getTrecho(r)
        const alunoAtencao = (r as any).alunoAtencao as string | undefined
        const pontoQueda = (r as any).pontoQueda as string | undefined
        const hasLine2 = trecho || alunoAtencao || pontoQueda
        const regId = r.id ?? j
        const isExpanded = expandedId === regId

        const camposPreenchidos = CAMPOS_INLINE.filter(c => {
            const val = (r as any)[c.key]
            return val && typeof val === 'string' && val.trim()
        })

        return (
            <div key={j} style={{ borderLeft: `4px solid ${c.leftBar}` }}>
                {/* ── linha compacta ── */}
                <div className="px-4 py-2.5 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : regId)}>
                    <div className="flex-1 min-w-0 pt-px">
                        <div className="flex items-center">
                            {showDate ? (
                                <span className="text-[12px] font-medium text-slate-600 dark:text-[#9CA3AF]">{labelData(r.data)}</span>
                            ) : (
                                <>
                                    <span className="text-[12px] font-medium text-slate-600 dark:text-[#9CA3AF]">{nomeSeg(r)}</span>
                                    <span className="text-slate-200 dark:text-slate-700 mx-1.5 text-xs">·</span>
                                    <span className="text-[12px] text-slate-400 dark:text-[#6b7280]">{nomeTurma(r)}</span>
                                </>
                            )}
                        </div>
                        {hasLine2 && !isExpanded && (
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                {trecho && (
                                    <span className="text-[11px] italic" style={{ color: '#94a3b8', maxWidth: '210px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
                                        "{trecho.length > 58 ? trecho.slice(0, 58) + '…' : trecho}"
                                    </span>
                                )}
                                {alunoAtencao && (
                                    <button onClick={e => { e.stopPropagation(); setFiltroAlunoAtencao(filtroAlunoAtencao === alunoAtencao ? null : alunoAtencao) }}
                                        style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '999px', border: `1px solid ${c.badgeBdr}`, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                                        👤 {alunoAtencao}
                                    </button>
                                )}
                                {pontoQueda && (
                                    <button onClick={e => { e.stopPropagation(); setFiltroEngajamento(!filtroEngajamento) }}
                                        style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '999px', border: `1px solid ${c.badgeBdr}`, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                                        📉 engajamento
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    <span style={{ fontSize: '10px', color: c.btnText, flexShrink: 0, marginTop: '2px' }}>
                        {isExpanded ? '▲' : '▼'}
                    </span>
                </div>

                {/* ── expansão inline ── */}
                {isExpanded && (
                    <div style={{ borderTop: `1px solid ${isDark ? '#374151' : '#F1F4F8'}`, padding: '12px 16px 14px', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
                        {camposPreenchidos.length === 0 ? (
                            <p className="text-[12px]" style={{ color: '#94a3b8' }}>Nenhum campo preenchido.</p>
                        ) : (
                            <div className="space-y-3">
                                {camposPreenchidos.map(campo => (
                                    <div key={campo.key}>
                                        <p className="text-[10.5px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: isDark ? '#4B5563' : '#94a3b8' }}>
                                            {campo.icon} {campo.label}
                                        </p>
                                        <p className="text-[12.5px] leading-relaxed" style={{ color: isDark ? '#D1D5DB' : '#374151' }}>
                                            {(r as any)[campo.key]}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="mt-4 flex justify-end">
                            <button onClick={e => { e.stopPropagation(); abrirEditar(r) }}
                                style={{ fontSize: '11.5px', padding: '5px 12px', borderRadius: '7px', border: `1px solid ${c.border}`, background: 'transparent', color: c.btnText, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                                ✏️ Editar registro
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-3 pb-24">

            {/* ── CABEÇALHO ── */}
            <div>
                <h1 className="text-[17px] font-bold tracking-tight text-slate-800 dark:text-[#E5E7EB]">Histórico</h1>
                <p className="text-[12.5px] text-slate-500 dark:text-[#9CA3AF] mt-0.5">Registros pós-aula anteriores</p>
            </div>

            {/* F1.5 — Filtros */}
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

            {/* F1.3 — Seletor de trecho */}
            <div className="flex items-center gap-2">
                <span className="text-[11px]" style={{ color: '#94a3b8' }}>Mostrar como trecho:</span>
                <div style={{ position: 'relative' }}>
                    <select value={campoTrecho} onChange={e => setCampoTrecho(e.target.value as CampoTrecho)} style={selStyle}>
                        {CAMPOS_TRECHO.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '9px', color: '#94a3b8' }}>▾</span>
                </div>
            </div>

            {/* F1.4 — chips de filtro ativo */}
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

            {/* F2.1 — Banner de insight */}
            {insight && (
                <div style={{ background: c.insightBg, border: `1px solid ${c.border}`, borderLeft: `3px solid #94a3b8`, borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ fontSize: '14px', lineHeight: 1, marginTop: '1px', flexShrink: 0 }}>⚡</span>
                    <span style={{ fontSize: '12.5px', color: isDark ? '#9CA3AF' : '#475569', flex: 1, lineHeight: '1.5' }}>{insight}</span>
                    <button onClick={() => setInsightDismissed(true)} style={{ fontSize: '16px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1, flexShrink: 0, fontFamily: 'inherit' }}>×</button>
                </div>
            )}

            {/* F2.4 — Toggle por data / por turma */}
            <div className="flex items-center gap-4">
                {(['data', 'turma'] as const).map(modo => (
                    <button key={modo} onClick={() => setModoVista(modo)}
                        style={{ fontSize: '12px', fontFamily: 'inherit', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', fontWeight: modoVista === modo ? 600 : 400, color: modoVista === modo ? c.toggleActive : c.toggleInactive, borderBottom: modoVista === modo ? `2px solid ${c.toggleActive}` : '2px solid transparent', transition: 'all 120ms' }}>
                        {modo === 'data' ? 'Por data' : 'Por turma'}
                    </button>
                ))}
                {/* seletor de escola no modo por turma (quando há mais de 1 escola) */}
                {modoVista === 'turma' && escolasParaVistaTurma.length > 1 && (
                    <div style={{ position: 'relative', marginLeft: 'auto' }}>
                        <select value={filtroEscolaTurma} onChange={e => setFiltroEscolaTurma(e.target.value)} style={selStyle}>
                            <option value="todas">Todas as escolas</option>
                            {escolasParaVistaTurma.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                        </select>
                        <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '9px', color: '#94a3b8' }}>▾</span>
                    </div>
                )}
            </div>

            {/* ── LISTA ── */}
            {modoVista === 'data' ? (
                /* ── MODO POR DATA ── */
                datas.length === 0 && lacunas.length === 0 ? (
                    <div className="v2-card rounded-xl border border-[#E6EAF0] dark:border-[#374151] px-4 py-10 text-center space-y-1">
                        <p className="text-[13px] text-slate-400 dark:text-[#6b7280]">Nenhum registro encontrado.</p>
                        <p className="text-[12px] text-slate-300 dark:text-[#4B5563]">Os registros aparecerão aqui após a primeira aula registrada.</p>
                    </div>
                ) : (
                    <>
                        {/* F2.2 — Lacunas */}
                        {lacunas.length > 0 && (
                            <div className="space-y-1">
                                {lacunas.map(l => (
                                    <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                                        <div style={{ flex: 1, borderTop: `1px dashed ${c.lacunaBdr}` }} />
                                        <span style={{ fontSize: '11px', color: c.lacunaText, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                            {l.label} · sem registro há {l.dias} dias
                                        </span>
                                        <div style={{ flex: 1, borderTop: `1px dashed ${c.lacunaBdr}` }} />
                                    </div>
                                ))}
                            </div>
                        )}

                        {datas.length > 0 && (
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
                                                    {regs.map((r, j) => renderRegistroRow(r, j))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </>
                )
            ) : (
                /* ── MODO POR TURMA — V3: card por turma + mini-timeline ── */
                turmasAgrupadas.length === 0 ? (
                    <div className="v2-card rounded-xl border border-[#E6EAF0] dark:border-[#374151] px-4 py-10 text-center">
                        <p className="text-[13px] text-slate-400 dark:text-[#6b7280]">Nenhum registro encontrado.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {turmasAgrupadas.map((grupo, colorIdx) => {
                            const isOpen = turmasAbertas.has(grupo.key)
                            const lacuna = lacunas.find(l => l.key === grupo.key)
                            const cor = lacuna
                                ? (isDark ? '#374151' : '#e2e8f0')
                                : TURMA_COLORS[colorIdx % TURMA_COLORS.length]

                            return (
                                <div key={grupo.key} className="v2-card" style={{ borderRadius: '12px', border: `1px solid ${c.border}`, overflow: 'hidden', boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.06)' }}>
                                    {/* ── Cabeçalho da turma ── */}
                                    <div onClick={() => toggleTurma(grupo.key)}
                                        style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none', borderBottom: isOpen ? `1px solid ${c.border}` : 'none', transition: 'background 100ms' }}
                                        className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                                        {/* barra de cor */}
                                        <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, flexShrink: 0, minHeight: 16, background: cor }} />
                                        {/* nome + escola */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: isDark ? '#E5E7EB' : '#1e293b' }}>{grupo.label}</div>
                                            {escolasParaVistaTurma.length > 1 && (
                                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 1 }}>{grupo.escola}</div>
                                            )}
                                        </div>
                                        {/* badges */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {lacuna && (
                                                <span style={{ fontSize: '10px', color: '#f97316', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', padding: '2px 6px', borderRadius: 999, fontWeight: 600 }}>
                                                    {lacuna.dias}d sem reg.
                                                </span>
                                            )}
                                            <span style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#34d399' : '#059669', background: isDark ? 'rgba(16,185,129,0.08)' : '#ecfdf5', border: isDark ? '1px solid rgba(16,185,129,0.2)' : '1px solid #a7f3d0', padding: '2px 7px', borderRadius: 999 }}>
                                                {grupo.regs.length} reg.
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '10px', color: isDark ? '#4B5563' : '#cbd5e1', marginLeft: 4 }}>{isOpen ? '▲' : '▼'}</span>
                                    </div>

                                    {/* ── Mini-timeline interna ── */}
                                    {isOpen && grupo.regs.map((r, j) => {
                                        const d = new Date(r.data + 'T12:00:00')
                                        const regId = r.id ?? `${grupo.key}-${j}`
                                        const isExpanded = expandedId === regId
                                        const trecho = getTrecho(r)
                                        const alunoAtencao = (r as any).alunoAtencao as string | undefined
                                        const pontoQueda = (r as any).pontoQueda as string | undefined
                                        const isLast = j === grupo.regs.length - 1
                                        const camposPreenchidos = CAMPOS_INLINE.filter(campo => {
                                            const val = (r as any)[campo.key]
                                            return val && typeof val === 'string' && val.trim()
                                        })

                                        return (
                                            <div key={j}>
                                                {/* linha do registro */}
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, padding: '10px 16px', borderBottom: (!isLast || isExpanded) ? `1px solid ${isDark ? 'rgba(55,65,81,0.4)' : '#F1F4F8'}` : 'none', transition: 'background 100ms', cursor: 'pointer' }}
                                                    className="hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                                                    onClick={() => setExpandedId(isExpanded ? null : regId)}>
                                                    {/* data */}
                                                    <div style={{ width: 36, flexShrink: 0, textAlign: 'center', marginRight: 10, paddingTop: 1 }}>
                                                        <span style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8', display: 'block', lineHeight: 1 }}>{d.getDate()}</span>
                                                        <span style={{ fontSize: 9.5, color: '#cbd5e1', textTransform: 'uppercase', display: 'block', marginTop: 1 }}>{mesesLabel[d.getMonth()]}</span>
                                                    </div>
                                                    {/* conector vertical */}
                                                    <div style={{ width: 1, background: isDark ? '#374151' : '#E6EAF0', flexShrink: 0, alignSelf: 'stretch', marginRight: 10, minHeight: 24, position: 'relative' }}>
                                                        <div style={{ position: 'absolute', left: -2, top: 4, width: 5, height: 5, borderRadius: '50%', background: isDark ? '#374151' : '#CBD5E1', border: `1px solid ${isDark ? '#4B5563' : '#E6EAF0'}` }} />
                                                    </div>
                                                    {/* conteúdo */}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        {trecho && (
                                                            <div style={{ fontSize: 11.5, fontStyle: 'italic', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                "{trecho.length > 60 ? trecho.slice(0, 60) + '…' : trecho}"
                                                            </div>
                                                        )}
                                                        {(alunoAtencao || pontoQueda) && (
                                                            <div style={{ display: 'flex', gap: 4, marginTop: trecho ? 4 : 0, flexWrap: 'wrap' }}>
                                                                {alunoAtencao && (
                                                                    <button onClick={e => { e.stopPropagation(); setFiltroAlunoAtencao(filtroAlunoAtencao === alunoAtencao ? null : alunoAtencao) }}
                                                                        style={{ fontSize: 10.5, padding: '1px 7px', borderRadius: 999, border: `1px solid ${c.badgeBdr}`, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit' }}>
                                                                        👤 {alunoAtencao}
                                                                    </button>
                                                                )}
                                                                {pontoQueda && (
                                                                    <button onClick={e => { e.stopPropagation(); setFiltroEngajamento(!filtroEngajamento) }}
                                                                        style={{ fontSize: 10.5, padding: '1px 7px', borderRadius: 999, border: `1px solid ${c.badgeBdr}`, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit' }}>
                                                                        📉 engajamento
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* ver / fechar */}
                                                    <button onClick={e => { e.stopPropagation(); setExpandedId(isExpanded ? null : regId) }}
                                                        style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent', color: c.btnText, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, alignSelf: 'flex-start', transition: 'all 120ms' }}>
                                                        {isExpanded ? '▲' : 'Ver'}
                                                    </button>
                                                </div>

                                                {/* expansão inline */}
                                                {isExpanded && (
                                                    <div style={{ borderBottom: !isLast ? `1px solid ${isDark ? 'rgba(55,65,81,0.4)' : '#F1F4F8'}` : 'none', padding: '12px 16px 14px 62px', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
                                                        {camposPreenchidos.length === 0 ? (
                                                            <p style={{ fontSize: 12, color: '#94a3b8' }}>Nenhum campo preenchido.</p>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                                {camposPreenchidos.map(campo => (
                                                                    <div key={campo.key}>
                                                                        <p style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: isDark ? '#4B5563' : '#94a3b8', marginBottom: 2 }}>
                                                                            {campo.icon} {campo.label}
                                                                        </p>
                                                                        <p style={{ fontSize: 12.5, lineHeight: 1.55, color: isDark ? '#D1D5DB' : '#374151' }}>
                                                                            {(r as any)[campo.key]}
                                                                        </p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                                                            <button onClick={e => { e.stopPropagation(); abrirEditar(r) }}
                                                                style={{ fontSize: 11.5, padding: '5px 12px', borderRadius: 7, border: `1px solid ${c.border}`, background: 'transparent', color: c.btnText, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                                                                ✏️ Editar registro
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )
                        })}
                    </div>
                )
            )}
        </div>
    )
}
