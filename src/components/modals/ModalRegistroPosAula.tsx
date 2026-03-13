import React from 'react'
import { useCalendarioContext } from '../../contexts'
import { useAnoLetivoContext, RUBRICAS_PADRAO } from '../../contexts/AnoLetivoContext'
import { usePlanosContext, useAplicacoesContext } from '../../contexts'
import { startRecording, stopRecording, blobToBase64, base64ToObjectUrl, base64SizeKb } from '../../lib/audioRecorder'

// ── ACCORDION CHIP — campo colapsável genérico ──
const AccordionChip = React.forwardRef<() => void, {
    id: string, icon: string, label: string, placeholder: string,
    value: string, filled: boolean, defaultOpen?: boolean,
    onChange: (v: string) => void,
    onTabNext?: () => void,
    quickOptions?: string[],
}>(function AccordionChip({ id, icon, label, placeholder, value, filled, defaultOpen, onChange, onTabNext, quickOptions }, ref) {
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
                    {quickOptions && quickOptions.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                            {quickOptions.map(opt => (
                                <button key={opt} type="button"
                                    onClick={() => onChange(value ? value + (value.endsWith('\n') ? '' : '\n') + opt : opt)}
                                    style={{ fontSize: 10, fontWeight: 600, color: '#6366f1', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    + {opt}
                                </button>
                            ))}
                        </div>
                    )}
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
    { id: 'bom',      label: '✓ Boa aula' },
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
                <span style={{ fontSize: 12, color: '#334155', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{text}</span>
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
        planoParaRegistro, setPlanoParaRegistro,
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
        filtroRegData,
        buscaRegistros, setBuscaRegistros,
        obterTurmasDoDia,
    } = useCalendarioContext()
    const { anosLetivos, alunosGetByTurma, turmaGetRubricas, turmaSetRubricas } = useAnoLetivoContext() as any
    const { planos, setPlanos, salvarRegistro, editarRegistro, excluirRegistro } = usePlanosContext()
    const { aplicacoes, atualizarStatusAplicacao } = useAplicacoesContext()
    const setRegSerieSel: ((v: string) => void) | undefined = undefined

    // ── IA pós-aula ──
    const [sugestaoIA, setSugestaoIA] = React.useState<string | null>(null)
    const [loadingIA, setLoadingIA] = React.useState(false)
    const [resumoPais, setResumoPais] = React.useState<string | null>(null)
    const [loadingResumoPais, setLoadingResumoPais] = React.useState(false)

    // ── Copiar registro para outras turmas ──
    function resolverTurmaLabel(anoLetivoId: unknown, escolaId: unknown, segmentoId: unknown, turmaId: unknown): string {
        for (const a of anosLetivos) {
            if (a.id != anoLetivoId) continue
            const esc = (a.escolas ?? []).find((e: any) => e.id == escolaId)
            if (!esc) continue
            const seg = (esc.segmentos ?? []).find((s: any) => s.id == segmentoId)
            if (!seg) continue
            const tur = (seg.turmas ?? []).find((t: any) => t.id == turmaId)
            if (tur) return `${esc.nome} · ${seg.nome} · ${tur.nome}`
        }
        return ''
    }

    function confirmarCopia(reg: any) {
        if (!planoParaRegistro || turmasCopiar.size === 0) { setCopiandoRegId(null); return }
        const novos = [...turmasCopiar].map((chave, idx) => {
            const [anoId, escId, segId, turId] = chave.split('|')
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { dataEdicao: _de, ...camposReg } = reg
            const { chamada: _chamada, audioNotaDeVoz: _audio, audioDuracao: _dur, audioMime: _mime, ...camposParaCopiar } = camposReg
            return {
                ...camposParaCopiar,
                id: Date.now() + idx + 1,
                anoLetivo: anoId, escola: escId, segmento: segId, turma: turId,
                dataRegistro: new Date().toISOString().split('T')[0],
                ...(copiarOutroDia ? { data: copiarOutroDia } : {}),
            }
        })
        const atualizado = { ...planoParaRegistro, registrosPosAula: [...(planoParaRegistro.registrosPosAula || []), ...novos] }
        setPlanos((prev: any[]) => prev.map((p: any) => p.id === atualizado.id ? atualizado : p))
        setPlanoParaRegistro(atualizado)
        // Marcar aplicações das turmas destino como "realizada" no calendário
        for (const chave of turmasCopiar) {
            const [anoId, escId, segId, turId] = chave.split('|')
            const ap = aplicacoes.find(a =>
                // eslint-disable-next-line eqeqeq
                a.planoId == planoParaRegistro.id &&
                // eslint-disable-next-line eqeqeq
                a.anoLetivoId == anoId && a.escolaId == escId &&
                // eslint-disable-next-line eqeqeq
                a.segmentoId == segId && a.turmaId == turId &&
                a.data === reg.data
            )
            if (ap && ap.status !== 'realizada') atualizarStatusAplicacao(ap.id, 'realizada')
        }
        setCopiandoRegId(null)
        setTurmasCopiar(new Set())
    }

    // ── Estados de janela ──
    const [minimizado, setMinimizado] = React.useState(false)
    const [maximizado, setMaximizado] = React.useState(false)
    const [pos,  setPos]  = React.useState<{ x: number; y: number } | null>(null)
    const [size, setSize] = React.useState({ w: 512, h: 600 })
    // Registros expandidos no histórico
    const [expandedRegs, setExpandedRegs] = React.useState<Set<any>>(new Set())
    // Copiar registro para outras turmas
    const [copiandoRegId, setCopiandoRegId] = React.useState<any>(null)
    const [turmasCopiar, setTurmasCopiar] = React.useState<Set<string>>(new Set())
    const [copiarOutroDia, setCopiarOutroDia] = React.useState<string>('')
    const [novoEnc, setNovoEnc] = React.useState('')
    // ── estados de áudio (B3) ──
    const [gravando, setGravando] = React.useState(false)
    const [timerGravacao, setTimerGravacao] = React.useState(0)
    const [audioBase64, setAudioBase64] = React.useState<string | null>(null)
    const [audioDuracao, setAudioDuracao] = React.useState(0)
    const [audioMime, setAudioMime] = React.useState('audio/webm')
    const [audioUrl, setAudioUrl] = React.useState<string | null>(null)
    const [erroAudio, setErroAudio] = React.useState<string | null>(null)
    const timerIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
    const MAX_DURACAO_AUDIO = 60

    // Expande automaticamente o registro mais recente da turma clicada ao abrir no Histórico
    React.useEffect(() => {
        if (!verRegistros || !planoParaRegistro) return
        const regs = (planoParaRegistro.registrosPosAula || [])
        // Se filtro por dia: expande o registro da turma específica neste dia
        // Se só filtro por turma: expande o mais recente daquela turma
        const candidatos = regs.filter((r: any) => {
            if (filtroRegData  && r.data  != filtroRegData)  return false
            if (filtroRegTurma && r.turma != filtroRegTurma) return false
            return true
        }).sort((a: any, b: any) => (b.data || '').localeCompare(a.data || ''))
        if (candidatos.length > 0) {
            setExpandedRegs(new Set([candidatos[0].id ?? 0]))
        }
    }, [verRegistros, filtroRegTurma, filtroRegData]) // eslint-disable-line

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
                                {planoParaRegistro.registrosPosAula?.length > 0 && (() => {
                                    const countFiltrado = (planoParaRegistro.registrosPosAula || []).filter((r: any) => {
                                        if (filtroRegTurma) {
                                            if (r.turma != filtroRegTurma) return false
                                        } else if (filtroRegData) {
                                            if (r.data != filtroRegData) return false
                                        } else {
                                            if (filtroRegAno      && r.anoLetivo             != filtroRegAno)      return false
                                            if (filtroRegEscola   && r.escola                != filtroRegEscola)   return false
                                            if (filtroRegSegmento && (r.segmento || r.serie) != filtroRegSegmento) return false
                                        }
                                        return true
                                    }).length
                                    return (
                                        <span style={{ background: '#f1f5f9', color: '#94a3b8', fontSize: 11, padding: '1px 6px', borderRadius: 99, marginLeft: 4 }}>
                                            {countFiltrado}
                                        </span>
                                    )
                                })()}
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
                                            <button onClick={() => { setRegistroEditando(null); setNovoRegistro({ dataAula: new Date().toISOString().split('T')[0], resumoAula: '', funcionouBem: '', naoFuncionou: '', poderiaMelhorar: '', proximaAula: '', proximaAulaOpcao: '', resultadoAula: '', comportamento: '', anotacoesGerais: '', urlEvidencia: '' }); setRegEscolaSel(''); setRegTurmaSel('') }}
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

                                    {/* ⚠️ Alunos com flag de atenção */}
                                    {regTurmaSel && regAnoSel && regEscolaSel && regSegmentoSel && (() => {
                                        const flagged = alunosGetByTurma(regAnoSel, regEscolaSel, regSegmentoSel, regTurmaSel).filter(a => a.flag)
                                        if (flagged.length === 0) return null
                                        return (
                                            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '10px 12px' }}>
                                                <p className="text-[11px] font-bold text-amber-700 mb-1.5 uppercase tracking-wide">⚠️ Atenção especial</p>
                                                <div className="flex flex-col gap-1">
                                                    {flagged.map(al => (
                                                        <div key={al.id} className="flex items-start gap-1.5">
                                                            <span className="text-amber-500 text-xs shrink-0 mt-0.5">•</span>
                                                            <span className="text-xs text-amber-800 font-semibold">{al.nome}</span>
                                                            {al.nota && <span className="text-xs text-amber-600 italic">— {al.nota}</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })()}

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

                                    {/* Chamada rápida */}
                                    {regTurmaSel && regAnoSel && regEscolaSel && regSegmentoSel && (() => {
                                        const todosAlunos = alunosGetByTurma(regAnoSel, regEscolaSel, regSegmentoSel, regTurmaSel)
                                        if (todosAlunos.length === 0) return null
                                        const chamadaAtual: { alunoId: string; presente: boolean }[] = (novoRegistro as any).chamada || []
                                        const getPresente = (id: string) => {
                                            const entry = chamadaAtual.find(c => c.alunoId === id)
                                            return entry ? entry.presente : null // null = não marcado
                                        }
                                        const togglePresente = (alunoId: string, presente: boolean) => {
                                            const atual = chamadaAtual.find(c => c.alunoId === alunoId)
                                            let nova: { alunoId: string; presente: boolean }[]
                                            if (atual && atual.presente === presente) {
                                                // clique duplo = desmarcar
                                                nova = chamadaAtual.filter(c => c.alunoId !== alunoId)
                                            } else {
                                                nova = [...chamadaAtual.filter(c => c.alunoId !== alunoId), { alunoId, presente }]
                                            }
                                            setNovoRegistro({ ...novoRegistro, chamada: nova } as any)
                                        }
                                        const presentes = chamadaAtual.filter(c => c.presente).length
                                        const ausentes = chamadaAtual.filter(c => !c.presente).length
                                        const total = todosAlunos.length
                                        return (
                                            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#f8fafc' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px' }}>
                                                    <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>✋</span>
                                                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: '#64748b', flex: 1 }}>
                                                        Chamada
                                                    </span>
                                                    {(presentes > 0 || ausentes > 0) && (
                                                        <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, background: '#f0fdf4', padding: '1px 8px', borderRadius: 99, border: '1px solid #bbf7d0', flexShrink: 0 }}>
                                                            {presentes}/{total} presentes
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ padding: '0 12px 10px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                    {todosAlunos.map(al => {
                                                        const estado = getPresente(al.id)
                                                        return (
                                                            <div key={al.id} style={{ display: 'flex', gap: 2 }}>
                                                                <button type="button"
                                                                    onClick={() => togglePresente(al.id, true)}
                                                                    title="Presente"
                                                                    style={{
                                                                        fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: '8px 0 0 8px', cursor: 'pointer', transition: 'all .15s',
                                                                        background: estado === true ? '#22c55e' : '#f1f5f9',
                                                                        color: estado === true ? '#fff' : '#64748b',
                                                                        border: estado === true ? '1px solid #16a34a' : '1px solid #e2e8f0',
                                                                    }}>
                                                                    {al.nome.split(' ')[0]}
                                                                </button>
                                                                <button type="button"
                                                                    onClick={() => togglePresente(al.id, false)}
                                                                    title="Ausente"
                                                                    style={{
                                                                        fontSize: 11, fontWeight: 600, padding: '4px 6px', borderRadius: '0 8px 8px 0', cursor: 'pointer', transition: 'all .15s',
                                                                        background: estado === false ? '#ef4444' : '#f1f5f9',
                                                                        color: estado === false ? '#fff' : '#94a3b8',
                                                                        border: estado === false ? '1px solid #dc2626' : '1px solid #e2e8f0',
                                                                    }}>
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })()}

                                        {/* Rubrica de avaliação */}
                                        {regTurmaSel && regAnoSel && regEscolaSel && regSegmentoSel && (() => {
                                            const criterios = (typeof turmaGetRubricas === 'function'
                                                ? turmaGetRubricas(regAnoSel, regEscolaSel, regSegmentoSel, regTurmaSel)
                                                : RUBRICAS_PADRAO) as { id: string; nome: string; escala: number }[]
                                            const rubricaAtual: { criterioId: string; valor: number }[] = (novoRegistro as any).rubrica || []
                                            const getValor = (id: string) => rubricaAtual.find(r => r.criterioId === id)?.valor ?? 0
                                            const setValor = (criterioId: string, valor: number) => {
                                                const nova = [...rubricaAtual.filter(r => r.criterioId !== criterioId), { criterioId, valor }]
                                                setNovoRegistro({ ...novoRegistro, rubrica: nova } as any)
                                            }
                                            const preenchida = rubricaAtual.some(r => r.valor > 0)
                                            return (
                                                <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#f8fafc' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px' }}>
                                                        <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>📊</span>
                                                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: preenchida ? '#334155' : '#64748b', flex: 1 }}>
                                                            Avaliação da aula
                                                        </span>
                                                        {preenchida && <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, background: '#f0fdf4', padding: '1px 6px', borderRadius: 99, border: '1px solid #bbf7d0', flexShrink: 0 }}>✓</span>}
                                                    </div>
                                                    <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                        {criterios.map(c => {
                                                            const val = getValor(c.id)
                                                            return (
                                                                <div key={c.id}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                                        <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{c.nome}</span>
                                                                        <span style={{ fontSize: 11, color: val > 0 ? '#6366f1' : '#94a3b8' }}>{val > 0 ? `${val}/${c.escala}` : '—'}</span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                                        {Array.from({ length: c.escala }, (_, i) => i + 1).map(n => (
                                                                            <button key={n} type="button"
                                                                                onClick={() => setValor(c.id, val === n ? 0 : n)}
                                                                                style={{
                                                                                    flex: 1, height: 28, borderRadius: 6, cursor: 'pointer', transition: 'all .15s', border: 'none',
                                                                                    background: n <= val ? '#6366f1' : '#e2e8f0',
                                                                                    color: n <= val ? '#fff' : '#94a3b8',
                                                                                    fontSize: 11, fontWeight: 700,
                                                                                }}>
                                                                                {n}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        })()}

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
                                                    quickOptions={field === 'resumoAula' ? ['Plano de aula completo'] : undefined}
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

                                        {/* Evidência de Aula — URL */}
                                        {(() => {
                                            const url = (novoRegistro as any).urlEvidencia || ''
                                            let urlValida = false
                                            try { urlValida = url.length > 0 && !!new URL(url) } catch { urlValida = false }
                                            return (
                                                <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#f8fafc' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px' }}>
                                                        <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>📎</span>
                                                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: url ? '#334155' : '#64748b', flex: 1 }}>
                                                            Evidência de aula
                                                        </span>
                                                        {url && <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, background: '#f0fdf4', padding: '1px 6px', borderRadius: 99, border: '1px solid #bbf7d0', flexShrink: 0 }}>✓</span>}
                                                    </div>
                                                    <div style={{ padding: '0 12px 10px', display: 'flex', gap: 6 }}>
                                                        <input
                                                            type="url"
                                                            value={url}
                                                            onChange={e => setNovoRegistro({ ...novoRegistro, urlEvidencia: e.target.value })}
                                                            placeholder="Cole um link (Google Drive, YouTube, áudio...)"
                                                            style={{ flex: 1, padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#334155', fontFamily: 'inherit', outline: 'none', background: '#fff' }}
                                                            onFocus={e => (e.target.style.borderColor = '#94a3b8')}
                                                            onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                                                        />
                                                        {urlValida && (
                                                            <a href={url} target="_blank" rel="noopener noreferrer"
                                                                style={{ padding: '8px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#1d4ed8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                                                🔗 Abrir
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })()}

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

                                        {/* Encaminhamentos → próxima aula */}
                                        {(() => {
                                            const encaminhamentos: { id: string; texto: string; concluido: boolean }[] = (novoRegistro as any).encaminhamentos || []
                                            const addEnc = () => {
                                                const txt = novoEnc.trim()
                                                if (!txt) return
                                                const novo = [...encaminhamentos, { id: String(Date.now()), texto: txt, concluido: false }]
                                                setNovoRegistro({ ...novoRegistro, encaminhamentos: novo } as any)
                                                setNovoEnc('')
                                            }
                                            return (
                                                <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#f8fafc' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px' }}>
                                                        <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>📌</span>
                                                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: encaminhamentos.length > 0 ? '#334155' : '#64748b', flex: 1 }}>
                                                            Encaminhamentos para próxima aula
                                                        </span>
                                                        {encaminhamentos.length > 0 && (
                                                            <span style={{ fontSize: 10, color: '#6366f1', fontWeight: 700, background: '#eef2ff', padding: '1px 8px', borderRadius: 99, border: '1px solid #c7d2fe', flexShrink: 0 }}>
                                                                {encaminhamentos.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ padding: '0 12px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                        {encaminhamentos.map((enc, idx) => (
                                                            <div key={enc.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <input type="checkbox" checked={enc.concluido}
                                                                    onChange={() => {
                                                                        const nova = encaminhamentos.map((e, i) => i === idx ? { ...e, concluido: !e.concluido } : e)
                                                                        setNovoRegistro({ ...novoRegistro, encaminhamentos: nova } as any)
                                                                    }}
                                                                    style={{ accentColor: '#6366f1', flexShrink: 0 }}
                                                                />
                                                                <span style={{ fontSize: 12, color: enc.concluido ? '#94a3b8' : '#334155', flex: 1, textDecoration: enc.concluido ? 'line-through' : 'none' }}>{enc.texto}</span>
                                                                <button type="button" onClick={() => {
                                                                    const nova = encaminhamentos.filter((_, i) => i !== idx)
                                                                    setNovoRegistro({ ...novoRegistro, encaminhamentos: nova } as any)
                                                                }} style={{ color: '#cbd5e1', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: '0 2px', flexShrink: 0 }}>✕</button>
                                                            </div>
                                                        ))}
                                                        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                                                            <input type="text" value={novoEnc} onChange={e => setNovoEnc(e.target.value)}
                                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEnc() } }}
                                                                placeholder="Ex: Trazer partitura do Noturno, revisar compasso 12"
                                                                style={{ flex: 1, padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, color: '#334155', fontFamily: 'inherit', outline: 'none' }}
                                                                onFocus={e => (e.target.style.borderColor = '#94a3b8')}
                                                                onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                                                            />
                                                            <button type="button" onClick={addEnc} disabled={!novoEnc.trim()}
                                                                style={{ padding: '7px 12px', background: novoEnc.trim() ? '#6366f1' : '#e2e8f0', color: novoEnc.trim() ? '#fff' : '#94a3b8', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: novoEnc.trim() ? 'pointer' : 'default', transition: 'all .15s', flexShrink: 0 }}>
                                                                + Add
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })()}
                                    </div>

                                    {/* ── Nota de voz (B3) ── */}
                                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#f8fafc', marginBottom: 4 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px' }}>
                                            <span style={{ fontSize: 14, lineHeight: 1 }}>🎙️</span>
                                            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: audioBase64 ? '#334155' : '#64748b', flex: 1 }}>
                                                Nota de voz
                                            </span>
                                            {audioBase64 && <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, background: '#f0fdf4', padding: '1px 6px', borderRadius: 99, border: '1px solid #bbf7d0' }}>✓ {audioDuracao}s</span>}
                                        </div>
                                        <div style={{ padding: '0 12px 12px' }}>
                                            {erroAudio && (
                                                <p style={{ fontSize: 11, color: '#ef4444', margin: '0 0 8px' }}>{erroAudio}</p>
                                            )}
                                            {!audioBase64 && !gravando && (
                                                <button type="button"
                                                    onClick={async () => {
                                                        setErroAudio(null)
                                                        try {
                                                            await startRecording()
                                                            setGravando(true)
                                                            setTimerGravacao(0)
                                                            timerIntervalRef.current = setInterval(() => {
                                                                setTimerGravacao(t => {
                                                                    const next = t + 1
                                                                    if (next >= MAX_DURACAO_AUDIO) {
                                                                        clearInterval(timerIntervalRef.current!)
                                                                        stopRecording().then(async blob => {
                                                                            const b64 = await blobToBase64(blob)
                                                                            const mime = blob.type || 'audio/webm'
                                                                            const url = base64ToObjectUrl(b64, mime)
                                                                            setAudioBase64(b64); setAudioMime(mime); setAudioUrl(url)
                                                                            setAudioDuracao(MAX_DURACAO_AUDIO); setGravando(false)
                                                                            setNovoRegistro((prev: any) => ({ ...prev, audioNotaDeVoz: b64, audioDuracao: MAX_DURACAO_AUDIO, audioMime: mime }))
                                                                        })
                                                                    }
                                                                    return next
                                                                })
                                                            }, 1000)
                                                        } catch {
                                                            setErroAudio('Microfone não disponível. Verifique as permissões do navegador.')
                                                        }
                                                    }}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                                                    <span>⏺</span> Gravar nota de voz
                                                </button>
                                            )}
                                            {gravando && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: '#fef2f2', padding: '4px 10px', borderRadius: 8, border: '1px solid #fecaca', letterSpacing: '.04em' }}>
                                                        ● REC {String(Math.floor(timerGravacao / 60)).padStart(2, '0')}:{String(timerGravacao % 60).padStart(2, '0')} / {MAX_DURACAO_AUDIO}s
                                                    </span>
                                                    <button type="button"
                                                        onClick={async () => {
                                                            clearInterval(timerIntervalRef.current!)
                                                            const blob = await stopRecording()
                                                            const b64 = await blobToBase64(blob)
                                                            const mime = blob.type || 'audio/webm'
                                                            const url = base64ToObjectUrl(b64, mime)
                                                            const dur = timerGravacao
                                                            setAudioBase64(b64); setAudioMime(mime); setAudioUrl(url); setAudioDuracao(dur); setGravando(false)
                                                            // Sincroniza com novoRegistro para que salvarRegistro() já encontre os dados
                                                            setNovoRegistro((prev: any) => ({ ...prev, audioNotaDeVoz: b64, audioDuracao: dur, audioMime: mime }))
                                                        }}
                                                        style={{ padding: '5px 12px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#dc2626', cursor: 'pointer' }}>
                                                        ⏹ Parar
                                                    </button>
                                                </div>
                                            )}
                                            {audioBase64 && audioUrl && !gravando && (
                                                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                                                    <audio controls src={audioUrl} style={{ width: '100%', height: 32 }} />
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{audioDuracao}s · ~{base64SizeKb(audioBase64)} KB</span>
                                                        <button type="button"
                                                            onClick={() => {
                                                                if (audioUrl) URL.revokeObjectURL(audioUrl)
                                                                setAudioBase64(null); setAudioUrl(null); setAudioDuracao(0); setAudioMime('audio/webm')
                                                                setNovoRegistro((prev: any) => { const { audioNotaDeVoz: _a, audioDuracao: _d, audioMime: _m, ...rest } = prev; return rest })
                                                            }}
                                                            style={{ marginLeft: 'auto', padding: '3px 9px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#dc2626', cursor: 'pointer' }}>
                                                            🗑 Excluir
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                </>

                            ) : (

                                /* ════════════════════════════════
                                   HISTÓRICO — Layout Opção A
                                   ════════════════════════════════ */
                                <>
                                    {/* ── Sugestão IA pós-aula ── */}
                                    {(loadingIA || sugestaoIA) && (
                                        <div style={{ margin: '12px 0 4px', padding: '12px 14px', background: 'linear-gradient(135deg, #eef2ff 0%, #f0fdf4 100%)', borderRadius: 12, border: '1px solid #c7d2fe' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                                <span style={{ fontSize: 13 }}>✨</span>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: '#4338ca', textTransform: 'uppercase' as const, letterSpacing: '.06em' }}>Sugestão para a próxima aula</span>
                                            </div>
                                            {loadingIA
                                                ? <p style={{ fontSize: 12, color: '#6366f1', fontStyle: 'italic' }}>Gerando sugestão...</p>
                                                : <>
                                                    <p style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.6, margin: 0 }}>{sugestaoIA}</p>
                                                    <button type="button"
                                                        onClick={() => { navigator.clipboard?.writeText(sugestaoIA || ''); setSugestaoIA('✓ Copiado!') }}
                                                        style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: '#4338ca', background: '#e0e7ff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                                                        📋 Copiar
                                                    </button>
                                                </>
                                            }
                                        </div>
                                    )}

                                    {/* ── Resumo para pais ── */}
                                    {sugestaoIA && !loadingIA && (
                                        <div style={{ margin: '0 0 4px', padding: '12px 14px', background: '#faf5ff', borderRadius: 12, border: '1px solid #e9d5ff' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ fontSize: 13 }}>📱</span>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: '.06em' }}>Resumo para os pais</span>
                                                </div>
                                                {!resumoPais && !loadingResumoPais && (
                                                    <button type="button"
                                                        onClick={() => {
                                                            const apiKey = import.meta.env.VITE_GEMINI_API_KEY
                                                            if (!apiKey) return
                                                            setLoadingResumoPais(true)
                                                            setResumoPais(null)
                                                            const reg = novoRegistro
                                                            const prompt = `Você é assistente de um professor de música. Com base no registro desta aula:\n- O que foi trabalhado: "${reg.resumoAula || ''}"\n- O que funcionou bem: "${reg.funcionouBem || ''}"\n- Observações: "${reg.anotacoesGerais || ''}"\n\nEscreva uma mensagem amigável e breve (máx. 4 linhas) para os pais/responsáveis, em português informal, informando o que foi feito na aula e uma dica prática do que o aluno pode praticar em casa. Sem saudação formal, direto ao ponto.`
                                                            fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                                                            })
                                                                .then(r => r.json())
                                                                .then(d => setResumoPais(d.candidates?.[0]?.content?.parts?.[0]?.text || null))
                                                                .catch(() => setResumoPais(null))
                                                                .finally(() => setLoadingResumoPais(false))
                                                        }}
                                                        style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', background: '#ede9fe', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                                                        ✨ Gerar
                                                    </button>
                                                )}
                                            </div>
                                            {loadingResumoPais && <p style={{ fontSize: 12, color: '#7c3aed', fontStyle: 'italic' }}>Gerando resumo...</p>}
                                            {resumoPais && (
                                                <>
                                                    <p style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{resumoPais}</p>
                                                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                                        <button type="button"
                                                            onClick={() => { navigator.clipboard?.writeText(resumoPais); setResumoPais('✓ Copiado!') }}
                                                            style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', background: '#ede9fe', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                                                            📋 Copiar
                                                        </button>
                                                        <button type="button" onClick={() => setResumoPais(null)}
                                                            style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                                                            Regenerar
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Filtro de turma — modo dia ou modo escola */}
                                    {(() => {
                                        const pillStyle = (ativo: boolean) => ({
                                            padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .12s',
                                            background: ativo ? '#475569' : '#fff',
                                            color: ativo ? '#fff' : '#64748b',
                                            border: ativo ? '1px solid #475569' : '1px solid #e2e8f0'
                                        })
                                        const btnTodas = (
                                            <button type="button" onClick={() => { setFiltroRegTurma(''); setExpandedRegs(new Set()) }}
                                                style={{ ...pillStyle(!filtroRegTurma), color: !filtroRegTurma ? '#fff' : '#94a3b8', border: !filtroRegTurma ? '1px solid #475569' : '1px dashed #e2e8f0' }}>
                                                Todas
                                            </button>
                                        )

                                        if (filtroRegData) {
                                            // Modo dia: pills de TODAS as turmas agendadas naquele dia (qualquer escola)
                                            const turmasDoDia = obterTurmasDoDia(filtroRegData)
                                            const dataFmt = new Date(filtroRegData + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
                                            return (
                                                <div style={{ background: '#f1f5f9', borderRadius: 10, padding: '10px 12px' }}>
                                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                                                        Turmas de {dataFmt}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                        {turmasDoDia.map(a => {
                                                            const label = resolverTurmaLabel(a.anoLetivoId, a.escolaId, a.segmentoId, a.turmaId) || `Turma ${a.turmaId}`
                                                            return (
                                                                <button key={`${a.escolaId}-${a.segmentoId}-${a.turmaId}`} type="button"
                                                                    onClick={() => {
                                                                        const novaTurma = filtroRegTurma == a.turmaId ? '' : a.turmaId
                                                                        setFiltroRegTurma(novaTurma)
                                                                        setExpandedRegs(new Set())
                                                                        if (novaTurma) {
                                                                            // turma pode ser de outro plano — trocar planoParaRegistro
                                                                            const ap = aplicacoes.find(ap => ap.turmaId == novaTurma && ap.data === filtroRegData)
                                                                            if (ap) {
                                                                                const plano = planos.find(p => String(p.id) === String(ap.planoId))
                                                                                if (plano) setPlanoParaRegistro(plano)
                                                                            }
                                                                        }
                                                                    }}
                                                                    style={pillStyle(filtroRegTurma == a.turmaId)}>
                                                                    {label}
                                                                </button>
                                                            )
                                                        })}
                                                        {btnTodas}
                                                    </div>
                                                </div>
                                            )
                                        }

                                        // Modo escola: hierarquia ano → escola → segmento → turmas
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
                                                            style={pillStyle(filtroRegTurma == t.id)}>
                                                            {t.nome}
                                                        </button>
                                                    ))}
                                                    {btnTodas}
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
                                            if (filtroRegTurma) {
                                                if (r.turma != filtroRegTurma) return false
                                            } else if (filtroRegData) {
                                                if (r.data != filtroRegData) return false
                                            } else {
                                                if (filtroRegAno      && r.anoLetivo != filtroRegAno) return false
                                                if (filtroRegEscola   && r.escola    != filtroRegEscola) return false
                                                if (filtroRegSegmento && (r.segmento || r.serie) != filtroRegSegmento) return false
                                            }
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
                                                    let urlEvidenciaValida = false
                                                    try { urlEvidenciaValida = !!(reg as any).urlEvidencia && !!new URL((reg as any).urlEvidencia) } catch { urlEvidenciaValida = false }

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
                                                                    {(reg as any).audioNotaDeVoz && <span title="Tem nota de voz" style={{ fontSize: 12 }}>🎙️</span>}
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <button onClick={e => { e.stopPropagation(); editarRegistro(reg) }}
                                                                        style={{ padding: '3px 7px', fontSize: 11, color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer' }} title="Editar">✏️</button>
                                                                    <button onClick={e => { e.stopPropagation(); if (copiandoRegId === (reg.id ?? i)) { setCopiandoRegId(null); setTurmasCopiar(new Set()); setCopiarOutroDia('') } else { setCopiandoRegId(reg.id ?? i); setTurmasCopiar(new Set()); setCopiarOutroDia('') } }}
                                                                        style={{ padding: '3px 7px', fontSize: 11, color: copiandoRegId === (reg.id ?? i) ? '#2563eb' : '#94a3b8', border: `1px solid ${copiandoRegId === (reg.id ?? i) ? '#93c5fd' : '#e2e8f0'}`, borderRadius: 6, background: copiandoRegId === (reg.id ?? i) ? '#eff6ff' : '#fff', cursor: 'pointer' }} title="Copiar para outras turmas">📋</button>
                                                                    <button onClick={e => { e.stopPropagation(); excluirRegistro(reg.id) }}
                                                                        style={{ padding: '3px 7px', fontSize: 11, color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer' }} title="Excluir">🗑️</button>
                                                                    <span style={{ fontSize: 10, color: '#94a3b8', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s', display: 'inline-block' }}>▼</span>
                                                                </div>
                                                            </div>

                                                            {/* Painel: copiar para outras turmas */}
                                                            {copiandoRegId === (reg.id ?? i) && (() => {
                                                                const dataRef = copiarOutroDia || reg.data
                                                                const turmasDoDia = obterTurmasDoDia(dataRef).filter(a =>
                                                                    copiarOutroDia
                                                                        ? true
                                                                        : !(a.turmaId == reg.turma && a.segmentoId == (reg.segmento || reg.serie))
                                                                )
                                                                const labelData = dataRef ? new Date(dataRef + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''
                                                                return (
                                                                    <div style={{ padding: '10px 12px', background: '#f0f9ff', borderBottom: '1px solid #e2e8f0' }} onClick={e => e.stopPropagation()}>
                                                                        <p style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', marginBottom: 8, letterSpacing: '.04em' }}>COPIAR PARA TURMAS</p>
                                                                        {/* Seletor de dia */}
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                                                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#334155', cursor: 'pointer' }}>
                                                                                <input type="radio" name={`copiar-dia-${reg.id ?? i}`} checked={!copiarOutroDia} onChange={() => { setCopiarOutroDia(''); setTurmasCopiar(new Set()) }} style={{ accentColor: '#3b82f6' }} />
                                                                                Mesmo dia ({reg.data ? new Date(reg.data + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''})
                                                                            </label>
                                                                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#334155', cursor: 'pointer' }}>
                                                                                <input type="radio" name={`copiar-dia-${reg.id ?? i}`} checked={!!copiarOutroDia} onChange={() => { setCopiarOutroDia(reg.data || ''); setTurmasCopiar(new Set()) }} style={{ accentColor: '#3b82f6' }} />
                                                                                Outro dia:
                                                                            </label>
                                                                            {copiarOutroDia !== '' && (
                                                                                <input type="date" value={copiarOutroDia} onChange={e => { setCopiarOutroDia(e.target.value); setTurmasCopiar(new Set()) }}
                                                                                    style={{ fontSize: 12, border: '1px solid #93c5fd', borderRadius: 6, padding: '2px 6px', color: '#0284c7', background: '#fff', outline: 'none' }} />
                                                                            )}
                                                                        </div>
                                                                        {turmasDoDia.length === 0
                                                                            ? <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma turma agendada para {labelData}.</p>
                                                                            : <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                                                                                {turmasDoDia.map(a => {
                                                                                    const chave = `${a.anoLetivoId}|${a.escolaId}|${a.segmentoId}|${a.turmaId}`
                                                                                    const label = resolverTurmaLabel(a.anoLetivoId, a.escolaId, a.segmentoId, a.turmaId) || `Turma ${a.turmaId}`
                                                                                    const sel = turmasCopiar.has(chave)
                                                                                    return (
                                                                                        <label key={chave} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, background: sel ? '#dbeafe' : '#fff', border: `1px solid ${sel ? '#93c5fd' : '#e2e8f0'}`, cursor: 'pointer', fontSize: 12, color: '#1e293b', fontWeight: sel ? 600 : 400 }}>
                                                                                            <input type="checkbox" checked={sel} onChange={() => setTurmasCopiar(prev => { const next = new Set(prev); sel ? next.delete(chave) : next.add(chave); return next })} style={{ accentColor: '#3b82f6' }} />
                                                                                            {a.horario && <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#7c3aed', flexShrink: 0 }}>{a.horario}</span>}
                                                                                            <span>{label}</span>
                                                                                        </label>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                        }
                                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                                            <button onClick={() => confirmarCopia(reg)} disabled={turmasCopiar.size === 0}
                                                                                style={{ flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 700, background: turmasCopiar.size > 0 ? '#2563eb' : '#e2e8f0', color: turmasCopiar.size > 0 ? '#fff' : '#94a3b8', border: 'none', borderRadius: 8, cursor: turmasCopiar.size > 0 ? 'pointer' : 'default', transition: 'all .15s' }}>
                                                                                Copiar {turmasCopiar.size > 0 ? `(${turmasCopiar.size})` : ''}
                                                                            </button>
                                                                            <button onClick={() => { setCopiandoRegId(null); setTurmasCopiar(new Set()); setCopiarOutroDia('') }}
                                                                                style={{ padding: '6px 12px', fontSize: 12, color: '#64748b', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}>
                                                                                Cancelar
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })()}

                                                            {/* Corpo expandido com chips de leitura */}
                                                            {isOpen && (
                                                                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                                    {chipFields.length > 0
                                                                        ? chipFields.map(f => <RegistroChip key={f.label} icon={f.icon} label={f.label} text={f.text!} />)
                                                                        : <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Nenhum campo preenchido.</p>
                                                                    }
                                                                    {urlEvidenciaValida && (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                                                                            <span style={{ fontSize: 13, flexShrink: 0 }}>📎</span>
                                                                            <span style={{ fontSize: 9, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '.08em', flexShrink: 0 }}>Evidência</span>
                                                                            <a href={(reg as any).urlEvidencia} target="_blank" rel="noopener noreferrer"
                                                                                style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                                                                🔗 Abrir link
                                                                            </a>
                                                                        </div>
                                                                    )}
                                                                    {(reg as any).audioNotaDeVoz && (
                                                                        <div style={{ padding: '8px 10px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                                                                <span style={{ fontSize: 13 }}>🎙️</span>
                                                                                <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '.08em' }}>Nota de voz</span>
                                                                                {(reg as any).audioDuracao && <span style={{ fontSize: 10, color: '#94a3b8' }}>{(reg as any).audioDuracao}s</span>}
                                                                            </div>
                                                                            <audio controls
                                                                                src={base64ToObjectUrl((reg as any).audioNotaDeVoz, (reg as any).audioMime || 'audio/webm')}
                                                                                style={{ width: '100%', height: 32 }} />
                                                                        </div>
                                                                    )}
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

                        {/* ── Sticky save footer (Novo registro) ── */}
                        {!verRegistros && (
                            <div style={{ padding: '10px 16px', borderTop: '1px solid #e2e8f0', background: '#fff', flexShrink: 0 }}>
                                <button ref={salvarBtnRef} onClick={() => {
                                    const algumCampo = !!(novoRegistro.resumoAula || novoRegistro.funcionouBem || novoRegistro.naoFuncionou || novoRegistro.proximaAula || novoRegistro.comportamento)
                                    const dadosParaIA = { ...novoRegistro }
                                    const tituloPlano = planoParaRegistro?.titulo || ''
                                    if (audioUrl) URL.revokeObjectURL(audioUrl)
                                    setAudioBase64(null); setAudioUrl(null); setAudioDuracao(0)
                                    salvarRegistro()
                                    if (algumCampo && !registroEditando) {
                                        const apiKey = import.meta.env.VITE_GEMINI_API_KEY
                                        if (apiKey) {
                                            setSugestaoIA(null)
                                            setLoadingIA(true)
                                            const prompt = `Você é um assistente pedagógico para professor de música.\nPlano de aula: "${tituloPlano}"\nResumo da aula: "${dadosParaIA.resumoAula || ''}"\nO que funcionou: "${dadosParaIA.funcionouBem || ''}"\nO que não funcionou: "${dadosParaIA.naoFuncionou || ''}"\nPróxima aula (professor): "${dadosParaIA.proximaAula || ''}"\nComportamento: "${dadosParaIA.comportamento || ''}"\n\nCom base neste registro, sugira em 2-3 frases objetivas o que priorizar na próxima aula e uma estratégia específica. Responda em português, de forma direta e prática.`
                                            fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                                            })
                                                .then(r => r.json())
                                                .then(d => setSugestaoIA(d.candidates?.[0]?.content?.parts?.[0]?.text || null))
                                                .catch(() => setSugestaoIA(null))
                                                .finally(() => setLoadingIA(false))
                                        }
                                    }
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
                                    style={{ width: '100%', padding: '12px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'all .15s' }}
                                    onMouseOver={e => { e.currentTarget.style.background = '#334155' }}
                                    onMouseOut={e  => { e.currentTarget.style.background = '#1e293b' }}
                                    onFocus={e  => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.outline = 'none' }}
                                    onBlur={e   => { e.currentTarget.style.background = '#1e293b' }}
                                >
                                    <span style={{ fontSize: 15 }}>✓</span>
                                    {registroEditando ? 'Salvar alterações' : 'Salvar registro'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    )
}
