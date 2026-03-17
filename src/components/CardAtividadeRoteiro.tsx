import React, { memo } from 'react'
import TipTapEditor from './TipTapEditor'
import { showToast } from '../lib/toast'
import type { AtividadeRoteiro, Plano, Atividade } from '../types'

// ── Tipos locais ─────────────────────────────────────────────────────────────

export interface HashDropdown {
  query: string
  pos: { top: number; left: number }
  atividadeId: string
}

export interface CardAtividadeRoteiroProps {
  atividade: AtividadeRoteiro
  index: number
  isOpen: boolean
  atividadesCount: number

  // Drag-and-drop
  dragActiveIndex: number | null
  dragOverIndex: number | null
  dragFromHandle: React.MutableRefObject<boolean>
  onDragStart: (index: number) => void
  onDragEnter: (index: number) => void
  onDragEnd: () => void

  // Ações da atividade
  onToggle: (id: string | number) => void
  onFieldChange: (id: string | number, field: string, value: string) => void
  onRemove: (id: string | number) => void
  onMoveUp: () => void
  onMoveDown: () => void

  // Estado do plano (necessário para mutações internas do array)
  planoEditando: Plano
  setPlanoEditando: (p: Plano) => void

  // Autocomplete # de tags
  hashDropdown: HashDropdown | null
  setHashDropdown: (v: HashDropdown | null) => void
  todasAsTags: string[]

  // Callbacks externos
  onSaveAsStrategy: (text: string) => void
  onVincularMusica: (atividadeId: string | number) => void

  // Banco de atividades (para "salvar no banco")
  bancoAtividades: Atividade[]
  setBancoAtividades: (v: Atividade[]) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setModalConfirm: (v: any) => void
}

// ── Componente ────────────────────────────────────────────────────────────────

