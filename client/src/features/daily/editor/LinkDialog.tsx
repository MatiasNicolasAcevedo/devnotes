import { zodResolver } from '@hookform/resolvers/zod'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FormTextField } from '../../../shared/forms/FormTextField'

const MAX_HREF_LENGTH = 2048

/**
 * Valida que una URL sea HTTP/HTTPS absoluta, sin credenciales, host no vacío,
 * sin esquemas javascript:/data:/mailto: ni URLs relativas.
 */
const hrefSchema = z
  .string()
  .trim()
  .max(MAX_HREF_LENGTH, 'La URL no puede exceder 2048 caracteres.')
  .refine(
    (val) => {
      try {
        const url = new URL(val)
        return url.protocol === 'http:' || url.protocol === 'https:'
      } catch {
        return false
      }
    },
    { message: 'Ingresá una URL válida (http:// o https://).' },
  )
  .refine(
    (val) => {
      try {
        const url = new URL(val)
        return url.username === '' && url.password === ''
      } catch {
        return false
      }
    },
    { message: 'La URL no puede contener credenciales.' },
  )
  .refine(
    (val) => {
      try {
        const url = new URL(val)
        return url.hostname.length > 0
      } catch {
        return false
      }
    },
    { message: 'La URL debe tener un host válido.' },
  )

const linkFormSchema = z.object({
  href: hrefSchema,
})

export type LinkFormValues = z.infer<typeof linkFormSchema>

export interface LinkDialogProps {
  /** Si true, el diálogo se muestra. */
  open: boolean
  /** Texto seleccionado actualmente (solo informativo). */
  selectedText: string
  /** href existente si el cursor está dentro de un enlace. */
  existingHref?: string
  /** Cierra el diálogo y restaura el foco al editor. */
  onClose: () => void
  /** Guarda el href en la selección actual. */
  onSave: (href: string) => void
  /** Quita el href de la selección actual, conservando el texto. */
  onRemove?: () => void
  /** Abre el href en una nueva pestaña. */
  onOpen?: (href: string) => void
}

export function LinkDialog({
  open,
  selectedText,
  existingHref,
  onClose,
  onSave,
  onRemove,
  onOpen,
}: LinkDialogProps) {
  const isEditing = existingHref != null

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = useForm<LinkFormValues>({
    resolver: zodResolver(linkFormSchema),
    defaultValues: {
      href: existingHref ?? '',
    },
  })

  // Sincronizar href existente cuando se reabre el diálogo
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      onClose()
    }
  }

  const onSubmit = handleSubmit((values) => {
    onSave(values.href)
    onClose()
  })

  const handleRemove = () => {
    onRemove?.()
    onClose()
  }

  const handleOpenLink = () => {
    if (existingHref) {
      onOpen?.(existingHref)
    }
  }

  const handleReset = () => {
    reset({ href: existingHref ?? '' })
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleOpenChange}
      aria-title="Enlace"
      aria-describedby="link-dialog-description"
      slotProps={{ backdrop: { timeout: 100 } }}
    >
      <form onSubmit={onSubmit}>
        <DialogTitle>
          {isEditing ? 'Editar enlace' : 'Agregar enlace'}
          {selectedText && (
            <Box
              component="span"
              sx={{ display: 'block', fontSize: '0.875rem', color: 'text.secondary', mt: 1 }}
            >
              «{selectedText}»
            </Box>
          )}
        </DialogTitle>
        <DialogContent>
          <Box id="link-dialog-description" sx={{ mt: 1, mb: 2 }}>
            <FormTextField
              control={control}
              name="href"
              label="URL"
              placeholder="https://ejemplo.com"
              fullWidth
              autoFocus
              disabled={isSubmitting}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          {isEditing && onRemove ? (
            <Button onClick={handleRemove} disabled={isSubmitting}>
              Quitar enlace
            </Button>
          ) : null}
          {isEditing && onOpen && existingHref ? (
            <Button onClick={handleOpenLink} disabled={isSubmitting}>
              Abrir enlace
            </Button>
          ) : null}
          <Button onClick={handleReset} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            Guardar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
