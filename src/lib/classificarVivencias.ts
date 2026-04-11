// src/lib/classificarVivencias.ts
// Classificação CLASP + Orff + Conceitos via Gemini — fonte de verdade compartilhada

import type { Plano } from '../types'

export interface ClasseVivenciasResult {
    vivencias: Record<string, number>   // CLASP — intensidade 0-3
    meiosOrff: Record<string, boolean>  // Orff — presença true/false
    conceitos: string[]
}

// Lista canônica de conceitos musicais pedagógicos — única fonte de verdade
export const CONCEITOS_APROVADOS = new Set([
    'Pulsação', 'Andamento', 'Métrica', 'Compasso Binário', 'Compasso Ternário',
    'Compasso Quaternário', 'Células Rítmicas', 'Síncope', 'Ostinato', 'Polirritmia',
    'Acento Rítmico', 'Pausa', 'Subdivisão', 'Altura', 'Grave e Agudo',
    'Contorno Melódico', 'Fraseado', 'Intervalos', 'Escala', 'Escala Pentatônica',
    'Tonalidade', 'Modo', 'Afinação', 'Acorde', 'Campo Harmônico', 'Consonância',
    'Dissonância', 'Textura Musical', 'Uníssono', 'Polifonia', 'Homofonia', 'Bordão',
    'Forma AB', 'Forma ABA', 'Cânone', 'Rondó', 'Motivo', 'Frase Musical',
    'Repetição', 'Contraste', 'Variação', 'Introdução e Coda', 'Dinâmica',
    'Crescendo', 'Decrescendo', 'Articulação', 'Legato', 'Staccato', 'Timbre',
    'Caráter Musical', 'Expressão Musical', 'Respiração Diafragmática', 'Emissão Vocal',
    'Ressonância Vocal', 'Percussão Corporal', 'Coordenação Motora', 'Movimento Expressivo',
    'Improvisação', 'Composição', 'Arranjo', 'Criação Coletiva', 'Escuta Ativa',
    'Percepção Rítmica', 'Percepção Melódica', 'Análise Auditiva', 'Gênero Musical',
    'Folclore Brasileiro', 'Ciranda', 'Samba', 'Maracatu',
])

