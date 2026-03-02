// ── Testes: src/components/ErrorBoundary.jsx ──
// Cobre renderização normal, captura de erro e reset

import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from '../components/ErrorBoundary'

// Componente que lança erro para testar o boundary
const BrokenChild = ({ mensagem = 'Erro de teste' }) => {
    throw new Error(mensagem)
}

// Suprimir logs de erro do React nos testes (esperado)
beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
    console.error.mockRestore()
})

describe('ErrorBoundary', () => {
    it('renderiza children normalmente quando não há erro', () => {
        render(
            <ErrorBoundary modulo="Teste">
                <p>Conteúdo normal</p>
            </ErrorBoundary>
        )
        expect(screen.getByText('Conteúdo normal')).toBeInTheDocument()
    })

    it('exibe mensagem de erro com nome do módulo quando filho lança erro', () => {
        render(
            <ErrorBoundary modulo="Calendário">
                <BrokenChild />
            </ErrorBoundary>
        )
        expect(screen.getByText(/Erro em Calendário/i)).toBeInTheDocument()
    })

    it('exibe a mensagem do erro capturado', () => {
        render(
            <ErrorBoundary modulo="Repertório">
                <BrokenChild mensagem="Falha crítica no módulo" />
            </ErrorBoundary>
        )
        expect(screen.getByText(/Falha crítica no módulo/i)).toBeInTheDocument()
    })

    it('mostra botão "Tentar novamente" no estado de erro', () => {
        render(
            <ErrorBoundary modulo="Atividades">
                <BrokenChild />
            </ErrorBoundary>
        )
        expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument()
    })

    it('mostra botão "Recarregar MusiLab" no estado de erro', () => {
        render(
            <ErrorBoundary modulo="Estratégias">
                <BrokenChild />
            </ErrorBoundary>
        )
        expect(screen.getByRole('button', { name: /recarregar musilab/i })).toBeInTheDocument()
    })
})
