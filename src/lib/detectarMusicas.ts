// src/lib/detectarMusicas.ts
// Detecção de músicas citadas no texto de um plano de aula.
// Etapa 1: matching por string (sem IA).

import type { Plano, Musica } from '../types'

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

// ── Extração de texto do plano ────────────────────────────────────────────────
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

// ── Resultado ─────────────────────────────────────────────────────────────────
export interface MusicaDetectada {
    musica: Musica
    origem: string        // onde foi encontrada no plano
    jaVinculada: boolean  // já está em alguma atividade do plano
}

// ── Detecção principal ────────────────────────────────────────────────────────
export function detectarMusicasNoPlano(plano: Plano, repertorio: Musica[]): MusicaDetectada[] {
    // IDs e títulos de músicas já explicitamente vinculadas nas atividades
    const vinculadas = new Set<string>(
        (plano.atividadesRoteiro || [])
            .flatMap(a => (a.musicasVinculadas || [])
                .map(m => normalizar(m.titulo || ''))
                .filter(Boolean)
            )
    )

    const blocos = extrairTextosPlano(plano)
    const resultados: MusicaDetectada[] = []

    for (const musica of repertorio) {
        if (!musica.titulo?.trim()) continue
        const tituloNorm = normalizar(musica.titulo)

        // Títulos curtos (≤ 3 chars normalizados) geram muitos falsos positivos
        if (tituloNorm.length <= 3) continue

        const jaVinculada = vinculadas.has(tituloNorm)

        // Procura o título da música em cada bloco de texto
        for (const bloco of blocos) {
            if (normalizar(bloco.texto).includes(tituloNorm)) {
                resultados.push({ musica, origem: bloco.origem, jaVinculada })
                break // uma ocorrência por música é suficiente
            }
        }
    }

    return resultados
}
