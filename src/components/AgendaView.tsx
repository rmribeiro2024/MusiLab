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
  const [aberto, setAberto] = useState(false)

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
    <div
      className={`rounded-lg overflow-hidden transition-shadow ${
        jaRegistrado
          ? 'bg-slate-50 dark:bg-[#1A2333]'
          : 'bg-white dark:bg-[#1F2937] shadow-sm hover:shadow-md'
      } ${isProxima ? 'ring-1 ring-[#5B5FEA]/30' : ''}`}
      style={{ borderLeft: jaRegistrado ? `2px solid ${borderColor}55` : `3px solid ${borderColor}` }}
    >
      {/* Label "próxima" — só aparece quando a aula é a próxima do dia */}
      {isProxima && (
        <div className="px-4 pt-2.5 pb-0">
          <span className="text-[11px] font-semibold text-[#5B5FEA] dark:text-[#818cf8] uppercase tracking-[0.06em]">
            Próxima
          </span>
        </div>
      )}

      {/* Cabeçalho — clicável */}
      <div
        className="px-4 py-3 flex items-start gap-3 cursor-pointer select-none"
        onClick={() => setAberto(v => !v)}
      >
        {/* Horário */}
        <div className="text-[10.5px] font-semibold font-mono text-slate-500 dark:text-[#9CA3AF] min-w-[34px] pt-0.5">
          {formatHorario(slot.aulaGrade.horario ?? '')}
        </div>

        {/* Info turma */}
        <div className="flex-1 min-w-0">
          {slot.nomeEscola && (
            <p className="text-[10px] font-medium truncate" style={{ color: borderColor }}>
              {slot.nomeEscola}
            </p>
          )}
          <p className={`text-[13px] font-bold tracking-tight truncate ${
            jaRegistrado ? 'text-slate-400 dark:text-[#4B5563]' : 'text-slate-800 dark:text-[#E5E7EB]'
          }`}>
            {slot.nomeTurma}
          </p>
          {slot.plano ? (
            <p className="text-xs text-slate-400 dark:text-[#4B5563] mt-0.5 truncate">
              {slot.plano.titulo}
            </p>
          ) : (
            <p className="text-[11px] font-semibold text-amber-500 dark:text-amber-400/80 mt-0.5">Sem plano vinculado</p>
          )}
        </div>

        {/* Indicador de registro + Chevron */}
        <div className="flex items-center gap-2 shrink-0 pt-1">
          {/* Botão rápido: só aparece em aulas passadas não registradas, com card fechado */}
          {!jaRegistrado && !aberto && statusHorario(slot.aulaGrade.horario) === 'antes' && (
            <button
              onClick={abrirRegistro}
              className="text-[11px] font-semibold text-[#5B5FEA] dark:text-[#818cf8] hover:text-[#4f53d4] dark:hover:text-[#a5b4fc] transition-colors"
            >
              Registrar
            </button>
          )}
          {jaRegistrado && !aberto && (
            <span className="w-2 h-2 rounded-full bg-emerald-500/70 dark:bg-emerald-400/60 shrink-0" />
          )}
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
          <div className="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-[#374151]">
            {!slot.plano ? (
              <p className="text-sm text-slate-400 dark:text-[#4B5563] italic">Nenhum plano vinculado a esta aula.</p>
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
  const { planos } = usePlanosContext()
  const isHoje = dataStr === toStr(new Date())

  // Stats para o resumo
  const stats = useMemo(() => {
    const total = slots.length
    const comPlano = slots.filter(s => s.plano).length
    const registradas = slots.filter(s => {
      const tid = String(s.aulaGrade.turmaId)
      return planos.some(p => (p.registrosPosAula ?? []).some(r => r.data === s.dataStr && String(r.turma) === tid))
    }).length
    const pendentes = total - registradas
    return { total, comPlano, registradas, pendentes }
  }, [slots, planos])

  // Índice da próxima aula (só relevante para hoje)
  const proximaIdx = useMemo(() => {
    if (!isHoje) return -1
    // Primeira aula com status 'agora' ou 'depois' (ainda não aconteceu/está acontecendo)
    const idx = slots.findIndex(s => statusHorario(s.aulaGrade.horario) !== 'antes')
    return idx
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
      {/* Barra de resumo */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-[#9CA3AF]">
          {stats.total} aula{stats.total !== 1 ? 's' : ''}
        </span>
        <span className="text-slate-300 dark:text-[#374151]">·</span>
        <span className={`text-[11px] font-semibold ${stats.comPlano === stats.total ? 'text-[#5B5FEA] dark:text-[#818cf8]' : 'text-amber-500 dark:text-amber-400/80'}`}>
          {stats.comPlano === stats.total ? 'Todas planejadas' : `${stats.comPlano} planejada${stats.comPlano !== 1 ? 's' : ''}`}
        </span>
        {stats.registradas > 0 && (
          <>
            <span className="text-slate-300 dark:text-[#374151]">·</span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400/80">
              {stats.registradas} registrada{stats.registradas !== 1 ? 's' : ''}
            </span>
          </>
        )}
        {isHoje && stats.pendentes > 0 && stats.pendentes < stats.total && (
          <>
            <span className="text-slate-300 dark:text-[#374151]">·</span>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-[#4B5563]">
              {stats.pendentes} a registrar
            </span>
          </>
        )}
      </div>

      {/* Barra de progresso do dia */}
      {stats.total > 0 && (
        <div className="w-full h-[3px] bg-slate-100 dark:bg-[#374151] rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-[#5B5FEA] dark:bg-[#818cf8] rounded-full transition-all duration-500"
            style={{ width: `${(stats.registradas / stats.total) * 100}%` }}
          />
        </div>
      )}

      <div className="space-y-3">
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

  // Slots de hoje para o header inteligente (sem re-renderizar AgendaDia)
  const slotsHoje = useAgendaSlotsForDay(hoje, escolaColorMap)

  const headerMsg = useMemo(() => {
    const total = slotsHoje.length
    if (total === 0) return 'Você não tem aulas hoje'
    const registradas = slotsHoje.filter(s => {
      const tid = String(s.aulaGrade.turmaId)
      return planos.some(p => (p.registrosPosAula ?? []).some(r => r.data === s.dataStr && String(r.turma) === tid))
    }).length
    const pendentes = total - registradas
    if (pendentes === 0) return 'Tudo registrado \u2713'
    if (registradas === 0) return `Você tem ${total} aula${total !== 1 ? 's' : ''} hoje`
    return `Registrar ${pendentes} aula${pendentes !== 1 ? 's' : ''} pendente${pendentes !== 1 ? 's' : ''}`
  }, [slotsHoje, planos])

  return (
    <div className="mx-auto px-4 pb-10 max-w-2xl">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-slate-900 dark:text-[#E5E7EB] leading-tight">
          {headerMsg}
        </h1>
        <p className="text-sm text-slate-400 dark:text-[#4B5563] capitalize mt-0.5">{labelDia}</p>
      </div>
      <AgendaDia dataStr={hoje} escolaColorMap={escolaColorMap} isDarkMode={isDarkMode} />
    </div>
  )
}
