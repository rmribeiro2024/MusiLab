// src/components/modals/ModalMusicasDetectadas.tsx
// Modal unificado pós-save: plano salvo + vivências CLASP + meios Orff + conceitos + músicas detectadas.

import React, { useState } from 'react'
import { usePlanosContext } from '../../contexts/PlanosContext'
import { useRepertorioContext } from '../../contexts/RepertorioContext'
import { getConceptColor } from '../../lib/utils'
import type { MusicaDetectada } from '../../lib/detectarMusicas'
import type { Musica, VinculoMusicaPlano } from '../../types'

// ── helpers ──────────────────────────────────────────────────────────────────
function gerarId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ── Seção: Encontradas ────────────────────────────────────────────────────────
function SecaoEncontradas({ itens, planoId }: { itens: MusicaDetectada[]; planoId: string | number }) {
    const { vincularMusicaAoPlano, desvincularMusicaDoPlano } = usePlanosContext()
    const [desfeitos, setDesfeitos] = useState<Set<string>>(new Set())

    function idKey(d: MusicaDetectada) { return String(d.musica?.id ?? d.tituloDetectado) }

    function desfazer(d: MusicaDetectada) {
        desvincularMusicaDoPlano(planoId, d.musica?.id ?? d.tituloDetectado)
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
            <p className="text-[11px] font-bold tracking-[0.07em] uppercase text-emerald-600 mb-2">
                Já no repertório <span className="font-normal normal-case opacity-70">— vinculadas automaticamente</span>
            </p>
            <div className="flex flex-col gap-1.5">
                {itens.map(d => {
                    const key = idKey(d)
                    const desfeito = desfeitos.has(key)
                    return (
                        <div key={key}
                            className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-[13px] border
                                ${desfeito ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-emerald-50 border-emerald-100 text-emerald-900'}`}>
                            <span className="flex-1 min-w-0 truncate">
                                <span className="font-medium">{d.musica?.titulo}</span>
                                {d.musica?.autor && <span className="ml-1.5 text-emerald-600 text-xs">· {d.musica.autor}</span>}
                                <span className="ml-1.5 text-[11px] opacity-50">({d.origem})</span>
                            </span>
                            {desfeito
                                ? <button onClick={() => revincular(d)} className="text-[11px] text-slate-400 hover:text-slate-600 underline shrink-0">Revincular</button>
                                : <button onClick={() => desfazer(d)} className="text-[11px] text-emerald-600 hover:text-emerald-800 underline shrink-0">Desfazer</button>
                            }
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ── Seção: Ambíguas ───────────────────────────────────────────────────────────
function SecaoAmbiguas({ itens, planoId }: { itens: MusicaDetectada[]; planoId: string | number }) {
    const { vincularMusicaAoPlano } = usePlanosContext()
    const [escolhas, setEscolhas] = useState<Record<string, string>>({})
    const [ignorados, setIgnorados] = useState<Set<string>>(new Set())
    const [vinculados, setVinculados] = useState<Set<string>>(new Set())

    function key(d: MusicaDetectada) { return d.tituloDetectado }

    function vincular(d: MusicaDetectada) {
        const escolhaId = escolhas[key(d)]
        if (!escolhaId) return
        const musica = (d.candidatas || []).find(m => String(m.id ?? m.titulo) === escolhaId)
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
            <p className="text-[11px] font-bold tracking-[0.07em] uppercase text-amber-600 mb-2">
                Correspondência ambígua <span className="font-normal normal-case opacity-70">— escolha a música correta</span>
            </p>
            <div className="flex flex-col gap-2">
                {itens.map(d => {
                    const k = key(d)
                    if (ignorados.has(k)) return null
                    if (vinculados.has(k)) return (
                        <div key={k} className="text-[13px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl">
                            ✓ Vinculada — <span className="font-medium">{escolhas[k] && (d.candidatas || []).find(m => String(m.id ?? m.titulo) === escolhas[k])?.titulo}</span>
                        </div>
                    )
                    return (
                        <div key={k} className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 flex flex-col gap-2">
                            <p className="text-[12px] text-amber-700">
                                Citada em <span className="font-semibold">{d.origem}</span> como "{d.tituloDetectado}". Qual música é essa?
                            </p>
                            <select className="text-sm border border-amber-200 rounded-lg px-2 py-1.5 bg-white"
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
                                <button onClick={() => vincular(d)} disabled={!escolhas[k]}
                                    className="text-xs bg-amber-600 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700">Vincular</button>
                                <button onClick={() => setIgnorados(prev => new Set([...prev, k]))}
                                    className="text-xs text-amber-500 hover:text-amber-700 underline">Ignorar</button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ── Seção: Novas ──────────────────────────────────────────────────────────────
function SecaoNovas({ itens, planoId }: { itens: MusicaDetectada[]; planoId: string | number }) {
    const { vincularMusicaAoPlano } = usePlanosContext()
    const { repertorio, setRepertorio } = useRepertorioContext()
    const [estados, setEstados] = useState<Record<string, 'pendente' | 'adicionada' | 'ignorada' | 'revisar'>>({})
    const [autores, setAutores] = useState<Record<string, string>>({})

    function key(d: MusicaDetectada) { return d.tituloDetectado }

    function adicionar(d: MusicaDetectada) {
        const titulo = d.tituloDetectado
        const autor = (autores[key(d)] || '').trim()
        const jaExiste = repertorio.some(m => m.titulo.trim().toLowerCase() === titulo.trim().toLowerCase())
        let musicaId: string | number
        if (jaExiste) {
            musicaId = repertorio.find(m => m.titulo.trim().toLowerCase() === titulo.trim().toLowerCase())!.id ?? titulo
        } else {
            const novaMusica: Musica = { id: gerarId(), titulo, autor: autor || undefined, createdAt: new Date().toISOString() }
            setRepertorio(prev => [...prev, novaMusica])
            musicaId = novaMusica.id!
        }
        vincularMusicaAoPlano(planoId, {
            musicaId, titulo, autor: autor || undefined,
            origemDeteccao: 'nova', confirmadoPor: 'professor', confirmadoEm: new Date().toISOString(),
        })
        setEstados(prev => ({ ...prev, [key(d)]: 'adicionada' }))
    }

    return (
        <div>
            <p className="text-[11px] font-bold tracking-[0.07em] uppercase text-blue-600 mb-2">
                Nova música detectada <span className="font-normal normal-case opacity-70">— não encontrada no repertório</span>
            </p>
            <div className="flex flex-col gap-2">
                {itens.map(d => {
                    const k = key(d)
                    const estado = estados[k] || 'pendente'
                    if (estado === 'adicionada') return (
                        <div key={k} className="text-[13px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl">
                            ✓ Adicionada ao repertório — <span className="font-medium">{d.tituloDetectado}</span>
                        </div>
                    )
                    if (estado === 'ignorada') return null
                    if (estado === 'revisar') return (
                        <div key={k} className="text-[13px] text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                            Revisar depois — <span className="font-medium">{d.tituloDetectado}</span>
                        </div>
                    )
                    return (
                        <div key={k} className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 flex flex-col gap-2">
                            <p className="text-[13px] font-medium text-blue-900">
                                "{d.tituloDetectado}"
                                <span className="ml-1.5 font-normal text-[11px] text-blue-400">({d.origem})</span>
                            </p>
                            <input type="text" placeholder="Autor / compositor (opcional)"
                                className="text-sm border border-blue-200 rounded-lg px-2 py-1.5 bg-white"
                                value={autores[k] || ''}
                                onChange={e => setAutores(prev => ({ ...prev, [k]: e.target.value }))} />
                            <div className="flex gap-2 flex-wrap">
                                <button onClick={() => adicionar(d)} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">+ Adicionar ao Repertório</button>
                                <button onClick={() => setEstados(prev => ({ ...prev, [k]: 'revisar' }))} className="text-xs border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50">Revisar depois</button>
                                <button onClick={() => setEstados(prev => ({ ...prev, [k]: 'ignorada' }))} className="text-xs text-blue-400 hover:text-blue-600 underline">Ignorar</button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ── Props do modal unificado ──────────────────────────────────────────────────
interface ModalSalvoUnificadoProps {
    classeNotif?: {
        planoId: string
        titulo: string
        vivencias: Record<string, number>
        meiosOrff: Record<string, boolean>
        conceitos: string[]
    } | null
    onFecharNotif?: () => void
    onAplicarConceitos?: (conceitos: string[]) => void
    onAplicarClassificacao?: (vivencias: Record<string, number>, meiosOrff: Record<string, boolean>) => void
}

// ── Modal principal unificado ─────────────────────────────────────────────────
export default function ModalMusicasDetectadas({ classeNotif, onFecharNotif, onAplicarConceitos, onAplicarClassificacao }: ModalSalvoUnificadoProps) {
    const {
        musicasDetectadas,
        limparMusicasDetectadas,
        showModalMusicas,
        setShowModalMusicas,
        planoSelecionado,
    } = usePlanosContext()

    const [draftConceitos, setDraftConceitos] = React.useState<string[]>([])
    const [draftVivencias, setDraftVivencias] = React.useState<Record<string, number>>({})
    const [draftMeios, setDraftMeios] = React.useState<Record<string, boolean>>({})

    React.useEffect(() => {
        if (classeNotif) {
            setDraftConceitos(classeNotif.conceitos ?? [])
            setDraftVivencias(classeNotif.vivencias ?? {})
            setDraftMeios(classeNotif.meiosOrff ?? {})
        }
    }, [classeNotif])

    const planoId = planoSelecionado?.id ?? classeNotif?.planoId ?? ''
    const encontradas = musicasDetectadas.filter(d => d.classificacao === 'encontrada')
    const ambiguas    = musicasDetectadas.filter(d => d.classificacao === 'ambigua')
    const novas       = musicasDetectadas.filter(d => d.classificacao === 'nova')

    // Só exibe o modal de musicas quando há ação necessaria (ambiguas ou novas)
    // "encontradas" sao vinculadas automaticamente — sem necessidade de confirmar
    const temMusicas = showModalMusicas && (ambiguas.length > 0 || novas.length > 0)
    const temClasseNotif = !!classeNotif

    if (!temMusicas && !temClasseNotif) return null

    const CLASP_MAP: Record<string, { label: string; dot: string; bg: string; border: string; text: string }> = {
        tecnica:     { label: 'Técnica',           dot: '#f472b6', bg: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.25)', text: '#ec4899' },
        performance: { label: 'Performance',       dot: '#fb923c', bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.25)',  text: '#f97316' },
        apreciacao:  { label: 'Apreciação',        dot: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)',  text: '#10b981' },
        criacao:     { label: 'Criação',           dot: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)', text: '#8b5cf6' },
        teoria:      { label: 'Teoria e história', dot: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)',  text: '#3b82f6' },
    }
    const ORFF_MAP: Record<string, { label: string; cor: string }> = {
        fala:         { label: 'Fala',         cor: '#e879f9' },
        canto:        { label: 'Canto',        cor: '#34d399' },
        movimento:    { label: 'Movimento',    cor: '#fbbf24' },
        instrumental: { label: 'Instrumental', cor: '#60a5fa' },
    }

    function fechar() {
        if (temMusicas) { setShowModalMusicas(false); limparMusicasDetectadas() }
        if (temClasseNotif && onFecharNotif) onFecharNotif()
    }

    function aplicar() {
        if (onAplicarConceitos && draftConceitos.length > 0) onAplicarConceitos(draftConceitos)
        if (onAplicarClassificacao) onAplicarClassificacao(draftVivencias, draftMeios)
        if (temMusicas) { setShowModalMusicas(false); limparMusicasDetectadas() }
        if (temClasseNotif && onFecharNotif) onFecharNotif()
    }

    function toggleVivencia(key: string) {
        setDraftVivencias(prev => ({ ...prev, [key]: (prev[key] ?? 0) > 0 ? 0 : 1 }))
    }

    function toggleMeio(key: string) {
        setDraftMeios(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const temClassificacao = temClasseNotif

    const ativasClasp = Object.entries(draftVivencias).filter(([, v]) => v > 0)
    const meiosPresentes = Object.entries(draftMeios).filter(([, v]) => v === true)

    const titulo = classeNotif?.titulo ?? planoSelecionado?.titulo ?? ''

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={e => { if (e.target === e.currentTarget) fechar() }}>
            <div className="bg-white dark:bg-[#1F2937] rounded-2xl shadow-2xl w-full max-w-md max-h-[90dvh] flex flex-col border border-slate-100 dark:border-[#374151]">

                {/* Header */}
                <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-slate-100 dark:border-[#374151]">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[14px]"
                        style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', color: '#10b981' }}>
                        ✓
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold text-slate-900 dark:text-[#E5E7EB]">Plano salvo</div>
                        {titulo && <div className="text-[12px] text-slate-400 dark:text-[#6B7280] truncate mt-0.5">{titulo}</div>}
                    </div>
                    <button onClick={fechar}
                        className="text-slate-300 dark:text-[#4B5563] hover:text-slate-500 text-xl leading-none bg-transparent border-none cursor-pointer shrink-0">
                        ×
                    </button>
                </div>

                {/* Corpo rolável */}
                <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-5">

                    {/* Vivências CLASP — todas as opções, togláveis */}
                    {temClassificacao && (
                        <div>
                            <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-slate-400 dark:text-[#6B7280] mb-2">Vivências</p>
                            <div className="flex flex-wrap gap-1.5">
                                {Object.entries(CLASP_MAP).map(([key, c]) => {
                                    const ativo = (draftVivencias[key] ?? 0) > 0
                                    return (
                                        <button key={key} type="button" onClick={() => toggleVivencia(key)}
                                            className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full transition-opacity cursor-pointer border-none"
                                            style={ativo
                                                ? { color: c.text, background: c.bg, border: `1px solid ${c.border}` }
                                                : { color: '#94a3b8', background: 'transparent', border: '1px solid #e2e8f0' }}>
                                            <div className="w-1.5 h-1.5 rounded-full shrink-0"
                                                style={{ background: ativo ? c.dot : '#cbd5e1' }} />
                                            {c.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Meios Orff — todos, togláveis */}
                    {temClassificacao && (
                        <div>
                            <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-slate-400 dark:text-[#6B7280] mb-2">Meios expressivos</p>
                            <div className="flex flex-wrap gap-1.5">
                                {Object.entries(ORFF_MAP).map(([key, m]) => {
                                    const ativo = draftMeios[key] === true
                                    return (
                                        <button key={key} type="button" onClick={() => toggleMeio(key)}
                                            className="text-[12px] px-2.5 py-1 rounded-full font-medium transition-opacity cursor-pointer border-none"
                                            style={ativo
                                                ? { color: m.cor, background: `${m.cor}18`, border: `1px solid ${m.cor}40` }
                                                : { color: '#94a3b8', background: 'transparent', border: '1px solid #e2e8f0' }}>
                                            {m.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Conceitos musicais */}
                    {draftConceitos.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-slate-400 dark:text-[#6B7280] mb-2">Conceitos musicais</p>
                            <div className="flex flex-wrap gap-1.5">
                                {draftConceitos.map((c, i) => {
                                    const col = getConceptColor(c)
                                    return (
                                        <span key={i} className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-full"
                                            style={{ color: col.text, background: col.bg, border: `1px solid ${col.border}` }}>
                                            {c}
                                            <button type="button"
                                                onClick={() => setDraftConceitos(prev => prev.filter((_, j) => j !== i))}
                                                style={{ color: col.text, opacity: 0.5 }}
                                                className="hover:opacity-100 transition-opacity leading-none bg-transparent border-none cursor-pointer p-0 ml-0.5">×</button>
                                        </span>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Divisor se tiver músicas + dados de classificação */}
                    {temMusicas && (ativasClasp.length > 0 || meiosPresentes.length > 0 || draftConceitos.length > 0) && (
                        <div className="border-t border-slate-100 dark:border-[#374151]" />
                    )}

                    {/* Músicas detectadas — apenas acoes necessarias */}
                    {temMusicas && (
                        <>
                            <div>
                                <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-slate-400 dark:text-[#6B7280] mb-1">
                                    Músicas detectadas
                                    <span className="ml-1.5 font-normal normal-case text-slate-400">
                                        — {ambiguas.length + novas.length} {(ambiguas.length + novas.length) === 1 ? 'referência' : 'referências'}
                                    </span>
                                </p>
                            </div>
                            {ambiguas.length > 0 && <SecaoAmbiguas itens={ambiguas} planoId={planoId} />}
                            {novas.length > 0    && <SecaoNovas    itens={novas}    planoId={planoId} />}
                        </>
                    )}
                </div>

                {/* Rodapé */}
                <div className="px-5 pb-5 pt-3 border-t border-slate-100 dark:border-[#374151] flex gap-2">
                    <button onClick={fechar}
                        className="flex-1 py-2.5 text-[13px] text-slate-500 dark:text-[#9CA3AF] bg-transparent border border-slate-200 dark:border-[#374151] rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors font-medium">
                        {draftConceitos.length > 0 ? 'Ignorar' : 'Fechar'}
                    </button>
                    {temClassificacao && (
                        <button onClick={aplicar}
                            className="flex-[2] py-2.5 text-[13px] font-semibold text-white bg-indigo-600 border-none rounded-xl cursor-pointer hover:bg-indigo-700 transition-colors">
                            Salvar classificação
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
