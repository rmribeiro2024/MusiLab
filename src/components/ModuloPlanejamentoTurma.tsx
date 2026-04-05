// src/components/ModuloPlanejamentoTurma.tsx
// Módulo "Caderno da Turma" — visão pedagógica por turma.
// Bloco 1: Último Registro | Bloco 2: Próximo Passo Sugerido | CTA: Planejar

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { usePlanejamentoTurmaContext, type TurmaSelecionada } from '../contexts/PlanejamentoTurmaContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import { usePlanosContext } from '../contexts/PlanosContext'
import { useRepertorioContext } from '../contexts/RepertorioContext'
import { useCalendarioContext } from '../contexts/CalendarioContext'
import { stripHTML, gerarIdSeguro, sanitizar } from '../lib/utils'
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

function formatarDataComDia(dataStr: string): string {
  if (!dataStr) return '—'
  const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  const data = new Date(dataStr + 'T12:00:00')
  const [y, m, d] = dataStr.split('-')
  return `${d}/${m}/${y} (${dias[data.getDay()]})`
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

type PeriodoVivencias =
  | { tipo: 'tudo' }
  | { tipo: 'mes_atual' }
  | { tipo: 'mes'; mes: number; ano: number }
  | { tipo: 'range'; inicio: string; fim: string }

interface ItemRanking { label: string; count: number }

interface ResumoTurma {
  participacao: 'alta' | 'média' | 'baixa' | null
  presencaMedia: number | null
  vivencias: ItemRanking[]   // CLASP — ordenado por frequência, todos os 5 itens
  meios: ItemRanking[]       // Orff  — ordenado por frequência, todos os 4 itens
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

function calcResumoTurma(historico: RegistroPosAula[], planos: Plano[], periodo: PeriodoVivencias = { tipo: 'tudo' }): ResumoTurma {
  const ORFF_KEYS  = ['fala', 'canto', 'movimento', 'instrumental'] as const
  const CLASP_KEYS = ['performance', 'apreciacao', 'criacao', 'teoria', 'tecnica'] as const
  const ORFF_LABELS:  Record<string, string> = { fala: 'Fala', canto: 'Canto', movimento: 'Movimento', instrumental: 'Instrumental' }
  const CLASP_LABELS: Record<string, string> = { tecnica: 'Técnica', performance: 'Performance', apreciacao: 'Apreciação', criacao: 'Criação', teoria: 'Teoria' }

  // ── Filtrar por período ─────────────────────────────────────────────────────
  let base = historico.filter(r => (r.statusAula ?? r.resultadoAula) !== 'nao_houve')
  if (periodo.tipo === 'mes_atual') {
    const hoje = new Date()
    const anoMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
    base = base.filter(r => (r.dataAula ?? r.data ?? '').startsWith(anoMes))
  } else if (periodo.tipo === 'mes') {
    const anoMes = `${periodo.ano}-${String(periodo.mes + 1).padStart(2, '0')}`
    base = base.filter(r => (r.dataAula ?? r.data ?? '').startsWith(anoMes))
  } else if (periodo.tipo === 'range') {
    base = base.filter(r => {
      const d = r.dataAula ?? r.data ?? ''
      return d >= periodo.inicio && d <= periodo.fim
    })
  }
  // 'tudo' não filtra
  const amostra = base

  if (amostra.length === 0) {
    return { participacao: null, presencaMedia: null, vivencias: [], meios: [], tendencia: null, numAulas: 0 }
  }

  // ── 1. PARTICIPAÇÃO ─────────────────────────────────────────────────────────
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
    const scores = amostra.map(scoreStatus).filter((s): s is number => s !== null)
    if (scores.length > 0) {
      const media = scores.reduce((a, b) => a + b, 0) / scores.length
      participacao = media >= 0.75 ? 'alta' : media >= 0.45 ? 'média' : 'baixa'
    }
  }

  // ── 2. VIVÊNCIAS (CLASP) e MEIOS (Orff) — separados ─────────────────────────
  const contagemViv:  Record<string, number> = {}
  const contagemMeio: Record<string, number> = {}

  for (const reg of amostra) {
    const plano = planos.find(p => p.registrosPosAula?.some(r => r.id === reg.id))
    if (!plano) continue
    if (plano.vivenciasClassificadas) {
      for (const [dim, val] of Object.entries(plano.vivenciasClassificadas)) {
        if (val > 0) {
          const label = CLASP_LABELS[dim] ?? dim
          contagemViv[label] = (contagemViv[label] ?? 0) + val
        }
      }
    }
    if (plano.orffMeios) {
      for (const [meio, ativo] of Object.entries(plano.orffMeios)) {
        if (ativo) {
          const label = ORFF_LABELS[meio] ?? meio
          contagemMeio[label] = (contagemMeio[label] ?? 0) + 1
        }
      }
    }
  }

  // Lista completa ordenada por frequência (inclui zeros para mostrar lacunas)
  const vivencias: ItemRanking[] = CLASP_KEYS
    .map(k => ({ label: CLASP_LABELS[k], count: contagemViv[CLASP_LABELS[k]] ?? 0 }))
    .sort((a, b) => b.count - a.count)

  const meios: ItemRanking[] = ORFF_KEYS
    .map(k => ({ label: ORFF_LABELS[k], count: contagemMeio[ORFF_LABELS[k]] ?? 0 }))
    .sort((a, b) => b.count - a.count)

  // ── 3. TENDÊNCIA ────────────────────────────────────────────────────────────
  let tendencia: 'cresceu' | 'estável' | 'caiu' | null = null
  if (amostra.length >= 3) {
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

  return { participacao, presencaMedia, vivencias, meios, tendencia, numAulas: amostra.length }
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
const MESES_FULL    = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function stripHtml(html?: string): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const ORFF_LABELS_TL:  Record<string, string> = { fala: 'Fala', canto: 'Canto', movimento: 'Movimento', instrumental: 'Instrumental' }
const CLASP_LABELS_TL: Record<string, string> = { tecnica: 'Técnica', performance: 'Performance', apreciacao: 'Apreciação', criacao: 'Criação', teoria: 'Teoria' }

interface TLItem {
  dataStr: string
  status: 'realizada' | 'planejada' | 'sem-plano' | 'cancelada'
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
  const hojeStr = useMemo(() => toDateStr(new Date()), [])

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    const obs = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

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

    const hoje = new Date()

    const fromAps: TLItem[] = apsDaTurma.map(ap => {
      const plano = planos.find(p => String(p.id) === String(ap.planoId))
      // Sequência pedagógica → fallback para tema do plano
      const seq = ap.planoId != null
        ? sequencias.find(s => s.slots.some(sl => sl.planoVinculado != null && String(sl.planoVinculado) === String(ap.planoId)))
        : undefined
      const sequenciaTitulo = seq?.titulo ?? plano?.tema ?? undefined
      const status: TLItem['status'] =
        ap.status === 'realizada'  ? 'realizada'  :
        ap.status === 'cancelada'  ? 'cancelada'  : 'planejada'
      return {
        dataStr: ap.data,
        status,
        planoId: ap.planoId,
        planoTitulo: plano?.titulo,
        aplicacaoId: ap.id,
        sequenciaTitulo,
      }
    })

    return fromAps.sort((a, b) => a.dataStr.localeCompare(b.dataStr))
  }, [turmaSelecionada, aplicacoes, planos, obterTurmasDoDia])

  // Agrupar por mês para o filmstrip — fevereiro a dezembro
  const SLOTS_MIN = 4  // mínimo de cards por mês (preenche com placeholders)
  const mesGrupos = useMemo(() => {
    const map = new Map<string, TLItem[]>()
    for (const item of todosItens) {
      const key = item.dataStr.slice(0, 7)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    const ano = todosItens.length > 0
      ? parseInt(todosItens[0].dataStr.slice(0, 4))
      : new Date().getFullYear()
    const result: { mes: string; items: TLItem[] }[] = []
    for (let m = 2; m <= 12; m++) {
      const key = `${ano}-${String(m).padStart(2, '0')}`
      const items = map.get(key) ?? []
      if (items.length > 0) result.push({ mes: key, items })
    }
    return result
  }, [todosItens])

  // Painel flutuante — dados do card clicado
  const [painelData, setPainelData] = useState<{
    item: TLItem
    plano: import('../types').Plano | null
    registro: RegistroPosAula | null
    vivencias: string[]
  } | null>(null)
  const [planoPreview, setPlanoPreview] = useState<import('../types').Plano | null>(null)
  const [objAberto, setObjAberto] = useState(false)
  const [ativsAbertas, setAtivsAbertas] = useState<Set<number>>(new Set())
  useEffect(() => { setObjAberto(false); setAtivsAbertas(new Set()) }, [painelData])

  const contadores = useMemo(() => ({
    realizadas:  todosItens.filter(i => i.status === 'realizada').length,
    canceladas:  todosItens.filter(i => i.status === 'cancelada').length,
    planejadas:  todosItens.filter(i => i.status === 'planejada').length,
    semPlano:    todosItens.filter(i => i.status === 'sem-plano').length,
  }), [todosItens])

  function abrirPainel(item: TLItem) {
    if (item.status === 'sem-plano') {
      setDataAtiva(item.dataStr)
      return
    }
    const plano = item.planoId != null ? planos.find(p => String(p.id) === String(item.planoId)) ?? null : null
    const registro = plano
      ? plano.registrosPosAula.find(r => {
          const d = r.dataAula || r.data
          return d === item.dataStr && String(r.turma ?? '') === String(turmaSelecionada?.turmaId ?? '')
        }) ?? null
      : null
    const vivencias: string[] = []
    if (plano?.orffMeios) {
      for (const [meio, ativo] of Object.entries(plano.orffMeios)) {
        if (ativo) vivencias.push(ORFF_LABELS_TL[meio] ?? meio)
      }
    }
    if (plano?.vivenciasClassificadas) {
      for (const [dim, val] of Object.entries(plano.vivenciasClassificadas)) {
        const label = CLASP_LABELS_TL[dim] ?? dim
        if (val > 0 && !vivencias.includes(label)) vivencias.push(label)
      }
    }
    setPainelData({ item, plano, registro, vivencias })
  }

  const itemSemPlanoAtivo = dataAtiva ? todosItens.find(i => i.dataStr === dataAtiva && i.status === 'sem-plano') ?? null : null

  if (!turmaSelecionada || todosItens.length === 0) return null


  return (
    <div style={{ background: isDark ? '#1F2937' : '#fff', borderRadius: 20, border: `1px solid ${isDark ? '#374151' : '#e4e4e7'}`, boxShadow: '0 1px 3px rgba(0,0,0,.06),0 4px 12px rgba(0,0,0,.04)', overflow: 'hidden' }}>
      <style>{`@keyframes crescer-tl{from{opacity:0;transform:scale(.88) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>


      {/* Filmstrip */}
      {(() => {
        const bg = isDark ? '#1F2937' : '#fafafa'
        const cardBg = isDark ? '#111827' : '#ffffff'
        const cardBorder = isDark ? '#374151' : '#d1d5db'
        const sepBorder = isDark ? '#374151' : '#d4d4d8'
        const labelColor = isDark ? '#9CA3AF' : '#64748b'
        const numColor = isDark ? '#E5E7EB' : '#0f172a'
        const titleColor = isDark ? '#D1D5DB' : '#334155'
        const phBorder = isDark ? '#2D3748' : '#eaecef'
        const phBg = isDark ? '#1a2130' : '#f3f5f8'
        return (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', padding: '8px 12px', gap: 12 }}>
              {mesGrupos.map(({ mes, items }, mesI) => {
                const mesIdx = parseInt(mes.split('-')[1]) - 1
                const mesNome = MESES_FULL[mesIdx]
                const isAgora = mes === hojeStr.slice(0, 7)
                const isUltimoMes = mesI === mesGrupos.length - 1
                return (
                  <div key={mes} style={{ flexShrink: 0, width: 230, scrollSnapAlign: 'start', background: bg, borderRadius: 12, padding: '8px 10px', borderRight: isUltimoMes ? 'none' : `1px solid ${sepBorder}`, paddingRight: isUltimoMes ? 10 : 22 }}>
                    {/* Month label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: labelColor, textTransform: 'uppercase' as const, letterSpacing: '.04em' }}>{mesNome}</span>
                      {isAgora && (
                        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.5px', background: isDark ? '#4B5563' : '#334155', color: '#fff', padding: '1.5px 6px', borderRadius: 99 }}>AGORA</span>
                      )}
                    </div>

                    {/* 2-col grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                      {items.map(item => {
                        const dd = item.dataStr.split('-')[2]

                        if (item.status === 'sem-plano') {
                          const isAtivo = dataAtiva === item.dataStr
                          return (
                            <button key={item.dataStr} type="button" data-date={item.dataStr}
                              onClick={() => setDataAtiva(isAtivo ? null : item.dataStr)}
                              style={{ borderRadius: 9, border: isAtivo ? '2px solid #5B5FEA' : `1px solid ${cardBorder}`, background: cardBg, minHeight: 62, padding: '7px 8px', display: 'flex', flexDirection: 'column', gap: 2, cursor: 'pointer', textAlign: 'left' }}>
                              <span style={{ fontSize: 14, fontWeight: 800, color: '#6B7280', lineHeight: 1 }}>{dd}</span>
                            </button>
                          )
                        }

                        if (item.status === 'cancelada') {
                          return (
                            <div key={item.dataStr} style={{ borderRadius: 9, border: `1px solid ${cardBorder}`, background: cardBg, minHeight: 62, padding: '7px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: 14, fontWeight: 800, color: '#6B7280', lineHeight: 1, textDecoration: 'line-through' }}>{dd}</span>
                              {item.planoTitulo && (
                                <span style={{ fontSize: 9.5, color: '#6B7280', lineHeight: 1.3, marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{item.planoTitulo.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</span>
                              )}
                              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: '#6B7280', marginTop: 'auto', paddingTop: 4 }}>Cancelada</span>
                            </div>
                          )
                        }

                        // realizada | planejada — clicável
                        return (
                          <button key={item.dataStr} type="button" data-date={item.dataStr}
                            onClick={() => abrirPainel(item)}
                            style={{ borderRadius: 9, border: `1px solid ${cardBorder}`, background: cardBg, minHeight: 62, padding: '7px 8px', display: 'flex', flexDirection: 'column', gap: 2, cursor: 'pointer', textAlign: 'left' }}
                            onMouseEnter={e => { e.currentTarget.style.boxShadow = isDark ? '0 2px 8px rgba(0,0,0,.4)' : '0 2px 8px rgba(0,0,0,.09)'; e.currentTarget.style.borderColor = isDark ? '#6B7280' : '#94a3b8' }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = cardBorder }}
                          >
                            <span style={{ fontSize: 14, fontWeight: 800, color: numColor, lineHeight: 1 }}>{dd}</span>
                            {item.planoTitulo && (
                              <span style={{ fontSize: 9.5, fontWeight: 500, color: titleColor, lineHeight: 1.3, marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{item.planoTitulo.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</span>
                            )}
                          </button>
                        )
                      })}
                      {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, pi) => (
                        <div key={`ph-${pi}`} style={{ borderRadius: 9, border: `1px solid ${phBorder}`, background: phBg, minHeight: 62 }} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}


      {/* Sem-plano: ações inline abaixo do filmstrip */}
      {itemSemPlanoAtivo && (() => {
        const [, mm, dd] = itemSemPlanoAtivo.dataStr.split('-')
        return (
          <div style={{ padding: '12px 18px 16px', borderTop: `1px solid ${isDark ? '#374151' : '#f1f5f9'}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginBottom: 10 }}>
              Aula de {dd}/{mm} — sem plano
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button type="button" onClick={() => onAcionar('adaptar')}
                style={{ width: '100%', textAlign: 'left', fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 8, background: isDark ? 'rgba(59,130,246,.15)' : '#eff6ff', color: isDark ? '#93c5fd' : '#1d4ed8', border: `1px solid ${isDark ? 'rgba(59,130,246,.3)' : '#dbeafe'}`, cursor: 'pointer' }}>
                Adaptar última aula
              </button>
              <button type="button" onClick={() => onAcionar('importar')}
                style={{ width: '100%', textAlign: 'left', fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 8, background: isDark ? '#111827' : '#fff', color: isDark ? '#D1D5DB' : '#475569', border: `1px solid ${isDark ? '#374151' : '#e2e8f0'}`, cursor: 'pointer' }}>
                Importar do banco
              </button>
              <button type="button" onClick={() => onAcionar('criar')}
                style={{ width: '100%', textAlign: 'left', fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 8, background: isDark ? '#111827' : '#fff', color: isDark ? '#D1D5DB' : '#475569', border: `1px solid ${isDark ? '#374151' : '#e2e8f0'}`, cursor: 'pointer' }}>
                Criar nova aula
              </button>
            </div>
          </div>
        )
      })()}

      {/* Modal preview plano completo */}
      {planoPreview && <ModalPreviewPlano plano={planoPreview} onFechar={() => setPlanoPreview(null)} turmaId={String(turmaSelecionada?.turmaId ?? '')} />}

      {/* Painel flutuante (card cresce) */}
      {painelData && (
        <div
          onClick={() => setPainelData(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.35)', backdropFilter: 'blur(1px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: isDark ? '#1F2937' : '#fff', borderRadius: 18, boxShadow: isDark ? '0 8px 40px rgba(0,0,0,.5)' : '0 8px 40px rgba(0,0,0,.18)', width: '100%', maxWidth: 360, overflow: 'hidden', animation: 'crescer-tl .2s cubic-bezier(.34,1.56,.64,1)', transformOrigin: 'center bottom' }}>

            {/* Painel header */}
            <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${isDark ? '#374151' : '#e2e8f0'}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 900, color: isDark ? '#F9FAFB' : '#0f172a', lineHeight: 1, letterSpacing: -1 }}>{painelData.item.dataStr.split('-')[2]}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#F9FAFB' : '#0f172a', marginTop: 3 }}>{painelData.plano?.titulo ?? '—'}</div>
                <div style={{ fontSize: 10.5, color: '#9CA3AF', marginTop: 2 }}>
                  {MESES_FULL[parseInt(painelData.item.dataStr.split('-')[1]) - 1]} · {painelData.item.status === 'realizada' ? 'Realizada' : 'Planejada'}
                </div>
              </div>
              <button type="button" onClick={() => setPainelData(null)} style={{ width: 28, height: 28, borderRadius: '50%', background: isDark ? '#374151' : '#f1f5f9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: isDark ? '#9CA3AF' : '#64748b', flexShrink: 0 }}>
                ✕
              </button>
            </div>

            {/* Objetivo da aula */}
            {(painelData.plano?.objetivoGeral || painelData.plano?.tema) && (
              <div
                onClick={e => { e.stopPropagation(); setObjAberto(v => !v) }}
                style={{ padding: '11px 16px 10px', borderBottom: `1px solid ${isDark ? '#374151' : '#e2e8f0'}`, cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                  <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: '#9CA3AF' }}>Objetivo da aula</div>
                  <span style={{ fontSize: 10, color: '#9CA3AF', flexShrink: 0, marginTop: 1, transition: 'transform .2s', transform: objAberto ? 'rotate(180deg)' : 'none' }}>▾</span>
                </div>
                <div style={objAberto ? { fontSize: 12, color: isDark ? '#D1D5DB' : '#334155', lineHeight: 1.6 } : { fontSize: 12, color: isDark ? '#D1D5DB' : '#334155', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                  {stripHtml(painelData.plano!.objetivoGeral || painelData.plano!.tema)}
                </div>
              </div>
            )}

            {/* Atividades */}
            {(painelData.plano?.atividadesRoteiro?.length ?? 0) > 0 && (
              <div style={{ padding: '10px 16px 8px', borderBottom: `1px solid ${isDark ? '#374151' : '#e2e8f0'}` }}>
                <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: '#9CA3AF', marginBottom: 6 }}>Atividades</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {painelData.plano!.atividadesRoteiro.map((atv, i) => {
                    const aberta = ativsAbertas.has(i)
                    const temDesc = !!atv.descricao
                    const rowBorder = isDark ? '#374151' : '#f8fafc'
                    return (
                      <React.Fragment key={i}>
                        <div
                          onClick={temDesc ? e => { e.stopPropagation(); setAtivsAbertas(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s }) } : undefined}
                          style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '5px 0', borderBottom: `1px solid ${rowBorder}`, cursor: temDesc ? 'pointer' : 'default' }}
                        >
                          <span style={{ fontSize: 12, color: isDark ? '#E5E7EB' : '#0f172a', flex: 1, fontWeight: 500 }}>{atv.nome}</span>
                          {atv.duracao && <span style={{ fontSize: 10, color: '#9CA3AF', flexShrink: 0 }}>{atv.duracao} min</span>}
                          {temDesc && <span style={{ fontSize: 10, color: '#9CA3AF', flexShrink: 0, transition: 'transform .2s', display: 'inline-block', transform: aberta ? 'rotate(180deg)' : 'none' }}>▾</span>}
                        </div>
                        {aberta && atv.descricao && (
                          <div style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#64748b', lineHeight: 1.5, padding: '4px 0 6px', borderBottom: `1px solid ${rowBorder}`, whiteSpace: 'pre-line' }}>
                            {stripHtml(atv.descricao)}
                          </div>
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Avaliação — só mostra se tiver algum campo preenchido */}
            {(() => {
              const reg = painelData.registro
              const resumo = stripHtml(reg?.resumoAula)
              const funcionouBem = stripHtml(reg?.funcionouBem)
              const fariadiferente = stripHtml(reg?.fariadiferente)
              if (!resumo && !funcionouBem && !fariadiferente) return null
              const textColor = isDark ? '#D1D5DB' : '#334155'
              return (
                <>
                  <div style={{ margin: '0 16px' }}><div style={{ borderTop: `1px solid ${isDark ? '#374151' : '#e2e8f0'}` }} /></div>
                  <div style={{ padding: '10px 16px 14px' }}>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: '#9CA3AF' }}>Avaliacao</div>
                    </div>
                    {resumo && <div style={{ fontSize: 12, color: textColor, lineHeight: 1.65 }}>{resumo}</div>}
                    {funcionouBem && (
                      <>
                        <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' as const, color: '#9CA3AF', marginTop: 10, marginBottom: 4 }}>O que funcionou bem</div>
                        <div style={{ fontSize: 12, color: textColor, lineHeight: 1.65 }}>{funcionouBem}</div>
                      </>
                    )}
                    {fariadiferente && (
                      <>
                        <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' as const, color: '#9CA3AF', marginTop: 10, marginBottom: 4 }}>O que faria diferente</div>
                        <div style={{ fontSize: 12, color: textColor, lineHeight: 1.65 }}>{fariadiferente}</div>
                      </>
                    )}
                  </div>
                </>
              )
            })()}

          </div>
        </div>
      )}
    </div>
  )
}

