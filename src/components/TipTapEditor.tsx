import React, { useEffect } from 'react'
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Youtube from '@tiptap/extension-youtube'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { Node, Extension, mergeAttributes } from '@tiptap/core'
import { nodePasteRule } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

// ── Extensão Spotify ─────────────────────────────────────────────────────────

const SpotifyExtension = Node.create({
    name: 'spotify',
    group: 'block',
    atom: true,

    addAttributes() {
        return { src: { default: null } }
    },

    parseHTML() {
        return [{ tag: 'div[data-spotify]' }]
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'div',
            mergeAttributes({ 'data-spotify': '' }, { style: 'margin: 8px 0; border-radius: 12px; overflow: hidden;' }),
            [
                'iframe',
                {
                    src: HTMLAttributes.src,
                    width: '100%',
                    height: '80',
                    frameborder: '0',
                    allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
                    loading: 'lazy',
                    style: 'border-radius: 12px;',
                },
            ],
        ]
    },

    addPasteRules() {
        return [
            nodePasteRule({
                find: /https?:\/\/open\.spotify\.com\/(track|album|playlist)\/([^?/\s]+)/g,
                type: this.type,
                getAttributes: (match) => ({
                    src: `https://open.spotify.com/embed/${match[1]}/${match[2]}`,
                }),
            }),
        ]
    },
})

// ── Extensão Hash (autocomplete de tags) ─────────────────────────────────────

interface HashOptions {
    onHashTrigger: ((query: string, position: { top: number; left: number }) => void) | undefined
    onHashCancel: (() => void) | undefined
}

const HashExtension = Extension.create<HashOptions>({
    name: 'hashTrigger',

    addOptions() {
        return { onHashTrigger: undefined, onHashCancel: undefined }
    },

    addProseMirrorPlugins() {
        const { onHashTrigger, onHashCancel } = this.options
        let hashActive = false
        let hashBuffer = ''

        return [
            new Plugin({
                key: new PluginKey('hashTrigger'),
                props: {
                    handleKeyDown(view, event) {
                        if (event.key === '#') {
                            hashActive = true
                            hashBuffer = ''
                            // Deixa o # ser inserido normalmente; dispara na próxima tecla
                            return false
                        }

                        if (hashActive) {
                            if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
                                hashActive = false
                                hashBuffer = ''
                                onHashCancel?.()
                                return false
                            }
                            if (event.key === 'Backspace') {
                                if (hashBuffer.length === 0) {
                                    hashActive = false
                                    onHashCancel?.()
                                } else {
                                    hashBuffer = hashBuffer.slice(0, -1)
                                    const domSel = view.dom.ownerDocument.getSelection()
                                    const rect = domSel?.getRangeAt(0).getBoundingClientRect()
                                    if (rect && onHashTrigger) {
                                        onHashTrigger(hashBuffer, { top: rect.bottom + 4, left: rect.left })
                                    }
                                }
                                return false
                            }
                            if (event.key.length === 1) {
                                hashBuffer += event.key
                                const domSel = view.dom.ownerDocument.getSelection()
                                const rect = domSel?.getRangeAt(0).getBoundingClientRect()
                                if (rect && onHashTrigger) {
                                    onHashTrigger(hashBuffer, { top: rect.bottom + 4, left: rect.left })
                                }
                            }
                        }
                        return false
                    },
                },
            }),
        ]
    },
})

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
                    style: 'margin: 8px auto; border-radius: 10px; overflow: hidden; display: block;',
                },
            }),
            Link.configure({
                openOnClick: false,
                autolink: true,
                HTMLAttributes: {
                    style: 'color: #6366f1; font-weight: 600; text-decoration: none;',
                    target: '_blank',
                    rel: 'noopener noreferrer',
                },
            }),
            Placeholder.configure({ placeholder }),
            SpotifyExtension,
            HashExtension.configure({ onHashTrigger, onHashCancel }),
        ],
        content: value || '',
        onBlur: ({ editor: ed }) => {
            onChange(ed.getHTML())
        },
        editorProps: {
            attributes: {
                class: 'tiptap-editor focus:outline-none',
                style: 'min-height: 80px; padding: 10px 12px;',
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
