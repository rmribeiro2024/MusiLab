import React from 'react'

/**
 * ErrorBoundary — captura erros de renderização React em módulos individuais.
 *
 * Props:
 *   modulo   (string) — nome do módulo, ex: "Calendário". Aparece na mensagem de erro.
 *   children — conteúdo a proteger
 *
 * Uso:
 *   <ErrorBoundary modulo="Calendário">
 *     <TelaCalendario />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { erro: null }
    this.resetar = this.resetar.bind(this)
  }

  static getDerivedStateFromError(erro) {
    return { erro }
  }

  componentDidCatch(erro, info) {
    console.error(`[MusiLab] Erro em "${this.props.modulo || 'módulo'}"`, erro, info)
  }

  resetar() {
    this.setState({ erro: null })
  }

  render() {
    if (!this.state.erro) return this.props.children

    const modulo = this.props.modulo || 'este módulo'
    const mensagem = this.state.erro?.message || String(this.state.erro) || 'Erro desconhecido'

    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="text-base font-semibold text-gray-700 mb-1">
          Erro em {modulo}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Seus dados estão salvos. Tente recarregar o módulo.
        </p>
        <p className="text-xs text-red-400 bg-red-50 rounded-lg px-3 py-2 mb-5 font-mono break-all max-w-md">
          {mensagem}
        </p>
        <div className="flex gap-3">
          <button
            onClick={this.resetar}
            className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-sm font-medium py-2 px-4 rounded-xl transition"
          >
            Tentar novamente
          </button>
          <button
            onClick={() => window.location.reload()}
            className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-sm font-medium py-2 px-4 rounded-xl transition"
          >
            🔄 Recarregar MusiLab
          </button>
        </div>
      </div>
    )
  }
}
