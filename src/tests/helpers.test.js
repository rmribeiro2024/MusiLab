// ── Testes: src/utils/helpers.js ──
// Cobre lerLS, salvarLS e formatarData

vi.mock('../lib/db', () => ({
    dbGet: vi.fn(),
    dbSet: vi.fn(),
}))

import { lerLS, salvarLS, formatarData } from '../utils/helpers'
import { dbGet, dbSet } from '../lib/db'

describe('lerLS', () => {
    beforeEach(() => vi.clearAllMocks())

    it('retorna array parseado do JSON quando key existe', () => {
        dbGet.mockReturnValue('["plano1","plano2"]')
        expect(lerLS('planosAula')).toEqual(['plano1', 'plano2'])
    })

    it('retorna objeto parseado do JSON quando valor é objeto', () => {
        dbGet.mockReturnValue('{"nome":"João"}')
        expect(lerLS('config')).toEqual({ nome: 'João' })
    })

    it('retorna [] quando JSON é inválido', () => {
        dbGet.mockReturnValue('not-valid-json{{')
        expect(lerLS('key')).toEqual([])
    })

    it('retorna [] quando key não existe (null)', () => {
        dbGet.mockReturnValue(null)
        expect(lerLS('key')).toEqual([])
    })
})

describe('salvarLS', () => {
    beforeEach(() => vi.clearAllMocks())

    it('chama dbSet com a chave e JSON.stringify do valor', () => {
        salvarLS('planosAula', [{ id: 1, titulo: 'Plano A' }])
        expect(dbSet).toHaveBeenCalledWith('planosAula', '[{"id":1,"titulo":"Plano A"}]')
    })

    it('serializa corretamente um objeto', () => {
        salvarLS('config', { darkMode: true })
        expect(dbSet).toHaveBeenCalledWith('config', '{"darkMode":true}')
    })
})

describe('formatarData', () => {
    it('formata data válida no padrão pt-BR (dd/mm/yyyy)', () => {
        expect(formatarData('2025-01-15')).toBe('15/01/2025')
    })

    it('retorna string vazia para entrada vazia', () => {
        expect(formatarData('')).toBe('')
    })

    it('retorna string vazia para entrada nula', () => {
        expect(formatarData(null)).toBe('')
        expect(formatarData(undefined)).toBe('')
    })

    it('aceita opções customizadas de formatação', () => {
        const resultado = formatarData('2025-03-20', { month: 'long', year: 'numeric' })
        expect(resultado).toContain('2025')
    })
})
