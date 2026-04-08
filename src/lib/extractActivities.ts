// src/lib/extractActivities.ts
// Extrai atividades atômicas do texto livre de cada bloco do roteiro via Gemini

import type { AtividadeExtraida } from '../types'

export async function extractActivitiesFromPlan(
    atividadesRoteiro: any[],
    apiKey: string
): Promise<AtividadeExtraida[]> {
    if (!atividadesRoteiro || atividadesRoteiro.length === 0) return []

    const blocos = atividadesRoteiro.map((a: any) => ({
        id: a.id,
        nome: (a.nome ?? '').slice(0, 100),
        descricao: (a.descricao ?? '').replace(/<[^>]*>/g, ' ').trim().slice(0, 400),
    })).filter(b => b.nome || b.descricao)

    if (blocos.length === 0) return []

    const prompt = `Você é assistente de um professor de música. Para cada bloco abaixo, liste as atividades individuais que o professor realizaria em aula — sem numeração, sem bullets, sem URLs. Máximo 6 por bloco. Se o bloco descreve só uma atividade, liste só uma.

${blocos.map(b => `[ID:${b.id}] ${b.nome}: ${b.descricao || b.nome}`).join('\n')}

Responda SOMENTE com JSON válido, usando exatamente os IDs fornecidos:
{"blocos":[{"id":"ID_EXATO_DO_BLOCO","atividades":["texto1","texto2"]}]}`

    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
        )
        if (!res.ok) return []
        const json = await res.json()
        const raw: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
        const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/)
        if (!match) return []
        const result = JSON.parse(match[1] || match[0])
        const extraidas: AtividadeExtraida[] = []
        for (const bloco of (result.blocos ?? [])) {
            const roteiroId = bloco.id
            ;(bloco.atividades ?? []).forEach((texto: string, idx: number) => {
                if (texto?.trim()) {
                    extraidas.push({ id: `${roteiroId}-${idx}`, texto: texto.trim(), atividadeRoteiroId: roteiroId })
                }
            })
        }
        return extraidas
    } catch { return [] }
}
