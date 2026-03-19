// Base de dados das habilidades BNCC de Arte — foco em Música
// Ensino Fundamental Anos Iniciais (EF15AR) e Anos Finais (EF69AR)

export interface HabilidadeBNCC {
    codigo: string
    anos: string
    descricao: string
    palavrasChave: string[] // para busca por palavra
}

export const BNCC_MUSICA: HabilidadeBNCC[] = [
    // ── Anos Iniciais — Música (EF15AR14–EF15AR18) ──────────────────────────
    {
        codigo: 'EF15AR14',
        anos: '1º–5º',
        descricao: 'Perceber e explorar os elementos constitutivos da música (altura, intensidade, timbre, melodia, ritmo) em jogos, brincadeiras, canções e práticas de composição, execução e apreciação musical.',
        palavrasChave: ['elementos', 'altura', 'timbre', 'ritmo', 'melodia', 'intensidade', 'percepção'],
    },
    {
        codigo: 'EF15AR15',
        anos: '1º–5º',
        descricao: 'Explorar fontes sonoras diversas (corpo, natureza, objetos cotidianos), reconhecendo características de instrumentos musicais variados.',
        palavrasChave: ['fontes sonoras', 'instrumentos', 'corpo', 'percussão', 'exploração'],
    },
    {
        codigo: 'EF15AR16',
        anos: '1º–5º',
        descricao: 'Explorar diferentes formas de registrar músicas (representação gráfica de sons, partituras criativas e procedimentos contemporâneos).',
        palavrasChave: ['registro', 'partitura', 'notação', 'gráfico', 'escrita musical'],
    },
    {
        codigo: 'EF15AR17',
        anos: '1º–5º',
        descricao: 'Experimentar improvisações, composições e sonorização de histórias utilizando vozes, sons corporais e/ou instrumentos convencionais ou não convencionais, de modo individual, coletivo e colaborativo.',
        palavrasChave: ['improvisação', 'composição', 'criação', 'sonorização', 'colaborativo'],
    },
    {
        codigo: 'EF15AR18',
        anos: '1º–5º',
        descricao: 'Reconhecer e apreciar formas distintas de manifestações musicais, tanto tradicionais como contemporâneas, valorizando a diversidade cultural — local, regional, nacional e internacional.',
        palavrasChave: ['apreciação', 'diversidade', 'cultura', 'tradição', 'gêneros', 'estilos'],
    },

    // ── Anos Finais — Música (EF69AR16–EF69AR25) ────────────────────────────
    {
        codigo: 'EF69AR16',
        anos: '6º–9º',
        descricao: 'Analisar criticamente usos e funções da música em seus contextos de produção e circulação, relacionando aspectos da estrutura interna e externa.',
        palavrasChave: ['análise', 'contexto', 'função', 'produção', 'circulação', 'crítica'],
    },
    {
        codigo: 'EF69AR17',
        anos: '6º–9º',
        descricao: 'Explorar e analisar diferentes meios e equipamentos culturais de circulação da música, áudio e imagem.',
        palavrasChave: ['mídia', 'tecnologia', 'áudio', 'streaming', 'meios digitais'],
    },
    {
        codigo: 'EF69AR18',
        anos: '6º–9º',
        descricao: 'Reconhecer e apreciar o papel de músicos e grupos brasileiros e estrangeiros que contribuíram para o desenvolvimento de formas e gêneros musicais.',
        palavrasChave: ['músicos', 'artistas', 'gêneros', 'história', 'apreciação', 'brasileiros'],
    },
    {
        codigo: 'EF69AR19',
        anos: '6º–9º',
        descricao: 'Identificar e analisar diferentes estilos musicais, contextualizando-os no tempo e no espaço, aprimorando a capacidade de apreciação da estética musical.',
        palavrasChave: ['estilos', 'história da música', 'estética', 'contextualização', 'apreciação'],
    },
    {
        codigo: 'EF69AR20',
        anos: '6º–9º',
        descricao: 'Explorar e analisar elementos constitutivos da música (altura, intensidade, timbre, melodia, ritmo, harmonia) por meio de recursos tecnológicos, jogos, canções e práticas diversas.',
        palavrasChave: ['harmonia', 'ritmo', 'melodia', 'elementos musicais', 'tecnologia', 'análise'],
    },
    {
        codigo: 'EF69AR21',
        anos: '6º–9º',
        descricao: 'Explorar e analisar fontes e materiais sonoros em práticas de composição, execução e apreciação musical, reconhecendo timbres e características de instrumentos musicais.',
        palavrasChave: ['fontes sonoras', 'timbre', 'instrumentos', 'composição', 'execução'],
    },
    {
        codigo: 'EF69AR22',
        anos: '6º–9º',
        descricao: 'Explorar e criar improvisações, composições, arranjos, jingles, trilhas sonoras, utilizando vozes, sons corporais e instrumentos acústicos, elétricos ou digitais.',
        palavrasChave: ['composição', 'improvisação', 'arranjo', 'criação', 'digital', 'trilha sonora'],
    },
    {
        codigo: 'EF69AR23',
        anos: '6º–9º',
        descricao: 'Explorar e analisar diferentes formas de registro musical (notação tradicional, partituras criativas) e técnicas de registro em áudio e audiovisual.',
        palavrasChave: ['notação', 'partitura', 'registro', 'gravação', 'áudio', 'leitura musical'],
    },
    {
        codigo: 'EF69AR24',
        anos: '6º–9º',
        descricao: 'Explorar e contextualizar obras musicais, identificando e analisando a diversidade estética da produção musical brasileira e mundial.',
        palavrasChave: ['obras', 'repertório', 'estética', 'diversidade', 'apreciação', 'análise'],
    },
    {
        codigo: 'EF69AR25',
        anos: '6º–9º',
        descricao: 'Reconhecer e analisar a diversidade cultural de manifestações musicais em diferentes períodos históricos, valorizando os diferentes contextos e origens.',
        palavrasChave: ['história', 'diversidade cultural', 'etnomusicologia', 'períodos', 'origens'],
    },
]

/** Busca habilidades pelo código parcial ou por palavra-chave na descrição */
export function buscarBNCC(query: string): HabilidadeBNCC[] {
    const q = query.toLowerCase().trim()
    if (!q) return []
    return BNCC_MUSICA.filter(b =>
        b.codigo.toLowerCase().includes(q) ||
        b.descricao.toLowerCase().includes(q) ||
        b.palavrasChave.some(p => p.toLowerCase().includes(q))
    )
}

/** Extrai o código de uma string armazenada (ex: "EF15AR14 - Descrição..." → "EF15AR14") */
export function extrairCodigo(hab: string): string {
    return hab.match(/^(EF\w+|EM\w+)/)?.[1] ?? hab.split(' ')[0]
}
