import React, { useState, useEffect } from 'react'
import { NotaAdaptacaoTurma } from '../types'
import { usePlanosContext } from '../contexts/PlanosContext'

interface TurmaOpcao {
  id: string
  nome: string
}

interface Props {
  planoId: string | number
  notas: NotaAdaptacaoTurma[]
  turmasDisponiveis: TurmaOpcao[]
}

export default function SecaoAdaptacoesTurma({ planoId, notas, turmasDisponiveis }: Props) {
  const { salvarNotaAdaptacao, removerNotaAdaptacao } = usePlanosContext()

  const [formAberto, setFormAberto] = useState(false)
  const [turmaSelecionada, setTurmaSelecionada] = useState('')
  const [textoNota, setTextoNota] = useState('')
  const [editandoNota, setEditandoNota] = useState<NotaAdaptacaoTurma | null>(null)
  const [salvouRecente, setSalvouRecente] = useState(false)

  // Quando a turma muda no dropdown: pré-preenche se já existe nota
  useEffect(() => {
    if (!turmaSelecionada) {
      setTextoNota('')
      setEditandoNota(null)
      return
    }
    const existente = notas.find(n => n.turmaId === turmaSelecionada)
    if (existente) {
      setTextoNota(existente.texto)
      setEditandoNota(existente)
    } else {
      setTextoNota('')
      setEditandoNota(null)
    }
  }, [turmaSelecionada, notas])

  function abrirForm() {
    setTurmaSelecionada('')
    setTextoNota('')
    setEditandoNota(null)
    setFormAberto(true)
  }

  function fecharForm() {
    setFormAberto(false)
    setTurmaSelecionada('')
    setTextoNota('')
    setEditandoNota(null)
  }

  function abrirEdicao(nota: NotaAdaptacaoTurma) {
    setTurmaSelecionada(nota.turmaId)
    setTextoNota(nota.texto)
    setEditandoNota(nota)
    setFormAberto(true)
  }

  function salvar() {
    if (!turmaSelecionada || !textoNota.trim()) return
    const turma = turmasDisponiveis.find(t => t.id === turmaSelecionada)
    salvarNotaAdaptacao(planoId, {
      turmaId: turmaSelecionada,
      turmaNome: turma?.nome ?? turmaSelecionada,
      texto: textoNota.trim(),
    })
    // Mantém o form aberto para adicionar outra turma; apenas reseta os campos
    setTurmaSelecionada('')
    setTextoNota('')
    setEditandoNota(null)
    setSalvouRecente(true)
    setTimeout(() => setSalvouRecente(false), 1500)
  }

  function remover(notaId: string) {
    removerNotaAdaptacao(planoId, notaId)
  }

  const podeSalvar = turmaSelecionada.length > 0 && textoNota.trim().length > 0

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      {/* Cabeçalho da seção */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-600">
          Adaptações por turma
          {notas.length > 0 && (
            <span className="ml-2 text-xs font-normal text-slate-400">{notas.length}</span>
          )}
        </span>
        {!formAberto && (
          <button
            type="button"
            onClick={abrirForm}
            className="text-xs text-violet-600 hover:text-violet-800 font-medium"
          >
            + Adicionar
          </button>
        )}
      </div>

      {/* Lista de notas existentes */}
      {notas.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {notas.map(nota => (
            <div
              key={nota.id}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  {nota.turmaNome}
                  <span className="text-slate-400 font-normal">✎</span>
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => abrirEdicao(nota)}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => remover(nota.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Excluir
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                {nota.texto}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Mini-form inline */}
      {formAberto && (
        <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 flex flex-col gap-2">
          {/* Label de estado */}
          {editandoNota && (
            <p className="text-xs font-semibold text-violet-700">
              Editando nota existente — {editandoNota.turmaNome}
            </p>
          )}

          {/* Dropdown de turma — desabilitado quando editando a partir da lista */}
          <select
            value={turmaSelecionada}
            onChange={e => setTurmaSelecionada(e.target.value)}
            disabled={!!editandoNota}
            className="text-sm border border-violet-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">Selecionar turma…</option>
            {turmasDisponiveis.map(t => {
              const jaTemNota = notas.some(n => n.turmaId === t.id)
              return (
                <option key={t.id} value={t.id}>
                  {t.nome}{jaTemNota ? ' ✎' : ''}
                </option>
              )
            })}
          </select>

          {/* Textarea */}
          <textarea
            value={textoNota}
            onChange={e => setTextoNota(e.target.value)}
            rows={3}
            placeholder="O que muda nesta turma? Ex: começar com atividade corporal, usar pandeiro em vez de palmas…"
            className="text-sm border border-violet-200 rounded-lg px-3 py-2 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
          />

          {/* Ações */}
          <div className="flex gap-2 justify-end items-center">
            {salvouRecente && (
              <span className="text-xs text-emerald-600 font-medium">✓ Salvo</span>
            )}
            <button
              type="button"
              onClick={fecharForm}
              className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5"
            >
              {!turmaSelecionada && !textoNota ? 'Fechar' : 'Cancelar'}
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={!podeSalvar}
              className="text-xs font-semibold bg-violet-600 text-white px-4 py-1.5 rounded-lg disabled:opacity-40 hover:bg-violet-700 transition-colors"
            >
              {editandoNota ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {notas.length === 0 && !formAberto && (
        <p className="text-xs text-slate-400 italic">
          Nenhuma adaptação registrada. Adicione uma nota para lembrar o que muda ao executar este plano em turmas diferentes.
        </p>
      )}
    </div>
  )
}
