// src/components/ModuloPlanejamentoTurma.tsx
// Módulo "Planejamento por Turma" — visão pedagógica por turma.
// Mostra: histórico da turma + último registro pós-aula + formulário da próxima aula.

import React, { useState } from 'react'
import { usePlanejamentoTurmaContext, type TurmaSelecionada } from '../contexts/PlanejamentoTurmaContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import { usePlanosContext } from '../contexts/PlanosContext'
import { useRepertorioContext } from '../contexts/RepertorioContext'
import type { AnoLetivo, Escola, Segmento, Turma } from '../types'

// ─── SELETOR DE TURMA ─────────────────────────────────────────────────────────

function SeletorTurma() {
  const { selecionarTurma, turmaSelecionada } = usePlanejamentoTurmaContext()
  const { anosLetivos } = useAnoLetivoContext()
  const { setViewMode } = useRepertorioContext()

  const [anoSel, setAnoSel] = useState(turmaSelecionada?.anoLetivoId ?? '')
  const [escolaSel, setEscolaSel] = useState(turmaSelecionada?.escolaId ?? '')
  const [segmentoSel, setSegmentoSel] = useState(turmaSelecionada?.segmentoId ?? '')

  // Usar String() para comparação robusta: IDs podem ser number (Supabase) ou string (local)
  const anoAtual: AnoLetivo | undefined = anosLetivos.find(a => String(a.id) === anoSel)
  const escolas: Escola[] = anoAtual?.escolas ?? []
  const escolaAtual: Escola | undefined = escolas.find(e => String(e.id) === escolaSel)
  const segmentos: Segmento[] = escolaAtual?.segmentos ?? []
  const segmentoAtual: Segmento | undefined = segmentos.find(s => String(s.id) === segmentoSel)
  const turmas: Turma[] = segmentoAtual?.turmas ?? []

  function handleAno(id: string) {
    setAnoSel(id)
    setEscolaSel('')
    setSegmentoSel('')
  }

  function handleEscola(id: string) {
    setEscolaSel(id)
    setSegmentoSel('')
  }

  function handleSegmento(id: string) {
    setSegmentoSel(id)
  }

  function handleTurma(t: Turma) {
    const sel: TurmaSelecionada = {
      anoLetivoId: anoSel,
      escolaId: escolaSel,
      segmentoId: segmentoSel,
      turmaId: String(t.id),
    }
    selecionarTurma(sel)
  }

  const selectClass = 'text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-4">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Selecionar turma</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Ano letivo */}
        <select value={anoSel} onChange={e => handleAno(e.target.value)} className={selectClass}>
          <option value="">Ano letivo…</option>
          {anosLetivos.map(a => (
            <option key={a.id} value={String(a.id)}>{a.nome ?? a.ano}</option>
          ))}
        </select>

        {/* Escola */}
        <select value={escolaSel} onChange={e => handleEscola(e.target.value)} disabled={!anoSel} className={selectClass}>
          <option value="">Escola…</option>
          {escolas.map(e => (
            <option key={e.id} value={String(e.id)}>{e.nome}</option>
          ))}
        </select>

        {/* Segmento */}
        <select value={segmentoSel} onChange={e => handleSegmento(e.target.value)} disabled={!escolaSel} className={selectClass}>
          <option value="">Segmento…</option>
          {segmentos.map(s => (
            <option key={s.id} value={String(s.id)}>{s.nome}</option>
          ))}
        </select>

        {/* Turmas como botões */}
        <div className="flex flex-wrap gap-1 items-center">
          {segmentoSel && turmas.length === 0 && (
            <span className="text-xs text-slate-400">Sem turmas</span>
          )}
          {turmas.map(t => {
            const isActive = turmaSelecionada?.turmaId === t.id && turmaSelecionada?.segmentoId === segmentoSel
            return (
              <button
                key={t.id}
                onClick={() => handleTurma(t)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                }`}
              >
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
            <button
              type="button"
              className="underline font-medium hover:text-amber-900"
              onClick={() => setViewMode('anoLetivo')}
            >
              Configure em Meu Ano →
            </button>
          </span>
        </div>
      )}

      {turmaSelecionada && (
        <div className="mt-2 text-xs text-indigo-600 font-medium">
          {[
            anosLetivos.find(a => a.id === turmaSelecionada.anoLetivoId)?.nome,
            escolas.find(e => e.id === turmaSelecionada.escolaId)?.nome,
            segmentos.find(s => s.id === turmaSelecionada.segmentoId)?.nome,
            turmas.find(t => t.id === turmaSelecionada.turmaId)?.nome,
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
      <p className="text-sm text-slate-400 max-w-xs">
        Escolha o ano letivo, escola, segmento e turma acima para ver o histórico e planejar a próxima aula.
      </p>
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
    novoPlanejamento,
  } = usePlanejamentoTurmaContext()

  const [historicoExpandido, setHistoricoExpandido] = useState(false)

  if (!turmaSelecionada) return null

  const registrosAnteriores = historicoDaTurma.slice(1) // sem o último

  return (
    <div className="space-y-4">
      {/* Último registro pós-aula */}
      {ultimoRegistroDaTurma ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Último registro</h3>
            <span className="text-xs text-slate-400">
              {ultimoRegistroDaTurma.dataAula ?? ultimoRegistroDaTurma.data ?? '—'}
            </span>
          </div>

          <div className="space-y-2">
            {ultimoRegistroDaTurma.resumoAula && (
              <InfoRow icon="📋" label="O que foi feito" valor={ultimoRegistroDaTurma.resumoAula} />
            )}
            {ultimoRegistroDaTurma.funcionouBem && (
              <InfoRow icon="✅" label="Funcionou bem" valor={ultimoRegistroDaTurma.funcionouBem} />
            )}
            {ultimoRegistroDaTurma.naoFuncionou && (
              <InfoRow icon="❌" label="Não funcionou" valor={ultimoRegistroDaTurma.naoFuncionou} />
            )}
            {(ultimoRegistroDaTurma as { poderiaMelhorar?: string }).poderiaMelhorar && (
              <InfoRow icon="💡" label="Poderia melhorar" valor={(ultimoRegistroDaTurma as { poderiaMelhorar?: string }).poderiaMelhorar!} />
            )}
            {ultimoRegistroDaTurma.proximaAula && (
              <InfoRow icon="➡️" label="Próxima aula sugerida" valor={ultimoRegistroDaTurma.proximaAula} destacado />
            )}
            {ultimoRegistroDaTurma.comportamento && (
              <InfoRow icon="👥" label="Comportamento" valor={ultimoRegistroDaTurma.comportamento} />
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-4 text-center">
          <p className="text-sm text-slate-400">Nenhum registro pós-aula encontrado para esta turma.</p>
        </div>
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
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-500">{r.dataAula ?? r.data ?? '—'}</span>
                  </div>
                  {r.resumoAula && (
                    <p className="text-xs text-slate-600 line-clamp-2">{r.resumoAula}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Área de planejamento */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Planejamentos da próxima aula</h3>
          <button
            onClick={novoPlanejamento}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            + Novo planejamento
          </button>
        </div>

        {planejamentosDaTurma.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-slate-400 mb-3">Nenhum planejamento ainda.</p>
            <button
              onClick={novoPlanejamento}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium underline"
            >
              Criar primeiro planejamento
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {planejamentosDaTurma.map(p => (
              <CardPlanejamento key={p.id} planejamento={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── CARD DE PLANEJAMENTO ─────────────────────────────────────────────────────

function CardPlanejamento({ planejamento }: { planejamento: import('../types').PlanejamentoTurma }) {
  const { editarPlanejamento, excluirPlanejamento, buildDadosParaBanco } = usePlanejamentoTurmaContext()
  const { novoPlano, setPlanoEditando, planos } = usePlanosContext()
  const { setViewMode } = useRepertorioContext()

  const planosRelacionados = React.useMemo(
    () => (planejamento.planosRelacionadosIds ?? [])
      .map(id => planos.find(p => String(p.id) === id))
      .filter(Boolean) as import('../types').Plano[],
    [planejamento.planosRelacionadosIds, planos]
  )

  function handlePromover() {
    const dados = buildDadosParaBanco(planejamento.id)
    novoPlano()
    // Aguardar o novoPlano() inicializar o planoEditando, então mesclar os dados
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
  const [expandido, setExpandido] = useState(false)

  const origemLabel: Record<string, string> = {
    banco: '🏦 Do banco',
    adaptacao: '♻️ Adaptar',
    livre: '✏️ Livre',
  }

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpandido(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
      >
        <div>
          <span className="text-sm font-medium text-slate-700">
            {planejamento.dataPrevista ?? 'Sem data'}
          </span>
          {planejamento.origemAula && (
            <span className="ml-2 text-xs text-slate-400">{origemLabel[planejamento.origemAula]}</span>
          )}
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{planejamento.oQuePretendoFazer}</p>
        </div>
        <span className="text-slate-300 text-xs ml-2">{expandido ? '▲' : '▼'}</span>
      </button>

      {expandido && (
        <div className="px-3 pb-3 space-y-2 border-t border-slate-50">
          <p className="text-sm text-slate-600 whitespace-pre-wrap pt-2">{planejamento.oQuePretendoFazer}</p>

          {planejamento.objetivo && (
            <div className="text-xs text-slate-500">
              <span className="font-medium">Objetivo:</span> {planejamento.objetivo}
            </div>
          )}

          {planosRelacionados.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Aulas-base:</p>
              <div className="flex flex-wrap gap-1">
                {planosRelacionados.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setViewMode('lista') }}
                    className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-lg hover:bg-indigo-100 transition-colors"
                    title="Clique para ir ao banco e ver o roteiro"
                  >
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

          {planejamento.observacoes && (
            <div className="text-xs text-slate-500">
              <span className="font-medium">Obs:</span> {planejamento.observacoes}
            </div>
          )}

          <div className="flex gap-3 pt-1 flex-wrap">
            <button
              onClick={() => editarPlanejamento(planejamento)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Editar
            </button>
            <button
              onClick={handlePromover}
              className="text-xs text-emerald-600 hover:text-emerald-800 font-medium border border-emerald-200 px-2 py-0.5 rounded-lg hover:bg-emerald-50 transition-colors"
              title="Abre o formulário completo de criação de aula com dados pré-preenchidos"
            >
              Promover para banco →
            </button>
            <button
              onClick={() => excluirPlanejamento(planejamento.id)}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Excluir
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── COMPONENTE DE LINHA DE INFO ──────────────────────────────────────────────

function InfoRow({ icon, label, valor, destacado }: {
  icon: string
  label: string
  valor: string
  destacado?: boolean
}) {
  return (
    <div className={`text-xs rounded-lg px-3 py-2 ${destacado ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-50 text-slate-600'}`}>
      <span className="mr-1">{icon}</span>
      <span className="font-medium">{label}:</span>{' '}
      <span>{valor}</span>
    </div>
  )
}

// ─── MÓDULO PRINCIPAL ─────────────────────────────────────────────────────────

export default function ModuloPlanejamentoTurma() {
  const { turmaSelecionada, formAberto, planejamentoEditando, fecharForm, salvarPlanejamento, novoPlanejamento } = usePlanejamentoTurmaContext()

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-800">👥 Turmas</h1>
        {turmaSelecionada && !formAberto && (
          <button
            onClick={novoPlanejamento}
            className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
          >
            + Planejar próxima aula
          </button>
        )}
      </div>

      <SeletorTurma />

      {!turmaSelecionada && <EstadoVazio />}

      {turmaSelecionada && !formAberto && <ConteudoTurma />}

      {turmaSelecionada && formAberto && (
        <FormPlanejamento
          planejamentoEditando={planejamentoEditando}
          onSalvar={salvarPlanejamento}
          onCancelar={fecharForm}
        />
      )}
    </div>
  )
}

// ─── FORMULÁRIO DE PLANEJAMENTO ───────────────────────────────────────────────

type DadosForm = Omit<import('../types').PlanejamentoTurma, 'id' | 'criadoEm' | 'atualizadoEm' | 'anoLetivoId' | 'escolaId' | 'segmentoId' | 'turmaId'>

function FormPlanejamento({
  planejamentoEditando,
  onSalvar,
  onCancelar,
}: {
  planejamentoEditando: import('../types').PlanejamentoTurma | null
  onSalvar: (dados: DadosForm) => void
  onCancelar: () => void
}) {
  const { ultimoRegistroDaTurma } = usePlanejamentoTurmaContext()
  const { planos } = usePlanosContext()

  const [dataPrevista, setDataPrevista] = useState(planejamentoEditando?.dataPrevista ?? '')
  const [origemAula, setOrigemAula] = useState<'banco' | 'adaptacao' | 'livre' | undefined>(
    planejamentoEditando?.origemAula
  )
  const [oQuePretendoFazer, setOQuePretendoFazer] = useState(
    planejamentoEditando?.oQuePretendoFazer ??
    (ultimoRegistroDaTurma?.proximaAula ? `Pendente: ${ultimoRegistroDaTurma.proximaAula}` : '')
  )
  const [objetivo, setObjetivo] = useState(planejamentoEditando?.objetivo ?? '')
  const [novoMaterial, setNovoMaterial] = useState('')
  const [materiais, setMateriais] = useState<string[]>(planejamentoEditando?.materiais ?? [])
  const [observacoes, setObservacoes] = useState(planejamentoEditando?.observacoes ?? '')
  const [objetivoAberto, setObjetivoAberto] = useState(!!planejamentoEditando?.objetivo)

  // Aulas-base relacionadas
  const [planosRelacionadosIds, setPlanosRelacionadosIds] = useState<string[]>(
    planejamentoEditando?.planosRelacionadosIds?.map(String) ?? []
  )
  const [buscaPlano, setBuscaPlano] = useState('')
  const [buscaAberta, setBuscaAberta] = useState(false)

  const planosFiltrados = React.useMemo(() => {
    if (!buscaPlano.trim()) return []
    const q = buscaPlano.toLowerCase()
    return planos
      .filter(p => !p.arquivado && (
        p.titulo?.toLowerCase().includes(q) ||
        p.tema?.toLowerCase().includes(q) ||
        p.conceitos?.some((c: string) => c.toLowerCase().includes(q))
      ))
      .slice(0, 8)
  }, [planos, buscaPlano])

  const planosRelacionados = React.useMemo(
    () => planosRelacionadosIds.map(id => planos.find(p => String(p.id) === id)).filter(Boolean) as import('../types').Plano[],
    [planosRelacionadosIds, planos]
  )

  function togglePlano(id: string) {
    setPlanosRelacionadosIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
    setBuscaPlano('')
    setBuscaAberta(false)
  }

  function removerPlanoRelacionado(id: string) {
    setPlanosRelacionadosIds(prev => prev.filter(x => x !== id))
  }

  function adicionarMaterial() {
    const m = novoMaterial.trim()
    if (m && !materiais.includes(m)) {
      setMateriais(prev => [...prev, m])
      setNovoMaterial('')
    }
  }

  function removerMaterial(m: string) {
    setMateriais(prev => prev.filter(x => x !== m))
  }

  function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    if (!oQuePretendoFazer.trim()) return
    onSalvar({
      dataPrevista: dataPrevista || undefined,
      origemAula,
      planosRelacionadosIds: planosRelacionadosIds.length > 0 ? planosRelacionadosIds : undefined,
      oQuePretendoFazer: oQuePretendoFazer.trim(),
      objetivo: objetivo.trim() || undefined,
      materiais: materiais.length > 0 ? materiais : undefined,
      observacoes: observacoes.trim() || undefined,
    })
  }

  const inputClass = 'w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400'

  return (
    <form onSubmit={handleSalvar} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          {planejamentoEditando ? 'Editar planejamento' : 'Nova planejamento da próxima aula'}
        </h3>
        <button type="button" onClick={onCancelar} className="text-xs text-slate-400 hover:text-slate-600">
          Cancelar
        </button>
      </div>

      {/* Data prevista */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Data prevista</label>
        <input
          type="date"
          value={dataPrevista}
          onChange={e => setDataPrevista(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Campo principal: o que pretendo fazer */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          O que pretendo fazer <span className="text-red-400">*</span>
        </label>
        {ultimoRegistroDaTurma?.proximaAula && !planejamentoEditando && (
          <div className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2 mb-2">
            ➡️ Pendente do último registro: "{ultimoRegistroDaTurma.proximaAula}"
          </div>
        )}
        <textarea
          value={oQuePretendoFazer}
          onChange={e => setOQuePretendoFazer(e.target.value)}
          rows={5}
          placeholder="Descreva o que planeja fazer nesta aula..."
          className={inputClass}
          required
        />
      </div>

      {/* Origem da aula */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Origem da aula</label>
        <div className="flex gap-2">
          {(['banco', 'adaptacao', 'livre'] as const).map(o => {
            const labels = { banco: '🏦 Do banco', adaptacao: '♻️ Adaptar', livre: '✏️ Livre' }
            return (
              <button
                key={o}
                type="button"
                onClick={() => setOrigemAula(prev => prev === o ? undefined : o)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  origemAula === o
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {labels[o]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Aulas-base relacionadas */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Aulas-base relacionadas (opcional)
        </label>

        {/* Chips das selecionadas */}
        {planosRelacionados.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {planosRelacionados.map(p => (
              <span key={p.id} className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded-lg">
                🏦 {p.titulo}
                <button type="button" onClick={() => removerPlanoRelacionado(String(p.id))} className="text-indigo-400 hover:text-indigo-700 ml-1">✕</button>
              </span>
            ))}
          </div>
        )}

        {/* Busca */}
        <div className="relative">
          <input
            type="text"
            value={buscaPlano}
            onChange={e => { setBuscaPlano(e.target.value); setBuscaAberta(true) }}
            onFocus={() => setBuscaAberta(true)}
            onBlur={() => setTimeout(() => setBuscaAberta(false), 150)}
            placeholder="Buscar aula no banco..."
            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          {buscaAberta && planosFiltrados.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              {planosFiltrados.map(p => {
                const selecionado = planosRelacionadosIds.includes(String(p.id))
                return (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={() => togglePlano(String(p.id))}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 transition-colors flex items-center justify-between ${selecionado ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}
                  >
                    <span>{p.titulo}</span>
                    {selecionado && <span className="text-indigo-500 text-xs">✓</span>}
                  </button>
                )
              })}
            </div>
          )}
          {buscaAberta && buscaPlano.trim() && planosFiltrados.length === 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs text-slate-400">
              Nenhuma aula encontrada
            </div>
          )}
        </div>
      </div>

      {/* Objetivo (colapsável) */}
      <div>
        <button
          type="button"
          onClick={() => setObjetivoAberto(v => !v)}
          className="text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1"
        >
          {objetivoAberto ? '▼' : '▶'} Objetivo da aula (opcional)
        </button>
        {objetivoAberto && (
          <textarea
            value={objetivo}
            onChange={e => setObjetivo(e.target.value)}
            rows={2}
            placeholder="Objetivo pedagógico desta aula..."
            className={`${inputClass} mt-2`}
          />
        )}
      </div>

      {/* Materiais */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Materiais</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={novoMaterial}
            onChange={e => setNovoMaterial(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarMaterial() } }}
            placeholder="Ex: flauta doce..."
            className={`${inputClass} flex-1`}
          />
          <button
            type="button"
            onClick={adicionarMaterial}
            className="text-xs px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium"
          >
            +
          </button>
        </div>
        {materiais.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {materiais.map(m => (
              <span key={m} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full flex items-center gap-1">
                {m}
                <button type="button" onClick={() => removerMaterial(m)} className="text-slate-400 hover:text-slate-600">✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Observações */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Observações rápidas</label>
        <textarea
          value={observacoes}
          onChange={e => setObservacoes(e.target.value)}
          rows={2}
          placeholder="Anotações rápidas para esta aula..."
          className={inputClass}
        />
      </div>

      {/* Botões */}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
        >
          {planejamentoEditando ? 'Salvar alterações' : 'Salvar planejamento'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
