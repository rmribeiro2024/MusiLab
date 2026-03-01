import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react'
import { supabase } from '../lib/supabase'
import {
  sanitizar,
  gerarIdSeguro,
  syncToSupabase,
  syncConfiguracoes,
  loadFromSupabase,
  loadConfiguracoes,
} from '../lib/utils'
// Módulos carregados sob demanda — Vite cria um chunk por arquivo
const ModuloAnoLetivo        = lazy(() => import('./ModuloAnoLetivo'))
const ModuloHistoricoMusical = lazy(() => import('./ModuloHistoricoMusical'))
const ModuloEstrategias      = lazy(() => import('./ModuloEstrategias'))
const ModuloAtividades       = lazy(() => import('./ModuloAtividades'))
const ModuloSequencias       = lazy(() => import('./ModuloSequencias'))
const ModuloRepertorio       = lazy(() => import('./ModuloRepertorio'))
const TelaPrincipal          = lazy(() => import('./TelaPrincipal'))
const TelaCalendario         = lazy(() => import('./TelaCalendario').then(m => ({ default: m.TelaCalendario })))
const TelaResumoDia          = lazy(() => import('./TelaCalendario'))
import { BancoPlanosContext } from './BancoPlanosContext'
import ErrorBoundary from './ErrorBoundary'
import { lerLS } from '../utils/helpers'
import { exportarPlanoPDF, exportarSequenciaPDF } from '../utils/pdf'

// Fallback exibido enquanto o chunk do módulo está sendo baixado
const CarregandoModulo = () => (
  <div className="flex items-center justify-center py-20 text-slate-400">
    <div className="text-center">
      <div className="text-3xl mb-3 animate-pulse">🎵</div>
      <p className="text-sm">Carregando...</p>
    </div>
  </div>
)

        const bancoBNCC = [
            // ── EDUCAÇÃO INFANTIL ── Campos de Experiências (música)
            { codigo: "EI02EO01", segmento: "Infantil", desc: "Demonstrar atitudes de cuidado e solidariedade na interação com crianças e adultos.", keywords: ["convivência", "interação", "cuidado", "música coletiva"] },
            { codigo: "EI03EO01", segmento: "Infantil", desc: "Demonstrar empatia pelos outros, percebendo que as pessoas têm diferentes sentimentos, necessidades e maneiras de pensar e agir.", keywords: ["empatia", "sentimentos", "expressão musical"] },
            { codigo: "EI02CG01", segmento: "Infantil", desc: "Apropriar-se de gestos e movimentos de sua cultura no cuidado de si e nos jogos e brincadeiras.", keywords: ["movimento", "gesto", "dança", "corpo", "brincadeira"] },
            { codigo: "EI03CG01", segmento: "Infantil", desc: "Criar com o corpo formas diversificadas de expressão de sentimentos, sensações e emoções, tanto nas situações do cotidiano quanto em brincadeiras, dança, teatro, música.", keywords: ["expressão corporal", "dança", "movimento", "emoção", "sentimento"] },
            { codigo: "EI02CG03", segmento: "Infantil", desc: "Explorar formas de deslocamento no espaço (pular, saltar, dançar), combinando movimentos e seguindo orientações.", keywords: ["dança", "movimento", "deslocamento", "ritmo corporal"] },
            { codigo: "EI01TS01", segmento: "Infantil", desc: "Explorar sons produzidos com o próprio corpo e com objetos do ambiente.", keywords: ["sons", "corpo", "percussão corporal", "objetos sonoros", "exploração"] },
            { codigo: "EI02TS01", segmento: "Infantil", desc: "Criar sons com materiais, objetos e instrumentos musicais, para acompanhar diversos ritmos de música.", keywords: ["ritmo", "instrumentos", "criação", "sons", "acompanhamento"] },
            { codigo: "EI03TS01", segmento: "Infantil", desc: "Utilizar sons produzidos por materiais, objetos e instrumentos musicais durante brincadeiras de faz de conta, encenações, criações musicais, festas.", keywords: ["criação musical", "instrumentos", "brincadeira", "encenação", "festa"] },
            { codigo: "EI02TS02", segmento: "Infantil", desc: "Utilizar materiais variados com possibilidades de manipulação (argila, massa de modelar), explorando cores, formas, texturas, e sons.", keywords: ["exploração", "sons", "texturas", "sensorial"] },
            { codigo: "EI01EF06", segmento: "Infantil", desc: "Comunicar-se com outras pessoas usando movimentos, gestos, balbucios, fala e outras formas de expressão.", keywords: ["comunicação", "expressão", "voz", "canto"] },
            { codigo: "EI02EF06", segmento: "Infantil", desc: "Criar e contar histórias oralmente, com base em imagens ou temas sugeridos.", keywords: ["história", "sonorização", "narrativa", "voz"] },
            { codigo: "EI03EF06", segmento: "Infantil", desc: "Produzir suas próprias histórias orais e escritas (escrita espontânea), em situações com função social significativa.", keywords: ["criação", "narrativa", "sonorização de história"] },
            { codigo: "EI03EF09", segmento: "Infantil", desc: "Levantar hipóteses em relação à linguagem escrita, realizando registros de palavras e textos, por meio de representações gráficas.", keywords: ["registro", "grafia musical", "notação"] },

            // ── EF 1º AO 5º ANO ──
            { codigo: "EF15AR13", segmento: "EF1-5", desc: "Identificar e apreciar criticamente diversas formas e gêneros de expressão musical.", keywords: ["apreciar", "gêneros", "contextos", "escuta", "identificar"] },
            { codigo: "EF15AR14", segmento: "EF1-5", desc: "Perceber e explorar os elementos constitutivos da música (altura, intensidade, timbre, melodia, ritmo e duração).", keywords: ["altura", "intensidade", "timbre", "melodia", "ritmo", "duração", "elementos", "jogo"] },
            { codigo: "EF15AR15", segmento: "EF1-5", desc: "Explorar fontes sonoras diversas (corpo, natureza, objetos e instrumentos).", keywords: ["fontes sonoras", "corpo", "percussão corporal", "voz", "cotidiano", "instrumentos"] },
            { codigo: "EF15AR16", segmento: "EF1-5", desc: "Explorar diferentes formas de registro musical não convencional e convencional.", keywords: ["registro", "grafia", "partitura", "desenho", "gravação"] },
            { codigo: "EF15AR17", segmento: "EF1-5", desc: "Experimentar improvisações, composições e sonorização de histórias.", keywords: ["improvisação", "criação", "composição", "história", "sonorização", "criar"] },
            { codigo: "EF15AR18", segmento: "EF1-5", desc: "Reconhecer e apreciar o papel de músicos e grupos brasileiros e estrangeiros.", keywords: ["cultura", "brasileira", "artista", "compositor", "grupo"] },
            { codigo: "EF15AR19", segmento: "EF1-5", desc: "Descobrir e experimentar sonoridades e ritmos de diferentes matrizes estéticas e culturais.", keywords: ["cultura", "indígena", "africana", "matrizes", "folclore"] },
            { codigo: "EF15AR23", segmento: "EF1-5", desc: "Reconhecer e experimentar, em projetos temáticos, as relações entre linguagens artísticas.", keywords: ["integrada", "dança", "teatro", "artes visuais"] },
            { codigo: "EF15AR24", segmento: "EF1-5", desc: "Caracterizar e experimentar brinquedos, brincadeiras, jogos, danças e canções.", keywords: ["brincadeira", "roda", "dança", "jogo"] },
            { codigo: "EF15AR25", segmento: "EF1-5", desc: "Conhecer e valorizar o patrimônio cultural, material e imaterial.", keywords: ["patrimônio", "cultura", "popular"] },

            // ── EF 6º AO 9º ANO ──
            { codigo: "EF69AR16", segmento: "EF6-9", desc: "Analisar criticamente, por meio da apreciação musical, usos e funções da música em seus contextos de produção e circulação.", keywords: ["apreciação", "análise", "contexto", "função", "crítica"] },
            { codigo: "EF69AR17", segmento: "EF6-9", desc: "Explorar e analisar, criticamente, diferentes meios e equipamentos culturais de acesso à produção e à apreciação artística.", keywords: ["mídia", "tecnologia", "acesso", "digital", "streaming"] },
            { codigo: "EF69AR18", segmento: "EF6-9", desc: "Reconhecer e apreciar o papel de músicos e grupos de música brasileira e mundial, em diferentes épocas, contextos e estilos musicais.", keywords: ["história da música", "artistas", "estilos", "época", "mundo"] },
            { codigo: "EF69AR19", segmento: "EF6-9", desc: "Identificar e analisar diferentes estilos musicais, contextualizando-os no tempo e no espaço, de modo a aprimorar a capacidade de apreciação da estética musical.", keywords: ["estilos musicais", "contextualização", "história", "estética"] },
            { codigo: "EF69AR20", segmento: "EF6-9", desc: "Explorar e analisar elementos constitutivos da música (altura, intensidade, timbre, melodia, ritmo, harmonia, textura, forma, entre outros), por meio de recursos tecnológicos.", keywords: ["harmonia", "textura", "forma", "altura", "timbre", "ritmo", "melodia", "elementos"] },
            { codigo: "EF69AR21", segmento: "EF6-9", desc: "Explorar e criar improvisações, composições, arranjos, jingles, trilhas sonoras, entre outros, utilizando vozes, sons corporais e/ou instrumentos acústicos ou eletrônicos.", keywords: ["composição", "arranjo", "improvisação", "trilha sonora", "jingle", "criação", "eletrônico"] },
            { codigo: "EF69AR22", segmento: "EF6-9", desc: "Explorar e identificar diferentes formas de registro musical (notação musical tradicional, formas alternativas de notação musical e registro em áudio e vídeo).", keywords: ["notação", "partitura", "registro", "gravação", "áudio", "vídeo"] },
            { codigo: "EF69AR23", segmento: "EF6-9", desc: "Explorar e criar experimentações sonoras e músicas com tecnologias digitais.", keywords: ["tecnologia", "digital", "experimentação", "eletrônico", "computador"] },
            { codigo: "EF69AR24", segmento: "EF6-9", desc: "Explorar e analisar formas distintas de manifestações do movimento (de pessoas e grupos) presentes em diferentes contextos.", keywords: ["movimento", "dança", "corpo", "performance"] },
            { codigo: "EF69AR31", segmento: "EF6-9", desc: "Relacionar as práticas artísticas às diferentes dimensões da vida social, cultural, política, histórica, econômica, estética e ética.", keywords: ["sociedade", "política", "cultura", "história", "interdisciplinar"] },
            { codigo: "EF69AR32", segmento: "EF6-9", desc: "Analisar e explorar, em projetos temáticos, as relações processuais entre diversas linguagens artísticas.", keywords: ["projeto", "interdisciplinar", "linguagens", "integrado"] },
            { codigo: "EF69AR33", segmento: "EF6-9", desc: "Analisar aspectos históricos, sociais e políticos da produção artística, problematizando as narrativas eurocêntricas e as outras representações hegemônicas.", keywords: ["história", "africana", "indígena", "diversidade", "cultura popular", "patrimônio"] },
            { codigo: "EF69AR34", segmento: "EF6-9", desc: "Analisar e valorizar o patrimônio cultural, material e imaterial, de culturas diversas.", keywords: ["patrimônio", "cultura", "popular", "folclore", "diversidade"] },
            { codigo: "EF69AR35", segmento: "EF6-9", desc: "Identificar e manipular diferentes tecnologias e recursos digitais para acessar, apreciar, produzir, registrar e compartilhar práticas e repertórios musicais.", keywords: ["tecnologia", "digital", "compartilhar", "produção", "registro"] }
        ];

        const planosIniciais = []; 
        const conceitosIniciais = ["Pulsação", "Ritmo", "Melodia", "Movimento", "Canto", "Instrumentos", "Percussão Corporal", "Criação", "Improvisação"];
        const unidadesIniciais = ["Flauta Doce", "Canto Coral", "Instrumentos Orff", "Educação Musical Geral", "Música e Movimento"];

        // Base de Feriados Nacionais do Brasil (2024-2030)
        const feriadosNacionais = {
            // Feriados fixos
            fixos: [
                { mes: 1, dia: 1, nome: "Ano Novo" },
                { mes: 4, dia: 21, nome: "Tiradentes" },
                { mes: 5, dia: 1, nome: "Dia do Trabalho" },
                { mes: 9, dia: 7, nome: "Independência do Brasil" },
                { mes: 10, dia: 12, nome: "Nossa Senhora Aparecida" },
                { mes: 11, dia: 2, nome: "Finados" },
                { mes: 11, dia: 15, nome: "Proclamação da República" },
                { mes: 11, dia: 20, nome: "Consciência Negra" },
                { mes: 12, dia: 25, nome: "Natal" }
            ],
            // Feriados móveis (Carnaval, Páscoa, Corpus Christi)
            moveis: {
                2024: [
                    { data: '2024-02-13', nome: 'Carnaval' },
                    { data: '2024-03-29', nome: 'Sexta-feira Santa' },
                    { data: '2024-03-31', nome: 'Páscoa' },
                    { data: '2024-05-30', nome: 'Corpus Christi' }
                ],
                2025: [
                    { data: '2025-03-04', nome: 'Carnaval' },
                    { data: '2025-04-18', nome: 'Sexta-feira Santa' },
                    { data: '2025-04-20', nome: 'Páscoa' },
                    { data: '2025-06-19', nome: 'Corpus Christi' }
                ],
                2026: [
                    { data: '2026-02-17', nome: 'Carnaval' },
                    { data: '2026-04-03', nome: 'Sexta-feira Santa' },
                    { data: '2026-04-05', nome: 'Páscoa' },
                    { data: '2026-06-04', nome: 'Corpus Christi' }
                ],
                2027: [
                    { data: '2027-02-09', nome: 'Carnaval' },
                    { data: '2027-03-26', nome: 'Sexta-feira Santa' },
                    { data: '2027-03-28', nome: 'Páscoa' },
                    { data: '2027-05-27', nome: 'Corpus Christi' }
                ],
                2028: [
                    { data: '2028-02-29', nome: 'Carnaval' },
                    { data: '2028-04-14', nome: 'Sexta-feira Santa' },
                    { data: '2028-04-16', nome: 'Páscoa' },
                    { data: '2028-06-15', nome: 'Corpus Christi' }
                ],
                2029: [
                    { data: '2029-02-13', nome: 'Carnaval' },
                    { data: '2029-03-30', nome: 'Sexta-feira Santa' },
                    { data: '2029-04-01', nome: 'Páscoa' },
                    { data: '2029-05-31', nome: 'Corpus Christi' }
                ],
                2030: [
                    { data: '2030-03-05', nome: 'Carnaval' },
                    { data: '2030-04-19', nome: 'Sexta-feira Santa' },
                    { data: '2030-04-21', nome: 'Páscoa' },
                    { data: '2030-06-20', nome: 'Corpus Christi' }
                ]
            }
        };

        // ── NORMALIZAÇÃO DE PLANO ──
        // Garante defaults em todos os campos. Usar sempre que um plano vem de
        // fonte externa (localStorage, Supabase, importação).
        // Inclui migração automática de metodologia legada → atividadesRoteiro.
        function normalizePlano(p) {
            let atividadesRoteiro = p.atividadesRoteiro || [];
            if (!p.atividadesRoteiro && p.metodologia && p.metodologia.trim()) {
                atividadesRoteiro = [{ id: Date.now(), nome: '', duracao: '', descricao: p.metodologia }];
            }
            return {
                ...p,
                conceitos:            p.conceitos            || [],
                tags:                 p.tags                 || [],
                unidades:             p.unidades             || [],
                faixaEtaria:          p.faixaEtaria          || [],
                objetivosEspecificos: p.objetivosEspecificos || [],
                materiais:            p.materiais            || [],
                habilidadesBNCC:      p.habilidadesBNCC      || [],
                recursos:             p.recursos             || [],
                historicoDatas:       p.historicoDatas       || [],
                registrosPosAula:     p.registrosPosAula     || [],
                atividadesRoteiro:    atividadesRoteiro,
                destaque:             p.destaque             || false,
                statusPlanejamento:   p.statusPlanejamento   || 'A Fazer',
            };
        }


