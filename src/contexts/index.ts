// src/contexts/index.ts
// Barrel export — adicionar um contexto por vez conforme as partes avançam.

export { useModalContext, ModalProvider } from './ModalContext'
export { useEstrategiasContext, EstrategiasProvider } from './EstrategiasContext'  // Parte 2
export { useRepertorioContext, RepertorioProvider } from './RepertorioContext'  // Parte 3
export { useAtividadesContext, AtividadesProvider } from './AtividadesContext'  // Parte 4
export { useSequenciasContext, SequenciasProvider } from './SequenciasContext'  // Parte 5
export { useHistoricoContext, HistoricoProvider } from './HistoricoContext'     // Parte 5
export { useAnoLetivoContext, AnoLetivoProvider } from './AnoLetivoContext'  // Parte 6
export { useCalendarioContext, CalendarioProvider } from './CalendarioContext'  // Parte 7
export { useAplicacoesContext, AplicacoesProvider } from './AplicacoesContext'  // Aplicações de aula
export { usePlanosContext, PlanosProvider, normalizePlano } from './PlanosContext'   // Parte 8
export { usePlanejamentoTurmaContext, PlanejamentoTurmaProvider } from './PlanejamentoTurmaContext'
export { useEventosContext, EventosProvider } from './EventosContext'
