import { openDB } from 'idb'

const DB_NAME = 'musilab-db'
const STORE = 'musilab-store'

let _db = null
const _cache = {}

async function getDB() {
    if (_db) return _db
    _db = await openDB(DB_NAME, 1, {
        upgrade(db) { db.createObjectStore(STORE) }
    })
    return _db
}

// Call once before React renders to pre-populate synchronous cache
export async function dbInit() {
    const db = await getDB()
    const allKeys = await db.getAllKeys(STORE)
    const allVals = await Promise.all(allKeys.map(k => db.get(STORE, k)))
    allKeys.forEach((k, i) => { _cache[k] = allVals[i] })

    // First-time migration: copy localStorage → IndexedDB
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

// Synchronous read from in-memory cache (mirrors localStorage.getItem)
export function dbGet(key) {
    const v = _cache[key]
    return v !== undefined ? v : null
}

// Write to cache + async persist to IndexedDB (mirrors localStorage.setItem)
export function dbSet(key, value) {
    _cache[key] = value
    getDB().then(db => db.put(STORE, value, key))
}

// Delete from cache + async persist (mirrors localStorage.removeItem)
export function dbDel(key) {
    delete _cache[key]
    getDB().then(db => db.delete(STORE, key))
}

// Estimated size of all cached values in bytes
export function dbSize() {
    let total = 0
    for (const v of Object.values(_cache)) {
        if (v) total += v.length * 2
    }
    return total
}
