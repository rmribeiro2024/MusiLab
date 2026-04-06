// src/components/ModuloPorTurmas.tsx
// Etapa 6 — Planejar por Turma
// Foco: "O que vou dar para esta turma na próxima aula?"

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import { usePlanejamentoTurmaContext } from '../contexts/PlanejamentoTurmaContext'
import { useRepertorioContext } from '../contexts/RepertorioContext'
import { usePlanosContext, normalizePlano } from '../contexts/PlanosContext'
import { useAplicacoesContext } from '../contexts/AplicacoesContext'
import type { TurmaSelecionada } from '../contexts/PlanejamentoTurmaContext'
import { showToast } from '../lib/toast'
import type { AnoLetivo, RegistroPosAula, Plano, Turma } from '../types'
import { gerarIdSeguro, sanitizar } from '../lib/utils'
import { classificarVivenciasPlano } from '../lib/classificarVivencias'
import FormularioAulaPlena from './FormularioAulaPlena'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toYMD(date: Date): string {
    return date.toISOString().slice(0, 10)
}

function formatDataCurta(ymd: string): string {
    const [, mm, dd] = ymd.split('-')
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
    return `${parseInt(dd)} ${meses[parseInt(mm) - 1]}`
}

function getNomeTurma(
    anoLetivoId: string | undefined,
    escolaId: string | undefined,
    segmentoId: string,
    turmaId: string,
    anosLetivos: AnoLetivo[]
): string {
    if (!anoLetivoId || !escolaId) return turmaId
    // eslint-disable-next-line eqeqeq
    const ano = anosLetivos.find(a => a.id == anoLetivoId)
    // eslint-disable-next-line eqeqeq
    const esc = ano?.escolas.find(e => e.id == escolaId)
    // eslint-disable-next-line eqeqeq
    const seg = esc?.segmentos.find(s => s.id == segmentoId)
    // eslint-disable-next-line eqeqeq
    const tur = seg?.turmas.find(t => t.id == turmaId)
    return [seg?.nome, tur?.nome].filter(Boolean).join(' › ') || turmaId
}

function getNomeEscola(
    anoLetivoId: string | undefined,
    escolaId: string | undefined,
    anosLetivos: AnoLetivo[]
): string {
    if (!anoLetivoId || !escolaId) return ''
    // eslint-disable-next-line eqeqeq
    const ano = anosLetivos.find(a => a.id == anoLetivoId)
    // eslint-disable-next-line eqeqeq
    return ano?.escolas.find(e => e.id == escolaId)?.nome ?? ''
}

// ─── Paleta de cores por escola (mesma de VisaoSemana) ───────────────────────

const ESCOLA_COLORS: { light: string; dark: string }[] = [
    { light: '#7c83d4', dark: '#bfc3f5' },
    { light: '#3b8fc2', dark: '#9dd5f0' },
    { light: '#2a9c70', dark: '#8edbbf' },
    { light: '#b8860e', dark: '#e6be6a' },
    { light: '#c0527a', dark: '#f0a8c3' },
    { light: '#7a5bbf', dark: '#c8b4f0' },
    { light: '#c94040', dark: '#f0a8a8' },
    { light: '#1a9090', dark: '#7dd8d8' },
]

function buildEscolaColorMap(anosLetivos: AnoLetivo[]): Record<string, { light: string; dark: string }> {
    const map: Record<string, { light: string; dark: string }> = {}
    let idx = 0
    for (const ano of anosLetivos) {
        for (const esc of (ano.escolas ?? [])) {
            const key = String(esc.id)
            if (!map[key]) {
                map[key] = ESCOLA_COLORS[idx % ESCOLA_COLORS.length]
                idx++
            }
        }
    }
    return map
}

// ─── Sub-componente: Lista completa de turmas ────────────────────────────────

interface ListaTurmasProps {
    turmaSelecionada: TurmaSelecionada | null
    onSelecionarTurma: (t: TurmaSelecionada) => void
    ymd: string
}

