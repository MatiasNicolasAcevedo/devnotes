import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { VoiceComposer } from './VoiceComposer'

/**
 * Pantalla de voz: ruta /voice.
 *
 * S-105: una columna a375 px; lista/editor adyacentes si caben a1280 px.
 * Por ahora solo el composer; la colección se añade en T-035.
 */
export function VoicePage() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 1, sm: 2 } }}>
      <Box
        sx={{
          width: '100%',
          maxWidth: 600,
          mx: 'auto',
        }}
      >
        <Typography
          component="h1"
          variant="h5"
          sx={{ mb: 2, fontWeight: 600 }}
        >
          Notas de voz
        </Typography>
        <VoiceComposer />
      </Box>
    </Container>
  )
}
