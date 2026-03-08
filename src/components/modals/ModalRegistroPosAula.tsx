import React from 'react'
import { useCalendarioContext } from '../../contexts'
import { useAnoLetivoContext } from '../../contexts'
import { usePlanosContext, useAplicacoesContext } from '../../contexts'

// ── ACCORDION CHIP — campo colapsável genérico ──
const AccordionChip = React.forwardRef<() => void, {
    id: string, icon: string, label: string, placeholder: string,
    value: string, filled: boolean, defaultOpen?: boolean,
    onChange: (v: string) => void,
    onTabNext?: () => void,
}>(function AccordionChip({ id, icon, label, placeholder, value, filled, defaultOpen, onChange, onTabNext }, ref) {
    const [open, setOpen] = React.useState(defaultOpen ?? false)
    React.useImperativeHandle(ref, () => () => setOpen(true))
    React.useEffect(() => { if (filled) setOpen(true) }, [filled])

    return (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#f8fafc' }}>
            <div onClick={() => setOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', cursor: 'pointer' }}>
                <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: filled ? '#334155' : '#64748b', flex: 1 }}>
                    {label}
                </span>
                {filled && <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, background: '#f0fdf4', padding: '1px 6px', borderRadius: 99, border: '1px solid #bbf7d0', flexShrink: 0 }}>✓</span>}
                <span style={{ fontSize: 9, color: '#94a3b8', flexShrink: 0, marginLeft: 4, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s', display: 'inline-block' }}>▼</span>
            </div>
            {open && (
                <div style={{ padding: '0 12px 10px' }}>
                    <textarea id={id} value={value} onChange={e => onChange(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); setOpen(false); onTabNext?.() } }}
                        rows={2} placeholder={placeholder} autoFocus
                        style={{ width: '100%', padding: '9px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#334155', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const, outline: 'none' }}
                        onFocus={e => (e.target.style.borderColor = '#94a3b8')}
                        onBlur={e  => (e.target.style.borderColor = '#e2e8f0')}
                    />
                </div>
            )}
        </div>
    )
})

// ── BEHAVIOR CHIP — comportamento com tags clicáveis + campo livre ──
const BEHAVIOR_TAGS = [
    { id: 'focada',   label: 'Focada e participativa' },
    { id: 'dispersa', label: 'Muito dispersa / difícil conduzir' },
    { id: 'apatica',  label: 'Apática / pouco engajamento' },
    { id: 'instavel', label: 'Instável — alternou bem e mal' },
    { id: 'timida',   label: 'Tímida / retraída' },
    { id: 'falante',  label: 'Muito falante / difícil silêncio' },
]

const BehaviorChip = React.forwardRef<() => void, {
    value: string, filled: boolean,
    onChange: (v: string) => void,
    onTabNext?: () => void,
}>(function BehaviorChip({ value, filled, onChange, onTabNext }, ref) {
    const [open, setOpen] = React.useState(false)
    const [selectedTags, setSelectedTags] = React.useState<string[]>([])
    const [freeText, setFreeText] = React.useState('')

    React.useImperativeHandle(ref, () => () => setOpen(true))
    React.useEffect(() => { if (filled) setOpen(true) }, [filled])

    // Sincroniza estado de tags com o valor externo ao carregar (ex: editar registro)
    React.useEffect(() => {
        if (value && selectedTags.length === 0 && freeText === '') {
            setFreeText(value)
        }
    }, []) // eslint-disable-line

    const toggleTag = (tagId: string) => {
        const tagLabel = BEHAVIOR_TAGS.find(t => t.id === tagId)?.label || ''
        // Remove emoji do label para texto limpo
        const cleanLabel = tagLabel.replace(/^[\S]+ /, '')
        const next = selectedTags.includes(tagId)
            ? selectedTags.filter(t => t !== tagId)
            : [...selectedTags, tagId]
        setSelectedTags(next)
        // Reconstrói o valor combinado: tags selecionadas + texto livre
        const tagTexts = next.map(id => BEHAVIOR_TAGS.find(t => t.id === id)?.label.replace(/^[\S]+ /, '') || '')
        const combined = [...tagTexts, freeText].filter(Boolean).join('. ')
        onChange(combined)
    }

    const handleFreeTextChange = (v: string) => {
        setFreeText(v)
        const tagTexts = selectedTags.map(id => BEHAVIOR_TAGS.find(t => t.id === id)?.label.replace(/^[\S]+ /, '') || '')
        const combined = [...tagTexts, v].filter(Boolean).join('. ')
        onChange(combined)
    }

    return (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#f8fafc' }}>
            <div onClick={() => setOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', cursor: 'pointer' }}>
                <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>👥</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: filled ? '#334155' : '#64748b', flex: 1 }}>
                    Comportamento da turma
                </span>
                {filled && <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, background: '#f0fdf4', padding: '1px 6px', borderRadius: 99, border: '1px solid #bbf7d0', flexShrink: 0 }}>✓</span>}
                <span style={{ fontSize: 9, color: '#94a3b8', flexShrink: 0, marginLeft: 4, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s', display: 'inline-block' }}>▼</span>
            </div>
            {open && (
                <div style={{ padding: '0 12px 10px' }}>
                    {/* Tags clicáveis */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                        {BEHAVIOR_TAGS.map(tag => (
                            <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                                style={{
                                    padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                                    cursor: 'pointer', transition: 'all .12s', fontFamily: 'inherit',
                                    background: selectedTags.includes(tag.id) ? '#f0fdf4' : '#fff',
                                    color:      selectedTags.includes(tag.id) ? '#16a34a' : '#475569',
                                    border:     selectedTags.includes(tag.id) ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                                }}>
                                {tag.label}
                            </button>
                        ))}
                    </div>
                    <p style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 5 }}>
                        Ou descreva livremente
                    </p>
                    <textarea
                        value={freeText} onChange={e => handleFreeTextChange(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); setOpen(false); onTabNext?.() } }}
                        rows={2} placeholder="Ex: Turma agitada no início, focou após aquecimento..."
                        style={{ width: '100%', padding: '9px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#334155', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const, outline: 'none' }}
                        onFocus={e => (e.target.style.borderColor = '#94a3b8')}
                        onBlur={e  => (e.target.style.borderColor = '#e2e8f0')}
                    />
                </div>
            )}
        </div>
    )
})

