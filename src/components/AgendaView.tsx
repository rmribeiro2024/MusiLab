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
import { usePlanejamentoTurmaContext } from '../contexts/PlanejamentoTurmaContext'
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
  onEditarDesc: (id: string | number, desc: string) => void
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

const SERVICOS_CONHECIDOS: Record<string, string> = {
  'drive.google.com': 'Google Drive',
  'docs.google.com': 'Google Docs',
  'sheets.google.com': 'Google Sheets',
  'slides.google.com': 'Google Slides',
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'open.spotify.com': 'Spotify',
  'dropbox.com': 'Dropbox',
  'onedrive.live.com': 'OneDrive',
  'notion.so': 'Notion',
  'github.com': 'GitHub',
}
const SEGMENTOS_GENERICOS = new Set(['view', 'edit', 'open', 'download', 'index', 'preview', 'share', 'pub', 'present'])

/** Substitui links onde o texto = URL crua por um nome legível (serviço ou nome do arquivo) */
function processarLinksHtml(html: string): string {
  return html.replace(/<a\s([^>]*)>(https?:\/\/[^<]+)<\/a>/gi, (match, attrs, texto) => {
    const hrefMatch = attrs.match(/href="([^"]+)"/)
    const href = hrefMatch ? hrefMatch[1] : texto
    if (!(texto.trim() === href.trim() || /^https?:\/\//.test(texto.trim()))) return match
    try {
      const url = new URL(href)
      const host = url.hostname.replace(/^www\./, '')
      // 1. Serviço reconhecido
      const servico = SERVICOS_CONHECIDOS[host]
      if (servico) return `<a ${attrs}>${servico}</a>`
      // 2. Segmento final do path, se não for genérico
      const segmentos = url.pathname.split('/').filter(Boolean)
      const ultimo = segmentos[segmentos.length - 1]
      if (ultimo && !SEGMENTOS_GENERICOS.has(ultimo.toLowerCase())) {
        let nome = decodeURIComponent(ultimo).replace(/\.[^.]+$/, '')
        if (nome.length > 40) nome = nome.slice(0, 38) + '…'
        return `<a ${attrs}>${nome}</a>`
      }
      // 3. Fallback: domínio limpo
      return `<a ${attrs}>${host}</a>`
    } catch {
      return match
    }
  })
}

function RoteiroItemEditavel({ ativ, idx, temAplicacao, onEditar, onEditarDesc, onRemover }: RoteiroItemProps) {
  const [titulo, setTitulo] = useState(ativ.nome)
  const descRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setTitulo(ativ.nome) }, [ativ.nome])

  // Inicializa o HTML do contentEditable sem sobrescrever o cursor durante edição
  useEffect(() => {
    if (descRef.current && document.activeElement !== descRef.current) {
      descRef.current.innerHTML = processarLinksHtml(sanitizarRich(ativ.descricao ?? ''))
    }
  }, [ativ.descricao])

  // Abre links ao clicar (contentEditable bloqueia navegação nativa)
  function handleDescClick(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation()
    const target = e.target as HTMLElement
    const anchor = target.closest('a')
    if (anchor?.href) {
      window.open(anchor.href, '_blank', 'noopener,noreferrer')
      e.preventDefault()
    }
  }

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
            onClick={handleDescClick}
            onMouseDown={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
            onBlur={() => {
              if (descRef.current) onEditarDesc(ativ.id, descRef.current.innerHTML)
            }}
          />
        )}
      </div>

      {temAplicacao && (
        <button
          className="mt-[6px] w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
          onClick={e => { e.stopPropagation(); onRemover(ativ.id, titulo) }}
          onMouseDown={e => e.stopPropagation()}
          title="Remover desta aula"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

/** Retorna 'antes' | 'agora' | 'depois' comparando horário HH:MM com hora atual */
function statusHorario(horario: string | undefined): 'antes' | 'agora' | 'depois' {
  if (!horario) return 'depois'
  const now = new Date()
  const [hh, mm] = horario.split(':').map(Number)
  const aulaMin = hh * 60 + mm
  const nowMin = now.getHours() * 60 + now.getMinutes()
  if (nowMin < aulaMin) return 'depois'
  if (nowMin <= aulaMin + 60) return 'agora'
  return 'antes'
}

interface AulaCardProps {
  slot: AulaSlot
  isDarkMode: boolean
  isProxima?: boolean
}

function AulaCard({ slot, isDarkMode, isProxima = false }: AulaCardProps) {
  const { setAplicacoes } = useAplicacoesContext()
  const { planos } = usePlanosContext()
  const {
    setModalRegistro, setPlanoParaRegistro, setNovoRegistro,
    setRegistroEditando, setVerRegistros,
    setRegAnoSel, setRegEscolaSel, setRegSegmentoSel, setRegTurmaSel,
  } = useCalendarioContext()
  const { salvarPlanejamentoParaTurma } = usePlanejamentoTurmaContext()
  const [aberto, setAberto] = useState(false)
  const [planoRapidoAberto, setPlanoRapidoAberto] = useState(false)
  const [roteiro, setRoteiro] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const roteiroRef = useRef<HTMLTextAreaElement>(null)

  // Verifica se já há registro pós-aula para esta turma/data
  const jaRegistrado = useMemo(() => {
    const tid = String(slot.aulaGrade.turmaId)
    return planos.some(p =>
      (p.registrosPosAula ?? []).some(r => r.data === slot.dataStr && String(r.turma) === tid)
    )
  }, [planos, slot.aulaGrade.turmaId, slot.dataStr])

  const abrirRegistro = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const stub = { id: `stub-${slot.aulaGrade.turmaId}`, titulo: slot.plano?.titulo ?? '' }
    setPlanoParaRegistro(stub as any)
    setNovoRegistro({
      dataAula: slot.dataStr, resumoAula: '', funcionouBem: '', fariadiferente: '',
      proximaAula: '', comportamento: '', poderiaMelhorar: '', anotacoesGerais: '',
      urlEvidencia: '', statusAula: undefined,
    } as any)
    setRegistroEditando(null)
    setVerRegistros(false)
    setRegAnoSel(slot.aulaGrade.anoLetivoId ?? '')
    setRegEscolaSel(slot.aulaGrade.escolaId ?? '')
    setRegSegmentoSel(slot.aulaGrade.segmentoId)
    setRegTurmaSel(slot.aulaGrade.turmaId)
    setModalRegistro(true)
  }, [slot, setModalRegistro, setPlanoParaRegistro, setNovoRegistro, setRegistroEditando,
      setVerRegistros, setRegAnoSel, setRegEscolaSel, setRegSegmentoSel, setRegTurmaSel])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const roteiro = slot.plano?.atividadesRoteiro ?? []

  // Filtra atividades ocultas e aplica nomes/descrições editados desta aplicação
  const roteiroVisivel = useMemo(() => {
    const ocultas = new Set(slot.aplicacao?.atividadesOcultas ?? [])
    const nomes = slot.aplicacao?.roteiroNomes ?? {}
    const descs = slot.aplicacao?.roteiroDescricoes ?? {}
    return roteiro
      .filter(a => !ocultas.has(String(a.id)))
      .map(a => ({
        ...a,
        nome: nomes[String(a.id)] ?? a.nome,
        descricao: descs[String(a.id)] ?? a.descricao,
      }))
  }, [roteiro, slot.aplicacao?.atividadesOcultas, slot.aplicacao?.roteiroNomes, slot.aplicacao?.roteiroDescricoes])

  const cor = ESCOLA_COLORS[slot.escolaColorIdx % ESCOLA_COLORS.length]
  const borderColor = isDarkMode ? cor.dark : cor.light

  // Aula passada + não registrada → precisa de ação imediata
  const needsAction = !jaRegistrado && statusHorario(slot.aulaGrade.horario) === 'antes'

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

  const editarItemDesc = useCallback((id: string | number, novaDesc: string) => {
    if (!slot.aplicacao) return
    const aplicacaoId = slot.aplicacao.id
    setAplicacoes(prev =>
      prev.map(a =>
        a.id === aplicacaoId
          ? { ...a, roteiroDescricoes: { ...(a.roteiroDescricoes ?? {}), [String(id)]: novaDesc } }
          : a,
      ),
    )
  }, [slot.aplicacao, setAplicacoes])


  return (
    <>
    <div
      className={`rounded-lg overflow-hidden transition-shadow ${
        jaRegistrado
          ? 'bg-slate-50 dark:bg-[#1A2333]'
          : needsAction
            ? 'bg-white dark:bg-[#1F2937] shadow-md'
            : 'bg-white dark:bg-[#1F2937] shadow-sm hover:shadow-md'
      }`}
      style={{ borderLeft: jaRegistrado ? `2px solid ${borderColor}55` : needsAction ? `4px solid ${borderColor}` : `3px solid ${borderColor}` }}
    >
      {/* Cabeçalho — clicável */}
      <div
        className="px-4 py-3.5 flex items-start gap-3 cursor-pointer select-none"
        onClick={() => setAberto(v => !v)}
      >
        {/* Horário */}
        <div className="text-[10.5px] font-semibold font-mono text-slate-500 dark:text-[#9CA3AF] min-w-[34px] pt-0.5">
          {formatHorario(slot.aulaGrade.horario ?? '')}
        </div>

        {/* Info turma */}
        <div className="flex-1 min-w-0">
          {slot.nomeEscola && (
            <p
              className="text-[10px] font-medium truncate"
              style={{ color: jaRegistrado ? (isDarkMode ? '#6B7280' : '#cbd5e1') : borderColor }}
            >
              {slot.nomeEscola}
            </p>
          )}
          <p className={`text-[13px] font-bold tracking-tight truncate ${
            jaRegistrado ? 'text-slate-400 dark:text-[#4B5563]' : 'text-slate-800 dark:text-[#E5E7EB]'
          }`}>
            {slot.nomeTurma}
          </p>
          {slot.plano ? (
            <p className={`text-xs mt-0.5 truncate ${
              jaRegistrado ? 'text-slate-300 dark:text-[#374151]' : 'text-slate-400 dark:text-[#4B5563]'
            }`}>
              {slot.plano.titulo}
            </p>
          ) : (
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[11px] font-semibold text-amber-500 dark:text-amber-400/80">Sem plano vinculado</p>
              {!jaRegistrado && (
                <button
                  onClick={e => { e.stopPropagation(); setRoteiro(''); setObjetivo(''); setPlanoRapidoAberto(true); setTimeout(() => roteiroRef.current?.focus(), 80) }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium shrink-0"
                >
                  ⚡ Planejar rápido
                </button>
              )}
            </div>
          )}
        </div>

        {/* Ação + Chevron */}
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          {/* Botão Registrar proeminente — só aulas passadas não registradas, card fechado */}
          {needsAction && !aberto && (
            <button
              onClick={abrirRegistro}
              className="shrink-0 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg transition-colors"
            >
              Registrar
            </button>
          )}
          {jaRegistrado && !aberto && (
            <span className="w-2 h-2 rounded-full bg-emerald-500/70 dark:bg-emerald-400/60 shrink-0 mt-0.5" />
          )}
          <svg
            className={`w-3 h-3 text-slate-300 dark:text-[#374151] transition-transform ${aberto ? 'rotate-180' : ''}`}
            viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Conteúdo expandido — animação CSS grid */}
      <div style={{ display: 'grid', gridTemplateRows: aberto ? '1fr' : '0fr', transition: 'grid-template-rows 0.25s ease' }}>
        <div style={{ overflow: aberto ? 'visible' : 'hidden' }}>
          <div className="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-[#374151]">
            {!slot.plano ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-slate-400 dark:text-[#4B5563] italic">Nenhum plano vinculado a esta aula.</p>
                {!jaRegistrado && (
                  <button
                    onClick={e => { e.stopPropagation(); setRoteiro(''); setObjetivo(''); setPlanoRapidoAberto(true); setTimeout(() => roteiroRef.current?.focus(), 80) }}
                    className="self-start text-xs font-semibold text-indigo-400 hover:text-indigo-300 border border-indigo-400/40 hover:border-indigo-300/60 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    ⚡ Planejar rápido
                  </button>
                )}
              </div>
            ) : roteiroVisivel.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-[#4B5563] italic">Sem atividades no roteiro.</p>
            ) : (
              <div className="space-y-2">
                {roteiroVisivel.map((ativ, idx) => (
                  <RoteiroItemEditavel
                    key={String(ativ.id)}
                    ativ={ativ}
                    idx={idx}
                    temAplicacao={!!slot.aplicacao}
                    onEditar={editarItem}
                    onEditarDesc={editarItemDesc}
                    onRemover={removerAtividade}
                  />
                ))}
              </div>
            )}

            {/* Botão registrar pós-aula */}
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#374151]">
              <button
                onClick={abrirRegistro}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  jaRegistrado
                    ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/25'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {jaRegistrado ? 'Registro feito · Editar' : 'Registrar pós-aula'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* ── BOTTOM SHEET: PLANEJAR RÁPIDO ── */}
    {planoRapidoAberto && (
      <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setPlanoRapidoAberto(false)}>
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative w-full max-w-lg bg-white dark:bg-[#1F2937] rounded-t-2xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-600" />
          </div>
          <div className="px-5 pt-2 pb-3 border-b border-slate-100 dark:border-[#374151]">
            <p className="font-bold text-slate-800 dark:text-[#E5E7EB] text-sm">⚡ Planejar rápido</p>
            <p className="text-xs text-slate-400 dark:text-[#6B7280] mt-0.5">{slot.nomeTurma} · {slot.dataStr}</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Objetivo <span className="font-normal normal-case">(opcional)</span></label>
              <textarea
                value={objetivo}
                onChange={e => setObjetivo(e.target.value)}
                rows={2}
                placeholder="O que você espera que os alunos aprendam..."
                className="w-full px-3 py-2 border border-slate-200 dark:border-[#374151] bg-white dark:bg-[#111827] text-slate-800 dark:text-[#E5E7EB] rounded-xl text-sm focus:outline-none focus:border-indigo-400 resize-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Roteiro de atividades <span className="text-red-400">*</span></label>
              <textarea
                ref={roteiroRef}
                value={roteiro}
                onChange={e => setRoteiro(e.target.value)}
                rows={4}
                placeholder="Descreva as atividades planejadas para esta aula..."
                className="w-full px-3 py-2 border border-slate-200 dark:border-[#374151] bg-white dark:bg-[#111827] text-slate-800 dark:text-[#E5E7EB] rounded-xl text-sm focus:outline-none focus:border-indigo-400 resize-none"
              />
            </div>
          </div>
          <div className="px-5 pb-6">
            <button
              disabled={!roteiro.trim()}
              onClick={() => {
                if (!roteiro.trim()) return
                salvarPlanejamentoParaTurma(
                  {
                    anoLetivoId: slot.aulaGrade.anoLetivoId ?? '',
                    escolaId: slot.aulaGrade.escolaId ?? '',
                    segmentoId: slot.aulaGrade.segmentoId,
                    turmaId: slot.aulaGrade.turmaId,
                  },
                  {
                    dataPrevista: slot.dataStr,
                    oQuePretendoFazer: roteiro.trim(),
                    objetivo: objetivo.trim() || undefined,
                    origemAula: 'livre',
                  }
                )
                setPlanoRapidoAberto(false)
                setRoteiro('')
                setObjetivo('')
                showToast('Plano salvo ✓')
              }}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Salvar plano
            </button>
          </div>
        </div>
      </div>
    )}
    </>
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

function CardSemana({ slot, isDarkMode, onClickDia }: { slot: AulaSlot; isDarkMode: boolean; onClickDia?: () => void }) {
  const cor = ESCOLA_COLORS[slot.escolaColorIdx % ESCOLA_COLORS.length]
  const borderColor = isDarkMode ? cor.dark : cor.light
  const semPlano = !slot.plano

  return (
    <div
      onClick={onClickDia}
      className={`rounded-lg bg-white dark:bg-gray-800 p-2.5 text-left w-full ${onClickDia ? 'cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all' : ''}`}
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
  onClickDia: () => void
}

function ColunaDia({ dataStr, short, diaNum, isHoje, escolaColorMap, isDarkMode, onClickDia }: ColunaDiaProps) {
  const slots = useAgendaSlotsForDay(dataStr, escolaColorMap)

  return (
    <div className={`flex flex-col min-w-0 rounded-xl p-2 ${
      isHoje ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-900 bg-blue-50/40 dark:bg-blue-900/10' : ''
    }`}>
      {/* Cabeçalho — clicável para ir ao dia */}
      <button className="text-center mb-2 hover:opacity-70 transition-opacity cursor-pointer" onClick={onClickDia}>
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
      </button>

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
              onClickDia={onClickDia}
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

// ─── BriefingDia — resumo inteligente com IA ─────────────────────────────────

async function gerarBriefingGemini(slots: AulaSlot[]): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('Chave API não configurada.')

  const linhas: string[] = []
  linhas.push(`Data: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}`)
  linhas.push(`Total de aulas: ${slots.length}`)

  const escolas = [...new Set(slots.map(s => s.nomeEscola).filter(Boolean))]
  if (escolas.length) linhas.push(`Escolas: ${escolas.join(', ')}`)

  slots.forEach(s => {
    const h = s.aulaGrade.horario ? ` às ${formatHorario(s.aulaGrade.horario)}` : ''
    if (s.plano) {
      const ativs = (s.plano.atividadesRoteiro ?? []).slice(0, 4).map(a => a.nome).join(', ')
      linhas.push(`- ${s.nomeTurma}${h} | "${s.plano.titulo}"${ativs ? ` | Atividades: ${ativs}` : ''}`)
    } else {
      linhas.push(`- ${s.nomeTurma}${h} | SEM PLANO VINCULADO`)
    }
  })

  const materiais = [...new Set(slots.flatMap(s => s.plano?.materiais ?? []).filter(Boolean))]
  if (materiais.length) linhas.push(`Materiais necessários: ${materiais.join(', ')}`)

  const prompt = `Você é um assistente para professores de música. Com base nas informações do dia abaixo, escreva um briefing CURTO e ÚTIL (máximo 6 linhas) para o professor se preparar. Seja direto, sem saudações nem introdução. Priorize: turmas sem plano, materiais a preparar, variedade de atividades, alertas importantes. Use português claro e profissional. Não invente nada além do que foi fornecido.

${linhas.join('\n')}

Escreva apenas o briefing, sem títulos nem markdown.`

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  )
  if (!resp.ok) throw new Error(`Erro ${resp.status}`)
  const data = await resp.json()
  const texto = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  if (!texto) throw new Error('Resposta vazia')
  return texto.trim()
}

function BriefingDia({ slots }: { slots: AulaSlot[] }) {
  const [texto, setTexto] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [fechado, setFechado] = useState(false)

  // Limpa ao mudar o dia
  useEffect(() => {
    setTexto(null); setErro(null); setFechado(false)
  }, [slots])

  if (slots.length === 0 || fechado) return null

  async function gerar() {
    setCarregando(true); setErro(null)
    try {
      setTexto(await gerarBriefingGemini(slots))
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao gerar briefing')
    } finally {
      setCarregando(false)
    }
  }

  if (!texto && !carregando && !erro) {
    return (
      <div className="mb-5">
        <button
          onClick={gerar}
          className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Gerar briefing do dia com IA
        </button>
      </div>
    )
  }

  return (
    <div className="mb-5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/30 px-4 py-3.5 relative">
      <button
        onClick={() => setFechado(true)}
        className="absolute top-2.5 right-2.5 w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-sm leading-none"
        title="Fechar"
      >
        ×
      </button>

      <div className="flex items-center gap-2 mb-2">
        <svg className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Briefing do dia</span>
        {!carregando && (
          <button
            onClick={gerar}
            className="ml-auto mr-6 text-[10px] text-indigo-400 dark:text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
            title="Regerar"
          >
            atualizar
          </button>
        )}
      </div>

      {carregando && (
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-[#9CA3AF]">
          <span className="w-3 h-3 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin shrink-0" />
          Gerando...
        </div>
      )}
      {erro && <p className="text-xs text-red-500 dark:text-red-400">{erro}</p>}
      {texto && (
        <p className="text-sm text-slate-700 dark:text-[#E5E7EB] leading-relaxed whitespace-pre-line">{texto}</p>
      )}
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
  const isHoje = dataStr === toStr(new Date())

  // Índice da próxima aula (só relevante para hoje)
  const proximaIdx = useMemo(() => {
    if (!isHoje) return -1
    return slots.findIndex(s => statusHorario(s.aulaGrade.horario) !== 'antes')
  }, [slots, isHoje])

  if (slots.length === 0) {
    return (
      <div className="py-14 text-center">
        <p className="text-sm text-slate-400 dark:text-[#4B5563]">Nenhuma aula neste dia</p>
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-4">
        {slots.map((slot, idx) => (
          <AulaCard
            key={`${slot.aulaGrade.id}-${slot.dataStr}`}
            slot={slot}
            isDarkMode={isDarkMode}
            isProxima={isHoje && idx === proximaIdx}
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
  const { planos } = usePlanosContext()

  const hoje = useMemo(() => toStr(new Date()), [])

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

  // Label "segunda, 25 de março"
  const labelDia = useMemo(() => {
    const d = new Date(hoje + 'T12:00:00')
    const nomes = ['domingo','segunda','terça','quarta','quinta','sexta','sábado']
    return `${nomes[d.getDay()]}, ${d.getDate()} de ${MESES_LONGOS[d.getMonth()]}`
  }, [hoje])

  // Slots + stats de hoje
  const slotsHoje = useAgendaSlotsForDay(hoje, escolaColorMap)

  const statsHoje = useMemo(() => {
    const total = slotsHoje.length
    const registradas = slotsHoje.filter(s => {
      const tid = String(s.aulaGrade.turmaId)
      return planos.some(p => (p.registrosPosAula ?? []).some(r => r.data === s.dataStr && String(r.turma) === tid))
    }).length
    return { total, registradas, pendentes: total - registradas }
  }, [slotsHoje, planos])

  const headerMsg = useMemo(() => {
    if (!statsHoje.total) return 'Você não tem aulas hoje'
    if (!statsHoje.pendentes) return 'Tudo registrado \u2713'
    if (!statsHoje.registradas) return `Você tem ${statsHoje.total} aula${statsHoje.total !== 1 ? 's' : ''} hoje`
    return `Registrar ${statsHoje.pendentes} aula${statsHoje.pendentes !== 1 ? 's' : ''} pendente${statsHoje.pendentes !== 1 ? 's' : ''}`
  }, [statsHoje])

  return (
    <div className="mx-auto px-4 pb-10 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-slate-900 dark:text-[#E5E7EB] leading-tight">
          {headerMsg}
        </h1>
        <p className="text-sm text-slate-400 dark:text-[#4B5563] capitalize mt-0.5">{labelDia}</p>

        {statsHoje.total > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2">
              {statsHoje.pendentes > 0 && (
                <span className="text-[11px] font-semibold text-slate-500 dark:text-[#9CA3AF]">
                  {statsHoje.pendentes} a registrar
                </span>
              )}
              {statsHoje.pendentes > 0 && statsHoje.registradas > 0 && (
                <span className="text-slate-300 dark:text-[#374151]">·</span>
              )}
              {statsHoje.registradas > 0 && (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400/80">
                  {statsHoje.registradas} concluída{statsHoje.registradas !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="w-full h-[3px] bg-slate-100 dark:bg-[#374151] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#5B5FEA] dark:bg-[#818cf8] rounded-full transition-all duration-500"
                style={{ width: `${(statsHoje.registradas / statsHoje.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <BriefingDia slots={slotsHoje} />

      <AgendaDia dataStr={hoje} escolaColorMap={escolaColorMap} isDarkMode={isDarkMode} />
    </div>
  )
}
