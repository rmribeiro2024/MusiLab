import React from 'react'
import { useCalendarioContext } from '../../contexts'
import { useAnoLetivoContext, RUBRICAS_PADRAO } from '../../contexts/AnoLetivoContext'
import { usePlanosContext, useAplicacoesContext } from '../../contexts'
import { useEstrategiasContext } from '../../contexts'
import { startRecording, stopRecording, blobToBase64, base64ToObjectUrl, base64SizeKb } from '../../lib/audioRecorder'
import { showToast } from '../../lib/toast'
import { uploadEvidencia, isGoogleDriveConfigured, isMobileDevice, hasValidToken, checkRedirectToken, redirectToGoogleAuth, initDriveAuth, requestDriveToken } from '../../lib/googleDrive'

// ── Detecção de dark mode ──
function useIsDark() {
    const [isDark, setIsDark] = React.useState(() => document.documentElement.classList.contains('dark'))
    React.useEffect(() => {
        const obs = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')))
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        return () => obs.disconnect()
    }, [])
    return isDark
}

// ── Paleta de cores dark/light ──
const dk = (isDark: boolean) => ({
    cardBg:      isDark ? '#1F2937' : '#f8fafc',
    cardBgSolid: isDark ? '#1F2937' : '#ffffff',
    cardBgAlt:   isDark ? '#283040' : '#f1f5f9',
    border:      isDark ? '#374151' : '#e2e8f0',
    borderLight: isDark ? '#374151' : '#f1f5f9',
    textMain:    isDark ? '#E5E7EB' : '#334155',
    textMed:     isDark ? '#9CA3AF' : '#64748b',
    textMuted:   isDark ? '#6b7280' : '#94a3b8',
    inputBg:     isDark ? '#111827' : '#ffffff',
    inputColor:  isDark ? '#E5E7EB' : '#0f172a',
})

// ── ACCORDION CHIP — campo colapsável genérico ──
const AccordionChip = React.forwardRef<() => void, {
    id: string, icon: string, label: string, placeholder: string,
    value: string, filled: boolean, defaultOpen?: boolean,
    onChange: (v: string) => void,
    onTabNext?: () => void,
    quickOptions?: string[],
    allowVoice?: boolean,
    isDark?: boolean,
}>(function AccordionChip({ id, icon, label, placeholder, value, filled, defaultOpen, onChange, onTabNext, quickOptions, allowVoice, isDark = false }, ref) {
    const [open, setOpen] = React.useState(defaultOpen ?? false)
    const [gravando, setGravando] = React.useState(false)
    const [speechAtivo, setSpeechAtivo] = React.useState(false)
    const recognitionRef = React.useRef<any>(null)
    const valueRef = React.useRef(value)
    React.useEffect(() => { valueRef.current = value }, [value])
    React.useImperativeHandle(ref, () => () => setOpen(true))
    React.useEffect(() => { if (filled) setOpen(true) }, [filled])

    const toggleVoz = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (gravando) { recognitionRef.current?.stop(); setGravando(false); setSpeechAtivo(false); return }
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SR) { alert('Reconhecimento de voz não disponível neste navegador. Use Chrome ou Edge.'); return }
        const rec = new SR()
        rec.lang = 'pt-BR'
        rec.continuous = true
        rec.interimResults = false
        rec.onspeechstart = () => setSpeechAtivo(true)
        rec.onspeechend = () => setSpeechAtivo(false)
        rec.onresult = (ev: any) => {
            const t = Array.from(ev.results).slice(ev.resultIndex).map((r: any) => r[0].transcript).join(' ')
            const cur = valueRef.current
            onChange(cur ? cur + ' ' + t : t)
        }
        rec.onend = () => { setGravando(false); setSpeechAtivo(false) }
        rec.onerror = () => { setGravando(false); setSpeechAtivo(false) }
        recognitionRef.current = rec
        rec.start()
        setGravando(true)
        setOpen(true)
    }

    const c = dk(isDark)
    return (
        <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, overflow: 'hidden', background: c.cardBg }}>
            <div onClick={() => setOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', cursor: 'pointer' }}>
                <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: filled ? c.textMain : c.textMed, flex: 1 }}>
                    {label}
                </span>
                {filled && <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, background: '#f0fdf4', padding: '1px 6px', borderRadius: 99, border: '1px solid #bbf7d0', flexShrink: 0 }}>✓</span>}
                {allowVoice && (
                    <button type="button" onClick={toggleVoz} title={gravando ? 'Parar gravação' : 'Gravar por voz'}
                        style={{ fontSize: 13, background: gravando ? '#fee2e2' : 'transparent', border: gravando ? '1px solid #fca5a5' : '1px solid transparent', borderRadius: 6, cursor: 'pointer', padding: '2px 5px', flexShrink: 0, color: gravando ? '#ef4444' : c.textMuted, outline: 'none' }}>
                        {gravando ? '⏹' : '🎙'}
                    </button>
                )}
                <span style={{ fontSize: 9, color: c.textMuted, flexShrink: 0, marginLeft: 4, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s', display: 'inline-block' }}>▼</span>
            </div>
            {open && (
                <div style={{ padding: '0 12px 10px' }}>
                    {quickOptions && quickOptions.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                            {quickOptions.map(opt => (
                                <button key={opt} type="button"
                                    onClick={() => { if (!value.includes(opt)) onChange(value ? value + (value.endsWith('\n') ? '' : '\n') + opt : opt) }}
                                    style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    + {opt}
                                </button>
                            ))}
                        </div>
                    )}
                    <textarea id={id} value={value} onChange={e => onChange(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); setOpen(false); onTabNext?.() } }}
                        rows={2} placeholder={placeholder} autoFocus
                        style={{ width: '100%', padding: '9px 10px', border: `1px solid ${gravando ? (speechAtivo ? '#fca5a5' : c.border) : c.border}`, borderRadius: 8, fontSize: 13, color: c.textMain, background: c.inputBg, resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const, outline: 'none', transition: 'border-color .2s' }}
                        onFocus={e => { if (!gravando) e.target.style.borderColor = '#94a3b8' }}
                        onBlur={e  => { if (!gravando) e.target.style.borderColor = c.border }}
                    />
                    {gravando && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, fontSize: 11 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: speechAtivo ? '#ef4444' : '#94a3b8', flexShrink: 0, transition: 'background .2s' }} />
                            <span style={{ color: speechAtivo ? '#ef4444' : '#94a3b8', fontWeight: 500 }}>
                                {speechAtivo ? 'Ouvindo...' : 'Aguardando — pode continuar falando ou pressionar ⏹'}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
})

// ── BEHAVIOR CHIP — comportamento com tags clicáveis ──
const BEHAVIOR_PRIMARY = [
    { id: 'focada',    label: '🎯 Focada e engajada' },
    { id: 'animada',   label: '🔥 Animada' },
    { id: 'esperado',  label: '😐 Dentro do esperado' },
    { id: 'cansada',   label: '😴 Cansada' },
    { id: 'dispersa',  label: '💭 Dispersa' },
]
const BEHAVIOR_SECONDARY = [
    { id: 'agitada',   label: '⚡ Muito agitada' },
    { id: 'dificil',   label: '😤 Difícil conduzir' },
    { id: 'falante',   label: '🗣️ Muito falante' },
    { id: 'timida',    label: '🤐 Tímida' },
    { id: 'oscilou',   label: '🔄 Oscilou muito' },
    { id: 'lenta',     label: '🐢 Mais lenta hoje' },
]
const ALL_BEHAVIOR_TAGS = [...BEHAVIOR_PRIMARY, ...BEHAVIOR_SECONDARY]

