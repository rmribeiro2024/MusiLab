import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import type { Plano, AtividadeRoteiro, RecursoItem, VinculoMusicaPlano, RegistroPosAula } from '../types'
import { gerarIdSeguro } from '../lib/utils'
import { showToast } from '../lib/toast'
import { BNCC_MUSICA, buscarBNCC, extrairCodigo } from '../lib/bnccMusica'
import { agruparPorCategoria } from '../lib/taxonomia'
import CardAtividadeRoteiro from './CardAtividadeRoteiro'
import TipTapEditor, { FloatingPlayer } from './TipTapEditor'
import { useBancoPainel } from '../hooks/useBancoPainel'
import { useBancoPlanos } from './BancoPlanosContext'
import {
  useAtividadesContext,
  useRepertorioContext,
  useEstrategiasContext,
  useModalContext,
} from '../contexts'

// ─────────────────────────────────────────────────────────────────────────────
// Helper: plano vazio
// ─────────────────────────────────────────────────────────────────────────────
function buildEmptyPlano(overrides: Partial<Plano> = {}): Plano {
  return {
    id: gerarIdSeguro(),
    titulo: '',
    nivel: '',
    duracao: '',
    objetivosEspecificos: [],
    conceitos: [],
    tags: [],
    unidades: [],
    faixaEtaria: [],
    materiais: [],
    habilidadesBNCC: [],
    recursos: [],
    historicoDatas: [],
    atividadesRoteiro: [],
    registrosPosAula: [],
    destaque: false,
    statusPlanejamento: 'A Fazer',
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MusicaCardComPlayer (idêntico ao de TelaPrincipal)
// ─────────────────────────────────────────────────────────────────────────────
function MusicaCardComPlayer({ v, onRemover, getYoutubeId }: {
  v: VinculoMusicaPlano
  onRemover: () => void
  getYoutubeId: (url: string) => string | null
}) {
  const [player, setPlayer] = useState<{ url: string; title: string; kind: 'youtube' | 'spotify' } | null>(null)
  if (!v.url) return null
  const ytId = getYoutubeId(v.url)
  const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null
  const isSpotify = /spotify\.com/i.test(v.url)
  const mediaKind: 'youtube' | 'spotify' | null = ytId ? 'youtube' : isSpotify ? 'spotify' : null
  const displayTitle = (v.titulo === '▶ Link YouTube' || v.titulo === '🎵 Link Spotify') ? '' : v.titulo
  return (
    <>
      <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-[#374151] bg-slate-50 dark:bg-white/[0.03]">
        <div className="relative w-14 h-9 shrink-0 flex items-center justify-center rounded-lg overflow-hidden bg-slate-200 dark:bg-white/10">
          <span className="text-lg leading-none">{ytId ? '▶' : '🎵'}</span>
          {thumbUrl && <img src={thumbUrl} alt="" className="absolute inset-0 w-full h-full object-cover rounded-lg" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-700 dark:text-[#D1D5DB] truncate font-medium">
            {displayTitle || (ytId ? 'YouTube' : 'Spotify')}
          </p>
        </div>
        {mediaKind && (
          <button type="button"
            onClick={() => setPlayer({ url: v.url!, title: displayTitle || (ytId ? 'YouTube' : 'Spotify'), kind: mediaKind })}
            className="shrink-0 text-[11px] font-semibold text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition">
            {ytId ? '▶ Abrir' : '▶ Player'}
          </button>
        )}
        <button type="button" onClick={onRemover} className="text-slate-300 hover:text-red-500 transition shrink-0 text-xs">✕</button>
      </div>
      {player && (
        <FloatingPlayer url={player.url} title={player.title} kind={player.kind} onClose={() => setPlayer(null)} />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ModalConceitosPlano (idêntico ao de TelaPrincipal)
// ─────────────────────────────────────────────────────────────────────────────
function ModalConceitosPlano({ conceitos, onConfirmar, onFechar }: {
  conceitos: string[]
  onConfirmar: (c: string[]) => void
  onFechar: () => void
}) {
  const [draft, setDraft] = useState<string[]>([...conceitos])
  const [novo, setNovo] = useState('')
  const adicionar = () => {
    const v = novo.trim(); if (!v) return
    setDraft(p => [...new Set([...p, v])]); setNovo('')
  }
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onFechar() }}>
      <div className="bg-white dark:bg-[#1F2937] rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#374151] flex-shrink-0">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Conceitos da aula</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Detectados pela IA — revise antes de aplicar</p>
          </div>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 text-base leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {draft.length === 0
            ? <p className="text-[11px] text-slate-400 italic">Nenhum conceito identificado — adicione manualmente.</p>
            : Object.entries(agruparPorCategoria(draft)).map(([cat, cs]) => (
              <div key={cat}>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-1">{cat}</p>
                <div className="flex flex-wrap gap-1.5">
                  {cs.map(c => (
                    <span key={c} className="inline-flex items-center gap-1 bg-purple-50 text-purple-600 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                      {c}
                      <button type="button" onClick={() => setDraft(p => p.filter(x => x !== c))} className="hover:text-rose-500 leading-none ml-0.5">×</button>
                    </span>
                  ))}
                </div>
              </div>
            ))
          }
          <div className="flex gap-1.5 pt-1">
            <input type="text" value={novo} onChange={e => setNovo(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionar() } }}
              placeholder="+ Adicionar conceito"
              className="flex-1 border border-slate-200 dark:border-[#374151] rounded-lg px-2.5 py-1.5 text-[11px] bg-white dark:bg-[var(--v2-card)] dark:text-white focus:border-indigo-400 outline-none" />
            <button type="button" onClick={adicionar} disabled={!novo.trim()}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg disabled:opacity-40">
              Add
            </button>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 dark:border-[#374151] flex gap-2 flex-shrink-0">
          <button type="button" onClick={onFechar}
            className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-50 transition">
            Ignorar
          </button>
          <button type="button" onClick={() => onConfirmar(draft)}
            className="flex-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3 py-2 font-medium transition">
            ✓ Aplicar conceitos
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de recursos
// ─────────────────────────────────────────────────────────────────────────────
function detectarTipoRecurso(url: string): string {
  if (!url) return 'link'
  if (/youtube\.com|youtu\.be/.test(url)) return 'video'
  if (/spotify\.com\/playlist/.test(url)) return 'playlist'
  if (/spotify\.com/.test(url)) return 'musica'
  if (/drive\.google\.com|docs\.google\.com/.test(url)) return 'drive'
  if (/\.pdf(\?|$)/i.test(url)) return 'pdf'
  if (/\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(url)) return 'imagem'
  if (/gstatic\.com|googleusercontent\.com|imgur\.com|i\.pinimg\.com/.test(url)) return 'imagem'
  return 'link'
}
function getYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/shorts\/))([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}
const RECURSO_TIPOS = [
  { value: 'musica', label: 'Música', icone: '🎵' },
  { value: 'video', label: 'Vídeo', icone: '▶️' },
  { value: 'pdf', label: 'PDF / Partitura', icone: '📄' },
  { value: 'drive', label: 'Google Drive', icone: '📁' },
  { value: 'imagem', label: 'Imagem', icone: '🖼️' },
  { value: 'link', label: 'Link externo', icone: '🔗' },
  { value: 'playlist', label: 'Playlist', icone: '🎶' },
]
function getRecursoMeta(tipo: string): { label: string; icone: string; cor: string } {
  const t = tipo === 'youtube' ? 'video' : tipo === 'spotify' ? 'musica' : tipo
  const found = RECURSO_TIPOS.find(r => r.value === t)
  const icone = found?.icone ?? '🔗'
  const label = found?.label ?? 'Link'
  const cor =
    t === 'musica' ? 'bg-green-50 border-green-100 text-green-700' :
    t === 'video' ? 'bg-red-50 border-red-100 text-red-600' :
    t === 'pdf' ? 'bg-orange-50 border-orange-100 text-orange-600' :
    t === 'drive' ? 'bg-blue-50 border-blue-100 text-blue-600' :
    t === 'imagem' ? 'bg-violet-50 border-violet-100 text-violet-600' :
    t === 'playlist' ? 'bg-teal-50 border-teal-100 text-teal-700' :
    'bg-slate-50 border-slate-100 text-slate-500'
  return { label, icone, cor }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini helpers — usados localmente (sem PlanosContext)
// ─────────────────────────────────────────────────────────────────────────────
async function geminiPost(prompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('API key ausente')
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const parts: Array<{ text?: string; thought?: boolean }> = json?.candidates?.[0]?.content?.parts ?? []
  return parts.find(p => !p.thought)?.text ?? ''
}

async function analisarConceitosAtividade(nome: string, descricaoHtml: string): Promise<string[]> {
  const texto = descricaoHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  if (texto.length < 10) return []
  const prompt = `Você é especialista em pedagogia musical. Analise a atividade abaixo e identifique os conceitos musicais pedagógicos presentes.

Atividade: "${nome}"
Descrição: "${texto.slice(0, 600)}"

Use APENAS conceitos destas categorias:
1. Parâmetros Físicos do Som: Altura, Duração, Intensidade, Timbre
2. Ritmo e Organização Temporal: Pulsação, Andamento, Métrica, Células Rítmicas, Síncope, Ostinato
3. Melodia e Alturas: Fraseado, Contorno, Escalas, Intervalos, Tonalidade
4. Harmonia e Textura: Acordes, Campo Harmônico, Consonância, Textura, Densidade
5. Estrutura e Forma: Motivo, Frase, Período, Formas (AB, ABA, Rondó, Sonata)
6. Dinâmica e Expressividade: Crescendo, Articulação, Caráter
7. Processos Criativos e Ações: Criação, Execução, Apreciação, Escuta ativa
8. Movimento e Corpo: Espaço, Peso, Fluência, Percussão Corporal, Coordenação Motora
9. Contexto e Cultura: Gêneros, História, Etnomusicologia
10. Tecnologia Musical: Áudio, MIDI, Software

Retorne máximo 5 conceitos. Responda APENAS com JSON: {"conceitos": ["conceito1"]}
Se não identificar nenhum, retorne: {"conceitos": []}`
  try {
    const raw = await geminiPost(prompt)
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/)
    if (!match) return []
    const result = JSON.parse(match[1] || match[0])
    return Array.isArray(result.conceitos) ? result.conceitos : []
  } catch { return [] }
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface FormularioAulaPlenaProps {
  initialPlano: Partial<Plano>
  modo: 'adaptar' | 'importar' | 'criar'
  ultimoRegistro?: RegistroPosAula | null
  turmaNome?: string
  dataPrevista?: string
  onSalvar: (plano: Plano) => void
  onCancelar: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export default function FormularioAulaPlena({
  initialPlano,
  modo,
  ultimoRegistro,
  turmaNome,
  dataPrevista,
  onSalvar,
  onCancelar,
}: FormularioAulaPlenaProps) {
  const { atividades: bancoAtividades, setAtividades: setBancoAtividades } = useAtividadesContext()
  const { repertorio } = useRepertorioContext()
  const { estrategias, adicionarEstrategiaRapida } = useEstrategiasContext()
  const { setModalConfirm } = useModalContext()
  const { setAtividadeVinculandoMusica } = useAtividadesContext()
  const { setModalTemplates } = useBancoPlanos()

  // ── Plano local ──
  const [plano, setPlano] = useState<Plano>(() => buildEmptyPlano(initialPlano))

  // ── Modo do formulário ⚡📋🔬 ──
  const [modoForm, setModoForm] = useState<'rapido' | 'completo' | 'detalhado'>('completo')
  const modoRapido = modoForm === 'rapido'
  const modoDetalhado = modoForm === 'detalhado'

  // ── Accordion ──
  const [secoesForm, setSecoesForm] = useState<Set<string>>(() => new Set(['roteiro']))
  const {
    open: bancoPanelOpen,
    tab: bancoPanelTab,
    toggle: toggleBancoPainel,
    setOpen: setBancoPanelOpen,
    changeTab: setBancoPanelTab,
    busca: bancoPanelBusca,
    setBusca: setBancoPanelBusca,
  } = useBancoPainel()

  function toggleSecaoForm(id: string) {
    setSecoesForm(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        if (id === 'roteiro') setBancoPanelOpen(false)
      } else {
        next.add(id)
      }
      return next
    })
    if (id !== 'roteiro') setBancoPanelOpen(false)
  }

  // ── Contexto da Aula Anterior (só adaptar) ──
  const [contextoAulaAnterior, setContextoAulaAnterior] = useState(
    initialPlano.contextoAulaAnterior ?? ''
  )
  const [gerandoContexto, setGerandoContexto] = useState(false)

  async function gerarContextoIA() {
    if (!ultimoRegistro) return
    setGerandoContexto(true)
    try {
      const campos: string[] = []
      if (ultimoRegistro.resumoAula) campos.push(`Resumo: ${ultimoRegistro.resumoAula}`)
      if (ultimoRegistro.funcionouBem) campos.push(`O que funcionou: ${ultimoRegistro.funcionouBem}`)
      if (ultimoRegistro.fariadiferente) campos.push(`O que faria diferente: ${ultimoRegistro.fariadiferente}`)
      if (ultimoRegistro.poderiaMelhorar) campos.push(`Poderia melhorar: ${ultimoRegistro.poderiaMelhorar}`)
      if (ultimoRegistro.proximaAula) campos.push(`Ideia para próxima aula: ${ultimoRegistro.proximaAula}`)
      const encaminhamentos = (ultimoRegistro as any)?.encaminhamentos as { texto: string; concluido: boolean }[] | undefined
      const pendentes = encaminhamentos?.filter(e => !e.concluido)
      if (pendentes?.length) campos.push(`Encaminhamentos pendentes: ${pendentes.map(e => e.texto).join('; ')}`)

      if (campos.length === 0) {
        showToast('Nenhum dado da aula anterior para resumir.', 'error'); return
      }
      const prompt = `Você é um assistente pedagógico para professores de música. Com base nos dados da aula anterior abaixo, escreva um parágrafo curto (3–5 linhas) que ajude o professor a contextualizar a próxima aula. Seja direto, prático e objetivo. Não use bullet points.

${campos.join('\n')}

Responda apenas com o texto do contexto, sem explicações adicionais.`

      const texto = await geminiPost(prompt)
      if (texto.trim()) setContextoAulaAnterior(texto.trim())
      else showToast('IA não retornou resultado', 'error')
    } catch (e) {
      showToast('Erro ao gerar contexto', 'error')
    } finally {
      setGerandoContexto(false)
    }
  }

  // ── Objetivos ──
  const [gerandoObjetivos, setGerandoObjetivos] = useState(false)

  async function sugerirObjetivosIA() {
    const ativs = plano.atividadesRoteiro || []
    if (ativs.length === 0) { showToast('Adicione ao menos uma atividade no roteiro!', 'error'); return }
    setGerandoObjetivos(true)
    try {
      const listaAtividades = ativs
        .map(a => `- ${a.nome}${a.descricao ? ': ' + a.descricao.replace(/<[^>]+>/g, '').slice(0, 80) : ''}`)
        .join('\n')
      const prompt = `Você é especialista em pedagogia musical. Com base nas atividades abaixo, sugira um objetivo geral e até 3 objetivos específicos para a aula.

Atividades:
${listaAtividades}

Responda APENAS com JSON válido, sem texto extra:
{"geral": "...", "especificos": ["...", "...", "..."]}`
      const raw = await geminiPost(prompt)
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/)
      if (!match) { showToast('IA não retornou JSON', 'error'); return }
      const result = JSON.parse(match[1] || match[0])
      setPlano(p => ({
        ...p,
        objetivoGeral: result.geral ?? p.objetivoGeral,
        objetivosEspecificos: Array.isArray(result.especificos) ? result.especificos : p.objetivosEspecificos,
      }))
      setSecoesForm(prev => new Set([...prev, 'objetivos']))
      showToast('Objetivos gerados!', 'success')
    } catch { showToast('Erro ao gerar objetivos', 'error') }
    finally { setGerandoObjetivos(false) }
  }

  // ── BNCC ──
  const [gerandoBNCC, setGerandoBNCC] = useState(false)
  const [bnccBusca, setBnccBusca] = useState('')

  async function sugerirBNCC() {
    setGerandoBNCC(true)
    try {
      const ativs = plano.atividadesRoteiro || []
      const prompt = `Você é especialista em BNCC para Música (Arte). Com base no plano abaixo, sugira as habilidades BNCC mais adequadas.

Título: ${plano.titulo || '(sem título)'}
Atividades: ${ativs.map(a => a.nome).join(', ') || '(nenhuma)'}
Conceitos: ${(plano.conceitos || []).join(', ') || '(nenhum)'}
Nível: ${plano.nivel || plano.faixaEtaria?.[0] || '(não informado)'}
Objetivo: ${plano.objetivoGeral?.replace(/<[^>]+>/g, '') || '(não informado)'}

Habilidades disponíveis: EI01TS02, EI02TS02, EI03TS01, EF15AR14, EF15AR15, EF15AR16, EF15AR17, EF15AR18, EF69AR16, EF69AR17, EF69AR18, EF69AR19, EF69AR20, EF69AR21, EF69AR22, EF69AR23, EF69AR24, EF69AR25.

Responda APENAS com JSON: {"habilidades": ["EF15AR14", "EF69AR16"]}`
      const raw = await geminiPost(prompt)
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/)
      if (!match) { showToast('IA não retornou JSON', 'error'); return }
      const result = JSON.parse(match[1] || match[0])
      const habs: string[] = Array.isArray(result.habilidades) ? result.habilidades : []
      const novas = habs.map(h => {
        const found = BNCC_MUSICA.find(b => b.codigo === h)
        return found ? `${found.codigo} - ${found.descricao}` : h
      })
      setPlano(p => ({ ...p, habilidadesBNCC: [...new Set([...(p.habilidadesBNCC || []), ...novas])] }))
      setSecoesForm(prev => new Set([...prev, 'bncc']))
      showToast('Habilidades BNCC sugeridas!', 'success')
    } catch { showToast('Erro ao sugerir BNCC', 'error') }
    finally { setGerandoBNCC(false) }
  }

  // ── Conceitos detectados ──
  const [modalConceitos, setModalConceitos] = useState<string[] | null>(null)
  const [detectandoConceitos, setDetectandoConceitos] = useState(false)

  // ── Ampliar Ideias ──
  type SugestaoAtividade = { nome: string; duracao: string; descricao: string }
  const [ampliarOpen, setAmpliarOpen] = useState(false)
  const [ampliarLoading, setAmpliarLoading] = useState(false)
  const [ampliarSugestoes, setAmpliarSugestoes] = useState<SugestaoAtividade[]>([])
  const [ampliarExpandido, setAmpliarExpandido] = useState<number | null>(null)

  async function ampliarIdeias() {
    const ativs = plano.atividadesRoteiro || []
    if (ativs.length === 0) { showToast('Adicione ao menos uma atividade primeiro!', 'error'); return }
    setAmpliarLoading(true)
    setAmpliarOpen(true)
    setAmpliarSugestoes([])
    setAmpliarExpandido(null)
    try {
      const listaAtividades = ativs.map(a => `- ${a.nome}${a.duracao ? ` (${a.duracao} min)` : ''}`).join('\n')
      const objetivo = typeof plano.objetivoGeral === 'string' ? plano.objetivoGeral.replace(/<[^>]*>/g, '') : ''
      const prompt = `Você é um assistente pedagógico especialista em educação musical. O professor já planejou as seguintes atividades para a aula:

${listaAtividades}

Nível/turma: ${plano.nivel || 'não informado'}
Objetivo: ${objetivo || 'não informado'}

Sugira 4 ideias de atividades que AMPLIAM ou COMPLEMENTAM o que já está planejado. Não repita atividades existentes. As sugestões devem ser pontos de partida inspiradores para a criatividade do professor, não receitas prontas.

Responda APENAS com JSON válido: {"sugestoes": [{"nome": "...", "duracao": "10", "descricao": "Uma frase curta e inspiradora sobre a atividade"}]}`
      const raw = await geminiPost(prompt)
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/)
      if (!match) { showToast('IA não retornou sugestões', 'error'); setAmpliarOpen(false); return }
      const result = JSON.parse(match[1] || match[0])
      if (Array.isArray(result.sugestoes)) setAmpliarSugestoes(result.sugestoes)
    } catch { showToast('Erro ao ampliar ideias', 'error'); setAmpliarOpen(false) }
    finally { setAmpliarLoading(false) }
  }

  function adicionarSugestao(s: SugestaoAtividade) {
    const nova: AtividadeRoteiro = {
      id: gerarIdSeguro(),
      nome: s.nome,
      duracao: s.duracao,
      descricao: s.descricao,
      conceitos: [],
      tags: [],
      recursos: [],
      musicasVinculadas: [],
      estrategiasVinculadas: [],
    }
    setPlano(p => ({ ...p, atividadesRoteiro: [...(p.atividadesRoteiro || []), nova] }))
    showToast(`"${s.nome}" adicionada ao roteiro!`, 'success')
  }

  // ── Atividades: drag-and-drop ──
  const [dragActiveIndex, setDragActiveIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragFromHandle = useRef(false)

  function handleDragStart(index: number) {
    if (!dragFromHandle.current) return
    setDragActiveIndex(index)
  }
  function handleDragEnter(index: number) {
    setDragOverIndex(index)
  }
  function handleDragEnd() {
    if (dragActiveIndex !== null && dragOverIndex !== null && dragActiveIndex !== dragOverIndex) {
      const arr = [...plano.atividadesRoteiro]
      const [moved] = arr.splice(dragActiveIndex, 1)
      arr.splice(dragOverIndex, 0, moved)
      setPlano(p => ({ ...p, atividadesRoteiro: arr }))
    }
    setDragActiveIndex(null)
    setDragOverIndex(null)
    dragFromHandle.current = false
  }

  // ── Atividades: expand ──
  const [atividadesExpandidas, setAtividadesExpandidas] = useState<Set<string>>(() => new Set())
  const prevAtivCountRef = useRef(-1)
  function toggleExpandidaAtiv(id: string | number) {
    setAtividadesExpandidas(prev => {
      const s = new Set(prev)
      s.has(String(id)) ? s.delete(String(id)) : s.add(String(id))
      return s
    })
  }
  // Auto-expande última atividade adicionada
  useEffect(() => {
    const ativs = plano.atividadesRoteiro || []
    if (prevAtivCountRef.current >= 0 && ativs.length > prevAtivCountRef.current && ativs.length > 0) {
      const lastId = ativs[ativs.length - 1].id
      setAtividadesExpandidas(prev => { const s = new Set(prev); s.add(String(lastId)); return s })
      setTimeout(() => {
        const el = document.querySelector(`[data-activity-id="${lastId}"]`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 80)
    }
    prevAtivCountRef.current = ativs.length
  }, [plano.atividadesRoteiro?.length]) // eslint-disable-line

  // ── Reordenação mobile ──
  const reorderingRef = useRef(false)
  const handleMoveUp = useCallback((index: number) => {
    if (reorderingRef.current) return
    reorderingRef.current = true
    setTimeout(() => { reorderingRef.current = false }, 300)
    const arr = [...plano.atividadesRoteiro]
    if (index === 0) return
    ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
    setPlano(p => ({ ...p, atividadesRoteiro: arr }))
  }, [plano])

  const handleMoveDown = useCallback((index: number) => {
    if (reorderingRef.current) return
    reorderingRef.current = true
    setTimeout(() => { reorderingRef.current = false }, 300)
    const arr = [...plano.atividadesRoteiro]
    if (index === arr.length - 1) return
    ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
    setPlano(p => ({ ...p, atividadesRoteiro: arr }))
  }, [plano])

  // ── Adicionar atividade ──
  function adicionarAtividade() {
    const nova: AtividadeRoteiro = {
      id: gerarIdSeguro(),
      nome: '',
      duracao: '',
      descricao: '',
      conceitos: [],
      tags: [],
      recursos: [],
      musicasVinculadas: [],
      estrategiasVinculadas: [],
    }
    setPlano(p => ({ ...p, atividadesRoteiro: [...(p.atividadesRoteiro || []), nova] }))
  }

  function atualizarAtividade(id: string | number, campo: string, valor: unknown) {
    setPlano(p => ({
      ...p,
      atividadesRoteiro: (p.atividadesRoteiro || []).map(a =>
        String(a.id) === String(id) ? { ...a, [campo]: valor } : a
      ),
    }))
  }

  function removerAtividade(id: string | number) {
    setPlano(p => ({
      ...p,
      atividadesRoteiro: (p.atividadesRoteiro || []).filter(a => String(a.id) !== String(id)),
    }))
  }

  // ── Autocomplete tags ──
  const [hashDropdown, setHashDropdown] = useState<{ query: string; pos: { top: number; left: number }; atividadeId: string } | null>(null)
  const todasAsTags = useMemo(() => {
    const set = new Set<string>()
    ;(plano.atividadesRoteiro || []).forEach(a => (a.tags || []).forEach(t => set.add(t)))
    return [...set].sort()
  }, [plano.atividadesRoteiro])

  // ── Músicas ──
  const [buscaMusica, setBuscaMusica] = useState('')
  const [pickerAberto, setPickerAberto] = useState(false)

  const vinculadas = plano.musicasVinculadasPlano || []
  const vinculadosIds = new Set(vinculadas.map(v => String(v.musicaId)))

  const isUrl = (s: string) => /^https?:\/\//i.test(s.trim())
  const isYoutubeUrl = (s: string) => /youtube\.com|youtu\.be/i.test(s)
  const isSpotifyUrl = (s: string) => /spotify\.com/i.test(s)

  const sugestoesMusica = (!isUrl(buscaMusica) && buscaMusica.trim().length >= 2)
    ? repertorio.filter(m => !vinculadosIds.has(String(m.id ?? m.titulo)) && m.titulo.toLowerCase().includes(buscaMusica.toLowerCase())).slice(0, 8)
    : []

  function adicionarMusicaDeRepertorio(m: typeof repertorio[0]) {
    const v: VinculoMusicaPlano = {
      musicaId: m.id ?? m.titulo ?? gerarIdSeguro(),
      titulo: m.titulo,
      autor: m.autor,
      origemDeteccao: 'manual',
      confirmadoPor: 'professor',
      confirmadoEm: new Date().toISOString(),
    }
    setPlano(p => ({ ...p, musicasVinculadasPlano: [...(p.musicasVinculadasPlano || []), v] }))
    setBuscaMusica(''); setPickerAberto(false)
  }

  function adicionarMusicaUrl(url: string) {
    const u = url.trim()
    const ytId = getYoutubeId(u)
    const titulo = isSpotifyUrl(u) ? '🎵 Link Spotify' : ytId ? '▶ Link YouTube' : u
    const v: VinculoMusicaPlano = {
      musicaId: u, titulo, url: u,
      origemDeteccao: 'manual', confirmadoPor: 'professor', confirmadoEm: new Date().toISOString(),
    }
    setPlano(p => ({ ...p, musicasVinculadasPlano: [...(p.musicasVinculadasPlano || []), v] }))
    setBuscaMusica(''); setPickerAberto(false)
  }

  function adicionarMusicaNome(nome: string) {
    const v: VinculoMusicaPlano = {
      musicaId: nome, titulo: nome,
      origemDeteccao: 'nova', confirmadoPor: 'professor', confirmadoEm: new Date().toISOString(),
    }
    setPlano(p => ({ ...p, musicasVinculadasPlano: [...(p.musicasVinculadasPlano || []), v] }))
    setBuscaMusica(''); setPickerAberto(false)
  }

  function removerMusica(musicaId: string | number) {
    setPlano(p => ({ ...p, musicasVinculadasPlano: (p.musicasVinculadasPlano || []).filter(v => String(v.musicaId) !== String(musicaId)) }))
  }

  // ── Recursos ──
  const [novoRecursoUrl, setNovoRecursoUrl] = useState('')

  function adicionarRecurso() {
    const url = novoRecursoUrl.trim()
    if (!url) return
    const tipo = detectarTipoRecurso(url)
    const rec: RecursoItem = { url, tipo }
    setPlano(p => ({ ...p, recursos: [...(p.recursos || []), rec] }))
    setNovoRecursoUrl('')
  }

  // ── Materiais ──
  const [novoMaterial, setNovoMaterial] = useState('')

  // ── Salvar ──
  const [estadoSalvar, setEstadoSalvar] = useState<'idle' | 'salvando' | 'salvo'>('idle')

  function handleSalvar() {
    if (!plano.titulo.trim() && (plano.atividadesRoteiro || []).length === 0) {
      showToast('Preencha ao menos o título ou adicione uma atividade.', 'error'); return
    }
    setEstadoSalvar('salvando')

    // Detectar conceitos nas atividades sem conceito
    const semConceitos = (plano.atividadesRoteiro || []).filter(
      a => a.descricao?.replace(/<[^>]*>/g, '').trim().length > 10 && !(a.conceitos?.length)
    )
    if (semConceitos.length > 0) {
      setDetectandoConceitos(true)
      Promise.all(semConceitos.map(a => analisarConceitosAtividade(a.nome || '', a.descricao || '')))
        .then(resultados => {
          const existentes = (plano.atividadesRoteiro || []).flatMap(a => a.conceitos || [])
          const novos = resultados.flat()
          const merged = [...new Set([...existentes, ...novos])].filter(Boolean)
          if (merged.length > 0) {
            setModalConceitos(merged)
            setDetectandoConceitos(false)
            return
          }
          finalizarSalvar(plano)
        })
        .catch(() => finalizarSalvar(plano))
        .finally(() => setDetectandoConceitos(false))
    } else {
      finalizarSalvar(plano)
    }
  }

  function finalizarSalvar(p: Plano) {
    const planoFinal: Plano = {
      ...p,
      contextoAulaAnterior: modo === 'adaptar' ? contextoAulaAnterior : p.contextoAulaAnterior,
    }
    requestAnimationFrame(() => {
      setEstadoSalvar('salvo')
      setTimeout(() => setEstadoSalvar('idle'), 1200)
    })
    onSalvar(planoFinal)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const tituloModo =
    modo === 'adaptar' ? '🔄 Adaptar da última aula' :
    modo === 'importar' ? '🏛️ Aula importada do banco' :
    '✏️ Nova aula livre'

  return (
    <div className="v2-card rounded-2xl border border-slate-200 dark:border-[#374151] overflow-hidden flex flex-col shadow-sm">

      {/* ── Barra superior colorida ── */}
      <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500 flex-shrink-0" />

      {/* ── Header ── */}
      <div className="px-5 py-3.5 flex justify-between items-center border-b border-slate-100 dark:border-[#374151] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-bold text-slate-800 dark:text-white text-sm leading-tight truncate">{tituloModo}</h3>
          {turmaNome && (
            <span className="text-[11px] text-slate-400 truncate hidden sm:block">· {turmaNome}</span>
          )}
          {dataPrevista && (
            <span className="text-[11px] text-slate-400 hidden sm:block">
              · {new Date(dataPrevista + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* ⚡📋🔬 */}
          <div className="flex bg-slate-100 dark:bg-[#374151] rounded-xl p-0.5 gap-0.5">
            {([
              { key: 'rapido', icon: '⚡', title: 'Rápido: só roteiro' },
              { key: 'completo', icon: '📋', title: 'Completo: + objetivos e avaliação' },
              { key: 'detalhado', icon: '🔬', title: 'Detalhado: todos os campos' },
            ] as const).map(m => (
              <button key={m.key} type="button"
                onClick={() => setModoForm(m.key)} title={m.title}
                className={`text-xs font-semibold px-2.5 py-1 rounded-[9px] transition-all ${modoForm === m.key ? 'bg-white dark:bg-[#1F2937] text-slate-700 dark:text-white shadow-sm' : 'text-slate-400 dark:text-[#6B7280] hover:text-slate-600'}`}>
                {m.icon}
              </button>
            ))}
          </div>
          {/* Fechar / cancelar — visível imediatamente sem precisar rolar */}
          <button
            type="button"
            onClick={onCancelar}
            title="Fechar sem salvar"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#374151] transition-all text-base leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {/* ── Conteúdo scrollável ── */}
      <div className="overflow-y-auto">

        {/* ════ BLOCO CONTEXTO DA AULA ANTERIOR (só modo adaptar) ════ */}
        {modo === 'adaptar' && (
          <div className="border-b border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-900/10">
            <div className="px-5 pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">
                  📋 Contexto da Aula Anterior
                </label>
                <button type="button" onClick={gerarContextoIA} disabled={gerandoContexto || !ultimoRegistro}
                  className="flex items-center gap-1.5 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-400/10 dark:hover:bg-indigo-400/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-400/25 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {gerandoContexto ? '⏳ Gerando...' : '✨ Gerar com IA'}
                </button>
              </div>
              <textarea
                value={contextoAulaAnterior}
                onChange={e => setContextoAulaAnterior(e.target.value)}
                rows={3}
                placeholder={ultimoRegistro
                  ? 'Clique em "✨ Gerar com IA" para resumir a aula anterior, ou escreva manualmente...'
                  : 'Nenhum registro anterior encontrado para esta turma.'}
                className="w-full px-3 py-2.5 border border-indigo-200 dark:border-indigo-400/25 rounded-xl text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-[var(--v2-card)] placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 resize-none transition-colors"
              />
              <p className="text-[10px] text-indigo-400 dark:text-indigo-500 mt-1.5">
                Este contexto é salvo com o planejamento desta turma — não altera a aula base.
              </p>
            </div>
          </div>
        )}

        {/* ════ TÍTULO + DURAÇÃO (sempre visíveis) ════ */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-[#374151] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-[#6B7280] uppercase tracking-wide mb-1.5">Título da Aula</label>
              <input type="text" value={plano.titulo}
                onChange={e => setPlano(p => ({ ...p, titulo: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-[#374151] rounded-xl text-sm focus:border-indigo-400 outline-none bg-white dark:bg-[var(--v2-card)] text-slate-800 dark:text-white"
                placeholder="Ex: Ritmo e Pulsação com Percussão Corporal"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-[#6B7280] uppercase tracking-wide mb-1.5">Duração</label>
              <input type="text" value={plano.duracao}
                onChange={e => setPlano(p => ({ ...p, duracao: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-[#374151] rounded-xl text-sm focus:border-indigo-400 outline-none bg-white dark:bg-[var(--v2-card)] text-slate-800 dark:text-white"
                placeholder="Ex: 50 min"
              />
            </div>
          </div>
        </div>

        {/* ════ ACCORDION: MÚSICAS DA AULA ════ */}
        <div className="border-b border-slate-100 dark:border-[#374151]">
          <button type="button" onClick={() => toggleSecaoForm('musicas')}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left group bg-slate-50/70 dark:bg-transparent hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] group-hover:text-slate-600 transition-colors">🎵 Músicas da Aula</span>
              {vinculadas.length > 0 && (
                <span className="text-[10px] bg-indigo-100 text-indigo-600 font-bold px-1.5 py-0.5 rounded-full">{vinculadas.length}</span>
              )}
            </div>
            <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all duration-200 flex-shrink-0 ml-3 ${secoesForm.has('musicas') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
          </button>
          {secoesForm.has('musicas') && (
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em]">🎵 Músicas da aula</p>
                <button type="button" onClick={() => setPickerAberto(o => !o)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium shrink-0 ml-3">
                  {pickerAberto ? '✕ Fechar' : '+ Adicionar'}
                </button>
              </div>
              {pickerAberto && (
                <div className="mb-3 relative">
                  <input type="text" autoFocus
                    placeholder="Nome da música, artista ou link YouTube/Spotify…"
                    className="w-full px-3 py-2 border border-indigo-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    value={buscaMusica}
                    onChange={e => setBuscaMusica(e.target.value)}
                    onKeyDown={e => {
                      if (e.key !== 'Enter') return
                      const val = buscaMusica.trim()
                      if (!val) return
                      if (isUrl(val)) { adicionarMusicaUrl(val); return }
                      if (sugestoesMusica.length === 0) adicionarMusicaNome(val)
                    }} />
                  {sugestoesMusica.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-10 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 overflow-hidden max-h-48 overflow-y-auto">
                      {sugestoesMusica.map(m => (
                        <button key={String(m.id ?? m.titulo)} type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 border-b border-slate-100 last:border-0"
                          onClick={() => adicionarMusicaDeRepertorio(m)}>
                          <span className="font-medium text-slate-800">{m.titulo}</span>
                          {m.autor && <span className="text-slate-400 ml-2 text-xs">{m.autor}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {isUrl(buscaMusica) && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl">
                      <span className="text-lg">{isYoutubeUrl(buscaMusica) ? '▶' : isSpotifyUrl(buscaMusica) ? '🎵' : '🔗'}</span>
                      <span className="flex-1 text-xs text-slate-500 truncate">{buscaMusica.trim()}</span>
                      <button type="button" onClick={() => adicionarMusicaUrl(buscaMusica)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 whitespace-nowrap transition-colors">
                        Adicionar →
                      </button>
                    </div>
                  )}
                  {!isUrl(buscaMusica) && buscaMusica.trim().length >= 2 && sugestoesMusica.length === 0 && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <p className="text-xs text-slate-400">Não encontrada no seu repertório.</p>
                      <button type="button" onClick={() => adicionarMusicaNome(buscaMusica.trim())}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2">
                        Adicionar mesmo assim →
                      </button>
                    </div>
                  )}
                </div>
              )}
              {vinculadas.length === 0 && !pickerAberto && (
                <button type="button" onClick={() => setPickerAberto(true)}
                  className="w-full text-left px-3 py-3 rounded-xl border border-dashed border-slate-200 dark:border-[#374151] hover:border-indigo-300 hover:bg-indigo-50/40 transition-all group">
                  <span className="block text-xs text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">
                    Adicione as músicas desta aula — nome, artista ou link do YouTube/Spotify
                  </span>
                </button>
              )}
              {vinculadas.length > 0 && (
                <div className="space-y-1.5">
                  {vinculadas.map(v => {
                    if (v.url) return (
                      <MusicaCardComPlayer key={String(v.musicaId)} v={v} getYoutubeId={getYoutubeId}
                        onRemover={() => removerMusica(v.musicaId)} />
                    )
                    return (
                      <div key={String(v.musicaId)} className="flex items-center gap-2 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-[#374151] rounded-lg px-3 py-2">
                        <span className="text-base">🎵</span>
                        <span className="flex-1 min-w-0 text-sm text-slate-700 dark:text-[#D1D5DB] truncate">
                          {v.titulo}{v.autor && <span className="text-slate-400 ml-1.5 text-xs">· {v.autor}</span>}
                        </span>
                        <button type="button" onClick={() => removerMusica(v.musicaId)} className="text-slate-300 hover:text-red-500 transition shrink-0 text-xs">✕</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ════ ACCORDION: ROTEIRO DE ATIVIDADES ════ */}
        <div className="border-b border-slate-100 dark:border-[#374151]">
          <button type="button" onClick={() => toggleSecaoForm('roteiro')}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left group bg-slate-50/70 dark:bg-transparent hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors">
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] group-hover:text-slate-600 transition-colors">Roteiro de Atividades</span>
              {!secoesForm.has('roteiro') && (() => {
                const n = (plano.atividadesRoteiro || []).length
                if (n === 0) return null
                let totalMin = 0
                ;(plano.atividadesRoteiro || []).forEach(a => { const num = parseInt((a.duracao || '').toString()); if (!isNaN(num)) totalMin += num })
                const parts = [`${n} atividade${n > 1 ? 's' : ''}`]
                if (totalMin > 0) parts.push(`${totalMin} min`)
                return <p className="text-[11px] text-slate-300 mt-0.5">{parts.join(' · ')}</p>
              })()}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              {(plano.atividadesRoteiro || []).length > 0 && (
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                  {(plano.atividadesRoteiro || []).length}
                </span>
              )}
              <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all duration-200 ${secoesForm.has('roteiro') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
            </div>
          </button>
          {secoesForm.has('roteiro') && (
            <div className="px-5 pt-5 pb-5">
              {/* Alerta de tempo */}
              {(() => {
                const duracaoAula = parseInt((plano.duracao || '').replace(/[^\d]/g, ''))
                if (!duracaoAula || isNaN(duracaoAula)) return null
                let totalRoteiro = 0
                ;(plano.atividadesRoteiro || []).forEach(a => { const n = parseInt((a.duracao || '').toString()); if (!isNaN(n)) totalRoteiro += n })
                if (totalRoteiro === 0 || totalRoteiro <= duracaoAula) return null
                const excesso = totalRoteiro - duracaoAula
                return (
                  <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/30 rounded-xl px-3 py-2.5 mb-3">
                    <span className="text-base shrink-0">⏱️</span>
                    <div>
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Roteiro passa {excesso} min do tempo da aula</p>
                      <p className="text-[11px] text-amber-600 mt-0.5">Total: <strong>{totalRoteiro} min</strong> · Aula: <strong>{duracaoAula} min</strong></p>
                    </div>
                  </div>
                )
              })()}

              <div className="flex justify-between items-center mb-3">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setModalTemplates(true)}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.10] text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">
                    📐 Templates
                  </button>
                  <button type="button" onClick={adicionarAtividade}
                    className="border border-slate-300 dark:border-[#374151] hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">
                    + Atividade
                  </button>
                  <button type="button" onClick={toggleBancoPainel}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${bancoPanelOpen ? 'bg-slate-200 text-slate-700 dark:bg-white/[0.10] dark:text-slate-200' : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.10] text-slate-600 dark:text-slate-300'}`}>
                    📚 Biblioteca
                  </button>
                </div>
                {/* Tempo total */}
                {(() => {
                  const ativs = plano.atividadesRoteiro || []
                  if (ativs.length === 0) return null
                  let totalMin = 0
                  ativs.forEach(a => { const num = parseInt((a.duracao || '').toString().trim()); if (!isNaN(num)) totalMin += num })
                  if (totalMin === 0) return null
                  return <span className="text-xs text-slate-400 font-medium">⏱ {totalMin} min</span>
                })()}
              </div>

              <div className={`flex gap-4 ${bancoPanelOpen ? 'items-start' : ''}`}>
                <div className="flex-1 min-w-0">
                  {(plano.atividadesRoteiro || []).length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-10">
                      <p className="text-sm font-semibold text-slate-400 dark:text-[#4B5563]">Nenhuma atividade ainda</p>
                      <button type="button" onClick={adicionarAtividade}
                        className="mt-1 px-5 py-2 border border-slate-300 dark:border-[#374151] hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl transition-colors">
                        + Adicionar atividade
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(plano.atividadesRoteiro || []).map((atividade, index) => (
                        <CardAtividadeRoteiro
                          key={atividade.id}
                          atividade={atividade}
                          index={index}
                          isOpen={atividadesExpandidas.has(String(atividade.id))}
                          atividadesCount={(plano.atividadesRoteiro || []).length}
                          dragActiveIndex={dragActiveIndex}
                          dragOverIndex={dragOverIndex}
                          dragFromHandle={dragFromHandle}
                          onDragStart={handleDragStart}
                          onDragEnter={handleDragEnter}
                          onDragEnd={handleDragEnd}
                          onToggle={toggleExpandidaAtiv}
                          onFieldChange={atualizarAtividade}
                          onRemove={removerAtividade}
                          onMoveUp={() => handleMoveUp(index)}
                          onMoveDown={() => handleMoveDown(index)}
                          planoEditando={plano}
                          setPlanoEditando={setPlano}
                          hashDropdown={hashDropdown}
                          setHashDropdown={setHashDropdown}
                          todasAsTags={todasAsTags}
                          onSaveAsStrategy={adicionarEstrategiaRapida}
                          onVincularMusica={setAtividadeVinculandoMusica}
                          bancoAtividades={bancoAtividades}
                          setBancoAtividades={setBancoAtividades}
                          setModalConfirm={setModalConfirm}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={ampliarIdeias}
                        disabled={ampliarLoading}
                        className="mt-1 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-[#374151] text-slate-500 dark:text-slate-400 text-xs font-semibold hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {ampliarLoading
                          ? <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Buscando ideias...</>
                          : '✨ Ampliar Ideias'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Painel Banco lateral */}
                {bancoPanelOpen && (
                  <div className="w-56 shrink-0 border-l border-slate-100 dark:border-[#374151] pl-4 pt-1">
                    <div className="flex items-center mb-3">
                      {(['atividades', 'estrategias', 'musicas'] as const).map(tab => (
                        <button key={tab} type="button"
                          onClick={() => setBancoPanelTab(tab)}
                          className={`flex-1 py-1.5 text-[11px] font-semibold border-b-2 transition-colors ${bancoPanelTab === tab ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                          {tab === 'atividades' ? '📦' : tab === 'estrategias' ? '💡' : '🎵'}
                          <span className="ml-1">{tab === 'atividades' ? 'Ativ.' : tab === 'estrategias' ? 'Estrat.' : 'Músicas'}</span>
                        </button>
                      ))}
                      <button type="button" onClick={() => setBancoPanelOpen(false)}
                        className="ml-1 shrink-0 text-slate-300 hover:text-slate-500 p-1 rounded transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                    <input autoFocus type="text" placeholder="Buscar..."
                      value={bancoPanelBusca}
                      onChange={e => setBancoPanelBusca(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-[#374151] rounded-lg text-[11px] mb-2 outline-none bg-white dark:bg-[var(--v2-card)] dark:text-white focus:border-indigo-400"
                    />
                    <div className="overflow-y-auto max-h-72 space-y-0.5">
                      {bancoPanelTab === 'atividades' && (() => {
                        const items = bancoAtividades.filter(a => !bancoPanelBusca || a.nome.toLowerCase().includes(bancoPanelBusca.toLowerCase()))
                        if (items.length === 0) return <p className="text-[11px] text-slate-400 text-center py-3">Nenhuma atividade no banco</p>
                        return items.map(a => (
                          <button key={a.id} type="button"
                            onClick={() => {
                              const nova: AtividadeRoteiro = {
                                id: gerarIdSeguro(),
                                nome: a.nome,
                                duracao: a.duracao ?? '',
                                descricao: a.descricao ?? '',
                                conceitos: a.conceitos ?? [],
                                tags: a.tags ?? [],
                                recursos: (a.recursos as RecursoItem[]) ?? [],
                                musicasVinculadas: a.musicasVinculadas ?? [],
                                estrategiasVinculadas: [],
                                origemAtividadeId: a.id,
                              }
                              setPlano(p => ({ ...p, atividadesRoteiro: [...(p.atividadesRoteiro || []), nova] }))
                              showToast(`"${a.nome}" adicionada!`, 'success')
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors group">
                            <span className="font-semibold block truncate">{a.nome}</span>
                            {a.duracao && <span className="text-slate-400 text-[10px]">{a.duracao} min · </span>}
                            <span className="text-indigo-400 text-[10px] opacity-0 group-hover:opacity-100">+ adicionar</span>
                          </button>
                        ))
                      })()}
                      {bancoPanelTab === 'estrategias' && (() => {
                        const expandida = [...atividadesExpandidas][0]
                        const atividadeAlvo = expandida ? (plano.atividadesRoteiro || []).find(a => String(a.id) === expandida) : null
                        const items = estrategias.filter(e => !bancoPanelBusca || e.nome.toLowerCase().includes(bancoPanelBusca.toLowerCase()))
                        return <>
                          {atividadeAlvo
                            ? <p className="text-[10px] text-violet-600 bg-violet-50 rounded-lg px-2 py-1 mb-1.5 truncate">→ <span className="font-semibold">{atividadeAlvo.nome || 'Atividade'}</span></p>
                            : <p className="text-[10px] text-slate-400 bg-slate-50 dark:bg-white/[0.03] rounded-lg px-2 py-1 mb-1.5">⬆ Expanda uma atividade para vincular</p>}
                          {items.map(est => (
                            <button key={est.id} type="button"
                              onClick={() => {
                                const expId = [...atividadesExpandidas][0]
                                if (!expId) { showToast('Expanda uma atividade primeiro!', 'error'); return }
                                const idx = (plano.atividadesRoteiro || []).findIndex(a => String(a.id) === expId)
                                if (idx < 0) return
                                const vinculadas = (plano.atividadesRoteiro[idx].estrategiasVinculadas || []) as string[]
                                // Checa por ID (novo) ou por nome (dados legados)
                                const jaVinculada = vinculadas.some(v => v === est.id || v === est.nome)
                                if (jaVinculada) { showToast('Estratégia já vinculada!', 'error'); return }
                                const arr = [...plano.atividadesRoteiro]
                                arr[idx] = { ...arr[idx], estrategiasVinculadas: [...(arr[idx].estrategiasVinculadas || []), est.id] }
                                setPlano(p => ({ ...p, atividadesRoteiro: arr }))
                                showToast(`"${est.nome}" vinculada!`, 'success')
                              }}
                              className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-700 transition-colors">
                              <span className="font-semibold block truncate">🧩 {est.nome}</span>
                              {est.categoria && <span className="text-slate-400 text-[10px]">{est.categoria}</span>}
                            </button>
                          ))}
                        </>
                      })()}
                      {bancoPanelTab === 'musicas' && (() => {
                        const expandida = [...atividadesExpandidas][0]
                        const atividadeAlvo = expandida ? (plano.atividadesRoteiro || []).find(a => String(a.id) === expandida) : null
                        const items = repertorio.filter(m => !bancoPanelBusca || m.titulo.toLowerCase().includes(bancoPanelBusca.toLowerCase()))
                        return <>
                          {atividadeAlvo
                            ? <p className="text-[10px] text-emerald-600 bg-emerald-50 rounded-lg px-2 py-1 mb-1.5 truncate">→ <span className="font-semibold">{atividadeAlvo.nome || 'Atividade'}</span></p>
                            : <p className="text-[10px] text-slate-400 bg-slate-50 dark:bg-white/[0.03] rounded-lg px-2 py-1 mb-1.5">⬆ Expanda uma atividade para vincular</p>}
                          {items.map(m => (
                            <button key={m.id} type="button"
                              onClick={() => {
                                const expId = [...atividadesExpandidas][0]
                                if (!expId) { showToast('Expanda uma atividade primeiro!', 'error'); return }
                                const idx = (plano.atividadesRoteiro || []).findIndex(a => String(a.id) === expId)
                                if (idx < 0) return
                                const arr = [...plano.atividadesRoteiro]
                                const jaVinculada = (arr[idx].musicasVinculadas || []).find(mv => String(typeof mv === 'string' ? mv : mv.id) === String(m.id))
                                if (jaVinculada) { showToast('Música já vinculada!', 'error'); return }
                                arr[idx] = { ...arr[idx], musicasVinculadas: [...(arr[idx].musicasVinculadas || []), { id: m.id, titulo: m.titulo, autor: m.autor }] }
                                setPlano(p => ({ ...p, atividadesRoteiro: arr }))
                                showToast(`"${m.titulo}" vinculada!`, 'success')
                              }}
                              className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-700 transition-colors">
                              <span className="font-semibold block truncate">🎵 {m.titulo}</span>
                              {m.autor && <span className="text-slate-400 text-[10px]">{m.autor}</span>}
                            </button>
                          ))}
                        </>
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ════ ACCORDION: OBJETIVOS ════ */}
        {!modoRapido && (
          <div className="border-b border-slate-100 dark:border-[#374151]">
            <button type="button" onClick={() => toggleSecaoForm('objetivos')}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left group bg-slate-50/70 dark:bg-transparent hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors">
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] group-hover:text-slate-600 transition-colors">Objetivos</span>
                {!secoesForm.has('objetivos') && plano.objetivoGeral && (
                  <p className="text-[11px] text-slate-300 mt-0.5 truncate">{plano.objetivoGeral.replace(/<[^>]*>/g, '').slice(0, 70)}</p>
                )}
              </div>
              <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all duration-200 flex-shrink-0 ml-3 ${secoesForm.has('objetivos') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
            </button>
            {secoesForm.has('objetivos') && (
              <div className="px-5 pt-3 pb-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">🎯 Objetivo Geral</label>
                    <button type="button" onClick={sugerirObjetivosIA} disabled={gerandoObjetivos}
                      className="flex items-center gap-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {gerandoObjetivos ? '⏳ Gerando...' : '✨ Gerar com IA'}
                    </button>
                  </div>
                  <textarea
                    value={(plano.objetivoGeral || '').replace(/<[^>]+>/g, '')}
                    onChange={e => setPlano(p => ({ ...p, objetivoGeral: e.target.value }))}
                    placeholder="Ex: Executar padrão rítmico binário usando percussão corporal..."
                    rows={2}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#374151] rounded-xl text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-[var(--v2-card)] placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 resize-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    🎯 Objetivos Específicos
                    <span className="ml-1 font-normal normal-case text-slate-400">(máx. 3)</span>
                  </label>
                  {(() => {
                    const rawObjs = plano.objetivosEspecificos || []
                    const objs: string[] = (() => {
                      if (rawObjs.length === 0) return []
                      if (rawObjs.length === 1 && typeof rawObjs[0] === 'string' && rawObjs[0].startsWith('<')) {
                        return rawObjs[0].replace(/<\/?(ul|ol)>/gi, '').split(/<\/li>/i).map(s => s.replace(/<[^>]+>/g, '').trim()).filter(Boolean)
                      }
                      return rawObjs
                    })()
                    const setObjs = (next: string[]) => setPlano(p => ({ ...p, objetivosEspecificos: next }))
                    return (
                      <div className="space-y-1.5">
                        {objs.map((obj, i) => (
                          <div key={i} className="flex items-start gap-2 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-[#374151] rounded-xl px-3 py-2">
                            <span className="text-[11px] font-bold text-indigo-500 mt-0.5 shrink-0">{i + 1}.</span>
                            <input type="text" value={obj}
                              onChange={e => { const next = [...objs]; next[i] = e.target.value; setObjs(next) }}
                              className="flex-1 text-sm text-slate-700 dark:text-slate-200 bg-transparent border-none outline-none placeholder:text-slate-400"
                              placeholder={i === 0 ? 'Ex: Reconhecer e distinguir pulsação de ritmo...' : i === 1 ? 'Ex: Cantar a melodia com afinação...' : 'Ex: Criar variação rítmica em grupo...'}
                            />
                            <button type="button" onClick={() => setObjs(objs.filter((_, j) => j !== i))}
                              className="shrink-0 text-slate-300 hover:text-red-500 transition-colors text-sm leading-none mt-0.5">×</button>
                          </div>
                        ))}
                        {objs.length < 3 && (
                          <button type="button" onClick={() => setObjs([...objs, ''])}
                            className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors flex items-center gap-1">
                            + Adicionar objetivo
                          </button>
                        )}
                        {objs.length === 0 && (
                          <p className="text-xs text-slate-400 italic">Clique em "+ Adicionar" para incluir objetivos específicos.</p>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ ACCORDION: AVALIAÇÃO ════ */}
        {!modoRapido && (
          <div className="border-b border-slate-100 dark:border-[#374151]">
            <button type="button" onClick={() => toggleSecaoForm('avaliacao')}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left group bg-slate-50/70 dark:bg-transparent hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors">
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] group-hover:text-slate-600 transition-colors">Avaliação</span>
                {!secoesForm.has('avaliacao') && (() => {
                  const preview = plano.avaliacaoEvidencia || plano.avaliacaoFechamento
                  return preview ? <p className="text-[11px] text-slate-300 mt-0.5 truncate">{preview.slice(0, 60)}</p> : null
                })()}
              </div>
              <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all duration-200 flex-shrink-0 ml-3 ${secoesForm.has('avaliacao') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
            </button>
            {secoesForm.has('avaliacao') && (
              <div className="px-5 pt-4 pb-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">📊 O que observarei para saber se funcionou?</label>
                  <div className="border border-slate-200 dark:border-[#374151] rounded-xl overflow-hidden">
                    <TipTapEditor
                      key={`avaliacao-evidencia-${plano.id}`}
                      initialValue={plano.avaliacaoEvidencia ?? ''}
                      onChange={val => setPlano(p => ({ ...p, avaliacaoEvidencia: val }))}
                      placeholder="Ex: alunos conseguem tocar o ritmo sem apoio visual, participam da improvisação…"
                      toolbarMode="lists-only"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">❓ Qual pergunta farei no fechamento?</label>
                  <div className="border border-slate-200 dark:border-[#374151] rounded-xl overflow-hidden">
                    <TipTapEditor
                      key={`avaliacao-fechamento-${plano.id}`}
                      initialValue={plano.avaliacaoFechamento ?? ''}
                      onChange={val => setPlano(p => ({ ...p, avaliacaoFechamento: val }))}
                      placeholder="Ex: O que foi mais difícil? O que vocês notaram sobre o ritmo?"
                      toolbarMode="lists-only"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">⚡ Se não funcionar, o que farei? <span className="font-normal text-slate-400">(opcional)</span></label>
                  <div className="border border-slate-200 dark:border-[#374151] rounded-xl overflow-hidden">
                    <TipTapEditor
                      key={`avaliacao-contingencia-${plano.id}`}
                      initialValue={plano.avaliacaoContingencia ?? ''}
                      onChange={val => setPlano(p => ({ ...p, avaliacaoContingencia: val }))}
                      placeholder="Ex: simplificar o ritmo, trocar pela atividade de eco…"
                      toolbarMode="lists-only"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ ACCORDION: RECURSOS E MATERIAIS ════ */}
        <div className="border-b border-slate-100 dark:border-[#374151]">
          <button type="button" onClick={() => toggleSecaoForm('recursos')}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left group bg-slate-50/70 dark:bg-transparent hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors">
            <div className="min-w-0 flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] group-hover:text-slate-600 transition-colors">🎬 Recursos e Materiais</span>
              {(plano.recursos || []).length > 0 && (
                <span className="text-[10px] bg-indigo-100 text-indigo-600 font-bold px-1.5 py-0.5 rounded-full">{(plano.recursos || []).length}</span>
              )}
            </div>
            <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all duration-200 flex-shrink-0 ml-3 ${secoesForm.has('recursos') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
          </button>
          {secoesForm.has('recursos') && (
            <div className="px-5 pt-5 pb-5 space-y-4">
              {!modoRapido && (
                <>
                  <p className="text-[11px] text-slate-400">Conteúdos digitais de apoio — músicas, vídeos, partituras, imagens, links.</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input type="text" placeholder="Cole aqui: YouTube, Spotify, PDF, link..." value={novoRecursoUrl}
                        onChange={e => setNovoRecursoUrl(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarRecurso() } }}
                        className="w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" />
                      {novoRecursoUrl && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base">{getRecursoMeta(detectarTipoRecurso(novoRecursoUrl)).icone}</span>
                      )}
                    </div>
                    <button type="button" onClick={adicionarRecurso} disabled={!novoRecursoUrl.trim()}
                      className="border border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors shrink-0 disabled:opacity-40">
                      + Add
                    </button>
                  </div>
                </>
              )}
              {(plano.recursos || []).length > 0 && (
                <div className="space-y-1.5">
                  {(plano.recursos || []).map((rec, idx) => {
                    const tipo = rec.tipo || detectarTipoRecurso(rec.url)
                    const { icone, label, cor } = getRecursoMeta(tipo)
                    const ytId = (tipo === 'video' || tipo === 'youtube') ? getYoutubeId(rec.url) : null
                    const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null
                    return (
                      <div key={idx} className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${cor.split(' ').slice(0, 2).join(' ')}`}>
                        <a href={rec.url} target="_blank" rel="noopener noreferrer"
                          className="relative w-16 h-11 shrink-0 flex items-center justify-center rounded-lg overflow-hidden bg-white/60">
                          <span className="text-xl leading-none">{icone}</span>
                          {thumbUrl && <img src={thumbUrl} alt="thumb" className="absolute inset-0 w-full h-full object-cover rounded-lg shadow-sm" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
                        </a>
                        <div className="flex-1 min-w-0">
                          <span className={`text-[10px] font-bold uppercase tracking-wide ${cor.split(' ').slice(2).join(' ')}`}>{label}</span>
                          <a href={rec.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-slate-400 hover:underline truncate block">{rec.url}</a>
                        </div>
                        <button type="button"
                          onClick={() => setPlano(p => ({ ...p, recursos: (p.recursos || []).filter((_, i) => i !== idx) }))}
                          className="text-slate-300 hover:text-red-500 transition shrink-0 text-xs mt-0.5">✕</button>
                      </div>
                    )
                  })}
                </div>
              )}
              {/* Materiais físicos (detalhado) */}
              {modoDetalhado && (() => {
                const mats = [...(plano.materiais || []), ...(plano.materiaisNecessarios || []).filter(m => !(plano.materiais || []).includes(m))]
                const removerMat = (mat: string) => setPlano(p => ({
                  ...p,
                  materiais: (p.materiais || []).filter(m => m !== mat),
                  materiaisNecessarios: (p.materiaisNecessarios || []).filter(m => m !== mat),
                }))
                const adicionarMat = (val: string) => {
                  if (!val || mats.includes(val)) return
                  setPlano(p => ({ ...p, materiaisNecessarios: [...(p.materiaisNecessarios || []), val] }))
                }
                return (
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 mb-2">📦 O que preciso levar</p>
                    {mats.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {mats.map((mat, mi) => (
                          <span key={mi} className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                            {mat}
                            <button type="button" onClick={() => removerMat(mat)} className="hover:text-rose-500 ml-0.5 leading-none">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <input type="text" placeholder="Ex: pandeiro, papel A4… Enter ↵"
                      value={novoMaterial}
                      onChange={e => setNovoMaterial(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          adicionarMat(novoMaterial.trim())
                          setNovoMaterial('')
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-[#374151] rounded-xl text-xs outline-none focus:border-indigo-400 bg-white dark:bg-[var(--v2-card)] dark:text-white" />
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        {/* ════ ACCORDION: BNCC ════ */}
        {modoDetalhado && (
          <div className="border-b border-slate-100 dark:border-[#374151]">
            <button type="button" onClick={() => toggleSecaoForm('bncc')}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left group bg-slate-50/70 dark:bg-transparent hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors">
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] group-hover:text-slate-600 transition-colors">BNCC</span>
                {!secoesForm.has('bncc') && (plano.habilidadesBNCC || []).filter(Boolean).length > 0 && (
                  <p className="text-[11px] text-slate-300 mt-0.5">{(plano.habilidadesBNCC || []).filter(Boolean).length} habilidade{(plano.habilidadesBNCC || []).filter(Boolean).length > 1 ? 's' : ''}</p>
                )}
              </div>
              <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all duration-200 flex-shrink-0 ml-3 ${secoesForm.has('bncc') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
            </button>
            {secoesForm.has('bncc') && (
              <div className="px-5 pt-5 pb-5 space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">🏛️ Habilidades BNCC</label>
                  <button type="button" onClick={sugerirBNCC} disabled={gerandoBNCC}
                    className="flex items-center gap-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50">
                    {gerandoBNCC ? '⏳ Gerando...' : '✨ Sugerir com IA'}
                  </button>
                </div>
                {(plano.habilidadesBNCC || []).filter(Boolean).length > 0 && (
                  <div className="flex flex-col gap-2">
                    {(plano.habilidadesBNCC || []).filter(Boolean).map((hab, i) => {
                      const codigo = extrairCodigo(hab)
                      const encontrado = BNCC_MUSICA.find(b => b.codigo === codigo)
                      return (
                        <div key={i} className="flex items-start gap-2.5 bg-violet-50 dark:bg-violet-400/10 border border-violet-200 dark:border-violet-400/20 rounded-xl px-3 py-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-violet-700">{codigo}</span>
                              {encontrado && <span className="text-[10px] font-medium text-violet-400 bg-violet-100 px-1.5 py-px rounded-full">{encontrado.anos}</span>}
                            </div>
                            <p className="text-[11px] text-violet-600 leading-relaxed">{encontrado?.descricao ?? hab.replace(/^EF\w+\s*-?\s*/, '')}</p>
                          </div>
                          <button type="button"
                            onClick={() => setPlano(p => ({ ...p, habilidadesBNCC: (p.habilidadesBNCC || []).filter((_, j) => j !== i) }))}
                            className="text-violet-300 hover:text-red-500 transition text-base leading-none shrink-0 mt-0.5">×</button>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className="relative">
                  <input type="text" value={bnccBusca} onChange={e => setBnccBusca(e.target.value)}
                    placeholder="Buscar por código (EF15AR14…) ou palavra (ritmo, improvisação…)"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-[#374151] rounded-xl text-sm bg-white dark:bg-[var(--v2-card)] dark:text-white placeholder:text-slate-400 focus:border-violet-400 outline-none transition-colors"
                  />
                  {bnccBusca.trim() && (() => {
                    const resultados = buscarBNCC(bnccBusca).slice(0, 6)
                    if (resultados.length === 0) return (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1F2937] border border-slate-200 rounded-xl shadow-xl z-50 px-3 py-2.5">
                        <p className="text-xs text-slate-400">Nenhuma habilidade encontrada para "{bnccBusca}"</p>
                      </div>
                    )
                    return (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1F2937] border border-slate-200 dark:border-[#374151] rounded-xl shadow-xl z-50 overflow-hidden">
                        {resultados.map(b => {
                          const jaAdicionado = (plano.habilidadesBNCC || []).some(h => extrairCodigo(h) === b.codigo)
                          return (
                            <button key={b.codigo} type="button" disabled={jaAdicionado}
                              onClick={() => {
                                if (!jaAdicionado) {
                                  setPlano(p => ({ ...p, habilidadesBNCC: [...(p.habilidadesBNCC || []), `${b.codigo} - ${b.descricao}`] }))
                                  setBnccBusca('')
                                }
                              }}
                              className="w-full text-left px-3 py-2.5 hover:bg-violet-50 transition border-b border-slate-100 last:border-0 disabled:opacity-40">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-bold text-violet-700">{b.codigo}</span>
                                <span className="text-[10px] text-slate-400">{b.anos}</span>
                                {jaAdicionado && <span className="text-[10px] text-emerald-600 ml-auto font-semibold">✓ adicionado</span>}
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-2">{b.descricao}</p>
                            </button>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
                {(plano.habilidadesBNCC || []).filter(Boolean).length === 0 && !gerandoBNCC && (
                  <p className="text-xs text-slate-400 italic">Clique em "✨ Sugerir com IA" ou busque um código acima.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════ ALERTAS PEDAGÓGICOS ════ */}
        {(() => {
          const ativs = plano.atividadesRoteiro || []
          const musicas = plano.musicasVinculadasPlano || []
          const alertas: { icon: string; texto: string }[] = []
          if (ativs.length >= 2 && !ativs.some(a => a.tipoFase === 'fechamento'))
            alertas.push({ icon: '⚠️', texto: 'Roteiro sem atividade de Fechamento' })
          if (musicas.length === 0 && plano.titulo.trim())
            alertas.push({ icon: '🎵', texto: 'Nenhuma música vinculada ao plano' })
          const temObjetivos = (plano.objetivoGeral || '').replace(/<[^>]+>/g, '').trim() || (plano.objetivosEspecificos || []).filter(Boolean).length > 0
          if (temObjetivos && ativs.length === 0)
            alertas.push({ icon: '📋', texto: 'Objetivos definidos mas roteiro vazio' })
          if (alertas.length === 0) return null
          return (
            <div className="px-5 pb-4 pt-3 border-t border-slate-100 dark:border-[#374151]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Sugestões</p>
              <div className="flex flex-wrap gap-1.5">
                {alertas.map((a, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-slate-50 dark:bg-white/[0.04] text-slate-500 border border-slate-200 dark:border-[#374151] px-2.5 py-1 rounded-lg">
                    <span className="text-[10px]">{a.icon}</span>{a.texto}
                  </span>
                ))}
              </div>
            </div>
          )
        })()}

        {/* ════ FOOTER STICKY ════ */}
        <div className="px-4 py-3 bg-white dark:bg-[var(--v2-card)] border-t border-slate-100 dark:border-[#374151] sticky bottom-0">
          <div className="flex gap-2">
            <button type="button" onClick={onCancelar}
              className="flex-1 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-sm active:scale-95">
              Cancelar
            </button>
            <button type="button" onClick={handleSalvar} disabled={estadoSalvar !== 'idle'}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-white transition-all text-sm active:scale-95 ${estadoSalvar === 'salvo' ? 'bg-emerald-500' : estadoSalvar === 'salvando' ? 'bg-slate-600 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white'}`}>
              {estadoSalvar === 'salvando' ? 'Salvando...' : estadoSalvar === 'salvo' ? '✓ Salvo!' : '💾 Salvar Aula'}
            </button>
          </div>
        </div>

      </div>{/* fim overflow-y-auto */}

      {/* Modal Ampliar Ideias */}
      {ampliarOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={() => !ampliarLoading && setAmpliarOpen(false)}>
          <div className="bg-white dark:bg-[var(--v2-card)] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[88vh] sm:max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 bg-slate-200 dark:bg-slate-600 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#374151]">
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-white">✨ Ampliar Ideias</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Pontos de partida — use como inspiração, não como receita</p>
              </div>
              {!ampliarLoading && (
                <button type="button" onClick={() => setAmpliarOpen(false)} className="text-slate-300 hover:text-slate-500 text-lg leading-none transition-colors">×</button>
              )}
            </div>
            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
              {ampliarLoading ? (
                <div className="flex flex-col items-center gap-3 py-10">
                  <svg className="w-6 h-6 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  <p className="text-sm text-slate-400">Gerando sugestões...</p>
                </div>
              ) : ampliarSugestoes.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Nenhuma sugestão gerada.</p>
              ) : ampliarSugestoes.map((s, i) => {
                const aberto = ampliarExpandido === i
                return (
                  <div key={i} className={`rounded-xl border transition-all ${aberto ? 'border-indigo-300 dark:border-indigo-500/50 shadow-sm' : 'border-slate-200 dark:border-[#374151] hover:border-slate-300 dark:hover:border-[#4B5563]'}`}>
                    <button
                      type="button"
                      onClick={() => setAmpliarExpandido(aberto ? null : i)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 dark:text-white truncate">{s.nome}</p>
                        {s.duracao && <p className="text-[11px] text-slate-400 mt-0.5">⏱ {s.duracao} min</p>}
                      </div>
                      <svg className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {aberto && (
                      <div className="px-4 pb-4 border-t border-slate-100 dark:border-[#374151]">
                        {s.descricao && <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">{s.descricao}</p>}
                        <div className="flex gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => { adicionarSugestao(s); setAmpliarOpen(false) }}
                            className="flex-1 px-3 py-2 border border-indigo-400 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
                            + Usar esta atividade
                          </button>
                          <button
                            type="button"
                            onClick={() => { adicionarSugestao(s); setAmpliarOpen(false) }}
                            className="px-3 py-2 border border-slate-200 dark:border-[#374151] text-slate-500 dark:text-slate-400 text-xs font-medium rounded-lg hover:border-slate-300 hover:text-slate-600 transition-colors whitespace-nowrap">
                            Adaptar antes
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {!ampliarLoading && ampliarSugestoes.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 dark:border-[#374151] flex gap-2">
                <button type="button" onClick={ampliarIdeias}
                  className="flex-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-[#374151] hover:border-slate-300 px-3 py-2 rounded-xl transition-colors">
                  ↻ Outras ideias
                </button>
                <button type="button" onClick={() => setAmpliarOpen(false)}
                  className="px-4 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors">
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal conceitos */}
      {modalConceitos && (
        <ModalConceitosPlano
          conceitos={modalConceitos}
          onConfirmar={novosConceitos => {
            const planoFinal = { ...plano, conceitos: novosConceitos, contextoAulaAnterior: modo === 'adaptar' ? contextoAulaAnterior : plano.contextoAulaAnterior }
            setModalConceitos(null)
            setEstadoSalvar('salvo')
            setTimeout(() => setEstadoSalvar('idle'), 1200)
            onSalvar(planoFinal)
          }}
          onFechar={() => {
            setModalConceitos(null)
            finalizarSalvar(plano)
          }}
        />
      )}

      {/* Indicador detectando conceitos */}
      {detectandoConceitos && (
        <div className="fixed bottom-20 right-4 z-40 bg-white dark:bg-[#1F2937] border border-slate-200 dark:border-[#374151] rounded-xl px-3 py-2 shadow-lg flex items-center gap-2 text-[11px] text-slate-500">
          <span className="w-3 h-3 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          Detectando conceitos…
        </div>
      )}

    </div>
  )
}
