// src/components/modals/ModalBuscaGlobal.tsx
// Prompt 2: Busca global Ctrl+K — pesquisa em planos, atividades, estratégias, músicas e sequências
// com resultados agrupados e navegação rápida.

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { usePlanosContext } from '../../contexts/PlanosContext'
import { useAtividadesContext } from '../../contexts/AtividadesContext'
import { useEstrategiasContext } from '../../contexts/EstrategiasContext'
import { useRepertorioContext } from '../../contexts/RepertorioContext'
import { useSequenciasContext } from '../../contexts/SequenciasContext'

interface Props {
    show: boolean
    onClose: () => void
    setViewMode: (mode: string) => void
}

const MAX_POR_GRUPO = 5

export default function ModalBuscaGlobal({ show, onClose, setViewMode }: Props) {
    const { planos, setPlanoSelecionado } = usePlanosContext()
    const { atividades, setAtividadeEditando } = useAtividadesContext()
    const { estrategias } = useEstrategiasContext()
    const { repertorio, setMusicaEditando } = useRepertorioContext()
    const { sequencias } = useSequenciasContext()

    const [query, setQuery] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (show) {
            setQuery('')
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [show])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (show) document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [show, onClose])

    const q = query.trim().toLowerCase()

    const resultados = useMemo(() => {
        if (!q || q.length < 2) return null
        const matchStr = (s?: string) => (s || '').toLowerCase().includes(q)

        const rPlanos = planos
            .filter(p => matchStr(p.titulo) || matchStr(p.turma) || matchStr(p.objetivoGeral) || matchStr(p.escola))
            .slice(0, MAX_POR_GRUPO)

        const rAtividades = atividades
            .filter(a => matchStr(a.nome) || matchStr(a.descricao) || (a.tags || []).some(t => matchStr(t)))
            .slice(0, MAX_POR_GRUPO)

        const rEstrategias = estrategias
            .filter(e => matchStr(e.nome) || matchStr(e.descricao) || matchStr(e.categoria))
            .slice(0, MAX_POR_GRUPO)

        const rMusicas = repertorio
            .filter(m => matchStr(m.titulo) || matchStr(m.autor) || (m.estilos || []).some(s => matchStr(s)))
            .slice(0, MAX_POR_GRUPO)

        const rSequencias = sequencias
            .filter(s => matchStr(s.titulo) || matchStr(s.unidadePredominante))
            .slice(0, MAX_POR_GRUPO)

        return { rPlanos, rAtividades, rEstrategias, rMusicas, rSequencias }
    }, [q, planos, atividades, estrategias, repertorio, sequencias])

    const total = resultados
        ? resultados.rPlanos.length + resultados.rAtividades.length + resultados.rEstrategias.length + resultados.rMusicas.length + resultados.rSequencias.length
        : 0

    if (!show) return null

    function navPlano(plano: any) {
        setPlanoSelecionado(plano)
        setViewMode('lista')
        onClose()
    }

    function navAtividade(ativ: any) {
        setViewMode('atividades')
        setTimeout(() => setAtividadeEditando(ativ), 100)
        onClose()
    }

    function navEstrategia() {
        setViewMode('estrategias')
        onClose()
    }

    function navMusica(m: any) {
        setMusicaEditando(m)
        setViewMode('repertorio')
        onClose()
    }

    function navSequencia() {
        setViewMode('sequencias')
        onClose()
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-16 px-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl z-10 overflow-hidden">

                {/* Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                    <span className="text-slate-400 text-lg">🔍</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Buscar planos, atividades, músicas, estratégias..."
                        className="flex-1 text-sm outline-none text-slate-800 placeholder-slate-400"
                    />
                    <kbd className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Esc</kbd>
                </div>

                {/* Resultados */}
                <div className="max-h-[420px] overflow-y-auto p-2">
                    {!q || q.length < 2 ? (
                        <p className="text-xs text-slate-400 text-center py-8">Digite pelo menos 2 caracteres para buscar</p>
                    ) : total === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-8">Nenhum resultado encontrado para "{query}"</p>
                    ) : <>
                        {resultados!.rPlanos.length > 0 && (
                            <div className="mb-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">📚 Planos ({resultados!.rPlanos.length})</p>
                                {resultados!.rPlanos.map(p => (
                                    <button key={p.id} onClick={() => navPlano(p)}
                                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-indigo-50 transition group">
                                        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-700">{p.titulo || 'Sem título'}</p>
                                        <p className="text-xs text-slate-400 truncate">{[p.turma, p.escola].filter(Boolean).join(' · ')}</p>
                                    </button>
                                ))}
                            </div>
                        )}

                        {resultados!.rAtividades.length > 0 && (
                            <div className="mb-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">🎁 Atividades ({resultados!.rAtividades.length})</p>
                                {resultados!.rAtividades.map(a => (
                                    <button key={a.id} onClick={() => navAtividade(a)}
                                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-50 transition group">
                                        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-amber-700">{a.nome}</p>
                                        {a.descricao && <p className="text-xs text-slate-400 truncate">{a.descricao.replace(/<[^>]*>/g, ' ').slice(0, 80)}</p>}
                                    </button>
                                ))}
                            </div>
                        )}

                        {resultados!.rMusicas.length > 0 && (
                            <div className="mb-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">🎼 Músicas ({resultados!.rMusicas.length})</p>
                                {resultados!.rMusicas.map(m => (
                                    <button key={m.id} onClick={() => navMusica(m)}
                                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50 transition group">
                                        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-emerald-700">{m.titulo}</p>
                                        <p className="text-xs text-slate-400 truncate">{m.autor || '—'}</p>
                                    </button>
                                ))}
                            </div>
                        )}

                        {resultados!.rEstrategias.length > 0 && (
                            <div className="mb-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">🧩 Estratégias ({resultados!.rEstrategias.length})</p>
                                {resultados!.rEstrategias.map(e => (
                                    <button key={e.id} onClick={navEstrategia}
                                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-violet-50 transition group">
                                        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-violet-700">{e.nome}</p>
                                        <p className="text-xs text-slate-400 truncate">{e.categoria || e.descricao || ''}</p>
                                    </button>
                                ))}
                            </div>
                        )}

                        {resultados!.rSequencias.length > 0 && (
                            <div className="mb-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">📚 Sequências ({resultados!.rSequencias.length})</p>
                                {resultados!.rSequencias.map(s => (
                                    <button key={s.id} onClick={navSequencia}
                                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 transition group">
                                        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-slate-700">{s.titulo}</p>
                                        <p className="text-xs text-slate-400 truncate">{s.unidadePredominante || ''}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </>}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs text-slate-400">{total > 0 ? `${total} resultado${total !== 1 ? 's' : ''}` : ''}</p>
                    <p className="text-xs text-slate-400">Pressione <kbd className="bg-slate-100 px-1 rounded">↵</kbd> para navegar</p>
                </div>
            </div>
        </div>
    )
}
