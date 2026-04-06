// src/components/VisaoSemana.tsx
// Etapa 4 — Visão da Semana (Planejamento)
// Mostra o grid SEG–SEX com turmas agendadas. Foco: preparação (não registro).

import React, { useState, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useCalendarioContext } from '../contexts/CalendarioContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import { usePlanosContext } from '../contexts/PlanosContext'
import { useRepertorioContext } from '../contexts/RepertorioContext'
import { usePlanejamentoTurmaContext } from '../contexts/PlanejamentoTurmaContext'
import { useAplicacoesContext } from '../contexts/AplicacoesContext'
import type { AnoLetivo, RegistroPosAula } from '../types'
import { showToast } from '../lib/toast'
import ModalCardHero, { type ModalCardHeroProps, RegistroField, ActionButton } from './modals/ModalCardHero'
import { stripHTML } from '../lib/utils'
import VisaoMes from './VisaoMes'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DIAS = [
  { key: 'seg', short: 'Seg' },
  { key: 'ter', short: 'Ter' },
  { key: 'qua', short: 'Qua' },
  { key: 'qui', short: 'Qui' },
  { key: 'sex', short: 'Sex' },
] as const

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

// Para planejamento: domingo já aponta para a semana seguinte
function getSemanaAtualInicio(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const monday = getMondayOf(d)
  const day = d.getDay()
  return (day === 0 || day === 6) ? addDays(monday, 7) : monday
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toYMD(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function formatHorario(h: string): string {
  // "08:30" → "08h30" | "08:00" → "08h"
  if (!h) return ''
  const [hh, mm] = h.split(':')
  return mm === '00' ? `${hh}h` : `${hh}h${mm}`
}

// ── Helper de nome de turma (mesmo padrão do AgendaSemanal) ──────────────────
function getNomeTurma(anoLetivoId: string | undefined, escolaId: string | undefined, segmentoId: string, turmaId: string, anosLetivos: AnoLetivo[]): string {
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

function getNomeEscola(anoLetivoId: string | undefined, escolaId: string | undefined, anosLetivos: AnoLetivo[]): string {
  if (!anoLetivoId || !escolaId) return ''
  // eslint-disable-next-line eqeqeq
  const ano = anosLetivos.find(a => a.id == anoLetivoId)
  // eslint-disable-next-line eqeqeq
  return ano?.escolas.find(e => e.id == escolaId)?.nome ?? ''
}

// ─── Status da última aula ────────────────────────────────────────────────────

type StatusEfetivo = 'concluida' | 'revisao' | 'incompleta' | 'nao_houve' | null

/** Migra campos legados para o novo statusAula unificado */
function inferStatus(r: RegistroPosAula): StatusEfetivo {
  if (r.statusAula === 'parcial') return 'incompleta'
  if (r.statusAula) return r.statusAula as StatusEfetivo
  // legado: proximaAulaOpcao
  if (r.proximaAulaOpcao === 'nova')         return 'concluida'
  if (r.proximaAulaOpcao === 'revisar-nova') return 'revisao'
  if (r.proximaAulaOpcao === 'revisar')      return 'incompleta'
  // legado: resultadoAula
  if (r.resultadoAula === 'bem' || r.resultadoAula === 'funcionou') return 'concluida'
  if (r.resultadoAula === 'parcial')                                 return 'incompleta'
  if (r.resultadoAula === 'nao' || r.resultadoAula === 'nao_funcionou') return 'incompleta'
  return null
}

// Sugestão: texto neutro uniforme para todos os status
const STATUS_CFG: Record<NonNullable<StatusEfetivo>, {
  emoji: string
  label: string
  acao: string
  textClass: string
}> = {
  concluida:  { emoji: '✓', label: 'Concluída', acao: 'avançar',   textClass: 'text-[#6B7280] dark:text-[#9CA3AF]' },
  incompleta: { emoji: '◑', label: 'Parcial',   acao: 'retomar',   textClass: 'text-[#6B7280] dark:text-[#9CA3AF]' },
  revisao:    { emoji: '◑', label: 'Parcial',   acao: 'retomar',   textClass: 'text-[#6B7280] dark:text-[#9CA3AF]' },
  nao_houve:  { emoji: '—', label: 'Não houve', acao: 'reaplicar', textClass: 'text-[#6B7280] dark:text-[#9CA3AF]' },
}

// Paleta de cores por escola — aplicada no nome da escola (tons suaves)
const ESCOLA_COLORS: { light: string; dark: string }[] = [
  { light: '#7c83d4', dark: '#bfc3f5' },  // indigo suave
  { light: '#3b8fc2', dark: '#9dd5f0' },  // sky suave
  { light: '#2a9c70', dark: '#8edbbf' },  // emerald suave
  { light: '#b8860e', dark: '#e6be6a' },  // amber suave
  { light: '#c0527a', dark: '#f0a8c3' },  // pink suave
  { light: '#7a5bbf', dark: '#c8b4f0' },  // violet suave
  { light: '#c94040', dark: '#f0a8a8' },  // red suave
  { light: '#1a9090', dark: '#7dd8d8' },  // teal suave
]

// ─── Sub-componente: seção "Última aula" / "Aula planejada" ──────────────────

function UltimaAulaSection({ registro, temPlano, foiRegistrada }: { registro: RegistroPosAula | null; temPlano?: boolean; foiRegistrada?: boolean }) {
  const status = registro ? inferStatus(registro) : null
  const cfg = status ? STATUS_CFG[status] : null

  // Quando há plano para esta data: mostra confirmação, não a sugestão
  if (temPlano) {
    return (
      <div className="px-[10px] pt-[5px] pb-[8px] border-t border-emerald-100 dark:border-emerald-500/20">
        <div className="flex items-center gap-[5px]">
          {foiRegistrada ? (
            <span className="text-[10.5px] text-slate-400 dark:text-slate-500">✓ Aula concluída</span>
          ) : (
            <span className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">✓ Aula planejada</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="px-[10px] pt-[5px] pb-[8px] border-t border-[#E6EAF0] dark:border-[#2D3748]">
      {cfg ? (
        <div className="flex items-center gap-[5px]">
          <span className="text-[9px] font-semibold uppercase tracking-[.6px] text-[#94A3B8] dark:text-[#8E99A8] shrink-0">
            Sugestão:
          </span>
          <span className="text-[10.5px] font-medium text-[#6B7280] dark:text-[#9CA3AF]">
            {cfg.emoji} {cfg.acao}
          </span>
        </div>
      ) : (
        <span className="text-[10px] text-slate-400 dark:text-[#6B7280]">sem último registro</span>
      )}
    </div>
  )
}

// ─── Inline Card Drawer (4º modo de visualização) ────────────────────────────

interface InlineCardDrawerProps {
  heroCard: {
    turmaNome: string; escolaNome: string; escolaCor: { light: string; dark: string } | null
    ymd: string; horario: string; diaSemanaShort: string
    cardState: 'comPlano' | 'registrada' | 'sugestao' | 'vazio'
    planoTitulo: string | null; objetivo: string | null
    registro: any; ultimoReg: any; ultimoRegData: string | null
    planoData?: any
  }
  onClose: () => void
  onEditar: () => void
  onRegistrar: () => void
  onCriarPlano: () => void
  onAdaptarAnterior: () => void
  onBuscarBanco: () => void
  onVerHistorico: () => void
}

function InlineCardDrawer({ heroCard, onClose, onEditar, onRegistrar, onCriarPlano, onAdaptarAnterior, onBuscarBanco, onVerHistorico }: InlineCardDrawerProps) {
  const [visible, setVisible] = React.useState(false)
  const [expandedActs, setExpandedActs] = React.useState<Set<number>>(new Set())
  React.useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  function toggleAct(i: number) {
    setExpandedActs(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const { turmaNome, escolaNome, escolaCor, ymd, horario, diaSemanaShort,
    cardState, planoTitulo, objetivo, registro, ultimoReg, ultimoRegData, planoData } = heroCard

  const dataLabel    = `${diaSemanaShort}, ${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`
  const horarioLabel = horario ? horario.replace(/:00$/, 'h').replace(/:(\d{2})$/, 'h$1') : ''

  const funcionouBem   = stripHTML(registro?.funcionouBem ?? '') || null
  const repetiria      = stripHTML((registro as any)?.repetiria ?? '') || null
  const fariadiferente = stripHTML(registro?.fariadiferente ?? (registro as any)?.naoFuncionou ?? '') || null
  const statusReg      = registro ? inferStatus(registro) : null
  const statusLabel    = statusReg ? STATUS_CFG[statusReg].label : null
  const temConteudoReg = !!(funcionouBem || repetiria || fariadiferente || statusLabel)

  const ultStatus         = ultimoReg ? inferStatus(ultimoReg) : null
  const ultStatusLabel    = ultStatus ? STATUS_CFG[ultStatus].label : null
  const ultRepetiria      = ultStatus !== 'nao_houve'
    ? (stripHTML((ultimoReg as any)?.repetiria ?? '') || stripHTML(ultimoReg?.funcionouBem ?? '') || null)
    : null
  const ultFariadiferente = ultStatus !== 'nao_houve'
    ? (stripHTML(ultimoReg?.fariadiferente ?? '') || stripHTML((ultimoReg as any)?.naoFuncionou ?? '') || null)
    : null
  const ultAcao           = ultStatus ? STATUS_CFG[ultStatus].acao : 'Planejar próxima aula'

  const escolaVar = escolaCor
    ? ({ '--escola-l': escolaCor.light, '--escola-d': escolaCor.dark } as React.CSSProperties)
    : undefined

  const top = (heroCard as any).triggerRect?.bottom ?? 120

  return createPortal(
    <div style={{
      position: 'fixed',
      top: top + 4,
      left: '216px',
      right: 0,
      opacity: visible ? 1 : 0,
      transform: `translateY(${visible ? '0' : '-8px'})`,
      zIndex: 200,
      transition: 'opacity 200ms ease, transform 220ms ease',
      maxHeight: `calc(100vh - ${top + 24}px)`,
      overflowY: 'auto',
    }}>
      <div className="v2-card rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] overflow-hidden mx-2 mb-2" style={escolaVar}>

          {/* Body */}
          <div className="px-4 py-3 space-y-2 overflow-y-auto" style={{ maxHeight: '70vh' }}>
            {cardState === 'comPlano' && (
              <div className="space-y-2">
                {planoTitulo
                  ? <div className="flex items-start gap-2">
                      <span className="text-[12px] shrink-0 mt-0.5">📋</span>
                      <div>
                        <p className="text-[13px] font-semibold text-slate-800 dark:text-[#E5E7EB] leading-snug">{planoTitulo}</p>
                        {objetivo && <p className="text-[12px] text-slate-500 dark:text-[#9CA3AF] mt-0.5 leading-snug">{objetivo}</p>}
                      </div>
                    </div>
                  : <p className="text-[12px] text-slate-400 dark:text-[#6B7280] italic">Aula planejada para este dia.</p>
                }
                {planoData?.atividadesRoteiro?.length > 0 && (
                  <div className="pt-2 border-t border-[#F1F3F8] dark:border-[#2d3748] space-y-1">
                    <p className="text-[10px] font-semibold text-slate-400 dark:text-[#6B7280] uppercase tracking-wide mb-1.5">Atividades</p>
                    {planoData.atividadesRoteiro.map((a: any, i: number) => {
                      const isOpen = expandedActs.has(i)
                      const hasDesc = !!a.descricao
                      return (
                        <div key={i}>
                          <button
                            onClick={(e) => { e.stopPropagation(); hasDesc && toggleAct(i) }}
                            className={`w-full flex items-center gap-2 text-left rounded px-1 py-1 -mx-1 transition-colors ${hasDesc ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1f2937]' : 'cursor-default'}`}
                          >
                            <span className="text-[11px] text-slate-400 dark:text-[#6B7280] shrink-0 w-4">{i + 1}.</span>
                            <span className="text-[12px] font-medium text-slate-700 dark:text-[#D1D5DB] flex-1 leading-snug">{a.nome || a.titulo || '—'}</span>
                            {a.duracao && <span className="text-[11px] text-slate-400 dark:text-[#6B7280] shrink-0">· {a.duracao}min</span>}
                            {hasDesc && (
                              <span className="text-[10px] text-slate-300 dark:text-[#4B5563] shrink-0 ml-0.5">{isOpen ? '▾' : '▸'}</span>
                            )}
                          </button>
                          {isOpen && hasDesc && (
                            <div
                              className="ml-5 mt-1 mb-1.5 text-[12px] text-slate-500 dark:text-[#9CA3AF] leading-relaxed [&_p]:mb-1.5 [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:ml-4 [&_ol]:list-decimal [&_li]:mb-1 [&_h2]:font-semibold [&_h2]:text-slate-700 [&_h2]:dark:text-[#D1D5DB] [&_h2]:mt-1.5 [&_h2]:mb-0.5 [&_strong]:font-semibold [&_a]:text-indigo-500 [&_a]:underline"
                              dangerouslySetInnerHTML={{ __html: a.descricao }}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {cardState === 'registrada' && (
              <div className="space-y-2">
                {planoTitulo && <p className="text-[12px] font-semibold text-slate-700 dark:text-[#D1D5DB] pb-2 border-b border-[#F1F3F8] dark:border-[#2d3748]">📋 {planoTitulo}</p>}
                {registro?.resumoAula && <RegistroField icon="📝" label="Resumo" text={registro.resumoAula} />}
                {funcionouBem && <RegistroField icon="⭐" label="Funcionou" text={funcionouBem} />}
                {fariadiferente && <RegistroField icon="🔄" label="Faria diferente" text={fariadiferente} />}
                {registro?.proximaAula && <RegistroField icon="➡️" label="Próxima aula" text={registro.proximaAula} />}
                {registro?.comportamento && <RegistroField icon="👥" label="Turma" text={registro.comportamento} />}
                {statusLabel && <p className="text-[11px] text-slate-400 dark:text-[#6B7280]">Como foi: <span className="font-medium">{statusLabel}</span></p>}
                {!registro?.resumoAula && !funcionouBem && !fariadiferente && !statusLabel && (
                  <p className="text-[12px] text-slate-400 dark:text-[#6B7280] italic">Sem detalhes preenchidos.</p>
                )}
              </div>
            )}

            {cardState === 'sugestao' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px]">💡</span>
                    <p className="text-[13px] font-semibold text-slate-700 dark:text-[#D1D5DB]">Sugestão: {ultAcao}</p>
                  </div>
                  <button onClick={onVerHistorico} className="text-[11px] text-indigo-500 dark:text-indigo-400 hover:underline shrink-0">
                    Ver histórico →
                  </button>
                </div>
                <div className="pt-2 border-t border-[#F1F3F8] dark:border-[#2d3748] space-y-1.5">
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-[#6B7280] uppercase tracking-wide">📋 Última aula{ultimoRegData ? ` · ${ultimoRegData}` : ''}</p>
                  {ultimoReg?.resumoAula && <RegistroField icon="📝" label="Resumo" text={ultimoReg.resumoAula} />}
                  {ultRepetiria && <RegistroField icon="⭐" label="Funcionou" text={ultRepetiria} />}
                  {ultFariadiferente && <RegistroField icon="🔄" label="Faria diferente" text={ultFariadiferente} />}
                  {ultimoReg?.proximaAula && <RegistroField icon="➡️" label="Próxima aula" text={ultimoReg.proximaAula} />}
                  {ultStatusLabel && <p className="text-[11px] text-slate-400 dark:text-[#6B7280]">Como foi: <span className="font-medium">{ultStatusLabel}</span></p>}
                  {!ultimoReg?.resumoAula && !ultRepetiria && !ultFariadiferente && !ultimoReg?.proximaAula && !ultStatusLabel && (
                    <p className="text-[12px] text-slate-400 dark:text-[#6B7280] italic">Sem detalhes no último registro.</p>
                  )}
                </div>
              </div>
            )}

            {cardState === 'vazio' && (
              <p className="text-[12px] text-slate-400 dark:text-[#6B7280] text-center py-1 italic">Nenhum plano para esta aula.</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 pb-4 pt-1">
            {cardState === 'comPlano' && (
              <div className="flex gap-2">
                <ActionButton onClick={onEditar} label="✏️ Editar" variant="secondary" />
                <ActionButton onClick={onRegistrar} label="📝 Registrar" variant="primary" fullWidth />
              </div>
            )}
            {cardState === 'registrada' && (
              <div className="flex gap-2">
                <ActionButton onClick={onEditar} label="✏️ Ver planejamento" variant="secondary" fullWidth />
              </div>
            )}
            {(cardState === 'sugestao' || cardState === 'vazio') && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-[#6B7280] uppercase tracking-wide mb-2">Como planejar?</p>
                <button
                  onClick={onCriarPlano}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-[8px] border border-[#E6EAF0] dark:border-[#374151] hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/[0.08] text-left transition-all group"
                >
                  <span className="text-[13px]">✏️</span>
                  <div>
                    <p className="text-[12px] font-semibold text-slate-700 dark:text-[#D1D5DB]">Do zero</p>
                    <p className="text-[10px] text-slate-400 dark:text-[#6B7280]">Criar plano em branco</p>
                  </div>
                </button>
                {ultimoReg && (
                  <button
                    onClick={onAdaptarAnterior}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-[8px] border border-[#E6EAF0] dark:border-[#374151] hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/[0.08] text-left transition-all"
                  >
                    <span className="text-[13px]">🔄</span>
                    <div>
                      <p className="text-[12px] font-semibold text-slate-700 dark:text-[#D1D5DB]">Adaptar da anterior</p>
                      <p className="text-[10px] text-slate-400 dark:text-[#6B7280]">Basear na última aula{ultimoRegData ? ` · ${ultimoRegData}` : ''}</p>
                    </div>
                  </button>
                )}
                <button
                  onClick={onBuscarBanco}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-[8px] border border-[#E6EAF0] dark:border-[#374151] hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/[0.08] text-left transition-all"
                >
                  <span className="text-[13px]">🏛️</span>
                  <div>
                    <p className="text-[12px] font-semibold text-slate-700 dark:text-[#D1D5DB]">Buscar no Banco</p>
                    <p className="text-[10px] text-slate-400 dark:text-[#6B7280]">Reutilizar aula existente</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
    </div>,
    document.body
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function VisaoSemana() {
  const {
    obterTurmasDoDia,
    setPlanoParaRegistro, setNovoRegistro, setRegistroEditando,
    setVerRegistros, setRegAnoSel, setRegEscolaSel, setRegSegmentoSel, setRegTurmaSel,
  } = useCalendarioContext()
  const { anosLetivos } = useAnoLetivoContext()
  const { planos } = usePlanosContext()
  const { setViewMode } = useRepertorioContext()
  const { selecionarTurma, setDataNavegacao, planejamentos, copiarPlanejamento, excluirPlanejamento, setModoInicialNavegacao } = usePlanejamentoTurmaContext()
  const { aplicacoes } = useAplicacoesContext()

  // ── Drag-drop entre cards ──────────────────────────────────────────────────
  const [dragSrcId, setDragSrcId] = useState<string | null>(null)   // "${turmaId}-${ymd}"
  const [dragOverId, setDragOverId] = useState<string | null>(null) // "${turmaId}-${ymd}"
  type CopyConfirm = { srcPlanoId: string; srcNome: string; dst: { anoLetivoId: string; escolaId: string; segmentoId: string; turmaId: string }; dstNome: string; dataPrevista: string }
  const [copyConfirm, setCopyConfirm] = useState<CopyConfirm | null>(null)

  type MesmaSerieItem = { dst: { anoLetivoId: string; escolaId: string; segmentoId: string; turmaId: string }; turmaNome: string; escolaNome: string; ymd: string; diaNome: string }
  type MesmaSerieConfirm = { planoId: string; srcNome: string; itens: MesmaSerieItem[] }
  const [mesmaSerieConfirm, setMesmaSerieConfirm] = useState<MesmaSerieConfirm | null>(null)

  // ── Modo "Copiar para turmas" ─────────────────────────────────────────────
  type CopiarModoState = { planoId: string; srcTidStr: string; srcYmd: string; srcNome: string; srcEscolaId: string; srcSegmentoId: string }
  const [menuAberto, setMenuAberto] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  React.useEffect(() => {
    if (!menuAberto) return
    const handler = () => setMenuAberto(null)
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuAberto])
  const [copiarModo, setCopiarModo] = useState<CopiarModoState | null>(null)
  const [copiadosNaModo, setCopiadosNaModo] = useState<Map<string, string>>(new Map()) // Map<tidYmd, planejamentoId>

  type HeroCardData = Omit<ModalCardHeroProps, 'onClose' | 'onEditar' | 'onRegistrar' | 'onCriarPlano' | 'animStyle'> & {
    animStyle: 'center' | 'bottomSheet' | 'sharedElement' | 'inlineDrawer'
    navParams: { anoLetivoId: string; escolaId: string; segmentoId: string; turmaId: string; date: Date }
  }
  const [heroCard, setHeroCard] = useState<HeroCardData | null>(null)

  // Mobile detection
  const isMobile = 'ontouchstart' in window

  // Estilo de animação do Card Hero — persiste no localStorage (desktop) / sempre bottomSheet no mobile
  type HeroAnimStyle = 'center' | 'bottomSheet' | 'sharedElement' | 'inlineDrawer'
  const [heroAnimStyle, setHeroAnimStyle] = useState<HeroAnimStyle>(
    () => (localStorage.getItem('heroAnimStyle') as HeroAnimStyle | null) ?? 'center'
  )
  const setAndSaveAnimStyle = (s: HeroAnimStyle) => {
    setHeroAnimStyle(s)
    localStorage.setItem('heroAnimStyle', s)
  }
  const effectiveAnimStyle: HeroAnimStyle = isMobile ? 'bottomSheet' : heroAnimStyle


  React.useEffect(() => {
    if (!copiarModo) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { copiadosNaModo.forEach(id => excluirPlanejamento(id)); setCopiarModo(null); setCopiadosNaModo(new Map()) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [copiarModo])

  // Estado local de navegação — não interfere com AgendaSemanal
  const [semanaInicio, setSemanaInicio] = useState<Date>(() => getSemanaAtualInicio())
  const [vistaAtiva, setVistaAtiva] = useState<'semana' | 'mes'>('semana')

  // Mobile: índice do dia visível (0=Seg … 4=Sex)
  const todayDayIdx = (() => { const d = new Date().getDay(); return (d >= 1 && d <= 5) ? d - 1 : 0 })()
  const [mobileDayIdx, setMobileDayIdx] = useState(todayDayIdx)

  // Swipe horizontal — no mobile navega dias, no desktop navega semanas
  const swipeTouchStartX = React.useRef(0)
  const swipeTouchStartTime = React.useRef(0)
  const onSwipeTouchStart = (e: React.TouchEvent) => {
    swipeTouchStartX.current = e.touches[0].clientX
    swipeTouchStartTime.current = Date.now()
  }
  const onSwipeTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - swipeTouchStartX.current
    const deltaTime = Date.now() - swipeTouchStartTime.current
    if (Math.abs(deltaX) < 55 || deltaTime > 450) return
    if (isMobile) {
      if (deltaX < 0) {
        // swipe esquerda → próximo dia
        if (mobileDayIdx < 4) setMobileDayIdx(i => i + 1)
        else { setSemanaInicio(prev => addDays(prev, 7)); setMobileDayIdx(0) }
      } else {
        // swipe direita → dia anterior
        if (mobileDayIdx > 0) setMobileDayIdx(i => i - 1)
        else { setSemanaInicio(prev => addDays(prev, -7)); setMobileDayIdx(4) }
      }
    } else {
      setSemanaInicio(prev => addDays(prev, deltaX < 0 ? 7 : -7))
    }
  }

  const hoje = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const semanaFim = addDays(semanaInicio, 4) // sexta-feira

  // Datas de cada coluna
  const diasDaSemana = DIAS.map((d, i) => ({
    ...d,
    date: addDays(semanaInicio, i),
    ymd:  toYMD(addDays(semanaInicio, i)),
  }))

  // ── Aulas por dia — usa obterTurmasDoDia (mesmo dado que o AgendaSemanal) ─
  const aulasPorDia = useMemo(() =>
    diasDaSemana.map(({ key, ymd }) => ({
      key,
      aulas: obterTurmasDoDia(ymd)
        .sort((a, b) => (a.horario ?? '').localeCompare(b.horario ?? '')),
    }))
  , [diasDaSemana, obterTurmasDoDia])

  // ── Mapa escolaId → par de cores { light, dark } ─────────────────────────
  const escolaColorMap = useMemo(() => {
    const map: Record<string, { light: string; dark: string }> = {}
    let idx = 0
    anosLetivos.forEach(ano => {
      ano.escolas.forEach(esc => {
        const key = String(esc.id)
        if (!map[key]) {
          map[key] = ESCOLA_COLORS[idx % ESCOLA_COLORS.length]
          idx++
        }
      })
    })
    return map
  }, [anosLetivos])

  // Set de "turmaId-ymd" para badge ✓ (dia-específico)
  // Inclui: planejamentos do módulo "Aula por Turma" + aplicações do banco de planos
  const turmasComPlano = useMemo(() => {
    const s = new Set<string>()
    planejamentos.forEach(p => {
      if (p.dataPrevista) s.add(`${p.turmaId}-${p.dataPrevista}`)
    })
    // Aplicações criadas via "Agendar" no banco de planos
    aplicacoes.forEach(a => {
      if (a.data && a.status !== 'cancelada') s.add(`${a.turmaId}-${a.data}`)
    })
    return s
  }, [planejamentos, aplicacoes])

  // Set de turmaId para arrastar (qualquer plano da turma, independente de data)
  const turmasArrastaveis = useMemo(() => {
    const s = new Set<string>()
    planejamentos.forEach(p => s.add(String(p.turmaId)))
    return s
  }, [planejamentos])

  // ── Mapa turmaId → último registro pós-aula ──────────────────────────────
  const ultimoRegistroMap = useMemo(() => {
    const map: Record<string, RegistroPosAula> = {}
    planos.forEach(plano => {
      (plano.registrosPosAula ?? []).forEach(r => {
        const tid = String(r.turma ?? '')
        if (!tid) return
        const atual = map[tid]
        const dataR = r.dataAula ?? r.dataRegistro ?? r.data ?? ''
        const dataA = atual ? (atual.dataAula ?? atual.dataRegistro ?? atual.data ?? '') : ''
        if (!atual || dataR > dataA) map[tid] = r
      })
    })
    return map
  }, [planos])

  // Set de "turmaId-ymd" de turmas que têm registro pós-aula naquele dia específico
  const turmasRegistradas = useMemo(() => {
    const s = new Set<string>()
    planos.forEach(plano => {
      (plano.registrosPosAula ?? []).forEach(r => {
        const data = (r as any).dataAula ?? (r as any).data ?? ''
        const tid = String((r as any).turma ?? '')
        if (tid && data) s.add(`${tid}-${data}`)
      })
    })
    return s
  }, [planos])

  // ── Rótulo do intervalo da semana ─────────────────────────────────────────
  const semanaLabel = useMemo(() => {
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
    const d1 = semanaInicio, d2 = semanaFim
    if (d1.getMonth() === d2.getMonth())
      return `${d1.getDate()}–${d2.getDate()} ${meses[d1.getMonth()]} ${d1.getFullYear()}`
    return `${d1.getDate()} ${meses[d1.getMonth()]} – ${d2.getDate()} ${meses[d2.getMonth()]} ${d1.getFullYear()}`
  }, [semanaInicio, semanaFim])

  const isHoje  = (d: Date) => toYMD(d) === toYMD(hoje)
  const isPast  = (d: Date) => d < hoje && !isHoje(d)
  const isSemanaAtual = toYMD(semanaInicio) === toYMD(getSemanaAtualInicio())
  const todayYmd = toYMD(hoje)
  const agoraMin = (() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes() })()


  // ── Helpers: cópia massiva ────────────────────────────────────────────────
  function iniciarCopiarModo(aula: any, tidStr: string, ymd: string, nome: string) {
    const plano = planejamentos.find(p => String(p.turmaId) === tidStr && p.dataPrevista === ymd)
    if (!plano) return
    setCopiarModo({ planoId: plano.id, srcTidStr: tidStr, srcYmd: ymd, srcNome: nome, srcEscolaId: String(aula.escolaId ?? ''), srcSegmentoId: String(aula.segmentoId) })
    setCopiadosNaModo(new Map())
  }

  function copiarParaMesmaSerie(aula: any, tidStr: string, ymd: string) {
    const plano = planejamentos.find(p => String(p.turmaId) === tidStr && p.dataPrevista === ymd)
    if (!plano) return
    const jaCopiados = new Set<string>()
    const itens: MesmaSerieItem[] = []
    const diasNomes = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']
    diasDaSemana.forEach(({ ymd: dayYmd }, idx) => {
      obterTurmasDoDia(dayYmd).forEach((a: any) => {
        const dstTid = String(a.turmaId)
        if (dstTid !== tidStr && String(a.escolaId) === String(aula.escolaId ?? '') && String(a.segmentoId) === String(aula.segmentoId) && !jaCopiados.has(dstTid)) {
          jaCopiados.add(dstTid)
          itens.push({
            dst: { anoLetivoId: String(a.anoLetivoId ?? ''), escolaId: String(a.escolaId ?? ''), segmentoId: String(a.segmentoId), turmaId: dstTid },
            turmaNome: getNomeTurma(String(a.anoLetivoId ?? ''), String(a.escolaId ?? ''), String(a.segmentoId), dstTid, anosLetivos),
            escolaNome: getNomeEscola(String(a.anoLetivoId ?? ''), String(a.escolaId ?? ''), anosLetivos),
            ymd: dayYmd,
            diaNome: diasNomes[idx] ?? '',
          })
        }
      })
    })
    if (itens.length === 0) { showToast('Nenhuma outra turma da mesma série na semana'); return }
    setMesmaSerieConfirm({ planoId: plano.id, srcNome: getNomeTurma(String(aula.anoLetivoId ?? ''), String(aula.escolaId ?? ''), String(aula.segmentoId), tidStr, anosLetivos), itens })
  }

  function handleCopiarEmModo(aula: any, tidStr: string, ymd: string) {
    if (!copiarModo) return
    const tidYmd = `${tidStr}-${ymd}`
    if (copiadosNaModo.has(tidYmd)) {
      excluirPlanejamento(copiadosNaModo.get(tidYmd)!)
      setCopiadosNaModo(prev => { const m = new Map(prev); m.delete(tidYmd); return m })
      return
    }
    const novoId = copiarPlanejamento(copiarModo.planoId, { anoLetivoId: String(aula.anoLetivoId ?? ''), escolaId: String(aula.escolaId ?? ''), segmentoId: String(aula.segmentoId), turmaId: tidStr }, ymd)
    setCopiadosNaModo(prev => new Map([...prev, [tidYmd, novoId ?? '']]))
  }

  function moverParaProximaSemana(tidStr: string, ymd: string) {
    const plano = planejamentos.find(p => String(p.turmaId) === tidStr && p.dataPrevista === ymd)
    if (!plano) return
    const novaData = toYMD(addDays(new Date(ymd + 'T12:00:00'), 7))
    const novoId = copiarPlanejamento(plano.id, { anoLetivoId: plano.anoLetivoId, escolaId: plano.escolaId, segmentoId: plano.segmentoId, turmaId: tidStr }, novaData)
    const timer = setTimeout(() => excluirPlanejamento(plano.id), 5000)
    showToast('Aula movida para a próxima semana', 'info', 5000, () => {
      clearTimeout(timer)
      if (novoId) excluirPlanejamento(novoId)
    })
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col min-h-0"
      onTouchStart={onSwipeTouchStart}
      onTouchEnd={onSwipeTouchEnd}
    >

      {/* ── Cabeçalho: título + toggle Semana/Mês + navegação ── */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-[17px] font-bold tracking-tight text-slate-800 dark:text-[#E5E7EB]">
              Planejamento
            </h1>
            <p className="text-[12.5px] text-slate-500 dark:text-[#9CA3AF] mt-1">
              {vistaAtiva === 'semana' ? 'O que preciso preparar esta semana?' : 'Visão mensal do calendário'}
            </p>
          </div>

          {/* Toggle Semana | Mês */}
          <div className="flex rounded-[8px] border border-[#E6EAF0] dark:border-[#374151] overflow-hidden v2-card">
            {(['semana', 'mes'] as const).map(v => (
              <button
                key={v}
                onClick={() => setVistaAtiva(v)}
                className={`px-3 py-1.5 text-[12px] font-semibold transition-all
                  ${vistaAtiva === v
                    ? 'bg-[#5B5FEA] dark:bg-[#818cf8] text-white'
                    : 'text-slate-500 dark:text-[#9CA3AF] hover:bg-slate-50 dark:hover:bg-white/[0.05]'}`}
              >
                {v === 'semana' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Navegação de semana — só visível na vista Semana */}
          {vistaAtiva === 'semana' && (<>
          {/* ← Anterior */}
          <button
            onClick={() => setSemanaInicio(prev => addDays(prev, -7))}
            title="Semana anterior"
            className="w-[30px] h-[30px] flex items-center justify-center rounded-[7px] border border-[#E6EAF0] dark:border-[#374151] v2-card text-slate-500 dark:text-[#9CA3AF] hover:border-[#5B5FEA]/50 dark:hover:border-[#818cf8]/50 hover:text-[#5B5FEA] dark:hover:text-[#818cf8] transition-all"
          >
            <i className="fas fa-chevron-left text-[10px]" />
          </button>

          {/* Label semana */}
          <span className="px-[14px] py-[5px] text-[13.5px] font-semibold text-slate-800 dark:text-[#E5E7EB] border border-[#E6EAF0] dark:border-[#374151] rounded-[7px] v2-card whitespace-nowrap shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none">
            {semanaLabel}
          </span>

          {/* Próxima → */}
          <button
            onClick={() => setSemanaInicio(prev => addDays(prev, 7))}
            title="Próxima semana"
            className="w-[30px] h-[30px] flex items-center justify-center rounded-[7px] border border-[#E6EAF0] dark:border-[#374151] v2-card text-slate-500 dark:text-[#9CA3AF] hover:border-[#5B5FEA]/50 dark:hover:border-[#818cf8]/50 hover:text-[#5B5FEA] dark:hover:text-[#818cf8] transition-all"
          >
            <i className="fas fa-chevron-right text-[10px]" />
          </button>

          {/* Hoje — só aparece se não for a semana atual */}
          {!isSemanaAtual && (
            <button
              onClick={() => setSemanaInicio(getSemanaAtualInicio())}
              className="px-[12px] py-[5px] text-[12.5px] font-medium text-[#5B5FEA] dark:text-[#818cf8] border border-[#E6EAF0] dark:border-[#374151] rounded-[7px] v2-card hover:bg-[#5B5FEA]/[0.08] dark:hover:bg-[#818cf8]/[0.10] transition-all"
            >
              Hoje
            </button>
          )}

          {/* Separador + toggle de estilo de abertura do Card Hero — só no desktop */}
          {!isMobile && <div className="w-px h-4 bg-[#E6EAF0] dark:bg-[#374151] self-center" />}
          {!isMobile && <div className="flex rounded-[7px] border border-[#E6EAF0] dark:border-[#374151] overflow-hidden v2-card" title="Estilo de abertura do card">
            {([
              { key: 'center',        icon: '⊡', label: 'Modal central' },
              { key: 'bottomSheet',   icon: '▽', label: 'Bottom sheet' },
              { key: 'sharedElement', icon: '⊕', label: 'Cresce do card' },
              { key: 'inlineDrawer',  icon: '⊟', label: 'Gaveta inline' },
            ] as const).map(({ key, icon, label }, i) => (
              <button
                key={key}
                onClick={() => setAndSaveAnimStyle(key)}
                title={label}
                className={`w-[26px] h-[26px] flex items-center justify-center text-[11px] transition-all
                  ${heroAnimStyle === key
                    ? 'bg-[#5B5FEA] dark:bg-[#818cf8] text-white'
                    : 'text-slate-400 dark:text-[#6B7280] hover:bg-slate-100 dark:hover:bg-white/[0.05]'}
                  ${i > 0 ? 'border-l border-[#E6EAF0] dark:border-[#374151]' : ''}`}
              >
                {icon}
              </button>
            ))}
          </div>}
          </>)}
        </div>
      </div>

      {/* ── Vista Mês ── */}
      {vistaAtiva === 'mes' && (
        <VisaoMes
          onDiaClick={d => {
            setSemanaInicio(getMondayOf(d))
            setVistaAtiva('semana')
          }}
        />
      )}

      {/* ── Vista Semana ── */}
      {vistaAtiva === 'semana' && (<>

      {/* ── Mobile: indicador de dia atual ── */}
      {isMobile && (
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              if (mobileDayIdx > 0) setMobileDayIdx(i => i - 1)
              else { setSemanaInicio(prev => addDays(prev, -7)); setMobileDayIdx(4) }
            }}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#E6EAF0] dark:border-[#374151] v2-card text-slate-500 dark:text-[#9CA3AF] text-[16px]"
          >‹</button>
          <div className="flex gap-1.5">
            {diasDaSemana.map(({ short, date }, i) => {
              const isActive = i === mobileDayIdx
              const isToday = isHoje(date)
              return (
                <button key={i} onClick={() => setMobileDayIdx(i)}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${isActive ? 'bg-[#5B5FEA] dark:bg-[#818cf8]' : 'bg-transparent'}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${isActive ? 'text-white' : isToday ? 'text-[#5B5FEA] dark:text-[#818cf8]' : 'text-slate-400 dark:text-[#6B7280]'}`}>{short}</span>
                  <span className={`text-[13px] font-semibold ${isActive ? 'text-white' : isToday ? 'text-[#5B5FEA] dark:text-[#818cf8]' : 'text-slate-500 dark:text-[#9CA3AF]'}`}>{date.getDate()}</span>
                </button>
              )
            })}
          </div>
          <button
            onClick={() => {
              if (mobileDayIdx < 4) setMobileDayIdx(i => i + 1)
              else { setSemanaInicio(prev => addDays(prev, 7)); setMobileDayIdx(0) }
            }}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#E6EAF0] dark:border-[#374151] v2-card text-slate-500 dark:text-[#9CA3AF] text-[16px]"
          >›</button>
        </div>
      )}

      {/* ── Grid semanal (desktop) / Dia único (mobile) ── */}
      <div className={isMobile ? '' : 'grid grid-cols-5 gap-2'}>
        {diasDaSemana.map(({ key, short, date, ymd }, idx) => {
          if (isMobile && idx !== mobileDayIdx) return null
          const aulas = aulasPorDia[idx]?.aulas ?? []
          const past  = isPast(date)
          const today = isHoje(date)

          return (
            <div
              key={key}
              className={`flex flex-col ${today ? 'bg-[#5B5FEA]/[0.04] dark:bg-[#818cf8]/[0.06] rounded-[10px] px-[2px]' : ''}`}
            >
              {/* Header do dia — só no desktop */}
              {!isMobile && <div className="flex flex-col items-center pb-3 mb-1.5 border-b border-[#E6EAF0] dark:border-[#2d3748]">
                <span className={`text-[10.5px] font-bold tracking-[.7px] uppercase mb-[5px] ${
                  today ? 'text-[#5B5FEA] dark:text-[#818cf8]' : 'text-slate-400 dark:text-[#6B7280]'
                }`}>
                  {short}
                </span>
                <span className={`w-[30px] h-[30px] flex items-center justify-center rounded-full text-[14px] font-semibold ${
                  today
                    ? 'bg-[#5B5FEA] dark:bg-[#818cf8] text-white'
                    : past
                      ? 'text-slate-300 dark:text-[#4B5563]'
                      : 'text-slate-600 dark:text-[#9CA3AF]'
                }`}>
                  {date.getDate()}
                </span>
              </div>}

              {/* Blocos de aula */}
              <div className={`flex flex-col ${isMobile ? 'gap-3' : 'gap-1'} ${past ? 'opacity-[0.42]' : ''}`}>
                {aulas.length === 0 ? (
                  <div className="text-center py-5 text-[11.5px] text-slate-300 dark:text-[#374151]">—</div>
                ) : (
                  aulas.map((aula, i) => {
                    const turmaNome  = getNomeTurma(aula.anoLetivoId, aula.escolaId, aula.segmentoId, aula.turmaId, anosLetivos)
                    const escolaNome = getNomeEscola(aula.anoLetivoId, aula.escolaId, anosLetivos)
                    const ultimoReg  = ultimoRegistroMap[String(aula.turmaId)] ?? null
                    const escolaCor  = aula.escolaId ? (escolaColorMap[String(aula.escolaId)] ?? null) : null
                    const tidStr      = String(aula.turmaId)
                    const tidYmd      = `${tidStr}-${ymd}`
                    const temPlano    = !past && turmasComPlano.has(tidYmd)    // badge ✓ (dia-específico)
                    const eArrastavel = !past && turmasArrastaveis.has(tidStr) // arrastar (qualquer plano)
                    const isDragSrc   = dragSrcId === tidYmd
                    const isDragOver  = dragOverId === tidYmd && dragSrcId !== tidYmd
                    // Aula "ao vivo": hoje, dentro da janela de 50min a partir do horário
                    const match = aula.horario?.match(/^(\d{1,2}):(\d{2})/)
                    const minInicio = match ? parseInt(match[1]) * 60 + parseInt(match[2]) : null
                    const aoVivo = ymd === todayYmd && minInicio !== null && agoraMin >= minInicio && agoraMin <= minInicio + 50
                    // Aula concluída neste dia: opacidade reduzida
                    const foiRegistrada = turmasRegistradas.has(tidYmd)
                    const isDrawerOpen = effectiveAnimStyle === 'inlineDrawer' && heroCard?.navParams.turmaId === tidStr && heroCard?.ymd === ymd
                    const cardStyle  = escolaCor
                      ? { '--escola-l': escolaCor.light, '--escola-d': escolaCor.dark } as React.CSSProperties
                      : undefined

                    return (
                      <React.Fragment key={`${aula.turmaId}-${aula.horario}-${i}`}>
                      <div
                        style={cardStyle}
                        draggable={eArrastavel}
                        onClick={(!past || foiRegistrada || copiarModo !== null) ? (e: React.MouseEvent) => {
                          e.stopPropagation()

                          // Modo cópia ativo: copiar para esta turma
                          if (copiarModo && copiarModo.srcTidStr !== tidStr && !past) {
                            handleCopiarEmModo(aula, tidStr, ymd)
                            return
                          }

                          // Toggle no modo inlineDrawer: fecha se já está aberto
                          if (effectiveAnimStyle === 'inlineDrawer' &&
                              heroCard?.navParams.turmaId === tidStr && heroCard?.ymd === ymd) {
                            setHeroCard(null)
                            return
                          }

                          // Captura posição do card para o Shared Element
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          const capturedRect = { top: rect.top, left: rect.left, width: rect.width, height: rect.height }

                          const cardState: HeroCardData['cardState'] = foiRegistrada ? 'registrada'
                            : temPlano ? 'comPlano'
                            : ultimoReg ? 'sugestao'
                            : 'vazio'

                          // Planejamento do dia
                          const planejamentoDoDia = planejamentos.find(
                            p => String(p.turmaId) === tidStr && p.dataPrevista === ymd
                          ) ?? null

                          // Plano completo: via planejamento.planoData ou via aplicacoes
                          let planoDataObj: any = planejamentoDoDia?.planoData ?? null
                          if (!planoDataObj) {
                            const ap = aplicacoes.find(a => String(a.turmaId) === tidStr && a.data === ymd && a.status !== 'cancelada')
                            if (ap) planoDataObj = planos.find(p => String(p.id) === String((ap as any).planoId)) ?? null
                          }

                          // Registro específico do dia
                          const registroDoDia = foiRegistrada
                            ? planos.flatMap(p => (p as any).registrosPosAula ?? []).find((r: any) => {
                                const d = r.dataAula ?? r.data ?? ''
                                return d === ymd && String(r.turma) === tidStr
                              }) ?? null
                            : null

                          const planoTitulo = planoDataObj?.titulo || planejamentoDoDia?.oQuePretendoFazer || null
                          const objetivo = planoDataObj?.objetivoGeral || planejamentoDoDia?.objetivo || null

                          const regData = ultimoReg ? ((ultimoReg as any).dataAula ?? (ultimoReg as any).data ?? '') : null
                          const ultimoRegData = regData ? regData.slice(8, 10) + '/' + regData.slice(5, 7) : null

                          setHeroCard({
                            turmaNome, escolaNome, escolaCor, ymd,
                            horario: aula.horario ?? '', diaSemanaShort: short,
                            cardState, planoTitulo, objetivo,
                            registro: registroDoDia as any, ultimoReg, ultimoRegData,
                            planoData: planoDataObj,
                            animStyle: effectiveAnimStyle,
                            triggerRect: capturedRect,
                            navParams: {
                              anoLetivoId: String(aula.anoLetivoId ?? ''),
                              escolaId:    String(aula.escolaId ?? ''),
                              segmentoId:  String(aula.segmentoId),
                              turmaId:     tidStr,
                              date,
                            },
                          })
                        } : undefined}
                        onDragStart={e => { e.dataTransfer.effectAllowed = 'copy'; setDragSrcId(tidYmd) }}
                        onDragOver={e => { if (dragSrcId && dragSrcId !== tidYmd) { e.preventDefault(); setDragOverId(tidYmd) } }}
                        onDragLeave={() => setDragOverId(null)}
                        onDrop={e => {
                          e.preventDefault()
                          if (!dragSrcId || dragSrcId === tidYmd) { setDragOverId(null); return }
                          // dragSrcId = "${srcTurmaId}-${srcYmd}"
                          const srcYmd = dragSrcId.match(/(\d{4}-\d{2}-\d{2})$/)?.[1] ?? ''
                          const srcTidStr = dragSrcId.replace(/-\d{4}-\d{2}-\d{2}$/, '')
                          // busca plano mais recente da turma de origem (independente de data)
                          const srcPlanos = planejamentos
                            .filter(p => String(p.turmaId) === srcTidStr)
                            .sort((a, b) => (b.atualizadoEm ?? b.criadoEm ?? '').localeCompare(a.atualizadoEm ?? a.criadoEm ?? ''))
                          if (!srcPlanos.length) { setDragSrcId(null); setDragOverId(null); return }
                          // encontra nome da turma de origem
                          let srcNome = srcTidStr
                          obterTurmasDoDia(srcYmd || ymd).forEach(a => {
                            if (String(a.turmaId) === srcTidStr)
                              srcNome = getNomeTurma(a.anoLetivoId, a.escolaId, a.segmentoId, a.turmaId, anosLetivos)
                          })
                          setCopyConfirm({
                            srcPlanoId: srcPlanos[0].id,
                            srcNome,
                            dst: { anoLetivoId: String(aula.anoLetivoId ?? ''), escolaId: String(aula.escolaId ?? ''), segmentoId: String(aula.segmentoId), turmaId: tidStr },
                            dstNome: turmaNome,
                            dataPrevista: ymd,
                          })
                          setDragSrcId(null); setDragOverId(null)
                        }}
                        onDragEnd={() => { setDragSrcId(null); setDragOverId(null) }}
                        className={`v2-card rounded-[8px] relative group ${isDrawerOpen ? 'overflow-visible' : 'overflow-hidden'} transition-all duration-150 ${
                          isDragOver
                            ? 'ring-2 ring-indigo-400 dark:ring-indigo-500 shadow-[0_4px_16px_rgba(91,95,234,0.25)]'
                            : isDragSrc
                            ? 'opacity-50 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                            : !past
                            ? 'shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)] cursor-pointer hover:shadow-[0_4px_12px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_4px_14px_rgba(0,0,0,0.4)] hover:-translate-y-px hover:opacity-100'
                            : foiRegistrada
                            ? 'shadow-[0_1px_3px_rgba(0,0,0,0.06)] cursor-pointer hover:shadow-[0_4px_12px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_4px_14px_rgba(0,0,0,0.4)] hover:-translate-y-px hover:opacity-90'
                            : 'shadow-[0_1px_3px_rgba(0,0,0,0.06)] cursor-default'
                        } ${foiRegistrada && !isDragSrc ? 'opacity-[0.72]' : ''}`}
                      >
                        {/* card body */}
                        <div className={isMobile ? 'px-4 pt-3 pb-3' : 'px-[10px] pt-[8px] pb-[7px]'}>
                          {aula.horario && (
                            <div className={`font-semibold text-slate-500 dark:text-[#9CA3AF] mb-[3px] flex items-center gap-1.5 ${isMobile ? 'text-[12px]' : 'text-[10.5px]'}`}>
                              {formatHorario(aula.horario)}
                              {aoVivo && (
                                <span className="inline-flex items-center gap-[3px]">
                                  <span className="w-[5px] h-[5px] rounded-full bg-red-500 animate-pulse" />
                                  <span className="text-[9px] font-bold text-red-500 tracking-wide">AO VIVO</span>
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-1">
                            <div className={`font-bold tracking-tight leading-tight text-slate-800 dark:text-[#E5E7EB] ${isMobile ? 'text-[17px]' : 'text-[13px]'}`}>
                              {turmaNome}
                            </div>
                          </div>
                          {escolaNome && (
                            <div className={`escola-label font-medium mt-[3px] truncate ${isMobile ? 'text-[12px]' : 'text-[10px]'}`}>
                              {escolaNome}
                            </div>
                          )}
                        </div>

                        {/* ── Botão ··· e dropdown ── */}
                        {temPlano && !past && !copiarModo && (
                          <div className="absolute top-[5px] right-[5px] z-10">
                            <button
                              onClick={(e) => { e.stopPropagation(); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right }); setMenuAberto(menuAberto === tidYmd ? null : tidYmd) }}
                              className="w-5 h-5 rounded flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#2D3748] transition-all opacity-0 group-hover:opacity-100"
                              title="Opções"
                            >
                              <svg width="12" height="3" viewBox="0 0 12 3" fill="currentColor">
                                <circle cx="1.5" cy="1.5" r="1.5"/><circle cx="6" cy="1.5" r="1.5"/><circle cx="10.5" cy="1.5" r="1.5"/>
                              </svg>
                            </button>
                            {menuAberto === tidYmd && menuPos && createPortal(
                              <div
                                style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
                                className="bg-white dark:bg-[#1E2A4A] rounded-[10px] shadow-[0_4px_20px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-[#E6EAF0] dark:border-[#374151] py-1 w-[185px]"
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => { e.stopPropagation(); setMenuAberto(null); iniciarCopiarModo(aula, tidStr, ymd, turmaNome) }}
                                  className="w-full text-left px-3 py-2 text-[11.5px] font-semibold text-slate-600 dark:text-[#D1D5DB] hover:bg-slate-50 dark:hover:bg-[#273344] transition"
                                >
                                  Copiar aula
                                </button>
                                <div className="mx-2 border-t border-[#F1F3F8] dark:border-[#374151]" />
                                <button
                                  onClick={(e) => { e.stopPropagation(); setMenuAberto(null); moverParaProximaSemana(tidStr, ymd) }}
                                  className="w-full text-left px-3 py-2 text-[11.5px] font-semibold text-slate-600 dark:text-[#D1D5DB] hover:bg-slate-50 dark:hover:bg-[#273344] transition"
                                >
                                  Mover para próxima semana
                                </button>
                              </div>,
                              document.body
                            )}
                          </div>
                        )}

                        {/* seção última aula / aula planejada */}
                        <UltimaAulaSection registro={ultimoReg} temPlano={temPlano} foiRegistrada={foiRegistrada} />

                        {/* ── Checkbox modo cópia ── */}
                        {copiarModo && !past && (
                          <div
                            className={`absolute top-[5px] right-[5px] z-10 w-[15px] h-[15px] rounded-full border flex items-center justify-center transition-all ${
                              copiarModo.srcTidStr === tidStr
                                ? 'border-indigo-400 bg-indigo-400 pointer-events-none'
                                : copiadosNaModo.has(tidYmd)
                                  ? 'border-emerald-400 bg-emerald-400 cursor-pointer'
                                  : 'border-slate-300 dark:border-[#4B5563] bg-white dark:bg-[#1F2937] hover:border-indigo-400 cursor-pointer'
                            }`}
                            onClick={(e) => { e.stopPropagation(); if (copiarModo.srcTidStr !== tidStr) handleCopiarEmModo(aula, tidStr, ymd) }}
                          >
                            {(copiarModo.srcTidStr === tidStr || copiadosNaModo.has(tidYmd)) && (
                              <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                                <path d="M1 2.5L2.8 4L6 1" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                        )}

                        {/* ── Gaveta inline (4º modo) ── */}
                        {effectiveAnimStyle === 'inlineDrawer' && heroCard &&
                          heroCard.navParams.turmaId === tidStr && heroCard.ymd === ymd && (
                          <InlineCardDrawer
                            heroCard={heroCard}
                            onClose={() => setHeroCard(null)}
                            onEditar={() => {
                              setHeroCard(null)
                              selecionarTurma({ anoLetivoId: heroCard.navParams.anoLetivoId, escolaId: heroCard.navParams.escolaId, segmentoId: heroCard.navParams.segmentoId, turmaId: heroCard.navParams.turmaId })
                              setDataNavegacao(heroCard.navParams.date)
                              setViewMode('porTurmas')
                            }}
                            onRegistrar={() => {
                              setHeroCard(null)
                              const stub = { id: `stub-${heroCard.navParams.turmaId}`, titulo: heroCard.planoTitulo ?? '' }
                              setPlanoParaRegistro(stub as any)
                              setNovoRegistro({ dataAula: heroCard.ymd, resumoAula: '', funcionouBem: '', fariadiferente: '', proximaAula: '', comportamento: '', poderiaMelhorar: '', anotacoesGerais: '', urlEvidencia: '', statusAula: undefined } as any)
                              setRegistroEditando(null); setVerRegistros(false)
                              setRegAnoSel(heroCard.navParams.anoLetivoId); setRegEscolaSel(heroCard.navParams.escolaId)
                              setRegSegmentoSel(heroCard.navParams.segmentoId); setRegTurmaSel(heroCard.navParams.turmaId)
                              setViewMode('posAula')
                            }}
                            onCriarPlano={() => {
                              setHeroCard(null)
                              selecionarTurma({ anoLetivoId: heroCard.navParams.anoLetivoId, escolaId: heroCard.navParams.escolaId, segmentoId: heroCard.navParams.segmentoId, turmaId: heroCard.navParams.turmaId })
                              setDataNavegacao(heroCard.navParams.date)
                              setViewMode('porTurmas')
                            }}
                            onAdaptarAnterior={() => {
                              setHeroCard(null)
                              selecionarTurma({ anoLetivoId: heroCard.navParams.anoLetivoId, escolaId: heroCard.navParams.escolaId, segmentoId: heroCard.navParams.segmentoId, turmaId: heroCard.navParams.turmaId })
                              setDataNavegacao(heroCard.navParams.date)
                              setModoInicialNavegacao('criar')
                              setViewMode('porTurmas')
                            }}
                            onBuscarBanco={() => {
                              setHeroCard(null)
                              selecionarTurma({ anoLetivoId: heroCard.navParams.anoLetivoId, escolaId: heroCard.navParams.escolaId, segmentoId: heroCard.navParams.segmentoId, turmaId: heroCard.navParams.turmaId })
                              setDataNavegacao(heroCard.navParams.date)
                              setModoInicialNavegacao('importar')
                              setViewMode('porTurmas')
                            }}
                            onVerHistorico={() => {
                              setHeroCard(null)
                              selecionarTurma({ anoLetivoId: heroCard.navParams.anoLetivoId, escolaId: heroCard.navParams.escolaId, segmentoId: heroCard.navParams.segmentoId, turmaId: heroCard.navParams.turmaId })
                              setDataNavegacao(heroCard.navParams.date)
                              setViewMode('porTurmas')
                            }}
                          />
                        )}
                      </div>
                      </React.Fragment>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Modal: confirmar cópia mesma série ────────────────────────────── */}
      {mesmaSerieConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setMesmaSerieConfirm(null)}>
          <div className="bg-white dark:bg-[#1F2937] rounded-2xl shadow-xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <p className="text-[13px] font-semibold text-slate-700 dark:text-[#E5E7EB] mb-1">Copiar aula de <span className="text-indigo-600 dark:text-indigo-400">{mesmaSerieConfirm.srcNome}</span> para:</p>
            <ul className="mt-3 space-y-1.5 max-h-56 overflow-y-auto">
              {mesmaSerieConfirm.itens.map((item, i) => (
                <li key={i} className="flex items-center justify-between text-[12px] bg-slate-50 dark:bg-[#273344] rounded-lg px-3 py-2">
                  <span className="font-semibold text-slate-700 dark:text-[#E5E7EB]">{item.turmaNome}</span>
                  <span className="text-slate-400 dark:text-[#6B7280] text-[11px] text-right">
                    {item.escolaNome && <span className="block leading-tight">{item.escolaNome}</span>}
                    <span>{item.diaNome}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setMesmaSerieConfirm(null)}
                className="flex-1 text-[12px] font-semibold py-2 rounded-xl border border-[#E6EAF0] dark:border-[#374151] text-slate-500 dark:text-[#9CA3AF] hover:bg-slate-50 dark:hover:bg-[#273344] transition"
              >Cancelar</button>
              <button
                onClick={() => {
                  mesmaSerieConfirm.itens.forEach(item => copiarPlanejamento(mesmaSerieConfirm.planoId, item.dst, item.ymd))
                  showToast(`Copiado para ${mesmaSerieConfirm.itens.length} turma${mesmaSerieConfirm.itens.length > 1 ? 's' : ''} ✅`)
                  setMesmaSerieConfirm(null)
                }}
                className="flex-1 text-[12px] font-semibold py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition"
              >Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: confirmar cópia de planejamento ─────────────────────────── */}
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

      {/* ── Pill flutuante: modo "Copiar para turmas" ──────────────────── */}
      {copiarModo && (
        <>
        <div className="fixed inset-0 z-40" onClick={() => { copiadosNaModo.forEach(id => excluirPlanejamento(id)); setCopiarModo(null); setCopiadosNaModo(new Map()) }} />
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white dark:bg-[#1F2937] border border-[#E6EAF0] dark:border-[#374151] rounded-full px-4 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-[#D1D5DB]">
            <span className="font-semibold truncate max-w-[160px]">{copiarModo.srcNome}</span>
            {copiadosNaModo.size > 0 && (
              <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                {copiadosNaModo.size} copiada{copiadosNaModo.size > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="w-px h-3.5 bg-[#E6EAF0] dark:bg-[#374151]" />
          <button
            onClick={() => {
              copiadosNaModo.forEach(id => excluirPlanejamento(id))
              setCopiarModo(null); setCopiadosNaModo(new Map())
            }}
            className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition whitespace-nowrap"
          >
            Cancelar
          </button>
          <button
            onClick={() => { setCopiarModo(null); setCopiadosNaModo(new Map()) }}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition whitespace-nowrap"
          >
            Concluir
          </button>
        </div>
        </>
      )}

      {/* ── Modal: Card Hero (modos 1–3 apenas) ──────────────────────────── */}
      {heroCard && heroCard.animStyle !== 'inlineDrawer' && (
        <ModalCardHero
          {...heroCard}
          animStyle={heroCard.animStyle as 'center' | 'bottomSheet' | 'sharedElement'}
          onClose={() => setHeroCard(null)}
          onEditar={() => {
            setHeroCard(null)
            selecionarTurma({
              anoLetivoId: heroCard.navParams.anoLetivoId,
              escolaId:    heroCard.navParams.escolaId,
              segmentoId:  heroCard.navParams.segmentoId,
              turmaId:     heroCard.navParams.turmaId,
            })
            setDataNavegacao(heroCard.navParams.date)
            setViewMode('porTurmas')
          }}
          onRegistrar={() => {
            setHeroCard(null)
            const stub = { id: `stub-${heroCard.navParams.turmaId}`, titulo: heroCard.planoTitulo ?? '' }
            setPlanoParaRegistro(stub as any)
            setNovoRegistro({ dataAula: heroCard.ymd, resumoAula: '', funcionouBem: '', fariadiferente: '', proximaAula: '', comportamento: '', poderiaMelhorar: '', anotacoesGerais: '', urlEvidencia: '', statusAula: undefined } as any)
            setRegistroEditando(null)
            setVerRegistros(false)
            setRegAnoSel(heroCard.navParams.anoLetivoId)
            setRegEscolaSel(heroCard.navParams.escolaId)
            setRegSegmentoSel(heroCard.navParams.segmentoId)
            setRegTurmaSel(heroCard.navParams.turmaId)
            setViewMode('posAula')
          }}
          onCriarPlano={() => {
            setHeroCard(null)
            selecionarTurma({
              anoLetivoId: heroCard.navParams.anoLetivoId,
              escolaId:    heroCard.navParams.escolaId,
              segmentoId:  heroCard.navParams.segmentoId,
              turmaId:     heroCard.navParams.turmaId,
            })
            setDataNavegacao(heroCard.navParams.date)
            setViewMode('porTurmas')
          }}
        />
      )}

      </>)}

    </div>
  )
}
