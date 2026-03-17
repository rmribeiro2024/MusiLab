import React, { useEffect, useRef } from 'react'
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Youtube from '@tiptap/extension-youtube'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'

// ── Helper: converte URLs do Spotify em embeds no HTML ───────────────────────
// Chamado no blur — URLs soltas viram iframe inline
function convertSpotifyUrls(html: string): string {
    return html.replace(
        /(?<!['"=])https?:\/\/open\.spotify\.com\/(track|album|playlist)\/([^?/\s<"'&]+)/g,
        (_full, type, id) =>
            `<div data-spotify="" style="margin:8px 0;border-radius:12px;overflow:hidden">` +
            `<iframe src="https://open.spotify.com/embed/${type}/${id}" width="100%" height="80" ` +
            `frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" ` +
            `loading="lazy" style="border-radius:12px;display:block"></iframe></div>`
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
    // Estado do hash autocomplete — gerenciado via ref para não recriar o editor
    const hashState = useRef({ active: false, buffer: '' })

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Youtube.configure({
                controls: true,
                nocookie: true,
                width: 480,
                height: 270,
                HTMLAttributes: {
                    style: 'margin:8px auto;border-radius:10px;overflow:hidden;display:block;',
                },
            }),
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
            let html = ed.getHTML()
            // Converte URLs de Spotify soltas em embeds
            const converted = convertSpotifyUrls(html)
            if (converted !== html) {
                ed.commands.setContent(converted, false)
                html = converted
            }
            onChange(html)
        },
        editorProps: {
            attributes: {
                class: 'tiptap-editor focus:outline-none',
                style: 'min-height: 80px; padding: 10px 12px;',
            },
            handleKeyDown(_view, event) {
                const hs = hashState.current

                if (event.key === '#') {
                    hs.active = true
                    hs.buffer = ''
                    return false
                }

                if (hs.active) {
                    if (event.key === 'Escape' || event.key === ' ') {
                        hs.active = false
                        hs.buffer = ''
                        onHashCancel?.()
                        return false
                    }
                    if (event.key === 'Backspace') {
                        if (hs.buffer.length === 0) {
                            hs.active = false
                            onHashCancel?.()
                        } else {
                            hs.buffer = hs.buffer.slice(0, -1)
                            _emitHashPos(event, hs.buffer, onHashTrigger)
                        }
                        return false
                    }
                    if (event.key === 'Enter') {
                        hs.active = false
                        hs.buffer = ''
                        onHashCancel?.()
                        return false
                    }
                    if (event.key.length === 1) {
                        hs.buffer += event.key
                        _emitHashPos(event, hs.buffer, onHashTrigger)
                    }
                }
                return false
            },
        },
    })

    // Sincroniza valor externo (troca de atividade selecionada)
    useEffect(() => {
        if (!editor) return
        const current = editor.getHTML()
        if (current !== value) {
            editor.commands.setContent(value || '', false)
        }
    }, [value, editor])

    const btn = (active: boolean) =>
        `px-2 py-1 rounded text-sm transition ${
            active
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08]'
        }`

    return (
        <div className={`relative tiptap-wrapper ${className}`}>
            {/* BubbleMenu — aparece ao selecionar texto */}
            {editor && (
                <BubbleMenu
                    editor={editor}
                    tippyOptions={{ duration: 100, placement: 'top-start' }}
                >
                    <div className="flex items-center gap-0.5 bg-white dark:bg-[#1E2A4A] border border-slate-200 dark:border-[#374151] rounded-lg shadow-xl px-1 py-0.5">
                        <button
                            onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}
                            className={btn(editor.isActive('bold'))}
                            title="Negrito"
                        >
                            <strong>B</strong>
                        </button>
                        <button
                            onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}
                            className={btn(editor.isActive('italic'))}
                            title="Itálico"
                        >
                            <em>I</em>
                        </button>
                        <button
                            onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleUnderline().run() }}
                            className={btn(editor.isActive('underline'))}
                            title="Sublinhado"
                        >
                            <u>U</u>
                        </button>
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-0.5" />
                        <button
                            onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBulletList().run() }}
                            className={btn(editor.isActive('bulletList'))}
                            title="Lista"
                        >
                            ≡
                        </button>
                    </div>
                </BubbleMenu>
            )}

            {/* Editor */}
            <EditorContent editor={editor} />
        </div>
    )
}

// Emite posição do cursor para o hash dropdown
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