const CardAtividadeRoteiro = memo(function CardAtividadeRoteiro({
  atividade,
  index,
  isOpen,
  atividadesCount,
  dragActiveIndex,
  dragOverIndex,
  dragFromHandle,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onToggle,
  onFieldChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  planoEditando,
  setPlanoEditando,
  hashDropdown,
  setHashDropdown,
  todasAsTags,
  onSaveAsStrategy,
  onVincularMusica,
  bancoAtividades,
  setBancoAtividades,
  setModalConfirm,
}: CardAtividadeRoteiroProps) {

  // ── Helper: mutação imutável do array de atividades ──────────────────────
  const updateArr = (updater: (arr: AtividadeRoteiro[]) => AtividadeRoteiro[]) => {
    const arr = updater([...(planoEditando.atividadesRoteiro || [])])
    setPlanoEditando({ ...planoEditando, atividadesRoteiro: arr })
  }

  // ── Salvar atividade no Banco de Atividades ───────────────────────────────
  const saveToBank = () => {
    if (!atividade.nome?.trim()) { showToast('Nome obrigatório!', 'error'); return }
    const existe = bancoAtividades.find(
      a => a.nome.toLowerCase().trim() === atividade.nome.toLowerCase().trim()
    )
    if (existe) {
      setModalConfirm({
        titulo: 'Atividade já existe',
        conteudo: `"${atividade.nome}" já existe no Banco de Atividades.\n\nAtualizar?`,
        labelConfirm: 'Atualizar',
        onConfirm: () => {
          const atualizada = {
            ...existe,
            descricao: atividade.descricao || existe.descricao,
            duracao: atividade.duracao || existe.duracao,
            conceitos: [...new Set([...(existe.conceitos || []), ...(atividade.conceitos || [])])],
            tags: [...new Set([...(existe.tags || []), ...(atividade.tags || [])])],
            recursos: [...(existe.recursos || []), ...(atividade.recursos || [])].filter(
              (r, i, a) => a.findIndex(x => x.url === r.url) === i
            ),
            faixaEtaria: planoEditando.faixaEtaria || existe.faixaEtaria,
            escola: planoEditando.escola || existe.escola,
            unidade: planoEditando.unidades?.[0] || existe.unidade,
          }
          setBancoAtividades(bancoAtividades.map(a => a.id === existe.id ? atualizada : a))
          showToast('Atividade atualizada no Banco de Atividades!', 'success')
        },
      })
    } else {
      setBancoAtividades([...bancoAtividades, {
        id: Date.now(),
        nome: atividade.nome,
        descricao: atividade.descricao || '',
        duracao: atividade.duracao || '',
        conceitos: atividade.conceitos || [],
        tags: atividade.tags || [],
        recursos: atividade.recursos || [],
        materiais: [],
        faixaEtaria: planoEditando.faixaEtaria || [],
        escola: planoEditando.escola || '',
        unidade: planoEditando.unidades?.[0] || '',
      }])
      showToast('Atividade salva no Banco de Atividades!', 'success')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      data-activity-id={atividade.id}
      draggable
      onDragStart={(e) => {
        if (!dragFromHandle.current) { e.preventDefault(); return }
        onDragStart(index)
      }}
      onDragEnter={() => onDragEnter(index)}
      onDragEnd={() => { dragFromHandle.current = false; onDragEnd() }}
      onDragOver={e => e.preventDefault()}
      className={`rounded-2xl border overflow-visible transition-all
        ${isOpen ? 'border-indigo-200 dark:border-indigo-500/30' : 'border-slate-200 dark:border-[#374151]'}
        ${dragActiveIndex === index ? 'opacity-50' : ''}
        ${dragOverIndex === index && dragActiveIndex !== index ? 'border-indigo-400 dark:border-indigo-400' : ''}
        bg-white dark:bg-[var(--v2-card)]`}
    >

      {/* ── Header row (sempre visível) ── */}
      <div
        className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none
          ${isOpen ? 'border-b border-slate-100 dark:border-[#374151] rounded-t-2xl' : 'rounded-2xl hover:bg-slate-50 dark:hover:bg-white/[0.02]'}`}
        onClick={() => onToggle(atividade.id)}
      >

        {/* Drag handle desktop */}
        <span
          className="hidden sm:inline text-slate-300 dark:text-[#374151] hover:text-indigo-400 text-lg cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
          onPointerDown={e => { e.stopPropagation(); dragFromHandle.current = true }}
        >⠿</span>

        {/* Reordenação mobile — só ↑ ↓ */}
        <div className="flex sm:hidden gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            disabled={index === 0}
            onClick={onMoveUp}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-indigo-600 disabled:opacity-20 rounded-lg transition"
          >↑</button>
          <button
            type="button"
            disabled={index === atividadesCount - 1}
            onClick={onMoveDown}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-indigo-600 disabled:opacity-20 rounded-lg transition"
          >↓</button>
        </div>

        {/* Nome inline */}
        <input
          type="text"
          value={atividade.nome}
          onChange={e => onFieldChange(atividade.id, 'nome', e.target.value)}
          onClick={e => e.stopPropagation()}
          placeholder="Nome da atividade..."
          className={`flex-1 min-w-0 bg-transparent border-none outline-none text-sm font-semibold placeholder:font-normal cursor-text
            ${isOpen
              ? 'text-slate-800 dark:text-white placeholder:text-slate-400/60'
              : 'text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#4B5563]'}`}
        />

        {/* Duração inline */}
        <input
          type="text"
          value={atividade.duracao || ''}
          onChange={e => onFieldChange(atividade.id, 'duracao', e.target.value)}
          onClick={e => e.stopPropagation()}
          placeholder="Ex: 10 min"
          className={`w-[72px] text-right bg-transparent border-none outline-none text-xs font-semibold flex-shrink-0 cursor-text
            ${(atividade.duracao || '').trim()
              ? 'text-slate-500 dark:text-[#9CA3AF]'
              : 'text-slate-300 dark:text-[#374151]'}`}
        />

        {/* Deletar */}
        <button
          type="button"
          title="Remover atividade"
          onClick={e => { e.stopPropagation(); onRemove(atividade.id) }}
          className="w-7 h-7 flex items-center justify-center text-slate-300 dark:text-[#374151] hover:text-rose-500 dark:hover:text-rose-400 transition-colors rounded-lg flex-shrink-0 text-lg leading-none"
        >×</button>

        {/* Chevron */}
        <svg
          className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-slate-400' : 'text-slate-300 dark:text-[#374151]'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        ><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>

      </div>

      {/* ── Corpo expandido ── */}
      {isOpen && (
        <div className="px-4 pt-4 pb-5 space-y-4">

          {/* Rich text + autocomplete # */}
          <div className="relative">
            <TipTapEditor
              value={atividade.descricao}
              onChange={val => onFieldChange(atividade.id, 'descricao', val)}
              placeholder="Descreva como realizar esta atividade... (digite # para tags)"
              onHashTrigger={(query, pos) =>
                setHashDropdown({ query, pos, atividadeId: String(atividade.id) })
              }
              onHashCancel={() => setHashDropdown(null)}
              onSaveAsStrategy={onSaveAsStrategy}
            />
            {/* Dropdown de tags ao digitar # */}
            {hashDropdown && hashDropdown.atividadeId === String(atividade.id) && (() => {
              const filtradas = todasAsTags.filter(
                t => t.toLowerCase().startsWith(hashDropdown.query.toLowerCase())
              )
              if (filtradas.length === 0) return null
              return (
                <div
                  style={{ position: 'fixed', top: hashDropdown.pos.top + 4, left: hashDropdown.pos.left, zIndex: 9999 }}
                  className="bg-white dark:bg-[#1F2937] border border-amber-200 dark:border-amber-500/30 rounded-xl shadow-xl py-1 min-w-[140px]"
                >
                  {filtradas.slice(0, 8).map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onMouseDown={e => {
                        e.preventDefault()
                        const curr = planoEditando.atividadesRoteiro[index]
                        if (!(curr.tags || []).includes(tag)) {
                          updateArr(arr => {
                            arr[index] = { ...arr[index], tags: [...(arr[index].tags || []), tag] }
                            return arr
                          })
                        }
                        setHashDropdown(null)
                      }}
                      className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-400/10 transition-colors"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )
            })()}
          </div>

          {/* ── Meta row ── */}
          <div className="space-y-2.5">
            {/* Chips existentes */}
            {(
              (atividade.musicasVinculadas || []).length > 0 ||
              (atividade.estrategiasVinculadas || []).length > 0 ||
              (atividade.conceitos || []).length > 0 ||
              (atividade.tags || []).length > 0
            ) && (
              <div className="flex flex-wrap gap-1.5">
                {(atividade.musicasVinculadas || []).map((m, mi) => (
                  <span key={mi} className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-400/10 text-blue-600 dark:text-blue-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                    🎵 {m.titulo}
                    <button
                      type="button"
                      onClick={() => updateArr(arr => {
                        arr[index] = {
                          ...arr[index],
                          musicasVinculadas: (arr[index].musicasVinculadas || []).filter((_, i) => i !== mi),
                        }
                        return arr
                      })}
                      className="hover:text-rose-500 ml-0.5 leading-none"
                    >×</button>
                  </span>
                ))}
                {(atividade.estrategiasVinculadas || []).map((nome, ei) => (
                  <span key={ei} className="inline-flex items-center gap-1 bg-violet-50 dark:bg-violet-400/10 text-violet-600 dark:text-violet-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                    🧩 {nome}
                    <button
                      type="button"
                      onClick={() => updateArr(arr => {
                        arr[index] = {
                          ...arr[index],
                          estrategiasVinculadas: (arr[index].estrategiasVinculadas || []).filter((_, i) => i !== ei),
                        }
                        return arr
                      })}
                      className="hover:text-rose-500 ml-0.5 leading-none"
                    >×</button>
                  </span>
                ))}
                {(atividade.conceitos || []).map((c, ci) => (
                  <span key={ci} className="inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-400/10 text-purple-600 dark:text-purple-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                    🎓 {c}
                    <button
                      type="button"
                      onClick={() => updateArr(arr => {
                        arr[index] = {
                          ...arr[index],
                          conceitos: (arr[index].conceitos || []).filter((_, i) => i !== ci),
                        }
                        return arr
                      })}
                      className="hover:text-rose-500 ml-0.5 leading-none"
                    >×</button>
                  </span>
                ))}
                {(atividade.tags || []).map((t, ti) => (
                  <span key={ti} className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-400/10 text-amber-600 dark:text-amber-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                    #{t}
                    <button
                      type="button"
                      onClick={() => updateArr(arr => {
                        arr[index] = {
                          ...arr[index],
                          tags: (arr[index].tags || []).filter((_, i) => i !== ti),
                        }
                        return arr
                      })}
                      className="hover:text-rose-500 ml-0.5 leading-none"
                    >×</button>
                  </span>
                ))}
              </div>
            )}

            {/* Botões de adicionar */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <button
                type="button"
                onClick={() => onVincularMusica(atividade.id)}
                className="text-[11px] font-semibold text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >+ Música</button>
              <span className="text-slate-200 dark:text-[#374151] text-xs">·</span>
              <input
                type="text"
                placeholder="+ Conceito  Enter ↵"
                onKeyDown={(e) => {
                  const t = e.target as HTMLInputElement
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const val = t.value.trim()
                    if (val && !(atividade.conceitos || []).includes(val)) {
                      updateArr(arr => {
                        arr[index] = { ...arr[index], conceitos: [...(arr[index].conceitos || []), val] }
                        return arr
                      })
                      t.value = ''
                    }
                  }
                }}
                className="text-[11px] font-semibold text-purple-500 dark:text-purple-400 bg-transparent border-none outline-none placeholder:text-purple-400/70 dark:placeholder:text-purple-400/40 w-36"
              />
              <span className="text-slate-200 dark:text-[#374151] text-xs">·</span>
              <input
                type="text"
                placeholder="#tag  Enter ↵"
                onKeyDown={(e) => {
                  const t = e.target as HTMLInputElement
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const val = t.value.trim().replace(/^#/, '')
                    if (val && !(atividade.tags || []).includes(val)) {
                      updateArr(arr => {
                        arr[index] = { ...arr[index], tags: [...(arr[index].tags || []), val] }
                        return arr
                      })
                      t.value = ''
                    }
                  }
                }}
                className="text-[11px] font-semibold text-amber-500 dark:text-amber-400 bg-transparent border-none outline-none placeholder:text-amber-400/70 dark:placeholder:text-amber-400/40 w-24"
              />
              {/* Botão salvar no banco — visível em hover */}
              {atividade.nome?.trim() && (
                <>
                  <span className="text-slate-200 dark:text-[#374151] text-xs">·</span>
                  <button
                    type="button"
                    onClick={saveToBank}
                    className="text-[11px] font-semibold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    title="Salvar esta atividade no Banco de Atividades"
                  >💾 Banco</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default CardAtividadeRoteiro
