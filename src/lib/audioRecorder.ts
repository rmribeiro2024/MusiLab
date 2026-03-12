/**
 * audioRecorder.ts
 * Wrapper sobre MediaRecorder para gravações curtas de áudio (máx. 60s).
 * Sem dependências externas — usa Web Audio API nativa.
 */

let recorder: MediaRecorder | null = null
let chunks: Blob[] = []

/** Tipos MIME tentados em ordem de preferência */
const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
]

function getSupportedMime(): string {
  for (const mime of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return '' // deixa o browser escolher
}

/**
 * Inicia a gravação pelo microfone.
 * Lança erro se a permissão for negada ou se o browser não suportar MediaRecorder.
 */
export async function startRecording(): Promise<void> {
  if (recorder && recorder.state === 'recording') return

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true },
  })

  chunks = []
  const mime = getSupportedMime()
  const options: MediaRecorderOptions = { audioBitsPerSecond: 16000 }
  if (mime) options.mimeType = mime

  recorder = new MediaRecorder(stream, options)
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }
  recorder.start(200) // coleta chunks a cada 200ms
}

/**
 * Para a gravação e retorna o Blob resultante.
 */
export function stopRecording(): Promise<Blob> {
  return new Promise((resolve) => {
    if (!recorder || recorder.state === 'inactive') {
      resolve(new Blob([], { type: 'audio/webm' }))
      return
    }
    const mime = recorder.mimeType || 'audio/webm'
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mime })
      // libera o stream (apaga indicador de microfone no browser)
      recorder?.stream.getTracks().forEach((t) => t.stop())
      recorder = null
      chunks = []
      resolve(blob)
    }
    recorder.stop()
  })
}

/**
 * Converte um Blob de áudio para string base64 (sem o prefixo data:...).
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      // result = "data:audio/webm;base64,AAAA..."
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Reconstrói uma URL de objeto a partir de base64 para uso em <audio src=...>.
 */
export function base64ToObjectUrl(base64: string, mimeType = 'audio/webm'): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: mimeType })
  return URL.createObjectURL(blob)
}

/** Tamanho aproximado em KB de uma string base64 */
export function base64SizeKb(base64: string): number {
  return Math.round((base64.length * 3) / 4 / 1024)
}
