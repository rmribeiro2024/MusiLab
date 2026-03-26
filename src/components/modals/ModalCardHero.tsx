// src/components/modals/ModalCardHero.tsx
// Modal Card Hero — abre ao clicar em um card da Visão da Semana
// Suporta 3 estilos de animação: 'center' | 'bottomSheet' | 'sharedElement'

import React, { useState, useEffect } from 'react'
import type { RegistroPosAula } from '../../types'

// ── Dark mode ─────────────────────────────────────────────────────────────────
function useIsDark() {
  const [isDark, setIsDark] = React.useState(
    () => document.documentElement.classList.contains('dark')
  )
  React.useEffect(() => {
    const obs = new MutationObserver(
      () => setIsDark(document.documentElement.classList.contains('dark'))
    )
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return isDark
}

// ── Status helpers ────────────────────────────────────────────────────────────
type StatusEfetivo = 'concluida' | 'revisao' | 'incompleta' | 'nao_houve' | null

export function inferStatus(r: RegistroPosAula): StatusEfetivo {
  if ((r as any).statusAula === 'parcial') return 'incompleta'
  if ((r as any).statusAula) return (r as any).statusAula
  if ((r as any).proximaAulaOpcao === 'nova')         return 'concluida'
  if ((r as any).proximaAulaOpcao === 'revisar-nova') return 'revisao'
  if ((r as any).proximaAulaOpcao === 'revisar')      return 'incompleta'
  if ((r as any).resultadoAula === 'bem' || (r as any).resultadoAula === 'funcionou') return 'concluida'
  if ((r as any).resultadoAula === 'parcial')   return 'incompleta'
  if ((r as any).resultadoAula === 'nao' || (r as any).resultadoAula === 'nao_funcionou') return 'incompleta'
  return null
}

export const STATUS_ACAO: Record<NonNullable<StatusEfetivo>, string> = {
  concluida:  'Avançar conteúdo',
  incompleta: 'Retomar conteúdo',
  revisao:    'Retomar conteúdo',
  nao_houve:  'Reaplicar aula',
}

export const STATUS_LABEL: Record<NonNullable<StatusEfetivo>, string> = {
  concluida:  'Conteúdo concluído',
  incompleta: 'Parcialmente trabalhado',
  revisao:    'Parcialmente trabalhado',
  nao_houve:  'Não houve aula',
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface ModalCardHeroProps {
  turmaNome: string
  escolaNome: string
  escolaCor: { light: string; dark: string } | null
  ymd: string
  horario: string
  diaSemanaShort: string
  cardState: 'comPlano' | 'registrada' | 'sugestao' | 'vazio'
  planoTitulo: string | null
  objetivo: string | null
  registro: RegistroPosAula | null
  ultimoReg: RegistroPosAula | null
  ultimoRegData: string | null
  planoData?: any
  // Estilo de abertura
  animStyle?: 'center' | 'bottomSheet' | 'sharedElement'
  triggerRect?: { top: number; left: number; width: number; height: number }
  onClose: () => void
  onEditar: () => void
  onRegistrar: () => void
  onCriarPlano: () => void
}

// ── Sub-componentes ───────────────────────────────────────────────────────────
export function RegistroField({ icon, label, text }: { icon: string; label: string; text: string }) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="text-[11px] shrink-0 mt-[1px]">{icon}</span>
      <div className="min-w-0">
        <span className="text-[10.5px] font-semibold text-slate-500 dark:text-[#9CA3AF]">
          {label}:{' '}
        </span>
        <span className="text-[11.5px] text-slate-600 dark:text-[#D1D5DB] line-clamp-2 leading-relaxed">
          "{text}"
        </span>
      </div>
    </div>
  )
}

export function ActionButton({
  onClick, label, variant, fullWidth = false,
}: {
  onClick: () => void
  label: string
  variant: 'primary' | 'secondary'
  fullWidth?: boolean
}) {
  const base = `${fullWidth ? 'flex-1' : ''} flex items-center justify-center px-4 py-2 rounded-xl text-[12.5px] font-medium transition-all`
  const primary = 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white'
  const secondary = 'border border-[#E6EAF0] dark:border-[#374151] text-slate-600 dark:text-[#D1D5DB] hover:bg-slate-50 dark:hover:bg-white/[0.05]'
  return (
    <button onClick={onClick} className={`${base} ${variant === 'primary' ? primary : secondary}`}>
      {label}
    </button>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ModalCardHero(props: ModalCardHeroProps) {
  const {
    turmaNome, escolaNome, escolaCor, ymd, horario, diaSemanaShort,
    cardState, planoTitulo, objetivo,
    registro, ultimoReg, ultimoRegData,
    planoData,
    animStyle = 'center',
    triggerRect,
    onClose, onEditar, onRegistrar, onCriarPlano,
  } = props

  const isDark = useIsDark()

  // Atividades colapsáveis
  const [expandedActs, setExpandedActs] = useState<Set<number>>(new Set())
  function toggleAct(i: number) {
    setExpandedActs(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })
  }

  // Animação de entrada
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  // Touch drag-to-close (bottom sheet)
  const touchStartY = React.useRef(0)
  const [sheetDragY, setSheetDragY] = useState(0)
  const onSheetTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }
  const onSheetTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) setSheetDragY(delta)
  }
  const onSheetTouchEnd = () => {
    if (sheetDragY > 100) onClose()
    else setSheetDragY(0)
  }

  // Drag — só funciona no modo 'center'
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragging = React.useRef(false)
  const dragStart = React.useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const [isDragging, setIsDragging] = useState(false)

  const onDragStart = (e: React.MouseEvent) => {
    if (animStyle !== 'center') return
    dragging.current = true
    setIsDragging(true)
    const startPos = pos ?? { x: 0, y: 0 }
    dragStart.current = { mx: e.clientX, my: e.clientY, px: startPos.x, py: startPos.y }
    e.preventDefault()
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      setPos({
        x: dragStart.current.px + e.clientX - dragStart.current.mx,
        y: dragStart.current.py + e.clientY - dragStart.current.my,
      })
    }
    const onUp = () => { dragging.current = false; setIsDragging(false) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  // Dismiss por Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Formatação
  const dataLabel = `${diaSemanaShort}, ${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`
  const horarioLabel = horario ? horario.replace(/:00$/, 'h').replace(/:(\d{2})$/, 'h$1') : ''

  // Campos do registro
  const funcionouBem   = registro?.funcionouBem || null
  const repetiria      = (registro as any)?.repetiria || null
  const fariadiferente = registro?.fariadiferente || (registro as any)?.naoFuncionou || null
  const statusReg      = registro ? inferStatus(registro) : null
  const statusLabel    = statusReg ? STATUS_LABEL[statusReg] : null
  const temConteudoReg = !!(funcionouBem || repetiria || fariadiferente || statusLabel)

  // Campos do último registro (sugestão)
  const ultRepetiria      = (ultimoReg as any)?.repetiria || ultimoReg?.funcionouBem || null
  const ultFariadiferente = ultimoReg?.fariadiferente || (ultimoReg as any)?.naoFuncionou || null
  const ultStatus         = ultimoReg ? inferStatus(ultimoReg) : null
  const ultStatusLabel    = ultStatus ? STATUS_LABEL[ultStatus] : null
  const ultAcao           = ultStatus ? STATUS_ACAO[ultStatus] : 'Planejar próxima aula'

  // CSS vars cor da escola
  const cardStyle = escolaCor
    ? ({ '--escola-l': escolaCor.light, '--escola-d': isDark ? escolaCor.dark : escolaCor.light } as React.CSSProperties)
    : undefined

  // ── Cálculo do offset para Shared Element ─────────────────────────────────
  const sharedDx = triggerRect
    ? (triggerRect.left + triggerRect.width / 2) - window.innerWidth / 2
    : 0
  const sharedDy = triggerRect
    ? (triggerRect.top + triggerRect.height / 2) - window.innerHeight / 2
    : 0

  // ── Backdrop ──────────────────────────────────────────────────────────────
  const backdropClass = animStyle === 'center'
    ? 'fixed inset-0 bg-black/40 dark:bg-black/60 z-50 backdrop-blur-[2px]'
    : 'fixed inset-0 bg-black/35 dark:bg-black/55 z-50'

  // ── Painel: classe e estilo por modo ─────────────────────────────────────
  const panelContentClass = 'bg-white dark:bg-[#1F2937] shadow-2xl overflow-hidden'

  let panelClass = ''
  let panelStyle: React.CSSProperties = {}

  if (animStyle === 'bottomSheet') {
    panelClass = `bg-white dark:bg-[#1F2937] shadow-2xl flex flex-col absolute bottom-0 rounded-t-2xl overflow-hidden`
    panelStyle = {
      ...cardStyle,
      maxHeight: '85vh',
      width: '100%',
      maxWidth: '560px',
      left: '50%',
      transform: `translateX(-50%) translateY(${visible ? (sheetDragY > 0 ? `${sheetDragY}px` : '0') : '100%'})`,
      transition: sheetDragY > 0 ? 'none' : 'transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    }
  } else if (animStyle === 'sharedElement') {
    panelClass = `${panelContentClass} absolute rounded-2xl w-[560px] flex flex-col`
    panelStyle = {
      ...cardStyle,
      top: '50%',
      left: '50%',
      maxHeight: '80vh',
      opacity: visible ? 1 : 0,
      transform: visible
        ? 'translate(-50%, -50%) scale(1)'
        : `translate(calc(-50% + ${sharedDx}px), calc(-50% + ${sharedDy}px)) scale(0.08)`,
      transition: visible
        ? 'transform 360ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease'
        : 'none',
    }
  } else {
    // center (padrão)
    panelClass = `${panelContentClass} absolute rounded-2xl w-[340px] flex flex-col
      ${isDragging ? '' : 'transition-all duration-200 ease-out'}
      ${visible ? 'opacity-100' : 'opacity-0'}`
    panelStyle = {
      ...cardStyle,
      top: pos ? `calc(50% + ${pos.y}px)` : '50%',
      left: pos ? `calc(50% + ${pos.x}px)` : '50%',
      maxHeight: '80vh',
      transform: `translate(-50%, -50%) ${visible ? 'scale(1)' : 'scale(0.95)'}`,
      pointerEvents: 'auto',
    }
  }

  // ── Conteúdo do painel (compartilhado entre todos os modos) ──────────────
  const panelContent = (
    <>
      {/* Drag handle — só no bottom sheet */}
      {animStyle === 'bottomSheet' && (
        <div
          className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
          onTouchStart={onSheetTouchStart}
          onTouchMove={onSheetTouchMove}
          onTouchEnd={onSheetTouchEnd}
        >
          <div className="w-9 h-[3px] bg-slate-200 dark:bg-[#374151] rounded-full" />
        </div>
      )}

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div
        className={`px-5 ${animStyle === 'bottomSheet' ? 'pt-3' : 'pt-5'} pb-4 border-b border-[#E6EAF0] dark:border-[#374151]
          ${animStyle === 'center' ? 'cursor-grab active:cursor-grabbing select-none' : ''}`}
        onMouseDown={animStyle === 'center' ? onDragStart : undefined}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-bold text-slate-800 dark:text-[#E5E7EB] leading-tight mb-1">
              {turmaNome}
            </div>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-slate-400 dark:text-[#6B7280]">
              {escolaNome && (
                <>
                  <span className="escola-label font-medium text-[11px]">{escolaNome}</span>
                  <span>·</span>
                </>
              )}
              <span>{dataLabel}</span>
              {horarioLabel && (
                <>
                  <span>·</span>
                  <span>{horarioLabel}</span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-slate-300 dark:text-[#4B5563] hover:text-slate-500 dark:hover:text-[#9CA3AF] hover:bg-slate-100 dark:hover:bg-white/[0.08] transition text-[16px] leading-none"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── BODY ───────────────────────────────────────────────────────── */}
      <div
        className="px-5 py-4 space-y-3 overflow-y-auto flex-1"
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        onTouchMove={e => e.stopPropagation()}
      >

        {cardState === 'comPlano' && (
          <div className="space-y-2">
            {planoTitulo ? (
              <div className="flex items-start gap-2">
                <span className="text-[14px] shrink-0 mt-0.5">📋</span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 dark:text-[#E5E7EB] leading-snug">
                    {planoTitulo}
                  </p>
                  {objetivo && (
                    <p className="text-[11.5px] text-slate-500 dark:text-[#9CA3AF] mt-1 line-clamp-2 leading-relaxed">
                      {objetivo}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-slate-400 dark:text-[#6B7280] italic">
                Aula planejada para este dia.
              </p>
            )}

            {/* Atividades colapsáveis */}
            {planoData?.atividadesRoteiro?.length > 0 && (
              <div className="pt-2 border-t border-[#E6EAF0] dark:border-[#374151] space-y-0.5">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-[#6B7280] uppercase tracking-wide mb-1.5">Atividades</p>
                {planoData.atividadesRoteiro.map((a: any, i: number) => {
                  const isOpen = expandedActs.has(i)
                  const hasDesc = !!a.descricao
                  return (
                    <div key={i}>
                      <button
                        onClick={e => { e.stopPropagation(); hasDesc && toggleAct(i) }}
                        className={`w-full flex items-center gap-2 text-left rounded px-1 py-1 -mx-1 transition-colors ${hasDesc ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5' : 'cursor-default'}`}
                      >
                        <span className="text-[11px] text-slate-400 shrink-0 w-4">{i + 1}.</span>
                        <span className="text-[12.5px] font-medium text-slate-700 dark:text-[#D1D5DB] flex-1 leading-snug">{a.nome || a.titulo || '—'}</span>
                        {a.duracao && <span className="text-[11px] text-slate-400 shrink-0">· {a.duracao}min</span>}
                        {hasDesc && <span className="text-[10px] text-slate-300 dark:text-[#4B5563] ml-0.5">{isOpen ? '▾' : '▸'}</span>}
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
            {planoTitulo && (
              <div className="flex items-start gap-2 pb-2 border-b border-[#E6EAF0] dark:border-[#374151]">
                <span className="text-[14px] shrink-0 mt-0.5">📋</span>
                <p className="text-[13px] font-semibold text-slate-700 dark:text-[#D1D5DB] leading-snug line-clamp-2">
                  {planoTitulo}
                </p>
              </div>
            )}
            <p className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
              ✓ O que aconteceu
            </p>
            {temConteudoReg ? (
              <div className="space-y-1.5">
                {funcionouBem && <RegistroField icon="⭐" label="Funcionou" text={funcionouBem} />}
                {repetiria && !funcionouBem && <RegistroField icon="⭐" label="Funcionou" text={repetiria} />}
                {fariadiferente && <RegistroField icon="🔄" label="Faria diferente" text={fariadiferente} />}
                {statusLabel && (
                  <p className="text-[11px] text-slate-400 dark:text-[#6B7280]">
                    Como foi: <span className="font-medium">{statusLabel}</span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[11.5px] text-slate-400 dark:text-[#6B7280] italic">
                Registro sem detalhes preenchidos.
              </p>
            )}
          </div>
        )}

        {cardState === 'sugestao' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[14px]">💡</span>
              <p className="text-[13px] font-semibold text-slate-700 dark:text-[#D1D5DB]">
                Sugestão: {ultAcao}
              </p>
            </div>
            <div className="pt-2 border-t border-[#E6EAF0] dark:border-[#374151] space-y-1.5">
              <p className="text-[10.5px] font-semibold text-slate-400 dark:text-[#6B7280] uppercase tracking-wide mb-1.5">
                📋 Última aula{ultimoRegData ? ` · ${ultimoRegData}` : ''}
              </p>
              {ultRepetiria && <RegistroField icon="⭐" label="Funcionou" text={ultRepetiria} />}
              {ultFariadiferente && <RegistroField icon="🔄" label="Faria diferente" text={ultFariadiferente} />}
              {ultStatusLabel && (
                <p className="text-[11px] text-slate-400 dark:text-[#6B7280]">
                  Como foi: <span className="font-medium">{ultStatusLabel}</span>
                </p>
              )}
              {!ultRepetiria && !ultFariadiferente && !ultStatusLabel && (
                <p className="text-[11.5px] text-slate-400 dark:text-[#6B7280] italic">
                  Sem detalhes no último registro.
                </p>
              )}
            </div>
          </div>
        )}

        {cardState === 'vazio' && (
          <p className="text-[12.5px] text-slate-400 dark:text-[#6B7280] text-center py-1">
            Nenhum plano para esta aula.
          </p>
        )}

      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <div className="px-5 pb-5 pt-0 flex gap-2">
        {cardState === 'comPlano' && (
          <ActionButton onClick={onEditar} label="✏️  Editar plano" variant="primary" fullWidth />
        )}
        {cardState === 'registrada' && (
          <ActionButton onClick={onEditar} label="✏️  Ver planejamento" variant="secondary" fullWidth />
        )}
        {cardState === 'sugestao' && (
          <ActionButton onClick={onCriarPlano} label="+ Planejar próxima aula" variant="primary" fullWidth />
        )}
        {cardState === 'vazio' && (
          <ActionButton onClick={onCriarPlano} label="+ Criar plano" variant="primary" fullWidth />
        )}
      </div>
    </>
  )

  return (
    <div className={backdropClass} onClick={onClose}>
      <div
        className={panelClass}
        style={panelStyle}
        onClick={e => e.stopPropagation()}
      >
        {panelContent}
      </div>
    </div>
  )
}
