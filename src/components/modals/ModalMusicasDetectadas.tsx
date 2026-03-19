// src/components/modals/ModalMusicasDetectadas.tsx
// Modal pós-save: revisão das músicas detectadas no plano (encontradas / novas / ambíguas).

import React, { useState } from 'react'
import { usePlanosContext } from '../../contexts/PlanosContext'
import { useRepertorioContext } from '../../contexts/RepertorioContext'
import type { MusicaDetectada } from '../../lib/detectarMusicas'
import type { Musica, VinculoMusicaPlano } from '../../types'

// ── helpers ──────────────────────────────────────────────────────────────────
function gerarId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function secaoVazia(itens: MusicaDetectada[]): boolean {
    return itens.length === 0
}

// ── Seção: Encontradas ────────────────────────────────────────────────────────
function SecaoEncontradas({
    itens,
    planoId,
}: {
    itens: MusicaDetectada[]
    planoId: string | number
}) {
    const { vincularMusicaAoPlano, desvincularMusicaDoPlano } = usePlanosContext()
    const [desfeitos, setDesfeitos] = useState<Set<string>>(new Set())

    function idKey(d: MusicaDetectada) {
        return String(d.musica?.id ?? d.tituloDetectado)
    }

    function desfazer(d: MusicaDetectada) {
        const id = d.musica?.id ?? d.tituloDetectado
        desvincularMusicaDoPlano(planoId, id)
        setDesfeitos(prev => new Set([...prev, idKey(d)]))
    }

    function revincular(d: MusicaDetectada) {
        if (!d.musica) return
        const vinculo: VinculoMusicaPlano = {
            musicaId: d.musica.id ?? d.musica.titulo,
            titulo: d.musica.titulo,
            autor: d.musica.autor,
            origemDeteccao: 'encontrada',
            confirmadoPor: 'professor',
            confirmadoEm: new Date().toISOString(),
        }
        vincularMusicaAoPlano(planoId, vinculo)
        setDesfeitos(prev => { const s = new Set(prev); s.delete(idKey(d)); return s })
    }

    return (
        <div>
            <h3 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-1.5">
                <span className="text-base">✅</span> Já no repertório
                <span className="text-xs font-normal text-emerald-500">— vinculadas automaticamente</span>
            </h3>
            <div className="flex flex-col gap-2">
                {itens.map(d => {
                    const key = idKey(d)
                    const desfeito = desfeitos.has(key)
                    return (
                        <div key={key}
                            className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-sm
                                ${desfeito
                                    ? 'bg-slate-50 border-slate-200 text-slate-400'
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                            <span className="flex-1 min-w-0">
                                <span className="font-medium">{d.musica?.titulo}</span>
                                {d.musica?.autor && <span className="ml-1.5 text-emerald-600 text-xs">· {d.musica.autor}</span>}
                                <span className="ml-1.5 text-[11px] opacity-60">({d.origem})</span>
                            </span>
                            {desfeito
                                ? <button onClick={() => revincular(d)}
                                    className="text-xs text-slate-500 hover:text-slate-700 underline shrink-0">
                                    Revincular
                                </button>
                                : <button onClick={() => desfazer(d)}
                                    className="text-xs text-emerald-600 hover:text-emerald-800 underline shrink-0">
                                    Desfazer
                                </button>
                            }
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ── Seção: Ambíguas ───────────────────────────────────────────────────────────
function SecaoAmbiguas({
    itens,
    planoId,
}: {
    itens: MusicaDetectada[]
    planoId: string | number
}) {
    const { vincularMusicaAoPlano } = usePlanosContext()
    const [escolhas, setEscolhas] = useState<Record<string, string>>({})
    const [ignorados, setIgnorados] = useState<Set<string>>(new Set())
    const [vinculados, setVinculados] = useState<Set<string>>(new Set())

    function key(d: MusicaDetectada) { return d.tituloDetectado }

    function vincular(d: MusicaDetectada) {
        const escolhaId = escolhas[key(d)]
        if (!escolhaId) return
        const musica = (d.candidatas || []).find(
            m => String(m.id ?? m.titulo) === escolhaId
        )
        if (!musica) return
        const vinculo: VinculoMusicaPlano = {
            musicaId: musica.id ?? musica.titulo,
            titulo: musica.titulo,
            autor: musica.autor,
            origemDeteccao: 'encontrada',
            confirmadoPor: 'professor',
            confirmadoEm: new Date().toISOString(),
        }
        vincularMusicaAoPlano(planoId, vinculo)
        setVinculados(prev => new Set([...prev, key(d)]))
    }

    return (
        <div>
            <h3 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                <span className="text-base">⚠️</span> Correspondência ambígua
                <span className="text-xs font-normal text-amber-500">— escolha a música correta</span>
            </h3>
            <div className="flex flex-col gap-3">
                {itens.map(d => {
                    const k = key(d)
                    if (ignorados.has(k)) return null
                    if (vinculados.has(k)) return (
                        <div key={k} className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
                            ✓ Vinculada — <span className="font-medium">{escolhas[k] && (d.candidatas || []).find(m => String(m.id ?? m.titulo) === escolhas[k])?.titulo}</span>
                        </div>
                    )
                    return (
                        <div key={k} className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex flex-col gap-2">
                            <p className="text-xs text-amber-700">
                                Citada em <span className="font-semibold">{d.origem}</span> como "{d.tituloDetectado}". Qual música é essa?
                            </p>
                            <select
                                className="text-sm border border-amber-300 rounded-lg px-2 py-1.5 bg-white"
                                value={escolhas[k] || ''}
                                onChange={e => setEscolhas(prev => ({ ...prev, [k]: e.target.value }))}>
                                <option value="">Selecione…</option>
                                {(d.candidatas || []).map(m => (
                                    <option key={String(m.id ?? m.titulo)} value={String(m.id ?? m.titulo)}>
                                        {m.titulo}{m.autor ? ` · ${m.autor}` : ''}
                                    </option>
                                ))}
                            </select>
                            <div className="flex gap-2">
                                <button onClick={() => vincular(d)}
                                    disabled={!escolhas[k]}
                                    className="text-xs bg-amber-600 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700">
                                    Vincular
                                </button>
                                <button onClick={() => setIgnorados(prev => new Set([...prev, k]))}
                                    className="text-xs text-amber-600 hover:text-amber-800 underline">
                                    Ignorar
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ── Seção: Novas ──────────────────────────────────────────────────────────────
function SecaoNovas({
    itens,
    planoId,
}: {
    itens: MusicaDetectada[]
    planoId: string | number
}) {
    const { vincularMusicaAoPlano } = usePlanosContext()
    const { repertorio, setRepertorio } = useRepertorioContext()
    const [estados, setEstados] = useState<Record<string, 'pendente' | 'adicionada' | 'ignorada' | 'revisar'>>({})
    const [autores, setAutores] = useState<Record<string, string>>({})

    function key(d: MusicaDetectada) { return d.tituloDetectado }

    function adicionar(d: MusicaDetectada) {
        const titulo = d.tituloDetectado
        const autor = (autores[key(d)] || '').trim()
        // Evitar duplicatas no repertório
        const jaExiste = repertorio.some(
            m => m.titulo.trim().toLowerCase() === titulo.trim().toLowerCase()
        )
        let musicaId: string | number
        if (jaExiste) {
            musicaId = repertorio.find(
                m => m.titulo.trim().toLowerCase() === titulo.trim().toLowerCase()
            )!.id ?? titulo
        } else {
            const novaMusica: Musica = {
                id: gerarId(),
                titulo,
                autor: autor || undefined,
                createdAt: new Date().toISOString(),
            }
            setRepertorio(prev => [...prev, novaMusica])
            musicaId = novaMusica.id!
        }
        const vinculo: VinculoMusicaPlano = {
            musicaId,
            titulo,
            autor: autor || undefined,
            origemDeteccao: 'nova',
            confirmadoPor: 'professor',
            confirmadoEm: new Date().toISOString(),
        }
        vincularMusicaAoPlano(planoId, vinculo)
        setEstados(prev => ({ ...prev, [key(d)]: 'adicionada' }))
    }

    return (
        <div>
            <h3 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                <span className="text-base">🆕</span> Nova música detectada
                <span className="text-xs font-normal text-blue-500">— não encontrada no repertório</span>
            </h3>
            <div className="flex flex-col gap-3">
                {itens.map(d => {
                    const k = key(d)
                    const estado = estados[k] || 'pendente'

                    if (estado === 'adicionada') return (
                        <div key={k} className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
                            ✓ Adicionada ao repertório — <span className="font-medium">{d.tituloDetectado}</span>
                        </div>
                    )
                    if (estado === 'ignorada') return null
                    if (estado === 'revisar') return (
                        <div key={k} className="text-sm text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">
                            ⏸ Revisar depois — <span className="font-medium">{d.tituloDetectado}</span>
                        </div>
                    )

                    return (
                        <div key={k} className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex flex-col gap-2">
                            <p className="text-sm font-medium text-blue-900">
                                "{d.tituloDetectado}"
                                <span className="ml-1.5 font-normal text-xs text-blue-500">({d.origem})</span>
                            </p>
                            <input
                                type="text"
                                placeholder="Autor / compositor (opcional)"
                                className="text-sm border border-blue-300 rounded-lg px-2 py-1.5 bg-white"
                                value={autores[k] || ''}
                                onChange={e => setAutores(prev => ({ ...prev, [k]: e.target.value }))}
                            />
                            <div className="flex gap-2 flex-wrap">
                                <button onClick={() => adicionar(d)}
                                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                                    + Adicionar ao Repertório
                                </button>
                                <button onClick={() => setEstados(prev => ({ ...prev, [k]: 'revisar' }))}
                                    className="text-xs border border-blue-300 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100">
                                    Revisar depois
                                </button>
                                <button onClick={() => setEstados(prev => ({ ...prev, [k]: 'ignorada' }))}
                                    className="text-xs text-blue-400 hover:text-blue-600 underline">
                                    Ignorar
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ── Modal principal ───────────────────────────────────────────────────────────
export default function ModalMusicasDetectadas() {
    const {
        musicasDetectadas,
        limparMusicasDetectadas,
        showModalMusicas,
        setShowModalMusicas,
        planoSelecionado,
    } = usePlanosContext()

    if (!showModalMusicas || musicasDetectadas.length === 0) return null

    const planoId = planoSelecionado?.id ?? ''

    const encontradas = musicasDetectadas.filter(d => d.classificacao === 'encontrada')
    const ambiguas = musicasDetectadas.filter(d => d.classificacao === 'ambigua')
    const novas = musicasDetectadas.filter(d => d.classificacao === 'nova')

    function fechar() {
        setShowModalMusicas(false)
        limparMusicasDetectadas()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={e => { if (e.target === e.currentTarget) fechar() }}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90dvh] flex flex-col">
                {/* cabeçalho */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
                    <div>
                        <h2 className="text-base font-bold text-slate-800">🎵 Músicas detectadas neste plano</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {musicasDetectadas.length} {musicasDetectadas.length === 1 ? 'referência encontrada' : 'referências encontradas'} ao salvar
                        </p>
                    </div>
                    <button onClick={fechar}
                        className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
                </div>

                {/* corpo */}
                <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-5">
                    {!secaoVazia(encontradas) && (
                        <SecaoEncontradas itens={encontradas} planoId={planoId} />
                    )}
                    {!secaoVazia(ambiguas) && (
                        <SecaoAmbiguas itens={ambiguas} planoId={planoId} />
                    )}
                    {!secaoVazia(novas) && (
                        <SecaoNovas itens={novas} planoId={planoId} />
                    )}
                </div>

                {/* rodapé */}
                <div className="px-5 pb-5 pt-3 border-t border-slate-100">
                    <button onClick={fechar}
                        className="w-full border border-slate-200 text-slate-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    )
}
