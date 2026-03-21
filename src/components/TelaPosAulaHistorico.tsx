import React, { useState } from 'react'
import { usePlanosContext } from '../contexts/PlanosContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import { useCalendarioContext } from '../contexts/CalendarioContext'

export default function TelaPosAulaHistorico() {
    const { planos } = usePlanosContext()
    const { anosLetivos } = useAnoLetivoContext()
    const { setModalRegistro, setRrData, setRrAnoSel, setRrEscolaSel,
        setRrTextos, setRrPlanosSegmento, setRrResultados, setRrRubricas, setRrEncaminhamentos,
        setRrTurmaId, setRrSegmentoId } = useCalendarioContext()

    const diasSemanaLabel = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const mesesLabel = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

    const todosRegistros = planos.flatMap(p =>
        (p.registrosPosAula || []).map(r => ({ ...r, planoTitulo: p.titulo, planoId: p.id }))
    )

    // Agrupa por data, ordenado do mais recente
    const porData = todosRegistros.reduce<Record<string, typeof todosRegistros>>((acc, r) => {
        if (!acc[r.data]) acc[r.data] = []
        acc[r.data].push(r)
        return acc
    }, {})
    const datas = Object.keys(porData).sort((a, b) => b.localeCompare(a))

    const [dataAberta, setDataAberta] = useState<string | null>(datas[0] ?? null)

    const labelData = (ds: string) => {
        const d = new Date(ds + 'T12:00:00')
        return `${diasSemanaLabel[d.getDay()]}, ${d.getDate()} de ${mesesLabel[d.getMonth()]}`
    }

    const nomeTurma = (r: any) => {
        const ano = anosLetivos.find(a => a.id == r.anoLetivo)
        const esc = ano?.escolas.find(e => e.id == r.escola)
        const seg = esc?.segmentos.find(s => s.id == (r.segmento || r.serie))
        const tur = seg?.turmas.find(t => t.id == r.turma)
        return tur?.nome || '?'
    }

    const nomeSeg = (r: any) => {
        const ano = anosLetivos.find(a => a.id == r.anoLetivo)
        const esc = ano?.escolas.find(e => e.id == r.escola)
        const seg = esc?.segmentos.find(s => s.id == (r.segmento || r.serie))
        return seg?.nome || '?'
    }

    const abrirRegistro = (r: any) => {
        setRrData(r.data)
        setRrAnoSel(r.anoLetivo)
        setRrEscolaSel(r.escola)
        setRrTextos({})
        setRrPlanosSegmento({})
        setRrResultados({})
        setRrRubricas({})
        setRrEncaminhamentos({})
        setRrTurmaId(String(r.turma))
        setRrSegmentoId(String(r.segmento || r.serie))
        setModalRegistro(true)
    }

    return (
        <div className="max-w-2xl mx-auto space-y-4 pb-24">

            {/* ── CABEÇALHO ── */}
            <div>
                <h1 className="text-[17px] font-bold tracking-tight text-slate-800 dark:text-[#E5E7EB]">Histórico</h1>
                <p className="text-[12.5px] text-slate-500 dark:text-[#9CA3AF] mt-0.5">Registros pós-aula anteriores</p>
            </div>

            {/* ── LISTA ── */}
            {datas.length === 0 ? (
                <div className="v2-card rounded-xl border border-[#E6EAF0] dark:border-[#374151] px-4 py-10 text-center space-y-1">
                    <p className="text-[13px] text-slate-400 dark:text-[#6b7280]">Nenhum registro encontrado.</p>
                    <p className="text-[12px] text-slate-300 dark:text-[#4B5563]">Os registros aparecerão aqui após a primeira aula registrada.</p>
                </div>
            ) : (
                <div className="v2-card rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)] overflow-hidden border border-[#E6EAF0] dark:border-[#374151]">
                    {datas.map((ds, i) => {
                        const regs = porData[ds]
                        const aberto = dataAberta === ds
                        return (
                            <div key={ds} className={i > 0 ? 'border-t border-[#E6EAF0] dark:border-[#374151]' : ''}>
                                {/* Linha de data */}
                                <button
                                    onClick={() => setDataAberta(aberto ? null : ds)}
                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition text-left">
                                    <span className="flex-1 text-[13px] font-medium text-slate-700 dark:text-[#E5E7EB]">
                                        {labelData(ds)}
                                    </span>
                                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                                        {regs.length} reg.
                                    </span>
                                    <span className="text-slate-300 dark:text-slate-600 text-xs ml-1">
                                        {aberto ? '▲' : '▼'}
                                    </span>
                                </button>

                                {/* Registros do dia */}
                                {aberto && (
                                    <div className="border-t border-[#F1F4F8] dark:border-[#374151]/60 divide-y divide-[#F1F4F8] dark:divide-[#374151]/60">
                                        {regs.map((r, j) => (
                                            <div key={j} className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                                                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-[12px] font-medium text-slate-600 dark:text-[#9CA3AF]">{nomeSeg(r)}</span>
                                                    <span className="text-slate-200 dark:text-slate-700 mx-1.5 text-xs">·</span>
                                                    <span className="text-[12px] text-slate-400 dark:text-[#6b7280]">{nomeTurma(r)}</span>
                                                </div>
                                                <button
                                                    onClick={() => abrirRegistro(r)}
                                                    style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        fontSize: '11px',
                                                        fontWeight: 500,
                                                        fontFamily: 'inherit',
                                                        cursor: 'pointer',
                                                        border: '1px solid #E6EAF0',
                                                        background: 'transparent',
                                                        color: '#64748b',
                                                        transition: 'all 120ms ease',
                                                    }}>
                                                    Ver
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
