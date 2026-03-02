// ── Testes: src/lib/db.js ──
// Cobre dbGet, dbSet, dbDel, dbSize, dbInit

// Mock estável do IndexedDB (idb)
const mockPut = vi.fn(() => Promise.resolve())
const mockDelete = vi.fn(() => Promise.resolve())
const mockGetAllKeys = vi.fn(() => Promise.resolve([]))
const mockIdbGet = vi.fn((_, key) => Promise.resolve(null))

const mockDb = {
    getAllKeys: mockGetAllKeys,
    get: mockIdbGet,
    put: mockPut,
    delete: mockDelete,
}

vi.mock('idb', () => ({
    openDB: vi.fn(() => Promise.resolve(mockDb)),
}))

import { dbGet, dbSet, dbDel, dbSize, dbInit } from '../lib/db'

describe('dbGet / dbSet', () => {
    it('dbSet atualiza cache e dbGet retorna o valor imediatamente (síncrono)', () => {
        dbSet('sg-key', 'meu-valor')
        expect(dbGet('sg-key')).toBe('meu-valor')
    })

    it('dbGet retorna null para key inexistente', () => {
        expect(dbGet('key-que-nao-existe-xyz')).toBeNull()
    })

    it('dbSet sobrescreve valor existente no cache', () => {
        dbSet('overwrite-key', 'v1')
        dbSet('overwrite-key', 'v2')
        expect(dbGet('overwrite-key')).toBe('v2')
    })
})

describe('dbDel', () => {
    it('remove a key do cache após dbDel', () => {
        dbSet('del-key', 'valor-para-deletar')
        expect(dbGet('del-key')).toBe('valor-para-deletar')
        dbDel('del-key')
        expect(dbGet('del-key')).toBeNull()
    })

    it('não lança erro ao deletar key inexistente', () => {
        expect(() => dbDel('nao-existe-nunca')).not.toThrow()
    })
})

describe('dbSize', () => {
    it('retorna número não-negativo', () => {
        expect(dbSize()).toBeGreaterThanOrEqual(0)
    })

    it('aumenta após dbSet com valor', () => {
        const antes = dbSize()
        dbSet('size-test-key', 'abcdefghij') // 10 chars = 20 bytes
        expect(dbSize()).toBeGreaterThan(antes)
    })

    it('diminui após dbDel', () => {
        dbSet('size-del-key', 'abcdef')
        const depois = dbSize()
        dbDel('size-del-key')
        expect(dbSize()).toBeLessThan(depois)
    })
})

describe('dbInit', () => {
    it('carrega dados existentes do IDB para o cache síncrono', async () => {
        mockGetAllKeys.mockResolvedValue(['init-key'])
        mockIdbGet.mockResolvedValue('init-value')

        await dbInit()

        expect(dbGet('init-key')).toBe('init-value')
    })

    it('migra dados do localStorage para o IndexedDB quando IDB está vazio', async () => {
        mockGetAllKeys.mockResolvedValue([])
        localStorage.setItem('migrate-test-key', 'migrated-value')

        await dbInit()

        expect(dbGet('migrate-test-key')).toBe('migrated-value')
        localStorage.removeItem('migrate-test-key')
    })
})