// ─── LISTA DE TURMAS (painel lateral vertical) ───────────────────────────────

const ESCOLA_COLORS_MPT: { light: string; dark: string }[] = [
  { light: '#7c83d4', dark: '#bfc3f5' },
  { light: '#3b8fc2', dark: '#9dd5f0' },
  { light: '#2a9c70', dark: '#8edbbf' },
  { light: '#b8860e', dark: '#e6be6a' },
  { light: '#c0527a', dark: '#f0a8c3' },
  { light: '#7a5bbf', dark: '#c8b4f0' },
  { light: '#c94040', dark: '#f0a8a8' },
  { light: '#1a9090', dark: '#7dd8d8' },
]

function buildEscolaColorMapMPT(anosLetivos: AnoLetivo[]): Record<string, { light: string; dark: string }> {
  const map: Record<string, { light: string; dark: string }> = {}
  let idx = 0
  for (const ano of anosLetivos) {
    for (const esc of (ano.escolas ?? [])) {
      const key = String(esc.id)
      if (!map[key]) { map[key] = ESCOLA_COLORS_MPT[idx % ESCOLA_COLORS_MPT.length]; idx++ }
    }
  }
  return map
}

function tempoRelativo(ymd: string): string {
  if (!ymd) return ''
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const data = new Date(ymd + 'T12:00:00')
  const diff = Math.round((hoje.getTime() - data.getTime()) / 86400000)
  if (diff <= 0) return 'hoje'
  if (diff === 1) return 'ontem'
  if (diff < 7) return `${diff} dias`
  if (diff < 14) return '1 sem'
  if (diff < 21) return '2 sem'
  if (diff < 60) return `${Math.floor(diff / 7)} sem`
  return `${Math.floor(diff / 30)} mes`
}

