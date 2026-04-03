// src/components/ModuloPlanejamentoTurma.tsx
// Módulo "Caderno da Turma" — visão pedagógica por turma.
// Bloco 1: Último Registro | Bloco 2: Próximo Passo Sugerido | CTA: Planejar

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { usePlanejamentoTurmaContext, type TurmaSelecionada } from '../contexts/PlanejamentoTurmaContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import { usePlanosContext } from '../contexts/PlanosContext'
import { useRepertorioContext } from '../contexts/RepertorioContext'
import { useCalendarioContext } from '../contexts/CalendarioContext'
import { stripHTML, gerarIdSeguro } from '../lib/utils'
import { showToast } from '../lib/toast'
import { useAtividadesContext, useAplicacoesContext, useSequenciasContext, useEstrategiasContext } from '../contexts'
import type { AnoLetivo, Escola, Segmento, Turma, GradeEditando, RegistroPosAula, AlunoDestaque, AnotacaoAluno, MarcoAluno, Plano } from '../types'
import ModuloHistoricoMusical from './ModuloHistoricoMusical'

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
    nao:     '❌ Faria diferente',
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

// ─── RESUMO AUTOMÁTICO DA TURMA ───────────────────────────────────────────────

interface ResumoTurma {
  participacao: 'alta' | 'média' | 'baixa' | null
  presencaMedia: number | null  // 0–1, só disponível quando chamada está preenchida
  focoRecente: string | null
  tendencia: 'cresceu' | 'estável' | 'caiu' | null
  numAulas: number
}

// Score de engajamento por statusAula (usado quando chamada não está disponível)
function scoreStatus(r: RegistroPosAula): number | null {
  const s = r.statusAula ?? r.resultadoAula
  if (!s) return null
  const mapa: Record<string, number> = {
    concluida: 1.0, bem: 1.0, funcionou: 1.0,
    revisao:   0.7,
    parcial:   0.5,
    incompleta: 0.4, nao: 0.4, nao_funcionou: 0.4,
    nao_houve: 0.0,
  }
  return mapa[s] ?? null
}

function calcResumoTurma(historico: RegistroPosAula[], planos: Plano[]): ResumoTurma {
  // Últimas 5 aulas que de fato ocorreram
  const amostra = historico
    .slice(0, 5)
    .filter(r => (r.statusAula ?? r.resultadoAula) !== 'nao_houve')

  if (amostra.length === 0) {
    return { participacao: null, presencaMedia: null, focoRecente: null, tendencia: null, numAulas: 0 }
  }

  // ── 1. PARTICIPAÇÃO ─────────────────────────────────────────────────────────
  // Fonte primária: chamada (presença real)
  const comChamada = amostra.filter(r => (r.chamada?.length ?? 0) > 0)
  let participacao: 'alta' | 'média' | 'baixa' | null = null
  let presencaMedia: number | null = null

  if (comChamada.length > 0) {
    const media = comChamada.reduce((acc, r) => {
      const ch = r.chamada!
      return acc + ch.filter(c => c.presente).length / ch.length
    }, 0) / comChamada.length
    presencaMedia = media
    participacao = media >= 0.80 ? 'alta' : media >= 0.55 ? 'média' : 'baixa'
  } else {
    // Fallback: statusAula como proxy
    const scores = amostra.map(scoreStatus).filter((s): s is number => s !== null)
    if (scores.length > 0) {
      const media = scores.reduce((a, b) => a + b, 0) / scores.length
      participacao = media >= 0.75 ? 'alta' : media >= 0.45 ? 'média' : 'baixa'
    }
  }

  // ── 2. FOCO RECENTE ──────────────────────────────────────────────────────────
  // Fonte primária: orffMeios do plano pai (o meio expressivo mais usado)
  const ORFF_LABELS: Record<string, string> = { fala: 'fala', canto: 'canto', movimento: 'movimento', instrumental: 'instrumental' }
  const CLASP_LABELS: Record<string, string> = { tecnica: 'técnica', performance: 'performance', apreciacao: 'apreciação', criacao: 'criação', teoria: 'teoria' }

  const contagemOrff: Record<string, number> = {}
  const contagemClasp: Record<string, number> = {}

  for (const reg of amostra) {
    const plano = planos.find(p => p.registrosPosAula?.some(r => r.id === reg.id))
    if (!plano) continue
    if (plano.orffMeios) {
      for (const [meio, ativo] of Object.entries(plano.orffMeios)) {
        if (ativo) contagemOrff[meio] = (contagemOrff[meio] ?? 0) + 1
      }
    }
    if (plano.vivenciasClassificadas) {
      for (const [dim, val] of Object.entries(plano.vivenciasClassificadas)) {
        if (val > 0) contagemClasp[dim] = (contagemClasp[dim] ?? 0) + val
      }
    }
  }

  let focoRecente: string | null = null
  const topOrff = Object.entries(contagemOrff).sort((a, b) => b[1] - a[1])[0]
  if (topOrff) {
    focoRecente = ORFF_LABELS[topOrff[0]] ?? topOrff[0]
  } else {
    const topClasp = Object.entries(contagemClasp).sort((a, b) => b[1] - a[1])[0]
    if (topClasp) focoRecente = CLASP_LABELS[topClasp[0]] ?? topClasp[0]
  }

  // ── 3. TENDÊNCIA ────────────────────────────────────────────────────────────
  // Requer ≥ 3 registros com score
  let tendencia: 'cresceu' | 'estável' | 'caiu' | null = null
  if (amostra.length >= 3) {
    // amostra está desc; reverter para cronológico
    const crono = [...amostra].reverse()
    const scores = crono.map(r => {
      if ((r.chamada?.length ?? 0) > 0) {
        const ch = r.chamada!
        return ch.filter(c => c.presente).length / ch.length
      }
      return scoreStatus(r)
    }).filter((s): s is number => s !== null)

    if (scores.length >= 3) {
      const meio = Math.ceil(scores.length / 2)
      const primeira = scores.slice(0, meio).reduce((a, b) => a + b, 0) / meio
      const segunda  = scores.slice(-meio).reduce((a, b) => a + b, 0) / meio
      const delta = segunda - primeira
      tendencia = delta > 0.2 ? 'cresceu' : delta < -0.2 ? 'caiu' : 'estável'
    }
  }

  return { participacao, presencaMedia, focoRecente, tendencia, numAulas: amostra.length }
}

