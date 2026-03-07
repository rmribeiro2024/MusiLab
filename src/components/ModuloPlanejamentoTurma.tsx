// src/components/ModuloPlanejamentoTurma.tsx
// Módulo "Planejamento por Turma" — visão pedagógica por turma.
// Mostra: histórico da turma + último registro pós-aula + formulário inline da próxima aula.

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { usePlanejamentoTurmaContext, type TurmaSelecionada } from '../contexts/PlanejamentoTurmaContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import { usePlanosContext } from '../contexts/PlanosContext'
import { useRepertorioContext } from '../contexts/RepertorioContext'
import { useCalendarioContext } from '../contexts/CalendarioContext'
import RichTextEditor from './RichTextEditor'
import type { AnoLetivo, Escola, Segmento, Turma, GradeEditando } from '../types'

// ─── HELPER: Próxima data de aula ─────────────────────────────────────────────

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
        a.diaSemana === diaSemana &&
        String(a.turmaId) === turma.turmaId
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

  function handleAno(id: string) { setAnoSel(id); setEscolaSel(''); setSegmentoSel('') }
  function handleEscola(id: string) { setEscolaSel(id); setSegmentoSel('') }
  function handleSegmento(id: string) { setSegmentoSel(id) }

  function handleTurma(t: Turma) {
    selecionarTurma({ anoLetivoId: anoSel, escolaId: escolaSel, segmentoId: segmentoSel, turmaId: String(t.id) })
  }

  const selectClass = 'text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full'

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
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'}`}>
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
        <div className="mt-2 text-xs text-indigo-600 font-medium">
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

// ─── COMPONENTE DE LINHA DE INFO ──────────────────────────────────────────────

function InfoRow({ icon, label, valor, destacado }: { icon: string; label: string; valor: string; destacado?: boolean }) {
  return (
    <div className={`text-xs rounded-lg px-3 py-2 ${destacado ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-50 text-slate-600'}`}>
      <span className="mr-1">{icon}</span>
      <span className="font-medium">{label}:</span>{' '}
      <span dangerouslySetInnerHTML={{ __html: valor }} />
    </div>
  )
}

// ─── PAINEL DE IMPORTAR DO BANCO ──────────────────────────────────────────────

function PainelImportarBanco({
  planosRelacionadosIds,
  onToggle,
  onFechar,
}: {
  planosRelacionadosIds: string[]
  onToggle: (id: string) => void
  onFechar: () => void
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
    <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header do painel */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-600">Banco de aulas</span>
        <button type="button" onClick={onFechar} className="text-slate-400 hover:text-slate-600 text-xs">✕ Fechar</button>
      </div>

      {/* Busca */}
      <div className="px-3 pt-3 pb-2">
        <input
          ref={inputRef}
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por título, tema ou conceito..."
          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        />
      </div>

      {/* Lista */}
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
                onClick={() => onToggle(String(p.id))}
                className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 transition-colors ${sel ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'}`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{p.titulo}</p>
                  {p.tema && <p className="text-xs text-slate-400 truncate">{p.tema}</p>}
                </div>
                <span className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center text-xs ${sel ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                  {sel ? '✓' : ''}
                </span>
              </button>
            )
          })
        )}
      </div>

      {planosRelacionadosIds.length > 0 && (
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-500">{planosRelacionadosIds.length} aula(s) selecionada(s)</p>
        </div>
      )}
    </div>
  )
}

// ─── FORMULÁRIO INLINE DE PLANEJAMENTO ────────────────────────────────────────

type DadosForm = Omit<import('../types').PlanejamentoTurma, 'id' | 'criadoEm' | 'atualizadoEm' | 'anoLetivoId' | 'escolaId' | 'segmentoId' | 'turmaId'>

