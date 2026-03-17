// src/components/ModuloPorTurmas.tsx
// Etapa 6 — Planejar por Turma
// Foco: "O que vou dar para esta turma na próxima aula?"

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useCalendarioContext } from '../contexts/CalendarioContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import { usePlanejamentoTurmaContext } from '../contexts/PlanejamentoTurmaContext'
import { useRepertorioContext } from '../contexts/RepertorioContext'
import { usePlanosContext } from '../contexts/PlanosContext'
import type { TurmaSelecionada } from '../contexts/PlanejamentoTurmaContext'
import { showToast } from '../lib/toast'
import type { AnoLetivo, RegistroPosAula, Plano, AtividadePlanejamentoTurma } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMondayOf(date: Date): Date {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const day = d.getDay()
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
    return d
}

function addDays(date: Date, n: number): Date {
    const d = new Date(date)
    d.setDate(d.getDate() + n)
    return d
}

function toYMD(date: Date): string {
    return date.toISOString().slice(0, 10)
}

function formatDataCurta(ymd: string): string {
    const [, mm, dd] = ymd.split('-')
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
    return `${parseInt(dd)} ${meses[parseInt(mm) - 1]}`
}

function getDiaSemana(date: Date): string {
    const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
    return dias[date.getDay()]
}

// Avança apenas para dias úteis (Seg–Sex)
function stepDiaUtil(date: Date, dir: 1 | -1): Date {
    let d = addDays(date, dir)
    while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, dir)
    return d
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

// ─── Sub-componente: Seletor de turma (sidebar compacta) ─────────────────────

interface SeletorProps {
    dataSelecionada: Date
    onDataChange: (d: Date) => void
    turmaSelecionada: TurmaSelecionada | null
    onSelecionarTurma: (t: TurmaSelecionada) => void
}

