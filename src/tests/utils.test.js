// ── Testes: src/lib/utils.js ──
// Cobre gerarIdSeguro, sanitizar, loadFromSupabase

// Mock do cliente Supabase
const mockNotIn = vi.fn(() => Promise.resolve({ error: null }))
const mockEqDelete = vi.fn(() => ({ not: mockNotIn }))
const mockEqSelect = vi.fn(() => Promise.resolve({ data: [], error: null }))
const mockSelect = vi.fn(() => ({ eq: mockEqSelect }))
const mockUpsert = vi.fn(() => Promise.resolve({ error: null }))
const mockDeleteChain = vi.fn(() => ({ eq: mockEqDelete }))

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: mockSelect,
            upsert: mockUpsert,
            delete: mockDeleteChain,
        })),
    },
}))

import { gerarIdSeguro, sanitizar, loadFromSupabase } from '../lib/utils'

describe('gerarIdSeguro', () => {
    it('retorna uma string', () => {
        expect(typeof gerarIdSeguro()).toBe('string')
    })

    it('retorna string no formato UUID v4', () => {
        const uuid = gerarIdSeguro()
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        expect(uuid).toMatch(uuidRegex)
    })

    it('gera IDs únicos a cada chamada', () => {
        const id1 = gerarIdSeguro()
        const id2 = gerarIdSeguro()
        expect(id1).not.toBe(id2)
    })
})

describe('sanitizar', () => {
    it('remove tags script (proteção XSS)', () => {
        const resultado = sanitizar('<script>alert("xss")</script>Texto seguro')
        expect(resultado).not.toContain('<script>')
        expect(resultado).toContain('Texto seguro')
    })

    it('preserva tags permitidas (b, i, strong, em)', () => {
        const resultado = sanitizar('<b>negrito</b> e <em>ênfase</em>')
        expect(resultado).toContain('<b>negrito</b>')
        expect(resultado).toContain('<em>ênfase</em>')
    })

    it('retorna string vazia para entrada vazia/nula', () => {
        expect(sanitizar('')).toBe('')
        expect(sanitizar(null)).toBe('')
        expect(sanitizar(undefined)).toBe('')
    })

    it('remove atributos perigosos (onclick, href)', () => {
        const resultado = sanitizar('<b onclick="alert()">texto</b>')
        expect(resultado).not.toContain('onclick')
    })
})

describe('loadFromSupabase', () => {
    beforeEach(() => vi.clearAllMocks())

    it('retorna array de dados quando Supabase responde com sucesso', async () => {
        mockEqSelect.mockResolvedValue({
            data: [{ data: { id: 1, titulo: 'Plano A' } }, { data: { id: 2, titulo: 'Plano B' } }],
            error: null,
        })

        const resultado = await loadFromSupabase('planos', 'user-123')
        expect(resultado).toEqual([{ id: 1, titulo: 'Plano A' }, { id: 2, titulo: 'Plano B' }])
    })

    it('retorna null quando Supabase retorna erro', async () => {
        mockEqSelect.mockResolvedValue({
            data: null,
            error: { message: 'connection refused' },
        })

        const resultado = await loadFromSupabase('planos', 'user-123')
        expect(resultado).toBeNull()
    })

    it('retorna array vazio quando não há dados', async () => {
        mockEqSelect.mockResolvedValue({ data: [], error: null })

        const resultado = await loadFromSupabase('planos', 'user-123')
        expect(resultado).toEqual([])
    })
})
