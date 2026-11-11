import { createTheme } from '@mui/material/styles'
import { esES } from '@mui/material/locale'

/** Ámbar de acento: pestaña activa, puntero sobre una pestaña y «Guardar versión». Único lugar donde se define. */
export const AMBER = '#ffb74d'

/** Tema oscuro único de DevNotes. Textos internos de MUI en español. */
export const theme = createTheme(
  {
    palette: {
      mode: 'dark',
      primary: { main: '#8ab4f8' },
      secondary: { main: '#91c9b0' },
      background: { default: '#181a1b', paper: '#212324' },
      text: { primary: '#e1e3e6', secondary: '#a6adb7' },
      divider: '#393d42',
    },
    components: {
      MuiCssBaseline: { styleOverrides: { html: { colorScheme: 'dark' } } },
      MuiAppBar: {
        styleOverrides: { root: { backgroundImage: 'none', backgroundColor: '#212324' } },
      },
      MuiButton: { styleOverrides: { root: { textTransform: 'none' } } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: [
        'system-ui',
        '-apple-system',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
    },
  },
  esES,
)
