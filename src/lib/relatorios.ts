// src/lib/relatorios.ts
// Helpers de agregação de dados para o módulo Relatórios.
// Todas as funções são puras — recebem dados, retornam resultados, sem efeitos colaterais.

import type { AplicacaoAula, Plano, AnoLetivo } from '../types'

// ─── Tipos de resultado ───────────────────────────────────────────────────────

export interface ItemContagem {
    id: string
    label: string
    count: number
}

export interface AulaLinha {
    data: string
    planoId: string
    planoTitulo: string
    status: string
}

export interface RelatorioMensalData {
    totalAulas: number
    totalTurmas: number
    totalPlanos: number
    totalRegistros: number
    planosUsados: ItemContagem[]
    conceitos: ItemContagem[]
    repertorio: ItemContagem[]
    turmas: ItemContagem[]
}

export interface RelatorioTurmaData {
    turmaNome: string
    totalAulas: number
    linhaDoTempo: AulaLinha[]
    conceitos: ItemContagem[]
    repertorio: ItemContagem[]
    planos: ItemContagem[]
}

export interface FiltrosPeriodo {
    inicio: string   // YYYY-MM-DD
    fim: string      // YYYY-MM-DD
    escolaId?: string
    segmentoId?: string
    turmaId?: string
    status?: AplicacaoAula['status']
}

export interface OpcaoFiltro { id: string; label: string }

// ─── Helpers de formatação ────────────────────────────────────────────────────

export function formatarData(data: string): string {
    if (!data || !data.includes('-')) return data
    const [y, m, d] = data.split('-')
    return `${d}/${m}/${y}`
}

// ─── Helpers de lookup ───────────────────────────────────────────────────────

/** Lista de escolas únicas (de todos os anos letivos). */
export function listarEscolas(anosLetivos: AnoLetivo[]): OpcaoFiltro[] {
    const visto = new Set<string>()
    const lista: OpcaoFiltro[] = []
    for (const ano of anosLetivos) {
        for (const escola of ano.escolas || []) {
            const id = String(escola.id)
            if (!visto.has(id)) {
                visto.add(id)
                lista.push({ id, label: escola.nome })
            }
        }
    }
    return lista
}

/** Lista de segmentos de uma escola (ou de todas se escolaId omitido). */
export function listarSegmentos(anosLetivos: AnoLetivo[], escolaId?: string): OpcaoFiltro[] {
    const visto = new Set<string>()
    const lista: OpcaoFiltro[] = []
    for (const ano of anosLetivos) {
        for (const escola of ano.escolas || []) {
            if (escolaId && String(escola.id) !== escolaId) continue
            for (const seg of escola.segmentos || []) {
                const id = String(seg.id)
                if (!visto.has(id)) {
                    visto.add(id)
                    lista.push({ id, label: seg.nome })
                }
            }
        }
    }
    return lista
}

/** Lista de turmas filtradas por escola e/ou segmento. */
export function listarTurmas(
    anosLetivos: AnoLetivo[],
    escolaId?: string,
    segmentoId?: string,
): OpcaoFiltro[] {
    const lista: OpcaoFiltro[] = []
    for (const ano of anosLetivos) {
        for (const escola of ano.escolas || []) {
            if (escolaId && String(escola.id) !== escolaId) continue
            for (const seg of escola.segmentos || []) {
                if (segmentoId && String(seg.id) !== segmentoId) continue
                for (const turma of seg.turmas || []) {
                    lista.push({
                        id: String(turma.id),
                        label: `${turma.nome} — ${seg.nome}`,
                    })
                }
            }
        }
    }
    return lista
}

/** Retorna o label legível de uma turma pelo id. */
export function getNomeTurma(turmaId: string, anosLetivos: AnoLetivo[]): string {
    return listarTurmas(anosLetivos).find(t => t.id === String(turmaId))?.label ?? turmaId
}

/** Retorna o plano pelo id ou null. */
function getPlano(planoId: string | number, planos: Plano[]): Plano | undefined {
    return planos.find(p => String(p.id) === String(planoId))
}

// ─── Filtros ──────────────────────────────────────────────────────────────────

/**
 * Filtra aplicações por período, turma e status.
 * Por padrão filtra apenas status 'realizada'.
 */
export function filtrarAplicacoes(
    aplicacoes: AplicacaoAula[],
    filtros: FiltrosPeriodo,
): AplicacaoAula[] {
    const status = filtros.status ?? 'realizada'
    return aplicacoes.filter(a => {
        if (a.status !== status) return false
        if (a.data < filtros.inicio || a.data > filtros.fim) return false
        if (filtros.escolaId    && String(a.escolaId)    !== filtros.escolaId)    return false
        if (filtros.segmentoId  && String(a.segmentoId)  !== filtros.segmentoId)  return false
        if (filtros.turmaId     && String(a.turmaId)     !== filtros.turmaId)     return false
        return true
    })
}

// ─── Agregações ──────────────────────────────────────────────────────────────

/** Total de aulas em uma lista de aplicações. */
export function contarAulas(aplicacoes: AplicacaoAula[]): number {
    return aplicacoes.length
}

/** Total de turmas únicas em uma lista de aplicações. */
export function contarTurmas(aplicacoes: AplicacaoAula[]): number {
    return new Set(aplicacoes.map(a => String(a.turmaId))).size
}

/** Total de planos únicos usados em uma lista de aplicações. */
export function contarPlanosUnicos(aplicacoes: AplicacaoAula[]): number {
    return new Set(aplicacoes.map(a => String(a.planoId))).size
}

