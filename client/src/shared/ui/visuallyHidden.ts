/**
 * Oculta un elemento a la vista sin quitarlo del árbol de accesibilidad ni del foco: sigue siendo legible por
 * lectores de pantalla y, si es un control, operable. No usar `display: none`, que lo retira de ambos.
 */
export const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: 0,
  border: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const
