import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { DEMO_RED } from '../../app/theme'
import { PlayIcon } from '../../shared/ui/icons'
import { DEMO_VIDEOS, embedUrl, type DemoVideo } from './videos'

/**
 * Página pública con el tráiler y la demo narrada. Hasta que la persona pide reproducir, el reproductor muestra una
 * portada local y la página no hace ningún pedido a YouTube; recién entonces se monta el iframe sin cookies.
 */
export function DemoPage() {
  const [selected, setSelected] = useState<DemoVideo>(DEMO_VIDEOS[0])
  const [playing, setPlaying] = useState(false)

  // Elegir un video lo reproduce; volver a elegir el que suena no cambia el estado y no lo reinicia.
  const play = (video: DemoVideo) => {
    setSelected(video)
    setPlaying(true)
  }

  return (
    <Stack spacing={2} sx={{ py: 1 }}>
      <Box>
        <Typography component="h1" variant="h5">
          Demo
        </Typography>
        <Typography color="text.secondary">
          Mirá el tráiler o el recorrido completo de DevNotes.
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            md: 'minmax(0, 2fr) minmax(260px, 1fr)',
          },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Stack spacing={1} sx={{ minWidth: 0 }} data-demo-player="">
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 9',
              bgcolor: '#000',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            {playing ? (
              <Box
                component="iframe"
                key={selected.id}
                title={selected.iframeTitle}
                src={embedUrl(selected.id)}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              />
            ) : (
              <>
                <Box
                  component="img"
                  src={selected.poster}
                  alt=""
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <IconButton
                  aria-label={`Reproducir ${selected.title}`}
                  onClick={() => play(selected)}
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 64,
                    height: 64,
                    bgcolor: DEMO_RED,
                    color: '#181a1b',
                    boxShadow: 3,
                    '&:hover': { bgcolor: '#ff8a8a' },
                    '&:focus-visible': { outline: '3px solid #fff', outlineOffset: 2 },
                  }}
                >
                  <PlayIcon sx={{ fontSize: 36 }} />
                </IconButton>
              </>
            )}
          </Box>
          <Typography component="h2" variant="h6">
            {selected.title}
          </Typography>
          <Typography color="text.secondary">{selected.summary}</Typography>
          <Link
            href={selected.watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ alignSelf: 'flex-start' }}
          >
            Ver en YouTube
          </Link>
        </Stack>
        <Box
          component="ul"
          aria-label="Videos"
          data-demo-list=""
          sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1, minWidth: 0 }}
        >
          {DEMO_VIDEOS.map((video) => {
            const current = video.id === selected.id
            return (
              <li key={video.id}>
                <ButtonBase
                  aria-current={current ? 'true' : undefined}
                  onClick={() => play(video)}
                  sx={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    gap: 1.5,
                    p: 1,
                    textAlign: 'left',
                    borderRadius: 1,
                    borderLeft: 3,
                    borderColor: current ? DEMO_RED : 'transparent',
                    bgcolor: current ? 'action.selected' : undefined,
                    '&:hover': { bgcolor: 'action.hover' },
                    '&:focus-visible': { outline: `2px solid ${DEMO_RED}`, outlineOffset: -2 },
                  }}
                >
                  <Box
                    component="img"
                    src={video.poster}
                    alt=""
                    sx={{
                      width: 112,
                      flexShrink: 0,
                      aspectRatio: '16 / 9',
                      objectFit: 'cover',
                      borderRadius: 0.5,
                      bgcolor: '#000',
                    }}
                  />
                  <Box component="span" sx={{ display: 'block', minWidth: 0 }}>
                    <Typography
                      component="span"
                      sx={{ display: 'block', fontWeight: 600, overflowWrap: 'anywhere' }}
                    >
                      {video.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      component="span"
                      sx={{ display: 'block' }}
                    >
                      {video.duration}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      component="span"
                      sx={{ display: 'block', overflowWrap: 'anywhere' }}
                    >
                      {video.summary}
                    </Typography>
                  </Box>
                </ButtonBase>
              </li>
            )
          })}
        </Box>
      </Box>
    </Stack>
  )
}