/** Total de registros pós-aula dentro do período, em todos os planos. */
export function contarRegistrosPosAula(planos: Plano[], inicio: string, fim: string): number {
    let total = 0
    for (const plano of planos) {
        for (const reg of plano.registrosPosAula || []) {
            const data = reg.data || reg.dataAula || ''
            if (data >= inicio && data <= fim) total++
        }
    }
    return total
}

/**
 * Conta quantas vezes cada plano foi aplicado.
 * Retorna lista ordenada do mais ao menos usado.
 */
export function agregarPlanos(
    aplicacoes: AplicacaoAula[],
    planos: Plano[],
    limite = 10,
): ItemContagem[] {
    const contagem: Record<string, number> = {}
    for (const a of aplicacoes) {
        const k = String(a.planoId)
        contagem[k] = (contagem[k] ?? 0) + 1
    }
    return Object.entries(contagem)
        .map(([id, count]) => ({
            id,
            label: getPlano(id, planos)?.titulo ?? `Plano ${id}`,
            count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limite)
}

/**
 * Conta a frequência de cada conceito musical nos planos aplicados.
 * Retorna lista ordenada do mais ao menos frequente.
 */
export function agregarConceitos(
    aplicacoes: AplicacaoAula[],
    planos: Plano[],
    limite = 15,
): ItemContagem[] {
    const contagem: Record<string, number> = {}
    for (const a of aplicacoes) {
        const plano = getPlano(a.planoId, planos)
        for (const conceito of plano?.conceitos ?? []) {
            if (conceito?.trim()) {
                const k = conceito.trim()
                contagem[k] = (contagem[k] ?? 0) + 1
            }
        }
    }
    return Object.entries(contagem)
        .map(([label, count]) => ({ id: label, label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limite)
}

/**
 * Conta a frequência de cada música/repertório nos planos aplicados.
 * Agrega tanto `musicaVinculada` (string) quanto `musicasVinculadas` (array).
 * Retorna lista ordenada do mais ao menos frequente.
 */
export function agregarRepertorio(
    aplicacoes: AplicacaoAula[],
    planos: Plano[],
    limite = 15,
): ItemContagem[] {
    const contagem: Record<string, number> = {}

    function incrementar(titulo: string | undefined | null) {
        const t = titulo?.trim()
        if (t) contagem[t] = (contagem[t] ?? 0) + 1
    }

    for (const a of aplicacoes) {
        const plano = getPlano(a.planoId, planos)
        for (const at of plano?.atividadesRoteiro ?? []) {
            incrementar(at.musicaVinculada)
            for (const m of at.musicasVinculadas ?? []) {
                incrementar(m.titulo)
            }
        }
    }

    return Object.entries(contagem)
        .map(([label, count]) => ({ id: label, label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limite)
}

/**
 * Conta aulas realizadas por turma.
 * Retorna lista ordenada do mais ao menos atendido.
 */
export function agregarTurmas(
    aplicacoes: AplicacaoAula[],
    anosLetivos: AnoLetivo[],
): ItemContagem[] {
    const contagem: Record<string, number> = {}
    for (const a of aplicacoes) {
        const k = String(a.turmaId)
        contagem[k] = (contagem[k] ?? 0) + 1
    }
    return Object.entries(contagem)
        .map(([id, count]) => ({
            id,
            label: getNomeTurma(id, anosLetivos),
            count,
        }))
        .sort((a, b) => b.count - a.count)
}

/**
 * Monta linha do tempo cronológica de aulas de uma turma.
 */
export function buildLinhaDoTempo(
    aplicacoes: AplicacaoAula[],
    planos: Plano[],
): AulaLinha[] {
    return [...aplicacoes]
        .sort((a, b) => a.data.localeCompare(b.data))
        .map(a => ({
            data: a.data,
            planoId: String(a.planoId),
            planoTitulo: getPlano(a.planoId, planos)?.titulo ?? `Plano ${a.planoId}`,
            status: a.status,
        }))
}

// ─── Builders de relatório completo ──────────────────────────────────────────

/** Monta o relatório mensal geral a partir dos dados brutos. */
export function buildRelatorioMensal(
    aplicacoes: AplicacaoAula[],
    planos: Plano[],
    anosLetivos: AnoLetivo[],
    filtros: { inicio: string; fim: string; escolaId?: string; segmentoId?: string; turmaId?: string },
): RelatorioMensalData {
    const aplic = filtrarAplicacoes(aplicacoes, { ...filtros, status: 'realizada' })
    return {
        totalAulas:     contarAulas(aplic),
        totalTurmas:    contarTurmas(aplic),
        totalPlanos:    contarPlanosUnicos(aplic),
        totalRegistros: contarRegistrosPosAula(planos, filtros.inicio, filtros.fim),
        planosUsados:   agregarPlanos(aplic, planos),
        conceitos:      agregarConceitos(aplic, planos),
        repertorio:     agregarRepertorio(aplic, planos),
        turmas:         agregarTurmas(aplic, anosLetivos),
    }
}

/** Monta o relatório por turma a partir dos dados brutos. */
export function buildRelatorioTurma(
    aplicacoes: AplicacaoAula[],
    planos: Plano[],
    anosLetivos: AnoLetivo[],
    filtros: { inicio: string; fim: string; turmaId: string },
): RelatorioTurmaData {
    const aplic = filtrarAplicacoes(aplicacoes, { ...filtros, status: 'realizada' })
    return {
        turmaNome:    getNomeTurma(filtros.turmaId, anosLetivos),
        totalAulas:   contarAulas(aplic),
        linhaDoTempo: buildLinhaDoTempo(aplic, planos),
        conceitos:    agregarConceitos(aplic, planos),
        repertorio:   agregarRepertorio(aplic, planos),
        planos:       agregarPlanos(aplic, planos, 20),
    }
}
