import React, { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react'
import { usePlanosContext } from '../contexts/PlanosContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import { useCalendarioContext } from '../contexts/CalendarioContext'

const ModalRegistroPosAula = lazy(() => import('./modals/ModalRegistroPosAula'))

const TURMA_COLORS = ['#5B5FEA', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

const CAMPOS_INLINE = [
    { icon: '📋', label: 'Realizado',                   key: 'resumoAula' },
    { icon: '✅', label: 'O que aprenderam',             key: 'funcionouBem' },
    { icon: '⭐', label: 'O que faria de novo',          key: 'repetiria' },
    { icon: '💭', label: 'O que faria diferente',       key: 'naoFuncionou' },
    { icon: '🎵', label: 'O que fizeram de inesperado', key: 'surpresaMusical' },
    { icon: '📉', label: 'Queda de engajamento',        key: 'pontoQueda' },
    { icon: '👤', label: 'Aluno com atenção',            key: 'alunoAtencao' },
    { icon: '🏫', label: 'Como a aula aconteceu',       key: 'contextoAulaDetalhe' },
    { icon: '💡', label: 'Próxima aula',                key: 'proximaAula' },
    { icon: '👥', label: 'Comportamento',               key: 'comportamento' },
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
    { value: 'funcionouBem',        label: 'O que aprenderam' },
    { value: 'repetiria',           label: 'O que funcionou' },
    { value: 'naoFuncionou',        label: 'O que faria diferente' },
    { value: 'surpresaMusical',     label: 'O que fizeram de inesperado' },
    { value: 'pontoQueda',          label: 'Queda de engajamento' },
    { value: 'alunoAtencao',        label: 'Aluno com atenção' },
    { value: 'contextoAulaDetalhe', label: 'Como a aula aconteceu' },
] as const

type CampoTrecho = typeof CAMPOS_TRECHO[number]['value'] | 'todos'

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
    const { setPlanoParaRegistro } = useCalendarioContext()

    // expansão inline por id do registro
    const [expandedId, setExpandedId] = useState<string | number | null>(null)

    // painel lateral de edição
    const [painelAberto, setPainelAberto] = useState(false)
    const [painelVisible, setPainelVisible] = useState(false)

    useEffect(() => {
        if (painelAberto) requestAnimationFrame(() => setPainelVisible(true))
        else setPainelVisible(false)
    }, [painelAberto])

    const isDark = useIsDark()

    const diasSemanaLabel = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const mesesLabel = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

    // F1.3 — multi-select de campos para trecho
    const [camposTrecho, setCamposTrecho] = useState<Set<string>>(new Set(['funcionouBem']))
    const [trechoMenuAberto, setTrechoMenuAberto] = useState(false)
    const trechoMenuRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (!trechoMenuAberto) return
        const handler = (e: MouseEvent) => {
            if (trechoMenuRef.current && !trechoMenuRef.current.contains(e.target as Node))
                setTrechoMenuAberto(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [trechoMenuAberto])

    // F1.5 — filtros
    const [filtroEscola, setFiltroEscola] = useState('todas')
    const [filtroSegmento, setFiltroSegmento] = useState('todos')
    const [filtroTurma, setFiltroTurma] = useState('todas')
    const [filtroPeriodo, setFiltroPeriodo] = useState('tudo')
    const [filtroCustomDe, setFiltroCustomDe] = useState('')
    const [filtroCustomAte, setFiltroCustomAte] = useState('')

    // F1.4 — filtro por badge
    const [filtroAlunoAtencao, setFiltroAlunoAtencao] = useState<string | null>(null)
    const [filtroEngajamento, setFiltroEngajamento] = useState(false)

    // F2.1 — insight dispensado
    const [insightDismissed, setInsightDismissed] = useState(false)

    // F2.4 — modo de vista (V3: padrão é 'turma')
    const [modoVista, setModoVista] = useState<'data' | 'turma'>('turma')
    // cards abertos por padrão — só rastreia os que o usuário fechou explicitamente
    const [turmasFechadas, setTurmasFechadas] = useState<Set<string>>(new Set())
    const toggleTurma = (key: string) => setTurmasFechadas(prev => {
        const next = new Set(prev)
        next.has(key) ? next.delete(key) : next.add(key)
        return next
    })

    // hover por linha — controla visibilidade do botão Editar
    const [hoveredId, setHoveredId] = useState<string | null>(null)

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

    // F1.5 — séries únicas filtradas por escola
    const seriesUnicas = useMemo(() => {
        const map = new Map<string, { nomeSimples: string; escolaId: string; escolaNome: string }>()
        todosRegistros.forEach(r => {
            if (filtroEscola !== 'todas' && String(r.escola) !== filtroEscola) return
            const segId = String(r.segmento || r.serie || '')
            if (segId) {
                const key = `${r.escola}__${segId}`
                if (!map.has(key)) map.set(key, { nomeSimples: nomeSeg(r), escolaId: String(r.escola), escolaNome: nomeEscola(r) })
            }
        })
        return Array.from(map.entries()).map(([id, val]) => ({ id, ...val }))
    }, [todosRegistros, filtroEscola, anosLetivos])

    // F1.5 — turmas filtradas por escola e série
    const turmasUnicas = useMemo(() => {
        const map = new Map<string, { nomeSimples: string; escolaId: string; escolaNome: string }>()
        todosRegistros.forEach(r => {
            if (filtroEscola !== 'todas' && String(r.escola) !== filtroEscola) return
            if (filtroSegmento !== 'todos' && `${r.escola}__${r.segmento || r.serie}` !== filtroSegmento) return
            if (r.turma) {
                const key = `${r.escola}__${r.turma}__${r.segmento || r.serie}`
                if (!map.has(key)) map.set(key, { nomeSimples: nomeTurma(r), escolaId: String(r.escola), escolaNome: nomeEscola(r) })
            }
        })
        return Array.from(map.entries()).map(([id, val]) => ({ id, ...val }))
    }, [todosRegistros, filtroEscola, filtroSegmento, anosLetivos])

    // F1.5 — período
    const isInPeriodo = (dateStr: string, periodo: string): boolean => {
        if (periodo === 'tudo') return true
        const now = new Date()
        const d = new Date(dateStr + 'T12:00:00')
        if (periodo === 'semana') {
            const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0)
            return d >= start
        }
        if (periodo === '3dias') {
            const start = new Date(now); start.setDate(now.getDate() - 3); start.setHours(0,0,0,0)
            return d >= start
        }
        if (periodo === '7dias') {
            const start = new Date(now); start.setDate(now.getDate() - 7); start.setHours(0,0,0,0)
            return d >= start
        }
        if (periodo === 'mes') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        if (periodo === '3meses') {
            const start = new Date(now); start.setMonth(now.getMonth() - 3)
            return d >= start
        }
        if (periodo === 'personalizado') {
            if (filtroCustomDe && d < new Date(filtroCustomDe + 'T00:00:00')) return false
            if (filtroCustomAte && d > new Date(filtroCustomAte + 'T23:59:59')) return false
            return true
        }
        return true
    }

    const registrosFiltrados = useMemo(() => todosRegistros.filter(r => {
        if (filtroEscola !== 'todas' && String(r.escola) !== filtroEscola) return false
        if (filtroSegmento !== 'todos' && `${r.escola}__${r.segmento || r.serie}` !== filtroSegmento) return false
        if (filtroTurma !== 'todas' && `${r.escola}__${r.turma}__${r.segmento || r.serie}` !== filtroTurma) return false
        if (!isInPeriodo(r.data, filtroPeriodo)) return false
        if (filtroAlunoAtencao && (r as any).alunoAtencao !== filtroAlunoAtencao) return false
        if (filtroEngajamento && !(r as any).pontoQueda) return false
        return true
    }), [todosRegistros, filtroEscola, filtroSegmento, filtroTurma, filtroPeriodo, filtroCustomDe, filtroCustomAte, filtroAlunoAtencao, filtroEngajamento])

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

    const [datasAbertas, setDatasAbertas] = useState<Set<string>>(new Set())
    const toggleData = (ds: string) => setDatasAbertas(prev => {
        const next = new Set(prev)
        next.has(ds) ? next.delete(ds) : next.add(ds)
        return next
    })

    // índice da data ativa no carrossel (Por data)
    const [dataIdx, setDataIdx] = useState(0)
    useEffect(() => { setDataIdx(0) }, [datas.join(',')])

    // F2.4 — agrupamento por turma
    const escolasParaVistaTurma = useMemo(() => {
        const map = new Map<string, string>()
        todosRegistros.forEach(r => { if (r.escola) map.set(String(r.escola), nomeEscola(r)) })
        return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }))
    }, [todosRegistros, anosLetivos])

    const turmasAgrupadas = useMemo(() => {
        if (modoVista !== 'turma') return []
        const map = new Map<string, { label: string; escola: string; regs: typeof registrosFiltrados }>()
        registrosFiltrados.forEach(r => {
            const key = `${r.escola}__${r.turma}__${r.segmento || r.serie}`
            if (!map.has(key)) {
                map.set(key, { label: `${nomeSeg(r)} · ${nomeTurma(r)}`, escola: nomeEscola(r), regs: [] })
            }
            map.get(key)!.regs.push(r)
        })
        return Array.from(map.entries())
            .map(([key, val]) => ({ key, ...val, regs: val.regs.sort((a, b) => b.data.localeCompare(a.data)) }))
            .sort((a, b) => (b.regs[0]?.data || '').localeCompare(a.regs[0]?.data || ''))
    }, [modoVista, registrosFiltrados, anosLetivos])

    // Mapa consistente de cor por turma (usado em ambos os modos)
    const turmaColorMap = useMemo(() => {
        const map = new Map<string, string>()
        let idx = 0
        todosRegistros.forEach(r => {
            const key = `${r.escola}__${r.turma}__${r.segmento || r.serie}`
            if (!map.has(key)) {
                map.set(key, TURMA_COLORS[idx % TURMA_COLORS.length])
                idx++
            }
        })
        return map
    }, [todosRegistros])

    const labelData = (ds: string) => {
        const d = new Date(ds + 'T12:00:00')
        return `${diasSemanaLabel[d.getDay()]}, ${d.getDate()} de ${mesesLabel[d.getMonth()]}`
    }

    const abrirEditar = (r: any) => {
        const plano = planos.find(p => p.id == r.planoId)
        if (plano) setPlanoParaRegistro(plano)
        editarRegistro(r)
        setPainelAberto(true)
    }

    const fecharPainel = () => {
        setPainelVisible(false)
        setTimeout(() => setPainelAberto(false), 240)
    }

    // Cards por turma são abertos por padrão — ao filtrar, reseta fechamentos
    useEffect(() => {
        setTurmasFechadas(new Set())
    }, [filtroEscola, filtroSegmento, filtroTurma, filtroPeriodo, filtroCustomDe, filtroCustomAte])

    const getTrecho = (r: any): string | null => {
        // Concatena os campos selecionados (multi-select)
        if (camposTrecho.size > 0) {
            const parts = CAMPOS_TRECHO
                .filter(c => camposTrecho.has(c.value))
                .map(c => (r as any)[c.value])
                .filter((v): v is string => typeof v === 'string' && !!v.trim())
                .map(v => v.trim())
            if (parts.length > 0) return parts.join(' · ')
        }
        // Fallback: primeiro campo de texto preenchido
        const allTextKeys = [...CAMPOS_TRECHO.map(c => c.value), ...CAMPOS_INLINE.map(c => c.key)]
        for (const key of allTextKeys) {
            const val = (r as any)[key]
            if (val && typeof val === 'string' && val.trim()) return val.trim()
        }
        return null
    }

    const filtrosAtivos = filtroEscola !== 'todas' || filtroSegmento !== 'todos' || filtroTurma !== 'todas' || filtroPeriodo !== 'tudo' || !!filtroAlunoAtencao || filtroEngajamento
    const limparFiltros = () => {
        setFiltroEscola('todas'); setFiltroSegmento('todos'); setFiltroTurma('todas'); setFiltroPeriodo('tudo')
        setFiltroCustomDe(''); setFiltroCustomAte('')
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
        outline: 'none', WebkitAppearance: 'none', MozAppearance: 'none' as any,
        boxShadow: 'none',
    }


    return (
        <div className="max-w-2xl mx-auto space-y-3 pb-24">

            {/* ── CABEÇALHO ── */}
            <div>
                <h1 className="text-[17px] font-bold tracking-tight text-slate-800 dark:text-[#E5E7EB]">Histórico</h1>
                <p className="text-[12.5px] text-slate-500 dark:text-[#9CA3AF] mt-0.5">Registros pós-aula anteriores</p>
            </div>

            {/* Linha 1: pills de período */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                {([
                    { value: 'tudo',          label: 'Tudo' },
                    { value: '7dias',         label: '7 dias' },
                    { value: 'mes',           label: 'Este mês' },
                    { value: '3meses',        label: '3 meses' },
                    { value: 'personalizado', label: 'Personalizado' },
                ] as const).map(p => {
                    const active = filtroPeriodo === p.value
                    return (
                        <button key={p.value} onClick={() => setFiltroPeriodo(p.value)}
                            style={{
                                fontSize: 11.5, fontWeight: active ? 600 : 400, fontFamily: 'inherit',
                                padding: '4px 11px', borderRadius: 999, cursor: 'pointer', transition: 'all 120ms',
                                background: active ? (isDark ? '#818cf8' : '#5B5FEA') : 'transparent',
                                color: active ? '#fff' : (isDark ? '#6B7280' : '#94a3b8'),
                                border: active ? 'none' : `1px solid ${isDark ? '#374151' : '#E6EAF0'}`,
                            }}>
                            {p.label}
                        </button>
                    )
                })}
            </div>

            {/* Custom date range */}
            {filtroPeriodo === 'personalizado' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>de</span>
                    <input type="date" value={filtroCustomDe} onChange={e => setFiltroCustomDe(e.target.value)}
                        style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: `1px solid ${c.border}`, background: c.selBg, color: c.selText, fontFamily: 'inherit', cursor: 'pointer' }} />
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>até</span>
                    <input type="date" value={filtroCustomAte} onChange={e => setFiltroCustomAte(e.target.value)}
                        style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: `1px solid ${c.border}`, background: c.selBg, color: c.selText, fontFamily: 'inherit', cursor: 'pointer' }} />
                </div>
            )}

            {/* Linha 2: filtros de localização */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {/* Escola — oculta quando só há uma */}
                {escolasUnicas.length > 1 && (
                <div style={{ position: 'relative' }}>
                    <select value={filtroEscola} onChange={e => { setFiltroEscola(e.target.value); setFiltroSegmento('todos'); setFiltroTurma('todas') }} style={selStyle}>
                        <option value="todas">Escola</option>
                        {escolasUnicas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                    <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '9px', color: '#94a3b8' }}>▾</span>
                </div>
                )}

                {/* Série — optgroup por escola quando há múltiplas */}
                {seriesUnicas.length > 1 && (() => {
                    const useGroups = escolasUnicas.length > 1 && filtroEscola === 'todas'
                    const byEscola = useGroups ? (() => {
                        const m = new Map<string, { escolaNome: string; series: typeof seriesUnicas }>()
                        seriesUnicas.forEach(s => {
                            if (!m.has(s.escolaId)) m.set(s.escolaId, { escolaNome: s.escolaNome, series: [] })
                            m.get(s.escolaId)!.series.push(s)
                        })
                        return m
                    })() : null
                    return (
                        <div style={{ position: 'relative' }}>
                            <select value={filtroSegmento} onChange={e => { setFiltroSegmento(e.target.value); setFiltroTurma('todas') }} style={selStyle}>
                                <option value="todos">Série</option>
                                {useGroups && byEscola
                                    ? Array.from(byEscola.entries()).map(([eId, { escolaNome, series }]) => (
                                        <optgroup key={eId} label={escolaNome}>
                                            {series.map(s => <option key={s.id} value={s.id}>{s.nomeSimples}</option>)}
                                        </optgroup>
                                    ))
                                    : seriesUnicas.map(s => <option key={s.id} value={s.id}>{s.nomeSimples}</option>)
                                }
                            </select>
                            <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '9px', color: '#94a3b8' }}>▾</span>
                        </div>
                    )
                })()}

                {/* Turma — optgroup por escola quando há múltiplas */}
                {turmasUnicas.length > 1 && (() => {
                    const useGroups = escolasUnicas.length > 1 && filtroEscola === 'todas'
                    const byEscola = useGroups ? (() => {
                        const m = new Map<string, { escolaNome: string; turmas: typeof turmasUnicas }>()
                        turmasUnicas.forEach(t => {
                            if (!m.has(t.escolaId)) m.set(t.escolaId, { escolaNome: t.escolaNome, turmas: [] })
                            m.get(t.escolaId)!.turmas.push(t)
                        })
                        return m
                    })() : null
                    return (
                        <div style={{ position: 'relative' }}>
                            <select value={filtroTurma} onChange={e => setFiltroTurma(e.target.value)} style={selStyle}>
                                <option value="todas">Turma</option>
                                {useGroups && byEscola
                                    ? Array.from(byEscola.entries()).map(([eId, { escolaNome, turmas }]) => (
                                        <optgroup key={eId} label={escolaNome}>
                                            {turmas.map(t => <option key={t.id} value={t.id}>{t.nomeSimples}</option>)}
                                        </optgroup>
                                    ))
                                    : turmasUnicas.map(t => <option key={t.id} value={t.id}>{t.nomeSimples}</option>)
                                }
                            </select>
                            <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '9px', color: '#94a3b8' }}>▾</span>
                        </div>
                    )
                })()}

                {filtrosAtivos && (
                    <button onClick={limparFiltros} style={{ fontSize: '11px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px', fontFamily: 'inherit' }}>
                        limpar
                    </button>
                )}
            </div>

            {/* F1.4 — chips de filtro ativo */}
            {(filtroAlunoAtencao || filtroEngajamento) && (
                <div className="flex items-center gap-2 flex-wrap">
                    {filtroAlunoAtencao && (
                        <button onClick={() => setFiltroAlunoAtencao(null)}
                            style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.06)', color: '#d97706', cursor: 'pointer', fontFamily: 'inherit' }}>
                            ! {filtroAlunoAtencao} ×
                        </button>
                    )}
                    {filtroEngajamento && (
                        <button onClick={() => setFiltroEngajamento(false)}
                            style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', border: `1px solid ${c.badgeBdr}`, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit' }}>
                            Engajamento ×
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

            {/* Linha 3: vista + trecho + contagem */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {/* view toggle tabs */}
                <div style={{ display: 'flex', gap: 16, flex: 1 }}>
                    {(['data', 'turma'] as const).map(modo => (
                        <button key={modo} onClick={() => setModoVista(modo)}
                            style={{ fontSize: '12px', fontFamily: 'inherit', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', fontWeight: modoVista === modo ? 600 : 400, color: modoVista === modo ? c.toggleActive : c.toggleInactive, borderBottom: modoVista === modo ? `2px solid ${c.toggleActive}` : '2px solid transparent', transition: 'all 120ms' }}>
                            {modo === 'data' ? 'Por data' : 'Por turma'}
                        </button>
                    ))}
                </div>
                {/* trecho multi-select + contagem */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: isDark ? '#4B5563' : '#cbd5e1' }}>Trecho:</span>
                    <div ref={trechoMenuRef} style={{ position: 'relative' }}>
                        <button onClick={() => setTrechoMenuAberto(v => !v)}
                            style={{ ...selStyle, fontSize: '11px', display: 'flex', alignItems: 'center', gap: 6, paddingRight: 22, cursor: 'pointer', minWidth: 120 }}>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {camposTrecho.size === 0
                                    ? 'Nenhum'
                                    : camposTrecho.size === 1
                                        ? CAMPOS_TRECHO.find(ct => camposTrecho.has(ct.value))?.label ?? '1 campo'
                                        : `${camposTrecho.size} campos`}
                            </span>
                        </button>
                        <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '9px', color: '#94a3b8' }}>▾</span>
                        {trechoMenuAberto && (
                            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 50, background: isDark ? '#1F2937' : '#fff', border: `1px solid ${c.border}`, borderRadius: 8, boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)', minWidth: 210, padding: '4px 0' }}>
                                {CAMPOS_TRECHO.map(campo => {
                                    const checked = camposTrecho.has(campo.value)
                                    return (
                                        <label key={campo.value}
                                            className="hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: isDark ? '#D1D5DB' : '#374151', userSelect: 'none' }}>
                                            <input type="checkbox" checked={checked}
                                                onChange={() => setCamposTrecho(prev => {
                                                    const next = new Set(prev)
                                                    checked ? next.delete(campo.value) : next.add(campo.value)
                                                    return next
                                                })}
                                                style={{ accentColor: '#5B5FEA', cursor: 'pointer', width: 13, height: 13, flexShrink: 0 }} />
                                            {campo.label}
                                        </label>
                                    )
                                })}
                                <div style={{ borderTop: `1px solid ${c.border}`, margin: '4px 0' }} />
                                <button onClick={() => setCamposTrecho(new Set())}
                                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '5px 12px', fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                                    Limpar seleção
                                </button>
                            </div>
                        )}
                    </div>
                    <span style={{ fontSize: 11, color: isDark ? '#4B5563' : '#cbd5e1', minWidth: 20, textAlign: 'right' }}>{registrosFiltrados.length}</span>
                </div>
            </div>

            {/* ── LISTA ── */}
            {modoVista === 'data' ? (
                /* ── MODO POR DATA — carrossel ── */
                datas.length === 0 && lacunas.length === 0 ? (
                    <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
                        {filtrosAtivos ? 'Nenhum resultado para os filtros selecionados.' : 'Nenhum registro ainda.'}
                    </p>
                ) : (() => {
                    const safeIdx = Math.min(dataIdx, Math.max(0, datas.length - 1))
                    const ds = datas[safeIdx] ?? ''
                    const regs = ds ? porData[ds] : []
                    const regsVisiveis = regs.filter(r => CAMPOS_INLINE.some(campo => {
                        const val = (r as any)[campo.key]
                        return val && typeof val === 'string' && val.trim()
                    }))
                    const d = ds ? new Date(ds + 'T12:00:00') : null
                    return (
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

                            {/* ── Carrossel de datas ── */}
                            {datas.length > 0 && d && (
                                <div className="v2-card" style={{ borderRadius: 12, border: `1px solid ${c.border}`, overflow: 'hidden', boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.06)' }}>
                                    {/* barra de navegação */}
                                    <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${c.border}`, background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
                                        <button
                                            onClick={() => { setDataIdx(i => Math.min(datas.length - 1, i + 1)); setExpandedId(null) }}
                                            disabled={safeIdx === datas.length - 1}
                                            style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent', color: safeIdx === datas.length - 1 ? (isDark ? '#374151' : '#e2e8f0') : c.btnText, cursor: safeIdx === datas.length - 1 ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 120ms' }}>
                                            ←
                                        </button>
                                        <div style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(91,95,234,0.1)' : '#EEF0FF', border: `1px solid ${isDark ? 'rgba(91,95,234,0.3)' : '#c7d2fe'}` }}>
                                            <span style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#818cf8' : '#5B5FEA', lineHeight: 1 }}>{d.getDate()}</span>
                                            <span style={{ fontSize: 9.5, color: isDark ? '#818cf8' : '#5B5FEA', textTransform: 'uppercase', letterSpacing: '0.3px', marginTop: 1 }}>{mesesLabel[d.getMonth()]}</span>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#E5E7EB' : '#334155' }}>{diasSemanaLabel[d.getDay()]}</div>
                                        </div>
                                        <span style={{ fontSize: 11, color: isDark ? '#6B7280' : '#94a3b8', border: `1px solid ${c.border}`, padding: '2px 7px', borderRadius: 999 }}>{regsVisiveis.length}</span>
                                        <span style={{ fontSize: 10.5, color: isDark ? '#4B5563' : '#94a3b8', minWidth: 36, textAlign: 'center' }}>{safeIdx + 1} / {datas.length}</span>
                                        <button
                                            onClick={() => { setDataIdx(i => Math.max(0, i - 1)); setExpandedId(null) }}
                                            disabled={safeIdx === 0}
                                            style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent', color: safeIdx === 0 ? (isDark ? '#374151' : '#e2e8f0') : c.btnText, cursor: safeIdx === 0 ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 120ms' }}>
                                            →
                                        </button>
                                    </div>

                                    {/* registros da data ativa — sem conteúdo são omitidos */}
                                    {regsVisiveis.length === 0 ? (
                                        <p style={{ padding: '12px 16px', fontSize: 12, fontStyle: 'italic', color: isDark ? '#4B5563' : '#94a3b8' }}>
                                            Nenhum registro preenchido nesta data.
                                        </p>
                                    ) : regsVisiveis.map((r, j) => {
                                        const regId = r.id ?? `date-${ds}-${j}`
                                        const isExpanded = regsVisiveis.length === 1 || expandedId === regId
                                        const podeToggle = regsVisiveis.length > 1
                                        const trecho = getTrecho(r)
                                        const alunoAtencao = (r as any).alunoAtencao as string | undefined
                                        const pontoQueda = (r as any).pontoQueda as string | undefined
                                        const isLast = j === regsVisiveis.length - 1
                                        const camposAExibir = camposTrecho.size > 0
                                            ? CAMPOS_INLINE.filter(campo => camposTrecho.has(campo.key))
                                            : CAMPOS_INLINE
                                        const camposPreenchidos = camposAExibir.filter(campo => {
                                            const val = (r as any)[campo.key]
                                            return val && typeof val === 'string' && val.trim()
                                        })
                                        return (
                                            <div key={j}>
                                                <div
                                                    style={{ display: 'flex', alignItems: 'flex-start', gap: 0, padding: '10px 16px', borderBottom: (!isLast || isExpanded) ? `1px solid ${isDark ? 'rgba(55,65,81,0.4)' : '#F1F4F8'}` : 'none', transition: 'background 100ms', cursor: podeToggle ? 'pointer' : 'default' }}
                                                    className={podeToggle ? 'hover:bg-slate-50 dark:hover:bg-white/[0.02]' : ''}
                                                    onClick={() => podeToggle && setExpandedId(isExpanded ? null : regId)}>
                                                    <div style={{ width: 1, background: isDark ? '#374151' : '#E6EAF0', flexShrink: 0, alignSelf: 'stretch', marginRight: 10, minHeight: 24, position: 'relative' }}>
                                                        <div style={{ position: 'absolute', left: -2, top: 4, width: 5, height: 5, borderRadius: '50%', background: isDark ? '#374151' : '#CBD5E1', border: `1px solid ${isDark ? '#4B5563' : '#E6EAF0'}` }} />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#E5E7EB' : '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {escolasUnicas.length > 1 && <span style={{ color: '#94a3b8', fontWeight: 400, marginRight: 4 }}>{nomeEscola(r)} ·</span>}
                                                            {nomeSeg(r)} · {nomeTurma(r)}
                                                        </div>
                                                        {!isExpanded && (trecho
                                                            ? <div style={{ fontSize: 11.5, fontStyle: 'italic', color: '#94a3b8', marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>"{trecho}"</div>
                                                            : <div style={{ fontSize: 11, fontStyle: 'italic', color: isDark ? '#374151' : '#cbd5e1', marginTop: 2 }}>sem registro</div>
                                                        )}
                                                        {!isExpanded && (alunoAtencao || pontoQueda) && (
                                                            <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                                                                {alunoAtencao && <button onClick={e => { e.stopPropagation(); setFiltroAlunoAtencao(filtroAlunoAtencao === alunoAtencao ? null : alunoAtencao) }} title="Aluno que precisa de atenção" style={{ fontSize: 10.5, padding: '1px 7px', borderRadius: 999, border: '1px solid rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.06)', color: '#d97706', cursor: 'pointer', fontFamily: 'inherit' }}>! {alunoAtencao}</button>}
                                                                {pontoQueda && <button onClick={e => { e.stopPropagation(); setFiltroEngajamento(!filtroEngajamento) }} style={{ fontSize: 10.5, padding: '1px 7px', borderRadius: 999, border: `1px solid ${c.badgeBdr}`, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit' }}>Engajamento ↓</button>}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, alignSelf: 'flex-start' }}>
                                                        <button onClick={e => { e.stopPropagation(); abrirEditar(r) }} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent', color: c.btnText, cursor: 'pointer', fontFamily: 'inherit' }}>Editar</button>
                                                        {podeToggle && <span style={{ fontSize: 9, color: c.btnText, opacity: 0.5 }}>{isExpanded ? '▲' : '▼'}</span>}
                                                    </div>
                                                </div>
                                                {isExpanded && (
                                                    <div style={{ borderBottom: !isLast ? `1px solid ${isDark ? 'rgba(55,65,81,0.4)' : '#F1F4F8'}` : 'none', padding: '4px 16px 14px 27px', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
                                                        {camposPreenchidos.length === 0 ? (
                                                            <p style={{ fontSize: 12, fontStyle: 'italic', color: isDark ? '#374151' : '#cbd5e1' }}>sem registro</p>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                                {camposPreenchidos.map(campo => (
                                                                    <div key={campo.key}>
                                                                        <p style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: isDark ? '#4B5563' : '#94a3b8', marginBottom: 2 }}>{campo.icon} {campo.label}</p>
                                                                        <p style={{ fontSize: 12.5, lineHeight: 1.55, color: isDark ? '#D1D5DB' : '#374151' }}>{(r as any)[campo.key]}</p>
                                                                    </div>
                                                                ))}
                                                                {(alunoAtencao || pontoQueda) && (
                                                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', paddingTop: 2 }}>
                                                                        {alunoAtencao && <button onClick={e => { e.stopPropagation(); setFiltroAlunoAtencao(filtroAlunoAtencao === alunoAtencao ? null : alunoAtencao) }} title="Aluno que precisa de atenção" style={{ fontSize: 10.5, padding: '1px 7px', borderRadius: 999, border: '1px solid rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.06)', color: '#d97706', cursor: 'pointer', fontFamily: 'inherit' }}>! {alunoAtencao}</button>}
                                                                        {pontoQueda && <button onClick={e => { e.stopPropagation(); setFiltroEngajamento(!filtroEngajamento) }} style={{ fontSize: 10.5, padding: '1px 7px', borderRadius: 999, border: `1px solid ${c.badgeBdr}`, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit' }}>Engajamento ↓</button>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </>
                    )

                })()
            ) : (
                /* ── MODO POR TURMA — V4: cards abertos, sem botões inline, paginação ── */
                turmasAgrupadas.length === 0 ? (
                    <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
                        {filtrosAtivos ? 'Nenhum resultado para os filtros selecionados.' : 'Nenhum registro ainda.'}
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {turmasAgrupadas.map((grupo, colorIdx) => {
                            const isOpen = !turmasFechadas.has(grupo.key)
                            const lacuna = lacunas.find(l => l.key === grupo.key)
                            const cor = lacuna
                                ? (isDark ? '#374151' : '#e2e8f0')
                                : TURMA_COLORS[colorIdx % TURMA_COLORS.length]

                            // filtra registros sem conteúdo relevante
                            const camposAExibir = camposTrecho.size > 0
                                ? CAMPOS_INLINE.filter(campo => camposTrecho.has(campo.key))
                                : CAMPOS_INLINE
                            const regsComConteudo = grupo.regs.filter(r =>
                                camposAExibir.some(campo => {
                                    const val = (r as any)[campo.key]
                                    return val && typeof val === 'string' && val.trim()
                                })
                            )

                            // label do critério (só quando único selecionado)
                            const criterioLabel = camposTrecho.size === 1
                                ? CAMPOS_TRECHO.find(ct => camposTrecho.has(ct.value))?.label ?? null
                                : null

                            return (
                                <div key={grupo.key} className="v2-card" style={{ borderRadius: '12px', border: `1px solid ${c.border}`, overflow: 'hidden', boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.06)' }}>
                                    {/* ── Cabeçalho da turma ── */}
                                    <div onClick={() => toggleTurma(grupo.key)}
                                        style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none', borderBottom: isOpen ? `1px solid ${c.border}` : 'none', transition: 'background 100ms' }}
                                        className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                                        <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, flexShrink: 0, minHeight: 16, background: cor }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '12.5px', fontWeight: 600, color: isDark ? '#E5E7EB' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                <span style={{ color: isDark ? '#6B7280' : '#94a3b8', fontWeight: 400 }}>{grupo.escola}</span>
                                                <span style={{ color: isDark ? '#374151' : '#cbd5e1', margin: '0 5px' }}>·</span>
                                                {grupo.label}
                                            </div>
                                            {criterioLabel && (
                                                <div style={{ marginTop: 3 }}>
                                                    <span style={{ fontSize: '10.5px', color: isDark ? '#6B7280' : '#64748b', background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E6EAF0'}`, padding: '1px 7px', borderRadius: 999, display: 'inline-block' }}>{criterioLabel}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {lacuna && (
                                                <span style={{ fontSize: '10px', color: '#f97316', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', padding: '2px 6px', borderRadius: 999, fontWeight: 600 }}>
                                                    {lacuna.dias}d sem aula
                                                </span>
                                            )}
                                            <span style={{ fontSize: 11, color: isDark ? '#6B7280' : '#94a3b8', border: `1px solid ${c.border}`, padding: '2px 7px', borderRadius: 999 }}>
                                                {regsComConteudo.length}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '10px', color: isDark ? '#4B5563' : '#cbd5e1', marginLeft: 4 }}>{isOpen ? '▲' : '▼'}</span>
                                    </div>

                                    {/* ── Lista de registros ── */}
                                    {isOpen && (
                                        regsComConteudo.length === 0 ? (
                                            <p style={{ padding: '12px 16px', fontSize: 12, fontStyle: 'italic', color: isDark ? '#4B5563' : '#94a3b8' }}>
                                                Nenhum registro preenchido.
                                            </p>
                                        ) : (
                                            <>

                                                {/* linhas */}
                                                {regsComConteudo.map((r, j) => {
                                                    const d = new Date(r.data + 'T12:00:00')
                                                    const regId = String(r.id ?? `${grupo.key}-${j}`)
                                                    const isHovered = hoveredId === regId
                                                    const isLast = j === regsComConteudo.length - 1

                                                    // texto a exibir
                                                    const texto = (() => {
                                                        const camposPreenchidos = camposAExibir.filter(campo => {
                                                            const val = (r as any)[campo.key]
                                                            return val && typeof val === 'string' && val.trim()
                                                        })
                                                        if (camposPreenchidos.length === 0) return null
                                                        // critério único: só esse campo
                                                        if (camposTrecho.size === 1) {
                                                            const key = [...camposTrecho][0] as string
                                                            return (r as any)[key] as string ?? null
                                                        }
                                                        // múltiplos: juntos separados por ·
                                                        return camposPreenchidos
                                                            .map(c => ((r as any)[c.key] as string).trim())
                                                            .join(' · ')
                                                    })()

                                                    return (
                                                        <div key={j}
                                                            onMouseEnter={() => setHoveredId(regId)}
                                                            onMouseLeave={() => setHoveredId(null)}
                                                            style={{ display: 'flex', alignItems: 'flex-start', padding: '9px 14px', gap: 10, borderBottom: isLast ? 'none' : `1px solid ${isDark ? 'rgba(55,65,81,0.4)' : '#F1F4F8'}`, transition: 'background 100ms', background: isHovered ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)') : 'transparent' }}>
                                                            {/* data */}
                                                            <div style={{ width: 30, flexShrink: 0, textAlign: 'center', paddingTop: 1 }}>
                                                                <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', display: 'block', lineHeight: 1 }}>{d.getDate()}</span>
                                                                <span style={{ fontSize: 8.5, color: isDark ? '#374151' : '#e2e8f0', textTransform: 'uppercase', display: 'block', marginTop: 1 }}>{mesesLabel[d.getMonth()]}</span>
                                                            </div>
                                                            {/* separador */}
                                                            <div style={{ width: 1, alignSelf: 'stretch', background: isDark ? '#374151' : '#F1F4F8', flexShrink: 0, minHeight: 16 }} />
                                                            {/* texto */}
                                                            <div style={{ flex: 1, fontSize: 12.5, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 1.5, minWidth: 0 }}>
                                                                {texto ?? <span style={{ color: isDark ? '#374151' : '#e2e8f0', fontStyle: 'italic' }}>—</span>}
                                                            </div>
                                                            {/* editar — só no hover */}
                                                            <button
                                                                onClick={() => abrirEditar(r)}
                                                                style={{ fontSize: 11, padding: '2px 9px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent', color: c.btnText, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, opacity: isHovered ? 1 : 0, transition: 'opacity 120ms', pointerEvents: isHovered ? 'auto' : 'none' }}>
                                                                Editar
                                                            </button>
                                                        </div>
                                                    )
                                                })}
                                            </>
                                        )
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )
            )}

            {/* ── Painel lateral de edição ── */}
            {painelAberto && (
                <>
                    {/* backdrop */}
                    <div
                        onClick={fecharPainel}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 48,
                            opacity: painelVisible ? 1 : 0, transition: 'opacity 240ms ease' }}
                    />
                    {/* painel — mobile: sobe de baixo / desktop: centro */}
                    <div style={typeof window !== 'undefined' && window.innerWidth >= 768 ? {
                        // desktop: centralizado
                        position: 'fixed',
                        top: '50%', left: '50%',
                        width: Math.min(window.innerWidth - 48, 520),
                        height: Math.min(window.innerHeight - 48, 820),
                        zIndex: 49, display: 'flex', flexDirection: 'column',
                        borderRadius: 16, overflow: 'hidden',
                        transform: painelVisible
                            ? 'translate(-50%, -50%) scale(1)'
                            : 'translate(-50%, -50%) scale(0.96)',
                        opacity: painelVisible ? 1 : 0,
                        transition: 'transform 220ms cubic-bezier(.4,0,.2,1), opacity 220ms ease',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
                    } : {
                        // mobile: bottom sheet
                        position: 'fixed', left: 0, right: 0, bottom: 0,
                        height: '92dvh',
                        zIndex: 49, display: 'flex', flexDirection: 'column',
                        borderRadius: '16px 16px 0 0', overflow: 'hidden',
                        transform: painelVisible ? 'translateY(0)' : 'translateY(100%)',
                        transition: 'transform 280ms cubic-bezier(.4,0,.2,1)',
                        boxShadow: '0 -8px 40px rgba(0,0,0,0.22)',
                    }}>
                        <Suspense fallback={
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isDark ? '#1F2937' : '#fff', color: '#94a3b8', fontSize: 13 }}>
                                Carregando...
                            </div>
                        }>
                            <ModalRegistroPosAula
                                inlineMode={true}
                                onVoltar={fecharPainel}
                            />
                        </Suspense>
                    </div>
                </>
            )}
        </div>
    )
}
