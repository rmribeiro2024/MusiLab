// @ts-nocheck
// BancoPlanos — provedor de contexto principal (~3300 linhas, 172 useState)
// ts-nocheck: tipagem completa será feita em refatoração futura (Fase 5+)
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
import { useModalContext, useEstrategiasContext, useRepertorioContext, useAtividadesContext, useSequenciasContext, useHistoricoContext, useAnoLetivoContext } from '../contexts'
import ErrorBoundary from './ErrorBoundary'
import { lerLS } from '../utils/helpers'
import { dbGet, dbSet, dbDel } from '../lib/db'
import { exportarPlanoPDF, exportarSequenciaPDF } from '../utils/pdf'
import ModalConfirm from './modals/ModalConfirm'
import ModalNovaEscola from './modals/ModalNovaEscola'
import ModalNovaFaixa from './modals/ModalNovaFaixa'
import ModalTemplatesRoteiro from './modals/ModalTemplatesRoteiro'
import ModalNovaMusicaInline from './modals/ModalNovaMusicaInline'
import ModalRegistroRapido from './modals/ModalRegistroRapido'
import ModalConfiguracoes from './modals/ModalConfiguracoes'
import ModalAdicionarAoPlano from './modals/ModalAdicionarAoPlano'
import ModalRegistroPosAula from './modals/ModalRegistroPosAula'
import ModalGestaoTurmas from './modals/ModalGestaoTurmas'
import ModalEventosEscolares from './modals/ModalEventosEscolares'
import ModalVincularMusica from './modals/ModalVincularMusica'
import ModalImportarAtividade from './modals/ModalImportarAtividade'
import ModalImportarMusica from './modals/ModalImportarMusica'
import ModalGradeSemanal from './modals/ModalGradeSemanal'

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
            // ── MODAL CONFIRM — lido do ModalContext (extraído na Parte 1) ──
            const { modalConfirm, setModalConfirm } = useModalContext();
            // ── ESTRATÉGIAS — lidas do EstrategiasContext (extraído na Parte 2) ──
            const {
                estrategias, setEstrategias,
                estrategiaEditando, setEstrategiaEditando,
                buscaEstrategia, setBuscaEstrategia,
                filtroCategoriaEstrategia, setFiltroCategoriaEstrategia,
                filtroFuncaoEstrategia, setFiltroFuncaoEstrategia,
                filtroObjetivoEstrategia, setFiltroObjetivoEstrategia,
                mostrarArquivadasEstrategia, setMostrarArquivadasEstrategia,
                categoriasEstrategia, setCategoriasEstrategia,
                funcoesEstrategia, setFuncoesEstrategia,
                objetivosEstrategia, setObjetivosEstrategia,
                novaCategoriaEstr, setNovaCategoriaEstr,
                novaFuncaoEstr, setNovaFuncaoEstr,
                novoObjetivoEstr, setNovoObjetivoEstr,
                novaEstrategia, salvarEstrategia, excluirEstrategia,
                arquivarEstrategia, restaurarEstrategia,
            } = useEstrategiasContext();
            // ── REPERTÓRIO — lido do RepertorioContext (extraído na Parte 3) ──
            const {
                viewMode, setViewMode,
                musicaEditando, setMusicaEditando,
                buscaEstilo, setBuscaEstilo,
                accordionAberto, setAccordionAberto,
                editandoElemento, setEditandoElemento,
                compassosCustomizados, setCompassosCustomizados,
                tonalidadesCustomizadas, setTonalidadesCustomizadas,
                andamentosCustomizados, setAndamentosCustomizados,
                escalasCustomizadas, setEscalasCustomizadas,
                estruturasCustomizadas, setEstruturasCustomizadas,
                dinamicasCustomizadas, setDinamicasCustomizadas,
                energiasCustomizadas, setEnergiasCustomizadas,
                instrumentacaoCustomizada, setInstrumentacaoCustomizada,
                repertorio, setRepertorio,
                buscaRepertorio, setBuscaRepertorio,
                filtroOrigem, setFiltroOrigem,
                filtroEstilo, setFiltroEstilo,
                filtroTonalidade, setFiltroTonalidade,
                filtroEscala, setFiltroEscala,
                filtroCompasso, setFiltroCompasso,
                filtroAndamento, setFiltroAndamento,
                filtroEstrutura, setFiltroEstrutura,
                filtroEnergia, setFiltroEnergia,
                filtroInstrumentacao, setFiltroInstrumentacao,
                filtroDinamica, setFiltroDinamica,
            } = useRepertorioContext();
            // ── ATIVIDADES — lido do AtividadesContext (extraído na Parte 4) ──
            const {
                atividades, setAtividades,
                atividadeEditando, setAtividadeEditando,
                novoRecursoUrlAtiv, setNovoRecursoUrlAtiv,
                novoRecursoTipoAtiv, setNovoRecursoTipoAtiv,
                filtroTagAtividade, setFiltroTagAtividade,
                filtroFaixaAtividade, setFiltroFaixaAtividade,
                filtroConceitoAtividade, setFiltroConceitoAtividade,
                buscaAtividade, setBuscaAtividade,
                modalAdicionarAoPlano, setModalAdicionarAoPlano,
                modoVisAtividades, setModoVisAtividades,
                atividadeVinculandoMusica, setAtividadeVinculandoMusica,
                pendingAtividadeId, setPendingAtividadeId,
                modalNovaMusicaInline, setModalNovaMusicaInline,
                novaMusicaInline, setNovaMusicaInline,
                novaAtividade, salvarAtividade, excluirAtividade,
                adicionarRecursoAtiv, removerRecursoAtiv,
            } = useAtividadesContext();
            // ── SEQUÊNCIAS — lido do SequenciasContext (extraído na Parte 5) ──
            const {
                sequencias, setSequencias,
                sequenciaEditando, setSequenciaEditando,
                sequenciaDetalhe, setSequenciaDetalhe,
                filtroEscolaSequencias, setFiltroEscolaSequencias,
                filtroUnidadeSequencias, setFiltroUnidadeSequencias,
                filtroPeriodoSequencias, setFiltroPeriodoSequencias,
                buscaProfundaSequencias, setBuscaProfundaSequencias,
                modalVincularPlano, setModalVincularPlano,
                buscaPlanoVinculo, setBuscaPlanoVinculo,
                novaSequencia: _novaSequencia, salvarSequencia, excluirSequencia,
                vincularPlanoAoSlot, atualizarRascunhoSlot, desvincularPlano,
            } = useSequenciasContext();
            // novaSequencia precisa de anosLetivos — wrapper definido após anosLetivos
            // ── HISTÓRICO — lido do HistoricoContext (extraído na Parte 5) ──
            const {
                hmFiltroTurma, setHmFiltroTurma,
                hmFiltroInicio, setHmFiltroInicio,
                hmFiltroFim, setHmFiltroFim,
                hmFiltroBusca, setHmFiltroBusca,
                hmModalMusica, setHmModalMusica,
            } = useHistoricoContext();
            // ── ANO LETIVO — lido do AnoLetivoContext (extraído na Parte 6) ──
            const {
                anosLetivos, setAnosLetivos,
                eventosEscolares, setEventosEscolares,
                planejamentoAnual, setPlanejamentoAnual,
                anoPlanoAtivoId, setAnoPlanoAtivoId,
                mostrandoFormNovoAno, setMostrandoFormNovoAno,
                formNovoAno, setFormNovoAno,
                periodoExpId, setPeriodoExpId,
                periodoEditForm, setPeriodoEditForm,
                adicionandoPeriodoAno, setAdicionandoPeriodoAno,
                formNovoPeriodo, setFormNovoPeriodo,
                conceitos, setConceitos,
                unidades, setUnidades,
                faixas, setFaixas,
                tagsGlobais, setTagsGlobais,
                modalTurmas, setModalTurmas,
                anoLetivoSelecionadoModal, setAnoLetivoSelecionadoModal,
                gtAnoNovo, setGtAnoNovo,
                gtAnoSel, setGtAnoSel,
                gtEscolaNome, setGtEscolaNome,
                gtEscolaSel, setGtEscolaSel,
                gtSegmentoNome, setGtSegmentoNome,
                gtSegmentoSel, setGtSegmentoSel,
                gtTurmaNome, setGtTurmaNome,
                mostrarArquivados, setMostrarArquivados,
                modalNovaEscola, setModalNovaEscola,
                novaEscolaNome, setNovaEscolaNome,
                novaEscolaAnoId, setNovaEscolaAnoId,
                modalNovaFaixa, setModalNovaFaixa,
                novaFaixaNome, setNovaFaixaNome,
                criarAnoLetivoPainel, excluirAnoPlano,
                adicionarPeriodoNoAno, salvarEdicaoPeriodo, excluirPeriodoDoAno,
                adicionarMetaNoAno, excluirMetaDoAno,
            } = useAnoLetivoContext();
            // ============================================================
            // FUNÇÕES: UTILITÁRIOS GERAIS
            // ============================================================
            
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
                const saved = dbGet('planosAula');
                const parsed = saved ? JSON.parse(saved) : planosIniciais;
                return parsed.map(normalizePlano);
            });

            // ============================================================
            // MÓDULO: ATIVIDADES
            // ============================================================
            // Estados para Atividades — migrados para AtividadesContext (Parte 4)
            // const [atividades, setAtividades] = useState(...)
            // const [atividadeEditando, setAtividadeEditando] = useState(null)
            // const [novoRecursoUrlAtiv, setNovoRecursoUrlAtiv] = useState('')
            // const [novoRecursoTipoAtiv, setNovoRecursoTipoAtiv] = useState('link')
            // const [filtroTagAtividade, setFiltroTagAtividade] = useState('Todas')
            // const [filtroFaixaAtividade, setFiltroFaixaAtividade] = useState('Todas')
            // const [filtroConceitoAtividade, setFiltroConceitoAtividade] = useState('Todos')
            // const [buscaAtividade, setBuscaAtividade] = useState('')
            // const [modalAdicionarAoPlano, setModalAdicionarAoPlano] = useState(null)
            // const [modoVisAtividades, setModoVisAtividades] = useState('grade')

            // ============================================================
            // MÓDULO: EVENTOS ESCOLARES E FERIADOS
            // ============================================================
            // eventosEscolares, setEventosEscolares — migrados para AnoLetivoContext (Parte 6)
            const [modalEventos, setModalEventos] = useState(false);
            const [eventoEditando, setEventoEditando] = useState(null);
            const [ocultarFeriados, setOcultarFeriados] = useState(() => {
                const saved = dbGet('ocultarFeriados');
                return saved === 'true';
            });

            // ============================================================
            // MÓDULO: SEQUÊNCIAS DIDÁTICAS — migrado para SequenciasContext (Parte 5)
            // ============================================================
            // const [sequencias, setSequencias] = useState(...)
            // const [sequenciaEditando, setSequenciaEditando] = useState(null)
            // const [sequenciaDetalhe, setSequenciaDetalhe] = useState(null)
            // const [filtroEscolaSequencias, setFiltroEscolaSequencias] = useState('Todas')
            // const [filtroUnidadeSequencias, setFiltroUnidadeSequencias] = useState('Todas')
            // const [filtroPeriodoSequencias, setFiltroPeriodoSequencias] = useState('Todos')
            // const [buscaProfundaSequencias, setBuscaProfundaSequencias] = useState('')
            // const [modalVincularPlano, setModalVincularPlano] = useState(null)
            // const [buscaPlanoVinculo, setBuscaPlanoVinculo] = useState('')

            // ============================================================
            // MÓDULO: ESTRATÉGIAS PEDAGÓGICAS — movido para EstrategiasContext (Parte 2)
            // ============================================================
            // Estado e funções acessíveis via useEstrategiasContext() — ver linha ~196

            // ============================================================
            // MÓDULO: PLANEJAMENTO ANUAL
            // ============================================================
            // MÓDULO: PLANEJAMENTO ANUAL — migrado para AnoLetivoContext (Parte 6)
            // ============================================================
            // planejamentoAnual, setPlanejamentoAnual — via useAnoLetivoContext()
            // anoPlanoAtivoId, setAnoPlanoAtivoId — via useAnoLetivoContext()
            // mostrandoFormNovoAno, setMostrandoFormNovoAno — via useAnoLetivoContext()
            // formNovoAno, setFormNovoAno — via useAnoLetivoContext()
            // periodoExpId, setPeriodoExpId — via useAnoLetivoContext()
            // periodoEditForm, setPeriodoEditForm — via useAnoLetivoContext()
            // adicionandoPeriodoAno, setAdicionandoPeriodoAno — via useAnoLetivoContext()
            // formNovoPeriodo, setFormNovoPeriodo — via useAnoLetivoContext()

            // ============================================================
            // MÓDULO: CURRÍCULO — migrado para AnoLetivoContext (Parte 6)
            // ============================================================
            // conceitos, setConceitos — via useAnoLetivoContext()
            // unidades, setUnidades — via useAnoLetivoContext()
            
            // ============================================================
            // MÓDULO: TAGS GLOBAIS — migrado para AnoLetivoContext (Parte 6)
            // ============================================================
            // tagsGlobais, setTagsGlobais — via useAnoLetivoContext()
            // dbSet('tagsGlobais') — gerenciado em AnoLetivoContext

            // Salvar estratégias — movido para EstrategiasContext (Parte 2)

            // dbSet('planejamentoAnual') e dbSet('anoPlanoAtivoId') — gerenciados em AnoLetivoContext (Parte 6)

            // ============================================================
            // MÓDULO: ESTRUTURA HIERÁRQUICA DE TURMAS — migrado para AnoLetivoContext (Parte 6)
            // ============================================================
            // anosLetivos, setAnosLetivos — via useAnoLetivoContext()

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
            const [darkMode, setDarkMode] = useState(() => dbGet('darkMode') === 'true');

            // ============================================================
            // MÓDULO: HISTÓRICO MUSICAL DA TURMA — migrado para HistoricoContext (Parte 5)
            // ============================================================
            // const [hmFiltroTurma, setHmFiltroTurma] = useState('')
            // const [hmFiltroInicio, setHmFiltroInicio] = useState('')
            // const [hmFiltroFim, setHmFiltroFim] = useState('')
            // const [hmFiltroBusca, setHmFiltroBusca] = useState('')
            // const [hmModalMusica, setHmModalMusica] = useState(null)
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
                dbSet('darkMode', darkMode);
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
            // atividadeVinculandoMusica migrado para AtividadesContext (Parte 4)
            // const [atividadeVinculandoMusica, setAtividadeVinculandoMusica] = useState(null);
            const [filtroFavorito, setFiltroFavorito] = useState(false);
            const [filtroStatus, setFiltroStatus] = useState("Todos"); // A Fazer | Em Andamento | Concluído
            const [modoVisualizacao, setModoVisualizacao] = useState('grade');
            const [ordenacaoCards, setOrdenacaoCards] = useState('recente'); // recente | az | status | favoritos
            const [statusDropdownId, setStatusDropdownId] = useState(null); // #7: id do plano com dropdown aberto
            // modalConfirm e setModalConfirm vêm de useModalContext() — ver linha ~196

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
                const saved = dbGet('materiaisBloqueados');
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
                const saved = dbGet('gradesSemanas');
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
                const saved = dbGet('templatesRoteiro');
                return saved ? JSON.parse(saved) : [];
            });
            React.useEffect(() => {
                dbSet('templatesRoteiro', JSON.stringify(templatesRoteiro));
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
            // MÓDULO: GESTÃO DE TURMAS — migrado para AnoLetivoContext (Parte 6)
            // ============================================================
            // modalTurmas, anoLetivoSelecionadoModal, gtAnoNovo, gtAnoSel,
            // gtEscolaNome, gtEscolaSel, gtSegmentoNome, gtSegmentoSel,
            // gtTurmaNome, mostrarArquivados — via useAnoLetivoContext()
            
            // ============================================================
            // MÓDULO: NOVA ESCOLA — migrado para AnoLetivoContext (Parte 6)
            // ============================================================
            // modalNovaEscola, novaEscolaNome, novaEscolaAnoId — via useAnoLetivoContext()

            // ============================================================
            // MÓDULO: FAIXAS ETÁRIAS — migrado para AnoLetivoContext (Parte 6)
            // ============================================================
            // faixas, setFaixas — via useAnoLetivoContext()
            // ============================================================
            // MÓDULO: CONFIGURAÇÕES E MODAIS
            // ============================================================
            // modalNovaFaixa, novaFaixaNome — migrados para AnoLetivoContext (Parte 6)
            const [modalConfiguracoes, setModalConfiguracoes] = useState(false);
            // pendingAtividadeId, modalNovaMusicaInline, novaMusicaInline — migrados para AtividadesContext (Parte 4)
            // const [pendingAtividadeId, setPendingAtividadeId] = useState(null);
            // const [modalNovaMusicaInline, setModalNovaMusicaInline] = useState(false);
            // const [novaMusicaInline, setNovaMusicaInline] = useState({ titulo: '', autor: '', origem: '', observacoes: '' });
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
                        // estrategias carregada em EstrategiasContext (Parte 2)
                        // repertorio carregado em RepertorioContext (Parte 3)
                        const [planosC, gradesC, cfg] = await Promise.all([
                            loadFromSupabase('planos', userId),
                            // atividades removido — carregado em AtividadesContext (Parte 4)
                            // sequencias removido — carregado em SequenciasContext (Parte 5)
                            // anos_letivos removido — carregado em AnoLetivoContext (Parte 6)
                            // eventos_escolares removido — carregado em AnoLetivoContext (Parte 6)
                            // planejamento_anual removido — carregado em AnoLetivoContext (Parte 6)
                            loadFromSupabase('grades_semanas', userId),
                            loadConfiguracoes(userId)
                        ]);

                        // Supabase sempre prevalece sobre localStorage quando retorna dados
                        if (planosC !== null) setPlanos(planosC.length > 0 ? planosC.map(normalizePlano) : []);
                        // atividadesC removido — carregado em AtividadesContext (Parte 4)
                        // repertorioC removido — carregado em RepertorioContext (Parte 3)
                        // sequenciasC removido — carregado em SequenciasContext (Parte 5)
                        // anosC removido — carregado em AnoLetivoContext (Parte 6)
                        if (gradesC !== null) setGradesSemanas(gradesC.length > 0 ? gradesC : []);
                        // eventosC removido — carregado em AnoLetivoContext (Parte 6)
                        // estratégiasC removido — carregado em EstrategiasContext (Parte 2)
                        // planejamentoAnualC removido — carregado em AnoLetivoContext (Parte 6)
                        if (cfg) {
                            // conceitos/unidades/faixas/tagsGlobais removidos — carregados em AnoLetivoContext (Parte 6)
                            if(cfg.templatesRoteiro) setTemplatesRoteiro(cfg.templatesRoteiro);
                            // Opções customizadas de repertório — setters agora vêm do RepertorioContext (Parte 3)
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
                        if (planosC !== null) dbSet('planosAula', JSON.stringify(planosC));
                        // repertorio dbSet removido — gerenciado em RepertorioContext (Parte 3)
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
                    // atividades: sync movido para AtividadesContext (Parte 4)
                    // repertorio: sync movido para RepertorioContext (Parte 3)
                    // sequencias: sync movido para SequenciasContext (Parte 5)
                    // anos_letivos: sync movido para AnoLetivoContext (Parte 6)
                    grades_semanas: gradesSemanas,
                    // eventos_escolares: sync movido para AnoLetivoContext (Parte 6)
                    // estrategias: sync movido para EstrategiasContext (Parte 2)
                    // planejamento_anual: sync movido para AnoLetivoContext (Parte 6)
                };
                const prev = _prevSyncData.current;
                _prevSyncData.current = atual;
                if (!prev) return; // primeira execução após carga — evita regravar tudo
                Object.entries(atual).forEach(([tabela, dados]) => {
                    if (dados !== prev[tabela]) {
                        syncDelay(tabela, () => syncToSupabase(tabela, dados, userId, onSyncStatus));
                    }
                });
            }, [planos, gradesSemanas]); // anos_letivos/eventos_escolares/planejamento_anual removidos — sync em AnoLetivoContext (Parte 6) — sync em AtividadesContext/SequenciasContext (Partes 4/5)
            useEffect(() => {
                if(!userId||!dadosCarregados) return;
                // conceitos, unidades, faixas, tagsGlobais removidos — sincronizados em AnoLetivoContext (Parte 6)
                syncDelay('cfg', ()=>syncConfiguracoes({ templatesRoteiro, compassosCustomizados, tonalidadesCustomizadas, andamentosCustomizados, escalasCustomizadas, estruturasCustomizadas, dinamicasCustomizadas, energiasCustomizadas, instrumentacaoCustomizada }, userId, onSyncStatus));
            }, [templatesRoteiro, compassosCustomizados, tonalidadesCustomizadas, andamentosCustomizados, escalasCustomizadas, estruturasCustomizadas, dinamicasCustomizadas, energiasCustomizadas, instrumentacaoCustomizada]);

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
                        CHAVES_LOCALSTORAGE.forEach(chave => dbDel(chave));
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
                dbSet('planosAula', JSON.stringify(planos));
                triggerSalvo();
            }, [planos]);
            
            useEffect(() => {
                dbSet('materiaisBloqueados', JSON.stringify(materiaisBloqueados));
            }, [materiaisBloqueados]);

            useEffect(() => { dbSet('conceitosPersonalizados', JSON.stringify(conceitos)); triggerSalvo(); }, [conceitos]);
            useEffect(() => { dbSet('unidadesPersonalizadas', JSON.stringify(unidades)); triggerSalvo(); }, [unidades]);
            useEffect(() => { dbSet('anosLetivos', JSON.stringify(anosLetivos)); triggerSalvo(); }, [anosLetivos]);
            useEffect(() => { dbSet('faixasEtarias', JSON.stringify(faixas)); triggerSalvo(); }, [faixas]);
            useEffect(() => { dbSet('gradesSemanas', JSON.stringify(gradesSemanas)); triggerSalvo(); }, [gradesSemanas]);
            // atividades dbSet movido para AtividadesContext (Parte 4)
            // useEffect(() => { dbSet('atividades', JSON.stringify(atividades)); triggerSalvo(); }, [atividades]);
            useEffect(() => { dbSet('eventosEscolares', JSON.stringify(eventosEscolares)); triggerSalvo(); }, [eventosEscolares]);
            // sequencias dbSet movido para SequenciasContext (Parte 5)
            // useEffect(() => { dbSet('sequenciasDidaticas', JSON.stringify(sequencias)); triggerSalvo(); }, [sequencias]);
            useEffect(() => { dbSet('ocultarFeriados', ocultarFeriados); }, [ocultarFeriados]);
            // repertorio dbSet movido para RepertorioContext (Parte 3) — lá é gerenciado com triggerSalvo via ctx bridge

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
            
            // adicionarRecursoAtiv / removerRecursoAtiv — migrados para AtividadesContext (Parte 4)
            // const adicionarRecursoAtiv = () => { ... };
            // const removerRecursoAtiv = (idx) => { ... };
            
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
                        dbSet('repertorio', JSON.stringify(novoRepertorio));
                        
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
                    dbSet('repertorio', JSON.stringify(novoRepertorio));
                    
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
                dbSet('repertorio', JSON.stringify(novoRepertorio));
                
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
                        dbSet('repertorio', JSON.stringify(novoRepertorio));
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

            // --- FUNÇÕES SEQUÊNCIAS DIDÁTICAS — migradas para SequenciasContext (Parte 5) ---
            // ============================================================
            // FUNÇÕES: SEQUÊNCIAS
            // ============================================================
            // novaSequencia precisa de anosLetivos — wrapper local que passa o array
            const novaSequencia = () => _novaSequencia(anosLetivos);
            // salvarSequencia, excluirSequencia, vincularPlanoAoSlot,
            // atualizarRascunhoSlot, desvincularPlano — vêm de useSequenciasContext()
            // gerarSlots — encapsulado em SequenciasContext

            // --- FUNÇÕES BANCO DE ATIVIDADES ---
            // ============================================================
            // FUNÇÕES: ATIVIDADES — migradas para AtividadesContext (Parte 4)
            // novaAtividade, salvarAtividade, excluirAtividade, adicionarRecursoAtiv, removerRecursoAtiv
            // vêm de useAtividadesContext() — ver bloco de destructuring acima
            // ============================================================

                        // ── MEU ANO LETIVO: CRUD — migrado para AnoLetivoContext (Parte 6) ──
            // _atualizarAnoPlano, criarAnoLetivoPainel, excluirAnoPlano,
            // adicionarPeriodoNoAno, salvarEdicaoPeriodo, excluirPeriodoDoAno,
            // adicionarMetaNoAno, excluirMetaDoAno — disponíveis via useAnoLetivoContext()

            // ── ESTRATÉGIAS: CRUD — movido para EstrategiasContext (Parte 2) ──
            // novaEstrategia, salvarEstrategia, excluirEstrategia, arquivarEstrategia, restaurarEstrategia
            // disponíveis via useEstrategiasContext() — ver linha ~196

            // ============================================================
            // FUNÇÕES: ATIVIDADES — SALVAR / EXCLUIR
            // ============================================================
            // salvarAtividade e excluirAtividade migradas para AtividadesContext (Parte 4)
            // const salvarAtividade = () => { ... };
            // const excluirAtividade = useCallback((id) => { ... }, []);

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
        atividadeVinculandoMusica,
        atividades,
        atualizarAtividadeRoteiro,
        atualizarAulaGrade,
        atualizarRascunhoSlot,
        baixarBackup,
        busca,
        buscaAtividade,
        buscaAvancada,
        buscaEstilo,
        buscaEstrategia,
        buscaPlanoVinculo,
        buscaProfundaSequencias,
        buscaRegistros,
        buscaRepertorio,
        calcularPascoa,
        categoriasEstrategia,
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
        handleDragEnd,
        handleDragEnter,
        handleDragStart,
        hmFiltroBusca,
        hmFiltroFim,
        hmFiltroInicio,
        hmFiltroTurma,
        hmModalMusica,
        importarAtividadeParaPlano,
        importarMusicaParaPlano,
        instrumentacaoCustomizada,
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
        modalTemplates,
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
        niveis,
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
        objetivosEstrategia,
        obterTurmasDoDia,
        ocultarFeriados,
        onSyncStatus,
        ordenacaoCards,
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
        recursosExpandidos,
        regAnoSel,
        regEscolaSel,
        regSegmentoSel,
        regTurmaSel,
        registroEditando,
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
        timeoutSalvamento,
        toggleConceito,
        toggleFaixa,
        toggleFavorito,
        toggleRecursosAtiv,
        toggleUnidade,
        tonalidadesCustomizadas,
        todasAsTags,
        triggerSalvo,
        unidades,
        userId,
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















                    <ModalConfiguracoes />
                    <ModalRegistroPosAula />
                    <ModalGestaoTurmas />
                    <ModalEventosEscolares />
                    <ModalVincularMusica />
                    <ModalImportarAtividade />
                    <ModalImportarMusica />
                    <ModalGradeSemanal />
                    <ModalAdicionarAoPlano />
                    <ModalRegistroRapido />
                    <ModalNovaMusicaInline />
                    <ModalTemplatesRoteiro />
                    <ModalNovaFaixa />
                    {/* ── MODAL NOVA ESCOLA ── */}
                    <ModalNovaEscola />

                    {/* ── MODAL DE CONFIRMAÇÃO GLOBAL ── */}
                    <ModalConfirm />
                </div>
                </BancoPlanosContext.Provider>
            );
}
