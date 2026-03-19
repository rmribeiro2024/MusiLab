// Base de dados das habilidades BNCC — foco em Música
// Cobre: Educação Infantil (EI), Ensino Fundamental Anos Iniciais (EF15AR) e Anos Finais (EF69AR)

export interface HabilidadeBNCC {
    codigo: string
    etapa: 'EI' | 'EF' // Educação Infantil ou Ensino Fundamental
    anos: string
    descricao: string
    palavrasChave: string[]
}

export const BNCC_MUSICA: HabilidadeBNCC[] = [

    // ══════════════════════════════════════════════════════════════
    // EDUCAÇÃO INFANTIL — Campo: Traços, sons, cores e formas (TS)
    // O campo mais diretamente relacionado à música na EI
    // ══════════════════════════════════════════════════════════════

    {
        codigo: 'EI01TS01',
        etapa: 'EI',
        anos: 'Bebês (0–1a6m)',
        descricao: 'Explorar sons produzidos com o próprio corpo e com objetos do ambiente.',
        palavrasChave: ['sons', 'corpo', 'objetos', 'exploração', 'bebê'],
    },
    {
        codigo: 'EI01TS03',
        etapa: 'EI',
        anos: 'Bebês (0–1a6m)',
        descricao: 'Explorar diferentes fontes sonoras e materiais para acompanhar brincadeiras cantadas, canções, músicas e melodias.',
        palavrasChave: ['fontes sonoras', 'canções', 'melodias', 'brincadeiras cantadas', 'música'],
    },
    {
        codigo: 'EI02TS01',
        etapa: 'EI',
        anos: 'Crianças bem pequenas (1a7m–3a11m)',
        descricao: 'Criar sons com materiais, objetos e instrumentos musicais para acompanhar diversos ritmos de música.',
        palavrasChave: ['ritmo', 'instrumentos', 'criação sonora', 'acompanhamento'],
    },
    {
        codigo: 'EI02TS03',
        etapa: 'EI',
        anos: 'Crianças bem pequenas (1a7m–3a11m)',
        descricao: 'Utilizar diferentes fontes sonoras disponíveis no ambiente em brincadeiras cantadas, canções, músicas e melodias.',
        palavrasChave: ['fontes sonoras', 'brincadeiras', 'canções', 'repertório infantil'],
    },
    {
        codigo: 'EI03TS01',
        etapa: 'EI',
        anos: 'Crianças pequenas (4a–5a11m)',
        descricao: 'Utilizar sons produzidos por materiais, objetos e instrumentos musicais durante brincadeiras de faz de conta, encenações, criações musicais e festas.',
        palavrasChave: ['instrumentos', 'criação musical', 'faz de conta', 'encenação', 'festa'],
    },
    {
        codigo: 'EI03TS03',
        etapa: 'EI',
        anos: 'Crianças pequenas (4a–5a11m)',
        descricao: 'Reconhecer as qualidades do som (intensidade, duração, altura e timbre), utilizando-as em suas produções sonoras e ao ouvir músicas e sons.',
        palavrasChave: ['qualidades do som', 'intensidade', 'duração', 'altura', 'timbre', 'apreciação'],
    },

    // ══════════════════════════════════════════════════════════════
    // EDUCAÇÃO INFANTIL — Campo: Corpo, gestos e movimentos (CG)
    // Relevante para música com movimento, dança e expressão corporal
    // ══════════════════════════════════════════════════════════════

    {
        codigo: 'EI01CG03',
        etapa: 'EI',
        anos: 'Bebês (0–1a6m)',
        descricao: 'Imitar gestos e movimentos de outras crianças, adultos e animais.',
        palavrasChave: ['imitação', 'gesto', 'movimento', 'expressão corporal'],
    },
    {
        codigo: 'EI02CG03',
        etapa: 'EI',
        anos: 'Crianças bem pequenas (1a7m–3a11m)',
        descricao: 'Explorar formas de deslocamento no espaço (pular, saltar, dançar), combinando movimentos e seguindo orientações.',
        palavrasChave: ['dança', 'movimento', 'deslocamento', 'ritmo corporal', 'pular'],
    },
    {
        codigo: 'EI03CG03',
        etapa: 'EI',
        anos: 'Crianças pequenas (4a–5a11m)',
        descricao: 'Criar movimentos, gestos, olhares e mímicas com o corpo em situações de brincadeira, atuando como receptor e produtor.',
        palavrasChave: ['criação', 'movimento', 'gesto', 'expressão corporal', 'brincadeira'],
    },

    // ══════════════════════════════════════════════════════════════
    // EDUCAÇÃO INFANTIL — Campo: O eu, o outro e o nós (EU)
    // Relevante para música em contexto coletivo e social
    // ══════════════════════════════════════════════════════════════

    {
        codigo: 'EI03EU04',
        etapa: 'EI',
        anos: 'Crianças pequenas (4a–5a11m)',
        descricao: 'Comunicar suas ideias e sentimentos a pessoas e grupos diversos.',
        palavrasChave: ['expressão', 'comunicação', 'coletivo', 'sentimentos', 'grupo'],
    },

    // ══════════════════════════════════════════════════════════════
    // ENSINO FUNDAMENTAL — Anos Iniciais — Música (EF15AR14–EF15AR18)
    // ══════════════════════════════════════════════════════════════

    {
        codigo: 'EF15AR14',
        etapa: 'EF',
        anos: '1º–5º ano',
        descricao: 'Perceber e explorar os elementos constitutivos da música (altura, intensidade, timbre, melodia, ritmo) em jogos, brincadeiras, canções e práticas de composição, execução e apreciação musical.',
        palavrasChave: ['elementos musicais', 'altura', 'timbre', 'ritmo', 'melodia', 'intensidade', 'percepção'],
    },
    {
        codigo: 'EF15AR15',
        etapa: 'EF',
        anos: '1º–5º ano',
        descricao: 'Explorar fontes sonoras diversas (corpo, natureza, objetos cotidianos), reconhecendo características de instrumentos musicais variados.',
        palavrasChave: ['fontes sonoras', 'instrumentos', 'percussão corporal', 'exploração', 'timbre'],
    },
    {
        codigo: 'EF15AR16',
        etapa: 'EF',
        anos: '1º–5º ano',
        descricao: 'Explorar diferentes formas de registrar músicas (representação gráfica de sons, partituras criativas e procedimentos contemporâneos).',
        palavrasChave: ['registro', 'partitura', 'notação', 'escrita musical', 'gráfico sonoro'],
    },
    {
        codigo: 'EF15AR17',
        etapa: 'EF',
        anos: '1º–5º ano',
        descricao: 'Experimentar improvisações, composições e sonorização de histórias utilizando vozes, sons corporais e/ou instrumentos convencionais ou não convencionais, de modo individual, coletivo e colaborativo.',
        palavrasChave: ['improvisação', 'composição', 'criação', 'sonorização', 'colaborativo', 'coletivo'],
    },
    {
        codigo: 'EF15AR18',
        etapa: 'EF',
        anos: '1º–5º ano',
        descricao: 'Reconhecer e apreciar formas distintas de manifestações musicais, tanto tradicionais como contemporâneas, valorizando a diversidade cultural — local, regional, nacional e internacional.',
        palavrasChave: ['apreciação', 'diversidade', 'cultura', 'gêneros', 'estilos', 'tradição'],
    },

    // ══════════════════════════════════════════════════════════════
    // ENSINO FUNDAMENTAL — Anos Finais — Música (EF69AR16–EF69AR25)
    // ══════════════════════════════════════════════════════════════

    {
        codigo: 'EF69AR16',
        etapa: 'EF',
        anos: '6º–9º ano',
        descricao: 'Analisar criticamente usos e funções da música em seus contextos de produção e circulação, relacionando aspectos da estrutura interna e externa.',
        palavrasChave: ['análise crítica', 'contexto', 'função social', 'produção musical', 'circulação'],
    },
    {
        codigo: 'EF69AR17',
        etapa: 'EF',
        anos: '6º–9º ano',
        descricao: 'Explorar e analisar diferentes meios e equipamentos culturais de circulação da música, áudio e imagem.',
        palavrasChave: ['mídia', 'tecnologia', 'streaming', 'meios digitais', 'áudio visual'],
    },
    {
        codigo: 'EF69AR18',
        etapa: 'EF',
        anos: '6º–9º ano',
        descricao: 'Reconhecer e apreciar o papel de músicos e grupos brasileiros e estrangeiros que contribuíram para o desenvolvimento de formas e gêneros musicais.',
        palavrasChave: ['músicos', 'artistas', 'gêneros musicais', 'história da música', 'brasileiros'],
    },
    {
        codigo: 'EF69AR19',
        etapa: 'EF',
        anos: '6º–9º ano',
        descricao: 'Identificar e analisar diferentes estilos musicais, contextualizando-os no tempo e no espaço, aprimorando a capacidade de apreciação da estética musical.',
        palavrasChave: ['estilos musicais', 'história', 'estética', 'contextualização', 'apreciação'],
    },
    {
        codigo: 'EF69AR20',
        etapa: 'EF',
        anos: '6º–9º ano',
        descricao: 'Explorar e analisar elementos constitutivos da música (altura, intensidade, timbre, melodia, ritmo, harmonia) por meio de recursos tecnológicos, jogos, canções e práticas diversas.',
        palavrasChave: ['harmonia', 'ritmo', 'melodia', 'elementos musicais', 'tecnologia', 'análise'],
    },
    {
        codigo: 'EF69AR21',
        etapa: 'EF',
        anos: '6º–9º ano',
        descricao: 'Explorar e analisar fontes e materiais sonoros em práticas de composição, execução e apreciação musical, reconhecendo timbres e características de instrumentos musicais.',
        palavrasChave: ['fontes sonoras', 'timbre', 'instrumentos', 'composição', 'execução'],
    },
    {
        codigo: 'EF69AR22',
        etapa: 'EF',
        anos: '6º–9º ano',
        descricao: 'Explorar e criar improvisações, composições, arranjos, jingles, trilhas sonoras, utilizando vozes, sons corporais e instrumentos acústicos, elétricos ou digitais.',
        palavrasChave: ['composição', 'improvisação', 'arranjo', 'criação musical', 'digital', 'trilha sonora'],
    },
    {
        codigo: 'EF69AR23',
        etapa: 'EF',
        anos: '6º–9º ano',
        descricao: 'Explorar e analisar diferentes formas de registro musical (notação tradicional, partituras criativas) e técnicas de registro em áudio e audiovisual.',
        palavrasChave: ['notação', 'partitura', 'leitura musical', 'gravação', 'registro'],
    },
    {
        codigo: 'EF69AR24',
        etapa: 'EF',
        anos: '6º–9º ano',
        descricao: 'Explorar e contextualizar obras musicais, identificando e analisando a diversidade estética da produção musical brasileira e mundial.',
        palavrasChave: ['obras musicais', 'repertório', 'estética', 'diversidade', 'apreciação'],
    },
    {
        codigo: 'EF69AR25',
        etapa: 'EF',
        anos: '6º–9º ano',
        descricao: 'Reconhecer e analisar a diversidade cultural de manifestações musicais em diferentes períodos históricos, valorizando os diferentes contextos e origens.',
        palavrasChave: ['história da música', 'diversidade cultural', 'etnomusicologia', 'períodos históricos'],
    },
]

/** Busca habilidades pelo código parcial ou por palavra-chave */
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
    return hab.match(/^(EI\w+|EF\w+|EM\w+)/)?.[1] ?? hab.split(' ')[0]
}
