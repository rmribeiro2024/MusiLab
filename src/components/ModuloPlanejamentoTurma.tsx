// src/components/ModuloPlanejamentoTurma.tsx
// Módulo "Planejamento por Turma" — visão pedagógica por turma.
// Bloco 1: Último Registro | Bloco 2: Próximo Passo Sugerido | Bloco 3: Planejamento (3 modos)

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { usePlanejamentoTurmaContext, type TurmaSelecionada } from '../contexts/PlanejamentoTurmaContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import { usePlanosContext } from '../contexts/PlanosContext'
import { useRepertorioContext } from '../contexts/RepertorioContext'
import { useCalendarioContext } from '../contexts/CalendarioContext'
import RichTextEditor from './RichTextEditor'
import { stripHTML, gerarIdSeguro } from '../lib/utils'
import { showToast } from '../lib/toast'
import { useAtividadesContext, useAplicacoesContext, useSequenciasContext, useEstrategiasContext } from '../contexts'
import type { AnoLetivo, Escola, Segmento, Turma, GradeEditando, RegistroPosAula, AlunoDestaque, AnotacaoAluno, MarcoAluno } from '../types'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function calcProximaAula(turma: TurmaSelecionada, grades: GradeEditando[]): string {
  const hoje = new Date()
  const nomes = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  for (let i = 1; i <= 90; i++) {
    const d = new Date(hoje)
    d.setDate(hoje.getDate() + i)
    const dataStr = d.toISOString().split('T')[0]
    const diaSemana = nomes[d.getDay()]
    for (const grade of grades) {
      if (dataStr < grade.dataInicio || dataStr > grade.dataFim) continue
      const match = grade.aulas.find(a =>
        a.diaSemana === diaSemana && String(a.turmaId) === turma.turmaId
      )
      if (match) return dataStr
    }
  }
  return ''
}

function calcUltimaAula(turma: TurmaSelecionada, grades: GradeEditando[]): string {
  const hoje = new Date()
  const nomes = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  for (let i = 0; i <= 365; i++) {
    const d = new Date(hoje)
    d.setDate(hoje.getDate() - i)
    const dataStr = d.toISOString().split('T')[0]
    const diaSemana = nomes[d.getDay()]
    for (const grade of grades) {
      if (dataStr < grade.dataInicio || dataStr > grade.dataFim) continue
      const match = grade.aulas.find(a =>
        a.diaSemana === diaSemana && String(a.turmaId) === turma.turmaId
      )
      if (match) return dataStr
    }
  }
  return ''
}

function formatarData(dataStr: string): string {
  if (!dataStr) return '—'
  const [y, m, d] = dataStr.split('-')
  return `${d}/${m}/${y}`
}

function labelResultado(valor: string): string {
  const mapa: Record<string, string> = {
    bem:     '✅ Funcionou bem',
    parcial: '⚠️ Parcial',
    nao:     '❌ Não funcionou',
  }
  return mapa[valor] ?? valor
}

function labelProximaOpcao(valor: string): string {
  const mapa: Record<string, string> = {
    nova:           'Iniciar nova aula',
    revisar:        'Revisar / retomar conteúdo',
    'revisar-nova': 'Revisar + iniciar nova aula',
    decidir:        'Decidir depois',
  }
  return mapa[valor] ?? valor
}

// ─── TIMELINE PEDAGÓGICA ──────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const MESES_TIMELINE = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

interface TLItem {
  dataStr: string
  status: 'realizada' | 'planejada' | 'sem-plano'
  planoId?: string | number
  planoTitulo?: string
  aplicacaoId?: string
  sequenciaTitulo?: string  // sequência pedagógica ou tema
}

