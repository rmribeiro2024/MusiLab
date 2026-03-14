// src/components/modals/ModalEstrategiaDetectada.tsx
// Modal pós-save: sugere salvar uma sequência detectada como estratégia reutilizável.
// Só aparece quando a IA detecta aquecimento_corporal ou vocalizes com alta confiança.

import React, { useState } from 'react'
import { usePlanosContext } from '../../contexts/PlanosContext'
import { useEstrategiasContext } from '../../contexts/EstrategiasContext'

const LABELS: Record<string, { titulo: string; descricao: string; dimensoes: string[] }> = {
    aquecimento_corporal: {
        titulo: 'Aquecimento Corporal',
        descricao: 'Sequência de preparação física detectada neste plano.',
        dimensoes: ['Condução'],
    },
    vocalizes: {
        titulo: 'Vocalizes / Aquecimento Vocal',
        descricao: 'Sequência de aquecimento vocal detectada neste plano.',
        dimensoes: ['Condução', 'Musical'],
    },
}

export default function ModalEstrategiaDetectada() {
    const { estrategiaDetectadaIA, showModalEstrategiaIA, setShowModalEstrategiaIA, planos } = usePlanosContext()
    const { estrategias, setEstrategias, registrarUsoEstrategia } = useEstrategiasContext()

    const [nome, setNome] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [salvo, setSalvo] = useState(false)

    // Sincroniza nome sugerido quando modal abre
    React.useEffect(() => {
        if (showModalEstrategiaIA && estrategiaDetectadaIA) {
            setNome(estrategiaDetectadaIA.nomeSugerido)
            setSalvo(false)
        }
    }, [showModalEstrategiaIA, estrategiaDetectadaIA])

    if (!showModalEstrategiaIA || !estrategiaDetectadaIA) return null

    const meta = LABELS[estrategiaDetectadaIA.tipo]

    function fechar() {
        setShowModalEstrategiaIA(false)
    }

    function salvarComoEstrategia() {
        if (!nome.trim()) return
        setSalvando(true)

        const nomeTrim = nome.trim()
        const nomeNorm = nomeTrim.toLowerCase()
        const agora = new Date().toISOString()

        // Achar título do plano vinculado
        const planoId = estrategiaDetectadaIA!.planoId
        const planoTitulo = (planos as any[]).find(p => String(p.id) === String(planoId))?.titulo || 'Plano detectado'

        const novoHistorico: { planoId: string | number; planoTitulo: string; data: string } = {
            planoId,
            planoTitulo,
            data: agora,
        }

        // Verifica se já existe estratégia com nome igual (case-insensitive)
        const existente = estrategias.find(e => e.nome.trim().toLowerCase() === nomeNorm)

        if (existente) {
            // Registrar uso na estratégia existente (sem criar duplicata)
            registrarUsoEstrategia(existente.id, planoId, planoTitulo)
        } else {
            // Criar nova estratégia com historicoUso já populado
            const novaEstrategia = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                nome: nomeTrim,
                descricao: meta.descricao,
                dimensoes: meta.dimensoes,
                categoria: meta.titulo,
                ativo: true,
                contadorUso: 1,
                historicoUso: [novoHistorico],
                _criadoEm: agora,
            }
            setEstrategias(prev => [...prev, novaEstrategia])
        }

        setSalvando(false)
        setSalvo(true)
        setTimeout(fechar, 1800)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/40" onClick={fechar} />
            <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 z-10">

                {/* Ícone + título */}
                <div className="flex items-start gap-3 mb-4">
                    <span className="text-2xl">✨</span>
                    <div>
                        <p className="text-xs font-bold text-violet-500 uppercase tracking-widest mb-0.5">
                            Sequência detectada pela IA
                        </p>
                        <p className="text-sm font-semibold text-slate-800">
                            {meta.titulo}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Detectei uma sequência de {meta.titulo.toLowerCase()} neste plano.
                            Quer salvar como estratégia reutilizável?
                        </p>
                    </div>
                </div>

                {/* Dimensões */}
                <div className="flex gap-1.5 mb-4">
                    {meta.dimensoes.map(d => (
                        <span key={d} className="text-[11px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                            {d}
                        </span>
                    ))}
                </div>

                {/* Nome editável */}
                {!salvo && (
                    <div className="mb-4">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                            Nome da estratégia
                        </label>
                        <input
                            type="text"
                            value={nome}
                            onChange={e => setNome(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-violet-400 outline-none"
                            placeholder="Nome da estratégia..."
                            autoFocus
                        />
                    </div>
                )}

                {/* Feedback de sucesso */}
                {salvo && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mb-4">
                        <span className="text-emerald-600">✅</span>
                        <p className="text-sm text-emerald-700 font-medium">
                            Estratégia salva no banco!
                        </p>
                    </div>
                )}

                {/* Botões */}
                {!salvo && (
                    <div className="flex gap-2">
                        <button
                            onClick={fechar}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">
                            Ignorar
                        </button>
                        <button
                            onClick={salvarComoEstrategia}
                            disabled={!nome.trim() || salvando}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {salvando ? 'Salvando...' : '+ Salvar como estratégia'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