function SeletorTurma({ dataSelecionada, onDataChange, turmaSelecionada, onSelecionarTurma }: SeletorProps) {
    const { obterTurmasDoDia } = useCalendarioContext()
    const { anosLetivos } = useAnoLetivoContext()
    const { planejamentos, copiarPlanejamento } = usePlanejamentoTurmaContext()
    const escolaColorMap = useMemo(() => buildEscolaColorMap(anosLetivos), [anosLetivos])

    // ── Drag-drop: copiar planejamento entre turmas ──
    const [dragSrcId, setDragSrcId] = useState<string | null>(null)
    const [dragOverId, setDragOverId] = useState<string | null>(null)
    type CopyConfirm = { srcPlanoId: string; srcNome: string; dst: TurmaSelecionada; dstNome: string }
    const [copyConfirm, setCopyConfirm] = useState<CopyConfirm | null>(null)

    const handleDrop = useCallback((e: React.DragEvent, dstAula: ReturnType<typeof obterTurmasDoDia>[number]) => {
        e.preventDefault()
        if (!dragSrcId || dragSrcId === String(dstAula.turmaId)) { setDragOverId(null); return }
        const srcPlanos = planejamentos.filter(p => String(p.turmaId) === dragSrcId)
        if (srcPlanos.length === 0) { setDragSrcId(null); setDragOverId(null); return }
        const ymd = toYMD(dataSelecionada)
        const aulasDoDia = obterTurmasDoDia(ymd)
        const srcAula = aulasDoDia.find(a => String(a.turmaId) === dragSrcId)
        const srcNome = srcAula ? getNomeTurma(srcAula.anoLetivoId, srcAula.escolaId, srcAula.segmentoId, srcAula.turmaId, anosLetivos) : dragSrcId
        const dstNome = getNomeTurma(dstAula.anoLetivoId, dstAula.escolaId, dstAula.segmentoId, dstAula.turmaId, anosLetivos)
        setCopyConfirm({
            srcPlanoId: srcPlanos[0].id,
            srcNome,
            dst: { anoLetivoId: String(dstAula.anoLetivoId ?? ''), escolaId: String(dstAula.escolaId ?? ''), segmentoId: String(dstAula.segmentoId), turmaId: String(dstAula.turmaId) },
            dstNome,
        })
        setDragSrcId(null)
        setDragOverId(null)
    }, [dragSrcId, planejamentos, dataSelecionada, obterTurmasDoDia, anosLetivos])

    const ymd = toYMD(dataSelecionada)
    const aulasDoDia = useMemo(
        () => obterTurmasDoDia(ymd).sort((a, b) => (a.horario ?? '').localeCompare(b.horario ?? '')),
        [ymd, obterTurmasDoDia]
    )

    const diaNome  = getDiaSemana(dataSelecionada)
    const diaNum   = dataSelecionada.getDate()
    const mesNomes = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
    const mesNome  = mesNomes[dataSelecionada.getMonth()]

    return (
    <>
        <aside className="w-52 flex-shrink-0 flex flex-col gap-3">

            {/* ── Navegação de data ── */}
            <div className="v2-card rounded-[10px] border border-[#E6EAF0] dark:border-[#374151] overflow-hidden">
                {/* Cabeçalho data */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#E6EAF0] dark:border-[#374151]">
                    <button
                        onClick={() => onDataChange(stepDiaUtil(dataSelecionada, -1))}
                        className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#374151] transition text-sm"
                    >‹</button>

                    <div className="text-center">
                        <div className="text-[10px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#6B7280]">
                            {diaNome}
                        </div>
                        <div className="text-[18px] font-bold leading-tight text-slate-800 dark:text-[#E5E7EB]">
                            {diaNum}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-[#6B7280]">{mesNome}</div>
                    </div>

                    <button
                        onClick={() => onDataChange(stepDiaUtil(dataSelecionada, 1))}
                        className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#374151] transition text-sm"
                    >›</button>
                </div>

                {/* Lista de turmas do dia */}
                <div className="py-1">
                    {aulasDoDia.length === 0 ? (
                        <div className="px-3 py-4 text-center text-[11px] text-slate-400 dark:text-[#6B7280]">
                            Nenhuma turma neste dia
                        </div>
                    ) : (
                        aulasDoDia.map((aula, i) => {
                            const nome      = getNomeTurma(aula.anoLetivoId, aula.escolaId, aula.segmentoId, aula.turmaId, anosLetivos)
                            const escola    = getNomeEscola(aula.anoLetivoId, aula.escolaId, anosLetivos)
                            const escolaCor = escolaColorMap[String(aula.escolaId ?? '')]
                            const isAtiva   = turmaSelecionada
                                // eslint-disable-next-line eqeqeq
                                ? String(turmaSelecionada.turmaId) == String(aula.turmaId)
                                : false
                            const temPlano  = planejamentos.some(p => String(p.turmaId) === String(aula.turmaId))
                            const isDragSrc = dragSrcId === String(aula.turmaId)
                            const isDragOver = dragOverId === String(aula.turmaId)

                            return (
                                <button
                                    key={`${aula.turmaId}-${i}`}
                                    draggable={temPlano}
                                    onClick={() => onSelecionarTurma({
                                        anoLetivoId: String(aula.anoLetivoId ?? ''),
                                        escolaId:    String(aula.escolaId ?? ''),
                                        segmentoId:  String(aula.segmentoId),
                                        turmaId:     String(aula.turmaId),
                                    })}
                                    onDragStart={e => { e.dataTransfer.effectAllowed = 'copy'; setDragSrcId(String(aula.turmaId)) }}
                                    onDragOver={e => { if (dragSrcId && dragSrcId !== String(aula.turmaId)) { e.preventDefault(); setDragOverId(String(aula.turmaId)) } }}
                                    onDragLeave={() => setDragOverId(null)}
                                    onDrop={e => handleDrop(e, aula)}
                                    onDragEnd={() => { setDragSrcId(null); setDragOverId(null) }}
                                    style={escolaCor
                                        ? { '--escola-l': escolaCor.light, '--escola-d': escolaCor.dark } as React.CSSProperties
                                        : undefined}
                                    className={`w-full text-left px-3 py-2 transition-all ${
                                        isDragOver
                                            ? 'bg-indigo-50 dark:bg-indigo-500/20 ring-1 ring-indigo-300 dark:ring-indigo-500/40'
                                            : isDragSrc
                                            ? 'opacity-50'
                                            : isAtiva
                                            ? 'bg-[#5B5FEA]/[0.09] dark:bg-[#5B5FEA]/[0.16]'
                                            : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                                    }`}
                                >
                                    <div className={`flex items-center gap-1 text-[12.5px] font-semibold leading-tight ${
                                        isAtiva
                                            ? 'text-indigo-700 dark:text-indigo-300'
                                            : 'text-slate-700 dark:text-[#D1D5DB]'
                                    }`}>
                                        <span className="truncate flex-1">{nome}</span>
                                        {temPlano && <span title="Tem planejamento — arraste para copiar" className="text-[9px] text-emerald-500 shrink-0">✓</span>}
                                    </div>
                                    {escola && (
                                        <div className="escola-label text-[10px] font-medium truncate mt-[1px]">
                                            {escola}
                                        </div>
                                    )}
                                    {aula.horario && (
                                        <div className="text-[10px] text-slate-500 dark:text-[#C1C8D4] mt-[1px]">
                                            {aula.horario.replace(':','h').replace(/h00$/, 'h')}
                                        </div>
                                    )}
                                </button>
                            )
                        })
                    )}
                </div>
            </div>

            {/* ── Atalho: semana atual ── */}
            <button
                onClick={() => {
                    const seg = getMondayOf(new Date())
                    const hoje = new Date(); hoje.setHours(0,0,0,0)
                    // Se hoje for útil, vai para hoje; senão vai para segunda
                    const target = (hoje.getDay() >= 1 && hoje.getDay() <= 5) ? hoje : seg
                    onDataChange(target)
                }}
                className="text-[11px] text-center text-slate-400 dark:text-[#6B7280] hover:text-indigo-500 dark:hover:text-indigo-400 transition"
            >
                ir para hoje
            </button>
        </aside>

        {/* ── Modal confirmação: copiar planejamento ── */}
        {copyConfirm && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setCopyConfirm(null)}>
                <div className="bg-white dark:bg-[#1F2937] rounded-2xl shadow-2xl p-5 max-w-xs w-full" onClick={e => e.stopPropagation()}>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Copiar planejamento?</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        Copiar o planejamento de <strong className="text-slate-700 dark:text-slate-200">{copyConfirm.srcNome}</strong> para <strong className="text-slate-700 dark:text-slate-200">{copyConfirm.dstNome}</strong>?
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCopyConfirm(null)}
                            className="flex-1 text-sm border border-slate-200 dark:border-[#374151] rounded-xl px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition"
                        >Cancelar</button>
                        <button
                            onClick={() => {
                                copiarPlanejamento(copyConfirm.srcPlanoId, copyConfirm.dst)
                                showToast(`Planejamento copiado para ${copyConfirm.dstNome} ✅`)
                                setCopyConfirm(null)
                            }}
                            className="flex-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3 py-2 font-medium transition"
                        >Copiar</button>
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
    const [expandido, setExpandido] = useState(false)

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
    const naoFuncionou    = registro.naoFuncionou?.trim()
    const poderiaMelhorar = registro.poderiaMelhorar?.trim()
    const anotacoesGerais = registro.anotacoesGerais?.trim()
    const temDetalhes     = !!(funcionouBem || naoFuncionou || poderiaMelhorar || anotacoesGerais || comportamento)

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
                            O que foi realizado
                        </p>
                        <p className="text-[13px] text-slate-700 dark:text-[#D1D5DB] leading-relaxed line-clamp-3">
                            {resumo}
                        </p>
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

                {/* ── [+ Ver mais] — campos de reflexão ── */}
                {temDetalhes && (
                    <>
                        <button
                            onClick={() => setExpandido(v => !v)}
                            className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-[#6B7280] hover:text-slate-600 dark:hover:text-[#9CA3AF] transition w-fit pt-1"
                        >
                            <span className="text-[9px]">{expandido ? '▾' : '▸'}</span>
                            <span>{expandido ? 'Ver menos' : '+ Ver mais'}</span>
                        </button>

                        {expandido && (
                            <div className="flex flex-col gap-3 pt-2 border-t border-[#E6EAF0] dark:border-[#2D3748]">
                                {comportamento && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[10px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#8896A5]">🎭 Comportamento da turma:</span>
                                        <span className="text-[12px] text-slate-700 dark:text-[#D1D5DB] italic">{comportamento}</span>
                                    </div>
                                )}
                                {funcionouBem && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#8896A5] mb-1">✓ O que funcionou</p>
                                        <p className="text-[12.5px] text-slate-700 dark:text-[#D1D5DB] leading-relaxed">{funcionouBem}</p>
                                    </div>
                                )}
                                {naoFuncionou && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#8896A5] mb-1">✗ O que não funcionou</p>
                                        <p className="text-[12.5px] text-slate-700 dark:text-[#D1D5DB] leading-relaxed">{naoFuncionou}</p>
                                    </div>
                                )}
                                {poderiaMelhorar && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#8896A5] mb-1">💭 Poderia melhorar</p>
                                        <p className="text-[12.5px] text-slate-700 dark:text-[#D1D5DB] leading-relaxed">{poderiaMelhorar}</p>
                                    </div>
                                )}
                                {anotacoesGerais && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#8896A5] mb-1">📝 Anotações gerais</p>
                                        <p className="text-[12.5px] text-slate-700 dark:text-[#D1D5DB] leading-relaxed">{anotacoesGerais}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

            </div>
        </div>
    )
}

// ─── Helpers do formulário ────────────────────────────────────────────────────

function gerarIdAtividade(): string {
    return `a_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
}

function stripHtml(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

function statusAulaLabel(status?: string): string {
    const map: Record<string, string> = {
        concluida: 'Concluída', revisao: 'Em revisão',
        incompleta: 'Incompleta', nao_houve: 'Não houve', parcial: 'Parcial',
    }
    return map[status ?? ''] ?? 'Registrada'
}

// ─── Sub-componente: Formulário inline de planejamento ───────────────────────

type ModoForm = 'adaptar' | 'importar' | 'criar'

function FormPlanoTurma({
    modo,
    ultimoRegistro,
    onClose,
}: {
    modo: ModoForm
    ultimoRegistro: RegistroPosAula | null
    onClose: () => void
}) {
    const { salvarPlanejamento, planejamentosDaTurma } = usePlanejamentoTurmaContext()
    const { planos } = usePlanosContext()

    // Atividades: em modo adaptar, importa do plano de aula anterior desta turma
    // ⚠️ Nunca modifica o original — apenas cria cópias com novos IDs
    const [atividades, setAtividades] = useState<AtividadePlanejamentoTurma[]>(() => {
        if (modo === 'adaptar') {
            // 1ª prioridade: último PlanejamentoTurma com atividades estruturadas
            const ultPlan = planejamentosDaTurma[0]
            if (ultPlan?.atividades?.length) {
                return ultPlan.atividades.map(a => ({ ...a, id: gerarIdAtividade() }))
            }

            // 2ª prioridade: atividadesRoteiro do Plano (banco) ligado ao último pós-aula desta turma
            // Caso mais comum: professor já usa banco de aulas mas ainda não tem PlanejamentoTurma salvo
            if (ultimoRegistro) {
                const planoOrigem = planos.find(p =>
                    (p.registrosPosAula ?? []).some(r => String(r.id) === String(ultimoRegistro.id))
                )
                if (planoOrigem?.atividadesRoteiro?.length) {
                    return planoOrigem.atividadesRoteiro
                        .map(a => ({
                            id: gerarIdAtividade(),
                            nome: stripHtml(a.nome ?? ''),
                            duracao: a.duracao,
                            descricao: stripHtml(a.descricao ?? ''),
                        }))
                        .filter(a => a.nome.trim() || a.descricao.trim())
                }
            }

            // 3ª prioridade: texto livre do último PlanejamentoTurma antigo
            if (ultPlan?.oQuePretendoFazer?.trim()) {
                return [{ id: gerarIdAtividade(), nome: '', duracao: '', descricao: ultPlan.oQuePretendoFazer }]
            }
        }
        return []
    })
    // Accordion: qual card está expandido (null = todos colapsados)
    const [activeAtivId, setActiveAtivId] = useState<string | null>(
        () => atividades.length > 0 ? atividades[0].id : null
    )
    const [planoImportadoId, setPlanoImportadoId] = useState<string | null>(null)
    const [busca, setBusca] = useState('')
    const [salvoNoBanco, setSalvoNoBanco] = useState(false)

    // Filtra planos do banco para modo importar
    const planosFiltrados = useMemo<Plano[]>(() => {
        if (modo !== 'importar') return []
        const q = busca.toLowerCase()
        return planos
            .filter(p => !p.arquivado)
            .filter(p => !q || p.titulo.toLowerCase().includes(q) || (p.tema ?? '').toLowerCase().includes(q))
            .slice(0, 12)
    }, [planos, busca, modo])

    function handleImportarPlano(planoId: string) {
        setPlanoImportadoId(planoId)
        const p = planos.find(pl => String(pl.id) === planoId)
        if (p?.atividadesRoteiro?.length) {
            setAtividades(p.atividadesRoteiro
                .map(a => ({
                    id: gerarIdAtividade(),
                    nome: stripHtml(a.nome ?? ''),
                    duracao: a.duracao,
                    descricao: stripHtml(a.descricao ?? ''),
                }))
                .filter(a => a.nome.trim() || a.descricao.trim())
            )
        }
    }

    function addAtividade() {
        const novaId = gerarIdAtividade()
        setAtividades(prev => [...prev, { id: novaId, nome: '', duracao: '30 min', descricao: '' }])
        setActiveAtivId(novaId)
    }

    function removeAtividade(id: string) {
        setAtividades(prev => prev.filter(a => a.id !== id))
    }

    function updateAtividade(id: string, field: keyof AtividadePlanejamentoTurma, value: string) {
        setAtividades(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a))
    }

    function handleSalvar() {
        const origemMap: Record<ModoForm, 'banco' | 'adaptacao' | 'livre'> = {
            adaptar: 'adaptacao', importar: 'banco', criar: 'livre',
        }
        const atividadesValidas = atividades.filter(a => a.nome.trim())
        const resumo = atividadesValidas.map(a => a.nome).join(' · ') || '(sem título)'
        salvarPlanejamento({
            oQuePretendoFazer: resumo,
            origemAula: origemMap[modo],
            atividades: atividadesValidas.length ? atividadesValidas : undefined,
            materiais: [],
            planosRelacionadosIds: planoImportadoId ? [planoImportadoId] : [],
        })
        setSalvoNoBanco(true)
        setTimeout(onClose, 1200)
    }

    const podeSalvar = atividades.some(a => a.nome.trim())

    const modoLabel: Record<ModoForm, string> = {
        adaptar:  'ADAPTAR DA AULA ANTERIOR',
        importar: 'IMPORTAR DO BANCO DE AULAS',
        criar:    'NOVA AULA',
    }
    const modoIcon: Record<ModoForm, string> = {
        adaptar: '🔄', importar: '🏛', criar: '✏️',
    }

    return (
        <div className="v2-card rounded-[10px] border border-[#E6EAF0] dark:border-[#374151] overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#E6EAF0] dark:border-[#2D3748]">
                <span className="text-[11px] font-bold uppercase tracking-[.7px] text-slate-600 dark:text-[#C1C8D4]">
                    {modoIcon[modo]} {modoLabel[modo]}
                </span>
                <button
                    onClick={onClose}
                    className="flex items-center justify-center min-w-[44px] min-h-[44px] -mr-3 text-slate-400 hover:text-slate-600 dark:hover:text-[#9CA3AF] transition text-[20px] leading-none"
                >×</button>
            </div>

            <div className="px-5 py-4 flex flex-col gap-4">

                {/* Modo importar: seletor de plano do banco */}
                {modo === 'importar' && (
                    <div className="flex flex-col gap-2">
                        <input
                            type="text"
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                            placeholder="Buscar no banco de aulas..."
                            style={{ fontSize: 16 }}
                            className="w-full px-3 py-2.5 rounded-lg border border-[#E6EAF0] dark:border-[#374151] bg-[var(--v2-card)] text-slate-700 dark:text-[#E5E7EB] placeholder:text-slate-400 dark:placeholder:text-[#6B7280] outline-none focus:border-indigo-400"
                        />
                        {planosFiltrados.length > 0 && (
                            <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                                {planosFiltrados.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => handleImportarPlano(String(p.id))}
                                        className={`w-full text-left px-3 py-3 rounded-lg text-[12.5px] transition border ${
                                            planoImportadoId === String(p.id)
                                                ? 'border-indigo-300 dark:border-indigo-700 bg-[#5B5FEA]/[0.07] text-indigo-700 dark:text-indigo-300'
                                                : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/[0.03] text-slate-700 dark:text-[#D1D5DB]'
                                        }`}
                                    >
                                        <span className="font-medium">{p.titulo}</span>
                                        {p.data && <span className="ml-2 text-[11px] text-slate-400 dark:text-[#6B7280]">{p.data}</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Atividades */}
                <div>
                    <label className="text-[10px] font-semibold uppercase tracking-[.6px] text-[#94A3B8] dark:text-[#6B7280] block mb-2">Atividades</label>
                    <div className="flex flex-col gap-2">
                        {atividades.map((ativ, idx) => {
                            const isOpen = activeAtivId === ativ.id
                            return (
                            <div
                                key={ativ.id}
                                className="rounded-lg border border-[#E6EAF0] dark:border-[#374151] overflow-hidden"
                                onClick={!isOpen ? () => setActiveAtivId(ativ.id) : undefined}
                                style={!isOpen ? { cursor: 'pointer' } : undefined}
                            >
                                {/* Header */}
                                <div
                                    className={`flex items-center gap-2 px-3 py-4 select-none ${isOpen ? 'border-b border-[#E6EAF0] dark:border-[#374151] cursor-pointer' : ''}`}
                                    onClick={isOpen ? () => setActiveAtivId(null) : undefined}
                                >
                                    <span className="text-[11px] text-slate-400 dark:text-[#6B7280] shrink-0">{isOpen ? '▲' : '▼'}</span>
                                    <span className="text-[11px] text-slate-400 dark:text-[#6B7280] shrink-0">{idx + 1}.</span>
                                    <input
                                        value={ativ.nome}
                                        onChange={e => updateAtividade(ativ.id, 'nome', e.target.value)}
                                        onClick={e => e.stopPropagation()}
                                        placeholder="Nome da atividade"
                                        style={{ fontSize: 16 }}
                                        className="flex-1 text-[14px] font-semibold bg-transparent text-slate-700 dark:text-[#E5E7EB] outline-none placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-[#6B7280] min-w-0 cursor-text"
                                    />
                                    {/* Duração ao lado do × — clica no label abre o card, clica no input não fecha */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        <span className="text-[12px] text-slate-400 dark:text-[#6B7280]">Duração:</span>
                                        <input
                                            value={ativ.duracao}
                                            onChange={e => updateAtividade(ativ.id, 'duracao', e.target.value)}
                                            onClick={e => { e.stopPropagation(); if (!isOpen) setActiveAtivId(ativ.id) }}
                                            placeholder="15 min"
                                            style={{ fontSize: 13 }}
                                            className="w-[60px] text-[12px] px-2 py-1 rounded-md bg-slate-100 dark:bg-[#374151] text-slate-600 dark:text-[#D1D5DB] outline-none focus:ring-1 focus:ring-indigo-400"
                                        />
                                    </div>
                                    <button
                                        onClick={e => { e.stopPropagation(); removeAtividade(ativ.id) }}
                                        className="flex items-center justify-center w-9 h-9 shrink-0 text-rose-400 hover:text-rose-600 transition text-[20px] leading-none"
                                    >×</button>
                                </div>

                                {/* Corpo — só renderiza quando aberto */}
                                {isOpen && (
                                    <div className="px-4 pt-3 pb-4">
                                        <textarea
                                            value={ativ.descricao}
                                            onChange={e => {
                                                e.target.style.height = 'auto'
                                                e.target.style.height = e.target.scrollHeight + 'px'
                                                updateAtividade(ativ.id, 'descricao', e.target.value)
                                            }}
                                            ref={el => {
                                                if (el) {
                                                    el.style.height = 'auto'
                                                    el.style.height = Math.max(el.scrollHeight, 200) + 'px'
                                                }
                                            }}
                                            autoFocus={ativ.nome === ''}
                                            style={{ fontSize: 15, minHeight: 200 }}
                                            placeholder="Descreva esta atividade..."
                                            className="w-full bg-transparent text-[13px] text-slate-600 dark:text-[#C1C8D4] placeholder:text-slate-400 dark:placeholder:text-[#6B7280] outline-none resize-none leading-relaxed overflow-hidden"
                                        />
                                    </div>
                                )}
                            </div>
                            )
                        })}
                        {/* Botão nova atividade — borda tracejada, mobile-friendly */}
                        <button
                            onClick={addAtividade}
                            className="w-full py-3 rounded-lg border border-dashed border-[#CBD5E1] dark:border-[#374151] text-[12px] text-slate-400 dark:text-[#6B7280] hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition"
                        >
                            + Nova atividade
                        </button>
                    </div>
                </div>

                {/* Ações — min-h-[44px] para área de toque mobile */}
                <div className="flex items-center justify-between pt-1">
                    <button
                        onClick={onClose}
                        className="flex items-center min-h-[44px] px-1 text-[12px] text-slate-400 dark:text-[#6B7280] hover:text-slate-600 dark:hover:text-[#9CA3AF] transition"
                    >
                        Cancelar
                    </button>
                    {salvoNoBanco ? (
                        <span className="text-[12px] text-emerald-500 font-medium">✓ Salvo</span>
                    ) : (
                        <button
                            onClick={handleSalvar}
                            disabled={!podeSalvar}
                            className="flex items-center min-h-[44px] px-5 rounded-lg bg-[#5B5FEA] text-white text-[13px] font-semibold hover:bg-[#4B4FD9] disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                            Salvar planejamento
                        </button>
                    )}
                </div>

            </div>
        </div>
    )
}

// ─── Sub-componente: Conteúdo da turma selecionada ───────────────────────────

function ConteudoTurma({ turmaSelecionada }: { turmaSelecionada: TurmaSelecionada }) {
    const { ultimoRegistroDaTurma } = usePlanejamentoTurmaContext()
    const [modoAtivo, setModoAtivo] = useState<ModoForm | null>(null)

    const temUltimoRegistro = !!ultimoRegistroDaTurma

    return (
        <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* Bloco: Aula anterior */}
            <BlocoAulaAnterior registro={ultimoRegistroDaTurma} />

            {/* Bloco: Planejamento da próxima aula */}
            {modoAtivo ? (
                <FormPlanoTurma
                    key={`${turmaSelecionada.anoLetivoId}|${turmaSelecionada.turmaId}|${modoAtivo}`}
                    modo={modoAtivo}
                    ultimoRegistro={ultimoRegistroDaTurma}
                    onClose={() => setModoAtivo(null)}
                />
            ) : (
                <div className="v2-card rounded-[10px] border border-[#E6EAF0] dark:border-[#374151] px-5 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[.7px] text-[#94A3B8] dark:text-[#6B7280] mb-3">
                        Planejar próxima aula
                    </p>
                    {/* py-3 garante 44px de área de toque no mobile */}
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button
                            onClick={() => setModoAtivo('adaptar')}
                            disabled={!temUltimoRegistro}
                            className="flex items-center gap-2 px-4 py-3 sm:py-2 text-[12.5px] font-medium rounded-lg border border-[#E6EAF0] dark:border-[#374151] text-slate-500 dark:text-[#9CA3AF] hover:bg-slate-50 dark:hover:bg-[#273344] disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                            🔄 <span>Adaptar da aula anterior</span>
                        </button>
                        <button
                            onClick={() => setModoAtivo('criar')}
                            className="flex items-center gap-2 px-4 py-3 sm:py-2 text-[12.5px] font-medium rounded-lg border border-[#E6EAF0] dark:border-[#374151] text-slate-500 dark:text-[#9CA3AF] hover:bg-slate-50 dark:hover:bg-[#273344] transition"
                        >
                            ✏️ <span>Nova aula</span>
                        </button>
                        <button
                            onClick={() => setModoAtivo('importar')}
                            className="flex items-center gap-2 px-4 py-3 sm:py-2 text-[12.5px] font-medium rounded-lg border border-[#E6EAF0] dark:border-[#374151] text-slate-500 dark:text-[#9CA3AF] hover:bg-slate-50 dark:hover:bg-[#273344] transition"
                        >
                            🏛 <span>Importar do banco de aulas</span>
                        </button>
                    </div>
                </div>
            )}

        </div>
    )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ModuloPorTurmas() {
    const { selecionarTurma, turmaSelecionada, dataNavegacao, setDataNavegacao } = usePlanejamentoTurmaContext()
    const { setViewMode } = useRepertorioContext()

    // Data local — independente do AgendaSemanal e VisaoSemana
    const [dataSelecionada, setDataSelecionada] = useState<Date>(() => {
        const d = new Date(); d.setHours(0,0,0,0)
        // Se fim de semana, avança para segunda
        if (d.getDay() === 0) return addDays(d, 1)
        if (d.getDay() === 6) return addDays(d, 2)
        return d
    })
    const [voltarPara, setVoltarPara] = useState<string | null>(null)

    // Navegação vinda da Visão da Semana — aplica a data e registra origem
    useEffect(() => {
        if (!dataNavegacao) return
        setDataSelecionada(dataNavegacao)
        setVoltarPara('visaoSemana')
        setDataNavegacao(null)
    }, [dataNavegacao, setDataNavegacao])

    const ymd = toYMD(dataSelecionada)

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
            <div>
                <h1 className="text-[17px] font-bold tracking-tight text-slate-800 dark:text-[#E5E7EB]">
                    Planejar por Turma
                </h1>
                <p className="text-[12.5px] text-slate-500 dark:text-[#9CA3AF] mt-1">
                    O que vou dar para esta turma na próxima aula?
                </p>
            </div>

            {/* Layout: sidebar + conteúdo */}
            <div className="flex gap-5 items-start">
                <SeletorTurma
                    dataSelecionada={dataSelecionada}
                    onDataChange={setDataSelecionada}
                    turmaSelecionada={turmaSelecionada}
                    onSelecionarTurma={selecionarTurma}
                />

                {turmaSelecionada
                    ? <ConteudoTurma turmaSelecionada={turmaSelecionada} />
                    : <EstadoVazio dataYmd={ymd} />
                }
            </div>

        </div>
    )
}
