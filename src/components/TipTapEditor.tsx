import React, { useEffect, useRef, useState, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'

// ── Extrai ID do YouTube de qualquer formato de URL ───────────────────────────
function ytId(url: string): string | null {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/\s]{11})/)
    return m ? m[1] : null
}

// ── Extrai type+id do Spotify ────────────────────────────────────────────────
function spotifyInfo(url: string): { type: string; id: string } | null {
    const m = url.match(/open\.spotify\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:intl-[a-z]{2}\/)?(?:embed\/)?(track|album|playlist)\/([^?/#\s]+)/)
    return m ? { type: m[1], id: m[2] } : null
}

// ── Converte URLs de mídia em links amigáveis + coleta previews ───────────────
interface MediaPreview { url: string; kind: 'youtube' | 'spotify'; title: string }

async function processMediaUrls(html: string): Promise<{ html: string; previews: MediaPreview[] }> {
    const previews: MediaPreview[] = []
    const seen = new Set<string>()

    // Detecta <a href="url-de-midia"> e URLs soltas
    const urlRegex = /(?:<a[^>]*href="(https?:\/\/(?:(?:www\.)?youtu(?:\.be|be\.com)|open\.spotify\.com)[^"]*)"[^>]*>.*?<\/a>|(https?:\/\/(?:(?:www\.)?youtu(?:\.be|be\.com)|open\.spotify\.com)[^\s<"'&)]+))/gi
    const found: { raw: string; url: string }[] = []
    let m: RegExpExecArray | null
    while ((m = urlRegex.exec(html)) !== null) {
        found.push({ raw: m[0], url: m[1] || m[2] })
    }

    // Para cada URL encontrada, busca título e substitui no HTML
    let result = html
    for (const { raw, url } of found) {
        if (seen.has(url)) continue
        seen.add(url)
        let title = ''
        let kind: 'youtube' | 'spotify' | null = null

        if (ytId(url)) {
            kind = 'youtube'
            try {
                const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)
                if (res.ok) { const d = await res.json(); title = d.title || 'YouTube' }
            } catch { /* silencia */ }
            if (!title) title = 'YouTube'
        } else if (spotifyInfo(url)) {
            kind = 'spotify'
            try {
                const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`)
                if (res.ok) { const d = await res.json(); title = d.title || 'Spotify' }
            } catch { /* silencia */ }
            if (!title) title = 'Spotify'
        }

        if (kind && title) {
            const icon = kind === 'youtube' ? '▶' : '🎵'
            const link = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#6366f1;font-weight:600;text-decoration:none;">${icon} ${title}</a>`
            result = result.replace(raw, link)
            previews.push({ url, kind, title })
        }
    }
    return { html: result, previews }
}

// ── Mini-player flutuante e arrastável ───────────────────────────────────────
interface FloatingPlayerProps {
    url: string
    title: string
    kind: 'youtube' | 'spotify'
    onClose: () => void
}

function FloatingPlayer({ url, title, kind, onClose }: FloatingPlayerProps) {
    const [pos, setPos] = useState({ x: window.innerWidth - 360, y: window.innerHeight - 240 })
    const [size, setSize] = useState({ w: 320, h: kind === 'spotify' ? 96 : 180 })
    const dragging = useRef(false)
    const dragOffset = useRef({ x: 0, y: 0 })
    const resizing = useRef(false)
    const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 })

    const onDragStart = useCallback((e: React.MouseEvent) => {
        dragging.current = true
        dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
        e.preventDefault()
    }, [pos])

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (dragging.current) {
                setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y })
            }
            if (resizing.current) {
                const dw = e.clientX - resizeStart.current.x
                const dh = e.clientY - resizeStart.current.y
                setSize({
                    w: Math.max(240, resizeStart.current.w + dw),
                    h: Math.max(80, resizeStart.current.h + dh),
                })
            }
        }
        const onUp = () => { dragging.current = false; resizing.current = false }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    }, [])

    const embedSrc = kind === 'youtube'
        ? `https://www.youtube-nocookie.com/embed/${ytId(url)}?autoplay=1`
        : (() => { const s = spotifyInfo(url); return s ? `https://open.spotify.com/embed/${s.type}/${s.id}` : '' })()

    return ReactDOM.createPortal(
        <div
            style={{
                position: 'fixed', zIndex: 9999,
                left: pos.x, top: pos.y,
                width: size.w, height: size.h + 32,
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                borderRadius: 12, overflow: 'hidden',
                userSelect: 'none',
            }}
        >
            {/* Header arrastável */}
            <div
                onMouseDown={onDragStart}
                style={{
                    height: 32, background: kind === 'youtube' ? '#1e1e1e' : '#191414',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 10px', cursor: 'grab', gap: 8,
                }}
            >
                <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {kind === 'youtube' ? '▶' : '🎵'} {title}
                </span>
                <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={onClose}
                    style={{ color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}
                >×</button>
            </div>
            {/* iframe */}
            <iframe
                src={embedSrc}
                width="100%"
                height={size.h}
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                style={{ display: 'block', background: '#000' }}
            />
            {/* Handle de resize (canto inferior direito) */}
            <div
                onMouseDown={e => {
                    resizing.current = true
                    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h }
                    e.preventDefault()
                    e.stopPropagation()
                }}
                style={{
                    position: 'absolute', right: 0, bottom: 0,
                    width: 16, height: 16, cursor: 'se-resize',
                    background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.3) 50%)',
                }}
            />
        </div>,
        document.body
    )
}

// ── Componente principal ─────────────────────────────────────────────────────

