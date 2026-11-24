import {
  MAX_ANALYSIS_MS,
  MAX_MP3_ANALYSIS_MS,
  type AnalysisOutcome,
  type AudioContentType,
} from './versionSchema'

type WorkerMessage =
  | { type: 'progress'; percent: number }
  | { type: 'done'; outcome: AnalysisOutcome }
  | { type: 'error' }

export function startAnalysis(
  file: File,
  contentType: AudioContentType,
  durationMs: number,
  onProgress: (percent: number) => void,
): { result: Promise<AnalysisOutcome>; cancel(): void } {
  let worker: Worker | null = null
  let settled = false
  let resolve: (outcome: AnalysisOutcome) => void = () => {}

  const result = new Promise<AnalysisOutcome>((r) => {
    resolve = r
  })

  const settle = (outcome: AnalysisOutcome) => {
    if (settled) return
    settled = true
    worker?.terminate()
    resolve(outcome)
  }
  const fail = () => settle({ analysis: null, reason: 'error' })

  async function run() {
    if (durationMs > MAX_ANALYSIS_MS) return settle({ analysis: null, reason: 'duracion' })
    if (contentType === 'audio/mpeg' && durationMs > MAX_MP3_ANALYSIS_MS) {
      return settle({ analysis: null, reason: 'mp3' })
    }
    if (typeof Worker === 'undefined') return fail()

    let message: unknown = { kind: 'wav', file, durationMs }
    let transfer: Transferable[] = []

    if (contentType === 'audio/mpeg') {
      const buffer = await new OfflineAudioContext(1, 1, 48000).decodeAudioData(
        await file.arrayBuffer(),
      )
      const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) =>
        buffer.getChannelData(c).slice(),
      )
      message = { kind: 'pcm', sampleRate: buffer.sampleRate, channels, durationMs }
      transfer = channels.map((c) => c.buffer)
    }

    if (settled) return

    worker = new Worker(new URL('./audioAnalysis.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
      if (data.type === 'progress') onProgress(data.percent)
      else if (data.type === 'done') settle(data.outcome)
      else fail()
    }
    worker.onerror = fail
    worker.postMessage(message, transfer)
  }

  run().catch(fail)

  return { result, cancel: fail }
}
