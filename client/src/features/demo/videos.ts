import demoPoster from './miniatura-demo.jpg'
import trailerPoster from './miniatura-trailer.jpg'

export interface DemoVideo {
  /** ID del video en YouTube. */
  id: string
  /** Nombre en la lista y en el botón de reproducir. */
  title: string
  /** Título accesible del reproductor embebido. */
  iframeTitle: string
  duration: string
  summary: string
  /** Portada local: hasta el clic la página no pide nada a YouTube. */
  poster: string
  watchUrl: string
}

/** Videos publicados en YouTube por el dueño (media/demo/YOUTUBE.md). El primero se muestra al abrir la página. */
export const DEMO_VIDEOS: readonly DemoVideo[] = [
  {
    id: '-xhokMtK-Hw',
    title: 'Tráiler',
    iframeTitle: 'Tráiler de DevNotes',
    duration: '0:46',
    summary: 'DevNotes en menos de un minuto.',
    poster: trailerPoster,
    watchUrl: 'https://youtu.be/-xhokMtK-Hw',
  },
  {
    id: 'XAIHdmHAhA0',
    title: 'Demo completa',
    iframeTitle: 'Demo completa de DevNotes',
    duration: '5:53',
    summary: 'Todas las funciones paso a paso, narrada y con subtítulos.',
    poster: demoPoster,
    watchUrl: 'https://youtu.be/XAIHdmHAhA0',
  },
]

/** Único lugar que construye la URL del reproductor embebido, sin cookies y con reproducción inmediata. */
export function embedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
}