function TimelinePedagogica({ onAcionar, dataAtiva, setDataAtiva, turmaNome }: {
  onAcionar: (modo: 'adaptar' | 'importar' | 'criar') => void
  dataAtiva: string | null
  setDataAtiva: (d: string | null) => void
  turmaNome: string
}) {
  const { turmaSelecionada, historicoDaTurma } = usePlanejamentoTurmaContext()
  const { aplicacoes } = useAplicacoesContext()
  const { planos } = usePlanosContext()
  const { obterTurmasDoDia } = useCalendarioContext()
  const { sequencias } = useSequenciasContext()
  const [verTodos, setVerTodos] = useState(false)
  const hojeStr = useMemo(() => toDateStr(new Date()), [])

  // Auto-scroll: centraliza o ponto ativo na sua row
  useEffect(() => {
    if (!dataAtiva) return
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-date="${dataAtiva}"]`) as HTMLElement | null
      if (el) el.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
    })
  }, [dataAtiva])

  // Todos os itens da timeline: aplicacoes + datas futuras sem plano
  const todosItens = useMemo<TLItem[]>(() => {
    if (!turmaSelecionada) return []

    // eslint-disable-next-line eqeqeq
    const apsDaTurma = aplicacoes.filter(a => a.turmaId == turmaSelecionada.turmaId && a.segmentoId == turmaSelecionada.segmentoId)
      .sort((a, b) => a.data.localeCompare(b.data))
    const datasComAp = new Set(apsDaTurma.map(a => a.data))

    // Próximas datas no calendário sem aplicação (até 60 dias, máx 6 itens)
    const semAp: string[] = []
    const hoje = new Date()
    for (let i = 1; i <= 60 && semAp.length < 6; i++) {
      const d = new Date(hoje); d.setDate(hoje.getDate() + i)
      const ds = toDateStr(d)
      if (datasComAp.has(ds)) continue
      const aulas = obterTurmasDoDia(ds)
      // eslint-disable-next-line eqeqeq
      if (aulas.some(a => a.turmaId == turmaSelecionada.turmaId && a.segmentoId == turmaSelecionada.segmentoId))
        semAp.push(ds)
    }

    const fromAps: TLItem[] = apsDaTurma.map(ap => {
      const plano = planos.find(p => String(p.id) === String(ap.planoId))
      // Sequência pedagógica → fallback para tema do plano
      const seq = ap.planoId != null
        ? sequencias.find(s => s.slots.some(sl => sl.planoVinculado != null && String(sl.planoVinculado) === String(ap.planoId)))
        : undefined
      const sequenciaTitulo = seq?.titulo ?? plano?.tema ?? undefined
      return {
        dataStr: ap.data,
        status: ap.status === 'realizada' ? 'realizada' : 'planejada',
        planoId: ap.planoId,
        planoTitulo: plano?.titulo,
        aplicacaoId: ap.id,
        sequenciaTitulo,
      }
    })

    const fromSemAp: TLItem[] = semAp.map(ds => ({ dataStr: ds, status: 'sem-plano' as const }))

    return [...fromAps, ...fromSemAp].sort((a, b) => a.dataStr.localeCompare(b.dataStr))
  }, [turmaSelecionada, aplicacoes, planos, obterTurmasDoDia])

  // Janela padrão: últimas 5 realizadas + próximas 3 (planejada/sem-plano)
  const itensPadrao = useMemo<TLItem[]>(() => {
    const hojeStr = toDateStr(new Date())
    const realizadas = todosItens.filter(i => i.status === 'realizada').slice(-5)
    const futuras    = todosItens.filter(i => i.dataStr >= hojeStr && i.status !== 'realizada').slice(0, 3)
    const seen = new Set<string>()
    return [...realizadas, ...futuras]
      .filter(i => !seen.has(i.dataStr) && !!seen.add(i.dataStr))
      .sort((a, b) => a.dataStr.localeCompare(b.dataStr))
  }, [todosItens])

  const itensVisiveis = verTodos ? todosItens : itensPadrao
  const temMais       = !verTodos && todosItens.length > itensPadrao.length

  // Agrupar itens por sequência pedagógica / tema
  const grupos = useMemo(() => {
    const map = new Map<string, TLItem[]>()
    const noGroup: TLItem[] = []
    for (const item of itensVisiveis) {
      if (item.sequenciaTitulo) {
        if (!map.has(item.sequenciaTitulo)) map.set(item.sequenciaTitulo, [])
        map.get(item.sequenciaTitulo)!.push(item)
      } else {
        noGroup.push(item)
      }
    }
    const result: { titulo: string | null; items: TLItem[] }[] = []
    map.forEach((items, titulo) => result.push({ titulo, items }))
    if (noGroup.length) result.push({ titulo: null, items: noGroup })
    return result
  }, [itensVisiveis])
  const temAgrupamento = grupos.some(g => g.titulo !== null)

  // Detalhe do ponto selecionado
  const itemAtivo    = dataAtiva ? itensVisiveis.find(i => i.dataStr === dataAtiva) ?? null : null
  const [planoPreview, setPlanoPreview] = useState<import('../types').Plano | null>(null)

  const contadores = useMemo(() => ({
    realizadas: todosItens.filter(i => i.status === 'realizada').length,
    planejadas:  todosItens.filter(i => i.status === 'planejada').length,
    semPlano:    todosItens.filter(i => i.status === 'sem-plano').length,
  }), [todosItens])

  if (!turmaSelecionada || itensVisiveis.length === 0) return null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">Progresso pedagógico</h3>
          {turmaNome && <span className="text-xs text-slate-400 font-medium truncate">— {turmaNome}</span>}
        </div>
        {temMais && (
          <button type="button" onClick={() => setVerTodos(true)}
            className="text-[11px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors">
            Ver histórico completo
          </button>
        )}
        {verTodos && (
          <button type="button" onClick={() => setVerTodos(false)}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors">
            Ver resumo
          </button>
        )}
      </div>

      {/* Resumo de indicadores */}
      <div className="flex items-center gap-1 mb-4 text-[11px] flex-wrap">
        <span className="font-bold text-emerald-600">{contadores.realizadas}</span>
        <span className="text-slate-400">realizadas</span>
        <span className="text-slate-300 mx-1">•</span>
        <span className="font-bold text-indigo-500">{contadores.planejadas}</span>
        <span className="text-slate-400">planejadas</span>
        {contadores.semPlano > 0 && <>
          <span className="text-slate-300 mx-1">•</span>
          <span className="font-bold text-slate-400">{contadores.semPlano}</span>
          <span className="text-slate-400">sem plano</span>
        </>}
      </div>

      {/* Timeline: agrupada por sequência ou plana */}
      <div className={temAgrupamento ? 'space-y-4' : ''}>
        {grupos.map((grupo) => (
          <div key={grupo.titulo ?? '__none__'}>

            {/* Cabeçalho da sequência */}
            {grupo.titulo && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  {grupo.titulo}
                </span>
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-[9px] text-slate-400 whitespace-nowrap shrink-0">
                  {grupo.items.filter(i => i.status === 'realizada').length} realizad{grupo.items.filter(i => i.status === 'realizada').length !== 1 ? 'as' : 'a'}
                  {grupo.items.filter(i => i.status === 'planejada').length > 0 && ` · ${grupo.items.filter(i => i.status === 'planejada').length} planejad${grupo.items.filter(i => i.status === 'planejada').length !== 1 ? 'as' : 'a'}`}
                </span>
              </div>
            )}
            {!grupo.titulo && temAgrupamento && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Sem sequência
                </span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
            )}

            {/* Dots row */}
            <div className="relative px-3">
              <div className="absolute top-[29px] left-5 right-5 h-0.5 bg-slate-100 rounded-full pointer-events-none" />
              <div className="relative flex items-start overflow-x-auto scrollbar-hide pb-1"
                style={{ gap: grupo.items.length > 6 ? '0' : undefined, justifyContent: grupo.items.length <= 8 ? 'space-between' : undefined }}>
                {grupo.items.map((item) => {
                  const isAtivo = dataAtiva === item.dataStr
                  const [, mm, dd] = item.dataStr.split('-')
                  const mesAbr = MESES_TIMELINE[parseInt(mm) - 1]
                  const statusLabel =
                    item.status === 'realizada' ? 'Realizada' :
                    item.status === 'planejada' ? 'Planejada' : 'Sem plano'
                  const dotColor =
                    item.status === 'realizada' ? 'bg-emerald-500 border-emerald-500' :
                    item.status === 'planejada' ? 'bg-indigo-500 border-indigo-500' :
                    'bg-white border-slate-300'
                  const dotGlow = isAtivo
                    ? item.status === 'realizada' ? 'ring-4 ring-offset-2 ring-emerald-300 shadow-[0_0_10px_3px_rgba(52,211,153,0.45)] scale-125'
                    : item.status === 'planejada' ? 'ring-4 ring-offset-2 ring-indigo-300 shadow-[0_0_10px_3px_rgba(129,140,248,0.45)] scale-125'
                    : 'ring-4 ring-offset-2 ring-slate-300 shadow-[0_0_8px_2px_rgba(148,163,184,0.35)] scale-125'
                    : 'hover:scale-110'
                  const isHoje = item.dataStr === hojeStr
                  return (
                    <button
                      key={item.dataStr}
                      data-date={item.dataStr}
                      type="button"
                      onClick={() => setDataAtiva(isAtivo ? null : item.dataStr)}
                      className="relative z-10 flex flex-col items-center shrink-0 px-2 pt-5 group focus:outline-none"
                    >
                      {isHoje && (
                        <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[8px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full whitespace-nowrap leading-tight">
                          Hoje
                        </span>
                      )}
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 pointer-events-none">
                        <div className="bg-slate-800 text-white rounded-lg px-2.5 py-2 text-[10px] whitespace-nowrap shadow-xl text-left min-w-[90px]">
                          <div className="font-bold text-white">{dd}/{mm}</div>
                          {item.planoTitulo && <div className="text-slate-300 mt-0.5 max-w-[130px] truncate">{item.planoTitulo}</div>}
                          <div className={`mt-1 font-semibold ${item.status === 'realizada' ? 'text-emerald-400' : item.status === 'planejada' ? 'text-indigo-400' : 'text-slate-400'}`}>{statusLabel}</div>
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-800 w-0 h-0" />
                      </div>
                      {/* Dot */}
                      <div className={`w-[18px] h-[18px] rounded-full border-2 transition-all duration-200 ${dotColor} ${dotGlow}`} />
                      {/* Rótulos */}
                      <span className={`text-[9px] font-bold mt-1 transition-colors ${isAtivo ? (item.status === 'realizada' ? 'text-emerald-600' : item.status === 'planejada' ? 'text-indigo-600' : 'text-slate-500') : 'text-slate-500'}`}>{dd}</span>
                      <span className="text-[9px] text-slate-400">{mesAbr}</span>
                      {item.planoTitulo && (
                        <span className="text-[8px] text-slate-400 text-center leading-tight mt-0.5 whitespace-normal break-words max-w-[72px]">
                          {item.planoTitulo}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {[
          { cls: 'bg-emerald-500 border-emerald-500', label: 'Realizada' },
          { cls: 'bg-indigo-500 border-indigo-500',   label: 'Planejada' },
          { cls: 'bg-white border-slate-300',          label: 'Sem plano' },
        ].map(({ cls, label }) => (
          <span key={label} className="flex items-center gap-1 text-[9px] text-slate-400">
            <span className={`w-2.5 h-2.5 rounded-full border-2 shrink-0 ${cls}`} />
            {label}
          </span>
        ))}
      </div>

      {/* Painel de detalhe da data selecionada */}
      {itemAtivo && (
        <div className="mt-4 border-t border-slate-100 pt-3 space-y-2.5">

          {/* Data + status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">{formatarData(itemAtivo.dataStr)}</span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              itemAtivo.status === 'realizada' ? 'bg-emerald-50 text-emerald-700' :
              itemAtivo.status === 'planejada' ? 'bg-indigo-50 text-indigo-700' :
              'bg-slate-100 text-slate-500'
            }`}>
              {itemAtivo.status === 'realizada' ? '● Realizada' :
               itemAtivo.status === 'planejada' ? '● Planejada' : '○ Sem plano'}
            </span>
          </div>

          {/* Plano vinculado — clicável */}
          {itemAtivo.planoTitulo && itemAtivo.planoId && (
            <button
              type="button"
              onClick={() => {
                const p = planos.find(p => String(p.id) === String(itemAtivo.planoId))
                if (p) setPlanoPreview(p)
              }}
              className="w-full flex items-center justify-between gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2.5 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm shrink-0">📄</span>
                <span className="text-xs text-slate-700 font-medium truncate">{itemAtivo.planoTitulo}</span>
              </div>
              <span className="text-[11px] font-semibold text-indigo-500 group-hover:text-indigo-700 shrink-0 transition-colors">
                Ver plano →
              </span>
            </button>
          )}

          {/* Sem plano → 3 ações */}
          {itemAtivo.status === 'sem-plano' && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[11px] font-semibold text-slate-500 mb-2">Planejar aula desta turma</p>
              <div className="flex flex-col gap-1.5">
                <button type="button" onClick={() => onAcionar('adaptar')}
                  className="w-full text-left text-xs font-semibold px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 transition-colors">
                  🔄 Adaptar última aula
                </button>
                <button type="button" onClick={() => onAcionar('importar')}
                  className="w-full text-left text-xs font-semibold px-3 py-2 rounded-lg bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors">
                  🏛 Importar do banco
                </button>
                <button type="button" onClick={() => onAcionar('criar')}
                  className="w-full text-left text-xs font-semibold px-3 py-2 rounded-lg bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors">
                  ✏️ Criar nova aula
                </button>
              </div>
            </div>
          )}

          {/* Planejada → 3 ações */}
          {itemAtivo.status === 'planejada' && (
            <div className="bg-indigo-50 rounded-xl p-3">
              <p className="text-[11px] font-semibold text-indigo-600 mb-2">Adicionar planejamento para esta aula</p>
              <div className="flex flex-col gap-1.5">
                <button type="button" onClick={() => onAcionar('adaptar')}
                  className="w-full text-left text-xs font-semibold px-3 py-2 rounded-lg bg-white text-blue-700 hover:bg-blue-50 border border-blue-100 transition-colors">
                  🔄 Adaptar última aula
                </button>
                <button type="button" onClick={() => onAcionar('importar')}
                  className="w-full text-left text-xs font-semibold px-3 py-2 rounded-lg bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors">
                  🏛 Importar do banco
                </button>
                <button type="button" onClick={() => onAcionar('criar')}
                  className="w-full text-left text-xs font-semibold px-3 py-2 rounded-lg bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors">
                  ✏️ Criar nova aula
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Modal preview do plano */}
      {planoPreview && <ModalPreviewPlano plano={planoPreview} onFechar={() => setPlanoPreview(null)} />}
    </div>
  )
}

// ─── SELETOR DE DIA + TURMA (painel lateral vertical) ────────────────────────

const DIAS_LABEL: Record<number, string> = { 1:'SEG', 2:'TER', 3:'QUA', 4:'QUI', 5:'SEX' }
const DIAS_NOME:  Record<number, string> = { 1:'SEGUNDA', 2:'TERÇA', 3:'QUARTA', 4:'QUINTA', 5:'SEXTA' }
const MESES_ABR  = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
const MESES_COMP = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']

function nearestWeekday(d: Date): Date {
  const dow = d.getDay()
  if (dow === 0) { const n = new Date(d); n.setDate(d.getDate() + 1); return n }
  if (dow === 6) { const n = new Date(d); n.setDate(d.getDate() + 2); return n }
  return d
}

function stepDay(d: Date, delta: number): Date {
  const next = new Date(d)
  next.setDate(d.getDate() + delta)
  const dow = next.getDay()
  if (dow === 0) next.setDate(next.getDate() + (delta > 0 ? 1 : -2))
  if (dow === 6) next.setDate(next.getDate() + (delta > 0 ? 2 : -1))
  return next
}

