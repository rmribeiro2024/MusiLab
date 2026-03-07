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
import type { AnoLetivo, Escola, Segmento, Turma, GradeEditando, RegistroPosAula } from '../types'

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

// ─── SELETOR DE TURMA ─────────────────────────────────────────────────────────

function SeletorTurma() {
  const { selecionarTurma, turmaSelecionada } = usePlanejamentoTurmaContext()
  const { anosLetivos } = useAnoLetivoContext()
  const { setViewMode } = useRepertorioContext()

  const [anoSel, setAnoSel] = useState(turmaSelecionada?.anoLetivoId ?? '')
  const [escolaSel, setEscolaSel] = useState(turmaSelecionada?.escolaId ?? '')
  const [segmentoSel, setSegmentoSel] = useState(turmaSelecionada?.segmentoId ?? '')

  const anoAtual: AnoLetivo | undefined = anosLetivos.find(a => String(a.id) === anoSel)
  const escolas: Escola[] = anoAtual?.escolas ?? []
  const escolaAtual: Escola | undefined = escolas.find(e => String(e.id) === escolaSel)
  const segmentos: Segmento[] = escolaAtual?.segmentos ?? []
  const segmentoAtual: Segmento | undefined = segmentos.find(s => String(s.id) === segmentoSel)
  const turmas: Turma[] = segmentoAtual?.turmas ?? []

  function handleAno(id: string) { setAnoSel(id); setEscolaSel(''); setSegmentoSel('') }
  function handleEscola(id: string) { setEscolaSel(id); setSegmentoSel('') }
  function handleSegmento(id: string) { setSegmentoSel(id) }
  function handleTurma(t: Turma) {
    selecionarTurma({ anoLetivoId: anoSel, escolaId: escolaSel, segmentoId: segmentoSel, turmaId: String(t.id) })
  }

  const selectClass = 'text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 w-full'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-4">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Selecionar turma</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <select value={anoSel} onChange={e => handleAno(e.target.value)} className={selectClass}>
          <option value="">Ano letivo…</option>
          {anosLetivos.map(a => <option key={a.id} value={String(a.id)}>{a.nome ?? a.ano}</option>)}
        </select>
        <select value={escolaSel} onChange={e => handleEscola(e.target.value)} disabled={!anoSel} className={selectClass}>
          <option value="">Escola…</option>
          {escolas.map(e => <option key={e.id} value={String(e.id)}>{e.nome}</option>)}
        </select>
        <select value={segmentoSel} onChange={e => handleSegmento(e.target.value)} disabled={!escolaSel} className={selectClass}>
          <option value="">Segmento…</option>
          {segmentos.map(s => <option key={s.id} value={String(s.id)}>{s.nome}</option>)}
        </select>
        <div className="flex flex-wrap gap-1 items-center">
          {segmentoSel && turmas.length === 0 && <span className="text-xs text-slate-400">Sem turmas</span>}
          {turmas.map(t => {
            const isActive = turmaSelecionada?.turmaId === String(t.id)
            return (
              <button key={t.id} onClick={() => handleTurma(t)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}>
                {t.nome}
              </button>
            )
          })}
        </div>
      </div>

      {anoSel && escolas.length === 0 && (
        <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700">
          <span className="mt-0.5">⚠️</span>
          <span>
            Nenhuma escola encontrada para este ano letivo.{' '}
            <button type="button" className="underline font-medium hover:text-amber-900" onClick={() => setViewMode('anoLetivo')}>Configure em Meu Ano →</button>
          </span>
        </div>
      )}

      {turmaSelecionada && (
        <div className="mt-2 text-xs text-blue-600 font-medium">
          {[
            anosLetivos.find(a => String(a.id) === turmaSelecionada.anoLetivoId)?.nome,
            escolas.find(e => String(e.id) === turmaSelecionada.escolaId)?.nome,
            segmentos.find(s => String(s.id) === turmaSelecionada.segmentoId)?.nome,
            turmas.find(t => String(t.id) === turmaSelecionada.turmaId)?.nome,
          ].filter(Boolean).join(' › ')}
        </div>
      )}
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
      <span dangerouslySetInnerHTML={{ __html: valor }} />
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
              <p className="text-sm text-slate-600">{plano.objetivoGeral}</p>
            </div>
          )}

          {(plano.atividadesRoteiro ?? []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Atividades</p>
              <div className="space-y-1.5">
                {(plano.atividadesRoteiro ?? []).map((a, i) => (
                  <div key={i} className="text-xs bg-slate-50 rounded-lg px-3 py-2">
                    <span className="font-medium text-slate-700">{a.nome}</span>
                    {a.descricao && <span className="text-slate-400"> — {a.descricao}</span>}
                    {a.duracao && <span className="text-slate-300 ml-1">({a.duracao} min)</span>}
                  </div>
                ))}
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
  const [materiaisAbertos, setMateriaisAbertos] = useState(materiais.length > 0)
  const [painelImportarAberto, setPainelImportarAberto] = useState(false)
  const [basePlano, setBasePlano] = useState<import('../types').Plano | null>(() => {
    const id = planejamentoEditando?.planosRelacionadosIds?.[0]
    return id ? planos.find(p => String(p.id) === id) ?? null : null
  })
  const [painelAdaptarAberto, setPainelAdaptarAberto] = useState(false)
  const [planosAdaptarAbertos, setPlanosAdaptarAbertos] = useState(() =>
    // Expande automaticamente se já há planos pré-carregados
    modoInicial === 'adaptar' && (planoDaUltimaAulaId != null || (ultimoPlanejamento?.planosRelacionadosIds?.length ?? 0) > 0)
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
    // Expande planos se modo adaptar já tiver plano carregado
    if (novoModo === 'adaptar') {
      setPlanosAdaptarAbertos(planoDaUltimaAulaId != null)
    } else {
      setPlanosAdaptarAbertos(false)
    }
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

  const [historicoExpandido, setHistoricoExpandido] = useState(false)
  const [planejamentosExpandidos, setPlanejamentosExpandidos] = useState(false)
  const [acionarBloco2, setAcionarBloco2] = useState<{ n: number; modo: Exclude<Modo, null> } | null>(null)
  const formBlockRef = useRef<HTMLDivElement>(null)

  if (!turmaSelecionada) return null

  const registrosAnteriores = historicoDaTurma.slice(1)

  const podeAdaptarBloco2 = !!(
    ultimoRegistroDaTurma?.proximaAula?.trim() ||
    ultimoRegistroDaTurma?.poderiaMelhorar?.trim() ||
    ultimoRegistroDaTurma?.resumoAula?.trim()
  )

  function acionarModoFromBloco2(modo: Exclude<Modo, null>) {
    setAcionarBloco2(prev => ({ n: (prev?.n ?? 0) + 1, modo }))
    setTimeout(() => {
      formBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  return (
    <div className="space-y-4">

      {/* ── BLOCO 1: Último registro pós-aula ─────────────────────────────────── */}
      {ultimoRegistroDaTurma ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Último registro</h3>
            <span className="text-xs text-slate-400">
              {formatarData(ultimoRegistroDaTurma.dataAula ?? ultimoRegistroDaTurma.data ?? '')}
            </span>
          </div>
          <div className="space-y-2">
            {ultimoRegistroDaTurma.resultadoAula && (
              <InfoRow icon="📊" label="Resultado da aula" valor={labelResultado(ultimoRegistroDaTurma.resultadoAula)} />
            )}
            {ultimoRegistroDaTurma.resumoAula && (
              <InfoRow icon="📋" label="O que foi realizado" valor={ultimoRegistroDaTurma.resumoAula} />
            )}
            {ultimoRegistroDaTurma.funcionouBem && (
              <InfoRow icon="✅" label="O que funcionou bem" valor={ultimoRegistroDaTurma.funcionouBem} />
            )}
            {ultimoRegistroDaTurma.naoFuncionou && (
              <InfoRow icon="⚠️" label="O que não funcionou" valor={ultimoRegistroDaTurma.naoFuncionou} />
            )}
            {ultimoRegistroDaTurma.poderiaMelhorar && (
              <InfoRow icon="🔧" label="O que poderia ter sido melhor" valor={ultimoRegistroDaTurma.poderiaMelhorar} />
            )}
            {ultimoRegistroDaTurma.comportamento && (
              <InfoRow icon="👥" label="Comportamento da turma" valor={ultimoRegistroDaTurma.comportamento} />
            )}
            {ultimoRegistroDaTurma.anotacoesGerais && (
              <InfoRow icon="📝" label="Anotações gerais" valor={ultimoRegistroDaTurma.anotacoesGerais} />
            )}
            {ultimoRegistroDaTurma.proximaAula && (
              <InfoRow icon="💡" label="Ideias / estratégias" valor={ultimoRegistroDaTurma.proximaAula} destacado />
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-4 text-center">
          <p className="text-sm text-slate-400">Nenhum registro pós-aula encontrado para esta turma.</p>
        </div>
      )}

      {/* ── BLOCO 2: Próximo Passo Sugerido ───────────────────────────────────── */}
      {ultimoRegistroDaTurma?.proximaAulaOpcao && (
        <CardProximoPasso
          valor={ultimoRegistroDaTurma.proximaAulaOpcao}
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
              {registrosAnteriores.map((r, i) => (
                <div key={r.id ?? i} className="px-4 py-3">
                  <span className="text-xs font-medium text-slate-500">{formatarData(r.dataAula ?? r.data ?? '')}</span>
                  {r.resumoAula && <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{r.resumoAula}</p>}
                </div>
              ))}
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
    </div>
  )
}

// ─── MÓDULO PRINCIPAL ─────────────────────────────────────────────────────────

export default function ModuloPlanejamentoTurma() {
  const { turmaSelecionada } = usePlanejamentoTurmaContext()

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-slate-800 mb-4">👥 Turmas</h1>
      <SeletorTurma />
      {!turmaSelecionada && <EstadoVazio />}
      {turmaSelecionada && <ConteudoTurma />}
    </div>
  )
}
