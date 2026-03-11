// src/lib/detectarMusicas.ts
// Detecção e classificação de músicas citadas no texto de um plano de aula.
// Sem IA — matching por string normalizada em 2 fases.

import type { Plano, Musica, VinculoMusicaPlano } from '../types'

// ── Normalização ──────────────────────────────────────────────────────────────
function normalizar(texto: string): string {
    return texto
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
        .replace(/<[^>]*>/g, ' ')                          // remove HTML
        .replace(/[^a-z0-9\s]/g, ' ')                     // remove pontuação
        .replace(/\s+/g, ' ')
        .trim()
}

// ── Extração de blocos de texto do plano ──────────────────────────────────────
function extrairTextosPlano(plano: Plano): Array<{ texto: string; origem: string }> {
    const blocos: Array<{ texto: string; origem: string }> = []

    if (plano.titulo?.trim())
        blocos.push({ texto: plano.titulo, origem: 'título do plano' })

    if (plano.avaliacaoObservacoes?.trim())
        blocos.push({ texto: plano.avaliacaoObservacoes, origem: 'observações' })

    if (plano.metodologia?.trim())
        blocos.push({ texto: plano.metodologia, origem: 'metodologia' })

    for (let i = 0; i < (plano.atividadesRoteiro || []).length; i++) {
        const a = plano.atividadesRoteiro[i]
        const n = i + 1
        if (a.nome?.trim())
            blocos.push({ texto: a.nome, origem: `atividade ${n}` })
        if (a.descricao?.trim())
            blocos.push({ texto: a.descricao, origem: `descrição da atividade ${n}` })
        for (const r of a.recursos || []) {
            if (r.url?.trim())
                blocos.push({ texto: r.url, origem: `recurso da atividade ${n}` })
        }
    }

    for (const obj of plano.objetivosEspecificos || []) {
        if (obj?.trim()) blocos.push({ texto: obj, origem: 'objetivos específicos' })
    }

    return blocos
}

// ── Fase 2: extração de strings entre aspas ───────────────────────────────────
// Captura texto entre " ", « » ou ' ' com 4–60 caracteres.
const RE_CITACAO = /"([^"]{4,60})"|«([^»]{4,60})»|'([^']{4,60})'/g

function extrairCitacoes(plano: Plano): Array<{ titulo: string; origem: string }> {
    const blocos = extrairTextosPlano(plano)
    const citacoes: Array<{ titulo: string; origem: string }> = []
    for (const bloco of blocos) {
        // Remove HTML antes de rodar o regex — evita capturar atributos style="..." como títulos
        const textoLimpo = bloco.texto.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
        RE_CITACAO.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = RE_CITACAO.exec(textoLimpo)) !== null) {
            const titulo = (m[1] || m[2] || m[3]).trim()
            if (titulo) citacoes.push({ titulo, origem: bloco.origem })
        }
    }
    return citacoes
}

// ── Tipos de resultado ────────────────────────────────────────────────────────
/**
 * Classificação do vínculo detectado:
 * - 'encontrada' : um único match forte no repertório
 * - 'ambigua'    : múltiplas correspondências possíveis (professor deve escolher)
 * - 'nova'       : citada entre aspas mas não existe no repertório
 */
export type ClassificacaoMusica = 'encontrada' | 'ambigua' | 'nova'

export interface MusicaDetectada {
    /** Título como aparece no plano (raw, sem normalização) */
    tituloDetectado: string
    /** Onde foi citada no plano (ex: "descrição da atividade 2") */
    origem: string
    classificacao: ClassificacaoMusica
    /** Preenchida quando classificacao === 'encontrada' */
    musica?: Musica
    /** Preenchidas quando classificacao === 'ambigua' */
    candidatas?: Musica[]
    /** Já presente em musicasVinculadasPlano ou em alguma atividade do plano */
    jaVinculada: boolean
}

