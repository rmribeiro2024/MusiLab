// Google Drive upload utility
// Scope mínimo: drive.file — só acessa arquivos criados pelo próprio app
const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const FOLDER_NAME = 'MusiLab Evidências'

let tokenClient: any = null
let accessToken: string | null = null

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

async function getAccessToken(clientId: string): Promise<string> {
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
        // Se já tem token válido, não pede consent de novo
        tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' })
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

    // Cria a pasta se não existir
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
    const token = await getAccessToken(clientId)
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