function ListaTurmasMPT({ turmaSelecionada, onSelecionarTurma }: {
  turmaSelecionada: TurmaSelecionada | null
  onSelecionarTurma: (t: TurmaSelecionada) => void
}) {
  const { anosLetivos } = useAnoLetivoContext()
  const { planos } = usePlanosContext()
  const { aplicacoes } = useAplicacoesContext()
  const { obterTurmasDoDia } = useCalendarioContext()
  const [busca, setBusca] = useState('')
  const escolaColorMap = useMemo(() => buildEscolaColorMapMPT(anosLetivos), [anosLetivos])

  // Accordion: quais escolas estão abertas. Se há turma pré-selecionada, abre só ela.
  const [openEscolas, setOpenEscolas] = useState<Set<string>>(
    () => turmaSelecionada ? new Set([turmaSelecionada.escolaId]) : new Set()
  )
  // Sincroniza quando a turma selecionada muda (ex: navegação da Visão da Semana)
  useEffect(() => {
    if (turmaSelecionada) {
      setOpenEscolas(prev => {
        if (prev.has(turmaSelecionada.escolaId)) return prev
        return new Set([turmaSelecionada.escolaId])
      })
    }
  }, [turmaSelecionada?.escolaId])

  const hojeStr = useMemo(() => toDateStr(new Date()), [])

  // Turmas que têm aula hoje ou amanhã (para priorizar no topo)
  const turmasComAulaHoje = useMemo(() => {
    const set = new Set<string>()
    const amanha = new Date(); amanha.setDate(amanha.getDate() + 1)
    const amanhaStr = toDateStr(amanha)
    for (const ds of [hojeStr, amanhaStr]) {
      for (const a of obterTurmasDoDia(ds)) set.add(String(a.turmaId))
    }
    return set
  }, [hojeStr, obterTurmasDoDia])

  // Dot semântico por turmaId: o que o professor precisa FAZER agora
  // amber = PLANEJAR (aula iminente sem plano)
  // blue  = REGISTRAR (última aula sem registro)
  // green = OK
  // gray  = sem aula agendada nos próximos dias
  const turmaInfo = useMemo(() => {
    const map: Record<string, { dot: 'green' | 'amber' | 'blue' | 'gray'; ultimaData: string | null }> = {}

    // Última data de registro por turma
    const ultimoReg: Record<string, { data: string; temConteudo: boolean }> = {}
    for (const plano of planos) {
      for (const reg of (plano.registrosPosAula ?? [])) {
        const tid = String(reg.turma ?? '')
        if (!tid) continue
        const data = reg.dataAula ?? reg.data ?? ''
        if (!data) continue
        const prev = ultimoReg[tid]
        if (!prev || data > prev.data) {
          const temConteudo = !!(reg.resumoAula || reg.resumo || reg.funcionouBem || reg.fariadiferente)
          ultimoReg[tid] = { data, temConteudo }
        }
      }
    }

    // Aplicações (planos agendados) nos próximos 7 dias por turma
    const temPlanoIminente = new Set<string>()
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    for (const ap of aplicacoes) {
      if (ap.status === 'cancelada') continue
      const apData = new Date(ap.data + 'T12:00:00')
      const diff = Math.round((apData.getTime() - hoje.getTime()) / 86400000)
      if (diff >= 0 && diff <= 7) temPlanoIminente.add(String(ap.turmaId))
    }

    // Computa dot para cada turma que tem aula hoje/amanhã
    for (const turmaId of turmasComAulaHoje) {
      const reg = ultimoReg[turmaId]
      const temPlano = temPlanoIminente.has(turmaId)
      if (!temPlano) {
        map[turmaId] = { dot: 'amber', ultimaData: reg?.data ?? null }
      } else if (reg && !reg.temConteudo) {
        map[turmaId] = { dot: 'blue', ultimaData: reg.data }
      } else {
        map[turmaId] = { dot: 'green', ultimaData: reg?.data ?? null }
      }
    }

    // Turmas sem aula iminente: apenas última data para referência
    for (const [tid, reg] of Object.entries(ultimoReg)) {
      if (!map[tid]) map[tid] = { dot: 'gray', ultimaData: reg.data }
    }

    return map
  }, [planos, aplicacoes, turmasComAulaHoje])

  // Grupos: escola → turmas
  type TurmaItem = { key: string; nome: string; anoLetivoId: string; escolaId: string; segmentoId: string; turmaId: string }
  type Grupo = { escolaId: string; escolaNome: string; turmas: TurmaItem[] }
  const grupos = useMemo<Grupo[]>(() => {
    const result: Grupo[] = []
    for (const ano of anosLetivos) {
      for (const esc of (ano.escolas ?? [])) {
        const turmas: TurmaItem[] = []
        for (const seg of (esc.segmentos ?? [])) {
          for (const tur of (seg.turmas ?? [])) {
            turmas.push({
              key: `${ano.id}-${esc.id}-${seg.id}-${tur.id}`,
              nome: [seg.nome, tur.nome].filter(Boolean).join(' › '),
              anoLetivoId: String(ano.id),
              escolaId: String(esc.id),
              segmentoId: String(seg.id),
              turmaId: String(tur.id),
            })
          }
        }
        if (turmas.length > 0) result.push({ escolaId: String(esc.id), escolaNome: esc.nome ?? '', turmas })
      }
    }
    return result
  }, [anosLetivos])

  const buscaNorm = busca.trim().toLowerCase()
  const gruposFiltrados = buscaNorm
    ? grupos.map(g => ({
        ...g,
        turmas: g.turmas.filter(t =>
          t.nome.toLowerCase().includes(buscaNorm) ||
          g.escolaNome.toLowerCase().includes(buscaNorm)
        ),
      })).filter(g => g.turmas.length > 0)
    : grupos

  const DOT_COLORS = {
    green: 'bg-emerald-400',
    amber: 'bg-amber-400',
    blue:  'bg-blue-400',
    gray:  'bg-slate-300 dark:bg-[#4B5563]',
  }

  const DOT_LABELS = {
    amber: 'Planejar',
    blue:  'Registrar',
    green: '',
    gray:  '',
  }

  // Ordena: turmas com dot amber/blue (ação necessária) primeiro, depois restantes
  const gruposFiltradosOrdenados = useMemo(() => {
    return gruposFiltrados.map(g => ({
      ...g,
      turmas: [...g.turmas].sort((a, b) => {
        const prioA = turmasComAulaHoje.has(a.turmaId) ? 0 : 1
        const prioB = turmasComAulaHoje.has(b.turmaId) ? 0 : 1
        return prioA - prioB
      }),
    }))
  }, [gruposFiltrados, turmasComAulaHoje])

  const DOT_BG: Record<string, string> = {
    green: '#34d399',
    amber: '#fbbf24',
    blue:  '#60a5fa',
    gray:  '#9CA3AF',
  }

  // Iniciais para o avatar: pega última parte do nome (após ›) e extrai 2 chars alfanuméricos
  function initiais(nome: string): string {
    const parte = nome.includes('›') ? nome.split('›').pop()! : nome
    const chars = parte.replace(/[^a-zA-Z0-9]/g, '')
    return chars.slice(0, 2).toUpperCase() || '??'
  }

  const totalTurmas = gruposFiltradosOrdenados.reduce((acc, g) => acc + g.turmas.length, 0)

  return (
    <aside className="w-52 flex-shrink-0 flex flex-col overflow-hidden bg-white dark:bg-[#111827] border-r border-[#E6EAF0] dark:border-[#374151]" style={{ maxHeight: 'calc(100vh - 160px)' }}>
      {/* Busca + contagem */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#E6EAF0] dark:border-[#374151]">
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar turma..."
          className="flex-1 text-[12px] rounded-[7px] border border-[#E6EAF0] dark:border-[#374151] bg-[#F6F8FB] dark:bg-[#0F172A] text-slate-700 dark:text-[#D1D5DB] placeholder:text-slate-400 dark:placeholder:text-[#6B7280] px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <span className="text-[11px] text-slate-400 dark:text-[#6B7280] font-medium flex-shrink-0">{totalTurmas}</span>
      </div>

      {/* Lista agrupada */}
      <div className="flex-1 overflow-y-auto">
        {gruposFiltradosOrdenados.length === 0 ? (
          <div className="px-3 py-6 text-center text-[11px] text-slate-400 dark:text-[#6B7280]">
            Nenhuma turma encontrada
          </div>
        ) : gruposFiltradosOrdenados.map(grupo => {
          const cor = escolaColorMap[grupo.escolaId]
          const estaAberta = busca.trim() ? true : openEscolas.has(grupo.escolaId)
          return (
            <div key={grupo.escolaId}>
              {/* Label escola — clicável para colapsar */}
              <button
                type="button"
                onClick={() => setOpenEscolas(prev => {
                  const next = new Set(prev)
                  if (next.has(grupo.escolaId)) next.delete(grupo.escolaId)
                  else next.add(grupo.escolaId)
                  return next
                })}
                className="w-full flex items-center justify-between px-3 pt-3 pb-1"
              >
                <span className="text-[10px] font-bold uppercase tracking-[.06em]" style={{ color: cor?.light ?? '#C0C8D6' }}>
                  {grupo.escolaNome}
                </span>
                <span className="text-[10px]" style={{ color: cor?.light ?? '#C0C8D6', opacity: 0.7 }}>
                  {estaAberta ? '▾' : '▸'}
                </span>
              </button>

              {estaAberta && grupo.turmas.map(t => {
                const isAtiva = turmaSelecionada
                  ? turmaSelecionada.turmaId === t.turmaId && turmaSelecionada.escolaId === t.escolaId
                  : false
                const info = turmaInfo[t.turmaId]
                const dot = info?.dot ?? 'gray'
                const label = DOT_LABELS[dot]

                const turmaNome = t.nome.includes('›') ? t.nome.split('›').pop()!.trim() : t.nome

                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => onSelecionarTurma({ anoLetivoId: t.anoLetivoId, escolaId: t.escolaId, segmentoId: t.segmentoId, turmaId: t.turmaId })}
                    className={`w-full text-left px-3 py-1.5 rounded-[8px] transition-colors flex items-center gap-2 border ${
                      isAtiva
                        ? 'bg-[#EEF2FF] dark:bg-[#1E2847] border-[#C7D2FE] dark:border-[#3730A3]'
                        : 'border-transparent hover:bg-[#EEF2FF]/60 dark:hover:bg-[#263348]'
                    }`}
                  >
                    {/* Nome + meta */}
                    <div className="min-w-0 flex-1">
                      <div className={`text-[12.5px] font-semibold leading-tight truncate ${
                        isAtiva ? 'text-[#4338CA] dark:text-[#A5B4FC]' : 'text-[#1F2937] dark:text-[#E5E7EB]'
                      }`}>
                        {turmaNome}
                      </div>
                    </div>
                  </button>
                )
              })}
              {estaAberta && <div className="h-1" />}
            </div>
          )
        })}
      </div>
    </aside>
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
  const [timelineAberta, setTimelineAberta] = useState(true)
  const [verDetalhesRegistro, setVerDetalhesRegistro] = useState(false)
  const [registroAbertoId, setRegistroAbertoId] = useState<string | number | null>(null)
  const [periodoVivencias, setPeriodoVivencias] = useState<PeriodoVivencias>({ tipo: 'tudo' })
  const [vivDropdownAberto, setVivDropdownAberto] = useState(false)
  const [vivDropdownAba, setVivDropdownAba] = useState<'mes' | 'range'>('mes')
  const [vivPickerAno, setVivPickerAno] = useState(() => new Date().getFullYear())
  const [vivRangeInicio, setVivRangeInicio] = useState('')
  const [vivRangeFim, setVivRangeFim] = useState('')
  const [editandoObs, setEditandoObs] = useState(false)
  const [obsRascunho, setObsRascunho] = useState('')
  const [editandoObj, setEditandoObj] = useState(false)
  const [objRascunho, setObjRascunho] = useState('')

  // Resetar seleção ao trocar de turma
  useEffect(() => { setDataAtiva(null) }, [turmaSelecionada?.turmaId])
  useEffect(() => { setAba('aulas'); setTimelineAberta(false); setVerDetalhesRegistro(false) }, [turmaSelecionada?.turmaId]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Resumo automático — recalcula ao mudar período
  const resumoTurma = useMemo(
    () => calcResumoTurma(historicoDaTurma, planos, periodoVivencias),
    [historicoDaTurma, planos, periodoVivencias]
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

          {/* ── 1. Sua nota para hoje (proximaAula do último registro) ──── */}
          {registroExibido?.proximaAula && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Sua nota para hoje</p>
              <div
                className="text-sm text-indigo-800 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizar(registroExibido.proximaAula) }}
              />
            </div>
          )}

          {/* ── 2. Último registro / Registro selecionado — simplificado ── */}
          {registroExibido && (() => {
            const ts = turmaSelecionada!
            const allAlunos = alunosGetByTurma(ts.anoLetivoId, ts.escolaId, ts.segmentoId, ts.turmaId)
            const nomeAluno = (id: string) => allAlunos.find(a => a.id === id)?.nome ?? id
            const chamada = (registroExibido as any).chamada as { alunoId: string; presente: boolean }[] | undefined
            const presentes = chamada ? chamada.filter(c => c.presente).length : null
            const ausentes  = chamada ? chamada.filter(c => !c.presente) : []
            return (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-slate-600">
                    Avaliação da última aula · {formatarDataComDia(registroExibido.dataAula ?? registroExibido.data ?? '')}
                  </span>
                  {registroExibido.resultadoAula && (
                    <span className="text-[11px] font-semibold text-slate-500">{labelResultado(registroExibido.resultadoAula)}</span>
                  )}
                </div>
                {(() => {
                  // Contar campos secundários com conteúdo real
                  const secundarios = [
                    stripHTML(registroExibido.funcionouBem ?? '').trim(),
                    stripHTML(registroExibido.poderiaMelhorar ?? '').trim(),
                    stripHTML(registroExibido.comportamento ?? '').trim(),
                    stripHTML(registroExibido.anotacoesGerais ?? '').trim(),
                  ].filter(Boolean)
                  const temChamada = !!(chamada && chamada.length > 0)
                  const totalSecundarios = secundarios.length + (temChamada ? 1 : 0)
                  // Colapsar só se houver 2 ou mais campos secundários
                  const usarColapso = totalSecundarios >= 2
                  const mostrarSecundarios = !usarColapso || verDetalhesRegistro
                  return (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      {registroExibido.resumoAula && (
                        <InfoRow icon="📋" label="O que foi realizado" valor={registroExibido.resumoAula} />
                      )}
                      {(registroExibido.fariadiferente || (registroExibido as any).naoFuncionou) && (
                        <InfoRow icon="⚠️" label="O que faria diferente" valor={registroExibido.fariadiferente || (registroExibido as any).naoFuncionou} />
                      )}
                      {mostrarSecundarios && (
                        <>
                          {registroExibido.funcionouBem && (
                            <InfoRow icon="✅" label="O que funcionou bem" valor={registroExibido.funcionouBem} />
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
                          {temChamada && (
                            <div>
                              <InfoRow icon="✋" label="Chamada" valor={`${presentes}/${chamada!.length} presentes`} />
                              {ausentes.length > 0 && (
                                <p className="text-[11px] text-slate-400 mt-0.5 ml-6 italic">
                                  Ausentes: {ausentes.map(c => nomeAluno(c.alunoId)).join(', ')}
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                      {usarColapso && (
                        <button
                          type="button"
                          onClick={() => setVerDetalhesRegistro(v => !v)}
                          className="text-[11px] text-indigo-400 hover:text-indigo-600 font-medium transition-colors"
                        >
                          {verDetalhesRegistro ? 'Ocultar detalhes ↑' : 'Ver detalhes ↓'}
                        </button>
                      )}
                    </div>
                  )
                })()}
              </div>
            )
          })()}

          {/* ── 3. Vivências e meios expressivos ──────────────────────────── */}
          {resumoTurma.numAulas > 0 && (() => {
            const MESES_PT    = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
            const MESES_CURTO = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
            const hoje = new Date()

            const ctxLabel = (() => {
              if (periodoVivencias.tipo === 'tudo')      return 'Todas as aulas registradas'
              if (periodoVivencias.tipo === 'mes_atual') return `${MESES_PT[hoje.getMonth()]} de ${hoje.getFullYear()}`
              if (periodoVivencias.tipo === 'mes')       return `${MESES_PT[periodoVivencias.mes]} de ${periodoVivencias.ano}`
              const fmt = (d: string) => { const [y,m,day] = d.split('-'); return `${day}/${m}/${y}` }
              return `${fmt(periodoVivencias.inicio)} a ${fmt(periodoVivencias.fim)}`
            })()

            const isTudo    = periodoVivencias.tipo === 'tudo'
            const isMesAtual = periodoVivencias.tipo === 'mes_atual'
            const isCustom  = periodoVivencias.tipo === 'mes' || periodoVivencias.tipo === 'range'

            const maxViv = Math.max(...resumoTurma.vivencias.map(v => v.count), 1)
            const maxMei = Math.max(...resumoTurma.meios.map(m => m.count), 1)

            return (
              <>
                {vivDropdownAberto && (
                  <div className="fixed inset-0 z-40" onClick={() => setVivDropdownAberto(false)} />
                )}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                        Vivências e meios expressivos
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{ctxLabel}</p>
                    </div>

                    {/* Seletor de período */}
                    <div className="relative z-50 shrink-0">
                      <div className="flex gap-1">
                        {[
                          { id: 'tudo',     label: 'Tudo',     active: isTudo,     onClick: () => { setPeriodoVivencias({ tipo: 'tudo' }); setVivDropdownAberto(false) } },
                          { id: 'mes_atual', label: 'Este mês', active: isMesAtual, onClick: () => { setPeriodoVivencias({ tipo: 'mes_atual' }); setVivDropdownAberto(false) } },
                        ].map(({ id, label, active, onClick }) => (
                          <button key={id} type="button" onClick={onClick}
                            className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border transition-colors ${
                              active ? 'bg-[#5B5FEA] text-white border-[#5B5FEA]'
                                     : 'bg-white text-slate-500 border-slate-200 hover:border-[#5B5FEA] hover:text-[#5B5FEA]'
                            }`}
                          >{label}</button>
                        ))}
                        <button type="button" onClick={() => setVivDropdownAberto(v => !v)}
                          className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border transition-colors flex items-center gap-1 ${
                            isCustom || vivDropdownAberto
                              ? 'bg-[#5B5FEA] text-white border-[#5B5FEA]'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-[#5B5FEA] hover:text-[#5B5FEA]'
                          }`}
                        >
                          {isCustom ? (periodoVivencias.tipo === 'range' ? 'Período' : `${MESES_CURTO[periodoVivencias.mes]} ${periodoVivencias.ano}`) : 'Escolher'}
                          <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>

                      {/* Dropdown */}
                      {vivDropdownAberto && (
                        <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg p-3 min-w-[248px]">
                          {/* Abas */}
                          <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5 mb-3">
                            {(['mes', 'range'] as const).map(aba => (
                              <button key={aba} type="button" onClick={() => setVivDropdownAba(aba)}
                                className={`flex-1 text-[10px] font-semibold py-1 rounded-md transition-colors ${
                                  vivDropdownAba === aba ? 'bg-white text-[#5B5FEA] shadow-sm' : 'text-slate-500'
                                }`}
                              >{aba === 'mes' ? 'Mês específico' : 'Período'}</button>
                            ))}
                          </div>

                          {vivDropdownAba === 'mes' && (
                            <>
                              <div className="flex items-center justify-between mb-2">
                                <button type="button" onClick={() => setVivPickerAno(y => y - 1)}
                                  className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs">‹</button>
                                <span className="text-[12px] font-bold text-slate-700">{vivPickerAno}</span>
                                <button type="button" onClick={() => setVivPickerAno(y => y + 1)}
                                  className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs">›</button>
                              </div>
                              <div className="grid grid-cols-3 gap-1">
                                {MESES_CURTO.map((m, i) => {
                                  const isFuturo = vivPickerAno > hoje.getFullYear() || (vivPickerAno === hoje.getFullYear() && i > hoje.getMonth())
                                  const isAtual  = vivPickerAno === hoje.getFullYear() && i === hoje.getMonth()
                                  const isSel    = periodoVivencias.tipo === 'mes' && periodoVivencias.ano === vivPickerAno && periodoVivencias.mes === i
                                  return (
                                    <button key={m} type="button" disabled={isFuturo}
                                      onClick={() => { setPeriodoVivencias({ tipo: 'mes', mes: i, ano: vivPickerAno }); setVivDropdownAberto(false) }}
                                      className={`text-[11px] font-medium py-1.5 rounded-lg transition-colors ${
                                        isSel    ? 'bg-[#5B5FEA] text-white' :
                                        isAtual  ? 'border border-[#c7d2fe] text-[#5B5FEA] font-bold' :
                                        isFuturo ? 'text-slate-200 cursor-default' :
                                                   'text-slate-500 hover:bg-slate-100'
                                      }`}
                                    >{m}</button>
                                  )
                                })}
                              </div>
                            </>
                          )}

                          {vivDropdownAba === 'range' && (
                            <div className="space-y-2">
                              {[
                                { label: 'De',  value: vivRangeInicio, setter: setVivRangeInicio },
                                { label: 'Até', value: vivRangeFim,    setter: setVivRangeFim    },
                              ].map(({ label, value, setter }) => (
                                <div key={label} className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400 w-6 text-right shrink-0">{label}</span>
                                  <input type="date" value={value} onChange={e => setter(e.target.value)}
                                    className="flex-1 text-[11px] px-2 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-[#5B5FEA] font-[inherit]"
                                  />
                                </div>
                              ))}
                              <button type="button"
                                disabled={!vivRangeInicio || !vivRangeFim}
                                onClick={() => {
                                  if (vivRangeInicio && vivRangeFim) {
                                    setPeriodoVivencias({ tipo: 'range', inicio: vivRangeInicio, fim: vivRangeFim })
                                    setVivDropdownAberto(false)
                                  }
                                }}
                                className="w-full mt-1 py-1.5 text-[11px] font-bold rounded-lg bg-[#5B5FEA] text-white disabled:opacity-40"
                              >Aplicar</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Conteúdo — desktop 2 colunas (sm:) / mobile empilhado */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Vivências musicais */}
                    {(() => {
                      const temDados = resumoTurma.vivencias.some(v => v.count > 0)
                      return (
                        <div className="border border-slate-100 rounded-lg p-2.5" style={{ borderTop: '2px solid #818cf8' }}>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 mb-2">Vivências musicais</p>
                          {!temDados
                            ? <p className="text-[10px] text-slate-300 italic">Sem dados no período</p>
                            : resumoTurma.vivencias.map((item, i) => (
                              <div key={item.label} className={`flex items-center gap-1.5 mb-1.5 last:mb-0 ${item.count === 0 ? 'opacity-30' : ''}`}>
                                <span className={`text-[9px] font-bold w-3 shrink-0 ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-400' : 'text-slate-300'}`}>{i + 1}</span>
                                <span className="text-[10px] text-slate-600 flex-1 truncate">{item.label}</span>
                                <div className="w-16 sm:w-8 h-[4px] bg-slate-100 rounded-full overflow-hidden shrink-0">
                                  <div className="h-full rounded-full bg-indigo-400" style={{ width: `${(item.count / maxViv) * 100}%` }} />
                                </div>
                                <span className={`text-[9px] font-semibold w-4 text-right shrink-0 ${i === 0 ? 'text-indigo-400' : 'text-slate-300'}`}>{item.count}</span>
                              </div>
                            ))
                          }
                        </div>
                      )
                    })()}

                    {/* Meios expressivos */}
                    {(() => {
                      const temDados = resumoTurma.meios.some(m => m.count > 0)
                      return (
                        <div className="border border-slate-100 rounded-lg p-2.5" style={{ borderTop: '2px solid #34d399' }}>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-500 mb-2">Meios expressivos</p>
                          {!temDados
                            ? <p className="text-[10px] text-slate-300 italic">Sem dados no período</p>
                            : resumoTurma.meios.map((item, i) => (
                              <div key={item.label} className={`flex items-center gap-1.5 mb-1.5 last:mb-0 ${item.count === 0 ? 'opacity-30' : ''}`}>
                                <span className={`text-[9px] font-bold w-3 shrink-0 ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-400' : 'text-slate-300'}`}>{i + 1}</span>
                                <span className="text-[10px] text-slate-600 flex-1 truncate">{item.label}</span>
                                <div className="w-16 sm:w-8 h-[4px] bg-slate-100 rounded-full overflow-hidden shrink-0">
                                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${(item.count / maxMei) * 100}%` }} />
                                </div>
                                <span className={`text-[9px] font-semibold w-4 text-right shrink-0 ${i === 0 ? 'text-emerald-500' : 'text-slate-300'}`}>{item.count}</span>
                              </div>
                            ))
                          }
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </>
            )
          })()}

          {/* ── 4. Timeline pedagógica — colapsável ──────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <button
              type="button"
              onClick={() => setTimelineAberta(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
            >
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aulas realizadas</span>
              <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${timelineAberta ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {timelineAberta && (
              <div className="px-4 pb-4">
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
              </div>
            )}
          </div>

          {/* ── 5. Aulas anteriores — accordion ──────────────────────────── */}
          {listaHistorico.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aulas anteriores</h3>
                <span className="text-[10px] text-slate-400">{listaHistorico.length} aula{listaHistorico.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {listaHistorico.map((r, i) => {
                  const id = r.id ?? i
                  const aberto = registroAbertoId === id
                  const temConteudo = !!(
                    stripHTML(r.funcionouBem ?? '').trim() ||
                    stripHTML(r.fariadiferente ?? (r as any).naoFuncionou ?? '').trim() ||
                    stripHTML(r.proximaAula ?? '').trim()
                  )
                  return (
                    <div key={id}>
                      <button
                        type="button"
                        onClick={() => temConteudo && setRegistroAbertoId(aberto ? null : id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${temConteudo ? 'hover:bg-slate-50' : ''}`}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-semibold text-slate-500">{formatarData(r.dataAula ?? r.data ?? '')}</span>
                          {r.resumoAula
                            ? <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{stripHTML(r.resumoAula)}</p>
                            : <p className="text-[11px] text-slate-300 mt-0.5 italic">Sem resumo</p>
                          }
                        </div>
                        {temConteudo && (
                          <svg className={`w-3 h-3 text-slate-300 shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </button>
                      {aberto && (
                        <div className="px-4 pb-3 pt-1 bg-slate-50 border-t border-slate-100 space-y-2">
                          {stripHTML(r.funcionouBem ?? '').trim() && (
                            <div>
                              <p className="text-[9px] font-bold text-slate-300 uppercase tracking-wider mb-0.5">O que funcionou</p>
                              <p className="text-[11px] text-slate-500 leading-snug">{stripHTML(r.funcionouBem!)}</p>
                            </div>
                          )}
                          {stripHTML(r.fariadiferente ?? (r as any).naoFuncionou ?? '').trim() && (
                            <div>
                              <p className="text-[9px] font-bold text-slate-300 uppercase tracking-wider mb-0.5">Faria diferente</p>
                              <p className="text-[11px] text-slate-500 leading-snug">{stripHTML(r.fariadiferente ?? (r as any).naoFuncionou)}</p>
                            </div>
                          )}
                          {stripHTML(r.proximaAula ?? '').trim() && (
                            <div>
                              <p className="text-[9px] font-bold text-slate-300 uppercase tracking-wider mb-0.5">Nota para próxima</p>
                              <p className="text-[11px] text-slate-500 leading-snug">{stripHTML(r.proximaAula!)}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="px-4 py-2.5 border-t border-slate-100">
                <button
                  onClick={() => setViewModeGlobal('posAulaHistorico')}
                  className="text-[11px] text-indigo-500 hover:text-indigo-700 font-semibold transition-colors"
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
  const { turmaSelecionada, selecionarTurma } = usePlanejamentoTurmaContext()
  const [mobileTela, setMobileTela] = useState<'lista' | 'detalhe'>('lista')
  const hojeStr = toDateStr(new Date())

  function handleSelecionarTurma(t: TurmaSelecionada) {
    selecionarTurma(t)
    setMobileTela('detalhe')
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Botão voltar mobile */}
      {mobileTela === 'detalhe' && (
        <button
          type="button"
          onClick={() => setMobileTela('lista')}
          className="md:hidden self-start flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-indigo-600 transition"
        >
          <span className="text-[14px] leading-none">←</span>
          Turmas
        </button>
      )}

      <div className="flex items-start bg-white dark:bg-[#111827] rounded-2xl border border-[#E6EAF0] dark:border-[#374151] overflow-hidden shadow-sm">
        {/* Lista de turmas — escondida no mobile quando detalhe aberto */}
        <div className={mobileTela === 'detalhe' ? 'hidden md:block' : 'flex-1 md:flex-none'}>
          <ListaTurmasMPT
            turmaSelecionada={turmaSelecionada}
            onSelecionarTurma={handleSelecionarTurma}
          />
        </div>

        {/* Conteúdo — escondido no mobile quando lista aberta */}
        <div className={`flex-1 min-w-0 space-y-3 p-4 ${mobileTela === 'lista' ? 'hidden md:block' : ''}`}>
          {!turmaSelecionada && <EstadoVazio />}
          {turmaSelecionada && <ConteudoTurma key={turmaSelecionada.turmaId} calendarDateStr={hojeStr} />}
        </div>
      </div>
    </div>
  )
}
