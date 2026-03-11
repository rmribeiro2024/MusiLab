// ModalInserirEmSequencia.tsx
// Permite inserir um plano em uma sequência existente ou criar nova

import React, { useState } from 'react'
import { useSequenciasContext } from '../../contexts/SequenciasContext'
import { usePlanosContext, useAnoLetivoContext, useRepertorioContext } from '../../contexts'
import type { Plano } from '../../types'

interface Props {
  plano: Plano
  onClose: () => void
}

export default function ModalInserirEmSequencia({ plano, onClose }: Props) {
  const { sequencias, setSequencias, novaSequencia, setSequenciaEditando } = useSequenciasContext()
  const { planos } = usePlanosContext()
  const { anosLetivos } = useAnoLetivoContext()
  const { setViewMode } = useRepertorioContext()
  const [aberta, setAberta] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  const jaIncluidoEm = (seqId: string) =>
    sequencias.find(s => s.id === seqId)?.slots?.some(sl => String(sl.planoVinculado) === String(plano.id)) ?? false

  function inserir(seqId: string, slotIndex: number) {
    setSequencias(prev => prev.map(seq => {
      if (seq.id !== seqId) return seq
      const novosSlots = [...seq.slots]
      novosSlots[slotIndex] = {
        ...novosSlots[slotIndex],
        planoVinculado: String(plano.id),
        rascunho: { titulo: '', setlist: [], materiais: [] }
      }
      return { ...seq, slots: novosSlots }
    }))
    setSucesso(seqId)
    setTimeout(() => { setSucesso(null); onClose() }, 900)
  }

  function criarNovaEInserir() {
    // Cria nova sequência e abre editor de sequências
    novaSequencia(anosLetivos)
    setViewMode('sequencias')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[82vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-slate-800 text-base">Inserir em Sequência</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[300px]">📋 {plano.titulo}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition text-lg">✕</button>
        </div>

        {/* Lista de Sequências */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {sequencias.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <p className="text-4xl mb-2">🎵</p>
              <p className="text-sm font-medium">Nenhuma sequência criada ainda.</p>
              <p className="text-xs mt-1">Crie uma sequência para organizar seus planos em aulas.</p>
            </div>
          ) : sequencias.map(seq => {
            const jaEsta = jaIncluidoEm(seq.id)
            const estaAberta = aberta === seq.id
            const estaInserindo = sucesso === seq.id
            const slots = seq.slots || []
            const slotsVazios = slots.filter(s => !s.planoVinculado).length

            return (
              <div key={seq.id} className={`border rounded-xl overflow-hidden transition-all ${
                estaInserindo ? 'border-emerald-400 bg-emerald-50' :
                jaEsta ? 'border-emerald-200 bg-emerald-50/50' :
                'border-slate-200'
              }`}>
                {/* Linha da Sequência */}
                <button
                  onClick={() => setAberta(estaAberta ? null : seq.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${estaAberta ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}
                >
                  <span className="text-xl shrink-0">🎵</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">{seq.titulo || 'Sem título'}</p>
                    <p className="text-xs text-slate-400">
                      {slots.length} aula{slots.length !== 1 ? 's' : ''} · {slotsVazios} disponível{slotsVazios !== 1 ? 'is' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {estaInserindo && <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold">✓ Inserido!</span>}
                    {jaEsta && !estaInserindo && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">✓ Já consta</span>}
                    {slotsVazios === 0 && !jaEsta && <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">Cheio</span>}
                    <span className={`text-slate-400 text-xs transition-transform ${estaAberta ? 'rotate-180' : ''}`} style={{display:'inline-block'}}>▾</span>
                  </div>
                </button>

                {/* Slots expandidos */}
                {estaAberta && (
                  <div className="border-t border-slate-100 px-4 pb-3 pt-2 space-y-1">
                    {slots.length === 0 ? (
                      <p className="text-xs text-slate-400 py-1 text-center italic">Nenhuma aula configurada nesta sequência.</p>
                    ) : slots.map((slot, i) => {
                      const planoDoSlot = slot.planoVinculado ? planos.find(p => String(p.id) === String(slot.planoVinculado)) : null
                      const ehEsteNesseSlot = String(slot.planoVinculado) === String(plano.id)
                      return (
                        <button
                          key={i}
                          onClick={() => !slot.planoVinculado ? inserir(seq.id, i) : undefined}
                          disabled={!!slot.planoVinculado}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-left transition ${
                            ehEsteNesseSlot ? 'bg-emerald-100 text-emerald-800 cursor-default' :
                            slot.planoVinculado ? 'bg-slate-50 text-slate-400 cursor-not-allowed' :
                            'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer font-semibold'
                          }`}
                        >
                          <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${
                            ehEsteNesseSlot ? 'bg-emerald-500 text-white' :
                            slot.planoVinculado ? 'bg-slate-200 text-slate-500' :
                            'bg-indigo-600 text-white'
                          }`}>{i + 1}</span>
                          <span className="flex-1 truncate">
                            {ehEsteNesseSlot ? '✓ Este plano' :
                             planoDoSlot ? planoDoSlot.titulo :
                             '+ Inserir nesta posição'}
                          </span>
                          {!slot.planoVinculado && <span className="shrink-0 text-indigo-400">→</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 shrink-0">
          <button
            onClick={criarNovaEInserir}
            className="w-full py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-semibold text-sm hover:bg-indigo-100 transition flex items-center justify-center gap-2"
          >
            <span className="text-base">＋</span> Criar nova sequência
          </button>
        </div>
      </div>
    </div>
  )
}
