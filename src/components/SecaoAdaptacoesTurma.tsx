import React, { useState } from 'react'
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
  const [filtro, setFiltro] = useState('')
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set())
  const [textoNota, setTextoNota] = useState('')
  const [salvouRecente, setSalvouRecente] = useState(false)

  // modo edição individual (a partir do botão "Editar" na lista)
  const [editandoNota, setEditandoNota] = useState<NotaAdaptacaoTurma | null>(null)
  const [textoEdicao, setTextoEdicao] = useState('')

  function abrirForm() {
    setFiltro('')
    setSelecionadas(new Set())
    setTextoNota('')
    setEditandoNota(null)
    setFormAberto(true)
  }

  function fecharForm() {
    setFormAberto(false)
    setFiltro('')
    setSelecionadas(new Set())
    setTextoNota('')
    setEditandoNota(null)
  }

  function toggleTurma(id: string) {
    setSelecionadas(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function salvar() {
    if (selecionadas.size === 0 || !textoNota.trim()) return
    selecionadas.forEach(turmaId => {
      const turma = turmasDisponiveis.find(t => t.id === turmaId)
      salvarNotaAdaptacao(planoId, {
        turmaId,
        turmaNome: turma?.nome ?? turmaId,
        texto: textoNota.trim(),
      })
    })
    setSelecionadas(new Set())
    setTextoNota('')
    setFiltro('')
    setSalvouRecente(true)
    setTimeout(() => setSalvouRecente(false), 1500)
  }

  function abrirEdicao(nota: NotaAdaptacaoTurma) {
    setEditandoNota(nota)
    setTextoEdicao(nota.texto)
    setFormAberto(false)
  }

  function salvarEdicao() {
    if (!editandoNota || !textoEdicao.trim()) return
    salvarNotaAdaptacao(planoId, {
      turmaId: editandoNota.turmaId,
      turmaNome: editandoNota.turmaNome,
      texto: textoEdicao.trim(),
    })
    setEditandoNota(null)
    setTextoEdicao('')
  }

  function cancelarEdicao() {
    setEditandoNota(null)
    setTextoEdicao('')
  }

  function remover(notaId: string) {
    removerNotaAdaptacao(planoId, notaId)
  }

  const turmasFiltradas = turmasDisponiveis.filter(t =>
    t.nome.toLowerCase().includes(filtro.toLowerCase())
  )
  const podeSalvar = selecionadas.size > 0 && textoNota.trim().length > 0
  const formVazio = selecionadas.size === 0 && !textoNota

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-600">
          Adaptações por turma
          {notas.length > 0 && (
            <span className="ml-2 text-xs font-normal text-slate-400">{notas.length}</span>
          )}
        </span>
        {!formAberto && !editandoNota && (
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
            <div key={nota.id} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              {editandoNota?.id === nota.id ? (
                /* inline edit */
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-violet-700">{nota.turmaNome}</p>
                  <textarea
                    value={textoEdicao}
                    onChange={e => setTextoEdicao(e.target.value)}
                    rows={3}
                    className="text-xs border border-violet-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={cancelarEdicao} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1">Cancelar</button>
                    <button type="button" onClick={salvarEdicao} disabled={!textoEdicao.trim()} className="text-xs font-semibold bg-violet-600 text-white px-3 py-1 rounded-lg disabled:opacity-40 hover:bg-violet-700 transition-colors">Atualizar</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-700">{nota.turmaNome}</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => abrirEdicao(nota)} className="text-xs text-slate-500 hover:text-slate-700">Editar</button>
                      <button type="button" onClick={() => remover(nota.id)} className="text-xs text-red-400 hover:text-red-600">Excluir</button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{nota.texto}</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form: multi-select + texto */}
      {formAberto && (
        <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 flex flex-col gap-2">
          {/* Filtro */}
          <input
            type="text"
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            placeholder="Filtrar turmas…"
            className="text-sm border border-violet-200 rounded-lg px-3 py-2 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />

          {/* Lista de checkboxes */}
          <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto border border-violet-100 rounded-lg bg-white p-1.5">
            {turmasFiltradas.length === 0 && (
              <p className="text-xs text-slate-400 px-2 py-1">Nenhuma turma encontrada.</p>
            )}
            {turmasFiltradas.map(t => {
              const jaTemNota = notas.some(n => n.turmaId === t.id)
              const marcada = selecionadas.has(t.id)
              return (
                <label
                  key={t.id}
                  className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer text-xs transition-colors ${marcada ? 'bg-violet-100 text-violet-800 font-medium' : 'text-slate-700 hover:bg-violet-50'}`}
                >
                  <input
                    type="checkbox"
                    checked={marcada}
                    onChange={() => toggleTurma(t.id)}
                    className="accent-violet-600 w-3.5 h-3.5 flex-shrink-0"
                  />
                  <span className="flex-1">{t.nome}</span>
                  {jaTemNota && <span className="text-violet-400 text-[10px]">já tem nota</span>}
                </label>
              )
            })}
          </div>

          {/* Contador de selecionadas */}
          {selecionadas.size > 0 && (
            <p className="text-xs text-violet-600 font-medium">
              {selecionadas.size} turma{selecionadas.size !== 1 ? 's' : ''} selecionada{selecionadas.size !== 1 ? 's' : ''}
            </p>
          )}

          {/* Textarea */}
          <textarea
            value={textoNota}
            onChange={e => setTextoNota(e.target.value)}
            rows={3}
            placeholder="O que muda nessas turmas? Ex: começar com atividade corporal, usar pandeiro em vez de palmas…"
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
              {formVazio ? 'Fechar' : 'Cancelar'}
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={!podeSalvar}
              className="text-xs font-semibold bg-violet-600 text-white px-4 py-1.5 rounded-lg disabled:opacity-40 hover:bg-violet-700 transition-colors"
            >
              {selecionadas.size > 1 ? `Salvar para ${selecionadas.size} turmas` : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {notas.length === 0 && !formAberto && !editandoNota && (
        <p className="text-xs text-slate-400 italic">
          Nenhuma adaptação registrada. Adicione uma nota para lembrar o que muda ao executar este plano em turmas diferentes.
        </p>
      )}
    </div>
  )
}
