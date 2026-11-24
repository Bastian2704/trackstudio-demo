import { analyzeWav, createMeter } from './audioAnalysis'
import type { AnalysisOutcome } from './versionSchema'


type Request =
  | { kind: 'wav'; file: File; durationMs: number }
  | { kind: 'pcm'; sampleRate: number; channels: Float32Array[]; durationMs: number }

// tsconfig.app.json solo carga la lib DOM: el cast evita añadir WebWorker, que choca con ella.
const ctx = self as unknown as {
  postMessage(message: unknown): void
  onmessage: ((event: MessageEvent<Request>) => void) | null
}

async function analyze(request: Request): Promise<AnalysisOutcome> {
  let last = 0
  const progress = (percent: number) => {
    const now = Date.now()
    if (percent < 100 && now - last < 100) return
    last = now
    ctx.postMessage({ type: 'progress', percent })
  }

  if (request.kind === 'wav') return analyzeWav(request.file, request.durationMs, progress)

  const { sampleRate, channels, durationMs } = request
  const meter = createMeter(sampleRate, channels.length)
  const n = channels[0]?.length ?? 0
  for (let i = 0; i < n; i += sampleRate) {
    meter.push(channels.map((c) => c.subarray(i, i + sampleRate)))
    progress(Math.round((Math.min(n, i + sampleRate) / n) * 100))
  }
  return { analysis: meter.finish(durationMs) }
}

ctx.onmessage = ({ data }) => {
  analyze(data).then(
    (outcome) => ctx.postMessage({ type: 'done', outcome }),
    () => ctx.postMessage({ type: 'error' }),
  )
}
