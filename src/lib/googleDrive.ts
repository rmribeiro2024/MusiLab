// Google Drive upload utility
// Scope mínimo: drive.file — só acessa arquivos criados pelo próprio app
const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const FOLDER_NAME = 'MusiLab Evidências'

let tokenClient: any = null
let accessToken: string | null = null

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
        // Limpa o hash da URL sem recarregar
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

async function getAccessTokenPopup(clientId: string): Promise<string> {
    if (accessToken) return accessToken
    await loadGIS()
    return new Promise((resolve, reject) => {
        tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPE,
            callback: (resp: any) => {
                if (resp.error) { reject(new Error(resp.error)); return }
                accessToken = resp.access_token
                resolve(resp.access_token)
            },
        })
        tokenClient.requestAccessToken({ prompt: '' })
    })
}

async function getOrCreateFolder(token: string): Promise<string> {
    const q = encodeURIComponent(
        `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    )
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    const { files } = await res.json()
    if (files?.length) return files[0].id

    const create = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder',
        }),
    })
    const { id } = await create.json()
    return id
}

export async function uploadEvidencia(
    file: File,
    clientId: string,
    onProgress?: (pct: number) => void
): Promise<string> {
    // Mobile usa redirect flow — token já deve estar em accessToken
    // Desktop usa popup
    const token = isMobileDevice()
        ? (accessToken ?? (() => { throw new Error('Não autenticado. Conecte o Google Drive primeiro.') })())
        : await getAccessTokenPopup(clientId)

    const folderId = await getOrCreateFolder(token)

    onProgress?.(10)

    const meta = JSON.stringify({ name: file.name, parents: [folderId] })
    const form = new FormData()
    form.append('metadata', new Blob([meta], { type: 'application/json' }))
    form.append('file', file)

    onProgress?.(30)

    const upload = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,name,mimeType',
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
    return fileData.webViewLink as string
}

export function isGoogleDriveConfigured(): boolean {
    return !!import.meta.env.VITE_GOOGLE_CLIENT_ID
}