export async function classificarVivenciasPlano(plano: Plano, apiKey: string): Promise<ClasseVivenciasResult> {
    const atividades = (plano.atividadesRoteiro ?? [])
        .map((a: any) => `- ${a.nome}: ${(a.descricao ?? '').replace(/<[^>]*>/g, ' ').trim().slice(0, 200)}`)
        .filter(Boolean).join('\n')

    const prompt = `Você é especialista em educação musical. Analise o plano de aula e classifique as vivências segundo o modelo C(L)A(S)P de Keith Swanwick.

REGRA FUNDAMENTAL: o padrão é ZERO. Só atribua valor acima de 0 se houver evidência explícita e inequívoca no texto do plano. Em caso de dúvida, atribua 0.

Plano: "${(plano.titulo ?? '').slice(0, 100)}"
Objetivo: "${(plano.objetivoGeral ?? '').replace(/<[^>]*>/g, ' ').trim().slice(0, 300)}"
Atividades:
${atividades.slice(0, 800)}

Escala:
- 0: ausente ou incidental (padrão)
- 1: intencional, mas atividade de apoio (até 30% da aula)
- 2: seção estruturada e central (mais de 30% da aula)
- 3: objetivo principal declarado da aula

Dimensões — definição precisa:

tecnica [Habilidade Técnica / Skill Acquisition — dimensão de APOIO]:
Desenvolvimento de competências instrumentais/vocais cujo foco é o COMO fazer, não o comunicar. Exercícios cujo propósito é a precisão técnica, não a expressão musical.
CONTA: escalas/arpejos com foco em técnica, exercícios de embocadura/respiração/postura, leitura à primeira vista como treino procedimental, ditado rítmico com foco em precisão técnica.
NÃO CONTA: tocar uma música completa para a turma (Performance), aquecimento genérico sem objetivo técnico declarado, canto coletivo como expressão (Performance).

performance [Performance — dimensão CENTRAL]:
Realização musical com INTENÇÃO COMUNICATIVA — o aluno executa para si, para a turma ou para um público. O critério central é comunicar algo musicalmente, mesmo que a peça seja simples e o público seja só a própria turma.
CONTA: tocar/cantar uma música para a turma, apresentação em conjunto, execução de composição própria, coral, gravação de performance, roda musical coletiva.
NÃO CONTA: exercícios técnicos sem intenção de comunicar (Habilidade), criar uma peça sem executá-la (Criação).

apreciacao [Audição Ativa / Audition — dimensão CENTRAL]:
Escuta ativa e reflexiva em que o aluno responde, analisa, compara ou julga musicalmente o que ouve. Inclui movimento como resposta expressiva à escuta. Não é exposição passiva.
CONTA: identificar elementos musicais durante a escuta, comparar interpretações, mapa auditivo, descrever o que foi musicalmente comunicado, resposta corporal dirigida e estruturada à escuta, ditado melódico/rítmico com foco em percepção musical.
NÃO CONTA: música como fundo sonoro enquanto fazem outra coisa, ouvir brevemente como introdução sem atividade de resposta, mencionar "vamos ouvir" sem roteiro ou pergunta.

criacao [Composição / Composition — dimensão CENTRAL]:
Toda forma de invenção musical em que o aluno toma decisões sobre sons. Inclui composição, improvisação e arranjo. Não exige notação. O critério: o aluno está decidindo sobre o material sonoro?
CONTA: criar uma peça com instrumentos, improvisar dentro de parâmetros definidos, arranjar uma música conhecida, inventar uma melodia sobre acordes dados, composição coletiva, criar ritmos e ostinatos originais.
NÃO CONTA: tocar uma música já pronta (Performance), exercícios técnicos (Habilidade), "espaço livre" sem estrutura de processo criativo descrita.

teoria [Literatura Musical / Literature Studies — dimensão de APOIO]:
Conhecimento declarativo SOBRE música: história, musicologia, biografia de compositores, contexto cultural e social, teoria formal (notação, escalas, harmonia) como conteúdo em si, análise estilística. É um saber "sobre", não um saber "como".
CONTA: aula de história da música, ensinar leitura de partitura como conteúdo central, contexto histórico de uma obra como objetivo, teoria harmônica como conteúdo declarado, discutir gêneros e estilos musicais, análise de partitura com foco musicológico.
NÃO CONTA: mencionar o nome de uma nota incidentalmente durante a execução, usar um conceito teórico como ferramenta rápida de apoio a outra atividade (ex: "esse ritmo se chama síncope" durante o ensaio).

ARMADILHAS — avalie o PROPÓSITO PRINCIPAL, não a atividade em si:
- Ditado rítmico: é Habilidade se o foco é precisão técnica; é Audição se o foco é percepção musical
- Canto coletivo: é Performance se há intenção comunicativa; é Habilidade se é treino de afinação
- Análise de partitura: é Literatura se foco é contexto/história; é Audição se envolve escuta reflexiva da obra
- Uma atividade pode acionar mais de uma dimensão — avalie o propósito principal de cada uma

──────────────────────────────────────────────
EIXO 2 — MEIOS EXPRESSIVOS
Responde: "por quais linguagens/modalidades esta aula acontece?"
Escala: true (meio presente e intencional) / false (ausente ou meramente incidental)

fala: Fala rítmica, parlenda, recitação rítmica, poesia falada, cantiga falada, texto com ritmo.
CONTA: parlenda estruturada, recitação coletiva rítmica, trabalho com texto como material musical.
NÃO CONTA: professor falando para a turma, instrução verbal, leitura de enunciado.

canto: Voz usada como instrumento — canto melódico, coral, canção, vocalização intencional.
CONTA: cantar uma música, vocalize, cânone vocal, canção folclórica, melodia cantada.
NÃO CONTA: falar em voz alta, recitar ritmicamente sem melodia (isso é fala).

movimento: Movimento corporal ou percussão corporal como meio expressivo musical intencional.
CONTA: percussão corporal (palmas, patschen, stamping) como atividade musical, movimento expressivo estruturado.
NÃO CONTA: bater palmas apenas para marcar pulso como suporte, "alunos em pé" sem propósito de movimento.

instrumental: Uso de qualquer instrumento musical — percussão, melódico, harmônico.
CONTA: xilofone, flauta, violão, percussão simples, instrumentos de lâminas, qualquer instrumento tocado.
NÃO CONTA: instrumentos apenas mencionados no contexto teórico sem serem tocados.

danca: Dança como atividade central e intencional — coreografia, dança folclórica, dança criativa, ciranda.
CONTA: alunos dançando como atividade estruturada, coreografia com música, dança como expressão artística.
NÃO CONTA: movimento solto sem estrutura de dança, "mexer o corpo" genérico.

teatro: Teatro, dramatização, encenação, jogo teatral com música.
CONTA: cena dramatizada, teatro musical, encenação de uma história com música, jogo de personagens.
NÃO CONTA: simples roleplay informal sem estrutura cênica.

artes_visuais: Pintura, desenho, colagem, criação visual como parte integrante da aula de música.
CONTA: desenhar o que a música evoca, criar partitura gráfica, ilustrar uma música, mapa auditivo visual.
NÃO CONTA: apenas citar obras de arte sem atividade de criação ou percepção visual.

escultura: Escultura, modelagem, construção tridimensional vinculada à experiência musical.
CONTA: modelar em argila ao som de música, criar instrumentos com materiais, construir objetos sonoros.
NÃO CONTA: manuseio de materiais sem vínculo musical.

poema: Texto poético, poesia, rima, verso como material central da atividade — além da fala rítmica.
CONTA: criar poemas, analisar poesia com foco em musicalidade, letra de música como poema literário.
NÃO CONTA: parlenda rítmica sem caráter literário poético (isso é fala).

arquitetura: Arquitetura, espaço, estrutura física ou mapeamento espacial como elemento pedagógico.
CONTA: explorar acústica de espaços, mapear o som no ambiente, partitura espacial, instalação sonora.
NÃO CONTA: mencionar onde a aula acontece sem uso pedagógico do espaço.

──────────────────────────────────────────────
──────────────────────────────────────────────
EIXO 3 — CONCEITOS MUSICAIS PEDAGÓGICOS
Identifique de 1 a 4 conceitos musicais que são CENTRAIS e EXPLÍCITOS nesta aula.

REGRAS OBRIGATÓRIAS:
- Escolha SOMENTE conceitos desta lista — não invente, não use sinônimos, não use termos genéricos:
  Pulsação, Andamento, Métrica, Compasso Binário, Compasso Ternário, Compasso Quaternário, Células Rítmicas, Síncope, Ostinato, Polirritmia, Acento Rítmico, Pausa, Subdivisão, Altura, Grave e Agudo, Contorno Melódico, Fraseado, Intervalos, Escala, Escala Pentatônica, Tonalidade, Modo, Afinação, Acorde, Campo Harmônico, Consonância, Dissonância, Textura Musical, Uníssono, Polifonia, Homofonia, Bordão, Forma AB, Forma ABA, Cânone, Rondó, Motivo, Frase Musical, Repetição, Contraste, Variação, Introdução e Coda, Dinâmica, Crescendo, Decrescendo, Articulação, Legato, Staccato, Timbre, Caráter Musical, Expressão Musical, Respiração Diafragmática, Emissão Vocal, Ressonância Vocal, Percussão Corporal, Coordenação Motora, Movimento Expressivo, Improvisação, Composição, Arranjo, Criação Coletiva, Escuta Ativa, Percepção Rítmica, Percepção Melódica, Análise Auditiva, Gênero Musical, Folclore Brasileiro, Ciranda, Samba, Maracatu
- Se nenhum conceito da lista for claramente central na aula, retorne array vazio
- Máximo 4 conceitos

Responda SOMENTE com JSON válido (sem texto extra):
{"clasp":{"tecnica":0,"performance":0,"apreciacao":0,"criacao":0,"teoria":0},"orff":{"fala":false,"canto":false,"movimento":false,"instrumental":false,"danca":false,"teatro":false,"artes_visuais":false,"escultura":false,"poema":false,"arquitetura":false},"conceitos":["conceito1"]}`
    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
        )
        if (!res.ok) return { vivencias: {}, meiosOrff: {}, conceitos: [] }
        const json = await res.json()
        const raw: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
        const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/)
        if (!match) return { vivencias: {}, meiosOrff: {}, conceitos: [] }
        const result = JSON.parse(match[1] || match[0])
        const vivencias = result.clasp ?? result.vivencias ?? {}
        const meiosOrff = result.orff ?? {}
        return {
            vivencias,
            meiosOrff,
            conceitos: Array.isArray(result.conceitos)
                ? result.conceitos.filter((c: string) => CONCEITOS_APROVADOS.has(c)).slice(0, 4)
                : [],
        }
    } catch { return { vivencias: {}, meiosOrff: {}, conceitos: [] } }
}