const BehaviorChip = React.forwardRef<() => void, {
    value: string, filled: boolean,
    onChange: (v: string) => void,
    onTabNext?: () => void,
    isDark?: boolean,
}>(function BehaviorChip({ value, filled, onChange, isDark = false }, ref) {
    const [open, setOpen] = React.useState(false)
    const [expanded, setExpanded] = React.useState(false)
    const [selectedIds, setSelectedIds] = React.useState<string[]>([])
    const [nota, setNota] = React.useState('')

    React.useImperativeHandle(ref, () => () => setOpen(true))
    React.useEffect(() => { if (filled) setOpen(true) }, [filled])

    // Sincroniza ao carregar (ex: editar registro)
    React.useEffect(() => {
        if (value) {
            const matched = ALL_BEHAVIOR_TAGS.filter(t => value.includes(t.label)).map(t => t.id)
            if (matched.length > 0) {
                setSelectedIds(matched)
                // Abrir extras se algum selecionado for secundário
                if (BEHAVIOR_SECONDARY.some(t => matched.includes(t.id))) setExpanded(true)
            }
            // Extrai nota de texto livre (após o último ". ")
            const lastDot = value.lastIndexOf('. ')
            if (lastDot > -1) {
                const possibleNota = value.slice(lastDot + 2)
                if (!ALL_BEHAVIOR_TAGS.some(t => t.label === possibleNota)) setNota(possibleNota)
            }
        }
    }, []) // eslint-disable-line

    const toggleTag = (tagId: string) => {
        const next = selectedIds.includes(tagId)
            ? selectedIds.filter(t => t !== tagId)
            : [...selectedIds, tagId]
        setSelectedIds(next)
        emit(next, nota)
    }

    const emit = (ids: string[], textoNota: string) => {
        const labels = ids.map(id => ALL_BEHAVIOR_TAGS.find(t => t.id === id)?.label || '').filter(Boolean)
        const parts = textoNota.trim() ? [...labels, textoNota.trim()] : labels
        onChange(parts.join('. '))
    }

    const cb = dk(isDark)
    const chipStyle = (sel: boolean): React.CSSProperties => ({
        padding: '8px 13px', borderRadius: 20, fontSize: 13,
        cursor: 'pointer', transition: 'all .12s', fontFamily: 'inherit',
        whiteSpace: 'nowrap' as const, lineHeight: 1.2,
        background: sel ? (isDark ? '#4f46e5' : '#1e2a4a') : cb.cardBgSolid,
        color:      sel ? '#fff' : cb.textMed,
        border:     sel ? `1.5px solid ${isDark ? '#4f46e5' : '#1e2a4a'}` : `1.5px solid ${cb.border}`,
        fontWeight: sel ? 700 : 500,
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
    })

    return (
        <div style={{ border: `1px solid ${cb.border}`, borderRadius: 10, overflow: 'hidden', background: cb.cardBg }}>
            <div onClick={() => setOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', cursor: 'pointer' }}>
                <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>👥</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: filled ? cb.textMain : cb.textMed, flex: 1 }}>
                    Como estava a turma hoje?
                </span>
                {filled && <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, background: '#f0fdf4', padding: '1px 6px', borderRadius: 99, border: '1px solid #bbf7d0', flexShrink: 0 }}>✓</span>}
                <span style={{ fontSize: 9, color: cb.textMuted, flexShrink: 0, marginLeft: 4, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s', display: 'inline-block' }}>▼</span>
            </div>
            {open && (
                <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {BEHAVIOR_PRIMARY.map(tag => (
                            <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)} style={chipStyle(selectedIds.includes(tag.id))}>{tag.label}</button>
                        ))}
                    </div>
                    {expanded && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, paddingTop: 2 }}>
                            {BEHAVIOR_SECONDARY.map(tag => (
                                <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)} style={chipStyle(selectedIds.includes(tag.id))}>{tag.label}</button>
                            ))}
                        </div>
                    )}
                    <button type="button" onClick={() => setExpanded(v => !v)}
                        style={{ alignSelf: 'flex-start', fontSize: 12, color: cb.textMed, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', fontFamily: 'inherit', outline: 'none' }}>
                        {expanded ? '− menos opções' : '+ mais opções'}
                    </button>
                    <textarea value={nota} onChange={e => { setNota(e.target.value); emit(selectedIds, e.target.value) }}
                        rows={2} placeholder="Se quiser, descreva um pouco mais…"
                        style={{ width: '100%', padding: '8px 10px', border: `1px solid ${cb.border}`, borderRadius: 8, fontSize: 12, color: cb.textMain, resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', background: cb.inputBg }}
                        onFocus={e => (e.target.style.borderColor = '#94a3b8')}
                        onBlur={e  => (e.target.style.borderColor = cb.border)}
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



// ── STATUS DA AULA SELECTOR (unifica resultado + próxima aula) ──────────────
type StatusAula = 'concluida' | 'revisao' | 'incompleta' | 'nao_houve' | '';

const STATUS_AULA_OPCOES: { value: Exclude<StatusAula, ''>; label: string; emoji: string; color: string; accent: string }[] = [
    { value: 'concluida',  label: 'Concluída — avançar para próxima aula',        emoji: '✓', color: '#16a34a', accent: '#bbf7d0' },
    { value: 'revisao',    label: 'Concluída, mas revisar — dificuldade técnica',  emoji: '↻', color: '#d97706', accent: '#fef3c7' },
    { value: 'incompleta', label: 'Incompleta — retomar algo antes de avançar',   emoji: '↩', color: '#b45309', accent: '#fde68a' },
    { value: 'nao_houve',  label: 'Não houve aula — repetir',                     emoji: '✗', color: '#64748b', accent: '#e2e8f0' },
];

// Compatibilidade com dados legados (resultadoAula + proximaAulaOpcao + statusAula:'parcial')
function inferStatusLegado(resultadoAula?: string, proximaAulaOpcao?: string, statusAulaLegado?: string): StatusAula {
    if (statusAulaLegado === 'parcial') return 'incompleta'; // migração automática legado
    if (proximaAulaOpcao === 'nova') return 'concluida';
    if (proximaAulaOpcao === 'revisar-nova') return 'revisao';
    if (proximaAulaOpcao === 'revisar') return 'incompleta';
    if (resultadoAula === 'bem' || resultadoAula === 'funcionou') return 'concluida';
    if (resultadoAula === 'parcial') return 'incompleta';
    if (resultadoAula === 'nao' || resultadoAula === 'nao_funcionou') return 'incompleta';
    return '';
}

interface StatusAulaSelectorProps {
    value: StatusAula;
    onChange: (v: StatusAula) => void;
    onDone: () => void;
    firstRef?: React.RefObject<HTMLButtonElement>;
}

function StatusAulaSelector({ value, onChange, onDone, firstRef }: StatusAulaSelectorProps) {
    const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
    return (
        <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 13 }}>📋</span>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase' as const, color: '#94a3b8' }}>Como foi a aula?</span>
                {value && (
                    <button tabIndex={-1} onClick={() => onChange('')}
                        style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>
                        limpar
                    </button>
                )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const }}>
                {STATUS_AULA_OPCOES.map((op, idx) => {
                    const sel = value === op.value;
                    return (
                        <button
                            key={op.value}
                            ref={el => { refs.current[idx] = el; if (idx === 0 && firstRef) (firstRef as React.MutableRefObject<HTMLButtonElement | null>).current = el; }}
                            tabIndex={0}
                            onClick={() => { onChange(sel ? '' : op.value); if (!sel) onDone(); }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') { e.preventDefault(); onChange(sel ? '' : op.value); if (!sel) onDone(); }
                                else if (e.key === 'Tab' && idx < STATUS_AULA_OPCOES.length - 1 && !e.shiftKey) {
                                    e.preventDefault(); refs.current[idx + 1]?.focus();
                                }
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '9px 12px',
                                background: sel ? `${op.accent}40` : '#fff',
                                color: sel ? op.color : '#64748b',
                                fontWeight: sel ? 600 : 400,
                                fontSize: 13, border: 'none',
                                borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none',
                                borderLeft: sel ? `3px solid ${op.accent}` : '3px solid transparent',
                                cursor: 'pointer', textAlign: 'left' as const,
                                width: '100%', transition: 'all .1s', outline: 'none',
                            }}
                            onFocus={e => { if (!sel) e.currentTarget.style.background = '#f8fafc'; }}
                            onBlur={e  => { if (!sel) e.currentTarget.style.background = '#fff'; }}
                            onMouseOver={e => { if (!sel) e.currentTarget.style.background = '#f8fafc'; }}
                            onMouseOut={e  => { if (!sel) e.currentTarget.style.background = '#fff'; }}
                        >
                            <span style={{ fontSize: 12, width: 16, textAlign: 'center', flexShrink: 0, color: sel ? op.color : '#94a3b8' }}>{op.emoji}</span>
                            {op.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
// ──────────────────────────────────────────────────────────────────────────────
// ── WhatsApp-style Audio Recorder (Bug 14) ──

type AudioFase = 'idle' | 'recording' | 'locked' | 'preview'

function WppAudioRecorder({
    onSave, onDelete, existingAudio, existingDuration, existingMime, isDark,
}: {
    onSave: (base64: string, duracao: number, mime: string) => void
    onDelete: () => void
    existingAudio?: string
    existingDuration?: number
    existingMime?: string
    isDark: boolean
}) {
    const [fase, setFase] = React.useState<AudioFase>(() => existingAudio ? 'preview' : 'idle')
    const [segundos, setSegundos] = React.useState(0)
    const [cancelando, setCancelando] = React.useState(false)
    const [locked, setLocked] = React.useState(false)
    const [audioB64, setAudioB64] = React.useState(existingAudio || '')
    const [audioDur, setAudioDur] = React.useState(existingDuration || 0)
    const [audioMime, setAudioMime] = React.useState(existingMime || 'audio/webm')
    const [playingAudio, setPlayingAudio] = React.useState(false)
    const [playPos, setPlayPos] = React.useState(0)
    const timerRef = React.useRef<any>(null)
    const audioRef = React.useRef<HTMLAudioElement>(null)
    const ptrStartRef = React.useRef<{ x: number; y: number; t: number } | null>(null)
    const faseRef = React.useRef(fase)
    React.useEffect(() => { faseRef.current = fase }, [fase])

    const c = dk(isDark)

    const startTimer = () => { setSegundos(0); timerRef.current = setInterval(() => setSegundos(s => s + 1), 1000) }
    const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
    const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

    const cancelRec = async () => {
        stopTimer(); setSegundos(0); setFase('idle'); setCancelando(false); setLocked(false)
        try { await stopRecording() } catch {}
    }

    const finishRec = async (dur: number) => {
        try {
            const blob = await stopRecording()
            if (blob.size < 200) { setFase('idle'); return }
            const b64 = await blobToBase64(blob)
            const mime = blob.type || 'audio/webm'
            setAudioB64(b64); setAudioDur(dur); setAudioMime(mime)
            setFase('preview')
            onSave(b64, dur, mime)
        } catch { setFase('idle') }
    }

    const handlePointerDown = async (e: React.PointerEvent<HTMLDivElement>) => {
        if (fase !== 'idle') return
        e.preventDefault()
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        ptrStartRef.current = { x: e.clientX, y: e.clientY, t: Date.now() }
        setCancelando(false); setLocked(false); setFase('recording'); startTimer()
        try { await startRecording() }
        catch { stopTimer(); setFase('idle'); alert('Microfone não disponível. Verifique as permissões do navegador.') }
    }

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (faseRef.current !== 'recording' || !ptrStartRef.current) return
        const dx = e.clientX - ptrStartRef.current.x
        const dy = e.clientY - ptrStartRef.current.y
        if (dx < -80) { setCancelando(true) } else { setCancelando(false) }
        if (dy < -60) { setLocked(true); setFase('locked') }
    }

    const handlePointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
        if (faseRef.current !== 'recording') return
        e.preventDefault()
        const elapsed = Date.now() - (ptrStartRef.current?.t ?? 0)
        ptrStartRef.current = null
        stopTimer()
        const dur = segundos
        if (cancelando || elapsed < 300) { await cancelRec(); return }
        setCancelando(false)
        await finishRec(dur)
    }

    const handleLockedStop = async () => {
        if (fase !== 'locked') return
        stopTimer(); const dur = segundos
        await finishRec(dur)
        setLocked(false)
    }

    const handleDelete = () => {
        setAudioB64(''); setAudioDur(0); setFase('idle'); setPlayingAudio(false); onDelete()
    }

    const togglePlay = () => {
        if (!audioRef.current) return
        if (playingAudio) { audioRef.current.pause(); setPlayingAudio(false) }
        else { audioRef.current.play(); setPlayingAudio(true) }
    }

    React.useEffect(() => () => stopTimer(), [])

    if (fase === 'preview' && audioB64) {
        const audioUrl = base64ToObjectUrl(audioB64, audioMime)
        const totalDur = audioDur || 1
        return (
            <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, padding: '10px 12px', background: c.cardBg, display: 'flex', alignItems: 'center', gap: 10 }}>
                <audio ref={audioRef} src={audioUrl}
                    onEnded={() => { setPlayingAudio(false); setPlayPos(0) }}
                    onTimeUpdate={() => { if (audioRef.current) setPlayPos(audioRef.current.currentTime) }}
                    style={{ display: 'none' }} />
                <button type="button" onClick={togglePlay}
                    style={{ width: 34, height: 34, borderRadius: '50%', background: '#22c55e', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: 12 }}>
                    {playingAudio ? '⏸' : '▶'}
                </button>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 18 }}>
                        {Array.from({ length: 24 }).map((_, i) => {
                            const h = 3 + Math.round(Math.abs(Math.sin(i * 1.2)) * 11)
                            const progress = playPos / totalDur
                            const filled = i / 24 < progress
                            return <div key={i} style={{ width: 3, height: h, borderRadius: 2, background: filled ? '#22c55e' : c.border, transition: 'background .1s', flexShrink: 0 }} />
                        })}
                    </div>
                    <span style={{ fontSize: 11, color: c.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                        {playingAudio && audioRef.current ? fmt(Math.round(playPos)) : fmt(audioDur)}
                    </span>
                </div>
                <button type="button" onClick={handleDelete}
                    style={{ color: c.textMuted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px', flexShrink: 0 }}>
                    🗑
                </button>
            </div>
        )
    }

    if (fase === 'recording' || fase === 'locked') {
        return (
            <div style={{ border: `1px solid ${cancelando ? '#fca5a5' : c.border}`, borderRadius: 10, padding: '10px 12px', background: cancelando ? (isDark ? '#2d1515' : '#fef2f2') : c.cardBg, display: 'flex', alignItems: 'center', gap: 10, userSelect: 'none' }}>
                <span style={{ fontSize: 13, opacity: cancelando ? 1 : 0.25, transition: 'opacity .15s', flexShrink: 0, color: '#ef4444' }}>🗑</span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                    {fase === 'locked'
                        ? <span style={{ fontSize: 12, color: c.textMed, flex: 1 }}>🔒 Gravando — toque ■ para parar</span>
                        : cancelando
                        ? <span style={{ fontSize: 12, color: '#ef4444', flex: 1 }}>Solte para cancelar ×</span>
                        : <span style={{ fontSize: 11, color: c.textMuted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            ← Deslize para cancelar · ↑ para travar
                          </span>
                    }
                    <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', color: '#ef4444', fontWeight: 600, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'micPulse 1s ease-in-out infinite' }} />
                        {fmt(segundos)}
                    </span>
                </div>
                {fase === 'locked'
                    ? <button type="button" onClick={handleLockedStop}
                        style={{ width: 40, height: 40, borderRadius: '50%', background: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ width: 12, height: 12, background: '#fff', borderRadius: 2, display: 'block' }} />
                      </button>
                    : <div onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
                        style={{ width: 40, height: 40, borderRadius: '50%', background: cancelando ? c.border : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'default' }}>
                        <span style={{ color: '#fff', fontSize: 16 }}>🎙</span>
                      </div>
                }
            </div>
        )
    }

    return (
        <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, overflow: 'hidden', background: c.cardBg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px' }}>
                <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>🎙</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: c.textMed, flex: 1 }}>
                    Nota de voz
                </span>
                <span style={{ fontSize: 11, color: c.textMuted }}>Segure para gravar</span>
                <div
                    onPointerDown={handlePointerDown}
                    style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: isDark ? '#374151' : '#f1f5f9',
                        border: `1.5px solid ${c.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', flexShrink: 0, touchAction: 'none', userSelect: 'none',
                    }}>
                    <span style={{ fontSize: 16 }}>🎙</span>
                </div>
            </div>
        </div>
    )
}

// ──────────────────────────────────────────────────────────────────────────────

export default function ModalRegistroPosAula({ inlineMode = false, onVoltar, hideHeader = false, saveLabel, verPlanoExterno }: { inlineMode?: boolean; onVoltar?: () => void; hideHeader?: boolean; saveLabel?: string; verPlanoExterno?: boolean }) {
    const isDark = useIsDark()
    const c = dk(isDark)
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
    const { estrategias } = useEstrategiasContext()
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
    // Filtro de período no histórico
    const [filtroRegPeriodo, setFiltroRegPeriodo] = React.useState<'' | 'hoje' | 'semana'>('')
    // Copiar registro para outras turmas
    const [copiandoRegId, setCopiandoRegId] = React.useState<any>(null)
    const [turmasCopiar, setTurmasCopiar] = React.useState<Set<string>>(new Set())
    const [copiarOutroDia, setCopiarOutroDia] = React.useState<string>('')
    const [novoEnc, setNovoEnc] = React.useState('')
    const [gravandoEnc, setGravandoEnc] = React.useState(false)
    const recognitionEncRef = React.useRef<any>(null)
    const [gravandoContexto, setGravandoContexto] = React.useState(false)
    const recognitionContextoRef = React.useRef<any>(null)
    const toggleVozContexto = () => {
        if (gravandoContexto) { recognitionContextoRef.current?.stop(); setGravandoContexto(false); return }
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SR) { alert('Reconhecimento de voz não disponível neste navegador. Use Chrome ou Edge.'); return }
        const rec = new SR()
        rec.lang = 'pt-BR'; rec.continuous = true; rec.interimResults = false
        const cur = (novoRegistro as any).contextoAulaDetalhe || ''
        rec.onresult = (ev: any) => {
            const t = Array.from(ev.results).slice(ev.resultIndex).map((r: any) => r[0].transcript).join(' ')
            setNovoRegistro({ ...novoRegistro, contextoAulaDetalhe: cur ? cur + ' ' + t : t } as any)
        }
        rec.onend = () => setGravandoContexto(false)
        rec.onerror = () => setGravandoContexto(false)
        recognitionContextoRef.current = rec; rec.start(); setGravandoContexto(true)
    }
    const toggleVozEnc = () => {
        if (gravandoEnc) { recognitionEncRef.current?.stop(); setGravandoEnc(false); return }
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SR) { alert('Reconhecimento de voz não disponível neste navegador. Use Chrome ou Edge.'); return }
        const rec = new SR()
        rec.lang = 'pt-BR'; rec.continuous = true; rec.interimResults = false
        rec.onresult = (ev: any) => { const t = Array.from(ev.results).slice(ev.resultIndex).map((r: any) => r[0].transcript).join(' '); setNovoEnc(t) }
        rec.onend = () => setGravandoEnc(false)
        rec.onerror = () => setGravandoEnc(false)
        recognitionEncRef.current = rec; rec.start(); setGravandoEnc(true)
    }
    const [showEstrategiasFuncionaram, setShowEstrategiasFuncionaram] = React.useState(false)
    const [buscaEstrategiaPos, setBuscaEstrategiaPos] = React.useState('')
    // ── estados de áudio (B3) ──
    const [mostrarAvancados, setMostrarAvancados] = React.useState(false)
    const [encAberto, setEncAberto] = React.useState(false)
    const [evidenciaAberta, setEvidenciaAberta] = React.useState(false)
    const [aprovAberto, setAprovAberto] = React.useState(false)
    const [checkFlash, setCheckFlash] = React.useState(false)
    const [revisaoFlash, setRevisaoFlash] = React.useState(false)
    const [uploadandoEvidencia, setUploadandoEvidencia] = React.useState(false)
    const [uploadProgresso, setUploadProgresso] = React.useState(0)
    const [uploadErro, setUploadErro] = React.useState('')
    const [driveConectado, setDriveConectado] = React.useState(() => hasValidToken() || checkRedirectToken())
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const cameraInputRef = React.useRef<HTMLInputElement>(null)
    const [contextoAberto, setContextoAberto] = React.useState(false)
    const [seletorTurma, setSeletorTurma] = React.useState(false)
    const [seletorEscola, setSeletorEscola] = React.useState(false)
    const [modoCompacto, setModoCompacto] = React.useState(false)
    const [semanaOffset, setSemanaOffset] = React.useState(0)
    const [editandoData, setEditandoData] = React.useState(false)
    const getWeekDays = (offset: number) => {
        const today = new Date()
        const dow = today.getDay()
        const monday = new Date(today)
        monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7)
        return Array.from({ length: 6 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d })
    }
    const seletorRef = React.useRef<HTMLDivElement>(null)
    React.useEffect(() => {
        if (!seletorTurma && !seletorEscola) return
        const handler = (e: MouseEvent) => {
            if (seletorRef.current && !seletorRef.current.contains(e.target as Node)) {
                setSeletorTurma(false); setSeletorEscola(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [seletorTurma, seletorEscola])
    // ── Auto-save (Bug 5) ──
    const [autoSaveStatus, setAutoSaveStatus] = React.useState<'idle' | 'saved'>('idle')
    const autoSaveTimerRef = React.useRef<any>(null)
    // Salva rascunho no localStorage após 2s de inatividade
    React.useEffect(() => {
        if (!regTurmaSel || !novoRegistro.dataAula || registroEditando) return
        const temConteudo = Object.entries(novoRegistro).some(([k, v]) => k !== 'dataAula' && v && v !== '' && v !== undefined)
        if (!temConteudo) return
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
        autoSaveTimerRef.current = setTimeout(() => {
            const key = `posAulaDraft-${regTurmaSel}-${novoRegistro.dataAula}`
            localStorage.setItem(key, JSON.stringify(novoRegistro))
            setAutoSaveStatus('saved')
            setTimeout(() => setAutoSaveStatus('idle'), 1500)
        }, 2000)
        return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current) }
    }, [novoRegistro, regTurmaSel, registroEditando]) // eslint-disable-line
    // Restaura rascunho ao selecionar turma (somente para novos registros)
    React.useEffect(() => {
        if (!regTurmaSel || !novoRegistro.dataAula || registroEditando) return
        const key = `posAulaDraft-${regTurmaSel}-${novoRegistro.dataAula}`
        const saved = localStorage.getItem(key)
        if (!saved) return
        try {
            const draft = JSON.parse(saved) as any
            const temConteudo = Object.entries(draft).some(([k, v]) => k !== 'dataAula' && v && v !== '' && v !== undefined)
            if (temConteudo) setNovoRegistro((prev: any) => ({ ...draft, dataAula: prev.dataAula }))
        } catch {}
    }, [regTurmaSel]) // eslint-disable-line

    // Opcao A — painel "O que foi planejado" (header)
    const [planejadoAberto, setPlanejadoAberto] = React.useState(false)
    React.useEffect(() => { if (verPlanoExterno !== undefined) setPlanejadoAberto(verPlanoExterno) }, [verPlanoExterno])
    // Painel inline no form (chip dentro do scroll)
    const [planejadoInlineAberto, setPlanejadoInlineAberto] = React.useState(false)
    function togglePlanejadoAberto() {
        setPlanejadoAberto(v => {
            return !v
        })
    }

    // Inicializa GIS e tenta auth silenciosa — SOMENTE quando o professor abre a seção
    // de evidências (lazy init). Não disparar no mount do modal para evitar popup Google.
    React.useEffect(() => {
        if (!evidenciaAberta || driveConectado || !isGoogleDriveConfigured() || isMobileDevice()) return
        initDriveAuth(
            import.meta.env.VITE_GOOGLE_CLIENT_ID,
            () => setDriveConectado(true),   // auth silenciosa ok → já conectado
            (msg) => setUploadErro(msg),      // erro real → mostra mensagem
            () => setDriveConectado(false)    // primeira vez → mostra botão "Conectar"
        ).catch(() => {})
    }, [evidenciaAberta]) // eslint-disable-line

    // Reset upload states when turma changes (evidência is per-turma)
    React.useEffect(() => {
        setUploadandoEvidencia(false)
        setUploadProgresso(0)
        setUploadErro('')
        setEvidenciaAberta(false)
        if (!registroEditando) {
            setNovoRegistro(prev => ({ ...prev, urlEvidencia: '' } as any))
        }
    }, [regTurmaSel]) // eslint-disable-line

    // Auto-expande campos avançados se o registro editado tiver valores neles
    React.useEffect(() => {
        if (!registroEditando) return
        const r = registroEditando as any
        if ((r.chamada?.length > 0) || (r.rubrica?.some((x: any) => x.valor > 0)) ||
            r.urlEvidencia || r.comportamento || r.audioNotaDeVoz ||
            r.alunoAtencao || r.surpresaMusical || r.pontoQueda || r.vozAluno) {
            setMostrarAvancados(true)
        }
    }, [registroEditando]) // eslint-disable-line

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

    // Centraliza ao abrir (só no modo flutuante)
    React.useEffect(() => {
        if (inlineMode) return
        if (modalRegistro && pos === null) {
            setPos({ x: Math.max(0, Math.round(window.innerWidth / 2 - 256)), y: Math.max(0, Math.round(window.innerHeight / 2 - 300)) })
        }
        if (!modalRegistro) { setPos(null); setMinimizado(false); setMaximizado(false) }
    }, [modalRegistro]) // eslint-disable-line

    // ── Pré-seleção de turma ao abrir ──
    React.useEffect(() => {
        if ((!inlineMode && !modalRegistro) || !planoParaRegistro || anosLetivos.length === 0) return
        // Bug 3: inline mode com turma já definida externamente — não re-inferir
        if (inlineMode && regTurmaSel) return
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
    }, [modalRegistro, inlineMode ? planoParaRegistro : null]) // eslint-disable-line

    // ── ARRASTAR pelo header ──
    const dragRef = React.useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)
    const chipOpenRefs = React.useRef<Array<(() => void) | null>>([])
    const salvarBtnRef = React.useRef<HTMLButtonElement>(null)
    const statusAulaFirstRef = React.useRef<HTMLButtonElement>(null)

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

    if (!planoParaRegistro) return null
    if (!inlineMode && !modalRegistro) return null

    const isMobile = !inlineMode && typeof window !== 'undefined' && window.innerWidth < 640
    const modalStyle: React.CSSProperties = inlineMode
        ? { width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }
        : (maximizado || isMobile)
        ? { position: 'fixed', inset: 0, width: '100vw', height: '100dvh', borderRadius: 0, zIndex: 50, display: 'flex', flexDirection: 'column' }
        : minimizado
        ? { position: 'fixed', bottom: 16, right: 16, width: 300, zIndex: 50, borderRadius: 16 }
        : { position: 'fixed', left: pos?.x ?? Math.round(window.innerWidth / 2 - 256), top: pos?.y ?? Math.round(window.innerHeight / 2 - 300), width: size.w, height: size.h, zIndex: 50, borderRadius: 16, display: 'flex', flexDirection: 'column' }

    // ── Campos de anotação ──
    const camposConfig = [
        { id: 'reg-aprenderam', icon: '🎯', label: 'O que os alunos demonstraram aprender?',  field: 'funcionouBem', placeholder: 'Ex: 3 alunos tocaram a cadência completa sem parar. A turma manteve o pulso estável por 2 compassos pela primeira vez...' },
        { id: 'reg-repetiria',  icon: '⭐', label: 'O que funcionou e você faria de novo?',   field: 'repetiria',    placeholder: 'Ex: A demonstração tocada antes de explicar — os alunos entenderam muito mais rápido. Repetiria sempre que introduzir técnica nova...' },
        { id: 'reg-mudar',      icon: '💭', label: 'O que faria diferente?',                   field: 'naoFuncionou', placeholder: 'Se você pudesse dar esta aula de novo sabendo o que sabe agora — o que faria diferente?' },
    ] as const

    return (
        <>
            {!inlineMode && !minimizado && !maximizado && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 49 }} onClick={() => setModalRegistro(false)} />
            )}

            <div className="bg-white dark:bg-[#1F2937] overflow-hidden" style={{ ...modalStyle, ...(inlineMode ? {} : { boxShadow: '0 25px 50px -12px rgba(0,0,0,.25)' }) }}>

                {!inlineMode && !maximizado && !minimizado && RESIZE_HANDLES.map(({ dir, style }) => (
                    <div key={dir} style={{ position: 'absolute', zIndex: 20, ...style }} onMouseDown={e => onResizeMouseDown(e, dir)} />
                ))}

                {/* ── HEADER ── */}
                {inlineMode && hideHeader ? null : inlineMode ? (
                    // Header inline — limpo, sem gradient, com botão Voltar
                    <div className="px-4 py-3 border-b border-[#E6EAF0] dark:border-[#374151] flex items-center gap-3 shrink-0 bg-white dark:bg-[#1F2937]">
                        <button
                            onClick={onVoltar ?? (() => setModalRegistro(false))}
                            className="text-[13px] text-slate-400 dark:text-[#6b7280] hover:text-slate-600 dark:hover:text-[#9CA3AF] transition shrink-0">
                            ← Voltar
                        </button>
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-[#E5E7EB] truncate flex-1">
                            {planoParaRegistro.titulo || 'Registro Pós-Aula'}
                        </span>
                    </div>
                ) : (
                    // Header original — gradient + drag + min/max/fechar
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
                                        onMouseOver={e => (e.currentTarget.style.background = (btn as any).danger ? 'rgba(239,68,68,.35)' : 'rgba(255,255,255,.22)')}
                                        onMouseOut={e  => (e.currentTarget.style.background = btn.active ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.1)')}
                                    >{btn.label}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── CONTEÚDO ── */}
                {!minimizado && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                        {/* Painel planejado — abre via ícone no header */}
                        {planejadoAberto && planoParaRegistro && (() => {
                            const stripHtml = (s: string) => s.replace(/<[^>]+>/g, '').trim()
                            const roteiro: any[] = (planoParaRegistro as any).atividadesRoteiro || []
                            const objetivo = stripHtml((planoParaRegistro as any).objetivoGeral || '')
                            const criterio = stripHtml((planoParaRegistro as any).avaliacaoEvidencia || '')
                            const temConteudo = objetivo || roteiro.length > 0 || criterio
                            return (
                                <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, position: 'relative', maxHeight: 220, overflowY: 'auto' }}>
                                    <button onClick={() => setPlanejadoAberto(false)} title="Fechar" style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#94a3b8', lineHeight: 1, padding: 2 }}
                                        onMouseOver={e => (e.currentTarget.style.color = '#475569')}
                                        onMouseOut={e  => (e.currentTarget.style.color = '#94a3b8')}>✕</button>
                                    {!temConteudo && (
                                        <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Plano de aula não registrado.</p>
                                    )}
                                    {objetivo && (
                                        <div>
                                            <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 2 }}>Objetivo</p>
                                            <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>{objetivo}</p>
                                        </div>
                                    )}
                                    {roteiro.length > 0 && (
                                        <div>
                                            <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>Roteiro</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                {roteiro.map((at: any, i: number) => (
                                                    <div key={at.id ?? i} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                                        <span style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 700, flexShrink: 0, minWidth: 14, textAlign: 'right' as const }}>{i + 1}.</span>
                                                        <span style={{ fontSize: 12, color: '#475569', flex: 1 }}>{at.nome}</span>
                                                        {at.duracao ? <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>{String(at.duracao).replace(/min$/i, '')}min</span> : null}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {criterio && (
                                        <div>
                                            <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 2 }}>Critério de sucesso</p>
                                            <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.4, fontStyle: 'italic' }}>{criterio}</p>
                                        </div>
                                    )}
                                </div>
                            )
                        })()}

                        {/* Tabs */}

                        {/* Body */}
                        <div className="p-4 space-y-3" style={{ flex: 1, overflowY: 'auto' }}>

                            {/* ════════════════════════════════
                                NOVO REGISTRO
                                ════════════════════════════════ */}
                            {/* Ver plano — discreto, canto superior direito, só em inlineMode */}
                            {inlineMode && !verRegistros && planoParaRegistro && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: -4 }}>
                                    <button type="button" onClick={() => setPlanejadoAberto(v => !v)}
                                        style={{ fontSize: 11, color: planejadoAberto ? '#6366f1' : '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                                        ver plano
                                    </button>
                                </div>
                            )}

                            {!verRegistros ? (
                                <>

                                    {/* Turma + Data — linha compacta (sempre visível quando turma selecionada) */}
                                    {(regTurmaSel || modoCompacto) ? (
                                        <div ref={seletorRef} style={{ position: 'relative' }}>
                                            {!inlineMode && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                                                {(() => {
                                                    const ano = anosLetivos.find(a => a.id == regAnoSel)
                                                    const esc = ano?.escolas.find(e => e.id == regEscolaSel)
                                                    const seg = esc?.segmentos.find(s => s.id == regSegmentoSel)
                                                    const tur = seg?.turmas.find(t => t.id == regTurmaSel)
                                                    const [y, m, d] = (novoRegistro.dataAula || '').split('-')
                                                    const dataFmt = d && m && y ? `${d}/${m}/${y}` : novoRegistro.dataAula
                                                    return (
                                                        <span style={{ fontSize: 13, flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 0 }}>
                                                                            {/* Turma */}
                                                            {inlineMode ? (
                                                                <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', lineHeight: 1 }}>{tur?.nome || 'Turma'}</span>
                                                            ) : (
                                                                <button type="button" onClick={() => { setSeletorTurma(v => !v); setSeletorEscola(false) }}
                                                                    style={{ fontWeight: 700, fontSize: 13, color: seletorTurma ? '#6366f1' : '#1e293b', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6366f1' }}
                                                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = seletorTurma ? '#6366f1' : '#1e293b' }}>
                                                                    {tur?.nome || 'Turma'}
                                                                    <span style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1 }}>▾</span>
                                                                </button>
                                                            )}
                                                            {esc && <>
                                                                <span style={{ fontSize: 12, color: '#cbd5e1', margin: '0 4px' }}>·</span>
                                                                {/* Escola */}
                                                                {inlineMode ? (
                                                                    <span style={{ fontWeight: 400, fontSize: 12, color: '#94a3b8', lineHeight: 1 }}>{esc.nome}</span>
                                                                ) : (
                                                                    <button type="button" onClick={() => { setSeletorEscola(v => !v); setSeletorTurma(false) }}
                                                                        style={{ fontWeight: 400, fontSize: 12, color: seletorEscola ? '#6366f1' : '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6366f1' }}
                                                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = seletorEscola ? '#6366f1' : '#94a3b8' }}>
                                                                        {esc.nome}
                                                                        <span style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1 }}>▾</span>
                                                                    </button>
                                                                )}
                                                            </>}
                                                            <span style={{ fontSize: 12, color: '#cbd5e1', margin: '0 4px' }}>·</span>
                                                            {/* Data */}
                                                            {(() => {
                                                                const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
                                                                const d = novoRegistro.dataAula ? new Date(novoRegistro.dataAula + 'T12:00') : null
                                                                const label = d ? `${dias[d.getDay()]}, ${dataFmt}` : dataFmt
                                                                return inlineMode ? (
                                                                    <span style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1 }}>{label}</span>
                                                                ) : (
                                                                    <button type="button" onClick={() => setEditandoData(v => !v)}
                                                                        style={{ fontSize: 12, color: editandoData ? '#6366f1' : '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6366f1' }}
                                                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = editandoData ? '#6366f1' : '#94a3b8' }}>
                                                                        {label}
                                                                        <span style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1 }}>▾</span>
                                                                    </button>
                                                                )
                                                            })()}
                                                        </span>
                                                    )
                                                })()}
                                                {planoParaRegistro && (
                                                    <button type="button" onClick={() => setPlanejadoAberto(v => !v)}
                                                        style={{ fontSize: 12, fontWeight: 500, color: planejadoAberto ? '#6366f1' : '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', flexShrink: 0, lineHeight: 1 }}>
                                                        Ver plano
                                                    </button>
                                                )}
                                                {registroEditando && (
                                                    <button type="button"
                                                        onClick={() => { setRegistroEditando(null); setNovoRegistro({ dataAula: new Date().toISOString().split('T')[0], resumoAula: '', funcionouBem: '', naoFuncionou: '', poderiaMelhorar: '', proximaAula: '', comportamento: '', anotacoesGerais: '', urlEvidencia: '', statusAula: undefined }); setRegEscolaSel(''); setRegTurmaSel('') }}
                                                        style={{ fontSize: 10, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', flexShrink: 0 }}
                                                        onMouseOver={e => (e.currentTarget.style.color = '#ef4444')}
                                                        onMouseOut={e  => (e.currentTarget.style.color = '#94a3b8')}
                                                        title="Cancelar edição">✕</button>
                                                )}
                                            </div>}

                                            {/* Faixa de dias da semana — abre ao clicar na data */}
                                            {editandoData && (() => {
                                                const days = getWeekDays(semanaOffset)
                                                const todayStr = new Date().toISOString().split('T')[0]
                                                const nomes = ['Seg','Ter','Qua','Qui','Sex','Sáb']
                                                return (
                                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '8px 10px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <button type="button" onClick={() => setSemanaOffset(v => v - 1)}
                                                                style={{ fontSize: 13, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', lineHeight: 1, flexShrink: 0 }}>‹</button>
                                                            <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                                                                {days.map((d, i) => {
                                                                    const iso = d.toISOString().split('T')[0]
                                                                    const isSelected = novoRegistro.dataAula === iso
                                                                    const isToday = iso === todayStr
                                                                    return (
                                                                        <button key={iso} type="button" onClick={() => { setNovoRegistro(r => ({ ...r, dataAula: iso })); setEditandoData(false) }}
                                                                            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5px 2px', borderRadius: 8, border: isSelected ? '1.5px solid #1e2a4a' : isToday ? '1.5px solid #6366f1' : '1px solid #e2e8f0', background: isSelected ? '#1e2a4a' : '#fff', cursor: 'pointer', transition: 'all .12s' }}>
                                                                            <span style={{ fontSize: 9, fontWeight: 600, color: isSelected ? '#93c5fd' : isToday ? '#6366f1' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '.04em' }}>{nomes[i]}</span>
                                                                            <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#fff' : isToday ? '#6366f1' : '#475569', marginTop: 2 }}>{d.getDate()}</span>
                                                                        </button>
                                                                    )
                                                                })}
                                                            </div>
                                                            <button type="button" onClick={() => setSemanaOffset(v => v + 1)}
                                                                style={{ fontSize: 13, color: semanaOffset >= 0 ? '#cbd5e1' : '#94a3b8', background: 'none', border: 'none', cursor: semanaOffset >= 0 ? 'default' : 'pointer', padding: '2px 4px', lineHeight: 1, flexShrink: 0 }}
                                                                disabled={semanaOffset >= 0}>›</button>
                                                        </div>
                                                    </div>
                                                )
                                            })()}

                                            {/* Popover — só turmas */}
                                            {seletorTurma && (() => {
                                                const ano = anosLetivos.find(a => a.id == regAnoSel)
                                                const esc = ano?.escolas.find(e => e.id == regEscolaSel)
                                                const segs = esc?.segmentos || []
                                                return (
                                                    <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.12)', padding: '12px', zIndex: 50, minWidth: 180 }}>
                                                        <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Turma</p>
                                                        {segs.filter(s => s.turmas.length > 0).map((s, si) => (
                                                            <div key={s.id}>
                                                                {segs.filter(s2 => s2.turmas.length > 0).length > 1 && (
                                                                    <p style={{ fontSize: 10, color: '#cbd5e1', marginBottom: 4, marginTop: si > 0 ? 8 : 0 }}>{s.nome}</p>
                                                                )}
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                                    {s.turmas.map(t => (
                                                                        <button key={t.id} type="button"
                                                                            onClick={() => { setRegSegmentoSel(s.id); setRegTurmaSel(t.id); setSeletorTurma(false); setModoCompacto(true) }}
                                                                            style={{ fontSize: 13, fontWeight: regTurmaSel == t.id ? 700 : 500, padding: '6px 13px', borderRadius: 8, border: regTurmaSel == t.id ? '1.5px solid #1e2a4a' : '1px solid #e2e8f0', background: regTurmaSel == t.id ? '#1e2a4a' : '#f8fafc', color: regTurmaSel == t.id ? '#fff' : '#475569', cursor: 'pointer', transition: 'all .12s' }}>
                                                                            {t.nome}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {segs.every(s => s.turmas.length === 0) && <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma turma cadastrada.</p>}
                                                    </div>
                                                )
                                            })()}
                                            {/* Popover — só escolas */}
                                            {seletorEscola && (() => {
                                                const ano = anosLetivos.find(a => a.id == regAnoSel)
                                                const escolas = ano?.escolas || []
                                                return (
                                                    <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.12)', padding: '12px', zIndex: 50, minWidth: 180 }}>
                                                        <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Escola</p>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                            {escolas.map(e => (
                                                                <button key={e.id} type="button"
                                                                    onClick={() => { setRegEscolaSel(e.id); setRegSegmentoSel(''); setRegTurmaSel(''); setSeletorEscola(false); setSeletorTurma(true) }}
                                                                    style={{ fontSize: 12, fontWeight: regEscolaSel == e.id ? 700 : 500, padding: '6px 13px', borderRadius: 8, border: regEscolaSel == e.id ? '1.5px solid #1e2a4a' : '1px solid #e2e8f0', background: regEscolaSel == e.id ? '#1e2a4a' : '#f8fafc', color: regEscolaSel == e.id ? '#fff' : '#475569', cursor: 'pointer', transition: 'all .12s' }}>
                                                                    {e.nome}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    ) : (
                                        /* Seleção inicial — nenhuma turma escolhida ainda */
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
                                                            <button key={t.id} type="button" onClick={() => { const next = t.id == regTurmaSel ? '' : t.id; setRegTurmaSel(next); if (next) setModoCompacto(true) }}
                                                                style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: regTurmaSel == t.id ? 700 : 500, background: regTurmaSel == t.id ? '#475569' : '#f8fafc', color: regTurmaSel == t.id ? '#fff' : '#64748b', border: regTurmaSel == t.id ? '1px solid #475569' : '1px solid #e2e8f0', transition: 'all .15s' }}>
                                                                {t.nome}
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : <p className="text-xs text-slate-400 italic">Nenhuma turma cadastrada.</p>
                                            })()}
                                            {!regAnoSel && <p className="text-xs text-slate-400">Cadastre anos letivos, escolas e turmas em <strong>🏫 Turmas</strong>.</p>}
                                            <div className="flex items-center gap-2 pt-1" style={{ borderTop: '1px solid #f1f5f9', marginTop: 4 }}>
                                                <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', flex: 1 }}>Data da aula</span>
                                                {inlineMode ? (
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                                                        {novoRegistro.dataAula ? new Date(novoRegistro.dataAula + 'T12:00').toLocaleDateString('pt-BR') : '—'}
                                                    </span>
                                                ) : (
                                                    <input type="date" value={novoRegistro.dataAula} onChange={e => setNovoRegistro({ ...novoRegistro, dataAula: e.target.value })}
                                                        className="bg-transparent outline-none border-none text-right" style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }} />
                                                )}
                                            </div>
                                        </div>
                                    )}

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

                                    {/* 📌 Nota de adaptação da turma */}
                                    {regTurmaSel && planoParaRegistro?.notasAdaptacao && (() => {
                                        const nota = planoParaRegistro.notasAdaptacao!.find(
                                            n => String(n.turmaId) === String(regTurmaSel)
                                        )
                                        if (!nota) return null
                                        return (
                                            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '10px 12px' }}>
                                                <p className="text-[11px] font-bold text-amber-700 mb-1 uppercase tracking-wide">📌 Planejado para esta turma</p>
                                                <p className="text-xs text-amber-900 whitespace-pre-wrap leading-relaxed">{nota.texto}</p>
                                            </div>
                                        )
                                    })()}


{/* Chips de anotação */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {camposConfig.map(({ id, icon, label, field, placeholder }, idx) => {
                                            const valor = (novoRegistro as any)[field] || ''
                                            // Campo 1 abre sempre; campo 2 só abre se já tem conteúdo
                                            const deveAbrir = idx === 0 ? (!registroEditando || valor.trim().length > 0) : valor.trim().length > 0
                                            return (
                                                <AccordionChip key={id} id={id} icon={icon} label={label} placeholder={placeholder}
                                                    value={valor} filled={valor.trim().length > 0}
                                                    defaultOpen={deveAbrir}
                                                    allowVoice isDark={isDark}
                                                    onChange={v => setNovoRegistro({ ...novoRegistro, [field]: v })}
                                                    onTabNext={() => { const next = chipOpenRefs.current[idx + 1]; if (next) next(); else salvarBtnRef.current?.focus() }}
                                                    ref={(fn: (() => void) | null) => { chipOpenRefs.current[idx] = fn }}
                                                />
                                            )
                                        })}
                                    </div>

                                    {/* ── Nota de voz (WhatsApp-style) ── */}
                                    <WppAudioRecorder
                                        isDark={isDark}
                                        existingAudio={(novoRegistro as any).audioNotaDeVoz}
                                        existingDuration={(novoRegistro as any).audioDuracao}
                                        existingMime={(novoRegistro as any).audioMime}
                                        onSave={(b64: string, dur: number, mime: string) => setNovoRegistro({ ...novoRegistro, audioNotaDeVoz: b64, audioDuracao: dur, audioMime: mime } as any)}
                                        onDelete={() => setNovoRegistro({ ...novoRegistro, audioNotaDeVoz: undefined, audioDuracao: 0 } as any)}
                                    />

                                    {/* Como foi a aula? — seletor estilo lista */}
                                    {(() => {
                                        const statusVal = ((novoRegistro as any).statusAula || inferStatusLegado((novoRegistro as any).resultadoAula, (novoRegistro as any).proximaAulaOpcao, (novoRegistro as any).statusAula)) as StatusAula
                                        const ops: { value: StatusAula; label: string; emoji: string }[] = [
                                            { value: 'concluida',  label: 'Avançar — novo conteúdo na próxima',    emoji: '✓' },
                                            { value: 'incompleta', label: 'Retomar de onde parei',                 emoji: '↩' },
                                            { value: 'revisao',    label: 'Revisar — reforçar conteúdo desta aula', emoji: '↻' },
                                        ]
                                        return (
                                            <div style={{ border: `1.5px solid ${c.border}`, borderRadius: 10, overflow: 'hidden', background: c.cardBgSolid }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: c.cardBg, borderBottom: `1px solid ${c.borderLight}` }}>
                                                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase' as const, color: c.textMuted, flex: 1 }}>E agora?</span>
                                                    {statusVal && (
                                                        <button tabIndex={-1} onClick={() => setNovoRegistro({ ...novoRegistro, statusAula: undefined } as any)}
                                                            style={{ fontSize: 10, color: c.textMuted, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>
                                                            limpar
                                                        </button>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' as const }}>
                                                    {ops.map((op, idx) => {
                                                        const sel = statusVal === op.value
                                                        const isConcluida = op.value === 'concluida'
                                                        const isIncompleta = op.value === 'incompleta'
                                                        const isRevisao = op.value === 'revisao'
                                                        const revisaoColor = isDark ? '#908e50' : '#8a8418'
                                                        const incompletaColor = isDark ? '#7ea0c9' : '#3b7dc2'
                                                        const selColor = isConcluida ? '#6aab8a' : isIncompleta ? incompletaColor : isRevisao ? revisaoColor : c.textMain
                                                        return (
                                                            <button key={op.value} type="button"
                                                                onClick={() => {
                                                                    setNovoRegistro({ ...novoRegistro, statusAula: sel ? undefined : op.value } as any)
                                                                    if (isConcluida && !sel) { setCheckFlash(true); setTimeout(() => setCheckFlash(false), 900) }
                                                                    if (isRevisao && !sel) { setRevisaoFlash(true); setTimeout(() => setRevisaoFlash(false), 900) }
                                                                }}
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                                    padding: '9px 12px',
                                                                    background: sel ? c.cardBgAlt : c.cardBgSolid,
                                                                    color: sel ? selColor : c.textMed,
                                                                    fontWeight: sel ? 600 : 400,
                                                                    fontSize: 13, border: 'none',
                                                                    borderTop: idx > 0 ? `1px solid ${c.borderLight}` : 'none',
                                                                    borderLeft: sel ? `3px solid ${selColor}` : '3px solid transparent',
                                                                    cursor: 'pointer', textAlign: 'left' as const,
                                                                    width: '100%', transition: 'all .1s', outline: 'none',
                                                                }}
                                                                onMouseOver={e => { if (!sel) e.currentTarget.style.background = c.cardBg }}
                                                                onMouseOut={e  => { if (!sel) e.currentTarget.style.background = c.cardBgSolid }}
                                                            >
                                                                <span style={{ fontSize: 11, width: 16, textAlign: 'center' as const, flexShrink: 0, color: sel ? selColor : c.textMuted }}>
                                                                    {isConcluida && checkFlash
                                                                        ? <span className="check-pop" style={{ display: 'inline-block' }}>✓</span>
                                                                        : isRevisao && revisaoFlash
                                                                            ? <span className="spin-pop" style={{ display: 'inline-block' }}>↻</span>
                                                                            : op.emoji}
                                                                </span>
                                                                {op.label}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })()}

                                    {/* ── Para a próxima aula (encaminhamentos — colapsável) ── */}
                                    {(() => {
                                        const encaminhamentos: { id: string; texto: string; concluido: boolean }[] = (novoRegistro as any).encaminhamentos || []
                                        const isRevisao = (novoRegistro as any).statusAula === 'revisao'
                                        const aberto = encAberto || isRevisao
                                        const addEnc = () => {
                                            const txt = novoEnc.trim()
                                            if (!txt) return
                                            const novo = [...encaminhamentos, { id: String(Date.now()), texto: txt, concluido: false }]
                                            setNovoRegistro({ ...novoRegistro, encaminhamentos: novo } as any)
                                            setNovoEnc('')
                                        }
                                        return (
                                            <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, overflow: 'hidden', background: c.cardBg }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', cursor: 'pointer' }}
                                                    onClick={() => setEncAberto(v => !v)}>
                                                    <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>📌</span>
                                                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: encaminhamentos.length > 0 ? c.textMain : c.textMed, flex: 1 }}>
                                                        {isRevisao ? 'O que fazer na próxima aula?' : 'Algum lembrete para a próxima aula?'}
                                                    </span>
                                                    {encaminhamentos.length > 0 && (
                                                        <span style={{ fontSize: 10, color: '#6366f1', fontWeight: 700, background: '#eef2ff', padding: '1px 8px', borderRadius: 99, border: '1px solid #c7d2fe', flexShrink: 0 }}>
                                                            {encaminhamentos.length}
                                                        </span>
                                                    )}
                                                    <button type="button" onClick={e => { e.stopPropagation(); toggleVozEnc() }} title={gravandoEnc ? 'Parar gravação' : 'Gravar por voz'}
                                                        style={{ fontSize: 13, background: gravandoEnc ? '#fee2e2' : 'transparent', border: gravandoEnc ? '1px solid #fca5a5' : '1px solid transparent', borderRadius: 6, cursor: 'pointer', padding: '2px 5px', flexShrink: 0, color: gravandoEnc ? '#ef4444' : c.textMuted, outline: 'none' }}>
                                                        {gravandoEnc ? '⏹' : '🎙'}
                                                    </button>
                                                    <span style={{ fontSize: 10, color: c.textMuted, transition: 'transform .15s', display: 'inline-block', transform: aberto ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>▼</span>
                                                </div>
                                                {aberto && (
                                                    <div style={{ padding: '0 12px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                        {encaminhamentos.map((enc, idx) => (
                                                            <div key={enc.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <span style={{ color: '#94a3b8', fontSize: 14, flexShrink: 0, lineHeight: 1 }}>·</span>
                                                                <span style={{ fontSize: 12, color: c.textMain, flex: 1 }}>{enc.texto}</span>
                                                                <button type="button" onClick={() => {
                                                                    const nova = encaminhamentos.filter((_, i) => i !== idx)
                                                                    setNovoRegistro({ ...novoRegistro, encaminhamentos: nova } as any)
                                                                }} style={{ color: '#cbd5e1', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: '0 2px', flexShrink: 0 }}>✕</button>
                                                            </div>
                                                        ))}
                                                        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                                                            <input type="text" value={novoEnc} onChange={e => setNovoEnc(e.target.value)}
                                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEnc() } }}
                                                                placeholder="O que fazer na próxima aula... (Enter para adicionar)"
                                                                style={{ flex: 1, minWidth: 0, padding: '7px 10px', border: `1px solid ${c.border}`, borderRadius: 8, fontSize: 12, color: c.textMain, background: c.inputBg, fontFamily: 'inherit', outline: 'none' }}
                                                                onFocus={e => (e.target.style.borderColor = '#94a3b8')}
                                                                onBlur={e => (e.target.style.borderColor = c.border)}
                                                            />
                                                            <button type="button" onClick={addEnc} disabled={!novoEnc.trim()}
                                                                style={{ padding: '7px 12px', background: novoEnc.trim() ? '#6366f1' : c.border, color: novoEnc.trim() ? '#fff' : c.textMuted, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: novoEnc.trim() ? 'pointer' : 'default', transition: 'all .15s', flexShrink: 0 }}>
                                                                + Add
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })()}

                                    {/* ── Campos avançados ── */}
                                    <button type="button" onClick={() => setMostrarAvancados(m => !m)}
                                        style={{
                                            width: '100%', padding: '8px 12px', background: mostrarAvancados ? c.cardBgAlt : c.cardBg,
                                            border: `1px dashed ${c.border}`, borderRadius: 10, fontSize: 11, fontWeight: 700,
                                            color: c.textMed, cursor: 'pointer', textAlign: 'center', letterSpacing: '.06em',
                                            textTransform: 'uppercase', transition: 'all .15s',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                        }}>
                                        <span style={{ transition: 'transform .2s', display: 'inline-block', transform: mostrarAvancados ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                                        {mostrarAvancados ? 'Ocultar' : 'Aprofundar (opcional)'}
                                    </button>
                                    {mostrarAvancados && (
                                        <div className="space-y-3">

                                            {/* ── 1. Aproveitamento da aula ── */}
                                            {(() => {
                                                const LABELS = ['Ruim', 'Razoável', 'Boa', 'Excelente']
                                                const val: number = (novoRegistro as any).aproveitamentoAula ?? 0
                                                const setVal = (n: number) => setNovoRegistro({ ...novoRegistro, aproveitamentoAula: val === n ? 0 : n } as any)
                                                const aberto = aprovAberto || val > 0
                                                return (
                                                    <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, overflow: 'hidden', background: c.cardBg }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', cursor: 'pointer' }}
                                                            onClick={() => setAprovAberto(v => !v)}>
                                                            <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>📊</span>
                                                            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: val > 0 ? c.textMain : c.textMed, flex: 1 }}>
                                                                Aproveitamento da aula
                                                            </span>
                                                            {val > 0 && <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, background: '#f0fdf4', padding: '1px 6px', borderRadius: 99, border: '1px solid #bbf7d0', flexShrink: 0 }}>✓</span>}
                                                            <span style={{ fontSize: 10, color: c.textMuted, transition: 'transform .15s', display: 'inline-block', transform: aberto ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>▼</span>
                                                        </div>
                                                        {aberto && (
                                                            <div style={{ padding: '4px 12px 12px' }}>
                                                                <div style={{ display: 'flex', gap: 6 }}>
                                                                    {LABELS.map((label, i) => {
                                                                        const n = i + 1
                                                                        const ativo = val === n
                                                                        return (
                                                                            <button key={n} type="button" onClick={() => setVal(n)}
                                                                                style={{
                                                                                    flex: 1, padding: '10px 6px', borderRadius: 8, cursor: 'pointer',
                                                                                    transition: 'all .15s', fontSize: 12, fontWeight: 700,
                                                                                    background: ativo ? '#1e2a4a' : c.inputBg,
                                                                                    color: ativo ? '#fff' : c.textMuted,
                                                                                    border: `2px solid ${ativo ? '#1e2a4a' : c.border}`,
                                                                                    outline: 'none',
                                                                                }}
                                                                                onMouseEnter={e => { if (!ativo) { (e.currentTarget as HTMLButtonElement).style.borderColor = '#94a3b8'; (e.currentTarget as HTMLButtonElement).style.color = c.textMed } }}
                                                                                onMouseLeave={e => { if (!ativo) { (e.currentTarget as HTMLButtonElement).style.borderColor = c.border; (e.currentTarget as HTMLButtonElement).style.color = c.textMuted } }}>
                                                                                {label}
                                                                            </button>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })()}

                                            {/* ── 2. Como estava a turma hoje — contexto ── */}
                                            <BehaviorChip
                                                value={(novoRegistro as any).comportamento || ''}
                                                filled={!!((novoRegistro as any).comportamento?.trim())}
                                                onChange={v => setNovoRegistro({ ...novoRegistro, comportamento: v })}
                                                onTabNext={() => {}}
                                                isDark={isDark}
                                                ref={(fn: (() => void) | null) => { chipOpenRefs.current[camposConfig.length] = fn }}
                                            />

                                            {/* ── 3. Como a aula aconteceu na prática — narrativo ── */}
                                            <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, overflow: 'hidden', background: c.cardBg }}>
                                                <div onClick={() => setContextoAberto(o => !o)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', cursor: 'pointer' }}>
                                                    <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>🗓</span>
                                                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: (novoRegistro as any).contextoAula ? c.textMain : c.textMed, flex: 1 }}>
                                                        Como a aula aconteceu na prática?
                                                    </span>
                                                    {(novoRegistro as any).contextoAula && <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, background: '#f0fdf4', padding: '1px 6px', borderRadius: 99, border: '1px solid #bbf7d0', flexShrink: 0 }}>✓</span>}
                                                    <span style={{ fontSize: 9, color: c.textMuted, flexShrink: 0, marginLeft: 4, transform: contextoAberto ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s', display: 'inline-block' }}>▼</span>
                                                </div>
                                                {contextoAberto && (
                                                    <div style={{ padding: '0 12px 10px' }}>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                                            {(['Seguiu o plano', 'Pequenas adaptações', 'Mudou bastante'] as const).map(op => {
                                                                const ativo = (novoRegistro as any).contextoAula === op
                                                                return (
                                                                    <button key={op} type="button"
                                                                        onClick={() => setNovoRegistro({ ...novoRegistro, contextoAula: ativo ? '' : op } as any)}
                                                                        style={{ fontSize: 12, padding: '5px 10px', borderRadius: 20, border: '1px solid', cursor: 'pointer', transition: 'all .15s',
                                                                            background: ativo ? '#1e293b' : c.inputBg,
                                                                            borderColor: ativo ? '#1e293b' : c.border,
                                                                            color: ativo ? '#fff' : c.textMed,
                                                                            fontWeight: ativo ? 600 : 400 }}>
                                                                        {op}
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                        <div style={{ position: 'relative' }}>
                                                            <textarea
                                                                value={(novoRegistro as any).contextoAulaDetalhe || ''}
                                                                onChange={e => setNovoRegistro({ ...novoRegistro, contextoAulaDetalhe: e.target.value } as any)}
                                                                rows={2} placeholder="Detalhe o que aconteceu... (opcional)"
                                                                style={{ width: '100%', padding: '8px 36px 8px 10px', border: `1px solid ${c.border}`, borderRadius: 8, fontSize: 12, color: c.textMain, resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', background: c.inputBg }}
                                                                onFocus={e => (e.target.style.borderColor = '#94a3b8')}
                                                                onBlur={e  => (e.target.style.borderColor = c.border)}
                                                            />
                                                            <button type="button" onClick={toggleVozContexto} title={gravandoContexto ? 'Parar' : 'Gravar por voz'}
                                                                style={{ position: 'absolute', right: 6, top: 6, fontSize: 13, background: gravandoContexto ? '#fee2e2' : 'transparent', border: gravandoContexto ? '1px solid #fca5a5' : '1px solid transparent', borderRadius: 6, cursor: 'pointer', padding: '2px 5px', color: gravandoContexto ? '#ef4444' : '#94a3b8', outline: 'none' }}>
                                                                {gravandoContexto ? '⏹' : '🎙'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ── 5–7. Análise e diagnóstico — ordem: surpresa → queda → atenção ── */}
                                            {[
                                                { id: 'av-surpresa',  icon: '🎵', label: 'O que os alunos fizeram musicalmente que não esperava?', field: 'surpresaMusical', placeholder: 'Ex: Joana improvisou uma variação espontânea — vale explorar na próxima aula...' },
                                                { id: 'av-queda',     icon: '📉', label: 'Em que ponto o engajamento caiu?',             field: 'pontoQueda',      placeholder: 'Ex: Na explicação teórica após o aquecimento — a atividade prática antes funcionou melhor...' },
                                                { id: 'av-atencao',   icon: '👤', label: 'Qual aluno merece atenção especial na próxima aula?',      field: 'alunoAtencao',    placeholder: 'Ex: João ainda trava na troca G→D — dar atenção individual na próxima aula...' },
                                            ].map(({ id, icon, label, field, placeholder }) => {
                                                const valor = (novoRegistro as any)[field] || ''
                                                return (
                                                    <AccordionChip key={id} id={id} icon={icon} label={label} placeholder={placeholder}
                                                        value={valor} filled={valor.trim().length > 0} allowVoice isDark={isDark}
                                                        onChange={v => setNovoRegistro({ ...novoRegistro, [field]: v } as any)} />
                                                )
                                            })}

                                            {/* ── 8. Chamada rápida ── */}
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
                                                    <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, overflow: 'hidden', background: c.cardBg }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px' }}>
                                                            <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>✋</span>
                                                            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: c.textMed, flex: 1 }}>
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
                                                                                background: estado === true ? '#22c55e' : c.cardBgAlt,
                                                                                color: estado === true ? '#fff' : c.textMed,
                                                                                border: estado === true ? '1px solid #16a34a' : `1px solid ${c.border}`,
                                                                            }}>
                                                                            {al.nome.split(' ')[0]}
                                                                        </button>
                                                                        <button type="button"
                                                                            onClick={() => togglePresente(al.id, false)}
                                                                            title="Ausente"
                                                                            style={{
                                                                                fontSize: 11, fontWeight: 600, padding: '4px 6px', borderRadius: '0 8px 8px 0', cursor: 'pointer', transition: 'all .15s',
                                                                                background: estado === false ? '#ef4444' : c.cardBgAlt,
                                                                                color: estado === false ? '#fff' : c.textMuted,
                                                                                border: estado === false ? '1px solid #dc2626' : `1px solid ${c.border}`,
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


                                            {/* Evidência de Aula — URL */}
                                            {(() => {
                                                const url = (novoRegistro as any).urlEvidencia || ''
                                                let urlValida = false
                                                try { urlValida = url.length > 0 && !!new URL(url) } catch { urlValida = false }
                                                const aberto = evidenciaAberta || !!url
                                                const driveConfigurado = isGoogleDriveConfigured()

                                                const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
                                                    const file = e.target.files?.[0]
                                                    if (!file) return
                                                    setUploadErro('')
                                                    setUploadandoEvidencia(true)
                                                    setUploadProgresso(0)
                                                    try {
                                                        // Resolve nomes de escola e turma para organizar no Drive
                                                        const ano = anosLetivos.find((a: any) => String(a.id) === String(regAnoSel))
                                                        const esc = ano?.escolas.find((e: any) => String(e.id) === String(regEscolaSel))
                                                        const seg = esc?.segmentos.find((s: any) => String(s.id) === String(regSegmentoSel))
                                                        const tur = seg?.turmas.find((t: any) => String(t.id) === String(regTurmaSel))
                                                        const result = await uploadEvidencia(
                                                            file,
                                                            import.meta.env.VITE_GOOGLE_CLIENT_ID,
                                                            pct => setUploadProgresso(pct),
                                                            {
                                                                escola: esc?.nome,
                                                                turma: tur?.nome,
                                                                data: novoRegistro.dataAula || new Date().toISOString().split('T')[0],
                                                            }
                                                        )
                                                        setNovoRegistro({ ...novoRegistro, urlEvidencia: result.webViewLink, thumbnailEvidencia: result.thumbnailLink } as any)
                                                        setDriveConectado(true)
                                                    } catch (err: any) {
                                                        console.error('[Drive upload error]', err)
                                                        setUploadErro(err?.message || 'Erro no upload. Tente novamente.')
                                                    } finally {
                                                        setUploadandoEvidencia(false)
                                                        if (fileInputRef.current) fileInputRef.current.value = ''
                                                    }
                                                }

                                                return (
                                                    <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, overflow: 'hidden', background: c.cardBg }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', cursor: 'pointer' }}
                                                            onClick={() => setEvidenciaAberta(v => !v)}>
                                                            <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>📎</span>
                                                            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: url ? c.textMain : c.textMed, flex: 1 }}>
                                                                Evidência de aula
                                                            </span>
                                                            {url && <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, background: '#f0fdf4', padding: '1px 6px', borderRadius: 99, border: '1px solid #bbf7d0', flexShrink: 0 }}>✓</span>}
                                                            <span style={{ fontSize: 10, color: c.textMuted, transition: 'transform .15s', display: 'inline-block', transform: aberto ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>▼</span>
                                                        </div>
                                                        {aberto && (
                                                            <div style={{ padding: '0 12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>

                                                                {/* Botão de upload — só aparece se Drive estiver configurado */}
                                                                {driveConfigurado && (
                                                                    <>
                                                                        {/* Input galeria/arquivo */}
                                                                        <input
                                                                            ref={fileInputRef}
                                                                            type="file"
                                                                            accept="image/*,video/*,audio/*"
                                                                            style={{ display: 'none' }}
                                                                            onChange={handleFileSelect}
                                                                        />
                                                                        {/* Input câmera direta (mobile) */}
                                                                        <input
                                                                            ref={cameraInputRef}
                                                                            type="file"
                                                                            accept="image/*"
                                                                            capture="environment"
                                                                            style={{ display: 'none' }}
                                                                            onChange={handleFileSelect}
                                                                        />
                                                                        {/* Sem token: botão de conectar (mobile=redirect, desktop=popup síncrono) */}
                                                                        {!driveConectado ? (
                                                                            <button type="button"
                                                                                onClick={() => {
                                                                                    setUploadErro('')
                                                                                    if (isMobileDevice()) {
                                                                                        redirectToGoogleAuth(import.meta.env.VITE_GOOGLE_CLIENT_ID)
                                                                                    } else {
                                                                                        requestDriveToken()
                                                                                    }
                                                                                }}
                                                                                style={{
                                                                                    width: '100%', padding: '10px', borderRadius: 8, border: '1.5px solid #c7d2fe',
                                                                                    background: '#eef2ff', cursor: 'pointer',
                                                                                    fontSize: 12, fontWeight: 600, color: '#4f46e5',
                                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                                                }}>
                                                                                <span style={{ fontSize: 15 }}>🔗</span>
                                                                                Conectar Google Drive
                                                                            </button>
                                                                        ) : uploadandoEvidencia ? (
                                                                            <div style={{
                                                                                width: '100%', padding: '10px', borderRadius: 8, border: '1.5px dashed #c7d2fe',
                                                                                background: '#f5f3ff', fontSize: 12, fontWeight: 600, color: '#6366f1',
                                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                                            }}>
                                                                                <span style={{ fontSize: 13 }}>⏳</span>
                                                                                Enviando para Google Drive... {uploadProgresso}%
                                                                            </div>
                                                                        ) : (
                                                                            <div style={{ display: 'flex', gap: 6 }}>
                                                                                {/* Botão câmera — só no mobile */}
                                                                                {isMobileDevice() && (
                                                                                    <button type="button"
                                                                                        onClick={() => cameraInputRef.current?.click()}
                                                                                        style={{
                                                                                            flex: 1, padding: '10px', borderRadius: 8, border: '1.5px dashed #c7d2fe',
                                                                                            background: '#fff', cursor: 'pointer',
                                                                                            fontSize: 12, fontWeight: 600, color: '#6366f1', transition: 'all .15s',
                                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                                                                        }}>
                                                                                        <span style={{ fontSize: 15 }}>📷</span>
                                                                                        Tirar foto
                                                                                    </button>
                                                                                )}
                                                                                {/* Botão galeria/arquivo */}
                                                                                <button type="button"
                                                                                    onClick={() => fileInputRef.current?.click()}
                                                                                    style={{
                                                                                        flex: 1, padding: '10px', borderRadius: 8, border: '1.5px dashed #c7d2fe',
                                                                                        background: '#fff', cursor: 'pointer',
                                                                                        fontSize: 12, fontWeight: 600, color: '#6366f1', transition: 'all .15s',
                                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                                                                    }}>
                                                                                    <span style={{ fontSize: 15 }}>🖼️</span>
                                                                                    {isMobileDevice() ? 'Galeria' : (url ? 'Trocar arquivo' : 'Escolher arquivo')}
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                        {uploadandoEvidencia && (
                                                                            <div style={{ height: 4, borderRadius: 99, background: '#e0e7ff', overflow: 'hidden' }}>
                                                                                <div style={{ height: '100%', borderRadius: 99, background: '#6366f1', width: `${uploadProgresso}%`, transition: 'width .3s' }} />
                                                                            </div>
                                                                        )}
                                                                        {uploadErro && (
                                                                            <span style={{ fontSize: 11, color: '#ef4444' }}>{uploadErro}</span>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {/* Arquivo já enviado */}
                                                                {urlValida && (
                                                                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, overflow: 'hidden' }}>
                                                                        {(novoRegistro as any).thumbnailEvidencia && (
                                                                            <img src={(novoRegistro as any).thumbnailEvidencia} alt="Evidência"
                                                                                style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }} />
                                                                        )}
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
                                                                        <span style={{ fontSize: 13 }}>✅</span>
                                                                        <span style={{ fontSize: 12, color: '#15803d', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Arquivo no Google Drive</span>
                                                                        <a href={url} target="_blank" rel="noopener noreferrer"
                                                                            style={{ fontSize: 11, fontWeight: 600, color: '#1d4ed8', textDecoration: 'none', flexShrink: 0 }}>
                                                                            Abrir ↗
                                                                        </a>
                                                                        <button type="button" onClick={() => setNovoRegistro({ ...novoRegistro, urlEvidencia: '', thumbnailEvidencia: '' } as any)}
                                                                            style={{ color: '#cbd5e1', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 0, flexShrink: 0 }}>✕</button>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Fallback: link manual (sempre disponível) */}
                                                                {!driveConfigurado && (
                                                                    <input
                                                                        type="url"
                                                                        value={url}
                                                                        onChange={e => setNovoRegistro({ ...novoRegistro, urlEvidencia: e.target.value } as any)}
                                                                        placeholder="Cole um link (Google Drive, YouTube, áudio...)"
                                                                        style={{ flex: 1, padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#334155', fontFamily: 'inherit', outline: 'none', background: '#fff' }}
                                                                        onFocus={e => (e.target.style.borderColor = '#94a3b8')}
                                                                        onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                                                                    />
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    )}

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

                                    {/* Filtro de período */}
                                    {planoParaRegistro.registrosPosAula?.length > 0 && (() => {
                                        const hoje2 = new Date().toISOString().split('T')[0]
                                        const seg2 = (() => { const h = new Date(); const d = h.getDay(); const diff = d === 0 ? -6 : 1 - d; const s = new Date(h); s.setDate(h.getDate() + diff); return s.toISOString().split('T')[0] })()
                                        const fim2 = (() => { const s = new Date(seg2 + 'T00:00:00'); s.setDate(s.getDate() + 6); return s.toISOString().split('T')[0] })()
                                        const periodoPillStyle = (ativo: boolean): React.CSSProperties => ({
                                            padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                            background: ativo ? '#1e293b' : '#f1f5f9',
                                            color: ativo ? '#fff' : '#64748b',
                                            border: 'none',
                                        })
                                        const counts = {
                                            hoje: (planoParaRegistro.registrosPosAula || []).filter((r: any) => r.data === hoje2).length,
                                            semana: (planoParaRegistro.registrosPosAula || []).filter((r: any) => r.data >= seg2 && r.data <= fim2).length,
                                        }
                                        return (
                                            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                                                <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginRight: 2 }}>Período</span>
                                                <button type="button" onClick={() => setFiltroRegPeriodo('')} style={periodoPillStyle(filtroRegPeriodo === '')}>Todos</button>
                                                <button type="button" onClick={() => setFiltroRegPeriodo('hoje')} style={periodoPillStyle(filtroRegPeriodo === 'hoje')}>Hoje {counts.hoje > 0 ? `(${counts.hoje})` : ''}</button>
                                                <button type="button" onClick={() => setFiltroRegPeriodo('semana')} style={periodoPillStyle(filtroRegPeriodo === 'semana')}>Esta semana {counts.semana > 0 ? `(${counts.semana})` : ''}</button>
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
                                        const hojeStr2 = new Date().toISOString().split('T')[0]
                                        const seg2 = (() => { const h = new Date(); const d = h.getDay(); const diff = d === 0 ? -6 : 1 - d; const s = new Date(h); s.setDate(h.getDate() + diff); return s.toISOString().split('T')[0] })()
                                        const fim2 = (() => { const s = new Date(seg2 + 'T00:00:00'); s.setDate(s.getDate() + 6); return s.toISOString().split('T')[0] })()
                                        // Quando há filtro de turma, busca em todos os planos (histórico cross-plan)
                                        const todosRegsPool: any[] = filtroRegTurma
                                            ? planos.flatMap((p: any) => (p.registrosPosAula || []).map((r: any) => ({ ...r, planoTitulo: p.titulo, planoId: p.id })))
                                            : (planoParaRegistro.registrosPosAula || []).map((r: any) => ({ ...r, planoTitulo: planoParaRegistro.titulo, planoId: planoParaRegistro.id }))

                                        const regs = todosRegsPool.filter((r: any) => {
                                            if (filtroRegTurma) {
                                                if (r.turma != filtroRegTurma) return false
                                            } else if (filtroRegData) {
                                                if (r.data != filtroRegData) return false
                                            } else {
                                                if (filtroRegAno      && r.anoLetivo != filtroRegAno) return false
                                                if (filtroRegEscola   && r.escola    != filtroRegEscola) return false
                                                if (filtroRegSegmento && (r.segmento || r.serie) != filtroRegSegmento) return false
                                            }
                                            if (filtroRegPeriodo === 'hoje' && r.data !== hojeStr2) return false
                                            if (filtroRegPeriodo === 'semana' && (r.data < seg2 || r.data > fim2)) return false
                                            if (buscaRegistros.trim()) {
                                                const q = buscaRegistros.toLowerCase()
                                                const campos = [r.resumoAula, r.funcionouBem, (r as any).repetiria, r.naoFuncionou, r.poderiaMelhorar, r.proximaAula, r.comportamento, r.anotacoesGerais]
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
                                                        { icon: '✅', label: 'O que aprenderam',        text: reg.funcionouBem },
                                                        { icon: '⭐', label: 'O que faria de novo',     text: (reg as any).repetiria },
                                                        { icon: '💭', label: 'O que faria diferente',  text: reg.naoFuncionou },
                                                        { icon: '🔧', label: 'Poderia ter sido melhor', text: reg.poderiaMelhorar },
                                                        { icon: '💡', label: 'Próxima aula / estratégias',            text: reg.proximaAula },
                                                        { icon: '👥', label: 'Comportamento',           text: reg.comportamento },
                                                        { icon: '📝', label: 'Anotações gerais',        text: reg.anotacoesGerais },
                                                    ].filter(f => f.text?.trim())
                                                    let urlEvidenciaValida = false
                                                    try { urlEvidenciaValida = !!(reg as any).urlEvidencia && !!new URL((reg as any).urlEvidencia) } catch { urlEvidenciaValida = false }

                                                    const isOutroPlano = (reg as any).planoId !== planoParaRegistro.id

                                                    return (
                                                        <div key={reg.id ?? i} style={{ border: registroEditando?.id === reg.id ? '1px solid #94a3b8' : '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: registroEditando?.id === reg.id ? '#f8fafc' : '#fff' }}>
                                                            {/* Cabeçalho clicável */}
                                                            <div onClick={toggleReg}
                                                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', cursor: 'pointer', background: isOpen ? '#f8fafc' : '#fff', borderBottom: isOpen ? '1px solid #e2e8f0' : 'none' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                                                                    {turmaLabel && (
                                                                        <span style={{ fontSize: 10, fontWeight: 700, background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: 99, flexShrink: 0 }}>{turmaLabel}</span>
                                                                    )}
                                                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', flexShrink: 0 }}>{dataFmt}</span>
                                                                    {isHoje && <span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600, flexShrink: 0 }}>hoje</span>}
                                                                    {reg.dataEdicao && <span style={{ fontSize: 11, color: '#93c5fd', flexShrink: 0 }}>· editado</span>}
                                                                    {(reg as any).audioNotaDeVoz && <span title="Tem nota de voz" style={{ fontSize: 12, flexShrink: 0 }}>🎙️</span>}
                                                                    {isOutroPlano && (reg as any).planoTitulo && (
                                                                        <span style={{ fontSize: 10, color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '1px 6px', borderRadius: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }} title={(reg as any).planoTitulo}>
                                                                            {(reg as any).planoTitulo}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                                                    {!isOutroPlano && <>
                                                                        <button onClick={e => { e.stopPropagation(); editarRegistro(reg) }}
                                                                            style={{ padding: '3px 7px', fontSize: 11, color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer' }} title="Editar">✏️</button>
                                                                        <button onClick={e => { e.stopPropagation(); if (copiandoRegId === (reg.id ?? i)) { setCopiandoRegId(null); setTurmasCopiar(new Set()); setCopiarOutroDia('') } else { setCopiandoRegId(reg.id ?? i); setTurmasCopiar(new Set()); setCopiarOutroDia('') } }}
                                                                            style={{ padding: '3px 7px', fontSize: 11, color: copiandoRegId === (reg.id ?? i) ? '#2563eb' : '#94a3b8', border: `1px solid ${copiandoRegId === (reg.id ?? i) ? '#93c5fd' : '#e2e8f0'}`, borderRadius: 6, background: copiandoRegId === (reg.id ?? i) ? '#eff6ff' : '#fff', cursor: 'pointer' }} title="Copiar para outras turmas">📋</button>
                                                                        <button onClick={e => { e.stopPropagation(); excluirRegistro(reg.id) }}
                                                                            style={{ padding: '3px 7px', fontSize: 11, color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer' }} title="Excluir">🗑️</button>
                                                                    </>
                                                                    }
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
                                                                        <div style={{ borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', overflow: 'hidden' }}>
                                                                            {(reg as any).thumbnailEvidencia && (
                                                                                <a href={(reg as any).urlEvidencia} target="_blank" rel="noopener noreferrer">
                                                                                    <img src={(reg as any).thumbnailEvidencia} alt="Evidência"
                                                                                        style={{ width: '100%', maxHeight: 140, objectFit: 'cover', display: 'block' }} />
                                                                                </a>
                                                                            )}
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
                                                                            <span style={{ fontSize: 13, flexShrink: 0 }}>📎</span>
                                                                            <span style={{ fontSize: 9, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '.08em', flexShrink: 0 }}>Evidência</span>
                                                                            <a href={(reg as any).urlEvidencia} target="_blank" rel="noopener noreferrer"
                                                                                style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                                                                🔗 Abrir link
                                                                            </a>
                                                                            </div>
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

                        {/* ── Sticky save footer inline — compacto, alinhado à direita ── */}
                        {inlineMode && !verRegistros && (
                            <div className="px-4 py-3 border-t border-[#E6EAF0] dark:border-[#374151] bg-white dark:bg-[#1F2937] flex items-center justify-end gap-3 shrink-0">
                                {autoSaveStatus === 'saved' && (
                                    <span className="text-[11px] text-slate-400 dark:text-[#6b7280]">rascunho salvo</span>
                                )}
                                <button
                                    onClick={() => {
                                        salvarRegistro()
                                        // Limpa rascunho
                                        if (regTurmaSel && novoRegistro.dataAula)
                                            localStorage.removeItem(`posAulaDraft-${regTurmaSel}-${novoRegistro.dataAula}`)
                                        showToast('Registro salvo ✓')
                                        if (onVoltar) onVoltar()
                                    }}
                                    className="px-4 py-2 rounded-lg border border-[#cbd5e1] dark:border-[#374151] bg-transparent text-[#64748b] dark:text-[#9CA3AF] text-[13px] font-semibold hover:border-[#94a3b8] dark:hover:border-[#6b7280] hover:text-[#475569] dark:hover:text-[#E5E7EB] transition">
                                    ✓ {saveLabel || 'Salvar registro'}
                                </button>
                            </div>
                        )}
                        {/* ── Sticky save footer (Novo registro) — só no modal flutuante ── */}
                        {!inlineMode && !verRegistros && (
                            <div style={{ padding: '10px 16px', borderTop: '1px solid #e2e8f0', background: '#fff', flexShrink: 0 }}>
                                <button ref={salvarBtnRef} onClick={() => {
                                    const algumCampo = !!(novoRegistro.funcionouBem || (novoRegistro as any).repetiria || novoRegistro.naoFuncionou || novoRegistro.proximaAula || (novoRegistro as any).comportamento || (novoRegistro as any).audioNotaDeVoz)
                                    const dadosParaIA = { ...novoRegistro }
                                    const tituloPlano = planoParaRegistro?.titulo || ''
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
