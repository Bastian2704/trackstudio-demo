import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

import ErrorAlert from '@/components/ErrorAlert'
import type { ApiErrorBody } from '@/lib/api'

import { fetchPlaybackUrl } from './versionApi'
import { type Version, versionTitle } from './versionSchema'

export default function VersionPlayer({ version }: { version: Version }) {
  const title = versionTitle(version)

  const query = useQuery({
    queryKey: ['versions', version.id, 'playback-url'],
    queryFn: () => fetchPlaybackUrl(version.id),
    staleTime: Infinity,
    gcTime: 0,
  })

  const wantsToPlay = useRef(true)
  const resumeAt = useRef<number | null>(null)
  const renewing = useRef(false)
  const [failed, setFailed] = useState(false)

  let body

  if (failed) {
    body = <ErrorAlert>No se pudo reproducir la versión.</ErrorAlert>
  } else if (query.isError) {
    const notFound =
      isAxiosError<ApiErrorBody>(query.error) &&
      query.error.response?.data.code === 'RESOURCE_NOT_FOUND'

    body = (
      <ErrorAlert>
        {notFound ? 'Esta versión ya no está disponible.' : 'No se pudo reproducir la versión.'}
      </ErrorAlert>
    )
  } else if (query.isPending) {
    body = <p role="status">Cargando audio…</p>
  } else {
    body = (
      <audio
        controls
        src={query.data.url}
        controlsList="nodownload"
        preload="metadata"
        aria-label={`Audio de ${title}`}
        onContextMenu={(event) => event.preventDefault()}
        onPlay={() => {
          wantsToPlay.current = true
        }}
        onPause={() => {
          wantsToPlay.current = false
        }}
        onLoadedMetadata={(event) => {
          const audio = event.currentTarget
          renewing.current = false

          if (resumeAt.current !== null) {
            audio.currentTime = resumeAt.current
            resumeAt.current = null
          }

          if (wantsToPlay.current) audio.play().catch(() => {})
        }}
        onError={(event) => {
          if (renewing.current) {
            setFailed(true)
            return
          }

          renewing.current = true
          resumeAt.current = event.currentTarget.currentTime
          void query.refetch()
        }}
      />
    )
  }

  return (
    <section aria-label="Reproductor" className="space-y-2">
      <p className="text-sm">Reproduciendo: {title}</p>
      {body}
    </section>
  )
}
