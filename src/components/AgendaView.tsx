// src/components/AgendaView.tsx
// Módulo Agenda unificado — Hoje / Semana / Mês
// Substitui TelaResumoDia + AgendaSemanal (visualização diária)
// Design: cards por turma, expandem com roteiro (Option C — inline edit),
//         materiais do dia no rodapé da página.

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useCalendarioContext } from '../contexts/CalendarioContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import { useAplicacoesContext } from '../contexts/AplicacoesContext'
import { usePlanosContext } from '../contexts/PlanosContext'
import { sanitizarRich } from '../lib/utils'
import { showToast } from '../lib/toast'
import type { AulaGrade, AplicacaoAula, Plano, AnoLetivo, AtividadeRoteiro } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMondayOf(d: Date): Date {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay()
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day))
  return date
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d)
  date.setDate(date.getDate() + n)
  return date
}

function getNomeTurma(
  anoLetivoId: string | undefined,
  escolaId: string | undefined,
  segmentoId: string,
  turmaId: string,
  anosLetivos: AnoLetivo[],
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
  anosLetivos: AnoLetivo[],
): string {
  if (!anoLetivoId || !escolaId) return ''
  // eslint-disable-next-line eqeqeq
  const ano = anosLetivos.find(a => a.id == anoLetivoId)
  // eslint-disable-next-line eqeqeq
  return ano?.escolas.find(e => e.id == escolaId)?.nome ?? ''
}

function formatHorario(h: string): string {
  if (!h) return ''
  const [hh, mm] = h.split(':')
  return mm === '00' ? `${hh}h` : `${hh}h${mm}`
}


// ─── Constantes ───────────────────────────────────────────────────────────────

const DIAS_SEMANA_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']
const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
const MESES_LONGOS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// Paleta de cores por escola — mesma de VisaoSemana.tsx
const ESCOLA_COLORS: { light: string; dark: string }[] = [
  { light: '#7c83d4', dark: '#bfc3f5' },
  { light: '#3b8fc2', dark: '#9dd5f0' },
  { light: '#2a9c70', dark: '#8edbbf' },
  { light: '#b8860e', dark: '#e6be6a' },
  { light: '#c2623b', dark: '#f0b49d' },
]

// Ref global: armazena o último undo da Agenda para o Ctrl+Z
const ultimoUndoAgenda: { fn: (() => void) | null } = { fn: null }

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface AulaSlot {
  aulaGrade: AulaGrade
  aplicacao?: AplicacaoAula
  plano?: Plano
  nomeTurma: string
  nomeEscola: string
  escolaColorIdx: number
  dataStr: string
}

type TabMode = 'hoje' | 'semana' | 'mes'

// ─── Hook: useAgendaSlotsForDay ───────────────────────────────────────────────

function useAgendaSlotsForDay(dataStr: string, escolaColorMap: Map<string, number>): AulaSlot[] {
  const { obterTurmasDoDia } = useCalendarioContext()
  const { anosLetivos } = useAnoLetivoContext()
  const { aplicacoes } = useAplicacoesContext()
  const { planos } = usePlanosContext()

  return useMemo(() => {
    const aulas = obterTurmasDoDia(dataStr)
    return aulas
      .map(aula => {
        const ap = aplicacoes.find(
          a => a.data === dataStr && a.turmaId === aula.turmaId && a.anoLetivoId === (aula.anoLetivoId ?? ''),
        )
        const escolaId = aula.escolaId ?? ''
        return {
          aulaGrade: aula,
          aplicacao: ap,
          plano: ap ? planos.find(p => String(p.id) === String(ap.planoId)) : undefined,
          nomeTurma: getNomeTurma(aula.anoLetivoId, aula.escolaId, aula.segmentoId, aula.turmaId, anosLetivos),
          nomeEscola: getNomeEscola(aula.anoLetivoId, aula.escolaId, anosLetivos),
          escolaColorIdx: escolaColorMap.get(escolaId) ?? 0,
          dataStr,
        }
      })
      .sort((a, b) => (a.aulaGrade.horario ?? '').localeCompare(b.aulaGrade.horario ?? ''))
  }, [dataStr, obterTurmasDoDia, aplicacoes, planos, anosLetivos, escolaColorMap])
}

// ─── AulaCard ─────────────────────────────────────────────────────────────────

// ─── RoteiroItemEditavel ──────────────────────────────────────────────────────
// Estado local para a digitação — evita o input controlado reverter cada tecla

