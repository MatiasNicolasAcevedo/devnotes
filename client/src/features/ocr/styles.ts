import type { SxProps, Theme } from '@mui/material/styles'

export const ocrActionSx = {
  minHeight: 44,
  '@media (pointer: coarse)': { minHeight: 48 },
  '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 },
} satisfies SxProps<Theme>
