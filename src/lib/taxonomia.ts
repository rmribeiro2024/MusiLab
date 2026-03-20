// src/lib/taxonomia.ts
// Mapa conceito → categoria pedagógica musical, compartilhado entre componentes.

const TAXONOMY_GROUPS: Record<string, string[]> = {
    'Parâmetros do Som':    ['Altura', 'Duração', 'Intensidade', 'Timbre'],
    'Ritmo':               ['Pulsação', 'Andamento', 'Métrica', 'Células Rítmicas', 'Síncope', 'Ostinato'],
    'Melodia':             ['Fraseado', 'Contorno Melódico', 'Escalas', 'Intervalos', 'Tonalidade'],
    'Harmonia':            ['Acordes', 'Campo Harmônico', 'Consonância', 'Textura', 'Densidade'],
    'Estrutura e Forma':   ['Motivo', 'Frase', 'Período', 'Forma AB', 'Forma ABA', 'Rondó', 'Sonata'],
    'Expressividade':      ['Dinâmica', 'Crescendo', 'Articulação', 'Caráter'],
    'Processos Criativos': ['Criação', 'Execução', 'Apreciação', 'Escuta Ativa', 'Improvisação', 'Escuta ativa'],
    'Movimento e Corpo':   ['Espaço', 'Peso', 'Fluência', 'Percussão Corporal', 'Coordenação Motora'],
    'Cultura':             ['Gêneros Musicais', 'História da Música', 'Etnomusicologia'],
    'Tecnologia':          ['Áudio Digital', 'MIDI', 'Software Musical'],
}

// Nomes de categoria completos retornados pelo Gemini → nome curto
const CATEGORY_ALIASES: Record<string, string> = {
    'Ritmo e Organização Temporal': 'Ritmo',
    'Melodia e Alturas': 'Melodia',
    'Harmonia e Textura': 'Harmonia',
    'Dinâmica e Expressividade': 'Expressividade',
    'Processos Criativos e Ações': 'Processos Criativos',
    'Contexto e Cultura': 'Cultura',
    'Tecnologia Musical': 'Tecnologia',
    'Parâmetros Físicos do Som': 'Parâmetros do Som',
}

export function categoriaDoConceito(conceito: string): string {
    const alias = CATEGORY_ALIASES[conceito]
    if (alias) return alias
    const lower = conceito.toLowerCase()
    for (const [cat, items] of Object.entries(TAXONOMY_GROUPS)) {
        if (items.some(i => i.toLowerCase() === lower)) return cat
    }
    return 'Outros'
}

export function agruparPorCategoria(conceitos: string[]): Record<string, string[]> {
    const out: Record<string, string[]> = {}
    for (const c of conceitos) {
        const cat = categoriaDoConceito(c)
        if (!out[cat]) out[cat] = []
        out[cat].push(c)
    }
    return out
}
