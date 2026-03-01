import React, { useState, useEffect, useRef, useMemo } from 'react'
import { jsPDF } from 'jspdf'
import { supabase } from './lib/supabase'
import BancoPlanos from './components/BancoPlanos'
import {
  sanitizar,
  gerarIdSeguro,
  syncToSupabase,
  syncConfiguracoes,
  loadFromSupabase,
  loadConfiguracoes,
} from './lib/utils'


        // ── TELA DE LOGIN ──
        function LoginScreen() {
            const [loading, setLoading] = React.useState(false);
            const [erro, setErro] = React.useState('');
            const loginGoogle = async () => {
                setLoading(true); setErro('');
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: window.location.href }
                });
                if (error) { setErro(error.message); setLoading(false); }
            };
            return (
                <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-10 text-center">
                        <div className="text-6xl mb-4">🎵</div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">MusiLab</h1>
                        <p className="text-gray-500 mb-8">Criação e Planejamento Musical</p>
                        <button onClick={loginGoogle} disabled={loading}
                            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-indigo-400 hover:shadow-md text-gray-700 font-semibold py-4 px-6 rounded-2xl transition-all duration-200 disabled:opacity-60">
                            {loading ? <span className="text-xl">⏳</span> : (
                                <svg className="w-6 h-6" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                            )}
                            {loading ? 'Entrando...' : 'Entrar com Google'}
                        </button>
                        {erro && <p className="text-red-500 text-sm mt-4">{erro}</p>}
                        <p className="text-xs text-gray-400 mt-8">Seus dados ficam salvos na nuvem e acessíveis em qualquer dispositivo.</p>
                    </div>
                </div>
            );
        }


        // --- BASE DE DADOS BNCC ---
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

        function BancoPlanosImpl({ session }) {
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
            const lerLS = (chave) => { try { return JSON.parse(localStorage.getItem(chave) || '[]'); } catch { return []; } };
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
            const handleDragStart = (index) => { dragItem.current = index; setDragActiveIndex(index); };
            const handleDragEnter = (index) => { dragOverItem.current = index; setDragOverIndex(index); };
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
            useEffect(() => { if(!userId||!dadosCarregados) return; syncDelay('planos', ()=>syncToSupabase('planos',planos,userId,onSyncStatus)); }, [planos]);
            useEffect(() => { if(!userId||!dadosCarregados) return; syncDelay('atividades', ()=>syncToSupabase('atividades',atividades,userId,onSyncStatus)); }, [atividades]);
            useEffect(() => { if(!userId||!dadosCarregados) return; syncDelay('repertorio', ()=>syncToSupabase('repertorio',repertorio,userId,onSyncStatus)); }, [repertorio]);
            useEffect(() => { if(!userId||!dadosCarregados) return; syncDelay('sequencias', ()=>syncToSupabase('sequencias',sequencias,userId,onSyncStatus)); }, [sequencias]);
            useEffect(() => { if(!userId||!dadosCarregados) return; syncDelay('anos_letivos', ()=>syncToSupabase('anos_letivos',anosLetivos,userId,onSyncStatus)); }, [anosLetivos]);
            useEffect(() => { if(!userId||!dadosCarregados) return; syncDelay('grades_semanas', ()=>syncToSupabase('grades_semanas',gradesSemanas,userId,onSyncStatus)); }, [gradesSemanas]);
            useEffect(() => { if(!userId||!dadosCarregados) return; syncDelay('eventos_escolares', ()=>syncToSupabase('eventos_escolares',eventosEscolares,userId,onSyncStatus)); }, [eventosEscolares]);
            useEffect(() => { if(!userId||!dadosCarregados) return; syncDelay('estrategias', ()=>syncToSupabase('estrategias',estrategias,userId,onSyncStatus)); }, [estrategias]);
            useEffect(() => { if(!userId||!dadosCarregados) return; syncDelay('planejamento_anual', ()=>syncToSupabase('planejamento_anual',planejamentoAnual,userId,onSyncStatus)); }, [planejamentoAnual]);
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

            // ── FONTE UTF-8 PARA PDF (Roboto via GitHub, cache Cache Storage API) ──
            async function carregarFontePDF(doc) {
                const BASE = 'https://raw.githubusercontent.com/googlefonts/roboto/main/fonts/ttf/';
                const VARIANTES = [
                    { url: BASE + 'Roboto-Regular.ttf', estilo: 'normal' },
                    { url: BASE + 'Roboto-Bold.ttf',    estilo: 'bold'   },
                    { url: BASE + 'Roboto-Italic.ttf',  estilo: 'italic' },
                ];
                function uint8ToBase64(arr) {
                    let s = '', chunk = 0x8000;
                    for (let i = 0; i < arr.length; i += chunk)
                        s += String.fromCharCode(...arr.subarray(i, i + chunk));
                    return btoa(s);
                }
                async function buscarFonte(url) {
                    if (typeof caches !== 'undefined') {
                        const cache = await caches.open('musilab-fonts-v1');
                        let resp = await cache.match(url);
                        if (!resp) { await cache.add(url); resp = await cache.match(url); }
                        return new Uint8Array(await resp.arrayBuffer());
                    }
                    // fallback: file:// ou contexto sem Cache API (busca sem cache)
                    const resp = await fetch(url);
                    if (!resp.ok) throw new Error('HTTP ' + resp.status);
                    return new Uint8Array(await resp.arrayBuffer());
                }
                try {
                    for (const v of VARIANTES) {
                        const bytes = await buscarFonte(v.url);
                        const fname = 'Roboto-' + v.estilo + '.ttf';
                        doc.addFileToVFS(fname, uint8ToBase64(bytes));
                        doc.addFont(fname, 'Roboto', v.estilo);
                    }
                    return 'Roboto';
                } catch(e) {
                    console.warn('[MusiLab] Fonte Roboto indisponivel, usando Helvetica:', e.message);
                    return 'helvetica';
                }
            }

            // --- PDF PREMIUM ---
            // ============================================================
            // FUNÇÕES: EXPORTAÇÃO PDF
            // ============================================================
            const exportarPlanoPDF = async (plano) => {
                // jsPDF importado via npm (ver topo do arquivo)
                const doc = new jsPDF();
                const FONTE_PDF = await carregarFontePDF(doc);

                // ── Paleta ──
                const W = 210, H = 297;
                const mL = 22, mR = 22, mB = 20;
                const cW = W - mL - mR;
                const ACCENT = [55, 65, 81];      // cinza escuro elegante
                const DARK   = [17, 24, 39];       // quase preto — corpo do texto
                const LABEL  = [100, 110, 125];    // cinza médio — apenas labels de seção
                const RULE   = [220, 224, 230];    // linha divisória
                const LS     = 6.2;               // espaçamento entre linhas (mm)

                // ── Conversor HTML → texto limpo (apenas ASCII safe) ──
                const htmlToText = (html) => {
                    if (!html) return '';
                    return html
                        .replace(/<\/p>\s*<p>/gi, '\n')
                        .replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '\n')
                        .replace(/<br\s*\/?>/gi, '\n')
                        .replace(/<\/li>/gi, '\n')
                        .replace(/<li[^>]*>/gi, '- ')
                        .replace(/<\/?(ul|ol|strong|em|b|i|span|div|h[1-6])[^>]*>/gi, '')
                        .replace(/<[^>]*>/g, '')
                        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
                        .replace(/\n{3,}/g, '\n\n').trim();
                };

                let y = 0;

                // ── Helpers ──
                const chk = (space) => {
                    if (y + space > H - mB) { doc.addPage(); y = 24; return true; }
                    return false;
                };
                const rule = (before, after) => {
                    y += (before || 4);
                    doc.setDrawColor(...RULE); doc.setLineWidth(0.25);
                    doc.line(mL, y, W - mR, y);
                    y += (after || 4);
                };
                const sectionTitle = (label) => {
                    chk(16);
                    rule(6, 0);
                    y += 6;
                    doc.setFont(FONTE_PDF, "bold"); doc.setFontSize(8.5);
                    doc.setTextColor(...LABEL);
                    doc.text(label.toUpperCase(), mL, y);
                    y += 6;
                    doc.setFont(FONTE_PDF, "normal"); doc.setTextColor(...DARK);
                };
                // Escreve bloco de texto com quebra de linha automática
                const para = (text, indent, size, bold) => {
                    if (!text || !String(text).trim()) return;
                    doc.setFontSize(size || 11);
                    doc.setFont(FONTE_PDF, bold ? "bold" : "normal");
                    doc.setTextColor(...DARK);
                    const lines = doc.splitTextToSize(String(text).trim(), cW - (indent || 0));
                    lines.forEach(l => { chk(LS); doc.text(l, mL + (indent || 0), y); y += LS; });
                };

                // ════════════════════════════════
                // CABECALHO
                // ════════════════════════════════
                doc.setFillColor(...ACCENT); doc.rect(0, 0, W, 4.5, 'F');

                y = 19;
                doc.setFont(FONTE_PDF, "bold"); doc.setFontSize(19); doc.setTextColor(...DARK);
                const titleLines = doc.splitTextToSize(plano.titulo || "Plano de Aula", cW);
                titleLines.forEach(l => { doc.text(l, mL, y); y += 9; });

                if (plano.destaque) {
                    doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(9); doc.setTextColor(...LABEL);
                    doc.text("Favorito", W - mR, 20, { align: 'right' });
                }

                // Metadados — sem status
                const meta = [
                    plano.escola,
                    plano.numeroAula ? 'Aula ' + plano.numeroAula : null,
                    plano.nivel,
                    plano.duracao || null,
                    (plano.faixaEtaria||[]).join(', ') || null,
                ].filter(Boolean).join('  |  ');
                if (meta) {
                    y += 1;
                    doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(10.5); doc.setTextColor(...LABEL);
                    const mLines = doc.splitTextToSize(meta, cW);
                    mLines.forEach(l => { doc.text(l, mL, y); y += 5.5; });
                }

                rule(5, 3);

                // ════════════════════════════════
                // BNCC
                // ════════════════════════════════
                const bncc = (plano.habilidadesBNCC||[]).filter(h => h && h.trim());
                if (bncc.length > 0) {
                    sectionTitle("Habilidades BNCC");
                    bncc.forEach(h => {
                        const ls = doc.splitTextToSize(h.trim(), cW);
                        doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(11); doc.setTextColor(...DARK);
                        ls.forEach(l => { chk(LS); doc.text(l, mL, y); y += LS; });
                    });
                    y += 3;
                }

                // ════════════════════════════════
                // OBJETIVOS
                // ════════════════════════════════
                const objGeral = htmlToText(plano.objetivoGeral);
                const objEsp = (plano.objetivosEspecificos||[]).map(o => htmlToText(o)).filter(o => o.trim());
                if (objGeral || objEsp.length > 0) {
                    sectionTitle("Objetivos de Aprendizagem");
                    if (objGeral) {
                        objGeral.split('\n').filter(l => l.trim()).forEach(linha => para(linha.trim(), 0, 11));
                        y += 3;
                    }
                    if (objEsp.length > 0) {
                        chk(8);
                        doc.setFont(FONTE_PDF, "bold"); doc.setFontSize(9); doc.setTextColor(...LABEL);
                        doc.text("ESPECIFICOS", mL, y); y += 6;
                        objEsp.forEach(o => {
                            o.split('\n').filter(l => l.trim()).forEach(linha => {
                                const txt = (linha.startsWith('-') ? '' : '- ') + linha.trim();
                                const ls = doc.splitTextToSize(txt, cW - 5);
                                doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(11); doc.setTextColor(...DARK);
                                ls.forEach((l, i) => { chk(LS); doc.text(l, mL + (i > 0 ? 7 : 4), y); y += LS; });
                            });
                        });
                    }
                    y += 3;
                }

                // ════════════════════════════════
                // CONCEITOS E UNIDADES
                // ════════════════════════════════
                if (plano.conceitos && plano.conceitos.length > 0) {
                    sectionTitle("Conceitos Musicais");
                    para(plano.conceitos.join('  |  '), 0, 11);
                    y += 3;
                }
                if (plano.unidades && plano.unidades.length > 0) {
                    sectionTitle("Unidades");
                    para(plano.unidades.join('  |  '), 0, 11);
                    y += 3;
                }

                // ════════════════════════════════
                // ROTEIRO DE ATIVIDADES
                // ════════════════════════════════
                if (plano.atividadesRoteiro && plano.atividadesRoteiro.length > 0) {
                    sectionTitle("Roteiro de Atividades");
                    plano.atividadesRoteiro.forEach((ativ, idx) => {
                        chk(22);
                        // Nome da atividade
                        const header = (idx + 1) + '. ' + (ativ.nome || 'Atividade');
                        doc.setFont(FONTE_PDF, "bold"); doc.setFontSize(12); doc.setTextColor(...DARK);
                        const hLines = doc.splitTextToSize(header, cW - 28);
                        hLines.forEach(l => { chk(7); doc.text(l, mL, y); y += 7; });
                        // Duração alinhada à direita
                        if (ativ.duracao) {
                            doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(10); doc.setTextColor(...LABEL);
                            doc.text(ativ.duracao, W - mR, y - 7, { align: 'right' });
                        }
                        // Descricao
                        if (ativ.descricao) {
                            const desc = htmlToText(ativ.descricao);
                            if (desc.trim()) {
                                desc.split('\n').filter(l => l.trim()).forEach(linha => {
                                    const ls = doc.splitTextToSize(linha.trim(), cW - 5);
                                    doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(11); doc.setTextColor(...DARK);
                                    ls.forEach(l => { chk(LS); doc.text(l, mL + 5, y); y += LS; });
                                });
                            }
                        }
                        // Objetivo da atividade
                        if (ativ.objetivo && ativ.objetivo.trim()) {
                            chk(LS);
                            doc.setFont(FONTE_PDF, "italic"); doc.setFontSize(10); doc.setTextColor(...LABEL);
                            const ls = doc.splitTextToSize('Objetivo: ' + ativ.objetivo.trim(), cW - 5);
                            ls.forEach(l => { chk(LS); doc.text(l, mL + 5, y); y += LS; });
                        }
                        // Links/recursos — sem Unicode, apenas ASCII
                        if (ativ.recursos && ativ.recursos.length > 0) {
                            ativ.recursos.forEach(rec => {
                                const url = typeof rec === 'string' ? rec : (rec.url || '');
                                if (!url) return;
                                chk(LS);
                                doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(9.5); doc.setTextColor(59, 130, 246);
                                const label = 'Link: ' + url;
                                const ls = doc.splitTextToSize(label, cW - 5);
                                ls.forEach(l => { chk(LS); doc.text(l, mL + 5, y); y += LS; });
                            });
                        }
                        y += 5;
                    });
                }

                // Metodologia legado
                if (plano.metodologia && (!plano.atividadesRoteiro || plano.atividadesRoteiro.length === 0)) {
                    sectionTitle("Metodologia");
                    para(htmlToText(plano.metodologia), 0, 11);
                    y += 3;
                }

                // ════════════════════════════════
                // MATERIAIS
                // ════════════════════════════════
                if (plano.materiais && plano.materiais.length > 0) {
                    sectionTitle("Materiais");
                    plano.materiais.forEach(m => {
                        const ls = doc.splitTextToSize('- ' + m, cW - 4);
                        doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(11); doc.setTextColor(...DARK);
                        ls.forEach((l, i) => { chk(LS); doc.text(l, mL + (i > 0 ? 6 : 4), y); y += LS; });
                    });
                    y += 3;
                }

                // ════════════════════════════════
                // AVALIACAO / OBSERVACOES
                // ════════════════════════════════
                if (plano.avaliacaoObservacoes && plano.avaliacaoObservacoes.trim()) {
                    sectionTitle("Avaliacao / Observacoes");
                    doc.setFont(FONTE_PDF, "italic"); doc.setFontSize(11); doc.setTextColor(...DARK);
                    const ls = doc.splitTextToSize(plano.avaliacaoObservacoes.trim(), cW);
                    ls.forEach(l => { chk(LS); doc.text(l, mL, y); y += LS; });
                    y += 3;
                }

                // ════════════════════════════════
                // RODAPE em todas as paginas
                // ════════════════════════════════
                const totalPages = doc.getNumberOfPages();
                for (let p = 1; p <= totalPages; p++) {
                    doc.setPage(p);
                    doc.setDrawColor(...RULE); doc.setLineWidth(0.25);
                    doc.line(mL, H - 14, W - mR, H - 14);
                    doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(8.5); doc.setTextColor(...LABEL);
                    doc.text("MusiLab - Plano de Aula", mL, H - 9);
                    doc.text(p + ' / ' + totalPages, W - mR, H - 9, { align: 'right' });
                }

                doc.save('Plano - ' + plano.titulo + '.pdf');
            };
            
            // --- PDF SEQUÊNCIA DIDÁTICA ---
            const exportarSequenciaPDF = async (sequencia) => {
                // jsPDF importado via npm (ver topo do arquivo)
                const doc = new jsPDF();
                const FONTE_PDF = await carregarFontePDF(doc);
                
                // Buscar informações da sequência
                const ano = anosLetivos.find(a => a.id == sequencia.anoLetivoId);
                const escola = ano?.escolas.find(e => e.id == sequencia.escolaId);
                const nomesSegmentos = (sequencia.segmentos || []).map(segId => {
                    const seg = escola?.segmentos.find(s => s.id == segId);
                    return seg ? seg.nome : null;
                }).filter(Boolean);
                
                let y = 0;
                const pageHeight = doc.internal.pageSize.height;
                const checkPageBreak = (space) => { 
                    if (y + space > pageHeight - 20) { 
                        doc.addPage(); 
                        y = 20; 
                        return true; 
                    } 
                    return false; 
                };

                // Cabeçalho
                doc.setFillColor(236, 72, 153); // Rosa
                doc.rect(0, 0, 210, 50, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont(FONTE_PDF, "bold");
                doc.setFontSize(20);
                doc.text("SEQUENCIA DIDATICA", 15, 20);
                doc.setFontSize(16);
                doc.text(sequencia.titulo || "Sem título", 15, 30);
                doc.setFont(FONTE_PDF, "normal");
                doc.setFontSize(10);
                doc.text(`${escola?.nome || ''} - ${nomesSegmentos.join(', ')}`, 15, 40);
                if (sequencia.turmaEspecifica) {
                    doc.text(`Turma: ${sequencia.turmaEspecifica}`, 15, 45);
                }
                y = 60;

                // Informações Gerais
                doc.setDrawColor(200);
                doc.setFillColor(250);
                doc.roundedRect(15, y, 180, 30, 2, 2, 'FD');
                doc.setTextColor(0);
                doc.setFont(FONTE_PDF, "bold");
                doc.setFontSize(10);
                doc.text("INFORMACOES", 20, y + 7);
                doc.setFont(FONTE_PDF, "normal");
                doc.text(`Periodo: ${sequencia.duracao || '-'}`, 20, y + 14);
                doc.text(`Total de aulas: ${sequencia.slots?.length || 0}`, 20, y + 20);
                if (sequencia.unidadePredominante) {
                    doc.text(`Unidade: ${sequencia.unidadePredominante}`, 20, y + 26);
                }
                y += 38;

                // Datas
                if (sequencia.dataInicio || sequencia.dataFim) {
                    doc.setFillColor(240, 253, 244);
                    doc.setDrawColor(187, 247, 208);
                    doc.roundedRect(15, y, 180, 12, 2, 2, 'FD');
                    doc.setFont(FONTE_PDF, "bold");
                    doc.text("DATAS", 20, y + 7);
                    doc.setFont(FONTE_PDF, "normal");
                    let dataTexto = '';
                    if (sequencia.dataInicio) dataTexto += new Date(sequencia.dataInicio).toLocaleDateString('pt-BR');
                    if (sequencia.dataFim) dataTexto += ` ate ${new Date(sequencia.dataFim).toLocaleDateString('pt-BR')}`;
                    doc.text(dataTexto, 60, y + 7);
                    y += 18;
                }

                // Lista de Aulas
                doc.setFillColor(224, 242, 254);
                doc.rect(15, y, 180, 8, 'F');
                doc.setDrawColor(147, 197, 253);
                doc.rect(15, y, 180, 8);
                doc.setFont(FONTE_PDF, "bold");
                doc.setTextColor(29, 78, 216);
                doc.text("PLANO DE AULAS", 20, y + 5.5);
                y += 12;

                (sequencia.slots || []).forEach((slot, index) => {
                    checkPageBreak(40);
                    
                    // Número da aula
                    doc.setFillColor(239, 246, 255);
                    doc.setDrawColor(191, 219, 254);
                    doc.roundedRect(15, y, 180, 8, 1, 1, 'FD');
                    doc.setFont(FONTE_PDF, "bold");
                    doc.setFontSize(10);
                    doc.setTextColor(0);
                    doc.text(`Aula ${index + 1}`, 20, y + 5.5);
                    y += 12;

                    // Conteúdo da aula
                    if (slot.planoVinculado) {
                        const plano = planos.find(p => p.id == slot.planoVinculado);
                        if (plano) {
                            doc.setFont(FONTE_PDF, "bold");
                            doc.text(plano.titulo, 20, y);
                            y += 6;
                            
                            // Objetivo
                            if (plano.objetivoGeral) {
                                doc.setFont(FONTE_PDF, "italic");
                                doc.setFontSize(9);
                                const objLines = doc.splitTextToSize(`Objetivo: ${plano.objetivoGeral}`, 170);
                                objLines.forEach(line => {
                                    checkPageBreak(5);
                                    doc.text(line, 20, y);
                                    y += 4;
                                });
                                y += 2;
                            }
                            
                            // Setlist
                            if (plano.atividadesRoteiro && plano.atividadesRoteiro.length > 0) {
                                doc.setFont(FONTE_PDF, "normal");
                                doc.setFontSize(9);
                                doc.text("Atividades:", 20, y);
                                y += 4;
                                plano.atividadesRoteiro.forEach(ativ => {
                                    checkPageBreak(4);
                                    const atividadeTexto = `- ${ativ.nome}${ativ.duracao ? ' (' + ativ.duracao + ')' : ''}`;
                                    doc.text(atividadeTexto, 25, y);
                                    y += 4;
                                });
                            }
                        }
                    } else if (slot.rascunho?.titulo) {
                        doc.setFont(FONTE_PDF, "normal");
                        doc.text(slot.rascunho.titulo, 20, y);
                        y += 6;
                    } else {
                        doc.setFont(FONTE_PDF, "italic");
                        doc.setTextColor(150);
                        doc.text("(Aula nao planejada)", 20, y);
                        doc.setTextColor(0);
                        y += 6;
                    }
                    
                    y += 4;
                });

                doc.save(`Sequencia - ${sequencia.titulo}.pdf`);
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
                setPlanoSelecionado(null); setModoEdicao(true);
            };

            const editarPlano = (plano) => {
                setPlanoEditando(normalizePlano(plano));
                setPlanoSelecionado(null);
                setModoEdicao(true);
            };

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

            const excluirPlano = (id) => { setModalConfirm({ titulo: 'Excluir plano?', conteudo: 'Esta ação não pode ser desfeita.', labelConfirm: 'Excluir', perigo: true, onConfirm: () => { setPlanos(planos.filter(p => p.id !== id)); setPlanoSelecionado(null); } }); };
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
            
            const toggleFavorito = (plano, e) => {
                if(e) e.stopPropagation();
                const novoStatus = !plano.destaque;
                const atualizado = { ...plano, destaque: novoStatus };
                setPlanos(planos.map(p => p.id === plano.id ? atualizado : p));
                if(planoSelecionado && planoSelecionado.id === plano.id) setPlanoSelecionado(atualizado);
                if(planoEditando && planoEditando.id === plano.id) setPlanoEditando(atualizado);
            };

            // --- FUNÇÕES REGISTRO PÓS-AULA (com turmas) ---
            // ============================================================
            // FUNÇÕES: REGISTROS PÓS-AULA
            // ============================================================
            const abrirModalRegistro = (plano, e) => {
                if(e) e.stopPropagation();
                setPlanoParaRegistro(plano);
                setNovoRegistro({ dataAula: new Date().toISOString().split('T')[0], resumoAula: '', funcionouBem: '', naoFuncionou: '', proximaAula: '', comportamento: '' });
                setRegAnoSel(''); setRegEscolaSel(''); setRegSegmentoSel(''); setRegTurmaSel('');
                setFiltroRegAno(''); setFiltroRegEscola(''); setFiltroRegSegmento(''); setFiltroRegTurma('');
                setRegistroEditando(null);
                setVerRegistros(false);
                setModalRegistro(true);
            };

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

            const excluirAtividade = (id) => {
                setModalConfirm({ titulo: 'Excluir atividade?', conteudo: 'Esta ação não pode ser desfeita.', labelConfirm: 'Excluir', perigo: true, onConfirm: () => {
                    setAtividades(atividades.filter(a => a.id !== id));
                } });
            };

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
            function RichTextEditor({ value, onChange, placeholder, rows = 3, className = '' }) {
                const editorRef = useRef(null);
                // Guarda quais botões estão ativos — estado LOCAL, não dispara re-render do pai
                const [bold, setBold] = useState(false);
                const [italic, setItalic] = useState(false);
                const [underline, setUnderline] = useState(false);

                // Inicializa HTML apenas UMA vez na montagem — sanitizado contra XSS
                useEffect(() => {
                    if (editorRef.current) {
                        editorRef.current.innerHTML = sanitizar(value || '');
                    }
                }, []); // eslint-disable-line

                const updateButtons = () => {
                    setBold(document.queryCommandState('bold'));
                    setItalic(document.queryCommandState('italic'));
                    setUnderline(document.queryCommandState('underline'));
                };

                // Propaga para o pai apenas no blur (quando o usuário sai do campo)
                // Isso evita re-renders a cada tecla
                const handleBlur = () => {
                    if (editorRef.current) onChange(editorRef.current.innerHTML);
                };

                const execCmd = (cmd) => {
                    editorRef.current.focus();
                    document.execCommand(cmd, false, null);
                    updateButtons();
                    // Propaga imediatamente ao usar toolbar (não é digitação)
                    onChange(editorRef.current.innerHTML);
                };

                const minH = `${rows * 1.8}rem`;
                const btn = (active) =>
                    `px-2.5 py-1 rounded text-sm border select-none cursor-pointer transition-colors ${
                        active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                    }`;

                return (
                    <div className={`border-2 border-gray-200 rounded-xl overflow-hidden ${className}`}
                         style={{ outline: 'none' }}>
                        {/* Toolbar */}
                        <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
                            <button type="button" onMouseDown={e=>{e.preventDefault(); execCmd('bold');}}
                                className={btn(bold) + ' font-bold'} title="Negrito">B</button>
                            <button type="button" onMouseDown={e=>{e.preventDefault(); execCmd('italic');}}
                                className={btn(italic) + ' italic'} title="Itálico">I</button>
                            <button type="button" onMouseDown={e=>{e.preventDefault(); execCmd('underline');}}
                                className={btn(underline) + ' underline'} title="Sublinhado">U</button>
                            <div className="w-px h-5 bg-gray-300 mx-1" />
                            <button type="button" onMouseDown={e=>{e.preventDefault(); execCmd('insertUnorderedList');}}
                                className={btn(false)} title="Lista com marcadores">≡ •</button>
                            <button type="button" onMouseDown={e=>{e.preventDefault(); execCmd('insertOrderedList');}}
                                className={btn(false)} title="Lista numerada">1. 2.</button>
                        </div>
                        {/* Área editável — sem onInput, sem onChange a cada tecla */}
                        <div
                            ref={editorRef}
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={handleBlur}
                            onKeyUp={updateButtons}
                            onMouseUp={updateButtons}
                            data-placeholder={placeholder}
                            className="px-4 py-3 outline-none text-gray-800 text-sm leading-relaxed rich-editor-area"
                            style={{ minHeight: minH }}
                        />
                    </div>
                );
            }

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

            // ============================================================
            // FUNÇÕES: RENDERIZAÇÃO: CALENDÁRIO
            // ============================================================
            const renderCalendario = () => {
                const ano = dataCalendario.getFullYear(); const mes = dataCalendario.getMonth();
                const diasNoMes = new Date(ano, mes+1, 0).getDate(); const inicio = new Date(ano, mes, 1).getDay();
                const nomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
                const dias = [];
                for(let i=0;i<inicio;i++) dias.push(<div key={`e-${i}`} className="bg-gray-100 min-h-[80px]"></div>);
                for(let d=1;d<=diasNoMes;d++){
                    const dataStr = `${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    const aulas = planos.filter(p=>p.historicoDatas?.includes(dataStr));
                    const feriado = !ocultarFeriados ? verificarFeriado(dataStr) : null;
                    const evento = verificarEvento(dataStr);
                    
                    let bgColor = 'bg-white';
                    let borderColor = aulas.length ? 'border-indigo-300' : 'border-gray-200';
                    
                    if (feriado) {
                        bgColor = 'bg-red-50';
                        borderColor = 'border-red-300';
                    } else if (evento) {
                        bgColor = 'bg-orange-50';
                        borderColor = 'border-orange-300';
                    }
                    
                    // Verificar registros pós-aula neste dia
                    const registrosNoDia = planos.reduce((acc,p)=>{
                        (p.registrosPosAula||[]).forEach(r=>{ if(r.data===dataStr) acc.push({...r, planoTitulo:p.titulo}); });
                        return acc;
                    },[]);
                    const temRegistro = registrosNoDia.length > 0;

                    dias.push(
                        <div key={d} className={`${bgColor} border ${borderColor} p-1 min-h-[80px] transition group relative`}>
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-gray-500">{d}</span>
                                {/* Botão registro rápido — aparece no hover */}
                                <button
                                    onClick={()=>{
                                        setRrData(dataStr);
                                        const turmasDoDia = obterTurmasDoDia(dataStr);
                                        if (turmasDoDia.length > 0) {
                                            const primeira = turmasDoDia[0];
                                            setRrAnoSel(primeira.anoLetivoId);
                                            setRrEscolaSel(primeira.escolaId);
                                        } else {
                                            const anoAtivo = anosLetivos.find(a=>a.status==='ativo');
                                            setRrAnoSel(anoAtivo?.id||'');
                                            setRrEscolaSel('');
                                        }
                                        setRrTextos({}); setRrPlanosSegmento({});
                                        setModalRegistroRapido(true);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 bg-amber-400 hover:bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded transition"
                                    title="Registro rápido">📝+</button>
                            </div>
                            {feriado && <div className="text-[10px] bg-red-200 text-red-800 p-1 mb-1 rounded font-bold">🎊 {feriado}</div>}
                            {evento && <div className="text-[10px] bg-orange-200 text-orange-800 p-1 mb-1 rounded font-bold cursor-pointer" onClick={()=>setEventoEditando(evento)}>🎉 {evento.nome}</div>}
                            {aulas.map(p=><div key={p.id} onClick={()=>setPlanoSelecionado(p)} className="text-[10px] bg-indigo-100 text-indigo-800 p-1 mb-1 rounded cursor-pointer truncate">{p.titulo}</div>)}
                            {/* Indicador de registros feitos */}
                            {temRegistro && <div className="text-[10px] bg-emerald-100 text-emerald-800 p-1 rounded font-bold">✅ {registrosNoDia.length} reg.</div>}
                        </div>
                    );
                }
                return (
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">📅 {nomes[mes]} {ano}</h2>
                            <div className="flex gap-2">
                                <button onClick={()=>setDataCalendario(new Date(ano,mes-1,1))} className="px-3 py-1 bg-gray-200 rounded">◀</button>
                                <button onClick={()=>setDataCalendario(new Date())} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded">Hoje</button>
                                <button onClick={()=>setDataCalendario(new Date(ano,mes+1,1))} className="px-3 py-1 bg-gray-200 rounded">▶</button>
                                <button onClick={()=>setModalEventos(true)} className="px-4 py-1 bg-pink-500 hover:bg-pink-600 text-white rounded font-bold text-sm">🎉 Eventos</button>
                                <label className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded cursor-pointer flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={ocultarFeriados} onChange={e=>setOcultarFeriados(e.target.checked)} className="w-4 h-4" />
                                    <span>Ocultar Feriados</span>
                                </label>
                            </div>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center font-bold text-gray-500 text-xs mb-2"><div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div></div>
                        <div className="grid grid-cols-7 gap-1 bg-gray-200 border border-gray-200 rounded overflow-hidden">{dias}</div>
                    </div>
                );
            };

            // --- RESUMO DO DIA ---
            const renderResumoDia = () => {
                const diasSemana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
                const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

                // Todos os registros de todos os planos
                const todosRegistros = [];
                planos.forEach(plano => {
                    (plano.registrosPosAula || []).forEach(reg => {
                        todosRegistros.push({ ...reg, planoTitulo: plano.titulo, planoId: plano.id });
                    });
                });

                const hoje = new Date(); hoje.setHours(0,0,0,0);
                const toStr = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                const hojeStr = toStr(hoje);

                // Helpers de semana
                const diasDaSemana = Array.from({length: 7}, (_, i) => {
                    const d = new Date(semanaResumo); d.setDate(semanaResumo.getDate() + i); return d;
                });
                const semanaAtual = (() => {
                    const h = new Date(); const dia = h.getDay();
                    const diff = dia === 0 ? -6 : 1 - dia;
                    const seg = new Date(h); seg.setDate(h.getDate() + diff); seg.setHours(0,0,0,0);
                    return seg.getTime() === semanaResumo.getTime();
                })();
                const irParaHoje = () => {
                    const h = new Date(); const dia = h.getDay();
                    const diff = dia === 0 ? -6 : 1 - dia;
                    const seg = new Date(h); seg.setDate(h.getDate() + diff); seg.setHours(0,0,0,0);
                    setSemanaResumo(seg);
                    setDataDia(hojeStr);
                    setDiasExpandidos({ [hojeStr]: true });
                };
                const semanaAnterior = () => { const s = new Date(semanaResumo); s.setDate(s.getDate()-7); setSemanaResumo(s); setDiasExpandidos({}); };
                const proximaSemana = () => { const s = new Date(semanaResumo); s.setDate(s.getDate()+7); setSemanaResumo(s); setDiasExpandidos({}); };

                const inicioSem = diasDaSemana[0]; const fimSem = diasDaSemana[6];
                const labelSemana = `${inicioSem.getDate()} ${meses[inicioSem.getMonth()]} – ${fimSem.getDate()} ${meses[fimSem.getMonth()]} ${fimSem.getFullYear()}`;
                const totalSemana = diasDaSemana.reduce((acc, d) => acc + todosRegistros.filter(r => r.data === toStr(d)).length, 0);

                const toggleDia = (dataStr) => setDiasExpandidos(prev => ({ ...prev, [dataStr]: !prev[dataStr] }));

                // Renderiza o conteúdo de registros de um dia (compartilhado entre modo dia e semana)
                const renderRegistrosDia = (dataStr) => {
                    const regsNoDia = todosRegistros.filter(r => r.data === dataStr);
                    if (regsNoDia.length === 0) return <p className="px-4 py-3 text-xs text-gray-400 italic">Nenhum registro para este dia.</p>;
                    return (
                        <div className="divide-y divide-gray-100">
                            {regsNoDia.map(reg => {
                                // Buscar label na nova estrutura (compatibilidade com registros antigos)
                                let labelTurma = '';
                                let ano = anosLetivos.find(a => a.id == reg.anoLetivo);
                                let esc = ano?.escolas.find(e => e.id == reg.escola);
                                let seg = esc?.segmentos.find(s => s.id == (reg.segmento || reg.serie));
                                let tur = seg?.turmas.find(t => t.id == reg.turma);
                                
                                // Compatibilidade: registros antigos sem anoLetivo
                                if (!ano && reg.escola) {
                                    for (const a of anosLetivos) {
                                        const e = a.escolas.find(e => e.id == reg.escola);
                                        if (e) {
                                            const s = e.segmentos.find(s => s.id == (reg.segmento || reg.serie));
                                            if (s) {
                                                const t = s.turmas.find(t => t.id == reg.turma);
                                                labelTurma = [a.ano, e.nome, s.nome, t?.nome].filter(Boolean).join(' › ');
                                                break;
                                            }
                                        }
                                    }
                                } else {
                                    labelTurma = [ano?.ano, esc?.nome, seg?.nome, tur?.nome].filter(Boolean).join(' › ');
                                }
                                
                                return (
                                    <div key={reg.id} className="px-4 py-3">
                                        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                                            {labelTurma
                                                ? <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full shrink-0">{labelTurma}</span>
                                                : <span className="text-xs text-gray-400 italic shrink-0">Turma não identificada</span>
                                            }
                                            {reg.hora && <span className="text-xs text-gray-400">{reg.hora}</span>}
                                            {reg.dataRegistro && reg.dataRegistro !== reg.data && <span className="text-xs text-gray-300 italic">reg. depois</span>}
                                        </div>
                                        {reg.resumoAula
                                            ? <p className="text-sm font-medium text-gray-800 leading-snug">{reg.resumoAula}</p>
                                            : <p className="text-xs text-gray-400 italic">Sem resumo registrado</p>
                                        }
                                        {(reg.funcionouBem || reg.naoFuncionou || reg.proximaAula || reg.comportamento) && (
                                            <details className="mt-2">
                                                <summary className="text-xs text-indigo-500 cursor-pointer select-none hover:text-indigo-700">ver detalhes ▾</summary>
                                                <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-indigo-100">
                                                    {reg.funcionouBem && <p className="text-xs text-gray-600"><span className="font-bold text-green-700">✅ </span>{reg.funcionouBem}</p>}
                                                    {reg.naoFuncionou && <p className="text-xs text-gray-600"><span className="font-bold text-red-600">❌ </span>{reg.naoFuncionou}</p>}
                                                    {reg.proximaAula && <p className="text-xs text-gray-600"><span className="font-bold text-blue-600">💡 </span>{reg.proximaAula}</p>}
                                                    {reg.comportamento && <p className="text-xs text-gray-600"><span className="font-bold text-purple-600">👥 </span>{reg.comportamento}</p>}
                                                </div>
                                            </details>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1.5">📄 {reg.planoTitulo}</p>
                                    </div>
                                );
                            })}
                        </div>
                    );
                };

                return (
                    <div className="max-w-2xl mx-auto space-y-3">

                        {/* ── BARRA DE VOLTA ── */}
                        <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-indigo-50/90 backdrop-blur-sm flex items-center justify-between gap-3 border-b border-indigo-100">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={()=>setViewMode('lista')}
                                    className="flex items-center gap-1.5 text-indigo-700 font-bold text-sm active:opacity-60">
                                    ← Voltar
                                </button>
                                <span className="text-indigo-300">|</span>
                                <span className="text-indigo-800 font-bold text-sm">☀️ Resumo do Dia</span>
                            </div>
                            <button
                                onClick={()=>{
                                    const hoje = new Date().toISOString().split('T')[0];
                                    setRrData(hoje);
                                    
                                    // Buscar turmas do dia na grade semanal
                                    const turmasDoDia = obterTurmasDoDia(hoje);
                                    
                                    if (turmasDoDia.length > 0) {
                                        // Pegar primeira turma para pré-selecionar ano e escola
                                        const primeira = turmasDoDia[0];
                                        setRrAnoSel(primeira.anoLetivoId);
                                        setRrEscolaSel(primeira.escolaId);
                                        
                                        // Pré-preencher planos por segmento (sugestão automática)
                                        const planosPorSeg = {};
                                        turmasDoDia.forEach(aula => {
                                            if (!planosPorSeg[aula.segmentoId]) {
                                                const sugerido = sugerirPlanoParaTurma(aula.anoLetivoId, aula.escolaId, aula.segmentoId, aula.turmaId);
                                                if (sugerido) planosPorSeg[aula.segmentoId] = sugerido;
                                            }
                                        });
                                        setRrPlanosSegmento(planosPorSeg);
                                    } else {
                                        // Sem grade: pré-selecionar apenas ano ativo se houver
                                        const anoAtivo = anosLetivos.find(a => a.status === 'ativo');
                                        if (anoAtivo) {
                                            setRrAnoSel(anoAtivo.id);
                                        } else {
                                            setRrAnoSel('');
                                        }
                                        setRrEscolaSel('');
                                        setRrPlanosSegmento({});
                                    }
                                    
                                    setRrTextos({});
                                    setModalRegistroRapido(true);
                                }}
                                className="bg-green-500 hover:bg-green-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm">
                                + Registro Rápido
                            </button>
                        </div>

                        {/* ── BARRA DE CONTROLES ── */}
                        <div className="bg-white rounded-2xl shadow-lg p-3 space-y-3">

                            {/* Linha 1: Hoje | seletor de data | toggle modo */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={()=>{ irParaHoje(); setModoResumo('dia'); setDataDia(hojeStr); }}
                                    className="shrink-0 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-white font-bold text-sm px-4 py-2 rounded-xl">
                                    Hoje
                                </button>
                                <input
                                    type="date"
                                    value={dataDia}
                                    onChange={e => { setDataDia(e.target.value); setModoResumo('dia'); }}
                                    className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 bg-white outline-none focus:border-indigo-400"
                                />
                                <div className="flex shrink-0 bg-gray-100 rounded-xl p-1 gap-1">
                                    <button
                                        onClick={()=>setModoResumo('dia')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${modoResumo==='dia' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                        Dia
                                    </button>
                                    <button
                                        onClick={()=>setModoResumo('semana')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${modoResumo==='semana' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                        Semana
                                    </button>
                                </div>
                            </div>

                            {/* Linha 2 (só no modo semana): navegação ◀ semana ▶ */}
                            {modoResumo === 'semana' && (
                                <div className="flex items-center gap-2">
                                    <button onClick={semanaAnterior} className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-600">◀</button>
                                    <div className="flex-1 text-center">
                                        <p className="font-bold text-gray-800 text-sm">{labelSemana}</p>
                                        <p className="text-xs text-gray-400">{totalSemana === 0 ? 'Nenhum registro' : `${totalSemana} registro${totalSemana>1?'s':''}`}</p>
                                    </div>
                                    <button onClick={proximaSemana} className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-600">▶</button>
                                </div>
                            )}
                            {modoResumo === 'semana' && !semanaAtual && (
                                <button onClick={irParaHoje} className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl">↩ Semana atual</button>
                            )}
                        </div>

                        {/* ── MODO DIA ── */}
                        {modoResumo === 'dia' && (() => {
                            const dia = new Date(dataDia + 'T12:00:00');
                            const regsNoDia = todosRegistros.filter(r => r.data === dataDia);
                            const nomeDia = diasSemana[dia.getDay()];
                            const ehHoje = dataDia === hojeStr;
                            const labelDia = `${nomeDia}, ${String(dia.getDate()).padStart(2,'0')}/${String(dia.getMonth()+1).padStart(2,'0')}/${dia.getFullYear()}`;
                            return (
                                <div className={`bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 ${ehHoje ? 'border-amber-400' : regsNoDia.length > 0 ? 'border-indigo-400' : 'border-gray-200'}`}>
                                    <div className={`px-4 py-3 flex justify-between items-center ${ehHoje ? 'bg-amber-50' : regsNoDia.length > 0 ? 'bg-indigo-50' : 'bg-gray-50'}`}>
                                        <div className="flex items-center gap-2">
                                            {ehHoje && <span className="bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">Hoje</span>}
                                            <span className={`font-bold text-sm ${ehHoje ? 'text-amber-700' : 'text-gray-700'}`}>{labelDia}</span>
                                        </div>
                                        {regsNoDia.length > 0
                                            ? <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{regsNoDia.length} turma{regsNoDia.length>1?'s':''}</span>
                                            : <span className="text-xs text-gray-400">sem registros</span>
                                        }
                                    </div>
                                    
                                    {/* Widget: Turmas do Dia (da Grade Semanal) */}
                                    {(() => {
                                        const turmasDoDia = obterTurmasDoDia(dataDia);
                                        
                                        if (turmasDoDia.length === 0) {
                                            return (
                                                <div className="px-4 py-3 bg-purple-50 border-t border-purple-100">
                                                    <p className="text-xs text-purple-600 text-center">
                                                        📅 Nenhuma turma cadastrada na Grade Semanal para este dia. 
                                                        <button onClick={()=>setModalGradeSemanal(true)} className="underline ml-1 font-bold hover:text-purple-800">
                                                            Cadastrar grade
                                                        </button>
                                                    </p>
                                                </div>
                                            );
                                        }
                                        
                                        // Agrupar por escola
                                        const porEscola = {};
                                        turmasDoDia.forEach(aula => {
                                            const ano = anosLetivos.find(a=>a.id==aula.anoLetivoId);
                                            const esc = ano?.escolas.find(e=>e.id==aula.escolaId);
                                            const escolaNome = esc?.nome || 'Escola não encontrada';
                                            if (!porEscola[escolaNome]) porEscola[escolaNome] = [];
                                            porEscola[escolaNome].push(aula);
                                        });
                                        
                                        return (
                                            <div className="px-4 py-3 bg-purple-50 border-t border-purple-100 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-bold text-purple-800 uppercase">📅 Minhas Turmas de Hoje</p>
                                                    <button onClick={()=>setModalGradeSemanal(true)} className="text-xs text-purple-600 hover:text-purple-800 underline font-bold">
                                                        Ver grade
                                                    </button>
                                                </div>
                                                
                                                {Object.keys(porEscola).sort().map(escolaNome => {
                                                    const aulas = porEscola[escolaNome].sort((a,b) => a.horario.localeCompare(b.horario));
                                                    return (
                                                        <div key={escolaNome} className="bg-white rounded-lg border border-purple-200 p-2">
                                                            <p className="text-xs font-bold text-purple-900 mb-2">🏫 {escolaNome}</p>
                                                            <div className="space-y-1">
                                                                {aulas.map(aula => {
                                                                    const ano = anosLetivos.find(a=>a.id==aula.anoLetivoId);
                                                                    const esc = ano?.escolas.find(e=>e.id==aula.escolaId);
                                                                    const seg = esc?.segmentos.find(s=>s.id==aula.segmentoId);
                                                                    const tur = seg?.turmas.find(t=>t.id==aula.turmaId);
                                                                    
                                                                    return (
                                                                        <div key={aula.id} className="flex items-center gap-2 text-xs">
                                                                            <span className="font-mono font-bold text-purple-700 shrink-0">{aula.horario}</span>
                                                                            <span className="text-gray-400">•</span>
                                                                            <span className="text-purple-800 font-medium">{seg?.nome || '?'}</span>
                                                                            <span className="text-gray-400">›</span>
                                                                            <span className="text-gray-700">{tur?.nome || '?'}</span>
                                                                            {aula.observacao && (
                                                                                <span className="text-gray-400 italic text-xs">({aula.observacao})</span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                    
                                    {renderRegistrosDia(dataDia)}
                                </div>
                            );
                        })()}

                        {/* ── MODO SEMANA — visão consolidada com status ── */}
                        {modoResumo === 'semana' && (() => {
                            // Mostrar TODOS os dias úteis (Seg–Sex) da semana
                            const diasUteis = diasDaSemana.filter(d => d.getDay() >= 1 && d.getDay() <= 6);

                            return (
                                <div className="space-y-2">
                                    {diasUteis.map(dia => {
                                        const dataStr = toStr(dia);
                                        const regsNoDia = todosRegistros.filter(r => r.data === dataStr);
                                        const turmasDoDia = obterTurmasDoDia(dataStr);
                                        const ehHoje = dia.getTime() === hoje.getTime();
                                        const ehFuturo = dia > hoje;
                                        const expandido = !!diasExpandidos[dataStr];
                                        const nomeDia = diasSemana[dia.getDay()];
                                        const labelDia = `${nomeDia} · ${String(dia.getDate()).padStart(2,'0')}/${String(dia.getMonth()+1).padStart(2,'0')}`;

                                        // Calcular status de cada turma da grade
                                        const turmasComStatus = turmasDoDia.map(aula => {
                                            const ano = anosLetivos.find(a=>a.id==aula.anoLetivoId);
                                            const esc = ano?.escolas.find(e=>e.id==aula.escolaId);
                                            const seg = esc?.segmentos.find(s=>s.id==aula.segmentoId);
                                            const tur = seg?.turmas.find(t=>t.id==aula.turmaId);
                                            const temRegistroNoDia = regsNoDia.some(r =>
                                                r.anoLetivo==aula.anoLetivoId && r.escola==aula.escolaId &&
                                                (r.segmento||r.serie)==aula.segmentoId && r.turma==aula.turmaId
                                            );
                                            const planoSugerido = sugerirPlanoParaTurma(aula.anoLetivoId, aula.escolaId, aula.segmentoId, aula.turmaId);
                                            return { aula, seg, tur, esc, temRegistroNoDia, temPlano: !!planoSugerido };
                                        });

                                        const totalDadas    = turmasComStatus.filter(t=>t.temRegistroNoDia).length;
                                        const totalPlanej   = turmasComStatus.filter(t=>!t.temRegistroNoDia && t.temPlano).length;
                                        const totalSemPlano = turmasComStatus.filter(t=>!t.temRegistroNoDia && !t.temPlano).length;

                                        // Cor da borda: verde se tudo dado, amarelo se parcial, cinza se sem nada
                                        const borderCol = ehHoje ? 'border-amber-400' :
                                            totalDadas > 0 && totalDadas === turmasComStatus.length ? 'border-emerald-400' :
                                            totalDadas > 0 ? 'border-blue-400' :
                                            turmasComStatus.length > 0 ? 'border-gray-300' : 'border-gray-200';

                                        const bgHeader = ehHoje ? 'bg-amber-50' :
                                            totalDadas > 0 && totalDadas === turmasComStatus.length ? 'bg-emerald-50' :
                                            totalDadas > 0 ? 'bg-blue-50' : 'bg-gray-50';

                                        return (
                                            <div key={dataStr} className={`bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 ${borderCol}`}>
                                                {/* Cabeçalho */}
                                                <button onClick={()=>toggleDia(dataStr)}
                                                    className={`w-full px-4 py-3 flex justify-between items-center text-left ${bgHeader}`}>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {ehHoje && <span className="bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">Hoje</span>}
                                                        {ehFuturo && <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">Futuro</span>}
                                                        <span className={`font-bold text-sm ${ehHoje ? 'text-amber-700' : 'text-gray-700'}`}>{labelDia}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        {/* Pílulas de status */}
                                                        {totalDadas > 0 && <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✅ {totalDadas}</span>}
                                                        {totalPlanej > 0 && <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">📋 {totalPlanej}</span>}
                                                        {totalSemPlano > 0 && <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">⬜ {totalSemPlano}</span>}
                                                        {turmasComStatus.length === 0 && regsNoDia.length === 0 && <span className="text-xs text-gray-400">sem aulas</span>}
                                                        <span className={`text-gray-400 text-xs ml-1 ${expandido?'rotate-180':''}`} style={{display:'inline-block',transition:'transform .2s'}}>▼</span>
                                                    </div>
                                                </button>

                                                {/* Conteúdo expandido */}
                                                {expandido && (
                                                    <div>
                                                        {/* Grade do dia — turmas com status */}
                                                        {turmasComStatus.length > 0 && (
                                                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 space-y-1.5">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <p className="text-xs font-bold text-slate-500 uppercase">Turmas do dia</p>
                                                                    <button onClick={()=>{
                                                                        setRrData(dataStr);
                                                                        const primeira = turmasDoDia[0];
                                                                        setRrAnoSel(primeira?.anoLetivoId||'');
                                                                        setRrEscolaSel(primeira?.escolaId||'');
                                                                        setRrTextos({}); setRrPlanosSegmento({});
                                                                        setModalRegistroRapido(true);
                                                                    }} className="text-xs bg-amber-400 hover:bg-amber-500 text-white font-bold px-2.5 py-1 rounded-lg">
                                                                        📝 Registrar
                                                                    </button>
                                                                </div>
                                                                {turmasComStatus.map(({aula, seg, tur, esc, temRegistroNoDia, temPlano}, idx) => (
                                                                    <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                                                                        temRegistroNoDia ? 'bg-emerald-50 border border-emerald-200' :
                                                                        temPlano ? 'bg-blue-50 border border-blue-200' :
                                                                        'bg-white border border-gray-200'}`}>
                                                                        <span className="shrink-0 text-base">
                                                                            {temRegistroNoDia ? '✅' : temPlano ? '📋' : '⬜'}
                                                                        </span>
                                                                        <span className="font-mono font-bold text-slate-600 shrink-0">{aula.horario}</span>
                                                                        <span className="text-slate-500 shrink-0">{esc?.nome}</span>
                                                                        <span className="text-slate-400">›</span>
                                                                        <span className="font-medium text-slate-700">{seg?.nome}</span>
                                                                        <span className="text-slate-400">›</span>
                                                                        <span className="text-slate-600">{tur?.nome}</span>
                                                                        <span className="ml-auto text-slate-400 italic text-[10px]">
                                                                            {temRegistroNoDia ? 'Registrada' : temPlano ? 'Planejada' : 'Sem plano'}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {/* Registros feitos */}
                                                        {renderRegistrosDia(dataStr)}
                                                        {/* Dia sem nada */}
                                                        {turmasComStatus.length === 0 && regsNoDia.length === 0 && (
                                                            <p className="px-4 py-4 text-xs text-gray-400 text-center italic">Nenhuma turma nem registro para este dia.</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Legenda */}
                                    <div className="flex gap-3 px-2 pt-1 flex-wrap">
                                        <span className="text-xs text-gray-400 flex items-center gap-1">✅ <span>Aula registrada</span></span>
                                        <span className="text-xs text-gray-400 flex items-center gap-1">📋 <span>Planejada (sem registro)</span></span>
                                        <span className="text-xs text-gray-400 flex items-center gap-1">⬜ <span>Sem plano vinculado</span></span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                );
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
            const ModuloAnoLetivo = () => {
                            const anoAtivo = planejamentoAnual.find(a => a.id === anoPlanoAtivoId) || planejamentoAnual[0] || null;

                            const fmtData = (s) => {
                                if (!s) return '';
                                const partes = s.split('-');
                                if (partes.length < 2) return s;
                                const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
                                const m = parseInt(partes[1]) - 1;
                                return partes[2] ? `${partes[2]}/${meses[m]}` : `${meses[m]}/${partes[0]}`;
                            };

                            // ── Formulário de criar/editar ano (reutilizado) ──
                            const FormNovoAno = () => (
                                <div className="bg-white rounded-2xl shadow-sm border border-indigo-200 p-5 mb-5">
                                    <div className="h-1 bg-gradient-to-r from-indigo-400 to-blue-400 rounded-full mb-4"/>
                                    <h3 className="font-bold text-slate-700 mb-4">{planejamentoAnual.length === 0 ? '🗓️ Criar meu primeiro ano letivo' : '🗓️ Novo Ano Letivo'}</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nome *</label>
                                            <input type="text" placeholder="Ex: 2026, 2026-A..."
                                                value={formNovoAno.nome}
                                                onChange={e=>setFormNovoAno({...formNovoAno, nome:e.target.value})}
                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none"/>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Início</label>
                                            <input type="date" value={formNovoAno.dataInicio}
                                                onChange={e=>setFormNovoAno({...formNovoAno, dataInicio:e.target.value})}
                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none"/>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Fim</label>
                                            <input type="date" value={formNovoAno.dataFim}
                                                onChange={e=>setFormNovoAno({...formNovoAno, dataFim:e.target.value})}
                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none"/>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        {planejamentoAnual.length > 0 && (
                                            <button onClick={()=>setMostrandoFormNovoAno(false)}
                                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold transition">
                                                Cancelar
                                            </button>
                                        )}
                                        <button onClick={criarAnoLetivoPainel}
                                            className="px-6 py-2 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl text-sm font-bold transition shadow-sm">
                                            ✓ Criar Ano Letivo
                                        </button>
                                    </div>
                                </div>
                            );

                            // ── Estado vazio: nenhum ano criado ──
                            if (!anoAtivo && !mostrandoFormNovoAno) {
                                return (
                                    <div className="text-center py-16">
                                        <div className="text-6xl mb-4">🗓️</div>
                                        <h2 className="text-2xl font-bold text-slate-700 mb-2">Meu Ano Letivo</h2>
                                        <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">Organize seu ano com visão macro — temas, focos e metas pedagógicas por período.</p>
                                        <button onClick={()=>setMostrandoFormNovoAno(true)}
                                            className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-7 py-3 rounded-xl font-bold transition shadow-sm">
                                            + Criar meu primeiro ano letivo
                                        </button>
                                    </div>
                                );
                            }

                            if (!anoAtivo && mostrandoFormNovoAno) {
                                return <FormNovoAno/>;
                            }

                            const metasGerais = (anoAtivo.metas||[]).filter(m=>m.tipo==='geral');
                            const metasMusicais = (anoAtivo.metas||[]).filter(m=>m.tipo==='musical');
                            const metasMetodologicas = (anoAtivo.metas||[]).filter(m=>m.tipo==='metodologica');

                            return (
                                <>
                                    {/* Formulário novo ano (quando aberto) */}
                                    {mostrandoFormNovoAno && <FormNovoAno/>}

                                    {/* ── HEADER ── */}
                                    {!mostrandoFormNovoAno && (
                                        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
                                            <div>
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <h2 className="text-2xl font-bold text-slate-800">🗓️ {anoAtivo.nome}</h2>
                                                    {planejamentoAnual.length > 1 && (
                                                        <select value={anoPlanoAtivoId||''}
                                                            onChange={e=>setAnoPlanoAtivoId(e.target.value)}
                                                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-600">
                                                            {planejamentoAnual.map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}
                                                        </select>
                                                    )}
                                                </div>
                                                <p className="text-slate-400 text-sm mt-1">
                                                    {(anoAtivo.dataInicio && anoAtivo.dataFim) ? `${fmtData(anoAtivo.dataInicio)} → ${fmtData(anoAtivo.dataFim)} · ` : ''}
                                                    {(anoAtivo.periodos||[]).length} período{(anoAtivo.periodos||[]).length!==1?'s':''} · {(anoAtivo.metas||[]).length} meta{(anoAtivo.metas||[]).length!==1?'s':''}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={()=>excluirAnoPlano(anoAtivo.id)}
                                                    className="text-slate-300 hover:text-red-400 p-2 rounded-lg transition" title="Excluir ano">🗑️</button>
                                                <button onClick={()=>{ setMostrandoFormNovoAno(true); setFormNovoAno({ nome: String(new Date().getFullYear()), dataInicio: '', dataFim: '' }); }}
                                                    className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-4 py-2 rounded-xl font-bold text-sm transition">
                                                    + Novo Ano
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── SEÇÃO 1: PERÍODOS ── */}
                                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="font-bold text-slate-700 text-lg">📆 Organização por Períodos</h3>
                                                <p className="text-xs text-slate-400 mt-0.5">Bimestres, trimestres ou módulos personalizados</p>
                                            </div>
                                            <button onClick={()=>{ setAdicionandoPeriodoAno(true); setPeriodoExpId(null); setFormNovoPeriodo({ nome:'', dataInicio:'', dataFim:'', tema:'', foco:'' }); }}
                                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl font-semibold text-sm transition flex items-center gap-1.5">
                                                + Período
                                            </button>
                                        </div>

                                        {/* Grid de períodos */}
                                        {((anoAtivo.periodos||[]).length > 0 || adicionandoPeriodoAno) ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                {(anoAtivo.periodos||[]).map(p => {
                                                    const editando = periodoExpId === p.id;
                                                    return (
                                                        <div key={p.id} className={`rounded-2xl border flex flex-col overflow-hidden transition-all group ${editando ? 'border-indigo-300 shadow-md' : 'border-slate-200 hover:border-indigo-200 hover:shadow-sm'}`}>
                                                            <div className="h-1.5 bg-gradient-to-r from-indigo-400 to-blue-400"/>
                                                            {editando ? (
                                                                /* Modo Edição */
                                                                <div className="p-4 space-y-3">
                                                                    <input type="text" placeholder="Nome do período *"
                                                                        value={periodoEditForm?.nome||''}
                                                                        onChange={e=>setPeriodoEditForm({...periodoEditForm, nome:e.target.value})}
                                                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none font-semibold"/>
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <div>
                                                                            <label className="text-xs text-slate-400 block mb-1">Início</label>
                                                                            <input type="date" value={periodoEditForm?.dataInicio||''}
                                                                                onChange={e=>setPeriodoEditForm({...periodoEditForm, dataInicio:e.target.value})}
                                                                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none"/>
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-xs text-slate-400 block mb-1">Fim</label>
                                                                            <input type="date" value={periodoEditForm?.dataFim||''}
                                                                                onChange={e=>setPeriodoEditForm({...periodoEditForm, dataFim:e.target.value})}
                                                                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none"/>
                                                                        </div>
                                                                    </div>
                                                                    <input type="text" placeholder="Tema principal..."
                                                                        value={periodoEditForm?.tema||''}
                                                                        onChange={e=>setPeriodoEditForm({...periodoEditForm, tema:e.target.value})}
                                                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none"/>
                                                                    <input type="text" placeholder="Foco musical..."
                                                                        value={periodoEditForm?.foco||''}
                                                                        onChange={e=>setPeriodoEditForm({...periodoEditForm, foco:e.target.value})}
                                                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none"/>
                                                                    <textarea placeholder="📝 Reflexão do período (opcional)..."
                                                                        value={periodoEditForm?.reflexao||''}
                                                                        onChange={e=>setPeriodoEditForm({...periodoEditForm, reflexao:e.target.value})}
                                                                        rows={2}
                                                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none resize-none"/>
                                                                    <div className="flex gap-2">
                                                                        <button onClick={()=>{ setPeriodoExpId(null); setPeriodoEditForm(null); }}
                                                                            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition">
                                                                            Cancelar
                                                                        </button>
                                                                        <button onClick={()=>salvarEdicaoPeriodo(anoAtivo.id, p.id)}
                                                                            className="flex-1 py-2 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold transition">
                                                                            Salvar
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                /* Modo Display */
                                                                <div className="p-4 flex flex-col flex-1">
                                                                    <div className="flex items-start justify-between gap-1 mb-1">
                                                                        <h4 className="font-bold text-slate-800 text-sm leading-tight">{p.nome}</h4>
                                                                        <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button onClick={()=>{ setPeriodoExpId(p.id); setPeriodoEditForm({nome:p.nome, dataInicio:p.dataInicio||'', dataFim:p.dataFim||'', tema:p.tema||'', foco:p.foco||'', reflexao:p.reflexao||''}); }}
                                                                                className="text-slate-400 hover:text-indigo-600 p-1 rounded transition" title="Editar">✏️</button>
                                                                            <button onClick={()=>excluirPeriodoDoAno(anoAtivo.id, p.id)}
                                                                                className="text-slate-400 hover:text-red-500 p-1 rounded transition" title="Excluir">🗑️</button>
                                                                        </div>
                                                                    </div>
                                                                    {(p.dataInicio || p.dataFim) && (
                                                                        <p className="text-xs text-slate-400 mb-2">
                                                                            {p.dataInicio ? fmtData(p.dataInicio) : '?'} → {p.dataFim ? fmtData(p.dataFim) : '?'}
                                                                        </p>
                                                                    )}
                                                                    {p.tema && (
                                                                        <div className="mb-1.5">
                                                                            <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Tema </span>
                                                                            <span className="text-xs text-slate-700">{p.tema}</span>
                                                                        </div>
                                                                    )}
                                                                    {p.foco && (
                                                                        <div className="mb-2">
                                                                            <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Foco </span>
                                                                            <span className="text-xs text-slate-700">{p.foco}</span>
                                                                        </div>
                                                                    )}
                                                                    {!p.tema && !p.foco && (
                                                                        <p className="text-xs text-slate-300 italic mb-2">Clique em ✏️ para definir tema e foco</p>
                                                                    )}
                                                                    {p.reflexao && (
                                                                        <div className="mt-auto pt-2 border-t border-slate-100">
                                                                            <p className="text-xs text-slate-400 line-clamp-2">📝 {p.reflexao}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {/* Card: Adicionar novo período */}
                                                {adicionandoPeriodoAno && (
                                                    <div className="rounded-2xl border border-indigo-300 shadow-md flex flex-col overflow-hidden">
                                                        <div className="h-1.5 bg-gradient-to-r from-indigo-300 to-blue-300"/>
                                                        <div className="p-4 space-y-3">
                                                            <input type="text" placeholder="Nome do período *" autoFocus
                                                                value={formNovoPeriodo.nome}
                                                                onChange={e=>setFormNovoPeriodo({...formNovoPeriodo, nome:e.target.value})}
                                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none font-semibold"/>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <label className="text-xs text-slate-400 block mb-1">Início</label>
                                                                    <input type="date" value={formNovoPeriodo.dataInicio}
                                                                        onChange={e=>setFormNovoPeriodo({...formNovoPeriodo, dataInicio:e.target.value})}
                                                                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none"/>
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-slate-400 block mb-1">Fim</label>
                                                                    <input type="date" value={formNovoPeriodo.dataFim}
                                                                        onChange={e=>setFormNovoPeriodo({...formNovoPeriodo, dataFim:e.target.value})}
                                                                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none"/>
                                                                </div>
                                                            </div>
                                                            <input type="text" placeholder="Tema principal..."
                                                                value={formNovoPeriodo.tema}
                                                                onChange={e=>setFormNovoPeriodo({...formNovoPeriodo, tema:e.target.value})}
                                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none"/>
                                                            <input type="text" placeholder="Foco musical..."
                                                                value={formNovoPeriodo.foco}
                                                                onChange={e=>setFormNovoPeriodo({...formNovoPeriodo, foco:e.target.value})}
                                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none"/>
                                                            <div className="flex gap-2">
                                                                <button onClick={()=>{ setAdicionandoPeriodoAno(false); setFormNovoPeriodo({ nome:'', dataInicio:'', dataFim:'', tema:'', foco:'' }); }}
                                                                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition">
                                                                    Cancelar
                                                                </button>
                                                                <button onClick={()=>adicionarPeriodoNoAno(anoAtivo.id)}
                                                                    className="flex-1 py-2 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold transition">
                                                                    + Adicionar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* Estado vazio de períodos */
                                            <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl">
                                                <div className="text-3xl mb-2">📆</div>
                                                <p className="text-slate-400 text-sm mb-3">Nenhum período definido ainda</p>
                                                <button onClick={()=>{ setAdicionandoPeriodoAno(true); setFormNovoPeriodo({ nome:'', dataInicio:'', dataFim:'', tema:'', foco:'' }); }}
                                                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-5 py-2 rounded-xl text-sm font-semibold transition">
                                                    + Adicionar primeiro período
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* ── SEÇÃO 2: METAS ── */}
                                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                                        <h3 className="font-bold text-slate-700 text-lg mb-1">🎯 Metas do Ano</h3>
                                        <p className="text-xs text-slate-400 mb-5">Intenções pedagógicas que guiam o ano letivo</p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {[
                                                { tipo:'geral', label:'Metas Gerais', icon:'🌟', cor:'blue', metas: metasGerais },
                                                { tipo:'musical', label:'Metas Musicais', icon:'🎵', cor:'indigo', metas: metasMusicais },
                                                { tipo:'metodologica', label:'Metas Metodológicas', icon:'🧠', cor:'violet', metas: metasMetodologicas },
                                            ].map(({ tipo, label, icon, cor, metas: listaMetas }) => (
                                                <div key={tipo} className="flex flex-col">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="text-base">{icon}</span>
                                                        <h4 className="font-semibold text-slate-700 text-sm">{label}</h4>
                                                        {listaMetas.length > 0 && (
                                                            <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full ml-auto">{listaMetas.length}</span>
                                                        )}
                                                    </div>
                                                    <ul className="space-y-2 mb-3 flex-1">
                                                        {listaMetas.length === 0 && (
                                                            <li className="text-xs text-slate-300 italic">Nenhuma meta ainda</li>
                                                        )}
                                                        {listaMetas.map(m => (
                                                            <li key={m.id} className="flex items-start gap-2 group">
                                                                <span className={`text-${cor}-400 mt-0.5 shrink-0`}>•</span>
                                                                <span className="text-sm text-slate-700 flex-1 leading-snug">{m.descricao}</span>
                                                                <button onClick={()=>excluirMetaDoAno(anoAtivo.id, m.id)}
                                                                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition shrink-0 text-xs leading-none pt-0.5">✕</button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    {/* Input para nova meta (uncontrolled) */}
                                                    <div className="flex gap-2 mt-auto">
                                                        <input type="text" placeholder="+ Adicionar meta..."
                                                            onKeyDown={e=>{ if(e.key==='Enter' && e.target.value.trim()){ adicionarMetaNoAno(anoAtivo.id, e.target.value, tipo); e.target.value=''; }}}
                                                            className={`flex-1 px-3 py-2 border border-dashed border-slate-200 hover:border-${cor}-300 focus:border-${cor}-400 rounded-xl text-xs outline-none transition bg-slate-50`}/>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            );
            };

            // ══ COMPONENTE INTERNO: Módulo Histórico Musical ══
            const ModuloHistoricoMusical = () => {
                            // ── Estados locais via useState (fora do IIFE via refs de closure) ──
                            // Usamos estados já existentes no componente pai para filtros
                            // Precisamos de estados próprios: declarados no início do componente (veja abaixo no JSX)
                            
                            // ── COLETA DE DADOS ──
                            // Percorre todos os planos e coleta usos de músicas por data + turma
                            // Um "uso" = música vinculada em atividade do plano + uma historicaData desse plano

                            // ── POPULAR TURMAS DIRETO DA ESTRUTURA anosLetivos ──
                            // Inclui escolas sem turmas cadastradas (exibidas com aviso)
                            const todasTurmasHistorico = [];
                            anosLetivos.forEach(ano => {
                                (ano.escolas || []).forEach(esc => {
                                    const totalTurmas = (esc.segmentos || []).reduce((acc, s) => acc + (s.turmas || []).length, 0);
                                    if (totalTurmas === 0) {
                                        // Escola sem turmas: adicionar entrada própria
                                        const id = 'escola-' + String(esc.id);
                                        if (!todasTurmasHistorico.find(t => t.id === id)) {
                                            todasTurmasHistorico.push({ id, label: ano.ano + ' › ' + esc.nome + ' (sem turmas)', escolaId: esc.id, escolaNome: esc.nome, segmentoNome: '', semTurmas: true, anoLetivoId: ano.id });
                                        }
                                    } else {
                                        (esc.segmentos || []).forEach(seg => {
                                            (seg.turmas || []).forEach(tur => {
                                                const id = String(tur.id) + '-' + String(esc.id);
                                                if (!todasTurmasHistorico.find(t => t.id === id)) {
                                                    const label = [ano.ano, esc.nome, seg.nome, tur.nome].filter(Boolean).join(' › ');
                                                    todasTurmasHistorico.push({ id, label, turmaId: tur.id, escolaId: esc.id, escolaNome: esc.nome, segmentoId: seg.id, segmentoNome: seg.nome, anoLetivoId: ano.id });
                                                }
                                            });
                                        });
                                    }
                                });
                            });

                            const hmTurmaFiltro = hmFiltroTurma;
                            const hmInicio = hmFiltroInicio;
                            const hmFim = hmFiltroFim;
                            const hmBusca = hmFiltroBusca;

                            // ── HELPER: resolve turmaChave → info da turma ──
                            const infoTurmaFiltrada = hmTurmaFiltro
                                ? todasTurmasHistorico.find(t => t.id === hmTurmaFiltro)
                                : null;

                            // ── HELPER: verifica se um plano pertence à turma filtrada ──
                            // Estratégia 1: tem registro pós-aula com turmaId+escolaId (mais confiável)
                            // Estratégia 2: escola do plano bate com escola da turma (quando escola preenchida)
                            //   + segmento da turma bate com faixaEtaria do plano
                            // Estratégia 3: escola vazia mas faixaEtaria bate → inclui (plano genérico)
                            const chaveDoRegistro = (r) => String(r.turma) + '-' + String(r.escola);
                            const normalizar = (s) => (s || '').trim().toLowerCase();

                            const planoBelongsTurma = (p) => {
                                if (!hmTurmaFiltro || !infoTurmaFiltrada) return true;

                                // Estratégia 1: via registros pós-aula
                                if ((p.registrosPosAula || []).some(r => chaveDoRegistro(r) === hmTurmaFiltro)) return true;

                                const tEsc = normalizar(infoTurmaFiltrada.escolaNome);
                                const tSeg = normalizar(infoTurmaFiltrada.segmentoNome);
                                const pEsc = normalizar(p.escola);
                                const faixas = (p.faixaEtaria || []).map(f => normalizar(f));

                                // Escola sem turmas: filtra só pela escola
                                if (infoTurmaFiltrada.semTurmas) {
                                    return pEsc && (pEsc === tEsc || pEsc.includes(tEsc) || tEsc.includes(pEsc));
                                }

                                // Checar se segmento da turma bate com alguma faixaEtaria do plano
                                const segmentoOk = !tSeg || faixas.length === 0 ||
                                    faixas.some(f => f === tSeg || f.includes(tSeg) || tSeg.includes(f));

                                // Estratégia 2: escola preenchida e bate + segmento bate
                                if (pEsc) {
                                    const escolaOk = pEsc === tEsc || pEsc.includes(tEsc) || tEsc.includes(pEsc);
                                    if (escolaOk && segmentoOk) return true;
                                }

                                return false;
                            };

                            // ── COMPUTAR MÉTRICAS ──
                            const usosMusica = {};
                            const aulasDaTurma = new Set();

                            planos.forEach(p => {
                                // Verificar se plano pertence à turma filtrada
                                if (!planoBelongsTurma(p)) return;

                                // Registros pós-aula desta turma/período
                                const regsDoPlano = (p.registrosPosAula || []).filter(r => {
                                    if (hmTurmaFiltro && chaveDoRegistro(r) !== hmTurmaFiltro) return false;
                                    if (hmInicio && r.data < hmInicio) return false;
                                    if (hmFim && r.data > hmFim) return false;
                                    return true;
                                });
                                regsDoPlano.forEach(r => { if (r.data) aulasDaTurma.add(r.data); });

                                // historicoDatas filtradas por período
                                const histFiltrado = (p.historicoDatas || []).filter(d => {
                                    if (hmInicio && d < hmInicio) return false;
                                    if (hmFim && d > hmFim) return false;
                                    return true;
                                });
                                histFiltrado.forEach(d => aulasDaTurma.add(d));

                                // ── Coleta músicas do plano via atividadesRoteiro ──
                                const musicasDoPlano = [];
                                (p.atividadesRoteiro || []).forEach(atv => {
                                    (atv.musicasVinculadas || []).forEach(mv => {
                                        if (mv && mv.id && !musicasDoPlano.find(m => String(m.id) === String(mv.id))) {
                                            musicasDoPlano.push(mv);
                                        }
                                    });
                                });

                                if (musicasDoPlano.length === 0) return;

                                // ── Determinar datas de uso ──
                                let datasDeUso = [];
                                if (regsDoPlano.length > 0) {
                                    datasDeUso = [...new Set(regsDoPlano.map(r => r.data).filter(Boolean))];
                                } else if (histFiltrado.length > 0) {
                                    datasDeUso = histFiltrado;
                                } else {
                                    // Plano vinculado mas sem datas: mostrar mesmo assim
                                    datasDeUso = [''];
                                }

                                musicasDoPlano.forEach(mv => {
                                    const chaveMusica = String(mv.id);
                                    if (!usosMusica[chaveMusica]) {
                                        const rep = repertorio.find(r => String(r.id) === chaveMusica);
                                        usosMusica[chaveMusica] = {
                                            id: mv.id,
                                            titulo: mv.titulo || rep?.titulo || '(sem título)',
                                            autor: mv.autor || rep?.autor || '',
                                            datas: new Set(),
                                            aulas: []
                                        };
                                    }
                                    datasDeUso.forEach(d => {
                                        if (d) usosMusica[chaveMusica].datas.add(d);
                                        const jaExiste = usosMusica[chaveMusica].aulas.find(a => a.data === d && a.planoId === p.id);
                                        if (!jaExiste) {
                                            usosMusica[chaveMusica].aulas.push({
                                                data: d,
                                                planoTitulo: p.titulo || 'Sem título',
                                                planoId: p.id
                                            });
                                        }
                                    });
                                });
                            });

                            // Converter para array e calcular stats
                            let musicasArray = Object.values(usosMusica).map(m => {
                                const datasOrdenadas = Array.from(m.datas).filter(Boolean).sort();
                                return {
                                    ...m,
                                    datas: datasOrdenadas,
                                    vezesUsada: datasOrdenadas.length || m.aulas.length, // fallback para planos sem data
                                    primeiraData: datasOrdenadas[0] || '',
                                    ultimaData: datasOrdenadas[datasOrdenadas.length - 1] || ''
                                };
                            });

                            // Filtro de busca
                            if (hmBusca.trim()) {
                                const t = hmBusca.toLowerCase();
                                musicasArray = musicasArray.filter(m => m.titulo.toLowerCase().includes(t) || (m.autor || '').toLowerCase().includes(t));
                            }

                            // Ordenar por vezes usada (desc) por padrão
                            musicasArray.sort((a, b) => b.vezesUsada - a.vezesUsada);

                            // Métricas
                            const totalAulasRealizadas = aulasDaTurma.size;
                            const totalMusicasUnicas = musicasArray.length;
                            const totalUsos = musicasArray.reduce((acc, m) => acc + m.vezesUsada, 0);
                            const mediaPorAula = totalAulasRealizadas > 0 ? (totalUsos / totalAulasRealizadas).toFixed(1) : '—';

                            const fmtData = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—';

                            return (
                                <div className="space-y-5">
                                    {/* Cabeçalho */}
                                    <div>
                                        <h1 className="text-2xl font-bold text-slate-800">📊 Histórico Musical da Turma</h1>
                                        <p className="text-sm text-slate-400 mt-0.5">Repertório trabalhado e frequência de uso</p>
                                    </div>

                                    {/* Filtros */}
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                            {/* Turma */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Turma</label>
                                                <select value={hmFiltroTurma} onChange={e => setHmFiltroTurma(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                                                    <option value="">— Todas as turmas —</option>
                                                    {todasTurmasHistorico.map(t => (
                                                        <option key={t.id} value={t.id}>{t.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {/* Período início */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">De</label>
                                                <input type="date" value={hmFiltroInicio} onChange={e => setHmFiltroInicio(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400"/>
                                            </div>
                                            {/* Período fim */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Até</label>
                                                <input type="date" value={hmFiltroFim} onChange={e => setHmFiltroFim(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400"/>
                                            </div>
                                            {/* Busca por música */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Buscar música</label>
                                                <input type="text" placeholder="🔍 Título ou autor..." value={hmFiltroBusca} onChange={e => setHmFiltroBusca(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400"/>
                                            </div>
                                        </div>
                                        {infoTurmaFiltrada?.semTurmas && (
                                            <div className="mt-3 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800">
                                                <span className="shrink-0">💡</span>
                                                <span>Filtrando só pela escola. Para precisão por turma, <button onClick={()=>setModalConfiguracoes(true)} className="font-bold underline hover:text-blue-900">cadastre as turmas em Configurações</button>.</span>
                                            </div>
                                        )}
                                        {(hmFiltroTurma || hmFiltroInicio || hmFiltroFim || hmFiltroBusca) && (
                                            <div className="mt-3 flex justify-end">
                                                <button onClick={() => { setHmFiltroTurma(''); setHmFiltroInicio(''); setHmFiltroFim(''); setHmFiltroBusca(''); }}
                                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">✕ Limpar filtros</button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Aviso: músicas em planos sem escola */}
                                    {(() => {
                                        const semEscola = musicasArray.filter(m =>
                                            m.aulas.some(a => {
                                                const p = planos.find(pl => pl.id === a.planoId);
                                                return p && (!p.escola || !p.escola.trim());
                                            })
                                        );
                                        if (semEscola.length === 0) return null;
                                        return (
                                            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                                                <span className="text-lg shrink-0">⚠️</span>
                                                <span>
                                                    <strong>{semEscola.length} música(s)</strong> encontrada(s) em planos sem escola atribuída — o dado pode estar incompleto ao filtrar por turma.
                                                </span>
                                            </div>
                                        );
                                    })()}

                                    {/* Cards de métricas */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Aulas Realizadas</p>
                                            <p className="text-3xl font-bold text-indigo-600">{totalAulasRealizadas}</p>
                                            <p className="text-xs text-slate-400 mt-2">no período selecionado</p>
                                        </div>
                                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Músicas Únicas</p>
                                            <p className="text-3xl font-bold text-emerald-600">{totalMusicasUnicas}</p>
                                            <p className="text-xs text-slate-400 mt-2">diferentes trabalhadas</p>
                                        </div>
                                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Total de Usos</p>
                                            <p className="text-3xl font-bold text-amber-600">{totalUsos}</p>
                                            <p className="text-xs text-slate-400 mt-2">contando repetições</p>
                                        </div>
                                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Média por Aula</p>
                                            <p className="text-3xl font-bold text-purple-600">{mediaPorAula}</p>
                                            <p className="text-xs text-slate-400 mt-2">músicas por aula</p>
                                        </div>
                                    </div>

                                    {/* Tabela principal */}
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                            <div>
                                                <h2 className="font-bold text-slate-800">🎵 Músicas Trabalhadas</h2>
                                                <p className="text-xs text-slate-400 mt-0.5">{musicasArray.length} música(s) — ordenado por frequência de uso</p>
                                            </div>
                                            {musicasArray.length > 0 && (
                                                <button onClick={() => {
                                                    const linhas = [['Música','Autor','Vezes usada','Primeira vez','Última vez'].join(',')];
                                                    musicasArray.forEach(m => {
                                                        linhas.push([
                                                            `"${m.titulo}"`,
                                                            `"${m.autor || ''}"`,
                                                            m.vezesUsada,
                                                            m.primeiraData ? new Date(m.primeiraData+'T12:00:00').toLocaleDateString('pt-BR') : '',
                                                            m.ultimaData ? new Date(m.ultimaData+'T12:00:00').toLocaleDateString('pt-BR') : ''
                                                        ].join(','));
                                                    });
                                                    const blob = new Blob(['\ufeff' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a'); a.href = url; a.download = 'historico-musical.csv'; a.click();
                                                    URL.revokeObjectURL(url);
                                                }} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs px-3 py-2 rounded-lg border border-indigo-200 transition">
                                                    ⬇ Exportar CSV
                                                </button>
                                            )}
                                        </div>

                                        {musicasArray.length === 0 ? (
                                            <div className="text-center py-16 px-6">
                                                <p className="text-5xl mb-4">🎼</p>
                                                <p className="font-bold text-slate-600 text-lg mb-2">Nenhuma música encontrada</p>
                                                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                                                    {hmFiltroTurma || hmFiltroInicio || hmFiltroFim
                                                        ? 'Tente ajustar os filtros de turma e período.'
                                                        : 'Vincule músicas às atividades nos seus planos de aula e registre as aulas para que elas apareçam aqui.'}
                                                </p>
                                                {!hmFiltroTurma && !hmFiltroInicio && !hmFiltroFim && (
                                                    <button onClick={() => setViewMode('lista')} className="mt-4 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 font-bold text-sm px-5 py-2.5 rounded-xl transition">
                                                        Ir para Planos de Aula
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-slate-50 border-b border-slate-100">
                                                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Música</th>
                                                            <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Usos</th>
                                                            <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide hidden sm:table-cell">1ª vez</th>
                                                            <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Última vez</th>
                                                            <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Aulas</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {musicasArray.map((m, idx) => (
                                                            <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center gap-2">
                                                                        {idx < 3 && (
                                                                            <span className="text-base shrink-0">{['🥇','🥈','🥉'][idx]}</span>
                                                                        )}
                                                                        <div>
                                                                            <p className="font-semibold text-slate-800">{m.titulo}</p>
                                                                            {m.autor && <p className="text-xs text-slate-400">{m.autor}</p>}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${m.vezesUsada >= 3 ? 'bg-emerald-100 text-emerald-700' : m.vezesUsada === 2 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                                                        {m.vezesUsada}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-center text-xs text-slate-500 hidden sm:table-cell">{fmtData(m.primeiraData)}</td>
                                                                <td className="px-4 py-3 text-center text-xs text-slate-500 hidden sm:table-cell">{fmtData(m.ultimaData)}</td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <button onClick={() => setHmModalMusica(m)}
                                                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline">
                                                                        ver detalhes
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {/* Seções secundárias */}
                                    {musicasArray.length > 0 && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Top 5 mais usadas */}
                                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                                <h3 className="font-bold text-slate-700 mb-3">🏆 Top 5 mais usadas</h3>
                                                <div className="space-y-2">
                                                    {musicasArray.slice(0, 5).map((m, i) => (
                                                        <div key={m.id} className="flex items-center gap-3">
                                                            <span className="text-xs font-bold text-slate-400 w-5 text-right">{i+1}.</span>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold text-slate-700 truncate">{m.titulo}</p>
                                                            </div>
                                                            <div className="shrink-0">
                                                                <div className="flex items-center gap-1">
                                                                    <div className="h-2 bg-indigo-400 rounded-full" style={{ width: `${Math.max(20, (m.vezesUsada / musicasArray[0].vezesUsada) * 80)}px` }}/>
                                                                    <span className="text-xs font-bold text-indigo-600 w-6 text-right">{m.vezesUsada}×</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            {/* Usadas apenas 1 vez */}
                                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                                <h3 className="font-bold text-slate-700 mb-3">🌱 Introduzidas (usadas 1×)</h3>
                                                {musicasArray.filter(m => m.vezesUsada === 1).length === 0 ? (
                                                    <p className="text-sm text-slate-400">Todas as músicas foram usadas mais de uma vez!</p>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        {musicasArray.filter(m => m.vezesUsada === 1).map(m => (
                                                            <span key={m.id} className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer hover:bg-amber-100 transition"
                                                                onClick={() => setHmModalMusica(m)}>
                                                                {m.titulo}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Modal detalhe de música */}
                                    {hmModalMusica && (
                                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setHmModalMusica(null)}>
                                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                                                <div className="bg-blue-950 text-white p-5 rounded-t-2xl flex justify-between items-start">
                                                    <div>
                                                        <h2 className="text-xl font-bold">{hmModalMusica.titulo}</h2>
                                                        {hmModalMusica.autor && <p className="text-blue-300 text-sm mt-0.5">{hmModalMusica.autor}</p>}
                                                        <p className="text-blue-200 text-sm mt-2">Usada <strong>{hmModalMusica.vezesUsada}</strong> vez(es) no período</p>
                                                    </div>
                                                    <button onClick={() => setHmModalMusica(null)} className="text-white/70 hover:text-white text-2xl font-bold ml-4">×</button>
                                                </div>
                                                <div className="p-5 space-y-3">
                                                    <div className="flex gap-4 text-sm">
                                                        <div className="bg-slate-50 rounded-lg px-3 py-2 flex-1 text-center">
                                                            <p className="text-xs text-slate-400 font-semibold uppercase">1ª vez</p>
                                                            <p className="font-bold text-slate-700">{hmModalMusica.primeiraData ? fmtData(hmModalMusica.primeiraData) : '—'}</p>
                                                        </div>
                                                        <div className="bg-slate-50 rounded-lg px-3 py-2 flex-1 text-center">
                                                            <p className="text-xs text-slate-400 font-semibold uppercase">Última vez</p>
                                                            <p className="font-bold text-slate-700">{hmModalMusica.ultimaData ? fmtData(hmModalMusica.ultimaData) : '—'}</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Aulas em que foi usada:</p>
                                                        <div className="space-y-2">
                                                            {[...hmModalMusica.aulas].sort((a,b) => (a.data||'').localeCompare(b.data||'')).map((aula, i) => {
                                                                const planoRef = planos.find(p => p.id === aula.planoId);
                                                                return (
                                                                    <button key={i}
                                                                        onClick={() => { if (planoRef) { setHmModalMusica(null); setPlanoSelecionado(planoRef); } }}
                                                                        className={`w-full flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-left transition ${planoRef ? 'hover:bg-blue-50 hover:border-blue-200 cursor-pointer group' : 'cursor-default'}`}>
                                                                        <span className="text-xs font-bold text-blue-800 shrink-0">
                                                                            {aula.data ? `📅 ${fmtData(aula.data)}` : '📋 sem data registrada'}
                                                                        </span>
                                                                        <span className="text-sm text-slate-600 truncate flex-1">{aula.planoTitulo}</span>
                                                                        {planoRef && <span className="text-xs text-blue-400 group-hover:text-blue-600 shrink-0 font-semibold">→ abrir</span>}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
            };

            // ══ COMPONENTE INTERNO: Módulo Estratégias ══
            const ModuloEstrategias = () => {
                            // Formulário de edição
                            if (estrategiaEditando !== null) {
                                return (
                                    <div className="max-w-2xl mx-auto">
                                        {/* Header do formulário */}
                                        <div className="flex items-center gap-3 mb-6">
                                            <button onClick={()=>setEstrategiaEditando(null)}
                                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-semibold text-sm transition flex items-center gap-1.5">
                                                ← Voltar
                                            </button>
                                            <div>
                                                <h2 className="text-xl font-bold text-slate-800">{estrategiaEditando._criadoEm && estrategias.find(e=>e.id===estrategiaEditando.id) ? '✏️ Editar Estratégia' : '🧩 Nova Estratégia'}</h2>
                                                <p className="text-slate-500 text-xs mt-0.5">Procedimento pedagógico reutilizável</p>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                            {/* Barra topo roxa */}
                                            <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-500"/>
                                            <div className="p-6 space-y-5">

                                                {/* Nome */}
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nome da Estratégia *</label>
                                                    <input type="text" placeholder="Ex: Ostinato rítmico em grupo"
                                                        value={estrategiaEditando.nome}
                                                        onChange={e=>setEstrategiaEditando({...estrategiaEditando, nome:e.target.value})}
                                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-violet-400 outline-none transition"/>
                                                </div>

                                                {/* Categoria + Função lado a lado */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {/* Categoria */}
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Categoria</label>
                                                        <select value={estrategiaEditando.categoria}
                                                            onChange={e=>setEstrategiaEditando({...estrategiaEditando, categoria:e.target.value})}
                                                            className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:border-violet-400 outline-none bg-white">
                                                            <option value="">Selecionar...</option>
                                                            {categoriasEstrategia.map(c=><option key={c}>{c}</option>)}
                                                        </select>
                                                        {/* Adicionar nova categoria */}
                                                        <div className="flex gap-2 mt-2">
                                                            <input type="text" placeholder="+ Nova categoria"
                                                                value={novaCategoriaEstr}
                                                                onChange={e=>setNovaCategoriaEstr(e.target.value)}
                                                                onKeyDown={e=>{ if(e.key==='Enter'&&novaCategoriaEstr.trim()){ setCategoriasEstrategia([...categoriasEstrategia, novaCategoriaEstr.trim()]); setEstrategiaEditando({...estrategiaEditando, categoria:novaCategoriaEstr.trim()}); setNovaCategoriaEstr(''); }}}
                                                                className="flex-1 px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-xs outline-none focus:border-violet-400"/>
                                                            {novaCategoriaEstr.trim() && (
                                                                <button onClick={()=>{ setCategoriasEstrategia([...categoriasEstrategia, novaCategoriaEstr.trim()]); setEstrategiaEditando({...estrategiaEditando, categoria:novaCategoriaEstr.trim()}); setNovaCategoriaEstr(''); }}
                                                                    className="bg-violet-500 text-white px-2 py-1 rounded-lg text-xs font-bold">✓</button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Função na Aula */}
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Função na Aula</label>
                                                        <select value={estrategiaEditando.funcao}
                                                            onChange={e=>setEstrategiaEditando({...estrategiaEditando, funcao:e.target.value})}
                                                            className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:border-violet-400 outline-none bg-white">
                                                            <option value="">Selecionar...</option>
                                                            {funcoesEstrategia.map(f=><option key={f}>{f}</option>)}
                                                        </select>
                                                        {/* Adicionar nova função */}
                                                        <div className="flex gap-2 mt-2">
                                                            <input type="text" placeholder="+ Nova função"
                                                                value={novaFuncaoEstr}
                                                                onChange={e=>setNovaFuncaoEstr(e.target.value)}
                                                                onKeyDown={e=>{ if(e.key==='Enter'&&novaFuncaoEstr.trim()){ setFuncoesEstrategia([...funcoesEstrategia, novaFuncaoEstr.trim()]); setEstrategiaEditando({...estrategiaEditando, funcao:novaFuncaoEstr.trim()}); setNovaFuncaoEstr(''); }}}
                                                                className="flex-1 px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-xs outline-none focus:border-violet-400"/>
                                                            {novaFuncaoEstr.trim() && (
                                                                <button onClick={()=>{ setFuncoesEstrategia([...funcoesEstrategia, novaFuncaoEstr.trim()]); setEstrategiaEditando({...estrategiaEditando, funcao:novaFuncaoEstr.trim()}); setNovaFuncaoEstr(''); }}
                                                                    className="bg-violet-500 text-white px-2 py-1 rounded-lg text-xs font-bold">✓</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Objetivos Pedagógicos */}
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Objetivos Pedagógicos</label>
                                                    <div className="space-y-1.5">
                                                        {objetivosEstrategia.map(obj=>{
                                                            const sel = (estrategiaEditando.objetivos||[]).includes(obj);
                                                            return (
                                                                <label key={obj} className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition ${sel ? 'bg-violet-50 border border-violet-200' : 'hover:bg-slate-50 border border-transparent'}`}>
                                                                    <input type="checkbox" checked={sel}
                                                                        onChange={()=>{
                                                                            const atual = estrategiaEditando.objetivos||[];
                                                                            setEstrategiaEditando({...estrategiaEditando, objetivos: sel ? atual.filter(o=>o!==obj) : [...atual, obj]});
                                                                        }}
                                                                        className="rounded text-violet-600 accent-violet-600"/>
                                                                    <span className="text-sm text-slate-700">{obj}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                    {/* Adicionar novo objetivo */}
                                                    <div className="flex gap-2 mt-2">
                                                        <input type="text" placeholder="+ Novo objetivo pedagógico"
                                                            value={novoObjetivoEstr}
                                                            onChange={e=>setNovoObjetivoEstr(e.target.value)}
                                                            onKeyDown={e=>{ if(e.key==='Enter'&&novoObjetivoEstr.trim()){ const novo=novoObjetivoEstr.trim(); setObjetivosEstrategia([...objetivosEstrategia, novo]); setEstrategiaEditando({...estrategiaEditando, objetivos:[...(estrategiaEditando.objetivos||[]), novo]}); setNovoObjetivoEstr(''); }}}
                                                            className="flex-1 px-3 py-2 border border-dashed border-slate-300 rounded-xl text-sm outline-none focus:border-violet-400"/>
                                                        {novoObjetivoEstr.trim() && (
                                                            <button onClick={()=>{ const novo=novoObjetivoEstr.trim(); setObjetivosEstrategia([...objetivosEstrategia, novo]); setEstrategiaEditando({...estrategiaEditando, objetivos:[...(estrategiaEditando.objetivos||[]), novo]}); setNovoObjetivoEstr(''); }}
                                                                className="bg-violet-500 text-white px-3 py-2 rounded-xl text-sm font-bold">✓</button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Descrição (Rich Text) */}
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Descrição</label>
                                                    <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:border-violet-400 transition">
                                                        <RichTextEditor
                                                            value={estrategiaEditando.descricao||''}
                                                            onChange={v=>setEstrategiaEditando({...estrategiaEditando, descricao:v})}
                                                            placeholder="Descreva o procedimento: como aplicar, variações, dicas..."
                                                            rows={5}/>
                                                    </div>
                                                </div>

                                                {/* Faixa Etária */}
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Faixa Etária <span className="text-slate-400 font-normal normal-case">(opcional)</span></label>
                                                    <input type="text" placeholder="Ex: 6-10 anos, Infantil, EF1..."
                                                        value={estrategiaEditando.faixaEtaria||''}
                                                        onChange={e=>setEstrategiaEditando({...estrategiaEditando, faixaEtaria:e.target.value})}
                                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-violet-400 outline-none transition"/>
                                                </div>

                                                {/* Botões */}
                                                <div className="flex gap-3 pt-2 border-t border-slate-100">
                                                    <button onClick={()=>setEstrategiaEditando(null)}
                                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-sm transition">
                                                        Cancelar
                                                    </button>
                                                    <button onClick={salvarEstrategia}
                                                        className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition">
                                                        💾 Salvar Estratégia
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            // Listagem
                            const estrategiasFiltradas = estrategias.filter(e => {
                                if (!mostrarArquivadasEstrategia && e.ativo === false) return false;
                                const termo = buscaEstrategia.toLowerCase();
                                const matchBusca = !buscaEstrategia ||
                                    e.nome.toLowerCase().includes(termo) ||
                                    (e.descricao||'').toLowerCase().includes(termo) ||
                                    (e.categoria||'').toLowerCase().includes(termo) ||
                                    (e.funcao||'').toLowerCase().includes(termo) ||
                                    (e.objetivos||[]).some(o=>o.toLowerCase().includes(termo));
                                const matchCat = filtroCategoriaEstrategia === 'Todas' || e.categoria === filtroCategoriaEstrategia;
                                const matchFunc = filtroFuncaoEstrategia === 'Todas' || e.funcao === filtroFuncaoEstrategia;
                                const matchObj = filtroObjetivoEstrategia === 'Todos' || (e.objetivos||[]).includes(filtroObjetivoEstrategia);
                                return matchBusca && matchCat && matchFunc && matchObj;
                            });

                            const ativas = estrategiasFiltradas.filter(e => e.ativo !== false);
                            const arquivadas = estrategiasFiltradas.filter(e => e.ativo === false);

                            return (
                                <>
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-5">
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-800">🧩 Estratégias Pedagógicas</h2>
                                            <p className="text-slate-500 text-sm mt-0.5">{estrategias.filter(e=>e.ativo!==false).length} estratégia{estrategias.filter(e=>e.ativo!==false).length !== 1 ? 's' : ''} ativa{estrategias.filter(e=>e.ativo!==false).length !== 1 ? 's' : ''}</p>
                                        </div>
                                        <button onClick={novaEstrategia}
                                            className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition flex items-center gap-2">
                                            + Nova Estratégia
                                        </button>
                                    </div>

                                    {/* Filtros */}
                                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-5">
                                        <div className="flex flex-wrap gap-3 items-end">
                                            <div className="flex-1 min-w-[200px]">
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Buscar</label>
                                                <input type="text" placeholder="Nome, categoria, objetivo..."
                                                    value={buscaEstrategia} onChange={e=>setBuscaEstrategia(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-violet-400 outline-none"/>
                                            </div>
                                            <div className="min-w-[150px]">
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Categoria</label>
                                                <select value={filtroCategoriaEstrategia} onChange={e=>setFiltroCategoriaEstrategia(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-violet-400 outline-none bg-white">
                                                    <option>Todas</option>
                                                    {categoriasEstrategia.map(c=><option key={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div className="min-w-[150px]">
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Função</label>
                                                <select value={filtroFuncaoEstrategia} onChange={e=>setFiltroFuncaoEstrategia(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-violet-400 outline-none bg-white">
                                                    <option>Todas</option>
                                                    {funcoesEstrategia.map(f=><option key={f}>{f}</option>)}
                                                </select>
                                            </div>
                                            <div className="min-w-[200px]">
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Objetivo</label>
                                                <select value={filtroObjetivoEstrategia} onChange={e=>setFiltroObjetivoEstrategia(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-violet-400 outline-none bg-white">
                                                    <option>Todos</option>
                                                    {objetivosEstrategia.map(o=><option key={o}>{o}</option>)}
                                                </select>
                                            </div>
                                            {(buscaEstrategia || filtroCategoriaEstrategia !== 'Todas' || filtroFuncaoEstrategia !== 'Todas' || filtroObjetivoEstrategia !== 'Todos') && (
                                                <button onClick={()=>{ setBuscaEstrategia(''); setFiltroCategoriaEstrategia('Todas'); setFiltroFuncaoEstrategia('Todas'); setFiltroObjetivoEstrategia('Todos'); }}
                                                    className="text-xs text-slate-400 hover:text-slate-600 underline whitespace-nowrap">
                                                    Limpar filtros
                                                </button>
                                            )}
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-slate-100">
                                            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-500 select-none">
                                                <input type="checkbox" checked={mostrarArquivadasEstrategia} onChange={e=>setMostrarArquivadasEstrategia(e.target.checked)} className="accent-violet-500"/>
                                                Mostrar estratégias arquivadas
                                                {estrategias.filter(e=>e.ativo===false).length > 0 && (
                                                    <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">{estrategias.filter(e=>e.ativo===false).length} arquivada{estrategias.filter(e=>e.ativo===false).length!==1?'s':''}</span>
                                                )}
                                            </label>
                                        </div>
                                    </div>

                                    {/* Estado vazio */}
                                    {estrategiasFiltradas.length === 0 && (
                                        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                                            <div className="text-5xl mb-3">🧩</div>
                                            <h3 className="text-lg font-bold text-slate-700 mb-1">
                                                {buscaEstrategia || filtroCategoriaEstrategia !== 'Todas' || filtroFuncaoEstrategia !== 'Todas' || filtroObjetivoEstrategia !== 'Todos'
                                                    ? 'Nenhuma estratégia encontrada'
                                                    : 'Nenhuma estratégia ainda'}
                                            </h3>
                                            <p className="text-slate-400 text-sm mb-5">
                                                {buscaEstrategia || filtroCategoriaEstrategia !== 'Todas' || filtroFuncaoEstrategia !== 'Todas' || filtroObjetivoEstrategia !== 'Todos'
                                                    ? 'Tente ajustar os filtros de busca.'
                                                    : 'Cadastre procedimentos pedagógicos reutilizáveis para suas aulas.'}
                                            </p>
                                            {!(buscaEstrategia || filtroCategoriaEstrategia !== 'Todas' || filtroFuncaoEstrategia !== 'Todas' || filtroObjetivoEstrategia !== 'Todos') && (
                                                <button onClick={novaEstrategia}
                                                    className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-xl font-bold transition">
                                                    + Criar primeira estratégia
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Cards ativos */}
                                    {ativas.length > 0 && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                                            {ativas.map(e => (
                                                <div key={e.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group">
                                                    {/* Barra roxa topo */}
                                                    <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-400 rounded-t-2xl"/>
                                                    <div className="p-4 flex flex-col flex-1">
                                                        {/* Header */}
                                                        <div className="flex items-start justify-between gap-2 mb-2">
                                                            <h3 className="font-bold text-slate-800 leading-tight line-clamp-2 text-sm">{e.nome}</h3>
                                                            <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={()=>setEstrategiaEditando({...e})}
                                                                    className="text-slate-400 hover:text-blue-600 p-1 rounded transition" title="Editar">✏️</button>
                                                                <button onClick={()=>{ setModalConfirm({ titulo:'Arquivar estratégia?', conteudo:'A estratégia será ocultada, mas o histórico será preservado.', labelConfirm:'Arquivar', labelCancelar:'Cancelar', onConfirm:()=>arquivarEstrategia(e.id) }); }}
                                                                    className="text-slate-400 hover:text-amber-500 p-1 rounded transition" title="Arquivar">📦</button>
                                                                <button onClick={()=>excluirEstrategia(e.id)}
                                                                    className="text-slate-400 hover:text-red-500 p-1 rounded transition" title="Excluir">🗑️</button>
                                                            </div>
                                                        </div>

                                                        {/* Badges de dimensões */}
                                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                                            {e.categoria && (
                                                                <span className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-full font-medium">
                                                                    {e.categoria}
                                                                </span>
                                                            )}
                                                            {e.funcao && (
                                                                <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
                                                                    ⏱ {e.funcao}
                                                                </span>
                                                            )}
                                                            {e.faixaEtaria && (
                                                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                                                    👥 {e.faixaEtaria}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Objetivos */}
                                                        {(e.objetivos||[]).length > 0 && (
                                                            <div className="mt-auto">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {(e.objetivos||[]).slice(0,2).map(o=>(
                                                                        <span key={o} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">🎯 {o}</span>
                                                                    ))}
                                                                    {(e.objetivos||[]).length > 2 && (
                                                                        <span className="text-xs text-slate-400">+{(e.objetivos||[]).length - 2}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Descrição resumida (texto puro, sem HTML) */}
                                                        {e.descricao && (
                                                            <p className="text-xs text-slate-400 line-clamp-2 mt-2">
                                                                {e.descricao.replace(/<[^>]+>/g,'').substring(0,120)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Arquivadas */}
                                    {mostrarArquivadasEstrategia && arquivadas.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                                <span>📦 Arquivadas</span>
                                                <span className="bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full text-xs">{arquivadas.length}</span>
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                {arquivadas.map(e => (
                                                    <div key={e.id} className="bg-slate-50 rounded-2xl border border-slate-200 flex flex-col overflow-hidden opacity-70 hover:opacity-90 transition">
                                                        <div className="h-1.5 bg-slate-300 rounded-t-2xl"/>
                                                        <div className="p-4 flex flex-col flex-1">
                                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                                <h3 className="font-semibold text-slate-600 text-sm leading-tight line-clamp-2">{e.nome}</h3>
                                                                <div className="flex gap-0.5 shrink-0">
                                                                    <button onClick={()=>restaurarEstrategia(e.id)}
                                                                        className="text-slate-400 hover:text-emerald-600 p-1 rounded transition text-xs" title="Restaurar">♻️</button>
                                                                    <button onClick={()=>excluirEstrategia(e.id)}
                                                                        className="text-slate-400 hover:text-red-500 p-1 rounded transition" title="Excluir">🗑️</button>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {e.categoria && <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">{e.categoria}</span>}
                                                                {e.funcao && <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">{e.funcao}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            );
            };

            // ══ COMPONENTE INTERNO: Módulo Atividades ══
            const ModuloAtividades = () => {
                            const atividadesFiltradas = atividades.filter(a => {
                                const termoBusca = buscaAtividade.toLowerCase();
                                const matchBusca = !buscaAtividade || 
                                    a.nome.toLowerCase().includes(termoBusca) ||
                                    (a.descricao||'').toLowerCase().includes(termoBusca) ||
                                    (a.duracao||'').toLowerCase().includes(termoBusca) ||
                                    (a.materiais||[]).some(m=>m.toLowerCase().includes(termoBusca)) ||
                                    (a.tags||[]).some(t=>t.toLowerCase().includes(termoBusca)) ||
                                    (a.unidade||'').toLowerCase().includes(termoBusca) ||
                                    (a.observacao||'').toLowerCase().includes(termoBusca);
                                const tagSelecionada = filtroTagAtividade.replace(/^#/, '');
                                const matchTag = filtroTagAtividade === 'Todas' || (a.tags || []).includes(tagSelecionada);
                                const matchFaixa = filtroFaixaAtividade === 'Todas' || (a.faixaEtaria || []).includes(filtroFaixaAtividade);
                                const matchConceito = filtroConceitoAtividade === 'Todos' || (a.conceitos || []).includes(filtroConceitoAtividade);
                                return matchBusca && matchTag && matchFaixa && matchConceito;
                            });

                            // Card padronizado com visual da página inicial
                            const CardAtividade = ({ativ}) => (
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group">
                                    {/* Barra colorida topo */}
                                    <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-400 rounded-t-2xl" />
                                    <div className="p-4 flex flex-col flex-1">
                                        {/* Header */}
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h3 className="font-bold text-gray-800 leading-tight line-clamp-2">{ativ.nome}</h3>
                                            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={()=>setAtividadeEditando(ativ)} className="text-slate-400 hover:text-blue-600 p-1 rounded transition" title="Editar">✏️</button>
                                                <button onClick={()=>excluirAtividade(ativ.id)} className="text-slate-400 hover:text-red-500 p-1 rounded transition" title="Excluir">🗑️</button>
                                            </div>
                                        </div>

                                        {/* Descrição */}
                                        {ativ.descricao && <p className="text-sm text-slate-500 line-clamp-2 mb-3">{ativ.descricao}</p>}

                                        {/* Badges */}
                                        <div className="flex flex-wrap gap-1.5 mb-3 mt-auto">
                                            {ativ.duracao && (
                                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">⏱ {ativ.duracao}</span>
                                            )}
                                            {(ativ.faixaEtaria||[]).slice(0,2).map(f=>(
                                                <span key={f} className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full font-medium">👥 {f}</span>
                                            ))}
                                            {(ativ.conceitos||[]).slice(0,1).map(c=>(
                                                <span key={c} className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">🎵 {c}</span>
                                            ))}
                                            {(ativ.tags||[]).slice(0,2).map(t=>(
                                                <span key={t} className="text-xs bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full">#{t}</span>
                                            ))}
                                        </div>

                                        {/* Botão principal */}
                                        <button onClick={()=>setModalAdicionarAoPlano(ativ)}
                                            className="w-full border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 py-2 rounded-xl font-bold text-sm transition mt-1">
                                            + Adicionar ao Plano
                                        </button>
                                    </div>
                                </div>
                            );

                            if (atividadeEditando) {
                                return (
                                    <div className="max-w-2xl mx-auto">
                                        <div className="flex items-center gap-3 mb-6">
                                            <button onClick={()=>setAtividadeEditando(null)}
                                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-semibold text-sm transition flex items-center gap-1.5">
                                                ← Voltar
                                            </button>
                                            <div>
                                                <h2 className="text-xl font-bold text-slate-800">{atividades.find(a=>a.id===atividadeEditando.id) ? '✏️ Editar Atividade' : '🧩 Nova Atividade'}</h2>
                                                <p className="text-slate-500 text-xs mt-0.5">Atividade pedagógica reutilizável</p>
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                            <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-400"/>
                                            <div className="p-6 space-y-5">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nome *</label>
                                                    <input type="text" placeholder="Ex: Brincadeira cantada em roda"
                                                        value={atividadeEditando.nome}
                                                        onChange={e=>setAtividadeEditando({...atividadeEditando,nome:e.target.value})}
                                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-amber-400 outline-none transition"/>
                                                </div>
                                                <div>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Descrição</label>
                                                        <button type="button" onClick={()=>setAtividadeVinculandoMusica(atividadeEditando.id)}
                                                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1 rounded-lg text-xs font-bold transition">
                                                            🎵 Vincular música
                                                        </button>
                                                    </div>
                                                    <textarea value={atividadeEditando.descricao}
                                                        onChange={e=>setAtividadeEditando({...atividadeEditando,descricao:e.target.value})}
                                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-amber-400 outline-none transition resize-none"
                                                        rows="4" placeholder="Como fazer a atividade..."/>
                                                    {(atividadeEditando.musicasVinculadas||[]).length > 0 && (
                                                        <div className="mt-2 space-y-1">
                                                            {atividadeEditando.musicasVinculadas.map((musica,mi) => (
                                                                <div key={mi} className="flex items-center justify-between bg-indigo-50 px-3 py-2 rounded-xl">
                                                                    <span className="text-indigo-700 text-sm font-semibold">🎵 {musica.titulo}{musica.autor && ` - ${musica.autor}`}</span>
                                                                    <button type="button" onClick={()=>setAtividadeEditando({...atividadeEditando,musicasVinculadas:atividadeEditando.musicasVinculadas.filter((_,idx)=>idx!==mi)})} className="text-slate-400 hover:text-red-500 transition">×</button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Faixa Etária</label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {faixas.slice(1).map(f=>(
                                                                <button key={f} type="button"
                                                                    onClick={()=>{const tem=atividadeEditando.faixaEtaria.includes(f);setAtividadeEditando({...atividadeEditando,faixaEtaria:tem?atividadeEditando.faixaEtaria.filter(x=>x!==f):[...atividadeEditando.faixaEtaria,f]});}}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${atividadeEditando.faixaEtaria.includes(f)?'bg-amber-100 text-amber-700 border border-amber-300':'bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200'}`}>
                                                                    {f}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Duração</label>
                                                        <input type="text" value={atividadeEditando.duracao}
                                                            onChange={e=>setAtividadeEditando({...atividadeEditando,duracao:e.target.value})}
                                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-amber-400 outline-none transition"
                                                            placeholder="Ex: 15 min"/>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Materiais</label>
                                                    <textarea value={(atividadeEditando.materiais||[]).join('\n')}
                                                        onChange={e=>setAtividadeEditando({...atividadeEditando,materiais:e.target.value.split('\n').filter(Boolean)})}
                                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-amber-400 outline-none transition resize-none"
                                                        rows="3" placeholder="Um por linha"/>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">🎵 Conceitos Musicais</label>
                                                    {(atividadeEditando.conceitos||[]).length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-slate-100">
                                                            {(atividadeEditando.conceitos||[]).map((conceito,idx)=>(
                                                                <span key={idx} className="bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                                                                    {conceito}
                                                                    <button type="button" onClick={()=>setAtividadeEditando({...atividadeEditando,conceitos:atividadeEditando.conceitos.filter((_,i)=>i!==idx)})} className="hover:text-red-500 transition ml-1">×</button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        {(conceitos||[]).map(conceito=>(
                                                            <div key={conceito} className="flex items-center gap-1 bg-white border border-purple-200 rounded-full">
                                                                <button type="button"
                                                                    onClick={()=>{if(!(atividadeEditando.conceitos||[]).includes(conceito)){setAtividadeEditando({...atividadeEditando,conceitos:[...(atividadeEditando.conceitos||[]),conceito]});}}}
                                                                    disabled={(atividadeEditando.conceitos||[]).includes(conceito)}
                                                                    className={`px-3 py-1 rounded-l-full text-sm transition ${(atividadeEditando.conceitos||[]).includes(conceito)?'text-purple-300 cursor-not-allowed':'text-purple-600 hover:bg-purple-50'}`}>
                                                                    {conceito}
                                                                </button>
                                                                <button type="button"
                                                                    onClick={()=>setModalConfirm({titulo:'Remover conceito?',conteudo:`Remover "${conceito}" da lista permanentemente?`,labelConfirm:'Remover',perigo:true,onConfirm:()=>{setConceitos(conceitos.filter(c=>c!==conceito));if((atividadeEditando.conceitos||[]).includes(conceito)){setAtividadeEditando({...atividadeEditando,conceitos:atividadeEditando.conceitos.filter(c=>c!==conceito)});}}})}
                                                                    className="text-slate-300 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-r-full transition">✕</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <input type="text"
                                                        onKeyDown={e=>{if((e.key==='Enter'||e.key===' ')&&e.target.value.trim()){e.preventDefault();const nc=e.target.value.trim();if(nc&&!(atividadeEditando.conceitos||[]).includes(nc)){setAtividadeEditando({...atividadeEditando,conceitos:[...(atividadeEditando.conceitos||[]),nc]});if(!conceitos.includes(nc)){setConceitos([...conceitos,nc].sort());}}e.target.value='';}}}
                                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-purple-400 outline-none transition"
                                                        placeholder="Digite e pressione Enter... Ex: Ritmo, Melodia"/>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">🏷️ Tags</label>
                                                    {(atividadeEditando.tags||[]).length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-slate-100">
                                                            {(atividadeEditando.tags||[]).map((tag,idx)=>(
                                                                <span key={idx} className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                                                                    #{tag}
                                                                    <button type="button" onClick={()=>setAtividadeEditando({...atividadeEditando,tags:atividadeEditando.tags.filter((_,i)=>i!==idx)})} className="hover:text-red-500 transition ml-1">×</button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        {(tagsGlobais||[]).map(tag=>(
                                                            <div key={tag} className="flex items-center gap-1 bg-white border border-amber-200 rounded-full">
                                                                <button type="button"
                                                                    onClick={()=>{if(!(atividadeEditando.tags||[]).includes(tag)){setAtividadeEditando({...atividadeEditando,tags:[...(atividadeEditando.tags||[]),tag]});}}}
                                                                    disabled={(atividadeEditando.tags||[]).includes(tag)}
                                                                    className={`px-3 py-1 rounded-l-full text-sm transition ${(atividadeEditando.tags||[]).includes(tag)?'text-amber-300 cursor-not-allowed':'text-amber-600 hover:bg-amber-50'}`}>
                                                                    #{tag}
                                                                </button>
                                                                <button type="button"
                                                                    onClick={()=>setModalConfirm({titulo:'Remover tag?',conteudo:`Remover "${tag}" da lista permanentemente?`,labelConfirm:'Remover',perigo:true,onConfirm:()=>{setTagsGlobais(tagsGlobais.filter(t=>t!==tag));if((atividadeEditando.tags||[]).includes(tag)){setAtividadeEditando({...atividadeEditando,tags:atividadeEditando.tags.filter(t=>t!==tag)});}}})}
                                                                    className="text-slate-300 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-r-full transition">✕</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <input type="text"
                                                        onKeyDown={e=>{if((e.key==='Enter'||e.key===' ')&&e.target.value.trim()){e.preventDefault();const nt=e.target.value.trim().replace(/^#/,'');if(nt&&!(atividadeEditando.tags||[]).includes(nt)){setAtividadeEditando({...atividadeEditando,tags:[...(atividadeEditando.tags||[]),nt]});if(!tagsGlobais.includes(nt)){setTagsGlobais([...tagsGlobais,nt].sort());}}e.target.value='';}}}
                                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-amber-400 outline-none transition"
                                                        placeholder="Digite e pressione Enter... Ex: roda, jogos"/>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Unidade (opcional)</label>
                                                    <select value={atividadeEditando._adicionandoUnidade ? '__NOVA__' : (atividadeEditando.unidade||'')}
                                                        onChange={e=>{if(e.target.value==='__NOVA__'){setAtividadeEditando({...atividadeEditando,_adicionandoUnidade:true});}else{setAtividadeEditando({...atividadeEditando,unidade:e.target.value,_adicionandoUnidade:false});}}}
                                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-amber-400 outline-none transition bg-white">
                                                        <option value="">Selecione ou adicione...</option>
                                                        {unidades.map(u=><option key={u} value={u}>{u}</option>)}
                                                        <option value="__NOVA__">➕ Adicionar nova unidade...</option>
                                                    </select>
                                                    {atividadeEditando._adicionandoUnidade && (
                                                        <div className="flex gap-2 mt-2">
                                                            <input type="text" autoFocus placeholder="Nome da unidade..."
                                                                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-amber-400 outline-none"
                                                                onKeyDown={e=>{if(e.key==='Enter'&&e.target.value.trim()){const u=e.target.value.trim();if(!unidades.includes(u)){setUnidades([...unidades,u].sort());}setAtividadeEditando({...atividadeEditando,unidade:u,_adicionandoUnidade:false});}if(e.key==='Escape'){setAtividadeEditando({...atividadeEditando,_adicionandoUnidade:false});}}}/>
                                                            <button type="button" onClick={()=>setAtividadeEditando({...atividadeEditando,_adicionandoUnidade:false})}
                                                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm transition">Cancelar</button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Observação (opcional)</label>
                                                    <textarea value={atividadeEditando.observacao||''}
                                                        onChange={e=>setAtividadeEditando({...atividadeEditando,observacao:e.target.value})}
                                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-amber-400 outline-none transition resize-none"
                                                        rows="2"/>
                                                </div>
                                                <div className="rounded-xl border border-slate-200 overflow-hidden">
                                                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">🔗 Links e Imagens</span>
                                                    </div>
                                                    <div className="p-4 space-y-3">
                                                        <div className="flex gap-2 flex-col sm:flex-row">
                                                            <input type="text" placeholder="URL..."
                                                                value={novoRecursoUrlAtiv}
                                                                onChange={e=>setNovoRecursoUrlAtiv(e.target.value)}
                                                                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-amber-400 outline-none transition"/>
                                                            <select value={novoRecursoTipoAtiv}
                                                                onChange={e=>setNovoRecursoTipoAtiv(e.target.value)}
                                                                className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white outline-none">
                                                                <option value="link">Link</option>
                                                                <option value="imagem">Imagem</option>
                                                            </select>
                                                            <button type="button" onClick={adicionarRecursoAtiv}
                                                                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition">Add</button>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {(atividadeEditando.recursos||[]).map((rec,idx)=>(
                                                                <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                                        <span>{rec.tipo==='imagem'?'🖼️':'🔗'}</span>
                                                                        <span className="text-sm truncate max-w-xs text-slate-600">{rec.url}</span>
                                                                    </div>
                                                                    <button type="button" onClick={()=>removerRecursoAtiv(idx)} className="text-slate-400 hover:text-red-500 transition px-2">✕</button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 pt-2 border-t border-slate-100">
                                                    <button onClick={()=>setAtividadeEditando(null)}
                                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-sm transition">
                                                        Cancelar
                                                    </button>
                                                    <button onClick={salvarAtividade}
                                                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition">
                                                        Salvar Atividade
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <>
                                    {/* ── HEADER DA PÁGINA ── */}
                                    <div className="flex items-center justify-between mb-5">
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-800">🎯 Banco de Atividades</h2>
                                            <p className="text-slate-500 text-sm mt-0.5">{atividades.length} atividade{atividades.length !== 1 ? 's' : ''} cadastrada{atividades.length !== 1 ? 's' : ''}</p>
                                        </div>
                                        <button onClick={novaAtividade}
                                            className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition flex items-center gap-2">
                                            + Nova Atividade
                                        </button>
                                    </div>

                                    {/* ── FILTROS ── */}
                                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-5">
                                        <div className="flex flex-wrap gap-3 items-end">
                                            <div className="flex-1 min-w-[200px]">
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Buscar</label>
                                                <input type="text" placeholder="Nome, descrição, tag..."
                                                    value={buscaAtividade} onChange={e=>setBuscaAtividade(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" />
                                            </div>
                                            <div className="min-w-[140px]">
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Tag</label>
                                                <select value={filtroTagAtividade} onChange={e=>setFiltroTagAtividade(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white">
                                                    <option>Todas</option>
                                                    {todasAsTags.map(t=><option key={t}>#{t}</option>)}
                                                </select>
                                            </div>
                                            <div className="min-w-[140px]">
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Conceito</label>
                                                <select value={filtroConceitoAtividade} onChange={e=>setFiltroConceitoAtividade(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white">
                                                    <option>Todos</option>
                                                    {conceitos.map(c=><option key={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div className="min-w-[140px]">
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Faixa Etária</label>
                                                <select value={filtroFaixaAtividade} onChange={e=>setFiltroFaixaAtividade(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white">
                                                    {faixas.map(f=><option key={f}>{f}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex items-end gap-2">
                                                <button onClick={()=>{setBuscaAtividade('');setFiltroTagAtividade('Todas');setFiltroFaixaAtividade('Todas');setFiltroConceitoAtividade('Todos');}}
                                                    className="px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition">
                                                    Limpar
                                                </button>
                                                <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
                                                    {[{id:'grade',label:'⊞',title:'Grade'},{id:'lista',label:'☰',title:'Lista'},{id:'segmento',label:'👥',title:'Por Segmento'}].map(m=>(
                                                        <button key={m.id} onClick={()=>setModoVisAtividades(m.id)} title={m.title}
                                                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${modoVisAtividades===m.id?'bg-white text-indigo-600 shadow-sm':'text-slate-400 hover:text-slate-600'}`}>
                                                            {m.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        {atividadesFiltradas.length !== atividades.length && (
                                            <p className="text-xs text-indigo-600 mt-2 font-medium">
                                                Mostrando {atividadesFiltradas.length} de {atividades.length} atividades
                                            </p>
                                        )}
                                    </div>

                                    {/* ── CONTEÚDO ── */}
                                    {atividadesFiltradas.length === 0 ? (
                                        <div className="text-center py-24">
                                            <div className="text-6xl mb-4">🎯</div>
                                            <p className="text-slate-500 text-lg font-medium">Nenhuma atividade encontrada</p>
                                            <p className="text-slate-400 text-sm mt-1">Tente ajustar os filtros ou crie uma nova atividade</p>
                                            <button onClick={novaAtividade} className="mt-4 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-bold transition">
                                                + Nova Atividade
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {modoVisAtividades === 'grade' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                    {atividadesFiltradas.map(ativ => <CardAtividade key={ativ.id} ativ={ativ} />)}
                                                </div>
                                            )}
                                            {modoVisAtividades === 'lista' && (
                                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                                    {atividadesFiltradas.map((ativ, i)=>(
                                                        <div key={ativ.id} className={`flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition group ${i>0?'border-t border-slate-100':''}`}>
                                                            <div className="w-1.5 h-10 rounded-full bg-gradient-to-b from-amber-400 to-orange-400 shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-semibold text-gray-800 truncate">{ativ.nome}</h4>
                                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                    {ativ.duracao && <span className="text-xs text-slate-400">⏱ {ativ.duracao}</span>}
                                                                    {(ativ.faixaEtaria||[]).slice(0,1).map(f=><span key={f} className="text-xs text-indigo-500">👥 {f}</span>)}
                                                                    {(ativ.tags||[]).slice(0,2).map(t=><span key={t} className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100">#{t}</span>)}
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-1.5 shrink-0">
                                                                <button onClick={()=>setModalAdicionarAoPlano(ativ)} className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold transition">+ Plano</button>
                                                                <button onClick={()=>setAtividadeEditando(ativ)} className="bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 px-2 py-1.5 rounded-lg text-xs transition">✏️</button>
                                                                <button onClick={()=>excluirAtividade(ativ.id)} className="bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 px-2 py-1.5 rounded-lg text-xs transition">🗑️</button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {modoVisAtividades === 'segmento' && (() => {
                                                const porFaixa = {};
                                                atividadesFiltradas.forEach(a => {
                                                    (a.faixaEtaria || ['Sem faixa definida']).forEach(f => {
                                                        if (!porFaixa[f]) porFaixa[f] = [];
                                                        porFaixa[f].push(a);
                                                    });
                                                });
                                                return Object.keys(porFaixa).sort().map(faixa=>(
                                                    <div key={faixa} className="mb-8">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <span className="text-lg font-bold text-slate-700">👥 {faixa}</span>
                                                            <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{porFaixa[faixa].length}</span>
                                                            <div className="flex-1 h-px bg-slate-200" />
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                            {porFaixa[faixa].map(ativ=><CardAtividade key={ativ.id} ativ={ativ}/>)}
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                        </>
                                    )}
                                </>
                            );
            };

            // ══ COMPONENTE INTERNO: Módulo Sequências ══
            const ModuloSequencias = () => {
                            const obterInfoSequencia = (seq) => {
                                const ano = anosLetivos.find(a => a.id == seq.anoLetivoId);
                                if (!ano) return null;
                                const escola = ano.escolas.find(e => e.id == seq.escolaId);
                                if (!escola) return null;
                                const nomesSegmentos = (seq.segmentos || []).map(segId => {
                                    const seg = escola.segmentos.find(s => s.id == segId);
                                    return seg ? seg.nome : null;
                                }).filter(Boolean);
                                return { ano: ano.nome, escola: escola.nome, segmentos: nomesSegmentos, turmaEspecifica: seq.turmaEspecifica || null };
                            };

                            // Modo Detalhe - Visualizar slots de uma sequência específica
                            if (sequenciaDetalhe) {
                                const seq = sequenciaDetalhe;
                                const infoSeq = obterInfoSequencia(seq);
                                
                                return (
                                    <>
                                        {/* Cabeçalho com botão Voltar */}
                                        <div className="mb-6 flex items-center gap-4">
                                            <button 
                                                onClick={() => setSequenciaDetalhe(null)}
                                                className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg font-bold"
                                            >
                                                ⬅ Voltar
                                            </button>
                                            <div className="flex-1">
                                                <h2 className="text-2xl font-bold text-gray-800">{seq.titulo}</h2>
                                                {infoSeq && (
                                                    <p className="text-gray-600">
                                                        {infoSeq.escola} • {infoSeq.segmentos.join(', ')}
                                                        {infoSeq.turmaEspecifica && <span className="text-rose-600"> • (Turma {infoSeq.turmaEspecifica})</span>}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={()=>setSequenciaEditando(seq)} className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold">🗑️ Excluir</button>
                                                <button onClick={()=>{
                                                    // Salvar alterações
                                                    setSequencias([...sequencias]);
                                                    setModalConfirm({ conteudo: '✅ Alterações salvas!', somenteOk: true, labelConfirm: 'OK' });
                                                }} className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold">💾 Salvar</button>
                                                <button onClick={()=>exportarSequenciaPDF(seq)} className="bg-purple-500 text-white px-4 py-2 rounded-lg font-bold">📄 PDF</button>
                                                <button onClick={()=>{ setModalConfirm({ titulo: 'Excluir sequência?', conteudo: 'Esta ação não pode ser desfeita.', labelConfirm: 'Excluir', perigo: true, onConfirm: ()=>{ excluirSequencia(seq.id); setSequenciaDetalhe(null); } }); }} className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold">🗑️</button>
                                            </div>
                                        </div>

                                        {/* Lista Vertical de Slots */}
                                        <div className="space-y-4">
                                            {(seq.slots || []).map((slot, index) => {
                                                const planoVinc = slot.planoVinculado ? planos.find(p => p.id == slot.planoVinculado) : null;
                                                const temConteudo = planoVinc || slot.rascunho?.titulo;

                                                return (
                                                    <div key={slot.id} className={`border-2 rounded-xl p-5 ${temConteudo ? 'border-rose-300 bg-white' : 'border-gray-200 bg-gray-50'}`}>
                                                        <div className="flex justify-between items-start mb-3">
                                                            <h3 className="text-lg font-bold text-rose-700">Aula {slot.ordem}</h3>
                                                            <div className="flex gap-2">
                                                                {planoVinc && (
                                                                    <button onClick={() => desvincularPlano(seq.id, index)} className="text-red-500 text-sm hover:text-red-700" title="Desvincular">✕ Desvincular</button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {planoVinc ? (
                                                            /* Plano Vinculado */
                                                            <div>
                                                                {/* Título */}
                                                                <h4 className="font-bold text-xl text-gray-800 mb-3">{planoVinc.titulo}</h4>
                                                                
                                                                {/* Objetivo (fundo igual, no topo) */}
                                                                {planoVinc.objetivoGeral && (
                                                                    <div className="bg-rose-50 rounded-lg p-3 mb-3 border border-rose-200">
                                                                        <p className="text-sm font-bold text-rose-700 mb-1">🎯 Objetivo</p>
                                                                        <p className="text-sm text-gray-700 line-clamp-2">{planoVinc.objetivoGeral}</p>
                                                                    </div>
                                                                )}

                                                                {/* Setlist */}
                                                                {planoVinc.atividadesRoteiro?.length > 0 && (
                                                                    <div className="bg-rose-50 rounded-lg p-3 border border-rose-200">
                                                                        <p className="text-sm font-bold text-rose-700 mb-2">📋 Setlist</p>
                                                                        <ul className="text-sm text-gray-700 space-y-1">
                                                                            {planoVinc.atividadesRoteiro.map(ativ => (
                                                                                <li key={ativ.id} className="flex items-start gap-2">
                                                                                    <span>•</span>
                                                                                    <span>
                                                                                        {ativ.nome || 'Atividade'}
                                                                                        {ativ.duracao && <span className="text-xs text-gray-500"> ({ativ.duracao})</span>}
                                                                                    </span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : slot.rascunho?.titulo ? (
                                                            /* Rascunho Manual */
                                                            <div className="space-y-2">
                                                                <input type="text" value={slot.rascunho.titulo} onChange={(e) => atualizarRascunhoSlot(seq.id, index, 'titulo', e.target.value)} className="w-full px-3 py-2 border-2 rounded-lg font-bold" placeholder="Título..." />
                                                                <textarea value={slot.rascunho.setlist?.join('\n') || ''} onChange={(e) => atualizarRascunhoSlot(seq.id, index, 'setlist', e.target.value.split('\n'))} className="w-full px-3 py-2 border-2 rounded-lg text-sm" rows="4" placeholder="Setlist (uma por linha)..." />
                                                            </div>
                                                        ) : (
                                                            /* Slot Vazio */
                                                            <div className="text-center py-6">
                                                                <p className="text-gray-400 mb-4">Slot vazio</p>
                                                                <div className="flex gap-2 justify-center">
                                                                    <button onClick={() => setModalVincularPlano({sequenciaId: seq.id, slotIndex: index})} className="bg-rose-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-rose-600">🔗 Vincular Plano</button>
                                                                    <button onClick={() => atualizarRascunhoSlot(seq.id, index, 'titulo', 'Nova Aula')} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300">✏️ Rascunho</button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                );
                            }

                            // Modo Dashboard - Galeria de Sequências
                            const escolasComSequencias = [...new Set(sequencias.map(s => {
                                const ano = anosLetivos.find(a => a.id == s.anoLetivoId);
                                const escola = ano?.escolas.find(e => e.id == s.escolaId);
                                return escola?.nome;
                            }).filter(Boolean))];
                            
                            const unidadesComSequencias = [...new Set(sequencias.map(s => s.unidadePredominante).filter(Boolean))];
                            const periodosComSequencias = [...new Set(sequencias.map(s => s.duracao).filter(Boolean))];

                            const sequenciasFiltradas = sequencias.filter(s => {
                                // Filtro Escola
                                if (filtroEscolaSequencias !== 'Todas') {
                                    const ano = anosLetivos.find(a => a.id == s.anoLetivoId);
                                    const escola = ano?.escolas.find(e => e.id == s.escolaId);
                                    if (escola?.nome !== filtroEscolaSequencias) return false;
                                }
                                // Filtro Unidade
                                if (filtroUnidadeSequencias !== 'Todas' && s.unidadePredominante !== filtroUnidadeSequencias) {
                                    return false;
                                }
                                // Filtro Período Letivo (por trimestre - baseado em datas)
                                if (filtroPeriodoSequencias !== 'Todos') {
                                    if (!s.dataInicio) return false; // Sem data, não filtra
                                    
                                    const mes = new Date(s.dataInicio).getMonth() + 1; // 1-12
                                    let trimestreSeq = '';
                                    if (mes >= 1 && mes <= 3) trimestreSeq = '1trim';
                                    else if (mes >= 4 && mes <= 6) trimestreSeq = '2trim';
                                    else if (mes >= 7 && mes <= 9) trimestreSeq = '3trim';
                                    else trimestreSeq = '4trim';
                                    
                                    if (trimestreSeq !== filtroPeriodoSequencias) return false;
                                }
                                // BUSCA PROFUNDA (Título sequência + Aulas + Atividades)
                                if (buscaProfundaSequencias.trim()) {
                                    const termoBusca = buscaProfundaSequencias.toLowerCase();
                                    
                                    // Busca no título da sequência
                                    if (s.titulo.toLowerCase().includes(termoBusca)) return true;
                                    
                                    // Busca dentro das aulas
                                    const encontrouNasAulas = (s.slots || []).some(slot => {
                                        // Slot com plano vinculado
                                        if (slot.planoVinculado) {
                                            const plano = planos.find(p => p.id == slot.planoVinculado);
                                            if (!plano) return false;
                                            
                                            // Busca no título do plano
                                            if (plano.titulo.toLowerCase().includes(termoBusca)) return true;
                                            
                                            // Busca nos nomes das atividades (setlist)
                                            if (plano.atividadesRoteiro) {
                                                return plano.atividadesRoteiro.some(ativ => 
                                                    (ativ.nome || '').toLowerCase().includes(termoBusca)
                                                );
                                            }
                                        }
                                        // Slot com rascunho
                                        if (slot.rascunho?.titulo && slot.rascunho.titulo.toLowerCase().includes(termoBusca)) {
                                            return true;
                                        }
                                        if (slot.rascunho?.setlist && Array.isArray(slot.rascunho.setlist)) {
                                            return slot.rascunho.setlist.some(item => 
                                                item && item.toLowerCase().includes(termoBusca)
                                            );
                                        }
                                        return false;
                                    });
                                    
                                    if (!encontrouNasAulas) return false;
                                }
                                return true;
                            });

                            return (
                                <>
                                    {/* Cabeçalho Dashboard */}
                                    <div className="mb-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h2 className="text-2xl font-bold text-gray-800">📚 Minhas Sequências</h2>
                                            <button onClick={novaSequencia} className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg">➕ Nova Sequência</button>
                                        </div>

                                        {/* Busca Profunda */}
                                        {sequencias.length > 0 && (
                                            <div className="mb-4">
                                                <input 
                                                    type="text"
                                                    value={buscaProfundaSequencias}
                                                    onChange={e=>setBuscaProfundaSequencias(e.target.value)}
                                                    className="w-full px-4 py-3 border-2 rounded-xl"
                                                    placeholder="🔍 Buscar conteúdo nas aulas (título, atividades...)..."
                                                />
                                            </div>
                                        )}

                                        {/* Filtros Avançados (3 Dropdowns) */}
                                        {sequencias.length > 0 && (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-100 p-4 rounded-xl">
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-1">🏫 Escola</label>
                                                    <select value={filtroEscolaSequencias} onChange={e=>setFiltroEscolaSequencias(e.target.value)} className="w-full px-3 py-2 border-2 rounded-lg bg-white">
                                                        <option value="Todas">Todas as escolas</option>
                                                        {escolasComSequencias.map(escola => (
                                                            <option key={escola} value={escola}>{escola}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-1">🎵 Unidade</label>
                                                    <select value={filtroUnidadeSequencias} onChange={e=>setFiltroUnidadeSequencias(e.target.value)} className="w-full px-3 py-2 border-2 rounded-lg bg-white">
                                                        <option value="Todas">Todas as unidades</option>
                                                        {unidadesComSequencias.map(unid => (
                                                            <option key={unid} value={unid}>{unid}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-1">📅 Período Letivo</label>
                                                    <select value={filtroPeriodoSequencias} onChange={e=>setFiltroPeriodoSequencias(e.target.value)} className="w-full px-3 py-2 border-2 rounded-lg bg-white">
                                                        <option value="Todos">Todos os períodos</option>
                                                        <option value="1trim">1° Trimestre</option>
                                                        <option value="2trim">2° Trimestre</option>
                                                        <option value="3trim">3° Trimestre</option>
                                                        <option value="4trim">4° Trimestre</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Grid de Cards */}
                                    {sequenciasFiltradas.length === 0 ? (
                                        <div className="text-center py-20">
                                            <p className="text-gray-400 text-lg mb-4">Nenhuma sequência encontrada com os filtros selecionados</p>
                                            <button onClick={novaSequencia} className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-xl font-bold">➕ Criar Primeira Sequência</button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {sequenciasFiltradas.map(seq => {
                                                const infoSeq = obterInfoSequencia(seq);
                                                const totalSlots = seq.slots?.length || 0;
                                                const slotsPreenchidos = seq.slots?.filter(s => s.planoVinculado || s.rascunho?.titulo).length || 0;
                                                const progresso = totalSlots > 0 ? (slotsPreenchidos / totalSlots) * 100 : 0;

                                                return (
                                                    <div key={seq.id} onClick={() => setSequenciaDetalhe(seq)} className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-rose-500 hover:shadow-2xl transition cursor-pointer">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h3 className="text-xl font-bold text-gray-800">{seq.titulo}</h3>
                                                            {seq.unidadePredominante && (
                                                                <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded text-xs font-bold">{seq.unidadePredominante}</span>
                                                            )}
                                                        </div>
                                                        {infoSeq && (
                                                            <p className="text-sm text-gray-600 mb-2">
                                                                {infoSeq.escola} • {infoSeq.segmentos.join(', ')}
                                                                {infoSeq.turmaEspecifica && <span className="text-rose-600"> • ({infoSeq.turmaEspecifica})</span>}
                                                            </p>
                                                        )}
                                                        {(seq.dataInicio || seq.dataFim) && (
                                                            <p className="text-xs text-gray-500 mb-3">
                                                                📅 {seq.dataInicio && new Date(seq.dataInicio).toLocaleDateString('pt-BR')}
                                                                {seq.dataInicio && seq.dataFim && ' — '}
                                                                {seq.dataFim && new Date(seq.dataFim).toLocaleDateString('pt-BR')}
                                                            </p>
                                                        )}
                                                        
                                                        {/* Barra de Progresso */}
                                                        <div className="mb-3">
                                                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                                                                <span>{slotsPreenchidos} de {totalSlots} aulas</span>
                                                                <span>{Math.round(progresso)}%</span>
                                                            </div>
                                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                                <div className="bg-rose-500 h-2 rounded-full transition-all" style={{width: `${progresso}%`}}></div>
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-2 justify-end">
                                                            <button onClick={(e) => {e.stopPropagation(); setSequenciaEditando(seq);}} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded font-bold hover:bg-blue-200">✏️</button>
                                                            <button onClick={(e) => {e.stopPropagation(); excluirSequencia(seq.id);}} className="text-sm bg-red-100 text-red-600 px-3 py-1 rounded font-bold hover:bg-red-200">🗑️</button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            );
            };

            // ══ COMPONENTE INTERNO: Módulo Repertório ══
            const ModuloRepertorio = () => {
                            // Filtrar músicas
                            const musicasFiltradas = repertorio.filter(m => {
                                const buscaMatch = !buscaRepertorio || 
                                    m.titulo.toLowerCase().includes(buscaRepertorio.toLowerCase()) ||
                                    (m.autor||'').toLowerCase().includes(buscaRepertorio.toLowerCase());
                                const origemMatch = filtroOrigem === 'Todas' || m.origem === filtroOrigem;
                                const estiloMatch = filtroEstilo === 'Todos' || (m.estilos||[]).includes(filtroEstilo);
                                const tonalidadeMatch = filtroTonalidade === 'Todas' || (m.tonalidades||[]).includes(filtroTonalidade);
                                const escalaMatch = filtroEscala === 'Todas' || (m.escalas||[]).includes(filtroEscala);
                                const compassoMatch = filtroCompasso === 'Todos' || (m.compassos||[]).includes(filtroCompasso);
                                const andamentoMatch = filtroAndamento === 'Todos' || (m.andamentos||[]).includes(filtroAndamento);
                                const estruturaMatch = filtroEstrutura === 'Todas' || (m.estruturas||[]).includes(filtroEstrutura);
                                const energiaMatch = filtroEnergia === 'Todas' || (m.energias||[]).includes(filtroEnergia);
                                const instrumentacaoMatch = filtroInstrumentacao === 'Todas' || (m.instrumentacao||[]).includes(filtroInstrumentacao) || m.instrumentoDestaque === filtroInstrumentacao;
                                const dinamicaMatch = filtroDinamica === 'Todas' || (m.dinamicas||[]).includes(filtroDinamica);
                                return buscaMatch && origemMatch && estiloMatch && tonalidadeMatch && escalaMatch && compassoMatch && andamentoMatch && estruturaMatch && energiaMatch && instrumentacaoMatch && dinamicaMatch;
                            });
                            
                            return (
                            <div className="max-w-5xl mx-auto space-y-4">
                                {!musicaEditando ? (
                                    <>
                                        {/* Cabeçalho */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                                <h2 className="text-2xl font-bold text-slate-800">🎼 Repertório Inteligente</h2>
                                                <p className="text-sm text-slate-500 mt-0.5">Gerencie seu catálogo de músicas e obras</p>
                                            </div>
                                            <button
                                                onClick={() => setMusicaEditando({
                                                    id: Date.now(),
                                                    titulo: '',
                                                    autor: '',
                                                    origem: '',
                                                    estilos: [],
                                                    compassos: [],
                                                    tonalidades: [],
                                                    andamentos: [],
                                                    escalas: [],
                                                    estruturas: [],
                                                    dinamicas: [],
                                                    instrumentacao: [],
                                                    instrumentoDestaque: '',
                                                    energias: [],
                                                    observacoes: '',
                                                    links: [],
                                                    pdfs: [],
                                                    audios: [],
                                                    planosVinculados: [],
                                                    atividadesVinculadas: []
                                                })}
                                                className="shrink-0 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition"
                                            >
                                                ➕ Adicionar Música
                                            </button>
                                        </div>

                                        {/* Painel de Filtros */}
                                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Filtros</p>
                                                <button
                                                    onClick={() => {
                                                        setBuscaRepertorio('');
                                                        setFiltroOrigem('Todas');
                                                        setFiltroEstilo('Todos');
                                                        setFiltroTonalidade('Todas');
                                                        setFiltroEscala('Todas');
                                                        setFiltroCompasso('Todos');
                                                        setFiltroAndamento('Todos');
                                                        setFiltroEstrutura('Todas');
                                                        setFiltroEnergia('Todas');
                                                        setFiltroInstrumentacao('Todas');
                                                        setFiltroDinamica('Todas');
                                                    }}
                                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                                                >✕ Limpar filtros</button>
                                            </div>

                                            {/* Linha 1: Busca + Origem + Escala */}
                                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-2">
                                                <input type="text" placeholder="🔍 Buscar por título ou autor..." value={buscaRepertorio} onChange={e=>setBuscaRepertorio(e.target.value)}
                                                    className="sm:col-span-2 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Origem</label>
                                                    <select value={filtroOrigem} onChange={e=>setFiltroOrigem(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                                                        <option>Todas</option>
                                                        <option>Folclórica</option>
                                                        <option>Autoral</option>
                                                        <option>Tradicional</option>
                                                        <option>Popular</option>
                                                        <option>Erudita</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Escala</label>
                                                    <select value={filtroEscala} onChange={e=>setFiltroEscala(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                                                        <option>Todas</option>
                                                        <option>Maior</option>
                                                        <option>Menor</option>
                                                        <option>Pentatônica</option>
                                                        <option>Cromática</option>
                                                        <option>Modal</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Linha 2: Estilo + Tonalidade + Compasso + Andamento + Estrutura */}
                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Estilo</label>
                                                    <select value={filtroEstilo} onChange={e=>setFiltroEstilo(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                                                        <option>Todos</option>
                                                        {ESTILOS_OPCOES.map(e => <option key={e}>{e}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Tonalidade</label>
                                                    <select value={filtroTonalidade} onChange={e=>setFiltroTonalidade(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                                                        <option>Todas</option>
                                                        {TONALIDADES_OPCOES.map(t => <option key={t}>{t}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Compasso</label>
                                                    <select value={filtroCompasso} onChange={e=>setFiltroCompasso(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                                                        <option>Todos</option>
                                                        {COMPASSOS_OPCOES.map(c => <option key={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Andamento</label>
                                                    <select value={filtroAndamento} onChange={e=>setFiltroAndamento(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                                                        <option>Todos</option>
                                                        {ANDAMENTOS_OPCOES.map(a => <option key={a}>{a}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Estrutura</label>
                                                    <select value={filtroEstrutura} onChange={e=>setFiltroEstrutura(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                                                        <option>Todas</option>
                                                        {ESTRUTURAS_OPCOES.map(e => <option key={e}>{e}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Linha 3: Energia + Instrumentação + Dinâmica (NOVOS) */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">⚡ Energia</label>
                                                    <select value={filtroEnergia} onChange={e=>setFiltroEnergia(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                                                        <option>Todas</option>
                                                        {ENERGIAS_OPCOES.map(e => <option key={e}>{e}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">🎻 Instrumentação</label>
                                                    <select value={filtroInstrumentacao} onChange={e=>setFiltroInstrumentacao(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                                                        <option>Todas</option>
                                                        {INSTRUMENTACAO_OPCOES.map(i => <option key={i}>{i}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">🔊 Dinâmica</label>
                                                    <select value={filtroDinamica} onChange={e=>setFiltroDinamica(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                                                        <option>Todas</option>
                                                        {DINAMICAS_OPCOES.map(d => <option key={d}>{d}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Lista de músicas */}
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold text-slate-400 uppercase">{musicasFiltradas.length} música(s) encontrada(s)</p>
                                            {musicasFiltradas.map(m => (
                                                <React.Fragment key={m.id}>
                                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-indigo-300 hover:shadow-md transition flex items-center justify-between">
                                                    <div className="flex items-center gap-4 flex-1 flex-wrap min-w-0">
                                                        <div className="min-w-[180px]">
                                                            <h3 className="font-bold text-slate-800 text-sm">{m.titulo}</h3>
                                                            <p className="text-xs text-slate-500 mt-0.5">{m.autor || '—'}</p>
                                                        </div>
                                                        
                                                        {/* Energias */}
                                                        {(m.energias||[]).length > 0 && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {(m.energias||[]).map(e=>(
                                                                    <span key={e} className="bg-pink-100 text-pink-700 border border-pink-200 text-xs px-2 py-0.5 rounded-full font-medium">⚡{e}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {/* Dinâmicas */}
                                                        {(m.dinamicas||[]).length > 0 && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {(m.dinamicas||[]).map(d=>(
                                                                    <span key={d} className="bg-amber-100 text-amber-700 border border-amber-200 text-xs px-2 py-0.5 rounded-full font-medium">🔊{d}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {/* Instrumentação destaque */}
                                                        {m.instrumentoDestaque && (
                                                            <span className="bg-violet-100 text-violet-700 border border-violet-200 text-xs px-2 py-0.5 rounded-full font-medium">🎻{m.instrumentoDestaque}</span>
                                                        )}
                                                        
                                                        <div className="flex items-center gap-3 text-xs">
                                                            {/* Contador Aulas */}
                                                            <div className="relative group">
                                                                <p className="text-blue-500 cursor-pointer hover:text-blue-700">
                                                                    🔗 {(m.planosVinculados||[]).length} aula(s)
                                                                </p>
                                                                
                                                                {(m.planosVinculados||[]).length > 0 && (
                                                                    <div className="absolute hidden group-hover:block bg-white border-2 border-blue-200 rounded-lg shadow-lg p-3 z-10 min-w-[250px] left-0 top-6">
                                                                        <p className="text-xs font-bold text-gray-700 mb-2">Aulas vinculadas:</p>
                                                                        <div className="space-y-1">
                                                                            {(m.planosVinculados||[]).map(planoId => {
                                                                                const plano = planos.find(p => p.id === planoId);
                                                                                if(!plano) return null;
                                                                                return (
                                                                                    <button 
                                                                                        key={planoId}
                                                                                        onClick={() => {
                                                                                            setPlanoSelecionado(plano);
                                                                                            setMusicaEditando(null);
                                                                                        }}
                                                                                        className="w-full text-left px-2 py-1 rounded hover:bg-blue-50 text-xs text-blue-600 hover:text-blue-800"
                                                                                    >
                                                                                        📋 {plano.titulo || 'Sem título'} - {plano.turma || ''}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            {/* Contador Atividades */}
                                                            <div className="relative group">
                                                                <p className="text-green-500 cursor-pointer hover:text-green-700">
                                                                    🎯 {(m.atividadesVinculadas||[]).length} atividade(s)
                                                                </p>
                                                                
                                                                {(m.atividadesVinculadas||[]).length > 0 && (
                                                                    <div className="absolute hidden group-hover:block bg-white border-2 border-green-200 rounded-lg shadow-lg p-3 z-10 min-w-[250px] left-0 top-6">
                                                                        <p className="text-xs font-bold text-gray-700 mb-2">Atividades vinculadas:</p>
                                                                        <div className="space-y-1">
                                                                            {(m.atividadesVinculadas||[]).map((ativ, idx) => (
                                                                                <div key={idx} className="px-2 py-1 bg-green-50 rounded text-xs text-green-700">
                                                                                    🎁 {ativ.nome}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* #9: Botão play YouTube */}
                                                    {(() => {
                                                        const ytLink = (m.links||[]).find(l => ytIdFromUrl(l));
                                                        const ytId = ytLink ? ytIdFromUrl(ytLink) : null;
                                                        if (!ytId) return null;
                                                        return (
                                                            <button onClick={(e)=>{e.stopPropagation(); setYtPreviewId(ytPreviewId===m.id ? null : m.id);}}
                                                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition mr-1 ${ytPreviewId===m.id ? 'bg-red-600 text-white border-red-600' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}
                                                                title="Prévia YouTube">
                                                                {ytPreviewId===m.id ? '■ Fechar' : '▶ Play'}
                                                            </button>
                                                        );
                                                    })()}
                                                    <button onClick={() => setMusicaEditando(m)} className="text-xs bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-200 transition mr-1">✏️ Editar</button>
                                                    <button onClick={() => { setModalConfirm({ titulo: `Excluir "${m.titulo}"?`, conteudo: 'Esta ação não pode ser desfeita.', labelConfirm: 'Excluir', perigo: true, onConfirm: () => { setRepertorio(repertorio.filter(r => r.id !== m.id)); } }); }} className="text-xs bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-lg hover:bg-red-200 transition">🗑️</button>
                                                </div>
                                                {/* #9: Player embutido */}
                                                {ytPreviewId===m.id && (() => {
                                                    const ytId = (m.links||[]).map(l=>ytIdFromUrl(l)).find(Boolean);
                                                    if (!ytId) return null;
                                                    return (
                                                        <div className="mt-2 rounded-xl overflow-hidden border border-red-200 bg-black">
                                                            <iframe
                                                                width="100%" height="200"
                                                                src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                                                                allow="autoplay; encrypted-media"
                                                                allowFullScreen
                                                                className="block"
                                                            />
                                                        </div>
                                                    );
                                                })()}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="max-w-2xl mx-auto space-y-4">
                                        {/* Cabeçalho do formulário */}
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h2 className="text-2xl font-bold text-slate-800">🎼 {musicaEditando.id === Date.now() ? 'Nova Música' : 'Editar Música'}</h2>
                                                <p className="text-sm text-slate-400 mt-0.5">Preencha os dados da música no repertório</p>
                                            </div>
                                            <button onClick={() => setMusicaEditando(null)} className="text-slate-400 hover:text-slate-600 text-xl font-light transition">✕</button>
                                        </div>

                                        {/* Identificação */}
                                        <div className="bg-slate-50 rounded-xl border border-slate-200 shadow-sm p-5">
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Identificação</p>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-600 mb-1">Título *</label>
                                                    <input type="text" value={musicaEditando.titulo} onChange={e => setMusicaEditando({...musicaEditando, titulo: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400" placeholder="Nome da música" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-600 mb-1">Autor</label>
                                                    <input type="text" value={musicaEditando.autor} onChange={e => setMusicaEditando({...musicaEditando, autor: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400" placeholder="Compositor/Autor" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-600 mb-1">Origem</label>
                                                    <select value={musicaEditando.origem} onChange={e => setMusicaEditando({...musicaEditando, origem: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                                                        <option value="">Selecione...</option>
                                                        <option>Folclórica</option>
                                                        <option>Autoral</option>
                                                        <option>Tradicional</option>
                                                        <option>Popular</option>
                                                        <option>Erudita</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* ── ACCORDION: Elementos Musicais, Recursos, Vínculos ── */}
                                        {(() => {
                                            const Acc = ({ id, titulo, subtitulo, badge }) => {
                                                const aberto = accordionAberto === id;
                                                return (
                                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                                        <button type="button"
                                                            onClick={() => setAccordionAberto(aberto ? null : id)}
                                                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left">
                                                            <div>
                                                                <span className="text-sm font-semibold text-slate-700">{titulo}</span>
                                                                {subtitulo && <span className="text-xs text-slate-400 ml-2">{subtitulo}</span>}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {badge > 0 && <span className="text-xs bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full">{badge}</span>}
                                                                <span className={`text-slate-300 text-xs transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`}>▼</span>
                                                            </div>
                                                        </button>
                                                        {aberto && <div className="bg-slate-50 border-t border-slate-100 px-5 py-5 space-y-5" id={`acc-${id}`}></div>}
                                                    </div>
                                                );
                                            };

                                            const chips = (lista, selecionados, onToggle) => (
                                                <div className="flex flex-wrap gap-2">
                                                    {lista.map(item => {
                                                        const sel = (selecionados||[]).includes(item);
                                                        return <button key={item} type="button" onClick={() => onToggle(item)}
                                                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${sel ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'}`}>{item}</button>;
                                                    })}
                                                </div>
                                            );

                                            const labelRow = (texto, onAdd, onDel) => (
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{texto}</label>
                                                    <div className="flex gap-3">
                                                        {onAdd && <button type="button" onClick={onAdd} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition">+ personalizar</button>}
                                                        {onDel && <button type="button" onClick={onDel} className="text-xs text-slate-400 hover:text-red-500 font-semibold transition">🗑️ excluir</button>}
                                                    </div>
                                                </div>
                                            );

                                            // Badge counts
                                            const badgeForma = [(musicaEditando.estilos||[]).length, (musicaEditando.compassos||[]).length, (musicaEditando.estruturas||[]).length].reduce((a,b)=>a+b,0);
                                            const badgeTom = [(musicaEditando.tonalidades||[]).length, (musicaEditando.andamentos||[]).length, (musicaEditando.escalas||[]).length].reduce((a,b)=>a+b,0);
                                            const badgeExp = [(musicaEditando.dinamicas||[]).length, (musicaEditando.energias||[]).length, (musicaEditando.instrumentacao||[]).length].reduce((a,b)=>a+b,0);
                                            const badgeRec = [(musicaEditando.links||[]).length, (musicaEditando.pdfs||[]).length, (musicaEditando.audios||[]).length].reduce((a,b)=>a+b,0);
                                            const badgeVinc = [(musicaEditando.planosVinculados||[]).length, (musicaEditando.atividadesVinculadas||[]).length].reduce((a,b)=>a+b,0);

                                            return (<>

                                            {/* ACCORDION 1 — Forma e Estrutura */}
                                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                                <button type="button" onClick={() => setAccordionAberto(accordionAberto === 'forma' ? null : 'forma')}
                                                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left">
                                                    <div>
                                                        <span className="text-sm font-semibold text-slate-700">🎵 Forma e Estrutura</span>
                                                        <span className="text-xs text-slate-400 ml-2">Estilo · Compasso · Estrutura</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {badgeForma > 0 && <span className="text-xs bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full">{badgeForma}</span>}
                                                        <span className={`text-slate-300 text-xs transition-transform duration-200 ${accordionAberto === 'forma' ? 'rotate-180' : ''}`}>▼</span>
                                                    </div>
                                                </button>
                                                {accordionAberto === 'forma' && (
                                                    <div className="bg-slate-50 border-t border-slate-100 px-5 py-5 space-y-5">
                                                        {/* Estilo */}
                                                        <div>
                                                            {labelRow('Estilo',
                                                                () => { const novo = prompt('Novo estilo:'); if(novo && !ESTILOS_OPCOES.includes(novo)) setMusicaEditando({...musicaEditando, estilos: [...(musicaEditando.estilos||[]), novo]}); },
                                                                null
                                                            )}
                                                            {/* Selecionados */}
                                                            {(musicaEditando.estilos||[]).length > 0 && (
                                                                <div className="flex flex-wrap gap-1.5 mb-2">
                                                                    {(musicaEditando.estilos||[]).map((est,i) => (
                                                                        <span key={i} className="bg-slate-800 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                                                            {est}
                                                                            <button type="button" onClick={() => setMusicaEditando({...musicaEditando, estilos: musicaEditando.estilos.filter((_,idx)=>idx!==i)})} className="hover:text-red-300 ml-0.5">×</button>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <div className="relative">
                                                                <input type="text" value={buscaEstilo} onChange={e => setBuscaEstilo(e.target.value)}
                                                                    placeholder="Buscar estilos..."
                                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
                                                                {buscaEstilo && (
                                                                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                                        {ESTILOS_OPCOES.filter(e => e.toLowerCase().includes(buscaEstilo.toLowerCase())).map(est => (
                                                                            <button key={est} type="button" onClick={() => { const l=musicaEditando.estilos||[]; if(!l.includes(est)) setMusicaEditando({...musicaEditando, estilos:[...l,est]}); setBuscaEstilo(''); }}
                                                                                className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm text-slate-700">{est}</button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {/* Compasso */}
                                                        <div>
                                                            {labelRow('Compasso',
                                                                () => { const novo = prompt('Novo compasso:'); if(novo && !COMPASSOS_OPCOES.includes(novo) && !compassosCustomizados.includes(novo)) { const novos=[...compassosCustomizados,novo]; setCompassosCustomizados(novos); localStorage.setItem('compassosCustomizados',JSON.stringify(novos)); setMusicaEditando({...musicaEditando, compassos:[...(musicaEditando.compassos||[]),novo]}); }},
                                                                () => setEditandoElemento('compasso')
                                                            )}
                                                            {chips([...COMPASSOS_OPCOES,...compassosCustomizados], musicaEditando.compassos, comp => { const l=musicaEditando.compassos||[]; setMusicaEditando({...musicaEditando, compassos: l.includes(comp)?l.filter(c=>c!==comp):[...l,comp]}); })}
                                                        </div>
                                                        {/* Estrutura */}
                                                        <div>
                                                            {labelRow('Estrutura',
                                                                () => { const novo = prompt('Nova estrutura:'); if(novo && !ESTRUTURAS_OPCOES.includes(novo) && !estruturasCustomizadas.includes(novo)) { const novos=[...estruturasCustomizadas,novo]; setEstruturasCustomizadas(novos); localStorage.setItem('estruturasCustomizadas',JSON.stringify(novos)); setMusicaEditando({...musicaEditando, estruturas:[...(musicaEditando.estruturas||[]),novo]}); }},
                                                                () => setEditandoElemento('estrutura')
                                                            )}
                                                            {chips([...ESTRUTURAS_OPCOES,...estruturasCustomizadas], musicaEditando.estruturas, est => { const l=musicaEditando.estruturas||[]; setMusicaEditando({...musicaEditando, estruturas: l.includes(est)?l.filter(e=>e!==est):[...l,est]}); })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ACCORDION 2 — Tom e Ritmo */}
                                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                                <button type="button" onClick={() => setAccordionAberto(accordionAberto === 'tom' ? null : 'tom')}
                                                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left">
                                                    <div>
                                                        <span className="text-sm font-semibold text-slate-700">🎼 Tom e Ritmo</span>
                                                        <span className="text-xs text-slate-400 ml-2">Tonalidade · Escala · Andamento</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {badgeTom > 0 && <span className="text-xs bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full">{badgeTom}</span>}
                                                        <span className={`text-slate-300 text-xs transition-transform duration-200 ${accordionAberto === 'tom' ? 'rotate-180' : ''}`}>▼</span>
                                                    </div>
                                                </button>
                                                {accordionAberto === 'tom' && (
                                                    <div className="bg-slate-50 border-t border-slate-100 px-5 py-5 space-y-5">
                                                        {/* Tonalidade */}
                                                        <div>
                                                            {labelRow('Tonalidade / Modo',
                                                                () => { const novo = prompt('Nova tonalidade:'); if(novo && !TONALIDADES_OPCOES.includes(novo) && !tonalidadesCustomizadas.includes(novo)) { const novos=[...tonalidadesCustomizadas,novo]; setTonalidadesCustomizadas(novos); localStorage.setItem('tonalidadesCustomizadas',JSON.stringify(novos)); setMusicaEditando({...musicaEditando, tonalidades:[...(musicaEditando.tonalidades||[]),novo]}); }},
                                                                () => setEditandoElemento('tonalidade')
                                                            )}
                                                            {chips([...TONALIDADES_OPCOES,...tonalidadesCustomizadas], musicaEditando.tonalidades, ton => { const l=musicaEditando.tonalidades||[]; setMusicaEditando({...musicaEditando, tonalidades: l.includes(ton)?l.filter(t=>t!==ton):[...l,ton]}); })}
                                                        </div>
                                                        {/* Escala */}
                                                        <div>
                                                            {labelRow('Escala',
                                                                () => { const novo = prompt('Nova escala:'); if(novo && !ESCALAS_OPCOES.includes(novo) && !escalasCustomizadas.includes(novo)) { const novos=[...escalasCustomizadas,novo]; setEscalasCustomizadas(novos); localStorage.setItem('escalasCustomizadas',JSON.stringify(novos)); setMusicaEditando({...musicaEditando, escalas:[...(musicaEditando.escalas||[]),novo]}); }},
                                                                () => setEditandoElemento('escala')
                                                            )}
                                                            {chips([...ESCALAS_OPCOES,...escalasCustomizadas], musicaEditando.escalas, esc => { const l=musicaEditando.escalas||[]; setMusicaEditando({...musicaEditando, escalas: l.includes(esc)?l.filter(e=>e!==esc):[...l,esc]}); })}
                                                        </div>
                                                        {/* Andamento */}
                                                        <div>
                                                            {labelRow('Andamento',
                                                                () => { const novo = prompt('Novo andamento:'); if(novo && !ANDAMENTOS_OPCOES.includes(novo) && !andamentosCustomizados.includes(novo)) { const novos=[...andamentosCustomizados,novo]; setAndamentosCustomizados(novos); localStorage.setItem('andamentosCustomizados',JSON.stringify(novos)); setMusicaEditando({...musicaEditando, andamentos:[...(musicaEditando.andamentos||[]),novo]}); }},
                                                                () => setEditandoElemento('andamento')
                                                            )}
                                                            {chips([...ANDAMENTOS_OPCOES,...andamentosCustomizados], musicaEditando.andamentos, and => { const l=musicaEditando.andamentos||[]; setMusicaEditando({...musicaEditando, andamentos: l.includes(and)?l.filter(a=>a!==and):[...l,and]}); })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ACCORDION 3 — Expressão */}
                                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                                <button type="button" onClick={() => setAccordionAberto(accordionAberto === 'expressao' ? null : 'expressao')}
                                                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left">
                                                    <div>
                                                        <span className="text-sm font-semibold text-slate-700">⚡ Expressão</span>
                                                        <span className="text-xs text-slate-400 ml-2">Dinâmica · Energia · Instrumentação</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {badgeExp > 0 && <span className="text-xs bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full">{badgeExp}</span>}
                                                        <span className={`text-slate-300 text-xs transition-transform duration-200 ${accordionAberto === 'expressao' ? 'rotate-180' : ''}`}>▼</span>
                                                    </div>
                                                </button>
                                                {accordionAberto === 'expressao' && (
                                                    <div className="bg-slate-50 border-t border-slate-100 px-5 py-5 space-y-5">
                                                        {/* Dinâmica */}
                                                        <div>
                                                            {labelRow('Dinâmica',
                                                                () => { const novo = prompt('Nova dinâmica:'); if(novo && !DINAMICAS_OPCOES.includes(novo) && !dinamicasCustomizadas.includes(novo)) { const novos=[...dinamicasCustomizadas,novo]; setDinamicasCustomizadas(novos); localStorage.setItem('dinamicasCustomizadas',JSON.stringify(novos)); setMusicaEditando({...musicaEditando, dinamicas:[...(musicaEditando.dinamicas||[]),novo]}); }},
                                                                () => setEditandoElemento('dinamica')
                                                            )}
                                                            <div className="flex flex-wrap gap-2">
                                                                {[
                                                                    {val:'Pianíssimo', label:'pp Pianíssimo'},
                                                                    {val:'Piano', label:'p Piano'},
                                                                    {val:'Meio-Piano', label:'mp Meio-Piano'},
                                                                    {val:'Meio-Forte', label:'mf Meio-Forte'},
                                                                    {val:'Forte', label:'f Forte'},
                                                                    {val:'Fortíssimo', label:'ff Fortíssimo'},
                                                                    {val:'Crescendo', label:'↗ Crescendo'},
                                                                    {val:'Decrescendo', label:'↘ Decrescendo'},
                                                                    {val:'Legato', label:'⌢ Legato'},
                                                                    {val:'Staccato', label:'• Staccato'},
                                                                    ...dinamicasCustomizadas.map(d => ({val:d, label:d}))
                                                                ].map(({val, label}) => {
                                                                    const sel = (musicaEditando.dinamicas||[]).includes(val);
                                                                    return <button key={val} type="button"
                                                                        onClick={() => { const l=musicaEditando.dinamicas||[]; setMusicaEditando({...musicaEditando, dinamicas: sel?l.filter(x=>x!==val):[...l,val]}); }}
                                                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${sel ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'}`}>
                                                                        {label}
                                                                    </button>;
                                                                })}
                                                            </div>
                                                        </div>
                                                        {/* Energia */}
                                                        <div>
                                                            {labelRow('Energia',
                                                                () => { const novo = prompt('Nova energia:'); if(novo && !ENERGIAS_OPCOES.includes(novo) && !energiasCustomizadas.includes(novo)) { const novos=[...energiasCustomizadas,novo]; setEnergiasCustomizadas(novos); localStorage.setItem('energiasCustomizadas',JSON.stringify(novos)); setMusicaEditando({...musicaEditando, energias:[...(musicaEditando.energias||[]),novo]}); }},
                                                                () => setEditandoElemento('energia')
                                                            )}
                                                            {chips([...ENERGIAS_OPCOES,...energiasCustomizadas], musicaEditando.energias, e => { const l=musicaEditando.energias||[]; setMusicaEditando({...musicaEditando, energias: l.includes(e)?l.filter(x=>x!==e):[...l,e]}); })}
                                                        </div>
                                                        {/* Instrumentação */}
                                                        <div>
                                                            {labelRow('Instrumentação',
                                                                () => { const novo = prompt('Novo instrumento:'); if(novo && !INSTRUMENTACAO_OPCOES.includes(novo) && !instrumentacaoCustomizada.includes(novo)) { const novos=[...instrumentacaoCustomizada,novo]; setInstrumentacaoCustomizada(novos); localStorage.setItem('instrumentacaoCustomizada',JSON.stringify(novos)); setMusicaEditando({...musicaEditando, instrumentacao:[...(musicaEditando.instrumentacao||[]),novo]}); }},
                                                                () => setEditandoElemento('instrumentacao')
                                                            )}
                                                            {chips([...INSTRUMENTACAO_OPCOES,...instrumentacaoCustomizada], musicaEditando.instrumentacao, inst => { const l=musicaEditando.instrumentacao||[]; setMusicaEditando({...musicaEditando, instrumentacao: l.includes(inst)?l.filter(x=>x!==inst):[...l,inst]}); })}
                                                            <div className="mt-3">
                                                                <label className="block text-xs text-slate-400 mb-1">Instrumento em destaque (solo/protagonista):</label>
                                                                <input type="text" value={musicaEditando.instrumentoDestaque||''} onChange={e=>setMusicaEditando({...musicaEditando, instrumentoDestaque: e.target.value})}
                                                                    placeholder="Ex: violino solo, flauta doce..."
                                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ACCORDION 4 — Observações e Recursos */}
                                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                                <button type="button" onClick={() => setAccordionAberto(accordionAberto === 'recursos' ? null : 'recursos')}
                                                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left">
                                                    <div>
                                                        <span className="text-sm font-semibold text-slate-700">📎 Observações e Recursos</span>
                                                        <span className="text-xs text-slate-400 ml-2">Notas · Links · PDFs · Áudios</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {badgeRec > 0 && <span className="text-xs bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full">{badgeRec}</span>}
                                                        <span className={`text-slate-300 text-xs transition-transform duration-200 ${accordionAberto === 'recursos' ? 'rotate-180' : ''}`}>▼</span>
                                                    </div>
                                                </button>
                                                {accordionAberto === 'recursos' && (
                                                    <div className="bg-slate-50 border-t border-slate-100 px-5 py-5 space-y-4">
                                                        <textarea value={musicaEditando.observacoes||''} onChange={e => setMusicaEditando({...musicaEditando, observacoes: e.target.value})}
                                                            placeholder="Anotações sobre a música..."
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400 resize-none" rows="3" />
                                                        <div className="flex gap-2">
                                                            <button onClick={() => { const url=prompt('Cole o link:'); if(url) setMusicaEditando({...musicaEditando, links:[...(musicaEditando.links||[]),url]}); }}
                                                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-semibold transition">🔗 Link</button>
                                                            <label className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-semibold text-center cursor-pointer transition">
                                                                📄 PDF
                                                                <input type="file" accept=".pdf" className="hidden" onChange={e => { const file=e.target.files[0]; if(file){ const r=new FileReader(); r.onload=()=>setMusicaEditando({...musicaEditando, pdfs:[...(musicaEditando.pdfs||[]),{nome:file.name,data:r.result}]}); r.readAsDataURL(file); } e.target.value=''; }} />
                                                            </label>
                                                            <label className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-semibold text-center cursor-pointer transition">
                                                                🎧 Áudio
                                                                <input type="file" accept="audio/*,video/*" className="hidden" onChange={e => { const file=e.target.files[0]; if(file){ const r=new FileReader(); r.onload=()=>setMusicaEditando({...musicaEditando, audios:[...(musicaEditando.audios||[]),{nome:file.name,data:r.result}]}); r.readAsDataURL(file); } e.target.value=''; }} />
                                                            </label>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            {(musicaEditando.links||[]).map((l,i) => <div key={i} className="flex gap-2 items-center bg-slate-50 px-3 py-2 rounded-lg"><a href={l} target="_blank" className="flex-1 truncate text-indigo-600 hover:underline text-xs">🔗 {l}</a><button onClick={()=>setMusicaEditando({...musicaEditando,links:musicaEditando.links.filter((_,idx)=>idx!==i)})} className="text-slate-400 hover:text-red-500 font-bold">✕</button></div>)}
                                                            {(musicaEditando.pdfs||[]).map((p,i) => <div key={i} className="flex gap-2 items-center bg-slate-50 px-3 py-2 rounded-lg"><a href={typeof p==='string'?p:p.data} target="_blank" className="flex-1 truncate text-slate-600 hover:underline text-xs">📄 {typeof p==='string'?p:p.nome}</a><button onClick={()=>setMusicaEditando({...musicaEditando,pdfs:musicaEditando.pdfs.filter((_,idx)=>idx!==i)})} className="text-slate-400 hover:text-red-500 font-bold">✕</button></div>)}
                                                            {(musicaEditando.audios||[]).map((a,i) => <div key={i} className="flex gap-2 items-center bg-slate-50 px-3 py-2 rounded-lg"><a href={typeof a==='string'?a:a.data} target="_blank" className="flex-1 truncate text-slate-600 hover:underline text-xs">🎧 {typeof a==='string'?a:a.nome}</a><button onClick={()=>setMusicaEditando({...musicaEditando,audios:musicaEditando.audios.filter((_,idx)=>idx!==i)})} className="text-slate-400 hover:text-red-500 font-bold">✕</button></div>)}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ACCORDION 5 — Vínculos */}
                                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                                <button type="button" onClick={() => setAccordionAberto(accordionAberto === 'vinculos' ? null : 'vinculos')}
                                                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left">
                                                    <div>
                                                        <span className="text-sm font-semibold text-slate-700">🔗 Vínculos</span>
                                                        <span className="text-xs text-slate-400 ml-2">Aulas · Atividades</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {badgeVinc > 0 && <span className="text-xs bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full">{badgeVinc}</span>}
                                                        <span className={`text-slate-300 text-xs transition-transform duration-200 ${accordionAberto === 'vinculos' ? 'rotate-180' : ''}`}>▼</span>
                                                    </div>
                                                </button>
                                                {accordionAberto === 'vinculos' && (
                                                    <div className="bg-slate-50 border-t border-slate-100 px-5 py-5 space-y-5">
                                                        {/* Aulas */}
                                                        <div>
                                                            <label className="block text-sm font-semibold text-slate-600 mb-2">📋 Aulas (Planos de Aula)</label>
                                                            <input type="text" placeholder="Buscar aula pelo título..." id="inputBuscaAulaVincular"
                                                                onChange={e => { const el=document.getElementById('listaAulasVincular'); el.style.display=e.target.value?'block':'none'; }}
                                                                onFocus={() => { document.getElementById('listaAulasVincular').style.display='block'; }}
                                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400 mb-1" />
                                                            <div id="listaAulasVincular" style={{display:'none'}} className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                                                                {planos.filter(p => { const b=document.getElementById('inputBuscaAulaVincular')?.value?.toLowerCase()||''; return !b||(p.titulo||'').toLowerCase().includes(b); }).map(p => {
                                                                    const jaVinc=(musicaEditando.planosVinculados||[]).includes(p.id);
                                                                    return <div key={p.id} className={`flex items-center justify-between px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 ${jaVinc?'bg-indigo-50':''}`}
                                                                        onClick={() => { const l=musicaEditando.planosVinculados||[]; setMusicaEditando({...musicaEditando, planosVinculados: jaVinc?l.filter(id=>id!==p.id):[...l,p.id]}); }}>
                                                                        <span className="text-sm text-slate-700">{p.titulo||'Sem título'}</span>
                                                                        {jaVinc && <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">✓</span>}
                                                                    </div>;
                                                                })}
                                                            </div>
                                                            {(musicaEditando.planosVinculados||[]).length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-2">
                                                                    {(musicaEditando.planosVinculados||[]).map(id => { const p=planos.find(pl=>pl.id===id); return p?<span key={id} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">📋 {p.titulo} <button type="button" onClick={()=>setMusicaEditando({...musicaEditando,planosVinculados:(musicaEditando.planosVinculados||[]).filter(x=>x!==id)})} className="hover:text-red-600 font-bold">×</button></span>:null; })}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {/* Atividades */}
                                                        <div>
                                                            <label className="block text-sm font-semibold text-slate-600 mb-2">🎯 Atividades do Banco</label>
                                                            <input type="text" placeholder="Buscar atividade pelo nome..." id="inputBuscaAtivVincular"
                                                                onChange={e => { document.getElementById('listaAtivVincular').style.display=e.target.value?'block':'none'; }}
                                                                onFocus={() => { document.getElementById('listaAtivVincular').style.display='block'; }}
                                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400 mb-1" />
                                                            <div id="listaAtivVincular" style={{display:'none'}} className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                                                                {atividades.filter(a => { const b=document.getElementById('inputBuscaAtivVincular')?.value?.toLowerCase()||''; return !b||(a.nome||'').toLowerCase().includes(b); }).map(a => {
                                                                    const jaVinc=(musicaEditando.atividadesVinculadas||[]).find(x=>x.id===a.id);
                                                                    return <div key={a.id} className={`flex items-center justify-between px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 ${jaVinc?'bg-slate-50':''}`}
                                                                        onClick={() => { const l=musicaEditando.atividadesVinculadas||[]; setMusicaEditando({...musicaEditando, atividadesVinculadas: jaVinc?l.filter(x=>x.id!==a.id):[...l,{id:a.id,nome:a.nome}]}); }}>
                                                                        <span className="text-sm text-slate-700">{a.nome||'Sem nome'}</span>
                                                                        {jaVinc && <span className="text-xs bg-slate-700 text-white px-2 py-0.5 rounded-full">✓</span>}
                                                                    </div>;
                                                                })}
                                                                {atividades.length===0 && <p className="text-center text-slate-400 py-4 text-sm">Nenhuma atividade no banco</p>}
                                                            </div>
                                                            {(musicaEditando.atividadesVinculadas||[]).length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-2">
                                                                    {(musicaEditando.atividadesVinculadas||[]).map(a => <span key={a.id} className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">🎯 {a.nome} <button type="button" onClick={()=>setMusicaEditando({...musicaEditando,atividadesVinculadas:(musicaEditando.atividadesVinculadas||[]).filter(x=>x.id!==a.id)})} className="hover:text-red-600 font-bold">×</button></span>)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Modal Excluir Opções */}
                                            {editandoElemento && (
                                                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditandoElemento(null)}>
                                                    <div className="bg-white p-6 rounded-xl max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                                                        <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">Excluir Opções Personalizadas</h3>
                                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                                            {(editandoElemento === 'compasso' ? [...COMPASSOS_OPCOES,...compassosCustomizados] :
                                                              editandoElemento === 'tonalidade' ? [...TONALIDADES_OPCOES,...tonalidadesCustomizadas] :
                                                              editandoElemento === 'andamento' ? [...ANDAMENTOS_OPCOES,...andamentosCustomizados] :
                                                              editandoElemento === 'escala' ? [...ESCALAS_OPCOES,...escalasCustomizadas] :
                                                              editandoElemento === 'dinamica' ? [...DINAMICAS_OPCOES,...dinamicasCustomizadas] :
                                                              editandoElemento === 'energia' ? [...ENERGIAS_OPCOES,...energiasCustomizadas] :
                                                              editandoElemento === 'instrumentacao' ? [...INSTRUMENTACAO_OPCOES,...instrumentacaoCustomizada] :
                                                              [...ESTRUTURAS_OPCOES,...estruturasCustomizadas]).map(item => {
                                                                const isPadrao = (editandoElemento==='compasso'&&COMPASSOS_OPCOES.includes(item))||(editandoElemento==='tonalidade'&&TONALIDADES_OPCOES.includes(item))||(editandoElemento==='andamento'&&ANDAMENTOS_OPCOES.includes(item))||(editandoElemento==='escala'&&ESCALAS_OPCOES.includes(item))||(editandoElemento==='dinamica'&&DINAMICAS_OPCOES.includes(item))||(editandoElemento==='energia'&&ENERGIAS_OPCOES.includes(item))||(editandoElemento==='instrumentacao'&&INSTRUMENTACAO_OPCOES.includes(item))||(editandoElemento==='estrutura'&&ESTRUTURAS_OPCOES.includes(item));
                                                                return <div key={item} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
                                                                    <span className="text-sm text-slate-700">{item} {isPadrao && <span className="text-xs text-slate-400">(padrão)</span>}</span>
                                                                    {!isPadrao && <button type="button" onClick={() => {
                                                                        if(editandoElemento==='compasso'){const n=compassosCustomizados.filter(c=>c!==item);setCompassosCustomizados(n);localStorage.setItem('compassosCustomizados',JSON.stringify(n));setMusicaEditando({...musicaEditando,compassos:(musicaEditando.compassos||[]).filter(c=>c!==item)});}
                                                                        else if(editandoElemento==='tonalidade'){const n=tonalidadesCustomizadas.filter(t=>t!==item);setTonalidadesCustomizadas(n);localStorage.setItem('tonalidadesCustomizadas',JSON.stringify(n));setMusicaEditando({...musicaEditando,tonalidades:(musicaEditando.tonalidades||[]).filter(t=>t!==item)});}
                                                                        else if(editandoElemento==='andamento'){const n=andamentosCustomizados.filter(a=>a!==item);setAndamentosCustomizados(n);localStorage.setItem('andamentosCustomizados',JSON.stringify(n));setMusicaEditando({...musicaEditando,andamentos:(musicaEditando.andamentos||[]).filter(a=>a!==item)});}
                                                                        else if(editandoElemento==='escala'){const n=escalasCustomizadas.filter(e=>e!==item);setEscalasCustomizadas(n);localStorage.setItem('escalasCustomizadas',JSON.stringify(n));setMusicaEditando({...musicaEditando,escalas:(musicaEditando.escalas||[]).filter(e=>e!==item)});}
                                                                        else if(editandoElemento==='estrutura'){const n=estruturasCustomizadas.filter(e=>e!==item);setEstruturasCustomizadas(n);localStorage.setItem('estruturasCustomizadas',JSON.stringify(n));setMusicaEditando({...musicaEditando,estruturas:(musicaEditando.estruturas||[]).filter(e=>e!==item)});}
                                                                        else if(editandoElemento==='dinamica'){const n=dinamicasCustomizadas.filter(d=>d!==item);setDinamicasCustomizadas(n);localStorage.setItem('dinamicasCustomizadas',JSON.stringify(n));setMusicaEditando({...musicaEditando,dinamicas:(musicaEditando.dinamicas||[]).filter(d=>d!==item)});}
                                                                        else if(editandoElemento==='energia'){const n=energiasCustomizadas.filter(e=>e!==item);setEnergiasCustomizadas(n);localStorage.setItem('energiasCustomizadas',JSON.stringify(n));setMusicaEditando({...musicaEditando,energias:(musicaEditando.energias||[]).filter(e=>e!==item)});}
                                                                        else if(editandoElemento==='instrumentacao'){const n=instrumentacaoCustomizada.filter(i=>i!==item);setInstrumentacaoCustomizada(n);localStorage.setItem('instrumentacaoCustomizada',JSON.stringify(n));setMusicaEditando({...musicaEditando,instrumentacao:(musicaEditando.instrumentacao||[]).filter(i=>i!==item)});}
                                                                    }} className="text-red-500 hover:text-red-700 font-bold text-sm">🗑️</button>}
                                                                </div>;
                                                            })}
                                                        </div>
                                                        <button onClick={() => setEditandoElemento(null)} className="mt-4 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg font-semibold text-sm transition">Fechar</button>
                                                    </div>
                                                </div>
                                            )}

                                            </>);
                                        })()}

                                        {/* Botão Salvar */}
                                        <div className="flex gap-3 pb-4">
                                            <button
                                                onClick={() => {
                                                    if(!musicaEditando.titulo.trim()) {
                                                        setModalConfirm({ conteudo: '⚠️ Título é obrigatório!', somenteOk: true, labelConfirm: 'OK' });
                                                        return;
                                                    }
                                                    const _salvarMusica = () => {
                                                        const novoRepertorio = repertorio.find(r => r.id === musicaEditando.id)
                                                            ? repertorio.map(r => r.id === musicaEditando.id ? musicaEditando : r)
                                                            : [...repertorio, musicaEditando];
                                                        setRepertorio(novoRepertorio);
                                                        localStorage.setItem('repertorio', JSON.stringify(novoRepertorio));
                                                        if (pendingAtividadeId && planoEditando) {
                                                            const atualizado = [...(planoEditando.atividadesRoteiro || [])];
                                                            const idx = atualizado.findIndex(a => a.id === pendingAtividadeId);
                                                            if (idx !== -1) {
                                                                const jaVinculada = (atualizado[idx].musicasVinculadas || []).find(m => m.id === musicaEditando.id);
                                                                if (!jaVinculada) {
                                                                    atualizado[idx] = {
                                                                        ...atualizado[idx],
                                                                        musicasVinculadas: [...(atualizado[idx].musicasVinculadas || []), {
                                                                            id: musicaEditando.id,
                                                                            titulo: musicaEditando.titulo,
                                                                            autor: musicaEditando.autor
                                                                        }]
                                                                    };
                                                                    setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                                                                }
                                                            }
                                                            setPendingAtividadeId(null);
                                                            setViewMode('planos');
                                                            setModalConfirm({ conteudo: '✅ Música salva e vinculada à atividade!', somenteOk: true, labelConfirm: 'OK' });
                                                        } else {
                                                            setModalConfirm({ conteudo: '✅ Música salva!', somenteOk: true, labelConfirm: 'OK' });
                                                        }
                                                        setMusicaEditando(null);
                                                    };
                                                    setModalConfirm({ titulo: 'Salvar música?', conteudo: 'Deseja confirmar o salvamento desta música?', labelConfirm: 'Salvar', onConfirm: _salvarMusica });
                                                }}
                                                className="flex-1 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-6 py-3 rounded-xl font-bold text-sm transition shadow-sm"
                                            >
                                                💾 Salvar Música
                                            </button>
                                            <button onClick={() => setMusicaEditando(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold text-sm transition">Cancelar</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
            };

            // ══ COMPONENTE INTERNO: Módulo Lista / Dashboard ══
            const ModuloLista = () => {
                            // ── DASHBOARD ──
                            const totalPlanos = planos.length;
                            const porStatus = {
                                'A Fazer':      planos.filter(p => (p.statusPlanejamento||'A Fazer') === 'A Fazer').length,
                                'Em Andamento': planos.filter(p => p.statusPlanejamento === 'Em Andamento').length,
                                'Concluído':    planos.filter(p => p.statusPlanejamento === 'Concluído').length,
                            };
                            const totalRegistros = planos.reduce((s,p) => s + (p.registrosPosAula||[]).length, 0);
                            const totalRepertorio = repertorio.length;

                            // Próxima aula agendada
                            const hoje = new Date(); hoje.setHours(0,0,0,0);
                            const hojeStr = hoje.toISOString().split('T')[0];
                            let proximaAula = null;
                            planos.forEach(p => {
                                (p.historicoDatas||[]).forEach(d => {
                                    if (d >= hojeStr) {
                                        if (!proximaAula || d < proximaAula.data)
                                            proximaAula = { data: d, plano: p };
                                    }
                                });
                            });

                            // Próximo registro pelo Registro Pós-Aula
                            let proximoRegistroData = null;
                            planos.forEach(p => {
                                (p.registrosPosAula||[]).forEach(r => {
                                    if (r.data >= hojeStr) {
                                        if (!proximoRegistroData || r.data < proximoRegistroData.data)
                                            proximoRegistroData = { data: r.data, plano: p };
                                    }
                                });
                            });

                            // Último registro feito
                            let ultimoRegistro = null;
                            planos.forEach(p => {
                                (p.registrosPosAula||[]).forEach(r => {
                                    if (!ultimoRegistro || (r.data||'') >= (ultimoRegistro.data||''))
                                        ultimoRegistro = { ...r, planoTitulo: p.titulo };
                                });
                            });

                            // Turmas com registros hoje (pelo Registro Pós-Aula)
                            const turmasHoje = [];
                            planos.forEach(p => {
                                (p.registrosPosAula||[]).forEach(r => {
                                    if (r.data === hojeStr) turmasHoje.push(p.turma || p.titulo);
                                });
                            });

                            // ── AVISO DE localStorage (#11) ──
                            // Só exibe o aviso se o usuário NÃO está logado (sem Supabase).
                            // Com conta ativa, os dados ficam na nuvem e o localStorage é só cache temporário.
                            let avisoStorage = null;
                            if (!userId) {
                                try {
                                    let total = 0;
                                    for (let key in localStorage) {
                                        if (localStorage.hasOwnProperty(key))
                                            total += (localStorage.getItem(key)||'').length * 2;
                                    }
                                    const pct = (total / (5 * 1024 * 1024)) * 100;
                                    if (pct >= 80)
                                        avisoStorage = { pct: pct.toFixed(0), usado: (total/1024).toFixed(0), critico: pct >= 95 };
                                } catch(e) {}
                            }

                            // ── COMPONENTE DE LINHA REUTILIZÁVEL ──
                            const LinhaPlano = ({ plano, showEscola = true }) => {
                                const nRegs = (plano.registrosPosAula || []).length;
                                const conceito1 = (plano.conceitos || [])[0] || '';
                                const faixa = (plano.faixaEtaria || [])[0] || plano.nivel || '';
                                const status = plano.statusPlanejamento || 'A Fazer';
                                const statusCfg = {
                                    'Concluído':    { dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700' },
                                    'Em Andamento': { dot: 'bg-blue-400',    badge: 'bg-blue-50 text-blue-700' },
                                    'A Fazer':      { dot: 'bg-slate-300',   badge: 'bg-slate-100 text-slate-500' }
                                };
                                const sc = statusCfg[status] || statusCfg['A Fazer'];
                                return (
                                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors duration-150 group">
                                        {/* Ponto de status */}
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
                                        {/* Favorito */}
                                        <button onClick={(e)=>{e.stopPropagation();toggleFavorito(plano,e);}} className="text-base shrink-0 opacity-50 hover:opacity-100 transition-opacity">{plano.destaque?'⭐':'☆'}</button>
                                        {/* Info principal — clicável */}
                                        <div className="flex-1 min-w-0 cursor-pointer" onClick={()=>setPlanoSelecionado(plano)}>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {/* Número da aula */}
                                                {plano.numeroAula && <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full shrink-0">#{plano.numeroAula}</span>}
                                                {/* Status badge */}
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${sc.badge}`}>{status}</span>
                                                {/* Título */}
                                                <span className="font-semibold text-slate-800 text-sm truncate">{plano.titulo}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                {/* Escola */}
                                                {showEscola && plano.escola && <span className="text-xs text-indigo-600 font-medium">🏫 {plano.escola}</span>}
                                                {showEscola && plano.escola && faixa && <span className="text-xs text-slate-300">·</span>}
                                                {/* Segmento/Faixa */}
                                                {faixa && <span className="text-xs text-slate-500">{faixa}</span>}
                                                {faixa && conceito1 && <span className="text-xs text-slate-300">·</span>}
                                                {/* Conteúdo musical */}
                                                {conceito1 && <span className="text-xs text-teal-600 font-medium">{conceito1}</span>}
                                                {/* Registros */}
                                                {nRegs > 0 && <span className="text-xs bg-amber-50 text-amber-600 font-semibold px-2 py-0.5 rounded-full">📝 {nRegs}</span>}
                                            </div>
                                        </div>
                                        {/* Ações rápidas — reveladas no hover */}
                                        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                            <button onClick={(e)=>abrirModalRegistro(plano,e)} title="Registro Pós-Aula" className="p-2 rounded-xl text-amber-500 hover:bg-amber-50 transition-colors text-sm">📝</button>
                                            <button onClick={(e)=>{e.stopPropagation();editarPlano(plano);}} title="Editar" className="p-2 rounded-xl text-blue-500 hover:bg-blue-50 transition-colors text-sm">✏️</button>
                                            <button onClick={()=>setPlanoSelecionado(plano)} title="Ver completo" className="p-2 rounded-xl text-indigo-500 hover:bg-indigo-50 transition-colors text-sm">👁</button>
                                        </div>
                                    </div>
                                );
                            };

                            return (
                            <>
                                {/* ── AVISO DE ARMAZENAMENTO (#11) ── */}
                                {avisoStorage && (
                                    <div className={`mb-4 flex items-start gap-3 px-4 py-3 rounded-xl border ${avisoStorage.critico ? 'bg-red-50 border-red-300 text-red-800' : 'bg-amber-50 border-amber-300 text-amber-800'}`}>
                                        <span className="text-xl shrink-0">{avisoStorage.critico ? '🚨' : '⚠️'}</span>
                                        <div className="flex-1 text-sm">
                                            <p className="font-bold mb-0.5">{avisoStorage.critico ? 'Armazenamento crítico!' : 'Armazenamento quase cheio'}</p>
                                            <p>Você está usando <strong>{avisoStorage.pct}%</strong> (~{avisoStorage.usado} KB de 5.120 KB) do espaço local do navegador.
                                            {avisoStorage.critico ? ' Salve um backup agora para não perder dados.' : ' Considere exportar um backup em breve.'}</p>
                                        </div>
                                        <button onClick={()=>baixarBackup()}
                                            className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg ${avisoStorage.critico ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-500 text-white hover:bg-amber-600'}`}>
                                            ⬇ Backup
                                        </button>
                                    </div>
                                )}

                                {/* ── DASHBOARD (#1) ── */}
                                <div className="mb-6 space-y-3">
                                    {/* Linha 1: KPIs principais */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {/* Total de planos */}
                                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Planos de Aula</p>
                                            <p className="text-3xl font-bold text-slate-800">{totalPlanos}</p>
                                            <div className="mt-2 flex gap-1.5 flex-wrap">
                                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{porStatus['A Fazer']} a fazer</span>
                                                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{porStatus['Em Andamento']} em andamento</span>
                                                <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">{porStatus['Concluído']} concluídos</span>
                                            </div>
                                        </div>
                                        {/* Registros Pós-Aula */}
                                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Registros Pós-Aula</p>
                                            <p className="text-3xl font-bold text-amber-600">{totalRegistros}</p>
                                            {ultimoRegistro ? (
                                                <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                                                    Último: <span className="text-slate-600 font-medium">{ultimoRegistro.planoTitulo}</span>
                                                    {ultimoRegistro.data && <> · {new Date(ultimoRegistro.data+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}</>}
                                                </p>
                                            ) : <p className="text-xs text-slate-400 mt-2">Nenhum registro ainda</p>}
                                        </div>
                                        {/* Próxima aula */}
                                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Próxima Aula</p>
                                            {proximaAula ? (
                                                <>
                                                    <p className="text-xl font-bold text-indigo-700">
                                                        {new Date(proximaAula.data+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 font-medium">{proximaAula.plano.titulo}</p>
                                                    {proximaAula.plano.escola && <p className="text-xs text-indigo-400 mt-0.5">🏫 {proximaAula.plano.escola}</p>}
                                                </>
                                            ) : <p className="text-2xl font-bold text-slate-300 mt-1">—</p>}
                                        </div>
                                        {/* Repertório */}
                                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Repertório</p>
                                            <p className="text-3xl font-bold text-purple-600">{totalRepertorio}</p>
                                            <p className="text-xs text-slate-400 mt-2">{totalRepertorio === 1 ? 'música cadastrada' : 'músicas cadastradas'}</p>
                                        </div>
                                    </div>

                                    {/* Linha 2: Barra de progresso de status + Turmas hoje */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* Progresso geral */}
                                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                            <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Progresso Geral dos Planos</p>
                                            {totalPlanos === 0 ? (
                                                <p className="text-sm text-slate-400">Nenhum plano criado ainda.</p>
                                            ) : (
                                                <>
                                                    <div className="flex rounded-full overflow-hidden h-4 mb-2">
                                                        {porStatus['Concluído'] > 0 && <div style={{width: `${(porStatus['Concluído']/totalPlanos*100).toFixed(1)}%`}} className="bg-emerald-400 transition-all" title="Concluído"></div>}
                                                        {porStatus['Em Andamento'] > 0 && <div style={{width: `${(porStatus['Em Andamento']/totalPlanos*100).toFixed(1)}%`}} className="bg-blue-400 transition-all" title="Em Andamento"></div>}
                                                        {porStatus['A Fazer'] > 0 && <div style={{width: `${(porStatus['A Fazer']/totalPlanos*100).toFixed(1)}%`}} className="bg-slate-200 transition-all" title="A Fazer"></div>}
                                                    </div>
                                                    <div className="flex gap-4 text-xs text-slate-500 mt-1">
                                                        <span>✅ {(porStatus['Concluído']/totalPlanos*100).toFixed(0)}% concluídos</span>
                                                        <span>🔵 {(porStatus['Em Andamento']/totalPlanos*100).toFixed(0)}% em andamento</span>
                                                        <span>⬜ {(porStatus['A Fazer']/totalPlanos*100).toFixed(0)}% a fazer</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Hoje */}
                                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                            <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Hoje</p>
                                            {turmasHoje.length > 0 ? (
                                                <>
                                                    <p className="text-sm font-bold text-emerald-700 mb-2">🎓 {turmasHoje.length} aula(s) registrada(s) hoje</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {turmasHoje.map((t,i) => (
                                                            <span key={i} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">{t}</span>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : (
                                                <p className="text-sm text-slate-400">Nenhuma aula registrada hoje.</p>
                                            )}
                                            {ultimoRegistro && ultimoRegistro.data !== hojeStr && (
                                                <p className="text-xs text-slate-400 mt-2 border-t border-slate-100 pt-2">
                                                    Último registro: <span className="text-slate-600 font-medium">{new Date(ultimoRegistro.data+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}</span>
                                                    {' · '}{ultimoRegistro.planoTitulo}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* FILTROS */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-5">
                                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                        <div className="md:col-span-6"><input type="text" placeholder="🔍 Buscar por título, objetivo, conceito..." value={busca} onChange={(e)=>setBusca(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" /></div>
                                        <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Escola</label><select value={filtroEscola} onChange={(e)=>setFiltroEscola(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white">{escolas.map(e=><option key={e} value={e}>{e}</option>)}</select></div>
                                        <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nível</label><select value={filtroNivel} onChange={(e)=>setFiltroNivel(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white">{niveis.map(n=><option key={n} value={n}>{n}</option>)}</select></div>
                                        <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Faixa Etária</label><select value={filtroFaixa} onChange={(e)=>setFiltroFaixa(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white">{faixas.map(f=><option key={f} value={f}>{f}</option>)}</select></div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Conceito</label>
                                            <select value={filtroConceito} onChange={(e)=>setFiltroConceito(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white"><option value="Todos">Todos</option>{conceitos.map(c=><option key={c} value={c}>{c}</option>)}</select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Unidade</label>
                                            <select value={filtroUnidade} onChange={(e)=>setFiltroUnidade(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white"><option value="Todos">Todos</option>{unidades.map(u=><option key={u} value={u}>{u}</option>)}</select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Tag</label>
                                            <select value={filtroTag} onChange={(e)=>setFiltroTag(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white">
                                                <option value="Todas">Todas</option>
                                                {tagsGlobais.map(t=><option key={t} value={t}>#{t}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Status</label>
                                            <select value={filtroStatus} onChange={(e)=>setFiltroStatus(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white">
                                                <option value="Todos">Todos</option>
                                                <option value="A Fazer">A Fazer</option>
                                                <option value="Em Andamento">Em Andamento</option>
                                                <option value="Concluído">Concluído</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-6 flex justify-between items-center flex-wrap gap-2">
                                            <div className="flex gap-2 flex-wrap">
                                                <button onClick={()=>setFiltroFavorito(!filtroFavorito)} className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${filtroFavorito ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-amber-200 hover:text-amber-600'}`}>
                                                    {filtroFavorito ? '★ Favoritos' : '☆ Favoritos'}
                                                </button>
                                                <button onClick={()=>{setBusca("");setFiltroEscola("Todas");setFiltroNivel("Todos");setFiltroConceito("Todos");setFiltroFaixa("Todos");setFiltroFavorito(false);setFiltroStatus("Todos");setFiltroTag("Todas");}} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-slate-200 transition">Limpar filtros</button>
                                            </div>
                                            {/* Ordenação + Seletor de modo */}
                                            <div className="flex gap-2 items-center flex-wrap">
                                                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
                                                    <span className="text-xs text-slate-400 font-semibold">Ordenar:</span>
                                                    {[
                                                        {id:'recente',   label:'Recente'},
                                                        {id:'az',        label:'A–Z'},
                                                        {id:'status',    label:'Status'},
                                                        {id:'favoritos', label:'★'},
                                                    ].map(o=>(
                                                        <button key={o.id} onClick={()=>setOrdenacaoCards(o.id)}
                                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${ordenacaoCards===o.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}>
                                                            {o.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                                                    {[
                                                        { id:'grade',    label:'⊞', title:'Grade' },
                                                        { id:'compacto', label:'☰', title:'Lista' },
                                                        { id:'periodo',  label:'📆', title:'Por Período' },
                                                        { id:'segmento', label:'👥', title:'Por Segmento' },
                                                    ].map(m=>(
                                                        <button key={m.id} onClick={()=>setModoVisualizacao(m.id)} title={m.title}
                                                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${modoVisualizacao===m.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
                                                            {m.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Contagem */}
                                <p className="text-xs text-gray-400 mb-3 px-1">{planosFiltrados.length} plano{planosFiltrados.length!==1?'s':''}</p>

                                {/* ── MODO GRADE ── */}
                                {modoVisualizacao === 'grade' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {planosFiltrados.map(plano => {
                                            const status = plano.statusPlanejamento || 'A Fazer';
                                            const barraGrad = plano.destaque
                                                ? 'from-amber-400 to-yellow-300'
                                                : status === 'Concluído'    ? 'from-emerald-400 to-teal-400'
                                                : status === 'Em Andamento' ? 'from-blue-400 to-indigo-400'
                                                : 'from-slate-300 to-slate-400';
                                            const statusStyle = {
                                                'A Fazer':      'bg-slate-100 text-slate-500',
                                                'Em Andamento': 'bg-blue-50 text-blue-600 border border-blue-100',
                                                'Concluído':    'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                            }[status];
                                            return (
                                            <div key={plano.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col overflow-hidden group">
                                                {/* Barra gradiente de status no topo */}
                                                <div className={`h-1.5 bg-gradient-to-r ${barraGrad}`}/>
                                                <div className="p-4 flex-1">
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {/* Badge de status clicável com dropdown */}
                                                            <div className="relative">
                                                                <button
                                                                    onClick={(e)=>{e.stopPropagation(); setStatusDropdownId(statusDropdownId===plano.id ? null : plano.id);}}
                                                                    title="Clique para alterar o status"
                                                                    className={`text-xs font-semibold px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition flex items-center gap-1 ${statusStyle}`}>
                                                                    {status} <span className="opacity-40 text-xs">▾</span>
                                                                </button>
                                                                {statusDropdownId === plano.id && (
                                                                    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden min-w-[160px]"
                                                                         onClick={e=>e.stopPropagation()}>
                                                                        {['A Fazer','Em Andamento','Concluído'].map(s => {
                                                                            const cores = {
                                                                                'A Fazer':      'hover:bg-slate-50 text-slate-600',
                                                                                'Em Andamento': 'hover:bg-blue-50 text-blue-700',
                                                                                'Concluído':    'hover:bg-emerald-50 text-emerald-700'
                                                                            };
                                                                            const icons = {'A Fazer':'⬜','Em Andamento':'🔵','Concluído':'✅'};
                                                                            return (
                                                                                <button key={s}
                                                                                    onClick={()=>{ setPlanos(planos.map(p=>p.id===plano.id?{...p,statusPlanejamento:s}:p)); setStatusDropdownId(null); }}
                                                                                    className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center gap-2 ${cores[s]} ${status===s?'opacity-50 cursor-default':''}`}>
                                                                                    {icons[s]} {s}
                                                                                    {status===s && <span className="ml-auto text-slate-300">✓</span>}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {plano.numeroAula && <span className="text-xs text-slate-400 font-medium">{plano.numeroAula}</span>}
                                                        </div>
                                                        <button onClick={(e)=>toggleFavorito(plano,e)} className={`text-base shrink-0 hover:scale-110 transition ${plano.destaque ? 'text-amber-400' : 'text-slate-200 hover:text-amber-300'}`}>
                                                            {plano.destaque ? '★' : '☆'}
                                                        </button>
                                                    </div>

                                                    <h3 className="font-bold text-slate-800 text-base leading-snug mb-1">{plano.titulo}</h3>
                                                    {plano.tema && <p className="text-xs text-slate-400 mb-3 line-clamp-1">{plano.tema}</p>}

                                                    {/* Badges */}
                                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                                        {plano.escola && <span className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">🏫 {plano.escola}</span>}
                                                        {(plano.faixaEtaria||[])[0] && <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">👥 {(plano.faixaEtaria||[])[0]}</span>}
                                                        {plano.historicoDatas?.length > 0 && <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">📅 {plano.historicoDatas.length}×</span>}
                                                        {(plano.unidades||[])[0] && <span className="text-xs text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">📚 {(plano.unidades||[])[0]}</span>}
                                                        {plano.registrosPosAula?.length > 0 && <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">📝 {plano.registrosPosAula.length}</span>}
                                                        {(() => { const t=(plano.atividadesRoteiro||[]).reduce((s,a)=>s+(parseInt(a.duracao)||0),0); return t>0?<span className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">⏱ {t}min</span>:null; })()}
                                                    </div>

                                                    {/* Conceitos */}
                                                    {(plano.conceitos||[]).length > 0 && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {(plano.conceitos||[]).slice(0,3).map(c=>(
                                                                <span key={c} className="text-xs bg-violet-50 text-violet-600 border border-violet-100 px-2 py-0.5 rounded-full">{c}</span>
                                                            ))}
                                                            {(plano.conceitos||[]).length > 3 && <span className="text-xs text-slate-400">+{(plano.conceitos||[]).length-3}</span>}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Rodapé com ações */}
                                                <div className="border-t border-slate-100 px-3 py-2.5 flex items-center gap-1">
                                                    <button onClick={(e)=>{e.stopPropagation();setPlanoSelecionado(plano)}}
                                                        className="flex-1 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-xs font-bold py-2 px-3 rounded-xl transition">
                                                        Ver plano
                                                    </button>
                                                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                                        <button onClick={(e)=>abrirModalRegistro(plano,e)}
                                                            className="text-amber-500 hover:text-amber-700 hover:bg-amber-50 p-2 rounded-xl transition" title="Registro Pós-Aula">📝</button>
                                                        <button onClick={(e)=>{e.stopPropagation();editarPlano(plano)}}
                                                            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition" title="Editar">✏️</button>
                                                        <button onClick={(e)=>{e.stopPropagation();exportarPlanoPDF(plano)}}
                                                            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition text-xs font-bold" title="PDF">PDF</button>
                                                        <button onClick={(e)=>{e.stopPropagation(); const copia={...plano, id:Date.now(), titulo:'[Cópia] '+plano.titulo, statusPlanejamento:'A Fazer', historicoDatas:[], registrosPosAula:[], destaque:false}; setPlanos(prev=>[...prev, copia]); setModalConfirm({ conteudo: '✅ Plano duplicado!', somenteOk: true, labelConfirm: 'OK' });}}
                                                            className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 p-2 rounded-xl transition" title="Duplicar">⎘</button>
                                                        <button onClick={(e)=>{e.stopPropagation();excluirPlano(plano.id)}}
                                                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition" title="Excluir">🗑</button>
                                                    </div>
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* ── MODO LISTA (COMPACTO) ── */}
                                {modoVisualizacao === 'compacto' && (
                                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                                        {planosFiltrados.length === 0 && <p className="text-center text-gray-400 py-10">Nenhum plano encontrado.</p>}
                                        {planosFiltrados.map(plano => <LinhaPlano key={plano.id} plano={plano} showEscola={true} />)}
                                    </div>
                                )}

                                {/* ── MODO POR PERÍODO ── */}
                                {modoVisualizacao === 'periodo' && (() => {
                                    const mesesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
                                    
                                    // Calcular datas de início e fim do período
                                    let dataFim = new Date(); dataFim.setHours(0,0,0,0);
                                    let dataInicio;
                                    if (periodoDias === 'custom') {
                                        if (!dataInicioCustom || !dataFimCustom) {
                                            dataInicio = new Date(); dataInicio.setDate(dataInicio.getDate() - 30);
                                        } else {
                                            dataInicio = new Date(dataInicioCustom + 'T00:00:00');
                                            dataFim = new Date(dataFimCustom + 'T23:59:59');
                                        }
                                    } else {
                                        dataInicio = new Date(); dataInicio.setDate(dataInicio.getDate() - periodoDias);
                                    }
                                    dataInicio.setHours(0,0,0,0);

                                    // Agrupar por mês
                                    const grupos = {};
                                    planosFiltrados.forEach(plano => {
                                        const datas = plano.historicoDatas || [];
                                        const ref = datas.length > 0 ? datas[datas.length - 1] : new Date(plano.id).toISOString().slice(0,10);
                                        const dataRef = new Date(ref + 'T12:00:00');
                                        if (dataRef < dataInicio || dataRef > dataFim) return; // fora do período
                                        const [ano, mes] = ref.split('-');
                                        const chave = `${ano}-${mes}`;
                                        if (!grupos[chave]) grupos[chave] = { ano, mes: parseInt(mes), planos: [] };
                                        grupos[chave].planos.push(plano);
                                    });

                                    const ordenado = Object.keys(grupos).sort((a,b)=>b.localeCompare(a));

                                    return (
                                        <>
                                            {/* Seletor de período */}
                                            <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
                                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Período</p>
                                                <div className="flex gap-2 flex-wrap">
                                                    {[
                                                        {d:30,  l:'1 mês'},
                                                        {d:60,  l:'2 meses'},
                                                        {d:90,  l:'3 meses'},
                                                        {d:180, l:'6 meses'},
                                                        {d:365, l:'1 ano'},
                                                        {d:'custom', l:'📅 Customizar'}
                                                    ].map(p=>(
                                                        <button key={p.d} onClick={()=>setPeriodoDias(p.d)}
                                                            className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition ${periodoDias===p.d ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300'}`}>
                                                            {p.l}
                                                        </button>
                                                    ))}
                                                </div>
                                                {periodoDias === 'custom' && (
                                                    <div className="flex gap-2 mt-3 items-center flex-wrap">
                                                        <input type="date" value={dataInicioCustom} onChange={e=>setDataInicioCustom(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm" />
                                                        <span className="text-gray-400">até</span>
                                                        <input type="date" value={dataFimCustom} onChange={e=>setDataFimCustom(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Meses com planos */}
                                            {ordenado.length === 0 && <p className="text-center text-gray-400 py-10">Nenhum plano neste período.</p>}
                                            <div className="space-y-4">
                                                {ordenado.map(chave => {
                                                    const g = grupos[chave];
                                                    return (
                                                        <div key={chave} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                                                            <div className="bg-indigo-600 text-white px-4 py-2.5 flex justify-between items-center">
                                                                <span className="font-bold text-sm">{mesesNomes[g.mes-1]} {g.ano}</span>
                                                                <span className="text-indigo-200 text-xs">{g.planos.length} plano{g.planos.length!==1?'s':''}</span>
                                                            </div>
                                                            {g.planos.map(plano => <LinhaPlano key={plano.id} plano={plano} showEscola={true} />)}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    );
                                })()}

                                {/* ── MODO POR SEGMENTO ── */}
                                {modoVisualizacao === 'segmento' && (() => {
                                    // Agrupa por faixaEtaria[0] ou nivel
                                    const gruposSegmento = {};
                                    const semSegmento = [];

                                    planosFiltrados.forEach(plano => {
                                        const seg = (plano.faixaEtaria||[])[0] || plano.nivel;
                                        if (!seg) { semSegmento.push(plano); return; }
                                        if (!gruposSegmento[seg]) gruposSegmento[seg] = [];
                                        gruposSegmento[seg].push(plano);
                                    });

                                    const segmentosOrdenados = Object.keys(gruposSegmento).sort();

                                    if (segmentosOrdenados.length === 0 && semSegmento.length === 0)
                                        return <p className="text-center text-gray-400 py-10">Nenhum plano encontrado.</p>;

                                    return (
                                        <div className="space-y-4">
                                            {segmentosOrdenados.map(seg => (
                                                <div key={seg} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                                                    <div className="bg-teal-600 text-white px-4 py-2.5 flex justify-between items-center">
                                                        <span className="font-bold text-sm">👥 {seg}</span>
                                                        <span className="text-teal-200 text-xs">{gruposSegmento[seg].length} plano{gruposSegmento[seg].length!==1?'s':''}</span>
                                                    </div>
                                                    {gruposSegmento[seg].map(plano => <LinhaPlano key={plano.id} plano={plano} showEscola={true} />)}
                                                </div>
                                            ))}
                                            {semSegmento.length > 0 && (
                                                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                                                    <div className="bg-gray-400 text-white px-4 py-2.5 flex justify-between items-center">
                                                        <span className="font-bold text-sm">📄 Sem segmento definido</span>
                                                        <span className="text-gray-200 text-xs">{semSegmento.length} plano{semSegmento.length!==1?'s':''}</span>
                                                    </div>
                                                    {semSegmento.map(plano => <LinhaPlano key={plano.id} plano={plano} showEscola={true} />)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </>
                            );
            };

            if (!dadosCarregados) return (
                <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center">
                    <div className="text-white text-center">
                        <div className="text-5xl mb-4">🎵</div>
                        <p className="text-indigo-200 text-lg font-medium">Carregando seus dados...</p>
                        <p className="text-indigo-400 text-sm mt-2">Sincronizando com a nuvem</p>
                        <div className="mt-4 flex justify-center gap-2">
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}></div>
                        </div>
                    </div>
                </div>
            );

            return (
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
                        {viewMode==='resumoDia' && renderResumoDia()}
                        {viewMode==='calendario' && renderCalendario()}

                        {/* ══════════════ HISTÓRICO MUSICAL DA TURMA ══════════════ */}
                        {viewMode === 'historicoMusical' && <ModuloHistoricoMusical />}

                        {/* ══════════════ MEU ANO LETIVO ══════════════ */}
                        {viewMode === 'anoLetivo' && <ModuloAnoLetivo />}

                        {/* ══════════════ ESTRATÉGIAS PEDAGÓGICAS ══════════════ */}
                        {viewMode === 'estrategias' && <ModuloEstrategias />}

                        {/* ══════════════ BANCO DE ATIVIDADES ══════════════ */}
                        {viewMode === 'atividades' && <ModuloAtividades />}
                        
                        {/* ═══════════ VIEW SEQUÊNCIAS DIDÁTICAS ═══════════ */}
                        {viewMode === 'sequencias' && <ModuloSequencias />}
                        {viewMode === 'lista' && !modoEdicao && <ModuloLista />}
                    </div>

                    {/* MODAL VER COMPLETO */}

                        {/* REPERTÓRIO INTELIGENTE */}
                        {viewMode === 'repertorio' && <ModuloRepertorio />}

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

                    {/* ═══════════ MODAL EDITAR SEQUÊNCIA ═══════════ */}
                    {sequenciaEditando && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={()=>setSequenciaEditando(null)}>
                            <div className="bg-white rounded-2xl w-full max-w-2xl p-6" onClick={e=>e.stopPropagation()}>
                                <h2 className="text-2xl font-bold text-rose-700 mb-6">✏️ {sequenciaEditando.id && sequencias.find(s=>s.id===sequenciaEditando.id) ? 'Editar' : 'Nova'} Sequência</h2>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block font-bold mb-2">Título da Sequência *</label>
                                        <input 
                                            type="text"
                                            value={sequenciaEditando.titulo}
                                            onChange={e=>setSequenciaEditando({...sequenciaEditando, titulo: e.target.value})}
                                            className="w-full px-4 py-2 border-2 rounded-lg"
                                            placeholder="Ex: Projeto Folclore, Música Brasileira..."
                                        />
                                    </div>

                                    {/* Ano Letivo */}
                                    <div>
                                        <label className="block font-bold mb-2">Ano Letivo *</label>
                                        <select 
                                            value={sequenciaEditando.anoLetivoId}
                                            onChange={e=>setSequenciaEditando({...sequenciaEditando, anoLetivoId: e.target.value, escolaId: '', segmentos: []})}
                                            className="w-full px-4 py-2 border-2 rounded-lg"
                                        >
                                            <option value="">Selecione...</option>
                                            {anosLetivos.map(ano => (
                                                <option key={ano.id} value={ano.id}>{ano.nome}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Escola */}
                                    {sequenciaEditando.anoLetivoId && (
                                        <div>
                                            <label className="block font-bold mb-2">Escola *</label>
                                            <select 
                                                value={sequenciaEditando.escolaId}
                                                onChange={e=>setSequenciaEditando({...sequenciaEditando, escolaId: e.target.value, segmentos: []})}
                                                className="w-full px-4 py-2 border-2 rounded-lg"
                                            >
                                                <option value="">Selecione...</option>
                                                {anosLetivos.find(a=>a.id==sequenciaEditando.anoLetivoId)?.escolas.map(escola => (
                                                    <option key={escola.id} value={escola.id}>{escola.nome}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Segmentos (Seleção Múltipla) */}
                                    {sequenciaEditando.escolaId && (() => {
                                        const ano = anosLetivos.find(a=>a.id==sequenciaEditando.anoLetivoId);
                                        const escola = ano?.escolas.find(e=>e.id==sequenciaEditando.escolaId);
                                        const segmentos = escola?.segmentos || [];
                                        
                                        const toggleSegmento = (segId) => {
                                            const atual = sequenciaEditando.segmentos || [];
                                            const novos = atual.includes(segId) 
                                                ? atual.filter(s => s !== segId)
                                                : [...atual, segId];
                                            setSequenciaEditando({...sequenciaEditando, segmentos: novos});
                                        };
                                        
                                        return (
                                            <div>
                                                <label className="block font-bold mb-2">Segmentos * (selecione um ou mais)</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {segmentos.map(seg => (
                                                        <button
                                                            key={seg.id}
                                                            type="button"
                                                            onClick={() => toggleSegmento(seg.id)}
                                                            className={`px-4 py-2 rounded-lg font-bold transition ${
                                                                (sequenciaEditando.segmentos || []).includes(seg.id)
                                                                    ? 'bg-rose-500 text-white'
                                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                            }`}
                                                        >
                                                            {seg.nome}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Turma Específica (Opcional) - Dropdown */}
                                    {sequenciaEditando.escolaId && sequenciaEditando.segmentos?.length > 0 && (() => {
                                        const ano = anosLetivos.find(a=>a.id==sequenciaEditando.anoLetivoId);
                                        const escola = ano?.escolas.find(e=>e.id==sequenciaEditando.escolaId);
                                        
                                        // Pegar turmas dos segmentos selecionados
                                        const turmasDisponiveis = [];
                                        (sequenciaEditando.segmentos || []).forEach(segId => {
                                            const seg = escola?.segmentos.find(s => s.id == segId);
                                            if (seg?.turmas) {
                                                seg.turmas.forEach(t => {
                                                    if (!turmasDisponiveis.find(td => td.id == t.id)) {
                                                        turmasDisponiveis.push({...t, segmentoNome: seg.nome});
                                                    }
                                                });
                                            }
                                        });
                                        
                                        return (
                                            <div>
                                                <label className="block font-bold mb-2">Turma Específica (opcional)</label>
                                                <select 
                                                    value={sequenciaEditando.turmaEspecifica || ''}
                                                    onChange={e=>setSequenciaEditando({...sequenciaEditando, turmaEspecifica: e.target.value})}
                                                    className="w-full px-4 py-2 border-2 rounded-lg"
                                                >
                                                    <option value="">Todas as turmas dos segmentos</option>
                                                    {turmasDisponiveis.map(t => (
                                                        <option key={t.id} value={t.nome}>{t.segmentoNome} - {t.nome}</option>
                                                    ))}
                                                </select>
                                                <p className="text-xs text-gray-500 mt-1">Se não selecionar, vale para todas as turmas dos segmentos escolhidos</p>
                                            </div>
                                        );
                                    })()}

                                    {/* Unidade Pedagógica Predominante */}
                                    <div>
                                        <label className="block font-bold mb-2">Unidade Pedagógica Predominante</label>
                                        <select 
                                            value={sequenciaEditando.unidadePredominante || ''}
                                            onChange={e=>setSequenciaEditando({...sequenciaEditando, unidadePredominante: e.target.value})}
                                            className="w-full px-4 py-2 border-2 rounded-lg"
                                        >
                                            <option value="">Selecione...</option>
                                            {unidades.map(u => (
                                                <option key={u} value={u}>{u}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block font-bold mb-2">Duração / Período</label>
                                        <select 
                                            value={sequenciaEditando.duracao}
                                            onChange={e=>{
                                                const d = e.target.value;
                                                let num = 4;
                                                if (d === 'bimestral') num = 8;
                                                else if (d === 'semestral') num = 20;
                                                setSequenciaEditando({...sequenciaEditando, duracao: d, numeroSlots: num});
                                            }}
                                            className="w-full px-4 py-2 border-2 rounded-lg"
                                        >
                                            <option value="mensal">Mensal (4 aulas)</option>
                                            <option value="bimestral">Bimestral (8 aulas)</option>
                                            <option value="semestral">Semestral (20 aulas)</option>
                                            <option value="manual">Manual</option>
                                        </select>
                                    </div>

                                    {sequenciaEditando.duracao === 'manual' && (
                                        <div>
                                            <label className="block font-bold mb-2">Número de Aulas</label>
                                            <input 
                                                type="number"
                                                min="1"
                                                max="50"
                                                value={sequenciaEditando.numeroSlots}
                                                onChange={e=>setSequenciaEditando({...sequenciaEditando, numeroSlots: Number(e.target.value)})}
                                                className="w-full px-4 py-2 border-2 rounded-lg"
                                            />
                                        </div>
                                    )}

                                    {/* Datas (para calendário) */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block font-bold mb-2">📅 Data Início</label>
                                            <input 
                                                type="date"
                                                value={sequenciaEditando.dataInicio || ''}
                                                onChange={e=>setSequenciaEditando({...sequenciaEditando, dataInicio: e.target.value})}
                                                className="w-full px-4 py-2 border-2 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold mb-2">📅 Data Fim</label>
                                            <input 
                                                type="date"
                                                value={sequenciaEditando.dataFim || ''}
                                                onChange={e=>setSequenciaEditando({...sequenciaEditando, dataFim: e.target.value})}
                                                className="w-full px-4 py-2 border-2 rounded-lg"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button onClick={()=>setSequenciaEditando(null)} className="flex-1 bg-gray-300 py-3 rounded-xl font-bold">Cancelar</button>
                                        <button onClick={salvarSequencia} className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-bold">Salvar</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══════════ MODAL VINCULAR PLANO ═══════════ */}
                    {modalVincularPlano && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={()=>{setModalVincularPlano(null);setBuscaPlanoVinculo('');}}>
                            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto p-6" onClick={e=>e.stopPropagation()}>
                                <h2 className="text-2xl font-bold text-rose-700 mb-4">🔗 Vincular Plano Existente</h2>
                                
                                <input 
                                    type="text"
                                    value={buscaPlanoVinculo}
                                    onChange={e=>setBuscaPlanoVinculo(e.target.value)}
                                    className="w-full px-4 py-2 border-2 rounded-lg mb-4"
                                    placeholder="🔍 Buscar plano..."
                                />

                                <div className="space-y-2">
                                    {planos
                                        .filter(p => !buscaPlanoVinculo || p.titulo.toLowerCase().includes(buscaPlanoVinculo.toLowerCase()))
                                        .slice(0, 20)
                                        .map(p => (
                                            <div 
                                                key={p.id}
                                                onClick={() => vincularPlanoAoSlot(p.id)}
                                                className="border-2 border-rose-200 rounded-lg p-3 hover:border-rose-400 hover:bg-rose-50 cursor-pointer transition"
                                            >
                                                <h4 className="font-bold text-gray-800">{p.titulo}</h4>
                                                <p className="text-sm text-gray-600">{p.escola} • {p.faixaEtaria?.join(', ')}</p>
                                                {p.atividadesRoteiro?.length > 0 && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        📋 {p.atividadesRoteiro.length} atividade(s)
                                                    </p>
                                                )}
                                            </div>
                                        ))
                                    }
                                    {planos.filter(p => !buscaPlanoVinculo || p.titulo.toLowerCase().includes(buscaPlanoVinculo.toLowerCase())).length === 0 && (
                                        <p className="text-center text-gray-400 py-8">Nenhum plano encontrado</p>
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
                    )}                    {/* MODAL EDIÇÃO */}
                    {modoEdicao && planoEditando && (
                        <>
                        {/* Overlay escuro — só no modo expandido */}
                        {formExpandido && <div className="fixed inset-0 bg-black/60 z-40" onClick={()=>setFormExpandido(false)}/>}

                        {/* Container externo — inline compacto OU tela cheia */}
                        <div className={formExpandido ? "fixed inset-0 z-50 flex items-center justify-center p-2" : "max-w-3xl mx-auto mb-10"}>

                            {/* Linha "Voltar" — só no modo compacto */}
                            {!formExpandido && (
                                <div className="flex items-center gap-3 mb-4">
                                    <button type="button" onClick={fecharModal} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-semibold text-sm transition-colors flex items-center gap-1.5">← Voltar</button>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-800">{planoEditando.id ? 'Editar plano' : 'Novo plano de aula'}</h2>
                                    </div>
                                </div>
                            )}

                            {/* Card principal */}
                            <div className={`bg-white rounded-2xl overflow-hidden flex flex-col ${formExpandido ? 'w-full h-full max-w-[98vw] max-h-[97vh] shadow-2xl' : 'shadow-sm border border-slate-200'}`}>

                                {/* ── HEADER EXPANDIDO ── */}
                                {formExpandido ? (
                                    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center flex-shrink-0">
                                        <div>
                                            <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide mb-0.5">{planoEditando.id ? 'Editar Plano' : 'Novo Plano'}</p>
                                            <h2 className="text-xl font-bold truncate leading-tight">{planoEditando.titulo||"Sem título"}</h2>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={()=>toggleFavorito(planoEditando)} className={`text-sm px-3 py-1.5 rounded-xl flex-shrink-0 transition-colors ${planoEditando.destaque ? 'bg-amber-400 text-amber-900 font-bold' : 'bg-white/20 hover:bg-white/30'}`}>
                                                {planoEditando.destaque ? '★ Favorito' : '☆ Favoritar'}
                                            </button>
                                            <button type="button" onClick={()=>setFormExpandido(false)} title="Compactar" className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors text-lg leading-none">⤡</button>
                                            <button type="button" onClick={fecharModal} title="Fechar" className="p-2 rounded-xl bg-white/20 hover:bg-red-500/60 text-white transition-colors text-lg leading-none">✕</button>
                                        </div>
                                    </div>
                                ) : (
                                    /* ── HEADER COMPACTO ── */
                                    <>
                                        <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 flex-shrink-0"/>
                                        <div className="px-5 py-3.5 flex justify-between items-center border-b border-slate-100 flex-shrink-0">
                                            <div>
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{planoEditando.id ? 'Editar' : 'Novo'}</p>
                                                <h3 className="font-bold text-slate-800 text-sm leading-tight truncate max-w-xs">{planoEditando.titulo||"Sem título"}</h3>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button onClick={()=>toggleFavorito(planoEditando)} className={`text-xs px-2.5 py-1.5 rounded-xl transition-colors ${planoEditando.destaque ? 'bg-amber-100 text-amber-700 border border-amber-200 font-semibold' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                                                    {planoEditando.destaque ? '★' : '☆'}
                                                </button>
                                                <button type="button" onClick={()=>setFormExpandido(true)} title="Expandir para tela cheia" className="p-2 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-500 text-slate-400 transition-colors text-base leading-none">⤢</button>
                                                <button type="button" onClick={fecharModal} title="Fechar" className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-400 text-slate-400 transition-colors text-base leading-none">✕</button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* ── CONTEÚDO DO FORM (igual nos dois modos) ── */}
                                <div className={`p-6 space-y-0 overflow-y-auto ${formExpandido ? 'flex-1' : ''}`} style={!formExpandido ? {maxHeight:'calc(100vh - 260px)'} : {}}>
                                    <div className="grid grid-cols-2 gap-4 pb-5">
                                        <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Título *</label><input type="text" value={planoEditando.titulo} onChange={e=>setPlanoEditando({...planoEditando, titulo: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" /></div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Escola</label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <input type="text" value={planoEditando.escola} onChange={e=>setPlanoEditando({...planoEditando, escola: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" list="escolas-list" placeholder="Selecione ou digite..." />
                                                    <datalist id="escolas-list">
                                                        {/* Escolas dos anos letivos */}
                                                        {anosLetivos.flatMap(a => a.escolas.map(e => e.nome)).filter((v,i,arr)=>arr.indexOf(v)===i).map(e=><option key={e} value={e}/>)}
                                                        {/* Escolas dos planos (legado) */}
                                                        {escolas.filter(e=>e!=='Todas').map(e=><option key={'p_'+e} value={e}/>)}
                                                    </datalist>
                                                </div>
                                                <button type="button" onClick={()=>{ setNovaEscolaNome(''); setNovaEscolaAnoId(''); setModalNovaEscola('plano'); }} className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-xl font-bold text-lg leading-none transition-colors" title="Cadastrar nova escola">+</button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Status do Planejamento */}
                                    <div className="border-t border-slate-100 py-5">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">📊 Status</label>
                                        <div className="flex gap-2">
                                            {[
                                                {value: 'A Fazer', color: 'bg-slate-50 border-slate-200 text-slate-500', activeColor: 'bg-slate-600 border-slate-600 text-white'},
                                                {value: 'Em Andamento', color: 'bg-blue-50 border-blue-200 text-blue-600', activeColor: 'bg-blue-500 border-blue-500 text-white'},
                                                {value: 'Concluído', color: 'bg-emerald-50 border-emerald-200 text-emerald-700', activeColor: 'bg-emerald-500 border-emerald-500 text-white'}
                                            ].map(s => (
                                                <button key={s.value} type="button"
                                                    onClick={()=>setPlanoEditando({...planoEditando, statusPlanejamento: s.value})}
                                                    className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                                                        (planoEditando.statusPlanejamento || 'A Fazer') === s.value ? s.activeColor : s.color
                                                    }`}>
                                                    {s.value}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="border-t border-slate-100 py-5"><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">📅 Datas</label><div className="flex gap-2 mb-2"><input type="date" value={dataEdicao} onChange={e=>setDataEdicao(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:border-indigo-400 outline-none"/><button type="button" onClick={adicionarDataEdicao} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl font-semibold text-sm transition-colors">Add</button></div><div className="flex flex-wrap gap-2">{planoEditando.historicoDatas?.map(d=><span key={d} className="bg-white border border-slate-200 px-2.5 py-1 rounded-full text-sm text-slate-700 font-medium">{new Date(d+'T12:00:00').toLocaleDateString('pt-BR')} <button type="button" onClick={()=>removerDataEdicao(d)} className="text-red-400 hover:text-red-600 font-bold ml-1">×</button></span>)}</div></div>
                                    
                                    <div className="border-t border-slate-100 py-5 grid grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nível</label><select value={planoEditando.nivel} onChange={e=>setPlanoEditando({...planoEditando, nivel: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white">{niveis.slice(1).map(n=><option key={n}>{n}</option>)}</select></div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Duração</label>
                                            {/* AUTOCOMPLETE DE DURAÇÃO */}
                                            <input type="text" value={planoEditando.duracao} onChange={e=>setPlanoEditando({...planoEditando, duracao: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" placeholder="Ex: 50 min" list="duracoes-list" />
                                            <datalist id="duracoes-list">{duracoesSugestao.map(d=><option key={d} value={d}/>)}</datalist>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-100 py-5">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Faixa Etária</label>
                                            <button type="button" onClick={()=>{ setNovaFaixaNome(''); setModalNovaFaixa(true); }}
                                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                                                title="Adicionar nova faixa etária">+ Nova faixa</button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {faixas.slice(1).map(faixa => (
                                                <button key={faixa} type="button" onClick={() => toggleFaixa(faixa)}
                                                    className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${planoEditando.faixaEtaria.includes(faixa) ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                                    {faixa}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="border-t border-slate-100 py-5">
                                        <div className="flex justify-between items-center mb-3"><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">🎵 Conceitos Musicais</label>{!adicionandoConceito && (<button type="button" onClick={() => setAdicionandoConceito(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">+ Novo</button>)}</div>
                                        {adicionandoConceito && (<div className="mb-3 flex gap-2"><input type="text" value={novoConceito} onChange={(e) => setNovoConceito(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && adicionarConceitoNovo()} className="flex-1 px-3 py-1.5 border border-dashed border-slate-300 rounded-xl text-sm focus:border-indigo-400 outline-none" placeholder="Nome do conceito..." autoFocus /><button type="button" onClick={adicionarConceitoNovo} className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors">✓</button><button type="button" onClick={() => { setAdicionandoConceito(false); setNovoConceito(""); }} className="bg-slate-100 hover:bg-slate-200 text-slate-500 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors">✕</button></div>)}
                                        <div className="flex flex-wrap gap-2">{(conceitos || []).map(conceito => (<button key={conceito} type="button" onClick={() => toggleConceito(conceito)} className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${(planoEditando.conceitos || []).includes(conceito) ? 'bg-violet-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{conceito}</button>))}</div>
                                    </div>

{/* TAGS (Formato/Dinâmica) */}
                                    <div className="border-t border-slate-100 py-5">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">🏷️ Tags</label>

                                        {/* Tags selecionadas em chips */}
                                        {(planoEditando.tags || []).length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-slate-100">
                                                {(planoEditando.tags || []).map((tag, idx) => (
                                                    <span key={idx} className="bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                                                        #{tag}
                                                        <button
                                                            type="button"
                                                            onClick={() => setPlanoEditando({
                                                                ...planoEditando,
                                                                tags: planoEditando.tags.filter((_,i)=>i!==idx)
                                                            })}
                                                            className="hover:bg-indigo-200 rounded-full w-4 h-4 flex items-center justify-center text-indigo-500 transition-colors"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Seleção rápida de tags existentes */}
                                        <p className="text-xs text-slate-400 mb-2">Selecione das existentes:</p>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {(tagsGlobais || []).map(tag => (
                                                <div key={tag} className="flex items-center gap-0 bg-white border border-slate-200 rounded-full hover:border-slate-300 transition-colors">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!(planoEditando.tags||[]).includes(tag)) {
                                                                setPlanoEditando({
                                                                    ...planoEditando,
                                                                    tags: [...(planoEditando.tags||[]), tag]
                                                                });
                                                            }
                                                        }}
                                                        disabled={(planoEditando.tags||[]).includes(tag)}
                                                        className={`px-3 py-1 rounded-l-full text-sm transition-all ${
                                                            (planoEditando.tags||[]).includes(tag)
                                                            ? 'text-slate-300 cursor-not-allowed'
                                                            : 'text-slate-600 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        #{tag}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setModalConfirm({ titulo: 'Remover tag?', conteudo: `Remover "${tag}" da lista permanentemente?`, labelConfirm: 'Remover', perigo: true, onConfirm: () => {
                                                                setTagsGlobais(tagsGlobais.filter(t => t !== tag));
                                                                if ((planoEditando.tags||[]).includes(tag)) {
                                                                    setPlanoEditando({
                                                                        ...planoEditando,
                                                                        tags: planoEditando.tags.filter(t => t !== tag)
                                                                    });
                                                                }
                                                            } });
                                                        }}
                                                        className="text-slate-300 hover:text-red-400 px-2 py-1 rounded-r-full transition-all"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Input para adicionar nova tag */}
                                        <p className="text-xs text-slate-400 mb-2">Ou adicione nova:</p>
                                        <input
                                            type="text"
                                            onKeyDown={e => {
                                                if ((e.key === 'Enter' || e.key === ' ') && e.target.value.trim()) {
                                                    e.preventDefault();
                                                    const novaTag = e.target.value.trim().replace(/^#/, '');
                                                    if (novaTag && !(planoEditando.tags || []).includes(novaTag)) {
                                                        setPlanoEditando({
                                                            ...planoEditando,
                                                            tags: [...(planoEditando.tags||[]), novaTag]
                                                        });
                                                        // Adicionar à lista global
                                                        if (!tagsGlobais.includes(novaTag)) {
                                                            setTagsGlobais([...tagsGlobais, novaTag].sort());
                                                        }
                                                    }
                                                    e.target.value = '';
                                                }
                                            }}
                                            className="w-full px-3 py-1.5 border border-dashed border-slate-300 rounded-xl text-sm focus:border-indigo-400 outline-none"
                                            placeholder="Digite e pressione Enter... Ex: roda, jogos"
                                        />
                                    </div>
                                    
                                    {/* MATERIAIS

                                    {/* Unidades */}
                                    <div className="border-t border-slate-100 py-5">
                                        <div className="flex justify-between items-center mb-3"><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">📚 Unidades</label>{!adicionandoUnidade && (<button type="button" onClick={() => setAdicionandoUnidade(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">+ Novo</button>)}</div>
                                        {adicionandoUnidade && (<div className="mb-3 flex gap-2"><input type="text" value={novaUnidade} onChange={(e) => setNovaUnidade(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && adicionarUnidadeNova()} className="flex-1 px-3 py-1.5 border border-dashed border-slate-300 rounded-xl text-sm focus:border-indigo-400 outline-none" placeholder="Nome da unidade..." autoFocus /><button type="button" onClick={adicionarUnidadeNova} className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors">✓</button><button type="button" onClick={() => { setAdicionandoUnidade(false); setNovaUnidade(""); }} className="bg-slate-100 hover:bg-slate-200 text-slate-500 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors">✕</button></div>)}
                                        <div className="flex flex-wrap gap-2">{(unidades || []).map(unidade => (<button key={unidade} type="button" onClick={() => toggleUnidade(unidade)} className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${(planoEditando.unidades || []).includes(unidade) ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{unidade}</button>))}</div>
                                    </div>

                                    <div className="border-t border-slate-100 py-5">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">🎯 Objetivo Geral *</label>
                                        <RichTextEditor
                                            value={planoEditando.objetivoGeral}
                                            onChange={val => setPlanoEditando({...planoEditando, objetivoGeral: val})}
                                            placeholder="Descreva o objetivo geral da aula..."
                                            rows={3}
                                        />
                                    </div>
                                    
                                    <div className="border-t border-slate-100 py-5">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">🎯 Objetivos Específicos</label>
                                        <RichTextEditor
                                            value={Array.isArray(planoEditando.objetivosEspecificos) 
                                                ? (planoEditando.objetivosEspecificos.length > 0 && typeof planoEditando.objetivosEspecificos[0] === 'string' && !planoEditando.objetivosEspecificos[0].startsWith('<')
                                                    ? '<ul>' + planoEditando.objetivosEspecificos.map(o=>`<li>${o}</li>`).join('') + '</ul>'
                                                    : planoEditando.objetivosEspecificos.join('\n'))
                                                : planoEditando.objetivosEspecificos}
                                            onChange={val => setPlanoEditando({...planoEditando, objetivosEspecificos: [val]})}
                                            placeholder="Liste os objetivos específicos da aula..."
                                            rows={5}
                                        />
                                    </div>

                                    <div className="border-t border-slate-100 py-5">
                                        <div className="flex justify-between items-center mb-2"><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">🏛️ Habilidades BNCC</label><button type="button" onClick={sugerirBNCC} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">✨ Sugerir</button></div>
                                        <textarea value={(planoEditando.habilidadesBNCC || []).join('\n')} onChange={e => setPlanoEditando({...planoEditando, habilidadesBNCC: e.target.value.split('\n')})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" rows="5" placeholder="EF15ARXX - Descrição..." />
                                    </div>

                                    {/* Roteiro de Atividades */}
                                    <div className="border-t border-slate-100 py-5">
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">📋 Roteiro de Atividades</label>
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => setModalTemplates(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">
                                                    📐 Templates
                                                </button>
                                                <button type="button" onClick={adicionarAtividadeRoteiro} className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">
                                                    + Atividade
                                                </button>
                                                <button type="button" onClick={() => setModalImportarAtividade(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">
                                                    📚 Importar
                                                </button>
                                            </div>
                                        </div>
                                        {/* ⏱️ Contador de tempo total */}
                                        {(() => {
                                            const ativs = planoEditando.atividadesRoteiro || [];
                                            if (ativs.length === 0) return null;
                                            let totalMin = 0; let temIndefinido = false;
                                            ativs.forEach(a => {
                                                const num = parseInt((a.duracao||'').toString().trim());
                                                if (!isNaN(num)) totalMin += num;
                                                else if ((a.duracao||'').trim()) temIndefinido = true;
                                            });
                                            const duracaoAula = parseInt(planoEditando.duracao) || 0;
                                            const diff = duracaoAula ? totalMin - duracaoAula : null;
                                            const cor = diff === null ? 'text-indigo-700' : diff > 5 ? 'text-red-600' : diff < -5 ? 'text-amber-600' : 'text-green-600';
                                            const icon = diff === null ? '⏱️' : diff > 5 ? '⚠️' : diff < -5 ? '💡' : '✅';
                                            return (
                                                <div className={`flex items-center gap-2 mb-3 text-sm font-bold ${cor}`}>
                                                    <span>{icon} Tempo total: {totalMin} min{temIndefinido ? '+' : ''}</span>
                                                    {diff !== null && <span className="font-normal text-xs opacity-80">({diff > 0 ? '+' : ''}{diff} min em relação à duração da aula)</span>}
                                                </div>
                                            );
                                        })()}
                                        
                                        {(!planoEditando.atividadesRoteiro || planoEditando.atividadesRoteiro.length === 0) ? (
                                            <div className="text-center py-8 text-gray-400">
                                                <p>Nenhuma atividade adicionada ainda.</p>
                                                <p className="text-sm mt-2">Clique em "+ Adicionar Atividade" para começar.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {(planoEditando.atividadesRoteiro || []).map((atividade, index) => (
                                                    <div key={atividade.id}
                                                        draggable
                                                        onDragStart={() => handleDragStart(index)}
                                                        onDragEnter={() => handleDragEnter(index)}
                                                        onDragEnd={handleDragEnd}
                                                        onDragOver={e => e.preventDefault()}
                                                        className={`bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm cursor-grab active:cursor-grabbing transition-opacity hover:border-indigo-200 ${dragActiveIndex === index ? 'dragging' : ''} ${dragOverIndex === index && dragActiveIndex !== index ? 'drag-over' : ''}`}>
                                                        <div className="flex justify-between items-center mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-gray-300 hover:text-indigo-400 transition text-lg select-none" title="Arraste para reordenar">⠿</span>
                                                                <span className="font-bold text-indigo-700">Atividade {index + 1}</span>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => toggleRecursosAtiv(index)}
                                                                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-bold hover:bg-blue-200"
                                                                >
                                                                    📎 Links
                                                                </button>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if(!atividade.nome?.trim()) {
                                                                            setModalConfirm({ conteudo: '⚠️ Nome obrigatório!', somenteOk: true, labelConfirm: 'OK' });
                                                                            return;
                                                                        }
                                                                        const existe = atividades.find(a => a.nome.toLowerCase().trim() === atividade.nome.toLowerCase().trim());
                                                                        if(existe) {
                                                                            setModalConfirm({ titulo: 'Atividade já existe', conteudo: `"${atividade.nome}" já existe no Banco de Atividades.\n\nAtualizar?`, labelConfirm: 'Atualizar', onConfirm: () => {
                                                                                const atualizada = {
                                                                                    ...existe,
                                                                                    descricao: atividade.descricao || existe.descricao,
                                                                                    duracao: atividade.duracao || existe.duracao,
                                                                                    conceitos: [...new Set([...(existe.conceitos||[]), ...(atividade.conceitos||[])])],
                                                                                    tags: [...new Set([...(existe.tags||[]), ...(atividade.tags||[])])],
                                                                                    recursos: [...(existe.recursos||[]), ...(atividade.recursos||[])].filter((r,i,a) => a.findIndex(x=>x.url===r.url)===i),
                                                                                    faixaEtaria: planoEditando.faixaEtaria || existe.faixaEtaria,
                                                                                    escola: planoEditando.escola || existe.escola,
                                                                                    unidade: planoEditando.unidades?.[0] || existe.unidade
                                                                                };
                                                                                setAtividades(atividades.map(a => a.id === existe.id ? atualizada : a));
                                                                                setModalConfirm({ conteudo: '✅ Atividade atualizada no Banco de Atividades!', somenteOk: true, labelConfirm: 'OK' });
                                                                            } });
                                                                        } else {
                                                                            const nova = {
                                                                                id: Date.now(),
                                                                                nome: atividade.nome,
                                                                                descricao: atividade.descricao || '',
                                                                                duracao: atividade.duracao || '',
                                                                                conceitos: atividade.conceitos || [],
                                                                                tags: atividade.tags || [],
                                                                                recursos: atividade.recursos || [],
                                                                                materiais: [],
                                                                                faixaEtaria: planoEditando.faixaEtaria || [],
                                                                                escola: planoEditando.escola || '',
                                                                                unidade: planoEditando.unidades?.[0] || ''
                                                                            };
                                                                            setAtividades([...atividades, nova]);
                                                                            setModalConfirm({ conteudo: '✅ Atividade salva no Banco de Atividades!', somenteOk: true, labelConfirm: 'OK' });
                                                                        }
                                                                    }}
                                                                    className="bg-green-500 text-white px-3 py-1 rounded text-sm font-bold hover:bg-green-600"
                                                                >
                                                                    💾 → Atividades
                                                                </button>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => removerAtividadeRoteiro(atividade.id)}
                                                                    className="text-red-500 hover:text-red-700 font-bold px-2"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </div>
                                                        
                                                        {recursosExpandidos[index] && (
                                                            <div className="mb-3 p-3 bg-blue-50 rounded border">
                                                                <div className="flex gap-2 mb-2">
                                                                    <input type="text" id={`recurso-${index}`} placeholder="URL" className="flex-1 px-2 py-1 border rounded text-sm" />
                                                                    <button type="button" onClick={() => {
                                                                        const url = document.getElementById(`recurso-${index}`).value.trim();
                                                                        if(url) {
                                                                            const atualizado = [...planoEditando.atividadesRoteiro];
                                                                            atualizado[index].recursos = [...(atualizado[index].recursos||[]), {url, tipo:'link'}];
                                                                            setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                                                                            document.getElementById(`recurso-${index}`).value = '';
                                                                        }
                                                                    }} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">+</button>
                                                                </div>
                                                                {(atividade.recursos||[]).map((r, ri) => (
                                                                    <div key={ri} className="flex items-center gap-2 bg-white p-2 rounded text-xs mb-1">
                                                                        <span className="flex-1 truncate">🔗 {r.url}</span>
                                                                        <button type="button" onClick={() => {
                                                                            const atualizado = [...planoEditando.atividadesRoteiro];
                                                                            atualizado[index].recursos.splice(ri, 1);
                                                                            setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                                                                        }} className="text-red-500 font-bold">✕</button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <div className="space-y-3">
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                <div className="md:col-span-2">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <label className="block text-sm font-bold text-gray-700">Nome da Atividade</label>
                                                                        <button type="button" onClick={() => setAtividadeVinculandoMusica(atividade.id)} className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold hover:bg-blue-600">
                                                                            🎵 Vincular música
                                                                        </button>
                                                                    </div>
                                                                    <input 
                                                                        type="text"
                                                                        value={atividade.nome}
                                                                        onChange={(e) => atualizarAtividadeRoteiro(atividade.id, 'nome', e.target.value)}
                                                                        className="w-full px-3 py-2 border-2 rounded-lg"
                                                                        placeholder="Ex: Música Tindolelê, Aquecimento Vocal..."
                                                                    />
                                                                    
                                                                    {/* Músicas Vinculadas */}
                                                                    {(atividade.musicasVinculadas||[]).length > 0 && (
                                                                        <div className="mt-2 space-y-1">
                                                                            {atividade.musicasVinculadas.map((musica, mi) => (
                                                                                <div key={mi} className="flex items-center justify-between bg-blue-50 px-2 py-1 rounded text-xs">
                                                                                    <span className="text-blue-700">🎵 {musica.titulo} {musica.autor && `- ${musica.autor}`}</span>
                                                                                    <button type="button" onClick={() => {
                                                                                        const atualizado = [...planoEditando.atividadesRoteiro];
                                                                                        atualizado[index].musicasVinculadas = atualizado[index].musicasVinculadas.filter((_, idx) => idx !== mi);
                                                                                        setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                                                                                    }} className="text-red-500 font-bold hover:text-red-700">×</button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-bold text-gray-700 mb-1">⏱️ Duração</label>
                                                                    <input 
                                                                        type="text"
                                                                        value={atividade.duracao || ''}
                                                                        onChange={(e) => atualizarAtividadeRoteiro(atividade.id, 'duracao', e.target.value)}
                                                                        className="w-full px-3 py-2 border-2 rounded-lg"
                                                                        placeholder="Ex: 15min"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <label className="block text-sm font-bold text-gray-700">Descrição / Como Fazer</label>
                                                                    <button type="button" onClick={() => setAtividadeVinculandoMusica(atividade.id)} className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold hover:bg-blue-600">
                                                                        🎵 Vincular música
                                                                    </button>
                                                                </div>
                                                                <RichTextEditor
                                                                    value={atividade.descricao}
                                                                    onChange={(val) => atualizarAtividadeRoteiro(atividade.id, 'descricao', val)}
                                                                    placeholder="Descreva como realizar esta atividade..."
                                                                    rows={10}
                                                                />
                                                                
                                                                {/* Músicas Vinculadas */}
                                                                {(atividade.musicasVinculadas||[]).length > 0 && (
                                                                    <div className="mt-2 space-y-1">
                                                                        {atividade.musicasVinculadas.map((musica, mi) => (
                                                                            <div key={mi} className="flex items-center justify-between bg-blue-50 px-2 py-1 rounded text-xs">
                                                                                <span className="text-blue-700">🎵 {musica.titulo} {musica.autor && `- ${musica.autor}`}</span>
                                                                                <button type="button" onClick={() => {
                                                                                    const atualizado = [...planoEditando.atividadesRoteiro];
                                                                                    atualizado[index].musicasVinculadas = atualizado[index].musicasVinculadas.filter((_, idx) => idx !== mi);
                                                                                    setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                                                                                }} className="text-red-500 font-bold hover:text-red-700">×</button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            {/* Conceitos/Tags Editáveis */}
                                                            <div className="mt-3 space-y-2">
                                                                <div>
                                                                    <div className="flex flex-wrap gap-1 mb-1">
                                                                        {(atividade.conceitos||[]).map((c, ci) => (
                                                                            <span key={ci} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full flex items-center gap-1">
                                                                                🎵 {c}
                                                                                <button type="button" onClick={() => {
                                                                                    const atualizado = [...planoEditando.atividadesRoteiro];
                                                                                    atualizado[index].conceitos = atualizado[index].conceitos.filter((_,idx)=>idx!==ci);
                                                                                    setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                                                                                }} className="hover:text-red-600 font-bold">×</button>
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        <input 
                                                                            type="text" 
                                                                            placeholder="Novo conceito + Enter"
                                                                            onKeyPress={(e) => {
                                                                                if(e.key === 'Enter') {
                                                                                    let val = e.target.value.trim();
                                                                                    if(val && !(atividade.conceitos||[]).includes(val)) {
                                                                                        const atualizado = [...planoEditando.atividadesRoteiro];
                                                                                        atualizado[index].conceitos = [...(atualizado[index].conceitos||[]), val];
                                                                                        setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                                                                                        e.target.value = '';
                                                                                    }
                                                                                }
                                                                            }}
                                                                            className="flex-1 text-xs px-2 py-1 border rounded"
                                                                        />
                                                                        <select onChange={(e) => {
                                                                            if(e.target.value && !(atividade.conceitos||[]).includes(e.target.value)) {
                                                                                const atualizado = [...planoEditando.atividadesRoteiro];
                                                                                atualizado[index].conceitos = [...(atualizado[index].conceitos||[]), e.target.value];
                                                                                setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                                                                                e.target.value = '';
                                                                            }
                                                                        }} className="text-xs px-2 py-1 border rounded">
                                                                            <option value="">+ Conceito</option>
                                                                            {conceitos.map(c => <option key={c} value={c}>{c}</option>)}
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div>
                                                                    <div className="flex flex-wrap gap-1 mb-1">
                                                                        {(atividade.tags||[]).map((t, ti) => (
                                                                            <span key={ti} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full flex items-center gap-1">
                                                                                #{t}
                                                                                <button type="button" onClick={() => {
                                                                                    const atualizado = [...planoEditando.atividadesRoteiro];
                                                                                    atualizado[index].tags = atualizado[index].tags.filter((_,idx)=>idx!==ti);
                                                                                    setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                                                                                }} className="hover:text-red-600 font-bold">×</button>
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        <input 
                                                                            type="text" 
                                                                            placeholder="Nova tag + Enter"
                                                                            onKeyPress={(e) => {
                                                                                if(e.key === 'Enter') {
                                                                                    let val = e.target.value.trim().replace(/^#/, '');
                                                                                    if(val && !(atividade.tags||[]).includes(val)) {
                                                                                        const atualizado = [...planoEditando.atividadesRoteiro];
                                                                                        atualizado[index].tags = [...(atualizado[index].tags||[]), val];
                                                                                        setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                                                                                        e.target.value = '';
                                                                                    }
                                                                                }
                                                                            }}
                                                                            className="flex-1 text-xs px-2 py-1 border rounded"
                                                                        />
                                                                        <select onChange={(e) => {
                                                                            if(e.target.value && !(atividade.tags||[]).includes(e.target.value)) {
                                                                                const atualizado = [...planoEditando.atividadesRoteiro];
                                                                                atualizado[index].tags = [...(atualizado[index].tags||[]), e.target.value];
                                                                                setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                                                                                e.target.value = '';
                                                                            }
                                                                        }} className="text-xs px-2 py-1 border rounded">
                                                                            <option value="">+ Tag</option>
                                                                            {tagsGlobais.map(t => <option key={t} value={t}>#{t}</option>)}
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    
                                    

                                    {/* MATERIAIS - Sistema Inteligente */}
                                    <div className="border-t border-slate-100 py-5">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">📦 Materiais</label>
                                        
                                        {/* Sugestões Rápidas (Checkboxes) */}
                                        <div className="mb-4">
                                            <p className="text-xs text-slate-400 mb-2">Sugestões do seu histórico:</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {(() => {
                                                    // Extrair materiais mais usados de todos os planos
                                                    const materiaisContagem = {};
                                                    planos.forEach(p => {
                                                        (p.materiais || []).forEach(mat => {
                                                            const m = mat.trim();
                                                            if (m && !materiaisBloqueados.includes(m)) { // Filtrar bloqueados
                                                                materiaisContagem[m] = (materiaisContagem[m] || 0) + 1;
                                                            }
                                                        });
                                                    });
                                                    
                                                    // Ordenar por frequência e pegar top 8
                                                    const sugestoes = Object.entries(materiaisContagem)
                                                        .sort((a, b) => b[1] - a[1])
                                                        .slice(0, 8)
                                                        .map(([mat]) => mat);
                                                    
                                                    // Se não houver histórico, mostrar sugestões padrão (também filtradas)
                                                    const sugestoesPadrao = [
                                                        'Flauta doce',
                                                        'Instrumentos Orff',
                                                        'Aparelho de som',
                                                        'Caderno de música',
                                                        'Lápis/Canetas',
                                                        'Papel pautado',
                                                        'Computador/Projetor',
                                                        'Caixa de som portátil'
                                                    ].filter(m => !materiaisBloqueados.includes(m));
                                                    
                                                    const sugestoesFinais = sugestoes.length > 0 ? sugestoes : sugestoesPadrao;
                                                    
                                                    return sugestoesFinais.map(mat => {
                                                        const jaAdicionado = planoEditando.materiais.includes(mat);
                                                        return (
                                                            <div key={mat} className="flex items-center gap-1 bg-white p-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                                                <label className="flex items-center gap-2 flex-1 cursor-pointer">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={jaAdicionado}
                                                                        onChange={(e) => {
                                                                            const novos = e.target.checked 
                                                                                ? [...planoEditando.materiais, mat]
                                                                                : planoEditando.materiais.filter(m => m !== mat);
                                                                            setPlanoEditando({...planoEditando, materiais: novos});
                                                                        }}
                                                                        className="w-4 h-4"
                                                                    />
                                                                    <span className="text-sm flex-1">{mat}</span>
                                                                </label>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setModalConfirm({ titulo: 'Remover sugestão?', conteudo: `Remover "${mat}" das sugestões permanentemente?`, labelConfirm: 'Remover', perigo: true, onConfirm: () => {
                                                                            setMateriaisBloqueados([...materiaisBloqueados, mat]);
                                                                            if (jaAdicionado) {
                                                                                setPlanoEditando({
                                                                                    ...planoEditando,
                                                                                    materiais: planoEditando.materiais.filter(m => m !== mat)
                                                                                });
                                                                            }
                                                                        } });
                                                                    }}
                                                                    className="text-gray-400 hover:text-red-500 text-xs font-bold px-1"
                                                                    title="Remover das sugestões"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                        
                                        {/* Campo Livre para Novos Materiais */}
                                        <div>
                                            <p className="text-xs text-slate-400 mb-2">Adicionar outros:</p>
                                            <div className="flex gap-2 mb-2">
                                                <input 
                                                    type="text" 
                                                    placeholder="Ex: Pandeiro, Violão, Microfone..."
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                                            const novoMat = e.target.value.trim();
                                                            if (!planoEditando.materiais.includes(novoMat)) {
                                                                setPlanoEditando({
                                                                    ...planoEditando, 
                                                                    materiais: [...planoEditando.materiais, novoMat]
                                                                });
                                                            }
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500">Pressione Enter para adicionar</p>
                                        </div>
                                        
                                        {/* Lista de Materiais Selecionados */}
                                        {planoEditando.materiais.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-purple-300">
                                                <p className="text-xs text-slate-400 mb-2">Selecionados ({planoEditando.materiais.length}):</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {planoEditando.materiais.map((mat, idx) => (
                                                        <span key={idx} className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                                            {mat}
                                                            <button 
                                                                type="button"
                                                                onClick={() => setPlanoEditando({
                                                                    ...planoEditando, 
                                                                    materiais: planoEditando.materiais.filter((_, i) => i !== idx)
                                                                })}
                                                                className="text-slate-400 hover:text-red-500 font-bold"
                                                            >
                                                                ✕
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="border-t border-slate-100 py-5"><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">🔗 Links e Imagens</label><div className="flex gap-2 mb-3 flex-col md:flex-row"><input type="text" placeholder="URL..." value={novoRecursoUrl} onChange={e => setNovoRecursoUrl(e.target.value)} className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" /><select value={novoRecursoTipo} onChange={e => setNovoRecursoTipo(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white"><option value="link">Link</option><option value="imagem">Imagem</option></select><button type="button" onClick={adicionarRecurso} className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">Add</button></div><div className="space-y-2">{(planoEditando.recursos || []).map((rec, idx) => (<div key={idx} className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200"><div className="flex items-center gap-2 overflow-hidden"><span>{rec.tipo === 'imagem' ? '🖼️' : '🔗'}</span><span className="text-sm truncate max-w-xs text-slate-700">{rec.url}</span></div><button type="button" onClick={() => removerRecurso(idx)} className="text-red-400 hover:text-red-600 font-bold px-2">✕</button></div>))}</div></div>
                                    
                                    <div className="border-t border-slate-100 py-5"><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">📝 Avaliação / Observações</label><textarea value={planoEditando.avaliacaoObservacoes} onChange={(e) => setPlanoEditando({...planoEditando, avaliacaoObservacoes: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" rows="3" /></div>

                                    <div className="px-4 py-4 bg-white border-t border-slate-100 flex gap-3 sticky bottom-0">
                                        <button type="button" onClick={fecharModal} className="flex-1 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-sm">Cancelar</button>
                                        <button type="button" onClick={salvarPlano} className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm text-sm">💾 Salvar Plano</button>
                                    </div>
                                </div>{/* fim conteúdo */}
                            </div>{/* fim card principal */}
                        </div>{/* fim container externo */}
                        </>
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
            );
        }

        class ErrorBoundary extends React.Component {
            constructor(props) { super(props); this.state = { erro: null }; }
            static getDerivedStateFromError(e) { return { erro: e }; }
            componentDidCatch(e, info) { console.error('[MusiLab] Erro capturado pelo ErrorBoundary:', e, info); }
            render() {
                if (this.state.erro) return (
                    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-10 text-center">
                            <div className="text-6xl mb-4">⚠️</div>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">Algo deu errado</h2>
                            <p className="text-gray-500 text-sm mb-6">Seus dados estão salvos. Recarregue a página para continuar.</p>
                            <p className="text-xs text-red-400 bg-red-50 rounded-lg p-3 mb-6 text-left font-mono break-all">{this.state.erro?.message || String(this.state.erro) || 'Erro desconhecido'}</p>
                            <button onClick={() => window.location.reload()}
                                className="w-full border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 font-bold py-3 px-6 rounded-2xl transition">
                                🔄 Recarregar MusiLab
                            </button>
                        </div>
                    </div>
                );
                return this.props.children;
            }
        }

export default function App() {
  const [session, setSession] = React.useState(undefined);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="text-5xl mb-4">🎵</div>
        <p className="text-indigo-200">Carregando MusiLab...</p>
      </div>
    </div>
  );

  if (!session) return <LoginScreen />;

  return (
    <ErrorBoundary>
      <BancoPlanos session={session} />
    </ErrorBoundary>
  );
}
