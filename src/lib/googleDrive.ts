// Google Drive upload utility
// Scope mínimo: drive.file — só acessa arquivos criados pelo próprio app
const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const ROOT_FOLDER = 'MusiLab Evidências'

let tokenClient: any = null
let accessToken: string | null = null

export interface EvidenciaUploadResult {
    webViewLink: string
    thumbnailLink: string
}

export function isMobileDevice(): boolean {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export function hasValidToken(): boolean {
    return !!accessToken
}

// Chama no mount do app — extrai token do hash se voltou de redirect OAuth
export function checkRedirectToken(): boolean {
    const hash = window.location.hash
    if (!hash.includes('access_token=')) return false
    const params = new URLSearchParams(hash.replace(/^#/, ''))
    const token = params.get('access_token')
    if (token) {
        accessToken = token
        window.history.replaceState(null, '', window.location.pathname + window.location.search + '#')
        return true
    }
    return false
}

// Redireciona para Google OAuth (mobile) — sem popup
export function redirectToGoogleAuth(clientId: string): void {
    const redirectUri = window.location.origin + window.location.pathname
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'token',
        scope: SCOPE,
        include_granted_scopes: 'true',
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

function loadGIS(): Promise<void> {
    if ((window as any).google?.accounts?.oauth2) return Promise.resolve()
    return new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src = 'https://accounts.google.com/gsi/client'
        s.onload = () => resolve()
        s.onerror = () => reject(new Error('Falha ao carregar Google Identity Services'))
        document.head.appendChild(s)
    })
}

// Inicializa o token client sem abrir popup — chamar antes do clique do usuário
export async function initDriveAuth(
    clientId: string,
    onToken: (token: string) => void,
    onError: (msg: string) => void
): Promise<void> {
    await loadGIS()
    tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: (resp: any) => {
            if (resp.error) { onError(`Erro Google: ${resp.error}`); return }
            accessToken = resp.access_token
            onToken(resp.access_token)
        },
        error_callback: (err: any) => {
            onError(`Erro OAuth: ${err?.type || err}`)
        },
    })
}

// Chama diretamente de um clique do usuário (contexto síncrono — sem await antes)
export function requestDriveToken(): void {
    tokenClient?.requestAccessToken({ prompt: accessToken ? '' : 'consent' })
}

async function getOrCreateFolder(token: string, name: string, parentId?: string): Promise<string> {
    const parentClause = parentId ? ` and '${parentId}' in parents` : ` and 'root' in parents`
    const q = encodeURIComponent(
        `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentClause}`
    )
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    const { files } = await res.json()
    if (files?.length) return files[0].id

    const body: any = { name, mimeType: 'application/vnd.google-apps.folder' }
    if (parentId) body.parents = [parentId]
    const create = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    const { id } = await create.json()
    return id
}

export async function uploadEvidencia(
    file: File,
    _clientId: string,
    onProgress?: (pct: number) => void,
    meta?: { escola?: string; turma?: string; data?: string }
): Promise<EvidenciaUploadResult> {
    const token = accessToken
    if (!token) throw new Error('Não autenticado. Conecte o Google Drive primeiro.')

    // Hierarquia: MusiLab Evidências / Escola / Turma
    const rootId = await getOrCreateFolder(token, ROOT_FOLDER)
    const escolaId = meta?.escola
        ? await getOrCreateFolder(token, meta.escola, rootId)
        : rootId
    const folderId = meta?.turma
        ? await getOrCreateFolder(token, meta.turma, escolaId)
        : escolaId

    onProgress?.(10)

    // Renomeia: 2026-03-20_NomeTurma_arquivo.jpg
    const prefix = [meta?.data, meta?.turma].filter(Boolean).join('_')
    const fileName = prefix ? `${prefix}_${file.name}` : file.name

    const metadata = JSON.stringify({ name: fileName, parents: [folderId] })
    const form = new FormData()
    form.append('metadata', new Blob([metadata], { type: 'application/json' }))
    form.append('file', file)

    onProgress?.(30)

    const upload = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,thumbnailLink,name,mimeType',
        { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
    )

    if (!upload.ok) throw new Error(`Erro no upload: ${upload.status}`)
    const fileData = await upload.json()

    onProgress?.(80)

    // Torna o arquivo acessível por qualquer pessoa com o link
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    })

    onProgress?.(100)
    return {
        webViewLink: fileData.webViewLink as string,
        thumbnailLink: (fileData.thumbnailLink as string) || '',
    }
}

export function isGoogleDriveConfigured(): boolean {
    return !!import.meta.env.VITE_GOOGLE_CLIENT_ID
}