function calcDestaquesTurma(historico: RegistroPosAula[], planos: Plano[]): string[] {
  const amostra = historico
    .slice(0, 5)
    .filter(r => (r.statusAula ?? r.resultadoAula) !== 'nao_houve')

  if (amostra.length < 2) return []

  const destaques: string[] = []

  // ── Regra 1: Participação — últimas 2 aulas vs anteriores ───────────────────
  const crono = [...amostra].reverse()
  const scores = crono.map(r => {
    if ((r.chamada?.length ?? 0) > 0) {
      const ch = r.chamada!
      return ch.filter(c => c.presente).length / ch.length
    }
    return scoreStatus(r)
  }).filter((s): s is number => s !== null)

  if (scores.length >= 3) {
    const ultimas2    = scores.slice(-2)
    const anteriores  = scores.slice(0, -2)
    const mediaRecente   = ultimas2.reduce((a, b) => a + b, 0) / ultimas2.length
    const mediaAnterior  = anteriores.reduce((a, b) => a + b, 0) / anteriores.length
    const delta = mediaRecente - mediaAnterior
    if (delta < -0.2) destaques.push('Participação caiu nas últimas aulas')
    else if (delta > 0.2) destaques.push('Participação melhorou nas últimas aulas')
  }

  // ── Orff: pré-processamento ──────────────────────────────────────────────────
  const comOrff = amostra
    .map(reg => ({
      reg,
      orff: planos.find(p => p.registrosPosAula?.some(r => r.id === reg.id))?.orffMeios ?? null,
    }))
    .filter(({ orff }) => orff != null)

  if (comOrff.length >= 2) {
    const contagem: Record<string, number> = {}
    for (const { orff } of comOrff) {
      for (const [meio, ativo] of Object.entries(orff!)) {
        if (ativo) contagem[meio] = (contagem[meio] ?? 0) + 1
      }
    }

    const sorted = Object.entries(contagem).sort((a, b) => b[1] - a[1])
    const distintos = sorted.filter(([, n]) => n > 0).length

    // ── Regra 2: Baixa variedade — apenas 1 meio distinto usado ─────────────────
    if (distintos === 1 && destaques.length < 3) {
      destaques.push('Pouca variedade de atividades')
    }

    // ── Regra 3: Predomínio — 2+ meios usados, top ≥ 2× o segundo ───────────────
    if (distintos >= 2 && destaques.length < 3) {
      const [top, segundo] = sorted
      if (top[1] >= segundo[1] * 2) {
        destaques.push(`Predomínio de atividades de ${top[0]}`)
      }
    }
  }

  return destaques
}

// ─── CONTINUIDADE PEDAGÓGICA ──────────────────────────────────────────────────

