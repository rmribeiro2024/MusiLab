import React, { useState, useEffect, useRef } from 'react'
import { sanitizar } from '../lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
  floatingToolbar?: boolean
  showLinkPreviews?: boolean
  onHashTrigger?: (query: string, position: { top: number; left: number }) => void
  onHashCancel?: () => void
}

// ── Helpers para preview de links ────────────────────────────────────────────

function getYouTubeId(url: string): string | null {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/)
    return m ? m[1] : null
}

function getSpotifyEmbed(url: string): string | null {
    const m = url.match(/open\.spotify\.com\/(track|album|playlist)\/([^?/\s]+)/)
    return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null
}

function extractMediaUrls(html: string): string[] {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const urls: string[] = []
    doc.querySelectorAll('a').forEach(a => { if (a.href) urls.push(a.href) })
    const text = doc.body.textContent || ''
    const regex = /https?:\/\/[^\s<>"']+/g
    let m: RegExpExecArray | null
    while ((m = regex.exec(text)) !== null) urls.push(m[0])
    return [...new Set(urls)].filter(u =>
        /youtube\.com|youtu\.be/.test(u) || /open\.spotify\.com/.test(u)
    )
}

// Converte URLs soltas do YouTube/Spotify em links amigáveis no HTML
// (não toca URLs que já estão dentro de <a href="">)
async function autoLinkMediaUrls(html: string): Promise<string> {
    // Regex: URL do YT/Spotify que NÃO está precedida por href=" ou src="
    const mediaRegex = /(?<!(?:href|src)=["'])https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|open\.spotify\.com\/)[^\s<>"'&]*/g
    const matches = [...html.matchAll(mediaRegex)]
    if (matches.length === 0) return html

    let result = html
    for (const match of matches) {
        const url = match[0]
        let label = ''
        const ytId = getYouTubeId(url)
        if (ytId) {
            // Tenta buscar o título via oEmbed (sem API key necessária)
            try {
                const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)
                if (res.ok) {
                    const data = await res.json()
                    label = `▶ ${data.title || 'YouTube'}`
                }
            } catch { /* silencia erros de rede */ }
            if (!label) label = `▶ YouTube`
        } else if (/open\.spotify\.com/.test(url)) {
            try {
                const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`)
                if (res.ok) {
                    const data = await res.json()
                    label = `🎵 ${data.title || 'Spotify'}`
                }
            } catch { /* silencia erros de rede */ }
            if (!label) label = `🎵 Spotify`
        }
        if (label) {
            result = result.replace(
                url,
                `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#6366f1;text-decoration:none;font-weight:600">${label}</a>`
            )
        }
    }
    return result
}

// ─────────────────────────────────────────────────────────────────────────────

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  rows = 3,
  className = '',
  floatingToolbar = false,
  showLinkPreviews = false,
  onHashTrigger,
  onHashCancel,
}: RichTextEditorProps): React.ReactElement {
    const editorRef    = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const [bold,      setBold]      = useState(false)
    const [italic,    setItalic]    = useState(false)
    const [underline, setUnderline] = useState(false)
    const [floatVisible, setFloatVisible] = useState(false)
    const [floatPos,     setFloatPos]     = useState({ top: 0, left: 0 })
    const [previewUrls,  setPreviewUrls]  = useState<string[]>([])

    // Inicializa HTML apenas UMA vez na montagem — sanitizado contra XSS
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.innerHTML = sanitizar(value || '')
        }
        if (showLinkPreviews) {
            setPreviewUrls(extractMediaUrls(value || ''))
        }
    }, []) // eslint-disable-line

    const updateButtons = (): void => {
        setBold(document.queryCommandState('bold'))
        setItalic(document.queryCommandState('italic'))
        setUnderline(document.queryCommandState('underline'))
    }

    const checkFloatToolbar = (): void => {
        if (!floatingToolbar) return
        const sel = window.getSelection()
        if (!sel || sel.isCollapsed || !editorRef.current?.contains(sel.anchorNode)) {
            setFloatVisible(false)
            return
        }
        const range = sel.getRangeAt(0)
        const rect  = range.getBoundingClientRect()
        const cRect = containerRef.current?.getBoundingClientRect()
        if (!cRect || rect.width === 0) { setFloatVisible(false); return }

        const toolbarW = 160
        const top  = rect.top - cRect.top - 46
        const left = Math.max(4, Math.min(
            rect.left - cRect.left + rect.width / 2 - toolbarW / 2,
            cRect.width - toolbarW - 4
        ))
        setFloatPos({ top, left })
        setFloatVisible(true)
        updateButtons()
    }

    const checkHashTrigger = (): void => {
        if (!onHashTrigger && !onHashCancel) return
        const sel = window.getSelection()
        if (!sel || !editorRef.current?.contains(sel.anchorNode)) return
        const range = sel.getRangeAt(0)
        const textBefore = (range.startContainer.textContent || '').substring(0, range.startOffset)
        const hashMatch = textBefore.match(/#(\w*)$/)
        if (hashMatch) {
            const rect  = range.getBoundingClientRect()
            const cRect = containerRef.current?.getBoundingClientRect()
            if (cRect) {
                onHashTrigger?.(hashMatch[1], {
                    top:  rect.bottom - cRect.top,
                    left: rect.left   - cRect.left,
                })
            }
        } else {
            onHashCancel?.()
        }
    }

    // Propaga para o pai no blur; atrasa o hide do float para permitir clique nos botões
    const handleBlur = (): void => {
        if (editorRef.current) {
            const rawHtml = editorRef.current.innerHTML
            onChange(rawHtml)
            if (showLinkPreviews) {
                setPreviewUrls(extractMediaUrls(rawHtml))
                // Converte URLs soltas em links amigáveis (async — atualiza DOM quando pronto)
                autoLinkMediaUrls(rawHtml).then(linkedHtml => {
                    if (linkedHtml !== rawHtml && editorRef.current) {
                        editorRef.current.innerHTML = linkedHtml
                        onChange(linkedHtml)
                        setPreviewUrls(extractMediaUrls(linkedHtml))
                    }
                })
            }
        }
        setTimeout(() => setFloatVisible(false), 150)
        onHashCancel?.()
    }

    const execCmd = (cmd: string): void => {
        editorRef.current?.focus()
        document.execCommand(cmd, false, undefined)
        updateButtons()
        if (editorRef.current) onChange(editorRef.current.innerHTML)
    }

    const minH = `${rows * 1.8}rem`

    // Botões da toolbar fixa (light)
    const btnFixed = (active: boolean): string =>
        `px-2.5 py-1 rounded text-sm border select-none cursor-pointer transition-colors ${
            active
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
        }`

    // Botões da toolbar flutuante (escuro sempre)
    const btnFloat = (active: boolean): string =>
        `w-7 h-7 flex items-center justify-center rounded text-sm select-none cursor-pointer transition-colors font-semibold ${
            active
                ? 'bg-white/20 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
        }`

    return (
        <div ref={containerRef} className={`border border-slate-200 dark:border-[#374151] rounded-xl overflow-visible relative ${className}`}
             style={{ outline: 'none' }}>

            {/* ── Toolbar fixa — só quando floatingToolbar=false ── */}
            {!floatingToolbar && (
                <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-200 dark:border-[#374151] rounded-t-xl">
                    <button type="button" onMouseDown={e => { e.preventDefault(); execCmd('bold') }}
                        className={btnFixed(bold) + ' font-bold'} title="Negrito">B</button>
                    <button type="button" onMouseDown={e => { e.preventDefault(); execCmd('italic') }}
                        className={btnFixed(italic) + ' italic'} title="Itálico">I</button>
                    <button type="button" onMouseDown={e => { e.preventDefault(); execCmd('underline') }}
                        className={btnFixed(underline) + ' underline'} title="Sublinhado">U</button>
                    <div className="w-px h-5 bg-gray-300 dark:bg-[#374151] mx-1" />
                    <button type="button" onMouseDown={e => { e.preventDefault(); execCmd('insertUnorderedList') }}
                        className={btnFixed(false)} title="Lista com marcadores">≡ •</button>
                    <button type="button" onMouseDown={e => { e.preventDefault(); execCmd('insertOrderedList') }}
                        className={btnFixed(false)} title="Lista numerada">1. 2.</button>
                </div>
            )}

            {/* ── Toolbar flutuante — aparece ao selecionar texto ── */}
            {floatingToolbar && floatVisible && (
                <div
                    className="absolute z-30 flex items-center gap-0.5 px-2 py-1.5 bg-gray-900 dark:bg-[#1E2A4A] rounded-xl shadow-2xl border border-gray-700 dark:border-[#374151]"
                    style={{ top: floatPos.top, left: floatPos.left, pointerEvents: 'auto' }}
                    onMouseDown={e => e.preventDefault()}
                >
                    <button type="button" onMouseDown={e => { e.preventDefault(); execCmd('bold') }}
                        className={btnFloat(bold) + ' font-bold'} title="Negrito">B</button>
                    <button type="button" onMouseDown={e => { e.preventDefault(); execCmd('italic') }}
                        className={btnFloat(italic) + ' italic'} title="Itálico">I</button>
                    <button type="button" onMouseDown={e => { e.preventDefault(); execCmd('underline') }}
                        className={btnFloat(underline) + ' underline'} title="Sublinhado">U</button>
                    <div className="w-px h-4 bg-gray-600 mx-0.5" />
                    <button type="button" onMouseDown={e => { e.preventDefault(); execCmd('insertUnorderedList') }}
                        className={btnFloat(false)} title="Lista">≡•</button>
                    <button type="button" onMouseDown={e => { e.preventDefault(); execCmd('insertOrderedList') }}
                        className={btnFloat(false)} title="Numerada">1.</button>
                    {/* Seta do tooltip */}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 dark:bg-[#1E2A4A] rotate-45 border-r border-b border-gray-700 dark:border-[#374151]" />
                </div>
            )}

            {/* ── Área editável ── */}
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onBlur={handleBlur}
                onKeyUp={() => { updateButtons(); checkFloatToolbar(); checkHashTrigger() }}
                onMouseUp={checkFloatToolbar}
                data-placeholder={placeholder}
                className="px-4 py-3 outline-none text-gray-800 dark:text-[#D1D5DB] text-sm leading-relaxed rich-editor-area"
                style={{ minHeight: minH }}
            />

            {/* ── Previews de links (YouTube / Spotify) ── */}
            {showLinkPreviews && previewUrls.length > 0 && (
                <div className="px-3 pb-3 pt-2.5 space-y-2 border-t border-slate-100 dark:border-[#374151]">
                    {previewUrls.map((url, i) => {
                        const ytId = getYouTubeId(url)
                        if (ytId) return (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 dark:border-[#374151] hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                                <img
                                    src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                                    alt="YouTube"
                                    className="w-20 h-[46px] rounded object-cover shrink-0 bg-black"
                                />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1 text-[11px] text-red-500 font-semibold mb-0.5">
                                        <svg className="w-3 h-3 fill-current shrink-0" viewBox="0 0 24 24"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>
                                        YouTube
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                        {url.length > 48 ? url.substring(0, 48) + '…' : url}
                                    </p>
                                </div>
                            </a>
                        )
                        const spotifyEmbed = getSpotifyEmbed(url)
                        if (spotifyEmbed) return (
                            <div key={i} className="rounded-lg overflow-hidden border border-slate-200 dark:border-[#374151]">
                                <iframe
                                    src={spotifyEmbed}
                                    width="100%"
                                    height="80"
                                    frameBorder="0"
                                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                    loading="lazy"
                                />
                            </div>
                        )
                        return null
                    })}
                </div>
            )}
        </div>
    )
}