// ── REGISTRO CHIP — leitura no histórico (igual ao chip de edição mas readonly) ──
function RegistroChip({ icon, label, text }: { icon: string, label: string, text: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{icon}</span>
            <div>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 2 }}>{label}</span>
                <span style={{ fontSize: 12, color: '#334155', lineHeight: 1.4 }}>{text}</span>
            </div>
        </div>
    )
}

// Alças de resize (8 direções)
const RESIZE_HANDLES = [
    { dir: 'n',  style: { top: 0,    left: 12,  right: 12,  height: 6,  cursor: 'n-resize'  } },
    { dir: 's',  style: { bottom: 0, left: 12,  right: 12,  height: 6,  cursor: 's-resize'  } },
    { dir: 'e',  style: { top: 12,   right: 0,  bottom: 12, width: 6,   cursor: 'e-resize'  } },
    { dir: 'w',  style: { top: 12,   left: 0,   bottom: 12, width: 6,   cursor: 'w-resize'  } },
    { dir: 'ne', style: { top: 0,    right: 0,  width: 14,  height: 14, cursor: 'ne-resize' } },
    { dir: 'nw', style: { top: 0,    left: 0,   width: 14,  height: 14, cursor: 'nw-resize' } },
    { dir: 'se', style: { bottom: 0, right: 0,  width: 14,  height: 14, cursor: 'se-resize' } },
    { dir: 'sw', style: { bottom: 0, left: 0,   width: 14,  height: 14, cursor: 'sw-resize' } },
] as const



// ── PRÓXIMA AULA SELECTOR ──────────────────────────────────────────────────
const OPCOES_PROXIMA = [
    { value: 'nova',         label: 'Iniciar nova aula' },
    { value: 'revisar',      label: 'Revisar / retomar conteúdo' },
    { value: 'revisar-nova', label: 'Revisar + iniciar nova aula' },
    { value: 'decidir',      label: 'Decidir depois' },
] as const;

type OpcaoProxima = typeof OPCOES_PROXIMA[number]['value'] | '';

interface ProximaAulaSelectorProps {
    value: OpcaoProxima;
    onChange: (v: OpcaoProxima) => void;
    onDone: () => void;
    firstRef?: React.RefObject<HTMLButtonElement>;
}