interface Continuidade {
  data: string
  ondeParamos: string | null
  dificuldade: string | null
  sugestao: string | null
}

function calcContinuidade(historico: RegistroPosAula[]): Continuidade | null {
  const ultima = historico.find(r => (r.statusAula ?? r.resultadoAula) !== 'nao_houve')
  if (!ultima) return null

  const ondeParamos = ultima.resumoAula?.trim() || ultima.resumo?.trim() || null
  const dificuldade = ultima.fariadiferente?.trim() || ultima.naoFuncionou?.trim() || ultima.poderiaMelhorar?.trim() || null
  const sugestao    = ultima.proximaAula?.trim() || null

  if (!ondeParamos && !dificuldade && !sugestao) return null

  return {
    data: ultima.dataAula ?? ultima.data,
    ondeParamos,
    dificuldade,
    sugestao,
  }
}

// ─── ALUNOS EM DESTAQUE ───────────────────────────────────────────────────────

interface AlunoDestaqueResumo {
  nome: string
  label: string
  nivel: 'positivo' | 'negativo'
}

function calcAlunosDestaque(
  historico: RegistroPosAula[],
  alunos: AlunoDestaque[]
): AlunoDestaqueResumo[] {
  if (alunos.length < 2) return []

  // Usar até 10 aulas para ter dados mais estáveis por aluno
  const aulasChamada = historico
    .slice(0, 10)
    .filter(r => (r.chamada?.length ?? 0) > 0)

  if (aulasChamada.length < 2) return []

  // Agregar presença por alunoId
  const stats: Record<string, { presente: number; total: number }> = {}
  for (const reg of aulasChamada) {
    for (const c of reg.chamada!) {
      if (!stats[c.alunoId]) stats[c.alunoId] = { presente: 0, total: 0 }
      stats[c.alunoId].total++
      if (c.presente) stats[c.alunoId].presente++
    }
  }

  // Cruzar com lista de alunos da turma — só quem apareceu em ≥ 2 aulas
  const ranked = alunos
    .map(a => {
      const s = stats[a.id]
      if (!s || s.total < 2) return null
      return { nome: a.nome, pct: s.presente / s.total }
    })
    .filter((x): x is { nome: string; pct: number } => x !== null)
    .sort((a, b) => b.pct - a.pct)

  if (ranked.length < 2) return []

  const resultado: AlunoDestaqueResumo[] = []

  // Aluno com maior presença
  const melhor = ranked[0]
  if (melhor.pct >= 0.80) {
    resultado.push({ nome: melhor.nome, label: 'alta participação', nivel: 'positivo' })
  }

  // Aluno com menor presença (label varia pela gravidade)
  const pior = ranked[ranked.length - 1]
  if (pior.pct < 0.60) {
    const label = pior.pct < 0.40 ? 'faltas recorrentes' : 'baixa participação'
    resultado.push({ nome: pior.nome, label, nivel: 'negativo' })
  }

  return resultado
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

      {/* Timeline: barra única com todos os itens */}
      <div>
        <div key="__all__">
            {/* Dots row */}
            <div className="relative px-3">
              <div className="absolute top-[29px] left-5 right-5 h-0.5 bg-slate-100 rounded-full pointer-events-none" />
              <div className="relative flex items-start overflow-x-auto scrollbar-hide pb-1"
                style={{ gap: itensVisiveis.length > 6 ? '0' : undefined, justifyContent: itensVisiveis.length <= 8 ? 'space-between' : undefined }}>
                {itensVisiveis.map((item) => {
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

          {/* Data */}
          <span className="text-sm font-semibold text-slate-700">{formatarData(itemAtivo.dataStr)}</span>

          {/* Realizada ou Planejada: plano clicável */}
          {itemAtivo.planoTitulo && itemAtivo.planoId && (
            <button
              type="button"
              onClick={() => {
                const p = planos.find(p => String(p.id) === String(itemAtivo.planoId))
                if (p) setPlanoPreview(p)
              }}
              className="w-full flex items-center justify-between gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2.5 transition-colors group"
            >
              <span className="text-xs text-slate-700 font-medium truncate">{itemAtivo.planoTitulo}</span>
              <span className="text-[11px] font-semibold text-indigo-500 group-hover:text-indigo-700 shrink-0 transition-colors">Ver →</span>
            </button>
          )}

          {/* Sem plano: 3 ações */}
          {itemAtivo.status === 'sem-plano' && (
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
          )}

        </div>
      )}

      {/* Modal preview do plano */}
      {planoPreview && <ModalPreviewPlano plano={planoPreview} onFechar={() => setPlanoPreview(null)} turmaId={String(turmaSelecionada?.turmaId ?? '')} />}
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

function SeletorDiaTurma({ currentDate, setCurrentDate }: { currentDate: Date; setCurrentDate: (d: Date | ((prev: Date) => Date)) => void }) {
  const { selecionarTurma, turmaSelecionada, planejamentos } = usePlanejamentoTurmaContext()
  const { anosLetivos } = useAnoLetivoContext()
  const { obterTurmasDoDia } = useCalendarioContext()
  const { aplicacoesPorData } = useAplicacoesContext()
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

// ─── MODAL PREVIEW DO PLANO ───────────────────────────────────────────────────

function ModalPreviewPlano({ plano, onFechar, turmaId }: { plano: import('../types').Plano; onFechar: () => void; turmaId?: string }) {
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
              {turmaId && (() => {
                const nota = plano.notasAdaptacao?.find(n => String(n.turmaId) === String(turmaId))
                if (!nota) return null
                return (
                  <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-1.5">
                    <span className="font-semibold text-amber-700">Adaptação: </span>
                    <span className="text-amber-900 whitespace-pre-wrap leading-relaxed">{nota.texto}</span>
                  </div>
                )
              })()}
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

// ─── CARD DE PLANEJAMENTO (histórico salvo) ────────────────────────────────────

function CardPlanejamento({ planejamento }: { planejamento: import('../types').PlanejamentoTurma }) {
  const { excluirPlanejamento, buildDadosParaBanco } = usePlanejamentoTurmaContext()
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
            {!(planejamento.planosRelacionadosIds && planejamento.planosRelacionadosIds.length > 0) && (
                <button onClick={handlePromover} className="text-xs text-emerald-600 hover:text-emerald-800 font-medium border border-emerald-200 px-2 py-0.5 rounded-lg hover:bg-emerald-50 transition-colors">Promover para banco →</button>
            )}
            <button onClick={() => excluirPlanejamento(planejamento.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Excluir</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PLANEJAMENTOS SALVOS (somente leitura, colapsável) ───────────────────────

function PlanejamentosSalvos({ planejamentos }: { planejamentos: import('../types').PlanejamentoTurma[] }) {
  const [expandido, setExpandido] = useState(false)
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <button
        onClick={() => setExpandido(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <span>Planejamentos salvos ({planejamentos.length})</span>
        <span className="text-slate-400">{expandido ? '▲' : '▼'}</span>
      </button>
      {expandido && (
        <div className="px-4 pb-4 space-y-2">
          {planejamentos.map(p => <CardPlanejamento key={p.id} planejamento={p} />)}
        </div>
      )}
    </div>
  )
}

// ─── CONTEÚDO DA TURMA ────────────────────────────────────────────────────────

function ConteudoTurma({ calendarDateStr }: { calendarDateStr: string }) {
  const {
    turmaSelecionada,
    ultimoRegistroDaTurma,
    historicoDaTurma,
    planejamentosDaTurma,
    setDataNavegacao,
    setModoInicialNavegacao,
  } = usePlanejamentoTurmaContext()

  const { anosLetivos, alunosAddOrUpdate, alunosRemove, alunosGetByTurma, alunoAddAnotacao, alunoRemoveAnotacao, alunoAddMarco, alunoRemoveMarco, turmaGetTiposAnotacao, turmaAddTipoAnotacao, turmaRemoveTipoAnotacao, turmaSetObservacoes, turmaSetObjetivo } = useAnoLetivoContext() as ReturnType<typeof useAnoLetivoContext> & { turmaGetTiposAnotacao: (a: string, b: string, c: string, d: string) => string[]; turmaAddTipoAnotacao: (a: string, b: string, c: string, d: string, tipo: string) => void; turmaRemoveTipoAnotacao: (a: string, b: string, c: string, d: string, tipo: string) => void; turmaSetObservacoes: (a: string, b: string, c: string, d: string, texto: string) => void; turmaSetObjetivo: (a: string, b: string, c: string, d: string, texto: string) => void }
  const { planos, setPlanoSelecionado } = usePlanosContext()
  const { aplicacoes } = useAplicacoesContext()
  const { obterTurmasDoDia } = useCalendarioContext()
  const { setViewMode: setViewModeGlobal } = useRepertorioContext()
  const { estrategias } = useEstrategiasContext()
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
  const [dataAtiva, setDataAtiva] = useState<string | null>(null)
  const [aba, setAba] = useState<'turma' | 'aulas' | 'repertorio'>('aulas')
  const [editandoObs, setEditandoObs] = useState(false)
  const [obsRascunho, setObsRascunho] = useState('')
  const [editandoObj, setEditandoObj] = useState(false)
  const [objRascunho, setObjRascunho] = useState('')

  // Resetar seleção ao trocar de turma
  useEffect(() => { setDataAtiva(null) }, [turmaSelecionada?.turmaId])
  useEffect(() => { setAba('aulas') }, [turmaSelecionada?.turmaId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Planejamentos filtrados para a data atual (evita exibir plans de outros dias)
  const planejamentosDoDia = useMemo(
    () => planejamentosDaTurma.filter(p => !p.dataPrevista || p.dataPrevista === calendarDateStr),
    [planejamentosDaTurma, calendarDateStr]
  )

  // Plano do calendário lateral — fixo na data selecionada, não muda ao clicar na timeline
  const planoDoCalendario = useMemo(() => {
    if (!calendarDateStr || !turmaSelecionada) return null
    const ap = aplicacoes.find(a =>
      a.data === calendarDateStr &&
      String(a.turmaId) === String(turmaSelecionada.turmaId) &&
      String(a.segmentoId) === String(turmaSelecionada.segmentoId)
    )
    if (!ap?.planoId) return null
    return planos.find(p => String(p.id) === String(ap.planoId)) ?? null
  }, [calendarDateStr, turmaSelecionada, aplicacoes, planos])

  // Há aula na grade para a data do calendário (mesmo sem plano aplicado)?
  const temAulaNoDia = useMemo(() => {
    if (!calendarDateStr || !turmaSelecionada) return false
    return obterTurmasDoDia(calendarDateStr).some(a =>
      // eslint-disable-next-line eqeqeq
      a.turmaId == turmaSelecionada.turmaId && a.segmentoId == turmaSelecionada.segmentoId
    )
  }, [calendarDateStr, turmaSelecionada, obterTurmasDoDia])

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

  // Data da próxima aula real desta turma no calendário
  const proximaAulaData = useMemo(() => {
    if (!turmaSelecionada) return ''
    const hoje = new Date()
    for (let i = 1; i <= 90; i++) {
      const d = new Date(hoje)
      d.setDate(hoje.getDate() + i)
      const ds = toDateStr(d)
      const aulas = obterTurmasDoDia(ds)
      if (aulas.some(a =>
        // eslint-disable-next-line eqeqeq
        a.turmaId == turmaSelecionada.turmaId && a.segmentoId == turmaSelecionada.segmentoId
      )) return ds
    }
    return ''
  }, [turmaSelecionada, obterTurmasDoDia])

  // Objeto Turma completo da hierarquia (para observacoes/objetivo)
  const turmaData = useMemo((): Turma | null => {
    if (!turmaSelecionada) return null
    for (const ano of anosLetivos) {
      for (const escola of ano.escolas ?? []) {
        for (const seg of escola.segmentos ?? []) {
          // eslint-disable-next-line eqeqeq
          if (seg.id == turmaSelecionada.segmentoId) {
            // eslint-disable-next-line eqeqeq
            const t = (seg.turmas ?? []).find((t: Turma) => t.id == turmaSelecionada.turmaId)
            if (t) return t
          }
        }
      }
    }
    return null
  }, [turmaSelecionada, anosLetivos])

  // Chave de filtro para ModuloHistoricoMusical (formato turmaId-escolaId)
  const turmaKey = turmaSelecionada ? `${turmaSelecionada.turmaId}-${turmaSelecionada.escolaId}` : ''

  // Continuidade pedagógica — baseada na última aula registrada
  const continuidade = useMemo(
    () => calcContinuidade(historicoDaTurma),
    [historicoDaTurma]
  )

  // Resumo automático — calculado a partir das últimas 5 aulas
  const resumoTurma = useMemo(
    () => calcResumoTurma(historicoDaTurma, planos),
    [historicoDaTurma, planos]
  )

  // Destaques automáticos — até 3 insights das últimas aulas
  const destaquesTurma = useMemo(
    () => calcDestaquesTurma(historicoDaTurma, planos),
    [historicoDaTurma, planos]
  )

  // Alunos em destaque — alta/baixa presença por aluno
  const alunosDestaque = useMemo(
    () => calcAlunosDestaque(historicoDaTurma, turmaData?.alunos ?? []),
    [historicoDaTurma, turmaData]
  )

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
        for (const estNome of ativ.estrategiasVinculadas ?? []) {
          const est = estrategias.find(e => e.nome === estNome || String(e.id) === String(estNome))
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
  // Exclui o registro já exibido no topo para evitar duplicação
  const listaHistorico = registroExibido
    ? historicoDaTurma.filter(r => r !== registroExibido)
    : registrosAnteriores

  return (
    <div className="space-y-3">

      {/* ── ABAS ─────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {(['turma', 'aulas', 'repertorio'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setAba(t)}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-colors ${
              aba === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'turma' ? 'Turma' : t === 'aulas' ? 'Aulas' : 'Repertório'}
          </button>
        ))}
      </div>

      {/* ── ABA: TURMA ───────────────────────────────────────────────────────── */}
      {aba === 'turma' && (
        <div className="space-y-3">

          {/* ── PRINCIPAL: Sobre a turma ─────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold text-slate-600">Sobre a turma</h3>
              {!editandoObs && (
                <button type="button"
                  onClick={() => { setObsRascunho(turmaData?.observacoes ?? ''); setEditandoObs(true) }}
                  className="text-[11px] text-indigo-500 hover:text-indigo-700 font-semibold">
                  Editar
                </button>
              )}
            </div>
            {editandoObs ? (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  rows={4}
                  value={obsRascunho}
                  onChange={e => setObsRascunho(e.target.value)}
                  placeholder="Como é esta turma? Perfil, comportamento, o que funciona..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setEditandoObs(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1">Cancelar</button>
                  <button type="button"
                    onClick={() => {
                      const ts = turmaSelecionada!
                      turmaSetObservacoes(ts.anoLetivoId, ts.escolaId, ts.segmentoId, ts.turmaId, obsRascunho)
                      setEditandoObs(false)
                    }}
                    className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-lg">
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              turmaData?.observacoes
                ? <p className="text-[14px] text-slate-700 leading-relaxed whitespace-pre-wrap">{turmaData.observacoes}</p>
                : <p className="text-sm text-slate-400 italic">Nenhuma observação. Clique em Editar para adicionar.</p>
            )}
          </div>

          {/* ── SECUNDÁRIO: Objetivo da turma ────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Objetivo da turma</h3>
              {!editandoObj && (
                <button type="button"
                  onClick={() => { setObjRascunho(turmaData?.objetivo ?? ''); setEditandoObj(true) }}
                  className="text-[11px] text-indigo-500 hover:text-indigo-700 font-semibold">
                  Editar
                </button>
              )}
            </div>
            {editandoObj ? (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  rows={3}
                  value={objRascunho}
                  onChange={e => setObjRascunho(e.target.value)}
                  placeholder="O que você quer que esta turma conquiste musicalmente este período?"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setEditandoObj(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1">Cancelar</button>
                  <button type="button"
                    onClick={() => {
                      const ts = turmaSelecionada!
                      turmaSetObjetivo(ts.anoLetivoId, ts.escolaId, ts.segmentoId, ts.turmaId, objRascunho)
                      setEditandoObj(false)
                    }}
                    className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-lg">
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              turmaData?.objetivo
                ? <p className="text-sm text-slate-600 whitespace-pre-wrap">{turmaData.objetivo}</p>
                : <p className="text-sm text-slate-400 italic">Nenhum objetivo definido. Clique em Editar para adicionar.</p>
            )}
          </div>

          {/* ── TERCIÁRIO: resumo automático + placeholder ───────────────────── */}
          <div className="space-y-2">

            {/* Continuidade pedagógica — baseada na última aula */}
            {continuidade && (
              <div className="rounded-2xl border border-slate-200 px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Continuidade</h3>
                  <span className="text-[10px] text-slate-300">{continuidade.data}</span>
                </div>
                {continuidade.ondeParamos && (
                  <p className="text-[13px] text-slate-600 leading-snug">{continuidade.ondeParamos}</p>
                )}
                {continuidade.dificuldade && (
                  <p className="text-[12px] text-amber-700 leading-snug">
                    <span className="font-semibold mr-1">!</span>{continuidade.dificuldade}
                  </p>
                )}
                {continuidade.sugestao && (
                  <p className="text-[12px] text-indigo-600 leading-snug">
                    <span className="mr-1">→</span>{continuidade.sugestao}
                  </p>
                )}
              </div>
            )}

            {/* Resumo da turma — calculado das últimas aulas */}
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3">
              <h3 className="text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-2">Resumo da turma</h3>
              {resumoTurma.numAulas === 0 ? (
                <p className="text-xs text-slate-400 italic">Registre aulas para ver o resumo.</p>
              ) : (
                <div className="space-y-1">
                  {resumoTurma.presencaMedia != null && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] font-medium text-slate-400 w-24 shrink-0">Presença</span>
                      <span className={`text-xs font-semibold ${
                        resumoTurma.presencaMedia >= 0.80 ? 'text-emerald-600' :
                        resumoTurma.presencaMedia >= 0.55 ? 'text-amber-600'   : 'text-red-500'
                      }`}>{Math.round(resumoTurma.presencaMedia * 100)}%</span>
                    </div>
                  )}
                  {resumoTurma.participacao && resumoTurma.presencaMedia == null && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] font-medium text-slate-400 w-24 shrink-0">Participação</span>
                      <span className={`text-xs font-semibold ${
                        resumoTurma.participacao === 'alta'  ? 'text-emerald-600' :
                        resumoTurma.participacao === 'média' ? 'text-amber-600'   : 'text-red-500'
                      }`}>{resumoTurma.participacao}</span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] font-medium text-slate-400 w-24 shrink-0">Foco recente</span>
                    <span className="text-xs text-slate-600">{resumoTurma.focoRecente ?? '—'}</span>
                  </div>
                  {resumoTurma.tendencia && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] font-medium text-slate-400 w-24 shrink-0">Tendência</span>
                      <span className={`text-xs font-semibold ${
                        resumoTurma.tendencia === 'cresceu' ? 'text-emerald-600' :
                        resumoTurma.tendencia === 'caiu'    ? 'text-red-500'     : 'text-slate-500'
                      }`}>{resumoTurma.tendencia}</span>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-300 pt-1">
                    Baseado nas últimas {resumoTurma.numAulas} aula{resumoTurma.numAulas !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>

            {/* Destaques recentes */}
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3">
              <h3 className="text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-2">Destaques recentes</h3>
              {destaquesTurma.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Registre mais aulas para ver os destaques.</p>
              ) : (
                <ul className="space-y-1">
                  {destaquesTurma.map((d, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                      <span className="text-slate-300 shrink-0 mt-0.5">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Alunos em destaque — derivado da chamada */}
            {alunosDestaque.length > 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3">
                <h3 className="text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-2">Alunos em destaque</h3>
                <ul className="space-y-1">
                  {alunosDestaque.map((a, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs">
                      <span className="shrink-0">{a.nivel === 'positivo' ? '★' : a.label === 'faltas recorrentes' ? '↓' : '!'}</span>
                      <span className="font-medium text-slate-700">{a.nome}</span>
                      <span className={a.nivel === 'positivo' ? 'text-emerald-600' : 'text-red-500'}>{a.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>

          {/* ── ALUNOS ───────────────────────────────────────────────────────── */}
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
              setAlunosExpandidos(true)
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
                    Alunos
                    {flagged.length > 0 && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">
                        {flagged.length}
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

                    {alunos.length > 0 && (
                      <div className="space-y-2">
                        {[...flagged, ...others].map(al => {
                          const expandido = alunoCardExpandido === al.id
                          const ultimaAnotacao = al.anotacoes?.slice(-1)[0]
                          const totalAnotacoes = al.anotacoes?.length ?? 0
                          const totalMarcos = al.marcos?.length ?? 0
                          return (
                            <div key={al.id} className={`rounded-xl border overflow-hidden ${al.flag ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'}`}>
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

                              {expandido && (
                                <div className="border-t border-slate-200 px-3 pb-3 pt-2 space-y-3 bg-white">
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
                          Atenção especial
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

        </div>
      )}

      {/* ── ABA: AULAS ───────────────────────────────────────────────────────── */}
      {aba === 'aulas' && (
        <div className="space-y-3">

          {/* Progresso pedagógico (timeline interativa) */}
          <TimelinePedagogica
            onAcionar={() => {
              const data = proximaAulaData || calendarDateStr
              setDataNavegacao(new Date(data))
              setModoInicialNavegacao(null)
              setViewModeGlobal('porTurmas')
            }}
            dataAtiva={dataAtiva}
            setDataAtiva={setDataAtiva}
            turmaNome={turmaNome}
          />

          {/* ── Último registro / Registro selecionado — sempre visível ──── */}
          {registroExibido && (() => {
            const ts = turmaSelecionada!
            const allAlunos = alunosGetByTurma(ts.anoLetivoId, ts.escolaId, ts.segmentoId, ts.turmaId)
            const nomeAluno = (id: string) => allAlunos.find(a => a.id === id)?.nome ?? id
            const chamada = (registroExibido as any).chamada as { alunoId: string; presente: boolean }[] | undefined
            const presentes = chamada ? chamada.filter(c => c.presente).length : null
            const ausentes  = chamada ? chamada.filter(c => !c.presente) : []
            return (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-2">
                {/* Header do registro */}
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-slate-600">
                    {dataAtiva ? 'Registro selecionado' : 'Última aula'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{formatarData(registroExibido.dataAula ?? registroExibido.data ?? '')}</span>
                    {registroExibido.resultadoAula && (
                      <span className="text-[11px] font-semibold text-slate-500">{labelResultado(registroExibido.resultadoAula)}</span>
                    )}
                  </div>
                </div>
                {/* Conteúdo */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {registroExibido.resumoAula && (
                    <InfoRow icon="📋" label="O que foi realizado" valor={registroExibido.resumoAula} />
                  )}
                  {registroExibido.funcionouBem && (
                    <InfoRow icon="✅" label="O que funcionou bem" valor={registroExibido.funcionouBem} />
                  )}
                  {(registroExibido.fariadiferente || (registroExibido as any).naoFuncionou) && (
                    <InfoRow icon="⚠️" label="O que faria diferente" valor={registroExibido.fariadiferente || (registroExibido as any).naoFuncionou} />
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
                  {chamada && chamada.length > 0 && (
                    <div>
                      <InfoRow icon="✋" label="Chamada" valor={`${presentes}/${chamada.length} presentes`} />
                      {ausentes.length > 0 && (
                        <p className="text-[11px] text-slate-400 mt-0.5 ml-6 italic">
                          Ausentes: {ausentes.map(c => nomeAluno(c.alunoId)).join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* ── Registros anteriores — lista linear ──────────────────────── */}
          {listaHistorico.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-4 pt-3 pb-1">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Registros anteriores</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {listaHistorico.map((r, i) => {
                  const chamada = (r as any).chamada as { alunoId: string; presente: boolean }[] | undefined
                  const pres  = chamada ? chamada.filter(c => c.presente).length : null
                  const total = chamada ? chamada.length : null
                  return (
                    <div key={r.id ?? i} className="px-4 py-2.5 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-slate-500 shrink-0">{formatarData(r.dataAula ?? r.data ?? '')}</span>
                        {r.resumoAula && (
                          <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{r.resumoAula}</p>
                        )}
                      </div>
                      {pres !== null && total !== null && total > 0 && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${pres === total ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                          {pres}/{total}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="px-4 py-2.5 border-t border-slate-100">
                <button
                  onClick={() => setViewModeGlobal('posAulaHistorico')}
                  className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                >
                  Ver histórico completo →
                </button>
              </div>
            </div>
          )}

          {/* ── Estado vazio: sem aulas registradas ──────────────────────── */}
          {!registroExibido && listaHistorico.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-5 text-center">
              <p className="text-sm text-slate-500 font-medium">Nenhuma aula registrada ainda</p>
              <p className="text-xs text-slate-400 mt-1">Planeje a primeira aula e registre como foi.</p>
            </div>
          )}

          {/* ── CTA ──────────────────────────────────────────────────────── */}
          <button
            type="button"
            onClick={() => {
              const data = proximaAulaData || calendarDateStr
              setDataNavegacao(new Date(data))
              setModoInicialNavegacao(null)
              setViewModeGlobal('porTurmas')
            }}
            className="w-full flex items-center justify-between bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm px-5 py-3.5 rounded-2xl transition-colors"
          >
            <span>Planejar próxima aula{proximaAulaData ? ` · ${formatarData(proximaAulaData)}` : ''}</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

        </div>
      )}

      {/* ── ABA: REPERTÓRIO ──────────────────────────────────────────────────── */}
      {aba === 'repertorio' && turmaKey && (
        <ModuloHistoricoMusical ocultarSeletorTurma turmaForcada={turmaKey} />
      )}

    </div>
  )
}

// ─── MÓDULO PRINCIPAL ─────────────────────────────────────────────────────────

export default function ModuloPlanejamentoTurma() {
  const { turmaSelecionada } = usePlanejamentoTurmaContext()
  const [currentDate, setCurrentDate] = useState<Date>(() => nearestWeekday(new Date()))

  return (
    <div className="flex gap-4 items-start">
      {/* Painel lateral — seletor de dia + turma */}
      <SeletorDiaTurma currentDate={currentDate} setCurrentDate={setCurrentDate} />

      {/* Painel direito — conteúdo de planejamento */}
      <div className="flex-1 min-w-0 space-y-3">
        {!turmaSelecionada && <EstadoVazio />}
        {turmaSelecionada && <ConteudoTurma key={`${turmaSelecionada.turmaId}-${toDateStr(currentDate)}`} calendarDateStr={toDateStr(currentDate)} />}
      </div>
    </div>
  )
}
