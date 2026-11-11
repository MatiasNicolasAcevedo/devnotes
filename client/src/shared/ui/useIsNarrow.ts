import type { Theme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'

/**
 * Punto de corte único de la interfaz: «angosto» es menos de 600 px (`sm` de MUI) y «ancho», 600 px o más.
 * Se resuelve en el primer render, sin pasar por el valor por defecto, para que la barra no parpadee al montar.
 */
export function useIsNarrow(): boolean {
  return useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'), { noSsr: true })
}