function ListaTurmas({ turmaSelecionada, onSelecionarTurma, ymd }: ListaTurmasProps) {
    const { anosLetivos } = useAnoLetivoContext()
    const { planejamentos, copiarPlanejamento } = usePlanejamentoTurmaContext()
    const [busca, setBusca] = useState('')
    const escolaColorMap = useMemo(() => buildEscolaColorMap(anosLetivos), [anosLetivos])

    // Drag-and-drop entre turmas
    type CopyConfirm = { srcPlanoId: string; srcNome: string; dstNome: string; dst: TurmaSelecionada }
    const [dragSrcTid, setDragSrcTid] = useState<string | null>(null)
    const [dragOverTid, setDragOverTid] = useState<string | null>(null)
    const [copyConfirm, setCopyConfirm] = useState<CopyConfirm | null>(null)

    // Accordion: null = todas abertas; Set = apenas as IDs no set abertas
    const [openEscolas, setOpenEscolas] = useState<Set<string> | null>(
        () => turmaSelecionada ? new Set([turmaSelecionada.escolaId]) : null
    )
    useEffect(() => {
        if (turmaSelecionada) {
            setOpenEscolas(new Set([turmaSelecionada.escolaId]))
        }
    }, [turmaSelecionada?.escolaId]) // eslint-disable-line react-hooks/exhaustive-deps

    // Turmas que têm pelo menos um planejamento salvo
    const turmasComPlanejamento = useMemo(() => {
        const s = new Set<string>()
        planejamentos.forEach(p => s.add(String(p.turmaId)))
        return s
    }, [planejamentos])


    // Grupos: escola → turmas
    const grupos = useMemo(() => {
        type TurmaItem = { key: string; nome: string; anoLetivoId: string; escolaId: string; segmentoId: string; turmaId: string }
        type Grupo = { escolaId: string; escolaNome: string; turmas: TurmaItem[] }
        const result: Grupo[] = []
        for (const ano of anosLetivos) {
            for (const esc of (ano.escolas ?? [])) {
                const turmas: TurmaItem[] = []
                for (const seg of (esc.segmentos ?? [])) {
                    for (const tur of (seg.turmas ?? [])) {
                        turmas.push({
                            key: `${ano.id}-${esc.id}-${seg.id}-${tur.id}`,
                            nome: [seg.nome, tur.nome].filter(Boolean).join(' › '),
                            anoLetivoId: String(ano.id),
                            escolaId: String(esc.id),
                            segmentoId: String(seg.id),
                            turmaId: String(tur.id),
                        })
                    }
                }
                if (turmas.length > 0) result.push({ escolaId: String(esc.id), escolaNome: esc.nome ?? '', turmas })
            }
        }
        return result
    }, [anosLetivos])

    const buscaNorm = busca.trim().toLowerCase()
    const gruposFiltrados = buscaNorm
        ? grupos.map(g => ({
            ...g,
            turmas: g.turmas.filter(t =>
                t.nome.toLowerCase().includes(buscaNorm) ||
                g.escolaNome.toLowerCase().includes(buscaNorm)
            ),
          })).filter(g => g.turmas.length > 0)
        : grupos


    return (
        <>
        <aside className="w-52 flex-shrink-0 flex flex-col gap-2">
            {/* Busca */}
            <div className="relative">
                <input
                    type="text"
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    placeholder="Buscar turma..."
                    className="w-full text-[12px] rounded-[8px] border border-[#E6EAF0] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-slate-700 dark:text-[#D1D5DB] placeholder:text-slate-400 dark:placeholder:text-[#6B7280] px-3 py-1.5 pr-7 outline-none focus:ring-1 focus:ring-indigo-400"
                />
                {busca && (
                    <button
                        onClick={() => setBusca('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[13px] leading-none"
                    >×</button>
                )}
            </div>

            {/* Lista agrupada */}
            <div className="v2-card rounded-[10px] border border-[#E6EAF0] dark:border-[#374151] overflow-hidden overflow-y-auto max-h-[calc(100vh-200px)]">
                {gruposFiltrados.length === 0 ? (
                    <div className="px-3 py-6 text-center text-[11px] text-slate-400 dark:text-[#6B7280]">
                        Nenhuma turma encontrada
                    </div>
                ) : gruposFiltrados.map(grupo => {
                    const cor = escolaColorMap[grupo.escolaId]
                    const estaAberta = busca.trim() ? true : (openEscolas === null || openEscolas.has(grupo.escolaId))
                    return (
                        <div key={grupo.escolaId}>
                            {/* Header escola — clicável para colapsar */}
                            <button
                                type="button"
                                onClick={() => setOpenEscolas(prev => {
                                    const allIds = gruposFiltrados.map(g => g.escolaId)
                                    const current = prev === null ? new Set(allIds) : new Set(prev)
                                    if (current.has(grupo.escolaId)) current.delete(grupo.escolaId)
                                    else current.add(grupo.escolaId)
                                    return current
                                })}
                                className="w-full flex items-center justify-between px-3 py-1.5 border-b border-[#E6EAF0] dark:border-[#374151]"
                            >
                                <span className="text-[10px] font-semibold uppercase tracking-[.5px] dark:hidden" style={cor ? { color: cor.light } : undefined}>{grupo.escolaNome}</span>
                                <span className="text-[10px] font-semibold uppercase tracking-[.5px] hidden dark:inline" style={cor ? { color: cor.dark } : undefined}>{grupo.escolaNome}</span>
                                <span className="text-[10px] text-slate-400" style={cor ? { color: estaAberta ? cor.light : '#9CA3AF' } : undefined}>{estaAberta ? '▾' : '▸'}</span>
                            </button>
                            {/* Turmas */}
                            {estaAberta && grupo.turmas.map(t => {
                                const isAtiva = turmaSelecionada
                                    ? turmaSelecionada.turmaId === t.turmaId && turmaSelecionada.escolaId === t.escolaId
                                    : false
                                const temPlano = turmasComPlanejamento.has(t.turmaId)
                                const isDragSrc  = dragSrcTid === t.turmaId
                                const isDragOver = dragOverTid === t.turmaId
                                return (
                                    <button
                                        key={t.key}
                                        draggable={temPlano}
                                        onClick={() => onSelecionarTurma({
                                            anoLetivoId: t.anoLetivoId,
                                            escolaId: t.escolaId,
                                            segmentoId: t.segmentoId,
                                            turmaId: t.turmaId,
                                        })}
                                        onDragStart={temPlano ? () => setDragSrcTid(t.turmaId) : undefined}
                                        onDragOver={e => {
                                            if (dragSrcTid && dragSrcTid !== t.turmaId) {
                                                e.preventDefault()
                                                setDragOverTid(t.turmaId)
                                            }
                                        }}
                                        onDragLeave={() => setDragOverTid(null)}
                                        onDrop={e => {
                                            e.preventDefault()
                                            if (!dragSrcTid || dragSrcTid === t.turmaId) { setDragOverTid(null); return }
                                            const srcPlanos = planejamentos
                                                .filter(p => String(p.turmaId) === dragSrcTid)
                                                .sort((a, b) => (b.atualizadoEm ?? b.criadoEm ?? '').localeCompare(a.atualizadoEm ?? a.criadoEm ?? ''))
                                            if (!srcPlanos.length) { setDragSrcTid(null); setDragOverTid(null); return }
                                            const srcNome = grupos.flatMap(g => g.turmas).find(x => x.turmaId === dragSrcTid)?.nome ?? dragSrcTid
                                            setCopyConfirm({
                                                srcPlanoId: srcPlanos[0].id,
                                                srcNome,
                                                dstNome: t.nome,
                                                dst: { anoLetivoId: t.anoLetivoId, escolaId: t.escolaId, segmentoId: t.segmentoId, turmaId: t.turmaId },
                                            })
                                            setDragSrcTid(null); setDragOverTid(null)
                                        }}
                                        onDragEnd={() => { setDragSrcTid(null); setDragOverTid(null) }}
                                        className={`w-full text-left px-3 py-2 transition-colors flex items-center gap-2 ${
                                            isDragOver
                                                ? 'ring-2 ring-inset ring-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                                                : isDragSrc
                                                ? 'opacity-40'
                                                : isAtiva
                                                ? 'bg-[#5B5FEA]/[0.09] dark:bg-[#5B5FEA]/[0.16]'
                                                : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                                        }`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className={`text-[12.5px] font-semibold leading-tight truncate ${
                                                isAtiva
                                                    ? 'text-indigo-700 dark:text-indigo-300'
                                                    : 'text-slate-700 dark:text-[#D1D5DB]'
                                            }`}>
                                                {t.nome}
                                            </div>
                                            {temPlano && (
                                                <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-[1px]">
                                                    ✓ Aula planejada
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )
                })}
            </div>
        </aside>

        {/* ── Modal de confirmação de cópia drag-and-drop ── */}
        {copyConfirm && (
            <div
                className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
                onClick={() => setCopyConfirm(null)}
            >
                <div
                    className="bg-white dark:bg-[#1F2937] rounded-2xl shadow-2xl p-6 max-w-sm w-full"
                    onClick={e => e.stopPropagation()}
                >
                    <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        Copiar planejamento?
                    </p>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                        O planejamento de <strong>{copyConfirm.srcNome}</strong> será copiado para <strong>{copyConfirm.dstNome}</strong>.
                    </p>
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => {
                                copiarPlanejamento(copyConfirm.srcPlanoId, copyConfirm.dst, ymd)
                                setCopyConfirm(null)
                            }}
                            className="w-full text-[13px] font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 transition"
                        >
                            Sim, copiar
                        </button>
                        <button
                            onClick={() => setCopyConfirm(null)}
                            className="w-full text-[13px] border border-[#E6EAF0] dark:border-[#374151] rounded-xl px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    )
}

// ─── Sub-componente: Estado vazio ─────────────────────────────────────────────

function EstadoVazio({ dataYmd }: { dataYmd: string }) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <svg className="w-8 h-8 mb-4 text-slate-300 dark:text-[#374151]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
            <p className="text-[14px] font-semibold text-slate-600 dark:text-[#9CA3AF] mb-1">
                Selecione uma turma
            </p>
            <p className="text-[12px] text-[#94A3B8] dark:text-[#4B5563]">
                {formatDataCurta(dataYmd)} · escolha uma turma ao lado para planejar
            </p>
        </div>
    )
}

// ─── Helper: resultado da aula → label + cor ─────────────────────────────────

function inferResultado(r: RegistroPosAula): { emoji: string; label: string; cor: string } {
    const s = r.statusAula ?? r.resultadoAula ?? r.proximaAulaOpcao ?? ''
    if (s === 'concluida' || s === 'bem' || s === 'funcionou')
        return { emoji: '✓', label: 'Concluída',  cor: 'text-emerald-600 dark:text-emerald-400' }
    if (s === 'revisao' || s === 'revisar-nova')
        return { emoji: '↻', label: 'Revisão',    cor: 'text-blue-600 dark:text-blue-400' }
    if (s === 'incompleta' || s === 'parcial' || s === 'revisar')
        return { emoji: '↩', label: 'Incompleta', cor: 'text-amber-600 dark:text-amber-400' }
    if (s === 'nao_houve' || s === 'nao' || s === 'nao_funcionou')
        return { emoji: '✗', label: 'Não houve',  cor: 'text-red-500 dark:text-red-400' }
    return { emoji: '·', label: 'Registrado', cor: 'text-slate-400 dark:text-[#6B7280]' }
}

function formatDataRegistro(ymd: string): string {
    if (!ymd) return ''
    const [, mm, dd] = ymd.split('-')
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
    return `${parseInt(dd)} ${meses[parseInt(mm) - 1]}`
}

// ─── Sub-componente: bloco "Aula anterior" ───────────────────────────────────

function BlocoAulaAnterior({ registro }: { registro: RegistroPosAula | null }) {
    if (!registro) {
        return (
            <div className="v2-card rounded-[10px] border border-[#E6EAF0] dark:border-[#374151] px-5 py-4">
                <span className="text-[10px] font-semibold uppercase tracking-[.7px] text-slate-500 dark:text-[#ACB3BF]">
                    Registros da aula anterior
                </span>
                <p className="text-[12.5px] text-slate-400 dark:text-[#6B7280] italic mt-3">
                    Nenhum registro encontrado para esta turma.
                </p>
            </div>
        )
    }

    const res       = inferResultado(registro)
    const dataLabel = formatDataRegistro(registro.dataAula ?? registro.dataRegistro ?? registro.data ?? '')

    // ── Campos sempre visíveis ──
    const encaminhamentos = (registro.encaminhamentos ?? []).filter(e => !e.concluido)
    const proximaAula     = registro.proximaAula?.trim()
    const temLembretes    = encaminhamentos.length > 0 || !!proximaAula
    const resumo          = registro.resumoAula?.trim()
    const comportamento   = registro.comportamento?.trim()
    const temAudio        = !!registro.audioNotaDeVoz
    const audioSrc        = temAudio
        ? `data:${registro.audioMime ?? 'audio/webm'};base64,${registro.audioNotaDeVoz}`
        : null
    const audioDurStr = registro.audioDuracao ? `${Math.floor(registro.audioDuracao)}s` : ''

    // ── Campos recolhidos ──
    const funcionouBem    = registro.funcionouBem?.trim()
    const fariadiferente    = (registro.fariadiferente || (registro as any).naoFuncionou)?.trim()
    const poderiaMelhorar = registro.poderiaMelhorar?.trim()
    const anotacoesGerais = registro.anotacoesGerais?.trim()
    const temDetalhes     = !!(funcionouBem || fariadiferente || poderiaMelhorar || anotacoesGerais || comportamento)

    return (
        <div className="v2-card rounded-[10px] border border-[#E6EAF0] dark:border-[#374151] overflow-hidden">

            {/* ── Cabeçalho ── */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#E6EAF0] dark:border-[#2D3748]">
                <span className="text-[10px] font-semibold uppercase tracking-[.7px] text-slate-500 dark:text-[#ACB3BF]">
                    Registros da aula anterior
                </span>
                <div className="flex items-center gap-2">
                    {dataLabel && (
                        <span className="text-[11px] text-[#94A3B8] dark:text-[#C9D1DB]">{dataLabel}</span>
                    )}
                    <span className={`text-[11px] font-semibold ${res.cor}`}>
                        {res.emoji} {res.label}
                    </span>
                </div>
            </div>

            {/* ── Corpo ── */}
            <div className="px-5 py-4 flex flex-col gap-3">

                {/* 📌 Meus lembretes da última aula */}
                {temLembretes && (
                    <div className="border-l-[1.5px] border-indigo-200 dark:border-indigo-800 pl-3 py-0.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[.6px] text-indigo-500 dark:text-indigo-300/60 mb-1.5">
                            📌 Meus lembretes da última aula
                        </p>
                        {encaminhamentos.length > 0 && (
                            <ul className="flex flex-col gap-1.5 mb-1">
                                {encaminhamentos.map(e => (
                                    <li key={e.id} className="flex items-start gap-2 text-[12.5px] text-slate-700 dark:text-[#D1D5DB]">
                                        <span className="mt-[5px] w-1 h-1 rounded-full bg-indigo-400 dark:bg-indigo-500 flex-shrink-0" />
                                        {e.texto}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {proximaAula && (
                            <p className="text-[12.5px] text-slate-700 dark:text-[#D1D5DB] leading-relaxed">{proximaAula}</p>
                        )}
                    </div>
                )}

                {/* O que foi realizado */}
                {resumo && (
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#8896A5] mb-1">
                            📝 O que foi realizado
                        </p>
                        <p className="text-[13px] text-slate-700 dark:text-[#D1D5DB] leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: sanitizar(resumo) }}
                        />
                    </div>
                )}

                {/* 🎤 Áudio — compacto, sempre visível */}
                {audioSrc && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#6B7280] shrink-0">
                            🎤 Áudio{audioDurStr ? ` · ${audioDurStr}` : ''}
                        </span>
                        <audio controls src={audioSrc}
                            className="flex-1 min-w-0 h-7"
                            style={{ colorScheme: 'light dark' }}
                        />
                    </div>
                )}

                {/* Campos de reflexão — sempre visíveis */}
                {temDetalhes && (
                    <div className="flex flex-col gap-3 pt-2 border-t border-[#E6EAF0] dark:border-[#2D3748]">
                        {comportamento && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#8896A5]">👥 Comportamento da turma:</span>
                                <span className="text-[12px] text-slate-700 dark:text-[#D1D5DB] italic">{comportamento}</span>
                            </div>
                        )}
                        {funcionouBem && (
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#8896A5] mb-1">⭐ O que funcionou</p>
                                <p className="text-[12.5px] text-slate-700 dark:text-[#D1D5DB] leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: sanitizar(funcionouBem) }}
                                />
                            </div>
                        )}
                        {fariadiferente && (
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#8896A5] mb-1">🔄 O que faria diferente</p>
                                <p className="text-[12.5px] text-slate-700 dark:text-[#D1D5DB] leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: sanitizar(fariadiferente) }}
                                />
                            </div>
                        )}
                        {poderiaMelhorar && (
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#8896A5] mb-1">💡 Poderia melhorar</p>
                                <p className="text-[12.5px] text-slate-700 dark:text-[#D1D5DB] leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: sanitizar(poderiaMelhorar) }}
                                />
                            </div>
                        )}
                        {anotacoesGerais && (
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#8896A5] mb-1">🗒 Anotações gerais</p>
                                <p className="text-[12.5px] text-slate-700 dark:text-[#D1D5DB] leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: sanitizar(anotacoesGerais) }}
                                />
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    )
}


// ─── Sub-componente: Formulário inline de planejamento ───────────────────────

type ModoForm = 'adaptar' | 'importar' | 'criar'

function FormPlanoTurma({
    modo,
    ultimoRegistro,
    onSalvar,
    onCancelar,
    initialPlanoOverride,
}: {
    modo: ModoForm
    ultimoRegistro: RegistroPosAula | null
    onSalvar: (plano: any, origemAula: 'banco' | 'adaptacao' | 'livre') => void
    onCancelar: () => void
    initialPlanoOverride?: any
}) {
    const { turmaSelecionada } = usePlanejamentoTurmaContext()
    const { planos } = usePlanosContext()
    const { anosLetivos } = useAnoLetivoContext()

    const turmaNome = useMemo(() => {
        if (!turmaSelecionada) return ''
        for (const ano of anosLetivos) {
            for (const escola of ano.escolas ?? []) {
                for (const seg of escola.segmentos ?? []) {
                    // eslint-disable-next-line eqeqeq
                    if (seg.id == turmaSelecionada.segmentoId) {
                        // eslint-disable-next-line eqeqeq
                        const t = (seg.turmas ?? []).find((t: Turma) => t.id == turmaSelecionada.turmaId)
                        if (t) return `${seg.nome} › ${t.nome}`
                    }
                }
            }
        }
        return ''
    }, [turmaSelecionada, anosLetivos])

    const initialPlano = useMemo(() => {
        // Override tem prioridade (edição de plano existente)
        if (initialPlanoOverride && Object.keys(initialPlanoOverride).length > 0) return initialPlanoOverride
        if (modo === 'adaptar' && ultimoRegistro) {
            const planoBase = planos.find(p =>
                (p.registrosPosAula ?? []).some(r => String(r.id) === String(ultimoRegistro.id))
            )
            return planoBase ? { ...planoBase, id: gerarIdSeguro() } : {}
        }
        return {}
    }, [modo, ultimoRegistro, planos, initialPlanoOverride])

    const editKey = initialPlanoOverride
        ? `fpt-edit-${(initialPlanoOverride as any).id ?? 'x'}`
        : `fpt-${turmaSelecionada?.turmaId ?? 'none'}-${modo}`

    return (
        <FormularioAulaPlena
            key={editKey}
            initialPlano={initialPlano}
            modo={modo}
            ultimoRegistro={ultimoRegistro}
            turmaNome={turmaNome}
            onSalvar={plano => {
                const origemAula: 'banco' | 'adaptacao' | 'livre' =
                    modo === 'adaptar' ? 'adaptacao' :
                    modo === 'importar' ? 'banco' : 'livre'
                onSalvar(plano, origemAula)
            }}
            onCancelar={onCancelar}
        />
    )
}

// ─── Sub-componente: Picker de aulas do banco ────────────────────────────────

function BancoPicker({ planos, onSelect, onCancelar }: {
    planos: Plano[]
    onSelect: (p: Plano) => void
    onCancelar: () => void
}) {
    const [busca, setBusca] = useState('')
    const filtrados = useMemo(() => {
        const q = busca.trim().toLowerCase()
        return planos
            .filter(p => {
                if (!q) return true
                const titulo = (p.titulo || p.objetivoGeral || '').toLowerCase()
                const escola = (p.escola || '').toLowerCase()
                return titulo.includes(q) || escola.includes(q)
            })
            .sort((a, b) => {
                const da = a.updatedAt ?? a.createdAt ?? ''
                const db = b.updatedAt ?? b.createdAt ?? ''
                return db.localeCompare(da)
            })
    }, [planos, busca])

    return (
        <div className="v2-card rounded-[10px] border border-[#E6EAF0] dark:border-[#374151] overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#E6EAF0] dark:border-[#374151] flex items-center justify-between flex-shrink-0">
                <p className="text-[10px] font-semibold uppercase tracking-[.7px] text-[#94A3B8] dark:text-[#6B7280]">
                    🏛 Escolher aula do banco
                </p>
                <button
                    onClick={onCancelar}
                    title="Cancelar"
                    className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#374151] transition text-base leading-none"
                >×</button>
            </div>
            {/* Busca */}
            <div className="px-4 py-2.5 border-b border-[#E6EAF0] dark:border-[#374151]">
                <input
                    type="text"
                    autoFocus
                    placeholder="Buscar por título ou escola…"
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    className="w-full text-[12.5px] px-3 py-1.5 rounded-lg border border-[#E6EAF0] dark:border-[#374151] bg-transparent text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition"
                />
            </div>
            {/* Lista */}
            <div className="flex flex-col divide-y divide-[#E6EAF0] dark:divide-[#374151] max-h-72 overflow-y-auto">
                {filtrados.length === 0 ? (
                    <p className="text-[12px] text-slate-400 text-center py-6 italic">
                        {busca ? 'Nenhuma aula encontrada' : 'Banco vazio'}
                    </p>
                ) : (
                    filtrados.map(p => (
                        <button
                            key={p.id}
                            onClick={() => onSelect(p)}
                            className="text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-[#273344] transition group"
                        >
                            <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                                {p.titulo || p.objetivoGeral || 'Sem título'}
                            </p>
                            {(p.escola || p.updatedAt) && (
                                <p className="text-[10.5px] text-slate-400 mt-0.5 truncate">
                                    {[p.escola, p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' }) : ''].filter(Boolean).join(' · ')}
                                </p>
                            )}
                        </button>
                    ))
                )}
            </div>
        </div>
    )
}

// ─── Sub-componente: Conteúdo da turma selecionada ───────────────────────────

function ConteudoTurma({ turmaSelecionada, dataPrevista, modoInicial, onModoInicialConsumed }: { turmaSelecionada: TurmaSelecionada; dataPrevista: string; modoInicial?: 'criar' | 'importar' | null; onModoInicialConsumed?: () => void }) {
    const { ultimoRegistroDaTurma, fecharForm, salvarPlanejamento, planejamentosDaTurma, editarPlanejamento, excluirPlanejamento } = usePlanejamentoTurmaContext()
    const { planos, setPlanos, adicionarPlanoAoBanco, setClasseNotif } = usePlanosContext()
    const { aplicacoes } = useAplicacoesContext()
    const { anosLetivos } = useAnoLetivoContext()

    // Aplicações do banco agendadas para esta turma+data específica
    const aplicacoesDaAula = useMemo(() =>
        aplicacoes.filter(a =>
            String(a.turmaId) === String(turmaSelecionada.turmaId) &&
            a.data === dataPrevista &&
            a.status !== 'cancelada'
        )
    , [aplicacoes, turmaSelecionada.turmaId, dataPrevista])

    // Resolve nome da escola a partir do contexto (para popular filtro no banco)
    const escolaNomeDaTurma = useMemo(() => {
        const ano = anosLetivos.find(a => String(a.id) === turmaSelecionada.anoLetivoId)
        return ano?.escolas.find((e: any) => String(e.id) === turmaSelecionada.escolaId)?.nome ?? ''
    }, [anosLetivos, turmaSelecionada])
    const [modoAtivo, setModoAtivo] = useState<ModoForm | null>(null)
    const [planoParaEditar, setPlanoParaEditar] = useState<any>(null)


    // Modo inicial vindo da Visão da Semana (ex: "Buscar no Banco")
    useEffect(() => {
        if (!modoInicial) return
        setModoAtivo(modoInicial)
        onModoInicialConsumed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const [pendingSave, setPendingSave] = useState<{ plano: any; origemAula: 'banco' | 'adaptacao' | 'livre' } | null>(null)

    // Garante que qualquer edição pendente de outro módulo seja descartada ao montar
    useEffect(() => { fecharForm() }, []) // eslint-disable-line

    const temUltimoRegistro = !!ultimoRegistroDaTurma
    const planejamentosDataAtual = planejamentosDaTurma.filter(p => p.dataPrevista === dataPrevista)
    const temPlanos = planejamentosDataAtual.length > 0
    const temAlgo = temPlanos || aplicacoesDaAula.length > 0  // planejamentos próprios OU do banco

    // Recebe o plano do form e abre dialog de destino
    const handleFormSalvar = (plano: any, origemAula: 'banco' | 'adaptacao' | 'livre') => {
        setPendingSave({ plano, origemAula })
    }

    // Efetiva o salvamento após escolha do professor
    const confirmarSalvar = (salvarNoBanco: boolean) => {
        if (!pendingSave) return
        const { plano, origemAula } = pendingSave
        salvarPlanejamento({
            oQuePretendoFazer: plano.objetivoGeral || plano.titulo || '',
            origemAula,
            dataPrevista,                                       // Bug 6: garante ✓ na visão da semana
            materiais: plano.materiais?.length ? plano.materiais : [],
            planosRelacionadosIds: [],
            planoData: plano,
        })
        if (salvarNoBanco) {
            const planoParaBanco = normalizePlano({
                ...plano,
                id: gerarIdSeguro(),
                escola: plano.escola || escolaNomeDaTurma,
            })
            // Salva no banco com detecção automática de músicas do repertório
            adicionarPlanoAoBanco(planoParaBanco)
            // Classificação CLASP + Orff + Conceitos via IA — abre o mesmo modal do banco de aulas
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY
            if (apiKey) {
                const newId    = String(planoParaBanco.id)
                const snapTitulo = planoParaBanco.titulo ?? ''
                classificarVivenciasPlano(planoParaBanco, apiKey)
                    .then(({ vivencias, meiosOrff, conceitos }) => {
                        if (!Object.values(vivencias).some(v => v > 0)) return
                        setPlanos(prev => prev.map(p =>
                            String(p.id) === newId
                                ? { ...p, vivenciasClassificadas: vivencias, orffMeios: meiosOrff }
                                : p
                        ))
                        // Dispara o mesmo modal de notificação do banco de aulas
                        setClasseNotif({ planoId: newId, titulo: snapTitulo, vivencias, meiosOrff, conceitos })
                    })
                    .catch(() => {/* silencioso */})
            }
            showToast('Salvo no banco de aulas ✅')
        }
        setPendingSave(null)
        setModoAtivo(null)
        setPlanoParaEditar(null)
    }

    const BotoesPlanejar = ({ onSelect }: { onSelect?: () => void } = {}) => (
        <div className="flex flex-col sm:flex-row gap-2">
            <button
                onClick={() => { setModoAtivo('adaptar'); onSelect?.() }}
                disabled={!temUltimoRegistro}
                className="flex items-center gap-2 px-4 py-3 sm:py-2 text-[12.5px] font-medium rounded-lg border border-[#E6EAF0] dark:border-[#374151] text-slate-500 dark:text-[#9CA3AF] hover:bg-slate-50 dark:hover:bg-[#273344] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
                🔄 <span>Adaptar da aula anterior</span>
            </button>
            <button
                onClick={() => { setModoAtivo('criar'); onSelect?.() }}
                className="flex items-center gap-2 px-4 py-3 sm:py-2 text-[12.5px] font-medium rounded-lg border border-[#E6EAF0] dark:border-[#374151] text-slate-500 dark:text-[#9CA3AF] hover:bg-slate-50 dark:hover:bg-[#273344] transition"
            >
                ✏️ <span>Nova aula</span>
            </button>
            <button
                onClick={() => { setModoAtivo('importar'); onSelect?.() }}
                className="flex items-center gap-2 px-4 py-3 sm:py-2 text-[12.5px] font-medium rounded-lg border border-[#E6EAF0] dark:border-[#374151] text-slate-500 dark:text-[#9CA3AF] hover:bg-slate-50 dark:hover:bg-[#273344] transition"
            >
                🏛 <span>Importar do banco de aulas</span>
            </button>
        </div>
    )

    return (
        <>
        <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* Bloco: Aula anterior */}
            <BlocoAulaAnterior registro={ultimoRegistroDaTurma} />

            {/* Bloco: Planejamento da próxima aula */}
            {/* Picker: escolher do banco (importar sem plano ainda selecionado) */}
            {modoAtivo === 'importar' && !planoParaEditar ? (
                <BancoPicker
                    planos={planos}
                    onSelect={p => setPlanoParaEditar(p)}
                    onCancelar={() => { setModoAtivo(null) }}
                />
            ) : modoAtivo ? (
                <FormPlanoTurma
                    key={`${turmaSelecionada.anoLetivoId}|${turmaSelecionada.turmaId}|${modoAtivo}|${(planoParaEditar as any)?.id ?? ''}`}
                    modo={modoAtivo}
                    ultimoRegistro={ultimoRegistroDaTurma}
                    onSalvar={handleFormSalvar}
                    onCancelar={() => { setModoAtivo(null); setPlanoParaEditar(null); fecharForm() }}
                    initialPlanoOverride={planoParaEditar ?? undefined}
                />
            ) : temAlgo ? (
                /* ── Aula planejada: exibição compacta (planejamentos próprios + agendamentos do banco) ── */
                <div className="v2-card rounded-[10px] border border-[#E6EAF0] dark:border-[#374151] overflow-hidden">
                    <div className="px-5 pt-4 pb-3 border-b border-[#E6EAF0] dark:border-[#374151] flex items-center gap-2">
                        <span className="text-[11px] text-emerald-500 font-bold">✓</span>
                        <p className="text-[10px] font-semibold uppercase tracking-[.7px] text-[#94A3B8] dark:text-[#6B7280] flex-1">
                            Aula planejada
                        </p>
                        {(planejamentosDataAtual.length + aplicacoesDaAula.length) > 1 && (
                            <span className="text-[10px] text-[#94a3b8] border border-[#E6EAF0] dark:border-[#374151] px-2 py-0.5 rounded-full">
                                {planejamentosDataAtual.length + aplicacoesDaAula.length}
                            </span>
                        )}
                    </div>
                    <div className="flex flex-col divide-y divide-[#E6EAF0] dark:divide-[#374151]">
                        {/* Planejamentos criados diretamente nesta turma */}
                        {planejamentosDataAtual.map(plano => (
                            <div
                                key={plano.id}
                                onClick={() => {
                                    editarPlanejamento(plano)
                                    setPlanoParaEditar(plano.planoData ?? {})
                                    setModoAtivo('criar')
                                }}
                                className="flex items-center justify-between gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#273344] transition group"
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {plano.dataPrevista && (
                                        <span className="text-[11px] text-[#94a3b8] flex-shrink-0">
                                            {new Date(plano.dataPrevista + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                                        </span>
                                    )}
                                    <span className="text-[12px] text-[#374151] dark:text-[#D1D5DB] truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                                        {plano.oQuePretendoFazer || plano.planoData?.titulo || 'Sem título'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-[10px] text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 dark:group-hover:text-indigo-500 transition">
                                        ver
                                    </span>
                                    <button
                                        onClick={e => {
                                            e.stopPropagation()
                                            if (window.confirm('Remover este planejamento?')) {
                                                excluirPlanejamento(plano.id)
                                            }
                                        }}
                                        className="text-[11px] text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition"
                                        title="Remover planejamento"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        ))}
                        {/* Agendamentos vindos do banco de planos */}
                        {aplicacoesDaAula.map(ap => {
                            const planoBase = planos.find(p => String(p.id) === String(ap.planoId))
                            return (
                                <div
                                    key={ap.id}
                                    onClick={() => { if (planoBase) { setPlanoParaEditar(planoBase); setModoAtivo('importar') } }}
                                    className={`flex items-center justify-between gap-3 px-5 py-3 transition group ${planoBase ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-[#273344]' : ''}`}
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="text-[10px] text-indigo-400 dark:text-indigo-500 shrink-0" title="Importada do banco">🏛</span>
                                        <span className={`text-[12px] text-[#374151] dark:text-[#D1D5DB] truncate ${planoBase ? 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition' : ''}`}>
                                            {planoBase?.titulo || planoBase?.objetivoGeral || 'Aula do banco'}
                                        </span>
                                    </div>
                                    {planoBase && (
                                        <span className="text-[10px] text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 dark:group-hover:text-indigo-500 transition flex-shrink-0">
                                            ver
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : (
                /* ── Sem planos: exibe os 3 botões ── */
                <div className="v2-card rounded-[10px] border border-[#E6EAF0] dark:border-[#374151] px-5 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[.7px] text-[#94A3B8] dark:text-[#6B7280] mb-3">
                        Planejar próxima aula
                    </p>
                    <BotoesPlanejar />
                </div>
            )}

        </div>

        {/* ── Dialog: Salvar como aula base? ── */}
        {pendingSave && (
            <div
                className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
                onClick={() => setPendingSave(null)}
            >
                <div
                    className="bg-white dark:bg-[#1F2937] rounded-2xl shadow-2xl p-6 max-w-sm w-full"
                    onClick={e => e.stopPropagation()}
                >
                    <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        Salvar como aula base?
                    </p>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                        Você pode manter este planejamento só para esta turma, ou também salvá-lo no banco de aulas para reutilizar com outras turmas.
                    </p>
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => confirmarSalvar(true)}
                            className="w-full text-[13px] font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 transition"
                        >
                            Sim, salvar no banco de aulas
                        </button>
                        <button
                            onClick={() => confirmarSalvar(false)}
                            className="w-full text-[13px] border border-[#E6EAF0] dark:border-[#374151] rounded-xl px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition"
                        >
                            Não, apenas para esta turma
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ModuloPorTurmas() {
    const { selecionarTurma, turmaSelecionada, dataNavegacao, setDataNavegacao, modoInicialNavegacao, setModoInicialNavegacao } = usePlanejamentoTurmaContext()
    const { setViewMode } = useRepertorioContext()

    const [voltarPara, setVoltarPara] = useState<string | null>(null)
    const [modoInicialLocal, setModoInicialLocal] = useState<'criar' | 'importar' | null>(null)
    const [mobileTela, setMobileTela] = useState<'lista' | 'detalhe'>('lista')

    // ymd: usa a data do card da Visão da Semana quando disponível, senão hoje
    const [ymd, setYmd] = useState(() => toYMD(new Date()))

    // Navegação vinda da Visão da Semana
    useEffect(() => {
        if (!dataNavegacao) return
        setVoltarPara('visaoSemana')
        setYmd(toYMD(dataNavegacao))   // ← captura a data real do card
        setDataNavegacao(null)
    }, [dataNavegacao, setDataNavegacao])

    // Modo inicial vindo da Visão da Semana (Buscar no Banco)
    useEffect(() => {
        if (!modoInicialNavegacao) return
        setModoInicialLocal(modoInicialNavegacao)
        setModoInicialNavegacao(null)
    }, [modoInicialNavegacao, setModoInicialNavegacao])

    const handleSelecionarTurma = useCallback((t: TurmaSelecionada) => {
        selecionarTurma(t)
        setMobileTela('detalhe')
    }, [selecionarTurma])

    return (
        <div className="flex flex-col gap-6">

            {/* Botão voltar — só aparece quando navegou da Visão da Semana */}
            {voltarPara === 'visaoSemana' && (
                <button
                    onClick={() => { setVoltarPara(null); setViewMode('visaoSemana') }}
                    className="self-start flex items-center gap-1.5 text-[12px] font-medium text-slate-500 dark:text-[#9CA3AF] hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                >
                    <span className="text-[14px] leading-none">←</span>
                    Visão da Semana
                </button>
            )}

            {/* Cabeçalho */}
            <div className="flex items-center gap-3">
                {/* Botão voltar mobile — aparece quando detalhe está aberto */}
                {mobileTela === 'detalhe' && (
                    <button
                        onClick={() => setMobileTela('lista')}
                        className="md:hidden flex items-center gap-1 text-[12px] font-medium text-slate-500 dark:text-[#9CA3AF] hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                    >
                        <span className="text-[14px] leading-none">←</span>
                        Turmas
                    </button>
                )}
                <div className={mobileTela === 'detalhe' ? 'hidden md:block' : ''}>
                    <h1 className="text-[17px] font-bold tracking-tight text-slate-800 dark:text-[#E5E7EB]">
                        Planejar por Turma
                    </h1>
                    <p className="text-[12.5px] text-slate-500 dark:text-[#9CA3AF] mt-1">
                        O que vou dar para esta turma na próxima aula?
                    </p>
                </div>
            </div>

            {/* Layout: lista + conteúdo */}
            <div className="flex gap-5 items-start">
                {/* Lista de turmas — escondida no mobile quando detalhe está aberto */}
                <div className={mobileTela === 'detalhe' ? 'hidden md:block' : 'flex-1 md:flex-none'}>
                    <ListaTurmas
                        turmaSelecionada={turmaSelecionada}
                        onSelecionarTurma={handleSelecionarTurma}
                        ymd={ymd}
                    />
                </div>

                {/* Conteúdo — escondido no mobile quando lista está aberta */}
                <div className={`flex-1 min-w-0 ${mobileTela === 'lista' ? 'hidden md:block' : ''}`}>
                    {turmaSelecionada
                        ? <ConteudoTurma key={turmaSelecionada.turmaId} turmaSelecionada={turmaSelecionada} dataPrevista={ymd} modoInicial={modoInicialLocal} onModoInicialConsumed={() => setModoInicialLocal(null)} />
                        : <EstadoVazio dataYmd={ymd} />
                    }
                </div>
            </div>

        </div>
    )
}