interface RoteiroItemProps {
  ativ: AtividadeRoteiro & { nome: string }
  idx: number
  temAplicacao: boolean
  onEditar: (id: string | number, nome: string) => void
  onRemover: (id: string | number, nome: string) => void
}

function stripHTMLToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
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

function RoteiroItemEditavel({ ativ, idx, temAplicacao, onEditar, onRemover }: RoteiroItemProps) {
  const [titulo, setTitulo] = useState(ativ.nome)
  const descRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setTitulo(ativ.nome) }, [ativ.nome])

  // Inicializa o HTML do contentEditable sem sobrescrever o cursor durante edição
  useEffect(() => {
    if (descRef.current && document.activeElement !== descRef.current) {
      descRef.current.innerHTML = sanitizarRich(ativ.descricao ?? '')
    }
  }, [ativ.descricao])

  return (
    <div className="flex items-start gap-2">
      <span className="text-xs font-mono text-slate-400 mt-[10px] w-5 shrink-0 text-right">
        {idx + 1}
      </span>

      <div className="flex-1 bg-slate-50 dark:bg-gray-700/60 rounded-md px-3 py-2">
        {/* Título editável */}
        <div className="flex items-center gap-2">
          <input
            className="flex-1 bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none min-w-0 cursor-text rounded px-1 -mx-1 hover:bg-white/60 dark:hover:bg-white/5 focus:bg-white dark:focus:bg-gray-600/40 focus:ring-1 focus:ring-blue-400/50 transition-colors"
            value={titulo}
            onChange={e => { setTitulo(e.target.value); onEditar(ativ.id, e.target.value) }}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          />
          {ativ.duracao && (
            <span className="text-xs text-slate-400 shrink-0">{ativ.duracao}</span>
          )}
        </div>

        {/* Descrição — contentEditable mantém formatação ao editar */}
        {ativ.descricao && (
          <div
            ref={descRef}
            contentEditable
            suppressContentEditableWarning
            className="agenda-descricao agenda-descricao-edit text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed outline-none rounded px-1 -mx-1 hover:bg-white/60 dark:hover:bg-white/5 focus:bg-white dark:focus:bg-gray-600/40 focus:ring-1 focus:ring-blue-400/50 transition-colors cursor-text"
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
          />
        )}
      </div>

      {temAplicacao && (
        <button
          className="mt-[6px] w-6 h-6 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0 text-base leading-none"
          onClick={e => { e.stopPropagation(); onRemover(ativ.id, titulo) }}
          onMouseDown={e => e.stopPropagation()}
          title="Remover desta aula"
        >
          ×
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

interface AulaCardProps {
  slot: AulaSlot
  isDarkMode: boolean
}

function AulaCard({ slot, isDarkMode }: AulaCardProps) {
  const { setAplicacoes } = useAplicacoesContext()
  const [aberto, setAberto] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const roteiro = slot.plano?.atividadesRoteiro ?? []

  // Filtra atividades ocultas e aplica nomes editados desta aplicação
  const roteiroVisivel = useMemo(() => {
    const ocultas = new Set(slot.aplicacao?.atividadesOcultas ?? [])
    const nomes = slot.aplicacao?.roteiroNomes ?? {}
    return roteiro
      .filter(a => !ocultas.has(String(a.id)))
      .map(a => ({ ...a, nome: nomes[String(a.id)] ?? a.nome }))
  }, [roteiro, slot.aplicacao?.atividadesOcultas, slot.aplicacao?.roteiroNomes])

  const cor = ESCOLA_COLORS[slot.escolaColorIdx % ESCOLA_COLORS.length]
  const borderColor = isDarkMode ? cor.dark : cor.light

  const removerAtividade = useCallback((atividadeId: string | number, nomeAtiv: string) => {
    if (!slot.aplicacao) return
    const id = String(atividadeId)
    const aplicacaoId = slot.aplicacao.id

    const desfazer = () => {
      setAplicacoes(prev =>
        prev.map(a =>
          a.id === aplicacaoId
            ? { ...a, atividadesOcultas: (a.atividadesOcultas ?? []).filter(x => x !== id) }
            : a,
        ),
      )
      ultimoUndoAgenda.fn = null
    }

    setAplicacoes(prev =>
      prev.map(a =>
        a.id === aplicacaoId
          ? { ...a, atividadesOcultas: [...(a.atividadesOcultas ?? []), id] }
          : a,
      ),
    )

    ultimoUndoAgenda.fn = desfazer

    showToast(`"${nomeAtiv}" removida desta aula`, 'info', 5000, desfazer)
  }, [slot.aplicacao, setAplicacoes])

  const editarItem = useCallback((id: string | number, novoNome: string) => {
    if (!slot.aplicacao) return
    const aplicacaoId = slot.aplicacao.id
    // Salva debounced em roteiroNomes da aplicação
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setAplicacoes(prev =>
        prev.map(a =>
          a.id === aplicacaoId
            ? { ...a, roteiroNomes: { ...(a.roteiroNomes ?? {}), [String(id)]: novoNome } }
            : a,
        ),
      )
    }, 400)
  }, [slot.aplicacao, setAplicacoes])


  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden transition-shadow hover:shadow-md"
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      {/* Cabeçalho — clicável */}
      <div
        className="px-4 py-3 flex items-start gap-3 cursor-pointer select-none"
        onClick={() => setAberto(v => !v)}
      >
        {/* Horário */}
        <div className="text-sm font-mono font-semibold text-slate-400 dark:text-slate-500 min-w-[34px] pt-0.5">
          {formatHorario(slot.aulaGrade.horario ?? '')}
        </div>

        {/* Info turma */}
        <div className="flex-1 min-w-0">
          {slot.nomeEscola && (
            <p className="text-xs font-medium truncate" style={{ color: borderColor }}>
              {slot.nomeEscola}
            </p>
          )}
          <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
            {slot.nomeTurma}
          </p>
          {slot.plano && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">
              {slot.plano.titulo}
            </p>
          )}
        </div>

        {/* Chevron */}
        <div className="flex items-center shrink-0">
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${aberto ? 'rotate-180' : ''}`}
            viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Conteúdo expandido — animação CSS grid */}
      <div style={{ display: 'grid', gridTemplateRows: aberto ? '1fr' : '0fr', transition: 'grid-template-rows 0.25s ease' }}>
        <div style={{ overflow: aberto ? 'visible' : 'hidden' }}>
          <div className="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-700">
            {!slot.plano ? (
              <p className="text-sm text-slate-400 italic">Nenhum plano vinculado a esta aula.</p>
            ) : roteiroVisivel.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Sem atividades no roteiro.</p>
            ) : (
              <div className="space-y-2">
                {roteiroVisivel.map((ativ, idx) => (
                  <RoteiroItemEditavel
                    key={String(ativ.id)}
                    ativ={ativ}
                    idx={idx}
                    temAplicacao={!!slot.aplicacao}
                    onEditar={editarItem}
                    onRemover={removerAtividade}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MateriaisDia ─────────────────────────────────────────────────────────────

function MateriaisDia({ slots }: { slots: AulaSlot[] }) {
  const materiais = useMemo(() => {
    const set = new Set<string>()
    slots.forEach(s => (s.plano?.materiais ?? []).forEach(m => { if (m) set.add(m) }))
    return Array.from(set)
  }, [slots])

  if (materiais.length === 0) return null

  return (
    <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl">
      <h3 className="text-xs font-semibold text-amber-700 dark:text-amber-500 uppercase tracking-wider mb-3">
        Materiais do dia
      </h3>
      <div className="flex flex-wrap gap-2">
        {materiais.map(m => (
          <span
            key={m}
            className="text-sm px-3 py-1 bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700/50 rounded-lg text-slate-700 dark:text-slate-300"
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── CardSemana — card compacto para a view Semana (não expande) ─────────────

function CardSemana({ slot, isDarkMode }: { slot: AulaSlot; isDarkMode: boolean }) {
  const cor = ESCOLA_COLORS[slot.escolaColorIdx % ESCOLA_COLORS.length]
  const borderColor = isDarkMode ? cor.dark : cor.light
  const semPlano = !slot.plano

  return (
    <div
      className="rounded-lg bg-white dark:bg-gray-800 p-2.5 text-left w-full"
      style={{ borderLeft: `3px solid ${semPlano ? '#f59e0b' : borderColor}` }}
    >
      <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mb-0.5">
        {formatHorario(slot.aulaGrade.horario ?? '')}
      </p>
      <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
        {slot.nomeTurma}
      </p>
      {slot.nomeEscola && (
        <p className="text-[11px] mt-0.5 truncate" style={{ color: semPlano ? '#f59e0b' : borderColor }}>
          {slot.nomeEscola}
        </p>
      )}
      <p className={`text-[11px] mt-1 flex items-center gap-1 truncate ${
        semPlano ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'
      }`}>
        {semPlano ? '⚠ Sem plano' : `📋 ${slot.plano!.titulo}`}
      </p>
    </div>
  )
}

// ─── ColunaDia — coluna de um dia no grid semanal ────────────────────────────

interface ColunaDiaProps {
  dataStr: string
  short: string
  diaNum: number
  isHoje: boolean
  escolaColorMap: Map<string, number>
  isDarkMode: boolean
}

function ColunaDia({ dataStr, short, diaNum, isHoje, escolaColorMap, isDarkMode }: ColunaDiaProps) {
  const slots = useAgendaSlotsForDay(dataStr, escolaColorMap)

  return (
    <div className={`flex flex-col min-w-0 rounded-xl p-2 ${
      isHoje ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-900 bg-blue-50/40 dark:bg-blue-900/10' : ''
    }`}>
      {/* Cabeçalho */}
      <div className="text-center mb-2">
        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
          {short}
        </p>
        <div className="flex items-center justify-center gap-1.5">
          <span className={`text-xl font-bold leading-tight ${
            isHoje ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'
          }`}>
            {diaNum}
          </span>
          {isHoje && (
            <span className="text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">
              hoje
            </span>
          )}
        </div>
      </div>

      {/* Cards ou vazio */}
      <div className="flex flex-col gap-1.5 flex-1">
        {slots.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-4">
            <p className="text-[11px] text-slate-300 dark:text-slate-600 text-center">— sem aulas —</p>
          </div>
        ) : (
          slots.map(slot => (
            <CardSemana
              key={`${slot.aulaGrade.id}-${slot.dataStr}`}
              slot={slot}
              isDarkMode={isDarkMode}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─── LegendaEscolas ───────────────────────────────────────────────────────────

interface LegendaProps {
  anosLetivos: AnoLetivo[]
  escolaColorMap: Map<string, number>
  isDarkMode: boolean
}

function LegendaEscolas({ anosLetivos, escolaColorMap, isDarkMode }: LegendaProps) {
  const escolas = useMemo(() => {
    const vistas = new Set<string>()
    const lista: { nome: string; color: string }[] = []
    anosLetivos.forEach(ano =>
      ano.escolas.forEach(esc => {
        if (!vistas.has(esc.id)) {
          vistas.add(esc.id)
          const idx = escolaColorMap.get(esc.id) ?? 0
          const cor = ESCOLA_COLORS[idx % ESCOLA_COLORS.length]
          lista.push({ nome: esc.nome, color: isDarkMode ? cor.dark : cor.light })
        }
      }),
    )
    return lista
  }, [anosLetivos, escolaColorMap, isDarkMode])

  if (escolas.length === 0) return null

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 justify-center">
      {escolas.map(e => (
        <span key={e.nome} className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
          {e.nome}
        </span>
      ))}
      <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="w-2 h-2 rounded-full shrink-0 bg-amber-400" />
        Sem plano
      </span>
    </div>
  )
}

// ─── AgendaDia ────────────────────────────────────────────────────────────────

interface AgendaDiaProps {
  dataStr: string
  escolaColorMap: Map<string, number>
  isDarkMode: boolean
}

function AgendaDia({ dataStr, escolaColorMap, isDarkMode }: AgendaDiaProps) {
  const slots = useAgendaSlotsForDay(dataStr, escolaColorMap)

  if (slots.length === 0) {
    return (
      <div className="py-14 text-center">
        <div className="text-3xl mb-3">🎵</div>
        <p className="text-sm text-slate-400 dark:text-slate-500">Nenhuma aula neste dia</p>
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-3">
        {slots.map(slot => (
          <AulaCard
            key={`${slot.aulaGrade.id}-${slot.dataStr}`}
            slot={slot}
            isDarkMode={isDarkMode}
          />
        ))}
      </div>
      <MateriaisDia slots={slots} />
    </div>
  )
}

// ─── AgendaView — componente principal ───────────────────────────────────────

export default function AgendaView() {
  const { anosLetivos } = useAnoLetivoContext()

  const hoje = useMemo(() => toStr(new Date()), [])
  const [tab, setTab] = useState<TabMode>('hoje')
  const [diaSelecionado, setDiaSelecionado] = useState<string>(hoje)
  const [segunda, setSegunda] = useState<Date>(() => getMondayOf(new Date()))

  // Detecta dark mode via classe no <html>
  const [isDarkMode, setIsDarkMode] = useState(
    () => document.documentElement.classList.contains('dark'),
  )
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDarkMode(document.documentElement.classList.contains('dark')),
    )
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Ctrl+Z — desfaz última remoção de atividade na Agenda
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        const target = e.target as HTMLElement
        const emInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
        if (emInput) return
        if (ultimoUndoAgenda.fn) {
          e.preventDefault()
          ultimoUndoAgenda.fn()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Mapa escola → índice de cor (estável por ordem de aparição)
  const escolaColorMap = useMemo(() => {
    const map = new Map<string, number>()
    anosLetivos.forEach(ano =>
      ano.escolas.forEach(esc => {
        if (!map.has(esc.id)) map.set(esc.id, map.size % ESCOLA_COLORS.length)
      }),
    )
    return map
  }, [anosLetivos])

  // Dias da semana exibidos no strip
  const diasSemana = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => {
        const d = addDays(segunda, i)
        return {
          dataStr: toStr(d),
          short: DIAS_SEMANA_SHORT[i],
          dia: d.getDate(),
          isHoje: toStr(d) === hoje,
        }
      }),
    [segunda, hoje],
  )

  const dataAtiva = tab === 'hoje' ? hoje : diaSelecionado

  // Label "segunda, 25 de março"
  const labelDia = useMemo(() => {
    const d = new Date(dataAtiva + 'T12:00:00')
    const nomes = ['domingo','segunda','terça','quarta','quinta','sexta','sábado']
    return `${nomes[d.getDay()]}, ${d.getDate()} de ${MESES_LONGOS[d.getMonth()]}`
  }, [dataAtiva])

  // Label "24–28 mar 2026"
  const labelSemana = useMemo(() => {
    const fri = addDays(segunda, 4)
    const m1 = MESES[segunda.getMonth()]
    const m2 = MESES[fri.getMonth()]
    return m1 === m2
      ? `${segunda.getDate()}–${fri.getDate()} ${m1} ${segunda.getFullYear()}`
      : `${segunda.getDate()} ${m1} – ${fri.getDate()} ${m2} ${fri.getFullYear()}`
  }, [segunda])

  function prevSemana() {
    const ns = addDays(segunda, -7)
    setSegunda(ns)
    setDiaSelecionado(toStr(ns))
  }
  function nextSemana() {
    const ns = addDays(segunda, 7)
    setSegunda(ns)
    setDiaSelecionado(toStr(ns))
  }

  return (
    <div className={`mx-auto px-4 pb-10 ${tab === 'semana' ? 'max-w-5xl' : 'max-w-2xl'}`}>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-100 dark:bg-gray-800 p-1 rounded-xl mb-6">
        {(['hoje', 'semana', 'mes'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? 'bg-white dark:bg-gray-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {t === 'hoje' ? 'Hoje' : t === 'semana' ? 'Semana' : 'Mês'}
          </button>
        ))}
      </div>

      {/* ── Hoje ── */}
      {tab === 'hoje' && (
        <>
          <p className="text-sm text-slate-400 dark:text-slate-500 capitalize mb-5">{labelDia}</p>
          <AgendaDia dataStr={hoje} escolaColorMap={escolaColorMap} isDarkMode={isDarkMode} />
        </>
      )}

      {/* ── Semana ── */}
      {tab === 'semana' && (
        <>
          {/* Navegação semana */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevSemana}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Semana anterior"
            >
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 4l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{labelSemana}</span>
            <button
              onClick={nextSemana}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Próxima semana"
            >
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Grid 5 colunas */}
          <div className="grid grid-cols-5 gap-2">
            {diasSemana.map(dia => (
              <ColunaDia
                key={dia.dataStr}
                dataStr={dia.dataStr}
                short={dia.short}
                diaNum={dia.dia}
                isHoje={dia.isHoje}
                escolaColorMap={escolaColorMap}
                isDarkMode={isDarkMode}
              />
            ))}
          </div>

          {/* Legenda escolas */}
          <LegendaEscolas anosLetivos={anosLetivos} escolaColorMap={escolaColorMap} isDarkMode={isDarkMode} />
        </>
      )}

      {/* ── Mês ── */}
      {tab === 'mes' && (
        <div className="py-14 text-center">
          <div className="text-3xl mb-3">📅</div>
          <p className="text-sm text-slate-400 dark:text-slate-500">Calendário mensal em breve</p>
        </div>
      )}
    </div>
  )
}