function SeletorDiaTurma() {
  const { selecionarTurma, turmaSelecionada, planejamentos } = usePlanejamentoTurmaContext()
  const { anosLetivos } = useAnoLetivoContext()
  const { obterTurmasDoDia } = useCalendarioContext()
  const { aplicacoesPorData } = useAplicacoesContext()

  const [currentDate, setCurrentDate] = useState<Date>(() => nearestWeekday(new Date()))
  const [maisAberto, setMaisAberto] = useState(false)

  const dateStr = toDateStr(currentDate)
  const diaDaSemana = currentDate.getDay()
  const diaLabel  = DIAS_LABEL[diaDaSemana] ?? '?'
  const diaNome   = DIAS_NOME[diaDaSemana]  ?? '?'
  const diaNum    = currentDate.getDate()
  const mesAbr    = MESES_ABR[currentDate.getMonth()]
  const mesComp   = MESES_COMP[currentDate.getMonth()]

  // Reset "+mais" quando o dia mudar
  useEffect(() => { setMaisAberto(false) }, [dateStr])

  const aulasDoDia = useMemo(() => obterTurmasDoDia(dateStr), [obterTurmasDoDia, dateStr])

  // Busca nome da turma / escola percorrendo anosLetivos
  // Usa == (igualdade frouxa) porque segmentoId/turmaId são salvos como numbers pelo ModalGradeSemanal
  function getTurmaInfo(aula: import('../types').AulaGrade) {
    for (const ano of anosLetivos) {
      for (const escola of (ano.escolas ?? [])) {
        for (const seg of (escola.segmentos ?? [])) {
          // eslint-disable-next-line eqeqeq
          if (seg.id != aula.segmentoId) continue
          // eslint-disable-next-line eqeqeq
          const turma = (seg.turmas ?? []).find((t: Turma) => t.id == aula.turmaId)
          if (turma) return {
            turmaNome:   turma.nome,
            escolaNome:  escola.nome,
            anoLetivoId: String(ano.id),
            escolaId:    String(escola.id),
          }
        }
      }
    }
    return {
      turmaNome: aula.turmaId, escolaNome: '',
      anoLetivoId: aula.anoLetivoId ?? '',
      escolaId:    aula.escolaId    ?? '',
    }
  }

  // Status: verifica aplicações do dia e depois planejamentos
  function getStatus(aula: import('../types').AulaGrade): 'realizada' | 'planejada' | 'sem-plano' {
    const aps = aplicacoesPorData[dateStr] ?? []
    const ap  = aps.find(a => a.turmaId === aula.turmaId && a.segmentoId === aula.segmentoId)
    if (ap) return ap.status === 'realizada' ? 'realizada' : 'planejada'
    const temPlano = planejamentos.some(p =>
      p.turmaId    === aula.turmaId &&
      p.segmentoId === aula.segmentoId &&
      p.dataPrevista === dateStr
    )
    return temPlano ? 'planejada' : 'sem-plano'
  }

  function handleSelect(aula: import('../types').AulaGrade) {
    const info = getTurmaInfo(aula)
    selecionarTurma({
      anoLetivoId: info.anoLetivoId,
      escolaId:    info.escolaId,
      segmentoId:  aula.segmentoId,
      turmaId:     aula.turmaId,
    })
  }

  const MAX_VISIBLE = 3
  const visiveisAulas = maisAberto ? aulasDoDia : aulasDoDia.slice(0, MAX_VISIBLE)
  const restante = aulasDoDia.length - MAX_VISIBLE

  return (
    <div className="w-48 flex-shrink-0 flex flex-col rounded-3xl overflow-hidden border border-slate-200/80 shadow-md bg-white">

      {/* ── Navegação de dia ── */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1 gap-1">
        <button
          type="button"
          onClick={() => setCurrentDate(d => stepDay(d, -1))}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 text-base transition-colors"
        >
          ‹
        </button>
        <div className="flex-1 text-center">
          <div className="text-[9px] font-bold tracking-widest uppercase text-slate-400">{diaNome}</div>
          <div className="text-[10px] font-semibold text-slate-500">{diaNum} de {mesAbr}</div>
        </div>
        <button
          type="button"
          onClick={() => setCurrentDate(d => stepDay(d, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 text-base transition-colors"
        >
          ›
        </button>
      </div>

      {/* ── Cabeçalho navy ── */}
      <div className="bg-[#1e3a6e] mx-2 rounded-2xl px-4 py-3 relative overflow-hidden">
        <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
        <div className="text-[9px] font-black tracking-[.14em] uppercase text-white/50 relative z-10">{diaLabel}</div>
        <div className="text-4xl font-black text-white leading-none tracking-tight relative z-10">{diaNum}</div>
        <div className="text-[11px] text-white/45 font-medium mt-0.5 relative z-10">{mesComp}</div>
        <div className="mt-2.5 inline-flex items-center gap-1 bg-white/10 rounded-full px-2.5 py-0.5 relative z-10">
          <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
          <span className="text-[10px] font-bold text-white/75">
            {aulasDoDia.length} turma{aulasDoDia.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Lista de turmas ── */}
      <div className="flex-1 py-1.5">
        {aulasDoDia.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-5 px-3">Nenhuma turma neste dia</p>
        )}
        {visiveisAulas.map((aula, i) => {
          const { turmaNome, escolaNome } = getTurmaInfo(aula)
          const status = getStatus(aula)
          const isSelected =
            // eslint-disable-next-line eqeqeq
            turmaSelecionada?.turmaId    == aula.turmaId &&
            // eslint-disable-next-line eqeqeq
            turmaSelecionada?.segmentoId == aula.segmentoId
          const dotColor =
            status === 'realizada' ? 'bg-emerald-500' :
            status === 'planejada' ? 'bg-[#4f6fb5]'   : 'bg-slate-300'
          return (
            <React.Fragment key={`${aula.id}-${i}`}>
              {i > 0 && <div className="h-px bg-slate-100 mx-2.5" />}
              <button
                type="button"
                onClick={() => handleSelect(aula)}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 transition-colors relative ${
                  isSelected ? 'bg-[#eef3fb]' : 'hover:bg-slate-50'
                }`}
              >
                <span className={`absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r transition-colors ${
                  isSelected ? 'bg-[#1e3a6e]' : 'bg-transparent'
                }`} />
                <div className="flex-1 min-w-0 pl-0.5">
                  <div className={`text-[12px] font-bold truncate ${isSelected ? 'text-[#1e3a6e]' : 'text-slate-800'}`}>
                    {turmaNome}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{escolaNome}</div>
                </div>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
              </button>
            </React.Fragment>
          )
        })}
        {restante > 0 && (
          <button
            type="button"
            onClick={() => setMaisAberto(v => !v)}
            className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-[#1e3a6e] transition-colors"
          >
            {maisAberto ? '− menos' : `+${restante} mais`}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── ESTADO VAZIO ─────────────────────────────────────────────────────────────

function EstadoVazio() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">👥</div>
      <h3 className="text-lg font-semibold text-slate-700 mb-2">Selecione uma turma</h3>
      <p className="text-sm text-slate-400 max-w-xs">Escolha o ano letivo, escola, segmento e turma acima para ver o histórico e planejar a próxima aula.</p>
    </div>
  )
}

// ─── INFO ROW ─────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, valor }: { icon: string; label: string; valor: string; destacado?: boolean }) {
  return (
    <div className="text-xs rounded-lg px-3 py-2 bg-slate-50 text-slate-600">
      <span className="mr-1">{icon}</span>
      <span className="font-medium">{label}:</span>{' '}
      <span style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: valor }} />
    </div>
  )
}

// ─── BLOCO 2: PRÓXIMO PASSO SUGERIDO ──────────────────────────────────────────

function CardProximoPasso({ valor, onAdaptar, onImportar, onNovo, podeAdaptar }: {
  valor: string
  onAdaptar: () => void
  onImportar: () => void
  onNovo: () => void
  podeAdaptar: boolean
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Próximo passo sugerido</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onAdaptar}
            disabled={!podeAdaptar}
            className={`text-xs font-semibold rounded-lg px-2.5 py-1 border transition-colors ${podeAdaptar ? 'text-blue-600 hover:text-blue-800 bg-blue-50 border-blue-200 hover:bg-blue-100' : 'text-slate-300 bg-slate-50 border-slate-100 cursor-not-allowed'}`}
          >
            🔄 Adaptar
          </button>
          <button
            type="button"
            onClick={onImportar}
            className="text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 hover:bg-slate-100 transition-colors"
          >
            🏛 Importar
          </button>
          <button
            type="button"
            onClick={onNovo}
            className="text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 hover:bg-slate-100 transition-colors"
          >
            ✏️ Novo
          </button>
        </div>
      </div>
      <p className="text-sm text-slate-700 font-medium">🗓 {labelProximaOpcao(valor)}</p>
    </div>
  )
}

// ─── PAINEL DO BANCO DE AULAS ──────────────────────────────────────────────────

function PainelImportarBanco({
  planosRelacionadosIds,
  onToggle,
  onFechar,
  onImportar,
}: {
  planosRelacionadosIds: string[]
  onToggle: (id: string) => void
  onFechar: () => void
  onImportar?: (plano: import('../types').Plano) => void
}) {
  const { planos } = usePlanosContext()
  const [busca, setBusca] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const planosFiltrados = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return planos
      .filter(p => !p.arquivado && (
        !q ||
        p.titulo?.toLowerCase().includes(q) ||
        p.tema?.toLowerCase().includes(q) ||
        (p.conceitos ?? []).some((c: string) => c.toLowerCase().includes(q))
      ))
      .slice(0, 20)
  }, [planos, busca])

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-600">Banco de aulas</span>
        <button type="button" onClick={onFechar} className="text-slate-400 hover:text-slate-600 text-xs">✕ Fechar</button>
      </div>
      <div className="px-3 pt-3 pb-2">
        <input
          ref={inputRef}
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por título, tema ou conceito..."
          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        />
      </div>
      <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
        {planosFiltrados.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4 px-3">Nenhuma aula encontrada</p>
        ) : (
          planosFiltrados.map(p => {
            const sel = planosRelacionadosIds.includes(String(p.id))
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onImportar ? onImportar(p) : onToggle(String(p.id))}
                className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 transition-colors ${sel ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{p.titulo}</p>
                  {p.tema && <p className="text-xs text-slate-400 truncate">{p.tema}</p>}
                </div>
                {!onImportar && (
                  <span className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center text-xs ${sel ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                    {sel ? '✓' : ''}
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── MODAL PREVIEW DO PLANO ───────────────────────────────────────────────────

function ModalPreviewPlano({ plano, onFechar }: { plano: import('../types').Plano; onFechar: () => void }) {
  const { setAtividades } = useAtividadesContext()
  const [exportados, setExportados] = useState<Set<string>>(new Set())

  function exportarAtividade(a: import('../types').AtividadeRoteiro) {
    const key = String(a.id ?? a.nome)
    if (exportados.has(key)) return
    const novaAtiv: import('../types').Atividade = {
      id: gerarIdSeguro(),
      nome: a.nome,
      descricao: stripHTML(a.descricao || ''),
      duracao: a.duracao || '',
      faixaEtaria: [],
      tags: [],
      recursos: [],
      origemAula: { planoId: String(plano.id), planoTitulo: plano.titulo },
      createdAt: new Date().toISOString(),
    }
    setAtividades(prev => [novaAtiv, ...prev])
    setExportados(prev => new Set(prev).add(key))
    showToast(`"${a.nome}" salva em Atividades`, 'success')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onFechar}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 truncate pr-4">🏦 {plano.titulo}</h3>
          <button type="button" onClick={onFechar} className="text-slate-400 hover:text-slate-600 text-base leading-none">✕</button>
        </div>

        {/* Corpo */}
        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          {plano.tema && (
            <p className="text-xs text-slate-400 -mt-2">Tema: {plano.tema}</p>
          )}

          {plano.objetivoGeral && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Objetivo geral</p>
              <p className="text-sm text-slate-600">{stripHTML(plano.objetivoGeral)}</p>
            </div>
          )}

          {(plano.atividadesRoteiro ?? []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Atividades</p>
              <div className="space-y-1.5">
                {(plano.atividadesRoteiro ?? []).map((a, i) => {
                  const key = String(a.id ?? a.nome)
                  const jaExportado = exportados.has(key)
                  return (
                    <div key={i} className="text-xs bg-slate-50 rounded-lg px-3 py-2 flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-slate-700">{a.nome}</span>
                        {a.descricao && <span className="text-slate-400"> — {stripHTML(a.descricao)}</span>}
                        {a.duracao && <span className="text-slate-300 ml-1">({a.duracao} min)</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => exportarAtividade(a)}
                        disabled={jaExportado}
                        className={`shrink-0 border px-2 py-1 rounded-lg text-xs font-semibold transition ${
                          jaExportado
                            ? 'border-emerald-200 text-emerald-500 cursor-default'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-white text-slate-400 hover:text-slate-600'
                        }`}
                        title="Salvar em Atividades"
                      >
                        {jaExportado ? '✓' : '+ Ativ.'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {(plano.materiais ?? []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Materiais</p>
              <div className="flex flex-wrap gap-1.5">
                {(plano.materiais ?? []).map((m, i) => (
                  <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{m}</span>
                ))}
              </div>
            </div>
          )}

          {!(plano.objetivoGeral) && !(plano.atividadesRoteiro?.length) && (
            <p className="text-sm text-slate-400 text-center py-4">Nenhum detalhe disponível para este plano.</p>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-5 py-3 border-t border-slate-100 flex-shrink-0">
          <button
            type="button"
            onClick={onFechar}
            className="w-full border border-slate-200 hover:bg-slate-50 text-slate-500 py-2.5 rounded-xl text-sm font-semibold transition"
          >
            ← Voltar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── BLOCO 3: FORMULÁRIO DE PLANEJAMENTO (3 MODOS) ────────────────────────────

type Modo = 'adaptar' | 'importar' | 'criar' | null
type DadosForm = Omit<import('../types').PlanejamentoTurma, 'id' | 'criadoEm' | 'atualizadoEm' | 'anoLetivoId' | 'escolaId' | 'segmentoId' | 'turmaId'>

function origemParaModo(origem?: string): Exclude<Modo, null> {
  if (origem === 'adaptacao') return 'adaptar'
  if (origem === 'banco') return 'importar'
  return 'criar'
}

function FormPlanejamentoInline({
  turmaSelecionada,
  planejamentoEditando,
  onSalvar,
  onCancelarEdicao,
  ultimoRegistro,
  acionarBloco2,
  ultimoPlanejamento,
}: {
  turmaSelecionada: TurmaSelecionada
  planejamentoEditando: import('../types').PlanejamentoTurma | null
  onSalvar: (dados: DadosForm) => void
  onCancelarEdicao: () => void
  ultimoRegistro?: RegistroPosAula | null
  acionarBloco2?: { n: number; modo: Exclude<Modo, null> } | null
  ultimoPlanejamento?: import('../types').PlanejamentoTurma | null
}) {
  const { planos } = usePlanosContext()
  const { setViewMode } = useRepertorioContext()
  const { gradesSemanas } = useCalendarioContext()

  const proximaData = useMemo(
    () => calcProximaAula(turmaSelecionada, gradesSemanas),
    [turmaSelecionada, gradesSemanas]
  )

  // Data da última aula real da turma segundo o horário cadastrado (grades)
  const ultimaAulaData = useMemo(
    () => calcUltimaAula(turmaSelecionada, gradesSemanas) || (ultimoRegistro?.data ?? ''),
    [turmaSelecionada, gradesSemanas, ultimoRegistro]
  )

  // Computa conteúdo de pré-preenchimento do modo Adaptar
  function buildAdaptarHtml() {
    const partes: string[] = []
    if (ultimoRegistro?.proximaAula?.trim())
      partes.push(`<p>${ultimoRegistro.proximaAula}</p>`)
    if (ultimoRegistro?.poderiaMelhorar?.trim())
      partes.push(`<p>⚠️ Ponto de atenção: ${ultimoRegistro.poderiaMelhorar}</p>`)
    if (ultimoRegistro?.resumoAula?.trim()) {
      const r = ultimoRegistro.resumoAula
      partes.push(`<p>📋 Última aula: ${r.length > 100 ? r.slice(0, 100) + '…' : r}</p>`)
    }
    return partes.join('')
  }

  // Modo inicial: editar → respeita origemAula; novo → Adaptar se houver dados, senão seletor
  const modoInicial: Modo = (() => {
    if (planejamentoEditando) return origemParaModo(planejamentoEditando.origemAula)
    const temDados = !!(
      ultimoRegistro?.proximaAula?.trim() ||
      ultimoRegistro?.poderiaMelhorar?.trim() ||
      ultimoRegistro?.resumoAula?.trim()
    )
    return temDados ? 'adaptar' : null
  })()

  const [modo, setModo] = useState<Modo>(modoInicial)
  const [dataPrevista, setDataPrevista] = useState(planejamentoEditando?.dataPrevista ?? proximaData)
  const [oQuePretendoFazer, setOQuePretendoFazer] = useState(
    planejamentoEditando?.oQuePretendoFazer ?? (modoInicial === 'adaptar' ? buildAdaptarHtml() : '')
  )
  // Plano do banco que contém o último registro pós-aula desta turma
  const planoDaUltimaAulaId: string | null = (() => {
    if (!ultimoRegistro) return null
    const found = planos.find(p =>
      p.registrosPosAula?.some(r => String(r.id) === String(ultimoRegistro.id))
    )
    return found ? String(found.id) : null
  })()

  const [planosRelacionadosIds, setPlanosRelacionadosIds] = useState<string[]>(() => {
    if (planejamentoEditando) return planejamentoEditando.planosRelacionadosIds?.map(String) ?? []
    if (modoInicial === 'adaptar') {
      // Prioridade: plano do banco que gerou o último registro desta turma
      if (planoDaUltimaAulaId) return [planoDaUltimaAulaId]
      // Fallback: planos do último planejamento salvo
      return ultimoPlanejamento?.planosRelacionadosIds?.map(String) ?? []
    }
    return []
  })
  const [novoMaterial, setNovoMaterial] = useState('')
  const [materiais, setMateriais] = useState<string[]>(planejamentoEditando?.materiais ?? [])
  const [editorKey, setEditorKey] = useState(0)
  const [materiaisAbertos, setMateriaisAbertos] = useState(
    modoInicial !== 'adaptar' && materiais.length > 0
  )
  const [painelImportarAberto, setPainelImportarAberto] = useState(false)
  const [basePlano, setBasePlano] = useState<import('../types').Plano | null>(() => {
    const id = planejamentoEditando?.planosRelacionadosIds?.[0]
    return id ? planos.find(p => String(p.id) === id) ?? null : null
  })
  const [painelAdaptarAberto, setPainelAdaptarAberto] = useState(false)
  const [planosAdaptarAbertos, setPlanosAdaptarAbertos] = useState(() =>
    // No modo adaptar sempre fecha — usuário abre se quiser ver
    false
  )
  const [planoPreview, setPlanoPreview] = useState<import('../types').Plano | null>(null)

  // Referência para evitar disparo duplo do acionarBloco2
  const acionarBloco2PrevRef = useRef(acionarBloco2?.n ?? 0)
  // Rastreia se o usuário editou manualmente o editor (auto-preenchimento não conta)
  const hasEditedRef = useRef(false)

  // Sincroniza data quando proximaData é calculado
  useEffect(() => {
    if (!planejamentoEditando && proximaData && !dataPrevista) {
      setDataPrevista(proximaData)
    }
  }, [proximaData]) // eslint-disable-line

  // Sugestões de materiais (top 8 do histórico)
  const sugestoesMateriais = useMemo(() => {
    const contagem: Record<string, number> = {}
    planos.forEach(p => {
      (p.materiais ?? []).forEach(m => {
        const s = m.trim()
        if (s) contagem[s] = (contagem[s] || 0) + 1
      })
    })
    return Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([m]) => m)
  }, [planos])

  const planosRelacionados = useMemo(
    () => planosRelacionadosIds.map(id => planos.find(p => String(p.id) === id)).filter(Boolean) as import('../types').Plano[],
    [planosRelacionadosIds, planos]
  )

  const podeAdaptar = !!(
    ultimoRegistro?.proximaAula?.trim() ||
    ultimoRegistro?.poderiaMelhorar?.trim() ||
    ultimoRegistro?.resumoAula?.trim()
  )

  // ── Selecionar modo ──────────────────────────────────────────────────────────
  function handleSelecionarModo(novoModo: Modo) {
    const temConteudo = oQuePretendoFazer.replace(/<[^>]+>/g, '').trim()
    if (temConteudo && hasEditedRef.current && !window.confirm('Há texto no editor. Deseja trocar de modo e perder o conteúdo?')) return

    let novoConteudo = ''

    if (novoModo === 'adaptar') {
      const partes: string[] = []
      // 0. Encaminhamentos pendentes — incluir como checklist no topo
      const encs = ((ultimoRegistro as any)?.encaminhamentos as { id: string; texto: string; concluido: boolean }[] | undefined)
      const pendentes = encs?.filter(e => !e.concluido) ?? []
      if (pendentes.length > 0) {
        partes.push(pendentes.map(e => `<p>📌 ${e.texto}</p>`).join(''))
      }
      // 1. Ideias/estratégias — prioridade máxima, sem prefixo
      if (ultimoRegistro?.proximaAula?.trim()) {
        partes.push(`<p>${ultimoRegistro.proximaAula}</p>`)
      }
      // 2. O que poderia melhorar — atenção pedagógica
      if (ultimoRegistro?.poderiaMelhorar?.trim()) {
        partes.push(`<p>⚠️ Ponto de atenção: ${ultimoRegistro.poderiaMelhorar}</p>`)
      }
      // 3. Resumo da última aula — apenas como apoio, truncado
      if (ultimoRegistro?.resumoAula?.trim()) {
        const r = ultimoRegistro.resumoAula
        const curto = r.length > 100 ? r.slice(0, 100) + '…' : r
        partes.push(`<p>📋 Última aula: ${curto}</p>`)
      }
      novoConteudo = partes.join('')
    }

    hasEditedRef.current = false
    setModo(novoModo)
    setOQuePretendoFazer(novoConteudo)
    setEditorKey(k => k + 1)
    setBasePlano(null)
    setMateriais([])
    // Adaptar: plano do banco do último registro; outros modos: limpa
    if (novoModo === 'adaptar') {
      setPlanosRelacionadosIds(
        planoDaUltimaAulaId
          ? [planoDaUltimaAulaId]
          : (ultimoPlanejamento?.planosRelacionadosIds?.map(String) ?? [])
      )
    } else {
      setPlanosRelacionadosIds([])
    }
    setPainelImportarAberto(novoModo === 'importar')
    setPainelAdaptarAberto(false)
    setPlanosAdaptarAbertos(false)
    setMateriaisAbertos(false)
  }

  // ── Acionamento externo (botões do Bloco 2: Adaptar / Importar / Novo) ───────
  useEffect(() => {
    if (acionarBloco2 && acionarBloco2.n !== acionarBloco2PrevRef.current && !planejamentoEditando) {
      acionarBloco2PrevRef.current = acionarBloco2.n
      handleSelecionarModo(acionarBloco2.modo)
    }
  }, [acionarBloco2]) // eslint-disable-line

  // ── Voltar ao seletor ────────────────────────────────────────────────────────
  function tentarVoltarSeletor() {
    const temConteudo = oQuePretendoFazer.replace(/<[^>]+>/g, '').trim()
    if (temConteudo && hasEditedRef.current && !window.confirm('Há texto no editor. Deseja trocar de modo e perder o conteúdo?')) return
    hasEditedRef.current = false
    setModo(null)
    setOQuePretendoFazer('')
    setEditorKey(k => k + 1)
    setBasePlano(null)
    setMateriais([])
    setPlanosRelacionadosIds([])
    setPainelImportarAberto(false)
  }

  // ── Importar plano do banco (click único → auto-preenche e fecha painel) ─────
  function importarDoBanco(plano: import('../types').Plano) {
    const partes: string[] = []
    if (plano.objetivoGeral?.trim()) partes.push(`<p>${plano.objetivoGeral}</p>`)
    if (plano.atividadesRoteiro?.length) {
      plano.atividadesRoteiro.forEach(a => {
        if (a.nome?.trim()) partes.push(`<p>• ${a.nome}</p>`)
      })
    }
    const html = partes.join('')
    if (html) {
      setOQuePretendoFazer(html)
      setEditorKey(k => k + 1)
    }
    if (plano.materiais?.length) {
      setMateriais(plano.materiais)
      setMateriaisAbertos(true)
    }
    setPlanosRelacionadosIds([String(plano.id)])
    setBasePlano(plano)
    setPainelImportarAberto(false)
  }

  function togglePlano(id: string) {
    setPlanosRelacionadosIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function adicionarMaterial(m?: string) {
    const mat = (m ?? novoMaterial).trim()
    if (mat && !materiais.includes(mat)) {
      setMateriais(prev => [...prev, mat])
      if (!m) setNovoMaterial('')
    }
  }

  function removerMaterial(m: string) { setMateriais(prev => prev.filter(x => x !== m)) }

  function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    if (!oQuePretendoFazer.replace(/<[^>]+>/g, '').trim()) return
    const origemAula: 'banco' | 'adaptacao' | 'livre' =
      modo === 'adaptar' ? 'adaptacao' :
      modo === 'importar' ? 'banco' : 'livre'
    onSalvar({
      dataPrevista: dataPrevista || undefined,
      oQuePretendoFazer,
      planosRelacionadosIds: planosRelacionadosIds.length > 0 ? planosRelacionadosIds : undefined,
      materiais: materiais.length > 0 ? materiais : undefined,
      origemAula,
    })
  }

  const inputClass = 'w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400'

  const tituloModo =
    planejamentoEditando ? '✏️ Editando planejamento' :
    modo === 'adaptar'  ? '🔄 Adaptar da última aula' :
    modo === 'importar' ? '🏦 Importar do banco' :
    modo === 'criar'    ? '✏️ Criar nova aula' :
    '📝 Planejamento da próxima aula'

  return (
    <form onSubmit={handleSalvar} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-50">
        <h3 className="text-sm font-semibold text-slate-700">
          {tituloModo}
          {modo === 'adaptar' && ultimaAulaData && (
            <span className="ml-2 text-xs font-normal text-slate-400">{formatarData(ultimaAulaData)}</span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {!planejamentoEditando && modo !== null && (
            <button type="button" onClick={tentarVoltarSeletor}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              ← Mudar modo
            </button>
          )}
          {planejamentoEditando && (
            <button type="button" onClick={onCancelarEdicao}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* ── SELETOR DE MODO (quando modo === null) ───────────────────────────── */}
      {modo === null ? (
        <div className="px-5 py-5">

          {/* Banner encaminhamentos pendentes */}
          {(() => {
            const encs = ((ultimoRegistro as any)?.encaminhamentos as { id: string; texto: string; concluido: boolean }[] | undefined)
            const pendentes = encs?.filter(e => !e.concluido) ?? []
            if (pendentes.length === 0) return null
            return (
              <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide mb-2">
                  📌 {pendentes.length} encaminhamento{pendentes.length !== 1 ? 's' : ''} da última aula
                </p>
                <ul className="space-y-1">
                  {pendentes.map(e => (
                    <li key={e.id} className="flex items-start gap-1.5 text-xs text-indigo-700">
                      <span className="shrink-0 mt-0.5">•</span>
                      <span>{e.texto}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-indigo-400 mt-2">Use "Adaptar da última aula" para incluí-los no roteiro.</p>
              </div>
            )
          })()}

          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Como deseja planejar?
          </p>
          <div className="flex flex-col gap-2">

            {/* Adaptar */}
            <button
              type="button"
              onClick={() => handleSelecionarModo('adaptar')}
              disabled={!podeAdaptar}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                podeAdaptar
                  ? 'border-blue-400 bg-blue-50 hover:bg-blue-100 cursor-pointer'
                  : 'border-slate-100 bg-slate-50 cursor-not-allowed'
              }`}
            >
              <span className="text-base flex-shrink-0">🔄</span>
              <div>
                <div className={`text-sm font-semibold ${podeAdaptar ? 'text-blue-700' : 'text-slate-300'}`}>Adaptar da última aula</div>
                <div className={`text-xs mt-0.5 ${podeAdaptar ? 'text-blue-500' : 'text-slate-300'}`}>Usa os registros do último encontro como base</div>
              </div>
            </button>

            {/* Importar */}
            <button
              type="button"
              onClick={() => handleSelecionarModo('importar')}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white text-left hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
            >
              <span className="text-base flex-shrink-0">🏛</span>
              <div>
                <div className="text-sm font-semibold text-slate-700">Importar do banco de aulas</div>
                <div className="text-xs text-slate-400 mt-0.5">Aproveite um plano já criado anteriormente</div>
              </div>
            </button>

            {/* Criar nova */}
            <button
              type="button"
              onClick={() => handleSelecionarModo('criar')}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white text-left hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
            >
              <span className="text-base flex-shrink-0">✏️</span>
              <div>
                <div className="text-sm font-semibold text-slate-700">Criar nova aula livre</div>
                <div className="text-xs text-slate-400 mt-0.5">Começa do zero, sem base anterior</div>
              </div>
            </button>
          </div>

          {!podeAdaptar && (
            <p className="text-xs text-slate-400 text-center mt-3">
              🔄 Adaptar disponível após registrar a primeira aula desta turma
            </p>
          )}
        </div>

      ) : (

        // ── FORMULÁRIO (modo selecionado) ────────────────────────────────────
        <div className="px-5 py-4 space-y-4">

          {/* MODO IMPORTAR — painel ou chip da aula-base */}
          {modo === 'importar' && (
            <div>
              {basePlano ? (
                <div className="flex items-center gap-2 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-3 py-2.5 rounded-xl">
                  <span>🏦</span>
                  <span className="font-medium flex-1 truncate">Aula-base: {basePlano.titulo}</span>
                  <button
                    type="button"
                    onClick={() => setPlanoPreview(basePlano)}
                    className="text-blue-500 hover:text-blue-700 underline whitespace-nowrap"
                  >
                    Ver roteiro
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBasePlano(null)
                      setOQuePretendoFazer('')
                      setEditorKey(k => k + 1)
                      setMateriais([])
                      setPlanosRelacionadosIds([])
                      setPainelImportarAberto(true)
                    }}
                    className="text-blue-400 hover:text-blue-700 ml-0.5"
                  >✕</button>
                </div>
              ) : painelImportarAberto ? (
                <PainelImportarBanco
                  planosRelacionadosIds={planosRelacionadosIds}
                  onToggle={togglePlano}
                  onFechar={() => setPainelImportarAberto(false)}
                  onImportar={importarDoBanco}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setPainelImportarAberto(true)}
                  className="w-full text-xs text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 font-medium transition-colors text-center"
                >
                  🏦 Escolher aula do banco…
                </button>
              )}
            </div>
          )}

          {/* O que pretendo fazer — SEMPRE PRIMEIRO */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              O que pretendo fazer <span className="text-red-400">*</span>
            </label>
            <RichTextEditor
              key={`rte-${planejamentoEditando?.id ?? 'new'}-${turmaSelecionada.turmaId}-${editorKey}`}
              value={oQuePretendoFazer}
              onChange={html => { hasEditedRef.current = true; setOQuePretendoFazer(html) }}
              placeholder={
                modo === 'criar' ? 'Descreva o que planeja fazer nesta aula...' :
                modo === 'adaptar' ? 'Edite o conteúdo pré-preenchido conforme necessário...' :
                'O conteúdo da aula importada aparecerá aqui para edição...'
              }
              rows={5}
            />
          </div>

          {/* MODO ADAPTAR — Planos de referência colapsáveis (abaixo do editor) */}
          {modo === 'adaptar' && (
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              {/* Cabeçalho clicável */}
              <button
                type="button"
                onClick={() => setPlanosAdaptarAbertos(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
              >
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  📚 Planos de referência
                  {planosRelacionados.length > 0 && (
                    <span className="ml-2 normal-case font-normal text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">
                      {planosRelacionados.length}
                    </span>
                  )}
                </span>
                <span className="text-slate-300 text-xs">{planosAdaptarAbertos ? '▲' : '▼'}</span>
              </button>

              {/* Conteúdo expandido */}
              {planosAdaptarAbertos && (
                <div>
                  {planosRelacionados.length > 0 && (
                    <div className="divide-y divide-slate-50">
                      {planosRelacionados.map(p => (
                        <div key={p.id} className="flex items-center justify-between px-3 py-2.5">
                          <span className="text-xs text-slate-700 font-medium truncate flex-1">🏦 {p.titulo}</span>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                            <button
                              type="button"
                              onClick={() => setPlanoPreview(p)}
                              className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                            >
                              👁 Ver
                            </button>
                            <button
                              type="button"
                              onClick={() => togglePlano(String(p.id))}
                              className="text-xs text-slate-300 hover:text-red-400 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Botão + Adicionar / painel de busca */}
                  {painelAdaptarAberto ? (
                    <div className="border-t border-slate-100">
                      <PainelImportarBanco
                        planosRelacionadosIds={planosRelacionadosIds}
                        onToggle={togglePlano}
                        onFechar={() => setPainelAdaptarAberto(false)}
                      />
                    </div>
                  ) : (
                    <div className="border-t border-slate-50 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setPainelAdaptarAberto(true)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        + Adicionar plano
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Materiais — colapsável */}
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setMateriaisAbertos(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                📦 Materiais
                {materiais.length > 0 && (
                  <span className="ml-2 normal-case font-normal text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">
                    {materiais.length}
                  </span>
                )}
              </span>
              <span className="text-slate-300 text-xs">{materiaisAbertos ? '▲' : '▼'}</span>
            </button>

            {materiaisAbertos && (
              <div className="px-3 py-3 space-y-2">
                {materiais.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {materiais.map(m => (
                      <span key={m} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full">
                        {m}
                        <button type="button" onClick={() => removerMaterial(m)} className="text-blue-400 hover:text-blue-700 ml-0.5">✕</button>
                      </span>
                    ))}
                  </div>
                )}
                {sugestoesMateriais.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5">Sugestões:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {sugestoesMateriais.map(m => {
                        const jaTem = materiais.includes(m)
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => jaTem ? removerMaterial(m) : adicionarMaterial(m)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${jaTem ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'}`}
                          >
                            {jaTem ? '✓ ' : '+ '}{m}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novoMaterial}
                    onChange={e => setNovoMaterial(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarMaterial() } }}
                    placeholder="Adicionar material..."
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => adicionarMaterial()}
                    className="text-xs px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Data prevista — no final, campo secundário */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Data prevista</label>
            <input type="date" value={dataPrevista} onChange={e => setDataPrevista(e.target.value)} className={inputClass} />
          </div>

          {/* Botão salvar */}
          <button
            type="submit"
            className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
          >
            <span className="text-emerald-500 text-base font-black">✓</span>
            {planejamentoEditando ? 'Salvar alterações' : 'Salvar planejamento'}
          </button>
        </div>
      )}

      {/* Modal preview de plano */}
      {planoPreview && <ModalPreviewPlano plano={planoPreview} onFechar={() => setPlanoPreview(null)} />}
    </form>
  )
}

// ─── CARD DE PLANEJAMENTO (histórico salvo) ────────────────────────────────────

function CardPlanejamento({ planejamento }: { planejamento: import('../types').PlanejamentoTurma }) {
  const { editarPlanejamento, excluirPlanejamento, buildDadosParaBanco } = usePlanejamentoTurmaContext()
  const { novoPlano, setPlanoEditando, planos } = usePlanosContext()
  const { setViewMode } = useRepertorioContext()
  const [expandido, setExpandido] = useState(false)

  const origemLabel: Record<string, string> = {
    adaptacao: '🔄 Adaptada',
    banco:     '🏦 Importada',
    livre:     '✏️ Criada',
  }

  const planosRelacionados = useMemo(
    () => (planejamento.planosRelacionadosIds ?? []).map(id => planos.find(p => String(p.id) === id)).filter(Boolean) as import('../types').Plano[],
    [planejamento.planosRelacionadosIds, planos]
  )

  function handlePromover() {
    const dados = buildDadosParaBanco(planejamento.id)
    novoPlano()
    setTimeout(() => {
      setPlanoEditando(prev => prev ? {
        ...prev,
        titulo: dados.titulo ?? prev.titulo,
        objetivoGeral: dados.objetivoGeral ?? prev.objetivoGeral,
        materiais: dados.materiais?.length ? dados.materiais : prev.materiais,
        escola: dados.escola ?? prev.escola,
        segmento: dados.segmento ?? prev.segmento,
        turma: dados.turma ?? prev.turma,
        data: dados.data ?? prev.data,
      } : prev)
    }, 0)
    setViewMode('lista')
  }

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpandido(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="min-w-0 flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700 flex-shrink-0">
            {planejamento.dataPrevista ? formatarData(planejamento.dataPrevista) : 'Sem data'}
          </span>
          {planejamento.origemAula && (
            <span className="text-xs text-slate-400 flex-shrink-0">{origemLabel[planejamento.origemAula] ?? ''}</span>
          )}
          <p className="text-xs text-slate-500 truncate" dangerouslySetInnerHTML={{ __html: planejamento.oQuePretendoFazer?.replace(/<[^>]+>/g, ' ').slice(0, 60) ?? '' }} />
        </div>
        <span className="text-slate-300 text-xs ml-2 flex-shrink-0">{expandido ? '▲' : '▼'}</span>
      </button>

      {expandido && (
        <div className="px-3 pb-3 space-y-2 border-t border-slate-50">
          <div className="text-sm text-slate-600 pt-2" dangerouslySetInnerHTML={{ __html: planejamento.oQuePretendoFazer ?? '' }} />

          {planosRelacionados.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Aulas do banco:</p>
              <div className="flex flex-wrap gap-1">
                {planosRelacionados.map(p => (
                  <button key={p.id} type="button" onClick={() => setViewMode('lista')}
                    className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-lg hover:bg-blue-100 transition-colors">
                    🏦 {p.titulo}
                  </button>
                ))}
              </div>
            </div>
          )}

          {planejamento.materiais && planejamento.materiais.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {planejamento.materiais.map((m, i) => (
                <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{m}</span>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-1 flex-wrap">
            <button onClick={() => editarPlanejamento(planejamento)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Editar</button>
            <button onClick={handlePromover} className="text-xs text-emerald-600 hover:text-emerald-800 font-medium border border-emerald-200 px-2 py-0.5 rounded-lg hover:bg-emerald-50 transition-colors">Promover para banco →</button>
            <button onClick={() => excluirPlanejamento(planejamento.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Excluir</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CONTEÚDO DA TURMA ────────────────────────────────────────────────────────

function ConteudoTurma() {
  const {
    turmaSelecionada,
    ultimoRegistroDaTurma,
    historicoDaTurma,
    planejamentosDaTurma,
    salvarPlanejamento,
    planejamentoEditando,
    fecharForm,
  } = usePlanejamentoTurmaContext()

  const { anosLetivos, alunosAddOrUpdate, alunosRemove, alunosGetByTurma, alunoAddAnotacao, alunoRemoveAnotacao, alunoAddMarco, alunoRemoveMarco, turmaGetTiposAnotacao, turmaAddTipoAnotacao, turmaRemoveTipoAnotacao } = useAnoLetivoContext() as ReturnType<typeof useAnoLetivoContext> & { turmaGetTiposAnotacao: (a: string, b: string, c: string, d: string) => string[]; turmaAddTipoAnotacao: (a: string, b: string, c: string, d: string, tipo: string) => void; turmaRemoveTipoAnotacao: (a: string, b: string, c: string, d: string, tipo: string) => void }
  const { planos } = usePlanosContext()
  const { estrategias } = useEstrategiasContext()
  const [historicoExpandido, setHistoricoExpandido] = useState(false)
  const [planejamentosExpandidos, setPlanejamentosExpandidos] = useState(false)
  const [alunosExpandidos, setAlunosExpandidos] = useState(false)
  const [novoAlunoNome, setNovoAlunoNome] = useState('')
  const [novoAlunoNota, setNovoAlunoNota] = useState('')
  const [novoAlunoFlag, setNovoAlunoFlag] = useState(false)
  const [novoAlunoInstrumento, setNovoAlunoInstrumento] = useState('')
  const [editandoAlunoId, setEditandoAlunoId] = useState<string | null>(null)
  // cards de aluno expandidos
  const [alunoCardExpandido, setAlunoCardExpandido] = useState<string | null>(null)
  // forms inline de anotação e marco por aluno
  const [anotacaoForm, setAnotacaoForm] = useState<{ alunoId: string; texto: string; tipo: string } | null>(null)
  const [marcoForm, setMarcoForm] = useState<{ alunoId: string; descricao: string } | null>(null)
  const [novoTipoAnotacao, setNovoTipoAnotacao] = useState('')
  const [acionarBloco2, setAcionarBloco2] = useState<{ n: number; modo: Exclude<Modo, null> } | null>(null)
  const [dataAtiva, setDataAtiva] = useState<string | null>(null)
  const formBlockRef = useRef<HTMLDivElement>(null)

  // Resetar seleção ao trocar de turma
  useEffect(() => { setDataAtiva(null) }, [turmaSelecionada?.turmaId])

  // Nome da turma para exibição na timeline
  const turmaNome = useMemo(() => {
    if (!turmaSelecionada) return ''
    for (const ano of anosLetivos) {
      for (const escola of ano.escolas ?? []) {
        for (const seg of escola.segmentos ?? []) {
          // eslint-disable-next-line eqeqeq
          if (seg.id == turmaSelecionada.segmentoId) {
            // eslint-disable-next-line eqeqeq
            const t = (seg.turmas ?? []).find((t: Turma) => t.id == turmaSelecionada.turmaId)
            if (t) return t.nome
          }
        }
      }
    }
    return `Turma ${turmaSelecionada.turmaId}`
  }, [turmaSelecionada, anosLetivos])

  // Registro exibido: seleção na timeline tem prioridade sobre o mais recente
  const registroExibido = useMemo<RegistroPosAula | null>(() =>
    dataAtiva
      ? historicoDaTurma.find(r => (r.dataAula ?? r.data) === dataAtiva) ?? null
      : ultimoRegistroDaTurma,
    [dataAtiva, historicoDaTurma, ultimoRegistroDaTurma]
  )

  // Cobertura pedagógica: dimensões das estratégias usadas nos planos desta turma
  const coberturaDimensoes = useMemo<{ dimensao: string; count: number }[]>(() => {
    if (!turmaSelecionada) return []
    const turmaIdStr = String(turmaSelecionada.turmaId)
    const planosDistaTurma = planos.filter(p => p.turma && String(p.turma) === turmaIdStr)
    const contagem: Record<string, number> = {}
    for (const plano of planosDistaTurma) {
      for (const ativ of plano.atividadesRoteiro ?? []) {
        for (const estId of ativ.estrategiasVinculadas ?? []) {
          const est = estrategias.find(e => String(e.id) === String(estId))
          for (const dim of est?.dimensoes ?? []) {
            contagem[dim] = (contagem[dim] ?? 0) + 1
          }
        }
      }
    }
    return Object.entries(contagem)
      .map(([dimensao, count]) => ({ dimensao, count }))
      .sort((a, b) => b.count - a.count)
  }, [turmaSelecionada, planos, estrategias])

  if (!turmaSelecionada) return null

  const registrosAnteriores = historicoDaTurma.slice(1)

  const podeAdaptarBloco2 = !!(
    registroExibido?.proximaAula?.trim() ||
    registroExibido?.poderiaMelhorar?.trim() ||
    registroExibido?.resumoAula?.trim()
  )

  function acionarModoFromBloco2(modo: Exclude<Modo, null>) {
    setAcionarBloco2(prev => ({ n: (prev?.n ?? 0) + 1, modo }))
    setTimeout(() => {
      formBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  return (
    <div className="space-y-4">

      {/* ── TIMELINE PEDAGÓGICA ────────────────────────────────────────────────── */}
      <TimelinePedagogica
        onAcionar={acionarModoFromBloco2}
        dataAtiva={dataAtiva}
        setDataAtiva={setDataAtiva}
        turmaNome={turmaNome}
      />

      {/* ── BLOCO 1: Registro pós-aula ─────────────────────────────────────────── */}
      {registroExibido ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">
              {dataAtiva ? 'Registro selecionado' : 'Último registro'}
            </h3>
            <span className="text-xs text-slate-400">
              {formatarData(registroExibido.dataAula ?? registroExibido.data ?? '')}
            </span>
          </div>
          <div className="space-y-2">
            {registroExibido.resultadoAula && (
              <InfoRow icon="📊" label="Resultado da aula" valor={labelResultado(registroExibido.resultadoAula)} />
            )}
            {registroExibido.resumoAula && (
              <InfoRow icon="📋" label="O que foi realizado" valor={registroExibido.resumoAula} />
            )}
            {registroExibido.funcionouBem && (
              <InfoRow icon="✅" label="O que funcionou bem" valor={registroExibido.funcionouBem} />
            )}
            {registroExibido.naoFuncionou && (
              <InfoRow icon="⚠️" label="O que não funcionou" valor={registroExibido.naoFuncionou} />
            )}
            {registroExibido.poderiaMelhorar && (
              <InfoRow icon="🔧" label="O que poderia ter sido melhor" valor={registroExibido.poderiaMelhorar} />
            )}
            {registroExibido.comportamento && (
              <InfoRow icon="👥" label="Comportamento da turma" valor={registroExibido.comportamento} />
            )}
            {registroExibido.anotacoesGerais && (
              <InfoRow icon="📝" label="Anotações gerais" valor={registroExibido.anotacoesGerais} />
            )}
            {registroExibido.proximaAula && (
              <InfoRow icon="💡" label="Ideias / estratégias" valor={registroExibido.proximaAula} destacado />
            )}
            {(() => {
              const chamada = (registroExibido as any).chamada as { alunoId: string; presente: boolean }[] | undefined
              if (!chamada || chamada.length === 0) return null
              const presentes = chamada.filter(c => c.presente).length
              const ausentes = chamada.filter(c => !c.presente)
              const ts = turmaSelecionada!
              const allAlunos = alunosGetByTurma(ts.anoLetivoId, ts.escolaId, ts.segmentoId, ts.turmaId)
              const nomeAluno = (id: string) => allAlunos.find(a => a.id === id)?.nome ?? id
              return (
                <div className="mt-1">
                  <InfoRow icon="✋" label="Chamada" valor={`${presentes}/${chamada.length} presentes`} />
                  {ausentes.length > 0 && (
                    <p className="text-[11px] text-slate-400 mt-0.5 ml-6 italic">
                      Ausentes: {ausentes.map(c => nomeAluno(c.alunoId)).join(', ')}
                    </p>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-4 text-center">
          <p className="text-sm text-slate-400">Nenhum registro pós-aula encontrado para esta turma.</p>
        </div>
      )}

      {/* ── BLOCO 2: Próximo Passo Sugerido ───────────────────────────────────── */}
      {registroExibido?.proximaAulaOpcao && (
        <CardProximoPasso
          valor={registroExibido.proximaAulaOpcao}
          podeAdaptar={podeAdaptarBloco2}
          onAdaptar={() => acionarModoFromBloco2('adaptar')}
          onImportar={() => acionarModoFromBloco2('importar')}
          onNovo={() => acionarModoFromBloco2('criar')}
        />
      )}

      {/* Histórico anterior (colapsável) */}
      {registrosAnteriores.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <button
            onClick={() => setHistoricoExpandido(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <span>Histórico de registros ({registrosAnteriores.length} anterior{registrosAnteriores.length !== 1 ? 'es' : ''})</span>
            <span className="text-slate-400">{historicoExpandido ? '▲' : '▼'}</span>
          </button>
          {historicoExpandido && (
            <div className="divide-y divide-slate-100">
              {registrosAnteriores.map((r, i) => {
                const chamada = (r as any).chamada as { alunoId: string; presente: boolean }[] | undefined
                const presentes = chamada ? chamada.filter(c => c.presente).length : null
                const total = chamada ? chamada.length : null
                return (
                  <div key={r.id ?? i} className="px-4 py-3 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-slate-500">{formatarData(r.dataAula ?? r.data ?? '')}</span>
                      {r.resumoAula && <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{r.resumoAula}</p>}
                    </div>
                    {presentes !== null && total !== null && total > 0 && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${presentes === total ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        ✋ {presentes}/{total}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── BLOCO 3: Formulário de planejamento ───────────────────────────────── */}
      <div ref={formBlockRef}>
        <FormPlanejamentoInline
          key={`form-${turmaSelecionada.turmaId}-${planejamentoEditando?.id ?? 'new'}`}
          turmaSelecionada={turmaSelecionada}
          planejamentoEditando={planejamentoEditando}
          onSalvar={dados => { salvarPlanejamento(dados); fecharForm() }}
          onCancelarEdicao={fecharForm}
          ultimoRegistro={ultimoRegistroDaTurma}
          acionarBloco2={acionarBloco2}
          ultimoPlanejamento={planejamentosDaTurma[0] ?? null}
        />
      </div>

      {/* Planejamentos salvos (colapsável) */}
      {planejamentosDaTurma.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <button
            onClick={() => setPlanejamentosExpandidos(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <span>Planejamentos salvos ({planejamentosDaTurma.length})</span>
            <span className="text-slate-400">{planejamentosExpandidos ? '▲' : '▼'}</span>
          </button>
          {planejamentosExpandidos && (
            <div className="px-4 pb-4 space-y-2">
              {planejamentosDaTurma.map(p => <CardPlanejamento key={p.id} planejamento={p} />)}
            </div>
          )}
        </div>
      )}

      {/* ── ALUNOS ──────────────────────────────────────────────────────────────── */}
      {(() => {
        const ts = turmaSelecionada!
        const alunos = alunosGetByTurma(ts.anoLetivoId, ts.escolaId, ts.segmentoId, ts.turmaId)
        const flagged = alunos.filter(a => a.flag)
        const others = alunos.filter(a => !a.flag)
        const hoje = new Date().toISOString().split('T')[0]

        function salvarAluno() {
          const nome = novoAlunoNome.trim()
          if (!nome) return
          const id = editandoAlunoId ?? gerarIdSeguro()
          const base = editandoAlunoId ? (alunos.find(a => a.id === id) ?? {}) : {}
          alunosAddOrUpdate(ts.anoLetivoId, ts.escolaId, ts.segmentoId, ts.turmaId, {
            ...base, id, nome, flag: novoAlunoFlag,
            nota: novoAlunoNota.trim() || undefined,
            instrumento: novoAlunoInstrumento.trim() || undefined,
          } as AlunoDestaque)
          setNovoAlunoNome(''); setNovoAlunoNota(''); setNovoAlunoFlag(false); setNovoAlunoInstrumento(''); setEditandoAlunoId(null)
        }

        function iniciarEdicao(al: AlunoDestaque) {
          setEditandoAlunoId(al.id)
          setNovoAlunoNome(al.nome)
          setNovoAlunoNota(al.nota ?? '')
          setNovoAlunoFlag(al.flag)
          setNovoAlunoInstrumento(al.instrumento ?? '')
          setAlunosExpandidos(true)
          setAlunoCardExpandido(null)
        }

        function salvarAnotacao(alunoId: string) {
          if (!anotacaoForm || !anotacaoForm.texto.trim()) return
          alunoAddAnotacao(ts.anoLetivoId, ts.escolaId, ts.segmentoId, ts.turmaId, alunoId, {
            id: gerarIdSeguro(), data: hoje,
            texto: anotacaoForm.texto.trim(),
            tipo: anotacaoForm.tipo.trim() || undefined,
          })
          setAnotacaoForm(null)
        }

        function salvarMarco(alunoId: string) {
          if (!marcoForm || !marcoForm.descricao.trim()) return
          alunoAddMarco(ts.anoLetivoId, ts.escolaId, ts.segmentoId, ts.turmaId, alunoId, {
            id: gerarIdSeguro(), data: hoje,
            descricao: marcoForm.descricao.trim(),
          })
          setMarcoForm(null)
        }

        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <button
              onClick={() => setAlunosExpandidos(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                👥 Alunos
                {flagged.length > 0 && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">
                    ⚠️ {flagged.length}
                  </span>
                )}
                {alunos.length > 0 && (
                  <span className="text-[10px] text-slate-400">({alunos.length} aluno{alunos.length !== 1 ? 's' : ''})</span>
                )}
              </span>
              <span className="text-slate-400">{alunosExpandidos ? '▲' : '▼'}</span>
            </button>

            {alunosExpandidos && (
              <div className="px-4 pb-4 space-y-3">

                {/* Cards de alunos */}
                {alunos.length > 0 && (
                  <div className="space-y-2">
                    {[...flagged, ...others].map(al => {
                      const expandido = alunoCardExpandido === al.id
                      const ultimaAnotacao = al.anotacoes?.slice(-1)[0]
                      const totalAnotacoes = al.anotacoes?.length ?? 0
                      const totalMarcos = al.marcos?.length ?? 0
                      return (
                        <div key={al.id} className={`rounded-xl border overflow-hidden ${al.flag ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'}`}>
                          {/* Cabeçalho do card */}
                          <div className="flex items-center gap-2 px-3 py-2.5">
                            <button
                              onClick={() => alunosAddOrUpdate(ts.anoLetivoId, ts.escolaId, ts.segmentoId, ts.turmaId, { ...al, flag: !al.flag })}
                              title={al.flag ? 'Remover flag' : 'Marcar atenção'}
                              className="text-base shrink-0"
                            >{al.flag ? '⚠️' : '👤'}</button>
                            <button
                              onClick={() => setAlunoCardExpandido(expandido ? null : al.id)}
                              className="flex-1 min-w-0 text-left"
                            >
                              <div className="flex items-baseline gap-2">
                                <span className={`text-sm font-semibold ${al.flag ? 'text-amber-800' : 'text-slate-700'}`}>{al.nome}</span>
                                {al.instrumento && <span className="text-[10px] text-slate-400 italic">{al.instrumento}</span>}
                              </div>
                              {!expandido && ultimaAnotacao && (
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">{ultimaAnotacao.texto}</p>
                              )}
                              {!expandido && !ultimaAnotacao && al.nota && (
                                <p className="text-[11px] text-slate-500 italic mt-0.5">{al.nota}</p>
                              )}
                            </button>
                            {(totalAnotacoes > 0 || totalMarcos > 0) && (
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {totalAnotacoes > 0 && `${totalAnotacoes}📝`} {totalMarcos > 0 && `${totalMarcos}⭐`}
                              </span>
                            )}
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => iniciarEdicao(al)} className="text-slate-400 hover:text-indigo-500 transition text-xs px-1">✏️</button>
                              <button onClick={() => alunosRemove(ts.anoLetivoId, ts.escolaId, ts.segmentoId, ts.turmaId, al.id)}
                                className="text-slate-300 hover:text-red-500 transition text-xs px-1">✕</button>
                            </div>
                          </div>

                          {/* Conteúdo expandido */}
                          {expandido && (
                            <div className="border-t border-slate-200 px-3 pb-3 pt-2 space-y-3 bg-white">

                              {/* Marcos pedagógicos */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">⭐ Marcos</span>
                                  {marcoForm?.alunoId !== al.id && (
                                    <button onClick={() => { setMarcoForm({ alunoId: al.id, descricao: '' }); setAnotacaoForm(null) }}
                                      className="text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold">+ Marco</button>
                                  )}
                                </div>
                                {(al.marcos ?? []).length === 0 && marcoForm?.alunoId !== al.id && (
                                  <p className="text-[11px] text-slate-400 italic">Nenhum marco registrado.</p>
                                )}
                                {(al.marcos ?? []).map(m => (
                                  <div key={m.id} className="flex items-start gap-1.5 text-[11px] text-slate-600 mb-1">
                                    <span className="text-amber-500 shrink-0">⭐</span>
                                    <span className="flex-1">{m.descricao} <span className="text-slate-400">· {m.data.split('-').reverse().join('/')}</span></span>
                                    <button onClick={() => alunoRemoveMarco(ts.anoLetivoId, ts.escolaId, ts.segmentoId, ts.turmaId, al.id, m.id)}
                                      className="text-slate-300 hover:text-red-400 ml-1">✕</button>
                                  </div>
                                ))}
                                {marcoForm?.alunoId === al.id && (
                                  <div className="flex gap-2 mt-1">
                                    <input autoFocus type="text" placeholder="Ex: Tocou a peça completa sem partitura"
                                      value={marcoForm.descricao}
                                      onChange={e => setMarcoForm({ ...marcoForm, descricao: e.target.value })}
                                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); salvarMarco(al.id) } if (e.key === 'Escape') setMarcoForm(null) }}
                                      className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] focus:border-indigo-400 outline-none"
                                    />
                                    <button onClick={() => salvarMarco(al.id)} disabled={!marcoForm.descricao.trim()}
                                      className="text-[10px] bg-indigo-500 text-white px-2.5 py-1 rounded-lg disabled:opacity-40">OK</button>
                                    <button onClick={() => setMarcoForm(null)} className="text-[10px] text-slate-400 px-1">✕</button>
                                  </div>
                                )}
                              </div>

                              {/* Anotações */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">📝 Anotações</span>
                                  {anotacaoForm?.alunoId !== al.id && (
                                    <button onClick={() => { setAnotacaoForm({ alunoId: al.id, texto: '', tipo: '' }); setMarcoForm(null) }}
                                      className="text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold">+ Anotação</button>
                                  )}
                                </div>
                                {(al.anotacoes ?? []).length === 0 && anotacaoForm?.alunoId !== al.id && (
                                  <p className="text-[11px] text-slate-400 italic">Nenhuma anotação.</p>
                                )}
                                {(al.anotacoes ?? []).slice().reverse().map(an => (
                                  <div key={an.id} className="flex items-start gap-1.5 text-[11px] text-slate-600 mb-1.5 pb-1.5 border-b border-slate-100 last:border-0">
                                    <div className="flex-1 min-w-0">
                                      {an.tipo && <span className="inline-block text-[9px] bg-indigo-50 text-indigo-600 font-semibold px-1.5 py-0.5 rounded-full mr-1 mb-0.5">{an.tipo}</span>}
                                      <span>{an.texto}</span>
                                      <span className="text-slate-400 ml-1">· {an.data.split('-').reverse().join('/')}</span>
                                    </div>
                                    <button onClick={() => alunoRemoveAnotacao(ts.anoLetivoId, ts.escolaId, ts.segmentoId, ts.turmaId, al.id, an.id)}
                                      className="text-slate-300 hover:text-red-400 shrink-0">✕</button>
                                  </div>
                                ))}
                                {anotacaoForm?.alunoId === al.id && (() => {
                                  const tiposConf = turmaGetTiposAnotacao(ts.anoLetivoId, ts.escolaId, ts.segmentoId, ts.turmaId)
                                  return (
                                    <div className="space-y-1.5 mt-1">
                                      {tiposConf.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {tiposConf.map(tipo => (
                                            <button key={tipo} type="button"
                                              onClick={() => setAnotacaoForm({ ...anotacaoForm, tipo })}
                                              className={`text-[10px] px-2 py-0.5 rounded-full border transition ${anotacaoForm.tipo === tipo ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                                              {tipo}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                      <input type="text" placeholder={tiposConf.length > 0 ? 'Tipo personalizado (ou selecione acima)' : 'Tipo (opcional, ex: dificuldade rítmica)'}
                                        value={anotacaoForm.tipo}
                                        onChange={e => setAnotacaoForm({ ...anotacaoForm, tipo: e.target.value })}
                                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] focus:border-indigo-400 outline-none"
                                      />
                                      <div className="flex gap-2">
                                        <input autoFocus type="text" placeholder="Anotação sobre o aluno nesta aula"
                                          value={anotacaoForm.texto}
                                          onChange={e => setAnotacaoForm({ ...anotacaoForm, texto: e.target.value })}
                                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); salvarAnotacao(al.id) } if (e.key === 'Escape') setAnotacaoForm(null) }}
                                          className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] focus:border-indigo-400 outline-none"
                                        />
                                        <button onClick={() => salvarAnotacao(al.id)} disabled={!anotacaoForm.texto.trim()}
                                          className="text-[10px] bg-indigo-500 text-white px-2.5 py-1 rounded-lg disabled:opacity-40">OK</button>
                                        <button onClick={() => setAnotacaoForm(null)} className="text-[10px] text-slate-400 px-1">✕</button>
                                      </div>
                                    </div>
                                  )
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Formulário de adição/edição */}
                <div className="border border-dashed border-slate-200 rounded-xl p-3 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    {editandoAlunoId ? 'Editando aluno' : '+ Adicionar aluno'}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nome do aluno"
                      value={novoAlunoNome}
                      onChange={e => setNovoAlunoNome(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); salvarAluno() } }}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-indigo-400 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Instrumento"
                      value={novoAlunoInstrumento}
                      onChange={e => setNovoAlunoInstrumento(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); salvarAluno() } }}
                      className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-indigo-400 outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Observação rápida (opcional)"
                    value={novoAlunoNota}
                    onChange={e => setNovoAlunoNota(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); salvarAluno() } }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-indigo-400 outline-none"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                      <input type="checkbox" checked={novoAlunoFlag} onChange={e => setNovoAlunoFlag(e.target.checked)} className="accent-amber-500" />
                      ⚠️ Atenção especial
                    </label>
                    <div className="flex gap-2">
                      {editandoAlunoId && (
                        <button onClick={() => { setEditandoAlunoId(null); setNovoAlunoNome(''); setNovoAlunoNota(''); setNovoAlunoFlag(false); setNovoAlunoInstrumento('') }}
                          className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1">Cancelar</button>
                      )}
                      <button onClick={salvarAluno} disabled={!novoAlunoNome.trim()}
                        className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
                        {editandoAlunoId ? 'Salvar' : 'Adicionar'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tipos de anotação configuráveis desta turma */}
                {(() => {
                  const tiposConf = turmaGetTiposAnotacao(ts.anoLetivoId, ts.escolaId, ts.segmentoId, ts.turmaId)
                  return (
                    <div className="border-t border-slate-100 pt-3 mt-1 space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tipos de anotação</p>
                      {tiposConf.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tiposConf.map(tipo => (
                            <span key={tipo} className="flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">
                              {tipo}
                              <button type="button" onClick={() => turmaRemoveTipoAnotacao(ts.anoLetivoId, ts.escolaId, ts.segmentoId, ts.turmaId, tipo)}
                                className="text-indigo-300 hover:text-red-400 leading-none">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input type="text" placeholder='Ex: "dominou peça", "esqueceu material"'
                          value={novoTipoAnotacao}
                          onChange={e => setNovoTipoAnotacao(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (novoTipoAnotacao.trim()) { turmaAddTipoAnotacao(ts.anoLetivoId, ts.escolaId, ts.segmentoId, ts.turmaId, novoTipoAnotacao.trim()); setNovoTipoAnotacao('') } } }}
                          className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] focus:border-indigo-400 outline-none"
                        />
                        <button type="button"
                          onClick={() => { if (novoTipoAnotacao.trim()) { turmaAddTipoAnotacao(ts.anoLetivoId, ts.escolaId, ts.segmentoId, ts.turmaId, novoTipoAnotacao.trim()); setNovoTipoAnotacao('') } }}
                          disabled={!novoTipoAnotacao.trim()}
                          className="text-[10px] bg-indigo-500 text-white px-2.5 py-1 rounded-lg disabled:opacity-40">+ Tipo</button>
                      </div>
                    </div>
                  )
                })()}

              </div>
            )}
          </div>
        )
      })()}

      {/* ── COBERTURA PEDAGÓGICA ───────────────────────────────────────────────── */}
      {coberturaDimensoes.length > 0 && (() => {
        const maxCount = coberturaDimensoes[0].count
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">📊</span>
              <h3 className="font-semibold text-sm text-slate-700">Cobertura pedagógica</h3>
              <span className="text-xs text-slate-400 ml-auto">este ano</span>
            </div>
            <div className="space-y-2">
              {coberturaDimensoes.map(({ dimensao, count }) => (
                <div key={dimensao} className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 w-28 shrink-0 truncate">{dimensao}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-400 h-2 rounded-full transition-all"
                      style={{ width: `${Math.round((count / maxCount) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-14 text-right shrink-0">
                    {count} aula{count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─── MÓDULO PRINCIPAL ─────────────────────────────────────────────────────────

export default function ModuloPlanejamentoTurma() {
  const { turmaSelecionada } = usePlanejamentoTurmaContext()

  return (
    <div className="flex gap-4 items-start">
      {/* Painel lateral — seletor de dia + turma */}
      <SeletorDiaTurma />

      {/* Painel direito — conteúdo de planejamento */}
      <div className="flex-1 min-w-0 space-y-3">
        {!turmaSelecionada && <EstadoVazio />}
        {turmaSelecionada && <ConteudoTurma />}
      </div>
    </div>
  )
}