function ProximaAulaSelector({ value, onChange, onDone, firstRef }: ProximaAulaSelectorProps) {
    const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
    return (
        <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 13 }}>🗓</span>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase' as const, color: '#94a3b8' }}>Próxima aula</span>
                {value && (
                    <button tabIndex={-1} onClick={() => onChange('')}
                        style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>
                        limpar
                    </button>
                )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const }}>
                {OPCOES_PROXIMA.map((op, idx) => {
                    const sel = value === op.value;
                    return (
                        <button
                            key={op.value}
                            ref={el => { refs.current[idx] = el; if (idx === 0 && firstRef) (firstRef as React.MutableRefObject<HTMLButtonElement | null>).current = el; }}
                            tabIndex={0}
                            onClick={() => { onChange(op.value); onDone(); }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') { e.preventDefault(); onChange(op.value); onDone(); }
                                else if (e.key === 'Tab' && idx < OPCOES_PROXIMA.length - 1 && !e.shiftKey) {
                                    e.preventDefault(); refs.current[idx + 1]?.focus();
                                }
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '9px 12px',
                                background: sel ? '#eff6ff' : '#fff',
                                color: sel ? '#1d4ed8' : '#64748b',
                                fontWeight: sel ? 600 : 400,
                                fontSize: 13, border: 'none',
                                borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none',
                                borderLeft: sel ? '3px solid #93c5fd' : '3px solid transparent',
                                cursor: 'pointer', textAlign: 'left' as const,
                                width: '100%', transition: 'all .1s', outline: 'none',
                            }}
                            onFocus={e => { if (!sel) e.currentTarget.style.background = '#f8fafc'; }}
                            onBlur={e  => { if (!sel) e.currentTarget.style.background = '#fff'; }}
                            onMouseOver={e => { if (!sel) e.currentTarget.style.background = '#f0f9ff'; }}
                            onMouseOut={e  => { if (!sel) e.currentTarget.style.background = '#fff'; }}
                        >
                            <div style={{ width: 3, height: 16, borderRadius: 4, flexShrink: 0, background: sel ? '#93c5fd' : '#e2e8f0', transition: 'background .1s' }} />
                            {op.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
// ──────────────────────────────────────────────────────────────────────────────

// ── RESULTADO DA AULA SELECTOR ────────────────────────────────────────────────
const OPCOES_RESULTADO = [
    { value: 'bem',     label: 'Funcionou bem' },
    { value: 'parcial', label: 'Parcial' },
    { value: 'nao',     label: 'Não funcionou' },
] as const;

type OpcaoResultado = typeof OPCOES_RESULTADO[number]['value'] | '';

interface ResultadoAulaSelectorProps {
    value: OpcaoResultado;
    onChange: (v: OpcaoResultado) => void;
    firstRef?: React.RefObject<HTMLButtonElement>;
}

function ResultadoAulaSelector({ value, onChange, firstRef }: ResultadoAulaSelectorProps) {
    const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
    return (
        <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 13 }}>📊</span>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase' as const, color: '#94a3b8' }}>Resultado da aula</span>
                {value && (
                    <button tabIndex={-1} onClick={() => onChange('')}
                        style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>
                        limpar
                    </button>
                )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const }}>
                {OPCOES_RESULTADO.map((op, idx) => {
                    const sel = value === op.value;
                    return (
                        <button
                            key={op.value}
                            ref={el => { refs.current[idx] = el; if (idx === 0 && firstRef) (firstRef as React.MutableRefObject<HTMLButtonElement | null>).current = el; }}
                            tabIndex={0}
                            onClick={() => onChange(sel ? '' : op.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') { e.preventDefault(); onChange(sel ? '' : op.value); }
                                else if (e.key === 'Tab' && idx < OPCOES_RESULTADO.length - 1 && !e.shiftKey) {
                                    e.preventDefault(); refs.current[idx + 1]?.focus();
                                }
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '9px 12px',
                                background: sel ? '#eff6ff' : '#fff',
                                color: sel ? '#1d4ed8' : '#64748b',
                                fontWeight: sel ? 600 : 400,
                                fontSize: 13, border: 'none',
                                borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none',
                                borderLeft: sel ? '3px solid #93c5fd' : '3px solid transparent',
                                cursor: 'pointer', textAlign: 'left' as const,
                                width: '100%', transition: 'all .1s', outline: 'none',
                            }}
                            onFocus={e => { if (!sel) e.currentTarget.style.background = '#f8fafc'; }}
                            onBlur={e  => { if (!sel) e.currentTarget.style.background = '#fff'; }}
                            onMouseOver={e => { if (!sel) e.currentTarget.style.background = '#f0f9ff'; }}
                            onMouseOut={e  => { if (!sel) e.currentTarget.style.background = '#fff'; }}
                        >
                            <div style={{ width: 3, height: 16, borderRadius: 4, flexShrink: 0, background: sel ? '#93c5fd' : '#e2e8f0', transition: 'background .1s' }} />
                            {op.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
// ──────────────────────────────────────────────────────────────────────────────

export default function ModalRegistroPosAula() {
    const {
        modalRegistro, setModalRegistro,
        planoParaRegistro,
        verRegistros, setVerRegistros,
        registroEditando, setRegistroEditando,
        novoRegistro, setNovoRegistro,
        regAnoSel, setRegAnoSel,
        regEscolaSel, setRegEscolaSel,
        regSegmentoSel, setRegSegmentoSel,
        regTurmaSel, setRegTurmaSel,
        filtroRegAno, setFiltroRegAno,
        filtroRegEscola, setFiltroRegEscola,
        filtroRegSegmento, setFiltroRegSegmento,
        filtroRegTurma, setFiltroRegTurma,
        buscaRegistros, setBuscaRegistros,
    } = useCalendarioContext()
    const { anosLetivos } = useAnoLetivoContext()
    const { planos, salvarRegistro, editarRegistro, excluirRegistro } = usePlanosContext()
    const { aplicacoes, atualizarStatusAplicacao } = useAplicacoesContext()
    const setRegSerieSel: ((v: string) => void) | undefined = undefined

    // ── Estados de janela ──
    const [minimizado, setMinimizado] = React.useState(false)
    const [maximizado, setMaximizado] = React.useState(false)
    const [pos,  setPos]  = React.useState<{ x: number; y: number } | null>(null)
    const [size, setSize] = React.useState({ w: 512, h: 600 })
    // Registros expandidos no histórico
    const [expandedRegs, setExpandedRegs] = React.useState<Set<any>>(new Set())

    // Centraliza ao abrir
    React.useEffect(() => {
        if (modalRegistro && pos === null) {
            setPos({ x: Math.max(0, Math.round(window.innerWidth / 2 - 256)), y: Math.max(0, Math.round(window.innerHeight / 2 - 300)) })
        }
        if (!modalRegistro) { setPos(null); setMinimizado(false); setMaximizado(false) }
    }, [modalRegistro]) // eslint-disable-line

    // ── Pré-seleção de turma ao abrir ──
    React.useEffect(() => {
        if (!modalRegistro || !planoParaRegistro || anosLetivos.length === 0) return
        const escolaNomePlano   = planoParaRegistro.escola || ''
        const faixasPlano: string[] = planoParaRegistro.faixaEtaria || []
        const segmentoNomePlano = planoParaRegistro.segmento || faixasPlano[0] || ''
        const turmaNomePlano    = planoParaRegistro.turma || ''
        let anoEncontrado: any = null, escolaEncontrada: any = null, segmentoEncontrado: any = null, turmaEncontrada: any = null
        if (escolaNomePlano) {
            const anosOrdenados = [...anosLetivos].sort((a: any, b: any) => a.status === 'ativo' ? -1 : b.status === 'ativo' ? 1 : 0)
            for (const ano of anosOrdenados) {
                const esc = ano.escolas.find((e: any) => e.nome.toLowerCase().trim() === escolaNomePlano.toLowerCase().trim())
                if (esc) {
                    anoEncontrado = ano; escolaEncontrada = esc
                    const candidatos = [segmentoNomePlano, ...faixasPlano].filter(Boolean)
                    if (candidatos.length > 0) {
                        const seg = esc.segmentos.find((s: any) => candidatos.some(c => s.nome.toLowerCase().trim() === c.toLowerCase().trim()))
                        if (seg) {
                            segmentoEncontrado = seg
                            if (turmaNomePlano) {
                                const tur = seg.turmas.find((t: any) => t.nome.toLowerCase().trim() === turmaNomePlano.toLowerCase().trim())
                                if (tur) turmaEncontrada = tur
                            }
                        }
                    }
                    break
                }
            }
        }
        if (anoEncontrado) {
            setRegAnoSel(String(anoEncontrado.id))
            if (escolaEncontrada)   setRegEscolaSel(String(escolaEncontrada.id))
            if (segmentoEncontrado) setRegSegmentoSel(String(segmentoEncontrado.id))
            if (turmaEncontrada)    setRegTurmaSel(String(turmaEncontrada.id))
            // Pré-seleciona filtros do histórico também
            setFiltroRegAno(String(anoEncontrado.id))
            if (escolaEncontrada)   setFiltroRegEscola(String(escolaEncontrada.id))
            if (segmentoEncontrado) setFiltroRegSegmento(String(segmentoEncontrado.id))
            return
        }
        const anoAtual = new Date().getFullYear()
        const ativo = anosLetivos.find((a: any) => a.status === 'ativo')
        const maisProximo = anosLetivos.filter((a: any) => a.status !== 'arquivado').sort((a: any, b: any) => Math.abs((a.ano as number) - anoAtual) - Math.abs((b.ano as number) - anoAtual))[0]
        const selecionado = ativo || maisProximo
        if (selecionado) { setRegAnoSel(String(selecionado.id)); setFiltroRegAno(String(selecionado.id)) }
    }, [modalRegistro]) // eslint-disable-line

    // ── ARRASTAR pelo header ──
    const dragRef = React.useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)
    const chipOpenRefs = React.useRef<Array<(() => void) | null>>([])
    const salvarBtnRef = React.useRef<HTMLButtonElement>(null)
    const proximaAulaFirstRef = React.useRef<HTMLButtonElement>(null)
    const resultadoAulaFirstRef = React.useRef<HTMLButtonElement>(null)

    const onHeaderMouseDown = (e: React.MouseEvent) => {
        if (maximizado || minimizado) return
        if ((e.target as HTMLElement).closest('button')) return
        e.preventDefault()
        dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos?.x ?? 0, oy: pos?.y ?? 0 }
        const onMove = (ev: MouseEvent) => {
            if (!dragRef.current) return
            setPos({ x: Math.max(0, Math.min(window.innerWidth - size.w, dragRef.current.ox + ev.clientX - dragRef.current.sx)), y: Math.max(0, Math.min(window.innerHeight - 60, dragRef.current.oy + ev.clientY - dragRef.current.sy)) })
        }
        const onUp = () => { dragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
    }

    // ── REDIMENSIONAR ──
    const onResizeMouseDown = (e: React.MouseEvent, dir: string) => {
        if (maximizado) return
        e.preventDefault(); e.stopPropagation()
        const sx = e.clientX, sy = e.clientY, ow = size.w, oh = size.h, ox = pos?.x ?? 0, oy = pos?.y ?? 0
        const onMove = (ev: MouseEvent) => {
            const dx = ev.clientX - sx, dy = ev.clientY - sy
            let nx = ox, ny = oy, nw = ow, nh = oh
            if (dir.includes('e')) nw = Math.max(360, ow + dx)
            if (dir.includes('s')) nh = Math.max(300, oh + dy)
            if (dir.includes('w')) { nw = Math.max(360, ow - dx); nx = ox + ow - nw }
            if (dir.includes('n')) { nh = Math.max(300, oh - dy); ny = oy + oh - nh }
            setSize({ w: nw, h: nh }); setPos({ x: nx, y: ny })
        }
        const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
    }

    if (!modalRegistro || !planoParaRegistro) return null

    const modalStyle: React.CSSProperties = maximizado
        ? { position: 'fixed', inset: 0, width: '100vw', height: '100vh', borderRadius: 0, zIndex: 50, display: 'flex', flexDirection: 'column' }
        : minimizado
        ? { position: 'fixed', bottom: 16, right: 16, width: 300, zIndex: 50, borderRadius: 16 }
        : { position: 'fixed', left: pos?.x ?? Math.round(window.innerWidth / 2 - 256), top: pos?.y ?? Math.round(window.innerHeight / 2 - 300), width: size.w, height: size.h, zIndex: 50, borderRadius: 16, display: 'flex', flexDirection: 'column' }

    // ── Campos de anotação ──
    const camposConfig = [
        { id: 'reg-resumo',        icon: '📋', label: 'O que foi realizado',           field: 'resumoAula',      placeholder: 'Ex: Ritmo corporal + início da música X' },
        { id: 'reg-funcionou',     icon: '✅', label: 'O que funcionou bem',           field: 'funcionouBem',    placeholder: 'Ex: A atividade rítmica em grupo engajou muito...' },
        { id: 'reg-nao-funcionou', icon: '⚠️', label: 'O que não funcionou',           field: 'naoFuncionou',    placeholder: 'Ex: Tempo insuficiente para a etapa de criação...' },
        { id: 'reg-melhorar',      icon: '🔧', label: 'O que poderia ter sido melhor', field: 'poderiaMelhorar', placeholder: 'Ex: Explicar o exercício antes de iniciar...' },
    ] as const

    return (
        <>
            {!minimizado && !maximizado && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 49 }} onClick={() => setModalRegistro(false)} />
            )}

            <div className="bg-white shadow-2xl overflow-hidden" style={modalStyle}>

                {!maximizado && !minimizado && RESIZE_HANDLES.map(({ dir, style }) => (
                    <div key={dir} style={{ position: 'absolute', zIndex: 20, ...style }} onMouseDown={e => onResizeMouseDown(e, dir)} />
                ))}

                {/* ── HEADER ── */}
                <div
                    style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', padding: '22px 20px 18px', borderRadius: maximizado ? 0 : minimizado ? 16 : '16px 16px 0 0', flexShrink: 0, cursor: maximizado || minimizado ? 'default' : 'grab', userSelect: 'none' }}
                    onMouseDown={onHeaderMouseDown}
                    onClick={minimizado ? () => setMinimizado(false) : undefined}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>Registro Pós-Aula</p>
                            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{planoParaRegistro.titulo}</h2>
                            {minimizado && <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Clique para restaurar</p>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexShrink: 0 }}>
                            {[
                                { title: minimizado ? 'Restaurar' : 'Minimizar', label: '—', onClick: () => { setMinimizado(m => !m); setMaximizado(false) }, active: minimizado },
                                { title: maximizado ? 'Restaurar tamanho' : 'Maximizar', label: maximizado ? '⊡' : '⤢', onClick: () => { setMaximizado(m => !m); setMinimizado(false) }, active: maximizado },
                                { title: 'Fechar', label: '✕', onClick: () => setModalRegistro(false), active: false, danger: true },
                            ].map(btn => (
                                <button key={btn.title} title={btn.title}
                                    onClick={e => { e.stopPropagation(); btn.onClick() }}
                                    style={{ width: 28, height: 28, borderRadius: 8, background: btn.active ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.1)', border: 'none', color: '#cbd5e1', fontSize: btn.label === '⤢' || btn.label === '⊡' ? 13 : 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background .15s' }}
                                    onMouseOver={e => (e.currentTarget.style.background = btn.danger ? 'rgba(239,68,68,.35)' : 'rgba(255,255,255,.22)')}
                                    onMouseOut={e  => (e.currentTarget.style.background = btn.active ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.1)')}
                                >{btn.label}</button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── CONTEÚDO ── */}
                {!minimizado && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-100 bg-white" style={{ flexShrink: 0 }}>
                            <button onClick={() => setVerRegistros(false)} className="flex-1 py-3 text-sm font-bold transition-colors"
                                style={{ color: !verRegistros ? '#1e293b' : '#94a3b8', borderBottom: !verRegistros ? '2px solid #1e293b' : '2px solid transparent' }}>
                                {registroEditando ? 'Editando' : 'Novo registro'}
                            </button>
                            <button onClick={() => setVerRegistros(true)} className="flex-1 py-3 text-sm font-bold transition-colors"
                                style={{ color: verRegistros ? '#1e293b' : '#94a3b8', borderBottom: verRegistros ? '2px solid #1e293b' : '2px solid transparent' }}>
                                📚 Histórico{' '}
                                {planoParaRegistro.registrosPosAula?.length > 0 && (
                                    <span style={{ background: '#f1f5f9', color: '#94a3b8', fontSize: 11, padding: '1px 6px', borderRadius: 99, marginLeft: 4 }}>
                                        {planoParaRegistro.registrosPosAula.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-4 space-y-3" style={{ flex: 1, overflowY: 'auto' }}>

                            {/* ════════════════════════════════
                                NOVO REGISTRO
                                ════════════════════════════════ */}
                            {!verRegistros ? (
                                <>
                                    {registroEditando && (
                                        <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                            <span className="text-xs font-medium text-slate-600">Editando registro</span>
                                            <button onClick={() => { setRegistroEditando(null); setNovoRegistro({ dataAula: new Date().toISOString().split('T')[0], resumoAula: '', funcionouBem: '', naoFuncionou: '', poderiaMelhorar: '', proximaAula: '', proximaAulaOpcao: '', resultadoAula: '', comportamento: '', anotacoesGerais: '' }); setRegEscolaSel(''); setRegTurmaSel('') }}
                                                className="text-xs font-bold text-slate-500 hover:text-red-500 transition-colors">✕ Cancelar</button>
                                        </div>
                                    )}

                                    {/* Seleção de turma */}
                                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }} className="space-y-2">
                                        <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>Identificar turma</p>
                                        <select value={regAnoSel} onChange={e => { setRegAnoSel(e.target.value); setRegEscolaSel(''); setRegSegmentoSel(''); setRegTurmaSel('') }}
                                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f172a', background: '#fff' }}
                                            className="focus:outline-none focus:border-slate-400">
                                            <option value="">— Ano Letivo —</option>
                                            {anosLetivos.filter(a => a.status !== 'arquivado').map(a => <option key={a.id} value={a.id}>{a.ano}</option>)}
                                        </select>
                                        {regAnoSel && (() => {
                                            const ano = anosLetivos.find(a => a.id == regAnoSel)
                                            return ano && ano.escolas.length > 0 ? (
                                                <select value={regEscolaSel} onChange={e => { setRegEscolaSel(e.target.value); setRegSegmentoSel(''); setRegTurmaSel('') }}
                                                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f172a', background: '#fff' }}
                                                    className="focus:outline-none focus:border-slate-400">
                                                    <option value="">— Escola —</option>
                                                    {ano.escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                                                </select>
                                            ) : <p className="text-xs text-slate-400 italic">Nenhuma escola cadastrada neste ano.</p>
                                        })()}
                                        {regEscolaSel && (() => {
                                            const ano = anosLetivos.find(a => a.id == regAnoSel)
                                            const esc = ano?.escolas.find(e => e.id == regEscolaSel)
                                            return esc && esc.segmentos.length > 0 ? (
                                                <select value={regSegmentoSel} onChange={e => { setRegSegmentoSel(e.target.value); setRegTurmaSel('') }}
                                                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f172a', background: '#fff' }}
                                                    className="focus:outline-none focus:border-slate-400">
                                                    <option value="">— Segmento —</option>
                                                    {esc.segmentos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                                </select>
                                            ) : <p className="text-xs text-slate-400 italic">Nenhum segmento cadastrado.</p>
                                        })()}
                                        {regSegmentoSel && (() => {
                                            const ano = anosLetivos.find(a => a.id == regAnoSel)
                                            const esc = ano?.escolas.find(e => e.id == regEscolaSel)
                                            const seg = esc?.segmentos.find(s => s.id == regSegmentoSel)
                                            return seg && seg.turmas.length > 0 ? (
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {seg.turmas.map(t => (
                                                        <button key={t.id} type="button" onClick={() => setRegTurmaSel(t.id == regTurmaSel ? '' : t.id)}
                                                            style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: regTurmaSel == t.id ? 700 : 500, background: regTurmaSel == t.id ? '#475569' : '#f8fafc', color: regTurmaSel == t.id ? '#fff' : '#64748b', border: regTurmaSel == t.id ? '1px solid #475569' : '1px solid #e2e8f0', transition: 'all .15s' }}>
                                                            {t.nome}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : <p className="text-xs text-slate-400 italic">Nenhuma turma cadastrada.</p>
                                        })()}
                                        {!regAnoSel && <p className="text-xs text-slate-400">Cadastre anos letivos, escolas e turmas em <strong>🏫 Turmas</strong>.</p>}
                                    </div>

                                    {/* Banner última aula */}
                                    {regTurmaSel && (() => {
                                        const todosRegs: any[] = []
                                        planos.forEach(p => { (p.registrosPosAula || []).forEach(r => { if (r.turma == regTurmaSel && !(registroEditando && r.id === registroEditando.id)) todosRegs.push({ ...r, planoTitulo: p.titulo }) }) })
                                        if (todosRegs.length === 0) return null
                                        const ultimo = todosRegs.sort((a, b) => (b.data || '').localeCompare(a.data || ''))[0]
                                        const dataFmt = ultimo.data ? new Date(ultimo.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
                                        return (
                                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 12px' }} className="text-xs">
                                                <p className="font-medium text-slate-600 mb-1">Última aula com esta turma — {dataFmt}</p>
                                                <p className="text-slate-500 font-medium mb-1">{ultimo.planoTitulo}</p>
                                                {ultimo.resumoAula  && <p className="text-slate-700 mb-1"><span className="font-bold">Realizado:</span> {ultimo.resumoAula}</p>}
                                                {ultimo.proximaAula && <p className="text-slate-700"><span className="font-medium text-slate-600">Para hoje:</span> {ultimo.proximaAula}</p>}
                                            </div>
                                        )
                                    })()}

                                    {/* Data */}
                                    <div className="flex items-center gap-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em' }}>Data da aula</span>
                                        <input type="date" autoFocus value={novoRegistro.dataAula} onChange={e => setNovoRegistro({ ...novoRegistro, dataAula: e.target.value })}
                                            className="flex-1 bg-transparent outline-none border-none text-right" style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }} />
                                    </div>

                                        {/* Resultado da aula */}
                                        <ResultadoAulaSelector
                                            value={(novoRegistro as any).resultadoAula || ''}
                                            onChange={v => setNovoRegistro({ ...novoRegistro, resultadoAula: v })}
                                            firstRef={resultadoAulaFirstRef}
                                        />

                                    {/* Chips de anotação */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {camposConfig.map(({ id, icon, label, field, placeholder }, idx) => {
                                            const valor = (novoRegistro as any)[field] || ''
                                            return (
                                                <AccordionChip key={id} id={id} icon={icon} label={label} placeholder={placeholder}
                                                    value={valor} filled={valor.trim().length > 0}
                                                    defaultOpen={field === 'resumoAula'}
                                                    onChange={v => setNovoRegistro({ ...novoRegistro, [field]: v })}
                                                    onTabNext={() => { const next = chipOpenRefs.current[idx + 1]; if (next) next(); else salvarBtnRef.current?.focus() }}
                                                    ref={(fn: (() => void) | null) => { chipOpenRefs.current[idx] = fn }}
                                                />
                                            )
                                        })}

                                        {/* Comportamento — chip especial com tags */}
                                        <BehaviorChip
                                            value={(novoRegistro as any).comportamento || ''}
                                            filled={!!((novoRegistro as any).comportamento?.trim())}
                                            onChange={v => setNovoRegistro({ ...novoRegistro, comportamento: v })}
                                            onTabNext={() => { const next = chipOpenRefs.current[camposConfig.length + 1]; if (next) next(); else salvarBtnRef.current?.focus() }}
                                            ref={(fn: (() => void) | null) => { chipOpenRefs.current[camposConfig.length] = fn }}
                                        />

                                        {/* Anotações gerais */}
                                        <AccordionChip
                                            id="reg-anotacoes" icon="📝" label="Anotações gerais"
                                            placeholder="Ex: Aluno Pedro faltou, combinar reposição. Lembrar material para semana que vem..."
                                            value={(novoRegistro as any).anotacoesGerais || ''}
                                            filled={!!((novoRegistro as any).anotacoesGerais?.trim())}
                                            onChange={v => setNovoRegistro({ ...novoRegistro, anotacoesGerais: v })}
                                            onTabNext={() => { const next = chipOpenRefs.current[camposConfig.length + 2]; if (next) next(); else salvarBtnRef.current?.focus() }}
                                            ref={(fn: (() => void) | null) => { chipOpenRefs.current[camposConfig.length + 1] = fn }}
                                        />

                                        {/* Ideias / estratégias */}
                                        <AccordionChip
                                            id="reg-proxima" icon="💡" label="Ideias / estratégias"
                                            placeholder="Ex: Começar com o ostinato antes da canção, trazer gravação de referência..."
                                            value={(novoRegistro as any).proximaAula || ''}
                                            filled={!!((novoRegistro as any).proximaAula?.trim())}
                                            onChange={v => setNovoRegistro({ ...novoRegistro, proximaAula: v })}
                                            onTabNext={() => proximaAulaFirstRef.current?.focus()}
                                            ref={(fn: (() => void) | null) => { chipOpenRefs.current[camposConfig.length + 2] = fn }}
                                        />

                                        {/* Próxima aula */}
                                        <ProximaAulaSelector
                                            value={(novoRegistro as any).proximaAulaOpcao || ''}
                                            onChange={v => setNovoRegistro({ ...novoRegistro, proximaAulaOpcao: v })}
                                            onDone={() => salvarBtnRef.current?.focus()}
                                            firstRef={proximaAulaFirstRef}
                                        />
                                    </div>

                                    {/* Botão salvar */}
                                    <button ref={salvarBtnRef} onClick={() => {
                                        const algumCampo = !!(novoRegistro.resumoAula || novoRegistro.funcionouBem || novoRegistro.naoFuncionou || novoRegistro.proximaAula || novoRegistro.comportamento)
                                        salvarRegistro()
                                        // Ao salvar novo registro, marca aplicacao vinculada como realizada
                                        if (algumCampo && !registroEditando) {
                                            const ap = aplicacoes.find(a =>
                                                a.turmaId === regTurmaSel &&
                                                a.anoLetivoId === regAnoSel &&
                                                a.data === (novoRegistro.dataAula || new Date().toISOString().split('T')[0]) &&
                                                String(a.planoId) === String(planoParaRegistro?.id)
                                            )
                                            if (ap && ap.status !== 'realizada') atualizarStatusAplicacao(ap.id, 'realizada')
                                        }
                                    }}
                                        style={{ width: '100%', padding: '12px', background: '#f8fafc', color: '#334155', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'all .15s' }}
                                        onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8' }}
                                        onMouseOut={e  => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                                        onFocus={e  => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.outline = 'none' }}
                                        onBlur={e   => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                                    >
                                        <span style={{ color: '#22c55e', fontSize: 15, fontWeight: 800 }}>✓</span>
                                        {registroEditando ? 'Salvar alterações' : 'Salvar registro'}
                                    </button>
                                </>

                            ) : (

                                /* ════════════════════════════════
                                   HISTÓRICO — Layout Opção A
                                   ════════════════════════════════ */
                                <>
                                    {/* Filtro pré-selecionado: ano + escola fixos, pills de turma */}
                                    {(() => {
                                        const ano = anosLetivos.find(a => a.id == filtroRegAno)
                                        const esc = ano?.escolas.find(e => e.id == filtroRegEscola)
                                        const seg = esc?.segmentos.find(s => s.id == filtroRegSegmento)
                                        const anoLabel = ano?.ano || '—'
                                        const escLabel = esc?.nome || '—'
                                        return (
                                            <div style={{ background: '#f1f5f9', borderRadius: 10, padding: '10px 12px' }}>
                                                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                                                    {anoLabel} · {escLabel} · Turma
                                                </div>
                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                    {seg?.turmas.map(t => (
                                                        <button key={t.id} type="button"
                                                            onClick={() => setFiltroRegTurma(filtroRegTurma == t.id ? '' : t.id)}
                                                            style={{ padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .12s', background: filtroRegTurma == t.id ? '#475569' : '#fff', color: filtroRegTurma == t.id ? '#fff' : '#64748b', border: filtroRegTurma == t.id ? '1px solid #475569' : '1px solid #e2e8f0' }}>
                                                            {t.nome}
                                                        </button>
                                                    ))}
                                                    <button type="button" onClick={() => setFiltroRegTurma('')}
                                                        style={{ padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: '#fff', color: '#94a3b8', border: '1px dashed #e2e8f0' }}>
                                                        Todas
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })()}

                                    {/* Busca */}
                                    {planoParaRegistro.registrosPosAula?.length > 0 && (
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 12 }}>🔍</span>
                                            <input type="text" value={buscaRegistros} onChange={e => setBuscaRegistros(e.target.value)}
                                                style={{ width: '100%', padding: '8px 32px 8px 30px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, color: '#374151', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                                placeholder="Buscar nos registros..." />
                                            {buscaRegistros && (
                                                <button onClick={() => setBuscaRegistros('')}
                                                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>✕</button>
                                            )}
                                        </div>
                                    )}

                                    {/* Lista de registros — cards colapsáveis */}
                                    {(() => {
                                        const regs = (planoParaRegistro.registrosPosAula || []).filter(r => {
                                            if (filtroRegAno      && r.anoLetivo != filtroRegAno) return false
                                            if (filtroRegEscola   && r.escola    != filtroRegEscola) return false
                                            if (filtroRegSegmento && (r.segmento || r.serie) != filtroRegSegmento) return false
                                            if (filtroRegTurma    && r.turma     != filtroRegTurma) return false
                                            if (buscaRegistros.trim()) {
                                                const q = buscaRegistros.toLowerCase()
                                                const campos = [r.resumoAula, r.funcionouBem, r.naoFuncionou, r.poderiaMelhorar, r.proximaAula, r.comportamento, r.anotacoesGerais]
                                                if (!campos.some(c => (c || '').toLowerCase().includes(q))) return false
                                            }
                                            return true
                                        })

                                        if (regs.length === 0) return (
                                            <div className="text-center text-slate-400 py-8">
                                                <p className="text-4xl mb-2">📋</p>
                                                <p className="text-sm">{planoParaRegistro.registrosPosAula?.length > 0 ? 'Nenhum registro para este filtro.' : 'Nenhum registro ainda.'}</p>
                                                <button onClick={() => setVerRegistros(false)} className="mt-3 text-slate-500 hover:text-slate-700 underline text-sm">Fazer registro</button>
                                            </div>
                                        )

                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {[...regs].reverse().map((reg, i) => {
                                                    // Resolve label turma
                                                    let turmaLabel = ''
                                                    let anoObj = anosLetivos.find(a => a.id == reg.anoLetivo)
                                                    let escObj = anoObj?.escolas.find(e => e.id == reg.escola)
                                                    let segObj = escObj?.segmentos.find(s => s.id == (reg.segmento || reg.serie))
                                                    let turObj = segObj?.turmas.find(t => t.id == reg.turma)
                                                    if (!anoObj && reg.escola) {
                                                        for (const a of anosLetivos) {
                                                            const e = a.escolas.find(e => e.id == reg.escola)
                                                            if (e) { const s = e.segmentos.find(s => s.id == (reg.segmento || reg.serie)); if (s) { turmaLabel = s.turmas.find(t => t.id == reg.turma)?.nome || ''; break } }
                                                        }
                                                    } else { turmaLabel = turObj?.nome || '' }

                                                    const dataFmt = reg.data ? new Date(reg.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) : ''
                                                    const isHoje = reg.data === new Date().toISOString().split('T')[0]
                                                    const isOpen = expandedRegs.has(reg.id ?? i)
                                                    const toggleReg = () => setExpandedRegs(prev => { const next = new Set(prev); if (next.has(reg.id ?? i)) next.delete(reg.id ?? i); else next.add(reg.id ?? i); return next })

                                                    // Campos preenchidos para chips de leitura
                                                    const chipFields = [
                                                        { icon: '📋', label: 'Realizado',              text: reg.resumoAula },
                                                        { icon: '✅', label: 'Funcionou bem',           text: reg.funcionouBem },
                                                        { icon: '⚠️', label: 'Não funcionou',           text: reg.naoFuncionou },
                                                        { icon: '🔧', label: 'Poderia ter sido melhor', text: reg.poderiaMelhorar },
                                                        { icon: '💡', label: 'Próxima aula / estratégias',            text: reg.proximaAula },
                                                        { icon: '👥', label: 'Comportamento',           text: reg.comportamento },
                                                        { icon: '📝', label: 'Anotações gerais',        text: reg.anotacoesGerais },
                                                    ].filter(f => f.text?.trim())

                                                    return (
                                                        <div key={reg.id ?? i} style={{ border: registroEditando?.id === reg.id ? '1px solid #94a3b8' : '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: registroEditando?.id === reg.id ? '#f8fafc' : '#fff' }}>
                                                            {/* Cabeçalho clicável */}
                                                            <div onClick={toggleReg}
                                                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', cursor: 'pointer', background: isOpen ? '#f8fafc' : '#fff', borderBottom: isOpen ? '1px solid #e2e8f0' : 'none' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    {turmaLabel && (
                                                                        <span style={{ fontSize: 10, fontWeight: 700, background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: 99 }}>{turmaLabel}</span>
                                                                    )}
                                                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{dataFmt}</span>
                                                                    {isHoje && <span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>hoje</span>}
                                                                    {reg.dataEdicao && <span style={{ fontSize: 11, color: '#93c5fd' }}>· editado</span>}
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <button onClick={e => { e.stopPropagation(); editarRegistro(reg) }}
                                                                        style={{ padding: '3px 7px', fontSize: 11, color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>✏️</button>
                                                                    <button onClick={e => { e.stopPropagation(); excluirRegistro(reg.id) }}
                                                                        style={{ padding: '3px 7px', fontSize: 11, color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>🗑️</button>
                                                                    <span style={{ fontSize: 10, color: '#94a3b8', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s', display: 'inline-block' }}>▼</span>
                                                                </div>
                                                            </div>

                                                            {/* Corpo expandido com chips de leitura */}
                                                            {isOpen && (
                                                                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                                    {chipFields.length > 0
                                                                        ? chipFields.map(f => <RegistroChip key={f.label} icon={f.icon} label={f.label} text={f.text!} />)
                                                                        : <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Nenhum campo preenchido.</p>
                                                                    }
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )
                                    })()}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