function FormPlanejamentoInline({
  turmaSelecionada,
  planejamentoEditando,
  onSalvar,
  onCancelarEdicao,
}: {
  turmaSelecionada: TurmaSelecionada
  planejamentoEditando: import('../types').PlanejamentoTurma | null
  onSalvar: (dados: DadosForm) => void
  onCancelarEdicao: () => void
}) {
  const { planos } = usePlanosContext()
  const { gradesSemanas } = useCalendarioContext()

  const proximaData = useMemo(
    () => calcProximaAula(turmaSelecionada, gradesSemanas),
    [turmaSelecionada, gradesSemanas]
  )

  const [dataPrevista, setDataPrevista] = useState(
    planejamentoEditando?.dataPrevista ?? proximaData
  )
  const [oQuePretendoFazer, setOQuePretendoFazer] = useState(
    planejamentoEditando?.oQuePretendoFazer ?? ''
  )
  const [planosRelacionadosIds, setPlanosRelacionadosIds] = useState<string[]>(
    planejamentoEditando?.planosRelacionadosIds?.map(String) ?? []
  )
  const [novoMaterial, setNovoMaterial] = useState('')
  const [materiais, setMateriais] = useState<string[]>(
    planejamentoEditando?.materiais ?? []
  )
  const [importarAberto, setImportarAberto] = useState(false)

  // Sincroniza data quando proximaData é calculado (no início)
  useEffect(() => {
    if (!planejamentoEditando && proximaData && !dataPrevista) {
      setDataPrevista(proximaData)
    }
  }, [proximaData]) // eslint-disable-line

  // Sugestões de materiais (top 6 do histórico)
  const sugestoesMateriais = useMemo(() => {
    const contagem: Record<string, number> = {}
    planos.forEach(p => {
      (p.materiais ?? []).forEach(m => {
        const s = m.trim()
        if (s) contagem[s] = (contagem[s] || 0) + 1
      })
    })
    return Object.entries(contagem)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([m]) => m)
  }, [planos])

  const planosRelacionados = useMemo(
    () => planosRelacionadosIds.map(id => planos.find(p => String(p.id) === id)).filter(Boolean) as import('../types').Plano[],
    [planosRelacionadosIds, planos]
  )

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
    onSalvar({
      dataPrevista: dataPrevista || undefined,
      oQuePretendoFazer,
      planosRelacionadosIds: planosRelacionadosIds.length > 0 ? planosRelacionadosIds : undefined,
      materiais: materiais.length > 0 ? materiais : undefined,
    })
  }

  const inputClass = 'w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400'

  return (
    <form onSubmit={handleSalvar} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-50">
        <h3 className="text-sm font-semibold text-slate-700">
          {planejamentoEditando ? '✏️ Editando planejamento' : '📝 Planejamento da próxima aula'}
        </h3>
        {planejamentoEditando && (
          <button type="button" onClick={onCancelarEdicao} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            Cancelar edição
          </button>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Data prevista */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Data prevista
            {proximaData && !planejamentoEditando && (
              <span className="ml-2 text-indigo-500 font-normal">— próxima aula: {formatarData(proximaData)}</span>
            )}
          </label>
          <input type="date" value={dataPrevista} onChange={e => setDataPrevista(e.target.value)} className={inputClass} />
        </div>

        {/* O que pretendo fazer + Importar do banco */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-700">
              O que pretendo fazer <span className="text-red-400">*</span>
            </label>
            <button
              type="button"
              onClick={() => setImportarAberto(v => !v)}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${importarAberto ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}
            >
              🏦 Importar do banco de aulas
            </button>
          </div>

          {/* Chips das aulas importadas */}
          {planosRelacionados.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {planosRelacionados.map(p => (
                <span key={p.id} className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded-lg">
                  🏦 {p.titulo}
                  <button type="button" onClick={() => togglePlano(String(p.id))} className="text-indigo-400 hover:text-indigo-700 ml-0.5">✕</button>
                </span>
              ))}
            </div>
          )}

          {/* Painel de importar */}
          {importarAberto && (
            <PainelImportarBanco
              planosRelacionadosIds={planosRelacionadosIds}
              onToggle={id => togglePlano(id)}
              onFechar={() => setImportarAberto(false)}
            />
          )}

          {/* Editor rico */}
          <div className={importarAberto ? 'mt-2' : ''}>
            <RichTextEditor
              key={`rte-${planejamentoEditando?.id ?? 'new'}-${turmaSelecionada.turmaId}`}
              value={oQuePretendoFazer}
              onChange={setOQuePretendoFazer}
              placeholder="Descreva o que planeja fazer nesta aula..."
              rows={5}
            />
          </div>
        </div>

        {/* Materiais */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">📦 Materiais</label>

          {/* Sugestões do histórico */}
          {sugestoesMateriais.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-slate-400 mb-1.5">Sugestões do seu histórico:</p>
              <div className="flex flex-wrap gap-1.5">
                {sugestoesMateriais.map(m => {
                  const jaTem = materiais.includes(m)
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => jaTem ? removerMaterial(m) : adicionarMaterial(m)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${jaTem ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'}`}
                    >
                      {jaTem ? '✓ ' : '+ '}{m}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Input para material personalizado */}
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

          {/* Materiais adicionados */}
          {materiais.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {materiais.map(m => (
                <span key={m} className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                  {m}
                  <button type="button" onClick={() => removerMaterial(m)} className="text-slate-400 hover:text-slate-600 ml-0.5">✕</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Botão salvar — estilo clean (igual ModalRegistroPosAula) */}
        <button
          type="submit"
          className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
        >
          <span className="text-emerald-500 text-base font-black">✓</span>
          {planejamentoEditando ? 'Salvar alterações' : 'Salvar planejamento'}
        </button>
      </div>
    </form>
  )
}

// ─── CARD DE PLANEJAMENTO (histórico) ─────────────────────────────────────────

function CardPlanejamento({ planejamento }: { planejamento: import('../types').PlanejamentoTurma }) {
  const { editarPlanejamento, excluirPlanejamento, buildDadosParaBanco } = usePlanejamentoTurmaContext()
  const { novoPlano, setPlanoEditando } = usePlanosContext()
  const { setViewMode } = useRepertorioContext()
  const { planos } = usePlanosContext()
  const [expandido, setExpandido] = useState(false)

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
        <div className="min-w-0">
          <span className="text-sm font-medium text-slate-700">{planejamento.dataPrevista ? formatarData(planejamento.dataPrevista) : 'Sem data'}</span>
          <p className="text-xs text-slate-500 mt-0.5 truncate" dangerouslySetInnerHTML={{ __html: planejamento.oQuePretendoFazer?.replace(/<[^>]+>/g, ' ').slice(0, 80) ?? '' }} />
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
                    className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-lg hover:bg-indigo-100 transition-colors">
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
            <button onClick={() => editarPlanejamento(planejamento)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Editar</button>
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

  if (!turmaSelecionada) return null

  const registrosAnteriores = historicoDaTurma.slice(1)

  return (
    <div className="space-y-4">
      {/* Último registro pós-aula */}
      {ultimoRegistroDaTurma ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Último registro</h3>
            <span className="text-xs text-slate-400">{ultimoRegistroDaTurma.dataAula ?? ultimoRegistroDaTurma.data ?? '—'}</span>
          </div>
          <div className="space-y-2">
            {ultimoRegistroDaTurma.resumoAula && <InfoRow icon="📋" label="O que foi feito" valor={ultimoRegistroDaTurma.resumoAula} />}
            {ultimoRegistroDaTurma.funcionouBem && <InfoRow icon="✅" label="Funcionou bem" valor={ultimoRegistroDaTurma.funcionouBem} />}
            {ultimoRegistroDaTurma.naoFuncionou && <InfoRow icon="❌" label="Não funcionou" valor={ultimoRegistroDaTurma.naoFuncionou} />}
            {(ultimoRegistroDaTurma as { poderiaMelhorar?: string }).poderiaMelhorar && (
              <InfoRow icon="💡" label="Poderia melhorar" valor={(ultimoRegistroDaTurma as { poderiaMelhorar?: string }).poderiaMelhorar!} />
            )}
            {ultimoRegistroDaTurma.proximaAula && (
              <InfoRow icon="➡️" label="Próxima aula sugerida" valor={ultimoRegistroDaTurma.proximaAula} destacado />
            )}
            {ultimoRegistroDaTurma.comportamento && <InfoRow icon="👥" label="Comportamento" valor={ultimoRegistroDaTurma.comportamento} />}
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
                  {r.resumoAula && <p className="text-xs text-slate-600 line-clamp-2">{r.resumoAula}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FORMULÁRIO INLINE SEMPRE ABERTO ─────────── */}
      <FormPlanejamentoInline
        key={`form-${turmaSelecionada.turmaId}-${planejamentoEditando?.id ?? 'new'}`}
        turmaSelecionada={turmaSelecionada}
        planejamentoEditando={planejamentoEditando}
        onSalvar={dados => { salvarPlanejamento(dados); fecharForm() }}
        onCancelarEdicao={fecharForm}
      />

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
