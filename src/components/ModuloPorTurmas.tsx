// src/components/ModuloPorTurmas.tsx
// Etapa 6 — Planejar por Turma
// Foco: "O que vou dar para esta turma na próxima aula?"

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useCalendarioContext } from '../contexts/CalendarioContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import { usePlanejamentoTurmaContext } from '../contexts/PlanejamentoTurmaContext'
import { useRepertorioContext } from '../contexts/RepertorioContext'
import { usePlanosContext, normalizePlano } from '../contexts/PlanosContext'
import type { TurmaSelecionada } from '../contexts/PlanejamentoTurmaContext'
import { showToast } from '../lib/toast'
import type { AnoLetivo, RegistroPosAula, Plano, Turma } from '../types'
import { gerarIdSeguro } from '../lib/utils'
import FormularioAulaPlena from './FormularioAulaPlena'

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
    type CopyConfirm = { srcPlanoId: string; srcNome: string; dst: TurmaSelecionada; dstNome: string; dataPrevista: string }
    const [copyConfirm, setCopyConfirm] = useState<CopyConfirm | null>(null)

    const handleDrop = useCallback((e: React.DragEvent, dstAula: ReturnType<typeof obterTurmasDoDia>[number]) => {
        e.preventDefault()
        if (!dragSrcId || dragSrcId === String(dstAula.turmaId)) { setDragOverId(null); return }
        const ymd = toYMD(dataSelecionada)
        // busca plano mais recente da turma de origem (independente de data)
        const srcPlanos = planejamentos
          .filter(p => String(p.turmaId) === dragSrcId)
          .sort((a, b) => (b.atualizadoEm ?? b.criadoEm ?? '').localeCompare(a.atualizadoEm ?? a.criadoEm ?? ''))
        if (srcPlanos.length === 0) { setDragSrcId(null); setDragOverId(null); return }
        const aulasDoDia = obterTurmasDoDia(ymd)
        const srcAula = aulasDoDia.find(a => String(a.turmaId) === dragSrcId)
        const srcNome = srcAula ? getNomeTurma(srcAula.anoLetivoId, srcAula.escolaId, srcAula.segmentoId, srcAula.turmaId, anosLetivos) : dragSrcId
        const dstNome = getNomeTurma(dstAula.anoLetivoId, dstAula.escolaId, dstAula.segmentoId, dstAula.turmaId, anosLetivos)
        setCopyConfirm({
            srcPlanoId: srcPlanos[0].id,
            srcNome,
            dst: { anoLetivoId: String(dstAula.anoLetivoId ?? ''), escolaId: String(dstAula.escolaId ?? ''), segmentoId: String(dstAula.segmentoId), turmaId: String(dstAula.turmaId) },
            dstNome,
            dataPrevista: ymd,
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
                                copiarPlanejamento(copyConfirm.srcPlanoId, copyConfirm.dst, copyConfirm.dataPrevista)
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


// ─── Sub-componente: Formulário inline de planejamento ───────────────────────

type ModoForm = 'adaptar' | 'importar' | 'criar'

function FormPlanoTurma({
    modo,
    ultimoRegistro,
    onSalvar,
    onCancelar,
}: {
    modo: ModoForm
    ultimoRegistro: RegistroPosAula | null
    onSalvar: (plano: any, origemAula: 'banco' | 'adaptacao' | 'livre') => void
    onCancelar: () => void
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
        if (modo === 'adaptar' && ultimoRegistro) {
            const planoBase = planos.find(p =>
                (p.registrosPosAula ?? []).some(r => String(r.id) === String(ultimoRegistro.id))
            )
            return planoBase ? { ...planoBase, id: gerarIdSeguro() } : {}
        }
        return {}
    }, [modo, ultimoRegistro, planos])

    return (
        <FormularioAulaPlena
            key={`fpt-${turmaSelecionada?.turmaId ?? 'none'}-${modo}`}
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

// ─── Sub-componente: Conteúdo da turma selecionada ───────────────────────────

function ConteudoTurma({ turmaSelecionada, dataPrevista }: { turmaSelecionada: TurmaSelecionada; dataPrevista: string }) {
    const { ultimoRegistroDaTurma, fecharForm, salvarPlanejamento, planejamentosDaTurma, editarPlanejamento } = usePlanejamentoTurmaContext()
    const { setPlanos } = usePlanosContext()
    const { anosLetivos } = useAnoLetivoContext()

    // Resolve nome da escola a partir do contexto (para popular filtro no banco)
    const escolaNomeDaTurma = useMemo(() => {
        const ano = anosLetivos.find(a => String(a.id) === turmaSelecionada.anoLetivoId)
        return ano?.escolas.find((e: any) => String(e.id) === turmaSelecionada.escolaId)?.nome ?? ''
    }, [anosLetivos, turmaSelecionada])
    const [modoAtivo, setModoAtivo] = useState<ModoForm | null>(null)
    const [pendingSave, setPendingSave] = useState<{ plano: any; origemAula: 'banco' | 'adaptacao' | 'livre' } | null>(null)

    // Garante que qualquer edição pendente de outro módulo seja descartada ao montar
    useEffect(() => { fecharForm() }, []) // eslint-disable-line

    const temUltimoRegistro = !!ultimoRegistroDaTurma
    const temPlanos = planejamentosDaTurma.length > 0

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
            // Bug 7: popula escola para aparecer no filtro do banco de aulas
            const planoParaBanco = normalizePlano({
                ...plano,
                id: gerarIdSeguro(),
                escola: plano.escola || escolaNomeDaTurma,
            })
            setPlanos(prev => [...prev, planoParaBanco])
            showToast('Salvo no banco de aulas ✅')
        }
        setPendingSave(null)
        setModoAtivo(null)
    }

    const BotoesPlanejar = () => (
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
    )

    return (
        <>
        <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* Bloco: Aula anterior */}
            <BlocoAulaAnterior registro={ultimoRegistroDaTurma} />

            {/* Bloco: Planejamento da próxima aula */}
            {modoAtivo ? (
                <FormPlanoTurma
                    key={`${turmaSelecionada.anoLetivoId}|${turmaSelecionada.turmaId}|${modoAtivo}`}
                    modo={modoAtivo}
                    ultimoRegistro={ultimoRegistroDaTurma}
                    onSalvar={handleFormSalvar}
                    onCancelar={() => setModoAtivo(null)}
                />
            ) : temPlanos ? (
                /* ── Aula planejada: exibição compacta ── */
                <div className="v2-card rounded-[10px] border border-[#E6EAF0] dark:border-[#374151] overflow-hidden">
                    <div className="px-5 pt-4 pb-3 border-b border-[#E6EAF0] dark:border-[#374151] flex items-center gap-2">
                        <span className="text-[11px] text-emerald-500 font-bold">✓</span>
                        <p className="text-[10px] font-semibold uppercase tracking-[.7px] text-[#94A3B8] dark:text-[#6B7280] flex-1">
                            Aula planejada
                        </p>
                        {planejamentosDaTurma.length > 1 && (
                            <span className="text-[10px] text-[#94a3b8] border border-[#E6EAF0] dark:border-[#374151] px-2 py-0.5 rounded-full">
                                {planejamentosDaTurma.length}
                            </span>
                        )}
                    </div>
                    <div className="flex flex-col divide-y divide-[#E6EAF0] dark:divide-[#374151]">
                        {planejamentosDaTurma.map(plano => (
                            <div key={plano.id} className="flex items-center justify-between gap-3 px-5 py-3">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {plano.dataPrevista && (
                                        <span className="text-[11px] text-[#94a3b8] flex-shrink-0">
                                            {new Date(plano.dataPrevista + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                                        </span>
                                    )}
                                    <span className="text-[12px] text-[#374151] dark:text-[#D1D5DB] truncate">
                                        {plano.oQuePretendoFazer || plano.planoData?.titulo || 'Sem título'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => editarPlanejamento(plano)}
                                    className="text-[11px] text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition flex-shrink-0 font-medium"
                                >
                                    ver / editar
                                </button>
                            </div>
                        ))}
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
                    ? <ConteudoTurma key={`${turmaSelecionada.turmaId}-${ymd}`} turmaSelecionada={turmaSelecionada} dataPrevista={ymd} />
                    : <EstadoVazio dataYmd={ymd} />
                }
            </div>

        </div>
    )
}