// ── helpers internos ──────────────────────────────────────────────────────────
function buildVinculadasSet(plano: Plano): Set<string> {
    const set = new Set<string>()
    // vínculo plano-level (novo)
    for (const v of plano.musicasVinculadasPlano || []) {
        set.add(normalizar(v.titulo || ''))
    }
    // vínculo por atividade (legado)
    for (const a of plano.atividadesRoteiro || []) {
        for (const m of (a.musicasVinculadas as VinculoMusicaPlano[] | undefined) || []) {
            set.add(normalizar(m.titulo || ''))
        }
    }
    set.delete('')
    return set
}

// ── Detecção principal ────────────────────────────────────────────────────────
export function detectarMusicasNoPlano(plano: Plano, repertorio: Musica[]): MusicaDetectada[] {
    const vinculadasNorm = buildVinculadasSet(plano)
    const blocos = extrairTextosPlano(plano)
    const textosNorm = blocos.map(b => ({ norm: normalizar(b.texto), origem: b.origem }))

    // ── FASE 1: títulos do repertório encontrados no texto ────────────────────
    interface MatchRep { musica: Musica; norm: string; origem: string }
    const matchesRep: MatchRep[] = []

    for (const musica of repertorio) {
        if (!musica.titulo?.trim()) continue
        const norm = normalizar(musica.titulo)
        if (norm.length <= 3) continue

        for (const t of textosNorm) {
            if (t.norm.includes(norm)) {
                matchesRep.push({ musica, norm, origem: t.origem })
                break
            }
        }
    }

    // ── Agrupar por sobreposição de títulos ───────────────────────────────────
    // Dois matches "colidem" quando um título é substring do outro — indicando
    // que podem se referir à mesma menção no texto.
    const resultados: MusicaDetectada[] = []
    const processadosNorm = new Set<string>()

    for (let i = 0; i < matchesRep.length; i++) {
        const a = matchesRep[i]
        if (processadosNorm.has(a.norm)) continue

        const grupo = matchesRep.filter(b =>
            a.norm.includes(b.norm) || b.norm.includes(a.norm)
        )

        if (grupo.length === 1) {
            resultados.push({
                tituloDetectado: a.musica.titulo,
                origem: a.origem,
                classificacao: 'encontrada',
                musica: a.musica,
                jaVinculada: vinculadasNorm.has(a.norm),
            })
        } else {
            // Ambígua — usar o título mais longo como representante
            const rep = grupo.reduce((acc, m) => m.norm.length > acc.norm.length ? m : acc)
            resultados.push({
                tituloDetectado: rep.musica.titulo,
                origem: rep.origem,
                classificacao: 'ambigua',
                candidatas: grupo.map(m => m.musica),
                jaVinculada: grupo.some(m => vinculadasNorm.has(m.norm)),
            })
        }

        for (const m of grupo) processadosNorm.add(m.norm)
    }

    // ── FASE 2: citações entre aspas não cobertas pelo repertório ─────────────
    const normsTodosRepertorio = new Set(
        repertorio.map(m => normalizar(m.titulo || '')).filter(Boolean)
    )
    const citacoesProcessadas = new Set<string>()

    for (const cit of extrairCitacoes(plano)) {
        const norm = normalizar(cit.titulo)
        if (norm.length <= 3) continue
        if (citacoesProcessadas.has(norm)) continue

        // Já coberta por match do repertório?
        const coberta = [...processadosNorm].some(
            rep => rep.includes(norm) || norm.includes(rep)
        )
        if (coberta) continue

        // Está no repertório? (título exato mas não foi encontrado no texto — edge case)
        if (normsTodosRepertorio.has(norm)) continue

        resultados.push({
            tituloDetectado: cit.titulo,
            origem: cit.origem,
            classificacao: 'nova',
            jaVinculada: false,
        })
        citacoesProcessadas.add(norm)
    }

    return resultados
}