export default function BancoPlanos({ session }) {
            const userId = session?.user?.id;
            const userName = session?.user?.user_metadata?.full_name || session?.user?.email || 'Professor';
            // ============================================================
            // MÓDULO: EDIÇÃO DE MÚSICA
            // ============================================================
            const [viewMode, setViewMode] = useState('lista');
            const [musicaEditando, setMusicaEditando] = useState(null);
            const [buscaEstilo, setBuscaEstilo] = useState('');
            const [accordionAberto, setAccordionAberto] = useState('forma'); // forma | tom | expressao | recursos | vinculos
            const [editandoElemento, setEditandoElemento] = useState(null);
            // ============================================================
            // FUNÇÕES: UTILITÁRIOS GERAIS
            // ============================================================
            // ============================================================
            // MÓDULO: OPÇÕES MUSICAIS CUSTOMIZADAS
            // ============================================================
            const [compassosCustomizados, setCompassosCustomizados] = useState(() => lerLS('compassosCustomizados'));
            const [tonalidadesCustomizadas, setTonalidadesCustomizadas] = useState(() => lerLS('tonalidadesCustomizadas'));
            const [andamentosCustomizados, setAndamentosCustomizados] = useState(() => lerLS('andamentosCustomizados'));
            const [escalasCustomizadas, setEscalasCustomizadas] = useState(() => lerLS('escalasCustomizadas'));
            const [estruturasCustomizadas, setEstruturasCustomizadas] = useState(() => lerLS('estruturasCustomizadas'));
            const [dinamicasCustomizadas, setDinamicasCustomizadas] = useState(() => lerLS('dinamicasCustomizadas'));
            const [energiasCustomizadas, setEnergiasCustomizadas] = useState(() => lerLS('energiasCustomizadas'));
            const [instrumentacaoCustomizada, setInstrumentacaoCustomizada] = useState(() => lerLS('instrumentacaoCustomizada'));
            // ============================================================
            // MÓDULO: REPERTÓRIO
            // ============================================================
            const [repertorio, setRepertorio] = useState(() => {
                const saved = localStorage.getItem('repertorio');
                return saved ? JSON.parse(saved) : [];
            });
            const [buscaRepertorio, setBuscaRepertorio] = useState('');
            // ============================================================
            // MÓDULO: FILTROS DO REPERTÓRIO
            // ============================================================
            const [filtroOrigem, setFiltroOrigem] = useState('Todas');
            const [filtroEstilo, setFiltroEstilo] = useState('Todos');
            const [filtroTonalidade, setFiltroTonalidade] = useState('Todas');
            const [filtroEscala, setFiltroEscala] = useState('Todas');
            const [filtroCompasso, setFiltroCompasso] = useState('Todos');
            const [filtroAndamento, setFiltroAndamento] = useState('Todos');
            const [filtroEstrutura, setFiltroEstrutura] = useState('Todas');
            const [filtroEnergia, setFiltroEnergia] = useState('Todas');
            const [filtroInstrumentacao, setFiltroInstrumentacao] = useState('Todas');
            const [filtroDinamica, setFiltroDinamica] = useState('Todas');
            
            // Opções dos elementos musicais
            const ESTILOS_OPCOES = ['Canção Infantil', 'Cantiga de Roda', 'Folclórica Brasileira', 'MPB', 'Samba', 'Bossa Nova', 'Forró', 'Pop', 'Rock', 'Música Erudita', 'Coral', 'Instrumental', 'Percussão Corporal', 'Jogo Musical', 'Música Temática', 'Música Clássica'];
            const COMPASSOS_OPCOES = ['2/4', '3/4', '4/4', '6/8'];
            const TONALIDADES_OPCOES = ['Maior', 'Menor', 'Pentatônica', 'Modal'];
            const ANDAMENTOS_OPCOES = ['Lento', 'Moderado', 'Rápido'];
            const ESCALAS_OPCOES = ['Maior', 'Menor', 'Pentatônica', 'Blues'];
            const ESTRUTURAS_OPCOES = ['A', 'AB', 'ABA', 'Rondó', 'Ostinato'];
            const DINAMICAS_OPCOES = ['Pianíssimo', 'Piano', 'Meio-Piano', 'Meio-Forte', 'Forte', 'Fortíssimo', 'Crescendo', 'Decrescendo', 'Legato', 'Staccato'];
            const ENERGIAS_OPCOES = ['Calma', 'Relaxante', 'Animada', 'Dançante', 'Alegre', 'Triste', 'Meditativa', 'Enérgica', 'Misteriosa', 'Brincalhona', 'Épica', 'Romântica'];
            const INSTRUMENTACAO_OPCOES = ['🥁 Percussão','🎹 Piano/Teclado','🎸 Violão/Guitarra','🎻 Violino','🎺 Trompete','🎷 Saxofone','🪗 Acordeão','🪘 Zabumba','🎙️ Voz Solo','🎤 Coro/Coral','🪈 Flauta','🎵 Orff (xilofone/metalofone)','🎚️ A Cappella','🎶 Orquestra','🤸 Percussão Corporal','🔇 Sem acompanhamento'];
            
            // ============================================================
            // MÓDULO: PLANOS DE AULA
            // ============================================================
            const [planos, setPlanos] = useState(() => {
                const saved = localStorage.getItem('planosAula');
                const parsed = saved ? JSON.parse(saved) : planosIniciais;
                return parsed.map(normalizePlano);
            });

            // ============================================================
            // MÓDULO: ATIVIDADES
            // ============================================================
            // Estados para Atividades
            const [atividades, setAtividades] = useState(() => {
                const saved = localStorage.getItem('atividades');
                return saved ? JSON.parse(saved) : [];
            });
            const [atividadeEditando, setAtividadeEditando] = useState(null);
            const [novoRecursoUrlAtiv, setNovoRecursoUrlAtiv] = useState('');
            const [novoRecursoTipoAtiv, setNovoRecursoTipoAtiv] = useState('link');
            const [filtroTagAtividade, setFiltroTagAtividade] = useState('Todas');
            const [filtroFaixaAtividade, setFiltroFaixaAtividade] = useState('Todas');
            const [filtroConceitoAtividade, setFiltroConceitoAtividade] = useState('Todos');
            const [buscaAtividade, setBuscaAtividade] = useState('');
            const [modalAdicionarAoPlano, setModalAdicionarAoPlano] = useState(null); // Armazena a atividade a ser adicionada
            const [modoVisAtividades, setModoVisAtividades] = useState('grade'); // grade | lista | segmento

            // ============================================================
            // MÓDULO: EVENTOS ESCOLARES E FERIADOS
            // ============================================================
            // Estados para Eventos Escolares e Feriados
            const [eventosEscolares, setEventosEscolares] = useState(() => {
                const saved = localStorage.getItem('eventosEscolares');
                return saved ? JSON.parse(saved) : [];
            });
            const [modalEventos, setModalEventos] = useState(false);
            const [eventoEditando, setEventoEditando] = useState(null);
            const [ocultarFeriados, setOcultarFeriados] = useState(() => {
                const saved = localStorage.getItem('ocultarFeriados');
                return saved === 'true';
            });

            // ============================================================
            // MÓDULO: SEQUÊNCIAS DIDÁTICAS
            // ============================================================
            // Estados para Sequências Didáticas
            const [sequencias, setSequencias] = useState(() => {
                const saved = localStorage.getItem('sequenciasDidaticas');
                return saved ? JSON.parse(saved) : [];
            });
            const [sequenciaEditando, setSequenciaEditando] = useState(null);
            const [sequenciaDetalhe, setSequenciaDetalhe] = useState(null); // Modo detalhe
            const [filtroEscolaSequencias, setFiltroEscolaSequencias] = useState('Todas');
            const [filtroUnidadeSequencias, setFiltroUnidadeSequencias] = useState('Todas');
            const [filtroPeriodoSequencias, setFiltroPeriodoSequencias] = useState('Todos');
            const [buscaProfundaSequencias, setBuscaProfundaSequencias] = useState('');
            const [modalVincularPlano, setModalVincularPlano] = useState(null); // {sequenciaId, slotIndex}
            const [buscaPlanoVinculo, setBuscaPlanoVinculo] = useState('');

            // ============================================================
            // MÓDULO: ESTRATÉGIAS PEDAGÓGICAS
            // ============================================================
            // ── ESTRATÉGIAS PEDAGÓGICAS ──
            const categoriasEstrategiaInicial = ['Escuta','Vocal','Corporal','Rítmica','Instrumental','Improvisação','Criação','Jogo Musical','Análise Musical'];
            const funcoesEstrategiaInicial = ['Foco inicial','Aquecimento corporal','Aquecimento vocal','Desenvolvimento','Consolidação','Transição','Encerramento'];
            const objetivosEstrategiaInicial = ['Desenvolver percepção auditiva','Consolidar consciência rítmica','Desenvolver coordenação motora','Trabalhar afinação','Estimular criatividade musical','Desenvolver improvisação','Ampliar escuta ativa','Desenvolver memória musical','Desenvolver expressão musical','Desenvolver autonomia musical'];

            const [estrategias, setEstrategias] = useState(() => {
                const saved = localStorage.getItem('estrategias');
                return saved ? JSON.parse(saved) : [];
            });
            const [estrategiaEditando, setEstrategiaEditando] = useState(null);
            const [buscaEstrategia, setBuscaEstrategia] = useState('');
            const [filtroCategoriaEstrategia, setFiltroCategoriaEstrategia] = useState('Todas');
            const [filtroFuncaoEstrategia, setFiltroFuncaoEstrategia] = useState('Todas');
            const [filtroObjetivoEstrategia, setFiltroObjetivoEstrategia] = useState('Todos');
            const [mostrarArquivadasEstrategia, setMostrarArquivadasEstrategia] = useState(false);
            const [categoriasEstrategia, setCategoriasEstrategia] = useState(() => {
                const saved = localStorage.getItem('categoriasEstrategia');
                return saved ? JSON.parse(saved) : categoriasEstrategiaInicial;
            });
            const [funcoesEstrategia, setFuncoesEstrategia] = useState(() => {
                const saved = localStorage.getItem('funcoesEstrategia');
                return saved ? JSON.parse(saved) : funcoesEstrategiaInicial;
            });
            const [objetivosEstrategia, setObjetivosEstrategia] = useState(() => {
                const saved = localStorage.getItem('objetivosEstrategia');
                return saved ? JSON.parse(saved) : objetivosEstrategiaInicial;
            });
            const [novaCategoriaEstr, setNovaCategoriaEstr] = useState('');
            const [novaFuncaoEstr, setNovaFuncaoEstr] = useState('');
            const [novoObjetivoEstr, setNovoObjetivoEstr] = useState('');

            // ============================================================
            // MÓDULO: PLANEJAMENTO ANUAL
            // ============================================================
            // ── MEU ANO LETIVO (Planejamento Anual) ──
            const [planejamentoAnual, setPlanejamentoAnual] = useState(() => {
                const saved = localStorage.getItem('planejamentoAnual');
                return saved ? JSON.parse(saved) : [];
            });
            const [anoPlanoAtivoId, setAnoPlanoAtivoId] = useState(() => {
                return localStorage.getItem('anoPlanoAtivoId') || null;
            });
            const [mostrandoFormNovoAno, setMostrandoFormNovoAno] = useState(false);
            const [formNovoAno, setFormNovoAno] = useState({ nome: String(new Date().getFullYear()), dataInicio: '', dataFim: '' });
            const [periodoExpId, setPeriodoExpId] = useState(null);
            const [periodoEditForm, setPeriodoEditForm] = useState(null);
            const [adicionandoPeriodoAno, setAdicionandoPeriodoAno] = useState(false);
            const [formNovoPeriodo, setFormNovoPeriodo] = useState({ nome: '', dataInicio: '', dataFim: '', tema: '', foco: '' });

            // ============================================================
            // MÓDULO: CURRÍCULO
            // ============================================================
            const [conceitos, setConceitos] = useState(() => {
                const saved = localStorage.getItem('conceitosPersonalizados');
                return saved ? JSON.parse(saved) : conceitosIniciais;
            });

            const [unidades, setUnidades] = useState(() => {
                const saved = localStorage.getItem('unidadesPersonalizadas');
                return saved ? JSON.parse(saved) : unidadesIniciais;
            });
            
            // ============================================================
            // MÓDULO: TAGS GLOBAIS
            // ============================================================
            // Estado global de Tags (similar aos conceitos)
            const [tagsGlobais, setTagsGlobais] = useState(() => {
                const saved = localStorage.getItem('tagsGlobais');
                if (saved) return JSON.parse(saved);
                
                // Extrair tags existentes dos planos e atividades
                const tagsSet = new Set();
                planos.forEach(p => (p.tags || []).forEach(t => tagsSet.add(t)));
                atividades.forEach(a => (a.tags || []).forEach(t => tagsSet.add(t)));
                return Array.from(tagsSet).sort();
            });
            
            // Salvar tags globais
            useEffect(() => {
                localStorage.setItem('tagsGlobais', JSON.stringify(tagsGlobais));
            }, [tagsGlobais]);

            // Salvar estratégias e suas listas configuráveis
            useEffect(() => { localStorage.setItem('estrategias', JSON.stringify(estrategias)); }, [estrategias]);
            useEffect(() => { localStorage.setItem('categoriasEstrategia', JSON.stringify(categoriasEstrategia)); }, [categoriasEstrategia]);
            useEffect(() => { localStorage.setItem('funcoesEstrategia', JSON.stringify(funcoesEstrategia)); }, [funcoesEstrategia]);
            useEffect(() => { localStorage.setItem('objetivosEstrategia', JSON.stringify(objetivosEstrategia)); }, [objetivosEstrategia]);

            // Salvar planejamento anual
            useEffect(() => { localStorage.setItem('planejamentoAnual', JSON.stringify(planejamentoAnual)); }, [planejamentoAnual]);
            useEffect(() => { if(anoPlanoAtivoId) localStorage.setItem('anoPlanoAtivoId', anoPlanoAtivoId); }, [anoPlanoAtivoId]);

            // ============================================================
            // MÓDULO: ESTRUTURA HIERÁRQUICA DE TURMAS
            // ============================================================
            // --- ESTADO GLOBAL DE TURMAS ---
            // estrutura: [ { id, nome, series: [ { id, nome, turmas: [ { id, nome } ] } ] } ]
            // ── ESTRUTURA HIERÁRQUICA: ANO LETIVO → ESCOLA → SEGMENTO → TURMA ──
            const [anosLetivos, setAnosLetivos] = useState(() => {
                const saved = localStorage.getItem('anosLetivos');
                if (saved) return JSON.parse(saved);
                
                // Migração automática de dados antigos
                const old = localStorage.getItem('escolasTurmas');
                if (old) {
                    try {
                        const escolasAntigas = JSON.parse(old);
                        const anoAtual = new Date().getFullYear().toString();
                        return [{
                            id: Date.now(),
                            ano: anoAtual,
                            status: 'ativo',
                            escolas: escolasAntigas.map(esc => ({
                                id: esc.id,
                                nome: esc.nome,
                                segmentos: (esc.series || []).map(s => ({
                                    id: s.id,
                                    nome: s.nome,
                                    turmas: s.turmas || []
                                }))
                            }))
                        }];
                    } catch(e) {}
                }
                return [];
            });

            // Listas para Autocomplete
            const escolas = useMemo(() => {
                const s = new Set(); planos.forEach(p => { if (p.escola && p.escola.trim()) s.add(p.escola.trim()); });
                return ["Todas", ...Array.from(s).sort()];
            }, [planos]);

            const duracoesSugestao = useMemo(() => {
                const d = new Set(); planos.forEach(p => { if(p.duracao) d.add(p.duracao); });
                return Array.from(d).sort();
            }, [planos]);
            
            // ============================================================
            // MÓDULO: CONFIGURAÇÕES GLOBAIS
            // ============================================================
            const [statusSalvamento, setStatusSalvamento] = useState('');
            const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

            // ============================================================
            // MÓDULO: HISTÓRICO MUSICAL DA TURMA
            // ============================================================
            // ── HISTÓRICO MUSICAL DA TURMA ──
            const [hmFiltroTurma, setHmFiltroTurma] = useState('');
            const [hmFiltroInicio, setHmFiltroInicio] = useState('');
            const [hmFiltroFim, setHmFiltroFim] = useState('');
            const [hmFiltroBusca, setHmFiltroBusca] = useState('');
            const [hmModalMusica, setHmModalMusica] = useState(null);
            // ============================================================
            // MÓDULO: DRAG AND DROP
            // ============================================================
            const dragItem = useRef(null);
            const dragOverItem = useRef(null);
            const [dragActiveIndex, setDragActiveIndex] = useState(null);
            const [dragOverIndex, setDragOverIndex] = useState(null);
            // ============================================================
            // FUNÇÕES: DRAG & DROP (CARDS)
            // ============================================================
            const handleDragStart = useCallback((index) => { dragItem.current = index; setDragActiveIndex(index); }, []);
            const handleDragEnter = useCallback((index) => { dragOverItem.current = index; setDragOverIndex(index); }, []);
            const handleDragEnd = () => {
                const roteiro = [...(planoEditando.atividadesRoteiro || [])];
                const draggedItem = roteiro.splice(dragItem.current, 1)[0];
                roteiro.splice(dragOverItem.current, 0, draggedItem);
                dragItem.current = null;
                dragOverItem.current = null;
                setDragActiveIndex(null);
                setDragOverIndex(null);
                setPlanoEditando({ ...planoEditando, atividadesRoteiro: roteiro });
            };
            useEffect(() => {
                localStorage.setItem('darkMode', darkMode);
                if (darkMode) { document.documentElement.classList.add('dark'); }
                else { document.documentElement.classList.remove('dark'); }
            }, [darkMode]);
            // ============================================================
            // MÓDULO: BUSCA E FILTROS
            // ============================================================
            const [busca, setBusca] = useState("");

            // Filtros
            const [filtroConceito, setFiltroConceito] = useState("Todos");
            const [filtroUnidade, setFiltroUnidade] = useState("Todos");
            const [filtroFaixa, setFiltroFaixa] = useState("Todos");
            const [filtroNivel, setFiltroNivel] = useState("Todos");
            const [filtroEscola, setFiltroEscola] = useState("Todas");
            const [filtroTag, setFiltroTag] = useState("Todas");
            const [recursosExpandidos, setRecursosExpandidos] = useState({}); // NOVO
            const [modalImportarMusica, setModalImportarMusica] = useState(false);
            const [modalImportarAtividade, setModalImportarAtividade] = useState(false);
            const [atividadeVinculandoMusica, setAtividadeVinculandoMusica] = useState(null);
            const [filtroFavorito, setFiltroFavorito] = useState(false);
            const [filtroStatus, setFiltroStatus] = useState("Todos"); // A Fazer | Em Andamento | Concluído
            const [modoVisualizacao, setModoVisualizacao] = useState('grade');
            const [ordenacaoCards, setOrdenacaoCards] = useState('recente'); // recente | az | status | favoritos
            const [statusDropdownId, setStatusDropdownId] = useState(null); // #7: id do plano com dropdown aberto
            const [modalConfirm, setModalConfirm] = useState(null); // { titulo, conteudo, onConfirm, labelConfirm, labelCancelar, somenteOk }

            // Fechar dropdown de status ao clicar fora
            useEffect(() => {
                if (!statusDropdownId) return;
                const handler = () => setStatusDropdownId(null);
                document.addEventListener('click', handler);
                return () => document.removeEventListener('click', handler);
            }, [statusDropdownId]);

            // ── #12: Atalhos de teclado (useRef para evitar stale closure) ──
            const _kbRef = useRef({});
            useEffect(() => {
                const handler = (e) => {
                    const s = _kbRef.current;
                    const tag = document.activeElement?.tagName?.toLowerCase();
                    const emInput = ['input','textarea','select'].includes(tag) || document.activeElement?.isContentEditable;

                    // Ctrl+S — salvar plano em edição (qualquer contexto)
                    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                        e.preventDefault();
                        if (s.modoEdicao && s.planoEditando) {
                            s.salvarPlano();
                            s.triggerSalvo();
                        }
                        return;
                    }

                    // Esc — fechar modal aberto (em ordem de prioridade)
                    if (e.key === 'Escape') {
                        if (s.modalConfirm)          { s.setModalConfirm(null); return; }
                        if (s.modalRegistro)         { s.setModalRegistro(false); return; }
                        if (s.modalRegistroRapido)   { s.setModalRegistroRapido(false); return; }
                        if (s.modalConfiguracoes)    { s.setModalConfiguracoes(false); return; }
                        if (s.modalNovaFaixa)        { s.setModalNovaFaixa(false); return; }
                        if (s.modalNovaEscola)       { s.setModalNovaEscola(false); return; }
                        if (s.modalTemplates)        { s.setModalTemplates(false); return; }
                        if (s.modalGradeSemanal)     { s.setModalGradeSemanal(false); return; }
                        if (s.modalEventos)          { s.setModalEventos(false); return; }
                        if (s.statusDropdownId)      { s.setStatusDropdownId(null); return; }
                        if (s.modoEdicao)            { s.setModalConfirm({ titulo: 'Sair sem salvar?', conteudo: 'As alterações não salvas serão perdidas.', labelConfirm: 'Sair', labelCancelar: 'Continuar editando', perigo: true, onConfirm: s.fecharModal }); return; }
                        if (s.planoSelecionado)      { s.fecharModal(); return; }
                        return;
                    }

                    // N — novo plano (apenas fora de inputs e sem modal aberto)
                    if (e.key === 'n' || e.key === 'N') {
                        if (emInput) return;
                        const algumModalAberto = s.modalRegistro || s.modalRegistroRapido || s.modalConfiguracoes ||
                            s.modalNovaFaixa || s.modalNovaEscola || s.modalTemplates || s.modalGradeSemanal ||
                            s.modalEventos || s.modoEdicao || s.planoSelecionado;
                        if (algumModalAberto) return;
                        if (s.viewMode === 'lista') { e.preventDefault(); s.novoPlano(); }
                        return;
                    }
                };
                document.addEventListener('keydown', handler);
                return () => document.removeEventListener('keydown', handler);
            }, []); // deps vazios — lê de _kbRef.current, sem stale closure
            // ============================================================
            // MÓDULO: PERÍODO / INTERVALO DE DATAS
            // ============================================================
            const [periodoDias, setPeriodoDias] = useState(30); // 30, 60, 90, 180, 365, 'custom'
            const [dataInicioCustom, setDataInicioCustom] = useState('');
            const [dataFimCustom, setDataFimCustom] = useState('');
            
            // ============================================================
            // MÓDULO: EDIÇÃO DE PLANO
            // ============================================================
            // Edição
            const [planoSelecionado, setPlanoSelecionado] = useState(null);
            const [modoEdicao, setModoEdicao] = useState(false);
            const [planoEditando, setPlanoEditando] = useState(null);
            const [formExpandido, setFormExpandido] = useState(false);
            const [materiaisBloqueados, setMateriaisBloqueados] = useState(() => {
                const saved = localStorage.getItem('materiaisBloqueados');
                return saved ? JSON.parse(saved) : [];
            });
            
            // ============================================================
            // MÓDULO: INPUTS TEMPORÁRIOS
            // ============================================================
            // Inputs temporários
            const [novoConceito, setNovoConceito] = useState("");
            const [adicionandoConceito, setAdicionandoConceito] = useState(false);
            const [novaUnidade, setNovaUnidade] = useState("");
            const [adicionandoUnidade, setAdicionandoUnidade] = useState(false);
            const [novoRecursoUrl, setNovoRecursoUrl] = useState("");
            const [novoRecursoTipo, setNovoRecursoTipo] = useState("link");
            const [novaDataAula, setNovaDataAula] = useState("");
            const [dataEdicao, setDataEdicao] = useState("");

            // ============================================================
            // MÓDULO: CALENDÁRIO E AGENDA
            // ============================================================
            const [dataCalendario, setDataCalendario] = useState(new Date());
            const [semanaResumo, setSemanaResumo] = useState(() => {
                // segunda-feira da semana atual
                const hoje = new Date();
                const dia = hoje.getDay();
                const diff = dia === 0 ? -6 : 1 - dia;
                const seg = new Date(hoje); seg.setDate(hoje.getDate() + diff); seg.setHours(0,0,0,0);
                return seg;
            });
            const [modoResumo, setModoResumo] = useState('semana'); // 'semana' | 'dia'
            const [dataDia, setDataDia] = useState(() => new Date().toISOString().split('T')[0]);
            const [diasExpandidos, setDiasExpandidos] = useState(() => {
                // hoje começa expandido
                return { [new Date().toISOString().split('T')[0]]: true };
            });
            
            // ============================================================
            // MÓDULO: REGISTRO RÁPIDO
            // ============================================================
            // Estados para Registro Rápido
            const [modalRegistroRapido, setModalRegistroRapido] = useState(false);
            const [rrData, setRrData] = useState(() => new Date().toISOString().split('T')[0]);
            const [rrAnoSel, setRrAnoSel] = useState('');
            const [rrEscolaSel, setRrEscolaSel] = useState('');
            const [rrPlanosSegmento, setRrPlanosSegmento] = useState({}); // {segmentoId: planoId}
            const [rrTextos, setRrTextos] = useState({}); // {turmaId: texto}
            
            // ============================================================
            // MÓDULO: GRADE SEMANAL
            // ============================================================
            // Estados para Grade Semanal
            const [gradesSemanas, setGradesSemanas] = useState(() => {
                const saved = localStorage.getItem('gradesSemanas');
                return saved ? JSON.parse(saved) : [];
            });
            const [modalGradeSemanal, setModalGradeSemanal] = useState(false);
            const [gradeEditando, setGradeEditando] = useState(null);
            
            const timeoutSalvamento = useRef(null);

            // ============================================================
            // MÓDULO: TEMPLATES DE ROTEIRO
            // ============================================================
            // Templates de Roteiro
            const [templatesRoteiro, setTemplatesRoteiro] = React.useState(() => {
                const saved = localStorage.getItem('templatesRoteiro');
                return saved ? JSON.parse(saved) : [];
            });
            React.useEffect(() => {
                localStorage.setItem('templatesRoteiro', JSON.stringify(templatesRoteiro));
            }, [templatesRoteiro]);
            const [modalTemplates, setModalTemplates] = React.useState(false);
            const [nomeNovoTemplate, setNomeNovoTemplate] = React.useState('');

            // ============================================================
            // MÓDULO: REGISTRO PÓS-AULA
            // ============================================================
            // Estados para Registro Pós-Aula (com ano letivo - 4 níveis)
            const [modalRegistro, setModalRegistro] = useState(false);
            const [planoParaRegistro, setPlanoParaRegistro] = useState(null);
            const [novoRegistro, setNovoRegistro] = useState({ dataAula: new Date().toISOString().split('T')[0], resumoAula: '', funcionouBem: '', naoFuncionou: '', proximaAula: '', comportamento: '' });
            const [verRegistros, setVerRegistros] = useState(false);
            const [registroEditando, setRegistroEditando] = useState(null);
            // ============================================================
            // MÓDULO: SELEÇÃO DE TURMA
            // ============================================================
            // Seleção de turma (4 níveis)
            const [regAnoSel, setRegAnoSel] = useState('');
            const [regEscolaSel, setRegEscolaSel] = useState('');
            const [regSegmentoSel, setRegSegmentoSel] = useState('');
            const [regTurmaSel, setRegTurmaSel] = useState('');
            // ============================================================
            // MÓDULO: FILTROS DE REGISTROS
            // ============================================================
            // Filtro no histórico (4 níveis)
            const [filtroRegAno, setFiltroRegAno] = useState('');
            const [filtroRegEscola, setFiltroRegEscola] = useState('');
            const [filtroRegSegmento, setFiltroRegSegmento] = useState('');
            const [filtroRegTurma, setFiltroRegTurma] = useState('');
            const [buscaRegistros, setBuscaRegistros] = useState(''); // #3: busca textual nos registros
            const [ytPreviewId, setYtPreviewId] = useState(null); // #9: id do youtube em preview
            // ============================================================
            // MÓDULO: GESTÃO DE TURMAS
            // ============================================================
            // Modal gestão
            const [modalTurmas, setModalTurmas] = useState(false);
            const [anoLetivoSelecionadoModal, setAnoLetivoSelecionadoModal] = useState(() => {
                const anoAtivo = anosLetivos.find(a => a.status === 'ativo');
                return anoAtivo ? anoAtivo.id : (anosLetivos[0]?.id || '');
            });
            const [gtAnoNovo, setGtAnoNovo] = useState('');
            const [gtAnoSel, setGtAnoSel] = useState('');
            const [gtEscolaNome, setGtEscolaNome] = useState('');
            const [gtEscolaSel, setGtEscolaSel] = useState('');
            const [gtSegmentoNome, setGtSegmentoNome] = useState('');
            const [gtSegmentoSel, setGtSegmentoSel] = useState('');
            const [gtTurmaNome, setGtTurmaNome] = useState('');
            const [mostrarArquivados, setMostrarArquivados] = useState(false);
            
            // ============================================================
            // MÓDULO: NOVA ESCOLA
            // ============================================================
            // Modal rápido: cadastrar nova escola
            const [modalNovaEscola, setModalNovaEscola] = useState(false); // 'plano' | 'filtro' | false
            const [novaEscolaNome, setNovaEscolaNome] = useState('');
            const [novaEscolaAnoId, setNovaEscolaAnoId] = useState('');

            // ============================================================
            // MÓDULO: FAIXAS ETÁRIAS
            // ============================================================
            const [faixas, setFaixas] = useState(() => {
                const saved = localStorage.getItem('faixasEtarias');
                return saved ? JSON.parse(saved) : ["Todos", "1\u00b0 ano", "2\u00b0 ano", "3\u00b0 ano", "4\u00b0 ano", "5\u00b0 ano"];
            });
            // ============================================================
            // MÓDULO: CONFIGURAÇÕES E MODAIS
            // ============================================================
            const [modalNovaFaixa, setModalNovaFaixa] = useState(false);
            const [novaFaixaNome, setNovaFaixaNome] = useState('');
            const [modalConfiguracoes, setModalConfiguracoes] = useState(false);
            // Guarda o ID da atividade que aguarda vinculação após cadastrar nova música
            const [pendingAtividadeId, setPendingAtividadeId] = useState(null);
            const [modalNovaMusicaInline, setModalNovaMusicaInline] = useState(false);
            const [novaMusicaInline, setNovaMusicaInline] = useState({ titulo: '', autor: '', origem: '', observacoes: '' });
            const niveis = ["Todos", "Iniciante", "Intermedi\u00e1rio", "Avan\u00e7ado"];

            // Função centralizada para disparar o indicador de salvamento
            // ============================================================
            // FUNÇÕES: SINCRONIZAÇÃO / ESTADO
            // ============================================================
            const triggerSalvo = () => {
                setStatusSalvamento('salvando');
                if (timeoutSalvamento.current) clearTimeout(timeoutSalvamento.current);
                // Se não há usuário logado, resolvemos localmente.
                if (!userId) {
                    timeoutSalvamento.current = setTimeout(() => {
                        setStatusSalvamento('salvo');
                        setTimeout(() => setStatusSalvamento(''), 2000);
                    }, 400);
                }
                // Com userId, o status é atualizado pelo onSyncStatus do syncToSupabase.
            };

            // Callback para receber o resultado real do sync da nuvem
            const onSyncStatus = (status) => {
                setStatusSalvamento(status);
                if (status === 'salvo') {
                    if (timeoutSalvamento.current) clearTimeout(timeoutSalvamento.current);
                    timeoutSalvamento.current = setTimeout(() => setStatusSalvamento(''), 2500);
                }
                // 'erro' fica visível até a próxima tentativa de sync
            };

            // ── CARREGAR DADOS DA NUVEM ──
            // IMPORTANTE: os dados do localStorage são usados apenas como fallback inicial.
            // Assim que o Supabase responde, ele sempre prevalece (para refletir edições de outros dispositivos).
            // ============================================================
            // MÓDULO: CARREGAMENTO DE DADOS
            // ============================================================
            const [dadosCarregados, setDadosCarregados] = useState(false);
            useEffect(() => {
                if (!userId) { setDadosCarregados(true); return; }
                (async () => {
                    try {
                        const [planosC, atividadesC, repertorioC, sequenciasC, anosC, gradesC, eventosC, estrategiasC, planejamentoAnualC, cfg] = await Promise.all([
                            loadFromSupabase('planos', userId),
                            loadFromSupabase('atividades', userId),
                            loadFromSupabase('repertorio', userId),
                            loadFromSupabase('sequencias', userId),
                            loadFromSupabase('anos_letivos', userId),
                            loadFromSupabase('grades_semanas', userId),
                            loadFromSupabase('eventos_escolares', userId),
                            loadFromSupabase('estrategias', userId),
                            loadFromSupabase('planejamento_anual', userId),
                            loadConfiguracoes(userId)
                        ]);

                        // Supabase sempre prevalece sobre localStorage quando retorna dados
                        if (planosC !== null) setPlanos(planosC.length > 0 ? planosC.map(normalizePlano) : []);
                        if (atividadesC !== null) setAtividades(atividadesC.length > 0 ? atividadesC : []);
                        if (repertorioC !== null) setRepertorio(repertorioC.length > 0 ? repertorioC : []);
                        if (sequenciasC !== null) setSequencias(sequenciasC.length > 0 ? sequenciasC : []);
                        if (anosC !== null) setAnosLetivos(anosC.length > 0 ? anosC : []);
                        if (gradesC !== null) setGradesSemanas(gradesC.length > 0 ? gradesC : []);
                        if (eventosC !== null) setEventosEscolares(eventosC.length > 0 ? eventosC : []);
                        if (estrategiasC !== null) setEstrategias(estrategiasC.length > 0 ? estrategiasC : []);
                        if (planejamentoAnualC !== null) setPlanejamentoAnual(planejamentoAnualC.length > 0 ? planejamentoAnualC : []);
                        if (cfg) {
                            if(cfg.conceitos) setConceitos(cfg.conceitos);
                            if(cfg.unidades) setUnidades(cfg.unidades);
                            if(cfg.faixas) setFaixas(cfg.faixas);
                            if(cfg.tagsGlobais) setTagsGlobais(cfg.tagsGlobais);
                            if(cfg.templatesRoteiro) setTemplatesRoteiro(cfg.templatesRoteiro);
                            if(cfg.compassosCustomizados) setCompassosCustomizados(cfg.compassosCustomizados);
                            if(cfg.tonalidadesCustomizadas) setTonalidadesCustomizadas(cfg.tonalidadesCustomizadas);
                            if(cfg.andamentosCustomizados) setAndamentosCustomizados(cfg.andamentosCustomizados);
                            if(cfg.escalasCustomizadas) setEscalasCustomizadas(cfg.escalasCustomizadas);
                            if(cfg.estruturasCustomizadas) setEstruturasCustomizadas(cfg.estruturasCustomizadas);
                            if(cfg.dinamicasCustomizadas) setDinamicasCustomizadas(cfg.dinamicasCustomizadas);
                            if(cfg.energiasCustomizadas) setEnergiasCustomizadas(cfg.energiasCustomizadas);
                            if(cfg.instrumentacaoCustomizada) setInstrumentacaoCustomizada(cfg.instrumentacaoCustomizada);
                        }
                        // Atualiza localStorage com dados frescos da nuvem
                        if (planosC !== null) localStorage.setItem('planosAula', JSON.stringify(planosC));
                        if (repertorioC !== null) localStorage.setItem('repertorio', JSON.stringify(repertorioC));
                    } catch(e) { console.error('[MusiLab] Erro ao carregar da nuvem:', e); }
                    setDadosCarregados(true);
                })();
            }, [userId]);

            // ── SYNC AUTOMÁTICO PARA A NUVEM ──
            const syncTimeout = useRef({});
            const _prevSyncData = useRef(null);
            const syncDelay = (key, fn) => {
                setStatusSalvamento('salvando');
                if(syncTimeout.current[key]) clearTimeout(syncTimeout.current[key]);
                syncTimeout.current[key] = setTimeout(fn, 2000);
            };

            // ── CLEANUP DE TIMEOUTS NO UNMOUNT (evita memory leaks e erros pós-logout) ──
            useEffect(() => {
                return () => {
                    Object.values(syncTimeout.current).forEach(id => clearTimeout(id));
                    if (timeoutSalvamento.current) clearTimeout(timeoutSalvamento.current);
                };
            }, []);
            useEffect(() => {
                if (!userId || !dadosCarregados) return;
                const atual = {
                    planos,
                    atividades,
                    repertorio,
                    sequencias,
                    anos_letivos: anosLetivos,
                    grades_semanas: gradesSemanas,
                    eventos_escolares: eventosEscolares,
                    estrategias,
                    planejamento_anual: planejamentoAnual,
                };
                const prev = _prevSyncData.current;
                _prevSyncData.current = atual;
                if (!prev) return; // primeira execução após carga — evita regravar tudo
                Object.entries(atual).forEach(([tabela, dados]) => {
                    if (dados !== prev[tabela]) {
                        syncDelay(tabela, () => syncToSupabase(tabela, dados, userId, onSyncStatus));
                    }
                });
            }, [planos, atividades, repertorio, sequencias, anosLetivos, gradesSemanas, eventosEscolares, estrategias, planejamentoAnual]);
            useEffect(() => {
                if(!userId||!dadosCarregados) return;
                syncDelay('cfg', ()=>syncConfiguracoes({ conceitos, unidades, faixas, tagsGlobais, templatesRoteiro, compassosCustomizados, tonalidadesCustomizadas, andamentosCustomizados, escalasCustomizadas, estruturasCustomizadas, dinamicasCustomizadas, energiasCustomizadas, instrumentacaoCustomizada }, userId, onSyncStatus));
            }, [conceitos, unidades, faixas, tagsGlobais, templatesRoteiro, compassosCustomizados, tonalidadesCustomizadas, andamentosCustomizados, escalasCustomizadas, estruturasCustomizadas, dinamicasCustomizadas, energiasCustomizadas, instrumentacaoCustomizada]);

            // ── LOGOUT ──
            // CORREÇÃO: limpa o localStorage ao sair para evitar que dados do usuário
            // atual fiquem visíveis caso outra pessoa abra o app no mesmo dispositivo.
            const CHAVES_LOCALSTORAGE = [
                'planosAula', 'repertorio', 'atividades', 'sequenciasDidaticas',
                'anosLetivos', 'gradesSemanas', 'eventosEscolares',
                'conceitosPersonalizados', 'unidadesPersonalizadas',
                'faixasEtarias', 'materiaisBloqueados', 'ocultarFeriados',
                'estrategias', 'categoriasEstrategia', 'funcoesEstrategia', 'objetivosEstrategia',
                'planejamentoAnual', 'anoPlanoAtivoId'
            ];
            // ============================================================
            // FUNÇÕES: AUTENTICAÇÃO / SESSÃO
            // ============================================================
            const fazerLogout = () => {
                setModalConfirm({
                    titulo: 'Sair do MusiLab?',
                    conteudo: 'Seus dados estão salvos na nuvem e estarão disponíveis no próximo acesso.',
                    labelConfirm: 'Sair',
                    labelCancelar: 'Cancelar',
                    perigo: false,
                    onConfirm: async () => {
                        CHAVES_LOCALSTORAGE.forEach(chave => localStorage.removeItem(chave));
                        await supabase.auth.signOut();
                    }
                });
            };

            // ── PROTEÇÃO CONTRA FECHAR ABA COM EDIÇÃO NÃO SALVA ──
            useEffect(() => {
                const handler = (e) => {
                    if (modoEdicao && planoEditando) {
                        e.preventDefault();
                        e.returnValue = ''; // necessário para Chrome/Firefox exibir o diálogo
                    }
                };
                window.addEventListener('beforeunload', handler);
                return () => window.removeEventListener('beforeunload', handler);
            }, [modoEdicao, planoEditando]);

            useEffect(() => {
                localStorage.setItem('planosAula', JSON.stringify(planos));
                triggerSalvo();
            }, [planos]);
            
            useEffect(() => {
                localStorage.setItem('materiaisBloqueados', JSON.stringify(materiaisBloqueados));
            }, [materiaisBloqueados]);

            useEffect(() => { localStorage.setItem('conceitosPersonalizados', JSON.stringify(conceitos)); triggerSalvo(); }, [conceitos]);
            useEffect(() => { localStorage.setItem('unidadesPersonalizadas', JSON.stringify(unidades)); triggerSalvo(); }, [unidades]);
            useEffect(() => { localStorage.setItem('anosLetivos', JSON.stringify(anosLetivos)); triggerSalvo(); }, [anosLetivos]);
            useEffect(() => { localStorage.setItem('faixasEtarias', JSON.stringify(faixas)); triggerSalvo(); }, [faixas]);
            useEffect(() => { localStorage.setItem('gradesSemanas', JSON.stringify(gradesSemanas)); triggerSalvo(); }, [gradesSemanas]);
            useEffect(() => { localStorage.setItem('atividades', JSON.stringify(atividades)); triggerSalvo(); }, [atividades]);
            useEffect(() => { localStorage.setItem('eventosEscolares', JSON.stringify(eventosEscolares)); triggerSalvo(); }, [eventosEscolares]);
            useEffect(() => { localStorage.setItem('sequenciasDidaticas', JSON.stringify(sequencias)); triggerSalvo(); }, [sequencias]);
            useEffect(() => { localStorage.setItem('ocultarFeriados', ocultarFeriados); }, [ocultarFeriados]);
            // CORREÇÃO CRÍTICA: repertorio não tinha useEffect — músicas se perdiam ao fechar
            useEffect(() => { localStorage.setItem('repertorio', JSON.stringify(repertorio)); triggerSalvo(); }, [repertorio]);

            // ============================================================
            // FUNÇÕES: BUSCA E FILTROS
            // ============================================================
            const buscaAvancada = (plano, termoBusca) => {
                if (!termoBusca) return true;
                const termo = termoBusca.toLowerCase();
                const check = (val) => val && val.toLowerCase().includes(termo);
                const objMatch = (plano.objetivosEspecificos || []).some(obj => check(obj));
                return check(plano.titulo) || 
                       check(plano.tema) || 
                       check(plano.metodologia) || 
                       check(plano.objetivoGeral) ||
                       check(plano.escola) ||
                       objMatch || 
                       (plano.habilidadesBNCC || []).some(h => check(h));
            };

            const planosFiltrados = useMemo(() => {
                return planos.filter(plano => {
                    const matchBusca = buscaAvancada(plano, busca);
                    const matchConceito = filtroConceito === "Todos" || (plano.conceitos && plano.conceitos.includes(filtroConceito));
                    const matchUnidade = filtroUnidade === "Todos" || (plano.unidades && plano.unidades.includes(filtroUnidade));
                    const matchFaixa = filtroFaixa === "Todos" || (plano.faixaEtaria && plano.faixaEtaria.includes(filtroFaixa));
                    const matchNivel = filtroNivel === "Todos" || plano.nivel === filtroNivel;
                    const matchEscola = filtroEscola === "Todas" || plano.escola === filtroEscola;
                    const matchTag = filtroTag === "Todas" || (plano.tags && plano.tags.includes(filtroTag));
                    const matchFavorito = !filtroFavorito || plano.destaque;
                    const matchStatus = filtroStatus === "Todos" || (plano.statusPlanejamento || "A Fazer") === filtroStatus;

                    return matchBusca && matchConceito && matchUnidade && matchFaixa && matchNivel && matchEscola && matchTag && matchFavorito && matchStatus;
                }).sort((a, b) => {
                    if (ordenacaoCards === 'az') return (a.titulo||'').localeCompare(b.titulo||'', 'pt-BR');
                    if (ordenacaoCards === 'status') {
                        const ord = {'Em Andamento':0,'A Fazer':1,'Concluído':2};
                        return (ord[a.statusPlanejamento||'A Fazer']||1) - (ord[b.statusPlanejamento||'A Fazer']||1);
                    }
                    if (ordenacaoCards === 'favoritos') return (b.destaque?1:0) - (a.destaque?1:0);
                    return b.id - a.id; // recente
                });
            }, [planos, busca, filtroConceito, filtroUnidade, filtroFaixa, filtroNivel, filtroEscola, filtroTag, filtroFavorito, filtroStatus, ordenacaoCards]);

            const sugerirBNCC = () => {
                const textoAnalise = (
                    (planoEditando.titulo || "") + " " + 
                    (planoEditando.tema || "") + " " + 
                    (planoEditando.objetivoGeral || "") + " " +
                    (planoEditando.objetivosEspecificos || []).join(" ") + " " +
                    (planoEditando.conceitos || []).join(" ")
                ).toLowerCase();

                // Filtrar por segmento se faixa etária for Infantil
                const faixas = planoEditando.faixaEtaria || [];
                const fl = faixas.map(f => f.toLowerCase());
                const ehInfantil = fl.some(f => ['infantil','berçário','maternal','bercario','creche','jardim','pré','pre-'].some(s => f.includes(s)));
                const ehEF69    = fl.some(f => ['6°','7°','8°','9°','6º','7º','8º','9º','6 ano','7 ano','8 ano','9 ano'].some(s => f.includes(s)));
                const ehEJA     = fl.some(f => f.includes('eja') || f.includes('jovens e adultos') || f.includes('adult') || f.includes('ead'));

                const sugestoes = bancoBNCC.filter(item => {
                    const keyMatch = item.keywords.some(key => textoAnalise.includes(key));
                    if (!keyMatch) return false;
                    if (ehEJA) return true; // EJA/Adultos: aceita qualquer segmento BNCC
                    if (ehInfantil && item.segmento === 'Infantil') return true;
                    if (ehEF69    && item.segmento === 'EF6-9')    return true;
                    if (!ehInfantil && !ehEF69 && item.segmento === 'EF1-5') return true;
                    if (!item.segmento) return true; // compatibilidade
                    return false;
                });

                if (sugestoes.length === 0) {
                    // fallback sem filtro de segmento
                    const todas = bancoBNCC.filter(item => item.keywords.some(key => textoAnalise.includes(key)));
                    if (todas.length === 0) { setModalConfirm({ conteudo: 'Adicione mais texto (título, objetivos) para receber sugestões.', somenteOk: true, labelConfirm: 'OK' }); return; }
                    const formatadas = todas.map(s => `[${s.segmento||'BNCC'}] ${s.codigo} - ${s.desc}`);
                    const atuais = planoEditando.habilidadesBNCC || [];
                    setPlanoEditando({ ...planoEditando, habilidadesBNCC: [...new Set([...atuais, ...formatadas])] });
                    setModalConfirm({ conteudo: `✨ ${todas.length} sugestões encontradas!`, somenteOk: true, labelConfirm: 'OK' });
                    return;
                }

                const formatadas = sugestoes.map(s => `[${s.segmento}] ${s.codigo} - ${s.desc}`);
                const atuais = planoEditando.habilidadesBNCC || [];
                setPlanoEditando({ ...planoEditando, habilidadesBNCC: [...new Set([...atuais, ...formatadas])] });
                const segLabel = ehEJA ? 'EJA/Adultos' : ehInfantil ? 'Ed. Infantil' : ehEF69 ? 'EF 6-9' : 'EF 1-5';
                setModalConfirm({ conteudo: `✨ ${sugestoes.length} sugestão(ões) encontrada(s) para ${segLabel}!`, somenteOk: true, labelConfirm: 'OK' });
            };


            

            // ============================================================
            // FUNÇÕES: BACKUP / RESTAURAÇÃO DE DADOS
            // ============================================================
            const baixarBackup = () => {
                const backup = {
                    versao: '2.0', timestamp: new Date().toISOString(),
                    planos, conceitos, unidades, faixas, anosLetivos, gradesSemanas, atividades,
                    eventosEscolares, sequencias, repertorio, tagsGlobais, templatesRoteiro,
                    compassosCustomizados, tonalidadesCustomizadas, andamentosCustomizados,
                    escalasCustomizadas, estruturasCustomizadas, dinamicasCustomizadas,
                    energiasCustomizadas, instrumentacaoCustomizada,
                };
                const blob = new Blob([JSON.stringify(backup, null, 2)], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `musilab-backup-${new Date().toISOString().split('T')[0]}.json`;
                link.click(); URL.revokeObjectURL(url);
            };
            const restaurarBackup = (event) => {
                const file = event.target.files[0]; if (!file) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const backup = JSON.parse(e.target.result);
                        if (!backup.planos) {
                            setModalConfirm({ titulo: 'Arquivo inválido', conteudo: 'Este arquivo não é um backup válido do MusiLab.', somenteOk: true, labelConfirm: 'OK' });
                            return;
                        }
                        const resumo = `📦 Backup de ${backup.timestamp ? new Date(backup.timestamp).toLocaleString('pt-BR') : 'data desconhecida'}\n\n• ${backup.planos?.length||0} planos\n• ${backup.atividades?.length||0} atividades\n• ${backup.sequencias?.length||0} sequências\n• ${backup.repertorio?.length||0} músicas\n\n⚠️ Os dados atuais serão substituídos.`;
                        setModalConfirm({
                            titulo: 'Restaurar Backup?',
                            conteudo: resumo,
                            labelConfirm: 'Restaurar',
                            labelCancelar: 'Cancelar',
                            perigo: true,
                            onConfirm: () => {
                                setPlanos(backup.planos);
                                if(backup.conceitos) setConceitos(backup.conceitos);
                                if(backup.unidades) setUnidades(backup.unidades);
                                if(backup.faixas) setFaixas(backup.faixas);
                                if(backup.anosLetivos) setAnosLetivos(backup.anosLetivos);
                                if(backup.gradesSemanas) setGradesSemanas(backup.gradesSemanas);
                                if(backup.atividades) setAtividades(backup.atividades);
                                if(backup.eventosEscolares) setEventosEscolares(backup.eventosEscolares);
                                if(backup.sequencias) setSequencias(backup.sequencias);
                                if(backup.repertorio) setRepertorio(backup.repertorio);
                                if(backup.tagsGlobais) setTagsGlobais(backup.tagsGlobais);
                                if(backup.templatesRoteiro) setTemplatesRoteiro(backup.templatesRoteiro);
                                if(backup.compassosCustomizados) setCompassosCustomizados(backup.compassosCustomizados);
                                if(backup.tonalidadesCustomizadas) setTonalidadesCustomizadas(backup.tonalidadesCustomizadas);
                                if(backup.andamentosCustomizados) setAndamentosCustomizados(backup.andamentosCustomizados);
                                if(backup.escalasCustomizadas) setEscalasCustomizadas(backup.escalasCustomizadas);
                                if(backup.estruturasCustomizadas) setEstruturasCustomizadas(backup.estruturasCustomizadas);
                                if(backup.dinamicasCustomizadas) setDinamicasCustomizadas(backup.dinamicasCustomizadas);
                                if(backup.energiasCustomizadas) setEnergiasCustomizadas(backup.energiasCustomizadas);
                                if(backup.instrumentacaoCustomizada) setInstrumentacaoCustomizada(backup.instrumentacaoCustomizada);
                                setModalConfirm({ titulo: 'Backup restaurado!', conteudo: `${backup.planos.length} planos · ${backup.repertorio?.length||0} músicas · ${backup.atividades?.length||0} atividades`, somenteOk: true, labelConfirm: 'OK' });
                            }
                        });
                    } catch { setModalConfirm({ titulo: 'Arquivo inválido', conteudo: 'Não foi possível ler o arquivo. Ele pode estar corrompido.', somenteOk: true, labelConfirm: 'OK' }); }
                }; reader.readAsText(file); event.target.value = '';
            };

            // ============================================================
            // FUNÇÕES: REPERTÓRIO — UTILITÁRIOS
            // ============================================================
            const ytIdFromUrl = (url) => {
                if (!url) return null;
                const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
                return m ? m[1] : null;
            };

            // ============================================================
            // FUNÇÕES: PLANOS DE AULA
            // ============================================================
            const novoPlano = () => {
                setPlanoEditando({
                    id: Date.now(),
                    titulo: "", tema: "", conceitos: [], tags: [], faixaEtaria: ["1° ano"], nivel: "Iniciante",
                    duracao: "", objetivoGeral: "", objetivosEspecificos: [], habilidadesBNCC: [],
                    metodologia: "", materiais: [], recursos: [], historicoDatas: [],
                    avaliacaoObservacoes: "", numeroAula: "", escola: "", destaque: false,
                    statusPlanejamento: "A Fazer"
                });
                setPlanoSelecionado(null); setModoEdicao(true); setViewMode('lista');
            };

            const editarPlano = useCallback((plano) => {
                setPlanoEditando(normalizePlano(plano));
                setPlanoSelecionado(null);
                setModoEdicao(true);
                setViewMode('lista');
            }, []);

            const salvarPlano = (ignorarAvisoEscola = false) => {
                if (!planoEditando.titulo || !planoEditando.titulo.trim()) {
                    setModalConfirm({ conteudo: '⚠️ Preencha o título do plano antes de salvar.', somenteOk: true, labelConfirm: 'OK' });
                    return;
                }
                if (!planoEditando.objetivoGeral || !planoEditando.objetivoGeral.trim()) {
                    setModalConfirm({ conteudo: '⚠️ Preencha o objetivo geral antes de salvar.', somenteOk: true, labelConfirm: 'OK' });
                    return;
                }
                if (!ignorarAvisoEscola && (!planoEditando.escola || !planoEditando.escola.trim())) {
                    setModalConfirm({
                        titulo: '🏫 Escola não preenchida',
                        conteudo: 'Sem escola definida, o Histórico Musical por turma não funcionará de forma precisa. Salvar assim mesmo?',
                        labelConfirm: 'Salvar assim mesmo',
                        labelCancelar: 'Voltar e preencher',
                        onConfirm: () => salvarPlano(true),
                    });
                    return;
                }
                // Aviso: escola sem turmas cadastradas
                if (!ignorarAvisoEscola && planoEditando.escola && planoEditando.escola.trim()) {
                    const escolaNorm = planoEditando.escola.trim().toLowerCase();
                    const semTurmas = anosLetivos.some(a => a.escolas.some(e => {
                        const totalTurmas = (e.segmentos || []).reduce((acc, s) => acc + (s.turmas || []).length, 0);
                        return e.nome.trim().toLowerCase() === escolaNorm && totalTurmas === 0;
                    }));
                    if (semTurmas) {
                        setModalConfirm({
                            titulo: '🏫 Escola sem turmas',
                            conteudo: 'A escola selecionada ainda não tem turmas cadastradas. O filtro por turma no Histórico Musical será impreciso. Deseja cadastrar as turmas agora?',
                            labelConfirm: 'Cadastrar turmas',
                            labelCancelar: 'Salvar assim mesmo',
                            onConfirm: () => { salvarPlano(true); setModoEdicao(false); setPlanoEditando(null); setModalTurmas(true); },
                            onCancel: () => salvarPlano(true),
                        });
                        return;
                    }
                }
                const planoParaSalvar = {
                    ...planoEditando,
                    objetivosEspecificos: planoEditando.objetivosEspecificos.filter(i => i.trim() !== ""),
                    habilidadesBNCC: (planoEditando.habilidadesBNCC || []).filter(i => i.trim() !== ""),
                    materiais: planoEditando.materiais.filter(i => i.trim() !== ""),
                    _ultimaEdicao: new Date().toISOString()
                };
                const existe = planos.find(p => p.id === planoParaSalvar.id);
                if (existe) {
                    // Salvar histórico de versões (últimas 3)
                    const versaoAnterior = { ...existe, _versaoSalvaEm: new Date().toISOString() };
                    const historicoAtual = existe._historicoVersoes || [];
                    const novoHistorico = [versaoAnterior, ...historicoAtual].slice(0, 3);
                    setPlanos(planos.map(p => p.id === planoParaSalvar.id ? { ...planoParaSalvar, _historicoVersoes: novoHistorico } : p));
                } else { 
                    setPlanos([...planos, planoParaSalvar]); 
                }
                setModoEdicao(false); setPlanoEditando(null);
            };

            // Restaurar versão anterior do plano
            const restaurarVersao = (plano, versao) => {
                setModalConfirm({
                    titulo: 'Restaurar versão?',
                    conteudo: `Restaurar versão de ${new Date(versao._versaoSalvaEm).toLocaleString('pt-BR')}?\n\nA versão atual será substituída.`,
                    labelConfirm: 'Restaurar',
                    perigo: true,
                    onConfirm: () => {
                        const historicoAtual = plano._historicoVersoes || [];
                        const versaoRestaurada = { ...versao, _historicoVersoes: historicoAtual, _versaoSalvaEm: undefined };
                        delete versaoRestaurada._versaoSalvaEm;
                        setPlanos(planos.map(p => p.id === plano.id ? versaoRestaurada : p));
                        setModalConfirm({ conteudo: '✅ Versão restaurada!', somenteOk: true, labelConfirm: 'OK' });
                    }
                });
            };

            const excluirPlano = useCallback((id) => { setModalConfirm({ titulo: 'Excluir plano?', conteudo: 'Esta ação não pode ser desfeita.', labelConfirm: 'Excluir', perigo: true, onConfirm: () => { setPlanos(prev => prev.filter(p => p.id !== id)); setPlanoSelecionado(null); } }); }, []);
            const fecharModal = () => { setPlanoSelecionado(null); setModoEdicao(false); setPlanoEditando(null); setNovoRecursoUrl(""); setFormExpandido(false); };

            const toggleConceito = (c) => { const atual = planoEditando.conceitos || []; setPlanoEditando({...planoEditando, conceitos: atual.includes(c) ? atual.filter(x=>x!==c) : [...atual, c]}); };
            const toggleFaixa = (f) => { const atual = planoEditando.faixaEtaria || []; setPlanoEditando({...planoEditando, faixaEtaria: atual.includes(f) ? atual.filter(x=>x!==f) : [...atual, f]}); };
            const adicionarRecurso = () => { if(novoRecursoUrl.trim()){ setPlanoEditando({ ...planoEditando, recursos: [...(planoEditando.recursos||[]), {url: novoRecursoUrl.trim(), tipo: novoRecursoTipo}]}); setNovoRecursoUrl(""); } };
            const removerRecurso = (idx) => { const n = [...planoEditando.recursos]; n.splice(idx,1); setPlanoEditando({...planoEditando, recursos: n}); };
            
            // Funções de recursos para ATIVIDADES
            const adicionarRecursoAtiv = () => { 
                if(novoRecursoUrlAtiv.trim()){ 
                    setAtividadeEditando({ 
                        ...atividadeEditando, 
                        recursos: [...(atividadeEditando.recursos||[]), {url: novoRecursoUrlAtiv.trim(), tipo: novoRecursoTipoAtiv}]
                    }); 
                    setNovoRecursoUrlAtiv(""); 
                } 
            };
            const removerRecursoAtiv = (idx) => { 
                const n = [...(atividadeEditando.recursos || [])]; 
                n.splice(idx,1); 
                setAtividadeEditando({...atividadeEditando, recursos: n}); 
            };
            
            // VINCULAR ATIVIDADE A PLANO - Exportar dados
            const vincularAtividadeAoPlano = (atividadeId) => {
                if (!planoEditando) return;
                
                const atividade = atividades.find(a => a.id === atividadeId);
                if (!atividade) return;
                
                // Adicionar à Setlist (Roteiro de Atividades)
                const novaAtivRoteiro = {
                    id: Date.now(),
                    nome: atividade.nome,
                    duracao: atividade.duracao || '',
                    descricao: atividade.descricao || ''
                };
                
                // Mesclar tags (sem duplicar)
                const tagsAtuais = planoEditando.tags || [];
                const novasTags = atividade.tags || [];
                const tagsMescladas = [...new Set([...tagsAtuais, ...novasTags])];
                
                // Mesclar materiais (sem duplicar)
                const materiaisAtuais = planoEditando.materiais || [];
                const novosMateriais = atividade.materiais || [];
                const materiaisMesclados = [...new Set([...materiaisAtuais, ...novosMateriais])];
                
                // Mesclar recursos (sem duplicar URLs)
                const recursosAtuais = planoEditando.recursos || [];
                const novosRecursos = atividade.recursos || [];
                const recursosUnicos = [...recursosAtuais];
                novosRecursos.forEach(rec => {
                    if (!recursosUnicos.find(r => r.url === rec.url)) {
                        recursosUnicos.push(rec);
                    }
                });
                
                // Atualizar plano com todos os dados da atividade
                setPlanoEditando({
                    ...planoEditando,
                    atividadesRoteiro: [...(planoEditando.atividadesRoteiro || []), novaAtivRoteiro],
                    tags: tagsMescladas,
                    materiais: materiaisMesclados,
                    recursos: recursosUnicos
                });
                
                setModalConfirm({ conteudo: `✅ Atividade "${atividade.nome}" vinculada ao plano!\n\nDados exportados:\n• Nome e descrição → Setlist\n• Tags → Tags do plano\n• Materiais → Materiais do plano\n• Links/Imagens → Recursos do plano`, somenteOk: true, labelConfirm: 'OK' });
            };
            
            const adicionarDataEdicao = () => { if(dataEdicao && !(planoEditando.historicoDatas||[]).includes(dataEdicao)) setPlanoEditando({...planoEditando, historicoDatas: [...(planoEditando.historicoDatas||[]), dataEdicao].sort()}); setDataEdicao(""); };
            const removerDataEdicao = (d) => { setPlanoEditando({...planoEditando, historicoDatas: planoEditando.historicoDatas.filter(x=>x!==d)}); };
            const adicionarDataAulaVisualizacao = () => { if(novaDataAula && !(planoSelecionado.historicoDatas||[]).includes(novaDataAula)){ const n = {...planoSelecionado, historicoDatas: [...(planoSelecionado.historicoDatas||[]), novaDataAula].sort()}; setPlanos(planos.map(p=>p.id===n.id?n:p)); setPlanoSelecionado(n); } setNovaDataAula(""); };
            const removerDataAulaVisualizacao = (d) => { setModalConfirm({ titulo: 'Remover data?', conteudo: 'Remover esta data do histórico?', labelConfirm: 'Remover', perigo: true, onConfirm: () => { const n = {...planoSelecionado, historicoDatas: planoSelecionado.historicoDatas.filter(x=>x!==d)}; setPlanos(planos.map(p=>p.id===n.id?n:p)); setPlanoSelecionado(n); } }); };
            const adicionarConceitoNovo = () => { if(novoConceito.trim()){ const c=novoConceito.trim(); if(!(planoEditando.conceitos||[]).includes(c)) setPlanoEditando({...planoEditando, conceitos:[...(planoEditando.conceitos||[]), c]}); if(!conceitos.includes(c)) setConceitos([...conceitos, c].sort()); setNovoConceito(""); setAdicionandoConceito(false); } };
            
            // Funções para TAGS (simetria com Conceitos)
            const adicionarTagNova = (novaTag) => {
                if (!novaTag || !novaTag.trim()) return;
                const tag = novaTag.trim().replace(/^#/, ''); // Remove # inicial se houver
                if (!(planoEditando.tags||[]).includes(tag)) {
                    setPlanoEditando({...planoEditando, tags:[...(planoEditando.tags||[]), tag]});
                }
            };
            const removerTag = (tagParaRemover) => {
                setPlanoEditando({
                    ...planoEditando, 
                    tags: (planoEditando.tags||[]).filter(t => t !== tagParaRemover)
                });
            };
            
            const toggleUnidade = (u) => { const atual = planoEditando.unidades || []; setPlanoEditando({...planoEditando, unidades: atual.includes(u) ? atual.filter(x=>x!==u) : [...atual, u]}); };
            const adicionarUnidadeNova = () => { if(novaUnidade.trim()){ const u=novaUnidade.trim(); if(!(planoEditando.unidades||[]).includes(u)) setPlanoEditando({...planoEditando, unidades:[...(planoEditando.unidades||[]), u]}); if(!unidades.includes(u)) setUnidades([...unidades, u].sort()); setNovaUnidade(""); setAdicionandoUnidade(false); } };
            
            // Funções para gerenciar Roteiro de Atividades
            const adicionarAtividadeRoteiro = () => {
                const novaAtividade = {
                    id: Date.now(),
                    nome: '',
                    duracao: '',
                    descricao: '',
                    conceitos: [...(planoEditando.conceitos || [])],
                    tags: [...(planoEditando.tags || [])],
                    recursos: [],
                    musicasVinculadas: []
                };
                setPlanoEditando({
                    ...planoEditando,
                    atividadesRoteiro: [...(planoEditando.atividadesRoteiro || []), novaAtividade]
                });
            };
            
            const vincularMusicaAtividade = (musica) => {
                // Vincular a atividade no roteiro do plano
                if(planoEditando && planoEditando.atividadesRoteiro) {
                    const atividadeIndex = planoEditando.atividadesRoteiro.findIndex(a => a.id === atividadeVinculandoMusica);
                    if(atividadeIndex !== -1) {
                        const atualizado = [...planoEditando.atividadesRoteiro];
                        const musicasVinculadas = atualizado[atividadeIndex].musicasVinculadas || [];
                        
                        if(musicasVinculadas.find(m => m.id === musica.id)) {
                            setModalConfirm({ conteudo: '⚠️ Música já vinculada a esta atividade!', somenteOk: true, labelConfirm: 'OK' });
                            return;
                        }
                        
                        atualizado[atividadeIndex].musicasVinculadas = [...musicasVinculadas, {
                            id: musica.id,
                            titulo: musica.titulo,
                            autor: musica.autor
                        }];
                        
                        setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                        
                        // Atualizar música no repertório com vínculo ao plano
                        const musicaAtualizada = {...musica, planosVinculados: [...(musica.planosVinculados||[]), planoEditando.id]};
                        const novoRepertorio = repertorio.map(m => m.id === musica.id ? musicaAtualizada : m);
                        setRepertorio(novoRepertorio);
                        localStorage.setItem('repertorio', JSON.stringify(novoRepertorio));
                        
                        setAtividadeVinculandoMusica(null);
                        setModalConfirm({ conteudo: '✅ Música vinculada!', somenteOk: true, labelConfirm: 'OK' });
                        return;
                    }
                }
                
                // Vincular a atividade standalone (banco de atividades)
                if(atividadeEditando && atividadeEditando.id === atividadeVinculandoMusica) {
                    const musicasVinculadas = atividadeEditando.musicasVinculadas || [];
                    
                    if(musicasVinculadas.find(m => m.id === musica.id)) {
                        setModalConfirm({ conteudo: '⚠️ Música já vinculada a esta atividade!', somenteOk: true, labelConfirm: 'OK' });
                        return;
                    }
                    
                    setAtividadeEditando({
                        ...atividadeEditando,
                        musicasVinculadas: [...musicasVinculadas, {
                            id: musica.id,
                            titulo: musica.titulo,
                            autor: musica.autor
                        }]
                    });
                    
                    // Atualizar música no repertório com vínculo à atividade
                    const musicaAtualizada = {
                        ...musica, 
                        atividadesVinculadas: [...(musica.atividadesVinculadas||[]), {
                            id: atividadeEditando.id,
                            nome: atividadeEditando.nome
                        }]
                    };
                    const novoRepertorio = repertorio.map(m => m.id === musica.id ? musicaAtualizada : m);
                    setRepertorio(novoRepertorio);
                    localStorage.setItem('repertorio', JSON.stringify(novoRepertorio));
                    
                    setAtividadeVinculandoMusica(null);
                    alert('✅ Música vinculada!');
                }
            };
            
            const importarMusicaParaPlano = (musica) => {
                const novaAtividade = {
                    id: Date.now(),
                    nome: musica.titulo,
                    duracao: '',
                    descricao: musica.observacoes || '',
                    conceitos: [...(planoEditando.conceitos || [])],
                    tags: [...(planoEditando.tags || [])],
                    recursos: [...(musica.links || []).map(l => ({url: l, tipo: 'link'}))],
                    musicaId: musica.id
                };
                
                // Atualizar plano
                setPlanoEditando({
                    ...planoEditando,
                    atividadesRoteiro: [...(planoEditando.atividadesRoteiro || []), novaAtividade]
                });
                
                // Atualizar música com vínculo
                const musicaAtualizada = {...musica, planosVinculados: [...(musica.planosVinculados||[]), planoEditando.id]};
                const novoRepertorio = repertorio.map(m => m.id === musica.id ? musicaAtualizada : m);
                setRepertorio(novoRepertorio);
                localStorage.setItem('repertorio', JSON.stringify(novoRepertorio));
                
                setModalImportarMusica(false);
                setModalConfirm({ conteudo: '✅ Música importada!', somenteOk: true, labelConfirm: 'OK' });
            };
            
            const importarAtividadeParaPlano = (atividade) => {
                const novaAtividade = {
                    id: Date.now(),
                    nome: atividade.nome,
                    duracao: atividade.duracao || '',
                    descricao: atividade.descricao || '',
                    conceitos: [...(atividade.conceitos || [])],
                    tags: [...(atividade.tags || [])],
                    recursos: [...(atividade.recursos || [])],
                    musicasVinculadas: []
                };
                
                setPlanoEditando({
                    ...planoEditando,
                    atividadesRoteiro: [...(planoEditando.atividadesRoteiro || []), novaAtividade]
                });
                
                setModalImportarAtividade(false);
                setModalConfirm({ conteudo: '✅ Atividade importada!', somenteOk: true, labelConfirm: 'OK' });
            };
            
            const toggleRecursosAtiv = (idx) => {
                setRecursosExpandidos({...recursosExpandidos, [idx]: !recursosExpandidos[idx]});
            };
            
            const removerAtividadeRoteiro = (id) => {
                // Buscar atividade para verificar se tem música vinculada
                const atividadeRemovida = (planoEditando.atividadesRoteiro || []).find(a => a.id === id);
                
                // Remover atividade do plano
                setPlanoEditando({
                    ...planoEditando,
                    atividadesRoteiro: (planoEditando.atividadesRoteiro || []).filter(a => a.id !== id)
                });
                
                // Se tinha música vinculada, remover o vínculo
                if(atividadeRemovida?.musicaId) {
                    const musicaVinculada = repertorio.find(m => m.id === atividadeRemovida.musicaId);
                    if(musicaVinculada) {
                        const musicaAtualizada = {
                            ...musicaVinculada,
                            planosVinculados: (musicaVinculada.planosVinculados || []).filter(pId => pId !== planoEditando.id)
                        };
                        const novoRepertorio = repertorio.map(m => m.id === musicaVinculada.id ? musicaAtualizada : m);
                        setRepertorio(novoRepertorio);
                        localStorage.setItem('repertorio', JSON.stringify(novoRepertorio));
                    }
                }
            };
            
            const atualizarAtividadeRoteiro = (id, campo, valor) => {
                setPlanoEditando({
                    ...planoEditando,
                    atividadesRoteiro: (planoEditando.atividadesRoteiro || []).map(a => 
                        a.id === id ? { ...a, [campo]: valor } : a
                    )
                });
            };
            
            const toggleFavorito = useCallback((plano, e) => {
                if(e) e.stopPropagation();
                const atualizado = { ...plano, destaque: !plano.destaque };
                setPlanos(prev => prev.map(p => p.id === plano.id ? atualizado : p));
                setPlanoSelecionado(prev => prev && prev.id === plano.id ? atualizado : prev);
                setPlanoEditando(prev => prev && prev.id === plano.id ? atualizado : prev);
            }, []);

            // --- FUNÇÕES REGISTRO PÓS-AULA (com turmas) ---
            // ============================================================
            // FUNÇÕES: REGISTROS PÓS-AULA
            // ============================================================
            const abrirModalRegistro = useCallback((plano, e) => {
                if(e) e.stopPropagation();
                setPlanoParaRegistro(plano);
                setNovoRegistro({ dataAula: new Date().toISOString().split('T')[0], resumoAula: '', funcionouBem: '', naoFuncionou: '', proximaAula: '', comportamento: '' });
                setRegAnoSel(''); setRegEscolaSel(''); setRegSegmentoSel(''); setRegTurmaSel('');
                setFiltroRegAno(''); setFiltroRegEscola(''); setFiltroRegSegmento(''); setFiltroRegTurma('');
                setRegistroEditando(null);
                setVerRegistros(false);
                setModalRegistro(true);
            }, []);

            const salvarRegistro = () => {
                if (!novoRegistro.resumoAula && !novoRegistro.funcionouBem && !novoRegistro.naoFuncionou && !novoRegistro.proximaAula && !novoRegistro.comportamento) {
                    setModalConfirm({ conteudo: 'Preencha ao menos um campo!', somenteOk: true, labelConfirm: 'OK' }); return;
                }
                const agora = new Date();
                const { dataAula, ...camposRegistro } = novoRegistro;

                if (registroEditando) {
                    // MODO EDIÇÃO — substitui o registro existente, preserva id e dataRegistro original
                    const atualizado = {
                        ...planoParaRegistro,
                        registrosPosAula: planoParaRegistro.registrosPosAula.map(r =>
                            r.id === registroEditando.id
                                ? { ...r, data: dataAula || r.data, anoLetivo: regAnoSel, escola: regEscolaSel, segmento: regSegmentoSel, turma: regTurmaSel, ...camposRegistro, dataEdicao: agora.toISOString().split('T')[0] }
                                : r
                        )
                    };
                    setPlanos(planos.map(p => p.id === atualizado.id ? atualizado : p));
                    if(planoSelecionado && planoSelecionado.id === atualizado.id) setPlanoSelecionado(atualizado);
                    setPlanoParaRegistro(atualizado);
                } else {
                    // MODO CRIAÇÃO — novo registro
                    const registro = {
                        id: Date.now(),
                        data: dataAula || agora.toISOString().split('T')[0],
                        dataRegistro: agora.toISOString().split('T')[0],
                        hora: agora.toTimeString().slice(0,5),
                        anoLetivo: regAnoSel,
                        escola: regEscolaSel,
                        segmento: regSegmentoSel,
                        turma: regTurmaSel,
                        ...camposRegistro
                    };
                    const atualizado = {
                        ...planoParaRegistro,
                        registrosPosAula: [...(planoParaRegistro.registrosPosAula || []), registro]
                    };
                    setPlanos(planos.map(p => p.id === atualizado.id ? atualizado : p));
                    if(planoSelecionado && planoSelecionado.id === atualizado.id) setPlanoSelecionado(atualizado);
                    setPlanoParaRegistro(atualizado);
                }

                setRegistroEditando(null);
                setVerRegistros(true);
                setNovoRegistro({ dataAula: new Date().toISOString().split('T')[0], resumoAula: '', funcionouBem: '', naoFuncionou: '', proximaAula: '', comportamento: '' });
                setRegAnoSel(''); setRegEscolaSel(''); setRegSegmentoSel(''); setRegTurmaSel('');
            };

            const excluirRegistro = (registroId) => {
                setModalConfirm({ titulo: 'Excluir registro?', conteudo: 'Esta ação não pode ser desfeita.', labelConfirm: 'Excluir', perigo: true, onConfirm: () => {
                    const atualizado = {
                        ...planoParaRegistro,
                        registrosPosAula: planoParaRegistro.registrosPosAula.filter(r => r.id !== registroId)
                    };
                    setPlanos(planos.map(p => p.id === atualizado.id ? atualizado : p));
                    if(planoSelecionado && planoSelecionado.id === atualizado.id) setPlanoSelecionado(atualizado);
                    setPlanoParaRegistro(atualizado);
                } });
            };

            const editarRegistro = (reg) => {
                setRegistroEditando(reg);
                setNovoRegistro({
                    dataAula: reg.data || new Date().toISOString().split('T')[0],
                    resumoAula: reg.resumoAula || '',
                    funcionouBem: reg.funcionouBem || '',
                    naoFuncionou: reg.naoFuncionou || '',
                    proximaAula: reg.proximaAula || '',
                    comportamento: reg.comportamento || ''
                });
                setRegAnoSel(reg.anoLetivo || '');
                setRegEscolaSel(reg.escola || '');
                setRegSegmentoSel(reg.segmento || reg.serie || ''); // compatibilidade
                setRegTurmaSel(reg.turma || '');
                setVerRegistros(false);
            };

            // --- FUNÇÕES GESTÃO DE ANO LETIVO E TURMAS (4 NÍVEIS) ---
            // --- FUNÇÕES FERIADOS E EVENTOS ---
            // Algoritmo de Meeus/Jones/Butcher — calcula a Páscoa para qualquer ano
            // ============================================================
            // FUNÇÕES: CALENDÁRIO / FERIADOS
            // ============================================================
            const calcularPascoa = (ano) => {
                const a = ano % 19;
                const b = Math.floor(ano / 100);
                const c = ano % 100;
                const d = Math.floor(b / 4);
                const e = b % 4;
                const f = Math.floor((b + 8) / 25);
                const g = Math.floor((b - f + 1) / 3);
                const h = (19 * a + b - d - g + 15) % 30;
                const i = Math.floor(c / 4);
                const k = c % 4;
                const l = (32 + 2 * e + 2 * i - h - k) % 7;
                const m = Math.floor((a + 11 * h + 22 * l) / 451);
                const mes = Math.floor((h + l - 7 * m + 114) / 31);
                const dia = ((h + l - 7 * m + 114) % 31) + 1;
                return new Date(ano, mes - 1, dia);
            };

            const feriadosMoveisDinamicos = (ano) => {
                // Primeiro tenta a tabela estática (mais rápido, garante dados históricos)
                if (feriadosNacionais.moveis[ano]) return feriadosNacionais.moveis[ano];
                // Para anos fora da tabela, calcula dinamicamente
                const pascoa = calcularPascoa(ano);
                const toISO = (d) => d.toISOString().split('T')[0];
                const addDias = (d, n) => new Date(d.getTime() + n * 86400000);
                return [
                    { data: toISO(addDias(pascoa, -47)), nome: 'Carnaval' },
                    { data: toISO(addDias(pascoa,  -2)), nome: 'Sexta-feira Santa' },
                    { data: toISO(pascoa),               nome: 'Páscoa' },
                    { data: toISO(addDias(pascoa,  60)), nome: 'Corpus Christi' },
                ];
            };

            const verificarFeriado = (dataStr) => {
                const [ano, mes, dia] = dataStr.split('-').map(Number);

                // Verificar feriados fixos
                const feriadoFixo = feriadosNacionais.fixos.find(f => f.mes === mes && f.dia === dia);
                if (feriadoFixo) return feriadoFixo.nome;

                // Verificar feriados móveis (tabela estática ou cálculo dinâmico)
                const feriadoMovel = feriadosMoveisDinamicos(ano).find(f => f.data === dataStr);
                if (feriadoMovel) return feriadoMovel.nome;

                return null;
            };

            const verificarEvento = (dataStr) => {
                return eventosEscolares.find(e => e.data === dataStr);
            };

            // ============================================================
            // FUNÇÕES: EVENTOS
            // ============================================================
            const novoEvento = () => {
                setEventoEditando({
                    id: Date.now(),
                    nome: '',
                    data: new Date().toISOString().split('T')[0],
                    escolaId: '',
                    anoLetivoId: anosLetivos.find(a => a.anoAtual)?.id || (anosLetivos[0]?.id || '')
                });
            };

            const salvarEvento = () => {
                if (!eventoEditando.nome.trim()) {
                    setModalConfirm({ conteudo: '⚠️ Preencha o nome do evento!', somenteOk: true, labelConfirm: 'OK' });
                    return;
                }
                if (!eventoEditando.data) {
                    setModalConfirm({ conteudo: '⚠️ Preencha a data!', somenteOk: true, labelConfirm: 'OK' });
                    return;
                }
                
                const existe = eventosEscolares.find(e => e.id === eventoEditando.id);
                if (existe) {
                    setEventosEscolares(eventosEscolares.map(e => e.id === eventoEditando.id ? eventoEditando : e));
                } else {
                    setEventosEscolares([...eventosEscolares, eventoEditando]);
                }
                setEventoEditando(null);
                setModalConfirm({ conteudo: '✅ Evento salvo!', somenteOk: true, labelConfirm: 'OK' });
            };

            const excluirEvento = (id) => {
                setModalConfirm({ titulo: 'Excluir evento?', conteudo: '', labelConfirm: 'Excluir', perigo: true, onConfirm: () => {
                    setEventosEscolares(eventosEscolares.filter(e => e.id !== id));
                } });
            };

            // --- FUNÇÕES SEQUÊNCIAS DIDÁTICAS ---
            // ============================================================
            // FUNÇÕES: SEQUÊNCIAS
            // ============================================================
            const novaSequencia = () => {
                // Buscar ano letivo ativo
                const anoAtivo = anosLetivos.find(a => a.status === 'ativo');
                const anoId = anoAtivo ? anoAtivo.id : (anosLetivos[0]?.id || '');
                
                setSequenciaEditando({
                    id: Date.now(),
                    titulo: '',
                    escolaId: '',
                    anoLetivoId: anoId, // Pré-selecionado com ano ativo
                    segmentos: [], // Array de IDs de segmentos
                    turmaEspecifica: '', // Opcional
                    unidadePredominante: '', // NOVO: Unidade pedagógica
                    duracao: 'mensal',
                    numeroSlots: 4,
                    dataInicio: '', // NOVO: Data início
                    dataFim: '', // NOVO: Data fim
                    slots: []
                });
            };

            const gerarSlots = (numero) => {
                const slots = [];
                for (let i = 0; i < numero; i++) {
                    slots.push({
                        id: Date.now() + i,
                        ordem: i + 1,
                        planoVinculado: null, // ID do plano ou null
                        rascunho: {
                            titulo: '',
                            setlist: [],
                            materiais: []
                        }
                    });
                }
                return slots;
            };

            const salvarSequencia = () => {
                if (!sequenciaEditando.titulo.trim()) {
                    setModalConfirm({ conteudo: '⚠️ Preencha o título da sequência!', somenteOk: true, labelConfirm: 'OK' });
                    return;
                }
                if (!sequenciaEditando.escolaId) {
                    setModalConfirm({ conteudo: '⚠️ Selecione uma escola!', somenteOk: true, labelConfirm: 'OK' });
                    return;
                }
                if (!sequenciaEditando.segmentos || sequenciaEditando.segmentos.length === 0) {
                    setModalConfirm({ conteudo: '⚠️ Selecione pelo menos um segmento!', somenteOk: true, labelConfirm: 'OK' });
                    return;
                }
                
                // Gerar slots se ainda não foram gerados
                if (!sequenciaEditando.slots || sequenciaEditando.slots.length === 0) {
                    sequenciaEditando.slots = gerarSlots(sequenciaEditando.numeroSlots);
                }
                
                const existe = sequencias.find(s => s.id === sequenciaEditando.id);
                if (existe) {
                    setSequencias(sequencias.map(s => s.id === sequenciaEditando.id ? sequenciaEditando : s));
                } else {
                    setSequencias([...sequencias, sequenciaEditando]);
                }
                setSequenciaEditando(null);
            };

            const excluirSequencia = (id) => {
                setModalConfirm({ titulo: 'Excluir sequência?', conteudo: 'Esta ação não pode ser desfeita.', labelConfirm: 'Excluir', perigo: true, onConfirm: () => {
                    setSequencias(sequencias.filter(s => s.id !== id));
                } });
            };

            const vincularPlanoAoSlot = (planoId) => {
                if (!modalVincularPlano) return;
                
                const { sequenciaId, slotIndex } = modalVincularPlano;
                const novasSequencias = sequencias.map(seq => {
                    if (seq.id === sequenciaId) {
                        const novosSlots = [...seq.slots];
                        novosSlots[slotIndex] = {
                            ...novosSlots[slotIndex],
                            planoVinculado: planoId,
                            rascunho: { titulo: '', setlist: [], materiais: [] }
                        };
                        return { ...seq, slots: novosSlots };
                    }
                    return seq;
                });
                setSequencias(novasSequencias);
                // Atualizar também o detalhe se estiver aberto
                if (sequenciaDetalhe && sequenciaDetalhe.id === sequenciaId) {
                    setSequenciaDetalhe(novasSequencias.find(s => s.id === sequenciaId));
                }
                setModalVincularPlano(null);
                setBuscaPlanoVinculo('');
            };

            const atualizarRascunhoSlot = (sequenciaId, slotIndex, campo, valor) => {
                const novasSequencias = sequencias.map(seq => {
                    if (seq.id === sequenciaId) {
                        const novosSlots = [...seq.slots];
                        novosSlots[slotIndex] = {
                            ...novosSlots[slotIndex],
                            planoVinculado: null,
                            rascunho: {
                                ...novosSlots[slotIndex].rascunho,
                                [campo]: valor
                            }
                        };
                        return { ...seq, slots: novosSlots };
                    }
                    return seq;
                });
                setSequencias(novasSequencias);
                // Atualizar também o detalhe se estiver aberto
                if (sequenciaDetalhe && sequenciaDetalhe.id === sequenciaId) {
                    setSequenciaDetalhe(novasSequencias.find(s => s.id === sequenciaId));
                }
            };

            const desvincularPlano = (sequenciaId, slotIndex) => {
                const novasSequencias = sequencias.map(seq => {
                    if (seq.id === sequenciaId) {
                        const novosSlots = [...seq.slots];
                        novosSlots[slotIndex] = {
                            ...novosSlots[slotIndex],
                            planoVinculado: null,
                            rascunho: { titulo: '', setlist: [], materiais: [] }
                        };
                        return { ...seq, slots: novosSlots };
                    }
                    return seq;
                });
                setSequencias(novasSequencias);
                // Atualizar também o detalhe se estiver aberto
                if (sequenciaDetalhe && sequenciaDetalhe.id === sequenciaId) {
                    setSequenciaDetalhe(novasSequencias.find(s => s.id === sequenciaId));
                }
            };

            // --- FUNÇÕES BANCO DE ATIVIDADES ---
            // ============================================================
            // FUNÇÕES: ATIVIDADES
            // ============================================================
            const novaAtividade = () => {
                setAtividadeEditando({
                    id: Date.now(),
                    nome: '',
                    descricao: '',
                    faixaEtaria: [],
                    duracao: '',
                    materiais: [],
                    conceitos: [], // NOVO: conceitos musicais
                    tags: [],
                    unidade: '',
                    observacao: '',
                    recursos: [], // NOVO: links e imagens
                    musicasVinculadas: []
                });
            };

            // ── MEU ANO LETIVO: CRUD ──
            const _atualizarAnoPlano = (anoId, campos) => {
                setPlanejamentoAnual(prev => prev.map(a =>
                    a.id === anoId ? { ...a, ...campos, _ultimaEdicao: new Date().toISOString() } : a
                ));
            };

            // ============================================================
            // FUNÇÕES: ANO LETIVO
            // ============================================================
            const criarAnoLetivoPainel = () => {
                if (!formNovoAno.nome.trim()) {
                    setModalConfirm({ conteudo: '⚠️ Defina um nome para o ano letivo!', somenteOk: true, labelConfirm: 'OK' });
                    return;
                }
                const novo = {
                    id: gerarIdSeguro(),
                    nome: formNovoAno.nome.trim(),
                    dataInicio: formNovoAno.dataInicio,
                    dataFim: formNovoAno.dataFim,
                    periodos: [], metas: [],
                    _criadoEm: new Date().toISOString()
                };
                setPlanejamentoAnual(prev => [...prev, novo]);
                setAnoPlanoAtivoId(novo.id);
                setMostrandoFormNovoAno(false);
                setFormNovoAno({ nome: String(new Date().getFullYear()), dataInicio: '', dataFim: '' });
            };

            const excluirAnoPlano = (anoId) => {
                setModalConfirm({
                    titulo: 'Excluir este ano letivo?',
                    conteudo: 'Todos os períodos e metas serão excluídos permanentemente.',
                    labelConfirm: 'Excluir', perigo: true,
                    onConfirm: () => {
                        setPlanejamentoAnual(prev => {
                            const novos = prev.filter(a => a.id !== anoId);
                            if (anoPlanoAtivoId === anoId) setAnoPlanoAtivoId(novos[0]?.id || null);
                            return novos;
                        });
                    }
                });
            };

            const adicionarPeriodoNoAno = (anoId) => {
                if (!formNovoPeriodo.nome.trim()) {
                    setModalConfirm({ conteudo: '⚠️ Defina um nome para o período!', somenteOk: true, labelConfirm: 'OK' });
                    return;
                }
                const periodo = { id: gerarIdSeguro(), ...formNovoPeriodo, reflexao: '', _criadoEm: new Date().toISOString() };
                const ano = planejamentoAnual.find(a => a.id === anoId);
                _atualizarAnoPlano(anoId, { periodos: [...(ano?.periodos||[]), periodo] });
                setFormNovoPeriodo({ nome: '', dataInicio: '', dataFim: '', tema: '', foco: '' });
                setAdicionandoPeriodoAno(false);
            };

            const salvarEdicaoPeriodo = (anoId, periodoId) => {
                if (!periodoEditForm?.nome?.trim()) return;
                const ano = planejamentoAnual.find(a => a.id === anoId);
                if (!ano) return;
                _atualizarAnoPlano(anoId, { periodos: ano.periodos.map(p => p.id === periodoId ? { ...p, ...periodoEditForm } : p) });
                setPeriodoExpId(null); setPeriodoEditForm(null);
            };

            const excluirPeriodoDoAno = (anoId, periodoId) => {
                setModalConfirm({
                    titulo: 'Excluir período?', conteudo: 'Esta ação não pode ser desfeita.',
                    labelConfirm: 'Excluir', perigo: true,
                    onConfirm: () => {
                        const ano = planejamentoAnual.find(a => a.id === anoId);
                        if (!ano) return;
                        _atualizarAnoPlano(anoId, { periodos: ano.periodos.filter(p => p.id !== periodoId) });
                        if (periodoExpId === periodoId) { setPeriodoExpId(null); setPeriodoEditForm(null); }
                    }
                });
            };

            const adicionarMetaNoAno = (anoId, descricao, tipo) => {
                if (!descricao?.trim()) return;
                const meta = { id: gerarIdSeguro(), descricao: descricao.trim(), tipo, _criadoEm: new Date().toISOString() };
                const ano = planejamentoAnual.find(a => a.id === anoId);
                _atualizarAnoPlano(anoId, { metas: [...(ano?.metas||[]), meta] });
            };

            const excluirMetaDoAno = (anoId, metaId) => {
                const ano = planejamentoAnual.find(a => a.id === anoId);
                if (!ano) return;
                _atualizarAnoPlano(anoId, { metas: ano.metas.filter(m => m.id !== metaId) });
            };

            // ── ESTRATÉGIAS: CRUD ──
            // ============================================================
            // FUNÇÕES: ESTRATÉGIAS PEDAGÓGICAS
            // ============================================================
            const novaEstrategia = () => {
                setEstrategiaEditando({
                    id: gerarIdSeguro(),
                    nome: '', descricao: '', categoria: '', funcao: '',
                    objetivos: [], faixaEtaria: '', ativo: true,
                    _criadoEm: new Date().toISOString()
                });
            };

            const salvarEstrategia = () => {
                if (!estrategiaEditando?.nome?.trim()) {
                    setModalConfirm({ conteudo: '⚠️ Preencha o nome da estratégia!', somenteOk: true, labelConfirm: 'OK' });
                    return;
                }
                const agora = new Date().toISOString();
                const item = { ...estrategiaEditando, _ultimaEdicao: agora };
                const existe = estrategias.find(e => e.id === item.id);
                if (existe) {
                    setEstrategias(estrategias.map(e => e.id === item.id ? item : e));
                } else {
                    setEstrategias([...estrategias, item]);
                }
                setEstrategiaEditando(null);
            };

            const excluirEstrategia = (id) => {
                setModalConfirm({
                    titulo: 'Excluir estratégia?',
                    conteudo: 'Esta ação não pode ser desfeita.',
                    labelConfirm: 'Excluir',
                    perigo: true,
                    onConfirm: () => setEstrategias(estrategias.filter(e => e.id !== id))
                });
            };

            const arquivarEstrategia = (id) => {
                setEstrategias(estrategias.map(e => e.id === id ? { ...e, ativo: false, _ultimaEdicao: new Date().toISOString() } : e));
            };

            const restaurarEstrategia = (id) => {
                setEstrategias(estrategias.map(e => e.id === id ? { ...e, ativo: true, _ultimaEdicao: new Date().toISOString() } : e));
            };

            // ============================================================
            // FUNÇÕES: ATIVIDADES — SALVAR / EXCLUIR
            // ============================================================
            const salvarAtividade = () => {
                if (!atividadeEditando.nome.trim()) {
                    setModalConfirm({ conteudo: '⚠️ Preencha o nome da atividade!', somenteOk: true, labelConfirm: 'OK' });
                    return;
                }
                const existe = atividades.find(a => a.id === atividadeEditando.id);
                if (existe) {
                    setAtividades(atividades.map(a => a.id === atividadeEditando.id ? atividadeEditando : a));
                } else {
                    setAtividades([...atividades, atividadeEditando]);
                }
                setAtividadeEditando(null);
                setModalConfirm({ conteudo: '✅ Atividade salva!', somenteOk: true, labelConfirm: 'OK' });
            };

            const excluirAtividade = useCallback((id) => {
                setModalConfirm({ titulo: 'Excluir atividade?', conteudo: 'Esta ação não pode ser desfeita.', labelConfirm: 'Excluir', perigo: true, onConfirm: () => {
                    setAtividades(prev => prev.filter(a => a.id !== id));
                } });
            }, []);

            // ============================================================
            // FUNÇÕES: INTEGRAÇÃO: ATIVIDADES ↔ PLANOS
            // ============================================================
            const adicionarAtividadeAoPlano = (atividadeId, planoId) => {
                const atividade = atividades.find(a => a.id === atividadeId);
                const plano = planos.find(p => p.id === planoId);
                if (!atividade || !plano) return;
                
                // Nova atividade para o roteiro
                const novaAtivRoteiro = {
                    id: Date.now(),
                    nome: atividade.nome,
                    duracao: atividade.duracao || '',
                    descricao: atividade.descricao || ''
                };
                
                // Mesclar CONCEITOS (sem duplicar) - NOVO!
                const conceitosAtuais = plano.conceitos || [];
                const novosConceitos = atividade.conceitos || [];
                const conceitosMesclados = [...new Set([...conceitosAtuais, ...novosConceitos])];
                
                // Mesclar tags (sem duplicar)
                const tagsAtuais = plano.tags || [];
                const novasTags = atividade.tags || [];
                const tagsMescladas = [...new Set([...tagsAtuais, ...novasTags])];
                
                // Mesclar materiais (sem duplicar)
                const materiaisAtuais = plano.materiais || [];
                const novosMateriais = atividade.materiais || [];
                const materiaisMesclados = [...new Set([...materiaisAtuais, ...novosMateriais])];
                
                // Mesclar recursos (sem duplicar URLs)
                const recursosAtuais = plano.recursos || [];
                const novosRecursos = atividade.recursos || [];
                const recursosUnicos = [...recursosAtuais];
                novosRecursos.forEach(rec => {
                    if (!recursosUnicos.find(r => r.url === rec.url)) {
                        recursosUnicos.push(rec);
                    }
                });
                
                // Mesclar unidades (sem duplicar)
                const unidadesAtuais = plano.unidades || [];
                let unidadesMescladas = [...unidadesAtuais];
                if (atividade.unidade && atividade.unidade.trim()) {
                    if (!unidadesMescladas.includes(atividade.unidade)) {
                        unidadesMescladas.push(atividade.unidade);
                    }
                }
                
                // Atualizar plano
                setPlanos(planos.map(p => {
                    if (p.id === planoId) {
                        return { 
                            ...p, 
                            atividadesRoteiro: [...(p.atividadesRoteiro || []), novaAtivRoteiro],
                            conceitos: conceitosMesclados,
                            tags: tagsMescladas,
                            materiais: materiaisMesclados,
                            recursos: recursosUnicos,
                            unidades: unidadesMescladas
                        };
                    }
                    return p;
                }));
                
                setModalAdicionarAoPlano(null);
                setModalConfirm({ conteudo: `✅ Atividade "${atividade.nome}" vinculada ao plano "${plano.titulo}"!\n\n📦 Dados exportados:\n• Nome + Descrição → Setlist\n• Conceitos → Conceitos do plano\n• Tags → Tags do plano\n• Materiais → Materiais do plano\n• Links/Imagens → Recursos do plano\n• Unidade → Unidades do plano`, somenteOk: true, labelConfirm: 'OK' });
            };

            // Funções auxiliares para tags
            const todasAsTags = [...new Set(atividades.flatMap(a => a.tags || []))];

            // --- FUNÇÕES GESTÃO DE TURMAS ---
            // ============================================================
            // FUNÇÕES: GRADE DE TURMAS / CONFIGURAÇÕES
            // ============================================================
            const gtAddAno = () => {
                const ano = gtAnoNovo.trim();
                if (!ano) return;
                if (anosLetivos.find(a => a.ano === ano)) { setModalConfirm({ conteudo: 'Ano letivo já existe!', somenteOk: true, labelConfirm: 'OK' }); return; }
                setAnosLetivos([...anosLetivos, { id: Date.now(), ano, status: 'ativo', escolas: [] }]);
                setGtAnoNovo('');
            };
            const gtMudarStatusAno = (anoId, novoStatus) => {
                setAnosLetivos(anosLetivos.map(a => a.id === anoId ? { ...a, status: novoStatus } : a));
            };
            const gtRemoveAno = (anoId) => {
                setModalConfirm({ titulo: 'Remover ano letivo?', conteudo: 'Todas as escolas e turmas vinculadas serão removidas.', labelConfirm: 'Remover', perigo: true, onConfirm: () => {
                    setAnosLetivos(anosLetivos.filter(a => a.id !== anoId));
                    if (gtAnoSel == anoId) { setGtAnoSel(''); setGtEscolaSel(''); setGtSegmentoSel(''); }
                } });
            };
            const gtAddEscola = () => {
                const nome = gtEscolaNome.trim();
                if (!nome || !gtAnoSel) return;
                setAnosLetivos(anosLetivos.map(a => {
                    if (a.id != gtAnoSel) return a;
                    if (a.escolas.find(e => e.nome === nome)) { setModalConfirm({ conteudo: 'Escola já existe neste ano!', somenteOk: true, labelConfirm: 'OK' }); return a; }
                    return { ...a, escolas: [...a.escolas, { id: Date.now(), nome, segmentos: [] }] };
                }));
                setGtEscolaNome('');
            };
            const gtRemoveEscola = (anoId, escolaId) => {
                setModalConfirm({ titulo: 'Remover escola?', conteudo: 'Todos os segmentos e turmas vinculados serão removidos.', labelConfirm: 'Remover', perigo: true, onConfirm: () => {
                    setAnosLetivos(anosLetivos.map(a => a.id != anoId ? a : { ...a, escolas: a.escolas.filter(e => e.id !== escolaId) }));
                    if (gtEscolaSel == escolaId) { setGtEscolaSel(''); setGtSegmentoSel(''); }
                } });
            };
            const gtAddSegmento = () => {
                const nome = gtSegmentoNome.trim();
                if (!nome || !gtAnoSel || !gtEscolaSel) return;
                setAnosLetivos(anosLetivos.map(a => {
                    if (a.id != gtAnoSel) return a;
                    return { ...a, escolas: a.escolas.map(e => {
                        if (e.id != gtEscolaSel) return e;
                        if (e.segmentos.find(s => s.nome === nome)) { setModalConfirm({ conteudo: 'Segmento já existe!', somenteOk: true, labelConfirm: 'OK' }); return e; }
                        return { ...e, segmentos: [...e.segmentos, { id: Date.now(), nome, turmas: [] }] };
                    })};
                }));
                setGtSegmentoNome('');
            };
            const gtRemoveSegmento = (anoId, escolaId, segmentoId) => {
                setAnosLetivos(anosLetivos.map(a => {
                    if (a.id != anoId) return a;
                    return { ...a, escolas: a.escolas.map(e => {
                        if (e.id != escolaId) return e;
                        return { ...e, segmentos: e.segmentos.filter(s => s.id !== segmentoId) };
                    })};
                }));
                if (gtSegmentoSel == segmentoId) setGtSegmentoSel('');
            };
            const gtAddTurma = () => {
                const nome = gtTurmaNome.trim();
                if (!nome || !gtAnoSel || !gtEscolaSel || !gtSegmentoSel) return;
                setAnosLetivos(anosLetivos.map(a => {
                    if (a.id != gtAnoSel) return a;
                    return { ...a, escolas: a.escolas.map(e => {
                        if (e.id != gtEscolaSel) return e;
                        return { ...e, segmentos: e.segmentos.map(s => {
                            if (s.id != gtSegmentoSel) return s;
                            if (s.turmas.find(t => t.nome === nome)) { setModalConfirm({ conteudo: 'Turma já existe!', somenteOk: true, labelConfirm: 'OK' }); return s; }
                            return { ...s, turmas: [...s.turmas, { id: Date.now(), nome }] };
                        })};
                    })};
                }));
                setGtTurmaNome('');
            };
            const gtRemoveTurma = (anoId, escolaId, segmentoId, turmaId) => {
                setAnosLetivos(anosLetivos.map(a => {
                    if (a.id != anoId) return a;
                    return { ...a, escolas: a.escolas.map(e => {
                        if (e.id != escolaId) return e;
                        return { ...e, segmentos: e.segmentos.map(s => {
                            if (s.id != segmentoId) return s;
                            return { ...s, turmas: s.turmas.filter(t => t.id !== turmaId) };
                        })};
                    })};
                }));
            };

            // --- CADASTRO RÁPIDO DE FAIXA ETÁRIA ---
            // ============================================================
            // FUNÇÕES: CONFIGURAÇÕES: FAIXAS ETÁRIAS E ESCOLAS
            // ============================================================
            const salvarNovaFaixa = () => {
                const nome = novaFaixaNome.trim();
                if (!nome) { setModalConfirm({ conteudo: 'Digite o nome da faixa etária!', somenteOk: true, labelConfirm: 'OK' }); return; }
                if (faixas.includes(nome)) { setModalConfirm({ conteudo: 'Essa faixa já existe!', somenteOk: true, labelConfirm: 'OK' }); return; }
                setFaixas([...faixas, nome]);
                setNovaFaixaNome('');
                setModalNovaFaixa(false);
            };

            // --- EDITOR RICH TEXT ---
            // Componente de editor rico usando contentEditable
            // ============================================================
            // FUNÇÕES: COMPONENTE: EDITOR DE TEXTO RICO
            // ============================================================

            // --- CADASTRO RÁPIDO DE ESCOLA ---
            // ============================================================
            // FUNÇÕES: CONFIGURAÇÕES: ESCOLAS
            // ============================================================
            const salvarNovaEscola = () => {
                const nome = novaEscolaNome.trim();
                if (!nome) { setModalConfirm({ conteudo: 'Digite o nome da escola!', somenteOk: true, labelConfirm: 'OK' }); return; }
                
                // Determinar ano letivo alvo
                const anoId = novaEscolaAnoId || (anosLetivos.find(a => a.status === 'ativo')?.id) || (anosLetivos[0]?.id);
                
                if (anoId) {
                    // Verificar duplicata
                    const ano = anosLetivos.find(a => a.id == anoId);
                    if (ano && ano.escolas.find(e => e.nome.toLowerCase() === nome.toLowerCase())) {
                        // Escola já existe, apenas aplica ao plano
                    } else {
                        // Adicionar escola ao ano letivo
                        setAnosLetivos(anosLetivos.map(a => {
                            if (a.id != anoId) return a;
                            return { ...a, escolas: [...a.escolas, { id: Date.now(), nome, segmentos: [] }] };
                        }));
                    }
                }
                
                // Aplicar ao plano em edição, se modal aberto para isso
                if (modalNovaEscola === 'plano' && planoEditando) {
                    setPlanoEditando({ ...planoEditando, escola: nome });
                }
                
                setNovaEscolaNome('');
                setNovaEscolaAnoId('');
                setModalNovaEscola(false);
                setModalConfirm({ conteudo: `✅ Escola "${nome}" cadastrada com sucesso!`, somenteOk: true, labelConfirm: 'OK' });
            };

            // --- FUNÇÕES GESTÃO DE GRADE SEMANAL ---
            // ============================================================
            // FUNÇÕES: GRADE SEMANAL
            // ============================================================
            const novaGradeSemanal = () => {
                setGradeEditando({
                    id: Date.now(),
                    anoLetivoId: '',
                    escolaId: '',
                    dataInicio: '',
                    dataFim: '',
                    aulas: [] // [{id, diaSemana, horario, segmentoId, turmaId, observacao}]
                });
            };

            const salvarGradeSemanal = () => {
                if (!gradeEditando.anoLetivoId || !gradeEditando.escolaId || !gradeEditando.dataInicio || !gradeEditando.dataFim) {
                    setModalConfirm({ conteudo: '⚠️ Preencha ano letivo, escola e período!', somenteOk: true, labelConfirm: 'OK' });
                    return;
                }

                if (gradeEditando.aulas.length === 0) {
                    setModalConfirm({ conteudo: '⚠️ Adicione pelo menos uma aula!', somenteOk: true, labelConfirm: 'OK' });
                    return;
                }
                
                const existe = gradesSemanas.find(g => g.id === gradeEditando.id);
                if (existe) {
                    setGradesSemanas(gradesSemanas.map(g => g.id === gradeEditando.id ? gradeEditando : g));
                } else {
                    setGradesSemanas([...gradesSemanas, gradeEditando]);
                }
                
                setGradeEditando(null);
                setModalConfirm({ conteudo: '✅ Grade salva!', somenteOk: true, labelConfirm: 'OK' });
            };

            const excluirGradeSemanal = (id) => {
                setModalConfirm({ titulo: 'Excluir grade semanal?', conteudo: 'Esta ação não pode ser desfeita.', labelConfirm: 'Excluir', perigo: true, onConfirm: () => {
                    setGradesSemanas(gradesSemanas.filter(g => g.id !== id));
                } });
            };

            const adicionarAulaGrade = () => {
                const novaAula = {
                    id: Date.now(),
                    diaSemana: 'Segunda',
                    horario: '08:00',
                    segmentoId: '',
                    turmaId: '',
                    observacao: ''
                };
                setGradeEditando({
                    ...gradeEditando,
                    aulas: [...gradeEditando.aulas, novaAula]
                });
            };

            const removerAulaGrade = (aulaId) => {
                setGradeEditando({
                    ...gradeEditando,
                    aulas: gradeEditando.aulas.filter(a => a.id !== aulaId)
                });
            };

            const duplicarAulaGrade = (aula) => {
                const duplicada = { ...aula, id: Date.now() };
                setGradeEditando({
                    ...gradeEditando,
                    aulas: [...gradeEditando.aulas, duplicada]
                });
            };

            const atualizarAulaGrade = (aulaId, campo, valor) => {
                setGradeEditando(prev => ({
                    ...prev,
                    aulas: prev.aulas.map(a => 
                        a.id === aulaId ? { ...a, [campo]: valor } : a
                    )
                }));
            };

            // Função helper: obter turmas do dia para uso em outros módulos
            // ============================================================
            // FUNÇÕES: HISTÓRICO MUSICAL / REGISTRO RÁPIDO
            // ============================================================
            const obterTurmasDoDia = (data) => {
                const diaDaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][new Date(data + 'T12:00:00').getDay()];
                const turmasDoDia = [];
                
                gradesSemanas.forEach(grade => {
                    // Verificar se data está dentro do período da grade
                    if (data < grade.dataInicio || data > grade.dataFim) return;
                    
                    grade.aulas.forEach(aula => {
                        if (aula.diaSemana === diaDaSemana && aula.turmaId) {
                            turmasDoDia.push({
                                ...aula,
                                anoLetivoId: grade.anoLetivoId,
                                escolaId: grade.escolaId
                            });
                        }
                    });
                });
                
                return turmasDoDia;
            };

            // --- FUNÇÃO SUGESTÃO INTELIGENTE DE PLANO ---
            const sugerirPlanoParaTurma = (anoId, escolaId, segmentoId, turmaId) => {
                // Prioridade 1: Último plano registrado naquela turma
                const planosComRegistros = planos.filter(p => {
                    return (p.registrosPosAula || []).some(r => 
                        r.anoLetivo == anoId && r.escola == escolaId && 
                        (r.segmento || r.serie) == segmentoId && r.turma == turmaId
                    );
                }).sort((a, b) => {
                    const lastA = Math.max(...(a.registrosPosAula || []).map(r => r.id || 0));
                    const lastB = Math.max(...(b.registrosPosAula || []).map(r => r.id || 0));
                    return lastB - lastA;
                });
                if (planosComRegistros.length > 0) return planosComRegistros[0].id;

                // Prioridade 2: Plano "Em Andamento" do segmento/escola
                const emAndamento = planos.filter(p => 
                    p.statusPlanejamento === 'Em Andamento' &&
                    (p.faixaEtaria || []).some(f => {
                        const ano = anosLetivos.find(a => a.id == anoId);
                        const esc = ano?.escolas.find(e => e.id == escolaId);
                        const seg = esc?.segmentos.find(s => s.id == segmentoId);
                        return seg && seg.nome.includes(f);
                    })
                );
                if (emAndamento.length > 0) return emAndamento[0].id;

                // Prioridade 3: Plano mais recente do segmento/escola (por escola como fallback)
                const ano = anosLetivos.find(a => a.id == anoId);
                const esc = ano?.escolas.find(e => e.id == escolaId);
                if (esc) {
                    const recentes = planos.filter(p => p.escola === esc.nome).sort((a, b) => b.id - a.id);
                    if (recentes.length > 0) return recentes[0].id;
                }

                return null;
            };

            // --- FUNÇÃO SALVAR REGISTRO RÁPIDO ---
            const salvarRegistroRapido = () => {
                const feriado = verificarFeriado(rrData);
                const _executar = () => {
                const agora = new Date();
                let totalNovos = 0;
                let totalAtualizados = 0;
                
                // Processar cada turma preenchida
                const planosAtualizados = planos.map(plano => {
                    let planoModificado = false;
                    const novosRegistros = [];
                    
                    Object.keys(rrTextos).forEach(turmaId => {
                        const texto = rrTextos[turmaId]?.trim();
                        if (!texto) return;
                        
                        // Encontrar segmento da turma
                        const ano = anosLetivos.find(a => a.id == rrAnoSel);
                        const esc = ano?.escolas.find(e => e.id == rrEscolaSel);
                        let segmentoId = null;
                        for (const seg of esc?.segmentos || []) {
                            if (seg.turmas.find(t => t.id == turmaId)) {
                                segmentoId = seg.id;
                                break;
                            }
                        }
                        
                        const planoId = rrPlanosSegmento[segmentoId];
                        if (planoId != plano.id) return; // Não é deste plano
                        
                        // Verificar se já existe registro desta data/turma neste plano
                        const registroExistente = (plano.registrosPosAula || []).find(r => 
                            r.data === rrData && 
                            r.turma == turmaId
                        );
                        
                        if (registroExistente) {
                            // ATUALIZAR registro existente - adiciona texto ao resumo
                            const resumoAtual = registroExistente.resumoAula || '';
                            const separador = resumoAtual ? '\n' : '';
                            registroExistente.resumoAula = resumoAtual + separador + texto;
                            registroExistente.dataEdicao = agora.toISOString().split('T')[0];
                            planoModificado = true;
                            totalAtualizados++;
                        } else {
                            // CRIAR novo registro
                            const novoRegistro = {
                                id: gerarIdSeguro(),
                                data: rrData,
                                dataRegistro: agora.toISOString().split('T')[0],
                                hora: agora.toTimeString().slice(0,5),
                                anoLetivo: rrAnoSel,
                                escola: rrEscolaSel,
                                segmento: segmentoId,
                                turma: turmaId,
                                resumoAula: texto,
                                funcionouBem: '',
                                naoFuncionou: '',
                                proximaAula: '',
                                comportamento: ''
                            };
                            novosRegistros.push(novoRegistro);
                            planoModificado = true;
                            totalNovos++;
                        }
                    });
                    
                    if (planoModificado) {
                        return {
                            ...plano,
                            registrosPosAula: [...(plano.registrosPosAula || []), ...novosRegistros]
                        };
                    }
                    return plano;
                });
                
                if (totalNovos > 0 || totalAtualizados > 0) {
                    setPlanos(planosAtualizados);
                    
                    let msg = '✅ ';
                    if (totalNovos > 0) msg += `${totalNovos} novo(s)`;
                    if (totalNovos > 0 && totalAtualizados > 0) msg += ' + ';
                    if (totalAtualizados > 0) msg += `${totalAtualizados} atualizado(s)`;
                    msg += '!';
                    
                    setModalConfirm({ conteudo: msg, somenteOk: true, labelConfirm: 'OK' });
                    setModalRegistroRapido(false);
                } else {
                    setModalConfirm({ conteudo: '⚠️ Preencha pelo menos uma turma e selecione um plano.', somenteOk: true, labelConfirm: 'OK' });
                }
                }; // fim _executar
                if (feriado) {
                    setModalConfirm({ titulo: '⚠️ Feriado', conteudo: `Hoje é feriado: ${feriado}\n\nDeseja registrar aula mesmo assim?`, labelConfirm: 'Registrar mesmo assim', onConfirm: _executar });
                } else {
                    _executar();
                }
            };


            // ── Atualiza ref do teclado a cada render (sem stale closure) ──
            _kbRef.current = {
                modoEdicao, planoEditando, planoSelecionado, modalConfirm,
                modalRegistro, modalRegistroRapido, modalConfiguracoes, modalNovaFaixa,
                modalNovaEscola, modalTemplates, modalGradeSemanal, modalEventos,
                statusDropdownId, viewMode,
                fecharModal, salvarPlano, triggerSalvo, novoPlano,
                setModalConfirm, setModalRegistro, setModalRegistroRapido, setModalConfiguracoes,
                setModalNovaFaixa, setModalNovaEscola, setModalTemplates, setModalGradeSemanal,
                setModalEventos, setStatusDropdownId,
            };

            // ============================================================
            // FUNÇÕES: COMPONENTES INTERNOS POR MÓDULO
            // ============================================================
            // ══ COMPONENTE INTERNO: Módulo Ano Letivo ══

            // ── CONTEXT PROVIDER: compartilha estado com módulos filhos ──
            const ctx = {
        abrirModalRegistro,
        accordionAberto,
        addDias,
        adicionandoConceito,
        adicionandoPeriodoAno,
        adicionandoUnidade,
        adicionarAtividadeAoPlano,
        adicionarAtividadeRoteiro,
        adicionarAulaGrade,
        adicionarConceitoNovo,
        adicionarDataAulaVisualizacao,
        adicionarDataEdicao,
        adicionarMetaNoAno,
        adicionarPeriodoNoAno,
        adicionarRecurso,
        adicionarRecursoAtiv,
        adicionarTagNova,
        adicionarUnidadeNova,
        andamentosCustomizados,
        anoLetivoSelecionadoModal,
        anoPlanoAtivoId,
        anosLetivos,
        arquivarEstrategia,
        atividadeEditando,
        atividadeRemovida,
        atividadeVinculandoMusica,
        atividades,
        atualizarAtividadeRoteiro,
        atualizarAulaGrade,
        atualizarRascunhoSlot,
        baixarBackup,
        bncc,
        bold,
        btn,
        busca,
        buscaAtividade,
        buscaAvancada,
        buscaEstilo,
        buscaEstrategia,
        buscaPlanoVinculo,
        buscaProfundaSequencias,
        buscaRegistros,
        buscaRepertorio,
        buscarFonte,
        calcularPascoa,
        carregarFontePDF,
        categoriasEstrategia,
        check,
        checkPageBreak,
        chk,
        compassosCustomizados,
        conceitos,
        criarAnoLetivoPainel,
        dadosCarregados,
        darkMode,
        dataCalendario,
        dataDia,
        dataEdicao,
        dataFimCustom,
        dataInicioCustom,
        desvincularPlano,
        dia,
        diasExpandidos,
        dinamicasCustomizadas,
        dragActiveIndex,
        dragItem,
        dragOverIndex,
        dragOverItem,
        duplicarAulaGrade,
        duracoesSugestao,
        editandoElemento,
        editarPlano,
        editarRegistro,
        editorRef,
        energiasCustomizadas,
        escalasCustomizadas,
        escolas,
        estrategiaEditando,
        estrategias,
        estruturasCustomizadas,
        eventoEditando,
        eventosEscolares,
        excluirAnoPlano,
        excluirAtividade,
        excluirEstrategia,
        excluirEvento,
        excluirGradeSemanal,
        excluirMetaDoAno,
        excluirPeriodoDoAno,
        excluirPlano,
        excluirRegistro,
        excluirSequencia,
        execCmd,
        exportarPlanoPDF,
        exportarSequenciaPDF,
        faixas,
        fazerLogout,
        fecharModal,
        feriadosMoveisDinamicos,
        filtroAndamento,
        filtroCategoriaEstrategia,
        filtroCompasso,
        filtroConceito,
        filtroConceitoAtividade,
        filtroDinamica,
        filtroEnergia,
        filtroEscala,
        filtroEscola,
        filtroEscolaSequencias,
        filtroEstilo,
        filtroEstrutura,
        filtroFaixa,
        filtroFaixaAtividade,
        filtroFavorito,
        filtroFuncaoEstrategia,
        filtroInstrumentacao,
        filtroNivel,
        filtroObjetivoEstrategia,
        filtroOrigem,
        filtroPeriodoSequencias,
        filtroRegAno,
        filtroRegEscola,
        filtroRegSegmento,
        filtroRegTurma,
        filtroStatus,
        filtroTag,
        filtroTagAtividade,
        filtroTonalidade,
        filtroUnidade,
        filtroUnidadeSequencias,
        formExpandido,
        formNovoAno,
        formNovoPeriodo,
        funcoesEstrategia,
        gerarSlots,
        gradeEditando,
        gradesSemanas,
        gtAddAno,
        gtAddEscola,
        gtAddSegmento,
        gtAddTurma,
        gtAnoNovo,
        gtAnoSel,
        gtEscolaNome,
        gtEscolaSel,
        gtMudarStatusAno,
        gtRemoveAno,
        gtRemoveEscola,
        gtRemoveSegmento,
        gtRemoveTurma,
        gtSegmentoNome,
        gtSegmentoSel,
        gtTurmaNome,
        h,
        handleBlur,
        handleDragEnd,
        handleDragEnter,
        handleDragStart,
        handler,
        header,
        hmFiltroBusca,
        hmFiltroFim,
        hmFiltroInicio,
        hmFiltroTurma,
        hmModalMusica,
        htmlToText,
        importarAtividadeParaPlano,
        importarMusicaParaPlano,
        instrumentacaoCustomizada,
        irParaHoje,
        italic,
        l,
        lerLS,
        materiaisBloqueados,
        modalAdicionarAoPlano,
        modalConfiguracoes,
        modalConfirm,
        modalEventos,
        modalGradeSemanal,
        modalImportarAtividade,
        modalImportarMusica,
        modalNovaEscola,
        modalNovaFaixa,
        modalNovaMusicaInline,
        modalRegistro,
        modalRegistroRapido,
        modalTurmas,
        modalVincularPlano,
        modoEdicao,
        modoResumo,
        modoVisAtividades,
        modoVisualizacao,
        mostrandoFormNovoAno,
        mostrarArquivadasEstrategia,
        mostrarArquivados,
        musicaEditando,
        nomesSegmentos,
        novaAtividade,
        novaCategoriaEstr,
        novaDataAula,
        novaEscolaAnoId,
        novaEscolaNome,
        novaEstrategia,
        novaFaixaNome,
        novaFuncaoEstr,
        novaGradeSemanal,
        novaMusicaInline,
        novaSequencia,
        novaUnidade,
        novoConceito,
        novoEvento,
        novoObjetivoEstr,
        novoPlano,
        novoRecursoTipo,
        novoRecursoTipoAtiv,
        novoRecursoUrl,
        novoRecursoUrlAtiv,
        novoRegistro,
        objEsp,
        objMatch,
        objetivosEstrategia,
        obterTurmasDoDia,
        ocultarFeriados,
        onSyncStatus,
        ordenacaoCards,
        para,
        pendingAtividadeId,
        periodoDias,
        periodoEditForm,
        periodoExpId,
        planejamentoAnual,
        planoEditando,
        planoParaRegistro,
        planoSelecionado,
        planos,
        planosFiltrados,
        proximaSemana,
        recursosExpandidos,
        regAnoSel,
        regEscolaSel,
        regSegmentoSel,
        regTurmaSel,
        registroEditando,
        registroExistente,
        removerAtividadeRoteiro,
        removerAulaGrade,
        removerDataAulaVisualizacao,
        removerDataEdicao,
        removerRecurso,
        removerRecursoAtiv,
        removerTag,
        repertorio,
        restaurarBackup,
        restaurarEstrategia,
        restaurarVersao,
        rrAnoSel,
        rrData,
        rrEscolaSel,
        rrPlanosSegmento,
        rrTextos,
        rule,
        salvarAtividade,
        salvarEdicaoPeriodo,
        salvarEstrategia,
        salvarEvento,
        salvarGradeSemanal,
        salvarNovaEscola,
        salvarNovaFaixa,
        salvarPlano,
        salvarRegistro,
        salvarRegistroRapido,
        salvarSequencia,
        sectionTitle,
        semanaAnterior,
        semanaAtual,
        semanaResumo,
        sequenciaDetalhe,
        sequenciaEditando,
        sequencias,
        setAccordionAberto,
        setAdicionandoConceito,
        setAdicionandoPeriodoAno,
        setAdicionandoUnidade,
        setAndamentosCustomizados,
        setAnoLetivoSelecionadoModal,
        setAnoPlanoAtivoId,
        setAnosLetivos,
        setAtividadeEditando,
        setAtividadeVinculandoMusica,
        setAtividades,
        setBold,
        setBusca,
        setBuscaAtividade,
        setBuscaEstilo,
        setBuscaEstrategia,
        setBuscaPlanoVinculo,
        setBuscaProfundaSequencias,
        setBuscaRegistros,
        setBuscaRepertorio,
        setCategoriasEstrategia,
        setCompassosCustomizados,
        setConceitos,
        setDadosCarregados,
        setDarkMode,
        setDataCalendario,
        setDataDia,
        setDataEdicao,
        setDataFimCustom,
        setDataInicioCustom,
        setDiasExpandidos,
        setDinamicasCustomizadas,
        setDragActiveIndex,
        setDragOverIndex,
        setEditandoElemento,
        setEnergiasCustomizadas,
        setEscalasCustomizadas,
        setEstrategiaEditando,
        setEstrategias,
        setEstruturasCustomizadas,
        setEventoEditando,
        setEventosEscolares,
        setFaixas,
        setFiltroAndamento,
        setFiltroCategoriaEstrategia,
        setFiltroCompasso,
        setFiltroConceito,
        setFiltroConceitoAtividade,
        setFiltroDinamica,
        setFiltroEnergia,
        setFiltroEscala,
        setFiltroEscola,
        setFiltroEscolaSequencias,
        setFiltroEstilo,
        setFiltroEstrutura,
        setFiltroFaixa,
        setFiltroFaixaAtividade,
        setFiltroFavorito,
        setFiltroFuncaoEstrategia,
        setFiltroInstrumentacao,
        setFiltroNivel,
        setFiltroObjetivoEstrategia,
        setFiltroOrigem,
        setFiltroPeriodoSequencias,
        setFiltroRegAno,
        setFiltroRegEscola,
        setFiltroRegSegmento,
        setFiltroRegTurma,
        setFiltroStatus,
        setFiltroTag,
        setFiltroTagAtividade,
        setFiltroTonalidade,
        setFiltroUnidade,
        setFiltroUnidadeSequencias,
        setFormExpandido,
        setFormNovoAno,
        setFormNovoPeriodo,
        setFuncoesEstrategia,
        setGradeEditando,
        setGradesSemanas,
        setGtAnoNovo,
        setGtAnoSel,
        setGtEscolaNome,
        setGtEscolaSel,
        setGtSegmentoNome,
        setGtSegmentoSel,
        setGtTurmaNome,
        setHmFiltroBusca,
        setHmFiltroFim,
        setHmFiltroInicio,
        setHmFiltroTurma,
        setHmModalMusica,
        setInstrumentacaoCustomizada,
        setItalic,
        setMateriaisBloqueados,
        setModalAdicionarAoPlano,
        setModalConfiguracoes,
        setModalConfirm,
        setModalEventos,
        setModalGradeSemanal,
        setModalImportarAtividade,
        setModalImportarMusica,
        setModalNovaEscola,
        setModalNovaFaixa,
        setModalNovaMusicaInline,
        setModalRegistro,
        setModalRegistroRapido,
        setModalTurmas,
        setModalVincularPlano,
        setModoEdicao,
        setModoResumo,
        setModoVisAtividades,
        setModoVisualizacao,
        setMostrandoFormNovoAno,
        setMostrarArquivadasEstrategia,
        setMostrarArquivados,
        setMusicaEditando,
        setNovaCategoriaEstr,
        setNovaDataAula,
        setNovaEscolaAnoId,
        setNovaEscolaNome,
        setNovaFaixaNome,
        setNovaFuncaoEstr,
        setNovaMusicaInline,
        setNovaUnidade,
        setNovoConceito,
        setNovoObjetivoEstr,
        setNovoRecursoTipo,
        setNovoRecursoTipoAtiv,
        setNovoRecursoUrl,
        setNovoRecursoUrlAtiv,
        setNovoRegistro,
        setObjetivosEstrategia,
        setOcultarFeriados,
        setOrdenacaoCards,
        setPendingAtividadeId,
        setPeriodoDias,
        setPeriodoEditForm,
        setPeriodoExpId,
        setPlanejamentoAnual,
        setPlanoEditando,
        setPlanoParaRegistro,
        setPlanoSelecionado,
        setPlanos,
        setRecursosExpandidos,
        setRegAnoSel,
        setRegEscolaSel,
        setRegSegmentoSel,
        setRegTurmaSel,
        setRegistroEditando,
        setRepertorio,
        setRrAnoSel,
        setRrData,
        setRrEscolaSel,
        setRrPlanosSegmento,
        setRrTextos,
        setSemanaResumo,
        setSequenciaDetalhe,
        setSequenciaEditando,
        setSequencias,
        setStatusDropdownId,
        setStatusSalvamento,
        setTagsGlobais,
        setTonalidadesCustomizadas,
        setUnderline,
        setUnidades,
        setVerRegistros,
        setViewMode,
        setYtPreviewId,
        statusDropdownId,
        statusSalvamento,
        sugerirBNCC,
        sugerirPlanoParaTurma,
        syncDelay,
        syncTimeout,
        tagsGlobais,
        textoAnalise,
        timeoutSalvamento,
        toISO,
        toggleConceito,
        toggleDia,
        toggleFaixa,
        toggleFavorito,
        toggleRecursosAtiv,
        toggleUnidade,
        tonalidadesCustomizadas,
        totalTurmas,
        triggerSalvo,
        txt,
        uint8ToBase64,
        underline,
        unidades,
        updateButtons,
        verRegistros,
        verificarEvento,
        verificarFeriado,
        viewMode,
        vincularAtividadeAoPlano,
        vincularMusicaAtividade,
        vincularPlanoAoSlot,
        ytIdFromUrl,
        ytPreviewId,
            };
            return (
                <BancoPlanosContext.Provider value={ctx}>
                <div className="min-h-screen bg-slate-50">

                    {/* ══════════ HEADER ══════════ */}
                    <div className="bg-blue-950 text-white shadow-lg">
                        <div className="max-w-7xl mx-auto px-4 pt-4 pb-0">

                            {/* Linha superior: logo + widget hoje */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🎵</span>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">MusiLab</h1>
                                            {/* Indicador de salvamento */}
                                            {statusSalvamento === 'salvando' && (
                                                <span className="flex items-center gap-1 text-xs text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full animate-pulse">
                                                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                                    </svg>
                                                    Salvando…
                                                </span>
                                            )}
                                            {statusSalvamento === 'salvo' && (
                                                <span className="flex items-center gap-1 text-xs text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                                    ✓ Salvo na nuvem
                                                </span>
                                            )}
                                            {statusSalvamento === 'erro' && (
                                                <span className="flex items-center gap-1 text-xs text-red-300 bg-red-500/20 border border-red-500/40 px-2 py-0.5 rounded-full" title="Falha ao sincronizar com a nuvem. Seus dados estão salvos localmente e serão sincronizados quando a conexão voltar.">
                                                    ⚠ Sem conexão — salvo localmente
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-slate-300 text-sm mt-0.5 flex items-center gap-2 flex-wrap">
                                            Planejamento Musical · {userName}
                                            <span className="text-slate-500 text-xs" title="Atalhos: N = Nova aula | Esc = Fechar | Ctrl+S = Salvar">⌨ atalhos</span>
                                            <button onClick={fazerLogout} className="text-slate-400 hover:text-red-400 transition text-xs">⎋ sair</button>
                                            <button onClick={()=>setDarkMode(!darkMode)} className="text-slate-400 hover:text-yellow-300 transition text-xs ml-1" title="Alternar modo escuro">
                                                {darkMode ? '☀️' : '🌙'}
                                            </button>
                                        </p>
                                    </div>
                                </div>

                                {/* Widget "hoje" compacto */}
                                <div className="bg-blue-900 border border-blue-800 rounded-xl px-4 py-2.5 text-sm min-w-[260px]">
                                    <div className="font-medium text-slate-300 text-xs mb-1.5">
                                        📅 {new Date().toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long'})}
                                    </div>
                                    {(() => {
                                        const hoje = new Date();
                                        const hojeStr = hoje.toISOString().split('T')[0];
                                        // #6: combina historicoDatas + registrosPosAula de hoje
                                        const aulasHojeHist = planos.filter(p => p.historicoDatas?.includes(hojeStr));
                                        const aulasHojeReg  = planos.filter(p =>
                                            !(p.historicoDatas?.includes(hojeStr)) &&
                                            (p.registrosPosAula||[]).some(r => r.data === hojeStr)
                                        );
                                        const aulasHoje = [...aulasHojeHist, ...aulasHojeReg];
                                        const feriadoHoje = [...(feriadosNacionais.fixos||[]), ...(feriadosNacionais.moveis?.[hoje.getFullYear()]||[])].find(f => {
                                            return new Date(hoje.getFullYear(), f.mes-1, f.dia).toDateString() === hoje.toDateString();
                                        });
                                        if(feriadoHoje) return <div className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded">🎉 {feriadoHoje.nome}</div>;
                                        const proximoEvento = eventosEscolares.filter(e => new Date(e.data+'T23:59:59') >= new Date()).sort((a,b)=>new Date(a.data)-new Date(b.data))[0];
                                        return (
                                            <>
                                                {aulasHoje.length > 0 && (
                                                    <div className="text-xs bg-emerald-500/15 text-emerald-300 px-2 py-1 rounded mb-1">
                                                        🎓 <span className="font-semibold">{aulasHoje.length} aula(s) hoje</span>
                                                        <span className="text-slate-400 ml-1">— {aulasHoje.map(p=>p.turma||'?').join(', ')}</span>
                                                    </div>
                                                )}
                                                {proximoEvento ? (
                                                    <div className="text-xs text-slate-400">
                                                        📌 <span className="text-slate-200 font-medium">{proximoEvento.nome||proximoEvento.titulo}</span>
                                                        <span className="ml-1">em {Math.ceil((new Date(proximoEvento.data+'T00:00:00')-new Date())/(1000*60*60*24))} dias</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-slate-500 italic">Nenhum evento próximo</div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* ══ NAVBAR em dois grupos ══ */}
                            <div className="flex items-end gap-1 overflow-x-auto pb-0">

                                {/* GRUPO 1: Trabalho diário */}
                                <div className="flex items-end gap-1 mr-3">
                                    {[
                                        { label:'Início',     icon:'🏠', mode:'lista',      action:()=>{setViewMode('lista'); setModoEdicao(false); setPlanoEditando(null);} },
                                        { label:'Nova Aula',  icon:'➕', mode:'nova',       action: novoPlano, accent: true },
                                        { label:'Hoje',       icon:'☀️', mode:'resumoDia',  action:()=>setViewMode('resumoDia') },
                                        { label:'Calendário', icon:'📅', mode:'calendario', action:()=>setViewMode('calendario') },
                                        { label:'Meu Ano', icon:'🗓️', mode:'anoLetivo', action:()=>setViewMode('anoLetivo') },
                                        { label:'Histórico', icon:'📊', mode:'historicoMusical', action:()=>setViewMode('historicoMusical') },
                                    ].map(({label, icon, mode, action, accent}) => {
                                        const isActive = viewMode === mode;
                                        return (
                                            <button key={label} onClick={action}
                                                className={`relative flex items-center gap-1 px-3 py-2 rounded-t-xl text-xs font-semibold whitespace-nowrap transition-all
                                                    ${accent
                                                        ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                                                        : isActive
                                                            ? 'bg-white text-slate-800 shadow-sm'
                                                            : 'bg-blue-900/70 hover:bg-blue-800/80 text-blue-200 hover:text-white border border-blue-700/50'}`}>
                                                <span>{icon}</span>
                                                <span>{label}</span>
                                                {isActive && !accent && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-500 rounded-full"/>}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Divisor */}
                                <div className="self-center h-5 w-px bg-blue-700/60 mx-1 mb-1"/>

                                {/* GRUPO 2: Biblioteca */}
                                <div className="flex items-end gap-1">
                                    {[
                                        { label:'Repertório', icon:'🎼', mode:'repertorio' },
                                        { label:'Estratégias', icon:'🧩', mode:'estrategias' },
                                        { label:'Atividades', icon:'🎁', mode:'atividades' },
                                        { label:'Sequências', icon:'📚', mode:'sequencias' },
                                    ].map(({label, icon, mode}) => {
                                        const isActive = viewMode === mode;
                                        return (
                                            <button key={label} onClick={()=>setViewMode(mode)}
                                                className={`relative flex items-center gap-1 px-3 py-2 rounded-t-xl text-xs font-semibold whitespace-nowrap transition-all
                                                    ${isActive
                                                        ? 'bg-white text-slate-800 shadow-sm'
                                                        : 'bg-blue-900/70 hover:bg-blue-800/80 text-blue-200 hover:text-white border border-blue-700/50'}`}>
                                                <span>{icon}</span>
                                                <span>{label}</span>
                                                {isActive && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-violet-500 rounded-full"/>}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Espaçador */}
                                <div className="flex-1"/>

                                {/* ⚙️ Configurações */}
                                <div className="flex items-end">
                                    <button onClick={()=>setModalConfiguracoes(true)}
                                        className="flex items-center gap-1 px-3 py-2 rounded-t-xl text-xs font-medium bg-blue-900/40 hover:bg-blue-800/60 text-blue-300/80 hover:text-white transition-all">
                                        ⚙️ Config
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                    {/* Faixa sutil de separação */}
                    <div className="h-px bg-slate-200"/>

                    {/* ══════════ MODAL CONFIGURAÇÕES ══════════ */}
                    {modalConfiguracoes && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={()=>setModalConfiguracoes(false)}>
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e=>e.stopPropagation()}>
                                <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white p-5 rounded-t-2xl flex justify-between items-center">
                                    <div>
                                        <h2 className="text-xl font-bold">⚙️ Configurações</h2>
                                        <p className="text-slate-300 text-sm mt-0.5">Gestão do ano letivo e dados do sistema</p>
                                    </div>
                                    <button onClick={()=>setModalConfiguracoes(false)} className="text-white/60 hover:text-white text-2xl font-bold">×</button>
                                </div>
                                <div className="p-5 space-y-3">

                                    {/* Ano Letivo / Escola */}
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-2xl">📅</span>
                                            <div>
                                                <div className="font-bold text-gray-800">Ano Letivo & Escolas</div>
                                                <div className="text-xs text-gray-500">Cadastre anos, escolas e eventos</div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-indigo-600 mb-2">{anosLetivos.length} ano(s) cadastrado(s)</div>
                                        <button onClick={()=>{ setModalConfiguracoes(false); setModalTurmas(true); }}
                                            className="w-full border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 py-2 rounded-lg text-sm font-bold">
                                            Gerenciar Anos Letivos
                                        </button>
                                    </div>

                                    {/* Turmas */}
                                    <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-2xl">🏫</span>
                                            <div>
                                                <div className="font-bold text-gray-800">Turmas & Horários</div>
                                                <div className="text-xs text-gray-500">Configure suas turmas por escola</div>
                                            </div>
                                        </div>
                                        <button onClick={()=>{ setModalConfiguracoes(false); setModalTurmas(true); }}
                                            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-lg text-sm font-bold">
                                            Gerenciar Turmas
                                        </button>
                                    </div>

                                    {/* Grade Semanal */}
                                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-2xl">📆</span>
                                            <div>
                                                <div className="font-bold text-gray-800">Grade Semanal</div>
                                                <div className="text-xs text-gray-500">Horários fixos por escola e semana</div>
                                            </div>
                                        </div>
                                        <button onClick={()=>{ setModalConfiguracoes(false); setModalGradeSemanal(true); }}
                                            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-bold">
                                            Gerenciar Grade Semanal
                                        </button>
                                    </div>

                                    {/* Backup */}
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="text-2xl">💾</span>
                                            <div>
                                                <div className="font-bold text-gray-800">Backup & Restauração</div>
                                                <div className="text-xs text-gray-500">Salve ou recupere todos os dados</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={()=>{ baixarBackup(); setModalConfiguracoes(false); }}
                                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-bold">
                                                💾 Baixar Backup
                                            </button>
                                            <label className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-bold text-center cursor-pointer">
                                                📥 Restaurar
                                                <input type="file" accept=".json" onChange={(e)=>{ restaurarBackup(e); setModalConfiguracoes(false); }} className="hidden"/>
                                            </label>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    )}

                    <div className="max-w-7xl mx-auto px-4 py-6">
                        {viewMode==='resumoDia' && <ErrorBoundary modulo="Resumo do Dia"><Suspense fallback={<CarregandoModulo />}><TelaResumoDia /></Suspense></ErrorBoundary>}
                        {viewMode==='calendario' && <ErrorBoundary modulo="Calendário"><Suspense fallback={<CarregandoModulo />}><TelaCalendario /></Suspense></ErrorBoundary>}

                        {/* ══════════════ HISTÓRICO MUSICAL DA TURMA ══════════════ */}
                        {viewMode === 'historicoMusical' && <ErrorBoundary modulo="Histórico Musical"><Suspense fallback={<CarregandoModulo />}><ModuloHistoricoMusical /></Suspense></ErrorBoundary>}

                        {/* ══════════════ MEU ANO LETIVO ══════════════ */}
                        {viewMode === 'anoLetivo' && <ErrorBoundary modulo="Meu Ano Letivo"><Suspense fallback={<CarregandoModulo />}><ModuloAnoLetivo /></Suspense></ErrorBoundary>}

                        {/* ══════════════ ESTRATÉGIAS PEDAGÓGICAS ══════════════ */}
                        {viewMode === 'estrategias' && <ErrorBoundary modulo="Estratégias"><Suspense fallback={<CarregandoModulo />}><ModuloEstrategias /></Suspense></ErrorBoundary>}

                        {/* ══════════════ BANCO DE ATIVIDADES ══════════════ */}
                        {viewMode === 'atividades' && <ErrorBoundary modulo="Atividades"><Suspense fallback={<CarregandoModulo />}><ModuloAtividades /></Suspense></ErrorBoundary>}

                        {/* ═══════════ VIEW SEQUÊNCIAS DIDÁTICAS ═══════════ */}
                        {viewMode === 'sequencias' && <ErrorBoundary modulo="Sequências"><Suspense fallback={<CarregandoModulo />}><ModuloSequencias /></Suspense></ErrorBoundary>}
                        {viewMode === 'lista' && <ErrorBoundary modulo="Início"><Suspense fallback={<CarregandoModulo />}><TelaPrincipal /></Suspense></ErrorBoundary>}
                    </div>

                    {/* MODAL VER COMPLETO */}

                        {/* REPERTÓRIO INTELIGENTE */}
                        {viewMode === 'repertorio' && <ErrorBoundary modulo="Repertório"><Suspense fallback={<CarregandoModulo />}><ModuloRepertorio /></Suspense></ErrorBoundary>}

                    {planoSelecionado && !modoEdicao && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={fecharModal}>
                            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e)=>e.stopPropagation()}>

                                {/* Barra fina colorida no topo */}
                                <div className={`h-1.5 rounded-t-2xl ${planoSelecionado.destaque ? 'bg-gradient-to-r from-yellow-400 to-amber-400' : 'bg-gradient-to-r from-blue-400 to-indigo-400'}`}/>

                                {/* Header limpo */}
                                <div className="px-6 pt-5 pb-4 sticky top-1.5 bg-white z-10 border-b border-slate-100">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            {planoSelecionado.destaque && <span className="inline-flex items-center text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full font-semibold mb-1.5">★ Favorita</span>}
                                            <h2 className="text-2xl font-bold text-slate-800 leading-tight">{planoSelecionado.titulo}</h2>
                                            {planoSelecionado.escola && <p className="text-slate-500 text-sm mt-1">🏫 {planoSelecionado.escola}</p>}
                                        </div>
                                        <button onClick={fecharModal} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition shrink-0 text-lg">✕</button>
                                    </div>
                                </div>

                                <div className="p-6 space-y-5">

                                    {/* Histórico de Aulas */}
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">📅 Histórico de Aulas</p>
                                        <div className="flex gap-2 mb-3">
                                            <input type="date" value={novaDataAula} onChange={e=>setNovaDataAula(e.target.value)} className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"/>
                                            <button onClick={adicionarDataAulaVisualizacao} className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-4 py-2 rounded-xl text-sm font-semibold transition">+ Adicionar</button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">{planoSelecionado.historicoDatas?.map(d=><span key={d} className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-full text-sm">{new Date(d+'T12:00:00').toLocaleDateString('pt-BR')} <button onClick={()=>removerDataAulaVisualizacao(d)} className="text-slate-400 hover:text-red-500 font-bold ml-1">×</button></span>)}</div>
                                    </div>

                                    {/* Ações */}
                                    <div className="flex gap-2 flex-wrap">
                                        <button onClick={()=>abrirModalRegistro(planoSelecionado)} className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-4 py-2 rounded-xl font-semibold text-sm transition">
                                            📝 Registro Pós-Aula {planoSelecionado.registrosPosAula?.length > 0 && `(${planoSelecionado.registrosPosAula.length})`}
                                        </button>
                                        <button onClick={()=>toggleFavorito(planoSelecionado)} className={`px-4 py-2 rounded-xl font-semibold text-sm border transition ${planoSelecionado.destaque ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                                            {planoSelecionado.destaque ? '★ Favorita' : '☆ Marcar como Favorita'}
                                        </button>
                                    </div>

                                    {/* Objetivo Geral */}
                                    {planoSelecionado.objetivoGeral && (
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">🎯 Objetivo Geral</p>
                                            <div className="text-slate-700 text-sm rich-editor-area" dangerouslySetInnerHTML={{__html: sanitizar(planoSelecionado.objetivoGeral)}} />
                                        </div>
                                    )}

                                    {/* Objetivos Específicos */}
                                    {planoSelecionado.objetivosEspecificos.length > 0 && (
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">🎯 Objetivos Específicos</p>
                                            <div className="text-slate-700 text-sm rich-editor-area" dangerouslySetInnerHTML={{__html: sanitizar(
                                                Array.isArray(planoSelecionado.objetivosEspecificos) && planoSelecionado.objetivosEspecificos.length === 1
                                                    ? planoSelecionado.objetivosEspecificos[0]
                                                    : planoSelecionado.objetivosEspecificos.join('<br/>')
                                            )}} />
                                        </div>
                                    )}

                                    {/* Habilidades BNCC */}
                                    {planoSelecionado.habilidadesBNCC && planoSelecionado.habilidadesBNCC.length > 0 && (
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">🏛️ Habilidades BNCC</p>
                                            <div className="space-y-1.5">{planoSelecionado.habilidadesBNCC.map((hab, i) => { const [cod, ...resto] = hab.split(' - '); return (<div key={i} className="flex gap-2 items-start bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"><span className="text-xs font-bold text-blue-600 shrink-0 mt-0.5">{cod}</span><span className="text-sm text-slate-700">{resto.join(' - ')}</span></div>); })}</div>
                                        </div>
                                    )}

                                    {/* Detalhes + Conceitos */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Detalhes</p>
                                            <div className="space-y-1 text-sm">
                                                {planoSelecionado.nivel && <p><span className="text-slate-400">Nível:</span> <span className="text-slate-700 font-medium">{planoSelecionado.nivel}</span></p>}
                                                {planoSelecionado.duracao && <p><span className="text-slate-400">Duração:</span> <span className="text-slate-700 font-medium">{planoSelecionado.duracao}</span></p>}
                                                {planoSelecionado.tema && <p><span className="text-slate-400">Tema:</span> <span className="text-slate-700 font-medium">{planoSelecionado.tema}</span></p>}
                                            </div>
                                        </div>
                                        {(planoSelecionado.conceitos||[]).length > 0 && (
                                            <div>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Conceitos</p>
                                                <div className="flex flex-wrap gap-1.5">{(planoSelecionado.conceitos||[]).map(c=><span key={c} className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-full">{c}</span>)}</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Materiais */}
                                    {planoSelecionado.materiais.length > 0 && (
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">📦 Materiais</p>
                                            <div className="flex flex-wrap gap-1.5">{planoSelecionado.materiais.map((m,i)=><span key={i} className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-full">{m}</span>)}</div>
                                        </div>
                                    )}

                                    {/* Roteiro de Atividades */}
                                    {planoSelecionado.atividadesRoteiro?.length > 0 && (
                                        <div className="border-t border-slate-100 pt-5">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">📋 Roteiro de Atividades</p>
                                            <div className="space-y-2">
                                                {planoSelecionado.atividadesRoteiro.map((ativ, i) => (
                                                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full shrink-0">{i+1}</span>
                                                            {ativ.nome && <span className="font-semibold text-slate-800 text-sm">{ativ.nome}</span>}
                                                            {ativ.duracao && <span className="text-xs text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full ml-auto">{ativ.duracao}</span>}
                                                        </div>
                                                        {ativ.descricao && <p className="text-sm text-slate-600 mt-1 ml-1">{ativ.descricao}</p>}
                                                        {ativ.musicasVinculadas?.length > 0 && (
                                                            <div className="mt-2 ml-1 space-y-1">
                                                                {ativ.musicasVinculadas.map((m, j) => (
                                                                    <div key={j} className="flex items-center gap-1.5 text-sm text-violet-700 bg-violet-50 border border-violet-100 rounded-lg px-2 py-1">
                                                                        <span>🎵</span>
                                                                        <span className="font-medium">{m.titulo}</span>
                                                                        {m.autor && <span className="text-violet-400 text-xs">— {m.autor}</span>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {ativ.recursos?.length > 0 && (
                                                            <div className="mt-2 ml-1 space-y-1">
                                                                {ativ.recursos.map((rec, j) => {
                                                                    const url = typeof rec === 'string' ? rec : rec.url;
                                                                    const tipo = typeof rec === 'string' ? 'link' : rec.tipo;
                                                                    return (
                                                                        <a key={j} href={url} target="_blank" rel="noreferrer"
                                                                            className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                                                                            <span>{tipo === 'imagem' ? '🖼️' : '🔗'}</span>
                                                                            <span className="truncate">{url}</span>
                                                                        </a>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Histórico de Versões */}
                                    {(planoSelecionado._historicoVersoes || []).length > 0 && (
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">🕐 Versões Anteriores</p>
                                            <div className="space-y-2">
                                                {(planoSelecionado._historicoVersoes || []).map((versao, i) => (
                                                    <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                                                        <div>
                                                            <p className="text-xs font-semibold text-slate-700">{versao.titulo}</p>
                                                            <p className="text-xs text-slate-400">Salva em {new Date(versao._versaoSalvaEm).toLocaleString('pt-BR')}</p>
                                                        </div>
                                                        <button onClick={()=>restaurarVersao(planoSelecionado, versao)}
                                                            className="text-xs border border-slate-300 hover:bg-slate-50 text-slate-600 px-3 py-1 rounded-lg font-semibold transition">
                                                            Restaurar
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Botões finais */}
                                    <div className="flex gap-2 pt-4 border-t border-slate-100">
                                        <button onClick={()=>editarPlano(planoSelecionado)} className="flex-1 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 py-3 rounded-xl font-semibold text-sm transition">✏️ Editar</button>
                                        <button onClick={()=>excluirPlano(planoSelecionado.id)} className="flex-1 border border-red-200 hover:bg-red-50 text-red-500 hover:text-red-600 py-3 rounded-xl font-semibold text-sm transition">🗑️ Excluir</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODAL REGISTRO PÓS-AULA — com turmas */}
                    {modalRegistro && planoParaRegistro && (
                        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={()=>setModalRegistro(false)}>
                            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                                {/* Header */}
                                <div className="bg-amber-500 text-white p-4 flex justify-between items-start rounded-t-2xl sticky top-0 z-10">
                                    <div>
                                        <h2 className="text-lg font-bold">📝 Registro Pós-Aula</h2>
                                        <p className="text-amber-100 text-xs mt-0.5 line-clamp-1">{planoParaRegistro.titulo}</p>
                                    </div>
                                    <button onClick={()=>setModalRegistro(false)} className="text-white text-xl font-bold ml-4">✕</button>
                                </div>

                                {/* Tabs */}
                                <div className="flex border-b">
                                    <button onClick={()=>{setVerRegistros(false);}} className={`flex-1 py-3 font-bold text-sm ${!verRegistros ? 'border-b-2 border-amber-500 text-amber-600' : 'text-gray-500'}`}>
                                        {registroEditando ? '✏️ Editando' : '✏️ Novo'}
                                    </button>
                                    <button onClick={()=>setVerRegistros(true)} className={`flex-1 py-3 font-bold text-sm ${verRegistros ? 'border-b-2 border-amber-500 text-amber-600' : 'text-gray-500'}`}>
                                        📚 Histórico {planoParaRegistro.registrosPosAula?.length > 0 && <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full ml-1">{planoParaRegistro.registrosPosAula.length}</span>}
                                    </button>
                                </div>

                                <div className="p-4 space-y-3">
                                {!verRegistros ? (
                                    <>
                                        {/* Banner modo edição */}
                                        {registroEditando && (
                                            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                                                <span className="text-xs font-bold text-blue-700">✏️ Editando registro</span>
                                                <button onClick={()=>{ setRegistroEditando(null); setNovoRegistro({ dataAula: new Date().toISOString().split('T')[0], resumoAula:'', funcionouBem:'', naoFuncionou:'', proximaAula:'', comportamento:'' }); setRegEscolaSel(''); setRegSerieSel(''); setRegTurmaSel(''); }} className="text-xs text-gray-500 font-bold hover:text-red-500">✕ Cancelar</button>
                                            </div>
                                        )}

                                        {/* Seleção de turma — 4 níveis: Ano → Escola → Segmento → Turma */}
                                        <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 space-y-2">
                                            <p className="text-xs font-bold text-teal-800 mb-1">🏫 Identificar turma</p>
                                            
                                            {/* Ano Letivo */}
                                            <select value={regAnoSel} onChange={e=>{setRegAnoSel(e.target.value);setRegEscolaSel('');setRegSegmentoSel('');setRegTurmaSel('');}} className="w-full px-3 py-2 border border-teal-300 rounded-lg text-sm bg-white">
                                                <option value="">— Ano Letivo —</option>
                                                {anosLetivos.filter(a => a.status !== 'arquivado').map(a=><option key={a.id} value={a.id}>{a.ano}</option>)}
                                            </select>
                                            
                                            {/* Escola */}
                                            {regAnoSel && (() => {
                                                const ano = anosLetivos.find(a=>a.id==regAnoSel);
                                                return ano && ano.escolas.length > 0 ? (
                                                    <select value={regEscolaSel} onChange={e=>{setRegEscolaSel(e.target.value);setRegSegmentoSel('');setRegTurmaSel('');}} className="w-full px-3 py-2 border border-teal-300 rounded-lg text-sm bg-white">
                                                        <option value="">— Escola —</option>
                                                        {ano.escolas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
                                                    </select>
                                                ) : <p className="text-xs text-teal-600 italic">Nenhuma escola cadastrada neste ano.</p>;
                                            })()}
                                            
                                            {/* Segmento */}
                                            {regEscolaSel && (() => {
                                                const ano = anosLetivos.find(a=>a.id==regAnoSel);
                                                const esc = ano?.escolas.find(e=>e.id==regEscolaSel);
                                                return esc && esc.segmentos.length > 0 ? (
                                                    <select value={regSegmentoSel} onChange={e=>{setRegSegmentoSel(e.target.value);setRegTurmaSel('');}} className="w-full px-3 py-2 border border-teal-300 rounded-lg text-sm bg-white">
                                                        <option value="">— Segmento —</option>
                                                        {esc.segmentos.map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}
                                                    </select>
                                                ) : <p className="text-xs text-teal-600 italic">Nenhum segmento cadastrado para esta escola.</p>;
                                            })()}
                                            
                                            {/* Turma */}
                                            {regSegmentoSel && (() => {
                                                const ano = anosLetivos.find(a=>a.id==regAnoSel);
                                                const esc = ano?.escolas.find(e=>e.id==regEscolaSel);
                                                const seg = esc?.segmentos.find(s=>s.id==regSegmentoSel);
                                                return seg && seg.turmas.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {seg.turmas.map(t=>(
                                                            <button key={t.id} type="button" onClick={()=>setRegTurmaSel(t.id==regTurmaSel?'':t.id)}
                                                                className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition ${regTurmaSel==t.id ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-teal-700 border-teal-300 hover:bg-teal-50'}`}>
                                                                {t.nome}
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : <p className="text-xs text-teal-600 italic">Nenhuma turma cadastrada para este segmento.</p>;
                                            })()}
                                            
                                            {(!regAnoSel) && <p className="text-xs text-gray-400">Cadastre anos letivos, escolas e turmas em <strong>🏫 Turmas</strong> no menu principal.</p>}
                                        </div>

                                        {/* #2: Banner "Última aula com esta turma" */}
                                        {regTurmaSel && (() => {
                                            // Buscar todos os registros desta turma em TODOS os planos, exceto o atual
                                            const todosRegs = [];
                                            planos.forEach(p => {
                                                (p.registrosPosAula||[]).forEach(r => {
                                                    if (r.turma == regTurmaSel && !(registroEditando && r.id === registroEditando.id))
                                                        todosRegs.push({ ...r, planoTitulo: p.titulo });
                                                });
                                            });
                                            if (todosRegs.length === 0) return null;
                                            const ultimo = todosRegs.sort((a,b) => (b.data||'').localeCompare(a.data||''))[0];
                                            const dataFmt = ultimo.data ? new Date(ultimo.data+'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'short', year:'numeric'}) : '';
                                            return (
                                                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs">
                                                    <p className="font-bold text-indigo-700 mb-1">🔁 Última aula com esta turma — {dataFmt}</p>
                                                    <p className="text-indigo-600 font-medium mb-1">📋 {ultimo.planoTitulo}</p>
                                                    {ultimo.resumoAula && <p className="text-gray-700 mb-1"><span className="font-bold">Realizado:</span> {ultimo.resumoAula}</p>}
                                                    {ultimo.proximaAula && <p className="text-gray-700"><span className="font-bold text-blue-700">💡 Planejado para hoje:</span> {ultimo.proximaAula}</p>}
                                                </div>
                                            );
                                        })()}

                                        {/* Resumo da seleção + Data da Aula */}
                                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                            <span className="text-xs font-bold text-amber-700 shrink-0">📅 Data da aula</span>
                                            <input
                                                type="date"
                                                value={novoRegistro.dataAula}
                                                onChange={e=>setNovoRegistro({...novoRegistro, dataAula: e.target.value})}
                                                className="flex-1 bg-transparent text-sm font-bold text-amber-900 outline-none border-none text-right"
                                            />
                                        </div>

                                        {/* Campo: Resumo da Aula */}
                                        <div>
                                            <label className="block font-bold text-gray-800 mb-1 text-sm">📋 O que foi realizado nesta aula</label>
                                            <textarea value={novoRegistro.resumoAula} onChange={e=>setNovoRegistro({...novoRegistro, resumoAula: e.target.value})} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-gray-500 outline-none" rows="2" placeholder="Ex: Ritmo corporal + início da música X" />
                                        </div>

                                        {/* Campos */}
                                        <div>
                                            <label className="block font-bold text-green-700 mb-1 text-sm">✅ O que funcionou bem</label>
                                            <textarea value={novoRegistro.funcionouBem} onChange={e=>setNovoRegistro({...novoRegistro, funcionouBem: e.target.value})} className="w-full px-3 py-2 border-2 border-green-200 rounded-lg text-sm focus:border-green-400 outline-none" rows="2" placeholder="Ex: A atividade rítmica em grupo engajou muito..." />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-red-600 mb-1 text-sm">❌ O que não funcionou</label>
                                            <textarea value={novoRegistro.naoFuncionou} onChange={e=>setNovoRegistro({...novoRegistro, naoFuncionou: e.target.value})} className="w-full px-3 py-2 border-2 border-red-200 rounded-lg text-sm focus:border-red-400 outline-none" rows="2" placeholder="Ex: Tempo insuficiente para a etapa de criação..." />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-blue-600 mb-1 text-sm">💡 Ideias para a próxima aula</label>
                                            <textarea value={novoRegistro.proximaAula} onChange={e=>setNovoRegistro({...novoRegistro, proximaAula: e.target.value})} className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg text-sm focus:border-blue-400 outline-none" rows="2" placeholder="Ex: Começar com o ostinato antes da canção..." />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-purple-600 mb-1 text-sm">👥 Comportamento da turma</label>
                                            <textarea value={novoRegistro.comportamento} onChange={e=>setNovoRegistro({...novoRegistro, comportamento: e.target.value})} className="w-full px-3 py-2 border-2 border-purple-200 rounded-lg text-sm focus:border-purple-400 outline-none" rows="2" placeholder="Ex: Turma agitada no início, focou após aquecimento..." />
                                        </div>
                                        <button onClick={salvarRegistro} className={`w-full py-3 rounded-xl font-bold text-base text-white ${registroEditando ? 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700'}`}>
                                            {registroEditando ? '✓ Salvar alterações' : '💾 Salvar Registro'}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {/* Botão voltar ao formulário */}
                                        <button onClick={()=>setVerRegistros(false)} className="flex items-center gap-1.5 text-amber-600 font-bold text-sm active:opacity-60 mb-1">
                                            ← Novo registro
                                        </button>

                                        {/* #3: Busca textual no histórico */}
                                        {planoParaRegistro.registrosPosAula?.length > 0 && (
                                            <div className="relative mb-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                                                <input type="text" value={buscaRegistros} onChange={e=>setBuscaRegistros(e.target.value)}
                                                    className="w-full pl-7 pr-8 py-2 border rounded-xl text-sm focus:border-amber-400 outline-none"
                                                    placeholder="Buscar nos registros (ostinato, ritmo, turma...)"/>
                                                {buscaRegistros && <button onClick={()=>setBuscaRegistros('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button>}
                                            </div>
                                        )}

                                        {/* Filtros do histórico — 4 níveis */}
                                        {planoParaRegistro.registrosPosAula?.length > 0 && (
                                            <div className="flex gap-2 flex-wrap">
                                                {/* Ano */}
                                                <select value={filtroRegAno} onChange={e=>{setFiltroRegAno(e.target.value);setFiltroRegEscola('');setFiltroRegSegmento('');setFiltroRegTurma('');}} className="flex-1 min-w-0 px-2 py-1.5 border rounded-lg text-xs bg-white">
                                                    <option value="">Todos os anos</option>
                                                    {anosLetivos.map(a=><option key={a.id} value={a.id}>{a.ano}</option>)}
                                                </select>
                                                {/* Escola */}
                                                {filtroRegAno && (() => {
                                                    const ano = anosLetivos.find(a=>a.id==filtroRegAno);
                                                    return ano?.escolas.length > 0 ? (
                                                        <select value={filtroRegEscola} onChange={e=>{setFiltroRegEscola(e.target.value);setFiltroRegSegmento('');setFiltroRegTurma('');}} className="flex-1 min-w-0 px-2 py-1.5 border rounded-lg text-xs bg-white">
                                                            <option value="">Todas escolas</option>
                                                            {ano.escolas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
                                                        </select>
                                                    ) : null;
                                                })()}
                                                {/* Segmento */}
                                                {filtroRegEscola && (() => {
                                                    const ano = anosLetivos.find(a=>a.id==filtroRegAno);
                                                    const esc = ano?.escolas.find(e=>e.id==filtroRegEscola);
                                                    return esc?.segmentos.length > 0 ? (
                                                        <select value={filtroRegSegmento} onChange={e=>{setFiltroRegSegmento(e.target.value);setFiltroRegTurma('');}} className="flex-1 min-w-0 px-2 py-1.5 border rounded-lg text-xs bg-white">
                                                            <option value="">Todos segmentos</option>
                                                            {esc.segmentos.map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}
                                                        </select>
                                                    ) : null;
                                                })()}
                                                {/* Turma */}
                                                {filtroRegSegmento && (() => {
                                                    const ano = anosLetivos.find(a=>a.id==filtroRegAno);
                                                    const esc = ano?.escolas.find(e=>e.id==filtroRegEscola);
                                                    const seg = esc?.segmentos.find(s=>s.id==filtroRegSegmento);
                                                    return seg?.turmas.length > 0 ? (
                                                        <select value={filtroRegTurma} onChange={e=>setFiltroRegTurma(e.target.value)} className="flex-1 min-w-0 px-2 py-1.5 border rounded-lg text-xs bg-white">
                                                            <option value="">Todas turmas</option>
                                                            {seg.turmas.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
                                                        </select>
                                                    ) : null;
                                                })()}
                                            </div>
                                        )}

                                        {/* Lista de registros filtrados */}
                                        {(() => {
                                            const regs = (planoParaRegistro.registrosPosAula || []).filter(r => {
                                                if (filtroRegAno && r.anoLetivo != filtroRegAno) return false;
                                                if (filtroRegEscola && r.escola != filtroRegEscola) return false;
                                                if (filtroRegSegmento && (r.segmento || r.serie) != filtroRegSegmento) return false;
                                                if (filtroRegTurma && r.turma != filtroRegTurma) return false;
                                                // #3: busca textual em todos os campos
                                                if (buscaRegistros.trim()) {
                                                    const t = buscaRegistros.toLowerCase();
                                                    const campos = [r.resumoAula, r.funcionouBem, r.naoFuncionou, r.proximaAula, r.comportamento];
                                                    if (!campos.some(c => (c||'').toLowerCase().includes(t))) return false;
                                                }
                                                return true;
                                            });
                                            if (regs.length === 0) return (
                                                <div className="text-center text-gray-400 py-8">
                                                    <p className="text-4xl mb-2">📋</p>
                                                    <p className="text-sm">{planoParaRegistro.registrosPosAula?.length > 0 ? 'Nenhum registro para este filtro.' : 'Nenhum registro ainda.'}</p>
                                                    <button onClick={()=>setVerRegistros(false)} className="mt-3 text-amber-600 font-bold underline text-sm">Fazer registro</button>
                                                </div>
                                            );
                                            return [...regs].reverse().map(reg => {
                                                // Buscar label na nova estrutura (4 níveis)
                                                let label = '';
                                                let ano = anosLetivos.find(a => a.id == reg.anoLetivo);
                                                let esc = ano?.escolas.find(e => e.id == reg.escola);
                                                let seg = esc?.segmentos.find(s => s.id == (reg.segmento || reg.serie)); // compatibilidade
                                                let tur = seg?.turmas.find(t => t.id == reg.turma);
                                                
                                                // Compatibilidade: registros antigos sem anoLetivo
                                                if (!ano && reg.escola) {
                                                    for (const a of anosLetivos) {
                                                        const e = a.escolas.find(e => e.id == reg.escola);
                                                        if (e) {
                                                            const s = e.segmentos.find(s => s.id == (reg.segmento || reg.serie));
                                                            if (s) {
                                                                const t = s.turmas.find(t => t.id == reg.turma);
                                                                label = [a.ano, e.nome, s.nome, t?.nome].filter(Boolean).join(' › ');
                                                                break;
                                                            }
                                                        }
                                                    }
                                                } else {
                                                    label = [ano?.ano, esc?.nome, seg?.nome, tur?.nome].filter(Boolean).join(' › ');
                                                }
                                                
                                                return (
                                                    <div key={reg.id} className={`border rounded-xl p-3 ${registroEditando?.id === reg.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div>
                                                                {label && <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full block mb-1">{label}</span>}
                                                                <span className="text-xs font-bold text-amber-700">📅 {new Date(reg.data+'T12:00:00').toLocaleDateString('pt-BR', {weekday:'short', day:'2-digit', month:'2-digit'})}</span>
                                                                {reg.dataRegistro && reg.dataRegistro !== reg.data && <span className="text-xs text-gray-400 ml-2">(registrado em {new Date(reg.dataRegistro+'T12:00:00').toLocaleDateString('pt-BR')})</span>}
                                                                {reg.dataEdicao && <span className="text-xs text-blue-400 ml-2">· editado</span>}
                                                            </div>
                                                            {/* Botões ação */}
                                                            <div className="flex items-center gap-2 ml-2 shrink-0">
                                                                <button onClick={()=>editarRegistro(reg)} className="text-xs font-bold text-blue-500 hover:text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg">✏️</button>
                                                                <button onClick={()=>excluirRegistro(reg.id)} className="text-xs font-bold text-red-400 hover:text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">🗑️</button>
                                                            </div>
                                                        </div>
                                                        {reg.resumoAula && <div className="mb-2 bg-white border border-gray-200 rounded-lg px-3 py-2"><span className="text-xs font-bold text-gray-500 uppercase tracking-wide">📋 Realizado</span><p className="text-sm font-medium text-gray-800 mt-0.5">{reg.resumoAula}</p></div>}
                                                        {reg.funcionouBem && <div className="mb-1.5"><span className="text-xs font-bold text-green-700">✅ </span><span className="text-sm text-gray-700">{reg.funcionouBem}</span></div>}
                                                        {reg.naoFuncionou && <div className="mb-1.5"><span className="text-xs font-bold text-red-600">❌ </span><span className="text-sm text-gray-700">{reg.naoFuncionou}</span></div>}
                                                        {reg.proximaAula && <div className="mb-1.5"><span className="text-xs font-bold text-blue-600">💡 </span><span className="text-sm text-gray-700">{reg.proximaAula}</span></div>}
                                                        {reg.comportamento && <div><span className="text-xs font-bold text-purple-600">👥 </span><span className="text-sm text-gray-700">{reg.comportamento}</span></div>}
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </>
                                )}
                                </div>
                            </div>
                        </div>
                    )}


                    {/* MODAL GESTÃO DE ANO LETIVO E TURMAS */}
                    {modalTurmas && (
                        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={()=>setModalTurmas(false)}>
                            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                                <div className="bg-teal-600 text-white p-4 flex justify-between items-center sticky top-0 z-10">
                                    <h2 className="text-lg font-bold">📅 Gerenciar Anos Letivos e Turmas</h2>
                                    <button onClick={()=>setModalTurmas(false)} className="text-white text-xl font-bold">✕</button>
                                </div>
                                <div className="p-4 space-y-4">
                                    
                                    {/* Toggle arquivados */}
                                    <label className="flex items-center gap-2 text-sm text-gray-600">
                                        <input type="checkbox" checked={mostrarArquivados} onChange={e=>setMostrarArquivados(e.target.checked)} />
                                        Mostrar anos arquivados
                                    </label>

                                    {/* Adicionar Ano */}
                                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                                        <p className="text-xs font-bold text-indigo-800 mb-2">Novo Ano Letivo</p>
                                        <div className="flex gap-2">
                                            <input value={gtAnoNovo} onChange={e=>setGtAnoNovo(e.target.value)} onKeyPress={e=>e.key==='Enter'&&gtAddAno()}
                                                className="flex-1 border-2 rounded-lg px-3 py-2 text-sm" placeholder="Ex: 2025" type="number" min="2020" max="2099" />
                                            <button onClick={gtAddAno} className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-4 py-2 rounded-lg font-bold text-sm transition">+ Adicionar</button>
                                        </div>
                                    </div>

                                    {/* Lista de Anos */}
                                    {anosLetivos.filter(a => mostrarArquivados || a.status !== 'arquivado').map(ano => (
                                        <div key={ano.id} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                                            {/* Header Ano */}
                                            <div className={`px-4 py-3 flex justify-between items-center ${
                                                ano.status==='ativo' ? 'bg-indigo-600 text-white' :
                                                ano.status==='encerrado' ? 'bg-gray-400 text-white' : 'bg-gray-300 text-gray-600'
                                            }`}>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg font-bold">📅 {ano.ano}</span>
                                                    {ano.status==='ativo' && <span className="bg-green-400 text-white text-xs px-2 py-0.5 rounded-full font-bold">Ativo</span>}
                                                    {ano.status==='encerrado' && <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">Encerrado</span>}
                                                    {ano.status==='arquivado' && <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">Arquivado</span>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {ano.status==='ativo' && <button onClick={()=>gtMudarStatusAno(ano.id,'encerrado')} className="text-xs bg-white/20 px-2 py-1 rounded text-white font-bold">Encerrar</button>}
                                                    {ano.status==='encerrado' && (
                                                        <>
                                                        <button onClick={()=>gtMudarStatusAno(ano.id,'ativo')} className="text-xs bg-white/20 px-2 py-1 rounded text-white font-bold">Reativar</button>
                                                        <button onClick={()=>gtMudarStatusAno(ano.id,'arquivado')} className="text-xs bg-white/20 px-2 py-1 rounded text-white font-bold">Arquivar</button>
                                                        </>
                                                    )}
                                                    {ano.status==='arquivado' && <button onClick={()=>gtMudarStatusAno(ano.id,'encerrado')} className="text-xs bg-white/20 px-2 py-1 rounded text-gray-600 font-bold">Desarquivar</button>}
                                                    <button onClick={()=>gtRemoveAno(ano.id)} className="text-white font-bold text-sm ml-2">✕</button>
                                                </div>
                                            </div>

                                            {/* Conteúdo do Ano */}
                                            <div className="p-4 space-y-3">
                                                {/* Add Escola */}
                                                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                                                    <p className="text-xs font-bold text-teal-800 mb-2">Nova Escola</p>
                                                    <div className="flex gap-2">
                                                        <input value={gtAnoSel===ano.id?gtEscolaNome:''} onClick={()=>setGtAnoSel(ano.id)}
                                                            onChange={e=>{setGtAnoSel(ano.id);setGtEscolaNome(e.target.value);}}
                                                            onKeyPress={e=>e.key==='Enter'&&gtAddEscola()}
                                                            className="flex-1 border rounded-lg px-2 py-1.5 text-sm" placeholder="Nome da escola" />
                                                        <button onClick={()=>{setGtAnoSel(ano.id);gtAddEscola();}} className="bg-teal-600 text-white px-3 py-1.5 rounded-lg font-bold text-sm">+</button>
                                                    </div>
                                                </div>

                                                {/* Escolas */}
                                                {ano.escolas.map(esc => (
                                                    <div key={esc.id} className="border border-gray-200 rounded-lg bg-white">
                                                        <div className="bg-gray-100 px-3 py-2 flex justify-between items-center">
                                                            <span className="font-bold text-sm">🏫 {esc.nome}</span>
                                                            <button onClick={()=>gtRemoveEscola(ano.id,esc.id)} className="text-red-500 font-bold text-sm">✕</button>
                                                        </div>
                                                        <div className="p-3 space-y-2">
                                                            {/* Add Segmento */}
                                                            <div className="flex gap-2">
                                                                <input value={gtEscolaSel===esc.id?gtSegmentoNome:''}
                                                                    onClick={()=>{setGtAnoSel(ano.id);setGtEscolaSel(esc.id);}}
                                                                    onChange={e=>{setGtAnoSel(ano.id);setGtEscolaSel(esc.id);setGtSegmentoNome(e.target.value);}}
                                                                    onKeyPress={e=>e.key==='Enter'&&gtAddSegmento()}
                                                                    className="flex-1 border rounded px-2 py-1 text-xs" placeholder="Segmento (ex: 1º ano)" />
                                                                <button onClick={()=>{setGtAnoSel(ano.id);setGtEscolaSel(esc.id);gtAddSegmento();}}
                                                                    className="bg-gray-600 text-white px-2 py-1 rounded text-xs font-bold">+ Seg</button>
                                                            </div>
                                                            
                                                            {/* Segmentos */}
                                                            {esc.segmentos.map(seg => (
                                                                <div key={seg.id} className="border border-gray-200 rounded bg-gray-50 p-2">
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <span className="text-xs font-bold text-gray-700">{seg.nome}</span>
                                                                        <button onClick={()=>gtRemoveSegmento(ano.id,esc.id,seg.id)} className="text-red-500 text-xs font-bold">✕</button>
                                                                    </div>
                                                                    {/* Add Turma */}
                                                                    <div className="flex gap-1.5 mb-2">
                                                                        <input value={gtSegmentoSel===seg.id?gtTurmaNome:''}
                                                                            onClick={()=>{setGtAnoSel(ano.id);setGtEscolaSel(esc.id);setGtSegmentoSel(seg.id);}}
                                                                            onChange={e=>{setGtAnoSel(ano.id);setGtEscolaSel(esc.id);setGtSegmentoSel(seg.id);setGtTurmaNome(e.target.value);}}
                                                                            onKeyPress={e=>e.key==='Enter'&&gtAddTurma()}
                                                                            className="flex-1 border rounded px-2 py-1 text-xs" placeholder="Turma" />
                                                                        <button onClick={()=>{setGtAnoSel(ano.id);setGtEscolaSel(esc.id);setGtSegmentoSel(seg.id);gtAddTurma();}}
                                                                            className="bg-gray-500 text-white px-2 py-1 rounded text-xs font-bold">+</button>
                                                                    </div>
                                                                    {/* Turmas */}
                                                                    {seg.turmas.length>0 && (
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {seg.turmas.map(t => (
                                                                                <span key={t.id} className="bg-white border border-gray-300 text-gray-700 px-2 py-1 rounded text-xs flex items-center gap-1.5">
                                                                                    {t.nome}
                                                                                    <button onClick={()=>gtRemoveTurma(ano.id,esc.id,seg.id,t.id)} className="text-red-500 font-bold hover:text-red-700">×</button>
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══════════ MODAL EVENTOS ESCOLARES ═══════════ */}
                    {modalEventos && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={()=>{setModalEventos(false);setEventoEditando(null);}}>
                            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                                <div className="bg-pink-500 text-white p-4 flex justify-between items-center sticky top-0">
                                    <h2 className="text-lg font-bold">🎉 Eventos Escolares</h2>
                                    <button onClick={()=>{setModalEventos(false);setEventoEditando(null);}} className="text-white text-xl">✕</button>
                                </div>
                                
                                {!eventoEditando ? (
                                    <div className="p-4">
                                        <button onClick={novoEvento} className="w-full bg-pink-500 text-white py-3 rounded-xl font-bold mb-4">+ Novo Evento</button>
                                        {eventosEscolares.length === 0 ? (
                                            <p className="text-center text-gray-400 py-8">Nenhum evento cadastrado</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {eventosEscolares.sort((a,b)=>a.data.localeCompare(b.data)).map(ev=>{
                                                    const ano = anosLetivos.find(a=>a.id==ev.anoLetivoId);
                                                    const esc = ano?.escolas.find(e=>e.id==ev.escolaId);
                                                    const dataObj = new Date(ev.data+'T12:00:00');
                                                    const dataFormatada = dataObj.toLocaleDateString('pt-BR');
                                                    
                                                    return (
                                                        <div key={ev.id} className="border-2 border-orange-200 rounded-lg p-3 hover:border-orange-400">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex-1">
                                                                    <h3 className="font-bold text-gray-800">{ev.nome}</h3>
                                                                    <p className="text-sm text-gray-600">📅 {dataFormatada} • {esc?.nome || 'Sem escola'}</p>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button onClick={()=>setEventoEditando(ev)} className="bg-blue-100 text-blue-700 px-3 py-1 rounded font-bold text-sm">✏️</button>
                                                                    <button onClick={()=>excluirEvento(ev.id)} className="bg-red-100 text-red-600 px-3 py-1 rounded font-bold text-sm">🗑️</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-6 space-y-4">
                                        <div>
                                            <label className="block font-bold mb-2">Nome do Evento *</label>
                                            <input type="text" value={eventoEditando.nome} onChange={e=>setEventoEditando({...eventoEditando, nome:e.target.value})} className="w-full px-4 py-2 border-2 rounded-lg" placeholder="Ex: Festa Junina, Reunião de Pais"/>
                                        </div>
                                        <div>
                                            <label className="block font-bold mb-2">Data *</label>
                                            <input type="date" value={eventoEditando.data} onChange={e=>setEventoEditando({...eventoEditando, data:e.target.value})} className="w-full px-4 py-2 border-2 rounded-lg"/>
                                        </div>
                                        <div>
                                            <label className="block font-bold mb-2">Ano Letivo *</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="number" 
                                                    value={eventoEditando.anoLetivoId ? (anosLetivos.find(a=>a.id===eventoEditando.anoLetivoId)?.ano || '') : ''} 
                                                    readOnly
                                                    className="flex-1 px-4 py-2 border-2 rounded-lg bg-gray-50"
                                                    placeholder={`Ano atual: ${new Date().getFullYear()}`}
                                                />
                                                <select 
                                                    value={eventoEditando.anoLetivoId || ''} 
                                                    onChange={e=>setEventoEditando({...eventoEditando, anoLetivoId:e.target.value ? Number(e.target.value) : '', escolaId:''})} 
                                                    className="px-4 py-2 border-2 rounded-lg bg-white"
                                                >
                                                    <option value="">📅 Alterar</option>
                                                    {anosLetivos.map(a=><option key={a.id} value={a.id}>{a.ano || a.nome}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block font-bold mb-2">Escola</label>
                                            <select value={eventoEditando.escolaId} onChange={e=>setEventoEditando({...eventoEditando, escolaId:Number(e.target.value)})} className="w-full px-4 py-2 border-2 rounded-lg" disabled={!eventoEditando.anoLetivoId}>
                                                <option value="">Selecione...</option>
                                                {eventoEditando.anoLetivoId && anosLetivos.find(a=>a.id==eventoEditando.anoLetivoId)?.escolas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex gap-3 pt-4">
                                            <button onClick={()=>setEventoEditando(null)} className="flex-1 bg-gray-300 py-3 rounded-xl font-bold">Cancelar</button>
                                            <button onClick={salvarEvento} className="flex-1 bg-pink-500 text-white py-3 rounded-xl font-bold">Salvar</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══════════ MODAL GRADE SEMANAL ═══════════ */}
                    {atividadeVinculandoMusica && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => setAtividadeVinculandoMusica(null)}>
                            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                                <h2 className="text-2xl font-bold text-blue-700 mb-4">🎵 Vincular Música à Atividade</h2>
                                
                                <button onClick={() => {
                                    setPendingAtividadeId(atividadeVinculandoMusica);
                                    setNovaMusicaInline({ titulo: '', autor: '', origem: '', observacoes: '' });
                                    setModalNovaMusicaInline(true);
                                }} className="w-full mb-4 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700">
                                    ➕ Cadastrar Nova Música
                                </button>
                                
                                <div className="space-y-2">
                                    {repertorio.map(m => (
                                        <div key={m.id} className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 hover:bg-blue-100 cursor-pointer" onClick={() => vincularMusicaAtividade(m)}>
                                            <h3 className="font-bold text-gray-800">{m.titulo}</h3>
                                            {m.autor && <p className="text-sm text-gray-600">{m.autor}</p>}
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => setAtividadeVinculandoMusica(null)} className="mt-4 w-full bg-gray-600 text-white py-2 rounded font-bold">Fechar</button>
                            </div>
                        </div>
                    )}

                    {modalImportarAtividade && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => {setModalImportarAtividade(false); setBuscaAtividade('');}}>
                            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                                <h2 className="text-2xl font-bold text-blue-700 mb-4">📚 Importar Atividade do Banco</h2>
                                
                                {/* Campo de busca */}
                                <input 
                                    type="text" 
                                    value={buscaAtividade} 
                                    onChange={e => setBuscaAtividade(e.target.value)}
                                    placeholder="🔍 Buscar atividade pelo nome..."
                                    className="w-full px-4 py-3 border-2 rounded-lg mb-4 text-sm"
                                />
                                
                                <div className="space-y-2">
                                    {atividades.length === 0 ? (
                                        <p className="text-center text-gray-400 py-8">Nenhuma atividade no banco ainda</p>
                                    ) : (
                                        atividades
                                            .filter(a => !buscaAtividade || a.nome.toLowerCase().includes(buscaAtividade.toLowerCase()))
                                            .map(a => (
                                                <div key={a.id} className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 hover:bg-blue-100 cursor-pointer" onClick={() => {importarAtividadeParaPlano(a); setBuscaAtividade('');}}>
                                                    <h3 className="font-bold text-gray-800">{a.nome}</h3>
                                                    {a.descricao && <p className="text-sm text-gray-600 truncate">{a.descricao}</p>}
                                                    {a.duracao && <p className="text-xs text-blue-500 mt-1">⏱️ {a.duracao}</p>}
                                                </div>
                                            ))
                                    )}
                                    {atividades.length > 0 && atividades.filter(a => !buscaAtividade || a.nome.toLowerCase().includes(buscaAtividade.toLowerCase())).length === 0 && (
                                        <p className="text-center text-gray-400 py-8">Nenhuma atividade encontrada</p>
                                    )}
                                </div>
                                <button onClick={() => {setModalImportarAtividade(false); setBuscaAtividade('');}} className="mt-4 w-full bg-gray-600 text-white py-2 rounded font-bold">Fechar</button>
                            </div>
                        </div>
                    )}

                    {modalImportarMusica && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModalImportarMusica(false)}>
                            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                                <h2 className="text-2xl font-bold text-blue-700 mb-4">🎵 Importar Música como Atividade</h2>
                                <div className="space-y-2">
                                    {repertorio.map(m => (
                                        <div key={m.id} className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 hover:bg-blue-100 cursor-pointer" onClick={() => importarMusicaParaPlano(m)}>
                                            <h3 className="font-bold text-gray-800">{m.titulo}</h3>
                                            {m.autor && <p className="text-sm text-gray-600">{m.autor}</p>}
                                            <p className="text-xs text-blue-500 mt-1">🔗 {(m.planosVinculados||[]).length} plano(s) vinculado(s)</p>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => setModalImportarMusica(false)} className="mt-4 w-full bg-gray-600 text-white py-2 rounded font-bold">Fechar</button>
                            </div>
                        </div>
                    )}

                    {modalGradeSemanal && (
                        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={()=>setModalGradeSemanal(false)}>
                            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                                {/* Header */}
                                <div className="bg-purple-600 text-white p-4 flex justify-between items-center sticky top-0 z-10">
                                    <h2 className="text-lg font-bold">📅 Grade Semanal</h2>
                                    <button onClick={()=>setModalGradeSemanal(false)} className="text-white text-xl font-bold">✕</button>
                                </div>

                                <div className="p-4 space-y-4">
                                    {/* Lista de Grades ou Editor */}
                                    {!gradeEditando ? (
                                        <>
                                            {/* Botão Nova Grade */}
                                            <button onClick={novaGradeSemanal} className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold">
                                                + Nova Grade Semanal
                                            </button>

                                            {/* Lista de Grades Existentes */}
                                            {gradesSemanas.length === 0 ? (
                                                <p className="text-center text-gray-400 py-8">Nenhuma grade cadastrada ainda.</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {gradesSemanas.map(grade => {
                                                        const ano = anosLetivos.find(a => a.id == grade.anoLetivoId);
                                                        const esc = ano?.escolas.find(e => e.id == grade.escolaId);
                                                        const inicio = new Date(grade.dataInicio+'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'short'});
                                                        const fim = new Date(grade.dataFim+'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'short', year:'numeric'});
                                                        
                                                        return (
                                                            <div key={grade.id} className="border-2 border-purple-200 rounded-xl p-4 bg-purple-50">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div>
                                                                        <h3 className="font-bold text-purple-900">{esc?.nome || 'Escola não encontrada'} - {ano?.ano || '?'}</h3>
                                                                        <p className="text-sm text-purple-700">{inicio} até {fim}</p>
                                                                        <p className="text-xs text-purple-600 mt-1">{grade.aulas.length} aula(s) cadastrada(s)</p>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <button onClick={()=>setGradeEditando(grade)} className="bg-blue-500 text-white px-3 py-1 rounded font-bold text-sm">Editar</button>
                                                                        <button onClick={()=>excluirGradeSemanal(grade.id)} className="bg-red-500 text-white px-3 py-1 rounded font-bold text-sm">Excluir</button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {/* Editor de Grade */}
                                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
                                                <h3 className="font-bold text-purple-900">Configuração da Grade</h3>
                                                
                                                {/* Ano Letivo e Escola */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-sm font-bold mb-1">Ano Letivo</label>
                                                        <select value={gradeEditando.anoLetivoId} onChange={e=>setGradeEditando({...gradeEditando, anoLetivoId: e.target.value, escolaId: ''})}
                                                            className="w-full px-3 py-2 border-2 rounded-lg bg-white">
                                                            <option value="">Selecione...</option>
                                                            {anosLetivos.filter(a=>a.status!=='arquivado').map(a=><option key={a.id} value={a.id}>{a.ano}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-bold mb-1">Escola</label>
                                                        <select value={gradeEditando.escolaId} onChange={e=>setGradeEditando({...gradeEditando, escolaId: e.target.value})}
                                                            className="w-full px-3 py-2 border-2 rounded-lg bg-white" disabled={!gradeEditando.anoLetivoId}>
                                                            <option value="">Selecione...</option>
                                                            {anosLetivos.find(a=>a.id==gradeEditando.anoLetivoId)?.escolas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Período */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-sm font-bold mb-1">Data Início</label>
                                                        <input type="date" value={gradeEditando.dataInicio} onChange={e=>setGradeEditando({...gradeEditando, dataInicio: e.target.value})}
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-bold mb-1">Data Término</label>
                                                        <input type="date" value={gradeEditando.dataFim} onChange={e=>setGradeEditando({...gradeEditando, dataFim: e.target.value})}
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Tabela de Aulas */}
                                            {gradeEditando.escolaId && (
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="font-bold text-gray-800">Aulas da Semana</h3>
                                                        <button onClick={adicionarAulaGrade} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm">
                                                            + Adicionar Aula
                                                        </button>
                                                    </div>

                                                    {gradeEditando.aulas.length === 0 ? (
                                                        <p className="text-center text-gray-400 py-4 text-sm">Nenhuma aula cadastrada. Clique em "+ Adicionar Aula"</p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {gradeEditando.aulas.sort((a,b)=>a.horario.localeCompare(b.horario)).map(aula => {
                                                                const ano = anosLetivos.find(a=>a.id==gradeEditando.anoLetivoId);
                                                                const esc = ano?.escolas.find(e=>e.id==gradeEditando.escolaId);
                                                                const seg = esc?.segmentos.find(s=>s.id==aula.segmentoId);
                                                                
                                                                return (
                                                                    <div key={aula.id} className="border-2 border-gray-200 rounded-lg p-3 bg-white">
                                                                        <div className="grid grid-cols-12 gap-2 items-center">
                                                                            {/* Dia */}
                                                                            <select value={aula.diaSemana} onChange={e=>atualizarAulaGrade(aula.id,'diaSemana',e.target.value)}
                                                                                className="col-span-2 px-2 py-1.5 border rounded text-sm bg-white">
                                                                                <option>Segunda</option>
                                                                                <option>Terça</option>
                                                                                <option>Quarta</option>
                                                                                <option>Quinta</option>
                                                                                <option>Sexta</option>
                                                                                <option>Sábado</option>
                                                                            </select>
                                                                            
                                                                            {/* Horário */}
                                                                            <input type="time" value={aula.horario} onChange={e=>atualizarAulaGrade(aula.id,'horario',e.target.value)}
                                                                                className="col-span-2 px-2 py-1.5 border rounded text-sm" />
                                                                            
                                                                            {/* Segmento */}
                                                                            <select 
                                                                                value={aula.segmentoId || ''} 
                                                                                onChange={e=>{
                                                                                    const val = e.target.value === '' ? '' : Number(e.target.value);
                                                                                    atualizarAulaGrade(aula.id,'segmentoId',val);
                                                                                    atualizarAulaGrade(aula.id,'turmaId','');
                                                                                }}
                                                                                className="col-span-3 px-2 py-1.5 border rounded text-sm bg-white">
                                                                                <option value="">Segmento...</option>
                                                                                {esc?.segmentos.map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}
                                                                            </select>
                                                                            
                                                                            {/* Turma */}
                                                                            <select 
                                                                                value={aula.turmaId || ''} 
                                                                                onChange={e=>{
                                                                                    const val = e.target.value === '' ? '' : Number(e.target.value);
                                                                                    atualizarAulaGrade(aula.id,'turmaId',val);
                                                                                }}
                                                                                className="col-span-2 px-2 py-1.5 border rounded text-sm bg-white" 
                                                                                disabled={!aula.segmentoId}>
                                                                                <option value="">Turma...</option>
                                                                                {(() => {
                                                                                    const segAtual = esc?.segmentos.find(s=>s.id==aula.segmentoId);
                                                                                    return segAtual?.turmas.map(t=><option key={t.id} value={t.id}>{t.nome}</option>);
                                                                                })()}
                                                                            </select>
                                                                            
                                                                            {/* Ações */}
                                                                            <div className="col-span-3 flex gap-1">
                                                                                <button onClick={()=>duplicarAulaGrade(aula)} title="Duplicar" className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">📋</button>
                                                                                <button onClick={()=>removerAulaGrade(aula.id)} title="Remover" className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">✕</button>
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        {/* Observação (opcional) */}
                                                                        <input type="text" value={aula.observacao||''} onChange={e=>atualizarAulaGrade(aula.id,'observacao',e.target.value)}
                                                                            placeholder="Observação (opcional)..." className="w-full mt-2 px-2 py-1 border rounded text-xs text-gray-600" />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Botões */}
                                            <div className="flex gap-3 pt-4 border-t">
                                                <button onClick={()=>setGradeEditando(null)} className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-xl font-bold">
                                                    Cancelar
                                                </button>
                                                <button onClick={salvarGradeSemanal} className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold">
                                                    💾 Salvar Grade
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══════════ MODAL EDITAR ATIVIDADE (REMOVIDO — formulário inline na view) ═══════════ */}
                    {false && (
                        <div>
                                <div className="p-6 space-y-4">
                                    <div><label className="block font-bold mb-2">Nome *</label><input type="text" value={atividadeEditando.nome} onChange={e=>setAtividadeEditando({...atividadeEditando, nome:e.target.value})} className="w-full px-4 py-2 border-2 rounded-lg" /></div>
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block font-bold">Descrição</label>
                                            <button type="button" onClick={() => setAtividadeVinculandoMusica(atividadeEditando.id)} className="bg-blue-500 text-white px-3 py-1 rounded text-sm font-bold hover:bg-blue-600">
                                                🎵 Vincular música
                                            </button>
                                        </div>
                                        <textarea value={atividadeEditando.descricao} onChange={e=>setAtividadeEditando({...atividadeEditando, descricao:e.target.value})} className="w-full px-4 py-2 border-2 rounded-lg" rows="4" placeholder="Como fazer a atividade..."/>
                                        
                                        {/* Músicas Vinculadas */}
                                        {(atividadeEditando.musicasVinculadas||[]).length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {atividadeEditando.musicasVinculadas.map((musica, mi) => (
                                                    <div key={mi} className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded">
                                                        <span className="text-blue-700 text-sm font-semibold">🎵 {musica.titulo} {musica.autor && `- ${musica.autor}`}</span>
                                                        <button type="button" onClick={() => {
                                                            setAtividadeEditando({
                                                                ...atividadeEditando,
                                                                musicasVinculadas: atividadeEditando.musicasVinculadas.filter((_, idx) => idx !== mi)
                                                            });
                                                        }} className="text-red-500 font-bold hover:text-red-700">×</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div><label className="block font-bold mb-2">Faixa Etária</label><div className="flex flex-wrap gap-2">{faixas.slice(1).map(f=><button key={f} type="button" onClick={()=>{const tem = atividadeEditando.faixaEtaria.includes(f); setAtividadeEditando({...atividadeEditando, faixaEtaria: tem ? atividadeEditando.faixaEtaria.filter(x=>x!==f) : [...atividadeEditando.faixaEtaria, f]});}} className={`px-3 py-1 rounded-lg font-bold ${atividadeEditando.faixaEtaria.includes(f)?'bg-amber-500 text-white':'bg-gray-200'}`}>{f}</button>)}</div></div>
                                    <div><label className="block font-bold mb-2">Duração</label><input type="text" value={atividadeEditando.duracao} onChange={e=>setAtividadeEditando({...atividadeEditando, duracao:e.target.value})} className="w-full px-4 py-2 border-2 rounded-lg" placeholder="Ex: 15 min"/></div>
                                    <div><label className="block font-bold mb-2">Materiais</label><textarea value={(atividadeEditando.materiais||[]).join('\n')} onChange={e=>setAtividadeEditando({...atividadeEditando, materiais:e.target.value.split('\n').filter(Boolean)})} className="w-full px-4 py-2 border-2 rounded-lg" rows="3" placeholder="Um por linha"/></div>
                                    
                                    {/* CONCEITOS MUSICAIS */}
                                    <div>
                                        <label className="block font-bold mb-2">🎵 Conceitos Musicais</label>
                                        
                                        {/* Conceitos selecionados em chips */}
                                        {(atividadeEditando.conceitos||[]).length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-purple-200">
                                                {(atividadeEditando.conceitos||[]).map((conceito,idx)=>(
                                                    <span key={idx} className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow">
                                                        ✓ {conceito}
                                                        <button 
                                                            type="button"
                                                            onClick={()=>setAtividadeEditando({
                                                                ...atividadeEditando, 
                                                                conceitos: atividadeEditando.conceitos.filter((_,i)=>i!==idx)
                                                            })}
                                                            className="hover:bg-purple-700 rounded-full w-5 h-5 flex items-center justify-center"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* Seleção rápida de conceitos existentes */}
                                        <p className="text-xs font-bold text-purple-700 mb-2">✨ Selecione dos existentes:</p>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {(conceitos || []).map(conceito => (
                                                <div key={conceito} className="flex items-center gap-1 bg-white border border-purple-300 rounded-full">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => {
                                                            if (!(atividadeEditando.conceitos||[]).includes(conceito)) {
                                                                setAtividadeEditando({
                                                                    ...atividadeEditando, 
                                                                    conceitos: [...(atividadeEditando.conceitos||[]), conceito]
                                                                });
                                                            }
                                                        }}
                                                        disabled={(atividadeEditando.conceitos||[]).includes(conceito)}
                                                        className={`px-3 py-1 rounded-l-full font-semibold transition-all text-sm ${
                                                            (atividadeEditando.conceitos||[]).includes(conceito)
                                                            ? 'text-purple-400 cursor-not-allowed'
                                                            : 'text-purple-600 hover:bg-purple-50'
                                                        }`}
                                                    >
                                                        {conceito}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setModalConfirm({ titulo: 'Remover conceito?', conteudo: `Remover "${conceito}" da lista permanentemente?`, labelConfirm: 'Remover', perigo: true, onConfirm: () => {
                                                                setConceitos(conceitos.filter(c => c !== conceito));
                                                                if ((atividadeEditando.conceitos||[]).includes(conceito)) {
                                                                    setAtividadeEditando({
                                                                        ...atividadeEditando,
                                                                        conceitos: atividadeEditando.conceitos.filter(c => c !== conceito)
                                                                    });
                                                                }
                                                            } });
                                                        }}
                                                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-r-full transition-all"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        {/* Input para adicionar novo conceito */}
                                        <p className="text-xs font-bold text-purple-700 mb-2">➕ Ou adicione novo:</p>
                                        <input 
                                            type="text" 
                                            onKeyDown={e=>{
                                                if ((e.key === 'Enter' || e.key === ' ') && e.target.value.trim()) {
                                                    e.preventDefault();
                                                    const novoConceito = e.target.value.trim();
                                                    if (novoConceito && !(atividadeEditando.conceitos||[]).includes(novoConceito)) {
                                                        setAtividadeEditando({
                                                            ...atividadeEditando, 
                                                            conceitos: [...(atividadeEditando.conceitos||[]), novoConceito]
                                                        });
                                                        // Adicionar à lista global se não existir
                                                        if (!conceitos.includes(novoConceito)) {
                                                            setConceitos([...conceitos, novoConceito].sort());
                                                        }
                                                    }
                                                    e.target.value = '';
                                                }
                                            }}
                                            className="w-full px-4 py-2 border-2 border-purple-200 rounded-lg focus:border-purple-500" 
                                            placeholder="Digite e pressione Enter... Ex: Ritmo, Melodia"
                                        />
                                    </div>
                                    
                                    {/* TAGS */}
                                    <div>
                                        <label className="block font-bold mb-2">🏷️ Tags (dinâmica/formato)</label>
                                        
                                        {/* Tags selecionadas em chips */}
                                        {(atividadeEditando.tags||[]).length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-amber-200">
                                                {(atividadeEditando.tags||[]).map((tag,idx)=>(
                                                    <span key={idx} className="bg-amber-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow">
                                                        ✓ #{tag}
                                                        <button 
                                                            type="button"
                                                            onClick={()=>setAtividadeEditando({
                                                                ...atividadeEditando, 
                                                                tags: atividadeEditando.tags.filter((_,i)=>i!==idx)
                                                            })}
                                                            className="hover:bg-amber-700 rounded-full w-5 h-5 flex items-center justify-center"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* Seleção rápida de tags existentes */}
                                        <p className="text-xs font-bold text-amber-700 mb-2">✨ Selecione das existentes:</p>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {(tagsGlobais || []).map(tag => (
                                                <div key={tag} className="flex items-center gap-1 bg-white border border-amber-300 rounded-full">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => {
                                                            if (!(atividadeEditando.tags||[]).includes(tag)) {
                                                                setAtividadeEditando({
                                                                    ...atividadeEditando, 
                                                                    tags: [...(atividadeEditando.tags||[]), tag]
                                                                });
                                                            }
                                                        }}
                                                        disabled={(atividadeEditando.tags||[]).includes(tag)}
                                                        className={`px-3 py-1 rounded-l-full font-semibold transition-all text-sm ${
                                                            (atividadeEditando.tags||[]).includes(tag)
                                                            ? 'text-amber-400 cursor-not-allowed'
                                                            : 'text-amber-600 hover:bg-amber-50'
                                                        }`}
                                                    >
                                                        #{tag}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setModalConfirm({ titulo: 'Remover tag?', conteudo: `Remover "${tag}" da lista permanentemente?`, labelConfirm: 'Remover', perigo: true, onConfirm: () => {
                                                                setTagsGlobais(tagsGlobais.filter(t => t !== tag));
                                                                if ((atividadeEditando.tags||[]).includes(tag)) {
                                                                    setAtividadeEditando({
                                                                        ...atividadeEditando,
                                                                        tags: atividadeEditando.tags.filter(t => t !== tag)
                                                                    });
                                                                }
                                                            } });
                                                        }}
                                                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-r-full transition-all"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        {/* Input para adicionar nova tag */}
                                        <p className="text-xs font-bold text-amber-700 mb-2">➕ Ou adicione nova:</p>
                                        <input 
                                            type="text" 
                                            onKeyDown={e=>{
                                                if ((e.key === 'Enter' || e.key === ' ') && e.target.value.trim()) {
                                                    e.preventDefault();
                                                    const novaTag = e.target.value.trim().replace(/^#/, '');
                                                    if (novaTag && !(atividadeEditando.tags||[]).includes(novaTag)) {
                                                        setAtividadeEditando({
                                                            ...atividadeEditando, 
                                                            tags: [...(atividadeEditando.tags||[]), novaTag]
                                                        });
                                                        // Adicionar à lista global se não existir
                                                        if (!tagsGlobais.includes(novaTag)) {
                                                            setTagsGlobais([...tagsGlobais, novaTag].sort());
                                                        }
                                                    }
                                                    e.target.value = '';
                                                }
                                            }}
                                            className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:border-amber-500" 
                                            placeholder="Digite e pressione Enter... Ex: roda, jogos, agitado"
                                        />
                                    </div>
                                    {/* Unidade - Dropdown com opção de adicionar */}
                                    <div>
                                        <label className="block font-bold mb-2">Unidade (opcional)</label>
                                        <div className="flex gap-2">
                                            <select 
                                                value={atividadeEditando.unidade} 
                                                onChange={e => {
                                                    if (e.target.value === '__NOVA__') {
                                                        const novaUnid = prompt('Digite o nome da nova unidade:');
                                                        if (novaUnid && novaUnid.trim()) {
                                                            const unidTrim = novaUnid.trim();
                                                            if (!unidades.includes(unidTrim)) {
                                                                setUnidades([...unidades, unidTrim].sort());
                                                            }
                                                            setAtividadeEditando({...atividadeEditando, unidade: unidTrim});
                                                        }
                                                    } else {
                                                        setAtividadeEditando({...atividadeEditando, unidade: e.target.value});
                                                    }
                                                }} 
                                                className="flex-1 px-4 py-2 border-2 rounded-lg"
                                            >
                                                <option value="">Selecione ou adicione...</option>
                                                {unidades.map(u => (
                                                    <option key={u} value={u}>{u}</option>
                                                ))}
                                                <option value="__NOVA__">➕ Adicionar nova unidade...</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div><label className="block font-bold mb-2">Observação (opcional)</label><textarea value={atividadeEditando.observacao} onChange={e=>setAtividadeEditando({...atividadeEditando, observacao:e.target.value})} className="w-full px-4 py-2 border-2 rounded-lg" rows="2"/></div>
                                    
                                    {/* Links e Imagens da Atividade */}
                                    <div className="border-2 border-blue-200 rounded-xl p-4 bg-blue-50">
                                        <label className="block font-bold mb-2 text-blue-800">🔗 Links e Imagens</label>
                                        <div className="flex gap-2 mb-3 flex-col md:flex-row">
                                            <input 
                                                type="text" 
                                                placeholder="URL..." 
                                                value={novoRecursoUrlAtiv} 
                                                onChange={e => setNovoRecursoUrlAtiv(e.target.value)} 
                                                className="flex-1 px-3 py-2 border rounded-lg" 
                                            />
                                            <select 
                                                value={novoRecursoTipoAtiv} 
                                                onChange={e => setNovoRecursoTipoAtiv(e.target.value)} 
                                                className="px-3 py-2 border rounded-lg bg-white"
                                            >
                                                <option value="link">Link</option>
                                                <option value="imagem">Imagem</option>
                                            </select>
                                            <button 
                                                type="button" 
                                                onClick={adicionarRecursoAtiv} 
                                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold"
                                            >
                                                Add
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {(atividadeEditando.recursos || []).map((rec, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <span>{rec.tipo === 'imagem' ? '🖼️' : '🔗'}</span>
                                                        <span className="text-sm truncate max-w-xs">{rec.url}</span>
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removerRecursoAtiv(idx)} 
                                                        className="text-red-500 font-bold px-2"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50 flex gap-3 sticky bottom-0">
                                    <button onClick={()=>setAtividadeEditando(null)} className="flex-1 bg-gray-300 py-3 rounded-xl font-bold">Cancelar</button>
                                    <button onClick={salvarAtividade} className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-bold">Salvar</button>
                                </div>
                            </div>
                    )}

                    {/* ═══════════ MODAL ADICIONAR AO PLANO ═══════════ */}
                    {modalAdicionarAoPlano && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={()=>setModalAdicionarAoPlano(null)}>
                            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                                <div className="bg-green-600 text-white p-4 flex justify-between items-center sticky top-0">
                                    <h2 className="text-lg font-bold">Adicionar ao Plano</h2>
                                    <button onClick={()=>setModalAdicionarAoPlano(null)} className="text-white text-xl">✕</button>
                                </div>
                                <div className="p-4">
                                    <p className="text-sm text-gray-600 mb-4">Selecione o plano onde deseja adicionar "<strong>{modalAdicionarAoPlano.nome}</strong>":</p>
                                    {planos.length === 0 ? (
                                        <p className="text-center text-gray-400 py-8">Nenhum plano cadastrado ainda.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {planos.map(p=>(
                                                <button key={p.id} onClick={()=>adicionarAtividadeAoPlano(modalAdicionarAoPlano.id, p.id)} className="w-full text-left px-4 py-3 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition">
                                                    <p className="font-bold text-gray-800">{p.titulo}</p>
                                                    <p className="text-xs text-gray-500">{p.escola} • {(p.faixaEtaria||[]).join(', ')}</p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══════════ MODAL REGISTRO RÁPIDO ═══════════ */}
                    {modalRegistroRapido && (
                        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={()=>setModalRegistroRapido(false)}>
                            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                                {/* Header */}
                                <div className="bg-green-600 text-white p-4 flex justify-between items-center sticky top-0 z-10">
                                    <h2 className="text-lg font-bold">⚡ Registro Rápido</h2>
                                    <button onClick={()=>setModalRegistroRapido(false)} className="text-white text-xl font-bold">✕</button>
                                </div>

                                <div className="p-4 space-y-4">
                                    {/* Data e Ano Letivo */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">📅 Data da Aula</label>
                                            <input type="date" value={rrData} onChange={e=>setRrData(e.target.value)} 
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">📆 Ano Letivo</label>
                                            <select value={rrAnoSel} onChange={e=>{setRrAnoSel(e.target.value);setRrEscolaSel('');setRrPlanosSegmento({});setRrTextos({});}}
                                                className="w-full px-3 py-2 border-2 rounded-lg bg-white">
                                                <option value="">Selecione...</option>
                                                {anosLetivos.filter(a => a.status !== 'arquivado').map(a=><option key={a.id} value={a.id}>{a.ano}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Escola */}
                                    {rrAnoSel && (
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">🏫 Escola</label>
                                            <select value={rrEscolaSel} onChange={e=>{setRrEscolaSel(e.target.value);setRrPlanosSegmento({});setRrTextos({});}}
                                                className="w-full px-3 py-2 border-2 rounded-lg bg-white">
                                                <option value="">Selecione...</option>
                                                {anosLetivos.find(a=>a.id==rrAnoSel)?.escolas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {/* Turmas agrupadas por Segmento */}
                                    {rrAnoSel && rrEscolaSel && (() => {
                                        const ano = anosLetivos.find(a=>a.id==rrAnoSel);
                                        const esc = ano?.escolas.find(e=>e.id==rrEscolaSel);
                                        const dataFormatada = new Date(rrData+'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});
                                        
                                        if (!esc || esc.segmentos.length === 0) {
                                            return <p className="text-sm text-gray-400 italic text-center py-4">Nenhum segmento cadastrado nesta escola.</p>;
                                        }

                                        return (
                                            <div className="space-y-4">
                                                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                                                    <p className="text-sm font-bold text-indigo-800">{esc.nome} – {dataFormatada}</p>
                                                </div>

                                                {esc.segmentos.map(seg => {
                                                    if (!seg.turmas || seg.turmas.length === 0) return null;
                                                    
                                                    // Sugestão automática de plano (só na primeira vez)
                                                    if (!rrPlanosSegmento[seg.id]) {
                                                        const sugerido = sugerirPlanoParaTurma(rrAnoSel, rrEscolaSel, seg.id, seg.turmas[0]?.id);
                                                        if (sugerido) {
                                                            setRrPlanosSegmento({...rrPlanosSegmento, [seg.id]: sugerido});
                                                        }
                                                    }
                                                    
                                                    return (
                                                        <div key={seg.id} className="border-2 border-gray-200 rounded-xl p-4 bg-white">
                                                            {/* Header do Segmento */}
                                                            <h3 className="font-bold text-gray-800 mb-3">👥 {seg.nome}</h3>
                                                            
                                                            {/* Seleção de Plano */}
                                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                                                                <label className="block text-xs font-bold text-blue-800 mb-2">📚 Plano de Aula</label>
                                                                <div className="flex gap-2">
                                                                    <select 
                                                                        value={rrPlanosSegmento[seg.id] || ''} 
                                                                        onChange={e=>setRrPlanosSegmento({...rrPlanosSegmento, [seg.id]: e.target.value})}
                                                                        className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white">
                                                                        <option value="">Sem plano vinculado</option>
                                                                        {planos.map(p=><option key={p.id} value={p.id}>{p.titulo}</option>)}
                                                                    </select>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={()=>{
                                                                            const planoId = rrPlanosSegmento[seg.id];
                                                                            if(!planoId) return;
                                                                            const novos = {...rrPlanosSegmento};
                                                                            seg.turmas.forEach(t=>{ novos[seg.id] = planoId; });
                                                                            setRrPlanosSegmento(novos);
                                                                        }}
                                                                        className="shrink-0 bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold">
                                                                        Aplicar
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Turmas */}
                                                            <div className="space-y-2">
                                                                {(() => {
                                                                    // Ordenar turmas pela grade semanal (se disponível)
                                                                    const turmasDoDia = obterTurmasDoDia(rrData).filter(a => 
                                                                        a.anoLetivoId == rrAnoSel && 
                                                                        a.escolaId == rrEscolaSel && 
                                                                        a.segmentoId == seg.id
                                                                    ).sort((a,b) => a.horario.localeCompare(b.horario));
                                                                    
                                                                    // Se há turmas na grade, ordena por ela; senão, ordem padrão
                                                                    let turmasOrdenadas = seg.turmas;
                                                                    if (turmasDoDia.length > 0) {
                                                                        const ordemIds = turmasDoDia.map(a => a.turmaId);
                                                                        turmasOrdenadas = [
                                                                            ...seg.turmas.filter(t => ordemIds.includes(t.id)).sort((a,b) => 
                                                                                ordemIds.indexOf(a.id) - ordemIds.indexOf(b.id)
                                                                            ),
                                                                            ...seg.turmas.filter(t => !ordemIds.includes(t.id))
                                                                        ];
                                                                    }
                                                                    
                                                                    return turmasOrdenadas.map(turma => {
                                                                        // Verificar se já existe registro desta turma neste dia
                                                                        const planoId = rrPlanosSegmento[seg.id];
                                                                        const plano = planos.find(p => p.id == planoId);
                                                                        const jaTemRegistro = plano?.registrosPosAula?.some(r => 
                                                                            r.data === rrData && r.turma == turma.id
                                                                        );
                                                                        
                                                                        // Buscar horário da grade (se houver)
                                                                        const aulaGrade = turmasDoDia.find(a => a.turmaId == turma.id);
                                                                        
                                                                        return (
                                                                            <div key={turma.id} className="flex items-center gap-2">
                                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                                    {aulaGrade && (
                                                                                        <span className="text-xs font-mono font-bold text-purple-700 shrink-0">
                                                                                            {aulaGrade.horario}
                                                                                        </span>
                                                                                    )}
                                                                                    <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded min-w-[3rem] text-center">
                                                                                        Turma {turma.nome}
                                                                                    </span>
                                                                                    {jaTemRegistro && (
                                                                                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold" title="Já tem registro neste dia">
                                                                                            +
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <input 
                                                                                    type="text"
                                                                                    value={rrTextos[turma.id] || ''}
                                                                                    onChange={e=>setRrTextos({...rrTextos, [turma.id]: e.target.value})}
                                                                                    placeholder={jaTemRegistro ? "Adicionar ao registro existente..." : "O que foi feito nesta turma..."}
                                                                                    className={`flex-1 px-3 py-2 border-2 rounded-lg text-sm ${jaTemRegistro ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
                                                                                />
                                                                            </div>
                                                                        );
                                                                    });
                                                                })()}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Footer */}
                                {rrAnoSel && rrEscolaSel && (
                                    <div className="p-4 bg-gray-50 flex gap-3 sticky bottom-0 border-t">
                                        <button onClick={()=>setModalRegistroRapido(false)} className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-xl font-bold">
                                            Cancelar
                                        </button>
                                        <button onClick={salvarRegistroRapido} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold">
                                            💾 Salvar Registros
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════
                        MODAL INLINE: CADASTRAR NOVA MÚSICA (sem sair do plano)
                    ══════════════════════════════════════════ */}
                    {modalNovaMusicaInline && (
                        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[110]">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                                <div className="bg-green-600 text-white p-5 rounded-t-2xl flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold">🎵 Nova Música</h2>
                                        <p className="text-green-200 text-sm mt-0.5">Será salva no Repertório e vinculada à atividade</p>
                                    </div>
                                    <button onClick={()=>setModalNovaMusicaInline(false)} className="text-white/70 hover:text-white text-2xl font-bold">×</button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block font-bold text-gray-700 mb-1">Título *</label>
                                        <input type="text" autoFocus
                                            value={novaMusicaInline.titulo}
                                            onChange={e=>setNovaMusicaInline({...novaMusicaInline, titulo: e.target.value})}
                                            placeholder="Nome da música"
                                            className="w-full px-4 py-3 border-2 border-gray-200 focus:border-green-500 rounded-xl outline-none"/>
                                    </div>
                                    <div>
                                        <label className="block font-bold text-gray-700 mb-1">Compositor / Autor</label>
                                        <input type="text"
                                            value={novaMusicaInline.autor}
                                            onChange={e=>setNovaMusicaInline({...novaMusicaInline, autor: e.target.value})}
                                            placeholder="Opcional"
                                            className="w-full px-4 py-3 border-2 border-gray-200 focus:border-green-500 rounded-xl outline-none"/>
                                    </div>
                                    <div>
                                        <label className="block font-bold text-gray-700 mb-1">Origem</label>
                                        <select value={novaMusicaInline.origem}
                                            onChange={e=>setNovaMusicaInline({...novaMusicaInline, origem: e.target.value})}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl">
                                            <option value="">— Selecione —</option>
                                            <option>Brasileira</option>
                                            <option>Estrangeira</option>
                                            <option>Folclórica</option>
                                            <option>Infantil</option>
                                            <option>Erudita</option>
                                            <option>Popular</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block font-bold text-gray-700 mb-1">Observações</label>
                                        <textarea value={novaMusicaInline.observacoes}
                                            onChange={e=>setNovaMusicaInline({...novaMusicaInline, observacoes: e.target.value})}
                                            rows="2" placeholder="Opcional"
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none resize-none"/>
                                    </div>
                                </div>
                                <div className="p-6 pt-0 flex gap-3">
                                    <button onClick={()=>setModalNovaMusicaInline(false)}
                                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold">
                                        Cancelar
                                    </button>
                                    <button onClick={()=>{
                                        const titulo = novaMusicaInline.titulo.trim();
                                        if (!titulo) { setModalConfirm({ conteudo: '⚠️ Título é obrigatório!', somenteOk: true, labelConfirm: 'OK' }); return; }
                                        // Cria a música
                                        const novaMusica = {
                                            id: Date.now(),
                                            titulo,
                                            autor: novaMusicaInline.autor.trim(),
                                            origem: novaMusicaInline.origem,
                                            observacoes: novaMusicaInline.observacoes,
                                            estilos: [], compassos: [], tonalidades: [],
                                            andamentos: [], escalas: [], estruturas: [], energias: [],
                                            dinamicas: [], instrumentacao: [], instrumentoDestaque: '',
                                            links: [], pdfs: [], audios: [],
                                            planosVinculados: (pendingAtividadeId && planoEditando) ? [planoEditando.id] : []
                                        };
                                        // Salva no repertório (useEffect persiste automaticamente)
                                        setRepertorio(prev => [...prev, novaMusica]);
                                        // Vincula à atividade pendente
                                        if (pendingAtividadeId && planoEditando) {
                                            const atualizado = [...(planoEditando.atividadesRoteiro || [])];
                                            const idx = atualizado.findIndex(a => a.id === pendingAtividadeId);
                                            if (idx !== -1) {
                                                atualizado[idx] = {
                                                    ...atualizado[idx],
                                                    musicasVinculadas: [...(atualizado[idx].musicasVinculadas || []),
                                                        { id: novaMusica.id, titulo: novaMusica.titulo, autor: novaMusica.autor }]
                                                };
                                                setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                                            }
                                        }
                                        setPendingAtividadeId(null);
                                        setModalNovaMusicaInline(false);
                                        setAtividadeVinculandoMusica(null);
                                        setModalConfirm({ conteudo: `✅ Música "${titulo}" salva e vinculada! Complete os detalhes depois em Repertório Inteligente.`, somenteOk: true, labelConfirm: 'OK' });
                                    }} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold">
                                        🎵 Salvar e Vincular
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* ═══════════ MODAL TEMPLATES DE ROTEIRO ═══════════ */}
                    {modalTemplates && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setModalTemplates(false)}>
                            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                                <div className="bg-purple-600 text-white p-5 flex justify-between items-center rounded-t-2xl">
                                    <div>
                                        <h2 className="text-xl font-bold">📐 Templates de Roteiro</h2>
                                        <p className="text-purple-200 text-sm mt-0.5">Salve e reutilize estruturas de aula</p>
                                    </div>
                                    <button onClick={() => setModalTemplates(false)} className="text-white text-2xl font-bold">✕</button>
                                </div>
                                <div className="p-5 space-y-4">
                                    {planoEditando && (planoEditando.atividadesRoteiro || []).length > 0 && (
                                        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                                            <p className="font-bold text-purple-800 mb-2">💾 Salvar roteiro atual como template</p>
                                            <p className="text-xs text-purple-600 mb-3">{(planoEditando.atividadesRoteiro || []).length} atividade(s) serão salvas</p>
                                            <div className="flex gap-2">
                                                <input type="text" value={nomeNovoTemplate} onChange={e => setNomeNovoTemplate(e.target.value)}
                                                    placeholder="Nome do template (ex: Aula padrão 80min)..."
                                                    className="flex-1 px-3 py-2 border-2 border-purple-300 rounded-lg text-sm focus:border-purple-500 outline-none" />
                                                <button onClick={() => {
                                                    if (!nomeNovoTemplate.trim()) return;
                                                    setTemplatesRoteiro(prev => [...prev, {
                                                        id: Date.now(), nome: nomeNovoTemplate.trim(),
                                                        criadoEm: new Date().toLocaleDateString('pt-BR'),
                                                        atividades: (planoEditando.atividadesRoteiro || []).map(a => ({nome:a.nome, duracao:a.duracao, descricao:a.descricao}))
                                                    }]);
                                                    setNomeNovoTemplate('');
                                                }} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-sm">Salvar</button>
                                            </div>
                                        </div>
                                    )}
                                    {templatesRoteiro.length === 0 ? (
                                        <div className="text-center py-10 text-gray-400">
                                            <p className="text-4xl mb-2">📐</p>
                                            <p className="font-bold">Nenhum template salvo ainda</p>
                                            <p className="text-sm mt-1">Monte um roteiro e salve como template para reutilizar</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <p className="font-bold text-gray-700">{templatesRoteiro.length} template(s) salvo(s)</p>
                                            {templatesRoteiro.map(tmpl => (
                                                <div key={tmpl.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-purple-300 transition">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <p className="font-bold text-gray-800">{tmpl.nome}</p>
                                                            <p className="text-xs text-gray-400">{tmpl.atividades.length} atividade(s) · Criado em {tmpl.criadoEm}</p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => {
                                                                setModalConfirm({ titulo: `Aplicar template "${tmpl.nome}"?`, conteudo: 'Isso substituirá o roteiro atual.', labelConfirm: 'Aplicar', onConfirm: () => {
                                                                    setPlanoEditando({...planoEditando, atividadesRoteiro: tmpl.atividades.map(a=>({...a, id:gerarIdSeguro()}))});
                                                                    setModalTemplates(false);
                                                                } });
                                                            }} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold">▶ Aplicar</button>
                                                            <button onClick={() => { setModalConfirm({ titulo: `Excluir template "${tmpl.nome}"?`, conteudo: 'Esta ação não pode ser desfeita.', labelConfirm: 'Excluir', perigo: true, onConfirm: () => setTemplatesRoteiro(prev=>prev.filter(t=>t.id!==tmpl.id)) }); }}
                                                                className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1.5 rounded-lg text-sm font-bold">🗑️</button>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1 mt-2">
                                                        {tmpl.atividades.map((a, i) => (
                                                            <div key={i} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                                                <span className="bg-purple-200 text-purple-800 font-bold px-1.5 py-0.5 rounded-full">{i+1}</span>
                                                                <span className="font-medium">{a.nome || '(sem nome)'}</span>
                                                                {a.duracao && <span className="text-gray-400">· {a.duracao} min</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════
                        MODAL: NOVA FAIXA ETÁRIA
                    ══════════════════════════════════════════ */}
                    {modalNovaFaixa && (() => {
                        // #14: estado local para renomear inline
                        return (
                        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100]" onClick={()=>setModalNovaFaixa(false)}>
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col" onClick={e=>e.stopPropagation()}>
                                <div className="bg-indigo-600 text-white p-5 rounded-t-2xl flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-bold">👥 Faixas Etárias</h2>
                                        <p className="text-indigo-200 text-xs mt-0.5">Adicione, renomeie ou remova rótulos</p>
                                    </div>
                                    <button onClick={()=>setModalNovaFaixa(false)} className="text-white/70 hover:text-white text-2xl leading-none font-bold">×</button>
                                </div>

                                {/* Lista editável */}
                                <div className="flex-1 overflow-y-auto p-5 space-y-2">
                                    {faixas.slice(1).map((f, idx) => (
                                        <div key={f} className="flex items-center gap-2 group">
                                            <input
                                                type="text"
                                                defaultValue={f}
                                                onBlur={e => {
                                                    const novo = e.target.value.trim();
                                                    if (!novo) { e.target.value = f; return; }
                                                    if (novo === f) return;
                                                    if (faixas.includes(novo)) { setModalConfirm({ conteudo: 'Já existe uma faixa com esse nome!', somenteOk: true, labelConfirm: 'OK' }); e.target.value = f; return; }
                                                    setFaixas(faixas.map(x => x === f ? novo : x));
                                                    // Atualizar planos que usavam o nome antigo
                                                    setPlanos(planos.map(p => ({
                                                        ...p,
                                                        faixaEtaria: (p.faixaEtaria||[]).map(fe => fe === f ? novo : fe)
                                                    })));
                                                }}
                                                onKeyDown={e => { if(e.key==='Enter') e.target.blur(); if(e.key==='Escape') { e.target.value=f; e.target.blur(); }}}
                                                className="flex-1 px-3 py-2 border-2 border-transparent hover:border-indigo-200 focus:border-indigo-500 rounded-lg text-sm font-medium outline-none bg-indigo-50 focus:bg-white transition"
                                            />
                                            <button
                                                onClick={() => {
                                                    setModalConfirm({ titulo: `Remover faixa "${f}"?`, conteudo: 'Os planos que a usam perderão esse rótulo.', labelConfirm: 'Remover', perigo: true, onConfirm: () => {
                                                        setFaixas(faixas.filter(x => x !== f));
                                                        setPlanos(planos.map(p => ({
                                                            ...p,
                                                            faixaEtaria: (p.faixaEtaria||[]).filter(fe => fe !== f)
                                                        })));
                                                    } });
                                                }}
                                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 font-bold px-2 py-1 rounded-lg hover:bg-red-50 transition text-lg leading-none"
                                                title="Remover faixa">×</button>
                                        </div>
                                    ))}
                                    {faixas.slice(1).length === 0 && (
                                        <p className="text-sm text-gray-400 text-center py-4">Nenhuma faixa cadastrada ainda.</p>
                                    )}
                                </div>

                                {/* Adicionar nova */}
                                <div className="p-5 pt-0 border-t border-gray-100">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={novaFaixaNome}
                                            onChange={e=>setNovaFaixaNome(e.target.value)}
                                            onKeyDown={e=>{ if(e.key==='Enter') salvarNovaFaixa(); }}
                                            placeholder="Nova faixa (ex: Maternal, EJA...)"
                                            className="flex-1 px-3 py-2.5 border-2 border-indigo-200 focus:border-indigo-500 rounded-xl text-sm outline-none"
                                        />
                                        <button onClick={salvarNovaFaixa}
                                            className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-4 py-2.5 rounded-xl font-bold text-sm transition">
                                            + Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        );
                    })()}

                    {/* ══════════════════════════════════════════
                        MODAL: CADASTRAR NOVA ESCOLA
                    ══════════════════════════════════════════ */}
                    {modalNovaEscola && (
                        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100]">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                                {/* Header */}
                                <div className="bg-indigo-600 text-white p-5 rounded-t-2xl flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold">🏫 Nova Escola</h2>
                                        <p className="text-indigo-200 text-sm mt-0.5">A escola será cadastrada no sistema</p>
                                    </div>
                                    <button onClick={()=>setModalNovaEscola(false)} className="text-white/70 hover:text-white text-2xl leading-none font-bold">×</button>
                                </div>

                                <div className="p-6 space-y-5">
                                    {/* Nome da escola */}
                                    <div>
                                        <label className="block font-bold text-gray-700 mb-2">Nome da Escola *</label>
                                        <input
                                            type="text"
                                            value={novaEscolaNome}
                                            onChange={e=>setNovaEscolaNome(e.target.value)}
                                            onKeyDown={e=>{ if(e.key==='Enter') salvarNovaEscola(); }}
                                            placeholder="Ex: EMEF João da Silva"
                                            autoFocus
                                            className="w-full px-4 py-3 border-2 border-indigo-200 focus:border-indigo-500 rounded-xl text-base outline-none"
                                        />
                                    </div>

                                    {/* Vincular ao Ano Letivo */}
                                    <div>
                                        <label className="block font-bold text-gray-700 mb-2">Vincular ao Ano Letivo</label>
                                        {anosLetivos.length === 0 ? (
                                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                                                ⚠️ Nenhum ano letivo cadastrado. A escola será salva apenas no plano atual.<br/>
                                                <span className="text-xs mt-1 block">Acesse <b>Turmas</b> para criar anos letivos.</span>
                                            </div>
                                        ) : (
                                            <select
                                                value={novaEscolaAnoId}
                                                onChange={e=>setNovaEscolaAnoId(e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base">
                                                <option value="">— Selecione um ano letivo (opcional) —</option>
                                                {anosLetivos.map(a=>(
                                                    <option key={a.id} value={a.id}>
                                                        {a.ano}{a.status==='ativo' ? ' ✓ (ativo)' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    {/* Escolas existentes */}
                                    {anosLetivos.flatMap(a=>a.escolas).length > 0 && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-500 mb-2">Escolas já cadastradas:</label>
                                            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                                                {anosLetivos.flatMap(a=>a.escolas.map(e=>({nome:e.nome,ano:a.ano}))).map((item,i)=>(
                                                    <span key={i} onClick={()=>{ if(modalNovaEscola==='plano') setPlanoEditando({...planoEditando, escola: item.nome}); setModalNovaEscola(false); }}
                                                        className="cursor-pointer bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium transition"
                                                        title={`Clique para usar: ${item.nome} (${item.ano})`}>
                                                        {item.nome}
                                                    </span>
                                                ))}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">Clique em uma escola existente para selecioná-la direto.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="p-5 pt-0 flex gap-3">
                                    <button onClick={()=>setModalNovaEscola(false)}
                                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold transition">
                                        Cancelar
                                    </button>
                                    <button onClick={salvarNovaEscola}
                                        className="flex-1 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 py-3 rounded-xl font-bold transition">
                                        🏫 Cadastrar Escola
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── MODAL DE CONFIRMAÇÃO GLOBAL ── */}
                    {modalConfirm && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                                {modalConfirm.titulo && (
                                    <h3 className="text-lg font-bold text-gray-800 mb-3">{modalConfirm.titulo}</h3>
                                )}
                                <div className="text-gray-600 text-sm mb-6 whitespace-pre-line">{modalConfirm.conteudo}</div>
                                <div className={`flex gap-3 ${modalConfirm.somenteOk ? '' : ''}`}>
                                    {!modalConfirm.somenteOk && (
                                        <button onClick={() => { setModalConfirm(null); if (modalConfirm.onCancel) modalConfirm.onCancel(); }}
                                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition">
                                            {modalConfirm.labelCancelar || 'Cancelar'}
                                        </button>
                                    )}
                                    <button onClick={() => { setModalConfirm(null); if (modalConfirm.onConfirm) modalConfirm.onConfirm(); }}
                                        className={`flex-1 py-3 rounded-xl font-semibold transition ${modalConfirm.perigo ? 'bg-red-500 hover:bg-red-600 text-white' : 'border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800'}`}>
                                        {modalConfirm.labelConfirm || 'OK'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                </BancoPlanosContext.Provider>
            );
}
