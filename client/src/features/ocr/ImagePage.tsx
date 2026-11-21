import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '../auth/sessionContext'
import type { Space } from '../spaces/space'
import { useOptionalActiveSpace } from '../spaces/spaceContext'
import { getOcrCapabilities } from './api'
import { ImageWorkspace } from './ImageWorkspace'

export function ImagePage() {
  const { user, csrfReady, logoutPending } = useSession()
  const space = useOptionalActiveSpace()

  return (
    <Stack spacing={2}>
      <Typography component="h1" variant="h5">
        Imagen a texto
      </Typography>
      {user && space ? (
        <PrivateImagePage
          key={`${user.id}/${space}`}
          owner={user.id}
          space={space}
          csrfReady={csrfReady && !logoutPending}
        />
      ) : (
        <Alert severity="info">Iniciá sesión para extraer texto de una imagen.</Alert>
      )}
    </Stack>
  )
}

function PrivateImagePage({
  owner,
  space,
  csrfReady,
}: {
  owner: string
  space: Space
  csrfReady: boolean
}) {
  const capability = useQuery({
    queryKey: ['ocr', 'capabilities', owner, space],
    queryFn: ({ signal }) => getOcrCapabilities(space, signal),
    retry: false,
  })
  return (
    <>
      {capability.isPending && <Typography role="status">Comprobando disponibilidad…</Typography>}
      {capability.isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={() => void capability.refetch()}>
              Reintentar
            </Button>
          }
        >
          No se pudo comprobar la disponibilidad de la extracción.
        </Alert>
      )}
      {capability.data?.available === false && (
        <Alert severity="info">La extracción no está habilitada en este espacio.</Alert>
      )}
      <ImageWorkspace
        space={space}
        canExtract={csrfReady && !capability.isError && capability.data?.available === true}
      />
    </>
  )
}
