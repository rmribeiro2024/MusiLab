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
        .replace(/\([^)]*\)/g, ' ')                        // remove conteúdo entre parênteses (ex: indicações, dinâmicas)
        .replace(/[^a-z0-9\s]/g, ' ')                     // remove pontuação restante
        .replace(/\s+/g, ' ')
        .trim()
}

// ── Extração de títulos de embeds de mídia (YouTube/Spotify) do HTML ──────────
// O TipTapEditor substitui URLs por: <a href="URL">▶ Título</a> (YouTube) ou <a href="URL">🎵 Título</a> (Spotify)
// Spotify → sempre música. YouTube → pode ser qualquer coisa; só detectar se estiver no repertório.
const RE_SPOTIFY_LINK = /<a[^>]+href="https?:\/\/open\.spotify\.com[^"]*"[^>]*>🎵\s*([^<]+)<\/a>/gi
const RE_YOUTUBE_LINK = /<a[^>]+href="https?:\/\/(?:(?:www\.)?youtu(?:\.be|be\.com))[^"]*"[^>]*>▶\s*([^<]+)<\/a>/gi

function extrairTitulosMediaHTML(html: string, origem: string): Array<{ titulo: string; kind: 'spotify' | 'youtube' }> {
    const titulos: Array<{ titulo: string; kind: 'spotify' | 'youtube' }> = []
    RE_SPOTIFY_LINK.lastIndex = 0
    RE_YOUTUBE_LINK.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = RE_SPOTIFY_LINK.exec(html)) !== null) {
        const titulo = m[1].trim()
        if (titulo && titulo !== 'Spotify') titulos.push({ titulo, kind: 'spotify' })
    }
    while ((m = RE_YOUTUBE_LINK.exec(html)) !== null) {
        const titulo = m[1].trim()
        if (titulo && titulo !== 'YouTube') titulos.push({ titulo, kind: 'youtube' })
    }
    return titulos
}

// ── Extração de blocos de texto do plano ──────────────────────────────────────
function extrairTextosPlano(plano: Plano): Array<{ texto: string; origem: string }> {
    const blocos: Array<{ texto: string; origem: string }> = []

    if (plano.titulo?.trim())
        blocos.push({ texto: plano.titulo, origem: 'título do plano' })

    if (plano.avaliacaoEvidencia?.trim())
        blocos.push({ texto: plano.avaliacaoEvidencia, origem: 'avaliação' })
    if (plano.avaliacaoFechamento?.trim())
        blocos.push({ texto: plano.avaliacaoFechamento, origem: 'avaliação' })
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

// ── Cache de músicas detectadas por IA (preenchido pelo CardAtividadeRoteiro via Gemini) ──
// Chave: `${atividadeId}-${descricao.length}` — mesma convenção do cache de conceitos
// Valor: títulos de músicas identificados pela IA na descrição da atividade
export const musicasIACache = new Map<string, Array<{ titulo: string; origem: string }>>()

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

    // ── FASE 0: títulos extraídos de embeds YouTube/Spotify no HTML ───────────
    // Spotify → sempre música, detecta mesmo sem estar no repertório.
    // YouTube → pode ser notícia/tutorial; só detecta se o título bater com o repertório.
    const resultadosFase0: MusicaDetectada[] = []
    const normsFase0 = new Set<string>()

    for (let i = 0; i < (plano.atividadesRoteiro || []).length; i++) {
        const a = plano.atividadesRoteiro[i]
        if (!a.descricao?.trim()) continue
        const origem = `atividade ${i + 1}`
        for (const { titulo, kind } of extrairTitulosMediaHTML(a.descricao, origem)) {
            const norm = normalizar(titulo)
            if (norm.length <= 3 || normsFase0.has(norm)) continue
            normsFase0.add(norm)

            const matches = repertorio.filter(m => {
                const mn = normalizar(m.titulo || '')
                return mn.length > 3 && (mn === norm || mn.includes(norm) || norm.includes(mn))
            })

            if (matches.length === 1) {
                resultadosFase0.push({
                    tituloDetectado: titulo, origem,
                    classificacao: 'encontrada', musica: matches[0],
                    jaVinculada: vinculadasNorm.has(norm),
                })
            } else if (matches.length > 1) {
                resultadosFase0.push({
                    tituloDetectado: titulo, origem,
                    classificacao: 'ambigua', candidatas: matches,
                    jaVinculada: matches.some(m => vinculadasNorm.has(normalizar(m.titulo || ''))),
                })
            } else {
                // Sem match no repertório → sugerir como nova música (professor decide no modal)
                resultadosFase0.push({
                    tituloDetectado: titulo, origem,
                    classificacao: 'nova', jaVinculada: false,
                })
            }
        }
    }

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

    // ── FASE 2: músicas detectadas pela IA (Gemini, via musicasIACache) ──────────
    const normsTodosRepertorio = new Set(
        repertorio.map(m => normalizar(m.titulo || '')).filter(Boolean)
    )
    const iaProcessadas = new Set<string>()

    for (const ativ of plano.atividadesRoteiro || []) {
        // Busca no cache todas as chaves que começam com o ID desta atividade
        for (const [key, cits] of musicasIACache.entries()) {
            if (!key.startsWith(`${ativ.id}-`)) continue
            for (const cit of cits) {
                const norm = normalizar(cit.titulo)
                if (norm.length <= 3) continue
                if (iaProcessadas.has(norm)) continue

                // Já coberta por match do repertório (Fase 1)?
                const coberta = [...processadosNorm].some(
                    rep => rep.includes(norm) || norm.includes(rep)
                )
                if (coberta) continue

                iaProcessadas.add(norm)

                // Tenta match no repertório
                const matches = repertorio.filter(m => {
                    const mn = normalizar(m.titulo || '')
                    return mn.length > 3 && (mn === norm || mn.includes(norm) || norm.includes(mn))
                })

                if (matches.length === 1) {
                    resultados.push({
                        tituloDetectado: cit.titulo, origem: cit.origem,
                        classificacao: 'encontrada', musica: matches[0],
                        jaVinculada: vinculadasNorm.has(normalizar(matches[0].titulo || '')),
                    })
                } else if (matches.length > 1) {
                    resultados.push({
                        tituloDetectado: cit.titulo, origem: cit.origem,
                        classificacao: 'ambigua', candidatas: matches,
                        jaVinculada: matches.some(m => vinculadasNorm.has(normalizar(m.titulo || ''))),
                    })
                } else if (!normsTodosRepertorio.has(norm)) {
                    resultados.push({
                        tituloDetectado: cit.titulo, origem: cit.origem,
                        classificacao: 'nova', jaVinculada: false,
                    })
                }
            }
        }
    }

    // Merge: Fase 0 tem prioridade; fases 1 e 2 só adicionam se norm não coberto pela Fase 0
    const normsCobertasFase0 = new Set(resultadosFase0.map(r => normalizar(r.tituloDetectado)))
    const resultadosFiltrados = resultados.filter(r => !normsCobertasFase0.has(normalizar(r.tituloDetectado)))

    return [...resultadosFase0, ...resultadosFiltrados]
}
