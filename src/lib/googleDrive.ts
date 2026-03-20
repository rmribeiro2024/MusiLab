// Google Drive upload utility
// Scope mínimo: drive.file — só acessa arquivos criados pelo próprio app
const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const ROOT_FOLDER = 'MusiLab Evidências'

let tokenClient: any = null
let accessToken: string | null = null

const TOKEN_KEY = 'musilab_drive_token'
const TOKEN_EXP_KEY = 'musilab_drive_token_exp'

function saveToken(token: string, expiresIn = 3600): void {
    accessToken = token
    sessionStorage.setItem(TOKEN_KEY, token)
    sessionStorage.setItem(TOKEN_EXP_KEY, String(Date.now() + (expiresIn - 60) * 1000))
}

function loadStoredToken(): string | null {
    const token = sessionStorage.getItem(TOKEN_KEY)
    const exp = Number(sessionStorage.getItem(TOKEN_EXP_KEY) || 0)
    if (token && Date.now() < exp) {
        accessToken = token
        return token
    }
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_EXP_KEY)
    return null
}

export interface EvidenciaUploadResult {
    webViewLink: string
    thumbnailLink: string
}

export function isMobileDevice(): boolean {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export function hasValidToken(): boolean {
    return !!(accessToken || loadStoredToken())
}

// Chama no mount do app — extrai token do hash se voltou de redirect OAuth
export function checkRedirectToken(): boolean {
    const hash = window.location.hash
    if (!hash.includes('access_token=')) return false
    const params = new URLSearchParams(hash.replace(/^#/, ''))
    const token = params.get('access_token')
    const expiresIn = Number(params.get('expires_in') || 3600)
    if (token) {
        saveToken(token, expiresIn)
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

// Inicializa o token client e tenta auth silenciosa (prompt:none = iframe oculto, sem UI)
// Se o usuário já autorizou antes → token renovado automaticamente, sem mostrar nada
// Se é a primeira vez → onSilentFail é chamado → UI mostra botão "Conectar"
export async function initDriveAuth(
    clientId: string,
    onToken: (token: string) => void,
    onError: (msg: string) => void,
    onSilentFail?: () => void
): Promise<void> {
    await loadGIS()
    tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: (resp: any) => {
            if (resp.error) {
                // Erros silenciosos (interaction_required) = primeira vez → mostrar botão
                const silentErrors = ['interaction_required', 'consent_required', 'login_required', 'access_denied']
                if (silentErrors.includes(resp.error)) { onSilentFail?.(); return }
                onError(`Erro Google: ${resp.error}`)
                return
            }
            saveToken(resp.access_token, resp.expires_in || 3600)
            onToken(resp.access_token)
        },
        error_callback: (err: any) => {
            const type = err?.type || ''
            if (type === 'popup_failed_to_open' || type === 'popup_closed') { onSilentFail?.(); return }
            onError(`Erro OAuth: ${type || err}`)
        },
    })
    // Tenta auth silenciosa imediatamente (iframe oculto)
    tokenClient.requestAccessToken({ prompt: 'none' })
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
    const token = accessToken || loadStoredToken()
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
