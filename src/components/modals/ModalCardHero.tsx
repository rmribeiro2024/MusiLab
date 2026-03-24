// src/components/modals/ModalCardHero.tsx
// Modal Card Hero — abre ao clicar em um card da Visão da Semana

import React, { useState, useEffect } from 'react'
import type { RegistroPosAula } from '../../types'

// ── Dark mode (mesmo padrão de ModalRegistroPosAula) ─────────────────────────
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

// ── Status helpers (mesma lógica de VisaoSemana) ──────────────────────────────
type StatusEfetivo = 'concluida' | 'revisao' | 'incompleta' | 'nao_houve' | null

function inferStatus(r: RegistroPosAula): StatusEfetivo {
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

const STATUS_ACAO: Record<NonNullable<StatusEfetivo>, string> = {
  concluida:  'Avançar conteúdo',
  incompleta: 'Retomar conteúdo',
  revisao:    'Retomar conteúdo',
  nao_houve:  'Reaplicar aula',
}

const STATUS_LABEL: Record<NonNullable<StatusEfetivo>, string> = {
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
  onClose: () => void
  onEditar: () => void
  onRegistrar: () => void
  onCriarPlano: () => void
}

// ── Sub-componentes ───────────────────────────────────────────────────────────
function RegistroField({ icon, label, text }: { icon: string; label: string; text: string }) {
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

function ActionButton({
  onClick, label, variant, fullWidth = false,
}: {
  onClick: () => void
  label: string
  variant: 'primary' | 'secondary'
  fullWidth?: boolean
}) {
  const base = `${fullWidth ? 'flex-1' : ''} flex items-center justify-center px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all`
  const primary = 'bg-[#5B5FEA] hover:bg-[#4B4FD8] dark:bg-[#818cf8] dark:hover:bg-[#6d78f5] text-white shadow-sm'
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
    onClose, onEditar, onRegistrar, onCriarPlano,
  } = props

  const isDark = useIsDark()

  // Animação de entrada
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  // Drag
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragging = React.useRef(false)
  const dragStart = React.useRef({ mx: 0, my: 0, px: 0, py: 0 })

  const onDragStart = (e: React.MouseEvent) => {
    dragging.current = true
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
    const onUp = () => { dragging.current = false }
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

  // Formatação de data e horário
  const dataLabel = `${diaSemanaShort}, ${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`
  const horarioLabel = horario ? horario.replace(/:00$/, 'h').replace(/:(\d{2})$/, 'h$1') : ''

  // Campos do registro do dia
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

  // Cor da escola como CSS vars
  const cardStyle = escolaCor
    ? ({ '--escola-l': escolaCor.light, '--escola-d': isDark ? escolaCor.dark : escolaCor.light } as React.CSSProperties)
    : undefined

  return (
    <div
      className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className={`absolute bg-white dark:bg-[#1F2937] rounded-2xl shadow-2xl w-[340px] overflow-hidden
          transition-all duration-200 ease-out
          ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        style={{
          ...cardStyle,
          top: pos ? `calc(50% + ${pos.y}px)` : '50%',
          left: pos ? `calc(50% + ${pos.x}px)` : '50%',
          transform: `translate(-50%, -50%) ${visible ? 'scale(1)' : 'scale(0.95)'}`,
          pointerEvents: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div
          className="px-5 pt-5 pb-4 border-b border-[#E6EAF0] dark:border-[#374151] cursor-grab active:cursor-grabbing select-none"
          onMouseDown={onDragStart}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {/* Turma em destaque */}
              <div className="text-[15px] font-bold text-slate-800 dark:text-[#E5E7EB] leading-tight mb-1">
                {turmaNome}
              </div>
              {/* Escola · data · horário */}
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
        <div className="px-5 py-4 space-y-3">

          {/* ── Estado: comPlano ── */}
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
            </div>
          )}

          {/* ── Estado: registrada ── */}
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

          {/* ── Estado: sugestao ── */}
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

          {/* ── Estado: vazio ── */}
          {cardState === 'vazio' && (
            <p className="text-[12.5px] text-slate-400 dark:text-[#6B7280] text-center py-1">
              Nenhum plano para esta aula.
            </p>
          )}

        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <div className="px-5 pb-5 pt-0 flex gap-2">
          {cardState === 'comPlano' && (
            <>
              <ActionButton onClick={onEditar} label="✏️  Editar" variant="secondary" />
              <ActionButton onClick={onRegistrar} label="📝  Registrar" variant="primary" fullWidth />
            </>
          )}
          {cardState === 'registrada' && (
            <ActionButton onClick={onEditar} label="✏️  Ver planejamento" variant="secondary" fullWidth />
          )}
          {cardState === 'sugestao' && (
            <ActionButton onClick={onCriarPlano} label="+ Planejar com base nisso" variant="primary" fullWidth />
          )}
          {cardState === 'vazio' && (
            <ActionButton onClick={onCriarPlano} label="+ Criar plano" variant="primary" fullWidth />
          )}
        </div>

      </div>
    </div>
  )
}
