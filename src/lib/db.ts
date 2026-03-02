import { openDB, IDBPDatabase } from 'idb'

const DB_NAME = 'musilab-db'
const STORE = 'musilab-store'

let _db: IDBPDatabase | null = null
const _cache: Record<string, string | null> = {}

async function getDB(): Promise<IDBPDatabase> {
    if (_db) return _db
    _db = await openDB(DB_NAME, 1, {
        upgrade(db) { db.createObjectStore(STORE) }
    })
    return _db
}

// Carrega todos os dados do IndexedDB para o cache síncrono.
// Deve ser chamado uma vez antes do React montar (em main.tsx).
export async function dbInit(): Promise<void> {
    const db = await getDB()
    const allKeys = await db.getAllKeys(STORE) as string[]
    const allVals = await Promise.all(allKeys.map(k => db.get(STORE, k)))
    allKeys.forEach((k, i) => { _cache[k] = allVals[i] })

    // Migração automática na primeira execução: localStorage → IndexedDB
    if (allKeys.length === 0 && localStorage.length > 0) {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i)
            if (k) {
                const v = localStorage.getItem(k)
                _cache[k] = v
                await db.put(STORE, v, k)
            }
        }
    }
}

/** Leitura síncrona do cache (equivalente ao localStorage.getItem) */
export function dbGet(key: string): string | null {
    const v = _cache[key]
    return v !== undefined ? v : null
}

/** Escrita no cache + persistência async no IndexedDB */
export function dbSet(key: string, value: string): void {
    _cache[key] = value
    getDB().then(db => db.put(STORE, value, key))
}

/** Exclusão do cache + persistência async no IndexedDB */
export function dbDel(key: string): void {
    delete _cache[key]
    getDB().then(db => db.delete(STORE, key))
}

/** Tamanho estimado de todos os valores em bytes */
export function dbSize(): number {
    let total = 0
    for (const v of Object.values(_cache)) {
        if (v) total += v.length * 2
    }
    return total
}
