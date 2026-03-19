import React, { useState } from 'react'
import { useAnoLetivoContext, useCalendarioContext } from '../../contexts'
import { useBancoPlanos } from '../BancoPlanosContext'

const TOGGLE_KEY = 'musilab_detectar_musicas_ao_salvar'

export default function ModalConfiguracoes() {
    const { modalConfiguracoes, setModalConfiguracoes, baixarBackup, restaurarBackup, autoBackupAtivo, configurarAutoBackup, desativarAutoBackup, salvarAutoBackupAgora } = useBancoPlanos()
    const [detectarMusicas, setDetectarMusicas] = useState(() => localStorage.getItem(TOGGLE_KEY) !== 'false')

    function toggleDetectarMusicas() {
        const novo = !detectarMusicas
        setDetectarMusicas(novo)
        localStorage.setItem(TOGGLE_KEY, String(novo))
    }
    const { anosLetivos, setModalTurmas } = useAnoLetivoContext()
    const { setModalGradeSemanal } = useCalendarioContext()

    if (!modalConfiguracoes) return null

    return (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={() => setModalConfiguracoes(false)}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm max-h-[90vh] overflow-y-auto overscroll-y-contain" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex justify-between items-center px-5 pt-5 pb-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-base font-semibold text-slate-800">Configurações</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Ano letivo, turmas e dados</p>
                    </div>
                    <button
                        onClick={() => setModalConfiguracoes(false)}
                        className="text-slate-300 hover:text-slate-500 text-xl leading-none transition"
                    >
                        ×
                    </button>
                </div>

                {/* Itens */}
                <div className="p-4 space-y-1">

                    <ConfigItem
                        accent="border-blue-300"
                        label="Ano Letivo & Escolas"
                        desc={`${anosLetivos.length} ano${anosLetivos.length !== 1 ? 's' : ''} cadastrado${anosLetivos.length !== 1 ? 's' : ''}`}
                        onAction={() => { setModalConfiguracoes(false); setModalTurmas(true) }}
                    />

                    <ConfigItem
                        accent="border-emerald-300"
                        label="Turmas & Horários"
                        desc="Configure suas turmas por escola"
                        onAction={() => { setModalConfiguracoes(false); setModalTurmas(true) }}
                    />

                    <ConfigItem
                        accent="border-violet-300"
                        label="Grade Semanal"
                        desc="Horários fixos por escola e semana"
                        onAction={() => { setModalConfiguracoes(false); setModalGradeSemanal(true) }}
                    />

                    {/* Backup */}
                    <div className="border-l-2 border-amber-300 pl-3 py-3">
                        <p className="text-sm font-semibold text-slate-700 mb-0.5">Backup & Restauração</p>
                        <p className="text-xs text-slate-400 mb-2">Salve ou recupere todos os dados</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { baixarBackup(); setModalConfiguracoes(false) }}
                                className="flex-1 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 py-1.5 rounded-lg text-xs font-semibold transition"
                            >
                                Baixar backup
                            </button>
                            <label className="flex-1 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 py-1.5 rounded-lg text-xs font-semibold text-center cursor-pointer transition">
                                Restaurar
                                <input type="file" accept=".json" onChange={e => { restaurarBackup(e); setModalConfiguracoes(false) }} className="hidden" />
                            </label>
                        </div>
                    </div>

                    {/* Detecção de músicas */}
                    <div className="border-l-2 border-blue-200 pl-3 py-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-700 mb-0.5">Detectar músicas ao salvar</p>
                            <p className="text-xs text-slate-400">Sugere adicionar ao repertório músicas encontradas no plano</p>
                        </div>
                        <button
                            onClick={toggleDetectarMusicas}
                            className={`shrink-0 mt-0.5 w-9 h-5 rounded-full transition-colors relative ${detectarMusicas ? 'bg-indigo-500' : 'bg-slate-200'}`}
                            aria-checked={detectarMusicas}
                            role="switch"
                        >
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${detectarMusicas ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                    </div>

                    {/* Auto-backup local */}
                    <div className="border-l-2 border-slate-300 pl-3 py-3">
                        <p className="text-sm font-semibold text-slate-700 mb-0.5">
                            Backup automático local
                            {autoBackupAtivo && <span className="ml-2 text-xs font-normal text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">ativo</span>}
                        </p>
                        <p className="text-xs text-slate-400 mb-2">
                            {autoBackupAtivo
                                ? 'Dados salvos automaticamente ao fechar o app.'
                                : 'Salva no PC ao fechar o app — sem depender da internet.'}
                        </p>
                        {autoBackupAtivo ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={salvarAutoBackupAgora}
                                    className="flex-1 border border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 text-emerald-700 py-1.5 rounded-lg text-xs font-semibold transition"
                                >
                                    Salvar agora
                                </button>
                                <button
                                    onClick={desativarAutoBackup}
                                    className="flex-1 border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-500 hover:text-red-600 py-1.5 rounded-lg text-xs font-semibold transition"
                                >
                                    Desativar
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={configurarAutoBackup}
                                className="w-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 py-1.5 rounded-lg text-xs font-semibold transition"
                            >
                                Configurar
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </div>
    )
}

function ConfigItem({ accent, label, desc, onAction }: {
    accent: string
    label: string
    desc: string
    onAction: () => void
}) {
    return (
        <div className={`border-l-2 ${accent} pl-3 py-2 flex items-center justify-between gap-4`}>
            <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700">{label}</p>
                <p className="text-xs text-slate-400">{desc}</p>
            </div>
            <button
                onClick={onAction}
                className="shrink-0 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
            >
                Gerenciar
            </button>
        </div>
    )
}