interface TipTapEditorProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
    onHashTrigger?: (query: string, position: { top: number; left: number }) => void
    onHashCancel?: () => void
}

export default function TipTapEditor({
    value,
    onChange,
    placeholder = 'Descreva a atividade...',
    className = '',
    onHashTrigger,
    onHashCancel,
}: TipTapEditorProps) {
    const hashState = useRef({ active: false, buffer: '' })
    const [previews, setPreviews] = useState<MediaPreview[]>([])
    const [floatingPlayer, setFloatingPlayer] = useState<MediaPreview | null>(null)

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({
                openOnClick: false,
                autolink: true,
                HTMLAttributes: {
                    style: 'color:#6366f1;font-weight:600;text-decoration:none;',
                    target: '_blank',
                    rel: 'noopener noreferrer',
                },
            }),
            Placeholder.configure({ placeholder }),
        ],
        content: value || '',
        onBlur: ({ editor: ed }) => {
            const raw = ed.getHTML()
            processMediaUrls(raw).then(({ html, previews: p }) => {
                if (html !== raw) {
                    ed.commands.setContent(html, false)
                    onChange(html)
                } else {
                    onChange(raw)
                }
                setPreviews(p)
            })
        },
        editorProps: {
            attributes: {
                class: 'tiptap-editor focus:outline-none',
                style: 'min-height: 80px; padding: 10px 12px;',
            },
            handleKeyDown(_view, event) {
                const hs = hashState.current
                if (event.key === '#') { hs.active = true; hs.buffer = ''; return false }
                if (hs.active) {
                    if (event.key === 'Escape' || event.key === ' ') { hs.active = false; hs.buffer = ''; onHashCancel?.(); return false }
                    if (event.key === 'Backspace') {
                        if (hs.buffer.length === 0) { hs.active = false; onHashCancel?.() }
                        else { hs.buffer = hs.buffer.slice(0, -1); _emitHashPos(event, hs.buffer, onHashTrigger) }
                        return false
                    }
                    if (event.key === 'Enter') { hs.active = false; hs.buffer = ''; onHashCancel?.(); return false }
                    if (event.key.length === 1) { hs.buffer += event.key; _emitHashPos(event, hs.buffer, onHashTrigger) }
                }
                return false
            },
        },
    })

    // Sincroniza valor externo
    useEffect(() => {
        if (!editor) return
        if (editor.getHTML() !== value) {
            editor.commands.setContent(value || '', false)
            // Recarrega previews ao trocar de atividade
            if (value) processMediaUrls(value).then(({ previews: p }) => setPreviews(p))
            else setPreviews([])
        }
    }, [value, editor])

    const btn = (active: boolean) =>
        `px-2 py-1 rounded text-sm transition ${active
            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08]'}`

    return (
        <div className={`relative tiptap-wrapper ${className}`}>
            {/* BubbleMenu — só ao selecionar texto */}
            {editor && (
                <BubbleMenu editor={editor} shouldShow={({ state }) => !state.selection.empty}
                    tippyOptions={{ duration: 100, placement: 'top-start' }}>
                    <div className="flex items-center gap-0.5 bg-white dark:bg-[#1E2A4A] border border-slate-200 dark:border-[#374151] rounded-lg shadow-xl px-1 py-0.5">
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run() }} className={btn(editor.isActive('bold'))} title="Negrito"><strong>B</strong></button>
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }} className={btn(editor.isActive('italic'))} title="Itálico"><em>I</em></button>
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleUnderline().run() }} className={btn(editor.isActive('underline'))} title="Sublinhado"><u>U</u></button>
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-0.5" />
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBulletList().run() }} className={btn(editor.isActive('bulletList'))} title="Lista">≡</button>
                    </div>
                </BubbleMenu>
            )}

            {/* Editor */}
            <EditorContent editor={editor} />

            {/* Cards de preview abaixo do editor */}
            {previews.length > 0 && (
                <div className="px-3 pb-3 space-y-1.5">
                    {previews.map((p, i) => {
                        const thumb = p.kind === 'youtube' && ytId(p.url)
                            ? `https://img.youtube.com/vi/${ytId(p.url)}/mqdefault.jpg`
                            : null
                        return (
                            <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-100 dark:border-[#374151] bg-slate-50 dark:bg-white/[0.02] hover:border-indigo-200 dark:hover:border-indigo-500/30 transition group">
                                {thumb
                                    ? <img src={thumb} alt="" className="w-14 h-9 rounded object-cover shrink-0 bg-black" />
                                    : <div className="w-14 h-9 rounded shrink-0 bg-[#1DB954] flex items-center justify-center text-white text-lg">🎵</div>
                                }
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{p.title}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{p.kind === 'youtube' ? 'YouTube' : 'Spotify'}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFloatingPlayer(p)}
                                    className="shrink-0 text-[11px] font-semibold text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition"
                                >
                                    {p.kind === 'youtube' ? '▶ Abrir' : '▶ Player'}
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Mini-player flutuante */}
            {floatingPlayer && (
                <FloatingPlayer
                    url={floatingPlayer.url}
                    title={floatingPlayer.title}
                    kind={floatingPlayer.kind}
                    onClose={() => setFloatingPlayer(null)}
                />
            )}
        </div>
    )
}

function _emitHashPos(
    event: KeyboardEvent,
    buffer: string,
    onHashTrigger: ((q: string, pos: { top: number; left: number }) => void) | undefined
) {
    if (!onHashTrigger) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const rect = sel.getRangeAt(0).getBoundingClientRect()
    onHashTrigger(buffer, { top: rect.bottom + 4, left: rect.left })
}
